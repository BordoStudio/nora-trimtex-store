import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nora TrimTex",
    short_name: "Nora TrimTex",
    description: "Curtain trimmings, tassels, wall hooks, rosettes, fringes, piping, braids and cords for interior projects.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf3",
    theme_color: "#30221b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
