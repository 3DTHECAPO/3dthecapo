
document.getElementById('year').textContent = new Date().getFullYear();

// Reveal animation
const reveals = Array.from(document.querySelectorAll('.reveal'));
const io = new IntersectionObserver((entries)=>{
 entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('on'); });
},{threshold:.08});
reveals.forEach(el=>io.observe(el));

// Drop countdown
const DROP_DATE=new Date(Date.now()+7*24*60*60*1000);
const out=document.getElementById('countdown');
const out2=document.getElementById('dropCountdown');

function tick(){
 const now=new Date();
 let ms=DROP_DATE-now;

 if(ms<=0){
  if(out) out.textContent="LIVE";
  if(out2) out2.textContent="LIVE";
  return;
 }

 const s=Math.floor(ms/1000);
 const d=Math.floor(s/86400);
 const h=Math.floor((s%86400)/3600);
 const m=Math.floor((s%3600)/60);

 if(out) out.textContent=`${d}d ${h}h ${m}m`;
 if(out2) out2.textContent=`${d}d ${h}h ${m}m`;

 setTimeout(tick,1000);
}
tick();

// Mailing list demo
const form=document.getElementById('mailForm');
const note=document.getElementById('mailNote');

form && form.addEventListener('submit',(e)=>{
 e.preventDefault();
 note.textContent="Locked in. Drop alerts coming.";
 form.reset();
});

// Merch system
(function(){

const PRODUCT_NAMES=[
"Capo Logo Tee","Capo Street Tee","Capo Drop Tee","Capo Boss Tee",
"Capo Trucker Hat","Capo Snapback","Capo Street Hat","Capo Drop Hat",
"Capo Street Hoodie","Capo Boss Hoodie","Capo Drop Hoodie","Capo Logo Hoodie"
];

const PRODUCTS=[
...Array.from({length:30},(_,i)=>{

 const n=i+1;
 const inStock=n<=20;

 let price=0;
 let type="shirt";

 if(n<=10){ price=20; type="shirt"; }
 else if(n<=20){ price=25; type="hat"; }
 else{ price=40; type="hoodie"; }

 return{
  id:`m${String(n).padStart(2,'0')}`,
  name:PRODUCT_NAMES[i%PRODUCT_NAMES.length],
  price:inStock?price:0,
  tag:inStock?"IN STOCK":"COMING SOON",
  type:type,
  img:`./merch${String(n).padStart(2,'0')}.png`
 };

}),
{ id:'ep1', name:'Coming Soon EP', price:0, tag:'EP', img:'./comingsoon_ep.jpg', type:'ep' }
];

const grid=document.getElementById("merchGrid");

if(!grid) return;

PRODUCTS.sort((a,b)=>{
 if(a.tag==="IN STOCK" && b.tag!=="IN STOCK") return -1;
 if(a.tag!=="IN STOCK" && b.tag==="IN STOCK") return 1;
 const order={shirt:1,hat:2,hoodie:3,ep:4};
 return order[a.type]-order[b.type];
});

grid.innerHTML=PRODUCTS.map(p=>{

const price=p.price?`$${p.price}`:"—";
const badge=p.tag==="EP"?"COMING SOON EP":p.tag;

const primary=(p.tag==="IN STOCK")
? `<button class="pill gold small add-to-cart" data-id="${p.id}">Add</button>`
: `<a class="pill gold small" href="#mail">Notify me</a>`;

return`
<article class="card product" data-tag="${p.tag}" data-name="${p.name}">
<div class="img">
<img src="${p.img}" loading="lazy"
onerror="this.onerror=null;this.src='./placeholder_merch.png';">
<div class="badge">${badge}</div>
</div>

<div class="body">
<p class="name">${p.name}</p>
<p class="price">${price}</p>

<div class="actions">
${primary}
<button class="pill small quick-view" data-id="${p.id}">View</button>
</div>
</div>
</article>
`;

}).join("");

})();
