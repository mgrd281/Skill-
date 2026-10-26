// قوائم «الأفضل» (data/lists.json، صفحات /best/): كل قائمة مرشّح على الأقسام والأنواع، وترتيبها بنجوم GitHub من البيانات نفسها.
// لا ترتيب يدوي ولا أدوات خارج الدليل: القائمة تتغير وحدها مع تحديث النجوم الأسبوعي. المؤرشفة (لم تعد تُطوَّر) لا تدخل.
import listsJson from "../../data/lists.json";
import { type Tool, tools } from "./data";
import type { Lang } from "../i18n";

export interface BestList {
  id: string; icon: string; cats?: string[]; kinds?: string[]; limit: number;
  title: string; title_de: string; title_en: string; lead: string; lead_de: string; lead_en: string;
}
export const lists = listsJson as BestList[];
const pick = (l: BestList, k: "title" | "lead", lang: Lang): string => (lang === "ar" ? l[k] : l[`${k}_${lang}`]);
export const listTitle = (l: BestList, lang: Lang) => pick(l, "title", lang);
export const listLead = (l: BestList, lang: Lang) => pick(l, "lead", lang);
export function listTools(l: BestList): Tool[] {
  return tools
    .filter((t) => (!l.cats || l.cats.includes(t.cat)) && (!l.kinds || l.kinds.includes(t.kind)) && !t.archived && t.starsN >= 0)
    .sort((a, b) => b.starsN - a.starsN || a.order - b.order)
    .slice(0, l.limit);
}
// القوائم التي تخص قسمًا (لرابط «القائمة المرتبة» في صفحة القسم)
export const listsForCat = (cat: string) => lists.filter((l) => l.cats?.includes(cat));
