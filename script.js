document.getElementById('year').textContent = new Date().getFullYear();

// Reveal on scroll
const reveals = Array.from(document.querySelectorAll('.reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); });
}, { threshold: 0.08 });
reveals.forEach(el => io.observe(el));

// Countdown
const DROP_DATE = new Date(Date.now() + 7*24*60*60*1000);
const countdownA = document.getElementById('countdown');
const countdownB = document.getElementById('dropCountdown');

function tick(){
  const now = new Date();
  const ms = DROP_DATE - now;

  if (ms <= 0){
    if (countdownA) countdownA.textContent = "LIVE";
    if (countdownB) countdownB.textContent = "LIVE";
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

  setTimeout(tick,1000);
}
tick();

// Mailing list demo
const form = document.getElementById('mailForm');
const note = document.getElementById('mailNote');
form && form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (note) note.textContent = "Locked in. Drop alerts coming.";
  form.reset();
});

// OUT NOW card clickable, buttons still work
const dropCard = document.querySelector('.card.drop[data-release-url]');
if (dropCard){
  dropCard.style.cursor = 'pointer';
  dropCard.addEventListener('click', function(e){
    if (e.target.closest('a, button')) return;
    const releaseUrl = dropCard.getAttribute('data-release-url') || 'https://youtube.com/@iiidtv';
    window.open(releaseUrl, '_blank', 'noopener');
  });
}

