(function(){
'use strict';

const byId = (id)=>document.getElementById(id);
const params = new URLSearchParams(window.location.search);

const code = (params.get('code')||'').toUpperCase().trim();
const target = params.get('target') || '';

const statusPill = byId('statusPill');
const vaultState = byId('vaultState');
const lockedActions = byId('lockedActions');
const lockedRoom = byId('lockedRoom');

const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
const TABLE = 'vault_codes';


function setMasterSession(){
  try{
    localStorage.setItem('CAPO_MASTER_SESSION', JSON.stringify({
      active:true,
      code:'CAPO-MASTER-999',
      started_at:Date.now(),
      expires_at:Date.now() + (1000 * 60 * 60 * 12)
    }));
  }catch(e){}
}

function buildTargetUrl(path){
  if(!path) return '';

  try{
    const u = new URL(path, window.location.origin);
    u.searchParams.set('from', 'master');
    u.searchParams.set('master', '1');
    return u.toString();
  }catch(e){
    return '';
  }
}

function showLocked(msg){
  document.body.classList.add('locked');

  if(statusPill) statusPill.textContent='LOCKED';
  if(vaultState) vaultState.textContent = msg || 'Access code required';

  if(lockedActions) lockedActions.classList.remove('hidden');
  if(lockedRoom) lockedRoom.classList.remove('hidden');
}

function hideAllRooms(){
  ['entry','gold','elite','master'].forEach(t=>{
    const el = byId('room-'+t);
    if(el) el.classList.add('hidden');
  });
}

function unlockUI(tier){

  const cleanTier = String(tier || 'entry').toLowerCase();

  const allowedTier =
    (cleanTier === 'gold' || cleanTier === 'elite' || cleanTier === 'master')
      ? cleanTier
      : 'entry';

  window.__vaultUnlockedTier = allowedTier;

  document.body.classList.remove('locked');

  const lockedGate = byId('lockedGate');

  if(lockedGate) lockedGate.classList.add('hidden');
  if(lockedActions) lockedActions.classList.add('hidden');
  if(lockedRoom) lockedRoom.classList.add('hidden');

  hideAllRooms();

  if(allowedTier === 'master'){
    setMasterSession();

    const destination = buildTargetUrl(target);
    if(destination){
      window.location.replace(destination);
      return;
    }

    const masterRoom = byId('room-master');

    if(masterRoom){
      masterRoom.classList.remove('hidden');
    }

  }else{

    const room = byId('room-'+allowedTier);

    if(room){
      room.classList.remove('hidden');
    }
  }

  if(statusPill){
    statusPill.textContent = allowedTier.toUpperCase();
  }

  if(vaultState){
    vaultState.textContent =
      allowedTier === 'master'
        ? 'Master Access Granted'
        : allowedTier.charAt(0).toUpperCase()+allowedTier.slice(1)+' Room';
  }

  window.scrollTo(0,0);
}

async function getCode(code){

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${code}&select=*`,
    {
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`
      }
    }
  );

  if(!res.ok){
    throw new Error('DB error');
  }

  const data = await res.json();

  return data.length ? data[0] : null;
}

function playAccessSequence(){

  const seq = document.getElementById('vaultSequence');
  const overlay = document.getElementById('accessOverlay');

  if(!seq) return;

  seq.classList.remove('active','play','fadeout');

  if(overlay){
    overlay.classList.remove('show');
  }

  seq.style.display = 'block';

  if(overlay){
    overlay.classList.add('show');
  }

  setTimeout(()=>{
    seq.classList.add('active');
  },300);

  setTimeout(()=>{
    if(overlay){
      overlay.classList.remove('show');
    }

    seq.classList.add('play');
  },1200);

  setTimeout(()=>{
    seq.classList.add('fadeout');
  },4200);

  setTimeout(()=>{
    seq.classList.remove('active','play','fadeout');
    seq.style.display='none';
  },5400);
}

function showMasterRoomTarget(tier){

  if(window.__vaultUnlockedTier !== 'master'){
    return;
  }

  const cleanTier = String(tier || '').toLowerCase();

  hideAllRooms();

  const room = byId('room-'+cleanTier);

  if(room){
    room.classList.remove('hidden');
  }

  window.scrollTo(0,0);
}

document.addEventListener('click', function(e){

  const link = e.target.closest('[data-master-room]');

  if(!link){
    return;
  }

  e.preventDefault();

  const tier = link.getAttribute('data-master-room');

  showMasterRoomTarget(tier);
});

async function init(){

  if(!code){
    showLocked('No code provided');
    return;
  }

  try{

    const res = await fetch("https://fupoedrovfloudefyzna.supabase.co/functions/v1/manual-vault-validate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ code })
});

const data = await res.json();

if (!res.ok || !data.success) {
  showLocked(data.error || "Invalid code");
  return;
}

const record = data.record;

    if(!record){
      showLocked('Invalid code');
      return;
    }

    if(record.expires_at){

      const now = new Date().getTime();
      const expiry = new Date(record.expires_at).getTime();

      if(now > expiry){
        showLocked('Code expired');
        return;
      }
    }

    const tier =
      code === 'CAPO-MASTER-999'
        ? 'master'
        : String(record.code_type || 'entry').toLowerCase();

    playAccessSequence();

    setTimeout(()=>{
      unlockUI(tier);
    },5400);

  }catch(err){

    showLocked('Connection error');
  }
}

init();

})();
