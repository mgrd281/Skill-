// لغات الموقع: العربية في الجذر (/) والألمانية تحت /de/. كل صفحة تُبنى مرة لكل لغة.
import { url } from "../lib/data";
import { ui } from "./ui";

export type Lang = "ar" | "de";
export const LANGS: Lang[] = ["ar", "de"];
export const DEFAULT_LANG: Lang = "ar";

export const dirOf = (lang: Lang) => (lang === "ar" ? "rtl" : "ltr");
export const LANG_NAME: Record<Lang, string> = { ar: "العربية", de: "Deutsch" };
export const OG_LOCALE: Record<Lang, string> = { ar: "ar_AR", de: "de_DE" };

// بادئة المسار: لا شيء للعربية، و"de/" للألمانية
export const prefix = (lang: Lang) => (lang === DEFAULT_LANG ? "" : lang + "/");

// رابط داخل الموقع بلغة معينة: href("de", "tools/x") => /de/tools/x
export function href(lang: Lang, path = ""): string {
  return url(prefix(lang) + path.replace(/^\//, ""));
}

// السهم الذي يشير إلى "التالي": لليسار في العربية ولليمين في الألمانية
export const fwdIcon = (lang: Lang) => (lang === "ar" ? "caret-left" : "caret-right") as "caret-left" | "caret-right";

export const t = (lang: Lang) => ui[lang];
