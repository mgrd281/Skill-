// يتحقق من منطق البحث والتثبيت قبل البناء: تطبيع العربية واللاتينية، والترتيب، و«هل تقصد»،
// وقراءة أوامر claude mcp add، وما يدخل «حزمة التثبيت». على كل أدوات data/tools.json وأمثلة ثابتة.
// ومعها قبول طلبات «رأيك» و«أبلغ عن مشكلة» من صفحات الموقع نفسه فقط (api/_feedback.js).
// الاستخدام: npm run check-search
import assert from "node:assert/strict";
import fs from "node:fs";
import { norm, words, rawWords, terms, score, makeDoc, suggest, makeVocab, translitWords } from "../src/lib/search.js";
import { shellWords, mcpServer, mcpClients, kitPlan } from "../src/lib/install.js";
import { sameSite, parseSuggest, parseMiss, KINDS } from "../api/_feedback.js";

const tools = JSON.parse(fs.readFileSync(new URL("../data/tools.json", import.meta.url), "utf8"));
let n = 0;
const check = (name, fn) => {
  try { fn(); n++; } catch (e) { console.error(`فشل: ${name}\n  ${e.message}`); process.exitCode = 1; }
};

check("تطبيع العربية", () => {
  const same = (a, b) => assert.equal(norm(a), norm(b), `${a} ≠ ${b}`);
  same("أيقونة", "ايقونه"); same("إيقونة", "ايقونة"); same("آلة", "الة"); same("مُصَمِّم", "مصمم"); same("تـــصميم", "تصميم");
  same("مستشفى", "مستشفي"); same("مسؤول", "مسوول"); same("٢٠٢٦", "2026");
});
check("تطبيع اللاتينية", () => {
  assert.equal(norm("Größe"), norm("grosse")); assert.equal(norm("Café"), "cafe"); assert.equal(norm("Next.js"), "next js");
});
check("صيغ الكلمة العربية والكتابة العربية للأسماء التقنية", () => {
  assert.ok(terms("التطبيقات")[0].includes("تطبيق"));
  assert.ok(terms("للتصميم")[0].includes("تصميم"));
  assert.ok(terms("فيجما")[0].includes("figma"));
  assert.ok(terms("شوبي")[0].includes("shopify"));
  assert.deepEqual(terms("بي دي اف"), [["pdf"]]);
  // حرف واحد ملتصق بأول الكلمة، وما يبقى بعده 4 أحرف على الأقل
  assert.ok(terms("لفيجما")[0].includes("figma"));
  assert.ok(terms("بشوبيفاي")[0].includes("shopify"));
  assert.ok(terms("لمتجر")[0].includes("متجر"));
  assert.ok(terms("لكتابة")[0].includes("كتابه"));
  assert.ok(!terms("كتابة")[0].includes("تاب"));
  assert.deepEqual(terms("بريد"), [["بريد"]]);
});
check("الفهرس يحفظ الكلمات بشكلها المكتوب، وتطبيعها في المتصفح يعطي الكلمات نفسها", () => {
  const set = (s) => [...new Set(s.split(" "))].sort().join(" ");
  for (const t of tools) for (const f of [t.name, t.desc, t.desc_en, t.desc_de]) assert.equal(set(words(rawWords(f))), set(words(f)), t.slug);
  assert.equal(rawWords("Größe der Übersetzung, Größe"), "größe der übersetzung");
});
check("الترتيب: الاسم قبل الوصف، والكلمة القصيرة في أول الكلمة فقط", () => {
  const named = makeDoc({ n: "Figma MCP" }), mentioned = makeDoc({ n: "Other", d: words("works with figma") });
  assert.ok(score(named, terms("figma")) > score(mentioned, terms("figma")));
  assert.equal(score(makeDoc({ n: "Build tools" }), terms("ui")), 0);
  assert.ok(score(makeDoc({ n: "Next.js Skills" }), terms("nextjs")) > 0);
  assert.ok(score(makeDoc({ n: "X", t: words("مهارات التصميم") }), terms("تصميم")) >= 6);
});
check("«هل تقصد»", () => {
  const vocab = makeVocab(tools.map((t) => [t.name, t.desc, t.desc_en, t.desc_de].join(" ")), translitWords());
  assert.equal(suggest("shopfy", vocab), "shopify");
  assert.equal(suggest("pdf", vocab), null);
  // الكلمة المقترحة بشكلها المكتوب، وما كتبه الزائر صحيحًا يبقى كما كتبه
  assert.equal(suggest("أدوت", vocab), "أدوات");
  assert.equal(suggest("Übersetzng", vocab), "übersetzung");
  assert.equal(suggest("Next.js shopfy", vocab), "Next.js shopify");
  assert.equal(suggest("أدوات shopfy", vocab), "أدوات shopify");
});
check("تقسيم سطر الأوامر", () => {
  assert.deepEqual(shellWords(`a "b c" 'd e' f\\ g`), ["a", "b c", "d e", "f g"]);
  assert.equal(shellWords(`a "b`), null);
});
check("قراءة claude mcp add", () => {
  assert.deepEqual(mcpServer({ slug: "x", cmd: "claude mcp add context7 -- npx -y @upstash/context7-mcp" }),
    { name: "context7", transport: "stdio", command: "npx", args: ["-y", "@upstash/context7-mcp"], env: {}, headers: {}, needsEdit: false });
  assert.equal(mcpServer({ slug: "x", cmd: "claude mcp add creatomate --transport http https://api.creatomate.com/mcp" }).url, "https://api.creatomate.com/mcp");
  assert.equal(mcpServer({ slug: "x", cmd: "npm install gsap" }), null);
  // جسر mcp-remote لخادم بعيد يُضاف كخادم محلي، والإعداد في البرامج الأخرى هو الجسر نفسه
  assert.deepEqual(mcpServer({ slug: "x", cmd: "claude mcp add v0 -- npx -y mcp-remote https://v0.app/api/mcp" }),
    { name: "v0", transport: "stdio", command: "npx", args: ["-y", "mcp-remote", "https://v0.app/api/mcp"], env: {}, headers: {}, needsEdit: false });
  // أمر لا يضيف شيئًا إلى Claude Code لا يُقرأ
  assert.equal(mcpServer({ slug: "x", cmd: "npx mcp-remote https://example.com/mcp" }), null);
  // كل الخوادم في البيانات: الروابط بنقرة تحمل الإعداد نفسه
  for (const t of tools) {
    const s = mcpServer(t);
    if (!s) continue;
    const c = mcpClients(s);
    const cursor = JSON.parse(Buffer.from(new URL(c.cursorLink).searchParams.get("config"), "base64").toString());
    const vscode = JSON.parse(decodeURIComponent(c.vscodeLink.slice("vscode:mcp/install?".length)));
    assert.equal(vscode.name, s.name, t.slug);
    if (s.transport === "stdio") assert.deepEqual([cursor.command, cursor.args], [s.command, s.args], t.slug);
    else assert.equal(cursor.url, s.url, t.slug);
  }
});
check("حزمة التثبيت", () => {
  const claudeSeo = kitPlan({ cmd: "/plugin marketplace add AgriciDaniel/claude-seo\n/plugin install claude-seo@x\n/seo setup" });
  assert.deepEqual(claudeSeo, { lines: ["claude plugin marketplace add AgriciDaniel/claude-seo", "claude plugin install claude-seo@x"], after: ["/seo setup"] });
  assert.equal(kitPlan({ cmd: 'curl -fsSL "https://x.dev" | bash' }).why, "script");
  assert.equal(kitPlan({ cmd: "npx unlighthouse --site <your-site>" }).why, "values");
  assert.equal(kitPlan({ cmd: "npm install gsap" }).why, "manual");
  assert.equal(kitPlan({ cmd: null }).why, "none");
  // لا سطر يبدأ بشرطة مائلة في الحزمة: لا يعمل خارج جلسة Claude Code
  for (const t of tools) { const k = kitPlan(t); if (k.lines) assert.ok(k.lines.every((l) => !l.startsWith("/")), t.slug); }
});

