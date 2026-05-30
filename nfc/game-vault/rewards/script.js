(()=>{
  'use strict';

  const els = {
    refresh: document.getElementById('refreshBtn'),
    locked: document.getElementById('lockedState'),
    dashboard: document.getElementById('dashboard'),
    points: document.getElementById('rewardPoints'),
    credits: document.getElementById('rewardCredits'),
    events: document.getElementById('rewardEvents'),
    pending: document.getElementById('pendingClaims'),
    approved: document.getElementById('approvedClaims'),
    fulfilled: document.getElementById('fulfilledClaims')
  };

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  function textRow(message){
    return '<div class="placeholder-row">'+message+'</div>';
  }

  function renderList(node, items, fallback){
    if(!node) return;
    node.innerHTML = items.length ? items.map(textRow).join('') : textRow(fallback);
  }

  function loadRewardEvents(){
    const engine = readJSON('play3d_reward_engine_v1', {history:[]});
    return Array.isArray(engine.history) ? engine.history.slice(-5).reverse().map(item=>{
      const label = item.reward && item.reward.label || 'Reward event';
      const game = item.game ? String(item.game).toUpperCase() : 'LOCAL';
      return game+' - '+label;
    }) : [];
  }

  function loadClaims(){
    const engine = readJSON('play3d_reward_engine_v1', {history:[]});
    const rows = Array.isArray(engine.history) ? engine.history : [];
    return {
      pending: rows.filter(item => item.claim_status === 'pending').map(item => item.reward && item.reward.label || 'Pending reward'),
      approved: rows.filter(item => item.claim_status === 'approved').map(item => item.reward && item.reward.label || 'Approved reward'),
      fulfilled: rows.filter(item => item.claim_status === 'fulfilled' || item.claimed === true).map(item => item.reward && item.reward.label || 'Fulfilled reward')
    };
  }

  function getPaidMemberAccess(){
    return !!(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.isMember === 'function' && window.Play3DMemberSystem.isMember());
  }

  function getCredits(){
    if(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.getCreditBank === 'function'){
      return Play3DMemberSystem.getCreditBank();
    }
    const globalBank = Number(localStorage.getItem('play3d_global_bank_v1') || 0);
    const legacyBank = Number(localStorage.getItem('play3d_game_bank_v1') || 0);
    return Math.max(0, Math.floor(globalBank || 0), Math.floor(legacyBank || 0));
  }

  function getPoints(profile){
    if(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.getPoints === 'function'){
      return Play3DMemberSystem.getPoints();
    }
    return Math.max(0, Number(localStorage.getItem('play3d_game_points_v1') || profile.totalPoints || 0));
  }

  function render(){
    const hasAccess = getPaidMemberAccess();
    if(els.locked) els.locked.hidden = hasAccess;
    if(els.dashboard) els.dashboard.hidden = !hasAccess;
    if(els.refresh) els.refresh.disabled = !hasAccess;
    if(!hasAccess){
      if(els.locked){
        const p = els.locked.querySelector('p');
        if(p) p.textContent = 'Paid registration is required to view and claim rewards. Entry passes are visitor access only.';
      }
      return;
    }

    const profile = readJSON('play3d_player_profile_v1', {});
    const points = getPoints(profile);
    const credits = getCredits();
    const claims = loadClaims();

    if(els.points) els.points.textContent = points.toLocaleString();
    if(els.credits) els.credits.textContent = credits.toLocaleString();
    renderList(els.events, loadRewardEvents(), 'No reward events yet.');
    renderList(els.pending, claims.pending, 'No pending claims.');
    renderList(els.approved, claims.approved, 'No approved claims.');
    renderList(els.fulfilled, claims.fulfilled, 'No fulfilled claims.');
  }

  if(els.refresh) els.refresh.addEventListener('click', render);
  render();
})();
