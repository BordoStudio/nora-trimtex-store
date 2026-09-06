import { headers } from "next/headers";
import { redirect } from "next/navigation";

const supported = ["ru", "uk", "de", "en"] as const;
type SupportedLocale = (typeof supported)[number];

function preferredLocale(acceptLanguage: string): SupportedLocale {
  const requested = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().toLowerCase().split(";");
      const quality = Number(parameters.find((value) => value.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { language: tag.split("-")[0] === "ua" ? "uk" : tag.split("-")[0], quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return requested.find((item) => supported.includes(item.language as SupportedLocale))?.language as SupportedLocale || "en";
}

export default async function RootPage() {
  const requestHeaders = await headers();
  if (requestHeaders.get("host")?.split(":")[0].toLowerCase() === "admin.noratrim.com") redirect("/admin");
  const acceptLanguage = requestHeaders.get("accept-language") || "";
  redirect(`/${preferredLocale(acceptLanguage)}`);
}
