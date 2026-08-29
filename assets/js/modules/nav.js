;(function (PF) {
"use strict";

/* ============================================================================
   nav.js — แถบนำทาง: สถานะกระจกตอนเลื่อน · เมนูมือถือ · ลิงก์ที่กำลังอ่านอยู่
   ========================================================================= */

/* ---------- กระจกติดตอนเลื่อนลง ----------
   ใช้ IntersectionObserver กับ sentinel สูง 1px ที่บนสุดของหน้า
   แทนการฟัง scroll event — ได้ผลเหมือนกันแต่เบราว์เซอร์จัดการให้เอง
   ไม่ต้องมีโค้ดของเราวิ่งทุกเฟรมตอนคนกำลัง scroll */
function initHeader(header) {
  if (!header) return;

  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none";
  document.body.prepend(sentinel);

  new IntersectionObserver(
    ([entry]) => {
      header.dataset.scrolled = String(!entry.isIntersecting);
    },
    { threshold: 0 }
  ).observe(sentinel);
}

/* ---------- เมนูมือถือ ---------- */
function initMobileMenu(toggle, panel) {
  if (!toggle || !panel) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    panel.dataset.open = String(open);
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  // ปิดเมื่อกดลิงก์ — ไม่งั้นเมนูจะค้างทับเนื้อหาที่เพิ่งกระโดดไปถึง
  panel.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  // ปิดเองเมื่อจอกว้างพอจะโชว์เมนูเต็ม — กันสถานะค้างตอนหมุนจอ
  matchMedia("(min-width: 52rem)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
}

/* ---------- ไฮไลต์ลิงก์ตาม section ที่กำลังอ่าน ----------
   ทำงานเฉพาะหน้าแรกที่มี section หลายอันในหน้าเดียว
   หน้าอื่นตั้ง aria-current มาจาก HTML ตรงๆ อยู่แล้ว

   เก็บ section ที่มองเห็นไว้ใน Set แล้วเลือกอันบนสุดเสมอ
   ถ้าใช้ entry ล่าสุดที่ intersect ลิงก์จะกระพริบไปมาตอน section สองอัน
   อยู่ในจอพร้อมกัน */
function initScrollSpy(links) {
  const map = new Map();

  links.forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!href.startsWith("#")) return;
    const target = document.querySelector(href);
    if (target) map.set(target, a);
  });

  if (!map.size) return;

  const visible = new Set();

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }

      if (!visible.size) return;

      const top = [...visible].sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
      )[0];

      map.forEach((a, section) => {
        if (section === top) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    },
    // กรอบกลางจอ: section จะ "นับว่ากำลังอ่าน" ก็ต่อเมื่อมันอยู่กลางจอจริงๆ
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );

  map.forEach((_, section) => io.observe(section));
}

/* ---------- แถบความคืบหน้าการอ่าน (หน้า case study) ----------
   scale ตามสัดส่วนที่เลื่อนไปแล้ว ใช้ scale ไม่ใช่ width
   เพราะ scale ทำงานบน compositor ล้วน ไม่ต้องคำนวณ layout ใหม่ */
function initProgress(bar) {
  if (!bar) return;

  let ticking = false;

  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(scrollY / max, 1) : 0;
    bar.style.scale = `${p} 1`;
    ticking = false;
  };

  addEventListener(
    "scroll",
    () => {
      // อัปเดตแค่เฟรมละครั้ง ไม่ใช่ทุก event ที่ยิงมา
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  update();
}

Object.assign(PF, { initHeader, initMobileMenu, initScrollSpy, initProgress });
})(window.PF = window.PF || {});
