import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nora TrimTex Admin", robots: { index: false, follow: false, nocache: true } };
export default function AdminPage() { return <AdminDashboard />; }
