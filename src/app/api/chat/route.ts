import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { isLocale } from "@/lib/i18n";

type ChatBody = { name?: unknown; contact?: unknown; message?: unknown; website?: unknown; locale?: unknown; page?: unknown };
const attempts = new Map<string, { count: number; resetAt: number }>();
const clean = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[\r\t]/g, " ").trim().slice(0, max) : "";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 32 * 1024) return Response.json({ error: "payload_too_large" }, { status: 413 });
  const body = await request.json().catch(() => ({})) as ChatBody;
  if (clean(body.website, 100)) return Response.json({ accepted: true }, { status: 202 });

  const name = clean(body.name, 120);
  const contact = clean(body.contact, 200);
  const message = clean(body.message, 1500);
  const page = clean(body.page, 300);
  const requestedLocale = clean(body.locale, 2);
  const locale = isLocale(requestedLocale) ? requestedLocale : "en";
  if (contact.length < 5 || message.length < 3) return Response.json({ error: "invalid_message" }, { status: 400 });

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const visitorId = createHash("sha256").update(`${process.env.PRIVACY_IP_SALT || "nora-local"}:${ip}`).digest("hex").slice(0, 16);
  const now = Date.now();
  const previous = attempts.get(visitorId);
  const current = !previous || previous.resetAt < now ? { count: 0, resetAt: now + 10 * 60_000 } : previous;
  if (current.count >= 5) return Response.json({ error: "rate_limited" }, { status: 429 });
  current.count += 1;
  attempts.set(visitorId, current);

  const id = `CHAT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const record = { id, createdAt, status: "new", locale, name, contact, message, page, visitorId };
  const file = join(process.cwd(), "data", "chat-messages.ndjson");
  const save = mkdir(dirname(file), { recursive: true }).then(() => appendFile(file, `${JSON.stringify(record)}\n`, "utf8"));

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  const to = process.env.NOTIFICATION_TO_EMAIL || "info@noratrim.com";
  const sender = name || "Not provided";
  const text = [`New Nora TrimTex question ${id}`, `Name: ${sender}`, `Contact: ${contact}`, `Language: ${locale}`, `Page: ${page || "unknown"}`, `Anonymous visitor: ${visitorId}`, `Time: ${createdAt}`, "", message].join("\n");
  const email = apiKey && from ? fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "user-agent": "NoraTrimTex/1.0", "idempotency-key": `chat-${id}` },
    body: JSON.stringify({ from, to: [to], subject: `[Nora TrimTex] Question from ${sender}`, text }),
  }).then((response) => { if (!response.ok) throw new Error(`email_${response.status}`); }) : Promise.resolve();

  const [saved, emailed] = await Promise.allSettled([save, email]);
  if (saved.status === "rejected" && emailed.status === "rejected") return Response.json({ error: "delivery_failed" }, { status: 503 });
  return Response.json({ data: { id, status: "received" } }, { status: 201 });
}
