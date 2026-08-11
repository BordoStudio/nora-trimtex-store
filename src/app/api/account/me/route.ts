import { accountRequest, relay } from "@/lib/account-api";

export async function GET() {
  const response = await accountRequest("/api/v1/auth/me", {}, true);
  if (response.status === 401) return Response.json({ data: { user: null } });
  return relay(response);
}
