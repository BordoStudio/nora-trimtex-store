import { importChinaProductByUrl, requireAdminAccess } from "@/lib/admin-product-import";
import { relay } from "@/lib/account-api";

export async function POST(request: Request) {
  const denied = await requireAdminAccess();
  if (denied) return denied;
  try {
    const body = await request.json() as { url?: string; status?: "draft" | "active" };
    const url = String(body.url || "").trim();
    if (!url) return Response.json({ error: "Вставьте ссылку на товар." }, { status: 400 });
    const result = await importChinaProductByUrl(url, body.status === "draft" ? "draft" : "active");
    return relay(result.response);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось импортировать товар." }, { status: 400 });
  }
}
