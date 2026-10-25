// يحوّل تاريخ الإضافة إلى صيغة نسبية بلغة الصفحة ("أمس"، "vor 3 Tagen")، ويضع التاريخ الكامل في التلميح.
import { L } from "../i18n/client.js";
let rtf, full;
try {
  rtf = new Intl.RelativeTimeFormat(L.locale, { numeric: "auto" });
  full = new Intl.DateTimeFormat(L.locale, { dateStyle: "long" });
} catch (e) {}

export function relative(iso, now = Date.now()) {
  const ms = Math.max(0, now - new Date(iso).getTime());
  const hours = Math.floor(ms / 36e5), days = Math.floor(ms / 864e5);
  if (hours < 1) return rtf.format(0, "day"); // اليوم
  if (days < 1) return rtf.format(-hours, "hour");
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
  if (days < 365) return rtf.format(-Math.floor(days / 30), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}

export function initDates(root = document) {
  if (!rtf || !full) return; // يبقى التاريخ الثابت المكتوب وقت البناء
  const now = Date.now();
  root.querySelectorAll("time.addedchip").forEach((el) => {
    const iso = el.dataset.added;
    if (!iso || isNaN(new Date(iso))) return;
    const text = el.querySelector(".added-text");
    if (text) text.textContent = relative(iso, now);
    el.title = L.addedOn + full.format(new Date(iso));
    el.dataset.fresh = (now - new Date(iso).getTime()) / 864e5 <= 3 ? "1" : "0";
  });
}
