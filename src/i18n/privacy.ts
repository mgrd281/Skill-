// نص صفحة الخصوصية (src/views/Privacy.astro) باللغات الثلاث. يصف ما يفعله الموقع فعلًا: إن تغيّر شيء مما يجمعه
// (إحصاءات، نماذج، نشرة، تخزين في المتصفح) فعدّل هذا النص وتاريخه معه.
import type { Lang } from "./index";

export const PRIVACY_UPDATED = "2026-10-26";

const ar = {
  title: "الخصوصية",
  lead: "ما الذي يجمعه هذا الموقع وما الذي لا يجمعه، بكلام بسيط.",
  sections: [
    ["باختصار", "لا حسابات، ولا ملفات تعريف ارتباط (cookies)، ولا إعلانات، ولا بيع أو مشاركة لأي بيانات. ما تختاره في الموقع يبقى في متصفحك."],
    ["الاستضافة", "الموقع مستضاف على Vercel. لإيصال الصفحات وحمايتها من الهجمات يعالج Vercel مع كل طلب بيانات تقنية، مثل عنوان IP ووقت الطلب والصفحة المطلوبة. لا نستخدم هذه البيانات لتتبعك."],
    ["الإحصاءات", "نستخدم Vercel Web Analytics وVercel Speed Insights لنعرف عدد الزيارات، والصفحات الأكثر قراءة، وسرعة الموقع عند الزوار. تعملان بلا ملفات تعريف ارتباط، ولا تحفظان عنوان IP، وتميّزان الزيارة بمعرّف مؤقت يُمحى خلال يوم، فلا تتعرفان عليك بين الأيام أو المواقع."],
    ["ما ترسله بنفسك", "نوافذ الرأي والإبلاغ عن مشكلة واقتراح أداة ترسل ما تكتبه فيها فقط، ومعه لغة الصفحة وعنوانها ووقت الإرسال. لا نطلب اسمًا ولا بريدًا، ولا نحفظ عنوان IP. تُحفظ الرسائل في مخزن خاص على Vercel لا يطّلع عليه إلا مشغّل الموقع."],
    ["البحث بلا نتيجة", "إن بحثت في الدليل عن شيء لم يجده، تُرسل كلمات ذلك البحث وحدها، بلا ما يدل عليك، حين تغادر الصفحة، لنعرف الأدوات الناقصة. عمليات البحث التي وجدت نتيجة لا تُرسل."],
    ["نسخ أوامر التثبيت", "حين تنسخ أمر تثبيت أداة يُرسل اسم الأداة وحده لعدّ «الأكثر نسخًا هذا الأسبوع»، مرة في اليوم لكل أداة، بلا ما يدل عليك. تُحذف الأعداد بعد ثلاثة أسابيع."],
    ["«ساعدني أختار»", "حين تصل إلى النتائج تُرسل إجاباتك الثلاث وحدها (ما يهمك، وماذا تبني، وشكل الأداة)، بلا ما يدل عليك، لنعرف ما يهتم به الزوار. وتبقى نسخة منها في متصفحك لتعود إلى نتيجتك."],
    ["ما يبقى في متصفحك", "المفضلة، والأدوات التي أخفيتها، وفلاتر البحث، والوضع الفاتح أو الداكن، وآخر إشعار قرأته: كلها في التخزين المحلي (localStorage) لمتصفحك، ولا تُرسل إلينا. تحذفها بمسح بيانات هذا الموقع من إعدادات متصفحك."],
    ["مواقع أخرى", "صفحات الأدوات تربط بمستودعات GitHub ومواقع الأدوات نفسها. إن فتحتها فتنطبق عليك سياسة خصوصية كل منها."],
    ["حقوقك", "يحق لك أن تطلب الاطلاع على بياناتك وتصحيحها وحذفها، وأن تعترض على معالجتها، وأن تشتكي إلى هيئة حماية البيانات المختصة. ولأننا لا نحفظ ما يدل عليك، لا نستطيع غالبًا ربط رسالة بشخص بعينه."],
  ] as Array<[string, string]>,
  controller: "المسؤول عن الموقع",
  imprint: "الناشر",
  contactFallback: "للتواصل بشأن الخصوصية استخدم نافذة «رأيك في الدليل» في أسفل كل صفحة.",
  updated: (d: string) => `آخر تحديث: ${d}`,
  newsletter: (p: string) => `إن اشتركت في النشرة البريدية يُرسل بريدك مباشرة إلى ${p}، الذي يحفظ القائمة ويرسل رسالة تأكيد قبل أي نشرة، ولا يصل بريدك إلى هذا الموقع. تلغي الاشتراك من الرابط في أسفل كل رسالة.`,
  newsletterH: "النشرة البريدية",
};
type Privacy = typeof ar;

