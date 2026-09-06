import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getDictionary, type Locale } from "@/lib/i18n";
import { designerCopy } from "@/lib/designer-copy";
export function StoreFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const labels = {ru:{about:"О бренде",privacy:"Конфиденциальность"},uk:{about:"Про бренд",privacy:"Конфіденційність"},de:{about:"Über uns",privacy:"Datenschutz"},en:{about:"About",privacy:"Privacy"}}[locale];
  return <footer className="storefront-footer">
    <div className="storefront-footer-top"><Link className="storefront-footer-logo" href={`/${locale}`} aria-label="Nora TrimTex"><BrandLogo /></Link><a className="storefront-footer-email" href="mailto:info@noratrim.com">info@noratrim.com</a></div>
    <nav className="storefront-footer-links" aria-label={t.nav.catalog}><Link href={`/${locale}/catalog`}>{t.nav.catalog}</Link><Link href={`/${locale}/about`}>{labels.about}</Link><Link href={`/${locale}/designers`}>{designerCopy[locale].label}</Link><Link href={`/${locale}/privacy`}>{labels.privacy}</Link></nav>
    <small>{t.footer.legal}</small>
  </footer>;
}
