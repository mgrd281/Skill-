// يولّد ملفات الشعار والأيقونات في public/ من رسم واحد هو src/lib/brand.js:
//   node scripts/build-brand.mjs   (أو npm run brand)
// عدّل الشعار في brand.js فقط، ثم أعد التشغيل وارفع الملفات الناتجة. التحقق منها: npm run check-brand.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { markSvg, markSvg16, faviconSvg } from "../src/lib/brand.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
fs.mkdirSync(path.join(pub, "brand"), { recursive: true });

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
const write = (rel, data) => {
  fs.writeFileSync(path.join(pub, rel), data);
  console.log(rel.padEnd(34), String(data.length).padStart(6), "bytes");
};

// ملف ICO بصور PNG مضمّنة (تدعمه كل المتصفحات الحديثة). المتصفحات القديمة وبعض الزواحف تطلب /favicon.ico مباشرة.
function ico(images) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2); // النوع: أيقونة
  head.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...entries, ...images.map((i) => i.data)]);
}

const title = "دليل الأدوات";
const plate = markSvg(); // الحاوية بحوافها المدورة (خلفية شفافة عند الزوايا)
const bleed = markSvg({ bleed: true }); // مربع كامل: iOS وAndroid يقصّانه بشكلهما الخاص
// القابلة للقص (maskable): الأقنعة تقصّ حتى 20% من كل جانب، فيُصغَّر الرسم ليبقى داخل المنطقة الآمنة (دائرة بنصف قطر 40%)
const safe = markSvg({ bleed: true, scale: 0.92 });

// الملف المستقل للشعار، وأيقونة التبويب (SVG للمتصفحات الحديثة، وICO لغيرها ولمحركات البحث)
write("logo.svg", markSvg({ title }));
write("favicon.svg", faviconSvg());
// إطار 16 من النسخة المحاذاة لشبكة البكسل، و32 و48 من الشعار نفسه (حوافه صحيحة عند 32 ومضاعفاتها)
write("favicon.ico", ico([{ size: 16, data: png(markSvg16(), 16) }, { size: 32, data: png(plate, 32) }, { size: 48, data: png(plate, 48) }]));

// أيقونات التطبيق (manifest): any بحواف شفافة، وmaskable بلا حواف مع شكل داخل المنطقة الآمنة (دائرة بنصف قطر 40%)
write("icon-192.png", png(plate, 192));
write("icon-512.png", png(plate, 512));
write("icon-maskable-512.png", png(safe, 512));
write("apple-touch-icon.png", png(bleed, 180));

// مجموعة الاستخدام الخارجي: صورة الحساب على المنصات (تُقصّ دائرة غالبًا فنعطيها بلا حواف)، والشعار الكبير، ولون واحد للأختام
write("brand/avatar-1024.png", png(bleed, 1024));
write("brand/logo-1024.png", png(plate, 1024));
write("brand/logo-mono.svg", markSvg({ mono: true, title }));
