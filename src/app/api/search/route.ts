import { getCatalogProducts } from "@/lib/catalog-api";
import { isLocale } from "@/lib/i18n";
import { getPartnerPricingContext } from "@/lib/partner-pricing";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLocale = url.searchParams.get("locale") || "en";
  const locale = isLocale(requestedLocale) ? requestedLocale : "en";
  const query = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 80);
  if (query.length < 2) return Response.json({ data: [] });
  const pricing = await getPartnerPricingContext();
  const data = (await getCatalogProducts(locale, { limit: 1_000, search: query, includePrices: true, priceTier: pricing.priceTier }))
    .filter((product) => product.priceUsd !== undefined || product.categoryId === "holdbacks" || product.categoryId === "samples")
    .slice(0, 6);
  // Results can include partner prices for an authenticated account, so never
  // let a shared edge/browser cache serve one customer's response to another.
  return Response.json({ data }, { headers: { "cache-control": "private, no-store" } });
}
