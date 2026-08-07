"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function TradeLogoutButton({ label, locale }: { label: string; locale: string }) {
  const router = useRouter();
  return <button type="button" className="button outline" onClick={async () => { await fetch("/api/trade/logout", { method: "POST" }); router.push(`/${locale}`); router.refresh(); }}>{label}<LogOut /></button>;
}
