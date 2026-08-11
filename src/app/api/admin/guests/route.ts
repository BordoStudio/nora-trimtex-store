import { adminRelay } from "@/lib/admin-api";

export async function GET() {
  return adminRelay("/api/v1/admin/guests");
}
