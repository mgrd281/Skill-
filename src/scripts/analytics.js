// إحصاءات الزيارات (Vercel Web Analytics) وسرعة الصفحات عند الزوار (Vercel Speed Insights): بلا ملفات تعريف ارتباط
// ولا تخزين في المتصفح. تعملان على الموقع المنشور فقط بعد تفعيلهما من لوحة Vercel (Analytics وSpeed Insights).
// ما يُجمع موصوف في صفحة الخصوصية (src/i18n/privacy.ts).
if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  for (const src of ["/_vercel/insights/script.js", "/_vercel/speed-insights/script.js"]) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = src;
    document.head.append(s);
  }
}
