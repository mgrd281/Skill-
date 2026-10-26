import toolsJson from "../../data/tools.json";
import categoriesJson from "../../data/categories.json";
import projectsJson from "../../data/projects.json";
import meta from "../../data/meta.json";
import examplesJson from "../../data/examples.json";
import type { IconName } from "./icons";
import type { Lang } from "../i18n";
import { RUNS_REMOTE_SCRIPT } from "./install.js";

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
  desc_de: string;
  desc_en: string;
  // تضييق «ماذا تحوي» إلى مهارات فيها كلمة، أو إلغاؤها (scripts/update-inside.mjs)
  inside?: string | false;
  pushed: string | null;
  license?: string | null;
  archived?: boolean;
  added: string;
  order: number;
}
// group: "apps" لأقسام «تطبيقات جاهزة» (تطبيقات تُستخدم على جهاز الزائر، لا أدوات لما يبنيه): قسم خاص في الرئيسية، ولا يرشّح منها «ساعدني أختار»
export interface Category { id: string; name: string; name_de: string; name_en: string; group?: "apps" }
export interface Project {
  id: string; name: string; name_de: string; name_en: string; icon: string; advice: string; advice_de: string; advice_en: string; picks: string[];
  pickSlugs: string[]; cats?: string[]; count: number;
}

export const GH = "https://github.com/";
export const starsUpdatedAt: string = meta.starsUpdatedAt;
// مشغّل الموقع لصفحة الناشر (Impressum، src/views/Imprint.astro) وقسم المسؤول في صفحة الخصوصية: يُضاف في data/meta.json
// حقلًا operator (الحقول وشرحها في README، ويفحصها scripts/check-data.mjs). بلا هذا الحقل لا رابط Impressum في التذييل،
// وتذكر الصفحتان نافذة «رأيك» للتواصل، وينبّه البناء.
export interface Operator {
  name: string; // الاسم الكامل، أو اسم الشركة مع شكلها القانوني
  address: string[]; // أسطر العنوان الذي تصل إليه الرسائل (لا صندوق بريد)
  email: string;
  phone?: string;
  represented?: string; // من يمثّل الشركة قانونًا (للشركات فقط)
  register?: string; // السجل التجاري، مثل "Amtsgericht Berlin, HRB 12345"
  vatId?: string; // رقم ضريبة القيمة المضافة (USt-IdNr.) إن وُجد
  responsible?: string; // المسؤول عن المحتوى (§ 18 Abs. 2 MStV): شخص، وبدونه الممثل ثم الاسم
}
export const operator: Operator | null = (meta as any).operator ?? null;
// النشرة البريدية (src/components/Newsletter.astro): مزوّد يدير القائمة والتأكيد المزدوج، والنموذج يرسل إليه مباشرة.
// في data/meta.json: "newsletter": { "provider": "Buttondown", "action": "رابط نموذج الاشتراك عند المزوّد", "field": "email" }
export const newsletter: { provider: string; action: string; field?: string } | null = (meta as any).newsletter?.action ? (meta as any).newsletter : null;

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function parseStars(s: string | null): number {
  if (!s) return -1;
  const m = /^([\d.]+)\s*k$/i.exec(s);
  return m ? Math.round(parseFloat(m[1]) * 1000) : parseInt(s, 10) || 0;
}

export const categories: Category[] = categoriesJson as Category[];
export const appCats: Category[] = categories.filter((c) => c.group === "apps");
export const isAppCat = (id: string) => appCats.some((c) => c.id === id);

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

// ترتيب القائمة الافتراضي: الأعلى نجومًا أولًا (والتي بلا نجوم في النهاية)، ورقم الترتيب للتي لها نجوم.
// يُحسب وقت البناء فيتجدد مع تحديث النجوم الأسبوعي. الرئيسية ترسم أول القائمة، والباقي في src/views/CardsFragment.astro
export const byStars: Tool[] = [...tools].sort((a, b) => b.starsN - a.starsN || a.order - b.order);
export const rankOf = new Map<string, number>();
byStars.filter((x) => x.starsN >= 0).forEach((x, i) => rankOf.set(x.slug, i + 1));

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
// نص بلغة الصفحة: العربية تعزل الكلمات اللاتينية بـ <bdi>، واللغتان اللاتينيتان نص عادي
export const txt = (s: string, lang: Lang) => (lang === "ar" ? rich(s) : esc(s));

// ---- الحقول المترجمة: الحقل العربي اسمه الأصلي، وغيره بلاحقة اللغة (desc_de وdesc_en ...) ----
type Translated = Exclude<Lang, "ar">;
const LANG_AR: Record<Translated, string> = { de: "الألمانية", en: "الإنجليزية" };
function need(value: string | undefined, lang: Lang, what: string): string {
  if (!value) throw new Error(`ترجمة ${LANG_AR[lang as Translated]} ناقصة: ${what}. أضفها في data/ ثم شغّل npm run check.`);
  return value;
}
const field = (o: Record<string, any>, name: string, lang: Lang, what: string): string =>
  lang === "ar" ? o[name] : need(o[`${name}_${lang}`], lang, what);
