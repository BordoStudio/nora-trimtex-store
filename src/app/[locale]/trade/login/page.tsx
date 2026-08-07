import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { TradeLoginForm } from "@/components/TradeLoginForm";
import { hasTradeAccess } from "@/lib/trade-session";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Trade access", robots: { index: false, follow: false } };

export default async function TradeLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (await hasTradeAccess()) redirect(`/${locale}/trade`);
  const copy = {
    en: ["TRADE ACCESS", "Wholesale prices for partners.", "Enter the password supplied by Nora TrimTex. Access expires automatically after 12 hours."],
    de: ["TRADE-ZUGANG", "Großhandelspreise für Partner.", "Geben Sie das von Nora TrimTex bereitgestellte Passwort ein. Der Zugang endet automatisch nach 12 Stunden."],
    uk: ["TRADE ДОСТУП", "Оптові ціни для партнерів.", "Введіть пароль, наданий Nora TrimTex. Доступ автоматично завершується через 12 годин."],
    ru: ["TRADE ДОСТУП", "Оптовые цены для партнёров.", "Введите пароль, предоставленный Nora TrimTex. Доступ автоматически завершится через 12 часов."],
  }[locale];
  return <section className="trade-access-page"><div className="trade-access-card"><p className="eyebrow">{copy[0]}</p><h1>{copy[1]}</h1><p>{copy[2]}</p><TradeLoginForm locale={locale} /></div></section>;
}
