/* PLAY 3D PHASE 1 FOUNDATION JS */
(function(){
  'use strict';
  const MASTER_KEY = 'CAPO_MASTER_SESSION';
  const params = new URLSearchParams(window.location.search);

  function now(){ return Date.now(); }
  function readJSON(key){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch(e){ return null; }
  }
  function writeJSON(key,value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }
  function hasFreshMasterSession(){
    const s = readJSON(MASTER_KEY);
    if(!s || s.active !== true) return false;
    if(s.expires_at && now() > Number(s.expires_at)){
      try{ localStorage.removeItem(MASTER_KEY); }catch(e){}
      return false;
    }
    return true;
  }
  function setMasterSession(){
    writeJSON(MASTER_KEY,{
      active:true,
      code:'CAPO-MASTER-999',
      started_at:now(),
      expires_at:now() + (1000 * 60 * 60 * 12)
    });
  }
  function isFromController(){
    return params.get('from') === 'controller' || params.get('from') === 'master';
  }
  function siteBase(){
    const first = window.location.pathname.split('/').filter(Boolean)[0] || '';
    if(first && first !== 'nfc' && first !== 'public' && !first.includes('.')) return '/' + first + '/';
    return '/';
  }
  function sitePath(path){
    return siteBase() + String(path || '').replace(/^\/+/, '');
  }
  function buildAccessUrl(target){
    const u = new URL(sitePath('nfc/index.html'), window.location.origin);
    u.searchParams.set('code','CAPO-MASTER-999');
    if(target) u.searchParams.set('target', target);
    return u.toString();
  }
  function installControllerBack(){
    if(!isFromController()) return;
    document.body.classList.add('p3d-from-controller');
    const backTarget = params.get('back');
    if(document.getElementById('p3dControllerBack')) return;
    const a = document.createElement('a');
    a.id = 'p3dControllerBack';
    a.className = 'p3d-controller-back';
    a.textContent = '← Back To Controller';
    a.href = backTarget || '#';
    a.addEventListener('click', function(e){
      e.preventDefault();
      if(backTarget){ window.location.href = backTarget; return; }
      if(window.opener && !window.opener.closed){ window.close(); return; }
      history.back();
    });
    document.body.appendChild(a);
  }
  function addConsumerNav(){
    if(document.querySelector('.p3d-top-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'p3d-top-nav';
    nav.innerHTML = [
      ['Main Site',sitePath('index.html')],
      ['Vault',sitePath('nfc/index.html')],
      ['Game Vault',sitePath('nfc/game-vault/index.html')],
      ['Rewards',sitePath('nfc/game-vault/rewards/index.html')],
      ['Museum',sitePath('nfc/museum/index.html')],
      ['YouTube','https://youtube.com/@iiidtv'],
      ['Spotify','https://open.spotify.com/artist/4R7uJYf4ts6pthecl9IVBF']
    ].map(function(x){
      const ext = x[1].startsWith('http') ? ' target="_blank" rel="noopener"' : '';
      return '<a href="'+x[1]+'"'+ext+'>'+x[0]+'</a>';
    }).join('');
    const main = document.querySelector('main') || document.body;
    main.insertBefore(nav, main.firstChild);
  }
  function boot(){
    if(params.get('master') === '1' || params.get('from') === 'master') setMasterSession();
    installControllerBack();
    if(document.body.dataset.p3dNav === 'auto') addConsumerNav();
  }
  window.Play3DPlatform = {setMasterSession,hasFreshMasterSession,buildAccessUrl,addConsumerNav};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
