export const categoryIds = [
  "tassels-large",
  "tassels-small",
  "tassel-trim",
  "decorative-tapes",
  "fringe",
  "cord-fringe",
  "cords",
  "holdbacks",
  "home",
  "samples",
] as const;

export type CategoryId = (typeof categoryIds)[number];
