import { adminRelay } from "@/lib/admin-api";
import { getSeedProducts } from "@/data/catalog";

export async function GET(request: Request) {
  const response = await adminRelay(`/api/v1/admin/products${new URL(request.url).search}`);
  if (!response.ok) return response;

  const payload = await response.json() as {
    data: {
      items: Array<{
        id: string;
        sku: string;
        priceUsd?: number | null;
        retailPriceUsd?: number | null;
        partnerPriceUsd?: number | null;
      }>;
      page: number;
      total: number;
    };
  };
  const localPrices = new Map(getSeedProducts("ru").map((product) => [product.id, product.partnerPriceUsd ?? product.priceUsd]));
  payload.data.items = payload.data.items.map((product) => {
    const partnerPriceUsd = product.partnerPriceUsd ?? product.priceUsd ?? localPrices.get(product.id) ?? null;
    return {
      ...product,
      partnerPriceUsd,
      retailPriceUsd: partnerPriceUsd === null ? null : Number((partnerPriceUsd * 2).toFixed(2)),
    };
  });
  return Response.json(payload, { headers: { "cache-control": "private, no-store" } });
}
