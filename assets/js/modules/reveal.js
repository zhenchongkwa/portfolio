;(function (PF) {
"use strict";

/* ============================================================================
   reveal.js — เนื้อหาค่อยๆ ปรากฏตอนเลื่อนถึง + ตัวเลขสถิตินับขึ้น

   ใช้ IntersectionObserver ไม่ใช่ scroll event เพราะ scroll event ยิงทุกเฟรม
   และการอ่าน getBoundingClientRect ในนั้นบังคับให้เบราว์เซอร์คำนวณ layout ใหม่
   ทุกครั้ง ซึ่งเป็นสาเหตุอันดับหนึ่งของอาการหน้าเว็บกระตุกตอน scroll
   ========================================================================= */

/* ---------- หน่วงไล่กันภายในกลุ่มเดียวกัน ----------
   ของที่อยู่ในแม่เดียวกันควรโผล่ไล่กันทีละชิ้น ไม่ใช่โผล่พร้อมกันทั้งแถว
   เขียนค่า --i ให้ CSS เอาไปคูณเป็น transition-delay

   จำกัดที่ 8 เพราะถ้าแถวมี 20 ชิ้น ชิ้นสุดท้ายจะรอ 1.4 วินาที ซึ่งนานเกินจนดูค้าง */
function stagger(root = document) {
  const groups = new Map();

  root.querySelectorAll("[data-reveal]").forEach((el) => {
    const parent = el.parentElement;
    if (!parent) return;
    if (!groups.has(parent)) groups.set(parent, 0);
    const i = groups.get(parent);
    // เคารพค่าที่เขียนมาเองใน HTML ถ้ามี
    if (!el.style.getPropertyValue("--i")) {
      el.style.setProperty("--i", String(Math.min(i, 8)));
    }
    groups.set(parent, i + 1);
  });
}

function initReveal(root = document) {
  const items = root.querySelectorAll("[data-reveal]:not([data-revealed])");
  if (!items.length) return;

  stagger(root);

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.dataset.revealed = "true";
        // เลิกเฝ้าทันที — แอนิเมชันนี้เล่นครั้งเดียว การเฝ้าต่อคือการเปลืองเปล่า
        io.unobserve(entry.target);
      }
    },
    {
      // -12% ด้านล่างทำให้ของเริ่มโผล่ตอนเข้ามาในจอแล้วจริงๆ
      // ไม่ใช่ตอนที่ขอบบนเพิ่งแตะขอบจอ ซึ่งจะดูเหมือนโผล่ช้าไปหนึ่งจังหวะ
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.01,
    }
  );

  items.forEach((el) => io.observe(el));
}

/* ============================================================================
   ตัวเลขนับขึ้น — ใช้กับการ์ดสถิติ

   นับด้วย easeOutCubic ไม่ใช่เชิงเส้น เพราะการนับแบบเชิงเส้นดูเหมือนตัวนับ
   ของเครื่องจักร ส่วน easeOut ให้ความรู้สึกว่า "พุ่งขึ้นแล้วค่อยๆ ลงเอย"
   ========================================================================= */
function initCounters(root = document) {
  const els = root.querySelectorAll("[data-count]");
  if (!els.length) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const run = (el) => {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";

    if (reduced) {
      el.textContent = target + suffix;
      return;
    }

    const dur = 1400;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target);
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.4 }
  );

  els.forEach((el) => {
    el.textContent = "0" + (el.dataset.suffix || "");
    io.observe(el);
  });
}

Object.assign(PF, { initReveal, initCounters });
})(window.PF = window.PF || {});
