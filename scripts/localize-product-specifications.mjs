import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [inputArg = "data/catalog.specifications.raw.json", outputArg = "data/catalog.specifications.json"] = process.argv.slice(2);
const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const raw = JSON.parse(await readFile(inputPath, "utf8"));

const dimensionLabels = {
  幅宽: { ru: "Ширина", uk: "Ширина", en: "Width", de: "Breite" },
  整体幅宽: { ru: "Общая ширина", uk: "Загальна ширина", en: "Overall width", de: "Gesamtbreite" },
  跨度: { ru: "Длина шнура", uk: "Довжина шнура", en: "Cord length", de: "Kordellänge" },
  脖长: { ru: "Длина шейки", uk: "Довжина шийки", en: "Neck length", de: "Halslänge" },
  穗长: { ru: "Длина кисти", uk: "Довжина китиці", en: "Tassel length", de: "Quastenlänge" },
  总长: { ru: "Общая длина", uk: "Загальна довжина", en: "Overall length", de: "Gesamtlänge" },
  吊绳长: { ru: "Длина подвеса", uk: "Довжина підвісу", en: "Hanging cord", de: "Aufhängung" },
  圆盘直径: { ru: "Диаметр диска", uk: "Діаметр диска", en: "Disc diameter", de: "Scheibendurchmesser" },
  成品直径: { ru: "Диаметр изделия", uk: "Діаметр виробу", en: "Product diameter", de: "Produktdurchmesser" },
  直径: { ru: "Диаметр", uk: "Діаметр", en: "Diameter", de: "Durchmesser" },
  长: { ru: "Длина", uk: "Довжина", en: "Length", de: "Länge" },
  宽: { ru: "Ширина", uk: "Ширина", en: "Width", de: "Breite" },
  底座直径: { ru: "Диаметр основания", uk: "Діаметр основи", en: "Base diameter", de: "Sockeldurchmesser" },
  底座: { ru: "Основание", uk: "Основа", en: "Base", de: "Sockel" },
  模直径: { ru: "Диаметр основы", uk: "Діаметр основи", en: "Core diameter", de: "Kerndurchmesser" },
  绳直径: { ru: "Диаметр шнура", uk: "Діаметр шнура", en: "Cord diameter", de: "Kordeldurchmesser" },
  杆: { ru: "Длина стержня", uk: "Довжина стрижня", en: "Stem length", de: "Stablänge" },
};

