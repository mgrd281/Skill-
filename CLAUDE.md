# تعليمات للعمل على هذا المشروع

- أي تعديل على الواجهة يتبع `DESIGN.md`. أهم قاعدة: **لا ظلال إطلاقًا** (لا `box-shadow` ولا `text-shadow` ولا `drop-shadow`).
- البيانات في `data/tools.json`، وطريقة إضافة أداة في `README.md`.
- الأيقونات من Phosphor فقط عبر `<Icon>`، وتُضاف بـ `npm run icons` (التفاصيل في `DESIGN.md`).
- قبل أي دمج: `npm run check` و`npm run build` و`npm run check-icons`، ثم قائمة الفحص في آخر `DESIGN.md`.
