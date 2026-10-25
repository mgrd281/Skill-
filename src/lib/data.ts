import toolsJson from "../../data/tools.json";
import categoriesJson from "../../data/categories.json";
import projectsJson from "../../data/projects.json";
import meta from "../../data/meta.json";

export interface Tool {
  slug: string;
  cat: string;
  name: string;
  kind: string;
  isNew: boolean;
  gh: string | null;
  site: string | null;
  stars: string | null;
  starsN: number;
  cmd: string | null;
  use: string[];
  desc: string;
  pushed: string | null;
  license?: string | null;
  archived?: boolean;
  added: string;
  order: number;
}
export interface Category { id: string; name: string }
export interface Project {
  id: string; name: string; icon: string; advice: string; picks: string[];
  pickSlugs: string[]; cats?: string[]; count: number;
}

export const GH = "https://github.com/";
export const starsUpdatedAt: string = meta.starsUpdatedAt;

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function parseStars(s: string | null): number {
  if (!s) return -1;
  const m = /^([\d.]+)\s*k$/i.exec(s);
  return m ? Math.round(parseFloat(m[1]) * 1000) : parseInt(s, 10) || 0;
}

export const categories: Category[] = categoriesJson;

const rawProjects = projectsJson as Array<Omit<Project, "pickSlugs" | "count">>;

// "جديد" تُشتق من تاريخ الإضافة (آخر 14 يومًا)، فتنتهي تلقائيًا بدل حقل يدوي يبقى مفعّلًا.
// أدوات الدفعة الأولى التي أُطلق بها الدليل لا تُعدّ جديدة، وإلا حملت كل البطاقات الشارة.
export const NEW_DAYS = 14;
const buildTime = Date.now();
const catalogStart = (toolsJson as any[]).reduce((m, t) => (t.added < m ? t.added : m), "9999");

export const tools: Tool[] = (toolsJson as any[]).map((t, i) => ({
  ...t, order: i, starsN: parseStars(t.stars),
  isNew: t.added > catalogStart && (buildTime - new Date(t.added).getTime()) / 864e5 <= NEW_DAYS,
}));

export function inProject(t: Tool, p: { id: string; cats?: string[] }): boolean {
  return t.use.includes(p.id) || !!(p.cats && p.cats.includes(t.cat));
}

export const projects: Project[] = rawProjects.map((p) => ({
  ...p,
  pickSlugs: p.picks.map(slugify),
  count: tools.filter((t) => inProject(t, p)).length,
}));

export const projectById = (id: string) => projects.find((p) => p.id === id);
export const categoryById = (id: string) => categories.find((c) => c.id === id)!;

