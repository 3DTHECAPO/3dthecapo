
/* v24 — keep v16 look, add merch auto-grid + NFC landing support hooks */

(() => {
  // ====== CONFIG ======
  // Set your next drop date/time (local). Example: '2026-04-01T12:00:00'
  const DROP_DATE_ISO = '2026-04-01T12:00:00';

  // Merch slots: put your images in root as merch01.png, merch02.png, etc.
  // Increase totalSlots any time and just add the files.
  const totalSlots = 30;

  // Optional product links (same index as slot: 1..totalSlots)
  // Example: productLinks[1] = 'https://yourstore.com/products/tee-1'
  const productLinks = {};

  // ====== UTIL ======
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function fmtTime(ms) {
    if (ms <= 0) return 'LIVE';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d}d ${pad(h)}h ${pad(m)}m ${pad(ss)}s`;
  }

  // ====== COUNTDOWN ======
  function startCountdown() {
    const el1 = $('#countdown');
    const el2 = $('#countdown2');
    const target = new Date(DROP_DATE_ISO).getTime();

    function tick() {
      const now = Date.now();
      const diff = target - now;
      const out = fmtTime(diff);
      if (el1) el1.textContent = out;
      if (el2) el2.textContent = out;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ====== MERCH GRID ======
  function buildMerchGrid() {
    const grid = $('#merchGrid');
    if (!grid) return;

    const frag = document.createDocumentFragment();

    for (let i = 1; i <= totalSlots; i++) {
      const file = `merch${String(i).padStart(2, '0')}.png`;

      const a = document.createElement('a');
      a.className = 'merchCard';
      a.href = productLinks[i] || '#';
      a.onclick = (e) => {
        if (!productLinks[i]) e.preventDefault();
      };

      const imgWrap = document.createElement('div');
      imgWrap.className = 'merchCard__img';

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = `Merch ${i}`;
      img.src = file;

      // If file missing, show a clean placeholder (no broken image icon)
      img.onerror = () => {
        img.style.display = 'none';
        imgWrap.classList.add('merchCard__img--placeholder');
        imgWrap.innerHTML = `<div class="merchPh">
          <div class="merchPh__top">SLOT ${String(i).padStart(2, '0')}</div>
          <div class="merchPh__bot">Drop a PNG named <b>${file}</b></div>
        </div>`;
      };

      const meta = document.createElement('div');
      meta.className = 'merchCard__meta';
      meta.innerHTML = `
        <div class="merchCard__name">Merch #${String(i).padStart(2, '0')}</div>
        <div class="merchCard__sub muted">${productLinks[i] ? 'Available' : 'Placeholder / Coming Soon'}</div>
      `;

      imgWrap.appendChild(img);
      a.appendChild(imgWrap);
      a.appendChild(meta);
      frag.appendChild(a);
    }

    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  // ====== NFC LINK COPY ======
  function setupNfcCopy() {
    const btn = $('#copyNfcLink');
    const note = $('#nfcNote');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      // default tag id "ep" — edit to whatever you want
      const link = `${location.origin}${location.pathname.replace(/index\.html$/,'')}nfc/?t=ep`;
      try {
        await navigator.clipboard.writeText(link);
        if (note) note.textContent = `Copied: ${link}`;
      } catch (e) {
        if (note) note.textContent = `Copy failed. Use this: ${link}`;
      }
    });
  }

  // ====== MAILING LIST (DEMO) ======
  function setupMailForm() {
    const form = $('#mailForm');
    const note = $('#mailNote');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = new FormData(form).get('email');
      if (!email) return;
      // demo-only: store locally
      try {
        const key = 'capo_emails_demo';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ email, ts: Date.now() });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
      form.reset();
      if (note) note.textContent = 'Saved locally (demo). Connect Mailchimp/Formspree when ready.';
    });
  }

  // ====== REVEAL ANIMS ======
  function setupReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || els.length === 0) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('reveal--in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach((el) => io.observe(el));
  }

  // ====== INIT ======
  function init() {
    // year
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();

    startCountdown();
    buildMerchGrid();
    setupNfcCopy();
    setupMailForm();
    setupReveal();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
