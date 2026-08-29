;(function (PF) {
"use strict";

/* ============================================================================
   formes.js — รูปทรงวิศวกรรมลอยเป็นฉากหลัง ลากได้ เขวี้ยงได้ แล้วลอยกลับที่เดิม

   ที่มา: เว็บอย่าง noth.in วางรูปทรง 2D กระจายทั่วหน้าแล้วให้มันขยับตามเมาส์
   กับ scroll ไฟล์นี้ทำแบบเดียวกันแต่ใช้ธีมวิศวกรรม (ชิป · เฟือง · ตัวต้านทาน ·
   ลายวงจร · แขนกล) เพื่อให้ของตกแต่งพูดเรื่องเดียวกับเนื้อหาในเว็บ

   ---------------------------------------------------------------------------
   ทำไมต้องเป็นฟิสิกส์ ไม่ใช่ CSS animation

   ถ้าใช้ CSS ทำท่าลอยไปมา แล้วใช้ JS ทำท่าลาก พอผู้ใช้จับรูปทรงขึ้นมา ตำแหน่ง
   จะ "กระโดด" ทันที เพราะ CSS กำลังวาดอยู่ที่หนึ่งแต่ JS สั่งไปอีกที่หนึ่ง
   วิธีเดียวที่สองท่านี้ต่อกันเนียนคือให้ทั้งคู่มาจากตัวเลขชุดเดียวกัน
   ตัวเลขชุดนั้นคือ ตำแหน่ง + ความเร็ว ที่วนคำนวณอยู่ในไฟล์นี้

   โมเดลที่ใช้: สปริงกลับบ้าน + แรงหน่วง
     - ทุกรูปทรงมี "บ้าน" ของตัวเอง (ตำแหน่ง % บนจอ)
     - ยิ่งถูกดึงห่างบ้าน แรงดึงกลับยิ่งมาก (กฎของฮุก)
     - แรงหน่วงกินความเร็วทุกเฟรม ไม่งั้นจะแกว่งรอบบ้านไม่มีวันหยุด

   ---------------------------------------------------------------------------
   ทำไมชั้นนี้ pointer-events: none ทั้งชั้น แล้วดักคลิกเองที่ document

   เว็บนี้ใช้ยื่นเข้ามหาวิทยาลัย กรรมการต้องกดทุกลิงก์ได้เสมอ
   ถ้าให้รูปทรงรับคลิกเองตรงๆ วันหนึ่งมันจะลอยไปบังปุ่มแล้วกลืนคลิกนั้นหายไป
   ซึ่งเป็นบั๊กที่หาสาเหตุยากมากเพราะปุ่มยัง "ดูปกติ" ทุกอย่าง

   จึงปิดการรับคลิกของชั้นนี้ทั้งชั้น แล้วมาเช็คเองตอน pointerdown ว่านิ้วลงตรง
   กรอบของรูปทรงไหนไหม โดยมีเงื่อนไขว่าสิ่งที่ถูกกดต้องไม่ใช่ของที่กดได้อยู่แล้ว
   ผลคือรูปทรงลากได้จริง แต่ไม่มีทางแย่งคลิกจากลิงก์หรือปุ่มได้เลย
   ========================================================================= */

/* stroke-width 0.9 ไม่ใช่ 1.6 แบบ icons.js เพราะสองที่นี้ถูกแสดงคนละขนาด
   ไอคอนวาดที่ ~20px จาก viewBox 24 (ย่อลง) ส่วนรูปทรงพวกนี้วาดที่ ~120px (ขยายขึ้น)
   เส้นใน SVG ขยายตามตัวมันเอง ถ้าใช้ 1.6 เท่าไอคอน เส้นจะหนาเกือบ 8px บนจอจริง
   กลายเป็นก้อนทึบแย่งสายตาจากเนื้อหา */
const S = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".9"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const SHAPES = {
  chip: S(`<rect x="7" y="7" width="10" height="10" rx="1.4"/>
           <rect x="10.4" y="10.4" width="3.2" height="3.2" rx=".6"/>
           <path d="M10 7V3.5M14 7V3.5M10 20.5V17M14 20.5V17
                    M7 10H3.5M7 14H3.5M20.5 10H17M20.5 14H17"/>`),

  gear: S(`<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.9"/>
           <path d="M12 2.2v3.1M12 18.7v3.1M2.2 12h3.1M18.7 12h3.1
                    M5.1 5.1 7.3 7.3M16.7 16.7l2.2 2.2M18.9 5.1 16.7 7.3M7.3 16.7l-2.2 2.2"/>`),

  resistor: S(`<path d="M1.5 12h4l1.8-4.6 2.6 9.2 2.6-9.2 2.6 9.2L19 12h3.5"/>`),

  circuit: S(`<path d="M3 6.5h5.5l3 3H21"/><path d="M3 17.5h4.5l4-4"/>
              <circle cx="3" cy="6.5" r="1.3"/><circle cx="21" cy="9.5" r="1.3"/>
              <circle cx="3" cy="17.5" r="1.3"/>`),

  /* คลื่นสี่เหลี่ยม ไม่ใช่คลื่นไซน์ — สัญญาณดิจิทัลสื่อถึงงานที่ทำจริงมากกว่า */
  wave: S(`<path d="M1.5 17h4V7h5v10h5V7h4"/>`),

  nut: S(`<path d="M12 2.6 20.4 7.3v9.4L12 21.4 3.6 16.7V7.3L12 2.6Z"/>
          <circle cx="12" cy="12" r="3.8"/>`),

  arm: S(`<path d="M3.5 21h4"/><path d="M5.5 21v-3.4"/><circle cx="5.5" cy="15.6" r="2"/>
          <path d="m7 14.2 4.4-4.4"/><circle cx="12.8" cy="8.4" r="2"/>
          <path d="M14.8 8.4h3.4a2 2 0 0 1 2 2v2.4"/>`),

  bracket: S(`<path d="M9.5 3.2C6.8 3.2 6.8 5.4 6.8 8s-1 4-2.8 4c1.8 0 2.8 1.4 2.8 4s0 4.8 2.7 4.8"/>
              <path d="M14.5 3.2c2.7 0 2.7 2.2 2.7 4.8s1 4 2.8 4c-1.8 0-2.8 1.4-2.8 4s0 4.8-2.7 4.8"/>`),
};

/* ---------- ผังการวาง ----------
   x/y เป็น % ของจอ เลือกให้เกาะขอบเป็นหลัก เพราะตรงกลางคือที่ของเนื้อหา
   depth = รูปนี้ตอบสนอง scroll แรงแค่ไหน (ค่าต่างกันทำให้เห็นเป็นชั้นลึก-ตื้น)
   mobile = ตัวไหนได้ไปต่อบนจอเล็ก — จอแคบมีที่ว่างน้อย ใส่ครบแปดตัวจะรกทันที */
const LAYOUT = [
  { shape: "chip",     x: 7,  y: 20, size: 124, rot: -12, depth: 0.9, mobile: true  },
  { shape: "gear",     x: 89, y: 14, size: 96,  rot:   8, depth: 1.3, mobile: true  },
  { shape: "resistor", x: 84, y: 63, size: 152, rot:  14, depth: 0.7, mobile: false },
  { shape: "circuit",  x: 13, y: 76, size: 132, rot:  -6, depth: 1.0, mobile: true  },
  { shape: "wave",     x: 94, y: 39, size: 112, rot: -10, depth: 0.8, mobile: false },
  { shape: "nut",      x: 5,  y: 50, size: 86,  rot:  22, depth: 1.1, mobile: false },
  { shape: "arm",      x: 70, y: 89, size: 118, rot: -16, depth: 0.6, mobile: true  },
  { shape: "bracket",  x: 33, y: 94, size: 74,  rot:  18, depth: 1.4, mobile: false },
];

/* ---------- ค่าคงที่ของฟิสิกส์ ---------- */
const SPRING    = 0.010;  // แรงดึงกลับบ้าน — สูงกว่านี้จะดีดกลับเร็วจนดูเหมือนยางยืด
const DAMPING   = 0.94;   // แรงหน่วง — ต่ำกว่านี้จะหยุดกึกเหมือนตกในน้ำเชื่อม
const PUSH_R    = 190;    // รัศมีที่เมาส์เริ่มผลักรูปทรง (px)
const PUSH_F    = 2.1;    // ความแรงที่ผลัก
const SPIN      = 0.05;   // ความเร็วแนวนอนถูกแปลงเป็นการหมุนมากแค่ไหน (ท่ากลิ้ง)
const MAX_THROW = 34;     // เพดานความเร็วตอนปล่อยมือ (px ต่อสเต็ป)
const MAX_STEPS = 5;      // เพดานสเต็ปฟิสิกส์ต่อเฟรม กันวงจรมรณะตอนสลับแท็บกลับมา

/* เพดานระยะ scroll ที่นับเป็นแรงสะกิดในหนึ่งเฟรม (px)
   หมุนล้อเมาส์หนึ่งคลิกได้ราวๆ 100px ค่านี้จึงไม่แตะการเลื่อนอ่านปกติเลย
   แต่มันกันกรณีที่กระโดดทีเดียวหลายพัน px ซึ่งเกิดจริงเวลากดลิงก์ #about
   ในเมนู — ถ้าไม่ตัดเพดาน รูปทรงจะโดนดีดกระเด็นออกนอกจอแล้วใช้เวลาหลายวินาที
   กว่าสปริงจะดึงกลับมา ผู้ใช้จะเห็นหน้าโล่งๆ ระหว่างนั้น */
const KICK_MAX  = 110;

/* เวลาที่ใช้จางหายตอนเลื่อนพ้นบล็อกแรก (ms)
   ⚠ ต้องเท่ากับ transition ของ .formes ใน motion.css เป๊ะ
   ถ้าตัวนี้สั้นกว่า ฟิสิกส์จะหยุดก่อนจางเสร็จแล้วเห็นรูปทรงค้างแข็งกลางทาง
   ถ้ายาวกว่า ก็แค่เผา CPU ทิ้งฟรีๆ หลังจากมองไม่เห็นแล้ว */
const FADE_MS   = 800;

function initFormes(root) {
  if (!root) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small   = matchMedia("(max-width: 720px)").matches;

  const items = LAYOUT.filter((d) => (small ? d.mobile : true));

  /* ---------- สร้าง DOM ครั้งเดียว ----------
     ใช้ DocumentFragment เพื่อให้เบราว์เซอร์คำนวณ layout รอบเดียวตอน append
     ไม่ใช่รอบละครั้งต่อรูปทรง */
  const frag = document.createDocumentFragment();
  const shapes = items.map((d) => {
    const el = document.createElement("div");
    el.className = "forme";
    el.style.left = `${d.x}%`;
    el.style.top  = `${d.y}%`;
    el.style.setProperty("--size", `${d.size}px`);
    el.innerHTML = SHAPES[d.shape] || "";
    frag.append(el);

    return {
      el, d,
      x: 0, y: 0,      // ระยะห่างจากบ้าน (px)
      vx: 0, vy: 0,
      rot: d.rot, vrot: 0,
      hx: 0, hy: 0,    // จุดกึ่งกลางของบ้านในพิกัดจอ — เติมค่าใน layout()
      held: false,
      // เฟสสุ่มของท่าลอย ทำให้แต่ละตัวไม่ขึ้น-ลงพร้อมกันเหมือนถูกสั่ง
      phase: Math.random() * Math.PI * 2,
    };
  });
  root.append(frag);

  /* วาดครั้งแรกให้ทุกตัวอยู่ที่มุมเอียงตั้งต้น
     ถ้าไม่วาด รูปทรงจะโผล่มาตรงๆ ก่อนแล้วค่อยเอียงในเฟรมถัดไป — เห็นเป็นกระตุก */
  const draw = () => {
    for (const s of shapes) {
      s.el.style.translate = `${s.x.toFixed(1)}px ${s.y.toFixed(1)}px`;
      s.el.style.rotate = `${s.rot.toFixed(2)}deg`;
    }
  };
  draw();

  /* ปิดสวิตช์สำหรับคนที่ตั้งค่าลดการเคลื่อนไหว — รูปทรงยังอยู่ครบเป็นภาพนิ่ง
     ไม่ลบทิ้ง เพราะองค์ประกอบของหน้าถูกออกแบบโดยนับรวมมันไว้แล้ว */
  if (reduced) {
    root.dataset.static = "true";
    return;
  }

  /* ---------- จำจุดกึ่งกลางของบ้านไว้ ----------
     ต้องอ่านตอนที่รู้ค่า translate ปัจจุบัน แล้วลบออก ถึงจะได้ตำแหน่ง "บ้านเปล่า"
     อ่านทีเดียวตอน resize ไม่ใช่ทุกเฟรม เพราะ getBoundingClientRect บังคับให้
     เบราว์เซอร์คำนวณ layout ใหม่ ซึ่งเป็นสาเหตุอันดับหนึ่งของอาการ scroll กระตุก */
  function layout() {
    for (const s of shapes) {
      const r = s.el.getBoundingClientRect();
      s.hx = r.left + r.width  / 2 - s.x;
      s.hy = r.top  + r.height / 2 - s.y;
    }
  }

  /* ---------- ตำแหน่งเมาส์ ----------
     เก็บไว้เฉยๆ ไม่คำนวณอะไรใน listener เลย งานทั้งหมดไปทำในลูปเฟรมเดียว
     ถ้าคำนวณตรงนี้ เมาส์ที่ขยับเร็วจะยิง event ถี่กว่า 60 ครั้งต่อวินาที
     แล้วเราจะคำนวณซ้ำหลายรอบต่อเฟรมโดยที่ผลลัพธ์ทับกันเองอยู่ดี */
  let mx = -9999, my = -9999;
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  addEventListener("pointerleave", () => { mx = my = -9999; });

  /* ---------- scroll สะกิดให้รูปทรงไหวตาม ----------
     ไม่ทำ parallax แบบเลื่อนตามระยะ เพราะชั้นนี้เป็น position: fixed
     ระยะสะสมจะพารูปทรงหลุดออกนอกจอไปเรื่อยๆ จนไม่มีวันกลับมา
     ใช้ "ความเร็ว scroll" มาเป็นแรงกระแทกแทน — สปริงจะดึงกลับบ้านเองเสมอ
     ผลที่ได้เหมือนของลอยอยู่ในน้ำแล้วมีคนเขย่าโหล */
  let lastY = scrollY, kick = 0;
  addEventListener("scroll", () => {
    kick += (scrollY - lastY);
    lastY = scrollY;
    checkBlock();   // เช็คว่ายังอยู่ในหน้าจอแรกไหม (นิยามอยู่ท้ายไฟล์)
  }, { passive: true });

  /* ---------- ลาก ----------
     hit test เอง เพราะชั้นนี้ pointer-events: none (เหตุผลอยู่ในหัวไฟล์) */
  const INTERACTIVE = 'a, button, input, textarea, select, summary, label, dialog, [role="tab"], [contenteditable]';
  let drag = null;

  addEventListener("pointerdown", (e) => {
    // ปุ่มขวา/ปุ่มกลางไม่ใช่การลาก และของที่กดได้อยู่แล้วต้องได้คลิกของมันไป
    if (e.button !== 0) return;

    /* ตอนจางหายไปแล้วต้องลากไม่ได้ด้วย
       opacity: 0 ไม่ได้ลบกรอบของ element ทิ้ง การ hit test ที่เราทำเองจึงยัง
       เจอรูปทรงอยู่ — ถ้าไม่กันตรงนี้ ผู้ใช้จะลากของล่องหนได้ทั้งหน้า
       และที่แย่กว่าคือ preventDefault ข้างล่างจะไปกินการลากเลือกข้อความจริงๆ */
    if (root.dataset.out === "true") return;

    if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;

    // ไล่จากตัวท้ายไปหน้า เพื่อให้ตัวที่วาดทับอยู่ด้านบนได้สิทธิ์ก่อน
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const r = s.el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) continue;
      if (e.clientY < r.top  || e.clientY > r.bottom) continue;

      drag = { s, dx: e.clientX - (s.hx + s.x), dy: e.clientY - (s.hy + s.y), id: e.pointerId };
      s.held = true;
      s.el.dataset.held = "true";
      e.preventDefault();   // กันไม่ให้กลายเป็นการลากเลือกข้อความ
      return;
    }
  });

  addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const s = drag.s;
    const nx = e.clientX - drag.dx - s.hx;
    const ny = e.clientY - drag.dy - s.hy;

    /* ความเร็วที่จะติดตัวไปตอนปล่อยมือ = ระยะที่นิ้วเพิ่งขยับ แต่ต้องมีเพดาน
       การสะบัดเมาส์เร็วๆ ครั้งเดียวใส่ความเร็วได้หลายร้อย px ต่อสเต็ป
       ซึ่งจะพารูปทรงหายออกนอกจอไปนานหลายวินาทีกว่าสปริงจะดึงกลับมาได้ */
    const clamp = (v) => Math.max(-MAX_THROW, Math.min(MAX_THROW, v));
    s.vx = clamp(nx - s.x);
    s.vy = clamp(ny - s.y);
    s.x = nx;
    s.y = ny;
  }, { passive: true });

  function release(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    drag.s.held = false;
    delete drag.s.el.dataset.held;
    drag = null;
  }
  addEventListener("pointerup", release);
  addEventListener("pointercancel", release);

  /* ---------- หนึ่งสเต็ปฟิสิกส์ ----------
     ไม่รับ dt เข้ามาโดยตั้งใจ — หนึ่งครั้งที่เรียก = หนึ่งสเต็ปขนาดคงที่เสมอ
     เหตุผลเดียวกับ lanyard.js: การชดเชยเฟรมที่ตกต้องทำด้วยการ "เรียกหลายครั้ง"
     ไม่ใช่ "คูณให้แรงขึ้น" เพราะการคูณจะทบต้นจนตัวเลขระเบิดภายในไม่กี่เฟรม */
  let t = 0;
  function step() {
    t += 0.016;

    // ตัดเพดานตอนเอาไปใช้ ไม่ใช่ตอนสะสม เพราะ scroll ยิง event ถี่กว่าเฟรม
    // ถ้าตัดทีละ event การเลื่อนยาวๆ ครั้งเดียวจะถูกนับเป็นหลายก้อนแล้วรวมกันทะลุเพดานอยู่ดี
    const k = Math.max(-KICK_MAX, Math.min(KICK_MAX, kick));

    for (const s of shapes) {
      if (s.held) continue;   // ตัวที่นิ้วจับอยู่ไม่ต้องคิดฟิสิกส์ นิ้วเป็นคนกำหนดตำแหน่ง

      /* ท่าลอยตอนอยู่เฉยๆ — ขยับ "บ้าน" ไม่ใช่ขยับตัวรูปทรง
         ถ้าใส่เป็นแรงเข้าไปในความเร็วตรงๆ มันจะไปสู้กับสปริงจนสั่นเป็นคลื่นแปลกๆ
         แต่ถ้าย้ายบ้าน สปริงจะพารูปทรงไล่ตามไปเองอย่างนุ่มนวล */
      const ox = Math.sin(t * 0.42 + s.phase) * 11;
      const oy = Math.cos(t * 0.31 + s.phase) * 14;

      s.vx += (ox - s.x) * SPRING;
      s.vy += (oy - s.y) * SPRING;

      // scroll สะกิด — ตัวที่ depth มากไหวแรงกว่า จึงเห็นเป็นชั้นลึก-ตื้น
      s.vy -= k * 0.055 * s.d.depth;

      /* เมาส์ผลัก — แรงลดลงเป็นเส้นตรงตามระยะ พอถึงขอบรัศมีก็เป็นศูนย์พอดี
         ถ้าใช้สูตรกำลังสองแบบแรงโน้มถ่วงจริง แรงตอนเมาส์ทับพอดีจะพุ่งเป็นอนันต์
         แล้วรูปทรงจะกระเด็นหายไปเลย */
      const dx = (s.hx + s.x) - mx;
      const dy = (s.hy + s.y) - my;
      const dist = Math.hypot(dx, dy);
      if (dist < PUSH_R && dist > 0.01) {
        const f = (1 - dist / PUSH_R) * PUSH_F;
        s.vx += (dx / dist) * f;
        s.vy += (dy / dist) * f;
      }

      s.vx *= DAMPING;
      s.vy *= DAMPING;
      s.x  += s.vx;
      s.y  += s.vy;
    }

    // kick ถูกใช้ครบทุกตัวแล้ว เคลียร์ทิ้ง ไม่งั้นจะสะสมจนดันรูปทรงไปทางเดียวตลอด
    kick = 0;

    /* การหมุน — ผูกกับความเร็วแนวนอน ให้รู้สึกเหมือนของกลิ้งไปตามทาง
       ทำนอกลูปบนเพราะตัวที่กำลังถูกลากก็ควรหมุนตามมือด้วย */
    for (const s of shapes) {
      s.vrot += (s.d.rot - s.rot) * 0.006 + s.vx * SPIN * 0.06;
      s.vrot *= 0.93;
      s.rot  += s.vrot;
    }
  }

  /* ตาข่ายนิรภัย — ถ้าตัวเลขหลุดเป็น NaN หรือไกลจนไร้เหตุผล ให้กลับบ้านทันที
     ดีกว่าปล่อยให้รูปทรงหายไปตลอดกาลแล้วหน้าเว็บโล่งไปเฉยๆ */
  function sane(s) {
    return Number.isFinite(s.x) && Number.isFinite(s.y) &&
           Math.abs(s.x) < innerWidth * 3 && Math.abs(s.y) < innerHeight * 3;
  }

  /* ---------- ลูปหลัก — สเต็ปคงที่พร้อมตัวสะสมเวลา ----------
     แปลงเวลาที่ผ่านไปจริงเป็น "จำนวนเฟรมที่ 60fps" แล้วเดินฟิสิกส์ทีละหนึ่งสเต็ป
     จอ 120Hz จึงเดินฟิสิกส์เฉลี่ยเฟรมเว้นเฟรม ส่วนจอ 30Hz เดินสองสเต็ปต่อเฟรม
     ความเร็วที่ตาเห็นเท่ากันทุกเครื่อง */
  let prev = performance.now();
  let acc = 0, running = false, rafId = 0;

  function frame(now) {
    acc += Math.min((now - prev) / 16.667, MAX_STEPS);
    prev = now;

    let n = 0;
    while (acc >= 1 && n < MAX_STEPS) { step(); acc -= 1; n++; }
    if (acc > MAX_STEPS) acc = 0;   // ตามไม่ทันก็ทิ้งเวลาที่ค้างไปเลย

    for (const s of shapes) {
      if (!sane(s)) { s.x = s.y = s.vx = s.vy = 0; }
    }
    draw();

    if (running) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    prev = performance.now();
    lastY = scrollY;   // กันไม่ให้ระยะที่ scroll ไปตอนแท็บถูกซ่อนกลายเป็น kick ก้อนใหญ่
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  /* ---------- เงื่อนไขการทำงาน: ต้องจริงทั้งสองข้อ ----------
     แยกเป็นสองธงแทนที่จะให้แต่ละเหตุการณ์เรียก start/stop เองตรงๆ

     ถ้าปล่อยให้ต่างคนต่างสั่ง จะเกิดกรณีที่สลับแท็บกลับมาแล้ว visibilitychange
     สั่ง start() ทั้งที่รูปทรงถูกซ่อนไปแล้วเพราะเลื่อนพ้นบล็อกแรก — กลายเป็น
     เผา CPU คำนวณฟิสิกส์ให้ของที่มองไม่เห็น */
  let tabVisible = !document.hidden;
  let inFirstBlock = true;
  let fadeTimer = 0;

  function sync() {
    clearTimeout(fadeTimer);

    if (tabVisible && inFirstBlock) { start(); return; }

    /* ตอนถูกซ่อนเพราะเลื่อนพ้นบล็อกแรก ต้องปล่อยให้ฟิสิกส์เดินต่อจนจางหมดก่อน
       ไม่ใช่หยุดทันที เพราะจังหวะที่เลื่อนพ้นคือจังหวะที่รูปทรงกำลังโดน
       scroll kick สะบัดอยู่พอดี ถ้าหยุดกึกกลางคันจะเห็นมันค้างแข็งแล้วค่อยจาง

       ส่วนแท็บที่ถูกซ่อนไม่ต้องรอ เพราะไม่มีใครมองอยู่แล้ว */
    if (!tabVisible) { stop(); return; }
    fadeTimer = setTimeout(stop, FADE_MS);
  }

  // แท็บที่ถูกซ่อนไม่มีใครดู ไม่ต้องเผา CPU ทิ้ง
  document.addEventListener("visibilitychange", () => {
    tabVisible = !document.hidden;
    sync();
  });

  /* ---------- โชว์เฉพาะหน้าจอแรกของหน้า ----------
     พอเลื่อนไปบล็อกถัดไปแล้วรูปทรงจะจางหายไปเลย

     ทำไมต้องหาย: รูปทรงพวกนี้เป็นของทักทายในฉากเปิดของหน้า ถ้าลอยตามไปทุก
     ส่วนจนจบหน้า มันจะเปลี่ยนจาก "ของเล่นที่น่าค้นพบ" เป็น "สิ่งรบกวนที่ตามมา
     ตลอดเวลาที่พยายามอ่าน" — และหน้านี้มีเนื้อหาที่กรรมการต้องอ่านจริงอยู่ข้างล่าง

     ---------------------------------------------------------------------------
     ทำไมวัดจากความสูงจอ ไม่ใช่จาก "ลูกคนแรกของ <main>" ที่ดูตรงกว่า

     เพราะแต่ละหน้าแบ่งบล็อกไม่เหมือนกัน หน้าแรกลูกคนแรกคือ section.hero ที่สูง
     หนึ่งจอพอดี — ใช้ได้ แต่หน้า case study ทั้งหน้าอยู่ใน div.container.case-head
     ก้อนเดียว (วัดจริงได้ 4357px) ลูกคนแรกจึงกินทั้งหน้า รูปทรงเลยไม่มีวันหายเลย

     "หนึ่งหน้าจอแรก" เป็นนิยามที่ตรงกับสิ่งที่ตาเห็นจริงและใช้ได้กับทุกหน้าเท่ากัน
     อ่านแค่ scrollY กับ innerHeight ซึ่งไม่บังคับให้เบราว์เซอร์คำนวณ layout ใหม่
     จึงใส่ไว้ใน scroll listener ที่มีอยู่แล้วได้โดยไม่เพิ่มภาระ

     สองเส้นไม่เท่ากันโดยตั้งใจ (hysteresis) — ถ้าใช้เส้นเดียว การเลื่อนสั่นๆ
     ตรงเส้นพอดีจะทำให้รูปทรงกะพริบเข้าออกถี่ๆ */
  const OUT_AT = 0.85;   // เลื่อนเกินเท่านี้ของความสูงจอ → จางหาย
  const IN_AT  = 0.65;   // ต้องกลับมาต่ำกว่านี้ ถึงจะกลับมาเห็น

  function checkBlock() {
    const vh = innerHeight;
    const next = inFirstBlock ? scrollY < vh * OUT_AT : scrollY < vh * IN_AT;
    if (next === inFirstBlock) return;   // ไม่เปลี่ยนสถานะก็ไม่ต้องแตะ DOM
    inFirstBlock = next;
    root.dataset.out = String(!inFirstBlock);
    sync();
  }

  // ResizeObserver ไม่ใช่ window.resize เพราะขนาดชั้นเปลี่ยนได้จากการเปลี่ยน
  // layout ด้วย ไม่ใช่แค่ตอนย่อ-ขยายหน้าต่าง
  new ResizeObserver(layout).observe(root);

  layout();

  /* เช็คครั้งแรกก่อนเริ่มลูป — เผื่อผู้ใช้เปิดหน้าโดยที่เบราว์เซอร์คืนตำแหน่ง scroll เดิม
     ไว้กลางหน้า (เกิดตอนกดปุ่มย้อนกลับ หรือรีเฟรชขณะอ่านอยู่กลางหน้า)
     ถ้าไม่เช็ค รูปทรงจะโผล่มาให้เห็นหนึ่งจังหวะก่อนจางหายไปเอง */
  checkBlock();
  start();
}

Object.assign(PF, { initFormes });
})(window.PF = window.PF || {});
