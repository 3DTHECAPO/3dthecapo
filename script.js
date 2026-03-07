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

  const intro = document.getElementById('vaultIntro');
  const exclusiveTrack = document.getElementById('exclusiveTrack');
  const earlyEp = document.getElementById('earlyEp');
  const secretVideo = document.getElementById('secretVideo');
  const secretMerch = document.getElementById('secretMerch');

  const show = (el) => { if (el) el.style.display = 'block'; };

  if (unlock) show(intro);
  if (unlock === 'exclusive' || unlock === 'track') show(exclusiveTrack);
  if (unlock === 'ep' || unlock === 'preview') show(earlyEp);
  if (unlock === 'video') show(secretVideo);
  if (unlock === 'merch' || unlock === 'bundle') show(secretMerch);
})();


// Make NEW DROP card clickable without breaking buttons
const dropLinkCard = document.querySelector('.drop-right[href="#music"]');
if (dropLinkCard){
  const dropFrame = dropLinkCard.closest('.drop-frame');
  if (dropFrame){
    dropFrame.style.cursor = 'pointer';
    dropFrame.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      window.location.hash = '#music';
    });
  }
}


// Pricing / label fixes for current merch cards
const pricingFixes = {
  tee: {name: '3D THE CAPO Tee', price: 20},
  hat: {name: 'CAPO Hat', price: 25},
  hoodie: {name: '3D Hoodie', price: 40}
};

document.querySelectorAll('.product').forEach(card => {
  const sku = card.dataset.sku;
  if (pricingFixes[sku]) {
    card.dataset.price = String(pricingFixes[sku].price);
    card.dataset.name = pricingFixes[sku].name;
  }
});

// Add NFC unlock buttons to merch cards
document.querySelectorAll('.product').forEach(card => {
  const actions = card.querySelector('.pactions');
  if (!actions || actions.querySelector('.unlock-link')) return;
  const sku = card.dataset.sku || 'merch';
  let unlock = 'merch';
  if (sku === 'tee') unlock = 'track';
  if (sku === 'hat') unlock = 'merch';
  if (sku === 'hoodie') unlock = 'video';
  const a = document.createElement('a');
  a.className = 'btn sm unlock-link';
  a.href = `?unlock=${encodeURIComponent(unlock)}`;
  a.textContent = 'Unlock';
  actions.appendChild(a);
});
