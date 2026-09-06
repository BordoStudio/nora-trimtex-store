import { existingProductSkus, requireAdminAccess, syncNewChinaProducts } from "@/lib/admin-product-import";

export async function POST(request: Request) {
  const denied = await requireAdminAccess();
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({})) as { status?: "draft" | "active" };
    const result = await syncNewChinaProducts(await existingProductSkus(), body.status === "draft" ? "draft" : "active");
    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось синхронизировать каталог." }, { status: 400 });
  }
}
