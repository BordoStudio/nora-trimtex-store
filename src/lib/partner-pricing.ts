import "server-only";

import { cookies } from "next/headers";

/**
 * Everyone sees the client price. Signed-in approved partners and administrators
 * receive the designer/partner tier; there is no shared access code.
 */
export async function getPartnerPricingContext() {
  const token = (await cookies()).get("nora-account-session")?.value;
  if (!token) return { hasAccess: false, priceTier: "retail" as const };

  try {
    const api = process.env.CATALOG_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
    const response = await fetch(`${api}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return { hasAccess: false, priceTier: "retail" as const };
    const user = (await response.json())?.data?.user;
    const hasAccess = user?.status === "active" && user.role === "partner";
    return { hasAccess, priceTier: hasAccess ? "partner" as const : "retail" as const };
  } catch {
    return { hasAccess: false, priceTier: "retail" as const };
  }
}

export async function hasPartnerPricingAccess() {
  return (await getPartnerPricingContext()).hasAccess;
}
