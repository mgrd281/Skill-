// أوامر التثبيت: ما يدخل منها في «حزمة التثبيت» (سكربت واحد للطرفية)، وإعداد خوادم MCP لبرامج غير Claude Code.
// يعمل وقت البناء فقط: src/lib/data.ts وsrc/lib/search-index.ts وsrc/views/ToolPage.astro.

// أمر يحمّل سكربتًا من الإنترنت وينفّذه مباشرة (شارة التحذير في البطاقة)
export const RUNS_REMOTE_SCRIPT = /(curl|wget)[^\n]*\|\s*(ba|z)?sh|(ba|z)?sh\s+-c\s+"\$\((curl|wget)/i;
// قيمة يجب أن يكتبها الزائر بنفسه: <your-site>، /full/path/to/…، YOUR_KEY
export const PLACEHOLDER = /<[^>]+>|\/full\/path\/to\/|\bYOUR[_-]/i;

const lines = (cmd) => String(cmd || "").split("\n").map((s) => s.trim()).filter(Boolean);

// تقسيم سطر أوامر إلى كلمات كما تفعل الطرفية (مع علامات التنصيص). null إن بقي تنصيص مفتوح
export function shellWords(line) {
  const out = [];
  let cur = "", quote = null, has = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === "\\" && quote === '"' && i + 1 < line.length) cur += line[++i];
      else cur += ch;
    } else if (ch === '"' || ch === "'") { quote = ch; has = true; }
    else if (ch === "\\" && i + 1 < line.length) { cur += line[++i]; has = true; }
    else if (/\s/.test(ch)) { if (has) { out.push(cur); cur = ""; has = false; } }
    else { cur += ch; has = true; }
  }
  if (quote) return null;
  if (has) out.push(cur);
  return out;
}

