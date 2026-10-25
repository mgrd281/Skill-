import { defineConfig } from "astro/config";

// الرابط العام للموقع (للـ canonical وخريطة الموقع). على Vercel يُؤخذ تلقائيًا،
// ويمكن تحديده يدويًا بالمتغير SITE_URL.
const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://example.com");

// على Vercel لا نقبل الرابط الاحتياطي: canonical وsitemap على example.com يضرّان بالفهرسة.
if (site === "https://example.com" && process.env.VERCEL) {
  throw new Error("SITE_URL غير مضبوط: أضفه في إعدادات Vercel (Environment Variables) بدومين الموقع الفعلي.");
}

export default defineConfig({
  site,
  trailingSlash: "ignore",
  build: { format: "directory" },
});
