import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { languageAlternates, siteUrl } from "@/lib/site";

const content = {
  en: {
    eyebrow: "NORA TRIMTEX · CURTAIN TRIMMINGS",
    title: "Beautiful curtains begin with the right detail.",
    intro: "We curate tassels, wall hooks, rosettes, fringes, piping, braids and cords for private interiors and professional curtain projects.",
    storyTitle: "A collection designed for easy selection",
    story: "Nora TrimTex shows not only the product, but the part it can play in an interior. The catalogue is organised by trimming type, article and colour, helping designers, decorators and curtain studios find the right solution quickly.",
    pillars: [["Design", "We select trimmings that complement the fabric, curtain silhouette and character of the room."], ["Choice", "Articles and colourways are shown clearly, at useful scale and without unnecessary repetition."], ["Service", "We confirm dimensions, composition, availability, samples, lead times and delivery before the order."]],
    catalogue: "Explore the catalogue", trade: "Designer access",
  },
  de: {
    eyebrow: "NORA TRIMTEX · VORHANGZUBEHÖR",
    title: "Schöne Vorhänge beginnen mit dem richtigen Detail.",
    intro: "Wir kuratieren Quasten, Wandhaken, Rosetten, Fransen, Paspeln, Borten und Kordeln für private Interieurs und professionelle Vorhangprojekte.",
    storyTitle: "Eine Kollektion, in der Auswahl leichtfällt",
    story: "Nora TrimTex zeigt nicht nur das einzelne Produkt, sondern seine Wirkung im Interieur. Der Katalog ist nach Zubehörart, Artikel und Farbe geordnet, damit Designer, Dekorateure und Gardinenstudios schnell die passende Lösung finden.",
    pillars: [["Design", "Wir wählen Zubehör, das Stoff, Vorhangform und Charakter des Raumes unterstreicht."], ["Auswahl", "Artikel und Farbvarianten werden klar, groß und ohne unnötige Wiederholungen gezeigt."], ["Service", "Maße, Material, Verfügbarkeit, Muster, Lieferzeit und Versand bestätigen wir vor der Bestellung."]],
    catalogue: "Katalog entdecken", trade: "Zugang für Designer",
  },
  uk: {
    eyebrow: "NORA TRIMTEX · ФУРНІТУРА ДЛЯ ШТОР",
    title: "Красиві штори починаються з правильної деталі.",
    intro: "Ми добираємо китиці, настінні гачки, розетки, бахрому, канти, тасьму й шнури для приватних інтер’єрів і професійних проєктів.",
    storyTitle: "Колекція, у якій легко обирати",
    story: "Nora TrimTex допомагає побачити не лише окремий виріб, а його роль в інтер’єрі. Каталог упорядкований за типом фурнітури, артикулом і кольором, щоб дизайнери, декоратори та салони штор швидше знаходили потрібне рішення.",
    pillars: [["Дизайн", "Добираємо фурнітуру, що підкреслює тканину, форму штор і характер простору."], ["Вибір", "Показуємо артикули й кольорові варіанти крупно, зрозуміло та без повторів."], ["Сервіс", "Уточнюємо розміри, склад, наявність, зразки, терміни й умови постачання до замовлення."]],
    catalogue: "Переглянути каталог", trade: "Доступ для дизайнерів",
  },
  ru: {
    eyebrow: "NORA TRIMTEX · ФУРНИТУРА ДЛЯ ШТОР",
    title: "Красивые шторы начинаются с правильной детали.",
    intro: "Мы собираем выразительные кисти, настенные крючки, розетки, бахрому, бордюры, тесьмы и шнуры для частных интерьеров и профессиональных проектов.",
    storyTitle: "Коллекция, в которой легко выбирать",
    story: "Nora TrimTex помогает увидеть не просто отдельное изделие, а его роль в интерьере. Каталог организован по типу фурнитуры, артикулу и цвету, чтобы дизайнеры, декораторы и салоны штор быстрее находили подходящее решение.",
    pillars: [["Дизайн", "Подбираем фурнитуру, которая подчёркивает ткань, форму штор и характер пространства."], ["Выбор", "Показываем артикулы и цветовые варианты крупно, понятно и без повторов."], ["Сервис", "Уточняем размеры, состав, наличие, образцы, сроки и условия поставки перед заказом."]],
    catalogue: "Смотреть каталог", trade: "Доступ для дизайнеров",
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = content[locale];
  const path = "/about";
  return {
    title: copy.eyebrow.split(" · ")[1],
    description: copy.intro,
    alternates: { canonical: `${siteUrl}/${locale}${path}`, languages: languageAlternates(path) },
    openGraph: { url: `${siteUrl}/${locale}${path}`, title: copy.title, description: copy.intro },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = content[locale];
  return <article className="about-page">
    <header className="about-hero">
      <div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.intro}</p></div>
      <div className="about-hero-image"><Image src="/brand/hero.jpg" alt="Nora TrimTex curtain trimmings" fill priority sizes="(max-width: 760px) 100vw, 46vw" /></div>
    </header>
    <section className="about-story"><div><p className="eyebrow">01 · NORA</p><h2>{copy.storyTitle}</h2></div><p>{copy.story}</p></section>
    <section className="about-pillars">{copy.pillars.map(([title, body], index) => <div key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{body}</p></div>)}</section>
    <section className="about-statements"><div><strong>968</strong><span>ARTICLES</span></div><div><strong>4</strong><span>LANGUAGES</span></div><div><strong>B2B</strong><span>PROJECT SERVICE</span></div></section>
    <section className="about-actions"><Link className="button primary" href={`/${locale}/catalog`}>{copy.catalogue}<ArrowRight /></Link><Link className="button outline" href={`/${locale}/trade`}>{copy.trade}</Link></section>
  </article>;
}
