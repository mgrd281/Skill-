// صور المشاركة (Open Graph) لكل أداة: تُرسم وقت البناء بـ satori ثم تُحوَّل إلى PNG بـ resvg.
// نصوص الصورة لاتينية فقط (اسم الأداة والنجوم والأمر)، لأن satori لا يدعم تشكيل الحروف العربية،
// فالصورة نفسها تصلح للغتين. صورتا الصفحة الرئيسية ثابتتان في public/og/.
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { type Tool, type Category, initials, isLatin, tools, catName, categoryIcon } from "./data";
import { ICONS } from "./icons";
import { markDataUrl } from "./brand.js";

// المسار من جذر المشروع: هذا الملف يُجمَّع في مجلد آخر وقت البناء فلا يصلح المسار النسبي
const font = (p: string) => fs.readFileSync(path.join(process.cwd(), "node_modules", p));
const fonts = [
  { name: "Plex", data: font("@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
  { name: "Plex", data: font("@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-700-normal.woff"), weight: 700 as const, style: "normal" as const },
  { name: "Mono", data: font("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
];

type Node = { type: string; props: Record<string, any> };
const h = (type: string, style: Record<string, any>, ...children: any[]): Node => ({
  type, props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});

// شعار الدليل (الرسم في brand.js) كصورة SVG
const LOGO = markDataUrl();

// نجمة Phosphor الممتلئة بلون النجوم في الموقع (الخط لا يحتوي الرمز ★)
const STAR = "data:image/svg+xml;base64," + Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="#E9A700" d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"/></svg>`
).toString("base64");

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export async function toolImage(t: Tool, host: string): Promise<Buffer> {
  const pill = (text: string, extra: Record<string, any> = {}) =>
    h("div", { alignItems: "center", gap: 10, padding: "10px 22px", borderRadius: 999, background: "#F5F5F7", color: "#424245", fontSize: 30, fontWeight: 500, ...extra }, text);
  const meta: Node[] = [];
  if (isLatin(t.kind)) meta.push(pill(t.kind));
  if (t.stars) meta.push(h("div", { alignItems: "center", gap: 10, padding: "10px 22px", borderRadius: 999, background: "#F5F5F7", color: "#1D1D1F", fontSize: 30, fontWeight: 500 },
    { type: "img", props: { src: STAR, width: 28, height: 28 } }, `${t.stars} GitHub`));
  const tree = h("div", { width: 1200, height: 630, flexDirection: "column", padding: "64px 72px 60px", background: "#FFFFFF", fontFamily: "Plex", color: "#1D1D1F" },
    h("div", { height: 56, flexShrink: 0, alignItems: "center", gap: 18 },
      { type: "img", props: { src: LOGO, width: 52, height: 52 } },
      h("div", { fontSize: 30, fontWeight: 500, color: "#6E6E73" }, host),
    ),
    h("div", { height: 360, flexShrink: 0, alignItems: "center", gap: 44 },
      h("div", { width: 172, height: 172, borderRadius: 44, background: "#2446D6", color: "#FFFFFF", alignItems: "center", justifyContent: "center", fontSize: 76, fontWeight: 700, flexShrink: 0 }, initials(t.name)),
      h("div", { flexDirection: "column", gap: 22, maxWidth: 840 },
        h("div", { fontSize: t.name.length > 22 ? 72 : 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" }, clip(t.name, 40)),
        ...(meta.length ? [h("div", { gap: 14 }, ...meta)] : []),
      ),
    ),
    t.cmd
      ? h("div", { height: 76, flexShrink: 0, alignSelf: "flex-start", alignItems: "center", maxWidth: 1056, padding: "0 28px", borderRadius: 20, background: "#F5F5F7", fontFamily: "Mono", fontSize: 30, color: "#1D1D1F", whiteSpace: "nowrap", overflow: "hidden" }, "$ " + clip(t.cmd, 50))
      : h("div", { height: 0 }, ""),
  );
  const svg = await satori(tree as any, { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}

// صورة مشاركة لكل قسم بالألمانية والإنجليزية (العربية تستخدم الإنجليزية: satori لا يشكّل الحروف العربية):
// أيقونة القسم واسمه وعدد أدواته، وأسماء أعلى أدواته نجومًا.
export async function categoryImage(c: Category, lang: "de" | "en", host: string): Promise<Buffer> {
  const list = tools.filter((x) => x.cat === c.id).sort((a, b) => b.starsN - a.starsN || a.order - b.order);
  const name = catName(c.id, lang);
  const icon = "data:image/svg+xml;base64," + Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="#FFFFFF">${ICONS[categoryIcon(c.id)].duotone}</svg>`
  ).toString("base64");
  const count = lang === "de" ? `${list.length} Tools` : `${list.length} tools`;
  const pill = (text: string) =>
    h("div", { alignItems: "center", padding: "10px 22px", borderRadius: 999, background: "#F5F5F7", color: "#1D1D1F", fontSize: 28, fontWeight: 500 }, clip(text, 26));
  const tree = h("div", { width: 1200, height: 630, flexDirection: "column", padding: "64px 72px 60px", background: "#FFFFFF", fontFamily: "Plex", color: "#1D1D1F" },
    h("div", { height: 56, flexShrink: 0, alignItems: "center", gap: 18 },
      { type: "img", props: { src: LOGO, width: 52, height: 52 } },
      h("div", { fontSize: 30, fontWeight: 500, color: "#6E6E73" }, host),
    ),
    h("div", { height: 330, flexShrink: 0, alignItems: "center", gap: 44 },
      h("div", { width: 172, height: 172, borderRadius: 44, background: "#2446D6", alignItems: "center", justifyContent: "center", flexShrink: 0 },
        { type: "img", props: { src: icon, width: 104, height: 104 } }),
      h("div", { flexDirection: "column", gap: 18, maxWidth: 840 },
        h("div", { fontSize: name.length > 24 ? 64 : 82, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em" }, clip(name, 48)),
        h("div", { fontSize: 32, fontWeight: 500, color: "#6E6E73" }, count),
      ),
    ),
    h("div", { width: 1056, gap: 14, flexWrap: "wrap", maxHeight: 136, overflow: "hidden" }, ...list.filter((x) => isLatin(x.name)).slice(0, 6).map((x) => pill(x.name))),
  );
  const svg = await satori(tree as any, { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
