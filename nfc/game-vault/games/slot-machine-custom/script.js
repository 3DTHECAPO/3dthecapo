const STORAGE_KEY='capo_slot_live_state';
const STARTING_CREDITS=1000;
const BETS=[25,50,100,250];
const JACKPOT_BASE=125000;

const symbolDefs=[
  {name:'speaker',file:'assets/speaker.png',weight:16,payout:3,type:'object'},
  {name:'crown',file:'assets/crown.png',weight:9,payout:10,type:'object'},
  {name:'key',file:'assets/key.png',weight:10,payout:8,type:'object'},
  {name:'lock',file:'assets/lock.png',weight:10,payout:8,type:'object'},
  {name:'vault',file:'assets/vault.png',weight:7,payout:14,type:'object'},
  {name:'chain',file:'assets/chain.png',weight:12,payout:5,type:'object'},
  {name:'mic',file:'assets/mic.png',weight:11,payout:6,type:'object'},
  {name:'hoodie',file:'assets/hoodie.png',weight:10,payout:7,type:'object'},
  {name:'cash',file:'assets/cash.png',weight:13,payout:4,type:'object'},
  {name:'fuck-a-grammy',file:'assets/cover-fuck-a-grammy.png',weight:4,payout:18,type:'cover'},
  {name:'100x3',file:'assets/cover-100x3.png',weight:4,payout:20,type:'cover'},
  {name:'my-resume',file:'assets/cover-my-resume.png',weight:4,payout:20,type:'cover'},
  {name:'logo',file:'assets/logo.png',weight:2,payout:50,type:'cover'}
];

let state=loadState(), isSpinning=false;

const reelsEl=document.getElementById('reels');
const creditsEl=document.getElementById('creditsValue');
const betEl=document.getElementById('betValue');
const lastWinEl=document.getElementById('lastWinValue');
const statusEl=document.getElementById('statusValue');
const jackpotEl=document.getElementById('jackpotValue');
const msgEl=document.getElementById('messageBar');
const frameEl=document.getElementById('reelFrame');
const overlayEl=document.getElementById('overlay');

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      return {
        credits:Number.isFinite(parsed.credits)?parsed.credits:STARTING_CREDITS,
        betIndex:Number.isInteger(parsed.betIndex)?Math.max(0,Math.min(BETS.length-1,parsed.betIndex)):0,
        jackpot:Number.isFinite(parsed.jackpot)?parsed.jackpot:JACKPOT_BASE,
        lastWin:Number.isFinite(parsed.lastWin)?parsed.lastWin:0
      };
    }
  }catch(e){}
  return {credits:STARTING_CREDITS,betIndex:0,jackpot:JACKPOT_BASE,lastWin:0};
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function weightedPick(){
  const total=symbolDefs.reduce((sum,s)=>sum+s.weight,0);
  let n=Math.random()*total;
  for(const s of symbolDefs){ n-=s.weight; if(n<=0) return s; }
  return symbolDefs[0];
}
function makeCell(sym){
  const cell=document.createElement('div');
  cell.className='cell '+(sym.type==='object'?'object':'cover')+' fallback';
  if(sym.name==='logo') cell.classList.add('logo');
  const img=document.createElement('img');
  img.alt='';
  img.src=sym.file;
  img.onload=()=>cell.classList.remove('fallback');
  img.onerror=()=>cell.classList.add('fallback');
  cell.appendChild(img);
  return cell;
}
function renderBoard(board){
  reelsEl.innerHTML='';
  for(let c=0;c<5;c++){
    const reel=document.createElement('div');
    reel.className='reel';
    for(let r=0;r<3;r++) reel.appendChild(makeCell(board[r][c]));
    reelsEl.appendChild(reel);
  }
}
function randomBoard(){return Array.from({length:3},()=>Array.from({length:5},()=>weightedPick()));}
function updateUi(status='Ready', message=''){
  creditsEl.textContent=state.credits.toLocaleString();
  betEl.textContent=BETS[state.betIndex].toLocaleString();
  lastWinEl.textContent=state.lastWin.toLocaleString();
  statusEl.textContent=status;
  jackpotEl.textContent=Math.round(state.jackpot).toLocaleString();
  msgEl.textContent=message;
}
function paylines(board){
  return [board[0],board[1],board[2],[board[0][0],board[1][1],board[2][2],board[1][3],board[0][4]],[board[2][0],board[1][1],board[0][2],board[1][3],board[2][4]]];
}
function lineWin(line, bet){
  const counts={}; line.forEach(s=>counts[s.name]=(counts[s.name]||0)+1);
  let best=0;
  for(const s of symbolDefs){
    const count=counts[s.name]||0;
    if(count>=3){
      const mult=count===5?s.payout*2.4:count===4?s.payout*1.5:s.payout;
      best=Math.max(best,Math.round(bet*mult));
    }
  }
  return best;
}
function evaluate(board){
  const bet=BETS[state.betIndex];
  let total=0;
  for(const line of paylines(board)) total += lineWin(line, bet);
  const logos=board.flat().filter(s=>s.name==='logo').length;
  if(logos>=3) total += Math.round(state.jackpot*0.02);
  return total;
}
function spinOnce(){
  if(isSpinning) return;
  const bet=BETS[state.betIndex];
  if(state.credits<bet){ updateUi('No Credits','Out of Credits'); return; }
  isSpinning=true;
  state.credits -= bet;
  state.jackpot += Math.round(bet*0.35);
  state.lastWin=0;
  updateUi('Spinning','');
  const reels=[...document.querySelectorAll('.reel')];
  const intervals=reels.map((reel,idx)=>setInterval(()=>{
    reel.innerHTML='';
    for(let r=0;r<3;r++) reel.appendChild(makeCell(weightedPick()));
  },95+idx*18));
  setTimeout(()=>{
    const board=randomBoard();
    intervals.forEach((id,idx)=>setTimeout(()=>clearInterval(id),idx*160));
    setTimeout(()=>{
      renderBoard(board);
      const win=evaluate(board);
      state.lastWin=win;
      if(win>0){
        state.credits += win;
        state.jackpot=Math.max(JACKPOT_BASE,state.jackpot-Math.round(win*0.35));
        frameEl.classList.add('win-flash');
        setTimeout(()=>frameEl.classList.remove('win-flash'),650);
        updateUi('Win',`Won ${win.toLocaleString()}`);
      } else {
        updateUi('Ready','');
      }
      saveState();
      isSpinning=false;
    },780);
  },650);
}
function autoSpin(count=10){
  if(isSpinning) return;
  let n=count;
  const run=()=>{
    if(n<=0 || state.credits < BETS[state.betIndex]) return;
    spinOnce(); n--;
    const wait=setInterval(()=>{ if(!isSpinning){ clearInterval(wait); run(); }},120);
  };
  run();
}
document.getElementById('spinBtn').addEventListener('click',spinOnce);
document.getElementById('downBetBtn').addEventListener('click',()=>{ if(isSpinning) return; state.betIndex=Math.max(0,state.betIndex-1); saveState(); updateUi('Ready',''); });
document.getElementById('upBetBtn').addEventListener('click',()=>{ if(isSpinning) return; state.betIndex=Math.min(BETS.length-1,state.betIndex+1); saveState(); updateUi('Ready',''); });
document.getElementById('autoBtn').addEventListener('click',()=>autoSpin(10));
document.getElementById('enterBtn').addEventListener('click',()=>overlayEl.classList.add('hidden'));

renderBoard(randomBoard());
updateUi('Ready','');
