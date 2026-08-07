import type { CategoryDocument } from "./types.js";

export const categorySeed: CategoryDocument[] = [
  { id: "tassels-large", slug: "large-tassels", names: { en: "Large tassels", de: "Große Quasten", uk: "Великі китиці", ru: "Большие кисти" }, sortOrder: 10, active: true },
  { id: "tassels-small", slug: "small-tassels", names: { en: "Small tassels", de: "Kleine Quasten", uk: "Малі китиці", ru: "Малые кисти" }, sortOrder: 20, active: true },
  { id: "tassel-trim", slug: "tassel-trims", names: { en: "Tassel trims", de: "Quastenborten", uk: "Бахрома з китицями", ru: "Бахрома с кистями" }, sortOrder: 30, active: true },
  { id: "decorative-tapes", slug: "borders-and-braids", names: { en: "Borders & braids", de: "Bordüren & Borten", uk: "Бордюри й тасьма", ru: "Бордюры, тесьмы" }, sortOrder: 40, active: true },
  { id: "fringe", slug: "fringes", names: { en: "Fringes", de: "Fransen", uk: "Бахрома", ru: "Бахрома" }, sortOrder: 50, active: true },
  { id: "cord-fringe", slug: "cord-fringes", names: { en: "Cord fringes", de: "Kordelfransen", uk: "Шнурова бахрома", ru: "Шнуровая бахрома" }, sortOrder: 60, active: true },
  { id: "cords", slug: "cords-and-piping", names: { en: "Cords & piping", de: "Kordeln & Paspeln", uk: "Шнури й канти", ru: "Шнуры и канты" }, sortOrder: 70, active: true },
  { id: "holdbacks", slug: "wall-hooks-and-rosettes", names: { en: "Wall hook / rosette", de: "Wandhaken / Rosette", uk: "Настінний гачок / розетка", ru: "Настенный крючок / розетка" }, sortOrder: 80, active: true },
  { id: "home", slug: "home", names: { en: "Home", de: "Wohnen", uk: "Дім", ru: "Дом" }, sortOrder: 90, active: true },
  { id: "samples", slug: "samples", names: { en: "Sample", de: "Muster", uk: "Зразок", ru: "Образец" }, sortOrder: 100, active: true },
];
