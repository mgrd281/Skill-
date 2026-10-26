// يصنع مواد التسويق بالعربية والألمانية والإنجليزية: فيديو عمودي 9:16 (Reels وTikTok وShorts)، وصور منشورات 1:1 و4:5، وصورة غلاف 3:1،
// وفيديو قصيرًا لأي أداة (منشور «أداة اليوم»).
// الأرقام من data/ فتتجدد كلما شغّلته، والألوان والخطوط والشعار والشخصية من الموقع نفسه (لا ظلال ولا تدرج إلا في عبارة العنوان).
// الاستخدام (بعد npm run build لأن الشخصية تُقرأ من dist):  npm run marketing   أو  node scripts/make-marketing.cjs [ar|de|en] [video|posts|banner]
//   فيديو أداة:  node scripts/make-marketing.cjs tool <slug…> [--lang ar|de|en]   أو  tool --latest 5  (أحدث خمس أدوات)
// المخرجات في marketing/ (خارج git): marketing/<اللغة>/video-9x16.mp4 وpost-1x1-*.png وpost-4x5-*.png وbanner-3x1.png،
// وmarketing/tools/<slug>-<اللغة>.mp4 و.png لفيديوهات الأدوات.
// التعليق الصوتي: marketing/audio/<اللغة>.mp3 ومعه <اللغة>.json فيه العدد المنطوق {"count": 331}. إن زاد الدليل بعد التسجيل
// يظهر العدد المنطوق مع «+» (صحيح دائمًا)، حتى تسجّل تعليقًا جديدًا.
// يحتاج ffmpeg وplaywright. الإطارات تُرسم بزمن محدد لكل إطار (seek)، فالناتج ثابت في كل تشغيل.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const OUT = path.join(root, "marketing");
const SITE = process.env.SITE_HOST || "xskills-nu.vercel.app"; // العنوان الظاهر في الصور؛ غيّره بعد شراء نطاق
const FPS = 30;

// ---------- البيانات ----------
const tools = require("../data/tools.json");
const cats = require("../data/categories.json");
const stars = (s) => (!s ? 0 : /k$/i.test(s) ? parseFloat(s) * 1000 : Number(s));
const appCats = cats.filter((c) => c.group === "apps").map((c) => c.id);
const inCat = (id) => tools.filter((t) => t.cat === id).sort((a, b) => stars(b.stars) - stars(a.stars));
const D = {
  total: tools.length,
  cats: cats.length,
  apps: tools.filter((t) => appCats.includes(t.cat)).length,
  kinds: { skill: tools.filter((t) => t.kind === "Skill").length, mcp: tools.filter((t) => t.kind === "MCP").length, lib: tools.filter((t) => t.kind === "مكتبة").length, site: tools.filter((t) => t.kind === "موقع").length },
  sys: { macapps: "laptop", winapps: "windows-logo", iosapps: "device-mobile-camera", androidapps: "android-logo", linuxapps: "linux-logo", crossapps: "devices" },
  demo: tools.find((t) => t.slug === "frontend-design"),
};
D.kinds.apps = D.apps;

