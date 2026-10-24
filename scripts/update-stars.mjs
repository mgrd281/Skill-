// تحديث نجوم GitHub وتاريخ آخر تحديث لكل أداة في data/tools.json.
// التشغيل المحلي:   GITHUB_TOKEN=ghp_xxx node scripts/update-stars.mjs
// بدون توكن يعمل أيضًا لكن بحد 60 طلبًا في الساعة فقط.
// لا يغيّر أي أداة تفشل في الجلب: يبقى رقمها القديم كما هو.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolsFile = path.join(root, "data", "tools.json");
const metaFile = path.join(root, "data", "meta.json");
const API = process.env.GITHUB_API || "https://api.github.com";
const token = process.env.GITHUB_TOKEN || "";

const tools = JSON.parse(fs.readFileSync(toolsFile, "utf8"));

// github.com/owner/repo أو github.com/owner/repo/tree/main/... => "owner/repo"
function repoOf(url) {
  if (!url) return null;
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/.exec(url);
  return m ? `${m[1]}/${m[2].replace(/\.git$/, "")}` : null;
}

function formatStars(n) {
  if (n < 1000) return String(n);
  return (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, "") + "k";
}

async function fetchRepo(full) {
  const res = await fetch(`${API}/repos/${full}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "skill-directory-updater",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  // الرخصة: معرّف SPDX مثل MIT، أو "none" إن لم تُعلَن رخصة، أو "other" إن لم تُصنَّف
  const spdx = j.license?.spdx_id;
  const license = !j.license ? "none" : !spdx || spdx === "NOASSERTION" ? "other" : spdx;
  return { stars: j.stargazers_count, pushed: (j.pushed_at || "").slice(0, 10) || null, archived: !!j.archived, license };
}

const repos = [...new Set(tools.map(t => repoOf(t.gh)).filter(Boolean))];
console.log(`${repos.length} مستودع فريد من ${tools.length} أداة`);

const info = new Map();
const failed = [];
let next = 0;
async function worker() {
  while (next < repos.length) {
    const full = repos[next++];
    try {
      info.set(full, await fetchRepo(full));
    } catch (e) {
      failed.push(`${full} (${e.message})`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

let changed = 0;
const archived = [];
for (const t of tools) {
  const r = info.get(repoOf(t.gh));
  if (!r) continue;
  const stars = formatStars(r.stars);
  if (t.stars !== stars || t.pushed !== r.pushed || t.license !== r.license || !!t.archived !== r.archived) changed++;
  t.stars = stars;
  t.pushed = r.pushed;
  t.license = r.license;
  t.archived = r.archived;
  if (r.archived) archived.push(t.name);
}

if (changed > 0) {
  fs.writeFileSync(toolsFile, JSON.stringify(tools, null, 2) + "\n");
  fs.writeFileSync(metaFile, JSON.stringify({ starsUpdatedAt: new Date().toISOString().slice(0, 10) }, null, 2) + "\n");
}

console.log(`تم تحديث ${changed} أداة`);
if (archived.length) console.log("تحذير: مستودعات مؤرشفة (لم تعد تُطوَّر):", archived.join(", "));
if (failed.length) {
  console.log("فشل الجلب لهذه المستودعات وبقيت أرقامها القديمة:\n  " + failed.join("\n  "));
  // نفشل فقط إذا فشل أغلب الطلبات (مشكلة شبكة أو توكن)، لا بسبب مستودع محذوف واحد.
  if (failed.length > repos.length / 2) process.exit(1);
}
