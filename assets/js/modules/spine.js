;(function (PF) {
"use strict";

/* ============================================================================
   spine.js — เส้นลายวงจร PCB ที่ขอบจอ บอกว่าอ่านมาถึงไหนแล้ว

   เส้นทองแดงลากจากบนลงล่างตามขอบซ้าย มีจุดบัดกรีคั่นตรงตำแหน่งของแต่ละ
   section พอเลื่อนผ่านจุดไหน จุดนั้นติดไฟค้างไว้ และเส้นสีสดวิ่งไล่ตามมา

   ---------------------------------------------------------------------------
   เส้นนี้เป็น "แผนที่ย่อ" ของหน้า ไม่ใช่ของตกแต่ง

   ตำแหน่งของจุดบัดกรีบนเส้นคำนวณจากตำแหน่งจริงของ section ในเอกสาร
   หารด้วยความยาวหน้าทั้งหมด จุดที่อยู่สูงกว่าจึงหมายถึงส่วนที่อยู่ต้นหน้าจริงๆ
   และระยะห่างระหว่างจุดสะท้อนความยาวของแต่ละส่วนตามจริง

   ---------------------------------------------------------------------------
   ทำไมสร้าง SVG ด้วย JS แทนที่จะเขียน path ไว้ใน HTML

   จำนวนจุดกับระยะห่างเปลี่ยนไปตามหน้า (หน้าแรกมีห้าส่วน หน้า case study ไม่มี
   สักส่วน) และเปลี่ยนอีกทุกครั้งที่ย่อ-ขยายหน้าต่าง เพราะเนื้อหาไหลใหม่
   ถ้า hardcode path ไว้ มันจะผิดตั้งแต่หน้าที่สอง

   วิธีเดียวกับ webSVG() ใน js/modules/fx.js ที่สร้างใยแมงมุมด้วยตรีโกณ
   ========================================================================= */

const NS = "http://www.w3.org/2000/svg";

/* ระยะขอบบน-ล่างของราง คิดเป็นสัดส่วนของความสูงจอ
   เว้นไว้เพื่อไม่ให้เส้นชนขอบจอพอดีจนดูเหมือนถูกตัด */
const PAD_TOP = 0.14;
const PAD_BOT = 0.12;

/* พิกัดในระบบของ viewBox ซึ่งกว้าง 40 หน่วยเท่ากับ .spine ใน CSS พอดี (1 หน่วย = 1px)
   คอลัมน์ซ้ายสุดสงวนไว้ให้ป้ายชื่อ ที่เหลือเป็นสองเลนที่เส้นสลับไปมา */
const LABEL_X = 0;   // ป้ายอยู่ซ้ายสุดเสมอ ไม่ว่าจุดจะอยู่เลนไหน จะได้เรียงเป็นคอลัมน์เดียว
const LANE_A = 16;   // เลนซ้าย — ห่างจากป้าย 9 หน่วย พอให้ตัวอักษรไม่ชนวงแหวน
const LANE_B = 34;   // เลนขวา — สลับเลนทุกจุดเพื่อให้เส้นหักมุมแบบลายวงจรจริง
const JOG    = Math.abs(LANE_B - LANE_A);

/* ---------- ต่อ path จากจุดหนึ่งไปอีกจุด ----------
   ลายวงจรจริงไม่หักมุมฉาก 90° เพราะมุมแหลมทำให้น้ำยากัดกรดค้างแล้วเซาะเส้นขาด
   ช่างจึงใช้มุม 45° เสมอ — ที่นี่ทำตามเพราะมันคือเหตุผลที่ลาย PCB หน้าตาแบบนั้น
   ไม่ใช่แค่สไตล์ที่เลือกมาลอย ๆ

   เส้นทแยง 45° ต้องมี dx เท่ากับ dy จึงยกหัวขึ้นก่อนเท่าระยะเปลี่ยนเลนพอดี */
function segment(x, nextX, y) {
  if (x === nextX) return `L ${x} ${y.toFixed(1)}`;
  return `L ${x} ${(y - JOG).toFixed(1)} L ${nextX} ${y.toFixed(1)}`;
}

function initSpine(host) {
  if (!host) return;

  /* หน้าที่สั้นกว่าหนึ่งจอครึ่งไม่มีอะไรให้ติดตาม — 404 กับหน้าจอใหญ่มากๆ
     เส้นบอกความคืบหน้าที่เต็มตลอดเวลาตั้งแต่วินาทีแรกคือเส้นที่ไม่ได้บอกอะไร */
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  if (maxScroll() < innerHeight * 0.5) return;

  /* ---------- หาว่าอะไรควรเป็นจุดบัดกรี ----------
     ทางแรก: section ที่มี id เพราะ id คือสัญญาณว่าส่วนนั้น "มีตัวตนพอที่จะ
     ลิงก์ถึงได้" ซึ่งตรงกับนิยามของส่วนที่ควรมีหมุดบนแผนที่ (หน้าแรก · about)

     ทางสอง: หัวข้อ h2 ในเนื้อหา case study
     หน้า case study ทั้งหกไม่มี section ที่มี id เลย เพราะเนื้อหาทั้งหน้าถูก
     สร้างจาก projects.js เป็นก้อนเดียว ถ้าใช้แต่ทางแรก เจ็ดในสิบหน้าจะได้
     เส้นตรงเปล่าๆ ที่ไม่มีจุดสักจุด ซึ่งเสียประโยชน์หลักของเส้นนี้ไป
     (หัวข้อพวกนั้นคือ "โจทย์ · สิ่งที่ทำ · ผลลัพธ์ · สิ่งที่ได้เรียนรู้"
     ซึ่งเป็นโครงเรื่องของหน้าจริงๆ จึงเป็นหมุดที่ถูกต้องอยู่แล้ว) */
  let marks = [...document.querySelectorAll("main section[id], main [id]")]
    .filter((el) => el.matches("section, .reel"));

  if (!marks.length) {
    marks = [...document.querySelectorAll(".case-body > h2")];
  }

  let raf = 0, queued = false;

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  host.append(svg);

  const pads = [];

  function build() {
    const h = innerHeight;
    const top = h * PAD_TOP;
    const bot = h * (1 - PAD_BOT);
    const max = Math.max(1, maxScroll());

    svg.setAttribute("viewBox", `0 0 40 ${h}`);
    svg.replaceChildren();
    pads.length = 0;

    /* ตำแหน่งจุดบนราง = ตำแหน่งจริงในเอกสาร ย่อส่วนลงมาให้พอดีราง
       เรียงแล้วกรองจุดที่ชิดกันเกินไปทิ้ง ไม่งั้นสองจุดจะทับกันจนดูเป็นรอยเปื้อน */
    const nodes = [];
    for (const el of marks) {
      const y = top + Math.min(1, PF.docTop(el) / max) * (bot - top);
      if (nodes.length && y - nodes[nodes.length - 1].y < 26) continue;
      nodes.push({ y, label: el.dataset.spineLabel || "" });
    }

    // ต่อเส้น: ไล่จากบนลงล่าง สลับเลนทีละจุด
    let d = `M ${LANE_A} ${top.toFixed(1)}`;
    let lane = LANE_A;
    nodes.forEach((n, i) => {
      const next = i % 2 === 0 ? LANE_B : LANE_A;
      d += ` ${segment(lane, next, n.y)}`;
      n.x = next;
      lane = next;
    });
    d += ` L ${lane} ${bot.toFixed(1)}`;

    const trace = document.createElementNS(NS, "path");
    trace.setAttribute("class", "spine-trace");
    trace.setAttribute("d", d);

    const liveLine = document.createElementNS(NS, "path");
    liveLine.setAttribute("class", "spine-live");
    liveLine.setAttribute("d", d);
    /* pathLength="1" ทำให้ stroke-dasharray:1 ใน CSS ใช้ได้กับเส้นความยาวเท่าไหร่ก็ได้
       โดยไม่ต้องเรียก getTotalLength() ซึ่งบังคับให้คำนวณ layout ใหม่ทุกครั้งที่ย่อจอ
       (เทคนิคเดียวกับใยแมงมุมใน fx.js) */
    liveLine.setAttribute("pathLength", "1");

    svg.append(trace, liveLine);

    for (const n of nodes) {
      const pad = document.createElementNS(NS, "circle");
      pad.setAttribute("class", "spine-pad");
      pad.setAttribute("cx", n.x);
      pad.setAttribute("cy", n.y.toFixed(1));
      pad.setAttribute("r", "4.5");

      const glow = document.createElementNS(NS, "circle");
      glow.setAttribute("class", "spine-glow");
      glow.setAttribute("cx", n.x);
      glow.setAttribute("cy", n.y.toFixed(1));
      glow.setAttribute("r", "1.8");

      svg.append(pad, glow);

      /* ป้ายชื่อเขียนเฉพาะส่วนที่ระบุ data-spine-label ไว้เอง ไม่ได้ดึงจากหัวข้อ
         เพราะหัวข้อในเว็บนี้เป็นภาษาไทย ส่วนป้ายบนแผ่นปริ๊นต์ใช้ฟอนต์ mono
         ซึ่งไม่มีสระไทย ตัวอักษรจะตกไปฟอนต์สำรองแล้วความสูงบรรทัดเพี้ยนทั้งแถว */
      if (n.label) {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("class", "spine-label");
        t.setAttribute("x", "0");
        t.setAttribute("y", "0");
        /* เขียนตั้งฉาก ไล่ขึ้น เหมือนซิลค์สกรีนข้างแถวขาชิปบนบอร์ดจริง

           x ตรึงไว้ที่ LABEL_X ไม่ได้อิงตำแหน่งจุด เพราะจุดสลับเลนไปมา
           ถ้าผูกป้ายไว้กับจุด ป้ายจะเต้นซ้าย-ขวาตามไปด้วยจนอ่านเป็นคอลัมน์ไม่ได้
           และป้ายของจุดเลนซ้ายจะทับวงแหวนของตัวเอง */
        t.setAttribute("transform", `translate(${LABEL_X} ${(n.y - 10).toFixed(1)}) rotate(-90)`);
        t.setAttribute("text-anchor", "end");
        t.textContent = n.label;
        svg.append(t);
      }

      pads.push({ pad, y: n.y, top, bot });
    }
  }

  function apply() {
    queued = false;
    const max = Math.max(1, maxScroll());
    const p = Math.min(1, scrollY / max);

    host.style.setProperty("--pcb-p", p.toFixed(4));

    // จุดติดไฟเมื่อเส้นสีสดวิ่งผ่านมันไปแล้ว
    for (const it of pads) {
      const at = (it.y - it.top) / (it.bot - it.top);
      it.pad.dataset.lit = String(p >= at - 0.005);
    }
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    raf = requestAnimationFrame(apply);
  }

  addEventListener("scroll", onScroll, { passive: true });

  /* ความสูงเอกสารเปลี่ยนได้โดยที่หน้าต่างไม่ได้เปลี่ยนขนาด — เนื้อหาที่ reveal
     โผล่มา แท็บที่สลับ ฟอนต์ที่เพิ่งโหลดเสร็จ ทั้งหมดขยับตำแหน่งของทุก section
     (เหตุผลเดียวกับที่ scenes.js สังเกต body ไม่ใช่ window.resize) */
  new ResizeObserver(() => { build(); apply(); }).observe(document.body);

  build();
  apply();
}

Object.assign(PF, { initSpine });
})(window.PF = window.PF || {});
