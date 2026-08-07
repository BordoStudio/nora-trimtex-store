import { accountRequest, relay } from "@/lib/account-api";
export async function GET() { return relay(await accountRequest("/api/v1/cart", {}, true)); }
export async function PUT(request: Request) { return relay(await accountRequest("/api/v1/cart", { method: "PUT", body: await request.text() }, true)); }
