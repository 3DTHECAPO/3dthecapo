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
const SUPABASE_ANON = '';
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

  const cleanTier = normalizeTier(tier || 'entry');

  const allowedTier = tierForUI(cleanTier);

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


/* ===== PLAY 3D VAULT STATUS / PASS RESTORE =====
   Restores unified access handling for manual, emailed-link, and NFC code routes.
   Reads existing Supabase row fields and does not overwrite email-send fields.
*/
function normalizeTier(value){
  const t = String(value || 'entry').toLowerCase();
  if(['entry','gold','elite','drop','merch','master'].includes(t)) return t;
  return 'entry';
}

function tierForUI(value){
  const t = normalizeTier(value);
  if(t === 'master') return 'master';
  if(t === 'gold') return 'gold';
  if(t === 'elite' || t === 'drop' || t === 'merch') return 'elite';
  return 'entry';
}

function durationMs(value){
  const d = String(value || '').toLowerCase().trim();
  const direct = {
    '1h': 1000 * 60 * 60,
    '6h': 1000 * 60 * 60 * 6,
    '12h': 1000 * 60 * 60 * 12,
    '1d': 1000 * 60 * 60 * 24,
    '3d': 1000 * 60 * 60 * 24 * 3,
    '7d': 1000 * 60 * 60 * 24 * 7,
    '30d': 1000 * 60 * 60 * 24 * 30,
    'no expiry': null,
    'no-expiry': null,
    'none': null,
    'unlimited': null,
    'lifetime': null
  };

  if(Object.prototype.hasOwnProperty.call(direct, d)){
    return direct[d];
  }

  const match = d.match(/^(\d+)\s*(h|hr|hrs|hour|hours|d|day|days)$/);
  if(match){
    const n = Number(match[1]);
    const unit = match[2];
    if(unit.startsWith('h')) return n * 1000 * 60 * 60;
    if(unit.startsWith('d')) return n * 1000 * 60 * 60 * 24;
  }

  return null;
}

function computeStartsAt(record){
  return record.starts_at || record.used_at || new Date().toISOString();
}

function computeExpiresAt(record, startsAt){
  if(record.expires_at) return record.expires_at;

  const durationValue = record.duration || record.duration_label || record.pass_duration || '';
  const ms = durationMs(durationValue);

  if(ms === null){
    const d = String(durationValue || '').toLowerCase();
    if(d.includes('no') || d.includes('unlimited') || d.includes('life') || d === 'none') return null;
  }

  if(ms){
    return new Date(new Date(startsAt).getTime() + ms).toISOString();
  }

  return new Date(Date.now() + (1000 * 60 * 60 * 12)).toISOString();
}

function saveVaultPass(record, rawTier){
  try{
    const tier = normalizeTier(rawTier || record.code_type || record.tier);
    const startsAt = computeStartsAt(record);
    const expiresAt = computeExpiresAt(record, startsAt);

    const pass = {
      active: true,
      code: record.code || code,
      id: record.id || null,
      tier: tier,
      code_type: record.code_type || tier,
      route: record.route || '',
      duration: record.duration || record.duration_label || record.pass_duration || '',
      starts_at: startsAt,
      expires_at: expiresAt,
      recipient_email: record.recipient_email || record.sent_to || '',
      sent: !!record.sent,
      sent_at: record.sent_at || '',
      used: true,
      used_at: record.used_at || new Date().toISOString(),
      source: params.get('nfc') === '1' ? 'nfc' : 'code',
      saved_at: new Date().toISOString()
    };

    localStorage.setItem('play3d_vault_pass_v1', JSON.stringify(pass));
    localStorage.setItem('gv_bonus', '1');
    localStorage.setItem('gv_pass_tier', String(pass.tier || '').toUpperCase());
    localStorage.setItem('gv_pass_route', String(pass.route || ''));
    localStorage.setItem('gv_pass_expiry', String(pass.expires_at || ''));
  }catch(e){
    console.warn('Vault pass save failed:', e);
  }
}

async function patchVaultCodeStatus(record){
  try{
    if(!record || !record.id) return;

    const nowIso = new Date().toISOString();
    const startsAt = record.starts_at || record.used_at || nowIso;
    const expiresAt = record.expires_at || computeExpiresAt(record, startsAt);

    const payload = {
      used: true,
      used_at: record.used_at || nowIso
    };

    if(!record.starts_at) payload.starts_at = startsAt;
    if(!record.expires_at && expiresAt) payload.expires_at = expiresAt;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${record.id}`, {
      method: 'PATCH',
      headers:{
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if(!res.ok){
      const text = await res.text().catch(()=>'');
      console.warn('Vault code status patch failed:', res.status, text);
    }
  }catch(err){
    console.warn('Vault code status patch error:', err);
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
        : normalizeTier(record.code_type || record.tier || 'entry');

    saveVaultPass(record, tier);
    patchVaultCodeStatus(record);

    playAccessSequence();

    setTimeout(()=>{
      unlockUI(tier);
    },5400);

  }catch(err){

    console.warn('Vault init error:', err);
    showLocked('Connection error');
  }
}

init();

})();
