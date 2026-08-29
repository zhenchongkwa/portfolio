;(function (PF) {
"use strict";

/* ============================================================================
   lanyard.js — บัตรห้อยสายคล้องคอที่แกว่งได้จริงและลากได้ด้วยเมาส์/นิ้ว

   วิธีที่ใช้: Verlet integration
   ---------------------------------------------------------------------------
   ฟิสิกส์แบบปกติเก็บ "ตำแหน่ง" กับ "ความเร็ว" แยกกัน แล้วบวกกันทุกเฟรม
   Verlet เก็บแค่ "ตำแหน่งตอนนี้" กับ "ตำแหน่งเฟรมที่แล้ว" ความเร็วคือผลต่าง
   ของสองค่านั้น

   ข้อดีที่ทำให้เลือกวิธีนี้: เวลาแก้ตำแหน่งจุดให้เข้าข้อจำกัด (ปล้องเชือกต้อง
   ยาวเท่าเดิม) เราแค่ "ย้ายจุด" ตรงๆ ได้เลย ความเร็วจะปรับตามเองอัตโนมัติ
   ถ้าใช้วิธีเก็บความเร็วแยก จะต้องคำนวณแรงในเชือกเอง ซึ่งยากกว่ามาก
   และเชือกจะยืดจนดูเหมือนหนังยางเวลาลากเร็วๆ

   ลำดับในหนึ่งเฟรม: integrate → แก้ข้อจำกัดซ้ำหลายรอบ → วาด
   ยิ่งแก้ซ้ำหลายรอบ เชือกยิ่งแข็ง แต่กิน CPU มากขึ้น — 6 รอบคือจุดที่พอดี
   ========================================================================= */

const SEGMENTS  = 14;     // จำนวนปล้องเชือก มากกว่านี้จะเริ่มเห็นว่าหน่วง
const ITERATION = 6;      // รอบแก้ข้อจำกัดต่อเฟรม
const GRAVITY   = 0.62;
const DAMPING   = 0.985;  // แรงต้านอากาศ — ต่ำกว่านี้จะแกว่งไม่หยุด
const MAX_STEPS = 5;      // เพดานสเต็ปฟิสิกส์ต่อเฟรม กันวงจรมรณะตอนเครื่องช้าหรือสลับแท็บกลับมา
const MAX_THROW = 26;     // เพดานความเร็วที่บัตรได้ติดตัวตอนปล่อยมือ (px ต่อสเต็ป)

function initLanyard(root) {
  const card   = root.querySelector(".lanyard-card");
  const svg    = root.querySelector(".lanyard-rope");
  const strap  = root.querySelector(".lanyard-strap");
  const hi     = root.querySelector(".lanyard-strap-hi");
  if (!card || !svg || !strap) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, segLen = 0;
  const pts = [];

  /* ---------- ตั้งค่าเริ่มต้น / คำนวณใหม่ตอนจอเปลี่ยนขนาด ----------
     ทุกอย่างอิงขนาดกรอบจริง ไม่ใช่ค่าคงที่ เพราะ .lanyard สูงตาม viewport */
  function layout() {
    const r = root.getBoundingClientRect();
    W = r.width;
    H = r.height;

    // ความยาวเชือกต้องคำนวณจากความสูงบัตรจริง ไม่ใช่สัดส่วนตายตัวของกรอบ
    // เพราะบัตรถูกกำหนดขนาดด้วย clamp() ที่ไม่ได้แปรตามความสูงกรอบ
    // ถ้าใช้เปอร์เซ็นต์คงที่ บัตรจะห้อยทะลุออกนอกกรอบไปทับ section ถัดไป
    // เว้นระยะล่าง 28px ไว้ให้บัตรแกว่งได้โดยไม่ชนขอบทันที
    const cardH = card.offsetHeight || H * 0.45;
    const ropeLen = Math.max(H * 0.25, H - cardH - 28);

    /* segLen ของรอบที่แล้วคือสัญญาณว่า "เคยวางเชือกได้จริงหรือยัง"

       ถ้ารอบแรกถูกเรียกตอนกล่องยังวัดได้ 0x0 (เกิดขึ้นจริงเมื่อเบราว์เซอร์ยังไม่
       flush layout ตอน main.js เรียก initLanyard) segLen จะเป็น 0 แล้วทุกจุดถูก
       วางทับกันหมดที่ (0,0) — รอบถัดไปจึงต้องวางเชือกใหม่ทั้งเส้น ไม่ใช่ย้ายแค่จุดยึด
       ไม่งั้นจุดที่ 1-13 จะค้างกองอยู่มุมซ้ายบนถาวร เหลือแต่จุดยึดที่ตำแหน่งถูก */
    const hadRope = segLen > 0;
    segLen = ropeLen / (SEGMENTS - 1);

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    // ครั้งแรกวางเชือกห้อยตรงลงมา ครั้งถัดไป (ตอน resize) เก็บรูปทรงเดิมไว้
    // แล้วแค่ย้ายจุดยึด — ไม่งั้นเชือกจะกระตุกทุกครั้งที่หมุนจอ
    if (pts.length === 0 || !hadRope) {
      for (let i = 0; i < SEGMENTS; i++) {
        const x = W / 2, y = i * segLen;
        // เขียนทับของเดิมแทน push เพราะเส้นอาจถูกวางไว้แล้วแบบยุบ (segLen เป็น 0)
        const p = pts[i] || (pts[i] = {});
        p.x = p.px = x;
        p.y = p.py = y;
        p.held = false;
      }
    } else {
      pts[0].x = W / 2; pts[0].y = 0;
      pts[0].px = pts[0].x; pts[0].py = pts[0].y;
    }
  }

  /* ---------- ขั้นที่ 1: ขยับจุดตามความเร็วเดิม + แรงโน้มถ่วง ----------
     ไม่มีพารามิเตอร์ dt โดยตั้งใจ — หนึ่งครั้งที่เรียก = หนึ่งสเต็ปขนาดคงที่เสมอ

     เหตุผลที่ห้ามใส่ dt เข้ามาคูณตรงนี้:
     ใน Verlet ค่า (x - px) ไม่ใช่ "ความเร็ว" แต่คือ "ระยะที่ขยับได้ในหนึ่งสเต็ป"
     ถ้าเอาไปคูณ dt ที่มากกว่า 1 (ซึ่งเกิดทุกครั้งที่เฟรมตกต่ำกว่า 60fps)
     ระยะจะถูกขยายทบต้นทุกเฟรมจนตำแหน่งระเบิดออกนอกจอภายในไม่ถึงวินาที
     การชดเชยเวลาจึงต้องทำด้วยการ "เรียกฟังก์ชันนี้หลายครั้ง" แทนการ "คูณให้แรงขึ้น" */
  function integrate() {
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.held) continue;                 // จุดที่นิ้วจับอยู่ไม่ต้องคิดฟิสิกส์
      const vx = (p.x - p.px) * DAMPING;
      const vy = (p.y - p.py) * DAMPING;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + GRAVITY;
    }
  }

  /* ตาข่ายนิรภัย — ถ้าตัวเลขหลุดเป็น NaN หรือไกลจนไร้เหตุผล ให้รีเซ็ตเชือก
     ดีกว่าปล่อยให้บัตรหายไปตลอดกาลแล้วผู้ใช้เห็น hero ว่างเปล่า */
  function sane() {
    for (const p of pts) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) ||
          Math.abs(p.x) > W * 12 || Math.abs(p.y) > H * 12) return false;
    }
    return true;
  }

  function reset() {
    for (let i = 0; i < pts.length; i++) {
      pts[i].x = pts[i].px = W / 2;
      pts[i].y = pts[i].py = i * segLen;
      pts[i].held = false;
    }
  }

  /* ---------- ขั้นที่ 2: ดึงจุดกลับให้ปล้องยาวเท่าเดิม ----------
     ทำซ้ำหลายรอบเพราะการแก้คู่หนึ่งจะไปทำให้คู่ข้างๆ ผิดอีก
     การวนซ้ำคือการไล่ให้ความผิดพลาดค่อยๆ ลดลงจนตามองไม่เห็น */
  function constrain() {
    for (let k = 0; k < ITERATION; k++) {
      // จุดบนสุดตรึงกับตะขอเสมอ ไม่ว่าฟิสิกส์จะพยายามลากไปทางไหน
      pts[0].x = W / 2;
      pts[0].y = 0;

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - segLen) / d;
        const ox = dx * diff * 0.5;
        const oy = dy * diff * 0.5;

        // จุดที่ตรึงไว้ (จุดแรก หรือจุดที่นิ้วจับ) ห้ามขยับ
        // ให้จุดอีกฝั่งรับภาระการแก้ทั้งหมดแทน
        const aFixed = i === 0 || a.held;
        const bFixed = b.held;

        if (aFixed && bFixed) continue;
        if (aFixed)      { b.x -= ox * 2; b.y -= oy * 2; }
        else if (bFixed) { a.x += ox * 2; a.y += oy * 2; }
        else             { a.x += ox; a.y += oy; b.x -= ox; b.y -= oy; }
      }
    }
  }

  /* ---------- ขั้นที่ 3: วาดเชือกและวางบัตร ----------
     เส้นเชือกใช้ quadratic curve ผ่านจุดกึ่งกลางระหว่างจุดข้อมูล
     ถ้าลากเส้นตรงจากจุดหนึ่งไปอีกจุด จะเห็นเป็นเส้นหักๆ ชัดมาก */
  function draw() {
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

    strap.setAttribute("d", d);
    if (hi) hi.setAttribute("d", d);

    // มุมเอียงของบัตร = มุมของปล้องสุดท้าย ลบ 90 องศา
    // (atan2 วัดจากแกน x ส่วนบัตรห้อยลงตามแกน y)
    const prev = pts[pts.length - 2];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x) * 180 / Math.PI - 90;

    card.style.setProperty("--card-x", `${last.x.toFixed(1)}px`);
    card.style.setProperty("--card-y", `${last.y.toFixed(1)}px`);
    card.style.setProperty("--card-rot", `${angle.toFixed(2)}deg`);
  }

  /* ---------- ลากบัตร ----------
     setPointerCapture ทำให้ยังได้รับ event ต่อแม้เมาส์จะเลื่อนออกนอกตัวบัตร
     ถ้าไม่มีบรรทัดนี้ บัตรจะหลุดมือทันทีที่ลากเร็วกว่าที่ระบบตามทัน */
  let dragging = false;

  function toLocal(e) {
    const r = root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  card.addEventListener("pointerdown", (e) => {
    if (reduced) return;
    dragging = true;
    pts[pts.length - 1].held = true;
    card.setPointerCapture(e.pointerId);
    root.dataset.dragged = "true";   // ซ่อนคำใบ้ "ลากดูสิ"
    wake();                          // ลูปอาจหลับไปแล้วเพราะบัตรนิ่ง ต้องปลุกก่อนลาก
    e.preventDefault();
  });

  card.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = toLocal(e);
    const last = pts[pts.length - 1];

    /* ความเร็วที่บัตรจะได้ติดตัวไปตอนปล่อยมือ = ระยะที่นิ้วเพิ่งขยับ
       แต่ต้องจำกัดเพดานไว้ ไม่งั้นการสะบัดเมาส์เร็วๆ ครั้งเดียวจะใส่ความเร็ว
       หลายร้อย px ต่อสเต็ป แล้วบัตรจะหายออกนอกจอไปเลย

       ถ้าตั้ง px = x ไปเลย (ไม่มีความเร็วติดตัว) บัตรจะหล่นตรงๆ ตอนปล่อย
       ซึ่งปลอดภัยแต่รู้สึกเหมือนของไม่มีน้ำหนัก — เพดานคือทางสายกลาง */
    const clamp = (v) => Math.max(-MAX_THROW, Math.min(MAX_THROW, v));
    const vx = clamp(p.x - last.x);
    const vy = clamp(p.y - last.y);

    last.x = p.x;
    last.y = p.y;
    last.px = p.x - vx;
    last.py = p.y - vy;
  });

  function release(e) {
    if (!dragging) return;
    dragging = false;
    pts[pts.length - 1].held = false;
    try { card.releasePointerCapture(e.pointerId); } catch { /* ปล่อยไปแล้ว */ }
  }
  card.addEventListener("pointerup", release);
  card.addEventListener("pointercancel", release);

  /* ---------- ลูปหลัก — สเต็ปคงที่พร้อมตัวสะสมเวลา ----------
     แปลงเวลาที่ผ่านไปจริงเป็น "จำนวนเฟรมที่ 60fps" แล้วเดินฟิสิกส์ทีละหนึ่งสเต็ป
     จนกว่าจะใช้เวลาที่สะสมไว้หมด เศษที่เหลือเก็บไว้รอบหน้า

     ผลคือความเร็วการแกว่งเท่ากันทุกเครื่อง: จอ 120Hz จะเดินฟิสิกส์เฉลี่ยเฟรมเว้นเฟรม
     ส่วนจอ 30Hz จะเดินสองสเต็ปต่อเฟรม โดยที่ขนาดของแต่ละสเต็ปไม่เปลี่ยน

     MAX_STEPS กัน "วงจรมรณะ": ถ้าเครื่องช้าจนคำนวณไม่ทัน เวลาที่สะสมจะยิ่งพอกขึ้น
     ทำให้ต้องคำนวณมากขึ้นอีกจนค้างถาวร — จึงยอมให้ฟิสิกส์เดินช้ากว่าเวลาจริงแทน */
  let last = performance.now();
  let acc = 0;
  let rafId = 0;

  /* แยกสองเรื่องออกจากกัน: "อยู่ในจอไหม" กับ "ลูปเดินอยู่ไหม"
     เดิมใช้ตัวแปรเดียว (running) แทนทั้งสองความหมาย ลูปจึงเดินตลอดเวลาที่บัตร
     อยู่ในจอ แม้บัตรจะแกว่งจนหยุดสนิทไปนานแล้ว — วัดได้ 61 เฟรมต่อวินาที
     ที่ไม่ได้เปลี่ยนภาพอะไรเลย */
  let visible = true;
  let running = false;

  /* ---------- เกณฑ์ "นิ่งแล้ว" ----------
     ใน Verlet ระยะ (x - px) หลังผ่าน constrain แล้วคือ "ระยะที่จุดขยับจริงในสเต็ปนั้น"
     ตอนเชือกเข้าสมดุล แรงโน้มถ่วงกับข้อจำกัดหักล้างกันพอดี ค่านี้จึงลู่เข้าศูนย์

     0.06px ต่อสเต็ป = ช้ากว่าหนึ่งพิกเซลต่อวินาทีเสียอีก ตาแยกไม่ออกแน่นอน
     ห้ามเทียบเท่ากับศูนย์เป๊ะ เพราะ damping 0.985 ทำให้ค่าลู่เข้าแต่ไม่มีวันถึง */
  const REST = 0.06;

  function atRest() {
    for (const p of pts) {
      if (Math.abs(p.x - p.px) > REST || Math.abs(p.y - p.py) > REST) return false;
    }
    return true;
  }

  function frame(now) {
    acc += Math.min((now - last) / 16.667, MAX_STEPS);
    last = now;

    let steps = 0;
    while (acc >= 1 && steps < MAX_STEPS) {
      integrate();
      constrain();
      acc -= 1;
      steps++;
    }
    if (acc > MAX_STEPS) acc = 0;   // ทิ้งเวลาที่ตามไม่ทันไปเลย

    if (!sane()) reset();
    draw();

    if (!visible) { running = false; return; }

    /* ห้ามหยุดขณะนิ้วยังจับบัตรอยู่ ถึงบัตรจะไม่ขยับก็ตาม
       ไม่งั้นพอผู้ใช้จับค้างแล้วเริ่มลากต่อ ลูปจะตายไปแล้วและบัตรจะไม่ตามมือ

       ⚠ ต้องเช็ค steps > 0 ด้วย ไม่งั้นลูปฆ่าตัวเองตั้งแต่เฟรมแรก
       เฟรมแรกหลัง wake() มักห่างจาก last ไม่ถึง 16.667ms (จอ 120Hz เป็นแบบนี้ทุกครั้ง)
       acc จึงยังไม่ถึง 1 ไม่มีสเต็ปฟิสิกส์ไหนได้รัน ทุกจุดยังมี x === px อยู่
       atRest() เลยเป็นจริงทันทีทั้งที่เชือกไม่เคยขยับสักครั้ง — เชือกค้างตายถาวร
       บัตรไม่ห้อยลงมา และลากไม่ได้ (วัดเจอตอน --card-y ค้างที่ 0.0px นาน 500ms) */
    if (!dragging && steps > 0 && atRest()) { running = false; return; }

    rafId = requestAnimationFrame(frame);
  }

  /* ปลุกลูป — เรียกได้ซ้ำโดยไม่ต้องกลัวลูปซ้อน เพราะเช็ค running ก่อนเสมอ */
  function wake() {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    acc = 0;              // เวลาที่ค้างตอนหลับไม่ควรกลายเป็นสเต็ปก้อนใหญ่ตอนตื่น
    rafId = requestAnimationFrame(frame);
  }

  /* หยุดคำนวณเมื่อ hero เลื่อนพ้นจอ — ไม่มีใครดูอยู่ ไม่ต้องเปลืองแบต */
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else { running = false; cancelAnimationFrame(rafId); }
  }, { threshold: 0 });

  layout();
  draw();

  if (reduced) {
    // ไม่มีฟิสิกส์ ไม่มีลูป — วาดเชือกตรงครั้งเดียวจบ
    root.dataset.dragged = "true";
    return;
  }

  io.observe(root);
  wake();

  // ResizeObserver ไม่ใช่ window.resize เพราะกรอบเปลี่ยนขนาดได้จากการ
  // เปลี่ยน layout ด้วย ไม่ใช่แค่ตอนย่อ-ขยายหน้าต่าง
  // ต้องปลุกลูปด้วย เพราะ layout() ย้ายจุดยึด เชือกจึงต้องคำนวณตำแหน่งใหม่
  new ResizeObserver(() => { layout(); wake(); }).observe(root);
}

Object.assign(PF, { initLanyard });
})(window.PF = window.PF || {});
