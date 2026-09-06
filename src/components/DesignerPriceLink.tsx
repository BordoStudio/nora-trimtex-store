import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { designerCopy } from "@/lib/designer-copy";
export function DesignerPriceLink({ locale, slug }: { locale: Locale; slug?: string }) {
  const next = slug ? `/${locale}/product/${slug}` : `/${locale}/catalog`;
  return <Link className="designer-price-link" href={`/${locale}/designers?next=${encodeURIComponent(next)}`}>{designerCopy[locale].label}</Link>;
}
