import { accountRequest, relay, visitorHeaders } from "@/lib/account-api";

export async function POST(request: Request) {
  return relay(await accountRequest("/api/v1/guests/session", {
    method: "POST",
    headers: visitorHeaders(request),
    body: await request.text(),
  }));
}
