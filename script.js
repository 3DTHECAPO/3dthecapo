(function(){
  'use strict';

  const byId = (id) => document.getElementById(id);
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // 🔑 PASTE YOUR SUPABASE ANON KEY HERE
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cG9lZHJvdmZsb3VkZWZ5em5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzU2NjEsImV4cCI6MjA5MjM1MTY2MX0.CGgOxXXSXWMjNPcnQR_zMBHk8WkWSb0lhcNlTfCR4xo";

  const yearEl = byId('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const countdownTargets = [byId('countdown')].filter(Boolean);
  const DROP_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  function tick(){
    const now = new Date();
    const ms = DROP_DATE - now;

    if (ms <= 0){
      countdownTargets.forEach(el => el.textContent = 'LIVE');
      return;
    }

    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;

    countdownTargets.forEach(el => el.textContent = `${d}d ${h}h ${m}m ${ss}s`);
    setTimeout(tick, 1000);
  }

  tick();

  // 🔒 PUBLIC EMAIL CODE REQUEST — HARD BLOCK DUPLICATE EMAILS
  function normalizePublicEmail(email){
    return String(email || '').trim().toLowerCase();
  }

  async function publicEmailAlreadyUsed(email){
    const clean = normalizePublicEmail(email);
    if(!clean) return { blocked:false };

    try{
      const res = await fetch(`https://fupoedrovfloudefyzna.supabase.co/rest/v1/vault_codes?recipient_email=eq.${encodeURIComponent(clean)}&select=code,recipient_email&limit=1`, {
        headers:{
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY
        }
      });

      if(!res.ok){
        const text = await res.text();
        console.warn("Duplicate email check failed:", text);
        return { blocked:false, error:text };
      }

      const rows = await res.json().catch(()=>[]);

      // HARD LOCK: if the email exists once in Supabase, block forever.
      if(Array.isArray(rows) && rows.length > 0){
        return { blocked:true, row: rows[0] };
      }

      return { blocked:false };
    }catch(err){
      console.warn("Duplicate email check error:", err);
      return { blocked:false, error:err.message };
    }
  }

  window.emailFirstCode = async function () {
    const emailInput = document.getElementById("email");
    const nameInput = document.getElementById("name");

    const email = normalizePublicEmail(emailInput?.value);
    const name = nameInput?.value || "";

    if (!email) {
      alert("Enter email");
      return;
    }

    const existing = await publicEmailAlreadyUsed(email);

    if(existing.blocked){
      alert("This email already received a PLAY 3D access code.");
      return;
    }

    try {
      const res = await fetch("https://fupoedrovfloudefyzna.supabase.co/functions/v1/dynamic-endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + SUPABASE_KEY
        },
        body: JSON.stringify({
          email: email,
          name: name
        })
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        alert("RAW ERROR: " + text);
        return;
      }

      console.log("Response:", data);

      if (!res.ok) {
        const msg = (data.error || JSON.stringify(data) || "").toLowerCase();

        if(msg.includes("duplicate") || msg.includes("already") || msg.includes("23505")){
          alert("This email already received a PLAY 3D access code.");
          return;
        }

        alert("SERVER ERROR: " + (data.error || JSON.stringify(data)));
        return;
      }

      if (data.success) {
        alert("Check your email");
      } else {
        alert("Error: " + (data.error || "Something went wrong"));
      }

    } catch (err) {
      console.error(err);
      alert("Request failed: " + err.message);
    }
  };

  window.publicEmailAlreadyUsed = publicEmailAlreadyUsed;

  // Merch filter
  qsa('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      qsa('.merch-grid .product').forEach(card => {
        const tag = card.getAttribute('data-tag') || '';
        card.style.display = (filter === 'ALL' || tag === filter) ? '' : 'none';
      });
    });
  });

  const search = byId('merchSearch');

  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();

      qsa('.merch-grid .product').forEach(card => {
        const txt = (
          (qs('.name', card)?.textContent || '') + ' ' +
          (qs('.price', card)?.textContent || '')
        ).toLowerCase();

        card.style.display = (!q || txt.includes(q)) ? '' : 'none';
      });
    });
  }

  // Modal
  const modal = byId('productModal');
  const modalImage = byId('modalImage');
  const modalName = byId('modalName');
  const modalPrice = byId('modalPrice');
  const closeModal = byId('closeModal');

  qsa('.quick-view, .add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!modal) return;

      if (modalImage) modalImage.src = btn.dataset.img || './merch_hat.jpg';
      if (modalName) modalName.textContent = btn.dataset.name || 'Product';
      if (modalPrice) modalPrice.textContent = btn.dataset.price || '';

      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    });
  });

  function hideModal(){
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  if (closeModal) closeModal.addEventListener('click', hideModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }

})();

