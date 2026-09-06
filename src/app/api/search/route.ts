import { getCatalogProducts } from "@/lib/catalog-api";
import { isLocale } from "@/lib/i18n";
import { getPartnerPricingContext } from "@/lib/partner-pricing";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLocale = url.searchParams.get("locale") || "en";
  const locale = isLocale(requestedLocale) ? requestedLocale : "en";
  const query = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 80);
  if (query.length < 2) return Response.json({ data: [] });
  const requestedLimit = Number(url.searchParams.get("limit") || 6);
  const limit = Number.isFinite(requestedLimit) ? Math.min(36, Math.max(1, Math.round(requestedLimit))) : 6;
  const pricing = await getPartnerPricingContext();
  const data = (await getCatalogProducts(locale, { limit: 1_000, search: query, includePrices: true, priceTier: pricing.priceTier })).slice(0, limit);
  // Results can include partner prices for an authenticated account, so never
  // let a shared edge/browser cache serve one customer's response to another.
  return Response.json({ data }, { headers: { "cache-control": "private, no-store" } });
}
