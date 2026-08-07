import { accountRequest, relay } from "@/lib/account-api";
export async function GET() { return relay(await accountRequest("/api/v1/auth/me", {}, true)); }