export const toolDesc = (t: Tool, lang: Lang) => field(t, "desc", lang, `desc_${lang} لـ ${t.name}`);
// مثال طلب من Claude بعد تثبيت الأداة (data/examples.json، اختياري): بالعربية ar وبالألمانية de وبالإنجليزية en
const examples = examplesJson as Record<string, Record<Lang, string>>;
export const toolExample = (t: Tool, lang: Lang): string | null => examples[t.slug]?.[lang] ?? null;
export const catName = (id: string, lang: Lang) => field(categoryById(id), "name", lang, `name_${lang} للقسم ${id}`);
export const projName = (p: Project, lang: Lang) => field(p, "name", lang, `name_${lang} للمشروع ${p.id}`);
export const projAdvice = (p: Project, lang: Lang) => field(p, "advice", lang, `advice_${lang} للمشروع ${p.id}`);
// أنواع الأدوات وترجمتها (القائمة نفسها في scripts/check-data.mjs)
const KIND_L: Record<Translated, Record<string, string>> = {
  de: {
    Skill: "Skill", MCP: "MCP", "مكتبة": "Bibliothek", "أداة": "Tool", "موقع": "Website", "منصة": "Plattform", "تطبيق": "App",
    "صيغة": "Format", "دليل": "Verzeichnis",
  },
  en: {
    Skill: "Skill", MCP: "MCP", "مكتبة": "Library", "أداة": "Tool", "موقع": "Website", "منصة": "Platform", "تطبيق": "App",
    "صيغة": "Format", "دليل": "Directory",
  },
};
export const kindLabel = (kind: string, lang: Lang) => (lang === "ar" ? kind : need(KIND_L[lang][kind], lang, `اسم النوع ${kind}`));

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

