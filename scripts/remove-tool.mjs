// حذف أداة نهائيًا من الدليل:  npm run remove -- <slug>
// يحذفها من data/tools.json ومن اقتراحات "ابدأ بها" في data/projects.json،
// ويضيف مستودعها إلى قائمة "ignored" حتى لا يقترحها البحث التلقائي مرة أخرى.
import fs from "node:fs";

const slug = process.argv[2];
if (!slug) { console.error("الاستخدام: npm run remove -- <slug>   مثال: npm run remove -- remotion"); process.exit(1); }

const dir = new URL("../data/", import.meta.url);
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, dir), "utf8"));
const write = (f, v) => fs.writeFileSync(new URL(f, dir), JSON.stringify(v, null, 2) + "\n");
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const tools = read("tools.json");
const tool = tools.find((t) => t.slug === slug);
if (!tool) {
  console.error(`لا توجد أداة بهذا الاسم: ${slug}`);
  console.error("أقرب الأسماء: " + tools.filter((t) => t.slug.includes(slug.slice(0, 3))).map((t) => t.slug).slice(0, 8).join(", "));
  process.exit(1);
}
write("tools.json", tools.filter((t) => t.slug !== slug));

const projects = read("projects.json");
let touched = [];
for (const p of projects) {
  const before = p.picks.length;
  p.picks = p.picks.filter((n) => slugify(n) !== slug);
  if (p.picks.length !== before) touched.push(p.id);
}
write("projects.json", projects);

const m = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/.exec(tool.gh || "");
if (m) {
  const state = read("discover-state.json");
  const full = `${m[1]}/${m[2]}`;
  if (!state.ignored.map((s) => s.toLowerCase()).includes(full.toLowerCase())) state.ignored.push(full);
  write("discover-state.json", state);
}
console.log(`حُذفت الأداة: ${tool.name}`);
if (touched.length) console.log("وأُزيلت من اقتراحات المشاريع: " + touched.join(", ") + " (راجع أن عدد الاقتراحات ما زال مناسبًا)");
console.log("شغّل الآن: npm run check");
