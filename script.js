document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('mailForm');
const note = document.getElementById('mailNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.textContent = "Submitted (demo). Connect Mailchimp / Formspree when you're ready.";
  form.reset();
});

// Cart drawer (demo)
const drawer = document.getElementById('drawer');
const backdrop = document.getElementById('backdrop');
const cartBtn = document.getElementById('cartBtn');
const closeDrawer = document.getElementById('closeDrawer');
const drawerBody = document.getElementById('drawerBody');
const drawerTotal = document.getElementById('drawerTotal');
const cartCount = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkoutBtn');

const cart = new Map(); // sku -> {name, price, qty}

function money(n){ return `$${n.toFixed(2)}`; }

function openCart(){
  drawer.classList.add('open');
  backdrop.classList.add('show');
  drawer.setAttribute('aria-hidden','false');
  backdrop.setAttribute('aria-hidden','false');
}
function closeCart(){
  drawer.classList.remove('open');
  backdrop.classList.remove('show');
  drawer.setAttribute('aria-hidden','true');
  backdrop.setAttribute('aria-hidden','true');
}

cartBtn.addEventListener('click', openCart);
closeDrawer.addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);

function renderCart(){
  const items = Array.from(cart.values());
  if(items.length === 0){
    drawerBody.innerHTML = `<div class="drawer-empty">Your cart is empty.</div>`;
  }else{
    drawerBody.innerHTML = items.map(it => `
      <div class="cart-item">
        <div style="flex:1">
          <div class="cart-item-title">${it.name}</div>
          <div class="cart-item-sub">${money(it.price)} each</div>
          <div class="qty">
            <button type="button" data-sku="${it.sku}" data-op="dec">−</button>
            <div><b>${it.qty}</b></div>
            <button type="button" data-sku="${it.sku}" data-op="inc">+</button>
            <button type="button" data-sku="${it.sku}" data-op="rm" style="margin-left:auto">Remove</button>
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

drawerBody.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-sku]');
  if(!btn) return;
  const sku = btn.getAttribute('data-sku');
  const op = btn.getAttribute('data-op');
  const it = cart.get(sku);
  if(!it) return;
  if(op==='inc') it.qty += 1;
  if(op==='dec') it.qty = Math.max(1, it.qty-1);
  if(op==='rm') cart.delete(sku);
  cart.set(sku, it);
  renderCart();
});

document.querySelectorAll('.product .add').forEach(b=>{
  b.addEventListener('click', ()=>{
    const card = b.closest('.product');
    const sku = card.dataset.sku;
    const name = card.dataset.name;
    const price = Number(card.dataset.price || 0);
    const existing = cart.get(sku);
    cart.set(sku, {sku, name, price, qty: existing ? existing.qty+1 : 1});
    renderCart();
    openCart();
  });
});

checkoutBtn.addEventListener('click', ()=>{
  alert("Checkout is a demo right now. Tell me which checkout you want (Shopify / Stripe / BigCartel) and I’ll connect it.");
});

renderCart();
