// يبحث في GitHub عن مستودعات جديدة تستحق الإضافة، ويكتب تقريرًا للمراجعة.
// لا يضيف شيئًا إلى الموقع بنفسه: القرار دائمًا لك.
//
// التشغيل المحلي:  GITHUB_TOKEN=ghp_xxx node scripts/discover.mjs [--report report.md] [--no-save]
// الإعدادات: data/discover.config.json   الحالة: data/discover-state.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const API = process.env.GITHUB_API || "https://api.github.com";
const token = process.env.GITHUB_TOKEN || "";

const args = process.argv.slice(2);
const reportPath = args.includes("--report") ? args[args.indexOf("--report") + 1] : null;
const noSave = args.includes("--no-save");

const read = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
const config = read("discover.config.json");
const tools = read("tools.json");
const statePath = path.join(dataDir, "discover-state.json");
const state = fs.existsSync(statePath) ? read("discover-state.json") : { seen: [], ignored: [] };

const norm = (s) => s.toLowerCase();
function repoOf(url) {
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/.exec(url || "");
  return m ? norm(`${m[1]}/${m[2].replace(/\.git$/, "")}`) : null;
}

const known = new Set(tools.map((t) => repoOf(t.gh)).filter(Boolean));
const skip = new Set([...state.seen, ...state.ignored].map(norm));

async function search(topic) {
  const since = new Date(Date.now() - config.pushedWithinDays * 864e5).toISOString().slice(0, 10);
  const q = `topic:${topic} stars:>=${config.minStars} pushed:>=${since} fork:false archived:false`;
  const url = `${API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "skill-directory-discover",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${topic}: HTTP ${res.status}`);
  return (await res.json()).items || [];
}

const found = new Map();
const failed = [];
for (const topic of config.topics) {
  try {
    for (const r of await search(topic)) {
      const key = norm(r.full_name);
      if (known.has(key) || skip.has(key)) continue;
      const entry = found.get(key) || { repo: r, topics: new Set() };
      entry.topics.add(topic);
      found.set(key, entry);
    }
  } catch (e) {
    failed.push(e.message);
  }
  await new Promise((r) => setTimeout(r, 2200)); // حد البحث: 30 طلبًا في الدقيقة
}
if (failed.length === config.topics.length) {
  console.error("فشلت كل عمليات البحث:\n" + failed.join("\n"));
  process.exit(1);
}

// تخمين القسم والنوع من الاسم والوصف والموضوعات. هذا تخمين فقط وتصححه عند المراجعة.
const RULES = [
  ["finance", /invoice|tax|accounting|bookkeep|e-?rechnung|ledger/],
  ["motiongfx", /remotion|video|motion graphic|after effects|davinci|blender/],
  ["animation", /animat|lottie|rive|gsap|framer-motion|motion/],
  ["apple", /\bios\b|swift|xcode|macos|iphone|apple/],
  ["mobskills", /flutter|react native|expo|capacitor|android/],
  ["vercel", /vercel|next\.?js/],
  ["shopmkt", /shopify|ecommerce|e-commerce|marketing|seo\b|ads\b/],
  ["quality", /lighthouse|audit|accessib|a11y|performance/],
  ["brandskills", /brand|logo|identity/],
  ["design", /design|ui\b|ux\b|figma|css|tailwind|frontend/],
  ["icons", /icon/],
  ["analytics", /analytics|plausible|umami/],
];
function guess(r, topics) {
  const text = norm(`${r.name} ${r.description || ""} ${(r.topics || []).join(" ")}`);
  const isMcp = topics.has("mcp-server") || /\bmcp\b/.test(text);
  const isSkill = [...topics].some((t) => /skill|plugin/.test(t)) || /\bskills?\b/.test(text);
  const kind = isMcp && !isSkill ? "MCP" : isSkill ? "Skill" : "أداة";
  let cat = (RULES.find(([, re]) => re.test(text)) || [])[0];
  if (!cat) cat = kind === "MCP" ? "mcp" : kind === "Skill" ? "general" : "devskills";
  return { kind, cat };
}

