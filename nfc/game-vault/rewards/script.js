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

  function render(){
    const hasAccess = !!(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.isMember === 'function' && window.Play3DMemberSystem.isMember());
    els.locked.hidden = hasAccess;
    els.dashboard.hidden = !hasAccess;
    els.refresh.disabled = !hasAccess;
    if(!hasAccess) return;

    const profile = readJSON('play3d_player_profile_v1', {});
    const points = Math.max(0, Number(localStorage.getItem('play3d_game_points_v1') || profile.totalPoints || 0));
    const credits = Math.max(0, Number(localStorage.getItem('play3d_game_bank_v1') || profile.credits || 0));
    const claims = loadClaims();

    els.points.textContent = points.toLocaleString();
    els.credits.textContent = credits.toLocaleString();
    renderList(els.events, loadRewardEvents(), 'No reward events yet.');
    renderList(els.pending, claims.pending, 'No pending claims.');
    renderList(els.approved, claims.approved, 'No approved claims.');
    renderList(els.fulfilled, claims.fulfilled, 'No fulfilled claims.');
  }

  els.refresh.addEventListener('click', render);
  render();
})();
