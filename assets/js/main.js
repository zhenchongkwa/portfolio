/* ============================================================================
   main.js — จุดเริ่มต้นเดียวของทั้งเว็บ

   ทุกหน้าโหลดสคริปต์ชุดเดียวกัน แล้วไฟล์นี้จะดูเองว่าหน้านี้มี element อะไรบ้าง
   ก่อนเปิดใช้เฉพาะส่วนที่มีจริง — จึงไม่ต้องมี main.js แยกต่อหน้า
   และไม่มีปัญหา "ลืมเพิ่มสคริปต์ในหน้าใหม่"

   ---------------------------------------------------------------------------
   ทำไมไม่ใช้ ES module (import/export)

   เว็บนี้ต้องดับเบิลคลิกไฟล์ .html แล้วใช้ได้ทันที ซึ่งหมายถึงโปรโตคอล file://
   แต่เบราว์เซอร์บังคับใช้กฎ CORS กับสคริปต์ที่เป็น module และถือว่า file://
   มี origin เป็น null — การ import ข้ามไฟล์จึงถูกบล็อกทั้งหมด

   ทางออกคือใช้ <script> ธรรมดาหลายเส้น โดยทุกไฟล์ห่อตัวเองด้วย IIFE แล้วฝาก
   ของที่ต้องใช้ร่วมกันไว้ที่ window.PF ตัวเดียว ได้ผลเหมือน module ทุกอย่าง
   ยกเว้นว่าลำดับของ <script> ในหน้า HTML สำคัญ (ไฟล์ที่ถูกใช้ต้องมาก่อน)
   ========================================================================= */

