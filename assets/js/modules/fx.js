;(function (PF) {
"use strict";

/* ============================================================================
   fx.js — เอฟเฟกต์ที่เป็นการตกแต่งล้วน: เคอร์เซอร์ · แสงตามเมาส์ · ฉากเปิด

   ทุกตัวในไฟล์นี้ต้อง "หายไปเงียบๆ" ได้ ถ้าอุปกรณ์ไม่รองรับหรือผู้ใช้ปิดแอนิเมชัน
   เว็บต้องใช้งานได้ครบเหมือนเดิมโดยไม่มีอะไรในไฟล์นี้เลย
   ========================================================================= */

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================================
   เคอร์เซอร์กำหนดเอง — จุดเล็กกับวงแหวนที่ตามมาช้ากว่า

   เปิดเฉพาะเมาส์จริง (pointer: fine) เพราะบนจอสัมผัสไม่มีเคอร์เซอร์ให้แทนที่
   และวงแหวนจะค้างอยู่ตรงที่แตะครั้งสุดท้ายซึ่งดูเหมือนจอค้าง

   จุดตามเมาส์ทันที วงแหวนตามด้วย lerp — ระยะห่างระหว่างสองชิ้นนี้คือสิ่งที่
   ทำให้รู้สึกว่ามันมี "น้ำหนัก" ถ้าตามพร้อมกันทั้งคู่จะเหมือนเมาส์ธรรมดา
   ========================================================================= */
function initCursor() {
  if (reduced() || !matchMedia("(pointer: fine)").matches) return;

  const dot  = document.createElement("div");
  const ring = document.createElement("div");
  dot.className  = "cursor-dot";
  ring.className = "cursor-ring";
  dot.setAttribute("aria-hidden", "true");
  ring.setAttribute("aria-hidden", "true");

  /* ป้ายในวงแหวน — โผล่คำว่า VIEW / ZOOM ตอนลอยเหนือของที่เปิดดูได้
     อยู่ในวงแหวนไม่ใช่ element ที่สาม เพื่อให้มันไล่ตามด้วยความหน่วงชุดเดียวกัน
     ถ้าแยกออกมา ป้ายกับวงจะเคลื่อนคนละจังหวะแล้วดูเหมือนสองสิ่งที่ไม่เกี่ยวกัน */
  const label = document.createElement("span");
  label.className = "cursor-label";
  ring.append(label);

  document.body.append(dot, ring);

  const html = document.documentElement;
  html.dataset.cursor = "on";

  let mx = innerWidth / 2, my = innerHeight / 2;   // ตำแหน่งเมาส์จริง
  let rx = mx, ry = my;                            // ตำแหน่งวงแหวนที่ไล่ตาม

  addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.translate = `${mx}px ${my}px`;

    // ขยายวงแหวนเมื่ออยู่เหนือของที่กดได้ — บอกว่า "ตรงนี้กดได้" โดยไม่ต้องมีคำพูด
    const hot = e.target instanceof Element &&
      e.target.closest('a, button, [role="tab"], .card, .cert, .lanyard-card');
    html.dataset.cursorHot = String(Boolean(hot));

    /* ---------- ยกระดับจาก "กดได้" เป็น "เปิดดูได้" ----------
       ของบางอย่างกดแล้วเปิดของชิ้นใหญ่ขึ้นมาดู (ผลงาน · เกียรติบัตร · รูปเต็ม)
       ต่างจากลิงก์ทั่วไปที่แค่พาไปที่อื่น ตรงนั้นบอกด้วยคำไปเลยว่าจะได้อะไร
       ดีกว่าให้เดาจากรูปทรงของวงแหวน

       เขียนข้อความเฉพาะตอนเปลี่ยนของที่ชี้จริงๆ ไม่ใช่ทุกครั้งที่เมาส์ขยับ
       การเขียน textContent ทับค่าเดิมบังคับให้เบราว์เซอร์คำนวณ layout ของ
       ป้ายใหม่ ซึ่งจะเกิดร้อยกว่าครั้งต่อวินาทีบนเมาส์ความถี่สูง */
    const tag = hot && hot.closest("[data-cursor-label]");
    const text = tag ? tag.dataset.cursorLabel : "";
    if (text !== label.textContent) label.textContent = text;
    html.dataset.cursorMode = text ? "label" : "plain";

    wake();   // ปลุกลูปไล่ตาม (นิยามอยู่ข้างล่าง — function declaration จึงเรียกได้)
  }, { passive: true });

  // ซ่อนเมื่อเมาส์ออกนอกหน้าต่าง ไม่งั้นจะมีจุดค้างที่ขอบจอ
  addEventListener("pointerleave", () => (html.dataset.cursor = "off"));
  addEventListener("pointerenter", () => (html.dataset.cursor = "on"));

  /* ตัวเลข 0.18 คือความ "หนืด" — ยิ่งน้อยยิ่งตามช้า 0.18 คือจุดที่ยังทันแต่รู้สึกได้

     ธีมคอมิกเพิ่มขอบสีเหลื่อมที่แรงขึ้นตามความเร็วเมาส์
     ระยะห่างระหว่างจุดกับวงแหวน "คือ" ความเร็วอยู่แล้วโดยธรรมชาติของ lerp
     (ยิ่งสะบัดเร็ว วงแหวนยิ่งตามไม่ทัน ระยะยิ่งห่าง) จึงไม่ต้องเก็บตำแหน่ง
     เฟรมก่อนหน้าหรือคำนวณความเร็วแยกเลย — อ่านจากสิ่งที่มีอยู่แล้วได้ตรงๆ

     หาร 6 แล้วตัดเพดานที่ 5px: ระยะห่างตอนสะบัดเต็มแรงอยู่ราว 30px
     ถ้าไม่ตัดเพดาน ขอบสีจะแยกออกจากกันจนอ่านไม่ออกว่าเป็นเคอร์เซอร์

     ---------------------------------------------------------------------------
     ลูปหยุดเองเมื่อวงแหวนตามทัน

     เดิมลูปนี้วนไม่มีวันหยุด แม้ผู้ใช้วางเมาส์นิ่งเป็นนาที — วัดจริงแล้วกิน 61 เฟรม
     ต่อวินาทีตลอดเวลาโดยไม่ได้เปลี่ยนภาพอะไรเลย เพราะ rx/ry ลู่เข้าหา mx/my
     จนเท่ากันไปนานแล้ว

     พอระยะห่างเหลือต่ำกว่าครึ่งพิกเซล (ตาแยกไม่ออกอยู่แล้ว) ก็หยุด แล้วให้
     pointermove ปลุกใหม่ ต้นทุนตอนเมาส์นิ่งจึงเป็นศูนย์จริง
     กฎเดียวกับ backdrop.js และ comic-fx.js */
  let running = false;

  // ประกาศเป็น function declaration ไม่ใช่ const เพราะ pointermove ข้างบนเรียกมัน
  // การ hoist ทำให้เรียกได้แม้จะนิยามทีหลังในไฟล์
  function wake() {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  }

  function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.translate = `${rx}px ${ry}px`;

    const gap = Math.hypot(mx - rx, my - ry);
    html.style.setProperty("--cursor-chroma", `${Math.min(5, gap / 6).toFixed(2)}px`);

    if (gap > 0.5) requestAnimationFrame(loop);
    else running = false;
  }

  wake();
}

