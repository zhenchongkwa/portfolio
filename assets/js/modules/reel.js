;(function (PF) {
"use strict";

/* ============================================================================
   reel.js — ผลงานเลื่อนแนวนอนแบบตรึงหน้าจอ (มีเฉพาะหน้าแรก)

   ตรึง .reel-pin ไว้กลางจอด้วย position: sticky แล้วแปลง "ระยะที่เลื่อนลง"
   เป็น "ระยะที่แทร็กไถลไปทางซ้าย" ผลคือเลื่อนเมาส์ลงแล้วผลงานวิ่งผ่านหน้าไปข้าง

   ---------------------------------------------------------------------------
   ไฟล์นี้เป็น "การอัปเกรด" ไม่ใช่ "ตัวหลัก"

   ค่าตั้งต้นใน pages.css คือแถบเลื่อนแนวนอนธรรมดาที่ใช้ scroll-snap ของเบราว์เซอร์
   ซึ่งใช้งานได้ครบแม้ JS ตายสนิท ไฟล์นี้จะเปลี่ยนเป็นโหมดตรึงก็ต่อเมื่อเช็คแล้วว่า
   เครื่องนี้ไหวจริง

   เหตุผลอยู่ที่หัวข้อ REEL ใน assets/css/pages.css — สรุปสั้นๆ คือเว็บนี้ใช้ยื่น
   เข้ามหาวิทยาลัย ถ้าเอฟเฟกต์นี้คำนวณพลาดบนเครื่องกรรมการ สิ่งที่เขาจะเห็นคือ
   ช่องว่างเปล่าสูงหลายจอที่เลื่อนผ่านไม่ได้ ซึ่งแย่กว่าไม่มีเอฟเฟกต์มาก

   ---------------------------------------------------------------------------
   ทำไมต้องคิดความสูงของ section เอง

   position: sticky ตรึงของไว้ได้แค่ "ภายในกรอบของตัวแม่" ถ้าตัวแม่สูงเท่าจอพอดี
   มันจะไม่มีระยะให้ตรึงเลยแม้แต่พิกเซลเดียว จึงต้องยืดตัวแม่ให้สูงเท่ากับ
   หนึ่งจอ (ช่วงที่มองเห็น) บวกระยะที่แทร็กต้องไถล — ความสูงส่วนเกินนั้นแหละ
   คือ "เชื้อเพลิง" ของการไถล
   ========================================================================= */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function initReel(section) {
  if (!section) return;

  const track  = section.querySelector("[data-reel-track]");
  const pin    = section.querySelector(".reel-pin");
  const panels = track ? [...track.children] : [];
  if (!track || !pin || !panels.length) return;

  /* ---------- เงื่อนไขที่ห้ามเปิดโหมดตรึง ----------
     ปิดแอนิเมชัน: การตรึงจอคือการเคลื่อนไหวที่บังคับให้ดู ไม่มีทางทำให้เบาลงได้

     จอสัมผัส: การปัดนิ้วแนวนอนบนแถบที่เลื่อนได้จริงเป็นท่าที่นิ้วรู้จักอยู่แล้ว
       ส่วนการตรึงจอบังคับให้ปัดขึ้น-ลงเพื่อให้ของวิ่งซ้าย-ขวา ซึ่งขัดสัญชาตญาณ
       และแย่งการเลื่อนหน้าปกติไปจากผู้ใช้ — ปล่อยให้ CSS ทำแบบปัดเองดีกว่า
       เช็ค any-pointer: coarse ไม่ใช่แค่ pointer: fine เพราะโน้ตบุ๊กจอสัมผัส
       มีทั้งสองอย่าง (เหตุผลเดียวกับ smooth.js)

     จอแคบ: แผงจะเหลือความกว้างน้อยจนอ่านชื่อผลงานไม่ออก
     จอเตี้ย: ตรึงเต็มจอแล้วเนื้อหาไม่พอหายใจ */
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (matchMedia("(any-pointer: coarse)").matches) return;
  if (!matchMedia("(min-width: 62rem)").matches) return;
  if (innerHeight < 520) return;

  section.dataset.reelMode = "pin";

  let top = 0, span = 1, maxX = 0, live = false;
  let queued = false, rafId = 0;

  /* ---------- วัดขนาด ----------
     ห้ามเรียกในลูปทุกเฟรม การอ่าน scrollWidth/offsetHeight บังคับให้เบราว์เซอร์
     คำนวณ layout ใหม่ทั้งหน้า (คำเตือนเดียวกับที่หัว scenes.js และ reveal.js) */
  function layout() {
    // ต้องล้าง translate ก่อนวัด ไม่งั้นจะวัดแทร็กในตำแหน่งที่เราเลื่อนไว้เอง
    track.style.translate = "";

    maxX = Math.max(0, track.scrollWidth - pin.clientWidth);

    /* ไม่มีอะไรให้ไถล (แผงน้อยจนพอดีจอ) — ถอยกลับไปเป็นแถบธรรมดา
       ถ้าปล่อยให้โหมดตรึงทำงานต่อ จะได้ช่องว่างสูงหนึ่งจอที่ไม่มีอะไรเกิดขึ้น */
    if (maxX < 40) {
      delete section.dataset.reelMode;
      section.style.removeProperty("--reel-len");
      live = false;
      return;
    }

    section.dataset.reelMode = "pin";

    /* 1px ที่เลื่อนลง = 1px ที่แทร็กไถล — อัตราส่วนหนึ่งต่อหนึ่งทำให้รู้สึกว่า
       กำลัง "ผลักแทร็กด้วยมือ" ไม่ใช่สั่งงานอะไรบางอย่างให้ไปทำแทน
       บวกอีกครึ่งจอท้ายเพื่อให้แผงสุดท้ายได้อยู่กลางจอสักครู่ก่อนหลุดการตรึง */
    const len = innerHeight + maxX + innerHeight * 0.5;
    section.style.setProperty("--reel-len", `${Math.round(len)}px`);

    top  = PF.docTop(section);
    span = Math.max(1, len - innerHeight);
  }

  function apply() {
    queued = false;
    if (!live || !maxX) return;

    const p = clamp01((scrollY - top) / span);

    track.style.translate = `${-(p * maxX).toFixed(1)}px`;
    section.style.setProperty("--reel-p", p.toFixed(4));

    /* ---------- แผงไหนคือ "อันที่กำลังดูอยู่" ----------
       ยิ่งใกล้กลางจอยิ่งอิ่มสี ไกลออกไปยิ่งซีด ทำให้ตารู้ว่าควรมองอันไหน
       โดยไม่ต้องมีกรอบหรือป้ายมาบอก

       ใช้ค่าที่คำนวณเองแทน getBoundingClientRect() ของแต่ละแผงทุกเฟรม
       เพราะการอ่าน rect หลังจากเพิ่งเขียน translate จะบังคับให้เบราว์เซอร์
       คำนวณ layout ใหม่ทันทีกลางเฟรม (layout thrashing) */
    const mid = pin.clientWidth / 2;
    for (const panel of panels) {
      const centre = panel.offsetLeft + panel.offsetWidth / 2 - p * maxX;
      const away = Math.abs(centre - mid) / (pin.clientWidth * 0.6);
      panel.style.setProperty("--reel-focus", clamp01(1 - away).toFixed(3));
    }
  }

  function onScroll() {
    if (!live || queued) return;
    queued = true;
    rafId = requestAnimationFrame(apply);
  }

  /* ---------- ทำงานเฉพาะตอนอยู่ในจอ ----------
     กฎข้อ 10: ลูปต้องหยุดเองเมื่อไม่มีอะไรเปลี่ยน
     ตอนผู้ใช้อ่านส่วนอื่นของหน้า ไม่มีเหตุผลให้คำนวณตำแหน่งแทร็กนี้เลย */
  new IntersectionObserver((entries) => {
    live = entries[0].isIntersecting;
    if (live) { layout(); apply(); }
    else { cancelAnimationFrame(rafId); queued = false; }
  }, { rootMargin: "10% 0px 10% 0px" }).observe(section);

  addEventListener("scroll", onScroll, { passive: true });

  /* ความกว้างแทร็กเปลี่ยนได้จากทั้งขนาดจอและฟอนต์ที่เพิ่งโหลดเสร็จ
     (ชื่อผลงานภาษาไทยขึ้นบรรทัดใหม่ต่างกันมากระหว่างฟอนต์สำรองกับ Anuphan)
     ResizeObserver จับได้ทั้งสองกรณี ส่วน window.resize จับได้แค่กรณีแรก */
  new ResizeObserver(() => { layout(); apply(); }).observe(track);

  /* ---------- คีย์บอร์ด ----------
     แผงเป็นลิงก์ กด Tab ไล่ได้อยู่แล้ว แต่แผงที่ยังไม่ถึงคิวอยู่นอกจอทางขวา
     เบราว์เซอร์จะพยายามเลื่อนหาเอง ซึ่งเลื่อนไม่ถึงเพราะเราคุม translate อยู่
     จึงต้องแปลง "แผงที่ได้โฟกัส" กลับเป็น "ตำแหน่ง scroll" ให้เอง
     ถ้าไม่ทำ คนที่ใช้คีย์บอร์ดล้วนจะโฟกัสไปยังลิงก์ที่มองไม่เห็นทั้งสี่อัน */
  track.addEventListener("focusin", (e) => {
    if (!section.dataset.reelMode || !maxX) return;
    const panel = e.target.closest(".reel-panel");
    if (!panel) return;

    const want = panel.offsetLeft + panel.offsetWidth / 2 - pin.clientWidth / 2;
    scrollTo({ top: top + clamp01(want / maxX) * span, behavior: "instant" });
  });

  layout();
  apply();
}

Object.assign(PF, { initReel });
})(window.PF = window.PF || {});
