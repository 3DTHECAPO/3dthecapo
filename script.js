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

  qsa('.quick-view, .add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!modal) return;
      if (modalImage) modalImage.src = btn.dataset.img || './merch_hat.jpg';
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
})();


/* recreated whole-site upgrades */
(function(){
  window.requestAnimationFrame(() => {
    document.body.classList.add('site-loaded');
  });
})();
