import type { Metadata } from "next";
import { PartnerApproval } from "@/components/PartnerApproval";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Подтверждение дизайнера — Nora TrimTex", robots: { index: false, follow: false, nocache: true } };

export default function PartnerApprovalPage() {
  return <PartnerApproval />;
}
