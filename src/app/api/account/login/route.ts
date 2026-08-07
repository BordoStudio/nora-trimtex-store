import { cookies } from "next/headers";
import { accountCookieName, accountCookieOptions, accountRequest } from "@/lib/account-api";
export async function POST(request: Request) {
  const response = await accountRequest("/api/v1/auth/login", { method: "POST", body: await request.text() });
  const payload = await response.json();
  if (response.ok && payload?.data?.token) (await cookies()).set(accountCookieName, payload.data.token, accountCookieOptions);
  return Response.json(payload, { status: response.status });
}
