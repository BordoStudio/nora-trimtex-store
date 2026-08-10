import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegistrationPageClient } from "@/components/RegistrationPageClient";
import { isLocale } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";

const titles = {
  ru: "Регистрация",
  uk: "Реєстрація",
  de: "Registrierung",
  en: "Registration",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: titles[locale],
    alternates: { canonical: `${siteUrl}/${locale}/account/register` },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ email?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { email = "" } = await searchParams;
  const initialEmail = email.trim().slice(0, 200);
  return <div className="account-register-page"><RegistrationPageClient locale={locale} initialEmail={initialEmail} /></div>;
}
