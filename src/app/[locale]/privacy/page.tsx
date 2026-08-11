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
    en: ["Privacy", "What we process", "To keep the basket between visits and support enquiries, we process basket contents, viewed page, referral source, time, site language, a random visitor identifier, browser type and approximate city/region/country supplied by Cloudflare. The IP address is stored only as a one-way hash.", "What we do not access", "Nora TrimTex cannot and does not read your social-media accounts, passwords, other sites’ cookies or browser history.", "Orders", "Contact, message and delivery details are processed only when you submit the relevant form. They are used to answer the request, prepare a quotation and arrange delivery."],
    de: ["Datenschutz", "Verarbeitete Daten", "Für einen dauerhaft verfügbaren Warenkorb und die Bearbeitung von Anfragen verarbeiten wir Warenkorbinhalt, besuchte Seite, Herkunftsseite, Zeitpunkt, Sprache, eine zufällige Besucherkennung, Browsertyp sowie die von Cloudflare übermittelte ungefähre Stadt, Region und das Land. Die IP-Adresse wird nur als Einweg-Hash gespeichert.", "Kein Zugriff", "Nora TrimTex liest keine Social-Media-Konten, Passwörter, Cookies anderer Websites oder den Browserverlauf.", "Bestellungen", "Kontakt-, Nachrichten- und Lieferdaten werden erst beim Absenden des jeweiligen Formulars verarbeitet und für Antwort, Angebot und Lieferung verwendet."],
    uk: ["Конфіденційність", "Що ми обробляємо", "Для збереження кошика та обробки звернень ми обробляємо вміст кошика, відвідану сторінку, джерело переходу, час, мову, випадковий ідентифікатор відвідувача, тип браузера та приблизні місто, регіон і країну від Cloudflare. IP-адреса зберігається лише як односторонній хеш.", "До чого ми не маємо доступу", "Nora TrimTex не читає акаунти соціальних мереж, паролі, cookies інших сайтів або історію браузера.", "Замовлення", "Контактні дані, повідомлення та адресу доставки ми обробляємо лише після надсилання відповідної форми."],
    ru: ["Конфиденциальность", "Что мы обрабатываем", "Чтобы сохранять корзину между посещениями и обрабатывать обращения, мы сохраняем содержимое корзины, посещённую страницу, источник перехода, время, язык сайта, случайный идентификатор гостя, тип браузера и примерные город, регион и страну от Cloudflare. IP-адрес хранится только в виде одностороннего хеша.", "К чему мы не получаем доступ", "Nora TrimTex не читает аккаунты социальных сетей, пароли, cookies других сайтов или историю браузера.", "Заказы", "Контактные данные, сообщения и адрес доставки обрабатываются только после отправки соответствующей формы и используются для ответа, предложения и доставки."],
  }[locale];
  return <article className="privacy-page"><p className="eyebrow">NORA TRIMTEX</p><h1>{content[0]}</h1><section><h2>{content[1]}</h2><p>{content[2]}</p></section><section><h2>{content[3]}</h2><p>{content[4]}</p></section><section><h2>{content[5]}</h2><p>{content[6]}</p></section><a href="mailto:info@noratrim.com">info@noratrim.com</a></article>;
}