/* ============================================================================
   ปุ่มแม่เหล็ก — ของที่กดได้จะเอียงตัวเข้าหาเมาส์ก่อนที่เมาส์จะไปถึง

   ทำให้การเล็งปุ่มรู้สึกเหมือนปุ่ม "อยากถูกกด" ซึ่งเป็นรายละเอียดที่เห็นบ่อย
   ในเว็บที่ได้รางวัล และเป็นตัวที่คนสังเกตเห็นแม้อธิบายไม่ถูกว่าเห็นอะไร

   ---------------------------------------------------------------------------
   ⚠ ต้องเขียนลง transform ไม่ใช่ translate

   ปุ่มคอมิกในเว็บนี้ใช้คุณสมบัติ translate ไปแล้วสำหรับเอฟเฟกต์ "กดจมลงไปหาเงา"
   (.btn--primary:hover { translate: 2px 2px } ใน components.css)
   ถ้าแม่เหล็กเขียน translate ทับ เอฟเฟกต์นั้นจะหายไปทั้งเว็บ

   CSS แยก transform กับ translate เป็นคนละคุณสมบัติที่ประกอบกันเองตามลำดับ
   translate → rotate → scale → transform ทั้งสองอย่างจึงอยู่ด้วยกันได้
   โดยไม่ต้องแก้กฎปุ่มเดิมสักบรรทัด

   ---------------------------------------------------------------------------
   ทำไมผูก listener ที่ document ตัวเดียว

   เหตุผลเดียวกับ initSpotlight ข้างล่าง: หน้าแรกมีปุ่มกับลิงก์เป็นสิบ
   ถ้าผูกทีละตัวจะได้ listener เป็นสิบตัวที่รอทำงานพร้อมกันตลอดเวลา
   ========================================================================= */
