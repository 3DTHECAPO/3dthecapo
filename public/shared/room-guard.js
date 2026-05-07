/*
  PLAY 3D / CAPO ROOM GUARD
  Full replacement: public/shared/room-guard.js

  Purpose:
  - Let normal pass/member sessions through.
  - Let Master Controller sessions through.
  - Stop protected pages from sending you back to locked vault after Master unlock.

  Master session is created by nfc/index.html after CAPO-MASTER-999 unlock:
  localStorage.CAPO_MASTER_SESSION = {
    active:true,
    code:"CAPO-MASTER-999",
    started_at:Date.now(),
    expires_at:Date.now() + 12 hours
  }

  Also allows URLs opened as:
  ?master=1
  ?from=master
*/

(function(){
  'use strict';

  const MASTER_KEY = 'CAPO_MASTER_SESSION';
  const PASS_KEYS = [
    'CAPO_PASS_SESSION',
    'PLAY3D_PASS_SESSION',
    'play3d_pass_session',
    'vault_pass_session',
    'capo_pass_session'
  ];

  function now(){
    return Date.now();
  }

  function readJSON(key){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){
      return null;
    }
  }

  function writeJSON(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
    }catch(e){}
  }

  function getParams(){
    return new URLSearchParams(window.location.search);
  }

  function hasMasterQuery(){
    const params = getParams();
    return (
      params.get('master') === '1' ||
      params.get('from') === 'master' ||
      params.get('from') === 'controller'
    );
  }

  function setMasterSession(){
    writeJSON(MASTER_KEY, {
      active:true,
      code:'CAPO-MASTER-999',
      started_at:now(),
      expires_at:now() + (1000 * 60 * 60 * 12)
    });
  }

  function hasMasterSession(){
    const session = readJSON(MASTER_KEY);

    if(!session || session.active !== true){
      return false;
    }

    if(session.expires_at && now() > Number(session.expires_at)){
      try{ localStorage.removeItem(MASTER_KEY); }catch(e){}
      return false;
    }

    return true;
  }

  function hasPassSession(){
    for(const key of PASS_KEYS){
      const session = readJSON(key);

      if(!session) continue;

      if(session.active === true || session.unlocked === true || session.valid === true){
        if(session.expires_at && now() > Number(session.expires_at)){
          try{ localStorage.removeItem(key); }catch(e){}
          continue;
        }

        return true;
      }
    }

    return false;
  }

  function isAllowed(){
    if(hasMasterQuery()){
      setMasterSession();
      return true;
    }

    if(hasMasterSession()){
      return true;
    }

    if(hasPassSession()){
      return true;
    }

    return false;
  }

  function buildLockedRedirect(){
    const current = window.location.pathname + window.location.search;
    const target = '/nfc/index.html?target=' + encodeURIComponent(current);
    return target;
  }

  function requireMemberOrPass(){
    if(isAllowed()){
      return true;
    }

    window.location.replace(buildLockedRedirect());
    return false;
  }

  function requireMaster(){
    if(hasMasterQuery()){
      setMasterSession();
      return true;
    }

    if(hasMasterSession()){
      return true;
    }

    window.location.replace('/nfc/index.html?code=CAPO-MASTER-999');
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

})();
