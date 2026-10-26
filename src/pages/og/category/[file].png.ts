import type { APIContext } from "astro";
import { categories } from "../../../lib/data";
import { categoryImage } from "../../../lib/og";

// /og/category/<id>-de.png و<id>-en.png (الصفحة العربية تستخدم الإنجليزية: src/views/Category.astro)
export function getStaticPaths() {
  return categories.flatMap((c) => (["de", "en"] as const).map((lang) => ({ params: { file: `${c.id}-${lang}` }, props: { cat: c, lang } })));
}

export async function GET({ props, site }: APIContext) {
  const host = new URL(site ?? "https://example.com").host;
  const png = await categoryImage(props.cat, props.lang, host);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
