import { adminRelay } from "@/lib/admin-api";
export async function GET(request: Request) { const query = new URL(request.url).search; return adminRelay(`/api/v1/admin/users${query}`); }
