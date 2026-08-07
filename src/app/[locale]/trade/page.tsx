import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { TradeLogoutButton } from "@/components/TradeLogoutButton";
import { hasTradeAccess } from "@/lib/trade-session";
import { isLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Trade area", robots: { index: false, follow: false } };

export default async function TradePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await hasTradeAccess())) redirect(`/${locale}/trade/login`);
  const copy = {
    en: ["TRADE ACCESS ACTIVE", "Wholesale prices are now visible.", "Open the catalogue to see verified prices. Availability and delivery are confirmed before payment.", "Open catalogue", "Sign out"],
    de: ["TRADE-ZUGANG AKTIV", "Großhandelspreise sind jetzt sichtbar.", "Öffnen Sie den Katalog für geprüfte Preise. Verfügbarkeit und Lieferung werden vor Zahlung bestätigt.", "Katalog öffnen", "Abmelden"],
    uk: ["TRADE ДОСТУП АКТИВНИЙ", "Оптові ціни тепер доступні.", "Відкрийте каталог, щоб побачити перевірені ціни. Наявність і доставка підтверджуються до оплати.", "Відкрити каталог", "Вийти"],
    ru: ["TRADE ДОСТУП АКТИВЕН", "Оптовые цены теперь доступны.", "Откройте каталог, чтобы увидеть проверенные цены. Наличие и доставка подтверждаются до оплаты.", "Открыть каталог", "Выйти"],
  }[locale];
  return <section className="trade-access-page"><div className="trade-access-card trade-success"><BadgeCheck /><p className="eyebrow">{copy[0]}</p><h1>{copy[1]}</h1><p>{copy[2]}</p><div className="trade-actions"><Link className="button primary" href={`/${locale}/catalog`}>{copy[3]}<ArrowRight /></Link><TradeLogoutButton locale={locale} label={copy[4]} /></div></div></section>;
}
