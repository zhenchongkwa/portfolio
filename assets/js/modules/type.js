;(function (PF) {
"use strict";

/* ============================================================================
   type.js — ข้อความเผยทีละบรรทัด (line-mask) + สลับตัวอักษรมั่วก่อนลงตัว (scramble)

   ทั้งสองอย่างเป็นเอฟเฟกต์ที่เห็นในเว็บอย่าง noth.in
   ต่างกันตรงที่นี่ต้องรองรับภาษาไทยด้วย ซึ่งเปลี่ยนวิธีทำไปคนละเรื่อง

   ---------------------------------------------------------------------------
   ทำไมใช้ Intl.Segmenter ไม่ใช่ split(" ")

   เว็บฝรั่งตัดคำด้วยช่องว่างได้เพราะภาษาอังกฤษเขียนแยกคำ แต่ภาษาไทยเขียนติดกัน
   ทั้งประโยค — "สามอย่างที่ยึดเสมอ" ไม่มีช่องว่างสักตัว ถ้าใช้ split(" ")
   จะได้ก้อนเดียวยาวทั้งบรรทัด แล้วเอฟเฟกต์แยกบรรทัดก็ไม่เกิดอะไรขึ้นเลย

   ทางที่แย่กว่าคือตัดทีละตัวอักษรด้วย split("") — สระกับวรรณยุกต์ไทยเป็น
   code unit แยกที่ต้องเกาะพยัญชนะข้างหน้า พอถูกแยกใส่ span คนละอัน
   เบราว์เซอร์จะวาดมันลอยเดี่ยวๆ ข้อความจะเพี้ยนอ่านไม่ออกทันที

   Intl.Segmenter แก้ทั้งสองปัญหา:
     granularity "word"     → ตัดคำไทยด้วยพจนานุกรม และตัดอังกฤษด้วยช่องว่าง
     granularity "grapheme" → รวมพยัญชนะ+สระ+วรรณยุกต์เป็นหน่วยเดียวเสมอ

   รองรับ Chrome/Edge 87+, Safari 14.1+, Firefox 125+
   ถ้าไม่มี → ถอยไปเผยทั้งก้อนแทนการแยกบรรทัด ยังสวยอยู่ ไม่มีทางเห็นหน้าว่าง
   ========================================================================= */

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const seg = (granularity) => {
  try { return new Intl.Segmenter("th", { granularity }); }
  catch { return null; }   // เบราว์เซอร์เก่า — ผู้เรียกต้องมีทางถอยเสมอ
};

const words    = seg("word");
const graphemes = seg("grapheme");

const toWords = (s) =>
  words ? [...words.segment(s)].map((x) => x.segment) : s.split(/(\s+)/);

const toGraphemes = (s) =>
  graphemes ? [...graphemes.segment(s)].map((x) => x.segment) : [...s];

/* ============================================================================
   เผยทีละบรรทัด

   ขั้นตอน: แตกเป็นคำ → วัดว่าคำไหนอยู่บรรทัดเดียวกัน → ห่อแต่ละบรรทัดด้วยหน้ากาก

   ที่ต้อง "วัด" เพราะเราไม่มีทางรู้ล่วงหน้าว่าเบราว์เซอร์จะตัดบรรทัดตรงไหน
   มันขึ้นกับความกว้างจริง ขนาดฟอนต์ที่โหลดได้ และภาษา — คำนวณเองไม่มีวันตรง
   วิธีเดียวที่แม่นคือใส่ลงหน้าจริงแล้วอ่าน offsetTop ของแต่ละคำ
   ========================================================================= */

function splitOne(el) {
  // เก็บต้นฉบับไว้ครั้งแรก เพราะตอน resize ต้องรื้อกลับมาเริ่มใหม่จากศูนย์
  if (!el.dataset.splitSrc) el.dataset.splitSrc = el.innerHTML;
  el.innerHTML = el.dataset.splitSrc;

  /* กรณีที่มี element ลูกอยู่แล้ว (เช่น h1 ของ hero ที่แบ่งเป็นสอง span)
     ไม่แตะข้างใน — ถือว่าลูกแต่ละตัวคือหนึ่งบรรทัดตามที่คนเขียน HTML ตั้งใจ
     ถ้าไปรื้อแตกคำ จะทำ class กับสีของลูกหายหมด */
  const kids = [...el.children];
  if (kids.length) {
    kids.forEach((k, i) => wrapLine(k, i));
    return;
  }

  const text = el.textContent;
  if (!text.trim()) return;

  // ---------- วางคำลงหน้าจริงเพื่อวัดตำแหน่ง ----------
  el.textContent = "";
  const spans = [];
  for (const w of toWords(text)) {
    if (w === "") continue;
    const s = document.createElement("span");
    s.className = "w";
    s.textContent = w;
    el.append(s);
    spans.push(s);
  }
  if (!spans.length) return;

  /* ---------- จัดกลุ่มตาม offsetTop ----------
     คำที่ขอบบนอยู่ระดับเดียวกันคือบรรทัดเดียวกัน
     เผื่อคลาดเคลื่อน 2px เพราะคำที่มีสระบน/ล่างต่างกันอาจสูงไม่เท่ากันเป๊ะ */
  const lines = [];
  let cur = null, top = null;
  for (const s of spans) {
    const t = s.offsetTop;
    if (top === null || Math.abs(t - top) > 2) { cur = []; lines.push(cur); top = t; }
    cur.push(s);
  }

  // ---------- ประกอบใหม่เป็นบรรทัดที่มีหน้ากาก ----------
  el.textContent = "";
  lines.forEach((group, i) => {
    const line = document.createElement("span");
    line.className = "line";
    const inner = document.createElement("span");
    inner.className = "line-i";
    inner.style.setProperty("--i", String(i));
    group.forEach((s) => inner.append(document.createTextNode(s.textContent)));
    line.append(inner);
    el.append(line);
  });
}

/* ห่อ element เดิมด้วยหน้ากากโดยไม่แตะเนื้อข้างใน */
function wrapLine(node, i) {
  const line = document.createElement("span");
  line.className = "line";
  node.replaceWith(line);
  const inner = document.createElement("span");
  inner.className = "line-i";
  inner.style.setProperty("--i", String(i));
  inner.append(node);
  line.append(inner);
}

function initSplitLines(root = document) {
  const els = [...root.querySelectorAll("[data-split]")];
  if (!els.length) return;

  /* เบราว์เซอร์ที่ไม่มี Intl.Segmenter หรือผู้ใช้ปิดแอนิเมชัน
     → ไม่ต้องแยกบรรทัด แค่ทำเครื่องหมายว่า "เผยแล้ว" ให้ CSS แสดงตามปกติ
     ห้าม return เฉยๆ ไม่งั้นข้อความจะถูก CSS ซ่อนไว้ตลอดกาล */
  if (!words || reduced()) {
    els.forEach((el) => (el.dataset.splitIn = "true"));
    return;
  }

  els.forEach(splitOne);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.dataset.splitIn = "true";
      io.unobserve(e.target);      // เล่นครั้งเดียว การเฝ้าต่อคือการเปลืองเปล่า
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });

  els.forEach((el) => io.observe(el));

  /* ---------- คำนวณบรรทัดใหม่ตอนจอเปลี่ยนขนาด ----------
     ความกว้างเปลี่ยน = จุดตัดบรรทัดเปลี่ยน ถ้าไม่คำนวณใหม่ หน้ากากจะไปคร่อม
     กลางบรรทัดแล้วตัดตัวหนังสือหายครึ่งตัว

     debounce เพราะการลากขอบหน้าต่างยิง event ได้เป็นร้อยครั้ง และ splitOne
     อ่าน offsetTop ซึ่งบังคับให้เบราว์เซอร์คำนวณ layout ใหม่ทุกครั้ง */
  let t = 0;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      els.forEach((el) => {
        const wasIn = el.dataset.splitIn === "true";
        splitOne(el);
        // ที่เผยไปแล้วต้องคงสถานะไว้ ไม่งั้นข้อความจะหายตอนหมุนจอ
        if (wasIn) el.dataset.splitIn = "true";
      });
    }, 180);
  }, { passive: true });
}