// ---------- النصوص ----------
const TXT = {
  ar: {
    dir: "rtl", t1: "أدوات تساعدك في عملك،", t2: "كل يوم.", sub: "مهارات Claude وخوادم MCP ومكتبات وتطبيقات جاهزة، مختارة بعناية.",
    count: "أداة ومهارة وتطبيق", sub2: "مرتبة بنجوم GitHub، ومعها أمر التثبيت لكل واحدة.",
    kinds: [["skill", "مهارات"], ["mcp", "خوادم MCP"], ["lib", "مكتبات"], ["site", "مواقع"], ["apps", "تطبيقات جاهزة"]],
    inst: "أمر واحد، وتثبّت الأداة", inst2: "انسخه والصقه، وجاهز.", copied: "نُسخ", stars: "نجمة",
    apps: "تطبيقات جاهزة", apps2: "مفتوحة المصدر لـ Mac وWindows وiPhone وAndroid وLinux.", n: (n) => (n <= 10 ? `${n} تطبيقات` : `${n} تطبيقًا`),
    sysNames: { macapps: "Mac", winapps: "Windows", iosapps: "iPhone وiPad", androidapps: "Android", linuxapps: "Linux", crossapps: "كل الأنظمة" },
    cta: "تصفّح الدليل", free: "بلا حساب ولا اشتراك",
    tInst: "التثبيت بأمر واحد", tDl: "التنزيل من الموقع الرسمي", tCta: "التفاصيل والأمان في Skillpro",
  },
  de: {
    dir: "ltr", t1: "Tools, die dir bei der Arbeit helfen.", t2: "Jeden Tag.", sub: "Claude-Skills, MCP-Server, Bibliotheken und fertige Apps – sorgfältig ausgewählt.",
    count: "Tools, Skills und Apps", sub2: "Nach GitHub-Sternen sortiert, jeweils mit Installationsbefehl.",
    kinds: [["skill", "Skills"], ["mcp", "MCP-Server"], ["lib", "Bibliotheken"], ["site", "Websites"], ["apps", "Fertige Apps"]],
    inst: "Ein Befehl – und das Tool ist da", inst2: "Kopieren, einfügen, fertig.", copied: "Kopiert", stars: "Sterne",
    apps: "Fertige Apps", apps2: "Open Source für Mac, Windows, iPhone, Android und Linux.", n: (n) => `${n} Apps`,
    sysNames: { macapps: "Mac", winapps: "Windows", iosapps: "iPhone & iPad", androidapps: "Android", linuxapps: "Linux", crossapps: "Alle Systeme" },
    cta: "Jetzt entdecken", free: "Ohne Konto, ohne Abo",
    tInst: "Installiert mit einem Befehl", tDl: "Download von der offiziellen Website", tCta: "Details und Sicherheit auf Skillpro",
  },
  en: {
    dir: "ltr", t1: "Tools that help you at work.", t2: "Every day.", sub: "Claude skills, MCP servers, libraries and ready-made apps, carefully picked.",
    count: "tools, skills and apps", sub2: "Sorted by GitHub stars, each with its install command.",
    kinds: [["skill", "Skills"], ["mcp", "MCP servers"], ["lib", "Libraries"], ["site", "Websites"], ["apps", "Ready-made apps"]],
    inst: "One command, and it's installed", inst2: "Copy, paste, done.", copied: "Copied", stars: "stars",
    apps: "Ready-made apps", apps2: "Open source for Mac, Windows, iPhone, Android and Linux.", n: (n) => `${n} apps`,
    sysNames: { macapps: "Mac", winapps: "Windows", iosapps: "iPhone & iPad", androidapps: "Android", linuxapps: "Linux", crossapps: "All systems" },
    cta: "Explore the directory", free: "No account, no subscription",
    tInst: "Installed with one command", tDl: "Download from the official site", tCta: "Details and safety on Skillpro",
  },
};

// ---------- الأصول ----------
const font = (pkg, name) => "data:font/woff2;base64," + fs.readFileSync(path.join(root, "node_modules/@fontsource", pkg, "files", name)).toString("base64");
const FONTS = ["400", "600", "700"].map((w) => ["arabic", "latin"].map((s) => `@font-face{font-family:P;font-weight:${w};src:url(${font("ibm-plex-sans-arabic", `ibm-plex-sans-arabic-${s}-${w}-normal.woff2`)});unicode-range:${s === "arabic" ? "U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F" : "U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC"}}`).join("")).join("") +
  `@font-face{font-family:M;font-weight:500;src:url(${font("ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff2")})}`;
const icon = (name) => {
  const s = fs.readFileSync(path.join(root, "node_modules/@phosphor-icons/core/assets/duotone", `${name}-duotone.svg`), "utf8");
  return s.replace("<svg ", '<svg fill="currentColor" ');
};
function mascotSvg() {
  const f = path.join(root, "dist/index.html");
  if (!fs.existsSync(f)) throw new Error("شغّل npm run build أولًا: الشخصية تُقرأ من dist/index.html");
  const m = /<svg class="m-svg"[\s\S]*?<\/svg>/.exec(fs.readFileSync(f, "utf8"));
  if (!m) throw new Error("لم أجد الشخصية في dist/index.html");
  return m[0];
}

