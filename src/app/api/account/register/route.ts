import { accountRequest, relay } from "@/lib/account-api";
export async function POST(request: Request) { return relay(await accountRequest("/api/v1/auth/register", { method: "POST", body: await request.text() })); }
