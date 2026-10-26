// بيانات صفحة المقارنة لكل لغة (/compare.json و/de/compare.json و/en/compare.json): ما تعرضه الصفحة جاهزًا بلغتها،
// فتبقى صفحة المقارنة نفسها قالبًا ثابتًا يملؤه src/scripts/compare.js بالأدوات المختارة.
import { tools, toolDesc, catName, kindLabel, projName, projectById, formatDate, licenseTone } from "./data";
import { trust } from "./trust";
import { mcpServer } from "./install.js";
import { type Lang, t as dict } from "../i18n";

// طرق التثبيت المتاحة للأداة، بلغة الصفحة
function installWays(cmd: string | null, isMcp: boolean, isApp: boolean, lang: Lang): string {
  const t = dict(lang);
  if (isMcp) return "Claude Code · Cursor · VS Code · Claude Desktop";
  if (!cmd) return isApp ? t.cmpWayDownload : t.cmpWayWeb;
  if (/(^|\n)(\/plugin|claude plugins?) /.test(cmd)) return t.cmpWayPlugin;
  if (/^npx (-y )?skills/.test(cmd)) return t.cmpWaySkills;
  if (/^claude mcp add /.test(cmd)) return "Claude Code";
  return t.cmpWayTerminal;
}

export function compareIndex(lang: Lang) {
  const t = dict(lang);
  const now = Date.now();
  return {
    tools: tools.map((x) => {
      const tr = trust(x, lang);
      const row = (id: string) => tr.rows.find((r) => r.id === id);
      const cell = (id: string) => { const r = row(id); return r ? [r.value, r.tone] : null; };
      const lic = x.license ? (x.license === "none" ? t.noLicense : x.license === "other" ? (x.kind === "تطبيق" ? t.otherLicenseApp : t.otherLicense) : x.license) : null;
      const licWarn = licenseTone(x);
      const old = !!x.pushed && (now - new Date(x.pushed).getTime()) / 864e5 > 365;
      return {
        s: x.slug, n: x.name, k: kindLabel(x.kind, lang), c: x.cat, cn: catName(x.cat, lang),
        ...(x.stars ? { st: x.stars } : {}),
        d: toolDesc(x, lang),
        pub: cell("pub"), run: cell("run"), src: cell("src"),
        ...(lic ? { lic, ...(licWarn ? { lw: licWarn } : {}) } : {}),
        ...(x.archived ? { arch: 1 } : {}),
        ...(x.pushed ? { up: formatDate(x.pushed, lang), ...(old ? { old: 1 } : {}) } : {}),
        ad: formatDate(x.added.slice(0, 10), lang),
        way: installWays(x.cmd, !!mcpServer(x), x.kind === "تطبيق", lang),
        ...(x.cmd ? { m: x.cmd } : {}),
        use: x.use.map((u) => projName(projectById(u)!, lang)),
      };
    }),
  };
}

// مقارنات مقترحة: أدوات تحل المشكلة نفسها فعلًا (اختيار يدوي، مثل بقية الدليل). أداة حُذفت تسقط من القائمة،
// والمقارنة التي يبقى فيها أقل من أداتين لا تظهر.
const SUGGESTED = [
  ["context7", "chrome-devtools-mcp", "playwright-mcp"],
  ["gsap", "motion", "anime-js"],
  ["lucide", "tabler-icons", "phosphor"],
  ["shadcn-ui", "daisyui", "radix-ui"],
  ["frontend-design", "ui-ux-pro-max", "impeccable"],
  ["remotion", "motion-canvas", "manim"],
  ["lighthouse-ci", "unlighthouse", "squirrelscan"],
  ["humanizer", "avoid-ai-writing", "marketing-skills"],
];
export function compareSuggestions(lang: Lang) {
  const bySlug = new Map(tools.map((x) => [x.slug, x]));
  return SUGGESTED.map((g) => g.map((s) => bySlug.get(s)).filter((x) => !!x))
    .filter((g) => g.length >= 2)
    .map((g) => ({ cat: catName(g[0]!.cat, lang), slugs: g.map((x) => x!.slug), names: g.map((x) => x!.name) }));
}
