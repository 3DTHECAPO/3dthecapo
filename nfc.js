(function(){
'use strict';
const byId=(id)=>document.getElementById(id);
const params=new URLSearchParams(window.location.search);
const hasNfc=params.get('nfc')==='1';
const explicitUnlock=(params.get('unlock')||'').toLowerCase();
const code=(params.get('code')||'').toUpperCase().trim();
const statusPill=byId('statusPill');
const vaultState=byId('vaultState');
const flagState=byId('flagState');
const lockedActions=byId('lockedActions');
const accessActions=byId('accessActions');
const lockedRoom=byId('lockedRoom');
const sequence=byId('vaultSequence');
const year=byId('year');

if(year) year.textContent=new Date().getFullYear();

const codeMap={
  ENTRY001:{tier:'entry',title:'ENTRY ACCESS',copy:'Entry access unlocks a teaser music lane, private preview content, and first-level vault rewards.',chips:['snippet','video preview','music-only code']},
  GOLD001:{tier:'gold',title:'GOLD ACCESS',copy:'Gold access unlocks private music, early merch access, hidden product links, and premium vault content.',chips:['full private track','hidden merch','private video','discount code']},
  ELITE001:{tier:'elite',title:'ELITE ACCESS',copy:'Elite access unlocks all-access rewards including private music, premium merch, hidden bundles, and future rotating perks.',chips:['all-access','bundle offer','premium merch','bonus perks','future rewards']},
  DROP777:{tier:'gold',title:'SPECIAL DROP ACCESS',copy:'This one-off drop code opens a limited campaign package with exclusive music, merch, and video access.',chips:['special drop','limited merch','private visual']},
  MERCH999:{tier:'elite',title:'MERCH VAULT ACCESS',copy:'This code is tuned for hidden merch access, bundle offers, early windows, and premium product drops.',chips:['merch-only code','bundle offer','early access']}
};

function fillChips(targetId, items){
  const target=byId(targetId);
  if(!target) return;
  target.innerHTML='';
  items.forEach(item=>{
    const span=document.createElement('span');
    span.className='chip';
    span.textContent=item;
    target.appendChild(span);
  });
}

function showLocked(){
  if(statusPill) statusPill.textContent='LOCKED';
  if(vaultState) vaultState.textContent='NFC scan required';
  if(flagState) flagState.textContent='LOCKED';
  if(lockedActions) lockedActions.classList.remove('hidden');
  if(accessActions) accessActions.classList.add('hidden');
  if(lockedRoom) lockedRoom.classList.remove('hidden');
}

function runSequence(){
  if(!sequence) return;
  sequence.classList.remove('fadeout','show-access','playing-doors');
  sequence.classList.add('active');
  void sequence.offsetWidth;
  sequence.classList.add('playing-doors');

  window.setTimeout(()=>{
    sequence.classList.remove('playing-doors');
    sequence.classList.add('show-access');
  }, 3300);

  window.setTimeout(()=>{
    sequence.classList.add('fadeout');
  }, 4450);

  window.setTimeout(()=>{
    sequence.classList.remove('active','show-access','fadeout');
  }, 5200);
}

['room-entry','room-gold','room-elite'].forEach(id=>{
  const el=byId(id);
  if(el) el.classList.add('hidden');
});

let activePackage=null;
if(code && codeMap[code]) {
  activePackage=codeMap[code];
} else if(hasNfc && explicitUnlock && ['entry','gold','elite'].includes(explicitUnlock)) {
  activePackage={tier:explicitUnlock,title:explicitUnlock.toUpperCase()+' ACCESS',copy:'Verified access unlocked the '+explicitUnlock+' room.',chips:[explicitUnlock+' tier']};
}

if(!hasNfc || !activePackage){
  showLocked();
  return;
}

const roomId='room-'+activePackage.tier;
const activeRoom=byId(roomId);
if(activeRoom) activeRoom.classList.remove('hidden');
if(lockedRoom) lockedRoom.classList.add('hidden');
if(lockedActions) lockedActions.classList.add('hidden');
if(accessActions) accessActions.classList.remove('hidden');

if(statusPill) statusPill.textContent=activePackage.tier.toUpperCase();
if(vaultState) vaultState.textContent=activePackage.title;
if(flagState) flagState.textContent=activePackage.tier.toUpperCase()+' LIVE';

if(activePackage.tier==='entry'){
  byId('entryTitle').textContent=activePackage.title;
  byId('entryCopy').textContent=activePackage.copy;
  fillChips('entryChips', activePackage.chips||[]);
}
if(activePackage.tier==='gold'){
  byId('goldTitle').textContent=activePackage.title;
  byId('goldCopy').textContent=activePackage.copy;
  fillChips('goldChips', activePackage.chips||[]);
}
if(activePackage.tier==='elite'){
  byId('eliteTitle').textContent=activePackage.title;
  byId('eliteCopy').textContent=activePackage.copy;
  fillChips('eliteChips', activePackage.chips||[]);
}

window.addEventListener('load', runSequence);
})();