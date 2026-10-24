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

export const tools: Tool[] = (toolsJson as any[]).map((t, i) => ({
  ...t, order: i, starsN: parseStars(t.stars),
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
