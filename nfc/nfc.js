
(function(){
  const byId=(id)=>document.getElementById(id);
  const params=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams((window.location.hash||'').replace(/^#/, ''));
  const unlock=(params.get('unlock')||'').toLowerCase();
  const providedKey=(hash.get('k')||params.get('key')||'').trim();
  const intro=byId('intro'), vault=byId('vault'), title=byId('title'), subtitle=byId('subtitle');
  const panels={album:byId('album'),ep:byId('ep'),track:byId('track'),video:byId('video')};
  Object.values(panels).forEach(el=>el&&el.classList.add('hidden'));
  const SECRET_SEED='CAPO-UNIFIED-FINAL', WINDOW_DAYS=2;
  function formatDateUTC(date){const y=date.getUTCFullYear(),m=String(date.getUTCMonth()+1).padStart(2,'0'),d=String(date.getUTCDate()).padStart(2,'0'); return `${y}${m}${d}`;}
  function hashString(input){let h=2166136261>>>0; for(let i=0;i<input.length;i++){h^=input.charCodeAt(i); h=Math.imul(h,16777619)>>>0;} return h.toString(36).toUpperCase().padStart(7,'0').slice(0,7);}
  function validKeysFor(type){const keys=[], now=new Date(); for(let offset=-WINDOW_DAYS; offset<=WINDOW_DAYS; offset++){const d=new Date(now); d.setUTCDate(now.getUTCDate()+offset); keys.push(hashString(`${SECRET_SEED}:${type}:${formatDateUTC(d)}`));} return keys;}
  let active=null; if(unlock==='album') active='album'; else if(unlock==='ep') active='ep'; else if(unlock==='track'||unlock==='exclusive') active='track'; else if(unlock==='video') active='video';
  setTimeout(()=>{
    if(intro) intro.style.display='none';
    if(vault) vault.classList.remove('hidden');
    if(!active){ if(title) title.textContent='ACCESS READY'; if(subtitle) subtitle.textContent='Choose an unlock above or tap your NFC product.'; return; }
    const valid = providedKey && validKeysFor(active).includes(providedKey.toUpperCase());
    if(!valid){ if(title) title.textContent='ACCESS DENIED'; if(subtitle) subtitle.textContent=providedKey ? 'This vault key is invalid or expired.' : 'Waiting for NFC key.'; return; }
    if(panels[active]){ panels[active].classList.remove('hidden'); if(title) title.textContent=`${active.toUpperCase()} UNLOCKED`; if(subtitle) subtitle.textContent=`Protected ${active} access is active.`; }
  },1800);
})();
