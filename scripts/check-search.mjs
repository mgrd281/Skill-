// يتحقق من منطق البحث والتثبيت قبل البناء: تطبيع العربية واللاتينية، والترتيب، و«هل تقصد»،
// وقراءة أوامر claude mcp add، وما يدخل «حزمة التثبيت». على كل أدوات data/tools.json وأمثلة ثابتة.
// الاستخدام: npm run check-search
import assert from "node:assert/strict";
import fs from "node:fs";
import { norm, words, terms, score, makeDoc, suggest, addVocab, translitWords } from "../src/lib/search.js";
import { shellWords, mcpServer, mcpClients, kitPlan } from "../src/lib/install.js";

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
});
check("الترتيب: الاسم قبل الوصف، والكلمة القصيرة في أول الكلمة فقط", () => {
  const named = makeDoc({ n: "Figma MCP" }), mentioned = makeDoc({ n: "Other", d: words("works with figma") });
  assert.ok(score(named, terms("figma")) > score(mentioned, terms("figma")));
  assert.equal(score(makeDoc({ n: "Build tools" }), terms("ui")), 0);
  assert.ok(score(makeDoc({ n: "Next.js Skills" }), terms("nextjs")) > 0);
  assert.ok(score(makeDoc({ n: "X", t: words("مهارات التصميم") }), terms("تصميم")) >= 6);
});
check("«هل تقصد»", () => {
  const vocab = new Map();
  for (const t of tools) addVocab(vocab, words([t.name, t.desc, t.desc_en, t.desc_de].join(" ")));
  for (const w of translitWords()) if (!vocab.has(w)) vocab.set(w, 1);
  assert.equal(suggest("shopfy", vocab), "shopify");
  assert.equal(suggest("pdf", vocab), null);
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

if (process.exitCode) process.exit(1);
console.log(`OK: البحث والتثبيت (${n} مجموعات فحص، ${tools.length} أداة).`);
