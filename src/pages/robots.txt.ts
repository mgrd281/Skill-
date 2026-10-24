import type { APIContext } from "astro";

export function GET({ site }: APIContext) {
  const base = (site ?? new URL("https://example.com")).href.replace(/\/$/, "");
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain" },
  });
}
