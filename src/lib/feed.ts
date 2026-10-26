// خلاصة RSS لأحدث الأدوات بلغة معينة: /feed.xml للعربية و/de/feed.xml للألمانية و/en/feed.xml للإنجليزية.
import { recentTools, toolDesc, catName } from "./data";
import { type Lang, href, t as dict } from "../i18n";

const x = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function feed(lang: Lang, site: URL | undefined): Response {
  const t = dict(lang);
  const abs = (path: string) => new URL(href(lang, path), site ?? "https://example.com").href;
  const items = recentTools
    .map((tool) => {
      const link = abs("tools/" + tool.slug);
      return `    <item>
      <title>${x(tool.name)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <category>${x(catName(tool.cat, lang))}</category>
      <pubDate>${new Date(tool.added).toUTCString()}</pubDate>
      <description>${x(toolDesc(tool, lang))}</description>
    </item>`;
    })
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${x(t.feedTitle)}</title>
    <link>${abs("")}</link>
    <description>${x(t.feedDesc)}</description>
    <language>${lang}</language>
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
