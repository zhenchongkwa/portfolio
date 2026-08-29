;(function (PF) {
"use strict";

/* ============================================================================
   media.js — วาดภาพแทนที่ให้อัตโนมัติเมื่อไฟล์จริงยังไม่มี

   ปัญหาที่แก้: เจ้าของพอร์ตจะอัปโหลดรูปเองทีหลัง แต่ถ้าปล่อยให้ <img> ที่หา
   ไฟล์ไม่เจอแสดงไอคอนรูปแตกของเบราว์เซอร์ ทั้งหน้าจะดูเหมือนเว็บพัง
   ทั้งที่จริงแค่ยังไม่ได้ใส่รูป

   วิธีแก้: ดักเหตุการณ์ error แล้ววาด SVG แทนที่ซึ่งใช้สีและฟอนต์ชุดเดียวกับเว็บ
   ผลคือช่องว่างดูเหมือน "ตั้งใจให้เป็นแบบนี้" ไม่ใช่ "พัง"

   พอวางไฟล์จริงทับตามชื่อใน assets/img/ ภาพแทนที่จะหายไปเองโดยไม่ต้องแก้โค้ด
   ========================================================================= */

/* สีตรงกับ tokens.css — ต้องเขียนซ้ำที่นี่เพราะ SVG ใน data URI
   อ่าน CSS custom property ของหน้าไม่ได้ (มันเป็นเอกสารแยกใบ)
   ถ้าแก้พาเลตใน tokens.css อย่าลืมแก้สามค่านี้ตาม */
const IMG_BG    = "#0b0c0e";
const IMG_LINE  = "#1d1f23";
const IMG_INK   = "#3a3d43";

/**
 * สร้าง data URI ของภาพแทนที่
 * @param {string} label  ข้อความกลางภาพ — ปกติคือชื่อผลงาน
 * @param {number} w      ความกว้างของ viewBox (สัดส่วนเท่านั้น ไม่ใช่ px จริง)
 * @param {number} h
 */
function placeholder(label = "", w = 1600, h = 1000) {
  // ตัวอักษรต้อง escape ก่อน ไม่งั้นชื่อที่มี & หรือ < จะทำให้ SVG พังทั้งไฟล์
  const safe = String(label)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ขนาดตัวอักษรอิงด้านที่สั้นกว่า จะได้ไม่ล้นกรอบในภาพแนวตั้งแคบๆ
  const fs = Math.round(Math.min(w, h) * 0.055);
  const gap = Math.round(Math.min(w, h) * 0.06);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#101115"/>
    <stop offset="1" stop-color="${IMG_BG}"/>
  </linearGradient>
  <pattern id="p" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="${gap}" stroke="${IMG_LINE}" stroke-width="1"/>
  </pattern>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect width="${w}" height="${h}" fill="url(#p)" opacity=".5"/>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${IMG_LINE}"/>
<text x="50%" y="50%" fill="${IMG_INK}" font-family="ui-monospace,SFMono-Regular,Consolas,monospace"
      font-size="${fs}" letter-spacing="${fs * 0.14}" text-anchor="middle" dominant-baseline="central"
      >${safe.toUpperCase()}</text>
</svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* แปลง "16/10" เป็น [1600, 1000] เพื่อให้ภาพแทนที่มีสัดส่วนตรงกับช่องที่มันไปอยู่
   ถ้าเขียนสัดส่วนผิดรูปแบบจะคืนค่า 16/10 ซึ่งเป็นสัดส่วนที่ใช้บ่อยที่สุดในเว็บนี้ */
function ratioToBox(ratio) {
  const m = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(String(ratio || ""));
  if (!m) return [1600, 1000];
  const rw = parseFloat(m[1]), rh = parseFloat(m[2]);
  const scale = 1200 / Math.max(rw, rh);
  return [Math.round(rw * scale), Math.round(rh * scale)];
}

/**
 * ผูกตัวดักพลาดให้ <img> หนึ่งตัว
 * ต้องเรียกก่อนที่ src จะโหลดเสร็จ ไม่งั้นจะพลาด event error ที่ยิงไปแล้ว
 */
function guard(img) {
  if (!img || img.dataset.guarded === "true") return;
  img.dataset.guarded = "true";

  const swap = () => {
    // กันลูปไม่รู้จบ: ถ้าภาพแทนที่เองก็ error (เป็นไปไม่ได้ แต่กันไว้) จะไม่วนซ้ำ
    if (img.dataset.placeheld === "true") return;
    img.dataset.placeheld = "true";
    const [w, h] = ratioToBox(img.dataset.ratio);
    img.src = placeholder(img.dataset.label || img.alt || "", w, h);
  };

  img.addEventListener("error", swap, { once: true });

  // ถ้ารูปโหลดเสร็จไปแล้วก่อนที่เราจะมาผูก event ให้เช็คย้อนหลัง
  // naturalWidth เป็น 0 แปลว่าโหลดไม่สำเร็จ
  if (img.complete && img.naturalWidth === 0) swap();
}

/** ผูกให้ทุกภาพในหน้า รวมถึงภาพที่เพิ่งถูกสร้างโดย render.js */
function guardAll(root = document) {
  root.querySelectorAll("img").forEach(guard);

  // <video> ที่ยังไม่มีไฟล์ — ซ่อนตัววิดีโอแล้วโชว์ poster แทน
  root.querySelectorAll("video").forEach((v) => {
    if (v.dataset.guarded === "true") return;
    v.dataset.guarded = "true";
    v.addEventListener("error", () => {
      const [w, h] = ratioToBox(v.dataset.ratio || "16/10");
      const img = document.createElement("img");
      img.src = placeholder(v.dataset.label || "", w, h);
      img.alt = v.dataset.label || "";
      img.loading = "lazy";
      v.replaceWith(img);
    }, { once: true });
  }, true);
}

Object.assign(PF, { placeholder, guard, guardAll });
})(window.PF = window.PF || {});
