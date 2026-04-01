
(function(){
'use strict';
const byId=(id)=>document.getElementById(id);
const params=new URLSearchParams(window.location.search);
const hasNfc=params.get('nfc')==='1';
const explicitUnlock=(params.get('unlock')||'').toLowerCase();
const code=(params.get('code')||'').toUpperCase().trim();
const statusPill=byId('statusPill');
const vaultState=byId('vaultState');
const lockedActions=byId('lockedActions');
const lockedRoom=byId('lockedRoom');
const sequence=byId('vaultSequence');
const year=byId('year');
const publicNav=byId('publicNav');
const privateNav=byId('privateNav');
const connect=byId('connect');
const connectDivider=byId('connectDivider');
const sessionLane=byId('sessionLane');
const sessionDivider=byId('sessionDivider');

if(year) year.textContent=new Date().getFullYear();

const codeMap={
  ENTRY001:{tier:'entry',title:'ENTRY ACCESS',copy:'The opening lane for coded audio access, artist-world visuals, and the first private room.',chips:['music lane','private visual','coded access']},
  GOLD001:{tier:'gold',title:'GOLD ACCESS',copy:'Private music, coded visual access, and hidden route-ins for stronger vault value.',chips:['private music','hidden merch','private visual','coded reward']},
  ELITE001:{tier:'elite',title:'ELITE ACCESS',copy:'The premium room for music, visuals, merch placeholders, hidden bundles, and future holder perks.',chips:['all-access','premium merch','hidden bundle','future perk']},
  DROP777:{tier:'gold',title:'SPECIAL DROP ACCESS',copy:'This one-off drop code opens a limited campaign package with coded music, hidden merch, and private visual access.',chips:['special drop','limited merch','private visual']},
  MERCH999:{tier:'elite',title:'MERCH VAULT ACCESS',copy:'This code is tuned for hidden merch access, bundle offers, early windows, and premium product drops.',chips:['merch-only','bundle offer','early access']}
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
  if(vaultState) vaultState.textContent='NFC access required';
  if(lockedActions) lockedActions.classList.remove('hidden');
  if(lockedRoom) lockedRoom.classList.remove('hidden');
  if(publicNav) publicNav.classList.remove('hidden');
  if(privateNav) privateNav.classList.add('hidden');
  if(connect) connect.classList.add('hidden');
  if(connectDivider) connectDivider.classList.add('hidden');
  if(sessionLane) sessionLane.classList.add('hidden');
  if(sessionDivider) sessionDivider.classList.add('hidden');
}

function runSequence(){
  if(!sequence) return;
  sequence.classList.remove('fadeout','show-access','playing-doors');
  sequence.classList.add('active');
  void sequence.offsetWidth;
  sequence.classList.add('playing-doors');
  window.setTimeout(()=>{sequence.classList.remove('playing-doors'); sequence.classList.add('show-access');},3300);
  window.setTimeout(()=>{sequence.classList.add('fadeout');},4450);
  window.setTimeout(()=>{sequence.classList.remove('active','show-access','fadeout');},5200);
}

['room-entry','room-gold','room-elite'].forEach(id=>{const el=byId(id); if(el) el.classList.add('hidden');});

let activePackage=null;
if(code && codeMap[code]) activePackage=codeMap[code];
else if(hasNfc && ['entry','gold','elite'].includes(explicitUnlock))
  activePackage={tier:explicitUnlock,title:explicitUnlock.toUpperCase()+' ACCESS',copy:'Verified access unlocked the '+explicitUnlock+' room.',chips:[explicitUnlock+' tier']};

if(!hasNfc || !activePackage){ showLocked(); return; }

const roomId='room-'+activePackage.tier;
const activeRoom=byId(roomId);
if(activeRoom) activeRoom.classList.remove('hidden');
if(lockedRoom) lockedRoom.classList.add('hidden');
if(lockedActions) lockedActions.classList.add('hidden');
if(statusPill) statusPill.textContent=activePackage.tier.toUpperCase();
if(vaultState) vaultState.textContent=activePackage.title;
if(publicNav) publicNav.classList.add('hidden');
if(privateNav) privateNav.classList.remove('hidden');
if(connect) connect.classList.remove('hidden');
if(connectDivider) connectDivider.classList.remove('hidden');
if(sessionLane) sessionLane.classList.remove('hidden');
if(sessionDivider) sessionDivider.classList.remove('hidden');

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