// ---- خادم MCP من أمر Claude Code ----
// يفهم: claude mcp add [--transport http|sse|stdio] [--env K=V] [--header "K: V"] [--scope s] <name> [--] <command|url> [args…]
// الأوامر متعددة الأسطر لا تُفهم: قبلها خطوة تثبيت لا تنقلها الإعدادات.
// يرجع { name, transport, command, args, env, url, headers, needsEdit } أو null.
export function mcpServer(tool) {
  const ls = lines(tool.cmd);
  if (ls.length !== 1) return null;
  const w = shellWords(ls[0]);
  if (!w) return null;
  const needsEdit = PLACEHOLDER.test(ls[0]);
  if (w[0] !== "claude" || w[1] !== "mcp" || w[2] !== "add") return null;
  let transport = "stdio";
  const env = {}, headers = {}, pos = [];
  for (let i = 3; i < w.length; i++) {
    const a = w[i];
    if (a === "--") { pos.push(...w.slice(i + 1)); break; }
    const m = /^(--[a-z][a-z-]*|-[a-zA-Z])(?:=(.*))?$/.exec(a);
    if (!m) { pos.push(a); continue; }
    const val = m[2] ?? w[++i];
    if (val === undefined) return null;
    if (m[1] === "--transport" || m[1] === "-t") transport = val;
    else if (m[1] === "--env" || m[1] === "-e") {
      const k = val.indexOf("=");
      if (k < 1) return null;
      env[val.slice(0, k)] = val.slice(k + 1);
    } else if (m[1] === "--header" || m[1] === "-H") {
      const k = val.indexOf(":");
      if (k < 1) return null;
      headers[val.slice(0, k).trim()] = val.slice(k + 1).trim();
    } else if (m[1] !== "--scope" && m[1] !== "-s") return null;
  }
  const [name, target, ...args] = pos;
  if (!name || !target) return null;
  if (transport === "http" || transport === "sse") {
    if (args.length || !/^https?:\/\//.test(target)) return null;
    return { name, transport, url: target, env, headers, needsEdit };
  }
  if (transport !== "stdio") return null;
  return { name, transport, command: target, args, env, headers, needsEdit };
}

const b64 = (s) => (typeof Buffer !== "undefined" ? Buffer.from(s, "utf8").toString("base64") : btoa(s));
const json = (o) => JSON.stringify(o, null, 2);
const nonEmpty = (o) => Object.keys(o).length > 0;

// إعداد الخادم لكل برنامج، وروابط التثبيت بنقرة:
// Cursor: cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=<JSON بترميز base64> (ملف ~/.cursor/mcp.json)
// VS Code: vscode:mcp/install?<JSON بترميز URL> فيه name (ملف .vscode/mcp.json وفيه "servers")
// Claude Desktop: claude_desktop_config.json. الخادم البعيد يُضاف من الإعدادات كموصل (Connector)، أو عبر الجسر mcp-remote.
export function mcpClients(s) {
  const remote = s.transport !== "stdio";
  const cursor = remote
    ? { url: s.url, ...(nonEmpty(s.headers) ? { headers: s.headers } : {}) }
    : { command: s.command, args: s.args, ...(nonEmpty(s.env) ? { env: s.env } : {}) };
  const vscode = { type: s.transport, ...cursor };
  const desktop = remote
    ? (nonEmpty(s.headers) ? null : { command: "npx", args: ["-y", "mcp-remote", s.url] })
    : cursor;
  return {
    remote,
    url: s.url || null,
    cursorLink: `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(s.name)}&config=${encodeURIComponent(b64(JSON.stringify(cursor)))}`,
    vscodeLink: `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: s.name, ...vscode }))}`,
    cursorJson: json({ mcpServers: { [s.name]: cursor } }),
    vscodeJson: json({ servers: { [s.name]: vscode } }),
    desktopJson: desktop ? json({ mcpServers: { [s.name]: desktop } }) : null,
  };
}

// ---- حزمة التثبيت ----
// تدخل الحزمة أوامر تثبيت إضافات Claude Code والأدوات العامة على الجهاز فقط: تعمل من أي مجلد، ولا تحتاج قيمًا خاصة بك،
// ولا تُشغّل خادمًا يبقى مفتوحًا. /plugin تتحول إلى claude plugin لأن أوامر الشرطة المائلة لا تعمل إلا داخل جلسة Claude Code.
const SAFE = [
  /^claude mcp add /,
  /^claude plugins? (?:marketplace add|install) /,
  /^npx (?:-y )?skills(?:@[\w.-]+)? add /,
  /^npx (?:-y )?plugins add /,
  /^npm (?:i|install) (?:-g|--global) /,
  /^brew install /,
];
// أمر ثانٍ لأداة ثبّتها السطر السابق (agent-browser install، playwright-cli install --skills)
const FOLLOW_UP = /^[\w@./-]+ (?:install|setup|install-skill)\b/;

// يرجع { lines, after } (after: أوامر تُكتب داخل Claude Code بعد التثبيت، مثل /seo setup)،
// أو { why } لما لا يدخل: none بلا أمر، script سكربت من الإنترنت، values يحتاج قيمك، manual يُثبَّت بطريقته (مكتبة داخل مشروع وغيرها).
export function kitPlan(tool) {
  if (!tool.cmd) return { why: "none" };
  if (RUNS_REMOTE_SCRIPT.test(tool.cmd)) return { why: "script" };
  if (PLACEHOLDER.test(tool.cmd)) return { why: "values" };
  const out = [], after = [];
  let prevInstall = false;
  for (const raw of lines(tool.cmd)) {
    const line = raw.replace(/^\/plugin /, "claude plugin ");
    if (line === "/reload-plugins") continue;
    if (line.startsWith("/")) { after.push(line); continue; }
    if (after.length) return { why: "manual" };
    if (SAFE.some((re) => re.test(line))) {
      out.push(line);
      prevInstall = /^(npm|brew) /.test(line);
      continue;
    }
    if (prevInstall && FOLLOW_UP.test(line)) { out.push(line); continue; }
    return { why: "manual" };
  }
  return out.length ? { lines: out, after } : { why: "manual" };
}
