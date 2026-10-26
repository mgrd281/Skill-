// الهوية البصرية للدليل: مصدر واحد لرسم الشعار. تستخدمه الواجهة (Logo.astro) وصور المشاركة (og.ts وscripts/og-home.cjs)
// ومجموعة الأيقونات (scripts/build-brand.mjs). لا ترسم الشعار بيدك في مكان آخر: عدّل هنا ثم شغّل `npm run brand`.
//
// الشعار: وجه شخصية الدليل (src/components/Mascot.astro): بلاطة زرقاء مائلة قليلًا بعينين وحاجبين وخد ذهبي وابتسامة،
// والنجمة الذهبية اللامعة (رمز المهارات) عند زاويتها العليا. مرسوم بنسب الشخصية نفسها مصغّرة إلى شبكة 32.
// لا تدرّج ولا ظل (DESIGN.md).

// ألوان الشعار ثابتة في الوضعين الفاتح والداكن، فلا تُقرأ من متغيرات الواجهة
export const COLORS = { blue: "#2446D6", white: "#FFFFFF", gold: "#FFC94D", ink: "#1D1D1F" };

// نجمة بأربعة أذرع من منحنيات تربيعية، مركزها (cx, cy) ونصف قطرها r
const sparkPath = (cx, cy, r, q = r * 0.125) =>
  `M${cx} ${cy - r}Q${cx + q} ${cy - q} ${cx + r} ${cy}Q${cx + q} ${cy + q} ${cx} ${cy + r}Q${cx - q} ${cy + q} ${cx - r} ${cy}Q${cx - q} ${cy - q} ${cx} ${cy - r}Z`;

// من إحداثيات الشخصية (viewBox 132) إلى شبكة 32: البلاطة 92 تصير 26، وزاويتها العليا عند (2، 5.5)
const K = 26 / 92;
const r2 = (n) => +n.toFixed(2);
const X = (x) => r2(2 + (x - 20) * K), Y = (y) => r2(5.5 + (y - 20) * K), S = (v) => r2(v * K);
const pts = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a, b) => `${X(+a)} ${Y(+b)}`);
// البلاطة مائلة 4° مثل الشخصية حول مركزها
const TILT = `rotate(-4 ${X(66)} ${Y(63)})`;
const LINE = S(3.4) + 0.15, SMILE_W = S(4) + 0.15; // خطوط أسمك قليلًا من النسبة حتى لا تبهت في الأحجام الصغيرة
const PLATE = `<rect x="${X(20)}" y="${Y(20)}" width="${S(92)}" height="${S(86)}" rx="${S(27)}"`;
const BROWS = [pts("M40 40Q49 35 58 39"), pts("M72 39Q81 35 90 40")];
const SMILE = pts("M58 83Q66 90 74 82");
const SPARK = sparkPath(X(104), Y(19), S(13));
// العينان: البياض ثم البؤبؤ ينظر قليلًا إلى الأمام (مثل الشخصية) ونقطة لمعة
const eyes = (white, pupil) => [50, 80].map((x) => `<ellipse cx="${X(x)}" cy="${Y(58)}" rx="${S(11)}" ry="${S(13)}" fill="${white}"/>`).join("") +
  [50, 80].map((x) => `<circle cx="${r2(X(x) + 0.35)}" cy="${Y(59.5)}" r="${r2(S(5.6) + 0.1)}" fill="${pupil}"/>`).join("");
const glints = (fill) => [52, 82].map((x) => `<circle cx="${r2(X(x) + 0.35)}" cy="${Y(57)}" r=".55" fill="${fill}"/>`).join("");

