import { existingProductSkus, requireAdminAccess, scanNewChinaProducts } from "@/lib/admin-product-import";

export async function POST(request: Request) {
  const denied = await requireAdminAccess();
  if (denied) return denied;
  try {
    await request.json().catch(() => ({}));
    const result = await scanNewChinaProducts(await existingProductSkus());
    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось синхронизировать каталог." }, { status: 400 });
  }
}
