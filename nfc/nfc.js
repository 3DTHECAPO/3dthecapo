(function(){
'use strict';

const byId = (id)=>document.getElementById(id);
const params = new URLSearchParams(window.location.search);

const code = (params.get('code')||'').toUpperCase().trim();
const explicitUnlock = (params.get('unlock')||'').toLowerCase();

const statusPill=byId('statusPill');
const vaultState=byId('vaultState');
const lockedActions=byId('lockedActions');
const lockedRoom=byId('lockedRoom');
const publicNav=byId('publicNav');
const privateNav=byId('privateNav');

const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
const TABLE = 'vault_codes';

// ---------- UI ----------
  async function logEvent(code, tier, type){
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/vault_logs`,{
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        code: code,
        tier: tier || '',
        event_type: type,
        user_agent: navigator.userAgent,
        page: window.location.pathname
      })
    });
  }catch(e){}
}
function showLocked(msg){
  document.body.classList.add('locked');
  if(statusPill) statusPill.textContent='Locked';
  if(vaultState) vaultState.textContent = msg || 'Access code required';
  if(lockedActions) lockedActions.classList.remove('hidden');
  if(lockedRoom) lockedRoom.classList.remove('hidden');
  if(publicNav) publicNav.classList.remove('hidden');
  if(privateNav) privateNav.classList.add('hidden');
}
function unlockUI(tier){
  const cleanTier = String(tier || 'entry').toLowerCase();
  const allowedTier =
    (cleanTier === 'gold' || cleanTier === 'elite' || cleanTier === 'master')
      ? cleanTier
      : 'entry';

  playAccessSequence();
  document.body.classList.remove('locked');

  // Hide lock/access screen after valid unlock.
  const lockedGate = byId('lockedGate');
  if(lockedGate) lockedGate.classList.add('hidden');

  if(lockedActions) lockedActions.classList.add('hidden');
  if(lockedRoom) lockedRoom.classList.add('hidden');

  // Hide all possible rooms first.
  ['entry','gold','elite','master'].forEach(t=>{
    const el = byId('room-'+t);
    if(el) el.classList.add('hidden');
  });

  // MASTER shows only the Master dashboard.
  // This prevents freezing from loading every heavy embed at once.
  if(allowedTier === 'master'){
    const masterRoom = byId('room-master');
    if(masterRoom) masterRoom.classList.remove('hidden');
  }else{
    const room = byId('room-'+allowedTier);
    if(room) room.classList.remove('hidden');
  }

  // NO AUTO-SCROLL / NO AUTO-SLIDE.
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  if(statusPill) statusPill.textContent = allowedTier.toUpperCase();

  if(vaultState){
    vaultState.textContent =
      allowedTier === 'master'
        ? 'Master Access Granted'
        : allowedTier.charAt(0).toUpperCase()+allowedTier.slice(1)+' Room';
  }

  if(publicNav) publicNav.classList.add('hidden');
  if(privateNav) privateNav.classList.remove('hidden');
}

// ---------- SUPABASE ----------
async function getCode(code){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${code}&select=*`,{
    headers:{
      'apikey':SUPABASE_ANON,
      'Authorization':`Bearer ${SUPABASE_ANON}`
    }
  });

  if(!res.ok) throw new Error('DB error');

  const data = await res.json();
  return data.length ? data[0] : null;
}



// ---------- MAIN ----------
function playAccessSequence(){
  const seq = document.getElementById('vaultSequence');
  const overlay = document.getElementById('accessOverlay');

  if(!seq) return;

  // Reset cinematic state.
  seq.classList.remove('active','play','fadeout');
  if(overlay) overlay.classList.remove('show');

  seq.style.display = 'block';

  // ACCESS GRANTED first.
  if(overlay){
    overlay.classList.add('show');
  }

  // Bring in vault sequence.
  setTimeout(()=>{
    seq.classList.add('active');
  }, 300);

  // Open doors after the access message.
  setTimeout(()=>{
    if(overlay) overlay.classList.remove('show');
    seq.classList.add('play');
  }, 1200);

  // Fade out.
  setTimeout(()=>{
    seq.classList.add('fadeout');
  }, 4200);

  // Cleanup.
  setTimeout(()=>{
    seq.classList.remove('active','play','fadeout');
    seq.style.display = 'none';
  }, 5400);
}

async function init(){

  if(!code){
  showLocked('No code provided');
  return;
}

  try{
    const record = await getCode(code);

    if(!record){
      await logEvent(code, '', 'invalid');
      showLocked('Invalid code');
      return;
    }

    

    if(record.expires_at){
      const now = new Date().getTime();
const expiry = new Date(record.expires_at).getTime();

if(now > expiry){
  await logEvent(code, '', 'expired');
  showLocked('Code expired');
  return;
}
    }

    const tier = record.code_type.toLowerCase();

// TEMP: disable markUsed until stable
// await markUsed(code);

await logEvent(code, tier, 'success');

unlockUI(tier);

  }catch(err){
    showLocked('Connection error');
  }
}

init();

})();
