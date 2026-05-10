(function(){
  'use strict';

  var POINTS_KEY = 'play3d_game_points_v1';
  var HISTORY_KEY = 'play3d_game_points_history_v1';
  var THRESHOLD = 10000;

  function readJSON(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  function writeJSON(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }

  function getPoints(){
    var value = Number(localStorage.getItem(POINTS_KEY) || 0);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  function setPoints(value){
    var next = Math.max(0, Math.floor(Number(value) || 0));
    try{ localStorage.setItem(POINTS_KEY, String(next)); }catch(e){}
    window.dispatchEvent(new CustomEvent('play3d:pointschange', {detail:getStatus()}));
    return next;
  }

  function getPassSession(){
    try{
      if(window.Play3DPassSession && typeof window.Play3DPassSession.current === 'function'){
        return window.Play3DPassSession.current();
      }
    }catch(e){}
    try{
      var raw = localStorage.getItem('play3d_vault_pass_v1');
      if(!raw) return null;
      var pass = JSON.parse(raw);
      if(!pass || !pass.expires_at) return null;
      return new Date(pass.expires_at).getTime() > Date.now() ? pass : null;
    }catch(e){
      return null;
    }
  }

  function isMember(){
    if(localStorage.getItem('play3d_member_v1') === '1') return true;
    if(localStorage.getItem('play3d_member_access_v1') === '1') return true;
    if(getPassSession()) return true;
    try{
      if(window.Play3DAccess && typeof window.Play3DAccess.current === 'function'){
        return !!window.Play3DAccess.current();
      }
    }catch(e){}
    return false;
  }

  function award(game, points, reason){
    points = Math.max(0, Math.floor(Number(points) || 0));
    if(!points) return getStatus();
    var total = setPoints(getPoints() + points);
    var history = readJSON(HISTORY_KEY, []);
    history.push({
      at:new Date().toISOString(),
      game:game || 'game',
      points:points,
      reason:reason || 'valid_win',
      prizeEligible:isMember()
    });
    writeJSON(HISTORY_KEY, history.slice(-200));
    return getStatus(total);
  }

  function getStatus(total){
    var points = typeof total === 'number' ? total : getPoints();
    return {
      points:points,
      threshold:THRESHOLD,
      remaining:Math.max(0, THRESHOLD - points),
      member:isMember(),
      eligible:isMember() && points >= THRESHOLD
    };
  }

  function claimHref(){
    return '../../claim/index.html?source=game-points&threshold=' + THRESHOLD;
  }

  function renderPanel(){
    var main = document.querySelector('main');
    if(!main || document.querySelector('.play3d-points-panel')) return;
    var panel = document.createElement('section');
    panel.className = 'play3d-points-panel';
    panel.innerHTML =
      '<div><span>Prize Points</span><b data-p3d-points>0 / 10000</b><small data-p3d-prize-status>Free play only.</small></div>' +
      '<button type="button" data-p3d-claim>Member Prize Claim</button>';
    var modeBar = document.querySelector('.play3d-mode-bar');
    if(modeBar && modeBar.nextSibling) main.insertBefore(panel, modeBar.nextSibling);
    else main.insertBefore(panel, main.firstChild);

    panel.querySelector('[data-p3d-claim]').addEventListener('click', function(){
      var status = getStatus();
      if(status.eligible) location.href = claimHref();
      else panel.querySelector('[data-p3d-prize-status]').textContent = status.member ? 'Keep playing to reach 10,000 points.' : 'Member access required for prize claims.';
    });
    updatePanel();
  }

  function updatePanel(){
    var status = getStatus();
    var pointsNode = document.querySelector('[data-p3d-points]');
    var statusNode = document.querySelector('[data-p3d-prize-status]');
    var claimBtn = document.querySelector('[data-p3d-claim]');
    if(pointsNode) pointsNode.textContent = status.points.toLocaleString() + ' / ' + THRESHOLD.toLocaleString();
    if(statusNode){
      statusNode.textContent = status.eligible
        ? 'Member prize claim unlocked.'
        : status.member
          ? status.remaining.toLocaleString() + ' points to member prize play.'
          : 'Free play: points track locally, prizes require member access.';
    }
    if(claimBtn){
      claimBtn.disabled = !status.eligible;
      claimBtn.textContent = status.eligible ? 'Claim Prize' : (status.member ? '10,000 Points Required' : 'Member Prize Play');
    }
  }

  window.addEventListener('play3d:pointschange', updatePanel);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderPanel);
  else renderPanel();

  window.Play3DPoints = {
    threshold:THRESHOLD,
    getPoints:getPoints,
    setPoints:setPoints,
    award:award,
    isMember:isMember,
    getStatus:getStatus,
    claimHref:claimHref,
    renderPanel:renderPanel,
    updatePanel:updatePanel
  };
})();
