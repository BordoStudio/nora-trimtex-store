import { adminRelay } from "@/lib/admin-api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return adminRelay(`/api/v1/admin/products/${(await context.params).id}/price`, {
    method: "PATCH",
    body: await request.text(),
  });
}
