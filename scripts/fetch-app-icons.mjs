// أيقونات «التطبيقات الجاهزة»: يجد أيقونة كل تطبيق في مستودعه على GitHub، ويحوّلها إلى PNG مربع 128 بكسل في
// public/app-icons/<slug>.png، ويسجّل مصدرها في data/app-icons.json. الموقع يعرض الملف المحلي فقط (لا صور من مواقع أخرى).
// يعمل في GitHub Actions (.github/workflows/app-icons.yml) لأنه يحتاج GitHub API: node scripts/fetch-app-icons.mjs [--force] [slug…]
// بلا --force يتخطى التطبيقات التي لها أيقونة. إن اختار ملفًا خاطئًا فضع في tools.json حقل "icon": مسار الملف داخل المستودع،
// أو false إن لم يكن فيه أيقونة صحيحة (تبقى الحروف الأولى). المرشحون لكل تطبيق في سجل التشغيل.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = JSON.parse(fs.readFileSync(path.join(root, "data/tools.json"), "utf8"));
const mapFile = path.join(root, "data/app-icons.json");
const outDir = path.join(root, "public/app-icons");
const map = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, "utf8")) : {};
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));
const headers = { Accept: "application/vnd.github+json", "User-Agent": "skillpro-app-icons", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
const api = async (p) => {
  const r = await fetch("https://api.github.com" + p, { headers });
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return r.json();
};

// ترتيب المرشحين: أيقونة المتجر ثم أيقونة النظام ثم أي ملف اسمه icon أو logo، وتُستبعد النسخ الأحادية اللون والصغيرة
function score(p, size, repo, appId) {
  const lp = p.toLowerCase(), name = lp.split("/").pop();
  if (!/\.(png|svg)$/.test(name)) return -1;
  if (/(^|\/)(node_modules|vendor|third[_-]?party|external|tests?|examples?|samples?|screenshots?|fixtures?)\//.test(lp)) return -1;
  if (/screenshot|badge|banner|social|preview|feature[_-]?graphic|splash|promo|header|readme/.test(lp)) return -1;
  let s = 0;
  if (appId && (name === appId + ".svg" || name === appId + ".png")) s = 96;
  else if (/fastlane\/metadata\/android\/[^/]+\/images\/icon\.png$/.test(lp)) s = 100;
  else if (/hicolor\/scalable\/apps\/[^/]+\.svg$/.test(lp)) s = 92;
  else if (/appicon[^/]*\.appiconset\/[^/]+\.png$/.test(lp)) s = 85;
  else if (/ic_launcher-(web|playstore)\.png$/.test(name)) s = 82;
  else if (/hicolor\/(512x512|256x256)\/apps\/[^/]+\.png$/.test(lp)) s = 80;
  else if (/mipmap-xxxhdpi\/ic_launcher\.png$/.test(lp)) s = 75;
  else if (/^(app[-_]?icon|icon|logo)[^/]*\.(png|svg)$/.test(name)) s = 50;
  else if (/(icon|logo)/.test(name)) s = 30;
  else return -1;
  if (/symbolic|mono|monochrome|template|tray|menubar|status|white|black|dark|light|foreground|background|small|favicon/.test(name)) s -= 40;
  if (/canary|preview|nightly|beta|insider|devel|(^|[^a-z])dev([^a-z]|$)|debug|test/.test(lp)) s -= 40;
  if (/onboarding|illustration|empty[-_]?state|placeholder|wordmark|lockup|text/.test(lp)) s -= 30;
  if (/(^|[^0-9])(16|20|22|24|29|32|40|48)(x\d+)?(@[123]x)?\.png$/.test(name)) s -= 30;
  const px = Math.max(0, ...[...name.matchAll(/(\d{3,4})/g)].map((m) => +m[1]).filter((n) => n <= 2048));
  s += Math.min(px, 1024) / 128;
  if (name.includes(repo.toLowerCase())) s += 6;
  s -= p.split("/").length * 0.5;
  if (size < 1500) s -= 20;
  return s;
}

fs.mkdirSync(outDir, { recursive: true });
let done = 0, missed = [];
for (const t of tools) {
  if (t.kind !== "تطبيق" || !t.gh) continue;
  if (only.length && !only.includes(t.slug)) continue;
  // "icon": false: لا أيقونة صحيحة في المستودع، فتبقى الحروف الأولى بدل صورة خاطئة
  if (t.icon === false) {
    if (map[t.slug]) { fs.rmSync(path.join(root, "public", map[t.slug].file), { force: true }); delete map[t.slug]; }
    continue;
  }
  if (!force && map[t.slug] && fs.existsSync(path.join(root, "public", map[t.slug].file))) continue;
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/.exec(t.gh);
  if (!m) continue;
  const [, owner, repo] = m;
  try {
    const info = await api(`/repos/${owner}/${repo}`);
    const branch = info.default_branch;
    let file = t.icon;
    if (!file) {
      const tree = await api(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
      const appId = /^flatpak install (?:--user )?flathub ([\w.-]+)$/.exec(t.cmd || "")?.[1].toLowerCase();
      const ranked = tree.tree.filter((e) => e.type === "blob").map((e) => ({ p: e.path, s: score(e.path, e.size || 0, repo, appId) }))
        .filter((e) => e.s >= 0).sort((a, b) => b.s - a.s);
      // المرشحون الخمسة الأوائل في السجل، لتصحيح اختيار خاطئ بحقل icon
      console.log(`  ${t.slug} candidates: ${ranked.slice(0, 5).map((e) => `${e.p} (${e.s.toFixed(1)})`).join(" | ") || "none"}`);
      const best = ranked[0];
      if (!best) { missed.push(t.slug); continue; }
      file = best.p;
    }
    const src = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.split("/").map(encodeURIComponent).join("/")}`;
    const r = await fetch(src);
    if (!r.ok) throw new Error(`${src}: ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    let img = sharp(buf, { density: 300 });
    const meta = await img.metadata();
    if (!/\.svg$/i.test(file) && Math.min(meta.width || 0, meta.height || 0) < 64) { missed.push(`${t.slug} (${file}: صغيرة)`); continue; }
    // هامش شفاف حول الرسم (شائع في أيقونات Windows وLinux) يُقص حتى تتساوى أحجام الأيقونات؛ الخلفية الملونة تبقى كما هي
    const corner = await sharp(await img.png().toBuffer()).ensureAlpha().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
    img = sharp(await img.png().toBuffer());
    if (corner[3] === 0) img = sharp(await img.trim({ threshold: 1 }).png().toBuffer());
    const out = `app-icons/${t.slug}.png`;
    await img.resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true }).toFile(path.join(root, "public", out));
    map[t.slug] = { file: out, src };
    done++;
    console.log(`${t.slug}: ${file}`);
  } catch (e) {
    missed.push(`${t.slug} (${e.message})`);
  }
}
const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
fs.writeFileSync(mapFile, JSON.stringify(sorted, null, 2) + "\n");
console.log(`تم: ${done} أيقونة${missed.length ? `، بلا أيقونة: ${missed.join("، ")}` : ""}`);
