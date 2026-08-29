;(function (PF) {
"use strict";
const { PROJECTS, SITE, KIND_LABEL, icon } = PF;

/* ============================================================================
   palette.js — Command palette (⌘K) + คีย์ลัดทั้งเว็บ

   ทำไมต้องมี: เว็บพอร์ตส่วนใหญ่ต้องเลื่อนหาผลงาน ตัวนี้ทำให้พิมพ์ชื่อแล้วกด Enter
   ไปถึงเลย — เป็นฟีเจอร์ที่ Linear ทำให้เป็นมาตรฐานของเครื่องมือยุคนี้

   ใช้ <dialog> จริง เพราะได้ของพวกนี้มาฟรีจากเบราว์เซอร์และถูกต้องตามมาตรฐาน:
   focus trap · ปิดด้วย Esc · ::backdrop · inert เนื้อหาข้างหลัง
   ถ้าเขียนเองด้วย div จะต้องทำสี่อย่างนี้เองทั้งหมด และมักทำได้ไม่ครบ
   ========================================================================= */


/* คะแนนความเข้ากันแบบ subsequence — ตัวอักษรที่พิมพ์ต้องปรากฏ "ตามลำดับ"
   ในข้อความเป้าหมาย แต่ไม่จำเป็นต้องติดกัน เช่น "eos" เจอ "Eye of Star"

   ให้คะแนนพิเศษเมื่อตัวอักษรอยู่ต้นคำ เพราะคนมักพิมพ์อักษรย่อของคำ
   คืน -1 ถ้าไม่เข้าเลย ซึ่งต่างจาก 0 (เข้าแต่คะแนนต่ำ) */
function score(query, text) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let qi = 0, hits = 0, streak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) { streak = 0; continue; }
    const atWordStart = ti === 0 || /[\s\-_/·]/.test(t[ti - 1]);
    hits += 1 + (atWordStart ? 3 : 0) + streak;
    streak += 1;
    qi++;
  }
  if (qi < q.length) return -1;
  // ข้อความสั้นที่เข้าครบควรมาก่อนข้อความยาวที่เข้าครบเหมือนกัน
  return hits - t.length * 0.02;
}

