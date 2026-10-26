// «ساعدني أختار» (مساعد الاختيار): ثلاثة أسئلة، ما يهمك وماذا تبني وبأي شكل، ثم أنسب الأدوات لإجاباتك.
// هنا معنى كل إجابة في البيانات، وبيانات الترشيح لكل لغة (/finder.json). الواجهة في src/views/FinderFragment.astro،
// والترتيب في المتصفح (src/scripts/finder-app.js):
//   1) ماذا تبني: شرط. لا تظهر إلا أدوات المشروع (inProject)، إلا إن اختار الزائر «أستكشف فقط».
//   2) ما يهمك والشكل: درجة. ما يطابقهما معًا أولًا، ثم ما يطابق الاهتمام وحده، ثم الشكل وحده، فلا تفرغ النتيجة أبدًا.
//   3) داخل كل درجة: الجودة q (النجوم والتحديث والرخصة والناشر الرسمي)، و«ابدأ بهذه» للمشروع المختار.
import { tools, byStars, categories, projects, inProject, kindLabel, kindIcon, toolDesc, initials, txt, type Tool } from "./data";
import type { IconName } from "./icons";
import type { Lang } from "../i18n";
import { kitPlan, RUNS_REMOTE_SCRIPT } from "./install.js";
import { officialOf } from "./trust";

// السؤال الأول: الاهتمام. كل قسم في data/categories.json في اهتمام واحد بالضبط (يُتحقق منه أدناه وقت البناء)
export const NEEDS: Array<{ id: string; icon: IconName; cats: string[] }> = [
  { id: "design", icon: "pen-nib", cats: ["design", "brandskills", "ui", "icons"] },
  { id: "motion", icon: "magic-wand", cats: ["animation", "motiongfx"] },
  { id: "code", icon: "code", cats: ["devskills", "quality", "infra", "vercel", "mobskills", "apple", "data", "mcp", "general"] },
  { id: "grow", icon: "megaphone", cats: ["shopmkt", "analytics"] },
  { id: "work", icon: "briefcase", cats: ["business", "docs", "finance", "booking"] },
  { id: "write", icon: "pencil-simple-line", cats: ["writing", "prompts"] },
];
// السؤال الثالث: شكل الأداة. كل نوع في data/tools.json في مجموعة واحدة بالضبط
export const KINDS: Array<{ id: string; icon: IconName; kinds: string[] }> = [
  { id: "skill", icon: "sparkle", kinds: ["Skill"] },
  { id: "mcp", icon: "plug", kinds: ["MCP"] },
  { id: "lib", icon: "package", kinds: ["مكتبة", "أداة", "صيغة"] },
  { id: "ready", icon: "globe", kinds: ["موقع", "منصة", "تطبيق", "دليل"] },
];

const needOf = new Map<string, string>();
for (const c of categories) {
  const in_ = NEEDS.filter((n) => n.cats.includes(c.id));
  if (in_.length !== 1) throw new Error(`مساعد الاختيار: القسم "${c.id}" يجب أن يكون في اهتمام واحد بالضبط في NEEDS داخل src/lib/finder.ts (هو الآن في ${in_.length}).`);
  needOf.set(c.id, in_[0].id);
}
const kindOf = new Map<string, string>();
for (const k of new Set(tools.map((t) => t.kind))) {
  const in_ = KINDS.filter((g) => g.kinds.includes(k));
  if (in_.length !== 1) throw new Error(`مساعد الاختيار: النوع "${k}" يجب أن يكون في مجموعة واحدة بالضبط في KINDS داخل src/lib/finder.ts (هو الآن في ${in_.length}).`);
  kindOf.set(k, in_[0].id);
}

// جودة الأداة بين −0.8 و1.2 تقريبًا، فلا تتخطى درجة المطابقة (الفرق بين درجتين 3):
// النجوم (لوغاريتميًا: 100 نجمة ثلث 1M)، والتحديث في آخر ستة أشهر، والناشر الرسمي، وتنقص لما يحذّر منه الدليل
const buildTime = Date.now();
function quality(t: Tool): number {
  let q = t.starsN > 0 ? Math.min(1, Math.log10(t.starsN + 1) / 6) * 0.9 : 0;
  if (t.pushed) {
    const days = (buildTime - Date.parse(t.pushed)) / 864e5;
    if (days > 365) q -= 0.4;
    else if (days < 180) q += 0.1;
  }
  if (t.license === "none") q -= 0.25;
  if (t.cmd && RUNS_REMOTE_SCRIPT.test(t.cmd)) q -= 0.15;
  if (officialOf(t)) q += 0.15;
  return Math.round(q * 100) / 100;
}

// أول جملة من الوصف (صفوف النتائج تعرض سطرين، والوصف كاملًا في صفحة الأداة). لا تُقطع عند اختصار مثل «z. B.» أو «bzw.»،
// وإن طالت الجملة يُقطع النص عند كلمة مع «…»
const ABBR = /(^|\s)(\p{L}|bzw|ca|etc|vs|usw|inkl|ggf|evtl)$/iu;
export function lead(s: string, max = 200): string {
  const end = /[.!?؟](?=\s|$)/g;
  for (let m; (m = end.exec(s)); ) {
    const at = m.index + 1;
    if (at > max) break;
    if (at >= 50 && !ABBR.test(s.slice(Math.max(0, m.index - 4), m.index))) return s.slice(0, at);
  }
  if (s.length <= max) return s;
  const cut = s.lastIndexOf(" ", max - 1);
  return s.slice(0, cut > max * 0.6 ? cut : max - 1).replace(/[\s,،:;؛]+$/, "") + "…";
}

// بيانات الترشيح بلغة الصفحة. المؤرشف لا يُرشَّح. الحقول: s الاسم المختصر، n الاسم، m الحرفان، e الاهتمام، k الشكل،
// kl اسم النوع وki أيقونته، p المشاريع، st وsn النجوم، d أول جملة من الوصف (HTML بلغة الصفحة)، o الجهة الرسمية، q الجودة،
// i تدخل «حزمة التثبيت». وpicks: «ابدأ بهذه» لكل مشروع
export function finderData(lang: Lang) {
  return {
    tools: byStars.filter((t) => !t.archived).map((t) => {
      const o = officialOf(t);
      return {
        s: t.slug, n: t.name, m: initials(t.name), e: needOf.get(t.cat)!, k: kindOf.get(t.kind)!,
        kl: kindLabel(t.kind, lang), ki: kindIcon(t.kind),
        p: projects.filter((p) => inProject(t, p)).map((p) => p.id),
        ...(t.stars ? { st: t.stars } : {}), sn: t.starsN,
        d: txt(lead(toolDesc(t, lang)), lang),
        ...(o ? { o } : {}), q: quality(t),
        ...(kitPlan(t).lines ? { i: 1 } : {}),
      };
    }),
    picks: Object.fromEntries(projects.map((p) => [p.id, p.pickSlugs])),
  };
}