// ---------- الصفحة ----------
// كل المشاهد على لوحة عرضها 1080 وارتفاعها H، ومحتواها يتوسط عموديًا، فنفس المشاهد تصلح للفيديو 1080×1920 والصور 1080×1080 و1080×1350
// توقيت المشاهد لكل لغة: بداية كل مشهد مع جملته في التعليق الصوتي (قيست من الصوت)، والفيديو أطول من الصوت قليلًا
const TIMING = {
  ar: [["hero", 0, 3.0], ["count", 3.0, 9.8], ["install", 9.8, 13.1], ["apps", 13.1, 17.4], ["cta", 17.4, 21.6]],
  de: [["hero", 0, 4.0], ["count", 4.0, 9.6], ["install", 9.6, 13.1], ["apps", 13.1, 16.6], ["cta", 16.6, 20.8]],
  en: [["hero", 0, 3.6], ["count", 3.6, 8.6], ["install", 8.6, 12.1], ["apps", 12.1, 15.8], ["cta", 15.8, 19.6]],
};
// فيديو الأداة: البطاقة، ثم أمر التثبيت (أو التنزيل)، ثم الدعوة
const TOOL_TIMING = [["tcard", 0, 4.4], ["tinstall", 4.4, 7.8], ["tcta", 7.8, 10.6]];
// العدد في مشهد «العدد»: الحقيقي، أو المنطوق مع + إن كان التعليق الصوتي أقدم من البيانات
const spoken = (lang) => {
  const f = path.join(OUT, "audio", lang + ".json");
  return fs.existsSync(path.join(OUT, "audio", lang + ".mp3")) && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).count : null;
};

