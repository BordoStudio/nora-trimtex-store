import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { languageAlternates, siteUrl } from "@/lib/site";

const content = {
  en: {
    eyebrow: "ABOUT NORA",
    title: "Decor that completes the look of your curtains.",
    intro: "We offer premium tassels, fringes, braids, rosettes and hooks. Nora TrimTex brings colour, texture and form together to complete your curtains.",
    storyTitle: "Fabric and decor in harmony",
    story: "Soft fringe defines an edge, braid introduces rhythm and tassels gather folds into a graceful silhouette. From quiet cream shades to rich, saturated tones, find a combination that complements your interior.",
    pillars: [["Tassels and fringes", "Expressive silhouettes, flowing threads and rich textures for classic and contemporary curtains."], ["Braids and cords", "Finish an edge, introduce a contrast or create a subtle tonal pairing with your fabric."], ["Rosettes and hooks", "Finishing accents that bring balance to the composition and frame your drapery."]],
    catalogue: "Explore the catalogue", account: "Create an account",
  },
  de: {
    eyebrow: "ÜBER NORA",
    title: "Dekor, der Ihre Vorhänge vollendet.",
    intro: "Wir bieten Quasten, Fransen, Borten, Rosetten und Haken der Premiumklasse. Nora TrimTex verbindet Farbe, Struktur und Form zu einem stimmigen Gesamtbild für Ihre Vorhänge.",
    storyTitle: "Stoff und Dekor im Einklang",
    story: "Weiche Fransen betonen die Stoffkante, Borten setzen Akzente und Quasten fassen Falten zu einer eleganten Silhouette. Von sanften Cremetönen bis zu satten Farben — finden Sie die Kombination, die zu Ihrem Interieur passt.",
    pillars: [["Quasten und Fransen", "Ausdrucksvolle Formen, fließende Fäden und schöne Texturen für klassische und moderne Vorhänge."], ["Borten und Kordeln", "Für einen eleganten Kantenabschluss, einen bewussten Kontrast oder eine feine Ton-in-Ton-Kombination."], ["Rosetten und Haken", "Abschließende Akzente, die der Komposition Halt geben und Ihre Drapierung einrahmen."]],
    catalogue: "Katalog entdecken", account: "Konto erstellen",
  },
  uk: {
    eyebrow: "ПРО БРЕНД",
    title: "Декор, що довершує образ ваших штор.",
    intro: "Ми пропонуємо китиці, бахрому, тасьму, розетки та гачки преміумкласу. Nora TrimTex — декор для штор, у якому колір, фактура й форма створюють цілісний образ.",
    storyTitle: "Гармонія тканини й декору",
    story: "М’яка бахрома підкреслює край тканини, тасьма задає ритм, а китиці красиво збирають складки. Від спокійних молочних відтінків до глибоких насичених тонів — оберіть поєднання, що підтримає характер вашого інтер’єру.",
    pillars: [["Китиці та бахрома", "Виразні силуети, м’який рух ниток і красиві поєднання фактур для класичних та сучасних штор."], ["Тасьма та шнури", "Для оформлення краю, контрастного акценту чи тонкого поєднання з основною тканиною."], ["Розетки та гачки", "Завершальні акценти, які підтримують композицію та красиво обрамлюють драпірування."]],
    catalogue: "Переглянути каталог", account: "Створити акаунт",
  },
  ru: {
    eyebrow: "О БРЕНДЕ",
    title: "Декор, который завершает образ ваших штор.",
    intro: "Мы предлагаем кисти, бахрому, тесьмы, розетки и крючки премиум-класса. Nora TrimTex — декор для штор, в котором цвет, фактура и форма создают цельный образ.",
    storyTitle: "Гармония ткани и декора",
    story: "Мягкая бахрома подчёркивает край ткани, тесьма задаёт ритм, а кисти красиво собирают складки. От спокойных молочных оттенков до глубоких насыщенных тонов — подберите сочетание, которое поддержит характер вашего интерьера.",
    pillars: [["Кисти и бахрома", "Выразительные силуэты, мягкое движение нитей и красивые сочетания фактур для классических и современных штор."], ["Тесьмы и шнуры", "Для оформления края, контрастного акцента или тонкого сочетания в тон основной ткани."], ["Розетки и крючки", "Завершающие акценты, которые поддерживают композицию и красиво обрамляют драпировку."]],
    catalogue: "Смотреть каталог", account: "Создать аккаунт",
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = content[locale];
  const path = "/about";
  return {
    title: copy.eyebrow,
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
      <div className="about-hero-image"><Image src="/brand/hero-collage-beige-v2.png" alt="Nora TrimTex curtain trimmings" fill priority sizes="(max-width: 760px) 100vw, 46vw" /></div>
    </header>
    <section className="about-story"><div><p className="eyebrow">NORA TRIMTEX</p><h2>{copy.storyTitle}</h2></div><p>{copy.story}</p></section>
    <section className="about-pillars">{copy.pillars.map(([title, body], index) => <div key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{body}</p></div>)}</section>
    <section className="about-actions"><Link className="button primary" href={`/${locale}/catalog`}>{copy.catalogue}<ArrowRight /></Link><Link className="button outline" href={`/${locale}/account/register`}>{copy.account}</Link></section>
  </article>;
}
