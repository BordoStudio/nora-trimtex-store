import { notFound, redirect } from "next/navigation";
import { AccountPanel } from "@/components/AccountPanel";
import { designerCopy } from "@/lib/designer-copy";
import { isLocale } from "@/lib/i18n";
import { hasPartnerPricingAccess } from "@/lib/partner-pricing";
export const metadata = { robots: { index: false, follow: true } };
export default async function DesignersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { next } = await searchParams;
  const returnTo = next && (next.startsWith(`/${locale}/product/`) || next === `/${locale}/catalog`) ? next : `/${locale}/catalog`;
  if (await hasPartnerPricingAccess()) redirect(returnTo);
  const t = designerCopy[locale];
  return <div className="designer-access-page"><div className="designer-access-intro"><p className="eyebrow">NORA TRIMTEX</p><h1>{t.title}</h1><p>{t.body}</p></div><AccountPanel locale={locale} designer returnTo={returnTo} /></div>;
}