// ---- عرض النصوص: عربي مع كلمات لاتينية معزولة بـ <bdi> ----
export function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const LATIN = /[A-Za-z][\w+\-\/@.]*[A-Za-z0-9](?:\s+[A-Za-z0-9][\w+\-\/@.]*[A-Za-z0-9])*|[A-Za-z]/g;
export function rich(s: string): string {
  return esc(s).replace(LATIN, (m) => "<bdi>" + m + "</bdi>");
}
export function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
export function repoLabel(url: string): string {
  const p = url.replace(GH, "").split("/").filter(Boolean);
  if (p.length >= 5) return p[0] + "/" + p[1] + " › " + p[p.length - 1];
  return p.join("/");
}
export const isLatin = (s: string) => /^[\x00-\x7F]+$/.test(s);
export const isAppStore = (u: string) => /apps\.apple\.com/.test(u);

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${d} ${months[m - 1]} ${y}`;
}

// الرابط مع احترام base (مفيد لو نُشر الموقع في مجلد فرعي)
export function url(path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base + "/" + path.replace(/^\//, "");
}

// أحدث الأدوات إضافة (للجرس وخلاصة RSS)
export const recentTools: Tool[] = [...tools]
  .sort((a, b) => b.added.localeCompare(a.added) || b.order - a.order)
  .slice(0, 30);

// ---- شارات الحالة: أرشفة، قِدم، رخصة (تُحسب وقت البناء من بيانات GitHub) ----
export interface Badge { kind: "ok" | "warn" | "bad"; text: string; latin?: string; title: string }
const RUNS_REMOTE_SCRIPT = /(curl|wget)[^\n]*\|\s*(ba|z)?sh|(ba|z)?sh\s+-c\s+"\$\((curl|wget)/i;
const RESTRICTIVE = /AGPL|GPL|SSPL|BUSL|CC-BY-NC|Elastic|Commons|Sustainable/i;

export function statusBadges(t: Tool, now = Date.now()): Badge[] {
  const out: Badge[] = [];
  if (t.archived) {
    out.push({ kind: "bad", text: "مؤرشف", title: "المستودع مؤرشف: لم يعد صاحبه يطوّره" });
  } else if (t.pushed) {
    const days = (now - new Date(t.pushed).getTime()) / 864e5;
    if (days > 365) out.push({ kind: "warn", text: "آخر تحديث", latin: t.pushed.slice(0, 7), title: "لم يُحدَّث المستودع منذ أكثر من سنة" });
  }
  if (t.cmd && RUNS_REMOTE_SCRIPT.test(t.cmd)) {
    out.push({ kind: "warn", text: "ينفّذ سكربتًا من الإنترنت", title: "أمر التثبيت يحمّل سكربتًا من الإنترنت وينفّذه مباشرة. افتح مصدره واقرأه قبل تشغيله" });
  }
  const l = t.license;
  if (l === "none") out.push({ kind: "bad", text: "بدون رخصة", title: "لا رخصة معلنة في المستودع: غالبًا لا يُسمح باستخدامه. اقرأ صفحته قبل الاعتماد عليه" });
  else if (l === "other") out.push({ kind: "warn", text: "رخصة خاصة", title: "رخصة غير قياسية: اقرأ ملف الرخصة قبل الاستخدام التجاري" });
  else if (l) {
    const warn = RESTRICTIVE.test(l);
    out.push({ kind: warn ? "warn" : "ok", text: "", latin: l, title: warn ? `رخصة ${l} لها شروط على الاستخدام التجاري: اقرأها` : `الرخصة: ${l}` });
  }
  return out;
}

// ---- هوية بصرية لكل أداة: حرفان ولون من قسمها ----
export function initials(name: string): string {
  const words = name.split(/[\s\-_/.]+/).filter((w) => /[A-Za-z0-9]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = (words[0] || name).replace(/[^A-Za-z0-9]/g, "");
  return (w[0] || "?").toUpperCase() + (w[1] || "").toLowerCase();
}

// ---- أيقونة لكل نوع وقسم ونوع مشروع (من مجموعة Icon.astro، بلون واحد) ----
const KIND_ICON: Record<string, string> = {
  Skill: "sparkles", MCP: "plug", "مكتبة": "box", "أداة": "wrench", "موقع": "globe", "منصة": "layers", "تطبيق": "phone",
};
export const kindIcon = (kind: string): any => KIND_ICON[kind] ?? "box";

const CAT_ICON: Record<string, string> = {
  design: "pen-tool", brandskills: "palette", animation: "wand", motiongfx: "video", shopmkt: "bag",
  devskills: "code", mobskills: "phone", apple: "devices", vercel: "rocket", general: "sparkles",
  docs: "file-text", business: "briefcase", data: "database", mcp: "plug", quality: "gauge",
  ui: "layout", icons: "shapes", finance: "receipt", infra: "server", analytics: "chart-line",
  booking: "calendar-check", writing: "pen-line", prompts: "message",
};
export const categoryIcon = (id: string): any => CAT_ICON[id] ?? "folder";

const PROJECT_ICON: Record<string, string> = {
  shop: "bag", web: "browser", mobile: "phone", mac: "laptop", landing: "megaphone", dashboard: "chart-bars",
  brand: "palette", video: "video", anim: "wand", booking: "calendar-check", finance: "receipt", claude: "terminal",
};
export const projectIcon = (id: string): any => PROJECT_ICON[id] ?? "compass";
