import { cookies } from "next/headers";

export const accountCookieName = "nora-account-session";
const backendUrl = () => process.env.CATALOG_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

export async function accountRequest(path: string, init: RequestInit = {}, withSession = false) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (withSession) {
    const token = (await cookies()).get(accountCookieName)?.value;
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  return fetch(`${backendUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

export const accountCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
};

export async function relay(response: Response) {
  const body = await response.text();
  return new Response(body, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json" } });
}
