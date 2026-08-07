import { createTradeToken, tradeCookieName, tradeCookieOptions, verifyTradePassword } from "@/lib/trade-session";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  const current = !entry || entry.resetAt < now ? { count: 0, resetAt: now + 15 * 60_000 } : entry;
  if (current.count >= 5) return Response.json({ error: "too_many_attempts" }, { status: 429 });

  const body = await request.json().catch(() => ({})) as { password?: string };
  if (!verifyTradePassword(body.password || "")) {
    current.count += 1;
    attempts.set(ip, current);
    return Response.json({ error: "invalid_password" }, { status: 401 });
  }

  attempts.delete(ip);
  const secure = request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${tradeCookieName}=${createTradeToken()}; Path=${tradeCookieOptions.path}; Max-Age=${tradeCookieOptions.maxAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  return response;
}
