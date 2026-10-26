// النشرة البريدية (src/components/Newsletter.astro): يرسل النموذج إلى المزوّد في الخلفية ويعرض سطر الشكر مكانه، فلا يخرج
// الزائر إلى صفحة المزوّد (بعضها، مثل Brevo، يرد بنص تقني). الطلب مثل إرسال النموذج العادي تمامًا (application/x-www-form-urlencoded)،
// ورد المزوّد لا يُقرأ (no-cors): رسالة التأكيد في البريد هي الدليل على الاشتراك. إن فشل الاتصال نفسه يظهر سطر الخطأ
// ويبقى النموذج. بلا JavaScript يُرسل النموذج عاديًا في نافذة جديدة.
const form = document.querySelector("form[data-nl]");
if (form) {
  const done = document.getElementById("nl-done");
  const fail = document.getElementById("nl-fail");
  const btn = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true;
    fail.hidden = true;
    try {
      await fetch(form.action, { method: "POST", mode: "no-cors", body: new URLSearchParams(new FormData(form)) });
      form.hidden = true;
      done.hidden = false;
      done.focus();
    } catch {
      fail.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}
