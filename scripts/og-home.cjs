// يرسم صور المشاركة للصفحة الرئيسية (public/og/home-ar.png وhome-de.png وhome-en.png) بمتصفح حقيقي،
// لأن العربية تحتاج تشكيل الحروف الذي لا يدعمه مولّد صور الأدوات. الاستخدام: node scripts/og-home.cjs
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
// الخطوط مضمّنة كـ data URL: الصفحة المؤقتة لا تستطيع تحميل ملفات محلية
const font = (w, sub) => "data:font/woff2;base64," + fs.readFileSync(path.join(__dirname, "..", "node_modules", `@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-${sub}-${w}-normal.woff2`)).toString("base64");
const RANGE = { arabic: "U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F", latin: "U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC" };
let LOGO; // الشعار من src/lib/brand.js (وحدة ESM فتُحمَّل داخل الدالة غير المتزامنة)
const T = {
  ar: { dir: "rtl", name: "دليل الأدوات", h: 'أدوات تساعدك في&nbsp;عملك، <span>كل يوم.</span>', sub: "مهارات Claude وخوادم MCP ومكتبات ومواقع مختارة بعناية، مع أمر التثبيت لكل أداة." },
  de: { dir: "ltr", name: "Tool-Verzeichnis", h: 'Tools, die dir bei der Arbeit helfen. <span>Jeden&nbsp;Tag.</span>', sub: "Claude-Skills, MCP-Server, Bibliotheken und Websites – sorgfältig ausgewählt, mit Installationsbefehl." },
  en: { dir: "ltr", name: "Tool Directory", h: 'Tools that help you work. <span>Every&nbsp;day.</span>', sub: "Claude Skills, MCP servers, libraries and websites – carefully selected, with the install command for every tool." },
};
(async () => {
  LOGO = (await import("../src/lib/brand.js")).markSvg({ size: 64 });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [lang, t] of Object.entries(T)) {
    await p.setContent(`<!doctype html><html lang="${lang}" dir="${t.dir}"><style>
      ${[400, 700].map((w) => Object.entries(RANGE).map(([s, r]) => `@font-face{font-family:P;font-weight:${w};src:url(${font(w, s)});unicode-range:${r}}`).join("")).join("")}
      body{margin:0;width:1200px;height:630px;background:#fff;font-family:P;color:#1D1D1F;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:26px}
      .b{display:flex;align-items:center;gap:16px;font-size:34px;font-weight:700;color:#424245}
      h1{margin:0;font-size:${lang === "ar" ? 86 : 74}px;line-height:1.15;max-width:${lang === "ar" ? 900 : 1000}px;letter-spacing:${lang === "ar" ? 0 : "-0.02em"}}
      h1 span{background:linear-gradient(90deg,#7A4DFF,#2446D6 60%);-webkit-background-clip:text;color:transparent;padding-bottom:.15em}
      p{margin:0;font-size:30px;color:#6E6E73;max-width:900px;line-height:1.5;text-wrap:balance}
    </style><div class="b">${LOGO}<span>${t.name}</span></div><h1>${t.h}</h1><p>${t.sub}</p>`);
    await p.evaluate(async () => { await document.fonts.load("700 40px P", "Tools"); await document.fonts.load("400 30px P", "Tools"); await document.fonts.ready; });
    await p.screenshot({ path: path.join(__dirname, "..", "public", "og", `home-${lang}.png`) });
  }
  await b.close();
})();
