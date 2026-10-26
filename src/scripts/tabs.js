// تبويبات (src/components/InstallTile.astro): أزرار role=tab داخل role=tablist، والأسهم تنقل بينها بجهة الصفحة،
// وHome/End إلى الأول والأخير، والتبويب المختار وحده في ترتيب Tab. قبل هذا السكربت (وبلا JavaScript) يتولى CSS العرض.
document.querySelectorAll("[data-tabs]").forEach((box) => {
  const tabs = [...box.querySelectorAll('[role="tab"]')];
  const pans = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
  const rtl = getComputedStyle(box).direction === "rtl";
  function select(i, focus) {
    tabs.forEach((t, j) => {
      const on = j === i;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      pans[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
  }
  select(Math.max(0, tabs.findIndex((t) => t.getAttribute("aria-selected") === "true")), false);
  box.classList.add("on");
  box.addEventListener("click", (e) => {
    const t = e.target instanceof Element && e.target.closest('[role="tab"]');
    if (t) select(tabs.indexOf(t), true);
  });
  box.querySelector('[role="tablist"]').addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    const n = step ? i + step : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    select((n + tabs.length) % tabs.length, true);
  });
});