function initMagnet(scope = document) {
  if (reduced() || !matchMedia("(pointer: fine)").matches) return;

  const PULL = 0.34;   // ดูดแรงแค่ไหน — 1.0 คือปุ่มวิ่งไปอยู่ใต้เมาส์พอดี
  const HALO = 26;     // ระยะเผื่อรอบปุ่มที่ยังนับว่า "เข้าใกล้แล้ว" (px)

  let el = null, rect = null;

  const release = () => {
    if (!el) return;
    // ลบทิ้ง ไม่ใช่ตั้งเป็น 0 — ปล่อยให้ค่าตั้งต้นใน CSS ทำงาน
    // และเอา data-magnet-on ออกเพื่อคืน transition สปริงตอนดีดกลับ
    el.style.removeProperty("--mag-x");
    el.style.removeProperty("--mag-y");
    delete el.dataset.magnetOn;
    el = null;
    rect = null;
  };

  scope.addEventListener("pointerover", (e) => {
    const t = e.target instanceof Element && e.target.closest("[data-magnet]");
    if (!t || t === el) return;
    release();
    el = t;
    /* วัดกรอบครั้งเดียวตอนเข้า ไม่ใช่ทุกเฟรม การอ่าน getBoundingClientRect()
       ในลูป pointermove บังคับให้เบราว์เซอร์คำนวณ layout ใหม่ทั้งหน้า
       (แคชแบบเดียวกับ tiltRect ใน comic-fx.js) */
    rect = t.getBoundingClientRect();
    t.dataset.magnetOn = "true";
  }, { passive: true });

  scope.addEventListener("pointerout", (e) => {
    const t = e.target instanceof Element && e.target.closest("[data-magnet]");
    if (t && t === el && !t.contains(e.relatedTarget)) release();
  }, { passive: true });

  scope.addEventListener("pointermove", (e) => {
    if (!el || !rect) return;

    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);

    /* ออกนอกระยะแล้วต้องปล่อย — pointerout ไม่ยิงเสมอไป เช่นตอนหน้าเลื่อน
       ใต้เมาส์ที่วางนิ่ง หรือตอน element ถูกวาดใหม่ ถ้าไม่เช็คตรงนี้ด้วย
       ปุ่มจะค้างเบี้ยวอยู่อย่างนั้นจนกว่าจะมีใครไปชี้มันอีกครั้ง */
    if (Math.abs(dx) > rect.width / 2 + HALO ||
        Math.abs(dy) > rect.height / 2 + HALO) { release(); return; }

    el.style.setProperty("--mag-x", `${(dx * PULL).toFixed(2)}px`);
    el.style.setProperty("--mag-y", `${(dy * PULL).toFixed(2)}px`);
  }, { passive: true });

  // หน้าเลื่อน = กรอบที่วัดไว้ใช้ไม่ได้แล้ว ปล่อยทิ้งแล้วรอให้ชี้ใหม่
  addEventListener("scroll", release, { passive: true });
}

