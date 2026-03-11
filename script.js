(function(){
  'use strict';
  const byId = (id) => document.getElementById(id);
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const yearEl = byId('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const reveals = qsa('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); });
    }, { threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('on'));
  }

  const countdownTargets = [byId('countdown'), byId('dropCountdown')].filter(Boolean);
  const DROP_DATE = new Date(Date.now() + 7*24*60*60*1000);
  function tick(){
    const now = new Date();
    const ms = DROP_DATE - now;
    if (ms <= 0){ countdownTargets.forEach(el => el.textContent = 'LIVE'); return; }
    const s = Math.floor(ms/1000);
    const d = Math.floor(s/86400);
    const h = Math.floor((s%86400)/3600);
    const m = Math.floor((s%3600)/60);
    const ss = s%60;
    const txt = `${d}d ${h}h ${m}m ${ss}s`;
    countdownTargets.forEach(el => el.textContent = txt);
    setTimeout(tick,1000);
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

  const dropCard = qs('.card.drop');
  if (dropCard){
    dropCard.style.cursor = 'pointer';
    dropCard.addEventListener('click', function(e){
      if (e.target.closest('a, button')) return;
      window.location.hash = '#music';
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
        card.style.opacity = (!q || txt.includes(q)) ? '1' : '.18';
      });
    });
  }

  qsa('.quick-view').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name || 'Item';
      const price = btn.dataset.price || '';
      alert(`${name}\n${price}`);
    });
  });

  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();
  const ids = ['vaultIntro','unlock-track','unlock-ep','unlock-video','unlock-merch','unlock-bundle'];
  ids.forEach(id => { const el = byId(id); if (el) el.style.display = 'none'; });
  const show = (id) => { const el = byId(id); if (el) el.style.display = 'block'; };
  if (unlock) show('vaultIntro');
  if (unlock === 'track' || unlock === 'exclusive') show('unlock-track');
  if (unlock === 'ep' || unlock === 'preview') show('unlock-ep');
  if (unlock === 'video') show('unlock-video');
  if (unlock === 'merch') show('unlock-merch');
  if (unlock === 'bundle') show('unlock-bundle');
})(); 
