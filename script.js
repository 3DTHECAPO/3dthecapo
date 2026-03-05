document.getElementById('year').textContent = new Date().getFullYear();

// Reveal on scroll
const reveals = Array.from(document.querySelectorAll('.reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); });
}, { threshold: 0.08 });
reveals.forEach(el => io.observe(el));

// Countdown (set your next drop date here)
const DROP_DATE = new Date(Date.now() + 7*24*60*60*1000);
const out = document.getElementById('countdown');
function tick(){
  const now = new Date();
  let ms = DROP_DATE - now;
  if (ms <= 0){ out.textContent = "LIVE"; return; }
  const s = Math.floor(ms/1000);
  const d = Math.floor(s/86400);
  const h = Math.floor((s%86400)/3600);
  const m = Math.floor((s%3600)/60);
  const ss = s%60;
  out.textContent = `${d}d ${h}h ${m}m ${ss}s`;
  setTimeout(tick, 1000);
}
tick();

// Mailing list (demo)
const form = document.getElementById('mailForm');
const note = document.getElementById('mailNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.textContent = "Submitted (demo). Add Mailchimp/Formspree when ready.";
  form.reset();
});



// V22 merch enhancements (keeps V16 look)
(function(){
  // Inject modal + cart drawer if not present
  const body = document.body;

  // Modal
  if(!document.getElementById('modalBackdrop')){
    const mb = document.createElement('div');
    mb.className='modal-backdrop';
    mb.id='modalBackdrop';
    mb.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Product preview">
        <div class="modal-head">
          <div id="modalTitle" style="font-weight:800; letter-spacing:1px;">Product</div>
          <button class="modal-close" id="modalClose" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <img id="modalImg" src="" alt="" />
          <div class="modal-info">
            <div id="modalName" style="font-family:'Black Ops One',system-ui,sans-serif; text-transform:uppercase; letter-spacing:1px; font-size:22px;"></div>
            <div id="modalPrice" style="margin-top:6px; color:rgba(244,241,234,.72)"></div>
            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="pill gold small" id="modalAdd" type="button">Add to cart</button>
              <a class="pill small" href="#mail">Notify me</a>
            </div>
            <div style="margin-top:12px; color:rgba(244,241,234,.72)">Replace image files by drag-and-drop (same filenames) to update products.</div>
          </div>
        </div>
      </div>`;
    body.appendChild(mb);
  }

  // Cart Drawer
  if(!document.getElementById('cartDrawer')){
    const drawer = document.createElement('aside');
    drawer.className = 'drawer';
    drawer.id = 'cartDrawer';
    drawer.setAttribute('aria-hidden','true');
    drawer.innerHTML = `
      <div class="drawer-head">
        <div style="font-family:'Black Ops One',system-ui,sans-serif; letter-spacing:1px;">CART</div>
        <button class="icon-btn" id="cartClose" aria-label="Close cart">✕</button>
      </div>
      <div class="drawer-body" id="cartBody"><div style="color:rgba(244,241,234,.72)">Your cart is empty.</div></div>
      <div class="drawer-foot">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <div style="color:rgba(244,241,234,.72)">Total</div>
          <div id="cartTotal" style="font-weight:800">$0</div>
        </div>
        <button class="pill gold" id="checkoutBtn" type="button" style="width:100%">Checkout (later)</button>
      </div>`;
    body.appendChild(drawer);

    const fab = document.createElement('div');
    fab.className='cart-fab';
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

  const KEY='capo_cart_v1';
  const loadCart = ()=>{ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []} };
  const saveCart = (c)=> localStorage.setItem(KEY, JSON.stringify(c));

  function money(n){
    const v = Number(String(n).replace(/[^0-9.]/g,'')) || 0;
    return '$' + v.toFixed(2);
  }

  function renderCart(){
    const cart = loadCart();
    if(!cart.length){
      cartBody.innerHTML = `<div style="color:rgba(244,241,234,.72)">Your cart is empty.</div>`;
      cartTotal.textContent = '$0.00';
      cartCount.textContent = '(0)';
      return;
    }
    let total=0;
    cartBody.innerHTML = cart.map((it, idx)=>{
      const price = Number(String(it.price).replace(/[^0-9.]/g,'')) || 0;
      total += price * it.qty;
      return `<div class="cart-item">
        <div class="meta">
          <div style="font-weight:800">${it.name}</div>
          <div style="color:rgba(244,241,234,.72)">${money(price)} each</div>
        </div>
        <div class="qty">
          <button class="icon-btn" data-dec="${idx}">-</button>
          <div style="min-width:22px; text-align:center">${it.qty}</div>
          <button class="icon-btn" data-inc="${idx}">+</button>
          <button class="icon-btn" data-rem="${idx}">✕</button>
        </div>
      </div>`;
    }).join('');
    cartTotal.textContent = money(total);
    const count = cart.reduce((s,it)=>s+it.qty,0);
    cartCount.textContent = `(${count})`;

    cartBody.querySelectorAll('[data-inc]').forEach(b=>b.addEventListener('click', ()=>{ const i=+b.dataset.inc; const c=loadCart(); c[i].qty++; saveCart(c); renderCart(); }));
    cartBody.querySelectorAll('[data-dec]').forEach(b=>b.addEventListener('click', ()=>{ const i=+b.dataset.dec; const c=loadCart(); c[i].qty=Math.max(1,c[i].qty-1); saveCart(c); renderCart(); }));
    cartBody.querySelectorAll('[data-rem]').forEach(b=>b.addEventListener('click', ()=>{ const i=+b.dataset.rem; const c=loadCart(); c.splice(i,1); saveCart(c); renderCart(); }));
  }

  function openCart(){ cartDrawer.classList.add('open'); cartDrawer.setAttribute('aria-hidden','false'); renderCart(); }
  function closeCart(){ cartDrawer.classList.remove('open'); cartDrawer.setAttribute('aria-hidden','true'); }

  cartOpen?.addEventListener('click', openCart);
  cartClose?.addEventListener('click', closeCart);

  // Quick View
  document.querySelectorAll('.quick-view').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const img = btn.getAttribute('data-img');
      const name = btn.getAttribute('data-name');
      const price = btn.getAttribute('data-price');
      modalImg.src = img;
      modalImg.alt = name;
      modalName.textContent = name;
      modalPrice.textContent = price;
      modalAdd.onclick = ()=>{ addToCart(name, price); openCart(); };
      modalBackdrop.style.display='flex';
    });
  });
  modalClose?.addEventListener('click', ()=> modalBackdrop.style.display='none');
  modalBackdrop?.addEventListener('click', (e)=>{ if(e.target===modalBackdrop) modalBackdrop.style.display='none'; });

  // Add to cart buttons
  function addToCart(name, price){
    const p = (price && price !== '$—') ? price : '$40';
    const cart = loadCart();
    const found = cart.find(x=>x.name===name);
    if(found) found.qty += 1;
    else cart.push({name, price:p, qty:1});
    saveCart(cart);
    renderCart();
  }
  document.querySelectorAll('.add-to-cart').forEach(btn=>{
    btn.addEventListener('click', ()=> addToCart(btn.dataset.name, btn.dataset.price));
  });

  // Filters
  const filterBtns = document.querySelectorAll('.filter');
  const cards = Array.from(document.querySelectorAll('.product'));
  function applyFilter(tag){
    cards.forEach(c=>{
      const t = c.getAttribute('data-tag') || 'IN STOCK';
      const show = (tag==='ALL') || (t===tag);
      c.style.display = show ? '' : 'none';
    });
  }
  filterBtns.forEach(b=>{
    b.addEventListener('click', ()=>{
      filterBtns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      applyFilter(b.dataset.filter);
    });
  });

  // Search
  const s = document.getElementById('merchSearch');
  s?.addEventListener('input', ()=>{
    const q = s.value.trim().toLowerCase();
    cards.forEach(c=>{
      const name = (c.querySelector('.name')?.textContent || '').toLowerCase();
      const matches = !q || name.includes(q);
      if(matches) {
        // also respect current filter
        c.style.opacity = '1';
      } else {
        c.style.opacity = '.15';
      }
    });
  });

  renderCart();
})();