/* ============================================================================
   แสงตามเมาส์บนการ์ด

   ฟัง pointermove ที่ตัวแม่ตัวเดียว ไม่ใช่ผูก listener ให้การ์ดทุกใบ
   หน้าแรกมีการ์ดเป็นสิบใบ ถ้าผูกทีละใบจะมี listener เป็นสิบตัวที่ทำงานพร้อมกัน
   ========================================================================= */
function initSpotlight(scope = document) {
  if (!matchMedia("(pointer: fine)").matches) return;

  scope.addEventListener("pointermove", (e) => {
    const card = e.target instanceof Element && e.target.closest(".card--spotlight");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });
}

/* ============================================================================
   ฉากเปิด — ใยแมงมุมวาดตัวเอง แล้วฉีกออกเป็นสองซีก

   เล่นครั้งเดียวต่อ session: คนที่กดเข้าหน้า case study แล้วกดกลับมาหน้าแรก
   ไม่ควรต้องนั่งดูซ้ำ ใช้ sessionStorage ไม่ใช่ localStorage เพราะพอปิดแท็บแล้ว
   เปิดใหม่ ถือเป็นการมาเยือนครั้งใหม่ที่ควรได้เห็น

   ---------------------------------------------------------------------------
   ฉีกยังไงให้ใยขาดตรงกลางพอดี

   ปัญหา: ถ้าวาดใยไว้ใบเดียวแล้วสั่งให้ "ฉีก" ใยจะต้องถูกตัดครึ่งกลางอากาศ
   ซึ่ง SVG เส้นเดียวทำไม่ได้

   วิธีที่ใช้: วางฉากซ้อนกันสองชุดที่ "เหมือนกันเป๊ะทุกพิกเซล" แล้ว clip
   ให้ชุดซ้ายโชว์เฉพาะครึ่งซ้าย ชุดขวาโชว์เฉพาะครึ่งขวา ตาจึงเห็นเป็นฉากเดียว
   พอถึงเวลาฉีก ก็แค่เลื่อนสองชุดออกจากกันคนละทาง รอยต่อที่ซ่อนอยู่ตรงกลาง
   จะกลายเป็นรอยขาดเอง

   ที่ทั้งสองชุดวาดพร้อมกันเป๊ะได้โดยไม่ต้องซิงค์อะไรเลย เพราะใช้ CSS animation
   ตัวเดียวกันและถูกใส่เข้า DOM ในเฟรมเดียวกัน
   ========================================================================= */

/* รูปทรงใย — สร้างด้วยตรีโกณ ไม่ hardcode path เพราะอยากปรับจำนวนซี่/วงได้
   โดยไม่ต้องวาดใหม่ทั้งใบ

   pathLength="1" คือหัวใจของการวาดตัวเอง: มันบอก SVG ให้ "ถือว่า" เส้นนี้ยาว 1 หน่วย
   ไม่ว่าความยาวจริงจะเท่าไหร่ stroke-dasharray:1 กับ dashoffset 1→0 จึงใช้ได้กับ
   ทุกเส้นด้วยค่าชุดเดียว — ถ้าไม่มีบรรทัดนี้ ต้องวัดความยาวจริงของทุกเส้นด้วย JS
   แล้วเขียน dasharray ทีละเส้น ซึ่งบังคับให้เบราว์เซอร์คำนวณ layout ใหม่ทุกครั้ง */
