/* PLAY 3D PHASE 1 â€” STEP 2 ACCESS BRIDGE
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

  // 2026-11-20: the master code is checked by the server (master_unlock), never on this page. A master
  // session only counts when it holds the server's signed token, and every page confirms that token with
  // the server (master_verify) in the background; a refused token is removed and the page sent back.
  const MASTER_BACKEND = 'https://fupoedrovfloudefyzna.supabase.co/functions/v1/dynamic-endpoint';
  const MASTER_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  let masterVerifyStarted = false;

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
    removeKey(MASTER_KEY);
    window.location.replace(buildUnlockUrl());
  }

  function hasMasterSession(){
    const session = readJSON(MASTER_KEY);

    if(!session || session.active !== true || typeof session.token !== 'string' || session.token.indexOf('.') < 1){
      if(session) removeKey(MASTER_KEY);
      return false;
    }

    if(!session.expires_at || now() > Number(session.expires_at)){
      removeKey(MASTER_KEY);
      console.log('[PLAY3D ACCESS]', 'SESSION EXPIRED');
      return false;
    }

    verifyMasterLater(session);
    return true;
  }

  function currentPassSession(){
    for(const key of PASS_KEYS){
      const session = readJSON(key);

      if(!session) continue;

      const valid =
        session.active === true ||
        session.unlocked === true ||
        session.valid === true ||
        key === 'play3d_vault_pass_v1';

      if(!valid) continue;

      if(session.expires_at && now() > new Date(session.expires_at).getTime()){
        removeKey(key);
        console.log('[PLAY3D ACCESS]', 'SESSION EXPIRED');
        continue;
      }

      console.log('[PLAY3D ACCESS]', 'SESSION FOUND');
      return session;
    }

    return null;
  }

  function hasPassSession(){
    return !!currentPassSession();
  }

  // A link flag like ?master=1 no longer opens anything by itself.
  function hasMasterFlag(){
    return false;
  }

  function isAllowed(){
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
    const u = new URL(sitePath('nfc/index.html'), window.location.origin);
    u.searchParams.set('target', current);
    return u.toString();
  }

  function buildMasterUrl(){
    const current = window.location.pathname + window.location.search;
    const u = new URL(sitePath('nfc/index.html'), window.location.origin);
    u.searchParams.set('target', current);
    return u.toString();
  }

  function requireAccess(options){
    const opts = options || {};

    if(isAllowed()){
      document.documentElement.classList.add('p3d-access-ok');
      return true;
    }

    console.log('[PLAY3D ACCESS]', 'ACCESS DENIED');
    document.documentElement.classList.add('p3d-access-denied');

    if(opts.redirect === true){
      window.location.replace(buildUnlockUrl());
    }

    return false;
  }

  function requireMaster(options){
    const opts = options || {};

    if(hasMasterSession()){
      document.documentElement.classList.add('p3d-master-ok');
      return true;
    }

    console.log('[PLAY3D ACCESS]', 'ACCESS DENIED');
    document.documentElement.classList.add('p3d-master-denied');

    if(opts.redirect === true){
      window.location.replace(buildMasterUrl());
    }

    return false;
  }
function tierRank(tier){
  const clean = String(tier || 'entry').toLowerCase();

  if(clean === 'master') return 99;
  if(clean === 'elite' || clean === 'drop' || clean === 'merch') return 3;
  if(clean === 'gold' || clean === 'album') return 2;

  return 1;
}

function sessionTier(session){
  return String(
    (session && (session.tier || session.code_type || session.level)) || 'entry'
  ).toLowerCase();
}

function requireTier(tier, options){
  const opts = options || {};
  const needed = String(tier || 'entry').toLowerCase();

  if(hasMasterSession()){
    document.documentElement.classList.add('p3d-access-ok','p3d-master-ok');
    return true;
  }

  const pass = currentPassSession();

  if(pass && tierRank(sessionTier(pass)) >= tierRank(needed)){
    document.documentElement.classList.add('p3d-access-ok','p3d-tier-ok');
    return true;
  }

  console.log('[PLAY3D ACCESS]', 'ACCESS DENIED');
  document.documentElement.classList.add('p3d-access-denied','p3d-tier-denied');

  if(opts.redirect === true){
    window.location.replace(buildUnlockUrl());
  }

  return false;
}
  window.Play3DAccess = {
     requireTier,
    setMasterSession,
    hasMasterSession,
    hasPassSession,
    currentPassSession,
    hasMasterFlag,
    isAllowed,
    requireAccess,
    requireMaster,
    buildUnlockUrl,
    buildMasterUrl
  };
})();

