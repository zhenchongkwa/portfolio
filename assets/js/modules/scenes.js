;(function (PF) {
"use strict";

/* ============================================================================
   scenes.js — เอฟเฟกต์ระดับ "ทั้ง section" ตอนเลื่อนข้ามจากส่วนหนึ่งไปอีกส่วน

   ทำสองอย่างในโมดูลเดียว เพราะทั้งคู่คือเรื่องเดียวกัน:
   "ความคืบหน้าของ scroll → ค่า transform" ถ้าแยกสองไฟล์จะได้ลูป rAF สองลูป
   กับแคชตำแหน่งสองชุดที่คำนวณข้อมูลชุดเดียวกันซ้อนกัน

     1. section ถอยห่าง — ส่วนที่กำลังเลื่อนพ้นจอจะย่อ + จาง + เลื่อนขึ้นช้ากว่าจอ
     2. parallax       — ของที่ติด [data-par] ขยับคนละความเร็วกับหน้า

   ---------------------------------------------------------------------------
   ทำไมไม่ทำ "ส่วนใหม่เลื่อนทับส่วนเก่า" แบบตรงตัว

   วิธีมาตรฐานคือให้ทุก section เป็น position: sticky แล้วใส่ "พื้นหลังทึบ"
   ให้มันบังกันเอง — ซึ่งใช้กับเว็บนี้ไม่ได้ เพราะพื้นทึบจะบัง:

     .formes      รูปทรงวิศวกรรมลอยที่ลากได้ (z-index 0 ใต้เนื้อหา)
     body::before ชั้นจุด halftone
     .ambient     แสงเคลื่อนไหว

   ทั้งสามอย่างมองเห็นได้ทุกวันนี้เพราะ section โปร่งใส การทำ stacking
   จึงเท่ากับลบงานสามชิ้นนั้นทิ้ง

   ที่นี่ใช้วิธี "ส่วนเก่าถอยห่าง" แทน — ตาอ่านผลลัพธ์ว่าของใหม่ขึ้นมาทับของเก่า
   เหมือนกัน แต่ไม่มีอะไรทึบสักชิ้น ของเดิมจึงอยู่ครบ
   ========================================================================= */

const RECEDE_SCALE = 0.94;   // ย่อเล็กสุดตอนถอยห่างเต็มที่
const RECEDE_FADE  = 0.38;   // จางที่สุด — ต่ำกว่านี้จะดูเหมือนหน้าเว็บดับไปเฉยๆ
const RECEDE_LIFT  = 54;     // เลื่อนตามหลังจอกี่ px (ยิ่งมากยิ่งรู้สึกว่าอยู่ไกล)
const PAR_RANGE    = 200;    // ระยะสูงสุดของ parallax ที่ depth = 1

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------- ตำแหน่งเทียบต้นเอกสาร ----------
   ใช้ offsetTop ไล่ขึ้นไปตามสาย offsetParent ไม่ใช่ getBoundingClientRect()

   เหตุผลสำคัญ: โมดูลนี้เขียน scale/translate ใส่ตัว section เอง
   getBoundingClientRect() จะคืนกรอบ "หลังถูก transform แล้ว" ผลคือพอ layout ใหม่
   เราจะวัดตำแหน่งจากค่าที่ตัวเองบิดไว้ แล้วค่าจะเพี้ยนสะสมขึ้นเรื่อยๆ ทุกครั้งที่ resize

   offsetTop/offsetHeight เป็นค่าจาก layout ล้วน ไม่สนใจ transform เลย
   จึงอ่านได้ตรงเสมอไม่ว่าตอนนั้นจะบิดอะไรไว้อยู่ */
function docTop(el) {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
  return y;
}

function initScenes(root = document) {
  // ผู้ใช้ที่ปิดแอนิเมชันไม่ต้องมีอะไรเลย — ไม่ผูก listener ไม่เปิดลูป
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const items = [];
  const byEl  = new Map();

  const add = (el, item) => { items.push(item); byEl.set(el, item); };

  /* ---------- ส่วนที่จะถอยห่าง ----------
     ⚠ ข้าม [data-sticky] เด็ดขาด — การใส่ scale ให้ตัวแม่ทำให้มันกลายเป็น
     containing block ของลูก แล้ว position: sticky ข้างในจะอ้างอิงกรอบผิด
     ฉากตรึงที่ sticky.js ทำไว้จะเลิกตรึงทันที */
  root.querySelectorAll(".hero, .section").forEach((el) => {
    if (el.closest("[data-sticky]")) return;
    add(el, { el, kind: "recede", top: 0, h: 0, live: false });
  });

  /* ---------- ของที่ขยับคนละความเร็ว ----------
     ⚠ ห้ามใส่ data-par บน element ที่มี data-reveal อยู่แล้ว
     ทั้งคู่เขียนคุณสมบัติ translate ตัวเดียวกัน ถ้าใส่ทับกันจะแย่งกันคุมค่า
     แล้วชิ้นนั้นจะกระตุกหรือค้างหายไปเลย — เตือนใน console ให้รู้ตัวตั้งแต่ตอนพัฒนา */
  root.querySelectorAll("[data-par]").forEach((el) => {
    if (el.hasAttribute("data-reveal")) {
      console.warn("[portfolio] element นี้มีทั้ง data-par และ data-reveal " +
                   "ซึ่งเขียน translate ทับกัน — ให้เลือกใส่อย่างใดอย่างหนึ่ง", el);
      return;
    }
    add(el, { el, kind: "par", depth: parseFloat(el.dataset.par) || 0.15,
              top: 0, h: 0, live: false });
  });

  if (!items.length) return;

  /* ---------- แคชตำแหน่ง — เรียกเฉพาะตอนขนาดเปลี่ยน ----------
     ห้ามอ่านค่าพวกนี้ในลูปทุกเฟรม เพราะการอ่าน offsetTop/offsetHeight บังคับให้
     เบราว์เซอร์คำนวณ layout ใหม่ทั้งหน้า ซึ่งเป็นสาเหตุอันดับหนึ่งของอาการ
     scroll กระตุก (คำเตือนเดียวกับที่หัว reveal.js) */
  function layout() {
    for (const it of items) {
      it.top = docTop(it.el);
      it.h   = it.el.offsetHeight;
    }
  }

  let running = false, queued = false, rafId = 0;
  let mouseX = 0, mouseY = 0;

  function apply() {
    queued = false;
    const y = scrollY;
    const vh = innerHeight;

    for (const it of items) {
      if (!it.live) continue;

      if (it.kind === "recede") {
        /* จำกัดช่วงถอยห่างไม่ให้ยาวเกินหนึ่งจอกว่าๆ
           ถ้าผูกกับความสูง section ตรงๆ section ที่ยาวมากจะใช้เวลาถอยนานจน
           ตาไม่ทันสังเกตว่ามีอะไรเกิดขึ้น ส่วน section สั้นจะถอยวูบเดียวจบ
           การตรึงช่วงไว้ทำให้ทุกส่วนรู้สึกเหมือนกันไม่ว่าจะยาวแค่ไหน */
        const span = Math.min(it.h, vh * 1.15) || 1;
        const p = clamp01((y - it.top) / span);

        it.el.style.scale     = (1 - (1 - RECEDE_SCALE) * p).toFixed(4);
        it.el.style.opacity   = (1 - (1 - RECEDE_FADE) * p).toFixed(3);
        it.el.style.translate = `0 ${(p * RECEDE_LIFT).toFixed(1)}px`;
      } else {
        // 0 = เพิ่งโผล่ขอบล่างจอ · 1 = เพิ่งพ้นขอบบนจอ
        const p = clamp01((y + vh - it.top) / (vh + it.h));
        const scrollOffset = (0.5 - p) * it.depth * PAR_RANGE;
        const mouseOffsetX = mouseX * it.depth * 18;
        const mouseOffsetY = mouseY * it.depth * 12;
        it.el.style.translate = `${mouseOffsetX.toFixed(1)}px ${(scrollOffset + mouseOffsetY).toFixed(1)}px`;
      }
    }
  }

  // scroll event ทำหน้าที่เดียวคือจองคิว งานจริงไปทำใน rAF ซึ่งยิงอย่างมากเฟรมละครั้ง
  function onScroll() {
    if (!running || queued) return;
    queued = true;
    rafId = requestAnimationFrame(apply);
  }

  /* เมาส์ส่งแรงเล็กกว่าการเลื่อนมาก เพื่อให้ depth รู้สึกมีชีวิตโดยไม่แย่ง
     บทบาทของ scroll parallax; ใช้ rAF คิวเดียวกับ scroll จึงไม่เพิ่มลูปใหม่ */
  function onPointerMove(e) {
    mouseX = e.clientX / innerWidth - .5;
    mouseY = e.clientY / innerHeight - .5;
    onScroll();
  }

  /* ---------- เปิด-ปิดตามการมองเห็น ----------
     will-change: transform บอก GPU ให้จองชั้นวาดแยกไว้ ซึ่งเร็วขึ้นจริง
     แต่ถ้าเปิดค้างไว้ทุก section พร้อมกันจะกลายเป็นหลายสิบชั้นที่กินหน่วยความจำ
     GPU ทิ้งเปล่าๆ จึงใส่เฉพาะตอนอยู่ในจอแล้วถอดออกเมื่อพ้นไป

     ตอนพ้นจอไม่ล้างค่า transform ทิ้ง เพราะค่าที่ค้างอยู่ "ถูกต้องแล้ว" สำหรับ
     ตำแหน่งนั้น ถ้าล้างทิ้ง พอเลื่อนกลับมาจะเห็นมันเด้งจากขนาดเต็มไปขนาดที่ถูกต้อง */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const it = byEl.get(e.target);
      if (!it) continue;
      it.live = e.isIntersecting;
      if (it.live) it.el.style.willChange = "transform, opacity";
      else it.el.style.removeProperty("will-change");
    }

    const any = items.some((i) => i.live);
    if (any && !running) { running = true; layout(); apply(); }
    else if (!any && running) { running = false; cancelAnimationFrame(rafId); queued = false; }
  }, { rootMargin: "25% 0px 25% 0px" });

  items.forEach((it) => io.observe(it.el));
  addEventListener("scroll", onScroll, { passive: true });
  if (matchMedia("(pointer: fine)").matches) addEventListener("pointermove", onPointerMove, { passive: true });

  // ResizeObserver ที่ body ไม่ใช่ window.resize เพราะความสูงของหน้าเปลี่ยนได้
  // จากการที่เนื้อหาโผล่/หุบ ไม่ใช่แค่ตอนย่อ-ขยายหน้าต่าง
  new ResizeObserver(() => { layout(); apply(); }).observe(document.body);

  layout();
  apply();

  document.documentElement.dataset.scenes = "on";
}

/* docTop ถูกแบ่งให้ reel.js ใช้ด้วย — มันต้องวัดตำแหน่งของ section ที่ตัวเอง
   เขียน translate ใส่เหมือนกัน จึงเจอกับดัก getBoundingClientRect() ตัวเดียวกัน
   ที่อธิบายไว้เหนือฟังก์ชัน ถ้าปล่อยให้ก๊อปไปเขียนซ้ำ อีกฝั่งจะไม่ได้คำเตือนนั้นไปด้วย */
Object.assign(PF, { initScenes, docTop });
})(window.PF = window.PF || {});
