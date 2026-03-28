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
      if (note) note.textContent = 'Locked in. Album alerts coming.';
      form.reset();
    });
  }

  let activeFilter = 'ALL';
  const search = byId('merchSearch');

  function applyMerchFilters() {
    const q = (search?.value || '').trim().toLowerCase();
    qsa('.merch-grid .product').forEach(card => {
      const tag = card.getAttribute('data-tag') || '';
      const txt = ((qs('.name', card)?.textContent || '') + ' ' + (qs('.price', card)?.textContent || '')).toLowerCase();
      const tagMatch = activeFilter === 'ALL' || tag === activeFilter;
      const textMatch = !q || txt.includes(q);
      card.style.display = (tagMatch && textMatch) ? '' : 'none';
    });
  }

  qsa('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'ALL';
      applyMerchFilters();
    });
  });

  if (search) search.addEventListener('input', applyMerchFilters);

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

  const hero = qs('.hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      const y = Math.min(window.scrollY * 0.08, 18);
      hero.style.transform = `translateY(${y}px)`;
    }, { passive:true });
  }

  applyMerchFilters();
})();/* V15 full system fixes */
(function(){
  // Support multiple countdown targets
  const ids = ['countdown','dropCountdown','merchCountdown'];
  const targets = ids.map(id => document.getElementById(id)).filter(Boolean);
  if(targets.length){
    const DROP_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    function tickAll(){
      const now = new Date();
      const ms = DROP_DATE - now;
      if(ms <= 0){
        targets.forEach(el => el.textContent = 'LIVE');
        return;
      }
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      targets.forEach(el => { el.textContent = `${d}d ${h}h ${m}m ${ss}s`; });
      setTimeout(tickAll, 1000);
    }
    tickAll();
  }

  // Main-site unlock preview logic (keeps EP and Album separate)
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const previewPanels = {
    track: document.getElementById('unlock-track'),
    ep: document.getElementById('unlock-ep'),
    album: document.getElementById('unlock-album'),
    video: document.getElementById('unlock-video'),
    merch: document.getElementById('unlock-merch'),
    bundle: document.getElementById('unlock-bundle')
  };

  Object.values(previewPanels).forEach(el => el && el.classList.add('hidden'));
  if (unlock && previewPanels[unlock]) {
    const intro = document.getElementById('vaultIntro');
    if (intro) intro.classList.remove('hidden');
    previewPanels[unlock].classList.remove('hidden');
  }
})();