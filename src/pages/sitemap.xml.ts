import type { APIContext } from "astro";
import { tools, categories } from "../lib/data";
import { LANGS, DEFAULT_LANG, href } from "../i18n";

// كل صفحة بلغاتها الثلاث، مع روابط hreflang بين النسخ
export function GET({ site }: APIContext) {
  const abs = (lang: (typeof LANGS)[number], path: string) => new URL(href(lang, path), site ?? "https://example.com").href;
  const paths = ["", "privacy", ...categories.map((c) => "category/" + c.id), ...tools.map((t) => "tools/" + t.slug)];
  const alts = (path: string) =>
    LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(l, path)}"/>`).join("") +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(DEFAULT_LANG, path)}"/>`;
  const urls = LANGS.flatMap((lang) => paths.map((p) => `  <url><loc>${abs(lang, p)}</loc>${alts(p)}</url>`));
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls.join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
