// «الأمان والثقة» في صفحة الأداة: ما يحتاج الزائر أن يعرفه قبل التثبيت، من البيانات نفسها بلا درجات مخترعة.
// ثلاث إشارات: من ينشرها (الحساب الرسمي للجهة أم حساب آخر)، وأين تعمل (جهازك، خادم بعيد ومن يستقبل البيانات،
// داخل Claude، داخل مشروعك)، ومن أين تُثبَّت (السوق الرسمي، npm، Homebrew، winget، App Store، GitHub، سكربت من الإنترنت).
// ثم نصيحة واحدة تناسب نوعها.
import type { IconName } from "./icons";
import type { Lang } from "../i18n";
import { type Tool, host, isAppStore } from "./data";
import { mcpServer, RUNS_REMOTE_SCRIPT } from "./install.js";

// حسابات GitHub الرسمية للجهات (الشركة أو المشروع نفسه). غيرها يظهر باسم الحساب فقط.
// أضف هنا حين تضيف أداة من حساب رسمي لجهة معروفة.
const OFFICIAL: Record<string, string> = {
  anthropics: "Anthropic", vercel: "Vercel", "vercel-labs": "Vercel", microsoft: "Microsoft", Shopify: "Shopify",
  getsentry: "Sentry", "shadcn-ui": "shadcn/ui", supabase: "Supabase", flutter: "Flutter", motiondivision: "Motion",
  greensock: "GSAP", "rive-app": "Rive", LottieFiles: "LottieFiles", "remotion-dev": "Remotion", resend: "Resend",
  "heygen-com": "HeyGen", "google-labs-code": "Google Labs", trailofbits: "Trail of Bits", upstash: "Upstash",
  ChromeDevTools: "Chrome DevTools", GoogleChrome: "Google Chrome", dequelabs: "Deque", darkroomengineering: "darkroom.engineering",
  formkit: "FormKit", "radix-ui": "Radix", "floating-ui": "Floating UI", tremorlabs: "Tremor", "lucide-icons": "Lucide",
  "phosphor-icons": "Phosphor", tabler: "Tabler", "umami-software": "Umami", PostHog: "PostHog", fullcalendar: "FullCalendar",
  calcom: "Cal.com", medplum: "Medplum", lycheeverse: "lychee", mdn: "MDN", "canva-sdks": "Canva", "recraft-ai": "Recraft",
  "mobile-dev-inc": "mobile.dev", "norman-finance": "Norman", qonto: "Qonto", "itplr-kosit": "KoSIT", "paperless-ngx": "Paperless-ngx",
  "better-auth": "Better Auth", hugeicons: "Hugeicons", swup: "swup", pmndrs: "Poimandres", airbnb: "Airbnb",
  EmergeTools: "Emerge Tools", VeryGoodOpenSource: "Very Good Ventures", "ionic-team": "Ionic", "browser-use": "Browser Use",
  figma: "Figma", ManimCommunity: "Manim", "motion-canvas": "Motion Canvas", "theatre-js": "Theatre.js",
  "languagetool-org": "LanguageTool", "dair-ai": "DAIR.AI", promptfoo: "Promptfoo", langfuse: "Langfuse", makenotion: "Notion",
  jgraph: "draw.io", duckdb: "DuckDB", stripe: "Stripe", paypal: "PayPal", cloudflare: "Cloudflare", aws: "AWS", expo: "Expo",
  android: "Android", callstackincubator: "Callstack", firebase: "Firebase", RevenueCat: "RevenueCat", neondatabase: "Neon",
  clerk: "Clerk", semgrep: "Semgrep", elevenlabs: "ElevenLabs", "21st-dev": "21st.dev", magicuidesign: "Magic UI",
  "uiverse-io": "Uiverse", gitroomhq: "Postiz", ComposioHQ: "Composio", VoltAgent: "VoltAgent", "capawesome-team": "Capawesome",
  rorkai: "Rork", squirrelscan: "squirrelscan",
  // خوادم MCP من حسابات الجهات نفسها (supabase-community وmongodb-js حسابا Supabase وMongoDB لمشاريعهما مفتوحة المصدر)
  github: "GitHub", modelcontextprotocol: "Model Context Protocol", MicrosoftDocs: "Microsoft", atlassian: "Atlassian",
  "supabase-community": "Supabase", "mongodb-js": "MongoDB", grafana: "Grafana Labs", huggingface: "Hugging Face", brave: "Brave",
  perplexityai: "Perplexity", firecrawl: "Firecrawl", "exa-labs": "Exa", apify: "Apify", motherduckdb: "MotherDuck",
  // «تطبيقات جاهزة»: حسابات الجهات التي تنشر تطبيقاتها بنفسها (blender وvideolan وLibreOffice نسخ رسمية من مستودعاتها)
  "mozilla-mobile": "Mozilla", wikimedia: "Wikimedia", duckduckgo: "DuckDuckGo", signalapp: "Signal", mastodon: "Mastodon",
  Automattic: "Automattic", obsproject: "OBS Project", videolan: "VideoLAN", blender: "Blender", LibreOffice: "LibreOffice",
};

