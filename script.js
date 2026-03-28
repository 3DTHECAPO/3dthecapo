(function(){
  'use strict';
  const byId = (id) => document.getElementById(id);
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const yearEl = byId('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const countdownTargets = [byId('countdown')].filter(Boolean);
  const DROP_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  function tick(){
    const now = new Date();
    const ms = DROP_DATE - now;
    if (ms <= 0){
      countdownTargets.forEach(el => el.textContent = 'LIVE');
      return;
    }
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    countdownTargets.forEach(el => el.textContent = `${d}d ${h}h ${m}m ${ss}s`);
    setTimeout(tick, 1000);
  }
  tick();

  const form = byId('mailForm');
  const note = byId('mailNote');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (note) note.textContent = 'Locked in. Drop alerts coming.';
      form.reset();
    });
  }

  qsa('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      qsa('.merch-grid .product').forEach(card => {
        const tag = card.getAttribute('data-tag') || '';
        card.style.display = (filter === 'ALL' || tag === filter) ? '' : 'none';
      });
    });
  });

  const search = byId('merchSearch');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      qsa('.merch-grid .product').forEach(card => {
        const txt = ((qs('.name', card)?.textContent || '') + ' ' + (qs('.price', card)?.textContent || '')).toLowerCase();
        card.style.display = (!q || txt.includes(q)) ? '' : 'none';
      });
    });
  }

  const modal = byId('productModal');
  const modalImage = byId('modalImage');
  const modalName = byId('modalName');
  const modalPrice = byId('modalPrice');
  const closeModal = byId('closeModal');

  qsa('.quick-view').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!modal) return;
      if (modalImage) modalImage.src = btn.dataset.img || './merch01.png';
      if (modalName) modalName.textContent = btn.dataset.name || 'Product';
      if (modalPrice) modalPrice.textContent = btn.dataset.price || '';
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    });
  });

  function hideModal(){
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
  if (closeModal) closeModal.addEventListener('click', hideModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }

  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();
  const ids = ['vaultIntro', 'unlock-track', 'unlock-ep', 'unlock-video', 'unlock-merch', 'unlock-bundle'];
  ids.forEach(id => { const el = byId(id); if (el) el.classList.add('hidden'); });
  const show = (id) => { const el = byId(id); if (el) el.classList.remove('hidden'); };
  if (unlock) show('vaultIntro');
  if (unlock === 'track' || unlock === 'exclusive') show('unlock-track');
  if (unlock === 'ep' || unlock === 'preview') show('unlock-ep');
  if (unlock === 'video') show('unlock-video');
  if (unlock === 'merch') show('unlock-merch');
  if (unlock === 'bundle') show('unlock-bundle');
})();


/* =========================
   V10 FULL EXPERIENCE LAYER
   ========================= */
(function(){
  const overlay = document.getElementById('vaultOverlay');
  const skip = document.getElementById('vaultSkip');
  if(overlay){
    requestAnimationFrame(()=> overlay.classList.add('open'));
    const closeOverlay = () => {
      overlay.classList.add('hidden');
      setTimeout(()=> {
        if(overlay && overlay.parentNode){ overlay.remove(); }
      }, 800);
    };
    setTimeout(closeOverlay, 3200);
    if(skip){ skip.addEventListener('click', closeOverlay); }
  }

  const targets = Array.from(document.querySelectorAll('.header, .section, .divider, .card')).filter(Boolean);
  targets.forEach(el => el.classList.add('reveal-up'));
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, {threshold: 0.12});
  targets.forEach(el => io.observe(el));
})();
