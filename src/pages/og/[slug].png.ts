import type { APIContext } from "astro";
import { tools } from "../../lib/data";
import { toolImage } from "../../lib/og";

export function getStaticPaths() {
  return tools.map((t) => ({ params: { slug: t.slug }, props: { tool: t } }));
}

export async function GET({ props, site }: APIContext) {
  const host = new URL(site ?? "https://example.com").host;
  const png = await toolImage(props.tool, host);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