export type Tone = "ok" | "info" | "warn";
export interface TrustRow { id: "pub" | "run" | "src"; icon: IconName; label: string; value: string; note: string; tone: Tone; href?: string }
export interface Trust { rows: TrustRow[]; tip: string }

type Words = {
  publisher: string; runs: string; source: string;
  official: (org: string) => string; officialNote: string; account: string; accountNote: string; siteNote: string;
  local: string; localNote: string; remote: (h: string) => string; remoteNote: (h: string) => string; bridgeNote: (h: string) => string;
  localApp: string; localAppNote: string; mcp: string; mcpNote: string;
  skill: string; skillNote: string; plugin: string; pluginNote: string; library: string; libraryNote: string;
  cli: string; cliNote: string; app: string; appNote: string; store: string; storeNote: string; web: string; webNote: string; platform: string; platformNote: string; format: string; formatNote: string;
  market: string; marketNote: string; marketRepo: (r: string) => string; marketRepoNote: string;
  repo: (r: string) => string; repoNote: string; pkg: (reg: string, p: string) => string; pkgNote: string; tapNote: string;
  script: string; scriptNote: string; noInstall: (h: string) => string; noInstallNote: string;
  tipScript: string; tipLocal: string; tipRemote: (h: string) => string; tipSkill: string; tipPlugin: string; tipLibrary: string; tipWeb: string; tipApp: string;
};