function html(lang, mascot, logo) {
  const T = TXT[lang], SCENES = TIMING[lang];
  const sysTiles = Object.entries(D.sys).map(([id, ic], i) => {
    const top = inCat(id).slice(0, 3).map((x) => x.name).join(" · ");
    return `<div class="tile" data-d="${0.5 + i * 0.22}"><span class="ti">${icon(ic)}</span><b>${T.sysNames[id]}</b><small>${T.n(inCat(id).length)}</small><span class="tn">${top}</span></div>`;
  }).join("");
  const said = spoken(lang), plus = said && said < D.total;
  const chips = T.kinds.map(([k, label], i) => `<span class="chip" data-d="${1.4 + i * 0.18}"><b data-count="${D.kinds[k]}">0</b>${label}</span>`).join("");
  return `<!doctype html><html lang="${lang}" dir="${T.dir}"><meta charset="utf-8"><style>
${FONTS}
:root{--bg:#F5F5F7;--card:#fff;--ink:#1D1D1F;--ink2:#424245;--muted:#6E6E73;--blue:#2446D6;--gold:#FFC94D;--fill:#EEEEF0;--line:#E2E2E7}
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:var(--H);overflow:hidden;background:var(--bg);font-family:P,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
#stage{position:relative;width:1080px;height:var(--H)}
.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:70px 80px;text-align:center;opacity:0}
.rv{opacity:0}
h1{font-size:92px;line-height:1.14;font-weight:700;max-width:900px}
h1 span{background:linear-gradient(90deg,#7A4DFF,#2446D6 60%);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.12em;display:inline-block}
h2{font-size:84px;line-height:1.15;font-weight:700}
.sub{font-size:40px;line-height:1.5;color:var(--muted);max-width:880px}
.brand{display:flex;align-items:center;gap:22px;font-size:60px;font-weight:700}
.brand svg{width:96px;height:96px}
.mascot{width:400px}.mascot svg{width:100%;height:auto;display:block;overflow:visible}
html[dir=rtl] .m-svg{transform:scaleX(-1)}
.m-leg{transform-box:fill-box;transform-origin:50% 6%}.m-arm{transform-box:fill-box;transform-origin:12% 80%}.m-eyes{transform-box:fill-box;transform-origin:50% 50%}.m-spark{transform-box:fill-box;transform-origin:center}
.big{font-size:300px;line-height:1;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.03em;direction:ltr}
.lab{font-size:54px;font-weight:600;color:var(--ink2)}
.chips{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;max-width:920px}
.chip{display:inline-flex;align-items:center;gap:12px;background:var(--card);border-radius:999px;padding:16px 30px;font-size:34px;color:var(--ink2)}
.chip b{font-size:34px;color:var(--blue);direction:ltr;font-variant-numeric:tabular-nums}
.term{width:920px;background:var(--ink);color:#F5F5F7;border-radius:36px;padding:44px 48px;text-align:start;direction:ltr}
.term .hd{display:flex;align-items:center;gap:16px;font-size:34px;margin-bottom:28px;color:#D2D2D7}
.term .hd b{color:#fff;font-weight:700;font-size:40px}
.term .st{margin-inline-start:auto;color:var(--gold);font-weight:600}
.term .st i{font-style:normal;color:var(--gold)}
.cmd{font-family:M,monospace;font-weight:500;font-size:36px;line-height:1.55;min-height:112px}
.cmd .p{color:#6E8BFF}.nw{white-space:nowrap}.cur{display:inline-block;width:.55em;height:1.05em;background:#F5F5F7;vertical-align:-.15em;margin-inline-start:2px}
.ok{display:inline-flex;align-items:center;gap:12px;background:var(--card);color:var(--blue);border-radius:999px;padding:14px 30px;font-size:34px;font-weight:600}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:20px;width:920px}
.tile{background:var(--card);border-radius:40px;padding:28px 30px 26px;display:flex;flex-direction:column;align-items:flex-start;text-align:start;gap:2px;min-height:var(--th,250px)}
.ti{width:80px;height:80px;border-radius:22px;background:var(--fill);display:grid;place-items:center;margin-bottom:12px}.ti svg{width:50px;height:50px}
.tile b{font-size:40px;font-weight:700}.tile small{font-size:28px;color:var(--muted)}.tn{margin-top:auto;padding-top:10px;font-size:24px;color:var(--ink2);direction:ltr;text-align:start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
/* ست بلاطات في الصور المربعة والعمودية القصيرة: أصغر حتى تتسع اللوحة */
@media (max-height:1400px){.scene{gap:24px;padding:50px 80px}.tile{--th:0px;padding:20px 26px 18px}.ti{width:60px;height:60px;border-radius:18px;margin-bottom:6px}.ti svg{width:38px;height:38px}.tile b{font-size:34px}.tile small{font-size:24px}.tn{font-size:21px;padding-top:6px}}
@media (max-height:1100px){.s-apps-sub{display:none}}
/* فيديو الأداة */
.tcard{width:920px;background:var(--card);border-radius:48px;padding:56px 56px 50px;display:flex;flex-direction:column;gap:26px;text-align:start}
.thd{display:flex;align-items:center;gap:30px}
.tic{width:170px;height:170px;flex:none;border-radius:44px;background:var(--fill);display:grid;place-items:center;font-size:64px;font-weight:700;direction:ltr;overflow:hidden}
.tic.img{background:#fff;border:2px solid var(--line)}.tic img{width:80%;height:80%;object-fit:contain}
.tname{font-size:74px;font-weight:700;line-height:1.1;direction:ltr;text-align:start}
.tmeta{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px}
.tmeta span{background:var(--fill);border-radius:999px;padding:8px 22px;font-size:30px;color:var(--ink2)}
.tmeta .st{color:#9A6A00;background:#FFF4D6}
.tdesc{font-size:42px;line-height:1.5;color:var(--ink2)}
.url{display:inline-flex;align-items:center;background:var(--ink);color:#fff;border-radius:999px;padding:26px 54px;font-size:46px;font-weight:600;direction:ltr}
.cta h2{font-size:100px}
.free{font-size:36px;color:var(--muted)}
/* صورة الغلاف 3:1 */
body.banner #stage{width:1500px;height:500px}body.banner,html.banner{width:1500px;height:500px}
.bn{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:90px;padding:40px 110px}
.bn .mascot{width:330px;flex:none}.bn .tx{display:flex;flex-direction:column;gap:16px;align-items:flex-start;text-align:start}
.bn h1{font-size:66px;max-width:780px}.bn .sub{font-size:30px;max-width:780px}.bn .url{font-size:30px;padding:14px 34px;margin-top:6px}
</style><body>
<div id="stage">
  <section class="scene" id="s-hero"><div class="mascot rv" id="m1" data-d="0">${mascot}</div><div class="brand rv" data-d="0.9">${logo}<span>Skillpro</span></div><h1 class="rv" data-d="1.3">${T.t1} <span>${T.t2}</span></h1><p class="sub rv" data-d="1.9">${T.sub}</p></section>
  <section class="scene" id="s-count"><div class="big rv" data-d="0.1"><span data-count="${plus ? said : D.total}">0</span>${plus ? "+" : ""}</div><div class="lab rv" data-d="0.4">${T.count}</div><p class="sub rv" data-d="0.8">${T.sub2}</p><div class="chips">${chips}</div></section>
  <section class="scene" id="s-install"><h2 class="rv" data-d="0">${T.inst}</h2><p class="sub rv" data-d="0.3">${T.inst2}</p>
    <div class="term rv" data-d="0.6"><div class="hd"><b>${D.demo.name}</b><span>★ ${D.demo.stars}</span><span class="st" id="cp" style="opacity:0">✓ ${T.copied}</span></div><div class="cmd"><span class="p">$ </span><span id="ty"></span><span class="cur" id="cur"></span></div></div></section>
  <section class="scene" id="s-apps"><h2 class="rv" data-d="0">${T.apps}</h2><p class="sub rv s-apps-sub" data-d="0.25">${T.apps2}</p><div class="tiles">${sysTiles}</div></section>
  <section class="scene cta" id="s-cta"><div class="mascot rv" id="m2" data-d="0" style="width:300px">${mascot}</div><div class="brand rv" data-d="0.5">${logo}<span>Skillpro</span></div><h2 class="rv" data-d="0.8">${T.cta}</h2><div class="url rv" data-d="1.1">${SITE}</div><p class="free rv" data-d="1.5">${T.free}</p></section>
</div>
<script>
const SCENES=${JSON.stringify(SCENES)}, CMD=${JSON.stringify(D.demo.cmd)}, RTL=${T.dir === "rtl"};
const ease=(x)=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3), clamp=(x)=>Math.min(1,Math.max(0,x));
function reveal(el,u){const k=ease(u/0.6);el.style.opacity=k;el.style.transform="translateY("+(1-k)*46+"px)"}
function mascot(root,u,walk){
  const f=RTL?-1:1, k=ease(walk?u/1.5:1), x=walk?(1-k)*-f*820:0, stepping=walk&&u<1.5;
  root.style.opacity=clamp(u/0.2);root.style.transform="translateX("+x+"px)";
  const set=(sel,fn)=>root.querySelectorAll(sel).forEach(fn);
  const sw=stepping?Math.sin(u*14)*17:0;
  set(".m-leg-f",e=>e.style.rotate=sw+"deg");set(".m-leg-b",e=>e.style.rotate=-sw+"deg");
  set(".m-bob",e=>e.style.translate="0 "+(stepping?-Math.abs(Math.sin(u*14))*5:0)+"px");
  const w=u-1.5;set(".m-arm",e=>e.style.rotate=(w>0&&w<1.3?Math.sin(w*Math.PI*3)*-34*Math.sin(Math.min(1,w/1.3)*Math.PI):0)+"deg");
  const b=u-2.2;set(".m-eyes",e=>e.style.scale="1 "+(b>0&&b<0.22?1-Math.sin(b/0.22*Math.PI)*0.92:1));
  set(".m-spark",e=>{const s=clamp((u-1.1)/0.9);e.style.opacity=s;e.style.transform="rotate("+(1-ease(s))*-160+"deg) scale("+(0.2+0.8*ease(s))+")"});
}
window.seek=function(t,still){
  for(const [id,t0,t1] of SCENES){
    const el=document.getElementById("s-"+id), dur=t1-t0, u=t-t0;
    const vis=u>=0&&u<dur||(still&&u>=0&&id===still);
    el.style.display=vis?"flex":"none"; if(!vis) continue;
    const last=id.endsWith("cta");
    el.style.opacity=still?1:Math.min(1,clamp(u/0.35),last?1:clamp((dur-u)/0.35));
    el.querySelectorAll(".rv").forEach(r=>{const d=+r.dataset.d||0;
      if(r.classList.contains("mascot")){mascot(r,u-d,id==="hero");return}
      reveal(r,u-d)});
    el.querySelectorAll("[data-count]").forEach(c=>{const d=+(c.dataset.d||c.closest("[data-d]")?.dataset.d||0), n=+c.dataset.count;c.textContent=Math.round(n*ease((u-d-0.1)/1.4))});
    if(id.endsWith("install")&&document.getElementById("ty")){
      const k=clamp((u-0.9)/1.6), n=Math.round(CMD.length*k);
      document.getElementById("ty").innerHTML=CMD.slice(0,n).split(" ").map(w=>"<span class='nw'>"+w+"</span>").join(" ");
      document.getElementById("cur").style.opacity=(k<1||Math.floor(u*2)%2===0)?1:0;
      document.getElementById("cp").style.opacity=ease((u-2.7)/0.3);
    }
  }
};
</script></body></html>`;
}

