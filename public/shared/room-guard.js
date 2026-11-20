/*
  PLAY 3D / CAPO ROOM GUARD - MASTER + PASS FIX
  Full replacement for: public/shared/room-guard.js

  Fixes:
  - Master access is checked by the server (2026-11-20); links and codes in the address do not open rooms
  - Recognizes the actual current pass key: play3d_vault_pass_v1
  - Keeps normal valid 1-hour/pass access working
  - Does NOT write vault_codes, vault_logs, used, used_at, expires_at, duration, sent_at, or email flow
*/
(function(){
  'use strict';

  const MASTER_KEY = 'CAPO_MASTER_SESSION';
  // 2026-11-20: no master code lives in this file and no link opens anything by itself. A master session
  // only counts when it holds the server's signed token (from master_unlock on the scan page), and each page
  // confirms that token with the server (master_verify); a refused token is removed and the page sent back.
  const MASTER_BACKEND = 'https://fupoedrovfloudefyzna.supabase.co/functions/v1/dynamic-endpoint';
  const MASTER_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  let masterVerifyStarted = false;

  const PASS_KEYS = [
    'play3d_vault_pass_v1',
    'CAPO_PASS_SESSION',
    'PLAY3D_PASS_SESSION',
    'play3d_pass_session',
    'vault_pass_session',
    'capo_pass_session'
  ];

  function now(){ return Date.now(); }

  function readJSON(key){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
  }

  function writeJSON(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }

  function getParams(){ return new URLSearchParams(window.location.search); }

  function getCodeParam(){
    return String(getParams().get('code') || '').trim().toUpperCase();
  }

  function hasMasterQuery(){
    return false;
  }

  function setMasterSession(){
    // Kept for older callers: a master session can only be created from the server's token.
    return false;
  }

  function verifyMasterLater(session){
    if(masterVerifyStarted) return;
    masterVerifyStarted = true;
    fetch(MASTER_BACKEND, {
      method:'POST',
      headers:{'apikey':MASTER_ANON,'Authorization':'Bearer ' + MASTER_ANON,'Content-Type':'application/json'},
      body:JSON.stringify({source:'master_verify', token:session.token})
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(data){
        if(!res.ok || !data || data.success !== true) denyMaster();
      });
    }).catch(denyMaster);
  }

  // Anything but a clear yes from the server ends the master session.
  function denyMaster(){
    try{ localStorage.removeItem(MASTER_KEY); }catch(e){}
    window.location.replace(buildLockedRedirect());
  }

  function hasMasterSession(){
    const session = readJSON(MASTER_KEY);
    if(!session || session.active !== true || typeof session.token !== 'string' || session.token.indexOf('.') < 1){
      if(session){ try{ localStorage.removeItem(MASTER_KEY); }catch(e){} }
      return false;
    }
    if(!session.expires_at || now() > Number(session.expires_at)){
      try{ localStorage.removeItem(MASTER_KEY); }catch(e){}
      return false;
    }
    verifyMasterLater(session);
    return true;
  }

  function passIsActive(session){
    if(!session) return false;
    if(session.expires_at){
      const expires = new Date(session.expires_at).getTime();
      if(Number.isFinite(expires) && expires <= now()) return false;
    }
    return !!(
      session.active === true ||
      session.unlocked === true ||
      session.valid === true ||
      session.tier ||
      session.code
    );
  }

  function hasPassSession(){
    for(const key of PASS_KEYS){
      const session = readJSON(key);
      if(!session) continue;
      if(passIsActive(session)) return true;
      if(session && session.expires_at){ try{ localStorage.removeItem(key); }catch(e){} }
    }
    return false;
  }

  function isAllowed(){
    if(hasMasterSession()) return true;
    if(hasPassSession()) return true;
    return false;
  }

  function buildLockedRedirect(){
    const current = window.location.pathname + window.location.search;
    return '/nfc/index.html?target=' + encodeURIComponent(current);
  }

  function requireMemberOrPass(){
    if(isAllowed()) return true;
    window.location.replace(buildLockedRedirect());
    return false;
  }

  function requireMaster(){
    if(hasMasterSession()) return true;
    window.location.replace('/nfc/scan.html');
    return false;
  }

  function clearMasterSession(){
    try{ localStorage.removeItem(MASTER_KEY); }catch(e){}
  }

  window.Play3DRoomGuard = {
    isAllowed,
    hasMasterSession,
    hasPassSession,
    requireMemberOrPass,
    requireMaster,
    clearMasterSession,
    setMasterSession
  };

  // Compatibility for pages that check Play3DAccess instead of Play3DRoomGuard
  window.Play3DAccess = window.Play3DAccess || {};
  window.Play3DAccess.hasMasterSession = window.Play3DAccess.hasMasterSession || hasMasterSession;
  window.Play3DAccess.hasPassSession = window.Play3DAccess.hasPassSession || hasPassSession;
  window.Play3DAccess.isAllowed = window.Play3DAccess.isAllowed || isAllowed;
})();