// Exact mockup pricing map
(function(){
  const PRODUCTS = [
    { id:'m01', slot:1,  type:'bundle',  name:'Capo Bundle Pack',     price:60, tag:'IN STOCK',    img:'./merch01.png' },
    { id:'m02', slot:2,  type:'hat',     name:'Capo Crown Hat',       price:25, tag:'IN STOCK',    img:'./merch02.png' },
    { id:'m03', slot:3,  type:'shirt',   name:'Capo Hustle Tee',      price:20, tag:'IN STOCK',    img:'./merch03.png' },
    { id:'m04', slot:4,  type:'hoodie',  name:'Capo Hustle Hoodie',   price:40, tag:'IN STOCK',    img:'./merch04.png' },
    { id:'m05', slot:5,  type:'hat',     name:'Diamond Crown Hat',    price:25, tag:'IN STOCK',    img:'./merch05.png' },
    { id:'m06', slot:6,  type:'shirt',   name:'Diamond Money Tee',    price:20, tag:'IN STOCK',    img:'./merch06.png' },
    { id:'m07', slot:7,  type:'hoodie',  name:'Diamond Money Hoodie', price:40, tag:'IN STOCK',    img:'./merch07.png' },
    { id:'m08', slot:8,  type:'shirt',   name:'Diamond Shield Tee',   price:20, tag:'IN STOCK',    img:'./merch08.png' },
    ...Array.from({length:22}, (_,i) => {
      const n = i + 9;
      return {
        id:`m${String(n).padStart(2,'0')}`,
        slot:n,
        type:'comingsoon',
        name:`Coming Soon ${String(n).padStart(2,'0')}`,
        price:0,
        tag:'COMING SOON',
        img:`./merch${String(n).padStart(2,'0')}.png`
      };
    })
  ];

  const grid = document.getElementById('merchGrid');
  if (grid){
    const order = { bundle:1, shirt:2, hat:3, hoodie:4, comingsoon:5 };

    PRODUCTS.sort((a,b) => {
      if (a.tag === "IN STOCK" && b.tag !== "IN STOCK") return -1;
      if (a.tag !== "IN STOCK" && b.tag === "IN STOCK") return 1;
      return (order[a.type] || 9) - (order[b.type] || 9);
    });

    grid.innerHTML = PRODUCTS.map(p => {
      const price = p.price ? `$${p.price}` : '—';
      const badge = p.type === 'bundle' ? 'BUNDLE DEAL' : p.tag;

      const primary = (p.tag === 'IN STOCK')
        ? `<button class="pill gold small add-to-cart" type="button" data-id="${p.id}">Add</button>`
        : `<a class="pill gold small" href="#mail">Notify me</a>`;

      return `
      <article class="card product" data-tag="${p.tag}" data-name="${p.name}" data-type="${p.type}">
        <div class="img">
          <img src="${p.img}" alt="${p.name}" loading="lazy"
               onerror="this.onerror=null;this.src='./placeholder_merch.png';">
          <div class="badge">${badge}</div>
        </div>

        <div class="body">
          <p class="name">${p.name}</p>
          <p class="price">${price}</p>
          <div class="actions">
            ${primary}
            <button class="pill small quick-view" type="button" data-id="${p.id}">View</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  // Modal
  const body = document.body;
  if (!document.getElementById('modalBackdrop')){
    const mb = document.createElement('div');
    mb.className = 'modal-backdrop';
    mb.id = 'modalBackdrop';
    mb.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
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
            <a class="pill small" href="#mail">Get alerts</a>
          </div>
        </div>
      </div>
    </div>`;
    body.appendChild(mb);
  }

  // Cart
  if (!document.getElementById('cartDrawer')){
    const drawer = document.createElement('aside');
    drawer.className = 'drawer';
    drawer.id = 'cartDrawer';
    drawer.setAttribute('aria-hidden','true');
    drawer.innerHTML = `<div class="drawer-head">
      <div style="font-family:'Black Ops One',system-ui,sans-serif; letter-spacing:1px;">CART</div>
      <button class="icon-btn" id="cartClose" aria-label="Close cart">✕</button>
    </div>
    <div class="drawer-body" id="cartBody"><div style="color:rgba(244,241,234,.72)">Your cart is empty.</div></div>
    <div class="drawer-foot">
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <div style="color:rgba(244,241,234,.72)">Total</div>
        <div id="cartTotal" style="font-weight:800">$0.00</div>
      </div>
      <button class="pill gold" type="button" style="width:100%">Checkout (later)</button>
    </div>`;
    body.appendChild(drawer);

    const fab = document.createElement('div');
    fab.className = 'cart-fab';
    fab.innerHTML = `<button class="pill gold" id="cartOpen" type="button">CART <span id="cartCount">(0)</span></button>`;
    body.appendChild(fab);
  }

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const modalImg = document.getElementById('modalImg');
  const modalName = document.getElementById('modalName');
  const modalPrice = document.getElementById('modalPrice');
  const modalAdd = document.getElementById('modalAdd');

  const cartDrawer = document.getElementById('cartDrawer');
  const cartOpen = document.getElementById('cartOpen');
  const cartClose = document.getElementById('cartClose');
  const cartBody = document.getElementById('cartBody');
  const cartTotal = document.getElementById('cartTotal');
  const cartCount = document.getElementById('cartCount');

  const KEY = 'capo_cart_v27';
  const loadCart = () => { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch(e){ return []; } };
  const saveCart = (c) => localStorage.setItem(KEY, JSON.stringify(c));
  const money = (n) => '$' + Number(n || 0).toFixed(2);

  function renderCart(){
    const cart = loadCart();
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

    cartBody.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => {
      const i = +b.dataset.inc; const c = loadCart(); c[i].qty++; saveCart(c); renderCart();
    });
    cartBody.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => {
      const i = +b.dataset.dec; const c = loadCart(); c[i].qty = Math.max(1, c[i].qty - 1); saveCart(c); renderCart();
    });
    cartBody.querySelectorAll('[data-rem]').forEach(b => b.onclick = () => {
      const i = +b.dataset.rem; const c = loadCart(); c.splice(i, 1); saveCart(c); renderCart();
    });
  }

  const openCart = () => { cartDrawer.classList.add('open'); cartDrawer.setAttribute('aria-hidden','false'); renderCart(); };
  const closeCart = () => { cartDrawer.classList.remove('open'); cartDrawer.setAttribute('aria-hidden','true'); };
  cartOpen && (cartOpen.onclick = openCart);
  cartClose && (cartClose.onclick = closeCart);

  const byId = (id) => PRODUCTS.find(p => p.id === id);

  document.addEventListener('click', (e) => {
    const t = e.target;

    if (t?.classList?.contains('quick-view')){
      const p = byId(t.dataset.id); if (!p) return;
      modalImg.src = p.img;
      modalImg.alt = p.name;
      modalName.textContent = p.name;
      modalPrice.textContent = p.price ? `$${p.price}` : '—';
      modalAdd.disabled = !(p.tag === 'IN STOCK');
      modalAdd.textContent = (p.tag === 'IN STOCK') ? 'Add to cart' : 'Not available yet';
      modalAdd.onclick = () => { if (p.tag !== 'IN STOCK') return; addToCart(p); openCart(); };
      modalBackdrop.style.display = 'flex';
    }

    if (t?.classList?.contains('add-to-cart')){
      const p = byId(t.dataset.id);
      if (p && p.tag === 'IN STOCK') addToCart(p);
    }
  });

  modalClose && (modalClose.onclick = () => modalBackdrop.style.display = 'none');
  modalBackdrop && modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) modalBackdrop.style.display = 'none';
  });

  function addToCart(p){
    const cart = loadCart();
    const f = cart.find(x => x.id === p.id);
    if (f) f.qty += 1;
    else cart.push({ id:p.id, name:p.name, price:p.price||0, qty:1 });
    saveCart(cart);
    renderCart();
  }

  // Filters
  document.querySelectorAll('.filter').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.filter').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const tag = b.dataset.filter;
      document.querySelectorAll('.product').forEach(c => {
        const t = c.getAttribute('data-tag') || 'IN STOCK';
        c.style.display = (tag === 'ALL' || t === tag) ? '' : 'none';
      });
    };
  });

  // Search
  const s = document.getElementById('merchSearch');
  s && (s.oninput = () => {
    const q = s.value.trim().toLowerCase();
    document.querySelectorAll('.product').forEach(c => {
      const name = (c.getAttribute('data-name') || '').toLowerCase();
      c.style.opacity = (!q || name.includes(q)) ? '1' : '.18';
    });
  });

  renderCart();
})();