// فهرس البحث لكل لغة (/search.json و/de/search.json و/en/search.json): يُحمَّل عند أول بحث فقط.
// فيه كلمات كل أداة باللغات الثلاث بشكلها المكتوب (يطبّعها المتصفح، وتظهر كما هي في «هل تقصد»)،
// فيجد الزائر «invoice» في الصفحة العربية و«فاتورة» في الألمانية،
// وفيه خطة «حزمة التثبيت» لكل أداة (src/lib/install.js).
import { tools, categories, projects, projectById, toolDesc, catName, projName, kindLabel } from "./data";
import { LANGS, type Lang } from "../i18n";
import { norm, rawWords } from "./search.js";
import { kitPlan } from "./install.js";

export function searchIndex(lang: Lang) {
  const others = LANGS.filter((l) => l !== lang);
  return {
    tools: tools.map((t) => {
      const kit = kitPlan(t);
      const tags = LANGS.flatMap((l) => [kindLabel(t.kind, l), catName(t.cat, l)]);
      const uses = LANGS.flatMap((l) => t.use.map((u) => projName(projectById(u)!, l)));
      return {
        s: t.slug,
        n: t.name,
        k: kindLabel(t.kind, lang),
        c: t.cat,
        ...(t.stars ? { st: t.stars } : {}),
        sn: t.starsN,
        a: t.added.slice(0, 10),
        // t النوع والقسم، u المشاريع، d الوصف بلغة الصفحة، o الوصف باللغتين الأخريين (كلمات بلا تكرار)، m أمر التثبيت مطبَّعًا
        t: rawWords(tags.join(" ")),
        u: rawWords(uses.join(" ")),
        d: rawWords(toolDesc(t, lang)),
        o: rawWords(others.map((l) => toolDesc(t, l)).join(" ")),
        m: norm(t.cmd || ""),
        // خطة الحزمة: kl سطور الطرفية، ka ما يُكتب داخل Claude Code بعدها، kw سبب عدم الدخول
        ...(kit.lines ? { kl: kit.lines, ...(kit.after.length ? { ka: kit.after } : {}) } : { kw: kit.why }),
      };
    }),
    cats: categories.map((c) => ({ id: c.id, n: catName(c.id, lang), t: rawWords(LANGS.map((l) => catName(c.id, l)).join(" ")) })),
    projects: projects.map((p) => ({ id: p.id, n: projName(p, lang), t: rawWords(LANGS.map((l) => projName(p, l)).join(" ")) })),
  };
}