// لغة Intl لكل لغة لاتينية: الألمانية بترتيبها، والإنجليزية البريطانية (اليوم أولًا مثل العربية والألمانية)
const INTL: Record<Translated, string> = { de: "de-DE", en: "en-GB" };
export function formatDate(iso: string, lang: Lang = "ar"): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (lang !== "ar") {
    return new Intl.DateTimeFormat(INTL[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
  }
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
const RESTRICTIVE = /AGPL|GPL|SSPL|BUSL|CC-BY-NC|Elastic|Commons|Sustainable/i;

const BADGE = {
  ar: {
    archived: "مؤرشف", archivedT: "المستودع مؤرشف: لم يعد صاحبه يطوّره",
    old: "آخر تحديث", oldT: "لم يُحدَّث المستودع منذ أكثر من سنة",
    script: "ينفّذ سكربتًا من الإنترنت", scriptT: "أمر التثبيت يحمّل سكربتًا من الإنترنت وينفّذه مباشرة. افتح مصدره واقرأه قبل تشغيله",
    none: "بدون رخصة", noneT: "لا رخصة معلنة في المستودع: غالبًا لا يُسمح باستخدامه. اقرأ صفحته قبل الاعتماد عليه",
    noneAppT: "لا رخصة معلنة في المستودع: الشيفرة غير مفتوحة لإعادة الاستخدام، والتطبيق نفسه تنزّله من صاحبه",
    other: "رخصة خاصة", otherT: "رخصة غير قياسية: اقرأ ملف الرخصة قبل الاستخدام التجاري",
    restrictT: (l: string) => `رخصة ${l} لها شروط على الاستخدام التجاري: اقرأها`, licT: (l: string) => `الرخصة: ${l}`,
  },
  de: {
    archived: "Archiviert", archivedT: "Das Repository ist archiviert und wird nicht mehr weiterentwickelt",
    old: "Letztes Update", oldT: "Das Repository wurde seit über einem Jahr nicht aktualisiert",
    script: "Skript aus dem Internet", scriptT: "Der Installationsbefehl lädt ein Skript aus dem Internet und führt es direkt aus. Öffne und lies die Quelle, bevor du es startest",
    none: "Keine Lizenz", noneT: "Im Repository ist keine Lizenz angegeben – die Nutzung ist dann meist nicht erlaubt. Lies die Projektseite, bevor du dich darauf verlässt",
    noneAppT: "Im Repository ist keine Lizenz angegeben: Der Code ist nicht zur Weiterverwendung freigegeben, die App selbst lädst du vom Entwickler",
    other: "Eigene Lizenz", otherT: "Keine Standardlizenz: Lies die Lizenzdatei vor einer kommerziellen Nutzung",
    restrictT: (l: string) => `Die Lizenz ${l} hat Bedingungen für die kommerzielle Nutzung: Lies sie`, licT: (l: string) => `Lizenz: ${l}`,
  },
  en: {
    archived: "Archived", archivedT: "The repository is archived and is no longer being developed",
    old: "Last update", oldT: "The repository hasn't been updated in over a year",
    script: "Script from the internet", scriptT: "The install command downloads a script from the internet and runs it right away. Open and read its source before you run it",
    none: "No license", noneT: "No license is declared in the repository, so using it is usually not permitted. Read its page before relying on it",
    noneAppT: "No license is declared in the repository: the code isn't open for reuse, and you download the app itself from its developer",
    other: "Custom license", otherT: "Not a standard license: read the license file before any commercial use",
    restrictT: (l: string) => `The ${l} license has conditions for commercial use: read it`, licT: (l: string) => `License: ${l}`,
  },
};

// درجة تحذير الرخصة لشارة الحالة ولصفحة المقارنة (src/lib/compare-index.ts): bad بلا رخصة، وwarn لرخصة خاصة أو بشروط.
// تطبيق جاهز: استخدامه لا تقيّده رخصة GPL أو AGPL (شروطهما عند نسخ الشيفرة أو توزيعها)، فالتحذير لرخص غير تجارية فقط،
// و«بدون رخصة» تحذير لا خطأ: الشيفرة غير مفتوحة لإعادة الاستخدام، لا أن التطبيق ممنوع. و«other» رخصة لم يعرّفها GitHub
// (كثيرًا لمشاريع معروفة بملف رخصة مركّب مثل Blender)، فلا تحذير للتطبيق بل إحالة إلى ملف الرخصة
export function licenseTone(t: Tool): "bad" | "warn" | "" {
  const l = t.license;
  if (!l) return "";
  const app = t.kind === "تطبيق";
  if (l === "none") return app ? "warn" : "bad";
  if (l === "other") return app ? "" : "warn";
  return (app ? /-NC\b|NonCommercial/i.test(l) : RESTRICTIVE.test(l)) ? "warn" : "";
}

export function statusBadges(t: Tool, lang: Lang = "ar", now = Date.now()): Badge[] {
  const b = BADGE[lang];
  const out: Badge[] = [];
  if (t.archived) {
    out.push({ kind: "bad", text: b.archived, title: b.archivedT });
  } else if (t.pushed) {
    const days = (now - new Date(t.pushed).getTime()) / 864e5;
    if (days > 365) out.push({ kind: "warn", text: b.old, latin: t.pushed.slice(0, 7), title: b.oldT });
  }
  if (t.cmd && RUNS_REMOTE_SCRIPT.test(t.cmd)) {
    out.push({ kind: "warn", text: b.script, title: b.scriptT });
  }
  const l = t.license, tone = licenseTone(t);
  if (l === "none") out.push({ kind: tone || "bad", text: b.none, title: t.kind === "تطبيق" ? b.noneAppT : b.noneT });
  else if (l === "other") { if (tone) out.push({ kind: "warn", text: b.other, title: b.otherT }); }
  else if (l) out.push({ kind: tone ? "warn" : "ok", text: "", latin: l, title: tone ? b.restrictT(l) : b.licT(l) });
  return out;
}

// ---- هوية بصرية لكل أداة: حرفان ولون من قسمها ----
export function initials(name: string): string {
  const words = name.split(/[\s\-_/.]+/).filter((w) => /[A-Za-z0-9]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = (words[0] || name).replace(/[^A-Za-z0-9]/g, "");
  return (w[0] || "?").toUpperCase() + (w[1] || "").toLowerCase();
}

// ---- أيقونة لكل نوع وقسم ونوع مشروع (أسماء Phosphor من src/lib/icons.ts) ----
const KIND_ICON: Record<string, IconName> = {
  Skill: "sparkle", MCP: "plug", "مكتبة": "package", "أداة": "wrench", "موقع": "globe", "منصة": "stack", "تطبيق": "app-window",
  "صيغة": "file-text", "دليل": "compass",
};
export const kindIcon = (kind: string): IconName => KIND_ICON[kind] ?? "package";

const CAT_ICON: Record<string, IconName> = {
  design: "pen-nib", brandskills: "palette", animation: "magic-wand", motiongfx: "video-camera", shopmkt: "bag",
  devskills: "code", mobskills: "device-mobile", apple: "apple-logo", vercel: "rocket-launch", general: "sparkle",
  docs: "file-text", business: "briefcase", data: "database", mcp: "plug", quality: "gauge",
  ui: "layout", icons: "shapes", finance: "receipt", infra: "hard-drives", analytics: "chart-line-up",
  booking: "calendar-check", writing: "pencil-simple-line", prompts: "chat-circle-text",
  macapps: "laptop", winapps: "windows-logo", iosapps: "device-mobile-camera", crossapps: "devices",
};
export const categoryIcon = (id: string): IconName => CAT_ICON[id] ?? "folder";

const PROJECT_ICON: Record<string, IconName> = {
  shop: "bag", web: "browser", mobile: "device-mobile", mac: "laptop", landing: "megaphone", dashboard: "chart-bar",
  brand: "palette", video: "video-camera", anim: "magic-wand", booking: "calendar-check", finance: "receipt", claude: "terminal-window",
};
export const projectIcon = (id: string): IconName => PROJECT_ICON[id] ?? "compass";
