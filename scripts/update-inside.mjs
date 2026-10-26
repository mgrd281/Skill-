// «ماذا تحوي»: لكل أداة من نوع Skill على GitHub، اسم كل مهارة تثبّتها ووصفها من رأس ملف SKILL.md (frontmatter)،
// كما كتبهما صاحبها. يُحفظ في data/inside.json وتعرضه صفحة الأداة (src/components/Inside.astro).
// ما يُعدّ من مهارات الأداة: المجلد في رابطها (…/tree/main/skills/x)، أو المهارة في `--skill x`، أو مجلد الإضافة في
// `plugin install x@…`، وإلا فكل مهارات المستودع. وفي data/tools.json يضيّقها الحقل "inside": "كلمة" (مهارات اسمها
// أو مسارها فيه الكلمة)، أو يلغيها "inside": false.
// لا يعمل وقت البناء لأنه يحتاج الشبكة: يعمل أسبوعيًا مع تحديث النجوم (.github/workflows/update-stars.yml)، ويدويًا:
//   npm run update-inside
// يُنسخ من كل مستودع ملفات SKILL.md فقط (git clone --filter=blob:none مع sparse-checkout)، مرة لكل مستودع.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = new URL("..", import.meta.url).pathname;
const tools = JSON.parse(fs.readFileSync(path.join(root, "data/tools.json"), "utf8"));
const OUT = path.join(root, "data/inside.json");
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "inside-"));
const MAX_LIST = 60, MAX_DESC = 220;
// مجلدات أمثلة وقوالب واختبارات: ليست مهارات يحصل عليها المستخدم
const SKIP_DIR = /(^|\/)(\.git|node_modules|templates?|examples?|tests?|fixtures|\.github)(\/|$)/i;

function parseGh(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.hostname !== "github.com") return null;
  const p = u.pathname.split("/").filter(Boolean);
  if (p.length < 2) return null;
  const tree = p[2] === "tree" || p[2] === "blob";
  return { owner: p[0], repo: p[1].replace(/\.git$/, ""), ref: tree ? p[3] : null, sub: tree ? p.slice(4).join("/") : "" };
}

const git = (args, cwd) => run("git", args, { cwd, timeout: 180000, maxBuffer: 1 << 26 });
const clones = new Map();
function checkout(r) {
  const key = `${r.owner}/${r.repo}@${r.ref || ""}`;
  if (!clones.has(key)) {
    const dir = path.join(tmp, key.replace(/[^\w.-]/g, "_"));
    clones.set(key, (async () => {
      await git(["clone", "-q", "--depth=1", "--filter=blob:none", "--no-checkout", ...(r.ref ? ["--branch", r.ref] : []), `https://github.com/${r.owner}/${r.repo}.git`, dir]);
      await git(["sparse-checkout", "set", "--no-cone", "**/SKILL.md"], dir);
      await git(["checkout", "-q"], dir);
      return dir;
    })().catch((e) => { console.warn(`  تعذّر نسخ ${key}: ${String(e.stderr || e.message).trim().split("\n").pop()}`); return null; }));
  }
  return clones.get(key);
}

function findSkills(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(dir, p);
      if (e.isDirectory()) { if (!SKIP_DIR.test(rel)) walk(p); }
      else if (e.name === "SKILL.md" && !SKIP_DIR.test(rel)) out.push(p);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

// رأس الملف بين سطرَي --- : name وdescription، بقيمة في السطر نفسه أو في أسطر تالية (> أو |)
function frontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const lines = m[1].split(/\r?\n/), out = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^[>|][-+]?$/.test(v) || v === "") {
      const block = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === "")) block.push(lines[++i].trim());
      v = block.join(" ");
    }
    out[kv[1]] = v.replace(/^(["'])([\s\S]*)\1$/, "$2").replace(/\s+/g, " ").trim();
  }
  return out;
}
const clip = (s, n) => (s.length > n ? s.slice(0, s.lastIndexOf(" ", n - 1) > n * 0.6 ? s.lastIndexOf(" ", n - 1) : n - 1) + "…" : s);

const result = {};
let fresh = 0, kept = 0;
const queue = tools.filter((t) => t.kind === "Skill" && t.inside !== false && t.gh && parseGh(t.gh));
async function one(t) {
  const r = parseGh(t.gh);
  const dir = await checkout(r);
  if (!dir) { if (prev[t.slug]) { result[t.slug] = prev[t.slug]; kept++; } return; }
  const base = path.join(dir, r.sub);
  let files = findSkills(base).map((f) => ({ f, rel: path.relative(dir, f), fm: frontmatter(fs.readFileSync(f, "utf8")) }));
  const folder = (x) => path.basename(path.dirname(x.f));
  // مهارة واحدة من مستودع: npx skills add … --skill x
  const one = /--skill[= ]([\w.-]+)/.exec(t.cmd || "");
  if (one) files = files.filter((x) => x.fm.name === one[1] || folder(x) === one[1]);
  // إضافة واحدة من مستودع فيه عدة إضافات: plugin install x@…
  const plug = /plugins? install ([\w.-]+)@/.exec(t.cmd || "");
  if (plug && !one) {
    const mine = files.filter((x) => x.rel.split(path.sep).includes(plug[1]));
    if (mine.length) files = mine;
  }
  if (typeof t.inside === "string") files = files.filter((x) => (x.fm.name || "").includes(t.inside) || x.rel.includes(t.inside));
  const skills = [];
  const seen = new Set();
  for (const x of files) {
    const name = (x.fm.name || folder(x)).slice(0, 80);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    skills.push({ name, desc: clip(x.fm.description || "", MAX_DESC) });
  }
  if (!skills.length) return;
  skills.sort((a, b) => a.name.localeCompare(b.name));
  result[t.slug] = { n: skills.length, skills: skills.slice(0, MAX_LIST) };
  fresh++;
}
// ستة مستودعات معًا
const workers = Array.from({ length: 6 }, async () => { while (queue.length) await one(queue.shift()); });
await Promise.all(workers);
fs.rmSync(tmp, { recursive: true, force: true });

const sorted = Object.fromEntries(Object.keys(result).sort().map((k) => [k, result[k]]));
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1) + "\n");
console.log(`OK: data/inside.json: ${Object.keys(sorted).length} أداة فيها مهارات (${fresh} محدّثة، ${kept} من النسخة السابقة).`);