(function(){
  window.requestAnimationFrame(() => {
    document.body.classList.add('site-loaded');
  });
})();
// 🔥 VAULT PRESSURE SYSTEM
async function loadVaultPressure(){

  const res = await fetch("https://fupoedrovfloudefyzna.supabase.co/rest/v1/vault_codes?select=code_type,sent", {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY
    }
  });

  const data = await res.json();

  const entry = data.filter(x=>x.code_type==="ENTRY" && !x.sent).length;
  const gold = data.filter(x=>x.code_type==="GOLD" && !x.sent).length;
  const elite = data.filter(x=>x.code_type==="ELITE" && !x.sent).length;

  document.getElementById("entryCount").innerText = entry;
  document.getElementById("entry").innerText = entry;
  document.getElementById("gold").innerText = gold;
  document.getElementById("elite").innerText = elite;
}

loadVaultPressure();
// PLAY 3D BUY PAGE — VAULT PRESSURE + SOLD OUT LOCK
async function loadVaultPressure(){
  const ids = ["entryCount","entry","gold","elite"];
  if(!ids.some(id => document.getElementById(id))) return;

  try{
    const res = await fetch("https://fupoedrovfloudefyzna.supabase.co/rest/v1/vault_codes?select=code_type,sent,recipient_email", {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY
      }
    });

    const data = await res.json();

    const available = type =>
      data.filter(x =>
        x.code_type === type &&
        !x.sent &&
        !x.recipient_email
      ).length;

    const entry = available("ENTRY");
    const gold = available("GOLD");
    const elite = available("ELITE");

    if(document.getElementById("entryCount")) document.getElementById("entryCount").innerText = entry;
    if(document.getElementById("entry")) document.getElementById("entry").innerText = entry;
    if(document.getElementById("gold")) document.getElementById("gold").innerText = gold;
    if(document.getElementById("elite")) document.getElementById("elite").innerText = elite;

    if(entry <= 0){
      document.querySelectorAll("a[href*='cash.app'], .cash-btn, .buy-btn").forEach(btn=>{
        btn.innerText = "SOLD OUT";
        btn.style.pointerEvents = "none";
        btn.style.opacity = ".45";
        btn.style.filter = "grayscale(1)";
      });

      if(document.getElementById("entryCount")){
        document.getElementById("entryCount").innerText = "SOLD OUT";
      }
    }

  }catch(err){
    console.log("Vault pressure not loaded:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadVaultPressure);
// PLAY 3D DRAGGABLE OLD iPAD MUSIC PLAYER
const p3dFloatTracks=[
  {title:"100x3",artist:"3D THE CAPO",src:"./music/100x3.mp3",cover:"./assets/player-placeholder.jpg"},
  {title:"Fuck A Grammy",artist:"3D THE CAPO",src:"./music/fuck-a-grammy.mp3",cover:"./assets/player-placeholder.jpg"},
  {title:"True Story",artist:"3D THE CAPO",src:"./music/true-story.mp3",cover:"./assets/player-placeholder.jpg"}
];
let p3dFloatIndex=0;
const p3dPlayer=document.getElementById("play3dDraggablePlayer"),p3dHandle=document.getElementById("p3dPlayerHandle"),p3dMinimize=document.getElementById("p3dMinimize"),p3dAudio=document.getElementById("p3dFloatAudio"),p3dCover=document.getElementById("p3dFloatCover"),p3dTitle=document.getElementById("p3dFloatTitle"),p3dArtist=document.getElementById("p3dFloatArtist"),p3dPlay=document.getElementById("p3dFloatPlay"),p3dPrev=document.getElementById("p3dFloatPrev"),p3dNext=document.getElementById("p3dFloatNext"),p3dProgress=document.getElementById("p3dFloatProgress"),p3dCurrent=document.getElementById("p3dFloatCurrent"),p3dDuration=document.getElementById("p3dFloatDuration"),p3dList=document.getElementById("p3dFloatPlaylist");
function p3dTime(sec){if(!Number.isFinite(sec))return"0:00";const m=Math.floor(sec/60),s=Math.floor(sec%60).toString().padStart(2,"0");return`${m}:${s}`}
function p3dLoadFloatTrack(i,autoplay=false){p3dFloatIndex=(i+p3dFloatTracks.length)%p3dFloatTracks.length;const t=p3dFloatTracks[p3dFloatIndex];p3dAudio.src=t.src;p3dCover.src=t.cover||"./assets/player-placeholder.jpg";p3dTitle.textContent=t.title;p3dArtist.textContent=t.artist;p3dPlay.textContent="▶";document.querySelectorAll(".p3d-float-row").forEach((row,idx)=>row.classList.toggle("active",idx===p3dFloatIndex));if(autoplay)p3dAudio.play().then(()=>p3dPlay.textContent="⏸").catch(()=>{})}
function p3dBuildFloatList(){p3dList.innerHTML="";p3dFloatTracks.forEach((t,i)=>{const row=document.createElement("div");row.className="p3d-float-row";row.innerHTML=`<img src="${t.cover||"./assets/player-placeholder.jpg"}" alt=""><div class="p3d-float-row-title">${t.title}</div>`;row.addEventListener("click",()=>p3dLoadFloatTrack(i,true));p3dList.appendChild(row)})}
p3dPlay.addEventListener("click",()=>{if(p3dAudio.paused){p3dAudio.play().then(()=>p3dPlay.textContent="⏸").catch(()=>alert("Audio file missing. Check your /music file paths."))}else{p3dAudio.pause();p3dPlay.textContent="▶"}});
p3dPrev.addEventListener("click",()=>p3dLoadFloatTrack(p3dFloatIndex-1,true));
p3dNext.addEventListener("click",()=>p3dLoadFloatTrack(p3dFloatIndex+1,true));
p3dAudio.addEventListener("timeupdate",()=>{if(p3dAudio.duration){p3dProgress.value=(p3dAudio.currentTime/p3dAudio.duration)*100;p3dCurrent.textContent=p3dTime(p3dAudio.currentTime);p3dDuration.textContent=p3dTime(p3dAudio.duration)}});
p3dProgress.addEventListener("input",()=>{if(p3dAudio.duration)p3dAudio.currentTime=(p3dProgress.value/100)*p3dAudio.duration});
p3dAudio.addEventListener("ended",()=>p3dLoadFloatTrack(p3dFloatIndex+1,true));
p3dMinimize.addEventListener("click",()=>{p3dPlayer.classList.toggle("minimized");p3dMinimize.textContent=p3dPlayer.classList.contains("minimized")?"+":"—"});
let dragging=false,offsetX=0,offsetY=0;
p3dHandle.addEventListener("pointerdown",e=>{dragging=true;p3dHandle.setPointerCapture(e.pointerId);const r=p3dPlayer.getBoundingClientRect();offsetX=e.clientX-r.left;offsetY=e.clientY-r.top;p3dPlayer.style.left=r.left+"px";p3dPlayer.style.top=r.top+"px";p3dPlayer.style.bottom="auto";p3dPlayer.style.transform="none"});
p3dHandle.addEventListener("pointermove",e=>{if(!dragging)return;const maxX=innerWidth-p3dPlayer.offsetWidth,maxY=innerHeight-p3dPlayer.offsetHeight;let x=e.clientX-offsetX,y=e.clientY-offsetY;x=Math.max(0,Math.min(maxX,x));y=Math.max(0,Math.min(maxY,y));p3dPlayer.style.left=x+"px";p3dPlayer.style.top=y+"px"});
p3dHandle.addEventListener("pointerup",()=>dragging=false);
document.addEventListener("DOMContentLoaded",()=>{p3dBuildFloatList();p3dLoadFloatTrack(0,false)});
