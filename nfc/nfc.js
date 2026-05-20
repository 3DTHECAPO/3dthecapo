(function(){
'use strict';

const byId = (id)=>document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const code = (params.get('code')||'').toUpperCase().trim();

const statusPill=byId('statusPill');
const vaultState=byId('vaultState');
const lockedActions=byId('lockedActions');
const lockedRoom=byId('lockedRoom');
const vaultSequence=byId('vaultSequence');
const accessOverlay=byId('accessOverlay');
const sessionDivider=byId('sessionDivider');
const sessionLane=byId('sessionLane');
const connectDivider=byId('connectDivider');
const connect=byId('connect');

const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
const TABLE = 'vault_codes';
const PASS_KEY = 'play3d_vault_pass_v1';
const MASTER_KEY = 'CAPO_MASTER_SESSION';

function sessionLog(message){
  try{ console.log('[PLAY3D ACCESS]', message); }catch(e){}
}

function readJSON(key){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}

function writeJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
}

function removeKey(key){
  try{ localStorage.removeItem(key); }catch(e){}
}

function passIsValid(pass){
  if(!pass || !pass.expires_at) return false;
  const expiry = new Date(pass.expires_at).getTime();
  return Number.isFinite(expiry) && expiry > Date.now();
}

function getActiveMasterSession(){
  const session = readJSON(MASTER_KEY);
  if(!session || session.active !== true) return null;
  if(session.expires_at && Number(session.expires_at) <= Date.now()){
    removeKey(MASTER_KEY);
    sessionLog('SESSION EXPIRED');
    return null;
  }
  sessionLog('MASTER SESSION ACTIVE');
  return session;
}

function saveMasterSession(record){
  const existing = getActiveMasterSession();
  if(existing) return existing;
  const expires = record && record.expires_at ? new Date(record.expires_at).getTime() : Date.now() + (1000 * 60 * 60 * 12);
  const session = {
    active:true,
    tier:'master',
    code:record && record.code || code || '',
    started_at:Date.now(),
    expires_at:expires
  };
  writeJSON(MASTER_KEY, session);
  sessionLog('MASTER SESSION ACTIVE');
  return session;
}

const ROOM_MAP = {
  entry: 'room-entry',
  gold: 'room-gold',
  elite: 'room-elite',
  master: 'room-master',
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

function unlockUI(rawTier, options){
  const opts = options || {};
  const tier = String(rawTier || 'entry').toLowerCase();
  document.body.classList.remove('locked');

  ['entry','gold','elite'].forEach(t=>hide(byId('room-'+t)));

  if(tier === 'master'){
  show(byId('room-master'));
}else{
    const roomId = ROOM_MAP[tier] || 'room-entry';
    show(byId(roomId));
  }

  if(statusPill) statusPill.textContent = tier.toUpperCase();
  if(vaultState) vaultState.textContent = tier === 'master' ? 'Master Vault Pass' : tier.charAt(0).toUpperCase()+tier.slice(1)+' Room';

  hide(lockedActions);
  hide(lockedRoom);
  show(sessionDivider);
  show(sessionLane);
  show(connectDivider);
  show(connect);

  if(tier === 'master') addMasterRoomLinks();
  if(!opts.skipCinematic) playAccessSequence();
}

function addMasterRoomLinks(){
  const targets = [sessionLane].filter(Boolean);
  targets.forEach((target)=>{
    if(target.querySelector('[data-master-room-link]')) return;
    const link = document.createElement('a');
    link.href = '/nfc/rooms/master/';
    link.textContent = 'Master';
    link.setAttribute('data-master-room-link','1');
    if(target === sessionLane) link.textContent = 'Master Room';
    target.appendChild(link);
  });
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


async function startTimerIfNeeded(record){
  if(!record || record.expires_at) return record;

  const map = {
    "1h": 1 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  };

  const key = String(record.duration || "1h").trim();

  // "none" means no expiration by choice.
  if(key === "none") return record;

  const durationMs = map[key] || map["1h"];
  const expires = new Date(Date.now() + durationMs).toISOString();

  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(record.id)}`,{
      method:'PATCH',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'application/json',
        'Prefer':'return=representation'
      },
      body:JSON.stringify({ expires_at: expires })
    });

    if(res.ok){
      const rows = await res.json().catch(()=>[]);
      if(Array.isArray(rows) && rows[0]){
        return rows[0];
      }
      record.expires_at = expires;
    }
  }catch(e){
    console.warn('Timer start failed', e);
  }

  return record;
}

function saveVaultPass(record, tier){
  try{
    const expires = record && record.expires_at
      ? record.expires_at
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const normalizedTier = String(tier || record.code_type || 'ENTRY').toLowerCase();
    const existing = readJSON(PASS_KEY);
    if(existing && passIsValid(existing) && String(existing.code || '').toUpperCase() === String(record.code || code || '').toUpperCase()){
      sessionLog('SESSION FOUND');
      if(normalizedTier === 'master') saveMasterSession(record);
      return existing;
    }

    const pass = {
      active:true,
      valid:true,
      unlocked:true,
      tier: normalizedTier,
      code: record.code || code,
      route: record.route || '',
      expires_at: expires
    };
    writeJSON(PASS_KEY, pass);
    sessionLog('SESSION FOUND');
    if(normalizedTier === 'master') saveMasterSession(record);
    return pass;
  }catch(e){
    return null;
  }
}

function getSavedPassCode(){
  try{
    const raw = localStorage.getItem("play3d_vault_pass_v1");
    const pass = raw ? JSON.parse(raw) : null;
    return pass && pass.code ? String(pass.code).toUpperCase().trim() : "";
  }catch(e){
    return "";
  }
}

function getActiveSavedPass(){
  try{
    const pass = readJSON(PASS_KEY);
    if(!pass) return null;
    if(!passIsValid(pass)){
      removeKey(PASS_KEY);
      sessionLog('SESSION EXPIRED');
      return null;
    }
    sessionLog('SESSION FOUND');
    return pass;
  }catch(e){
    return null;
  }
}

function preserveNfcLinks(codeValue){
  const activePass = getActiveSavedPass();
  if(activePass || getActiveMasterSession()) return;

  const activeCode = String(codeValue || getSavedPassCode() || '').toUpperCase().trim();
  if(!activeCode) return;

  const paths = [
    '/nfc/index.html',
    '/nfc/entry-backdrop.html',
    '/nfc/album-chamber.html',
    '/nfc/vault-interface.html',
    '/nfc/merch-drop-room.html',
    '/nfc/exclusive-merch-vault.html',
    '/nfc/secret-page.html',
    '/nfc/scan.html',
    '/nfc/game-vault/index.html',
    '/nfc/game-vault/rewards/index.html',
    '/nfc/rooms/master/index.html'
  ];

  document.querySelectorAll('a[href]').forEach((link)=>{
    const href = link.getAttribute('href') || '';
    if(!href || href.charAt(0)==='#' || /^(https?:|mailto:|tel:)/i.test(href)) return;

    try{
      const url = new URL(href, window.location.href);
      if(url.origin !== window.location.origin) return;
      if(!paths.includes(url.pathname)) return;
      url.searchParams.set('code', activeCode);
      link.setAttribute('href', url.pathname + url.search + url.hash);
    }catch(e){}
  });
}

async function init(){
  if(!code){
    const masterSession = getActiveMasterSession();
    if(masterSession){
      unlockUI('master', { skipCinematic:true });
      return;
    }

    const activePass = getActiveSavedPass();
    if(activePass){
      const tier = String(activePass.tier || 'ENTRY').toLowerCase();
      unlockUI(tier, { skipCinematic:true });
      return;
    }
    sessionLog('ACCESS DENIED');
    showLocked('No code provided');
    return;
  }

  try{
    const activePass = getActiveSavedPass();
    if(activePass && String(activePass.code || '').toUpperCase() === code){
      const tier = String(activePass.tier || 'ENTRY').toLowerCase();
      unlockUI(tier, { skipCinematic:true });
      return;
    }

    const record = await getCode(code);

    if(!record){
      await logEvent(code, '', 'invalid');
      sessionLog('ACCESS DENIED');
      showLocked('Invalid code');
      return;
    }

    const timedRecord = await startTimerIfNeeded(record);
    Object.assign(record, timedRecord);

    if(record.expires_at){
      const expiry = new Date(record.expires_at).getTime();
      if(Number.isFinite(expiry) && Date.now() > expiry){
        await logEvent(code, record.code_type || '', 'expired');
        sessionLog('SESSION EXPIRED');
        showLocked('Code expired');
        return;
      }
    }

    const tier = String(record.code_type || 'ENTRY').toLowerCase();
    saveVaultPass(record, tier);
    if(tier !== 'master'){
  const route = String(record.route || '').trim();

  if(route && route !== window.location.pathname){
    window.location.href = route;
    return;
  }
}
    patchCodeHit(code);
    fireBrevoSafe(code, tier);
    logEvent(code, tier, 'success');
    unlockUI(tier);
    preserveNfcLinks(code);

    setTimeout(()=>{
      injectVaultConversionScreen(code, tier);
    }, 1800);
  }catch(err){
    console.error(err);
    sessionLog('ACCESS DENIED');
    showLocked('Connection error');
  }
}
  function injectVaultConversionScreen(codeValue, tier){
  if(document.getElementById("vaultConversionScreen")) return;

  const box=document.createElement("section");
  box.id="vaultConversionScreen";
  box.style.cssText=`
    width:min(920px,92vw);
    margin:28px auto;
    padding:24px;
    border:1px solid rgba(202,162,74,.36);
    border-radius:26px;
    background:linear-gradient(180deg,rgba(12,10,7,.92),rgba(0,0,0,.78));
    box-shadow:0 28px 80px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.05);
    color:#f4f1ea;
    font-family:Oswald,Arial,sans-serif;
    text-align:center;
    position:relative;
    z-index:99999;
    display:block;
    visibility:visible;
    opacity:1;
  `;

  box.innerHTML=`
    <div style="font-family:'Black Ops One',system-ui,sans-serif;color:#f2d27b;font-size:26px;letter-spacing:1px;text-transform:uppercase;">
      Stay Connected
    </div>

    <p style="color:rgba(244,241,234,.72);font-size:15px;letter-spacing:1px;text-transform:uppercase;margin:10px 0 18px;">
      Enter your email for bonus drops, code updates, and future vault access.
    </p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:18px 0;">
      <div style="border:1px solid rgba(202,162,74,.25);border-radius:18px;padding:14px;background:rgba(0,0,0,.42);">
        <b style="color:#f2d27b;">Bonus Codes</b><br>
        <span style="color:rgba(244,241,234,.65);font-size:13px;">Get future access drops.</span>
      </div>
      <div style="border:1px solid rgba(202,162,74,.25);border-radius:18px;padding:14px;background:rgba(0,0,0,.42);">
        <b style="color:#f2d27b;">Early Merch</b><br>
        <span style="color:rgba(244,241,234,.65);font-size:13px;">First look at vault releases.</span>
      </div>
      <div style="border:1px solid rgba(202,162,74,.25);border-radius:18px;padding:14px;background:rgba(0,0,0,.42);">
        <b style="color:#f2d27b;">Tier Upgrades</b><br>
        <span style="color:rgba(244,241,234,.65);font-size:13px;">Move from ${String(tier||"ENTRY").toUpperCase()} to higher rooms.</span>
      </div>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:18px 0;">
      <a href="./scan.html" style="
        text-decoration:none;
        border-radius:999px;
        background:linear-gradient(180deg,#f2d27b,#caa24a 56%,#8b641e);
        color:#100c05;
        padding:12px 20px;
        font-weight:900;
        letter-spacing:1px;
        text-transform:uppercase;
        font-family:Oswald,Arial,sans-serif;
      ">Enter Gold Code</a>

      <a href="./scan.html" style="
        text-decoration:none;
        border-radius:999px;
        background:rgba(0,0,0,.65);
        color:#f2d27b;
        border:1px solid rgba(202,162,74,.45);
        padding:12px 20px;
        font-weight:900;
        letter-spacing:1px;
        text-transform:uppercase;
        font-family:Oswald,Arial,sans-serif;
      ">Enter Elite Code</a>
    </div>

    <input id="vaultEmailInput" type="email" placeholder="Enter email for bonus access" style="
      width:100%;
      min-height:48px;
      border-radius:14px;
      border:1px solid rgba(202,162,74,.34);
      background:rgba(0,0,0,.65);
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
      padding:12px 22px;
      font-weight:900;
      letter-spacing:1px;
      text-transform:uppercase;
      cursor:pointer;
      box-shadow:0 14px 34px rgba(202,162,74,.22);
      font-family:Oswald,Arial,sans-serif;
    ">Connect My Vault Access</button>

    <div id="vaultEmailStatus" style="margin-top:12px;color:rgba(244,241,234,.68);font-size:13px;"></div>
  `;

  const target=document.getElementById("connect")||document.querySelector("main")||document.body;
  target.parentNode.insertBefore(box,target);

  document.getElementById("vaultEmailBtn").onclick=async()=>{
    const email=document.getElementById("vaultEmailInput").value.trim().toLowerCase();
    const status=document.getElementById("vaultEmailStatus");

    if(!email){
      status.textContent="Enter email first.";
      return;
    }

    status.textContent="Saving...";

    try{
      const res=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(codeValue)}`,{
        method:"PATCH",
        headers:{
          "Content-Type":"application/json",
          "apikey":SUPABASE_ANON,
          "Authorization":"Bearer "+SUPABASE_ANON,
          "Prefer":"return=minimal"
        },
        body:JSON.stringify({
          recipient_email:email,
          sent:true,
          sent_at:new Date().toISOString()
        })
      });

      if(!res.ok) throw new Error(await res.text());

      box.innerHTML=`
        <div style="font-family:'Black Ops One',system-ui,sans-serif;color:#f2d27b;font-size:26px;text-transform:uppercase;">
          Vault Connected âœ”
        </div>
        <p style="color:rgba(244,241,234,.72);">Bonus access connected to ${email}.</p>
      `;
    }catch(e){
      status.textContent="Save failed. Try again.";
    }
  };
}
   document.addEventListener('click', function(e){
  const btn = e.target.closest('[data-master-room]');
  if(!btn) return;

  e.preventDefault();

  const room = btn.getAttribute('data-master-room');
  ['entry','gold','elite','master'].forEach(t=>{
    const el = document.getElementById('room-' + t);
    if(el) el.classList.add('hidden');
  });

  const target = document.getElementById('room-' + room);
  if(target){
    target.classList.remove('hidden');
    target.scrollIntoView({behavior:'smooth', block:'start'});
  }
});
init();
})();

function hideBrokenVaultImages(){
  document.querySelectorAll('img[src*="/assets/"], img[src*="./assets/"]').forEach((img)=>{
    if(img.complete && img.naturalWidth === 0){
      img.hidden = true;
    }
  });
}

window.addEventListener('load', hideBrokenVaultImages);