const W: Record<Lang, Words> = {
  ar: {
    publisher: "الناشر", runs: "أين تعمل", source: "من أين تُثبَّت",
    official: (o) => `الحساب الرسمي لـ ${o}`, officialNote: "تنشرها الجهة نفسها على GitHub.",
    account: "حساب على GitHub", accountNote: "مطوّر مستقل أو فريق: افتح المستودع وانظر من يطوّره ومتى حُدِّث.",
    siteNote: "الموقع الرسمي للأداة.",
    local: "على جهازك", localNote: "يشغّل برنامجًا محليًا بصلاحياتك، فيصل إلى ما تسمح له به من ملفات وأدوات.",
    remote: (h) => `خادم بعيد: ${h}`, remoteNote: (h) => `لا شيء يُثبَّت على جهازك، لكن ما يرسله Claude إلى الخادم يصل إلى ${h}.`,
    bridgeNote: (h) => `على جهازك وسيط صغير فقط (mcp-remote) يوصل Claude بالخادم، وما يرسله Claude يصل إلى ${h}.`,
    localApp: "على جهازك، عبر البرنامج", localAppNote: "يتصل Claude ببرنامج يعمل على جهازك، فتبقى البيانات عندك.",
    mcp: "خادم MCP", mcpNote: "يربط Claude بأداة خارجية، على جهازك أو على خادم الجهة حسب طريقة التثبيت.",
    skill: "داخل Claude", skillNote: "ملفات تعليمات يقرؤها Claude، وقد تضم سكربتات يشغّلها حين يحتاجها.",
    plugin: "إضافة لـ Claude Code", pluginNote: "قد تضم مهارات وأوامر وخوادم MCP، وأوامر تعمل تلقائيًا (hooks).",
    library: "داخل كود مشروعك", libraryNote: "مكتبة تُضاف إلى مشروعك وتُبنى معه.",
    cli: "برنامج على جهازك", cliNote: "أداة تشغّلها بنفسك من الطرفية أو تطبيق على جهازك.",
    app: "تطبيق على جهازك", appNote: "تثبّته وتفتحه مثل أي برنامج على الكمبيوتر أو الهاتف، وشيفرته مفتوحة على GitHub.",
    store: "App Store", storeNote: "من متجر Apple، وتراجع Apple التطبيقات قبل نشرها.",
    web: "في المتصفح", webNote: "خدمة على الإنترنت تستخدمها من موقعها، بلا تثبيت.",
    platform: "خدمة على الإنترنت", platformNote: "تستضيفها الجهة، وتربطها بمشروعك بمكتبتها أو من لوحة التحكم.",
    format: "ملف في مشروعك", formatNote: "صيغة ملف تضعه في مشروعك فيقرؤه Claude وأدواتك.",
    market: "سوق الإضافات الرسمي من Anthropic", marketNote: "مُدرجة في سوق Claude Code الرسمي (claude-plugins-official).",
    marketRepo: (r) => `سوق إضافات من GitHub: ${r}`, marketRepoNote: "سوق ينشره صاحب الإضافة في مستودعه.",
    repo: (r) => `مستودع GitHub: ${r}`, repoNote: "تُنسخ ملفاتها من المستودع مباشرة.",
    pkg: (reg, p) => `${reg}: ${p}`, pkgNote: "حزمة من سجل الحزم الرسمي، بإصدار ونسخ معروفة.",
    tapNote: "من مستودع Homebrew خاص بالناشر (tap)، لا من سجل Homebrew الرسمي.",
    script: "سكربت من الإنترنت", scriptNote: "أمر التثبيت يحمّل سكربتًا وينفّذه مباشرة.",
    noInstall: (h) => `اتصال بخادم ${h}`, noInstallNote: "لا يُثبَّت شيء: يضيف Claude رابط الخادم فقط.",
    tipScript: "اقرأ السكربت قبل تشغيله، أو ثبّت يدويًا من صفحة المشروع.",
    tipLocal: "يعمل بصلاحياتك على جهازك: ثبّت ما تثق بناشره، وألقِ نظرة على المستودع أولًا.",
    tipRemote: (h) => `لا تمرّر عبره بيانات حساسة إلا إن وثقت بـ ${h} وقرأت سياسة الخصوصية.`,
    tipSkill: "افتح ملف SKILL.md في المستودع قبل التثبيت لتعرف ما سيفعله Claude.",
    tipPlugin: "الإضافات قد تشغّل أوامر تلقائيًا: ثبّت ما تثق بناشره، وراجع محتواها من المستودع.",
    tipLibrary: "تحقق من الرخصة وآخر تحديث قبل الاعتماد عليها في عمل تجاري.",
    tipWeb: "اقرأ سياسة الخصوصية قبل أن ترفع ملفاتك أو بياناتك.",
    tipApp: "نزّله من صفحته الرسمية أو من متجر التطبيقات فقط، لا من مواقع تنزيل أخرى قد تضيف إليه برامج غير مرغوبة.",
  },
  de: {
    publisher: "Herausgeber", runs: "Wo es läuft", source: "Woher es kommt",
    official: (o) => `Offizielles Konto von ${o}`, officialNote: "Vom Anbieter selbst auf GitHub veröffentlicht.",
    account: "Konto auf GitHub", accountNote: "Eine unabhängige Person oder ein Team: Schau im Repository, wer es pflegt und wann es aktualisiert wurde.",
    siteNote: "Die offizielle Website des Tools.",
    local: "Auf deinem Rechner", localNote: "Startet ein lokales Programm mit deinen Rechten und erreicht, was du ihm erlaubst.",
    remote: (h) => `Remote-Server: ${h}`, remoteNote: (h) => `Auf deinem Rechner wird nichts installiert, aber was Claude an den Server schickt, landet bei ${h}.`,
    bridgeNote: (h) => `Auf deinem Rechner läuft nur eine kleine Brücke (mcp-remote) zum Server. Was Claude dorthin schickt, landet bei ${h}.`,
    localApp: "Auf deinem Rechner, über die App", localAppNote: "Claude verbindet sich mit einem Programm auf deinem Rechner, die Daten bleiben bei dir.",
    mcp: "MCP-Server", mcpNote: "Verbindet Claude mit einem externen Tool, lokal oder beim Anbieter, je nach Installation.",
    skill: "In Claude", skillNote: "Anleitungsdateien, die Claude liest. Sie können Skripte enthalten, die Claude bei Bedarf ausführt.",
    plugin: "Plugin für Claude Code", pluginNote: "Kann Skills, Befehle, MCP-Server und automatisch laufende Befehle (Hooks) enthalten.",
    library: "Im Code deines Projekts", libraryNote: "Eine Bibliothek, die in dein Projekt eingebunden und mitgebaut wird.",
    cli: "Programm auf deinem Rechner", cliNote: "Ein Tool, das du selbst im Terminal startest, oder eine App auf deinem Rechner.",
    app: "App auf deinem Gerät", appNote: "Du installierst und öffnest sie wie jedes Programm auf Computer oder Handy, und ihr Code ist offen auf GitHub.",
    store: "App Store", storeNote: "Aus dem App Store von Apple, wo Apple Apps vor der Veröffentlichung prüft.",
    web: "Im Browser", webNote: "Ein Onlinedienst, den du auf seiner Website nutzt, ohne Installation.",
    platform: "Onlinedienst", platformNote: "Vom Anbieter gehostet. Du verbindest ihn über seine Bibliothek oder das Dashboard mit deinem Projekt.",
    format: "Datei in deinem Projekt", formatNote: "Ein Dateiformat, das du in dein Projekt legst, damit Claude und deine Tools es lesen.",
    market: "Offizieller Plugin-Marktplatz von Anthropic", marketNote: "Im offiziellen Claude-Code-Marktplatz gelistet (claude-plugins-official).",
    marketRepo: (r) => `Marktplatz auf GitHub: ${r}`, marketRepoNote: "Ein Marktplatz, den der Autor in seinem Repository veröffentlicht.",
    repo: (r) => `GitHub-Repository: ${r}`, repoNote: "Die Dateien werden direkt aus dem Repository kopiert.",
    pkg: (reg, p) => `${reg}: ${p}`, pkgNote: "Ein Paket aus der offiziellen Paketquelle, mit bekannten Versionen.",
    tapNote: "Aus einer eigenen Homebrew-Quelle des Herausgebers (Tap), nicht aus dem offiziellen Homebrew-Verzeichnis.",
    script: "Skript aus dem Internet", scriptNote: "Der Befehl lädt ein Skript und führt es direkt aus.",
    noInstall: (h) => `Verbindung zu ${h}`, noInstallNote: "Nichts wird installiert: Claude bekommt nur die Adresse des Servers.",
    tipScript: "Lies das Skript, bevor du es startest, oder installiere manuell über die Projektseite.",
    tipLocal: "Es läuft mit deinen Rechten auf deinem Rechner: Installiere nur, wem du vertraust, und wirf zuerst einen Blick ins Repository.",
    tipRemote: (h) => `Gib darüber keine sensiblen Daten weiter, außer du vertraust ${h} und hast die Datenschutzerklärung gelesen.`,
    tipSkill: "Öffne vor der Installation die Datei SKILL.md im Repository, dann weißt du, was Claude tun wird.",
    tipPlugin: "Plugins können Befehle automatisch ausführen: Installiere nur, wem du vertraust, und prüfe den Inhalt im Repository.",
    tipLibrary: "Prüfe Lizenz und letzte Aktualisierung, bevor du dich kommerziell darauf verlässt.",
    tipWeb: "Lies die Datenschutzerklärung, bevor du Dateien oder Daten hochlädst.",
    tipApp: "Lade sie nur von der offiziellen Seite oder aus einem App Store, nicht von Download-Portalen, die unerwünschte Software beipacken können.",
  },
  en: {
    publisher: "Publisher", runs: "Where it runs", source: "Where it comes from",
    official: (o) => `${o}'s official account`, officialNote: "Published on GitHub by the company or project itself.",
    account: "GitHub account", accountNote: "An independent developer or team: check the repository to see who maintains it and when it was last updated.",
    siteNote: "The tool's official website.",
    local: "On your computer", localNote: "Runs a local program with your permissions, so it can reach what you allow it to.",
    remote: (h) => `Remote server: ${h}`, remoteNote: (h) => `Nothing is installed on your computer, but what Claude sends to the server reaches ${h}.`,
    bridgeNote: (h) => `Only a small bridge (mcp-remote) runs on your computer. What Claude sends to the server reaches ${h}.`,
    localApp: "On your computer, through the app", localAppNote: "Claude connects to a program running on your computer, so your data stays with you.",
    mcp: "MCP server", mcpNote: "Connects Claude to an external tool, on your computer or the provider's server depending on how you install it.",
    skill: "Inside Claude", skillNote: "Instruction files Claude reads. They can include scripts Claude runs when it needs them.",
    plugin: "Claude Code plugin", pluginNote: "Can bundle skills, commands, MCP servers and commands that run automatically (hooks).",
    library: "In your project's code", libraryNote: "A library added to your project and built with it.",
    cli: "A program on your computer", cliNote: "A tool you run yourself in the terminal, or an app on your computer.",
    app: "An app on your device", appNote: "You install and open it like any program on your computer or phone, and its code is open on GitHub.",
    store: "App Store", storeNote: "From Apple's App Store, where Apple reviews apps before they're published.",
    web: "In the browser", webNote: "An online service you use on its website, with nothing to install.",
    platform: "Online service", platformNote: "Hosted by the provider. You connect it to your project with its library or from its dashboard.",
    format: "A file in your project", formatNote: "A file format you add to your project so Claude and your tools can read it.",
    market: "Anthropic's official plugin marketplace", marketNote: "Listed in the official Claude Code marketplace (claude-plugins-official).",
    marketRepo: (r) => `Marketplace on GitHub: ${r}`, marketRepoNote: "A marketplace the author publishes in their own repository.",
    repo: (r) => `GitHub repository: ${r}`, repoNote: "Its files are copied straight from the repository.",
    pkg: (reg, p) => `${reg}: ${p}`, pkgNote: "A package from the official registry, with known versions.",
    tapNote: "From the publisher's own Homebrew source (a tap), not the official Homebrew registry.",
    script: "A script from the internet", scriptNote: "The install command downloads a script and runs it right away.",
    noInstall: (h) => `Connection to ${h}`, noInstallNote: "Nothing is installed: Claude only gets the server's address.",
    tipScript: "Read the script before running it, or install manually from the project page.",
    tipLocal: "It runs with your permissions on your computer: install only what you trust, and look at the repository first.",
    tipRemote: (h) => `Don't pass sensitive data through it unless you trust ${h} and have read its privacy policy.`,
    tipSkill: "Open SKILL.md in the repository before installing, so you know what Claude will do.",
    tipPlugin: "Plugins can run commands automatically: install only what you trust, and review its contents in the repository.",
    tipLibrary: "Check the license and last update before relying on it for commercial work.",
    tipWeb: "Read the privacy policy before uploading your files or data.",
    tipApp: "Download it only from its official page or an app store, not from download sites that may bundle unwanted software.",
  },
};

