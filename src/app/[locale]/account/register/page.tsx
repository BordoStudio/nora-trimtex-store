import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegistrationPageClient } from "@/components/RegistrationPageClient";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Registration", robots: { index: false, follow: false } };

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ email?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { email = "" } = await searchParams;
  const initialEmail = email.trim().slice(0, 200);
  return <div className="account-register-page"><RegistrationPageClient locale={locale} initialEmail={initialEmail} /></div>;
}
