/*
  PLAY 3D / CAPO ROOM GUARD - MASTER + PASS FIX
  Full replacement for: public/shared/room-guard.js

  Fixes:
  - CAPO-MASTER-999 never gets blocked when opened with ?code=CAPO-MASTER-999
  - ?master=1 and ?from=master still work
  - Recognizes the actual current pass key: play3d_vault_pass_v1
  - Keeps normal valid 1-hour/pass access working
  - Does NOT write vault_codes, vault_logs, used, used_at, expires_at, duration, sent_at, or email flow
*/
(function(){
  'use strict';

  const MASTER_KEY = 'CAPO_MASTER_SESSION';
  const MASTER_CODES = new Set(['CAPO-MASTER-999','MASTER','CAPO-MASTER']);

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
    const params = getParams();
    const code = getCodeParam();
    return (
      params.get('master') === '1' ||
      params.get('from') === 'master' ||
      params.get('from') === 'controller' ||
      MASTER_CODES.has(code)
    );
  }

  function setMasterSession(code){
    writeJSON(MASTER_KEY, {
      active:true,
      code: code || getCodeParam() || 'CAPO-MASTER-999',
      started_at:now(),
      expires_at:now() + (1000 * 60 * 60 * 12)
    });
  }

  function hasMasterSession(){
    const session = readJSON(MASTER_KEY);
    if(!session || session.active !== true) return false;
    if(session.expires_at && now() > Number(session.expires_at)){
      try{ localStorage.removeItem(MASTER_KEY); }catch(e){}
      return false;
    }
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
    if(hasMasterQuery()){
      setMasterSession();
      return true;
    }
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
    if(hasMasterQuery()){
      setMasterSession();
      return true;
    }
    if(hasMasterSession()) return true;
    window.location.replace('/nfc/index.html?code=CAPO-MASTER-999&master=1');
    return false;
  }

  function clearMasterSession(){
    try{ localStorage.removeItem(MASTER_KEY); }catch(e){}
  }

  if(hasMasterQuery()) setMasterSession();

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
