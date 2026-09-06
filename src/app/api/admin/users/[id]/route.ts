import { adminRelay } from "@/lib/admin-api";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { return adminRelay(`/api/v1/admin/users/${(await context.params).id}`); }
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) { return adminRelay(`/api/v1/admin/users/${(await context.params).id}`, { method: "DELETE" }); }
