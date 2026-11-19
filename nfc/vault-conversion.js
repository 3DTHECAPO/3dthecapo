(function(){
'use strict';

const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
const TABLE = 'vault_codes';
const PASS_KEY = 'play3d_vault_pass_v1';
// 2026-11-11: the "Connect My Vault Access" e-mail is saved by the server (vault_member_capture), which needs a
// redeemed vault code, sends no e-mail, and never changes an existing member's status.
const BACKEND_URL = `${SUPABASE_URL}/functions/v1/dynamic-endpoint`;
const NFC_ROUTES = new Set([
  'index.html',
  'entry-backdrop.html',
  'album-chamber.html',
  'vault-interface.html',
  'merch-drop-room.html',
  'exclusive-merch-vault.html',
  'secret-page.html'
]);

function readStoredPass(){
  try{
    const raw = localStorage.getItem(PASS_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}

function getVaultCode(){
  const params = new URLSearchParams(window.location.search);
  const urlCode = (params.get('code') || '').toUpperCase().trim();
  if(urlCode) return urlCode;
  const pass = readStoredPass();
  return pass && pass.code ? String(pass.code).toUpperCase().trim() : '';
}

function getVaultTier(fallback){
  const pass = readStoredPass();
  return String(fallback || (pass && pass.tier) || 'ENTRY').toLowerCase();
}

// 2026-11-19: the scan page moves on to the fan's room as soon as the vault doors open, so the box also
// shows at the top of the rooms until the fan connects an e-mail for that code (or taps "Maybe later").
const CONNECTED_KEY = 'play3d_vault_connected_v1';
const DISMISSED_KEY = 'play3d_vault_connect_later_v1';

function isRoomPage(){
  return /^\/nfc\/rooms\/(entry|gold-album|elite-vault)\/?(index\.html)?$/.test(window.location.pathname);
}

function readConnected(){
  try{
    const list = JSON.parse(localStorage.getItem(CONNECTED_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  }catch(e){
    return [];
  }
}

function isVaultConnected(codeValue){
  const pass = readStoredPass();
  if(pass && String(pass.code || '').toUpperCase().trim() === codeValue && (pass.recipient_email || pass.email)) return true;
  return readConnected().includes(codeValue);
}

function markVaultConnected(codeValue){
  try{
    const list = readConnected().filter(item=>item !== codeValue);
    list.push(codeValue);
    localStorage.setItem(CONNECTED_KEY, JSON.stringify(list.slice(-20)));
  }catch(e){}
}

function dismissedForNow(codeValue){
  try{ return sessionStorage.getItem(DISMISSED_KEY) === codeValue; }catch(e){ return false; }
}

function roomPassIsActive(){
  const pass = readStoredPass();
  if(!pass || pass.active !== true || !pass.code) return false;
  if(pass.expires_at){
    const expiry = new Date(pass.expires_at).getTime();
    if(Number.isFinite(expiry) && Date.now() > expiry) return false;
  }
  return true;
}

function isNfcRoute(pathname){
  const file = pathname.split('/').pop() || 'index.html';
  return NFC_ROUTES.has(file);
}

function patchNfcLinks(codeValue){
  if(!codeValue) return;
  document.querySelectorAll('a[href]').forEach(link=>{
    const href = link.getAttribute('href') || '';
    if(!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let url;
    try{
      url = new URL(href, window.location.href);
    }catch(e){
      return;
    }

    if(url.origin !== window.location.origin) return;
    if(!url.pathname.includes('/nfc/')) return;
    if(!isNfcRoute(url.pathname)) return;

    url.searchParams.set('code', codeValue);
    link.setAttribute('href', url.pathname + url.search + url.hash);
  });
}

async function writeSidecar(table, payload, label){
  const baseHeaders = {
    'apikey':SUPABASE_ANON,
    'Authorization':'Bearer '+SUPABASE_ANON,
    'Content-Type':'application/json'
  };
  const attempts = [
    {
      name:'upsert',
      url:`${SUPABASE_URL}/rest/v1/${table}?on_conflict=email`,
      headers:Object.assign({}, baseHeaders, {'Prefer':'resolution=merge-duplicates,return=minimal'})
    },
    {
      name:'insert',
      url:`${SUPABASE_URL}/rest/v1/${table}`,
      headers:Object.assign({}, baseHeaders, {'Prefer':'return=minimal'})
    }
  ];

  for(const attempt of attempts){
    try{
      const res = await fetch(attempt.url,{
        method:'POST',
        headers:attempt.headers,
        body:JSON.stringify(payload)
      });

      if(res.ok){
        return true;
      }

      const text = await res.text().catch(()=>'');
      console.error('[PLAY3D SIDECAR] '+label+' failed', {
        attempt:attempt.name,
        status:res.status,
        error:text || res.statusText || 'Supabase write failed'
      });
    }catch(e){
      console.error('[PLAY3D SIDECAR] '+label+' failed', {
        attempt:attempt.name,
        error:e
      });
    }
  }

  return false;
}

async function logVaultSidecars(email, codeValue, tier){
  const cleanEmail = String(email || '').trim().toLowerCase();
  if(!cleanEmail) return {email:false, member:false};

  const cleanTier = String(tier || 'entry').toLowerCase();
  const now = new Date().toISOString();
  const emailPayload = {
    email:cleanEmail,
    source:'nfc_vault_capture',
    code:codeValue || '',
    tier:cleanTier,
    page:window.location.pathname,
    user_agent:navigator.userAgent,
    consent:true,
    tags:['nfc','vault',cleanTier],
    last_seen_at:now
  };
  const memberPayload = {
    email:cleanEmail,
    member_status:'pending',
    tier:cleanTier,
    source:'nfc_vault_capture',
    last_seen_at:now
  };

  void emailPayload; void memberPayload;
  try{
    const res = await fetch(BACKEND_URL, {
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':'Bearer '+SUPABASE_ANON,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({source:'vault_member_capture', email:cleanEmail, code:String(codeValue || '').toUpperCase().trim(), tier:cleanTier, page:window.location.pathname})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) console.error('[PLAY3D SIDECAR] vault_member_capture failed', {status:res.status, error:data.status || data.error || ''});
    return {email:data.email === true, member:data.member === true};
  }catch(e){
    console.error('[PLAY3D SIDECAR] vault_member_capture failed', {error:e});
    return {email:false, member:false};
  }
}

function renderVaultConversionScreen(codeValue, tier){
  const vaultCode = String(codeValue || getVaultCode()).toUpperCase().trim();
  if(!vaultCode) return;
  if(document.getElementById('vaultConversionScreen')) return;
  if(isVaultConnected(vaultCode) || dismissedForNow(vaultCode)) return;

  const displayTier = getVaultTier(tier);
  if(!isRoomPage()) patchNfcLinks(vaultCode);

  const box=document.createElement('section');
  box.id='vaultConversionScreen';
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
  `;

  box.innerHTML=`
    <div style="font-family:'Black Ops One',system-ui,sans-serif;color:#f2d27b;font-size:26px;letter-spacing:1px;text-transform:uppercase;">
      You're Inside The Vault
    </div>

    <p style="color:rgba(244,241,234,.72);font-size:15px;letter-spacing:1px;text-transform:uppercase;margin:10px 0 18px;">
      Keep your access connected. Get future drops, bonus codes, and vault-only updates.
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
        <span style="color:rgba(244,241,234,.65);font-size:13px;">Move from ${String(displayTier||'ENTRY').toUpperCase()} to higher rooms.</span>
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

    <button id="vaultEmailLater" type="button" style="
      margin-top:10px;
      border:0;
      background:none;
      color:rgba(244,241,234,.6);
      font-family:Oswald,Arial,sans-serif;
      font-size:13px;
      letter-spacing:1px;
      text-transform:uppercase;
      text-decoration:underline;
      cursor:pointer;
    ">Maybe later</button>
  `;

  const target=document.getElementById('connect')||document.querySelector('main')||document.body;
  target.parentNode.insertBefore(box,target);

  document.getElementById('vaultEmailLater').onclick=()=>{
    try{ sessionStorage.setItem(DISMISSED_KEY, vaultCode); }catch(e){}
    box.remove();
  };

  document.getElementById('vaultEmailBtn').onclick=async()=>{
    const email=document.getElementById('vaultEmailInput').value.trim().toLowerCase();
    const status=document.getElementById('vaultEmailStatus');

    if(!email){
      status.textContent='Enter email first.';
      return;
    }

    status.textContent='Saving...';

    try{
      let sidecar = {email:false, member:false};
      try{
        sidecar = await logVaultSidecars(email, vaultCode, displayTier);
      }catch(sidecarError){
        console.error('[PLAY3D SIDECAR] optional logging failed', sidecarError);
      }
      const sidecarOk = sidecar.email && sidecar.member;
      if(sidecar.email || sidecar.member) markVaultConnected(vaultCode);
      if(!sidecarOk){
        console.error('[PLAY3D SIDECAR] optional logging incomplete', sidecar);
      }
      const warning = sidecarOk ? '' : '<p style="color:#f2d27b;">Vault access is connected. Optional member logging needs review.</p>';

      box.innerHTML=`
        <div style="font-family:'Black Ops One',system-ui,sans-serif;color:#f2d27b;font-size:26px;text-transform:uppercase;">
          Vault Access Connected ✔
        </div>
        <p style="color:rgba(244,241,234,.72);">Bonus access connected to ${email}.</p>
        ${warning}
      `;
    }catch(e){
      status.textContent='Save failed. Try again.';
    }
  };
}

function autoRenderVaultConversion(){
  const codeValue = getVaultCode();
  if(!codeValue) return;

  // Rooms: show the box for the fan's own active pass only; room links are left as they are.
  if(isRoomPage()){
    if(roomPassIsActive()) renderVaultConversionScreen(codeValue);
    return;
  }
  patchNfcLinks(codeValue);

  const path = window.location.pathname.replace(/\/+$/,'');
  if(path === '/nfc' || path === '/nfc/index.html') return;

  // 2026-11-18: only welcome the fan once the code check has opened the vault (nfc.js removes
  // body.locked on a valid code). An invalid, expired or unchecked code keeps the page locked.
  const unlocked = ()=>!document.body.classList.contains('locked');
  if(unlocked()){ renderVaultConversionScreen(codeValue); return; }
  const watcher = new MutationObserver(()=>{
    if(!unlocked()) return;
    watcher.disconnect();
    renderVaultConversionScreen(codeValue);
  });
  watcher.observe(document.body,{attributes:true,attributeFilter:['class']});
  setTimeout(()=>watcher.disconnect(),60000);
}

window.Play3DVaultConversion = {
  getCode:getVaultCode,
  patchLinks:patchNfcLinks,
  render:renderVaultConversionScreen
};
window.injectVaultConversionScreen = renderVaultConversionScreen;

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', autoRenderVaultConversion);
}else{
  autoRenderVaultConversion();
}
})();
