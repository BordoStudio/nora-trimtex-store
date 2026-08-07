import { getCatalogProducts } from "@/lib/catalog-api";
import { isLocale } from "@/lib/i18n";
import { hasTradeAccess } from "@/lib/trade-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLocale = url.searchParams.get("locale") || "en";
  const locale = isLocale(requestedLocale) ? requestedLocale : "en";
  const query = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 80);
  if (query.length < 2) return Response.json({ data: [] });
  const data = await getCatalogProducts(locale, { limit: 6, search: query, includePrices: await hasTradeAccess() });
  return Response.json({ data }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
