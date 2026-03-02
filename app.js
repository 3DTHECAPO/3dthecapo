const productsEl = document.getElementById('products');
const cartCountEl = document.getElementById('cartCount');
const cartDrawer = document.getElementById('cartDrawer');
const cartItems = document.getElementById('cartItems');
const totalEl = document.getElementById('total');

const openCart = document.getElementById('openCart');
const closeCart = document.getElementById('closeCart');
const checkoutBtn = document.getElementById('checkout');

const openEmail = document.getElementById('openEmail');
const emailModal = document.getElementById('emailModal');
const closeEmail = document.getElementById('closeEmail');
const emailForm = document.getElementById('emailForm');
const emailMsg = document.getElementById('emailMsg');

let PRODUCTS = [];
let CART = [];

const fmt = (c) => '$' + (c/100).toFixed(2);

function saveCart(){ localStorage.setItem('capo_cart', JSON.stringify(CART)); }
function loadCart(){
  try{ CART = JSON.parse(localStorage.getItem('capo_cart') || '[]'); }
  catch(e){ CART = []; }
  renderCart();
}

function cartCount(){ return CART.reduce((s,i)=>s+i.qty,0); }
function cartTotal(){ return CART.reduce((s,i)=>s+i.qty*i.price,0); }

function renderProducts(){
  productsEl.innerHTML = '';
  PRODUCTS.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <img src="${p.image}" alt="${p.name}" style="width:100%;border-radius:14px;aspect-ratio:4/3;object-fit:cover;border:1px solid rgba(255,255,255,.08)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-top:10px">
        <div>
          <div style="font-weight:800">${p.name}</div>
          <div class="muted small">${p.description||''}</div>
        </div>
        <div class="price">${fmt(p.price)}</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
        <button class="btn primary" data-add="${p.id}">Add to Cart</button>
      </div>
    `;
    productsEl.appendChild(div);
  });
}

function addToCart(id){
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  const it = CART.find(x=>x.id===id);
  if(it) it.qty += 1;
  else CART.push({id, name:p.name, price:p.price, qty:1});
  saveCart();
  renderCart();
}

function removeFromCart(id){
  CART = CART.filter(x=>x.id!==id);
  saveCart();
  renderCart();
}

function renderCart(){
  cartCountEl.textContent = cartCount();
  totalEl.textContent = fmt(cartTotal());
  cartItems.innerHTML = '';
  CART.forEach(it=>{
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <div style="font-weight:800">${it.name}</div>
        <div class="muted small">${fmt(it.price)} • Qty ${it.qty}</div>
      </div>
      <button class="btn" data-rm="${it.id}" style="padding:8px 10px">Remove</button>
    `;
    cartItems.appendChild(li);
  });
}

async function loadProducts(){
  const res = await fetch('products.json');
  PRODUCTS = await res.json();
  renderProducts();
}

openCart.addEventListener('click', ()=>{
  cartDrawer.classList.remove('hidden');
  cartDrawer.setAttribute('aria-hidden','false');
});
closeCart.addEventListener('click', ()=>{
  cartDrawer.classList.add('hidden');
  cartDrawer.setAttribute('aria-hidden','true');
});

document.addEventListener('click', (e)=>{
  const add = e.target.getAttribute('data-add');
  if(add) addToCart(add);

  const rm = e.target.getAttribute('data-rm');
  if(rm) removeFromCart(rm);
});

checkoutBtn.addEventListener('click', ()=>{
  alert('Checkout not connected yet. Best move: Shopify checkout on 3dthecapo.com.');
});

openEmail.addEventListener('click', ()=>{
  emailModal.classList.remove('hidden');
  emailModal.setAttribute('aria-hidden','false');
});
closeEmail.addEventListener('click', ()=>{
  emailModal.classList.add('hidden');
  emailModal.setAttribute('aria-hidden','true');
});

emailForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  if(!email){ emailMsg.textContent = 'Enter a valid email.'; return; }
  const list = JSON.parse(localStorage.getItem('capo_emails') || '[]');
  list.push({ email, name: document.getElementById('name').value.trim(), date: new Date().toISOString() });
  localStorage.setItem('capo_emails', JSON.stringify(list));
  emailMsg.textContent = 'Saved! (Local for now)';
  setTimeout(()=>{ emailModal.classList.add('hidden'); emailMsg.textContent=''; emailForm.reset(); }, 1200);
});

document.getElementById('year').textContent = new Date().getFullYear();

loadCart();
loadProducts();
