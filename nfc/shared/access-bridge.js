/* PLAY 3D PHASE 1 — STEP 2 ACCESS BRIDGE
   Safe shared access helper.

   This does not force-lock pages by itself.
   It only gives pages one clean way to check:
   - master session
   - controller/master URL flags
   - normal pass sessions later
*/
(function(){
  'use strict';

  const MASTER_KEY = 'CAPO_MASTER_SESSION';
  const PASS_KEYS = [
    'CAPO_PASS_SESSION',
    'PLAY3D_PASS_SESSION',
    'play3d_pass_session',
    'play3d_vault_pass_v1',
    'vault_pass_session',
    'capo_pass_session'
  ];

  const params = new URLSearchParams(window.location.search);

  function now(){
    return Date.now();
  }

  function readJSON(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      return null;
    }
  }

  function writeJSON(key,value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
    }catch(e){}
  }

  function siteBase(){
    const first = window.location.pathname.split('/').filter(Boolean)[0] || '';
    if(first && first !== 'nfc' && first !== 'public' && !first.includes('.')) return '/' + first + '/';
    return '/';
  }

  function sitePath(path){
    return siteBase() + String(path || '').replace(/^\/+/, '');
  }

  function removeKey(key){
    try{
      localStorage.removeItem(key);
    }catch(e){}
  }

  function setMasterSession(){
    writeJSON(MASTER_KEY,{
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
      removeKey(MASTER_KEY);
      return false;
    }

    return true;
  }

  function hasPassSession(){
    return !!currentPassSession();
  }

  function currentPassSession(){
    for(const key of PASS_KEYS){
      const session = readJSON(key);
      if(!session) continue;
      const valid = session.active === true || session.unlocked === true || session.valid === true || key === 'play3d_vault_pass_v1';
      if(!valid) continue;
      if(session.expires_at && now() > Number(session.expires_at)){
        removeKey(key);
        continue;
      }
      return session;
    }
    return null;
  }

  function tierRank(value){
    const tier = String(value || 'entry').toLowerCase();
    return ({entry:1,gold:2,elite:3,master:4})[tier] || 0;
  }

  function hasTier(minTier){
    if(hasMasterFlag() || hasMasterSession()) return true;
    const pass = currentPassSession();
    return !!pass && tierRank(pass.tier || pass.code_type) >= tierRank(minTier);
  }

  function hasMasterFlag(){
    return (
      params.get('master') === '1' ||
      params.get('from') === 'master' ||
      params.get('from') === 'controller'
    );
  }

  function isAllowed(){
    if(hasMasterFlag()){
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

  function buildUnlockUrl(){
    const current = window.location.pathname + window.location.search;
    const u = new URL(sitePath('nfc/index.html'), window.location.href);
    u.searchParams.set('target', current);
    return u.toString();
  }

  function buildMasterUrl(){
    const current = window.location.pathname + window.location.search;
    const u = new URL(sitePath('nfc/index.html'), window.location.href);
    u.searchParams.set('code','CAPO-MASTER-999');
    u.searchParams.set('target', current);
    return u.toString();
  }

  function requireAccess(options){
    const opts = options || {};

    if(isAllowed()){
      document.documentElement.classList.add('p3d-access-ok');
      return true;
    }

    document.documentElement.classList.add('p3d-access-denied');

    if(opts.redirect === true){
      window.location.replace(buildUnlockUrl());
    }

    return false;
  }

  function requireMaster(options){
    const opts = options || {};

    if(hasMasterFlag()){
      setMasterSession();
      document.documentElement.classList.add('p3d-master-ok');
      return true;
    }

    if(hasMasterSession()){
      document.documentElement.classList.add('p3d-master-ok');
      return true;
    }

    document.documentElement.classList.add('p3d-master-denied');

    if(opts.redirect === true){
      window.location.replace(buildMasterUrl());
    }

    return false;
  }

  function requireTier(minTier, options){
    const opts = options || {};
    if(hasTier(minTier)){
      document.documentElement.classList.add('p3d-access-ok');
      return true;
    }
    document.documentElement.classList.add('p3d-access-denied');
    if(opts.redirect === true) window.location.replace(buildUnlockUrl());
    return false;
  }

  window.Play3DAccess = {
    setMasterSession,
    hasMasterSession,
    hasPassSession,
    currentPassSession,
    hasTier,
    hasMasterFlag,
    isAllowed,
    requireAccess,
    requireTier,
    requireMaster,
    buildUnlockUrl,
    buildMasterUrl
  };

  if(hasMasterFlag()){
    setMasterSession();
  }
})();