check("«رأيك» و«أبلغ عن مشكلة» من الموقع نفسه فقط", () => {
  const h = (o) => new Headers(o);
  assert.equal(sameSite(h({ host: "xskills.dev", origin: "https://xskills.dev" })), true);
  assert.equal(sameSite(h({ host: "a.vercel.app", "x-forwarded-host": "xskills.dev", origin: "https://xskills.dev" })), true);
  assert.equal(sameSite(h({ host: "xskills.dev", origin: "https://evil.example" })), false);
  assert.equal(sameSite(h({ host: "xskills.dev", origin: "null" })), false);
  assert.equal(sameSite(h({ host: "xskills.dev", "sec-fetch-site": "cross-site" })), false);
  assert.equal(sameSite(h({ host: "xskills.dev", "sec-fetch-site": "same-origin" })), true);
  assert.equal(sameSite(h({ host: "xskills.dev" })), true);
});

check("اقتراح أداة والبحث بلا نتيجة", () => {
  assert.deepEqual(parseSuggest({ tool: "  https://github.com/x/y ", message: "مفيدة", lang: "de", path: "/de/" }).value,
    { tool: "https://github.com/x/y", message: "مفيدة", lang: "de", path: "/de/" });
  assert.equal(parseSuggest({ tool: "x" }).error, "tool required");
  assert.equal(parseSuggest({ tool: "abc", website: "spam" }).spam, true);
  assert.deepEqual(parseMiss({ queries: ["  figma motion ", "figma motion", 3, "a", "x".repeat(150)], lang: "en", path: "/en/" }).value,
    { queries: ["figma motion", "x".repeat(100)], lang: "en", path: "/en/" });
  assert.equal(parseMiss({ queries: [] }).error, "no queries");
  assert.equal(parseMiss({ queries: Array.from({ length: 9 }, (_, i) => "q" + i) }).value.queries.length, 5);
  assert.deepEqual(Object.values(KINDS).map(([, folder]) => folder), ["feedback", "reports", "suggestions", "misses"]);
});

if (process.exitCode) process.exit(1);
console.log(`OK: البحث والتثبيت (${n} مجموعات فحص، ${tools.length} أداة).`);
