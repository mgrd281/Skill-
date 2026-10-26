# حزمة الإطلاق: Skillpro

نصوص جاهزة للنشر، وأين تُنشر. **لا شيء هنا منشور بعد:** تنشره أنت من حساباتك. انشر **بعد** ربط الدومين النهائي،
لأن الروابط تبقى في هذه المواقع، ثم استبدل `xskills-nu.vercel.app` بالدومين في كل نص.

الصور: `npm run build` ثم `npm run marketing` (مواد الحملة) و`node scripts/make-marketing.cjs tool <slug>` (فيديو أداة).
صور معرض Product Hunt (1270×760 بدقة مضاعفة) تُلتقط من الموقع نفسه، وهي في `marketing/launch/` (خارج git).

## 1. Product Hunt

- **الاسم:** Skillpro
- **Tagline** (حتى 60 حرفًا): `Claude skills, MCP servers & open-source apps, ranked`
- **الوصف** (حتى 260 حرفًا):
  > A free directory of 380+ Claude skills, MCP servers, libraries and open-source apps for Mac, Windows, iPhone, Android and Linux. Ranked by GitHub stars, each with its install command and a safety check. In English, German and Arabic.
- **Topics:** Developer Tools · Artificial Intelligence · Open Source · Design Tools
- **الصور:** `ph-thumbnail-512.png` صورة مصغرة، ثم المعرض بالترتيب `ph-1` إلى `ph-6`، ويمكن إضافة `marketing/en/video-9x16.mp4`.
- **أول تعليق (من صاحب المنتج):**
  > Hi Product Hunt! I built Skillpro because finding good Claude skills and MCP servers meant digging through dozens of GitHub lists. Skillpro puts them in one place, ranked by GitHub stars and refreshed every week, with the exact install command, one-click setup for Cursor and VS Code, and a short safety panel (publisher, license, last update) for every tool. There's also a section of open-source apps for every system, and "Top lists" like the best MCP servers. No account, no tracking cookies, free. I'd love to hear which tools you'd add.
- **قبل الإطلاق:** الإطلاق يوم ثلاثاء أو أربعاء بعد منتصف الليل بتوقيت المحيط الهادئ (09:01 بتوقيت ألمانيا). الأرقام في النصوص تتغير مع الدليل: راجعها يوم النشر.

## 2. قوائم awesome على GitHub

تحققت من وجود كل قائمة وقاعدة المشاركة فيها (26 أكتوبر 2026). اقرأ CONTRIBUTING مرة أخرى قبل الإرسال، فالقواعد تتغير.

| القائمة | أين يناسب | طريقة الإرسال |
|---|---|---|
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | «Lists & Collections» | **نموذج issue فقط** (لا PR، وإلا يُقيَّد الحساب): [الرابط](https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml). يقبل غير مفتوح المصدر، ويرفض ما يحتاج تسجيلًا. |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | «Resources › Community Resources» | Pull Request، بالتنسيق نفسه تمامًا، بلا رموز تعبيرية. |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | لا قسم للمواقع حاليًا | قسم «Aggregators» للخوادم لا للمواقع: لا ترسل إليه. |

**السطر المقترح** (وصف لا دعاية، سطر واحد، بلا رموز تعبيرية):

```markdown
- [Skillpro](https://xskills-nu.vercel.app/en/) - Directory of Claude skills, MCP servers and open-source apps ranked by GitHub stars, with install commands, one-click MCP setup for Cursor and VS Code, and a safety panel per tool. English, German and Arabic.
```

## 3. منشورات التواصل

**الإطلاق — العربية**
> جمعت في مكان واحد أكثر من ٣٨٠ أداة تساعدك في عملك: مهارات Claude، وخوادم MCP، ومكتبات للتصميم والأنيميشن، وتطبيقات مفتوحة المصدر لـ Mac وWindows وiPhone وAndroid وLinux. مرتبة بنجوم GitHub، ولكل أداة أمر التثبيت. مجانًا وبلا حساب: xskills-nu.vercel.app

**Launch — Deutsch**
> Über 380 Tools an einem Ort: Claude Skills, MCP-Server, Bibliotheken für Design und Animation und Open-Source-Apps für Mac, Windows, iPhone, Android und Linux. Nach GitHub-Sternen sortiert, mit Installationsbefehl für jedes Tool. Kostenlos und ohne Konto: xskills-nu.vercel.app/de/

**Launch — English**
> 380+ tools in one place: Claude skills, MCP servers, design and animation libraries, and open-source apps for Mac, Windows, iPhone, Android and Linux. Ranked by GitHub stars, each with its install command. Free, no account: xskills-nu.vercel.app/en/

**أداة اليوم (قالب أسبوعي):** `node scripts/make-marketing.cjs tool --latest 5` يصنع فيديو وصورة لأحدث خمس أدوات بثلاث لغات. النص:
> أداة اليوم: <الاسم>. <وصفها من صفحتها>. التثبيت بأمر واحد، والتفاصيل والأمان في Skillpro: <الرابط>/tools/<slug>

## 4. ما لا تفعله

- لا تشترِ أصواتًا أو نجومًا، ولا تطلب تصويتًا جماعيًا على Product Hunt (يخالف قواعده ويُحذف المنتج).
- لا تذكر أرقامًا أو مزايا غير موجودة في الموقع يوم النشر.
