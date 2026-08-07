import { tradeCookieName } from "@/lib/trade-session";

export async function POST(request: Request) {
  const secure = request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${tradeCookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  return response;
}