/* ============================================================================
   สลับตัวอักษรมั่วก่อนลงตัว (scramble)

   ตัวอักษรค่อยๆ "ลงตัว" จากซ้ายไปขวา ตัวที่ยังไม่ลงตัวจะสุ่มเปลี่ยนไปเรื่อยๆ

   ใช้ grapheme ไม่ใช่ตัวอักษรดิบ ด้วยเหตุผลเดียวกับหัวไฟล์:
   ถ้าสุ่มทับ code unit ตรงๆ สระไทยจะหลุดจากพยัญชนะแล้วขึ้นตัวประหลาด

   ชุดตัวสุ่มต้องเข้ากับภาษาของตัวจริง — สุ่มตัวไทยไปแทนที่ตัวอังกฤษจะดูเหมือน
   ฟอนต์พังมากกว่าดูเหมือนสัญญาณรบกวน จึงเลือกชุดตามอักขระเป้าหมายทีละตัว
   ========================================================================= */

const POOL_LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*/<>";
const POOL_THAI  = "กขคงจฉชซญฐณดตถทธนบปผพฟภมยรลวศษสหอฮ";
const isThai = (c) => /[฀-๿]/.test(c);

const pick = (pool) => pool[(Math.random() * pool.length) | 0];

function scrambleOne(el) {
  if (!el.dataset.scrambleSrc) el.dataset.scrambleSrc = el.textContent;
  const target = toGraphemes(el.dataset.scrambleSrc);
  const n = target.length;

  const STEP = 46;      // ms ต่อการสุ่มหนึ่งครั้ง — ถี่กว่านี้ตาอ่านไม่ทัน กลายเป็นเบลอ
  const PER  = 2.4;     // จำนวนสเต็ปที่ต้องผ่านก่อนตัวถัดไปจะลงตัว
  let frame = 0;
  let timer = 0;

  const tick = () => {
    let out = "";
    let done = 0;
    for (let i = 0; i < n; i++) {
      const ch = target[i];
      // ช่องว่างลงตัวทันที ไม่ต้องสุ่ม ไม่งั้นคำจะเต้นไปมาเพราะความกว้างเปลี่ยน
      if (frame > i * PER || !ch.trim()) { out += ch; done++; }
      else out += pick(isThai(ch) ? POOL_THAI : POOL_LATIN);
    }
    el.textContent = out;
    frame++;
    if (done < n) timer = setTimeout(tick, STEP);
  };

  // คืนฟังก์ชันหยุด เผื่อ element หลุดจากจอกลางคัน จะได้ไม่ปล่อย timer ค้าง
  tick();
  return () => clearTimeout(timer);
}

function initScramble(root = document) {
  const els = [...root.querySelectorAll("[data-scramble]")];
  if (!els.length) return;

  if (reduced()) return;   // ข้อความจริงอยู่ใน DOM อยู่แล้ว ไม่ต้องทำอะไรเลย

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      scrambleOne(e.target);
      io.unobserve(e.target);
    }
  }, { threshold: 0.6 });

  els.forEach((el) => io.observe(el));
}

Object.assign(PF, { initSplitLines, initScramble });
})(window.PF = window.PF || {});