function bannerHtml(lang, mascot, logo) {
  const T = TXT[lang];
  return html(lang, mascot, logo).replace('<body>', '<body class="banner">').replace(/<div id="stage">[\s\S]*<\/div>\n<script>/, `<div id="stage"><div class="bn"><div class="mascot" id="m1">${mascot}</div><div class="tx"><div class="brand">${logo}<span>Skillpro</span></div><h1>${T.t1} <span>${T.t2}</span></h1><p class="sub">${T.sub}</p><div class="url">${SITE}</div></div></div></div>\n<script>window.seek=()=>{};`);
}

// ---------- فيديو أداة ----------
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const appIcons = JSON.parse(fs.readFileSync(path.join(root, "data/app-icons.json"), "utf8"));
const initials = (n) => n.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || n.slice(0, 2);
function toolHtml(lang, t, mascot, logo) {
  const T = TXT[lang];
  const desc = lang === "ar" ? t.desc : t["desc_" + lang];
  const cat = cats.find((c) => c.id === t.cat);
  const catName = lang === "ar" ? cat.name : cat["name_" + lang];
  const ic = appIcons[t.slug]
    ? `<span class="tic img"><img src="data:image/png;base64,${fs.readFileSync(path.join(root, "public", appIcons[t.slug].file)).toString("base64")}" alt=""></span>`
    : `<span class="tic">${esc(initials(t.name))}</span>`;
  const cmd = (t.cmd || "").split("\n")[0];
  const license = t.license && !["none", "other"].includes(t.license) ? `<span>${esc(t.license)}</span>` : "";
  const site = t.site || (t.gh ? t.gh + "/releases" : "");
  const install = cmd
    ? `<div class="term rv" data-d="0.4"><div class="hd"><b>${esc(t.name)}</b>${t.stars ? `<span>★ ${esc(t.stars)}</span>` : ""}<span class="st" id="cp" style="opacity:0">✓ ${T.copied}</span></div><div class="cmd"><span class="p">$ </span><span id="ty"></span><span class="cur" id="cur"></span></div></div>`
    : `<div class="url rv" data-d="0.5">${esc(site.replace(/^https:\/\//, "").replace(/\/$/, ""))}</div>`;
  const stage = `<div id="stage">
  <section class="scene" id="s-tcard"><div class="brand rv" data-d="0">${logo}<span>Skillpro</span></div><div class="tcard rv" data-d="0.35"><div class="thd">${ic}<div><div class="tname">${esc(t.name)}</div><div class="tmeta"><span>${esc(catName)}</span>${t.stars ? `<span class="st">★ ${esc(t.stars)}</span>` : ""}${license}</div></div></div><p class="tdesc">${esc(desc)}</p></div></section>
  <section class="scene" id="s-tinstall"><h2 class="rv" data-d="0">${cmd ? T.tInst : T.tDl}</h2>${install}</section>
  <section class="scene cta" id="s-tcta"><div class="mascot rv" id="m2" data-d="0" style="width:300px">${mascot}</div><h2 class="rv" data-d="0.5">${T.tCta}</h2><div class="url rv" data-d="0.9">${SITE}/tools/${t.slug}</div></section>
</div>`;
  const base = html(lang, mascot, logo);
  const from = `const SCENES=${JSON.stringify(TIMING[lang])}, CMD=${JSON.stringify(D.demo.cmd)},`;
  if (!base.includes(from)) throw new Error("قالب الفيديو تغيّر: حدّث toolHtml");
  return base.replace(/<div id="stage">[\s\S]*<\/div>\n<script>/, () => stage + "\n<script>").replace(from, `const SCENES=${JSON.stringify(TOOL_TIMING)}, CMD=${JSON.stringify(cmd)},`);
}

