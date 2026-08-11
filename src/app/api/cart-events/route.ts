import { createHash } from "node:crypto";
import { getSeedProducts } from "@/data/catalog";
import { isLocale } from "@/lib/i18n";

type CartEvent = { productId?: string; sku?: string; slug?: string; variantId?: string; variantLabel?: string; locale?: string; sessionId?: string; eventId?: string; page?: string };
const rate = new Map<string, { count: number; resetAt: number }>();

const clean = (value: unknown, max = 160) => typeof value === "string" ? value.replace(/[\r\n\t]/g, " ").trim().slice(0, max) : "";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as CartEvent;
  const locale = isLocale(clean(body.locale, 2)) ? clean(body.locale, 2) as "en" | "de" | "uk" | "ru" : "en";
  const product = getSeedProducts(locale).find((item) => item.id === clean(body.productId, 80) && item.sku === clean(body.sku, 80));
  if (!product) return Response.json({ error: "invalid_product" }, { status: 400 });

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const anonymousId = createHash("sha256").update(`${process.env.PRIVACY_IP_SALT || "nora-local"}:${ip}`).digest("hex").slice(0, 16);
  const key = `${anonymousId}:${clean(body.sessionId, 80)}`;
  const now = Date.now();
  const previous = rate.get(key);
  const current = !previous || previous.resetAt < now ? { count: 0, resetAt: now + 60_000 } : previous;
  if (current.count >= 20) return Response.json({ error: "rate_limited" }, { status: 429 });
  current.count += 1;
  rate.set(key, current);

  const country = clean(request.headers.get("cf-ipcountry"), 8) || "unknown";
  const region = clean(request.headers.get("cf-region"), 80) || "unknown";
  const city = clean(request.headers.get("cf-ipcity"), 80) || "unknown";
  const userAgent = clean(request.headers.get("user-agent"), 500) || "unknown";
  const eventId = clean(body.eventId, 80) || crypto.randomUUID();
  const text = [
    "A product was added to the Nora TrimTex basket.",
    `Article: ${product.sku}`,
    `Product: ${product.name}`,
    `Variant: ${clean(body.variantLabel, 100) || clean(body.variantId, 80) || "default"}`,
    `Page: ${clean(body.page, 300)}`,
    `Language: ${locale}`,
    `Location from Cloudflare: ${country}, ${region}, ${city}`,
    `Anonymous visitor ID: ${anonymousId}`,
    `Session ID: ${clean(body.sessionId, 80) || "unknown"}`,
    `Browser: ${userAgent}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  const to = process.env.NOTIFICATION_TO_EMAIL || "info@noratrim.com";
  if (!apiKey || !from) {
    console.info(`[cart-event:${eventId}] ${text}`);
    return Response.json({ accepted: true, emailConfigured: false }, { status: 202 });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "user-agent": "NoraTrimTex/1.0", "idempotency-key": eventId },
    body: JSON.stringify({ from, to: [to], subject: `[Nora TrimTex] Added to basket: ${product.sku}`, text }),
  });
  if (!response.ok) {
    console.error("Email notification failed", response.status, await response.text());
    return Response.json({ accepted: true, emailConfigured: true, emailSent: false }, { status: 202 });
  }
  return Response.json({ accepted: true, emailSent: true }, { status: 201 });
}
