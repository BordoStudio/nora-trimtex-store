import { existingProductSkus, requireAdminAccess, scanNewChinaProducts } from "@/lib/admin-product-import";

export async function POST(request: Request) {
  const denied = await requireAdminAccess();
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({})) as { startPage?: number; pageSize?: number };
    const startPage = Number.isFinite(Number(body.startPage)) ? Number(body.startPage) : 1;
    const pageSize = Number.isFinite(Number(body.pageSize)) ? Number(body.pageSize) : 20;
    const result = await scanNewChinaProducts(await existingProductSkus(), startPage, pageSize);
    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось синхронизировать каталог." }, { status: 400 });
  }
}
