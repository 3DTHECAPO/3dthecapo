(function(){
  'use strict';

  const byId = (id) => document.getElementById(id);
  const qs = (sel, root=document) => root.querySelector(sel);

  const yearEl = byId('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const unlockMap = {
    album: {
      panel: 'panel-album',
      key: 'Album',
      door: 'Album chamber open',
      level: 'Tier 1',
      chip: 'ALBUM',
      sub: 'ALBUM ACCESS CONFIRMED',
      state: 'Album lane active',
      flag: 'ALBUM LIVE'
    },
    merch: {
      panel: 'panel-album',
      key: 'Album / Merch',
      door: 'Merch chamber open',
      level: 'Tier 1',
      chip: 'MERCH',
      sub: 'MERCH ACCESS CONFIRMED',
      state: 'Merch lane active',
      flag: 'MERCH LIVE'
    },
    track: {
      panel: 'panel-track',
      key: 'Exclusive Track',
      door: 'Track chamber open',
      level: 'Tier 2',
      chip: 'TRACK',
      sub: 'TRACK ACCESS CONFIRMED',
      state: 'Track lane active',
      flag: 'TRACK LIVE'
    },
    video: {
      panel: 'panel-video',
      key: 'Video Room',
      door: 'Video chamber open',
      level: 'Tier 2',
      chip: 'VIDEO',
      sub: 'VIDEO ACCESS CONFIRMED',
      state: 'Video lane active',
      flag: 'VIDEO LIVE'
    },
    deluxe: {
      panel: 'panel-deluxe',
      key: 'Deluxe Bundle',
      door: 'Full vault open',
      level: 'Tier 3',
      chip: 'DELUXE',
      sub: 'DELUXE VAULT CONFIRMED',
      state: 'Full bundle active',
      flag: 'DELUXE LIVE'
    },
    bundle: {
      panel: 'panel-deluxe',
      key: 'Deluxe Bundle',
      door: 'Full vault open',
      level: 'Tier 3',
      chip: 'DELUXE',
      sub: 'DELUXE VAULT CONFIRMED',
      state: 'Full bundle active',
      flag: 'DELUXE LIVE'
    }
  };

  const allPanels = ['panel-track','panel-album','panel-video','panel-deluxe'];
  allPanels.forEach(id => {
    const el = byId(id);
    if (el) el.classList.add('hidden');
  });

  const overlay = byId('vaultOverlay');
  const grantSub = byId('grantSub');
  const statusChip = byId('statusChip');
  const unlockName = byId('unlockName');
  const doorState = byId('doorState');
  const accessLevel = byId('accessLevel');
  const vaultStateText = byId('vaultStateText');
  const flagActive = byId('flagActive');
  const placeholder = byId('vaultPlaceholder');

  function setLockedState(){
    if (statusChip) statusChip.textContent = 'LOCKED';
    if (unlockName) unlockName.textContent = 'No key detected';
    if (doorState) doorState.textContent = 'Standby';
    if (accessLevel) accessLevel.textContent = 'Locked';
    if (vaultStateText) vaultStateText.textContent = 'Waiting for scan';
    if (flagActive) flagActive.textContent = 'LOCKED';
  }

  function runOverlay(subText){
    if (!overlay) return;
    if (grantSub) grantSub.textContent = subText;
    overlay.style.display = 'flex';
    overlay.classList.add('active','opening');
    setTimeout(() => {
      overlay.classList.remove('opening');
    }, 1800);
    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.style.display = 'none';
    }, 2600);
  }

  const cfg = unlockMap[unlock];
  if (!cfg){
    setLockedState();
    return;
  }

  const activePanel = byId(cfg.panel);
  if (activePanel) activePanel.classList.remove('hidden');
  if (placeholder) placeholder.classList.add('hidden');

  if (statusChip) statusChip.textContent = cfg.chip;
  if (unlockName) unlockName.textContent = cfg.key;
  if (doorState) doorState.textContent = cfg.door;
  if (accessLevel) accessLevel.textContent = cfg.level;
  if (vaultStateText) vaultStateText.textContent = cfg.state;
  if (flagActive) flagActive.textContent = cfg.flag;

  runOverlay(cfg.sub);

  window.requestAnimationFrame(() => {
    document.querySelectorAll('.vault-content:not(.hidden)').forEach(el => el.classList.add('reveal'));
  });
})();
