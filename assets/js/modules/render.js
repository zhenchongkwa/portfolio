;(function (PF) {
"use strict";
const { PROJECTS, CERTIFICATES, TOOLS, SITE, KIND_LABEL, icon } = PF;

/* ============================================================================
   render.js — สร้าง HTML จากข้อมูลใน data/projects.js

   ทำไมต้องสร้างด้วย JS แทนที่จะเขียน HTML ตรงๆ
   - การ์ดผลงานชุดเดียวกันปรากฏใน 3 ที่ (หน้าแรก · หน้ารวมผลงาน · command palette)
     ถ้าเขียนมือจะต้องแก้สามที่ทุกครั้งที่เพิ่มงานหนึ่งชิ้น
   - เว็บนี้ไม่มี build step จึงไม่มี template engine ให้ใช้

   ข้อแลกเปลี่ยน: ถ้า JS ไม่ทำงาน การ์ดจะไม่ขึ้น หน้าที่ได้รับผลกระทบจึงมี
   <noscript> บอกทางเลือกไว้ และเนื้อหาสำคัญอย่างชื่อ คำโปรย ปุ่มติดต่อ
   เขียนไว้ใน HTML ตรงๆ ทั้งหมด
   ========================================================================= */

const root = () => document.documentElement.dataset.root || "./";

/* หนีอักขระพิเศษก่อนเอาไปต่อเป็นสตริง HTML
   ข้อมูลมาจากไฟล์ของเราเองก็จริง แต่ชื่อรางวัลภาษาไทยมีเครื่องหมายคำพูดปนอยู่บ่อย
   ถ้าไม่หนี หน้าจะพังทั้งหน้าและหาสาเหตุนานมาก */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const IMG = () => `${root()}assets/img/work/`;

/* ---------- ไฟล์ย่อ 800px สำหรับช่องที่โชว์เล็ก ----------
   วัดจริงบนหน้าแรก: รูปกินแบนด์วิดท์ 1.8MB จากทั้งหน้า 2.4MB และทุกใบถูกส่ง
   มาที่ 1600px ทั้งที่ช่องที่แสดงจริงกว้างราว 420px (ต้องการ ~520px ที่ dpr 1.25)
   คือใหญ่เกินไปราว 3 เท่า

   ไฟล์ -800.jpg ถูกย่อไว้ล่วงหน้าด้วย ffmpeg วางคู่ไฟล์เต็มในโฟลเดอร์เดียวกัน
   คำสั่งที่ใช้สร้างอยู่ใน assets/img/README.md

   ⚠ ห้ามใช้กับ data-lightbox และภาพปกหน้า case study
   สองที่นั้นคือ "ดูขนาดจริง" ซึ่งต้องได้ไฟล์เต็ม โดยเฉพาะเกียรติบัตรที่กรรมการ
   ต้องอ่านตัวหนังสือบนใบออก — ย่อแล้วอ่านไม่ออกเท่ากับทำลายประโยชน์หลักของเว็บ

   ไม่ใช้ srcset เพราะไฟล์แต่ละใบกว้างไม่เท่ากัน (1024-1600px) ถ้าไม่มีขั้นตอน
   build มาอ่านความกว้างจริงให้ ตัวเลข w descriptor จะมั่วและเบราว์เซอร์จะเลือกผิด
   ส่วนช่องทั้งหมดในหน้าต้องการไม่เกิน 800px อยู่แล้ว srcset จึงไม่ได้อะไรเพิ่ม */
const THUMB = (file) => `${IMG()}${String(file).replace(/\.jpg$/i, "-800.jpg")}`;

/* ---------- สื่อปกของผลงาน ----------
   data-label กับ data-ratio ถูกอ่านโดย media.js ตอนไฟล์จริงยังไม่มี
   loading="lazy" กับ decoding="async" ทำให้ภาพที่อยู่ล่างหน้าไม่หน่วงการโหลดครั้งแรก */
function mediaTag(p, ratio = "16/10") {
  const label = esc(p.title);
  if (p.media?.type === "video") {
    const poster = p.media.poster ? ` poster="${IMG()}${esc(p.media.poster)}"` : "";
    return `<video src="${IMG()}${esc(p.media.src)}"${poster} muted loop playsinline preload="none"
                   data-label="${label}" data-ratio="${ratio}"></video>`;
  }
  return `<img src="${THUMB(esc(p.media?.src || ""))}" alt="${esc(p.media?.alt || p.title)}"
               loading="lazy" decoding="async" data-label="${label}" data-ratio="${ratio}">`;
}

/* ---------- การ์ดผลงานหนึ่งใบ ----------
   view-transition-name ตั้งชื่อจาก slug เพื่อให้ภาพปกในการ์ด "กลายร่าง" เป็น
   ภาพใหญ่ในหน้า case study ตอนกดเข้าไป (เฉพาะเบราว์เซอร์ที่รองรับ)

   ป้ายล่างซ้ายโชว์ "รางวัล" ไม่ใช่แค่ปี เพราะพอร์ตชุดนี้ขายผลลัพธ์เป็นหลัก
   ถ้ารายการไหนไม่มีรางวัลจะตกกลับไปโชว์ปีแทน */
function projectCard(p, { featured = false } = {}) {
  const cls = [
    "card", "card--spotlight", "work-item",
    featured && p.featured ? "card--featured" : "",
  ].filter(Boolean).join(" ");

  return `
  <article class="${cls}" data-kind="${esc(p.kind)}" data-reveal data-cursor-label="VIEW">
    <div class="card-media" data-halftone data-ht-mode="hold" style="view-transition-name:cover-${esc(p.slug)}">
      <span class="card-tag">${esc(KIND_LABEL[p.kind] || "")}</span>
      ${mediaTag(p)}
    </div>
    <div class="card-body">
      <h3 class="card-title">
        <a class="card-link" href="${root()}work/${esc(p.slug)}.html">${esc(p.title)}</a>
      </h3>
      <p class="card-desc">${esc(p.blurb)}</p>
      <div class="card-foot">
        <span class="award-chip">${icon("trophy")}${esc(p.award || p.year)}</span>
        <span class="btn btn--secondary btn--sm">รายละเอียด ${icon("arrowRight")}</span>
      </div>
    </div>
  </article>`;
}

/* ---------- กริดผลงาน ----------
   limit ใช้ในหน้าแรกที่โชว์แค่บางส่วน ส่วนหน้า /work ไม่ส่งมาเลยเพื่อโชว์ทั้งหมด */
function renderProjects(el, { limit = 0, featured = true } = {}) {
  if (!el) return;
  const list = limit ? PROJECTS.slice(0, limit) : PROJECTS;
  el.innerHTML = list.map((p) => projectCard(p, { featured })).join("");
}

/* ============================================================================
   ดัชนีผลงานตัวยักษ์ — หนึ่งงานหนึ่งบรรทัด

   มาคู่กับ projectCard ไม่ได้มาแทน: หน้าแรกใช้ดัชนี ส่วนหน้ารวมผลงานกับ
   command palette ยังใช้การ์ดอยู่ เพราะที่นั่นคนมาเพื่อ "กวาดดูของทั้งหมด"
   ซึ่งภาพปกช่วยได้จริง ต่างจากหน้าแรกที่ต้องการความสงบและลำดับสายตาที่ชัด

   ทำไมดัชนีถึงดูดีกว่ากริดการ์ดในหน้าแรก
   ---------------------------------------------------------------------------
   กริดการ์ดสี่ใบให้ทุกใบน้ำหนักเท่ากัน ตาจึงไม่รู้ว่าควรดูอันไหนก่อน
   ส่วนดัชนีบังคับให้อ่านจากบนลงล่างทีละบรรทัด และเปิดที่ให้ชื่องานตัวใหญ่ได้
   โดยไม่ต้องแย่งที่กับภาพ

   ⚠ รางวัลกับปีต้องอยู่ในทุกบรรทัด — เว็บนี้ใช้ยื่นเข้ามหาวิทยาลัย
   กรรมการต้องกวาดตาเจอผลงานกับรางวัลได้ทันทีโดยไม่ต้องกดเข้าไปดูทีละอัน
   ดัชนีที่สวยแต่ซ่อนข้อมูลจะทำให้เว็บเสียประโยชน์หลักไป
   ========================================================================= */
function projectRow(p, i) {
  // ภาพตัวอย่าง: ถ้าเป็นวิดีโอให้ใช้ poster เพราะวิดีโอโหลดช้าเกินกว่าจะทันตอนชี้เมาส์
  const shot = p.media?.type === "video" ? (p.media.poster || "") : (p.media?.src || "");

  return `
  <a class="pindex-row" href="${root()}work/${esc(p.slug)}.html"
     data-kind="${esc(p.kind)}" data-preview="${shot ? THUMB(esc(shot)) : ""}" data-reveal data-tilt data-sense data-glitch data-panel
     data-cursor-label="VIEW">
    <span class="pindex-no" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
    <span class="pindex-title">${esc(p.title)}</span>
    <span class="pindex-meta">${esc(p.award || KIND_LABEL[p.kind] || "")}</span>
    <span class="pindex-year">${esc(p.year)}</span>
    <span class="pindex-go" aria-hidden="true">${icon("arrowUpRight")}</span>
  </a>`;
}

/* ---------- ภาพตัวอย่างลอยตามเมาส์ ----------
   มีชิ้นเดียวใช้ร่วมกันทุกบรรทัด ไม่ใช่ทำภาพซ่อนไว้ให้ทุกบรรทัด
   เพราะหกภาพที่ซ่อนอยู่ก็ยังถูกโหลดและกินหน่วยความจำเท่าเดิม

   ฟัง pointermove ที่ตัวแม่ตัวเดียวแบบเดียวกับ initSpotlight ใน fx.js
   ไม่ผูก listener ทีละบรรทัด */
function initIndexPreview(root) {
  if (!matchMedia("(pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const fig = document.createElement("div");
  fig.className = "pindex-preview";
  fig.setAttribute("aria-hidden", "true");
  fig.innerHTML = `<img alt="" decoding="async">`;

  /* ⚠ ต้องต่อไว้ที่ <body> ไม่ใช่ที่ root

     .pindex-preview ใช้ position: fixed แล้วรับพิกัดจาก e.clientX/clientY ซึ่งเป็น
     พิกัดเทียบขอบจอ — ค่านี้ถูกต้องก็ต่อเมื่อไม่มีบรรพบุรุษตัวไหนสร้าง containing
     block ให้ fixed แต่ scenes.js เขียน scale / translate / will-change: transform
     ใส่ตัว section ทุกตัวตอนเลื่อน (ดู initScenes) และทั้งสามอย่างนั้นทำให้ section
     กลายเป็น containing block ของลูกที่ position: fixed ทันที

     ผลคือภาพถูกวัดจากขอบบนของ section แทนขอบบนจอ จึงลอยสูงขึ้นไปเท่ากับระยะที่
     section เลื่อนพ้นจอไปแล้ว ยิ่งเลื่อนลงยิ่งเพี้ยนมากขึ้นเรื่อยๆ
     ย้ายมาต่อที่ body ทำให้พ้นเงา transform ทั้งหมด พิกัดเทียบจอจึงกลับมาตรง

     ตัวฟัง pointermove ยังผูกกับ root เหมือนเดิม ย้ายแค่ที่อยู่ของกล่องภาพ */
  document.body.append(fig);
  const img = fig.querySelector("img");

  let shown = "";

  root.addEventListener("pointermove", (e) => {
    const row = e.target instanceof Element && e.target.closest(".pindex-row");

    if (!row || !row.dataset.preview) {
      fig.dataset.on = "false";
      return;
    }

    // เปลี่ยน src เฉพาะตอนย้ายไปบรรทัดอื่นจริงๆ ไม่ใช่ทุกครั้งที่เมาส์ขยับ
    // ถ้าเขียน src ทุกเฟรม เบราว์เซอร์จะรีเซ็ตการถอดรหัสภาพใหม่แล้วภาพจะกะพริบ
    if (row.dataset.preview !== shown) {
      shown = row.dataset.preview;
      img.src = shown;
    }

    fig.dataset.on = "true";
    // เขียน translate ตรงๆ ไม่ใส่ transition เพราะค่าถูกเขียนใหม่ทุกครั้งที่เมาส์ขยับ
    // ถ้าใส่ transition ภาพจะไล่ตามไม่ทันแล้วรู้สึกเหมือนติดหนึบ
    fig.style.translate = `${e.clientX}px ${e.clientY}px`;
  }, { passive: true });

  root.addEventListener("pointerleave", () => { fig.dataset.on = "false"; });
}

function renderProjectIndex(el, { limit = 0 } = {}) {
  if (!el) return;
  const list = limit ? PROJECTS.slice(0, limit) : PROJECTS;
  el.innerHTML = list.map(projectRow).join("");
  initIndexPreview(el);
}

/* ============================================================================
   ฟิล์มสตริปผลงาน — แผงใหญ่ที่ไถลผ่านหน้าจอตอนเลื่อน (หน้าแรกเท่านั้น)
   ตรรกะการตรึงจออยู่ที่ js/modules/reel.js · หน้าตาอยู่ที่หัวข้อ REEL ใน pages.css

   ทำไมมีทั้งฟิล์มสตริปและดัชนีบรรทัดอยู่ในหน้าเดียวกัน
   ---------------------------------------------------------------------------
   สองอันนี้ทำคนละหน้าที่ ไม่ใช่ของซ้ำ

     ฟิล์มสตริป  ทำให้ "รู้สึก" — ภาพใหญ่ทีละชิ้น ให้เวลากับผลงานแต่ละอัน
     ดัชนีบรรทัด ทำให้ "รู้"   — หกบรรทัดเรียงกัน กวาดตารวดเดียวเห็นครบ

   กรรมการที่เปิดพอร์ตต้องได้ทั้งสองอย่าง: ความประทับใจตอนเลื่อนผ่าน
   และความสามารถในการหาข้อมูลตอนต้องการเทียบ ถ้ามีแค่ฟิล์มสตริปอย่างเดียว
   จะต้องเลื่อนหกรอบเพื่อตอบคำถามว่า "เด็กคนนี้ได้รางวัลอะไรมาบ้าง"

   ทั้งคู่อ่านจาก PROJECTS ชุดเดียวกัน จึงไม่มีเนื้อหาที่ต้องแก้สองที่ (กฎข้อ 5)
   ========================================================================= */
function reelPanel(p, i) {
  return `
  <a class="reel-panel" href="${root()}work/${esc(p.slug)}.html"
     data-reveal data-cursor-label="OPEN" data-kind="${esc(p.kind)}">
    <span class="reel-shot" data-halftone data-ht-mode="hold">
      <span class="reel-no">${String(i + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}</span>
      <img src="${THUMB(esc(p.media?.src || ""))}" alt="${esc(p.media?.alt || p.title)}"
           loading="lazy" decoding="async"
           data-label="${esc(p.title)}" data-ratio="4/3">
    </span>
    <span class="reel-body">
      <span class="reel-title">${esc(p.title)}</span>
      <span class="reel-meta">
        <b>${esc(p.award || KIND_LABEL[p.kind] || "")}</b>
        <span>${esc(p.year)}</span>
      </span>
    </span>
  </a>`;
}

function renderReel(el) {
  if (!el) return;
  el.innerHTML = PROJECTS.map(reelPanel).join("");
}

/* ---------- กริดเกียรติบัตร ----------
   กดแล้วเปิด lightbox ดูขนาดเต็ม เพราะตัวหนังสือบนเกียรติบัตรเล็กเกินกว่า
   จะอ่านออกในขนาดการ์ด — การกดดูเต็มจอจึงไม่ใช่ของเล่น แต่จำเป็นจริง
   aspect-ratio กำหนดล่วงหน้าจากข้อมูล เพื่อให้กริดไม่กระโดดตอนภาพโหลดเสร็จ */
function renderCertificates(el) {
  if (!el) return;
  el.innerHTML = CERTIFICATES.map((c) => `
    <button type="button" class="cert" data-reveal="scale" data-tilt data-sense data-glitch data-panel
            data-cursor-label="ZOOM"
            data-lightbox="${IMG()}${esc(c.src)}" data-caption="${esc(c.title)} — ${esc(c.org)}">
      <span class="cert-shot" data-halftone>
        <img src="${THUMB(esc(c.src))}" alt="${esc(c.title)}" loading="lazy" decoding="async"
             style="aspect-ratio:${esc(c.ratio)}"
             data-label="${esc(c.title)}" data-ratio="${esc(c.ratio)}">
        <span class="cert-zoom">${icon("expand")}</span>
      </span>
      <span class="cert-meta">
        <b>${esc(c.title)}</b>
        <small>${esc(c.org)} · ${esc(c.date)}</small>
      </span>
    </button>`).join("");
}

/* ---------- กริดทักษะ / เครื่องมือ ---------- */
function renderTools(el) {
  if (!el) return;
  el.innerHTML = TOOLS.map((t) => `
    <div class="tech" data-reveal="scale">
      ${icon(t.icon)}
      <span>${esc(t.name)}</span>
    </div>`).join("");
}

/* ---------- แถบเลื่อน ----------
   ทำซ้ำสองชุดเพราะ keyframe เลื่อนไป -50% แล้ววาร์ปกลับ
   ถ้ามีชุดเดียวจะเห็นช่องว่างตอนวาร์ป
   aria-hidden ที่ชุดที่สองกัน screen reader อ่านชื่อซ้ำสองรอบ */
function renderMarquee(el) {
  if (!el) return;
  const one = TOOLS.map((t) => `
    <span class="marquee-item">${icon(t.icon)}${esc(t.name)}</span>`).join("");
  el.innerHTML = one + `<span aria-hidden="true" style="display:contents">${one}</span>`;
}

/* ---------- การ์ดสถิติ ---------- */
function renderStats(el) {
  if (!el) return;
  el.innerHTML = SITE.stats.map((s) => `
    <div class="stat" data-reveal>
      <span class="stat-icon">${icon(s.icon)}</span>
      <span class="stat-num" data-count="${s.value}" data-suffix="${esc(s.suffix)}">0</span>
      <span class="stat-label">${esc(s.label)}</span>
      <span class="stat-arrow">${icon("arrowUpRight")}</span>
    </div>`).join("");
}

/* ---------- การ์ดช่องทางติดต่อ ----------
   ข้ามตัวที่ยังไม่ได้ใส่ลิงก์จริง (url เป็น "#") เพื่อไม่ให้มีปุ่มที่กดแล้วไม่ไปไหน */
function renderSocials(el) {
  if (!el) return;
  el.innerHTML = SITE.socials
    .filter((s) => s.url && s.url !== "#")
    .map((s) => {
      const ext = s.url.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `
      <a class="social" href="${esc(s.url)}"${ext} data-reveal data-magnet>
        ${icon(s.icon)}
        <span><b>${esc(s.name)}</b><small>${esc(s.handle)}</small></span>
      </a>`;
    }).join("");
}

/* ---------- ลิงก์ผลงานก่อนหน้า / ถัดไป ท้ายหน้า case study ---------- */
function renderCaseNav(el, prev, next) {
  if (!el || !prev || !next) return;
  el.innerHTML = `
    <a href="${root()}work/${esc(prev.slug)}.html">
      <small>${icon("arrowLeft")} ก่อนหน้า</small>
      <b>${esc(prev.title)}</b>
    </a>
    <a href="${root()}work/${esc(next.slug)}.html">
      <small>ถัดไป ${icon("arrowRight")}</small>
      <b>${esc(next.title)}</b>
    </a>`;
}

/* ============================================================================
   หน้า case study — สร้างเนื้อหาทั้งหน้าจากข้อมูลของผลงานชิ้นนั้น

   ไฟล์ work/<slug>.html จึงเหลือแค่ <head> (title, description, og:image ที่
   ตัวขูดข้อมูลต้องอ่านให้ได้โดยไม่รัน JS) กับโครงเปล่าๆ ที่เหลือมาจากที่นี่

   ข้อดี: เพิ่มผลงานใหม่ = แก้ projects.js แล้วก๊อปไฟล์ .html หนึ่งไฟล์
   ไม่ต้องเขียนเนื้อหาซ้ำสองที่แล้วปล่อยให้มันไม่ตรงกันในอีกสามเดือน
   ========================================================================= */
function renderCase(el, p) {
  if (!el || !p) return;

  const btn = (link, label, ico) =>
    link
      ? `<a class="btn btn--secondary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">
           ${icon(ico)} ${label}</a>`
      // ปุ่มที่ยังไม่มีลิงก์ต้องยังอยู่ แต่กดไม่ได้ — บอกสถานะตรงๆ ดีกว่าซ่อนหาย
      : `<span class="btn btn--secondary" aria-disabled="true">${icon(ico)} ไม่มีลิงก์</span>`;

  const gallery = (p.gallery || []).length
    ? `<section style="margin-top:var(--s-16)">
         <h2 style="font-size:var(--t-h3);margin-bottom:var(--s-6)">ภาพจากงาน</h2>
         <div class="cert-grid">
           ${p.gallery.map((g) => `
             <button type="button" class="cert" data-reveal="scale" data-cursor-label="ZOOM"
                     data-lightbox="${IMG()}${esc(g.src)}" data-caption="${esc(g.cap)}">
               <span class="cert-shot">
                 <img src="${THUMB(esc(g.src))}" alt="${esc(g.cap)}" loading="lazy" decoding="async"
                      style="aspect-ratio:4/3" data-label="${esc(p.title)}" data-ratio="4/3">
                 <span class="cert-zoom">${icon("expand")}</span>
               </span>
               <span class="cert-meta"><small>${esc(g.cap)}</small></span>
             </button>`).join("")}
         </div>
       </section>`
    : "";

  el.innerHTML = `
    <a class="back-link" href="${root()}work/index.html">
      ${icon("arrowLeft")} กลับไปหน้าผลงาน
    </a>

    <div class="split split--top" style="align-items:start">

      <div class="stack" style="width:100%">
        <span class="eyebrow">${esc(KIND_LABEL[p.kind] || "")} · ${esc(p.year)}</span>
        <h1 class="case-title gradient-text">${esc(p.title)}</h1>
        <div class="case-rule"></div>
        ${p.award ? `<span class="award-chip award-chip--lg">${icon("trophy")}${esc(p.award)}</span>` : ""}
        <p class="text-soft">${esc(p.summary)}</p>

        <div class="grid grid--2" style="width:100%;gap:var(--s-3);margin-top:var(--s-4)">
          ${p.stats.map((s) => `
            <div class="stat">
              <span class="stat-icon">${icon("medal")}</span>
              <span class="stat-num">${esc(s.value)}</span>
              <span class="stat-label">${esc(s.label)}</span>
              <span class="stat-arrow"></span>
            </div>`).join("")}
        </div>

        <div class="row" style="margin-top:var(--s-4)">
          ${btn(p.links?.live, "เปิดดูงานจริง", "external")}
          ${btn(p.links?.code, "ดูโค้ด", "code")}
        </div>

        <h2 style="font-size:var(--t-h4);margin-top:var(--s-6);display:flex;align-items:center;gap:var(--s-2)">
          ${icon("layers")} บทบาทและทักษะที่ใช้
        </h2>
        <div class="row row--tight">
          <span class="chip">${esc(p.role)}</span>
          ${p.tools.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}
        </div>
      </div>

      <div class="stack" style="width:100%;gap:var(--s-6)">
        <!-- หน้า case study ไม่ใส่ชั้นเม็ดจุดโดยตั้งใจ — คนที่กดเข้ามาถึงหน้านี้แล้ว
             ตั้งใจจะ "ดูผลงาน" ภาพจึงต้องเป็นภาพจริงตั้งแต่วินาทีแรก ไม่ใช่ของที่ต้อง
             เอาเมาส์ไปชี้ก่อนถึงจะเห็น (เอฟเฟกต์ยังอยู่ครบที่การ์ดหน้ารวมผลงาน
             ฟิล์มสตริปหน้าแรก และแท็บเกียรติบัตร ซึ่งเป็นชั้น "ก่อนกดเข้าไปดู")
             data-reveal ที่นี่จึงเหลือหน้าที่เดียวคือแอนิเมชันตอนเลื่อนมาถึง -->
        <figure class="case-figure" data-reveal="scale"
                style="margin:0;view-transition-name:cover-${esc(p.slug)}">
          <button type="button" class="case-figure-btn" data-cursor-label="ZOOM"
                  data-lightbox="${IMG()}${esc(p.media?.src || "")}"
                  data-caption="${esc(p.media?.alt || p.title)}">
            <img src="${IMG()}${esc(p.media?.src || "")}" alt="${esc(p.media?.alt || p.title)}"
                 data-label="${esc(p.title)}" data-ratio="16/10">
          </button>
          <figcaption>${esc(p.media?.alt || p.title)} — กดที่ภาพเพื่อดูขนาดเต็ม</figcaption>
        </figure>

        <div class="keyfeat">
          <h3>${icon("sparkles")} จุดเด่นของงาน</h3>
          <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        </div>
      </div>

    </div>

    <div class="case-body" style="margin-top:var(--s-16)">
      ${p.body.map((b) => `<h2>${esc(b.h)}</h2><p>${esc(b.p)}</p>`).join("")}
    </div>

    ${gallery}`;
}

/* ---------- เติมไอคอนลงในที่ที่ HTML เขียน data-icon ไว้ ----------
   ทำให้ HTML ไม่ต้องแบก path ของ SVG ยาวๆ อ่านง่ายขึ้นมาก */
function hydrateIcons(scope = document) {
  scope.querySelectorAll("[data-icon]").forEach((el) => {
    if (el.dataset.iconDone === "true") return;
    el.dataset.iconDone = "true";
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));
  });
}

Object.assign(PF, {
  projectCard, renderProjects, projectRow, renderProjectIndex, renderReel,
  renderCertificates, renderTools, renderMarquee,
  renderStats, renderSocials, renderCaseNav, renderCase, hydrateIcons,
});
})(window.PF = window.PF || {});