function webSVG(spokes = 12, rings = 6) {
  const C = 100, R = 92;
  const pt = (i, r) => {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    return [C + Math.cos(a) * r, C + Math.sin(a) * r];
  };
  const f = (n) => n.toFixed(1);

  let d = "";

  // ซี่ใย — ลากจากจุดกลางออกไปขอบ วาดไล่กันทีละเส้น
  for (let i = 0; i < spokes; i++) {
    const [x, y] = pt(i, R);
    d += `<path class="web-spoke" style="--d:${(i * 35)}ms" pathLength="1"
             d="M ${C} ${C} L ${f(x)} ${f(y)}"/>`;
  }

  /* วงใย — แต่ละช่วงระหว่างซี่ต้องหย่อนเข้าหาจุดกลาง ไม่ใช่เส้นตรง
     ใยจริงหย่อนเพราะเส้นใยไม่มีแรงต้านการดัด ถ้าลากตรงจะกลายเป็นรูปหลายเหลี่ยม
     ที่ดูเหมือนกราฟเรดาร์มากกว่าใยแมงมุม

     จุดควบคุมของเส้นโค้งอยู่กึ่งกลางมุมระหว่างสองซี่ ที่รัศมี 0.86 เท่า */
  for (let k = 1; k <= rings; k++) {
    const r = R * (0.18 + (k / rings) * 0.82);
    let seg = "";
    for (let i = 0; i < spokes; i++) {
      const [x, y] = pt(i, r);
      if (i === 0) seg += `M ${f(x)} ${f(y)}`;
      const a = ((i + 0.5) / spokes) * Math.PI * 2 - Math.PI / 2;
      const cx = C + Math.cos(a) * r * 0.86;
      const cy = C + Math.sin(a) * r * 0.86;
      const [nx, ny] = pt((i + 1) % spokes, r);
      seg += ` Q ${f(cx)} ${f(cy)} ${f(nx)} ${f(ny)}`;
    }
    d += `<path class="web-ring" style="--d:${300 + k * 90}ms" pathLength="1" d="${seg}"/>`;
  }

  return `<svg class="intro-web" viewBox="0 0 200 200" aria-hidden="true"
               fill="none" stroke="currentColor" stroke-linecap="round">${d}</svg>`;
}

