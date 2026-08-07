import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const tradeCookieName = "nora-trade-session";
const sessionLifetimeSeconds = 60 * 60 * 12;

const sessionSecret = () => process.env.WHOLESALE_SESSION_SECRET || "";

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createTradeToken() {
  if (!sessionSecret()) throw new Error("WHOLESALE_SESSION_SECRET is not configured");
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1_000) + sessionLifetimeSeconds })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyTradeToken(token?: string) {
  if (!token || !sessionSecret()) return false;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;
  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now() / 1_000;
  } catch {
    return false;
  }
}

export async function hasTradeAccess() {
  const store = await cookies();
  const accountToken = store.get("nora-account-session")?.value;
  if (accountToken) {
    try {
      const api = process.env.CATALOG_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
      const response = await fetch(`${api}/api/v1/auth/me`, { headers: { authorization: `Bearer ${accountToken}` }, cache: "no-store" });
      if (response.ok) {
        const user = (await response.json())?.data?.user;
        if (user?.status === "active" && (user.role === "partner" || user.role === "admin")) return true;
      }
    } catch { /* Keep legacy trade access as a temporary fallback. */ }
  }
  return verifyTradeToken(store.get(tradeCookieName)?.value);
}

export function verifyTradePassword(password: string) {
  const configured = process.env.WHOLESALE_ACCESS_PASSWORD || "";
  if (!configured) return false;
  const supplied = Buffer.from(password);
  const expected = Buffer.from(configured);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export const tradeCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: sessionLifetimeSeconds,
};
