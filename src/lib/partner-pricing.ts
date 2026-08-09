import "server-only";

import { cookies } from "next/headers";

/**
 * Prices are available only to a signed-in, approved partner or administrator.
 * There is deliberately no shared password, access code or parallel session.
 */
export async function hasPartnerPricingAccess() {
  const token = (await cookies()).get("nora-account-session")?.value;
  if (!token) return false;

  try {
    const api = process.env.CATALOG_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
    const response = await fetch(`${api}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const user = (await response.json())?.data?.user;
    return user?.status === "active" && (user.role === "partner" || user.role === "admin");
  } catch {
    return false;
  }
}
