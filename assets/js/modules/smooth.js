;(function (PF) {
"use strict";

/* ============================================================================
   smooth.js — scroll ที่มีแรงเฉื่อย (ตำแหน่งไล่ตามเป้าแบบหน่วง)

   ---------------------------------------------------------------------------
   ⚠ วิธีที่ห้ามใช้เด็ดขาด: เลื่อนทั้งหน้าด้วย transform

   บทความสอนทำ smooth scroll ส่วนใหญ่บอกให้ครอบเนื้อหาด้วย <div> แล้วเลื่อนมันด้วย
   translateY ตาม scroll — ห้ามทำในเว็บนี้ เพราะ transform ทำให้ตัวห่อกลายเป็น
   containing block ซึ่งจะพังทุกอย่างที่สร้างไว้พร้อมกัน:

     position: fixed  หลุดตำแหน่ง  → nav, .formes, .ambient, เคอร์เซอร์, ฉากเปิด
     position: sticky ตายสนิท      → ฉากตรึงใน sticky.js ไม่ตรึงอีกต่อไป
     IntersectionObserver คำนวณผิด → reveal, line-mask, scramble ไม่ทำงาน

   ---------------------------------------------------------------------------
   วิธีที่ใช้: ขยับ "ตำแหน่ง scroll จริง" ทีละเฟรม

   เก็บเป้าไว้ตัวหนึ่ง ล้อเมาส์บวกเข้าเป้า แล้วทุกเฟรมค่อยๆ ขยับตำแหน่งจริงเข้าหาเป้า
   ผลคือ scrollY ยังเปลี่ยนตามปกติทุกประการ ของทั้งหมดข้างบนจึงทำงานเหมือนเดิม
   ต่างกันแค่ "จังหวะ" ที่มันเปลี่ยน

   ---------------------------------------------------------------------------
   ทำไมต้อง behavior: "instant" ในลูป

   base.css ตั้ง scroll-behavior: smooth ไว้ (สำหรับลิงก์ #anchor)
   ถ้าไม่สั่ง instant ทุกครั้งที่เราเรียก scrollTo เบราว์เซอร์จะเริ่มแอนิเมชันใหม่
   ทับของเดิม เฟรมละครั้ง — กลายเป็นหน่วงหนักและกระตุก

   ข้อดีของการสั่ง instant แทนการถอด scroll-behavior ออกจาก CSS:
   ลิงก์ #anchor ยังได้ smooth ของเบราว์เซอร์เหมือนเดิมโดยไม่ต้องเขียนโค้ดดักคลิกเอง
   (nav.js ไม่ได้ดักคลิกลิงก์ ทำแค่ scrollspy จึงไม่มีอะไรชนกัน)
   ========================================================================= */

/* ยิ่งน้อยยิ่งหนืด — เคยตั้งไว้ 0.105 แต่วัดจริงแล้วหมุนล้อหนึ่งครั้ง หน้ายังไถล
   ต่อเองอีก 818ms กว่าจะหยุด ซึ่งรู้สึกได้ชัดว่า "หน่วง" ไม่ใช่ "ลื่น"
   (เฟรมนิ่งที่ 60fps ตลอด ปัญหาจึงอยู่ที่ค่าหน่วง ไม่ใช่ประสิทธิภาพ)

   0.3 = ไถลต่อราว 300ms (วัดจริง) ยังรู้สึกลื่นและมีน้ำหนักอยู่ แต่ตามมือทัน
   ถ้าจะปรับอีก อย่าลงต่ำกว่า 0.18 เพราะจะกลับไปหน่วงอีก และอย่าเกิน 0.4
   เพราะจะเหมือน scroll ปกติจนไม่เหลือเหตุผลให้มีไฟล์นี้ */
const EASE     = 0.3;
const SPEED    = 1.0;    // ตัวคูณระยะจากล้อเมาส์
const SETTLE   = 0.4;    // ต่างจากเป้าน้อยกว่านี้ถือว่าถึงแล้ว (px)

function initSmooth() {
  /* ---------- เงื่อนไขที่ห้ามเปิด ----------
     จอสัมผัส: ระบบปฏิบัติการมีแรงเฉื่อยของตัวเองที่ดีกว่าที่เราเขียนได้มาก
       และการไปแย่งคุมทำให้นิ้วรู้สึกว่าหน้าจอ "หนืด" ผิดธรรมชาติทันที
     pointer: fine อย่างเดียวไม่พอ เพราะโน้ตบุ๊กจอสัมผัสมีทั้งสองอย่าง
       จึงต้องเช็ค any-pointer: coarse ด้วย ว่ามี "นิ้ว" เป็นตัวเลือกอยู่หรือเปล่า */
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (matchMedia("(any-pointer: coarse)").matches) return;
  if (!matchMedia("(pointer: fine)").matches) return;

  let target  = scrollY;
  let current = scrollY;
  let running = false;
  let rafId   = 0;

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - innerHeight);

  const clamp = (v) => Math.max(0, Math.min(maxScroll(), v));

  /* ---------- หา element ที่เลื่อนเองได้ ----------
     ถ้าล้อหมุนอยู่เหนือรายการที่มีแถบเลื่อนของตัวเอง (เช่น .palette-list ใน
     command palette) ต้องปล่อยให้มันเลื่อนตามปกติ ห้ามไปยึด wheel มาเลื่อนทั้งหน้า

     ต้องเช็คทั้ง "ตั้ง overflow ไว้ให้เลื่อนได้" และ "มีเนื้อหาล้นจริง"
     เพราะ element ที่ตั้ง overflow: auto ไว้แต่เนื้อหาไม่ล้น เลื่อนไม่ได้อยู่แล้ว
     ถ้าเช็คแค่ overflow เราจะปล่อยผ่านทั้งที่ควรเลื่อนทั้งหน้า */
  function scrollableUnder(node) {
    for (let el = node; el && el !== document.body; el = el.parentElement) {
      if (!(el instanceof Element)) continue;
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        return true;
      }
    }
    return false;
  }

  function frame() {
    const diff = target - current;

    if (Math.abs(diff) < SETTLE) {
      current = target;
      window.scrollTo({ top: current, behavior: "instant" });
      running = false;             // ปล่อยให้ scroll listener กลับมา sync เป้าได้
      return;
    }

    current += diff * EASE;
    window.scrollTo({ top: current, behavior: "instant" });
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  addEventListener("wheel", (e) => {
    if (e.ctrlKey) return;                  // ctrl+ล้อ = ซูม ห้ามยุ่ง
    if (e.deltaMode !== 0) return;          // บางเมาส์ส่งเป็น "บรรทัด" ไม่ใช่ px — ปล่อยผ่าน
    if (scrollableUnder(e.target)) return;  // มีของที่เลื่อนเองได้อยู่ใต้เมาส์

    e.preventDefault();                     // ต้องคู่กับ passive: false ข้างล่าง
    target = clamp(target + e.deltaY * SPEED);
    start();
  }, { passive: false });

  /* ---------- sync เป้ากลับ เมื่อการเลื่อนไม่ได้มาจากล้อ ----------
     คีย์บอร์ด (Space, PageDown, ลูกศร) · ลากแถบ scrollbar · ลิงก์ #anchor ·
     เบราว์เซอร์คืนตำแหน่งเดิมตอนกดย้อนกลับ — ทั้งหมดนี้เราไม่ได้แย่งมาทำเอง

     เช็ค running ก่อน เพราะ scrollTo ของเราเองก็ยิง scroll event เหมือนกัน
     ถ้าไม่กัน เป้าจะถูกเขียนทับด้วยตำแหน่งปัจจุบันทุกเฟรม แล้วจะไม่มีวันเลื่อนถึงเป้า */
  addEventListener("scroll", () => {
    if (running) return;
    target = current = scrollY;
  }, { passive: true });

  // จอเปลี่ยนขนาด = ความสูงเอกสารเปลี่ยน เป้าที่เคยถูกต้องอาจเลยขอบล่างไปแล้ว
  addEventListener("resize", () => { target = clamp(target); }, { passive: true });

  document.documentElement.dataset.smooth = "on";
}

Object.assign(PF, { initSmooth });
})(window.PF = window.PF || {});
