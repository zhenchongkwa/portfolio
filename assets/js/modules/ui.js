;(function (PF) {
"use strict";
const { icon } = PF;

/* ============================================================================
   ui.js — ธีม · toast · lightbox · ปุ่มคัดลอก · ฟอร์มติดต่อ
   ========================================================================= */


/* ============================================================================
   ธีม

   ค่าเริ่มต้นคือมืด เพราะเว็บนี้ออกแบบมาสำหรับพื้นมืดเป็นหลัก
   สคริปต์ตัวจริงที่อ่าน localStorage อยู่ inline ใน <head> ของทุกหน้า
   ต้องอยู่ตรงนั้นเพราะถ้ารอโหลดไฟล์นี้ หน้าจะกระพริบเป็นสีขาวหนึ่งเฟรมก่อน
   ฟังก์ชันนี้จึงมีหน้าที่แค่ "สลับ" ไม่ใช่ "ตั้งค่าครั้งแรก"
   ========================================================================= */
function initTheme(button) {
  const html = document.documentElement;

  const set = (theme) => {
    html.dataset.theme = theme;
    try { localStorage.setItem("pf-theme", theme); } catch { /* โหมดส่วนตัว */ }
    button?.setAttribute("aria-label", theme === "light" ? "เปลี่ยนเป็นธีมมืด" : "เปลี่ยนเป็นธีมสว่าง");
    if (button) button.innerHTML = icon(theme === "light" ? "moon" : "sun");
  };

  const toggle = () => set(html.dataset.theme === "light" ? "dark" : "light");

  button?.addEventListener("click", toggle);
  addEventListener("theme:toggle", toggle);   // ให้ command palette เรียกได้

  set(html.dataset.theme === "light" ? "light" : "dark");
}

/* ============================================================================
   toast — ข้อความแจ้งผลสั้นๆ ที่ลอยขึ้นมาแล้วหายไปเอง

   role="status" ทำให้ screen reader อ่านให้โดยไม่ขัดจังหวะสิ่งที่กำลังอ่านอยู่
   (ถ้าใช้ role="alert" มันจะขัดทันที ซึ่งแรงเกินไปสำหรับแค่ "คัดลอกแล้ว")
   ========================================================================= */
function initToast() {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  document.body.append(el);

  let timer = 0;

  const show = (msg) => {
    el.innerHTML = `${icon("check")}<span></span>`;
    el.querySelector("span").textContent = msg;   // textContent กัน HTML แปลกปลอม
    el.dataset.show = "true";
    clearTimeout(timer);
    timer = setTimeout(() => (el.dataset.show = "false"), 2400);
  };

  addEventListener("toast", (e) => show(e.detail));
  return show;
}

/* ============================================================================
   ปุ่มคัดลอก — ใช้กับอีเมล

   navigator.clipboard ต้องการ secure context (https หรือ localhost)
   เว็บนี้ต้องเปิดจาก file:// ได้ด้วย จึงต้องมีทางสำรองเสมอ
   ========================================================================= */
function initCopy(scope = document) {
  scope.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    e.preventDefault();

    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      window.dispatchEvent(new CustomEvent("toast", { detail: "คัดลอกแล้ว" }));
    } catch {
      // ทางสำรอง: เปิดโปรแกรมอีเมล ซึ่งได้ผลลัพธ์ที่ผู้ใช้ต้องการอยู่ดี
      if (text.includes("@")) location.href = `mailto:${text}`;
    }
  });
}

/* ============================================================================
   lightbox — เปิดดู GIF / ภาพ / วิดีโอเต็มจอ

   ใช้ <dialog> ตัวเดียวใช้ซ้ำทุกภาพ ไม่ได้สร้างใหม่ทุกครั้ง
   เพราะการสร้าง dialog ใหม่ทุกครั้งจะทิ้ง element ค้างไว้ใน DOM เรื่อยๆ
   ========================================================================= */
function initLightbox(scope = document) {
  let dialog = null;

  const build = () => {
    dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.innerHTML = `
      <div data-slot></div>
      <div class="lightbox-bar">
        <span data-caption></span>
        <button type="button" class="lightbox-close" aria-label="ปิด">${icon("close")}</button>
      </div>`;
    document.body.append(dialog);

    dialog.querySelector(".lightbox-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    // ล้างสื่อออกตอนปิด — ไม่งั้นวิดีโอจะเล่นต่อโดยไม่มีใครเห็น
    dialog.addEventListener("close", () => {
      dialog.querySelector("[data-slot]").innerHTML = "";
    });
  };

  scope.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-lightbox]");
    if (!trigger) return;
    e.preventDefault();

    if (!dialog) build();

    const slot = dialog.querySelector("[data-slot]");
    const src  = trigger.dataset.lightbox;
    const cap  = trigger.dataset.caption || "";
    const isVideo = /\.(mp4|webm|mov)$/i.test(src);

    if (isVideo) {
      const v = document.createElement("video");
      v.src = src;
      v.controls = true;
      v.autoplay = true;
      v.loop = true;
      v.playsInline = true;
      slot.replaceChildren(v);
    } else {
      const img = document.createElement("img");
      // ใช้ src ที่แสดงอยู่จริง ถ้าเป็น placeholder จะได้เห็น placeholder ต่อ
      // แทนที่จะเป็นภาพแตกในหน้าต่างที่เพิ่งเปิด
      const shown = trigger.querySelector("img");
      img.src = shown?.dataset.placeheld === "true" ? shown.src : src;
      img.alt = cap;
      slot.replaceChildren(img);
    }

    dialog.querySelector("[data-caption]").textContent = cap;
    dialog.showModal();
  });
}

/* ============================================================================
   ฟอร์มติดต่อ

   ไม่มีเซิร์ฟเวอร์ จึงประกอบเป็นลิงก์ mailto: แล้วเปิดโปรแกรมอีเมลของผู้ใช้
   ข้อดี: ใช้ได้ทันทีแม้เปิดจาก file:// และไม่ต้องฝากข้อมูลไว้กับบริการของใคร
   ข้อเสีย: ผู้ใช้ต้องมีโปรแกรมอีเมลตั้งค่าไว้

   ถ้าอยากได้ฟอร์มที่ส่งเข้ากล่องจดหมายตรงๆ ให้เปลี่ยน <form> ให้มี
   action="https://formspree.io/f/<id>" กับ method="post" แล้วลบฟังก์ชันนี้ทิ้ง
   ========================================================================= */
function initContactForm(form, to) {
  if (!form) return;

  form.addEventListener("submit", (e) => {
    // ถ้ามี action จริง (เช่นต่อ Formspree แล้ว) ให้ปล่อยผ่านไปตามปกติ
    if (form.getAttribute("action")) return;

    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get("name") || "").toString().trim();
    const mail = (data.get("email") || "").toString().trim();
    const msg  = (data.get("message") || "").toString().trim();

    const subject = `ติดต่อจากเว็บพอร์ต — ${name || "ไม่ระบุชื่อ"}`;
    const body    = `${msg}\n\n—\nชื่อ: ${name}\nอีเมล: ${mail}`;

    location.href =
      `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.dispatchEvent(new CustomEvent("toast", { detail: "กำลังเปิดโปรแกรมอีเมล…" }));
  });
}

Object.assign(PF, { initTheme, initToast, initCopy, initLightbox, initContactForm });
})(window.PF = window.PF || {});