;(function (PF) {
"use strict";

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function boot() {
  /* ---------- 1. เนื้อหาที่สร้างจากข้อมูล ----------
     ต้องมาก่อนทุกอย่าง เพราะขั้นถัดไปต้องหา element ที่เพิ่งถูกสร้างให้เจอ */
  const projectsEl = $("[data-projects]");
  PF.renderProjects(projectsEl, { limit: Number(projectsEl?.dataset.limit) || 0 });

  /* ดัชนีผลงานตัวยักษ์ — ใช้ในหน้าแรกแทนกริดการ์ด
     หน้ารวมผลงานกับ command palette ยังใช้การ์ดอยู่ ทั้งสองแบบจึงอยู่ด้วยกันได้
     (เหตุผลที่แยกสองแบบอยู่ที่ renderProjectIndex ใน modules/render.js) */
  const indexEl = $("[data-project-index]");
  PF.renderProjectIndex(indexEl, { limit: Number(indexEl?.dataset.limit) || 0 });

  /* ฟิล์มสตริปผลงาน — มีเฉพาะหน้าแรก แต่เรียกตรงๆ ได้เพราะ renderReel
     ออกจากฟังก์ชันทันทีเมื่อไม่เจอ element (เหมือน render ตัวอื่นทั้งหมด)
     ตัวที่ต้องระวังคือ initReel ข้างล่าง ซึ่งอยู่คนละไฟล์ที่ไม่ได้โหลดทุกหน้า */
  PF.renderReel($("[data-reel-track]"));

  PF.renderCertificates($("[data-certs]"));
  PF.renderTools($("[data-tools]"));
  PF.renderMarquee($("[data-marquee]"));
  PF.renderStats($("[data-stats]"));
  PF.renderSocials($("[data-socials]"));
  PF.hydrateIcons();

  // หน้า case study — เนื้อหาทั้งหน้ามาจาก projects.js ผ่าน slug ใน data-case
  const caseSlug = document.body.dataset.case;
  if (caseSlug) {
    // ต้องเป็น data-case-body ไม่ใช่ data-case เพราะ <body> เองก็ถือ data-case อยู่
    PF.renderCase($("[data-case-body]"), PF.bySlug(caseSlug));
    const { prev, next } = PF.neighbours(caseSlug);
    PF.renderCaseNav($("[data-case-nav]"), prev, next);
  }

  /* ---------- 2. รูปภาพ ----------

     รูปเม็ดจุดที่เป็นฉากหลังหน้าจอแรก — ที่อยู่มาจาก SITE.heroShot ไม่ได้เขียนใน HTML
     เพราะเป็นข้อมูลของเจ้าของเว็บ ไม่ใช่โครงหน้า (กฎข้อ 5: เนื้อหาอยู่ใน projects.js)

     ⚠ ต้องตั้งก่อน guardAll เพื่อให้ตัวดักพลาดของ media.js ผูกทัน
     ถ้าตั้งทีหลัง event error อาจยิงไปแล้วก่อนที่จะมีใครดัก แล้วจะเห็นไอคอนรูปแตก

     SITE.heroShot เป็น null ได้ = เจ้าของเว็บเลือกไม่เอารูปหลังชื่อ
     กรณีนั้นข้ามไปเฉยๆ ปล่อย <img> ว่างไว้ให้ media.js จัดการต่อ */
  const heroImg = $("[data-hero-img]");
  if (heroImg && PF.SITE.heroShot) {
    /* path นับจาก assets/img/ ไม่ใช่ assets/img/work/
       เพราะรูปหลังชื่อไม่ใช่ "ผลงาน" มันเป็นรูปบรรยากาศของเจ้าของเว็บ
       ถ้าอยากใช้รูปผลงานจริงๆ ก็เขียน "work/ชื่อไฟล์.jpg" ได้ */
    heroImg.src = `assets/img/${PF.SITE.heroShot}`;
  }

  /* ต้องผูกหลังสร้าง DOM เสร็จ แต่ก่อนที่ภาพจะโหลดไม่สำเร็จ */
  PF.guardAll();

  /* สกรีนเม็ดจุดบนรูปถ่าย — ต้องมา "หลัง" guardAll เสมอ
     เพราะมันต้องรู้ว่ารูปไหนโหลดไม่สำเร็จจนถูกสลับเป็นภาพแทนที่ แล้วข้ามรูปนั้นไป
     ถ้าเรียกก่อน มันจะไปเอาลายทแยงของภาพแทนที่มาทำเม็ดจุด ได้ลายมั่วที่ดูเหมือนจอเสีย */
  PF.initHalftone?.();

  /* ---------- 3. โครงหน้า ---------- */

  /* scroll แรงเฉื่อย — ต้องมาก่อนทุกอย่างที่ฟัง scroll เพื่อให้ listener ของมัน
     ถูกผูกก่อน แต่ลำดับไม่ได้สำคัญเชิงตรรกะ เพราะมันขยับ scrollY จริง
     ไม่ได้ห่อหน้าเว็บด้วย transform (เหตุผลเต็มอยู่หัว modules/smooth.js)
     ตัวมันปิดตัวเองบนจอสัมผัสและตอนผู้ใช้ปิดแอนิเมชัน */
  PF.initSmooth();

  PF.initHeader($(".site-header"));
  PF.initMobileMenu($("[data-nav-toggle]"), $("[data-nav-panel]"));
  PF.initScrollSpy($$(".nav-link, .nav-panel a"));
  PF.initProgress($("[data-progress]"));
  PF.initTabs($("[data-tabs]"));
  PF.initFilter($("[data-filter-bar]"), $$(".work-item"));

  /* ---------- 4. แอนิเมชัน ---------- */
  PF.initReveal();
  PF.initCounters();
  PF.initSpotlight();
  PF.initCursor();

  /* ปุ่มเอียงเข้าหาเมาส์ — อยู่ไฟล์เดียวกับเคอร์เซอร์ (modules/fx.js)
     เพราะทั้งคู่คือเรื่องเดียวกัน: ตอบสนองตำแหน่งเมาส์แบบที่ลบทิ้งได้โดยเว็บยังครบ */
  PF.initMagnet();

  /* ชั้นเอฟเฟกต์ canvas — มีเฉพาะหน้าแรก (comic-fx.js ถูกใส่ script tag ไว้ที่ index.html
     หน้าเดียวโดยตั้งใจ ตามขอบเขตที่ตกลงไว้ว่าทำเฉพาะหน้า landing)

     ⚠ ต้องเรียกแบบ optional (?.) เท่านั้น ห้ามเรียกตรงๆ
     ถ้าเรียกตรงๆ อีก 9 หน้าที่ไม่มีไฟล์นี้จะโยน TypeError กลางคัน boot()
     แล้วทุกอย่างที่อยู่ "ใต้บรรทัดนี้" จะไม่ถูกเรียกเลย — ปุ่มสลับธีม · lightbox
     เกียรติบัตร · ฟอร์มติดต่อ · command palette · เอฟเฟกต์ scroll ทั้งหมดตายหมด
     โดยที่หน้ายังดูปกติดี จึงหาสาเหตุยากมาก (เคยพังมาแล้วจริงๆ ทั้ง 9 หน้า) */
  PF.initComicFx?.($("[data-comic-fx]"));

  /* backdrop.js (พื้นหลัง canvas + ป้ายเสียง POW/ZAP) ถูกถอดออกทั้งโมดูล
     ตามบรีฟที่สั่งให้เลี่ยง canvas background และให้พื้นหลังเป็น CSS ล้วน
     พื้นหลังตอนนี้เหลือ halftone + กริด + เกรน ใน base.css กับแสงเรือง .ambient */

  PF.initIntro($("[data-intro]"));

  /* ข้อความเผยทีละบรรทัด + สลับตัวอักษรมั่วก่อนลงตัว — โค้ดอยู่ที่ modules/type.js
     ต้องมาหลังขั้นที่ 1 เสมอ เพราะหัวข้อในหน้า case study ถูกสร้างจาก projects.js
     ถ้าเรียกก่อน จะหา [data-split] ไม่เจอสักตัว */
  PF.initSplitLines();
  PF.initScramble();

  /* sticky.js (ฉากตรึงของส่วน "วิธีทำงาน") ถูกลบทั้งโมดูล — ส่วนนั้นถูกถอดออกจาก
     หน้าไปแล้ว เหลือ markup [data-sticky] อยู่ศูนย์ที่ โมดูลจึงโหลดมาเพื่อ
     ออกจากฟังก์ชันทันทีทั้งสิบหน้า

     scenes.js ยังมีโค้ดข้าม [data-sticky] อยู่ ไม่ได้ถอดออกเพราะไม่มีอะไรเสีย
     และถ้าวันหนึ่งเอาฉากตรึงกลับมา มันจะยังทำงานถูกต้องทันที */

  /* เอฟเฟกต์ระดับ section ตอนเลื่อนข้ามส่วน — โค้ดอยู่ที่ modules/scenes.js
     (การใส่ scale ให้ตัวแม่จะทำให้ position: sticky ข้างในอ้างอิงกรอบผิด) */
  PF.initScenes();

  /* รูปทรงวิศวกรรมลอยเป็นฉากหลัง ลากได้ — ฟิสิกส์สปริงอยู่ที่ modules/formes.js
     มีทุกหน้า ไม่ใช่แค่หน้าแรก จึงเรียกตรงนี้ไม่ใช่ในบล็อกเงื่อนไขของ hero
     ตัวมันหยุดคำนวณเองเมื่อแท็บถูกซ่อน จึงไม่ต้องเช็คอะไรเพิ่มตรงนี้ */
  PF.initFormes($("[data-formes]"));

  /* ฟิล์มสตริปตรึงจอ — ต้องมาหลัง initScenes เพราะมันวัดความสูงของหน้า
     ซึ่งเปลี่ยนไปตามค่าที่ scenes.js เขียนใส่ section (กฎเดียวกับที่ initSplitLines
     ต้องมาหลังขั้นที่ 1) และหลัง initFormes เพราะรูปทรงลอยอยู่ชั้นหลังสุด

     ⚠ ต้องเรียกด้วย ?. — reel.js ถูกใส่ script tag ไว้ที่ index.html หน้าเดียว
     ตามขอบเขตที่ตกลงไว้ อีกเก้าหน้าไม่มีไฟล์นี้ ถ้าเรียกตรงๆ จะโยน TypeError
     กลางคัน boot() แล้วทุกอย่างใต้บรรทัดนี้ตายหมด — ปุ่มธีม · lightbox · ฟอร์ม ·
     command palette (กฎข้อ 9 เคยพังมาแล้วจริงทั้งเก้าหน้าเพราะ comic-fx) */
  PF.initReel?.($("[data-reel]"));

  /* เส้นลายวงจร PCB บอกความคืบหน้าการอ่าน — มีทุกหน้า
     ใช้ ?. เหมือนกันเพราะ script tag ถูกใส่มือทีละสิบไฟล์ ถ้าพลาดไปหนึ่งไฟล์
     ผลลัพธ์ควรเป็น "หน้านั้นไม่มีเส้น" ไม่ใช่ "หน้านั้นใช้อะไรไม่ได้เลย" */
  PF.initSpine?.($("[data-spine]"));

  /* ---------- 5. เครื่องมือ ---------- */
  PF.initToast();
  PF.initTheme($("[data-theme-toggle]"));
  PF.initCopy();
  PF.initLightbox();
  PF.initContactForm($("[data-contact-form]"), PF.SITE.email);

  const palette = PF.initPalette($("[data-palette]"), $("[data-palette-open]"));
  const help = $("[data-help]");
  PF.initShortcuts({ palette, help });

  // ปิดกล่องคีย์ลัดเมื่อคลิกนอกกล่อง (<dialog> ไม่ทำให้เอง)
  help?.addEventListener("click", (e) => { if (e.target === help) help.close(); });
  $$("[data-help-close]").forEach((b) => b.addEventListener("click", () => help?.close()));

  /* ---------- 6. เล่นวิดีโอปกเฉพาะตอนเมาส์ชี้ ----------
     ถ้าปล่อยให้ autoplay ทุกใบ หน้าแรกจะเล่นวิดีโอพร้อมกันหลายไฟล์
     กินแบตและแบนด์วิดท์โดยที่คนดูมองได้ทีละใบอยู่ดี
     ใช้ capture phase เพราะ pointerenter ไม่ bubble ขึ้นมาถึง document */
  document.addEventListener("pointerenter", (e) => {
    const v = e.target instanceof Element && e.target.closest(".card")?.querySelector("video");
    v?.play?.().catch(() => { /* ไฟล์ยังไม่มี — media.js จัดการต่อเอง */ });
  }, true);

  document.addEventListener("pointerleave", (e) => {
    const v = e.target instanceof Element && e.target.closest(".card")?.querySelector("video");
    v?.pause?.();
  }, true);

  /* ---------- 7. บัตรห้อยสายคล้องใน hero ----------
     ฟิสิกส์เชือกแบบ Verlet ลากเล่นได้จริง โค้ดอยู่ที่ modules/lanyard.js

     เดิมบัตรนี้เป็นแค่ "ทางถอย" ที่โผล่เฉพาะตอนฉาก 3D เปิดไม่ได้ จึงซ่อนอยู่
     เกือบตลอดเวลาทั้งที่เขียนไว้เต็มรูปแบบ ตอนนี้ฉาก 3D ถูกถอดออกทั้งหมดแล้ว
     (เหตุผลอยู่ที่หัวข้อ .ambient ใน assets/css/motion.css) บัตรจึงได้ออกมา
     เป็นโมชั่นกราฟิกหลักของหน้าแรกแทน — ไม่ต้องเช็คเงื่อนไขอะไรอีก

     ตัว lanyard.js หยุดคำนวณเองอยู่แล้วเมื่อบัตรเลื่อนพ้นจอ (IntersectionObserver)
     จึงไม่ต้องกลัวว่าจะเผา CPU ทิ้งตอนผู้ใช้เลื่อนไปอ่านเนื้อหาด้านล่าง */
  const lanyard = $("[data-lanyard]");
  if (lanyard && PF.initLanyard) PF.initLanyard(lanyard);

  /* ---------- 8. ปีปัจจุบันใน footer (พ.ศ.) ---------- */
  $$("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear() + 543);
  });

  /* ---------- 9. ชื่อและอีเมลจากไฟล์ข้อมูล ----------
     กันไม่ให้ต้องไล่แก้ชื่อตัวเองใน HTML ทีละหน้า */
  $$("[data-site-name]").forEach((el) => (el.textContent = PF.SITE.name));
  $$("[data-site-email]").forEach((el) => {
    el.textContent = PF.SITE.email;
    if (el.tagName === "A") el.href = `mailto:${PF.SITE.email}`;
  });

  /* ---------- 10. ตรวจว่าหน้า case study นี้มีข้อมูลจริงไหม ----------
     ช่วยตอนเพิ่มงานใหม่แล้วลืมเพิ่มลง projects.js — จะเห็นคำเตือนใน console
     แทนที่จะงงว่าทำไมลิงก์ prev/next ว่างเปล่า */
  const slug = document.body.dataset.case;
  if (slug && !PF.bySlug(slug)) {
    console.warn(
      `[portfolio] ไม่พบ slug "${slug}" ใน data/projects.js — ` +
      `ลิงก์ก่อนหน้า/ถัดไปจะไม่ทำงาน`
    );
  }
}

/* html.no-js ถูกใส่ไว้ใน <head> แล้วถอดออกตรงนี้
   ถ้าสคริปต์พังกลางทาง คลาสจะค้างอยู่ และ CSS จะบังคับให้เนื้อหาทั้งหมดมองเห็นได้
   ดีกว่าปล่อยให้หน้าว่างเปล่าเพราะทุกอย่างรอ [data-revealed] ที่ไม่มีวันมา */
document.documentElement.classList.remove("no-js");

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

})(window.PF = window.PF || {});
