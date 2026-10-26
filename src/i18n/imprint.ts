// نص صفحة الناشر (Impressum، src/views/Imprint.astro) باللغات الثلاث. البيانات نفسها من data/meta.json (operator)
// ولا تُترجم: الاسم والعنوان كما هما في السجلات الرسمية. في العربية تُعزل أسماء القوانين اللاتينية (\u2066…\u2069)
// حتى لا ينقلب ترتيب الرقم والقوس.
import type { Lang } from "./index";

interface Imprint {
  title: string;
  lead: string;
  contact: string;
  email: string;
  phone: string;
  represented: string;
  register: string;
  vatId: string;
  responsible: string;
  sameAddress: string;
  privacy: string;
  fallback: string;
}

const ar: Imprint = {
  title: "بيانات الناشر",
  lead: "من يدير هذا الموقع وكيف تتواصل معه، كما يطلب القانون الألماني (\u2066§ 5 DDG\u2069).",
  contact: "التواصل",
  email: "البريد",
  phone: "الهاتف",
  represented: "يمثّلها",
  register: "السجل التجاري",
  vatId: "رقم ضريبة القيمة المضافة (\u2066§ 27a UStG\u2069)",
  responsible: "المسؤول عن المحتوى (\u2066§ 18 Abs. 2 MStV\u2069)",
  sameAddress: "العنوان أعلاه",
  privacy: "ما يجمعه الموقع من بيانات تجده في صفحة الخصوصية.",
  fallback: "لم تُضف بيانات الناشر بعد. للتواصل استخدم نافذة «رأيك في الدليل» في أسفل كل صفحة.",
};

const de: Imprint = {
  title: "Impressum",
  lead: "Angaben gemäß § 5 DDG.",
  contact: "Kontakt",
  email: "E-Mail",
  phone: "Telefon",
  represented: "Vertreten durch",
  register: "Registereintrag",
  vatId: "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG",
  responsible: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
  sameAddress: "Anschrift wie oben",
  privacy: "Welche Daten die Website erhebt, steht in der Datenschutzerklärung.",
  fallback: "Die Angaben zum Betreiber fehlen noch. Für Kontakt nutze das Fenster „Feedback geben“ unten auf jeder Seite.",
};

const en: Imprint = {
  title: "Imprint",
  lead: "Who runs this site and how to reach them, as required by German law (§ 5 DDG).",
  contact: "Contact",
  email: "Email",
  phone: "Phone",
  represented: "Represented by",
  register: "Commercial register",
  vatId: "VAT ID (§ 27a UStG)",
  responsible: "Responsible for content (§ 18(2) MStV)",
  sameAddress: "Address as above",
  privacy: "What data the site collects is described on the privacy page.",
  fallback: "The operator's details haven't been added yet. To get in touch, use the “Give feedback” window at the bottom of every page.",
};

export const imprint: Record<Lang, Imprint> = { ar, de, en };
