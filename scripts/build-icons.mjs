// يولّد src/lib/icons.ts من مكتبة Phosphor (@phosphor-icons/core، رخصة MIT).
// الاستخدام: أضف اسم الأيقونة كما هو في https://phosphoricons.com إلى NAMES ثم شغّل `npm run icons`.
import fs from "node:fs";
import path from "node:path";

// كل أيقونة تُولَّد بوزنين: regular للواجهة، وduotone للبلاطات الكبيرة.
const NAMES = [
  // الواجهة
  "arrow-up", "bell", "caret-left", "caret-right", "check", "clock", "copy", "eye-slash", "funnel", "github-logo", "globe",
  "export", "heart", "info", "magnifying-glass", "moon", "rss-simple", "squares-four", "star", "sun", "translate", "warning", "x",
  "arrow-square-out", "shield-check", "seal-check", "user", "cloud", "puzzle-piece", "storefront", "scales", "flag",
  "lightbulb", "envelope-simple", "arrow-counter-clockwise", "caret-down",
  // أنواع الأدوات
  "sparkle", "plug", "package", "wrench", "stack", "device-mobile", "app-window",
  // الأقسام ومشاريع "ماذا تبني؟"
  "pen-nib", "palette", "magic-wand", "video-camera", "bag", "code", "devices", "rocket-launch", "file-text",
  "briefcase", "database", "gauge", "layout", "shapes", "receipt", "hard-drives", "chart-line-up", "chart-bar",
  "calendar-check", "pencil-simple-line", "chat-circle-text", "browser", "laptop", "megaphone", "terminal-window",
  "folder", "compass",
  // أقسام «تطبيقات جاهزة» (والتفاحة لقسم تطوير Apple)
  "windows-logo", "device-mobile-camera", "apple-logo",
];
// أوزان إضافية لحالات محددة: الممتلئ للحالة المفعّلة، والعريض لعلامات التأكيد الصغيرة.
const EXTRA = { fill: ["star", "heart"], bold: ["check", "x"] };

const pkg = new URL("../node_modules/@phosphor-icons/core/", import.meta.url);
const root = path.join(pkg.pathname, "assets");
const { version } = JSON.parse(fs.readFileSync(new URL("package.json", pkg), "utf8"));

function read(name, weight) {
  const file = path.join(root, weight, weight === "regular" ? `${name}.svg` : `${name}-${weight}.svg`);
  if (!fs.existsSync(file)) throw new Error(`أيقونة غير موجودة في Phosphor: ${name} (${weight})`);
  const svg = fs.readFileSync(file, "utf8");
  if (!svg.includes('viewBox="0 0 256 256"')) throw new Error(`مقاس غير متوقع: ${file}`);
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").trim();
}

const icons = {};
for (const name of [...new Set(NAMES)].sort()) {
  icons[name] = { regular: read(name, "regular"), duotone: read(name, "duotone") };
  for (const [weight, list] of Object.entries(EXTRA)) if (list.includes(name)) icons[name][weight] = read(name, weight);
}

const out = `// مولَّد تلقائيًا بـ \`npm run icons\` من @phosphor-icons/core ${version} (رخصة MIT). لا تعدّله يدويًا: عدّل scripts/build-icons.mjs.
// كل مسار مرسوم على شبكة 256×256.
export const ICONS: Record<string, Partial<Record<IconWeight, string>>> = ${JSON.stringify(icons, null, 1)};
export type IconWeight = "regular" | "duotone" | "fill" | "bold";
export type IconName = ${Object.keys(icons).map((n) => JSON.stringify(n)).join(" | ")};
`;
fs.writeFileSync(new URL("../src/lib/icons.ts", import.meta.url), out);
console.log(`OK: ${Object.keys(icons).length} أيقونة من Phosphor ${version}`);
