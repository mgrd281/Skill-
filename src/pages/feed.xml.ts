import type { APIContext } from "astro";
import { recentTools, categoryById } from "../lib/data";

const x = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET({ site }: APIContext) {
  const base = (site ?? new URL("https://example.com")).href.replace(/\/$/, "");
  const items = recentTools
    .map((t) => {
      const link = `${base}/tools/${t.slug}`;
      return `    <item>
      <title>${x(t.name)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <category>${x(categoryById(t.cat).name)}</category>
      <pubDate>${new Date(t.added).toUTCString()}</pubDate>
      <description>${x(t.desc)}</description>
    </item>`;
    })
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>دليل أدوات التصميم والتطوير: أحدث الإضافات</title>
    <link>${base}/</link>
    <description>أحدث الأدوات المضافة إلى الدليل</description>
    <language>ar</language>
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
