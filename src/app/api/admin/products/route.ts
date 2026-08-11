import { adminRelay } from "@/lib/admin-api";

export async function GET(request: Request) {
  return adminRelay(`/api/v1/admin/products${new URL(request.url).search}`);
}
