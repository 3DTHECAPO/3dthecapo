(function(){
'use strict';
const byId=(id)=>document.getElementById(id);
const params=new URLSearchParams(window.location.search);
const hasNfc=params.get('nfc')==='1';
const unlock=(params.get('unlock')||'').toLowerCase();
const overlay=byId('vaultOverlay');
const statusPill=byId('statusPill');
const vaultState=byId('vaultState');
const flagState=byId('flagState');
const lockedActions=byId('lockedActions');
const accessActions=byId('accessActions');
const lockedRoom=byId('lockedRoom');
const year=byId('year');
if(year) year.textContent=new Date().getFullYear();
const rooms=['room-entry','room-gold','room-elite'];
rooms.forEach(id=>{const el=byId(id); if(el) el.classList.add('hidden');});
const states={entry:{room:'room-entry',chip:'ENTRY',state:'Entry room active',flag:'ENTRY LIVE'},gold:{room:'room-gold',chip:'GOLD',state:'Gold tier active',flag:'GOLD LIVE'},elite:{room:'room-elite',chip:'ELITE',state:'Elite holder active',flag:'ELITE LIVE'}};
function playOverlay(){
 if(!overlay) return;
 overlay.classList.remove('fadeout');
 overlay.classList.add('active');
 overlay.classList.remove('playing');
 void overlay.offsetWidth;
 overlay.classList.add('playing');
 window.setTimeout(()=>{overlay.classList.remove('playing'); overlay.classList.add('fadeout');},2650);
 window.setTimeout(()=>{overlay.classList.remove('active','fadeout');},3250);
}
if(!hasNfc || !states[unlock]){
 if(statusPill) statusPill.textContent='LOCKED';
 if(vaultState) vaultState.textContent='NFC scan required';
 if(flagState) flagState.textContent='LOCKED';
 if(lockedActions) lockedActions.classList.remove('hidden');
 if(accessActions) accessActions.classList.add('hidden');
 if(lockedRoom) lockedRoom.classList.remove('hidden');
 return;
}
const cfg=states[unlock];
const activeRoom=byId(cfg.room);
if(activeRoom) activeRoom.classList.remove('hidden');
if(lockedRoom) lockedRoom.classList.add('hidden');
if(lockedActions) lockedActions.classList.add('hidden');
if(accessActions) accessActions.classList.remove('hidden');
if(statusPill) statusPill.textContent=cfg.chip;
if(vaultState) vaultState.textContent=cfg.state;
if(flagState) flagState.textContent=cfg.flag;
window.addEventListener('load', playOverlay);
})();