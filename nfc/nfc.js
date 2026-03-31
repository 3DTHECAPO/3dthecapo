(function(){
  'use strict';
  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || 'entry').toLowerCase();

  const overlay = byId('vaultOverlay');
  const accessSub = byId('accessSub');
  const statusPill = byId('statusPill');
  const vaultState = byId('vaultState');
  const flagState = byId('flagState');
  const year = byId('year');
  const placeholder = byId('placeholderRoom');

  if (year) year.textContent = new Date().getFullYear();

  const rooms = ['room-entry','room-gold','room-elite'];
  rooms.forEach((id) => {
    const el = byId(id);
    if (el) el.classList.add('hidden');
  });

  const states = {
    entry: { room: 'room-entry', chip: 'ENTRY', state: 'Entry room active', flag: 'ENTRY LIVE', sub: 'ENTRY ACCESS VERIFIED' },
    gold:  { room: 'room-gold', chip: 'GOLD', state: 'Gold tier active', flag: 'GOLD LIVE', sub: 'GOLD MEMBERSHIP VERIFIED' },
    elite: { room: 'room-elite', chip: 'ELITE', state: 'Elite holder active', flag: 'ELITE LIVE', sub: 'ELITE HOLDER VERIFIED' }
  };

  function playOverlay(text){
    if (!overlay) return;
    if (accessSub) accessSub.textContent = text || 'THE CAPO VAULT';
    overlay.classList.add('active');
    overlay.classList.remove('playing');
    void overlay.offsetWidth;
    overlay.classList.add('playing');
    window.setTimeout(() => overlay.classList.remove('playing'), 2800);
    window.setTimeout(() => overlay.classList.remove('active'), 4100);
  }

  const cfg = states[unlock] || states.entry;

  const activeRoom = byId(cfg.room);
  if (activeRoom) activeRoom.classList.remove('hidden');
  if (placeholder) placeholder.classList.add('hidden');

  if (statusPill) statusPill.textContent = cfg.chip;
  if (vaultState) vaultState.textContent = cfg.state;
  if (flagState) flagState.textContent = cfg.flag;

  window.addEventListener('load', () => {
    playOverlay(cfg.sub);
  });
})();