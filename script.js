// 3D THE CAPO — v21
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

const PRODUCTS = [
  // Diamond Series
  {id:"diamond-trucker", group:"diamond", name:"Diamond Series Trucker", price:32, img:"merch_diamond_trucker.jpg",
    tag:"Diamond Series", desc:"Front print diamond emblem — clean mockup ready for your merch grid."},
  {id:"diamond-tee", group:"diamond", name:"Diamond Series Tee", price:35, img:"merch_diamond_tshirt.jpg",
    tag:"Diamond Series", desc:"Soft black tee with the diamond crest design. Swap the image anytime (same filename)."},
  {id:"diamond-hoodie", group:"diamond", name:"Diamond Series Hoodie", price:60, img:"merch_diamond_hoodie.jpg",
    tag:"Diamond Series", desc:"Pullover hoodie mockup featuring the diamond logo."},

  // High Rollers Chip
  {id:"chip-trucker", group:"chip", name:"High Rollers Trucker", price:32, img:"merch_chip_trucker.jpg",
    tag:"High Rollers", desc:"Casino-style chip design. Bold, clean, and ready for the site."},
  {id:"chip-tee", group:"chip", name:"High Rollers Tee", price:35, img:"merch_chip_tshirt.jpg",
    tag:"High Rollers", desc:"Tee mockup with the Capo chip logo front and center."},
  {id:"chip-hoodie", group:"chip", name:"High Rollers Hoodie", price:60, img:"merch_chip_hoodie.jpg",
    tag:"High Rollers", desc:"Hoodie mockup with the Capo chip logo."},

  // Classic Crown
  {id:"classic-trucker", group:"classic", name:"Classic Crown Trucker", price:30, img:"merch_classic_trucker.jpg",
    tag:"Classic Crown", desc:"Classic 3D crown logo — simple and clean."},
  {id:"classic-tee", group:"classic", name:"Classic Crown Tee", price:33, img:"merch_classic_tshirt.jpg",
    tag:"Classic Crown", desc:"Classic logo tee mockup (cropped from the trio image). Replace anytime."},
  {id:"classic-hoodie", group:"classic", name:"Classic Crown Hoodie", price:55, img:"merch_classic_hoodie.jpg",
    tag:"Classic Crown", desc:"Classic logo hoodie mockup (cropped from the trio image)."},
];

const STORAGE_KEY = "capo_cart_v21";

function money(n){return `$${Number(n).toFixed(0)}`;}

function readCart(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function writeCart(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function cartCount(items){ return items.reduce((a,i)=>a+i.qty,0); }
function cartSubtotal(items){
  return items.reduce((a,i)=>a + i.qty * (PRODUCTS.find(p=>p.id===i.id)?.price || 0), 0);
}

function renderProducts(filter="all"){
  const grid = $("#productGrid");
  grid.innerHTML = "";
  const list = PRODUCTS.filter(p => filter==="all" ? true : p.group===filter);

  for (const p of list){
    const card = document.createElement("div");
    card.className = "cardP";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <div class="cardBody">
        <div class="tag">${p.tag}</div>
        <div class="cardTitleP">${p.name}</div>
        <div class="row2">
          <div class="price">${money(p.price)}</div>
          <button class="buy" data-open="${p.id}">View</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
}

let currentProductId = null;

function openModal(id){
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  currentProductId = id;
  $("#modalImg").src = p.img;
  $("#modalImg").alt = p.name;
  $("#modalTag").textContent = p.tag;
  $("#modalTitle").textContent = p.name;
  $("#modalPrice").textContent = money(p.price);
  $("#modalDesc").textContent = p.desc;
  $("#modalQty").value = 1;
  $("#modal").classList.add("isOn");
  $("#modal").setAttribute("aria-hidden","false");
}

function closeModal(){
  $("#modal").classList.remove("isOn");
  $("#modal").setAttribute("aria-hidden","true");
}

function openDrawer(){
  $("#drawer").classList.add("isOn");
  $("#drawer").setAttribute("aria-hidden","false");
  renderCart();
}

function closeDrawer(){
  $("#drawer").classList.remove("isOn");
  $("#drawer").setAttribute("aria-hidden","true");
}

function addToCart(id, size, qty){
  const items = readCart();
  const key = `${id}::${size}`;
  const found = items.find(i=>i.key===key);
  if(found) found.qty += qty;
  else items.push({key, id, size, qty});
  writeCart(items);
  syncCartBadge();
}

function removeFromCart(key){
  const items = readCart().filter(i=>i.key!==key);
  writeCart(items);
  syncCartBadge();
  renderCart();
}

function syncCartBadge(){
  const items = readCart();
  $("#cartCount").textContent = cartCount(items);
  $("#cartDot").classList.toggle("isOn", cartCount(items) > 0);
}

function renderCart(){
  const items = readCart();
  const list = $("#cartList");
  list.innerHTML = "";
  if(items.length===0){
    list.innerHTML = `<div class="fine">Cart is empty.</div>`;
  } else {
    for(const i of items){
      const p = PRODUCTS.find(x=>x.id===i.id);
      if(!p) continue;
      const el = document.createElement("div");
      el.className = "cartItem";
      el.innerHTML = `
        <img src="${p.img}" alt="">
        <div>
          <div class="t">${p.name}</div>
          <div class="m">Size: ${i.size} • Qty: ${i.qty}</div>
          <div class="row">
            <div class="price">${money(p.price * i.qty)}</div>
            <button data-remove="${i.key}">Remove</button>
          </div>
        </div>
      `;
      list.appendChild(el);
    }
  }

  const subtotal = cartSubtotal(items);
  $("#cartSubtotal").textContent = money(subtotal);

  // Placeholder checkout link - you can paste a Stripe payment link here later.
  $("#checkoutBtn").href = "https://example.com/checkout";
}

function wire(){
  // Product click
  document.addEventListener("click", (e)=>{
    const open = e.target?.closest?.("[data-open]");
    if(open){
      openModal(open.getAttribute("data-open"));
    }
    const close = e.target?.closest?.("[data-close]");
    if(close){
      closeModal();
      closeDrawer();
    }
    const remove = e.target?.closest?.("[data-remove]");
    if(remove){
      removeFromCart(remove.getAttribute("data-remove"));
    }
  });

  $("#addToCart").addEventListener("click", ()=>{
    if(!currentProductId) return;
    const size = $("#modalSize").value;
    const qty = Math.max(1, parseInt($("#modalQty").value || "1", 10));
    addToCart(currentProductId, size, qty);
    closeModal();
    openDrawer();
  });

  $("#cartBtn").addEventListener("click", openDrawer);

  // Filters
  $$(".pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      $$(".pill").forEach(b=>b.classList.remove("isOn"));
      btn.classList.add("isOn");
      renderProducts(btn.dataset.filter);
    });
  });

  // Mailing list (front-end only)
  $("#mailForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const email = $("#mailEmail").value.trim();
    if(!email) return;
    $("#mailMsg").textContent = "Thanks — you’re in. (Hook this to your email platform later.)";
    $("#mailEmail").value = "";
  });

  $("#year").textContent = new Date().getFullYear();
  syncCartBadge();
  renderProducts("all");
}

wire();