const materialLabels = {
  涤纶: { ru: "Полиэстер", uk: "Поліестер", en: "Polyester", de: "Polyester" },
  腈纶: { ru: "Акрил", uk: "Акрил", en: "Acrylic", de: "Acryl" },
  棉纱: { ru: "Хлопок", uk: "Бавовна", en: "Cotton", de: "Baumwolle" },
  人丝: { ru: "Вискоза", uk: "Віскоза", en: "Rayon", de: "Viskose" },
  人棉: { ru: "Вискозное волокно", uk: "Віскозне волокно", en: "Viscose fibre", de: "Viskosefaser" },
  锦纶: { ru: "Полиамид", uk: "Поліамід", en: "Polyamide", de: "Polyamid" },
  丙纶: { ru: "Полипропилен", uk: "Поліпропілен", en: "Polypropylene", de: "Polypropylen" },
  其它带类: { ru: "Прочие ленты", uk: "Інші стрічки", en: "Other tapes", de: "Sonstige Bänder" },
  扁带: { ru: "Плоская лента", uk: "Пласка стрічка", en: "Flat tape", de: "Flachband" },
  毛: { ru: "Шерсть", uk: "Вовна", en: "Wool", de: "Wolle" },
  羊毛: { ru: "Шерсть", uk: "Вовна", en: "Wool", de: "Wolle" },
  特种纱: { ru: "Специальная пряжа", uk: "Спеціальна пряжа", en: "Specialty yarn", de: "Spezialgarn" },
  金银线: { ru: "Металлизированная нить", uk: "Металізована нитка", en: "Metallic yarn", de: "Metallgarn" },
  针织圆带: { ru: "Вязаный круглый шнур", uk: "В’язаний круглий шнур", en: "Knitted round cord", de: "Gestrickte Rundkordel" },
  雪尼尔: { ru: "Шенилл", uk: "Шеніл", en: "Chenille", de: "Chenille" },
  麻: { ru: "Лён", uk: "Льон", en: "Linen", de: "Leinen" },
  玻璃珠: { ru: "Стеклянные бусины", uk: "Скляні намистини", en: "Glass beads", de: "Glasperlen" },
  亮片: { ru: "Пайетки", uk: "Паєтки", en: "Sequins", de: "Pailletten" },
  仿珍珠: { ru: "Искусственный жемчуг", uk: "Штучні перли", en: "Imitation pearl", de: "Kunstperlen" },
  塑料模: { ru: "Пластиковая основа", uk: "Пластикова основа", en: "Plastic base", de: "Kunststoffbasis" },
  塑料: { ru: "Пластик", uk: "Пластик", en: "Plastic", de: "Kunststoff" },
  木模: { ru: "Деревянная основа", uk: "Дерев’яна основа", en: "Wooden base", de: "Holzbasis" },
  玻璃模: { ru: "Стеклянная основа", uk: "Скляна основа", en: "Glass base", de: "Glasbasis" },
  真皮: { ru: "Натуральная кожа", uk: "Натуральна шкіра", en: "Genuine leather", de: "Echtleder" },
  绒布: { ru: "Бархат", uk: "Оксамит", en: "Velvet", de: "Samt" },
  超纤皮: { ru: "Микрофибровая кожа", uk: "Мікрофіброва шкіра", en: "Microfibre leather", de: "Mikrofaserleder" },
  超纤革: { ru: "Микрофибровая кожа", uk: "Мікрофіброва шкіра", en: "Microfibre leather", de: "Mikrofaserleder" },
  金属: { ru: "Металл", uk: "Метал", en: "Metal", de: "Metall" },
  金线: { ru: "Золотистая нить", uk: "Золотиста нитка", en: "Gold thread", de: "Goldfaden" },
  钻: { ru: "Кристаллы", uk: "Кристали", en: "Crystals", de: "Kristalle" },
  铁质模: { ru: "Металлическая основа", uk: "Металева основа", en: "Metal base", de: "Metallbasis" },
  铁: { ru: "Железо", uk: "Залізо", en: "Iron", de: "Eisen" },
  铜: { ru: "Медь", uk: "Мідь", en: "Copper", de: "Kupfer" },
  涤纶网络: { ru: "Полиэстерная нить", uk: "Поліестерна нитка", en: "Polyester yarn", de: "Polyestergarn" },
  人丝强捻: { ru: "Высококрученая вискозная нить", uk: "Висококручена віскозна нитка", en: "High-twist rayon yarn", de: "Hochgedrehtes Viskosegarn" },
  人丝绣线: { ru: "Вискозная вышивальная нить", uk: "Віскозна вишивальна нитка", en: "Rayon embroidery thread", de: "Viskose-Stickgarn" },
  "贴布（涤纶）": { ru: "Полиэстеровая аппликация", uk: "Поліестерова аплікація", en: "Polyester appliqué", de: "Polyester-Applikation" },
  金属模: { ru: "Металлическая основа", uk: "Металева основа", en: "Metal base", de: "Metallbasis" },
  金线绣线: { ru: "Золотистая вышивальная нить", uk: "Золотиста вишивальна нитка", en: "Gold embroidery thread", de: "Gold-Stickgarn" },
  PU皮: { ru: "Полиуретановая кожа", uk: "Поліуретанова шкіра", en: "PU leather", de: "PU-Leder" },
  亚克力类: { ru: "Акрил", uk: "Акрил", en: "Acrylic", de: "Acryl" },
  塑料类: { ru: "Пластик", uk: "Пластик", en: "Plastic", de: "Kunststoff" },
  布: { ru: "Ткань", uk: "Тканина", en: "Fabric", de: "Stoff" },
  桑丝: { ru: "Натуральный шёлк", uk: "Натуральний шовк", en: "Mulberry silk", de: "Maulbeerseide" },
  牛皮: { ru: "Натуральная кожа", uk: "Натуральна шкіра", en: "Cowhide", de: "Rindsleder" },
  粘钻绒布带: { ru: "Бархатная лента с кристаллами", uk: "Оксамитова стрічка з кристалами", en: "Crystal velvet ribbon", de: "Samtband mit Kristallen" },
  纱带: { ru: "Текстильная лента", uk: "Текстильна стрічка", en: "Textile ribbon", de: "Textilband" },
  蜡绳: { ru: "Вощёный шнур", uk: "Вощений шнур", en: "Waxed cord", de: "Gewachste Kordel" },
  银线: { ru: "Серебристая нить", uk: "Срібляста нитка", en: "Silver thread", de: "Silberfaden" },
  鱼线: { ru: "Мононить", uk: "Мононитка", en: "Monofilament", de: "Monofilament" },
  亚克力: { ru: "Акрил", uk: "Акрил", en: "Acrylic", de: "Acryl" },
  亚麻: { ru: "Лён", uk: "Льон", en: "Linen", de: "Leinen" },
  实木: { ru: "Массив дерева", uk: "Масив дерева", en: "Solid wood", de: "Massivholz" },
  树脂: { ru: "Смола", uk: "Смола", en: "Resin", de: "Harz" },
  水晶: { ru: "Хрусталь", uk: "Кришталь", en: "Crystal", de: "Kristall" },
  玛瑙: { ru: "Агат", uk: "Агат", en: "Agate", de: "Achat" },
  皮革: { ru: "Кожа", uk: "Шкіра", en: "Leather", de: "Leder" },
  皮: { ru: "Кожа", uk: "Шкіра", en: "Leather", de: "Leder" },
  贴布: { ru: "Аппликация", uk: "Аплікація", en: "Appliqué", de: "Applikation" },
  铝合金: { ru: "Алюминиевый сплав", uk: "Алюмінієвий сплав", en: "Aluminium alloy", de: "Aluminiumlegierung" },
  陶瓷: { ru: "Керамика", uk: "Кераміка", en: "Ceramic", de: "Keramik" },
  黄铜: { ru: "Латунь", uk: "Латунь", en: "Brass", de: "Messing" },
};

