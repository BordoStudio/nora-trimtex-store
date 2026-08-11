import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getSeedProducts } from "@/data/catalog";
import { isLocale } from "@/lib/i18n";

type OrderBody = {
  locale?: string;
  customer?: { name?: string; email?: string; phone?: string; company?: string; country?: string; city?: string; address?: string; postcode?: string; notes?: string };
  pricedSubtotalUsd?: number;
  items?: Array<{ productId?: string; sku?: string; name?: string; slug?: string; categoryId?: string; variantId?: string; variantLabel?: string; unitPriceUsd?: number; quantity?: number }>;
};

const attempts = new Map<string, { count: number; resetAt: number }>();
const clean = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[\r\n\t]/g, " ").trim().slice(0, max) : "";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 256 * 1024) return Response.json({ error: "Payload too large" }, { status: 413 });
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const previous = attempts.get(ip);
  const current = !previous || previous.resetAt < now ? { count: 0, resetAt: now + 60_000 } : previous;
  if (current.count >= 5) return Response.json({ error: "Too many requests" }, { status: 429 });
  current.count += 1;
  attempts.set(ip, current);

  const body = await request.json().catch(() => ({})) as OrderBody;
  const customer = body.customer;
  const requestedLocale = body.locale || "";
  const locale = isLocale(requestedLocale) ? requestedLocale : "en";
  const catalog = new Map(getSeedProducts(locale).map((product) => [product.id, product]));
  const validItems = body.items?.every((item) => {
    const product = item.productId ? catalog.get(item.productId) : undefined;
    const validVariant = !item.variantId || product?.variants.some((variant) => variant.id === item.variantId);
    return product && product.sku === item.sku && validVariant && Number.isInteger(item.quantity) && Number(item.quantity) > 0 && Number(item.quantity) <= 10_000;
  });
  if (!customer?.name || customer.name.length > 120 || !customer.email?.includes("@") || customer.email.length > 200 || !customer.phone || customer.phone.length > 60 || !customer.country || customer.country.length > 100 || !customer.city || customer.city.length > 120 || !customer.address || customer.address.length > 240 || !customer.postcode || customer.postcode.length > 30 || !body.items?.length || body.items.length > 100 || !validItems) {
    return Response.json({ error: "Invalid order" }, { status: 400 });
  }

  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const id = `LTX-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const items = body.items!.map((item) => {
    const product = catalog.get(item.productId!)!;
    return { ...item, sku: product.sku, name: product.name, slug: product.slug, categoryId: product.categoryId, unitPriceUsd: product.priceUsd };
  });
  const calculatedSubtotalUsd = items.reduce((sum, item) => sum + (item.unitPriceUsd ?? 0) * Number(item.quantity), 0);
  const record = { id, status: "received", createdAt: new Date().toISOString(), locale, customer, currency: "USD", pricedSubtotalUsd: calculatedSubtotalUsd, items };
  const file = join(process.cwd(), "data", "orders.ndjson");
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
  const notification = [
    `New Nora TrimTex order ${id}`,
    `Customer: ${clean(customer.name, 120)}`,
    `Email: ${clean(customer.email, 200)}`,
    `Phone: ${clean(customer.phone, 60)}`,
    `Company: ${clean(customer.company, 160) || "—"}`,
    `Delivery: ${clean(customer.country, 100)}, ${clean(customer.city, 120)}, ${clean(customer.address, 240)}, ${clean(customer.postcode, 30)}`,
    "",
    ...items.map((item) => `${item.sku}${item.variantLabel ? ` · ${clean(item.variantLabel, 120)}` : ""} × ${item.quantity}`),
  ].join("\n");
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  const to = process.env.NOTIFICATION_TO_EMAIL || "info@noratrim.com";
  const emailConfigured = Boolean(apiKey && from);
  let emailSent = false;
  if (apiKey && from) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "user-agent": "NoraTrimTex/1.0", "idempotency-key": `order-${id}` },
        body: JSON.stringify({ from, to: [to], subject: `[Nora TrimTex] New order ${id}`, text: notification }),
      });
      emailSent = response.ok;
      if (!response.ok) console.error("Order notification failed", response.status, await response.text());
    } catch (error) {
      console.error("Order notification failed", error);
    }
  } else {
    console.info(`[order:${id}] ${notification}`);
  }
  return Response.json({ data: { id, status: "received", notification: { configured: emailConfigured, sent: emailSent } } }, { status: 201 });
}
