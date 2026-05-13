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


/* ===== VAULT CODE USE LOG + PASS RESTORE =====
   Restores the missing browser pass/session and best-effort Supabase status logging.
   Does not block unlock if logging is denied by RLS/network.
*/
function getVaultPassExpiry(record){
  if(record && record.expires_at){
    return record.expires_at;
  }

  const duration = String((record && (record.duration || record.duration_label)) || '').toLowerCase();
  const now = Date.now();

  const durationMap = {
    '1h': 1000 * 60 * 60,
    '6h': 1000 * 60 * 60 * 6,
    '12h': 1000 * 60 * 60 * 12,
    '1d': 1000 * 60 * 60 * 24,
    '3d': 1000 * 60 * 60 * 24 * 3,
    '7d': 1000 * 60 * 60 * 24 * 7,
    '30d': 1000 * 60 * 60 * 24 * 30
  };

  if(durationMap[duration]){
    return new Date(now + durationMap[duration]).toISOString();
  }

  return new Date(now + (1000 * 60 * 60 * 12)).toISOString();
}

function saveVaultPass(record, tier){
  try{
    const pass = {
      active: true,
      code: record.code || code,
      tier: tier || record.code_type || 'entry',
      code_type: record.code_type || tier || 'entry',
      route: record.route || '',
      duration: record.duration || '',
      starts_at: record.starts_at || new Date().toISOString(),
      expires_at: getVaultPassExpiry(record),
      source: 'vault-code',
      saved_at: new Date().toISOString()
    };

    localStorage.setItem('play3d_vault_pass_v1', JSON.stringify(pass));
    localStorage.setItem('gv_pass_tier', String(pass.tier || '').toUpperCase());
    localStorage.setItem('gv_pass_route', String(pass.route || ''));
    localStorage.setItem('gv_pass_expiry', String(pass.expires_at || ''));
  }catch(e){
    console.warn('Vault pass save failed:', e);
  }
}

async function logVaultCodeUse(record){
  try{
    if(!record || !record.id) return;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${record.id}`, {
      method: 'PATCH',
      headers:{
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        used: true,
        used_at: new Date().toISOString()
      })
    });

    if(!res.ok){
      const text = await res.text().catch(()=>'');
      console.warn('Vault code usage log failed:', res.status, text);
    }
  }catch(err){
    console.warn('Vault code usage log error:', err);
  }
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

    const record = await getCode(code);

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

    saveVaultPass(record, tier);
    logVaultCodeUse(record);

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
