(function(){
  'use strict';
  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const year = byId('year');
  if (year) year.textContent = new Date().getFullYear();

  const overlay = byId('vaultOverlay');
  const grantSub = byId('grantSub');
  const statusChip = byId('statusChip');
  const vaultStateText = byId('vaultStateText');
  const flagActive = byId('flagActive');
  const unlockName = byId('unlockName');
  const doorState = byId('doorState');
  const accessLevel = byId('accessLevel');
  const previewBtn = byId('previewOverlayBtn');
  const placeholder = byId('vaultPlaceholder');

  const allPanels = ['panel-album','panel-track','panel-video','panel-deluxe'];
  allPanels.forEach(id => {
    const el = byId(id);
    if (el) el.classList.add('hidden');
  });

  const states = {
    album:  {panel:'panel-album', chip:'ALBUM',  state:'Album lane active',  flag:'ALBUM LIVE',  key:'Album',           door:'Album chamber open',  level:'Tier 1', sub:'ALBUM ACCESS CONFIRMED'},
    merch:  {panel:'panel-album', chip:'MERCH',  state:'Merch lane active',  flag:'MERCH LIVE',  key:'Album / Merch',   door:'Merch chamber open',  level:'Tier 1', sub:'MERCH ACCESS CONFIRMED'},
    track:  {panel:'panel-track', chip:'TRACK',  state:'Track lane active',  flag:'TRACK LIVE',  key:'Exclusive Track', door:'Track chamber open',  level:'Tier 2', sub:'TRACK ACCESS CONFIRMED'},
    video:  {panel:'panel-video', chip:'VIDEO',  state:'Video lane active',  flag:'VIDEO LIVE',  key:'Video Room',      door:'Visual chamber open', level:'Tier 2', sub:'VIDEO ACCESS CONFIRMED'},
    deluxe: {panel:'panel-deluxe',chip:'DELUXE', state:'Full bundle active', flag:'DELUXE LIVE', key:'Deluxe Bundle',   door:'Full vault open',     level:'Tier 3', sub:'DELUXE VAULT CONFIRMED'},
    bundle: {panel:'panel-deluxe',chip:'DELUXE', state:'Full bundle active', flag:'DELUXE LIVE', key:'Deluxe Bundle',   door:'Full vault open',     level:'Tier 3', sub:'DELUXE VAULT CONFIRMED'}
  };

  function setLocked(){
    if (statusChip) statusChip.textContent = 'LOCKED';
    if (vaultStateText) vaultStateText.textContent = 'Waiting for scan';
    if (flagActive) flagActive.textContent = 'LOCKED';
    if (unlockName) unlockName.textContent = 'No key detected';
    if (doorState) doorState.textContent = 'Standby';
    if (accessLevel) accessLevel.textContent = 'Locked';
  }

  function playOverlay(text){
    if (!overlay) return;
    if (grantSub) grantSub.textContent = text || 'LUXURY TRAP VAULT OPEN';
    overlay.classList.add('active');
    overlay.classList.remove('playing');
    void overlay.offsetWidth;
    overlay.classList.add('playing');
    setTimeout(() => overlay.classList.remove('playing'), 2050);
    setTimeout(() => overlay.classList.remove('active'), 3050);
  }

  if (previewBtn){
    previewBtn.addEventListener('click', function(){
      playOverlay('CINEMATIC PREVIEW MODE');
    });
  }

  const cfg = states[unlock];
  if (!cfg){
    setLocked();
    return;
  }

  const panel = byId(cfg.panel);
  if (panel) panel.classList.remove('hidden');
  if (placeholder) placeholder.classList.add('hidden');

  if (statusChip) statusChip.textContent = cfg.chip;
  if (vaultStateText) vaultStateText.textContent = cfg.state;
  if (flagActive) flagActive.textContent = cfg.flag;
  if (unlockName) unlockName.textContent = cfg.key;
  if (doorState) doorState.textContent = cfg.door;
  if (accessLevel) accessLevel.textContent = cfg.level;

  playOverlay(cfg.sub);
})();