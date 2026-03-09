
(function(){
  'use strict';

  const byId = (id) => document.getElementById(id);
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Year
  const yearEl = byId('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Reveal on scroll
  const reveals = qsa('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); });
    }, { threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('on'));
  }

  // Countdown
  const DROP_DATE = new Date(Date.now() + 7*24*60*60*1000);
  const countdownA = byId('countdown');
  const countdownB = byId('dropCountdown');
  function tick(){
    const ms = DROP_DATE - new Date();
    if (ms <= 0){
      if (countdownA) countdownA.textContent = 'LIVE';
      if (countdownB) countdownB.textContent = 'LIVE';
      return;
    }
    const s = Math.floor(ms/1000);
    const d = Math.floor(s/86400);
    const h = Math.floor((s%86400)/3600);
    const m = Math.floor((s%3600)/60);
    const ss = s%60;
    const txt = `${d}d ${h}h ${m}m ${ss}s`;
    if (countdownA) countdownA.textContent = txt;
    if (countdownB) countdownB.textContent = txt;
    setTimeout(tick, 1000);
  }
  tick();

  // OUT NOW clickable
  const dropCard = qs('.card.drop');
  if (dropCard) {
    dropCard.style.cursor = 'pointer';
    dropCard.addEventListener('click', function(e){
      if (e.target.closest('a, button')) return;
      window.open('https://youtube.com/@iiidtv', '_blank', 'noopener');
    });
  }

  // Mailing list
  const form = byId('mailForm');
  const note = byId('mailNote');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (note) note.textContent = "Locked in. Drop alerts coming.";
      form.reset();
    });
  }

  // Map merch items 1-16 exactly as provided by user
  const productCards = qsa('.merch-grid .product:not(.featured)');
  const map = {
    1:  {name:'Capo Hat',       price:25, unlock:'merch'},
    2:  {name:'Capo Bundle',    price:60, unlock:'bundle'},
    3:  {name:'Capo Hat',       price:25, unlock:'merch'},
    4:  {name:'Capo Chip Tee',  price:20, unlock:'track'},
    5:  {name:'Chip Hoodie',    price:40, unlock:'video'},
    6:  {name:'Capo Hoodie',    price:40, unlock:'video'},
    7:  {name:'Capo Bundle',    price:60, unlock:'bundle'},
    8:  {name:'Capo Tee',       price:20, unlock:'track'},
    9:  {name:'Capo Bundle',    price:60, unlock:'bundle'},
    10: {name:'Capo Trucker',   price:25, unlock:'merch'},
    11: {name:'Capo Tee',       price:20, unlock:'track'},
    12: {name:'Capo Hoodie',    price:40, unlock:'video'},
    13: {name:'Capo Trucker',   price:25, unlock:'merch'},
    14: {name:'Capo Tee',       price:20, unlock:'track'},
    15: {name:'Capo Hoodie',    price:40, unlock:'video'},
    16: {name:'Capo Tee',       price:20, unlock:'track'}
  };

  productCards.forEach((card, idx) => {
    const n = idx + 1;
    const img = qs('img', card);
    const nameEl = qs('.name', card);
    const priceEl = qs('.price', card);
    const addBtn = qs('.add-to-cart', card);
    const viewBtn = qs('.quick-view', card);
    if (map[n]) {
      const data = map[n];
      card.dataset.unlock = data.unlock;
      if (nameEl) nameEl.textContent = data.name;
      if (priceEl) priceEl.textContent = `$${data.price}`;
      if (addBtn) {
        addBtn.dataset.name = data.name;
        addBtn.dataset.price = `$${data.price}`;
      }
      if (viewBtn) {
        viewBtn.dataset.name = data.name;
        viewBtn.dataset.price = `$${data.price}`;
      }
      if (img) img.alt = data.name;
    } else {
      const addBtn = qs('.add-to-cart', card);
      const viewBtn = qs('.quick-view', card);
      card.dataset.unlock = 'merch';
      if (addBtn && addBtn.dataset.price === '$—') addBtn.disabled = true;
      if (viewBtn && !viewBtn.dataset.price) viewBtn.dataset.price = '—';
    }

    // Add Unlock button if missing
    const actions = qs('.actions', card);
    if (actions && !qs('.unlock-link', actions)) {
      const a = document.createElement('a');
      a.className = 'pill small unlock-link';
      a.href = `?unlock=${encodeURIComponent(card.dataset.unlock || 'merch')}`;
      a.textContent = 'Unlock';
      actions.appendChild(a);
    }
  });

  // Search + filters
  qsa('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tag = btn.dataset.filter;
      productCards.forEach(card => {
        const t = card.getAttribute('data-tag') || '';
        card.style.display = (tag === 'ALL' || t === tag) ? '' : 'none';
      });
      const featured = qs('.product.featured');
      if (featured && tag !== 'ALL' && tag !== 'COMING SOON') featured.style.display = 'none';
      else if (featured) featured.style.display = '';
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

  // Create modal if missing
  let modalBackdrop = byId('modalBackdrop');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'modalBackdrop';
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.style.display = 'none';
    modalBackdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div style="font-family:'Black Ops One',system-ui,sans-serif; letter-spacing:1px;">PREVIEW</div>
          <button class="modal-close" id="modalClose" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <img id="modalImg" src="" alt=""/>
          <div class="modal-info">
            <div id="modalName" style="font-family:'Black Ops One',system-ui,sans-serif; text-transform:uppercase; letter-spacing:1px; font-size:22px;"></div>
            <div id="modalPrice" style="margin-top:6px; color:rgba(244,241,234,.72)"></div>
            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="pill gold small" id="modalAdd" type="button">Add to cart</button>
              <a class="pill small" id="modalUnlock" href="#mail">Unlock</a>
              <a class="pill small" href="#mail">Get alerts</a>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalBackdrop);
  }

  // Create cart drawer if missing
  let cartDrawer = byId('cartDrawer');
  if (!cartDrawer) {
    cartDrawer = document.createElement('aside');
    cartDrawer.className = 'drawer';
    cartDrawer.id = 'cartDrawer';
    cartDrawer.setAttribute('aria-hidden','true');
    cartDrawer.innerHTML = `
      <div class="drawer-head">
        <div style="font-family:'Black Ops One',system-ui,sans-serif; letter-spacing:1px;">CART</div>
        <button class="icon-btn" id="cartClose" aria-label="Close cart">✕</button>
      </div>
      <div class="drawer-body" id="cartBody"><div style="color:rgba(244,241,234,.72)">Your cart is empty.</div></div>
      <div class="drawer-foot">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <div style="color:rgba(244,241,234,.72)">Total</div>
          <div id="cartTotal" style="font-weight:800">$0.00</div>
        </div>
        <button class="pill gold" type="button" id="checkoutBtn" style="width:100%">Checkout (later)</button>
      </div>`;
    document.body.appendChild(cartDrawer);

    const fab = document.createElement('div');
    fab.className = 'cart-fab';
    fab.innerHTML = `<button class="pill gold" id="cartOpen" type="button">CART <span id="cartCount">(0)</span></button>`;
    document.body.appendChild(fab);
  }

  const modalClose = byId('modalClose');
  const modalImg = byId('modalImg');
  const modalName = byId('modalName');
  const modalPrice = byId('modalPrice');
  const modalAdd = byId('modalAdd');
  const modalUnlock = byId('modalUnlock');

  const cartOpen = byId('cartOpen');
  const cartClose = byId('cartClose');
  const cartBody = byId('cartBody');
  const cartTotal = byId('cartTotal');
  const cartCount = byId('cartCount');
  const checkoutBtn = byId('checkoutBtn');

  const KEY = 'capo_cart_safe_v35';
  const loadCart = () => { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch(e){ return []; } };
  const saveCart = (c) => localStorage.setItem(KEY, JSON.stringify(c));
  const money = (n) => '$' + Number(n || 0).toFixed(2);

  function renderCart(){
    const cart = loadCart();
    if (!cartBody || !cartTotal || !cartCount) return;
    if (!cart.length){
      cartBody.innerHTML = `<div style="color:rgba(244,241,234,.72)">Your cart is empty.</div>`;
      cartTotal.textContent = '$0.00';
      cartCount.textContent = '(0)';
      return;
    }
    let total = 0;
    cartBody.innerHTML = cart.map((it,idx) => {
      total += it.price * it.qty;
      return `<div class="cart-item">
        <div class="meta">
          <div style="font-weight:800">${it.name}</div>
          <div style="color:rgba(244,241,234,.72)">${money(it.price)} each</div>
        </div>
        <div class="qty">
          <button class="icon-btn" data-dec="${idx}">-</button>
          <div style="min-width:22px;text-align:center">${it.qty}</div>
          <button class="icon-btn" data-inc="${idx}">+</button>
          <button class="icon-btn" data-rem="${idx}">✕</button>
        </div>
      </div>`;
    }).join('');
    cartTotal.textContent = money(total);
    cartCount.textContent = '(' + cart.reduce((s,it) => s + it.qty, 0) + ')';

    qsa('[data-inc]', cartBody).forEach(b => b.onclick = () => { const i=+b.dataset.inc; const c=loadCart(); c[i].qty++; saveCart(c); renderCart(); });
    qsa('[data-dec]', cartBody).forEach(b => b.onclick = () => { const i=+b.dataset.dec; const c=loadCart(); c[i].qty=Math.max(1,c[i].qty-1); saveCart(c); renderCart(); });
    qsa('[data-rem]', cartBody).forEach(b => b.onclick = () => { const i=+b.dataset.rem; const c=loadCart(); c.splice(i,1); saveCart(c); renderCart(); });
  }

  const openCart = () => { if (cartDrawer){ cartDrawer.classList.add('open'); cartDrawer.setAttribute('aria-hidden','false'); renderCart(); } };
  const closeCart = () => { if (cartDrawer){ cartDrawer.classList.remove('open'); cartDrawer.setAttribute('aria-hidden','true'); } };
  if (cartOpen) cartOpen.onclick = openCart;
  if (cartClose) cartClose.onclick = closeCart;
  if (checkoutBtn) checkoutBtn.onclick = () => alert("Checkout is demo right now. Tell me Shopify / Stripe / BigCartel and I'll connect real checkout.");

  function addToCart(name, price, sku){
    const cart = loadCart();
    const f = cart.find(x => x.sku === sku);
    if (f) f.qty += 1;
    else cart.push({ sku, name, price: Number(price)||0, qty: 1 });
    saveCart(cart);
    renderCart();
  }

  // Button wiring
  qsa('.add-to-cart').forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.product');
      const name = btn.dataset.name || qs('.name', card)?.textContent || `Item ${idx+1}`;
      const price = (btn.dataset.price || '').replace('$','').replace('—','0');
      const sku = `m${String(idx+1).padStart(2,'0')}`;
      if (!Number(price)) return;
      addToCart(name, price, sku);
      openCart();
    });
  });

  qsa('.quick-view').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      if (!modalBackdrop || !modalImg || !modalName || !modalPrice || !modalAdd || !modalUnlock) return;
      const card = btn.closest('.product');
      const name = btn.dataset.name || qs('.name', card)?.textContent || `Item ${idx+1}`;
      const priceTxt = btn.dataset.price || qs('.price', card)?.textContent || '—';
      const img = btn.dataset.img || qs('img', card)?.getAttribute('src') || '';
      const unlock = card?.dataset.unlock || 'merch';
      modalImg.src = img;
      modalImg.alt = name;
      modalName.textContent = name;
      modalPrice.textContent = priceTxt;
      modalUnlock.href = `?unlock=${encodeURIComponent(unlock)}`;
      const numericPrice = Number(String(priceTxt).replace('$','').replace('—','0'));
      modalAdd.disabled = !(numericPrice > 0);
      modalAdd.textContent = numericPrice > 0 ? 'Add to cart' : 'Not available yet';
      modalAdd.onclick = () => {
        if (!(numericPrice > 0)) return;
        addToCart(name, numericPrice, `modal-${idx+1}`);
        openCart();
      };
      modalBackdrop.style.display = 'flex';
    });
  });

  if (modalClose) modalClose.onclick = () => { modalBackdrop.style.display = 'none'; };
  if (modalBackdrop) modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) modalBackdrop.style.display = 'none'; });

  renderCart();

  // NFC unlock system for current HTML ids
  (function(){
    const params = new URLSearchParams(window.location.search);
    const unlock = (params.get('unlock') || '').toLowerCase();

    const intro = byId('vaultIntro');
    const track = byId('unlock-track');
    const ep = byId('unlock-ep');
    const video = byId('unlock-video');
    const merch = byId('unlock-merch');
    const bundle = byId('unlock-bundle');

    const show = (el) => { if (el) el.style.display = 'block'; };

    if (unlock) show(intro);
    if (unlock === 'track' || unlock === 'exclusive') show(track);
    if (unlock === 'ep' || unlock === 'preview') show(ep);
    if (unlock === 'video') show(video);
    if (unlock === 'merch') show(merch);
    if (unlock === 'bundle') show(bundle);
  })();
})();
