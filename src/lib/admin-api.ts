import { accountRequest, relay } from "@/lib/account-api";
export async function adminRelay(path: string, init: RequestInit = {}) { return relay(await accountRequest(path, init, true)); }