const ghOwner = (url: string | null) => (url && /^https:\/\/github\.com\/([^/]+)/.exec(url)?.[1]) || null;
// اسم الجهة إن كانت الأداة من حسابها الرسمي على GitHub (لمساعد الاختيار: src/lib/finder.ts)
export function officialOf(t: Tool): string | null {
  const o = ghOwner(t.gh);
  return o && Object.hasOwn(OFFICIAL, o) ? OFFICIAL[o] : null;
}
const shortRepo = (s: string) => s.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "").split("/").slice(0, 2).join("/");

// اسم الحزمة من أمر التثبيت ورابط صفحتها في سجلها الرسمي
function packageOf(cmd: string): { reg: string; name: string; href: string; tap?: boolean } | null {
  const line = cmd.split("\n")[0];
  let m: RegExpExecArray | null;
  const npmName = (s: string) => s.replace(/^(@?[^@\s]+)@[^\s]*$/, "$1");
  if ((m = /^npm (?:i|install)(?: -D| --save-dev| --save| -g| --global)* ((?:@[\w.-]+\/)?[\w.-]+(?:@[\w.-]+)?)/.exec(line)))
    return { reg: "npm", name: npmName(m[1]), href: "https://www.npmjs.com/package/" + npmName(m[1]) };
  if ((m = /--\s+npx -y ((?:@[\w.-]+\/)?[\w.-]+(?:@[\w.-]+)?)/.exec(line)) || (m = /^claude mcp add \S+ npx ((?:@[\w.-]+\/)?[\w.-]+(?:@[\w.-]+)?)$/.exec(line)))
    return { reg: "npm", name: npmName(m[1]), href: "https://www.npmjs.com/package/" + npmName(m[1]) };
  if ((m = /^brew install (--cask )?([\w./@+-]+)$/.exec(line))) {
    const name = m[2].split("/").pop()!;
    return m[2].includes("/") ? { reg: "Homebrew", name: m[2], href: "https://github.com/" + m[2].split("/").slice(0, 2).join("/").replace(/\/(.+)$/, "/homebrew-$1"), tap: true }
      : { reg: "Homebrew", name, href: `https://formulae.brew.sh/${m[1] ? "cask" : "formula"}/${name}` };
  }
  if ((m = /^winget install (?:(?:-e|--exact) )?--id ([\w.+-]+)/.exec(line)))
    return { reg: "winget", name: m[1], href: `https://github.com/microsoft/winget-pkgs/tree/master/manifests/${m[1][0].toLowerCase()}/${m[1].replace(/\./g, "/")}` };
  if ((m = /^(?:python -m )?pip install '?([\w.-]+)/.exec(line))) return { reg: "PyPI", name: m[1], href: "https://pypi.org/project/" + m[1] + "/" };
  if ((m = /uvx (?:--from ([\w.-]+)|([\w.-]+))/.exec(line))) { const n = m[1] || m[2]; return { reg: "PyPI", name: n, href: "https://pypi.org/project/" + n + "/" }; }
  if ((m = /^flutter pub add ([\w]+)/.exec(line))) return { reg: "pub.dev", name: m[1], href: "https://pub.dev/packages/" + m[1] };
  return null;
}

export function trust(t: Tool, lang: Lang): Trust {
  const w = W[lang];
  const rows: TrustRow[] = [];
  const cmd = t.cmd || "";

  // ١) الناشر
  const owner = ghOwner(t.gh);
  if (owner && OFFICIAL[owner]) rows.push({ id: "pub", icon: "seal-check", label: w.publisher, value: w.official(OFFICIAL[owner]), note: w.officialNote, tone: "ok", href: "https://github.com/" + owner });
  else if (owner) rows.push({ id: "pub", icon: "user", label: w.publisher, value: "@" + owner, note: w.accountNote, tone: "info", href: "https://github.com/" + owner });
  else if (t.site) rows.push({ id: "pub", icon: "globe", label: w.publisher, value: host(t.site), note: w.siteNote, tone: "info", href: t.site });

  // ٢) أين تعمل
  const server = mcpServer(t);
  // خادم بعيد: مباشرة (http أو sse)، أو عبر الجسر mcp-remote الذي يعمل على الجهاز ويُثبَّت من npm
  const bridge = server?.transport === "stdio" && server.args.includes("mcp-remote") ? server.args.find((a: string) => /^https?:\/\//.test(a)) : undefined;
  const url = server && server.transport !== "stdio" ? server.url : bridge;
  const remoteHost = url ? host(url) : null;
  const localHttp = !!url && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(url).hostname);
  const isPlugin = /(^|\n)(\/plugin|claude plugins?) install /.test(cmd);
  let tip: string;
  if (server && !remoteHost) { rows.push({ id: "run", icon: "laptop", label: w.runs, value: w.local, note: w.localNote, tone: "info" }); tip = w.tipLocal; }
  else if (remoteHost && localHttp) { rows.push({ id: "run", icon: "laptop", label: w.runs, value: w.localApp, note: w.localAppNote, tone: "info" }); tip = w.tipLocal; }
  else if (remoteHost) { rows.push({ id: "run", icon: "cloud", label: w.runs, value: w.remote(remoteHost), note: bridge ? w.bridgeNote(remoteHost) : w.remoteNote(remoteHost), tone: "info" }); tip = w.tipRemote(remoteHost); }
  else if (isPlugin) { rows.push({ id: "run", icon: "puzzle-piece", label: w.runs, value: w.plugin, note: w.pluginNote, tone: "info" }); tip = w.tipPlugin; }
  else if (t.kind === "MCP") { rows.push({ id: "run", icon: "plug", label: w.runs, value: w.mcp, note: w.mcpNote, tone: "info" }); tip = w.tipLocal; }
  else if (t.kind === "Skill") { rows.push({ id: "run", icon: "sparkle", label: w.runs, value: w.skill, note: w.skillNote, tone: "info" }); tip = w.tipSkill; }
  else if (t.kind === "مكتبة") { rows.push({ id: "run", icon: "code", label: w.runs, value: w.library, note: w.libraryNote, tone: "info" }); tip = w.tipLibrary; }
  else if (t.kind === "تطبيق") { rows.push({ id: "run", icon: "app-window", label: w.runs, value: w.app, note: t.gh ? w.appNote : w.cliNote, tone: "info" }); tip = w.tipApp; }
  else if (t.kind === "أداة") { rows.push({ id: "run", icon: "terminal-window", label: w.runs, value: w.cli, note: w.cliNote, tone: "info" }); tip = w.tipLocal; }
  else if (t.kind === "منصة") { rows.push({ id: "run", icon: "cloud", label: w.runs, value: w.platform, note: w.platformNote, tone: "info" }); tip = w.tipWeb; }
  else if (t.kind === "صيغة") { rows.push({ id: "run", icon: "file-text", label: w.runs, value: w.format, note: w.formatNote, tone: "info" }); tip = w.tipLibrary; }
  else { rows.push({ id: "run", icon: "globe", label: w.runs, value: w.web, note: w.webNote, tone: "info" }); tip = w.tipWeb; }

  // ٣) من أين تُثبَّت
  if (cmd && RUNS_REMOTE_SCRIPT.test(cmd)) { rows.push({ id: "src", icon: "warning", label: w.source, value: w.script, note: w.scriptNote, tone: "warn" }); tip = w.tipScript; }
  else if (/@claude-plugins-official\b/.test(cmd)) rows.push({ id: "src", icon: "storefront", label: w.source, value: w.market, note: w.marketNote, tone: "ok" });
  else if (/(^|\n)(?:\/plugin|claude plugins?) marketplace add (\S+)/.test(cmd)) {
    const r = shortRepo(/(?:\/plugin|claude plugins?) marketplace add (\S+)/.exec(cmd)![1]);
    rows.push({ id: "src", icon: "storefront", label: w.source, value: w.marketRepo(r), note: w.marketRepoNote, tone: "info", href: "https://github.com/" + r });
  } else if (remoteHost && !localHttp && !bridge) rows.push({ id: "src", icon: "cloud", label: w.source, value: w.noInstall(remoteHost), note: w.noInstallNote, tone: "info" });
  else if (/^npx (?:-y )?(?:skills(?:@[\w.-]+)?|plugins) add (\S+)/.test(cmd)) {
    const r = shortRepo(/^npx (?:-y )?(?:skills(?:@[\w.-]+)?|plugins) add (\S+)/.exec(cmd)![1]);
    rows.push({ id: "src", icon: "github-logo", label: w.source, value: w.repo(r), note: w.repoNote, tone: "info", href: "https://github.com/" + r });
  } else {
    const p = cmd ? packageOf(cmd) : null;
    if (p) rows.push({ id: "src", icon: "package", label: w.source, value: w.pkg(p.reg, p.name), note: p.tap ? w.tapNote : w.pkgNote, tone: "info", href: p.href });
    else if (t.site && isAppStore(t.site)) rows.push({ id: "src", icon: "storefront", label: w.source, value: w.store, note: w.storeNote, tone: "ok", href: t.site });
  }
  return { rows, tip };
}