// ---------- التشغيل ----------
// يرسم مشاهد صفحة مفتوحة إطارًا إطارًا ثم يجمعها ffmpeg في فيديو (مع الصوت إن أُعطي)
async function render(p, scenes, out, voice) {
  const frames = out + ".frames";
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const DURATION = scenes[scenes.length - 1][2], n = Math.round(DURATION * FPS);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.seek(t), i / FPS);
    await p.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 95 });
  }
  // التعليق الصوتي يبدأ بعد 0.2 ثانية ويُمدَّد بصمت إلى آخر الفيديو
  const audio = voice && fs.existsSync(voice) ? ["-i", voice, "-af", `adelay=200|200,apad=whole_dur=${DURATION}`, "-c:a", "aac", "-b:a", "160k", "-t", String(DURATION)] : [];
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.jpg"), ...audio, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-movflags", "+faststart", out]);
  fs.rmSync(frames, { recursive: true, force: true });
  return n;
}

async function main() {
  const argv = process.argv.slice(2);
  const logo = (await import(path.join(root, "src/lib/brand.js"))).markSvg({ size: 96 });
  const mascot = mascotSvg();
  const br = await chromium.launch();
  const open = async (h, W, H) => {
    const p = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await p.setContent(h.replace("<style>", `<style>:root{--H:${H}px}`));
    await p.evaluate(() => document.fonts.ready);
    return p;
  };
  if (argv[0] === "tool") {
    const li = argv.indexOf("--lang"), ni = argv.indexOf("--latest");
    const langs = li > 0 && TXT[argv[li + 1]] ? [argv[li + 1]] : Object.keys(TXT);
    const slugs = ni > 0 ? [...tools].sort((a, b) => (b.added || "").localeCompare(a.added || "")).slice(0, +argv[ni + 1] || 5).map((t) => t.slug)
      : argv.slice(1).filter((a, i, all) => !a.startsWith("--") && all[i] !== argv[li + 1]);
    if (!slugs.length) throw new Error("اكتب اسم أداة واحدة على الأقل: tool frontend-design، أو tool --latest 5");
    const dir = path.join(OUT, "tools");
    fs.mkdirSync(dir, { recursive: true });
    for (const slug of slugs) {
      const t = tools.find((x) => x.slug === slug);
      if (!t) throw new Error("لا أداة بهذا الاسم: " + slug);
      for (const lang of langs) {
        const h = toolHtml(lang, t, mascot, logo);
        const still = await open(h, 1080, 1350);
        await still.evaluate(() => window.seek(4.3, "tcard"));
        await still.screenshot({ path: path.join(dir, `${slug}-${lang}.png`) });
        await still.close();
        const p = await open(h, 1080, 1920);
        const n = await render(p, TOOL_TIMING, path.join(dir, `${slug}-${lang}.mp4`));
        await p.close();
        console.log(slug, lang, "✓", n, "frames");
      }
    }
    await br.close();
    return;
  }
  const [langArg, partArg] = argv;
  const langs = langArg && TXT[langArg] ? [langArg] : Object.keys(TXT);
  const parts = partArg ? [partArg] : ["posts", "banner", "video"];
  for (const lang of langs) {
    const dir = path.join(OUT, lang);
    fs.mkdirSync(dir, { recursive: true });
    if (parts.includes("posts")) {
      for (const [ratio, H] of [["1x1", 1080], ["4x5", 1350]]) {
        const p = await open(html(lang, mascot, logo), 1080, H);
        let i = 0;
        for (const [id, , t1] of TIMING[lang].slice(0, 4)) {
          // لقطة مشهد في آخر لحظاته: كل عناصره ظاهرة ولا يبدأ تلاشيه
          await p.evaluate(([t, s]) => window.seek(t, s), [t1 - 0.05, id]);
          await p.screenshot({ path: path.join(dir, `post-${ratio}-${++i}-${id}.png`) });
        }
        await p.close();
      }
      console.log(lang, "posts ✓");
    }
    if (parts.includes("banner")) {
      const p = await open(bannerHtml(lang, mascot, logo), 1500, 500);
      await p.screenshot({ path: path.join(dir, "banner-3x1.png") });
      await p.close();
      console.log(lang, "banner ✓");
    }
    if (parts.includes("video")) {
      const p = await open(html(lang, mascot, logo), 1080, 1920);
      const n = await render(p, TIMING[lang], path.join(dir, "video-9x16.mp4"), path.join(OUT, "audio", lang + ".mp3"));
      await p.close();
      console.log(lang, "video ✓", n, "frames");
    }
  }
  await br.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