const locales = ["ru", "uk", "en", "de"];

const localizeDimensions = (source, locale) => {
  let value = source;
  for (const label of Object.keys(dimensionLabels).sort((a, b) => b.length - a.length)) {
    value = value.replaceAll(label, `${dimensionLabels[label][locale]}: `);
  }
  return value
    .replace(/[：:]\s*[：:]+/g, ": ")
    .replace(/[\/，,、；;]/g, " · ")
    .replace(/(\d)\.00(?=\s*mm)/g, "$1")
    .replace(/\s*mm\b/gi, " mm")
    .replace(/(\d)mm\b/gi, "$1 mm")
    .replace(/\s*·\s*/g, " · ")
    .replace(/\s+/g, " ")
    .trim();
};

const localizeComposition = (source, locale) => {
  let value = source.replace(/^[，,；;\s]+/, "").replace(/[，,；;]/g, " · ");
  for (const label of Object.keys(materialLabels).sort((a, b) => b.length - a.length)) {
    value = value.replaceAll(label, materialLabels[label][locale]);
  }
  return value
    .replace(/[：:]\s*/g, " ")
    .replace(/(\p{L})(?=\d)/gu, "$1 ")
    .replace(/%\s*(?=\p{L})/gu, "% · ")
    .replace(/\s+/g, " ")
    .trim();
};

const output = {};
for (const [productId, item] of Object.entries(raw)) {
  const dimensions = item.dimensionsZh
    ? Object.fromEntries(locales.map((locale) => [locale, localizeDimensions(item.dimensionsZh, locale)]))
    : undefined;
  const composition = item.compositionZh
    ? Object.fromEntries(locales.map((locale) => [locale, localizeComposition(item.compositionZh, locale)]))
    : undefined;
  output[productId] = {
    sku: item.sku,
    ...(dimensions ? { dimensions } : {}),
    ...(composition ? { composition } : {}),
  };
}

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`${Object.keys(output).length} localized product specifications written to ${outputPath}`);
