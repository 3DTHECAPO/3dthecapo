/* v22 app.js — simple product grid + cart (localStorage) */
const PRODUCTS = window.__PRODUCTS__ || [];

const grid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const drawer = document.getElementById('drawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');

const FILTERS = document.querySelectorAll('.chip');
let activeFilter = 'all';

// Edit these later:
const VIDEO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";
const TRACKS = {
  track1: { title: "Track 1 (placeholder)", file: "" },
  track2: { title: "Track 2 (placeholder)", file: "" },
  track3: { title: "Track 3 (placeholder)", file: "" }
};

// Countdown: set a future date/time (local)
const DROP_AT = (() => {
  const d = new Date();
  d.setHours(d.getHours() + 18); // default: 18 hours from first load
  return d;
})();

function money(n){
  return `$${(n ?? 0).toFixed(2)}`;
}

function loadCart(){
  try{
    return JSON.parse(localStorage.getItem('capo_cart') || '{}');
  }catch{
    return {};
  }
}
function saveCart(cart){
  localStorage.setItem('capo_cart', JSON.stringify(cart));
}

function cartQuantity(cart){
  return Object.values(cart).reduce((a,b)=>a+b,0);
}
function cartSubtotal(cart){
  let total = 0;
  for (const [id, qty] of Object.entries(cart)){
    const p = PRODUCTS.find(x=>x.id===id);
    if (!p || !p.price) continue;
    total += p.price * qty;
  }
  return total;
}

function openCart(){
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
}
function closeCartFn(){
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
}

function addToCart(id){
  const cart = loadCart();
  cart[id] = (cart[id] || 0) + 1;
  saveCart(cart);
  renderCart();
}

function setQty(id, qty){
  const cart = loadCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart(cart);
  renderCart();
}

function renderCart(){
  const cart = loadCart();
  cartCount.textContent = cartQuantity(cart);

  const entries = Object.entries(cart);
  if (entries.length === 0){
    cartItems.innerHTML = `<div style="color:rgba(255,255,255,.65);font-weight:800;padding:10px;border:1px dashed rgba(255,255,255,.18);border-radius:16px;background:rgba(0,0,0,.22)">Cart is empty.</div>`;
    cartTotal.textContent = money(0);
    return;
  }

  cartItems.innerHTML = entries.map(([id, qty])=>{
    const p = PRODUCTS.find(x=>x.id===id) || {name:'Item', price:0, img:null};
    const img = p.img ? `<img src="${p.img}" alt="${p.name}">` : `<img src="" alt="" style="display:none">`;
    return `
      <div class="cartitem">
        ${img}
        <div>
          <div class="cartitem__name">${p.name}</div>
          <div class="cartitem__meta">${p.price ? money(p.price) : 'Coming soon'} • ID ${id}</div>
        </div>
        <div class="qty">
          <div class="qty__row">
            <button data-dec="${id}" aria-label="Decrease">−</button>
            <div class="qty__n">${qty}</div>
            <button data-inc="${id}" aria-label="Increase">+</button>
          </div>
          <button data-rm="${id}" aria-label="Remove" style="width:auto;padding:0 10px;height:34px;border-radius:12px;">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  cartTotal.textContent = money(cartSubtotal(cart));
}

function matchesFilter(p){
  const isComing = !p.price || !p.img;
  if (activeFilter === 'coming') return isComing;
  if (activeFilter === 'drop') return !isComing;
  return true;
}

function renderGrid(){
  const q = (searchInput.value || '').trim().toLowerCase();
  const items = PRODUCTS
    .filter(matchesFilter)
    .filter(p => (p.name || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q));

  grid.innerHTML = items.map(p=>{
    const coming = (!p.price || !p.img);
    const img = p.img ? `<img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.remove(); this.parentElement.classList.add('missing')">`
                      : '';
    return `
      <article class="card">
        <div class="card__imgbox">
          ${img}
          <div class="badge">${coming ? 'COMING SOON' : 'LIVE'}</div>
        </div>
        <div class="card__body">
          <div class="card__title">${p.name}</div>
          <div class="card__meta">
            <span>${coming ? 'TBD' : money(p.price)}</span>
            <span>${p.id.toUpperCase()}</span>
          </div>
          <div class="card__actions">
            ${coming
              ? `<button class="btn" data-notify="${p.id}">Notify me</button>`
              : `<button class="btn primary" data-add="${p.id}">Add to cart</button>`
            }
          </div>
        </div>
      </article>
    `;
  }).join('');

  // wire buttons
  grid.querySelectorAll('[data-add]').forEach(btn=>{
    btn.addEventListener('click', () => addToCart(btn.dataset.add));
  });
  grid.querySelectorAll('[data-notify]').forEach(btn=>{
    btn.addEventListener('click', () => alert('Saved (demo). Hook this up to email later.'));
  });
}

function setupFilters(){
  FILTERS.forEach(chip=>{
    chip.addEventListener('click', ()=>{
      FILTERS.forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderGrid();
    });
  });
}

function setupMail(){
  const form = document.getElementById('mailForm');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) return;
    const list = JSON.parse(localStorage.getItem('capo_emails') || '[]');
    if (!list.includes(email)) list.push(email);
    localStorage.setItem('capo_emails', JSON.stringify(list));
    form.reset();
    alert('Joined (demo).');
  });
}

function setupAudio(){
  const audio = document.getElementById('audio');
  document.querySelectorAll('.track').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.track').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const t = TRACKS[btn.dataset.track];
      if (t && t.file){
        audio.src = t.file;
        audio.play().catch(()=>{});
      }else{
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        alert('No audio file set yet. Edit TRACKS in app.js.');
      }
    });
  });

  // video
  const frame = document.getElementById('videoFrame');
  frame.src = VIDEO_URL;
}

function tickCountdown(){
  const el = document.getElementById('countdown');
  const now = new Date();
  const diff = DROP_AT - now;
  if (diff <= 0){
    el.textContent = "DROP LIVE";
    return;
  }
  const h = Math.floor(diff / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  const s = Math.floor((diff % 6e4) / 1000);
  const pad = (n)=>String(n).padStart(2,'0');
  el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  requestAnimationFrame(()=>{});
}
setInterval(tickCountdown, 1000);
tickCountdown();

// cart drawer events
cartBtn.addEventListener('click', openCart);
closeCart.addEventListener('click', closeCartFn);
drawerBackdrop.addEventListener('click', closeCartFn);
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeCartFn(); });

cartItems.addEventListener('click', (e)=>{
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const cart = loadCart();

  if (t.dataset.inc){
    const id = t.dataset.inc;
    setQty(id, (cart[id] || 0) + 1);
  }
  if (t.dataset.dec){
    const id = t.dataset.dec;
    setQty(id, (cart[id] || 0) - 1);
  }
  if (t.dataset.rm){
    const id = t.dataset.rm;
    setQty(id, 0);
  }
});

checkoutBtn.addEventListener('click', ()=>{
  alert('Checkout is demo-only. Connect Stripe/Shopify later.');
});

// init
setupFilters();
setupMail();
setupAudio();
renderGrid();
renderCart();