function formatStars(n) {
  return n < 1000 ? String(n) : (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, "") + "k";
}
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const daysAgo = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);

const candidates = [...found.values()]
  .sort((a, b) => b.repo.stargazers_count - a.repo.stargazers_count)
  .slice(0, config.maxPerRun)
  .map(({ repo: r, topics }) => {
    const g = guess(r, topics);
    const warns = [];
    const lic = r.license?.spdx_id;
    if (!lic) warns.push("بدون رخصة معلنة: لا يحق لك استخدامه قانونيًا في الغالب");
    else if (lic === "NOASSERTION") warns.push("رخصة غير معروفة للنظام: اقرأ ملف الرخصة");
    else if (/AGPL|GPL|SSPL|BUSL/.test(lic)) warns.push(`رخصة ${lic}: لها شروط على الاستخدام التجاري`);
    const age = daysAgo(r.created_at);
    if (age < 60 && r.stargazers_count > 2000) warns.push(`عمره ${age} يومًا فقط وعنده نجوم كثيرة: تأكد أن النجوم حقيقية`);
    if (g.kind === "Skill" || g.kind === "MCP") warns.push("قد ينفّذ أوامر على جهازك: اقرأ كوده قبل الإضافة");
    return {
      full: r.full_name, url: r.html_url, stars: r.stargazers_count, desc: r.description || "",
      license: lic || "لا يوجد", pushed: (r.pushed_at || "").slice(0, 10), ageDays: age,
      homepage: r.homepage && /^https:\/\//.test(r.homepage) ? r.homepage : null,
      topics: [...topics], warns, kind: g.kind, cat: g.cat,
      stub: {
        slug: slugify(r.name), cat: g.cat, name: r.name, kind: g.kind, isNew: true, gh: r.html_url,
        site: r.homepage && /^https:\/\//.test(r.homepage) ? r.homepage : null,
        stars: formatStars(r.stargazers_count), cmd: null, use: [], desc: "", pushed: (r.pushed_at || "").slice(0, 10),
      },
    };
  });

console.log(`${found.size} مرشح جديد، يُعرض منهم ${candidates.length}`);
if (failed.length) console.log("تحذير: فشل بعض عمليات البحث:\n  " + failed.join("\n  "));

if (candidates.length && reportPath) {
  const lines = [];
  lines.push(`وجد البحث الأسبوعي مستودعات جديدة تستحق النظر (العدد: ${candidates.length}). لم يُضف أي منها إلى الموقع.`);
  lines.push("");
  lines.push("**كيف تراجع:** اقرأ كل مرشح، وإن أعجبك فانسخ كتلة JSON إلى آخر `data/tools.json`، واكتب `desc` بالعربية، وأضف `cmd` و`use`، ثم شغّل `npm run check`. ولإخفاء مرشح لا تريده، أضف اسمه إلى `ignored` في `data/discover-state.json`.");
  lines.push("");
  for (const c of candidates) {
    lines.push(`### [${c.full}](${c.url}) · ⭐ ${formatStars(c.stars)}`);
    lines.push("");
    lines.push(`- الوصف الأصلي: ${c.desc || "(بدون وصف)"}`);
    lines.push(`- النوع المتوقع: ${c.kind} | القسم المتوقع: \`${c.cat}\` | الرخصة: ${c.license} | آخر تحديث: ${c.pushed}`);
    if (c.homepage) lines.push(`- الموقع: ${c.homepage}`);
    for (const w of c.warns) lines.push(`- ⚠️ ${w}`);
    lines.push("");
    lines.push("<details><summary>كتلة JSON جاهزة</summary>\n");
    lines.push("```json");
    lines.push(JSON.stringify(c.stub, null, 2));
    lines.push("```\n</details>");
    lines.push("");
  }
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log("كُتب التقرير في " + reportPath);
}

if (candidates.length && !noSave) {
  state.seen = [...new Set([...state.seen, ...candidates.map((c) => c.full)])].sort();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}
