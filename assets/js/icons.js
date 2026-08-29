;(function (PF) {
"use strict";

/* ============================================================================
   icons.js — ไอคอนทั้งหมดของเว็บเป็นสตริง SVG

   ทำไมไม่ใช้ไฟล์ .svg แยกหรือ icon font
   - ไฟล์แยก = คำขอเครือข่ายเพิ่มอีกหลายสิบครั้ง และเว็บนี้ต้องเปิดจาก file:// ได้
   - icon font = ไม่รองรับหลายสี และอ่านไม่ออกถ้าฟอนต์โหลดไม่ทัน
   - สตริงในไฟล์เดียวจึงเป็นทางที่เร็วที่สุดและพังยากที่สุด

   ทุกไอคอนใช้ currentColor เสมอ สีจึงมาจาก CSS ของที่ที่มันไปวางอยู่
   viewBox เป็น 24x24 ทั้งหมด จะได้สลับกันได้โดยไม่ต้องแก้ขนาด
   ========================================================================= */

const S = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

/* ป้ายสี่เหลี่ยมมนที่มีตัวอักษรอยู่ข้างใน — ใช้กับโลโก้เครื่องมือ Adobe และภาษาโปรแกรม
   วิธีนี้ทำให้ไอคอนทุกตัวมีน้ำหนักเส้นเท่ากัน ไม่มีตัวไหนหนักกว่าเพื่อน
   ซึ่งเป็นปัญหาที่เกิดเสมอเวลาเอาโลโก้จริงจากหลายแบรนด์มาวางเรียงกัน */
const Tile = (text, size = 8.5) => S(
  `<rect x="2.5" y="2.5" width="19" height="19" rx="4.5"/>
   <text x="12" y="12" font-family="ui-monospace,monospace" font-size="${size}"
         font-weight="600" fill="currentColor" stroke="none"
         text-anchor="middle" dominant-baseline="central">${text}</text>`
);

const ICONS = {
  /* ---------- ส่วนติดต่อผู้ใช้ ---------- */
  search:      S(`<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`),
  command:     S(`<path d="M15 6a3 3 0 1 1 3 3h-3V6ZM9 6a3 3 0 1 0-3 3h3V6ZM9 18a3 3 0 1 1-3-3h3v3ZM15 18a3 3 0 1 0 3-3h-3v3ZM9 9h6v6H9z"/>`),
  arrowRight:  S(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  arrowLeft:   S(`<path d="M19 12H5M11 18l-6-6 6-6"/>`),
  arrowUpRight:S(`<path d="M7 17 17 7M9 7h8v8"/>`),
  arrowDown:   S(`<path d="M12 5v14M6 13l6 6 6-6"/>`),
  chevronRight:S(`<path d="m9 6 6 6-6 6"/>`),
  check:       S(`<path d="m4 12.5 5 5L20 7"/>`),
  copy:        S(`<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>`),
  close:       S(`<path d="M6 6l12 12M18 6 6 18"/>`),
  external:    S(`<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19V7.8A1.8 1.8 0 0 1 5.8 6H10"/>`),
  enter:       S(`<path d="M20 6v5a3 3 0 0 1-3 3H4"/><path d="m8 10-4 4 4 4"/>`),
  esc:         S(`<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 12h8"/>`),
  moon:        S(`<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>`),
  sun:         S(`<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
  sparkles:    S(`<path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z"/><path d="M18.5 15.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/>`),
  play:        S(`<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>`),
  expand:      S(`<path d="M9 4H4v5M15 20h5v-5M20 9V4h-5M4 15v5h5"/>`),
  send:        S(`<path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z"/>`),
  grid:        S(`<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>`),
  user:        S(`<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>`),
  home:        S(`<path d="m3.5 10.5 8.5-7 8.5 7"/><path d="M6 9.5V20h12V9.5"/>`),

  /* ---------- ใช้กับการ์ดสถิติ ---------- */
  frames:      S(`<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M7 5v14M17 5v14M2.5 12h19M2.5 8.5h4.5M2.5 15.5h4.5M17 8.5h4.5M17 15.5h4.5"/>`),
  folder:      S(`<path d="M3 7.5A2 2 0 0 1 5 5.5h3.6a2 2 0 0 1 1.5.7l1 1.2H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z"/>`),
  code:        S(`<path d="m8.5 8-4.5 4 4.5 4M15.5 8l4.5 4-4.5 4M13.5 5l-3 14"/>`),
  layers:      S(`<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3.5 12.5 8.5 4.7 8.5-4.7"/><path d="m3.5 16.5 8.5 4.7 8.5-4.7"/>`),
  clock:       S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`),
  pen:         S(`<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/>`),
  mail:        S(`<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>`),

  /* ---------- โซเชียล ---------- */
  github:      S(`<path d="M9 19c-4.5 1.4-4.5-2.3-6.3-2.8M15.5 21v-3.4a2.9 2.9 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6.2 0C6.8 2.6 5.8 2.9 5.8 2.9a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.4 9.3c0 4.6 2.8 5.7 5.5 6a2.9 2.9 0 0 0-.8 2.3V21"/>`),
  instagram:   S(`<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>`),
  youtube:     S(`<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.2 9.4v5.2l4.6-2.6-4.6-2.6Z" fill="currentColor" stroke="none"/>`),
  tiktok:      S(`<path d="M14.2 3v10.6a3.4 3.4 0 1 1-3.4-3.4"/><path d="M14.2 3c.4 2.5 2 4.2 4.6 4.4"/>`),
  linkedin:    S(`<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7.5 10.5V17M7.5 7.4v.1M11.5 17v-3.8a2.2 2.2 0 0 1 4.4 0V17"/>`),

  /* ---------- เครื่องมือ ---------- */
  ae:    Tile("Ae"),
  an:    Tile("An"),
  ps:    Tile("Ps"),
  ts:    Tile("TS"),
  js:    Tile("JS"),
  py:    Tile("Py"),
  c:     Tile("C", 10),
  html:  Tile("5"),
  css:   Tile("3"),
  git:   S(`<circle cx="6" cy="6.5" r="2.5"/><circle cx="6" cy="17.5" r="2.5"/><circle cx="17" cy="12" r="2.5"/><path d="M6 9v6M8.5 6.5H13a1.5 1.5 0 0 1 1.5 1.5v2"/>`),
  react: S(`<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9.5" ry="3.7"/><ellipse cx="12" cy="12" rx="9.5" ry="3.7" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.7" transform="rotate(120 12 12)"/>`),
  vite:  S(`<path d="m3.5 5 8.5 15.5L20.5 5 12 7.5 3.5 5Z"/><path d="M12.6 8.5 10.8 13h2.4l-1.4 4"/>`),
  figma: S(`<path d="M9 3h3v6H9a3 3 0 0 1 0-6ZM12 3h3a3 3 0 0 1 0 6h-3V3ZM9 9h3v6H9a3 3 0 0 1 0-6ZM9 15h3v3a3 3 0 1 1-3-3Z"/><circle cx="15" cy="12" r="3"/>`),
  unity: S(`<path d="m12 2.8 8 4.6v9.2l-8 4.6-8-4.6V7.4l8-4.6Z"/><path d="m12 7.6 4 6.9H8l4-6.9Z"/>`),
  tailwind: S(`<path d="M7 10c.7-2.7 2.3-4 5-4 4 0 4.5 3 6.5 3.5 1.3.3 2.5-.2 3.5-1.5-.7 2.7-2.3 4-5 4-4 0-4.5-3-6.5-3.5C9.2 8.2 8 8.7 7 10Z"/><path d="M2 16c.7-2.7 2.3-4 5-4 4 0 4.5 3 6.5 3.5 1.3.3 2.5-.2 3.5-1.5-.7 2.7-2.3 4-5 4-4 0-4.5-3-6.5-3.5C4.2 14.2 3 14.7 2 16Z"/>`),

  /* ---------- ทักษะสายฮาร์ดแวร์และ AI ----------
     วาดเป็นสัญลักษณ์ทั่วไป ไม่ใช่โลโก้แบรนด์ เพราะ "AI" กับ "Robotics"
     ไม่ได้เป็นของบริษัทไหน และการหยิบโลโก้ Arduino ตัวจริงมาใช้จะทำให้
     น้ำหนักเส้นไม่เท่าไอคอนตัวอื่นในกริดเดียวกัน */
  ai:      S(`<rect x="4.5" y="4.5" width="15" height="15" rx="4"/><circle cx="9.5" cy="10.5" r="1.3"/><circle cx="14.5" cy="10.5" r="1.3"/><path d="M9.5 15h5"/><path d="M12 4.5V2M12 22v-2.5M4.5 9.5H2M22 9.5h-2.5M4.5 14.5H2M22 14.5h-2.5"/>`),
  arduino: S(`<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M6.5 12h3M8 10.5v3"/><path d="M14.5 12h3"/>`),
  robot:   S(`<path d="M5 20v-4.5a3 3 0 0 1 3-3h1"/><rect x="8.5" y="4" width="7" height="8.5" rx="2"/><path d="M15.5 8h2.2a2 2 0 0 1 2 2V20"/><circle cx="5" cy="20.5" r="1.6"/><circle cx="19.7" cy="20.5" r="1.6"/>`),

  /* Game Dev ใช้จอยเกมทั่วไป ไม่ใช่โลโก้ Unity/Godot ด้วยเหตุผลเดียวกับ AI ข้างบน —
     เจ้าของเว็บระบุทักษะไว้ว่า "game dev" เฉยๆ ไม่ได้ระบุเอนจิน การหยิบโลโก้เอนจิน
     มาใช้จะกลายเป็นการอ้างเครื่องมือที่เขาไม่ได้บอกว่าใช้ (จุดสองจุดวาดด้วย h.01
     อาศัย stroke-linecap: round ที่ตั้งไว้ใน S() ทำให้ได้จุดกลมพอดี) */
  gamepad: S(`<rect x="2" y="7.5" width="20" height="11" rx="5"/><path d="M7 11.5v3.5M5.25 13.25h3.5"/><path d="M15.8 12.4h.01M18.3 14.6h.01"/>`),
  chart:   S(`<path d="M3.5 20.5h17"/><path d="M6.5 20.5V13M11 20.5V7.5M15.5 20.5v-5M20 20.5V10"/>`),
  trophy:  S(`<path d="M7.5 3.5h9v5a4.5 4.5 0 0 1-9 0v-5Z"/><path d="M7.5 5.5H5A2 2 0 0 0 5 9.5h2.5M16.5 5.5H19a2 2 0 0 1 0 4h-2.5"/><path d="M12 13v3.5M8.5 20.5h7M9.5 20.5c0-2 1-4 2.5-4s2.5 2 2.5 4"/>`),
  medal:   S(`<circle cx="12" cy="15" r="5.5"/><path d="M12 12.6l.85 1.75 1.9.28-1.38 1.35.33 1.9L12 16.98l-1.7.9.33-1.9-1.38-1.35 1.9-.28L12 12.6Z"/><path d="M8.5 9.6 6 2.5h4.2L12 6.6M15.5 9.6 18 2.5h-4.2"/>`),
};

/* คืนสตริง SVG พร้อมใช้ — ถ้าไม่รู้จักชื่อจะคืนสตริงว่างแทนที่จะโยน error
   เพราะไอคอนหายหนึ่งตัวไม่ควรทำให้ทั้งหน้าพัง */
function icon(name, extra = "") {
  const svg = ICONS[name];
  if (!svg) return "";
  return extra ? svg.replace("<svg ", `<svg ${extra} `) : svg;
}

Object.assign(PF, { ICONS, icon });
})(window.PF = window.PF || {});
