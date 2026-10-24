// يفحص كل روابط الدليل (GitHub والمواقع الرسمية) ويكتب تقريرًا بالمعطّل والمنقول.
// التشغيل:  node scripts/check-links.mjs [--report report.md] [--data path/to/tools.json]
// لا يغيّر أي ملف في الدليل: يكتب تقريرًا فقط، والقرار لك.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const reportPath = opt("--report");
const dataFile = opt("--data") || path.join(root, "data", "tools.json");

const TIMEOUT = Number(process.env.LINK_TIMEOUT_MS) || 20000;
const UA = "Mozilla/5.0 (compatible; SkillDirectoryLinkCheck/1.0; +https://github.com/mgrd281/Skill-)";

const tools = JSON.parse(fs.readFileSync(dataFile, "utf8"));

// ---- جمع الروابط الفريدة مع الأدوات التي تستعملها ----
const urls = new Map(); // url -> [{ tool, field }]
for (const t of tools) {
  for (const field of ["gh", "site"]) {
    if (!t[field]) continue;
    if (!urls.has(t[field])) urls.set(t[field], []);
    urls.get(t[field]).push({ tool: t, field });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

async function request(url, method) {
  return fetch(url, {
    method,
    redirect: "follow",
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en" },
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

// نتيجة الفحص: ok | broken | blocked | unsure
async function probe(url) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let res = await request(url, "HEAD");
      // بعض المواقع ترفض HEAD: نجرّب GET قبل الحكم
      if ([400, 403, 405, 501].includes(res.status) || res.status >= 500) res = await request(url, "GET");
      const s = res.status;
      if (res.body) res.body.cancel().catch(() => {});
      if (s >= 200 && s < 400) return { state: "ok", status: s, finalUrl: res.url };
      if (s === 404 || s === 410) return { state: "broken", status: s, finalUrl: res.url };
      if (s === 401 || s === 403 || s === 429) { last = { state: "blocked", status: s, finalUrl: res.url }; }
      else last = { state: "unsure", status: s, finalUrl: res.url };
    } catch (e) {
      const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
      const code = timedOut ? "TimeoutError" : e?.cause?.code || e?.code || e?.name;
      if (["ENOTFOUND", "ECONNREFUSED"].includes(code) && attempt === 1) {
        return { state: "broken", status: code, finalUrl: url };
      }
      last = { state: "unsure", status: code === "TimeoutError" ? "مهلة" : String(code || e.message), finalUrl: url };
    }
    await sleep(1500 + attempt * 1500);
  }
  return last;
}

// ---- تشغيل متوازٍ مع تهدئة لكل موقع (GitHub يرفض الضغط) ----
const queue = [...urls.keys()];
const results = new Map();
const lastHit = new Map();
const pace = (host) => (host === "github.com" ? 700 : 250);

async function worker() {
  while (queue.length) {
    const url = queue.shift();
    const host = hostOf(url);
    const wait = (lastHit.get(host) || 0) + pace(host) - Date.now();
    lastHit.set(host, Date.now() + Math.max(wait, 0));
    if (wait > 0) await sleep(wait);
    results.set(url, await probe(url));
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

// ---- هل انتقل المشروع؟ (تحويل دائم إلى مستودع أو نطاق آخر) ----
function moved(url, r) {
  if (r.state !== "ok" || !r.finalUrl) return null;
  try {
    const a = new URL(url), b = new URL(r.finalUrl);
    if (a.hostname.replace(/^www\./, "") !== b.hostname.replace(/^www\./, "")) return r.finalUrl;
    if (a.hostname === "github.com") {
      const pa = a.pathname.split("/").filter(Boolean).slice(0, 2).join("/").toLowerCase();
      const pb = b.pathname.split("/").filter(Boolean).slice(0, 2).join("/").toLowerCase();
      if (pa !== pb) return r.finalUrl;
    }
  } catch {}
  return null;
}

const broken = [], movedList = [], blocked = [], unsure = [];
for (const [url, r] of results) {
  const users = urls.get(url).map((u) => `${u.tool.name} (\`${u.tool.slug}\`، ${u.field === "gh" ? "GitHub" : "الموقع"})`).join("، ");
  if (r.state === "broken") broken.push({ url, r, users });
  else if (r.state === "blocked") blocked.push({ url, r, users });
  else if (r.state === "unsure") unsure.push({ url, r, users });
  else { const m = moved(url, r); if (m) movedList.push({ url, to: m, users }); }
}

const total = urls.size;
console.log(`فُحص ${total} رابطًا: معطّل ${broken.length}، منقول ${movedList.length}، محجوب أمام الفاحص ${blocked.length}، غير مؤكد ${unsure.length}`);

// إن فشل أغلب الروابط فالمشكلة غالبًا في الشبكة لا في الدليل: لا نُنشئ تقريرًا مضللًا
if ((broken.length + unsure.length) > total * 0.5) {
  console.error("أكثر من نصف الروابط فشلت: يبدو أن المشكلة في الاتصال، لا في الروابط. لم يُكتب تقرير.");
  process.exit(1);
}

if (reportPath && (broken.length || movedList.length)) {
  const L = [];
  L.push(`فحص الدليل ${total} رابطًا. لم يُغيَّر أي شيء تلقائيًا.`);
  L.push("");
  if (broken.length) {
    L.push(`## روابط معطّلة (${broken.length})`, "");
    L.push("الصفحة غير موجودة أو النطاق لا يعمل. افتح الرابط بنفسك للتأكد، ثم صحّحه في `data/tools.json` أو احذف الأداة بالأمر `npm run remove -- slug`.", "");
    for (const b of broken) L.push(`- ${b.url}  \n  الحالة: \`${b.r.status}\` | الأدوات: ${b.users}`);
    L.push("");
  }
  if (movedList.length) {
    L.push(`## روابط انتقلت (${movedList.length})`, "");
    L.push("الرابط يعمل لكنه يحوّل إلى عنوان آخر. حدّث الرابط حتى لا يتعطل لاحقًا.", "");
    for (const m of movedList) L.push(`- ${m.url}  \n  ← ${m.to}  \n  الأدوات: ${m.users}`);
    L.push("");
  }
  if (unsure.length || blocked.length) {
    L.push(`<details><summary>غير مؤكدة (${unsure.length + blocked.length}): قد تكون مشكلة مؤقتة أو حجبًا للفاحص الآلي</summary>`, "");
    for (const x of [...unsure, ...blocked]) L.push(`- ${x.url} (${x.r.status}) | ${x.users}`);
    L.push("", "</details>", "");
  }
  fs.writeFileSync(reportPath, L.join("\n"));
  console.log("كُتب التقرير في " + reportPath);
}
