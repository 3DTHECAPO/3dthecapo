(function(){
'use strict';

const byId = (id)=>document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const code = (params.get('code')||'').toUpperCase().trim();

const statusPill=byId('statusPill');
const vaultState=byId('vaultState');
const lockedActions=byId('lockedActions');
const lockedRoom=byId('lockedRoom');
const publicNav=byId('publicNav');
const privateNav=byId('privateNav');
const vaultSequence=byId('vaultSequence');
const accessOverlay=byId('accessOverlay');
const sessionDivider=byId('sessionDivider');
const sessionLane=byId('sessionLane');
const connectDivider=byId('connectDivider');
const connect=byId('connect');

const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
const TABLE = 'vault_codes';

const ROOM_MAP = {
  entry: 'room-entry',
  gold: 'room-gold',
  elite: 'room-elite',
  drop: 'room-elite',
  merch: 'room-elite'
};

function show(el){ if(el) el.classList.remove('hidden'); }
function hide(el){ if(el) el.classList.add('hidden'); }

async function logEvent(codeValue, tier, type){
  try{
    await fetch(`${SUPABASE_URL}/rest/v1/vault_logs`,{
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        code: codeValue,
        tier: tier || '',
        event_type: type,
        user_agent: navigator.userAgent,
        page: window.location.pathname
      })
    });
  }catch(e){}
}


function patchCodeHit(codeValue){
  if(!codeValue) return;
  // Fire-and-forget analytics marker. This restores dashboard hits without blocking access.
  try{
    fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(codeValue)}`,{
      method:'PATCH',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body:JSON.stringify({ used:true, used_at:new Date().toISOString() })
    }).catch(()=>{});
  }catch(e){}
}

function fireBrevoSafe(codeValue, tier){
  // Keeps Brevo-compatible hooks non-blocking. If your Brevo script is loaded anywhere,
  // these events give it something to catch without freezing the vault flow.
  try{ window.dispatchEvent(new CustomEvent('play3d:redeem_success', { detail:{ code:codeValue, tier:tier||'' } })); }catch(e){}
  try{
    if(window.Brevo && typeof window.Brevo.track === 'function') window.Brevo.track('vault_redeem_success', { code:codeValue, tier:tier||'' });
    if(window.sendinblue && typeof window.sendinblue.track === 'function') window.sendinblue.track('vault_redeem_success', { code:codeValue, tier:tier||'' });
  }catch(e){}
}

function showLocked(msg){
  document.body.classList.add('locked');
  if(statusPill) statusPill.textContent='Locked';
  if(vaultState) vaultState.textContent = msg || 'Access code required';
  show(lockedActions);
  show(lockedRoom);
  show(publicNav);
  hide(privateNav);
  hide(sessionDivider);
  hide(sessionLane);
  hide(connectDivider);
  hide(connect);
}

function playAccessSequence(){
  if(!vaultSequence){
    document.body.classList.add('access-granted','vault-open');
    return;
  }

  // Reset every time so the cinematic can replay on every valid entry.
  vaultSequence.classList.remove('play','active','open','fadeout');
  vaultSequence.style.display = 'block';
  vaultSequence.style.opacity = '1';
  vaultSequence.style.visibility = 'visible';
  vaultSequence.removeAttribute('aria-hidden');
  void vaultSequence.offsetWidth;

  document.body.classList.add('access-granted');

  // 1) Access Granted screen first.
  if(accessOverlay){
    accessOverlay.classList.add('show','active');
  }
  vaultSequence.classList.add('active');

  // 2) Then remove Access overlay and play the doors so it does not get stuck covering them.
  setTimeout(()=>{
    if(accessOverlay){
      accessOverlay.classList.remove('show','active');
    }
    vaultSequence.classList.add('play','open');
    document.body.classList.add('vault-open');
  }, 950);

  // 3) Fade the cinematic away and reveal the unlocked room underneath.
  setTimeout(()=>{
    vaultSequence.classList.add('fadeout');
  }, 4450);

  setTimeout(()=>{
    vaultSequence.classList.remove('play','active','open','fadeout');
    vaultSequence.style.display = 'none';
    vaultSequence.setAttribute('aria-hidden','true');
    document.body.classList.remove('access-granted');
  }, 5300);
}

function unlockUI(rawTier){
  const tier = String(rawTier || 'entry').toLowerCase();
  document.body.classList.remove('locked');

  ['entry','gold','elite'].forEach(t=>hide(byId('room-'+t)));

  const roomId = ROOM_MAP[tier] || 'room-entry';
  show(byId(roomId));

  if(statusPill) statusPill.textContent = tier.toUpperCase();
  if(vaultState) vaultState.textContent = tier.charAt(0).toUpperCase()+tier.slice(1)+' Room';

  hide(lockedActions);
  hide(lockedRoom);
  hide(publicNav);
  show(privateNav);
  show(sessionDivider);
  show(sessionLane);
  show(connectDivider);
  show(connect);

  playAccessSequence();
}

async function getCode(codeValue){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(codeValue)}&select=*`,{
    headers:{
      'apikey':SUPABASE_ANON,
      'Authorization':`Bearer ${SUPABASE_ANON}`
    }
  });
  if(!res.ok) throw new Error('DB error');
  const data = await res.json();
  return data.length ? data[0] : null;
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
      const expiry = new Date(record.expires_at).getTime();
      if(Number.isFinite(expiry) && Date.now() > expiry){
        await logEvent(code, record.code_type || '', 'expired');
        showLocked('Code expired');
        return;
      }
    }

    const tier = String(record.code_type || 'ENTRY').toLowerCase();
    patchCodeHit(code);
    fireBrevoSafe(code, tier);
    logEvent(code, tier, 'success');
    unlockUI(tier);
  }catch(err){
    console.error(err);
    showLocked('Connection error');
  }
}

init();
})();
