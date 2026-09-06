import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { designerCopy } from "@/lib/designer-copy";
const activeLabels: Record<Locale, string> = { ru: "ЦЕНА ДЛЯ ДИЗАЙНЕРОВ", uk: "ЦІНА ДЛЯ ДИЗАЙНЕРІВ", de: "DESIGNERPREIS", en: "DESIGNER PRICE" };
export function DesignerPriceLink({ locale, slug, hasAccess = false }: { locale: Locale; slug?: string; hasAccess?: boolean }) {
  if (hasAccess) return <span className="designer-price-label">{activeLabels[locale]}</span>;
  const next = slug ? `/${locale}/product/${slug}` : `/${locale}/catalog`;
  return <Link className="designer-price-link" href={`/${locale}/designers?next=${encodeURIComponent(next)}`}>{designerCopy[locale].label}</Link>;
}
