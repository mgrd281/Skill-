// الهوية البصرية للدليل: مصدر واحد لرسم الشعار. تستخدمه الواجهة (Logo.astro) وصور المشاركة (og.ts وscripts/og-home.cjs)
// ومجموعة الأيقونات (scripts/build-brand.mjs). لا ترسم الشعار بيدك في مكان آخر: عدّل هنا ثم شغّل `npm run brand`.
//
// الشعار: رأس روبوت صديق داخل دائرة زرقاء: خوذة بيضاء بسماعتين، وشاشة كحلية بعينين مبتسمتين،
// وهوائي في طرفه النجمة الذهبية اللامعة (رمز المهارات). الهوائي يخرج من الدائرة فوقها.
// لا تدرّج ولا ظل (DESIGN.md): العمق بدرجات مصمتة فقط.

// ألوان الشعار ثابتة في الوضعين الفاتح والداكن، فلا تُقرأ من متغيرات الواجهة.
// blue لون --btn، وnavy الشاشة (الأزرق نفسه داكنًا)، وeye عينا الشاشة، وear السماعتان، وgold النجمة
export const COLORS = { blue: "#2446D6", navy: "#0F1B4D", eye: "#6FD3FF", ear: "#C9D5FF", white: "#FFFFFF", gold: "#FFC94D" };

// نجمة بأربعة أذرع من منحنيات تربيعية، مركزها (cx, cy) ونصف قطرها r
export const sparkPath = (cx, cy, r, k = r * 0.125) =>
  `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;

// الشبكة 32×32: الدائرة، والسماعتان، والهوائي، والرأس، والشاشة، والعينان (قوسان مبتسمان)، والنجمة
const DISC = { cx: 16, cy: 18.5, r: 13.5 };
const EARS = [[4.4, 13], [24, 13]]; // 3.6×8
const HEAD = { x: 6.5, y: 8, w: 19, h: 16.6, r: 7 };
const SCREEN = { x: 9, y: 11, w: 14, h: 10.6, r: 4.6 };
const EYES = ["M11.3 17.5Q12.9 14.7 14.5 17.5", "M17.5 17.5Q19.1 14.7 20.7 17.5"];
const SPARK = sparkPath(16, 3.6, 3.4);
// مركز الرسم عموديًا دون الدائرة (من طرف النجمة إلى أسفل الرأس)، لأيقونات التطبيق التي لا دائرة فيها
const GLYPH_MID = 12.4;

const rect = ({ x, y, w, h, r }, attrs) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"${attrs}/>`;
// مستطيل بحواف مدورة كمسار (لثقب الشاشة في نسخة اللون الواحد)
const rrPath = ({ x, y, w, h, r }) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

// محتوى الشعار (بلا وسم svg). class="spark" للنجمة وclass="eyes" للعينين: تتحركان في global.css.
// bleed: مربع أزرق كامل بلا دائرة، والرأس في وسطه (أيقونة iOS وAndroid تقصّها بنفسها)
// scale: تصغير الرسم (المنطقة الآمنة للأيقونة القابلة للقص)
// mono: لون واحد (currentColor) بلا دائرة، والشاشة ثقب فيه، للأختام والطباعة
export function markInner({ bleed = false, scale = 1, mono = false } = {}) {
  const ears = (fill) => EARS.map(([x, y]) => `<rect x="${x}" y="${y}" width="3.6" height="8" rx="1.8"${fill}/>`).join("");
  const stem = (fill) => `<rect x="15.25" y="4.5" width="1.5" height="4" rx=".75"${fill}/>`;
  const eyes = (color) => `<g class="eyes" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round">${EYES.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  if (mono) {
    return `<g fill="currentColor">${ears("")}${stem("")}<path fill-rule="evenodd" d="${rrPath(HEAD)}${rrPath(SCREEN)}"/><path class="spark" d="${SPARK}"/></g>${eyes("currentColor")}`;
  }
  const plate = bleed ? `<rect width="32" height="32" fill="${COLORS.blue}"/>` : `<circle cx="${DISC.cx}" cy="${DISC.cy}" r="${DISC.r}" fill="${COLORS.blue}"/>`;
  const glyph = ears(` fill="${COLORS.ear}"`) + stem(` fill="${COLORS.navy}"`) + rect(HEAD, ` fill="${COLORS.white}"`) +
    rect(SCREEN, ` fill="${COLORS.navy}"`) + eyes(COLORS.eye) + `<path class="spark" d="${SPARK}" fill="${COLORS.gold}"/>`;
  if (!bleed && scale === 1) return plate + glyph;
  // بلا دائرة يتوسط الرأس المربع؛ ومع الدائرة يبقى في مكانه منها
  const mid = bleed ? GLYPH_MID : 16;
  return plate + `<g transform="translate(16 16) scale(${scale}) translate(-16 -${mid})">${glyph}</g>`;
}

// الشعار كاملًا كنص SVG. title: عنوان لقراءات الشاشة عند استخدام الملف مستقلًا
export function markSvg({ title = "", size, ...opts } = {}) {
  const wh = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${wh}>${title ? `<title>${title}</title>` : ""}${markInner(opts)}</svg>`;
}

// الشعار كرابط بيانات (لصور المشاركة التي تقبل صورة لا SVG مضمّنًا)
export const markDataUrl = (opts) => "data:image/svg+xml;base64," + Buffer.from(markSvg(opts)).toString("base64");

// نسخة 16 بكسل (أيقونة التبويب) بالتركيب نفسه على شبكة 16×16 بأعداد صحيحة، حتى لا تقع الحواف على أنصاف البكسل فتبهت:
// الدائرة والرأس والشاشة، والعينان خطّان بعرض بكسلين (القوس لا يظهر بهذا الحجم)، والنجمة معيّن صغير فوق الرأس
export function markInner16() {
  return `<circle cx="8" cy="9" r="7" fill="${COLORS.blue}"/><rect x="2" y="4" width="12" height="9" rx="3.5" fill="#fff"/>` +
    `<rect x="4" y="6" width="8" height="5" rx="1.8" fill="${COLORS.navy}"/>` +
    `<rect x="5" y="8" width="2" height="1" fill="${COLORS.eye}"/><rect x="9" y="8" width="2" height="1" fill="${COLORS.eye}"/>` +
    `<path d="M8 .2L9.3 2L8 3.8L6.7 2Z" fill="${COLORS.gold}"/>`;
}

export const markSvg16 = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${markInner16()}</svg>`;

// أيقونة التبويب SVG: الشعار الكامل، وتحت 20 بكسل تظهر نسخة 16 المحاذاة (استعلام الوسائط يقيس نافذة الصورة نفسها)
export function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.s{display:none}@media (max-width:20px){.m{display:none}.s{display:inline}}</style><g class="m">${markInner()}</g><g class="s" transform="scale(2)">${markInner16()}</g></svg>`;
}