const de: Privacy = {
  title: "Datenschutz",
  lead: "Was diese Website erhebt und was nicht, in einfachen Worten.",
  sections: [
    ["Kurz gesagt", "Keine Konten, keine Cookies, keine Werbung, kein Verkauf und keine Weitergabe von Daten. Was du auf der Website auswählst, bleibt in deinem Browser."],
    ["Hosting", "Die Website wird bei Vercel gehostet. Um Seiten auszuliefern und vor Angriffen zu schützen, verarbeitet Vercel bei jeder Anfrage technische Daten wie IP-Adresse, Zeitpunkt und aufgerufene Seite. Wir nutzen diese Daten nicht, um dich zu verfolgen."],
    ["Statistik", "Wir nutzen Vercel Web Analytics und Vercel Speed Insights, um Besuche, die meistgelesenen Seiten und die Ladezeit bei Besuchern zu sehen. Beide arbeiten ohne Cookies, speichern keine IP-Adresse und unterscheiden Besuche mit einer vorübergehenden Kennung, die innerhalb eines Tages gelöscht wird. So erkennen sie dich weder an anderen Tagen noch auf anderen Websites wieder."],
    ["Was du selbst sendest", "Die Fenster für Feedback, Problemmeldungen und Tool-Vorschläge senden nur, was du hineinschreibst, zusammen mit Sprache, Adresse der Seite und Zeitpunkt. Wir fragen nicht nach Name oder E-Mail und speichern keine IP-Adresse. Die Nachrichten liegen in einem privaten Speicher bei Vercel, den nur der Betreiber der Website einsehen kann."],
    ["Suchen ohne Ergebnis", "Wenn du im Verzeichnis etwas suchst, das es nicht findet, werden nur diese Suchwörter, ohne Bezug zu dir, beim Verlassen der Seite gesendet. So sehen wir, welche Tools fehlen. Suchen mit Ergebnis werden nicht gesendet."],
    ["Kopierte Installationsbefehle", "Wenn du den Installationsbefehl eines Tools kopierst, wird nur der Name des Tools gesendet, um „Am meisten kopiert“ zu zählen, höchstens einmal pro Tag und Tool und ohne Bezug zu dir. Die Zahlen werden nach drei Wochen gelöscht."],
    ["Tool-Finder", "Wenn du die Ergebnisse erreichst, werden nur deine drei Antworten (dein Interesse, was du baust und die Art des Tools) ohne Bezug zu dir gesendet, damit wir sehen, wofür sich Besucher interessieren. Eine Kopie bleibt in deinem Browser, damit du zu deinem Ergebnis zurückkehren kannst."],
    ["Was in deinem Browser bleibt", "Favoriten, ausgeblendete Tools, Filter, helles oder dunkles Design und die zuletzt gelesene Benachrichtigung liegen im lokalen Speicher (localStorage) deines Browsers und werden nicht an uns gesendet. Du löschst sie, indem du die Daten dieser Website in deinem Browser entfernst."],
    ["Andere Websites", "Die Tool-Seiten verlinken auf GitHub-Repositories und die Websites der Tools. Wenn du sie öffnest, gilt dort deren Datenschutzerklärung."],
    ["Deine Rechte", "Du kannst Auskunft, Berichtigung und Löschung deiner Daten verlangen, der Verarbeitung widersprechen und dich bei der zuständigen Datenschutzaufsichtsbehörde beschweren. Da wir nichts speichern, was auf dich hinweist, können wir eine Nachricht meist keiner Person zuordnen."],
  ],
  controller: "Verantwortlich",
  imprint: "Impressum",
  contactFallback: "Für Fragen zum Datenschutz nutze das Fenster „Feedback geben“ unten auf jeder Seite.",
  updated: (d) => `Stand: ${d}`,
  newsletter: (p) => `Wenn du den Newsletter abonnierst, geht deine E-Mail-Adresse direkt an ${p}. Der Dienst verwaltet die Liste und schickt vor jedem Newsletter eine Bestätigungsmail; deine Adresse erreicht diese Website nicht. Abmelden kannst du dich über den Link in jeder E-Mail.`,
  newsletterH: "Newsletter",
};

const en: Privacy = {
  title: "Privacy",
  lead: "What this site collects and what it doesn't, in plain words.",
  sections: [
    ["In short", "No accounts, no cookies, no ads, and no selling or sharing of any data. What you choose on the site stays in your browser."],
    ["Hosting", "The site is hosted on Vercel. To deliver pages and protect them from attacks, Vercel processes technical data with every request, such as the IP address, the time and the page requested. We don't use this data to track you."],
    ["Statistics", "We use Vercel Web Analytics and Vercel Speed Insights to see how many visits there are, which pages are read most, and how fast the site is for visitors. Both work without cookies, don't store IP addresses, and tell visits apart with a temporary identifier that is discarded within a day, so they can't recognize you across days or sites."],
    ["What you send yourself", "The feedback, problem report and tool suggestion windows send only what you write in them, along with the page language, its address and the time. We don't ask for a name or email, and we don't store IP addresses. Messages are kept in a private store on Vercel that only the site's operator can see."],
    ["Searches without results", "If you search the directory for something it can't find, only those search words, with nothing that identifies you, are sent when you leave the page, so we can see which tools are missing. Searches that found something are not sent."],
    ["Copied install commands", "When you copy a tool's install command, only the tool's name is sent to count “Most copied this week”, at most once a day per tool and with nothing that identifies you. The counts are deleted after three weeks."],
    ["Tool finder", "When you reach the results, only your three answers (what you're interested in, what you're building and the kind of tool) are sent, with nothing that identifies you, so we can see what visitors care about. A copy stays in your browser so you can return to your results."],
    ["What stays in your browser", "Favorites, hidden tools, filters, light or dark mode and the last notification you read are kept in your browser's local storage (localStorage) and never sent to us. You remove them by clearing this site's data in your browser."],
    ["Other sites", "Tool pages link to GitHub repositories and the tools' own websites. If you open them, their privacy policies apply."],
    ["Your rights", "You can ask to access, correct or delete your data, object to its processing, and complain to the responsible data protection authority. Because we store nothing that points to you, we usually can't link a message to a person."],
  ],
  controller: "Responsible for this site",
  imprint: "Imprint",
  contactFallback: "For privacy questions, use the “Give feedback” window at the bottom of every page.",
  updated: (d) => `Last updated: ${d}`,
  newsletter: (p) => `If you subscribe to the newsletter, your email address goes straight to ${p}, which keeps the list and sends a confirmation email before any newsletter; your address never reaches this site. You can unsubscribe from the link in every email.`,
  newsletterH: "Newsletter",
};

export const privacy: Record<Lang, Privacy> = { ar, de, en };