// محتوى الشعار (بلا وسم svg). class="spark" للنجمة وclass="eyes" للعينين: تتحركان في global.css.
// bleed: مربع أزرق كامل والوجه في وسطه (أيقونة iOS وAndroid تقصّها بنفسها)
// scale: تصغير الرسم (المنطقة الآمنة للأيقونة القابلة للقص)
// mono: لون واحد (currentColor)، والوجه ثقوب في البلاطة، للأختام والطباعة (قناع بمعرّف: للملف المستقل فقط، لا داخل الصفحة)
export function markInner({ bleed = false, scale = 1, mono = false } = {}) {
  if (mono) {
    const hole = `<mask id="face"><rect width="32" height="32" fill="#fff"/><g transform="${TILT}"><g fill="none" stroke="#000" stroke-width="${LINE}" stroke-linecap="round">${BROWS.map((d) => `<path d="${d}"/>`).join("")}<path d="${SMILE}" stroke-width="${SMILE_W}"/></g>${eyes("#000", "#fff")}</g></mask>`;
    return `${hole}<g fill="currentColor"><g transform="${TILT}">${PLATE} mask="url(#face)"/></g><path class="spark" d="${SPARK}"/></g>`;
  }
  const face = `<g fill="none" stroke="#fff" stroke-width="${LINE}" stroke-linecap="round">${BROWS.map((d) => `<path d="${d}"/>`).join("")}</g>` +
    `<g class="eyes">${eyes("#fff", COLORS.ink)}${glints("#fff")}</g>` +
    `<circle cx="${X(35)}" cy="${Y(81)}" r="${S(6.5)}" fill="${COLORS.gold}"/>` +
    `<path d="${SMILE}" fill="none" stroke="#fff" stroke-width="${SMILE_W}" stroke-linecap="round"/>`;
  const glyph = `<g transform="${TILT}">${PLATE} fill="${COLORS.blue}"/>${face}</g><path class="spark" d="${SPARK}" fill="${COLORS.gold}"/>`;
  if (!bleed && scale === 1) return glyph;
  // في المربع الكامل تختفي البلاطة في الخلفية الزرقاء، فيتوسط الوجه والنجمة المربع
  const plate = bleed ? `<rect width="32" height="32" fill="${COLORS.blue}"/>` : "";
  return plate + `<g transform="translate(16 16) scale(${scale}) translate(-16 ${bleed ? -15.6 : -16})">${glyph}</g>`;
}

// الشعار كاملًا كنص SVG. title: عنوان لقراءات الشاشة عند استخدام الملف مستقلًا
export function markSvg({ title = "", size, ...opts } = {}) {
  const wh = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${wh}>${title ? `<title>${title}</title>` : ""}${markInner(opts)}</svg>`;
}

// الشعار كرابط بيانات (لصور المشاركة التي تقبل صورة لا SVG مضمّنًا)
export const markDataUrl = (opts) => "data:image/svg+xml;base64," + Buffer.from(markSvg(opts)).toString("base64");

// نسخة 16 بكسل (أيقونة التبويب) مرسومة لهذا الحجم: بلاطة مستقيمة أكبر، وعينان وبؤبؤان أوضح، والخد والابتسامة،
// بلا حاجبين ولا لمعة (لا تظهر بهذا الحجم)، والنجمة عند الزاوية العليا
export function markInner16() {
  return `<rect x=".5" y="2.5" width="14" height="13" rx="4" fill="${COLORS.blue}"/>` +
    `<ellipse cx="5" cy="8.6" rx="2.2" ry="2.6" fill="#fff"/><ellipse cx="10.4" cy="8.6" rx="2.2" ry="2.6" fill="#fff"/>` +
    `<circle cx="5.4" cy="9.1" r="1.2" fill="${COLORS.ink}"/><circle cx="10.8" cy="9.1" r="1.2" fill="${COLORS.ink}"/>` +
    `<circle cx="2.8" cy="12.6" r=".9" fill="${COLORS.gold}"/>` +
    `<path d="M6.4 12.8Q7.8 13.8 9.2 12.7" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="${sparkPath(13.4, 2.5, 2.4, 0.36)}" fill="${COLORS.gold}"/>`;
}

export const markSvg16 = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${markInner16()}</svg>`;

// أيقونة التبويب SVG: الشعار الكامل، وتحت 20 بكسل تظهر نسخة 16 (استعلام الوسائط يقيس نافذة الصورة نفسها)
export function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.s{display:none}@media (max-width:20px){.m{display:none}.s{display:inline}}</style><g class="m">${markInner()}</g><g class="s" transform="scale(2)">${markInner16()}</g></svg>`;
}
