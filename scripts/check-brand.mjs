// يتحقق بعد البناء من أيقونات الموقع: أن الملفات الناتجة عن npm run brand موجودة بالأحجام الصحيحة،
// وأن وسوم <head> في كل صفحة تشير إلى ملفات موجودة، وأن أيقونات manifest بأحجامها المعلنة.
// الاستخدام: npm run build && npm run check-brand
import fs from "node:fs";
import path from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
if (!fs.existsSync(dist)) { console.error("لا يوجد مجلد dist. شغّل npm run build أولًا."); process.exit(1); }

const problems = [];
const file = (url) => path.join(dist, decodeURIComponent(url.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0]).replace(/^\//, ""));
const pngSize = (f) => {
  const b = fs.readFileSync(f);
  if (b.length < 24 || b.toString("latin1", 1, 4) !== "PNG") return null;
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

// 1) الملفات الأساسية بأحجامها
const png = { "apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512, "icon-maskable-512.png": 512, "brand/avatar-1024.png": 1024, "brand/logo-1024.png": 1024 };
for (const [name, size] of Object.entries(png)) {
  const f = path.join(dist, name);
  if (!fs.existsSync(f)) { problems.push(`ملف ناقص: ${name} (شغّل npm run brand)`); continue; }
  const d = pngSize(f);
  if (!d || d[0] !== size || d[1] !== size) problems.push(`${name}: الحجم ${d ? d.join("×") : "غير PNG"} والمطلوب ${size}×${size}`);
}
for (const name of ["logo.svg", "favicon.svg", "brand/logo-mono.svg"]) {
  const f = path.join(dist, name);
  if (!fs.existsSync(f)) problems.push(`ملف ناقص: ${name} (شغّل npm run brand)`);
  else if (!/^<svg[\s>]/.test(fs.readFileSync(f, "utf8"))) problems.push(`${name}: ليس SVG سليمًا`);
}
// ICO: ثلاث صور 16 و32 و48
const icoFile = path.join(dist, "favicon.ico");
if (!fs.existsSync(icoFile)) problems.push("ملف ناقص: favicon.ico (شغّل npm run brand)");
else {
  const b = fs.readFileSync(icoFile);
  const n = b.readUInt16LE(4);
  const sizes = Array.from({ length: n }, (_, i) => b[6 + 16 * i] || 256).sort((a, b) => a - b);
  if (b.readUInt16LE(0) !== 0 || b.readUInt16LE(2) !== 1 || sizes.join() !== "16,32,48") problems.push(`favicon.ico: الأحجام ${sizes.join("،")} والمطلوب 16،32،48`);
}

// 2) manifest في اللغتين: أيقونات موجودة بأحجامها المعلنة
for (const m of ["manifest.webmanifest", "de/manifest.webmanifest"]) {
  const f = path.join(dist, m);
  if (!fs.existsSync(f)) { problems.push(`ملف ناقص: ${m}`); continue; }
  let json;
  try { json = JSON.parse(fs.readFileSync(f, "utf8")); } catch { problems.push(`${m}: JSON غير سليم`); continue; }
  for (const k of ["name", "short_name", "start_url", "icons"]) if (!json[k]) problems.push(`${m}: الحقل ${k} ناقص`);
  if (!(json.icons || []).some((i) => i.purpose === "maskable")) problems.push(`${m}: لا أيقونة maskable`);
  for (const i of json.icons || []) {
    const g = file(i.src);
    if (!fs.existsSync(g)) { problems.push(`${m}: الأيقونة ${i.src} غير موجودة`); continue; }
    if (i.type === "image/png") {
      const d = pngSize(g);
      if (!d || `${d[0]}x${d[1]}` !== i.sizes) problems.push(`${m}: ${i.src} حجمها ${d ? d.join("x") : "؟"} والمعلن ${i.sizes}`);
    }
  }
}

// 3) وسوم <head> في كل صفحة تشير إلى ملفات موجودة
const pages = fs.readdirSync(dist, { recursive: true }).filter((f) => f.endsWith(".html"));
let tags = 0;
for (const p of pages) {
  const head = fs.readFileSync(path.join(dist, p), "utf8").split("</head>")[0];
  const links = [...head.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((l) => /rel="(icon|apple-touch-icon|manifest)"/.test(l));
  const rels = new Set(links.map((l) => /rel="([^"]+)"/.exec(l)[1]));
  for (const need of ["icon", "apple-touch-icon", "manifest"]) if (!rels.has(need)) problems.push(`${p}: وسم ${need} ناقص`);
  for (const l of links) {
    const href = /href="([^"]+)"/.exec(l)?.[1];
    tags++;
    if (!href || !fs.existsSync(file(href))) problems.push(`${p}: ${href} غير موجود`);
  }
  if (/data:image\/svg\+xml/.test(head.split("<title")[0])) problems.push(`${p}: أيقونة data-URI قديمة في <head>`);
}

if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`OK: أيقونات الموقع سليمة (${pages.length} صفحة، ${tags} وسمًا، manifest باللغتين).`);
