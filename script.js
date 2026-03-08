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

document.getElementById('year').textContent = new Date().getFullYear();

// mailing list (demo)
const form = document.getElementById('mailForm');
const note = document.getElementById('mailNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.textContent = "Submitted (demo). Connect Mailchimp / Formspree when you're ready.";
  form.reset();
});

// cart drawer (demo UI)
const drawer = document.getElementById('drawer');
const backdrop = document.getElementById('backdrop');
const cartBtn = document.getElementById('cartBtn');
const closeDrawer = document.getElementById('closeDrawer');
const drawerBody = document.getElementById('drawerBody');
const drawerTotal = document.getElementById('drawerTotal');
const cartCount = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkoutBtn');

const cart = new Map(); // sku -> {sku,name,price,qty}

function money(n){ return `$${n.toFixed(2)}`; }

function openCart(){
  drawer.classList.add('open');
  backdrop.classList.add('show');
  drawer.setAttribute('aria-hidden','false');
}
function closeCart(){
  drawer.classList.remove('open');
  backdrop.classList.remove('show');
  drawer.setAttribute('aria-hidden','true');
}

cartBtn.addEventListener('click', openCart);
closeDrawer.addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);

function renderCart(){
  const items = Array.from(cart.values());
  if(items.length === 0){
    drawerBody.innerHTML = `<div class="drawer-empty">Your cart is empty.</div>`;
  } else {
    drawerBody.innerHTML = items.map(it => `
      <div class="cart-item" style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.10)">
        <div style="flex:1">
          <div style="font-weight:900">${it.name}</div>
          <div style="color:rgba(244,241,234,.70);font-size:13px">${money(it.price)} each</div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
            <button class="xbtn" style="width:34px;height:34px" type="button" data-sku="${it.sku}" data-op="dec">−</button>
            <div><b>${it.qty}</b></div>
            <button class="xbtn" style="width:34px;height:34px" type="button" data-sku="${it.sku}" data-op="inc">+</button>
            <button class="xbtn" style="margin-left:auto" type="button" data-sku="${it.sku}" data-op="rm">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  let total = 0;
  let count = 0;
  for(const it of cart.values()){
    total += it.price * it.qty;
    count += it.qty;
  }
  drawerTotal.textContent = money(total);
  cartCount.textContent = `(${count})`;
}

drawerBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-sku]');
  if(!btn) return;
  const sku = btn.dataset.sku;
  const op = btn.dataset.op;
  const it = cart.get(sku);
  if(!it) return;
  if(op === 'inc') it.qty += 1;
  if(op === 'dec') it.qty = Math.max(1, it.qty - 1);
  if(op === 'rm') cart.delete(sku);
  else cart.set(sku, it);
  renderCart();
});

document.querySelectorAll('.product .add').forEach(b => {
  b.addEventListener('click', () => {
    const card = b.closest('.product');
    const sku = card.dataset.sku;
    const name = card.dataset.name;
    const price = Number(card.dataset.price || 0);
    const existing = cart.get(sku);
    cart.set(sku, {sku, name, price, qty: existing ? existing.qty + 1 : 1});
    renderCart();
    openCart();
  });
});

checkoutBtn.addEventListener('click', () => {
  alert("Checkout is demo right now. Tell me Shopify / Stripe / BigCartel and I'll connect real checkout.");
});

renderCart();

// NFC unlock system
(function(){
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const track = document.getElementById('vaultTrack');
  const ep = document.getElementById('vaultEp');
  const video = document.getElementById('vaultVideo');
  const merch = document.getElementById('vaultMerch');

  const show = (el) => { if (el) el.style.display = ''; };

  if (unlock === 'track' || unlock === 'exclusive') show(track);
  if (unlock === 'ep' || unlock === 'preview') show(ep);
  if (unlock === 'video') show(video);
  if (unlock === 'merch' || unlock === 'bundle') show(merch);
})();


// pricingFixV32 for current static merch cards
(function(){
  const map = {
    tee: { name: '3D THE CAPO Tee', price: '$20' },
    hat: { name: 'CAPO Hat', price: '$25' },
    hoodie: { name: '3D Hoodie', price: '$40' }
  };
  document.querySelectorAll('.product[data-sku]').forEach(card => {
    const sku = card.dataset.sku;
    const data = map[sku];
    if (!data) return;
    card.dataset.price = data.price.replace('$','');
    const pname = card.querySelector('.pname');
    if (pname) pname.textContent = data.name;
    let priceEl = card.querySelector('.pprice');
    if (!priceEl) {
      priceEl = document.createElement('div');
      priceEl.className = 'pprice';
      const pbody = card.querySelector('.pbody');
      const psub = card.querySelector('.psub');
      if (pbody && psub) pbody.insertBefore(priceEl, psub);
    }
    priceEl.textContent = data.price;
  });
})();