function initIntro(el) {
  if (!el) return;

  const KEY = "pf-intro-seen";
  let seen = false;
  try { seen = sessionStorage.getItem(KEY) === "1"; } catch { /* โหมดส่วนตัว */ }

  if (seen || reduced()) {
    el.remove();
    return;
  }

  /* เนื้อฉากถูกใส่ทีหลังด้วย JS แต่โครง .intro-tear อยู่ใน HTML แล้ว
     เพื่อให้ยังมองเห็นในซอร์สว่าหน้านี้มีฉากเปิด และ CSS จัดการมันได้ตั้งแต่เฟรมแรก

     ---------------------------------------------------------------------------
     ตัวนับกับชื่อที่ประกอบตัวจากเม็ดจุด — ส่วนที่เพิ่มมาทีหลัง

     ของเดิมคือใยแมงมุมวาดตัวเองแล้วฉีก ซึ่งสวยแต่ "ไม่ได้บอกอะไร" คนดูเห็น
     แค่ภาพเคลื่อนไหวหนึ่งจังหวะแล้วจบ ตัวนับทำให้ฉากเปิดมีหน้าที่จริง:
     บอกว่ากำลังโหลดอยู่ และเหลืออีกเท่าไหร่

     ชื่อที่ค่อยๆ ชัดขึ้นจากเม็ดจุดหยาบไปละเอียด เป็นการแนะนำภาษาภาพของเว็บ
     ตั้งแต่วินาทีแรก — พอฉากฉีกออกแล้วเจอรูปเม็ดจุดเต็มจอ คนดูจะอ่านได้ทันที
     ว่ามันคือของชุดเดียวกัน ไม่ใช่เอฟเฟกต์คนละเรื่องสองอัน */
  const stages = el.querySelectorAll("[data-intro-stage]");
  const web = webSVG();
  stages.forEach((s) => {
    s.innerHTML = web +
      `<p class="intro-title" data-intro-name>zhen chong</p>
       <p class="intro-url">portfolio</p>
       <p class="intro-count" data-intro-count>000</p>`;
  });

  const counters = [...el.querySelectorAll("[data-intro-count]")];
  const names    = [...el.querySelectorAll("[data-intro-name]")];

  let torn = false;
  const tear = () => {
    if (torn) return;          // กันการเรียกซ้ำจากทั้ง timer และการกดข้าม
    torn = true;
    cancelAnimationFrame(rafId);
    el.dataset.done = "true";
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ไม่เป็นไร */ }

    // รอให้ transition จบก่อนค่อยลบออกจาก DOM
    // ถ้าลบทันทีจะเห็นจอกระพริบเพราะ element หายไปกลางคัน
    setTimeout(() => el.remove(), 850);
  };

  /* ---------- ตัวนับที่บอกความจริง ----------
     ไม่ได้นับ 0→100 ตามเวลาเฉยๆ แต่ผูกกับงานที่กำลังรออยู่จริงสองอย่าง:
     ฟอนต์โหลดเสร็จ (document.fonts.ready) กับหน้าโหลดครบ (window load)

     ทำไมต้องรอฟอนต์: ชื่อบนหน้าจอแรกสูงเกือบ 200px และตั้ง text-wrap: nowrap
     ถ้าฉากเปิดฉีกออกก่อนฟอนต์มาถึง คนดูจะเห็นชื่อด้วยฟอนต์สำรองหนึ่งจังหวะ
     แล้วมันจะกระตุกเปลี่ยนความกว้างทั้งบรรทัดตอนฟอนต์จริงมา — เป็นอาการ
     ที่เห็นชัดมากเมื่อตัวอักษรใหญ่ขนาดนี้

     MIN_MS กันไม่ให้ฉากวูบหายตอนโหลดจากแคช (ซึ่งเสร็จภายใน ~50ms)
     ส่วน MAX_MS กันไม่ให้ใครติดค้างอยู่ที่ฉากเปิดถ้าเน็ตแย่หรือฟอนต์ไม่มา */
  const MIN_MS = 1100;
  const MAX_MS = 2600;

  const started = performance.now();
  let ready = 0;      // 0→1 ตามงานที่เสร็จแล้ว
  let rafId = 0;

  const done = () => { ready = Math.min(1, ready + 0.5); };
  (document.fonts?.ready || Promise.resolve()).then(done);
  if (document.readyState === "complete") done();
  else addEventListener("load", done, { once: true });

  function tick(now) {
    const elapsed = now - started;

    /* ตัวเลขที่โชว์คือค่าที่ "ช้ากว่า" ระหว่างความคืบหน้าจริงกับเวลาขั้นต่ำ
       ถ้าโชว์ความคืบหน้าจริงล้วน ตัวเลขจะกระโดด 0→100 ในเฟรมเดียวตอนโหลดจากแคช
       ถ้าโชว์เวลาล้วน มันก็จะโกหกว่าโหลดเสร็จแล้วทั้งที่ยังไม่เสร็จ */
    const byTime = Math.min(1, elapsed / MIN_MS);
    const p = Math.min(ready, byTime);

    const shown = Math.round(p * 100);
    for (const c of counters) c.textContent = String(shown).padStart(3, "0");

    // ชื่อชัดขึ้นตามตัวนับ — เม็ดจุดหยาบ 14px ไล่ลงมาจนเหลือ 2px แล้วเป็นตัวอักษรจริง
    el.style.setProperty("--intro-p", p.toFixed(3));

    if (p >= 1 || elapsed > MAX_MS) { tear(); return; }
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  // กดที่ไหนก็ข้ามได้ — ไม่มีใครอยากดูฉากเปิดเว็บซ้ำ
  el.addEventListener("pointerdown", tear, { once: true });
  addEventListener("keydown", tear, { once: true });
  addEventListener("wheel", tear, { once: true, passive: true });
}

Object.assign(PF, { initCursor, initMagnet, initSpotlight, initIntro });
})(window.PF = window.PF || {});
