;(function (PF) {
"use strict";

/* ============================================================================
   tabs.js — ตัวสลับแท็บแบบ segmented (ผลงาน / เกียรติบัตร / ทักษะ)
              และแถบกรองหมวดในหน้ารวมผลงาน
   ========================================================================= */

/* ---------- segmented tabs ----------
   ตัวชี้ (.tabs-thumb) เป็น element เดียวที่เลื่อนไปมา ไม่ใช่พื้นหลังของปุ่มแต่ละอัน
   ทำให้มันไถลจากแท็บเก่าไปแท็บใหม่ได้จริง แทนที่จะดับที่หนึ่งแล้วติดอีกที่หนึ่ง

   รองรับคีย์บอร์ดตามมาตรฐาน WAI-ARIA: ลูกศรซ้าย/ขวาเลื่อนแท็บ Home/End ไปหัวท้าย */
function initTabs(root) {
  if (!root) return;

  const list  = root.querySelector('[role="tablist"]');
  const thumb = root.querySelector(".tabs-thumb");
  const tabs  = [...root.querySelectorAll('[role="tab"]')];
  if (!list || !tabs.length) return;

  const moveThumb = (tab) => {
    if (!thumb) return;
    // offsetLeft อ้างอิงตัวแม่ที่ position ไม่ใช่ static ซึ่งก็คือ .tabs พอดี
    // ต้องลบ scrollLeft ด้วย เพราะบนจอแคบแถบแท็บเลื่อนแนวนอนได้
    thumb.style.width = `${tab.offsetWidth}px`;
    thumb.style.translate = `${tab.offsetLeft - list.scrollLeft}px 0`;
  };

  const select = (tab, focus = true) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      // แท็บที่ไม่ได้เลือกต้องออกจากลำดับ Tab — คีย์บอร์ดใช้ลูกศรเลื่อนแทน
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    moveThumb(tab);
    if (focus) tab.focus();
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => select(tab, false));
  });

  list.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i === -1) return;

    let next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];

    if (next) {
      e.preventDefault();
      select(next);
    }
  });

  list.addEventListener("scroll", () => {
    const active = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (active) moveThumb(active);
  }, { passive: true });

  // ตั้งตำแหน่งตัวชี้ครั้งแรก — ต้องรอให้ layout เสร็จก่อน ไม่งั้น offsetWidth เป็น 0
  const initial = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
  requestAnimationFrame(() => select(initial, false));

  // ตำแหน่งตัวชี้เปลี่ยนตามความกว้างแท็บ ซึ่งเปลี่ยนตามขนาดจอ
  new ResizeObserver(() => {
    const active = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (active) moveThumb(active);
  }).observe(list);
}

/* ---------- แถบกรองหมวดในหน้ารวมผลงาน ----------
   ซ่อนด้วย data-hidden ไม่ใช่การลบ element ออกจาก DOM
   เพราะการลบแล้วสร้างใหม่จะทำให้ GIF เริ่มเล่นใหม่ทุกครั้งที่กรอง */
function initFilter(bar, items) {
  if (!bar || !items?.length) return;

  const buttons = [...bar.querySelectorAll("[data-filter]")];

  const apply = (kind) => {
    buttons.forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.filter === kind));
    });
    items.forEach((el) => {
      const match = kind === "all" || el.dataset.kind === kind;
      el.dataset.hidden = String(!match);
    });

    // บอก screen reader ว่าเหลือกี่ชิ้น — ไม่งั้นคนที่ไม่เห็นจอจะไม่รู้ว่าอะไรเปลี่ยน
    const count = items.filter((el) => el.dataset.hidden !== "true").length;
    const live = bar.querySelector("[data-live]");
    if (live) live.textContent = `แสดง ${count} ผลงาน`;
  };

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (btn) apply(btn.dataset.filter);
  });

  apply("all");
}

Object.assign(PF, { initTabs, initFilter });
})(window.PF = window.PF || {});
