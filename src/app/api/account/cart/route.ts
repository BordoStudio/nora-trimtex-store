import { accountRequest, relay, visitorHeaders } from "@/lib/account-api";

export async function GET(request: Request) {
  const response = await accountRequest("/api/v1/cart", { headers: visitorHeaders(request) }, true);
  if (response.status === 401) return Response.json({ data: { items: [], updatedAt: null } });
  return relay(response);
}

export async function PUT(request: Request) {
  const response = await accountRequest("/api/v1/cart", { method: "PUT", headers: visitorHeaders(request), body: await request.text() }, true);
  if (response.status === 401) return Response.json({ data: { saved: false, anonymous: true } });
  return relay(response);
}
