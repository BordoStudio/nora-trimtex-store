import { adminRelay } from "@/lib/admin-api";

export async function GET() {
  return adminRelay("/api/v1/admin/guests");
}

export async function DELETE() {
  return adminRelay("/api/v1/admin/guests", { method: "DELETE" });
}
