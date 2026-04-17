const STARTING_CREDITS = 1000;
const BETS = [25,50,100,250];
const STORAGE_KEY = 'capo_slot_realistic_assets_v1';

const SYMBOLS = [
  {id:'speaker',src:'assets/speaker.png',kind:'object',weight:14,payout:3},
  {id:'crown',src:'assets/crown.png',kind:'object',weight:8,payout:8},
  {id:'key',src:'assets/key.png',kind:'object',weight:9,payout:7},
  {id:'lock',src:'assets/lock.png',kind:'object',weight:9,payout:7},
  {id:'vault',src:'assets/vault.png',kind:'object',weight:7,payout:10},
  {id:'chain',src:'assets/chain.png',kind:'object',weight:12,payout:4},
  {id:'mic',src:'assets/mic.png',kind:'object',weight:10,payout:5},
  {id:'hoodie',src:'assets/hoodie.png',kind:'object',weight:9,payout:5},
  {id:'cash',src:'assets/cash.png',kind:'object',weight:13,payout:4},
  {id:'grammy',src:'assets/cover-fuck-a-grammy.png',kind:'cover',weight:4,payout:16},
  {id:'100x3',src:'assets/cover-100x3.png',kind:'cover',weight:4,payout:18},
  {id:'resume',src:'assets/cover-my-resume.png',kind:'cover',weight:4,payout:18},
  {id:'logo',src:'assets/logo.png',kind:'logo',weight:2,payout:50},
];

let state = loadState();
let spinning = false;

const els = {
  reels: document.getElementById('reels'),
  credits: document.getElementById('creditsValue'),
  bet: document.getElementById('betValue'),
  lastWin: document.getElementById('lastWinValue'),
  status: document.getElementById('statusValue'),
  jackpot: document.getElementById('jackpotValue'),
  message: document.getElementById('messageBar'),
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const s = JSON.parse(raw);
      return {
        credits: Number.isFinite(s.credits) ? s.credits : STARTING_CREDITS,
        betIndex: Number.isInteger(s.betIndex) ? Math.max(0,Math.min(BETS.length-1,s.betIndex)) : 0,
        jackpot: Number.isFinite(s.jackpot) ? s.jackpot : 125000,
        lastWin: Number.isFinite(s.lastWin) ? s.lastWin : 0
      }
    }
  }catch(e){}
  return {credits:STARTING_CREDITS, betIndex:0, jackpot:125000, lastWin:0}
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function pick(){
  const total = SYMBOLS.reduce((a,s)=>a+s.weight,0);
  let r = Math.random()*total;
  for(const s of SYMBOLS){ r -= s.weight; if(r<=0) return s; }
  return SYMBOLS[0];
}
function makeCell(symbol){
  const cell = document.createElement('div');
  cell.className = 'cell ' + (symbol.kind === 'cover' ? 'cover' : symbol.kind === 'logo' ? 'logo' : '');
  const frame = document.createElement('div');
  frame.className = 'cellFrame';
  const img = document.createElement('img');
  img.src = symbol.src;
  img.alt = '';
  frame.appendChild(img);
  cell.appendChild(frame);
  return cell;
}
function board(){
  return Array.from({length:3},()=>Array.from({length:5},()=>pick()));
}
function render(b){
  els.reels.innerHTML = '';
  for(let c=0;c<5;c++){
    const reel = document.createElement('div');
    reel.className='reel';
    for(let r=0;r<3;r++) reel.appendChild(makeCell(b[r][c]));
    els.reels.appendChild(reel);
  }
}
function update(status='Ready', msg=''){
  els.credits.textContent = state.credits.toLocaleString();
  els.bet.textContent = BETS[state.betIndex].toLocaleString();
  els.lastWin.textContent = state.lastWin.toLocaleString();
  els.status.textContent = status;
  els.jackpot.textContent = Math.round(state.jackpot).toLocaleString();
  els.message.textContent = msg;
}
function paylines(b){ return [b[0], b[1], b[2]]; }
function evaluate(b){
  const bet = BETS[state.betIndex];
  let total = 0;
  for(const line of paylines(b)){
    const counts = {};
    line.forEach(s => counts[s.id] = (counts[s.id] || 0) + 1);
    for(const s of SYMBOLS){
      const n = counts[s.id] || 0;
      if(n >= 3){
        const mult = n === 5 ? s.payout * 2 : n === 4 ? s.payout * 1.4 : s.payout;
        total += Math.round(bet * mult);
      }
    }
  }
  return total;
}
function spinOnce(){
  if(spinning) return;
  const bet = BETS[state.betIndex];
  if(state.credits < bet){ update('No Credits','Out of Credits'); return; }
  spinning = true;
  state.credits -= bet;
  state.jackpot += Math.round(bet * .35);
  state.lastWin = 0;
  update('Spinning','');

  const liveReels = Array.from(document.querySelectorAll('.reel'));
  const timers = liveReels.map((reel, idx)=>setInterval(()=>{
    reel.innerHTML = '';
    for(let r=0;r<3;r++) reel.appendChild(makeCell(pick()));
  }, 95 + idx*20));

  setTimeout(()=>{
    const b = board();
    timers.forEach((t, idx)=>setTimeout(()=>clearInterval(t), idx*150));
    setTimeout(()=>{
      render(b);
      const win = evaluate(b);
      state.lastWin = win;
      if(win > 0){
        state.credits += win;
        update('Win', 'Won ' + win.toLocaleString());
      }else{
        update('Ready','');
      }
      saveState();
      spinning = false;
    }, 760);
  }, 620);
}
document.getElementById('minusBet').onclick = ()=>{ if(spinning) return; state.betIndex = Math.max(0, state.betIndex-1); saveState(); update(); };
document.getElementById('plusBet').onclick = ()=>{ if(spinning) return; state.betIndex = Math.min(BETS.length-1, state.betIndex+1); saveState(); update(); };
document.getElementById('spin').onclick = spinOnce;
document.getElementById('auto').onclick = ()=>{
  let n = 10;
  const run = ()=> {
    if(n <= 0 || spinning || state.credits < BETS[state.betIndex]) return;
    spinOnce();
    n--;
    const wait = setInterval(()=>{ if(!spinning){ clearInterval(wait); run(); } }, 120);
  };
  run();
};

render(board());
update();
