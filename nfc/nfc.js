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
  document.body.classList.remove('locked');

  ['entry','gold','elite'].forEach(t=>{
    const el = byId('room-'+t);
    if(el) el.classList.add('hidden');
  });

  const room = byId('room-'+tier);
  if(room) room.classList.remove('hidden');

  if(statusPill) statusPill.textContent = tier.toUpperCase();
  if(vaultState) vaultState.textContent = tier.charAt(0).toUpperCase()+tier.slice(1)+' Room';

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

async function markUsed(code){
  await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${code}`,{
    method:'PATCH',
    headers:{
      'apikey':SUPABASE_ANON,
      'Authorization':`Bearer ${SUPABASE_ANON}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({used:true})
  });
}

// ---------- MAIN ----------
async function init(){

  if(!code){
    showLocked();
    return;
  }

  try{
    const record = await getCode(code);

    if(!record){
      await logEvent(code, '', 'invalid');
      showLocked('Invalid code');
      return;
    }

    if(record.used){
      await logEvent(code, '', 'already_used');
      showLocked('Code already used');
      return;
    }

    if(record.expires_at){
      if(new Date() > new Date(record.expires_at)){
        showLocked('Code expired');
        return;
      }
    }

    const tier = record.code_type.toLowerCase();

    await markUsed(code);
    await logEvent(code, tier, 'success');
    unlockUI(tier);

  }catch(err){
    showLocked('Connection error');
  }
}

init();

})();
