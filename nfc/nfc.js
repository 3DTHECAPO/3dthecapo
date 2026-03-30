(function(){
  'use strict';

  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const overlay = byId('overlay');
  const accessSub = byId('accessSub');
  const previewBtn = byId('previewBtn');
  const statusPill = byId('statusPill');
  const vaultState = byId('vaultState');
  const flagState = byId('flagState');
  const year = byId('year');
  const placeholder = byId('placeholderRoom');

  if (year) year.textContent = new Date().getFullYear();

  const rooms = ['room-entry','room-gold','room-elite'];
  rooms.forEach(id => {
    const el = byId(id);
    if (el) el.classList.add('hidden');
  });

  const states = {
    entry: {
      room: 'room-entry',
      chip: 'ENTRY',
      state: 'Entry room active',
      flag: 'ENTRY LIVE',
      sub: 'ENTRY ACCESS VERIFIED'
    },
    gold: {
      room: 'room-gold',
      chip: 'GOLD',
      state: 'Gold tier active',
      flag: 'GOLD LIVE',
      sub: 'GOLD MEMBERSHIP VERIFIED'
    },
    elite: {
      room: 'room-elite',
      chip: 'ELITE',
      state: 'Elite holder active',
      flag: 'ELITE LIVE',
      sub: 'ELITE HOLDER VERIFIED'
    }
  };

  function playOverlay(text){
    if (!overlay) return;
    if (accessSub) accessSub.textContent = text || 'VAULT INTERFACE';
    overlay.classList.add('active');
    overlay.classList.remove('playing');
    void overlay.offsetWidth;
    overlay.classList.add('playing');
    window.setTimeout(() => overlay.classList.remove('playing'), 2200);
    window.setTimeout(() => overlay.classList.remove('active'), 3400);
  }

  if (previewBtn){
    previewBtn.addEventListener('click', function(){
      playOverlay('CINEMATIC PREVIEW MODE');
    });
  }

  const cfg = states[unlock];
  if (!cfg){
    if (statusPill) statusPill.textContent = 'LOCKED';
    if (vaultState) vaultState.textContent = 'Waiting for scan';
    if (flagState) flagState.textContent = 'LOCKED';
    return;
  }

  const activeRoom = byId(cfg.room);
  if (activeRoom) activeRoom.classList.remove('hidden');
  if (placeholder) placeholder.classList.add('hidden');

  if (statusPill) statusPill.textContent = cfg.chip;
  if (vaultState) vaultState.textContent = cfg.state;
  if (flagState) flagState.textContent = cfg.flag;

  playOverlay(cfg.sub);
})();