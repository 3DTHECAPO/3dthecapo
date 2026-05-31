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


function durationToMs(duration){
  const map = {
    "1h": 1 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  };

  const key = String(duration || "1h").trim().toLowerCase();
  return key === "none" ? null : (map[key] || map["1h"]);
}

async function patchCodeUse(record){
  if(!record || !record.id) throw new Error('Missing vault code record');

  const usedAt = record.used_at || new Date().toISOString();
  let expiresAt = record.expires_at || null;

  if(!expiresAt){
    const durationMs = durationToMs(record.duration);
    if(durationMs !== null){
      const usedAtMs = new Date(usedAt).getTime();
      if(!Number.isFinite(usedAtMs)) throw new Error('Invalid used_at value');
      expiresAt = new Date(usedAtMs + durationMs).toISOString();
    }
  }

  const patch = { used:true, used_at:usedAt, expires_at:expiresAt };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(record.id)}`,{
    method:'PATCH',
    headers:{
      'apikey':SUPABASE_ANON,
      'Authorization':`Bearer ${SUPABASE_ANON}`,
      'Content-Type':'application/json',
      'Prefer':'return=representation'
    },
    body:JSON.stringify(patch)
  });

  if(!res.ok) throw new Error('Vault code update failed');
  const rows = await res.json().catch(()=>[]);
  return Array.isArray(rows) && rows[0] ? rows[0] : Object.assign(record, patch);
}

function saveVaultPass(record, tier){
  try{
    const expires = record && record.expires_at
      ? record.expires_at
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    localStorage.setItem("play3d_vault_pass_v1", JSON.stringify({
      tier: tier || record.code_type || "ENTRY",
      code: record.code || code,
      route: record.route || "",
      expires_at: expires
    }));
  }catch(e){}
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

    const usedRecord = await patchCodeUse(record);
    Object.assign(record, usedRecord);

    if(record.expires_at){
      const expiry = new Date(record.expires_at).getTime();
      if(Number.isFinite(expiry) && Date.now() > expiry){
        await logEvent(code, record.code_type || '', 'expired');
        showLocked('Code expired');
        return;
      }
    }

    const tier = String(record.code_type || 'ENTRY').toLowerCase();
    saveVaultPass(record, tier);
    fireBrevoSafe(code, tier);
    logEvent(code, tier, 'success');
    unlockUI(tier);
    injectEmailCapture(code);
  }catch(err){
    console.error(err);
    showLocked('Connection error');
  }
}
function injectEmailCapture(codeValue){
  const container = document.createElement("div");
  container.style.marginTop = "20px";

  container.innerHTML = `
    <input id="vaultEmailInput" type="email" placeholder="Enter email for bonus rewards" style="padding:10px;width:100%;margin-bottom:10px;">
    <button id="vaultEmailBtn" style="padding:10px 16px;">Unlock Bonus</button>
  `;

  document.body.appendChild(container);

  document.getElementById("vaultEmailBtn").onclick = async ()=>{
    const email = document.getElementById("vaultEmailInput").value.trim().toLowerCase();

    if(!email){
      alert("Enter email");
      return;
    }

    try{
      await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(codeValue)}`,{
        method:"PATCH",
        headers:{
          "Content-Type":"application/json",
          "apikey":SUPABASE_ANON,
          "Authorization":"Bearer " + SUPABASE_ANON
        },
        body:JSON.stringify({
          recipient_email: email,
          sent: true,
          sent_at: new Date().toISOString()
        })
      });

      container.innerHTML = "<p>Email saved ✔</p>";
    }catch(e){
      alert("Save failed");
    }
  };
}
  function injectEmailCapture(codeValue){
  if(document.getElementById("vaultEmailCapture")) return;

  const container = document.createElement("div");
  container.id = "vaultEmailCapture";
  container.style.cssText = `
    width:min(720px,92vw);
    margin:28px auto 0;
    padding:22px;
    border:1px solid rgba(202,162,74,.34);
    border-radius:24px;
    background:linear-gradient(180deg,rgba(12,10,7,.86),rgba(0,0,0,.72));
    box-shadow:0 24px 74px rgba(0,0,0,.72), inset 0 1px 0 rgba(255,255,255,.05);
    color:#f4f1ea;
    font-family:Oswald,Arial,sans-serif;
    text-align:center;
  `;

  container.innerHTML = `
    <div style="color:#f2d27b;font-family:'Black Ops One',system-ui,sans-serif;letter-spacing:1px;text-transform:uppercase;font-size:22px;margin-bottom:8px;">
      Unlock Bonus Access
    </div>
    <div style="color:rgba(244,241,234,.68);font-size:14px;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">
      Enter email for future drops, bonus codes, and vault updates
    </div>
    <input id="vaultEmailInput" type="email" placeholder="customer@email.com" style="
      width:100%;
      min-height:48px;
      border-radius:14px;
      border:1px solid rgba(202,162,74,.34);
      background:rgba(0,0,0,.62);
      color:#f4f1ea;
      padding:0 14px;
      outline:none;
      font-family:Oswald,Arial,sans-serif;
      font-size:16px;
      margin-bottom:12px;
    ">
    <button id="vaultEmailBtn" style="
      border:0;
      border-radius:999px;
      background:linear-gradient(180deg,#f2d27b,#caa24a 56%,#8b641e);
      color:#100c05;
      padding:12px 20px;
      font-weight:900;
      letter-spacing:1px;
      text-transform:uppercase;
      cursor:pointer;
      box-shadow:0 14px 34px rgba(202,162,74,.22);
      font-family:Oswald,Arial,sans-serif;
    ">
      Save Email + Unlock Bonus
    </button>
    <div id="vaultEmailStatus" style="margin-top:12px;color:rgba(244,241,234,.68);font-size:13px;"></div>
  `;

  const target = document.getElementById("connect") || document.querySelector("main") || document.body;
  target.parentNode.insertBefore(container, target);

  document.getElementById("vaultEmailBtn").onclick = async ()=>{
    const email = document.getElementById("vaultEmailInput").value.trim().toLowerCase();
    const status = document.getElementById("vaultEmailStatus");

    if(!email){
      status.textContent = "Enter email first.";
      return;
    }

    status.textContent = "Saving...";

    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(codeValue)}`,{
        method:"PATCH",
        headers:{
          "Content-Type":"application/json",
          "apikey":SUPABASE_ANON,
          "Authorization":"Bearer " + SUPABASE_ANON,
          "Prefer":"return=minimal"
        },
        body:JSON.stringify({
          recipient_email: email,
          sent: true,
          sent_at: new Date().toISOString()
        })
      });

      if(!res.ok){
        const text = await res.text();
        throw new Error(text || "Save failed");
      }

      container.innerHTML = `
        <div style="color:#f2d27b;font-family:'Black Ops One',system-ui,sans-serif;letter-spacing:1px;text-transform:uppercase;font-size:22px;">
          Email Saved ✔
        </div>
        <p style="color:rgba(244,241,234,.72);margin:10px 0 0;">
          Bonus access connected to ${email}.
        </p>
      `;
    }catch(e){
      status.textContent = "Save failed. Try again.";
    }
  };
}
init();
})();
