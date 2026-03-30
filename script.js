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
})();

/* V18 full drag-drop upgrades */
(function(){
  const overlay = document.getElementById('vaultOverlay');
  const skip = document.getElementById('vaultSkip');
  const title = document.getElementById('vaultTitle');
  const note = document.getElementById('vaultNote');
  if(overlay){
    const run = () => {
      overlay.classList.add('unlocking');
      if(title) title.textContent = 'AUTHORIZATION ACCEPTED';
      if(note) note.textContent = 'Retracting bolts…';
      setTimeout(()=>{
        overlay.classList.add('opened');
        if(title) title.textContent = 'ACCESS GRANTED';
        if(note) note.textContent = 'Opening vault door…';
      }, 1450);
      setTimeout(()=>{
        overlay.classList.add('hidden');
        setTimeout(()=> overlay.remove(), 650);
      }, 3100);
    };
    requestAnimationFrame(run);
    if(skip){ skip.addEventListener('click', ()=>{ overlay.classList.add('hidden'); setTimeout(()=> overlay.remove(), 650); }); }
  }

  // support multiple countdown targets
  const ids = ['countdown','dropCountdown','merchCountdown'];
  const targets = ids.map(id => document.getElementById(id)).filter(Boolean);
  if(targets.length){
    const DROP_DATE = new Date(Date.now() + 7*24*60*60*1000);
    function tickAll(){
      const now = new Date();
      const ms = DROP_DATE - now;
      if(ms <= 0){ targets.forEach(el => el.textContent = 'LIVE'); return; }
      const s = Math.floor(ms/1000), d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60), ss = s%60;
      targets.forEach(el => el.textContent = `${d}d ${h}h ${m}m ${ss}s`);
      setTimeout(tickAll, 1000);
    }
    tickAll();
  }

  // main-site unlock previews
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


/* V21 full real experience */
(function(){
  const enterBtn = document.getElementById('enterSiteBtn');
  const body = document.body;
  const intro = document.getElementById('vaultIntroScreen');
  if (enterBtn && intro) {
    enterBtn.addEventListener('click', () => {
      body.classList.add('vault-open');
      setTimeout(() => {
        intro.remove();
      }, 650);
    });
  }

  // support multiple countdowns without breaking older logic
  const extraCountdowns = ['dropCountdown','merchCountdown']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const baseCountdown = document.getElementById('countdown');
  const allCountdowns = [baseCountdown, ...extraCountdowns].filter(Boolean);
  if (allCountdowns.length) {
    const DROP_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    function tickAll(){
      const now = new Date();
      const ms = DROP_DATE - now;
      if (ms <= 0){
        allCountdowns.forEach(el => el.textContent = 'LIVE');
        return;
      }
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      allCountdowns.forEach(el => el.textContent = `${d}d ${h}h ${m}m ${ss}s`);
      setTimeout(tickAll, 1000);
    }
    tickAll();
  }
})();


/* ===== V23 FULL EXPERIENCE UPGRADE ===== */
(function(){
  const enterBtn = document.getElementById('enterSiteBtn');
  const intro = document.getElementById('vaultIntroScreen');
  document.body.classList.add('site-entering');
  if (enterBtn && intro) {
    enterBtn.addEventListener('click', () => {
      document.body.classList.add('vault-open');
      setTimeout(() => {
        if (intro.parentNode) intro.remove();
        document.body.classList.remove('site-entering');
        document.body.classList.add('site-loaded');
      }, 650);
    });
  } else {
    document.body.classList.remove('site-entering');
    document.body.classList.add('site-loaded');
  }
})();
