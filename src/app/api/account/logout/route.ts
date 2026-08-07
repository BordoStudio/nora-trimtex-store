import { cookies } from "next/headers";
import { accountCookieName, accountRequest, relay } from "@/lib/account-api";
export async function POST() {
  const response = await accountRequest("/api/v1/auth/logout", { method: "POST" }, true);
  (await cookies()).delete(accountCookieName);
  return relay(response);
}
