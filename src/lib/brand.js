// الهوية البصرية للدليل: مصدر واحد لرسم الشعار. تستخدمه الواجهة (Logo.astro) وصور المشاركة (og.ts وscripts/og-home.cjs)
// ومجموعة الأيقونات (scripts/build-brand.mjs). لا ترسم الشعار بيدك في مكان آخر: عدّل هنا ثم شغّل `npm run brand`.
//
// الشعار: بلاطة زرقاء بثلاث بطاقات أدوات بيضاء (الثانية أخفت) ونجمة ذهبية لامعة هي رمز المهارات.
// لا تدرّج ولا ظل (DESIGN.md).

// ألوان الشعار ثابتة في الوضعين الفاتح والداكن، فلا تُقرأ من متغيرات الواجهة
export const COLORS = { blue: "#2446D6", white: "#FFFFFF", gold: "#FFC94D" };

// الشبكة 32×32: نصف قطر الحاوية، والبلاطات (س، ص، الشفافية)، والنجمة اللامعة
const PLATE_R = 9;
const TILE = 8, TILE_R = 2.4;
const TILES = [[7, 7, 1], [7, 17, 0.6], [17, 17, 1]];
const SPARK = "M21 6.2Q21.6 10.4 25.8 11Q21.6 11.6 21 15.8Q20.4 11.6 16.2 11Q20.4 10.4 21 6.2Z";

const tile = ([x, y, o], fill) =>
  `<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="${TILE_R}" fill="${fill}"${o < 1 ? ` fill-opacity="${String(o).replace(/^0/, "")}"` : ""}/>`;

// محتوى الشعار (بلا وسم svg). class="spark" للنجمة: تتحرك في global.css.
// bleed: مربع كامل بلا حواف مدورة (أيقونة iOS وAndroid تقصّها بنفسها)
// scale: تصغير الرسم داخل الحاوية (المنطقة الآمنة للأيقونة القابلة للقص)
// mono: لون واحد (currentColor) بلا حاوية، للأختام والطباعة
export function markInner({ bleed = false, scale = 1, mono = false } = {}) {
  if (mono) return `<g fill="currentColor">${TILES.map((t) => tile(t, "currentColor").replace(' fill="currentColor"', "")).join("")}<path class="spark" d="${SPARK}"/></g>`;
  const plate = `<rect width="32" height="32"${bleed ? "" : ` rx="${PLATE_R}"`} fill="${COLORS.blue}"/>`;
  const glyph = `${TILES.map((t) => tile(t, "#fff")).join("")}<path class="spark" d="${SPARK}" fill="${COLORS.gold}"/>`;
  return plate + (scale === 1 ? glyph : `<g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${glyph}</g>`);
}

// الشعار كاملًا كنص SVG. title: عنوان لقراءات الشاشة عند استخدام الملف مستقلًا
export function markSvg({ title = "", size, ...opts } = {}) {
  const wh = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${wh}>${title ? `<title>${title}</title>` : ""}${markInner(opts)}</svg>`;
}

// الشعار كرابط بيانات (لصور المشاركة التي تقبل صورة لا SVG مضمّنًا)
export const markDataUrl = (opts) => "data:image/svg+xml;base64," + Buffer.from(markSvg(opts)).toString("base64");

// نسخة 16 بكسل (أيقونة التبويب) بالتركيب نفسه لكن على شبكة 16×16 بأعداد صحيحة، حتى لا تقع حواف البلاطات على أنصاف البكسل
// فتبهت. البلاطة 4px (الربع كما في الأصل) والفراغ 2px، والنجمة محورها على منتصف بكسل فيبقى ذراعاها بسُمك بكسل واحد حادًّا.
export function markInner16() {
  const r = (x, y, o) => `<rect x="${x}" y="${y}" width="4" height="4" rx="1.2" fill="#fff"${o ? ` fill-opacity="${o}"` : ""}/>`;
  const spark = "M10.5 1.5Q11.1 3.9 13.5 4.5Q11.1 5.1 10.5 7.5Q9.9 5.1 7.5 4.5Q9.9 3.9 10.5 1.5Z";
  return `<rect width="16" height="16" rx="4.5" fill="${COLORS.blue}"/>${r(3, 3)}${r(3, 9, ".6")}${r(9, 9)}<path d="${spark}" fill="${COLORS.gold}"/>`;
}

export const markSvg16 = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${markInner16()}</svg>`;

// أيقونة التبويب SVG: الشعار الكامل، وتحت 20 بكسل تظهر نسخة 16 المحاذاة (استعلام الوسائط يقيس نافذة الصورة نفسها)
export function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.s{display:none}@media (max-width:20px){.m{display:none}.s{display:inline}}</style><g class="m">${markInner()}</g><g class="s" transform="scale(2)">${markInner16()}</g></svg>`;
}
