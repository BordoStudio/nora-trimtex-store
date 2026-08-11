import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { languageAlternates, siteUrl } from "@/lib/site";

const titles = { en: "Privacy", de: "Datenschutz", uk: "Конфіденційність", ru: "Конфиденциальность" } as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: titles[locale], alternates: { canonical: `${siteUrl}/${locale}/privacy`, languages: languageAlternates("/privacy") } };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = {
    en: ["Privacy", "What we process", "When you add a product to the basket, we process the article, selected variant, page, time, site language, an anonymous session identifier, browser type and approximate country supplied by Cloudflare. The IP address is converted into a short anonymous identifier and is not included in the email notification.", "What we do not access", "Nora TrimTex cannot and does not read your social-media accounts, passwords, other sites’ cookies or browser history.", "Orders", "Contact and delivery details are processed only when you submit the order form. They are used to prepare a quotation and arrange delivery."],
    de: ["Datenschutz", "Verarbeitete Daten", "Beim Hinzufügen zum Warenkorb verarbeiten wir Artikel, Variante, Seite, Zeitpunkt, Sprache, eine anonyme Sitzungskennung, Browsertyp und das von Cloudflare übermittelte ungefähre Land. Die IP-Adresse wird in eine kurze anonyme Kennung umgewandelt und nicht per E-Mail versendet.", "Kein Zugriff", "Nora TrimTex liest keine Social-Media-Konten, Passwörter, Cookies anderer Websites oder den Browserverlauf.", "Bestellungen", "Kontakt- und Lieferdaten werden erst beim Absenden des Bestellformulars verarbeitet und für Angebot und Lieferung verwendet."],
    uk: ["Конфіденційність", "Що ми обробляємо", "Коли товар додається до кошика, ми обробляємо артикул, варіант, сторінку, час, мову, анонімний ідентифікатор сесії, тип браузера та приблизну країну від Cloudflare. IP-адреса перетворюється на короткий анонімний ідентифікатор і не надсилається електронною поштою.", "До чого ми не маємо доступу", "Nora TrimTex не читає акаунти соціальних мереж, паролі, cookies інших сайтів або історію браузера.", "Замовлення", "Контактні дані та адресу доставки ми обробляємо лише після надсилання форми замовлення."],
    ru: ["Конфиденциальность", "Что мы обрабатываем", "При добавлении товара в корзину обрабатываются артикул, выбранный вариант, страница, время, язык сайта, анонимный идентификатор сессии, тип браузера и примерная страна от Cloudflare. IP-адрес преобразуется в короткий анонимный идентификатор и не передаётся в email-уведомлении.", "К чему мы не получаем доступ", "Nora TrimTex не читает аккаунты социальных сетей, пароли, cookies других сайтов или историю браузера.", "Заказы", "Контактные данные и адрес доставки обрабатываются только после отправки формы заказа и используются для предложения и доставки."],
  }[locale];
  return <article className="privacy-page"><p className="eyebrow">NORA TRIMTEX</p><h1>{content[0]}</h1><section><h2>{content[1]}</h2><p>{content[2]}</p></section><section><h2>{content[3]}</h2><p>{content[4]}</p></section><section><h2>{content[5]}</h2><p>{content[6]}</p></section><a href="mailto:info@noratrim.com">info@noratrim.com</a></article>;
}
