;(function (PF) {
"use strict";

/* Canvas interaction layer for the homepage. It shares one capped particle pool
   and only runs while visible effects exist, keeping idle cost at zero. */
function initComicFx(root) {
  if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !matchMedia("(pointer: fine)").matches) return;

  const html = document.documentElement;
  const canvas = document.createElement("canvas");
  canvas.className = "comic-fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) { canvas.remove(); return; }

  // Content created by render.js exists before this initializer runs, so the
  // shared hooks can be attached once without per-card listeners.
  root.querySelectorAll(".social, .copy-mail, .stat, .tech, .cta").forEach((el) => {
    el.setAttribute("data-sense", "");
    if (!el.matches(".cta")) el.setAttribute("data-tilt", "");
  });

  /* แคชรายการ [data-depth] ไว้ตั้งแต่ต้น ไม่ query ใหม่ทุกครั้งที่เมาส์ขยับ

     pointermove ยิงได้ถี่กว่า 100 ครั้งต่อวินาทีบนเมาส์ความถี่สูง การเรียก
     querySelectorAll ในนั้นคือการไล่เดิน DOM ทั้งต้นใหม่ทุกครั้งเพื่อให้ได้
     รายการเดิมที่ไม่เคยเปลี่ยน — เป็นงานที่ทิ้งเปล่าล้วนๆ

     ปลอดภัยที่จะแคชตรงนี้ เพราะเนื้อหาที่ render.js สร้างถูกใส่ลง DOM เสร็จแล้ว
     ก่อนที่ initComicFx จะถูกเรียก (ดูลำดับใน main.js) */
  const depthEls = [...root.querySelectorAll("[data-depth]")].map((el) => ({
    el, d: Number(el.dataset.depth || .1),
  }));

  const MAX_PARTICLES = 88;
  const particles = [];
  const bursts = [];
  const palette = ["#e8112d", "#2af5ff", "#ffd400"];
  let dpr = 1, w = 0, h = 0, raf = 0, running = false;
  let x = innerWidth / 2, y = innerHeight / 2, px = x, py = y;
  let speed = 0, lastSpawn = 0, tilt = null, tiltRect = null, lastTrigger = null;
  let panel = null, panelTrigger = null;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize, { passive: true });

  function wake() {
    if (!running && !document.hidden) {
      running = true;
      raf = requestAnimationFrame(draw);
    }
  }

  function addParticle(kind, sx, sy, vx, vy, life, size) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({ kind, x: sx, y: sy, vx, vy, life, max: life, size, color: palette[particles.length % palette.length] });
  }

  function sense(el, strength = 1) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    bursts.push({ x: r.left + r.width / 2, y: r.top + r.height / 2,
      r: Math.max(r.width, r.height) * .34, life: 420, max: 420, strength });
    wake();
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const dt = Math.min(32, now - (draw.last || now));
    draw.last = now;
    const step = dt / 16.667;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * step; p.y += p.vy * step;
      p.vx *= .92; p.vy *= .92;
      const a = p.life / p.max;
      ctx.globalAlpha = a * .72;
      ctx.fillStyle = p.color;
      if (p.kind === "ink") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.1 - a * .25), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= dt;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      const p = 1 - b.life / b.max;
      const radius = b.r + p * 88 * b.strength;
      ctx.globalAlpha = (1 - p) * .68;
      ctx.strokeStyle = i % 2 ? "#2af5ff" : "#e8112d";
      ctx.lineWidth = 2;
      for (let n = 0; n < 14; n++) {
        const a = (Math.PI * 2 * n / 14) + p * .45;
        const inner = radius * .56;
        const outer = radius * (1.06 + (n % 3) * .09);
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(a) * inner, b.y + Math.sin(a) * inner);
        ctx.lineTo(b.x + Math.cos(a) * outer, b.y + Math.sin(a) * outer);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (particles.length || bursts.length) raf = requestAnimationFrame(draw);
    else running = false;
  }

  function setTilt(el, event) {
    if (tilt !== el || !tiltRect) return;
    const nx = Math.max(-1, Math.min(1, (event.clientX - tiltRect.left) / tiltRect.width * 2 - 1));
    const ny = Math.max(-1, Math.min(1, (event.clientY - tiltRect.top) / tiltRect.height * 2 - 1));
    el.style.setProperty("--tilt-x", `${(-ny * 4).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(nx * 5).toFixed(2)}deg`);
    el.style.setProperty("--tilt-light-x", `${((nx + 1) * 50).toFixed(1)}%`);
    el.style.setProperty("--tilt-light-y", `${((ny + 1) * 50).toFixed(1)}%`);
  }

  root.addEventListener("pointerover", (e) => {
    const target = e.target instanceof Element && e.target.closest("[data-tilt], [data-sense], [data-glitch], [data-pop]");
    if (!target || target === lastTrigger) return;
    lastTrigger = target;
    target.dataset.comicHot = "true";
    if (target.matches("[data-tilt]")) { tilt = target; tiltRect = target.getBoundingClientRect(); }
    if (target.matches("[data-sense], [data-glitch], [data-pop]")) sense(target, target.matches("[data-pop]") ? .72 : 1);
  });

  root.addEventListener("pointerout", (e) => {
    const target = e.target instanceof Element && e.target.closest("[data-tilt], [data-sense], [data-glitch], [data-pop]");
    if (!target || target.contains(e.relatedTarget)) return;
    delete target.dataset.comicHot;
    if (tilt === target) {
      /* ต้องล้างตำแหน่งไฟด้วย ไม่ใช่แค่มุมเอียง
         ถ้าล้างแค่ --tilt-x/y การ์ดจะกลับมาตรงก็จริง แต่จุดไฮไลต์ยังค้างอยู่
         มุมที่เมาส์ออกไปครั้งสุดท้าย พอกลับมาชี้ใหม่จะเห็นไฟกระโดดจากมุมเก่า */
      ["--tilt-x", "--tilt-y", "--tilt-light-x", "--tilt-light-y"]
        .forEach((v) => tilt.style.removeProperty(v));
      tilt = null; tiltRect = null;
    }
    if (lastTrigger === target) lastTrigger = null;
  });

  addEventListener("pointermove", (e) => {
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY; x = px; y = py;
    speed = Math.min(36, Math.hypot(dx, dy));
    html.style.setProperty("--pointer-x", `${x}px`);
    html.style.setProperty("--pointer-y", `${y}px`);
    html.style.setProperty("--pointer-speed", (speed / 36).toFixed(3));
    html.style.setProperty("--halftone-live-size", `${(7 + Math.min(2.5, speed * .07)).toFixed(2)}px`);
    html.style.setProperty("--glitch-x", `${(dx * .12).toFixed(2)}px`);
    html.style.setProperty("--glitch-y", `${(dy * .08).toFixed(2)}px`);
    html.style.setProperty("--comic-hue", String(Math.round((x / Math.max(1, w)) * 360)));
    for (const { el, d } of depthEls) {
      el.style.setProperty("--depth-x", `${((x / w - .5) * d * 20).toFixed(2)}px`);
      el.style.setProperty("--depth-y", `${((y / h - .5) * d * 16).toFixed(2)}px`);
    }
    setTilt(tilt, e);

    const now = performance.now();
    if (now - lastSpawn > 26) {
      const count = speed > 12 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        addParticle(speed > 9 ? "ink" : "dot", x - dx * i * .35, y - dy * i * .35,
          -dx * (.18 + i * .08), -dy * (.18 + i * .08), 240 + speed * 8, 2 + speed * .08);
      }
      lastSpawn = now;
      wake();
    }
  }, { passive: true });

  root.addEventListener("click", (e) => {
    const pop = e.target instanceof Element && e.target.closest("[data-pop]");
    if (!pop) return;
    pop.dataset.popped = "true";
    sense(pop, .8);
    setTimeout(() => delete pop.dataset.popped, 500);
  });

  function buildPanel() {
    panel = document.createElement("dialog");
    panel.className = "comic-panel";
    panel.innerHTML = `<article class="comic-panel-card">
      <button type="button" class="comic-panel-close" aria-label="ปิด">×</button>
      <div class="comic-panel-media"><img alt=""></div>
      <p class="comic-panel-kicker"></p><h2></h2><p class="comic-panel-copy"></p>
      <div class="comic-panel-actions"></div>
    </article>`;
    document.body.append(panel);
    panel.querySelector(".comic-panel-close").addEventListener("click", () => panel.close());
    panel.addEventListener("click", (e) => { if (e.target === panel) panel.close(); });
    panel.addEventListener("close", () => { panelTrigger?.focus?.(); panelTrigger = null; });
  }

  function openPanel(trigger) {
    if (!panel) buildPanel();
    panelTrigger = trigger;
    const cert = trigger.matches(".cert");
    const title = cert ? trigger.querySelector(".cert-meta b")?.textContent : trigger.querySelector(".pindex-title")?.textContent;
    const subtitle = cert ? trigger.querySelector(".cert-meta small")?.textContent : trigger.querySelector(".pindex-meta")?.textContent;
    const image = cert ? trigger.querySelector("img")?.src : trigger.dataset.preview;
    panel.querySelector("h2").textContent = title || "Preview";
    panel.querySelector(".comic-panel-kicker").textContent = cert ? "CERTIFICATE // PREVIEW" : "PROJECT // PREVIEW";
    panel.querySelector(".comic-panel-copy").textContent = subtitle || "Open this panel to view the full work.";
    const img = panel.querySelector("img");
    img.src = image || ""; img.hidden = !image;
    const actions = panel.querySelector(".comic-panel-actions");
    actions.replaceChildren();
    const go = document.createElement(cert ? "button" : "a");
    go.className = "btn btn--accent";
    go.textContent = cert ? "ดูขนาดเต็ม" : "เปิดผลงาน";
    if (cert) {
      go.type = "button";
      go.addEventListener("click", () => {
        trigger.dataset.panelBypass = "true";
        panel.close();
        trigger.click();
        delete trigger.dataset.panelBypass;
      }, { once: true });
    } else go.href = trigger.href;
    actions.append(go);
    panel.showModal();
    panel.querySelector(".comic-panel-close").focus();
  }

  /* Capture phase opens a preview before normal link/lightbox handlers run.
     Modifier-assisted links retain the browser's regular navigation behavior. */
  document.addEventListener("click", (e) => {
    const trigger = e.target instanceof Element && e.target.closest("[data-panel]");
    if (!trigger || trigger.dataset.panelBypass === "true" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    openPanel(trigger);
  }, true);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; ctx.clearRect(0, 0, w, h); }
    else if (particles.length || bursts.length) wake();
  });

  html.dataset.comicFx = "on";
}

Object.assign(PF, { initComicFx });
})(window.PF = window.PF || {});
