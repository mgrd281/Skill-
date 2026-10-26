// البحث السريع (src/components/QuickSearch.astro): نافذة <dialog> بحقل بحث وقائمة نتائج (combobox + listbox).
// التركيز يبقى في الحقل، والأسهم تنقل الاختيار، وEnter يفتح المختار، وEscape يغلق ويعيد التركيز إلى الزر.
import { L, fmt } from "../i18n/client.js";
import { terms, score, makeDoc, suggest } from "../lib/search.js";
import { loadIndex, docOf, vocabOf, HOME } from "./search-data.js";

const dlg = document.getElementById("qs");
const opener = document.getElementById("qs-open");

if (dlg && opener) {
  const input = document.getElementById("qs-q"), list = document.getElementById("qs-list"), status = document.getElementById("qs-status");
  const empty = document.getElementById("qs-empty"), emptyT = document.getElementById("qs-empty-t"), sugBtn = document.getElementById("qs-sug");
  const all = document.getElementById("qs-all"), allT = document.getElementById("qs-all-t");
  const icons = document.getElementById("qs-icons").content;
  let ix = null, docs = null, catDocs = null, projDocs = null, vocab = null, catName = {};
  let opts = [], active = -1, back = null, timer = 0, shown = null;

  const toolUrl = (s) => HOME + "tools/" + s;
  const initials = (name) => {
    const words = name.split(/[\s\-_/.]+/).filter((w) => /[A-Za-z0-9]/.test(w));
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    const w = (words[0] || name).replace(/[^A-Za-z0-9]/g, "");
    return (w[0] || "?").toUpperCase() + (w[1] || "").toLowerCase();
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function option(href, lead, title, sub, extra) {
    const li = el("li", "qs-o");
    li.setAttribute("role", "option");
    li.id = "qs-o-" + opts.length;
    li.setAttribute("aria-selected", "false");
    li.dataset.href = href;
    const t = el("span", "qs-t");
    const b = el("b", null, title);
    b.dir = "auto";
    t.append(b, el("small", null, sub));
    li.append(lead, t);
    if (extra) li.append(extra);
    opts.push(li);
    return li;
  }
  function group(label) {
    const li = el("li", "qs-g", label);
    li.setAttribute("role", "presentation");
    return li;
  }
  function toolOption(x) {
    const mono = el("span", "mono sm", initials(x.n));
    mono.setAttribute("aria-hidden", "true");
    let stars = null;
    if (x.st) {
      stars = el("span", "stars");
      stars.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-star-fill"></use></svg>';
      stars.append(x.st);
    }
    return option(toolUrl(x.s), mono, x.n, [catName[x.c], x.k].filter(Boolean).join(" · "), stars);
  }
  function iconOption(href, i, title, sub) {
    const ic = el("span", "qs-ic");
    ic.setAttribute("aria-hidden", "true");
    ic.append(icons.children[i].cloneNode(true));
    return option(href, ic, title, sub);
  }

  function setActive(i) {
    if (active >= 0 && opts[active]) opts[active].setAttribute("aria-selected", "false");
    active = opts.length ? (i + opts.length) % opts.length : -1;
    if (active >= 0) {
      opts[active].setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", opts[active].id);
      opts[active].scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }

  function render() {
    const q = input.value.trim();
    list.textContent = "";
    opts = [];
    empty.hidden = true;
    all.href = q ? HOME + "?q=" + encodeURIComponent(q).replace(/%20/g, "+") + "#list" : HOME + "#list";
    if (!ix) { allT.textContent = L.qsBrowse; return; }
    shown = q;
    if (!q) {
      // بلا بحث: أحدث ما أُضيف
      list.append(group(L.qsLatest));
      [...ix.tools].sort((a, b) => b.a.localeCompare(a.a) || b.sn - a.sn).slice(0, 6).forEach((x) => list.append(toolOption(x)));
      allT.textContent = L.qsBrowse;
      status.textContent = "";
      setActive(0);
      return;
    }
    const ts = terms(q);
    const hits = ix.tools.map((x, i) => [x, score(docs[i], ts)]).filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1] || b[0].sn - a[0].sn);
    const cats = ix.cats.map((c, i) => [c, score(catDocs[i], ts)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
    const projs = ix.projects.map((p, i) => [p, score(projDocs[i], ts)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
    hits.slice(0, 7).forEach(([x]) => list.append(toolOption(x)));
    if (cats.length) {
      list.append(group(L.qsCats));
      cats.forEach(([c]) => list.append(iconOption(HOME + "?cat=" + c.id + "#list", 0, c.n, fmt(L.qsCatSub, { n: ix.tools.filter((x) => x.c === c.id).length }))));
    }
    if (projs.length) {
      list.append(group(L.qsProjects));
      projs.forEach(([p]) => list.append(iconOption(HOME + "?p=" + p.id + "#build-h", 1, p.n, L.qsProjSub)));
    }
    allT.textContent = hits.length ? fmt(L.qsAll, { n: hits.length }) : L.qsBrowse;
    status.textContent = fmt(L.qsN, { n: hits.length });
    if (!opts.length) {
      empty.hidden = false;
      emptyT.textContent = fmt(L.qsNone, { q });
      const sug = suggest(q, vocab || (vocab = vocabOf(docs)));
      sugBtn.hidden = !sug;
      if (sug) sugBtn.textContent = fmt(L.qsSug, { q: sug });
      sugBtn.dataset.q = sug || "";
    }
    setActive(0);
  }

  function load() {
    if (ix) return;
    status.textContent = L.qsLoading;
    loadIndex().then((data) => {
      ix = data;
      docs = ix.tools.map(docOf);
      catDocs = ix.cats.map((c) => makeDoc({ n: c.n, t: c.t }));
      projDocs = ix.projects.map((p) => makeDoc({ n: p.n, t: p.t }));
      ix.cats.forEach((c) => { catName[c.id] = c.n; });
      if (dlg.open) render();
    }, () => {
      status.textContent = L.qsError;
      list.textContent = "";
      empty.hidden = false;
      emptyT.textContent = L.qsError;
      sugBtn.hidden = true;
    });
  }

  function open() {
    if (dlg.open) return;
    back = document.activeElement;
    dlg.showModal();
    opener.setAttribute("aria-expanded", "true");
    input.select();
    load();
    render();
  }
  function close() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", () => {
    opener.setAttribute("aria-expanded", "false");
    if (back && document.contains(back)) back.focus({ preventScroll: true });
  });

  function go(li, newTab) {
    if (!li) return;
    if (newTab) window.open(li.dataset.href, "_blank", "noopener");
    else { close(); location.href = li.dataset.href; }
  }

  opener.addEventListener("click", open);
  document.getElementById("qs-x").addEventListener("click", close);
  // النقر على الخلفية (خارج المحتوى) يغلق
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 60); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(timer);
      if (ix && input.value.trim() !== shown) render();
      if (opts[active]) go(opts[active], e.metaKey || e.ctrlKey);
      else if (input.value.trim()) { close(); location.href = all.href; }
    }
  });
  list.addEventListener("pointermove", (e) => {
    const li = e.target.closest(".qs-o");
    if (li && opts.indexOf(li) !== active) setActive(opts.indexOf(li));
  });
  list.addEventListener("click", (e) => go(e.target.closest(".qs-o"), e.metaKey || e.ctrlKey));
  sugBtn.addEventListener("click", () => { input.value = sugBtn.dataset.q; render(); input.focus(); });

  // Ctrl/⌘+K في أي مكان، و"/" خارج حقول الكتابة
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || document.activeElement?.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); dlg.open ? close() : open(); }
    else if (e.key === "/" && !typing && !dlg.open) { e.preventDefault(); open(); }
  });
  // يُحمَّل الفهرس مسبقًا حين يقترب المؤشر من الزر
  opener.addEventListener("pointerenter", load, { once: true });
}
