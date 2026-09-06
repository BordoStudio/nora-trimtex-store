export const categoryIds = [
  "tassels-large",
  "tassels-small",
  "tassel-trim",
  "fringe",
  "cord-fringe",
  "decorative-tapes",
  "cords",
  "holdbacks",
  "home",
  "samples",
] as const;

export type CategoryId = (typeof categoryIds)[number];