function initPalette(dialog, opener) {
  if (!dialog) return () => {};

  const input = dialog.querySelector("[data-palette-input]");
  const list  = dialog.querySelector("[data-palette-list]");
  if (!input || !list) return () => {};

  // data-root บอกว่าหน้านี้อยู่ลึกกี่ชั้น (หน้าใน work/ จะเป็น "../")
  // ต้องมี ไม่งั้นลิงก์จากหน้า case study จะพาไปผิดที่
  const root = document.documentElement.dataset.root || "./";

  /* ---------- รายการทั้งหมดที่ค้นได้ ---------- */
  const items = [
    { group: "ไปยังหน้า", label: "หน้าแรก",       icon: "home",  href: `${root}index.html` },
    { group: "ไปยังหน้า", label: "ผลงานทั้งหมด",  icon: "grid",  href: `${root}work/index.html` },
    { group: "ไปยังหน้า", label: "เกี่ยวกับ",      icon: "user",  href: `${root}about.html` },

    ...PROJECTS.map((p) => ({
      group: "ผลงาน",
      label: p.title,
      meta:  KIND_LABEL[p.kind] || "",
      icon:  p.kind === "comp" ? "trophy" : p.kind === "train" ? "user" : "sparkles",
      href:  `${root}work/${p.slug}.html`,
      // ค้นเจอจากชื่อเรื่อง คำโปรย และชื่อเครื่องมือ
      hay:   `${p.title} ${p.blurb} ${p.tools.join(" ")} ${KIND_LABEL[p.kind]}`,
    })),

    {
      group: "การกระทำ", label: "คัดลอกอีเมล", meta: SITE.email, icon: "copy",
      run: async () => {
        try {
          await navigator.clipboard.writeText(SITE.email);
          window.dispatchEvent(new CustomEvent("toast", { detail: "คัดลอกอีเมลแล้ว" }));
        } catch {
          // clipboard API ใช้ไม่ได้บน file:// ในบางเบราว์เซอร์ — เปิดโปรแกรมเมลแทน
          location.href = `mailto:${SITE.email}`;
        }
      },
    },
    {
      group: "การกระทำ", label: "สลับธีมสว่าง / มืด", icon: "moon",
      run: () => window.dispatchEvent(new CustomEvent("theme:toggle")),
    },
    {
      group: "การกระทำ", label: "เปิด GitHub", meta: SITE.handle, icon: "github",
      href: `https://github.com/${SITE.handle}`, external: true,
    },
  ];

  let matches = [];
  let active = 0;

  function render(query = "") {
    matches = items
      .map((it) => ({ it, s: score(query, it.hay || `${it.label} ${it.meta || ""}`) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.it);

    if (!matches.length) {
      list.innerHTML = `<p class="palette-empty">ไม่พบ “${query.replace(/</g, "&lt;")}”</p>`;
      return;
    }

    active = 0;
    let html = "";
    let lastGroup = "";

    matches.forEach((it, i) => {
      // ตอนค้นหาไม่ต้องโชว์หัวกลุ่ม เพราะผลลัพธ์เรียงตามคะแนน ไม่ได้เรียงตามกลุ่ม
      if (!query && it.group !== lastGroup) {
        html += `<p class="palette-group">${it.group}</p>`;
        lastGroup = it.group;
      }
      html += `
        <button type="button" class="palette-item" data-i="${i}" data-active="${i === 0}">
          ${icon(it.icon)}
          <span>${it.label}</span>
          ${it.meta ? `<span class="meta">${it.meta}</span>` : ""}
        </button>`;
    });

    list.innerHTML = html;
  }

  function highlight(i) {
    const btns = list.querySelectorAll(".palette-item");
    if (!btns.length) return;
    active = (i + btns.length) % btns.length;
    btns.forEach((b, k) => (b.dataset.active = String(k === active)));
    // block:"nearest" เลื่อนเท่าที่จำเป็น ไม่กระโดดให้รายการอยู่กลางทุกครั้ง
    btns[active].scrollIntoView({ block: "nearest" });
  }

  function choose(i = active) {
    const it = matches[i];
    if (!it) return;
    close();
    if (it.run) it.run();
    else if (it.href) {
      if (it.external) window.open(it.href, "_blank", "noopener");
      else location.href = it.href;
    }
  }

  function open() {
    if (dialog.open) return;
    render("");
    input.value = "";
    dialog.showModal();
    input.focus();
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  /* ---------- เหตุการณ์ภายในกล่อง ---------- */
  input.addEventListener("input", () => render(input.value.trim()));

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown")      { e.preventDefault(); highlight(active + 1); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); highlight(active - 1); }
    else if (e.key === "Enter")     { e.preventDefault(); choose(); }
    // Tab ในกล่องนี้ควรเลื่อนรายการ ไม่ใช่หลุดออกไปหาปุ่มอื่น
    else if (e.key === "Tab")       { e.preventDefault(); highlight(active + (e.shiftKey ? -1 : 1)); }
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".palette-item");
    if (btn) choose(Number(btn.dataset.i));
  });

  // เมาส์ผ่านรายการไหน ให้ตัวชี้ย้ายไปตาม จะได้ไม่มีสองแถวสว่างพร้อมกัน
  list.addEventListener("pointermove", (e) => {
    const btn = e.target.closest(".palette-item");
    if (btn && Number(btn.dataset.i) !== active) highlight(Number(btn.dataset.i));
  });

  // คลิกนอกกล่อง = ปิด — <dialog> ไม่ทำให้เอง ต้องเช็คว่าคลิกโดน backdrop ไหม
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });

  opener?.addEventListener("click", open);

  return { open, close };
}

/* ============================================================================
   คีย์ลัดทั่วเว็บ

   หลักการ: ห้ามขโมยคีย์ขณะที่ผู้ใช้กำลังพิมพ์อยู่ในช่องกรอกข้อมูล
   เป็นข้อผิดพลาดที่พบบ่อยมาก และทำให้พิมพ์ "/" ในฟอร์มไม่ได้
   ========================================================================= */
function initShortcuts({ palette, help }) {
  const root = document.documentElement.dataset.root || "./";
  let chord = null;          // ตัวอักษรแรกของคีย์ลัดสองจังหวะ เช่น g แล้วตามด้วย h
  let chordTimer = 0;

  const typing = (el) =>
    el instanceof HTMLElement &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

  addEventListener("keydown", (e) => {
    // ⌘K / Ctrl+K ต้องทำงานได้แม้อยู่ในช่องกรอก เพราะเป็นคีย์ลัดที่มี modifier
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette?.open();
      return;
    }

    if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "/") { e.preventDefault(); palette?.open(); return; }
    if (e.key === "?") { e.preventDefault(); help?.showModal(); return; }

    // คีย์ลัดสองจังหวะแบบ Vim: g แล้วตามด้วยปลายทาง
    if (chord === "g") {
      const go = { h: "index.html", w: "work/index.html", a: "about.html" }[e.key];
      chord = null;
      clearTimeout(chordTimer);
      if (go) { e.preventDefault(); location.href = root + go; }
      return;
    }

    if (e.key === "g") {
      chord = "g";
      // ถ้าไม่กดต่อภายในหนึ่งวินาที ให้ลืมไปเลย ไม่งั้นการกด g ค้างไว้
      // จะทำให้การกดปุ่มอื่นในอีกสิบนาทีต่อมากลายเป็นการเปลี่ยนหน้า
      clearTimeout(chordTimer);
      chordTimer = setTimeout(() => (chord = null), 1000);
    }
  });
}

Object.assign(PF, { initPalette, initShortcuts });
})(window.PF = window.PF || {});
