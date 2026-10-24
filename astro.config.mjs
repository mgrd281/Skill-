import { defineConfig } from "astro/config";

// الرابط العام للموقع (للـ canonical وخريطة الموقع). على Vercel يُؤخذ تلقائيًا،
// ويمكن تحديده يدويًا بالمتغير SITE_URL.
const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://example.com");

export default defineConfig({
  site,
  trailingSlash: "ignore",
  build: { format: "directory" },
});
