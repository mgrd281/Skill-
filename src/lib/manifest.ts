// manifest الموقع بلغة معينة: /manifest.webmanifest للعربية و/de/manifest.webmanifest للألمانية و/en/manifest.webmanifest للإنجليزية.
// هو ما يقرؤه أندرويد وChrome عند "إضافة إلى الشاشة الرئيسية": الاسم والأيقونات (تُولَّد بـ npm run brand).
import { type Lang, DEFAULT_LANG, dirOf, href, t as dict } from "../i18n";

export function manifest(lang: Lang): Response {
  const t = dict(lang);
  const icon = (file: string, size: number, purpose: string) => ({
    src: href(DEFAULT_LANG, file), sizes: `${size}x${size}`, type: "image/png", purpose,
  });
  const body = {
    // id مختلف لكل لغة حتى يُثبَّت كل منهما تطبيقًا مستقلًا
    id: href(lang),
    name: t.siteTitle,
    short_name: t.siteName,
    description: t.feedDesc,
    lang,
    dir: dirOf(lang),
    start_url: href(lang),
    scope: href(lang),
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    categories: ["productivity", "developer tools"],
    icons: [
      icon("icon-192.png", 192, "any"),
      icon("icon-512.png", 512, "any"),
      icon("icon-maskable-512.png", 512, "maskable"),
      { src: href(DEFAULT_LANG, "favicon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "Content-Type": "application/manifest+json; charset=utf-8" } });
}
