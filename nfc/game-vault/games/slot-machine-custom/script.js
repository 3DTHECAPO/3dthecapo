const SYMBOLS = [
  {id:'logo', type:'image', src:'./assets/logo.jpg'},
  {id:'vault', type:'image', src:'./assets/vault-bg.jpg'},
  {id:'grammy', type:'image', src:'./assets/cover-fgrammy.jpg'},
  {id:'x100', type:'image', src:'./assets/cover-100x3.jpg'},
  {id:'resume', type:'image', src:'./assets/cover-resume.jpg'},
  {id:'crown', type:'icon', icon:'👑'},
  {id:'speaker', type:'icon', icon:'🔊'},
  {id:'hoodie', type:'icon', icon:'🧥'},
  {id:'cash', type:'icon', icon:'💰'},
  {id:'key', type:'icon', icon:'🔐'},
];
const WEIGHTS = {logo:1,vault:3,grammy:6,x100:6,resume:6,crown:3,speaker:10,hoodie:5,cash:16,key:3};
const REELS = 5;
const ROWS = 3;
let credits = 1000;
let bet = 25;
let jackpot = 25000;
let lastWin = 0;
let spinning = false;
let autoMode = false;

const reelsEl = document.getElementById('reels');
const messageEl = document.getElementById('message');
const statusEl = document.getElementById('status');
const stageEl = document.querySelector('.reel-stage');

function byId(id){ return document.getElementById(id); }
function weightedPick(){
  const pool = Object.entries(WEIGHTS);
  const total = pool.reduce((a,[,w])=>a+w,0);
  let r = Math.random()*total;
  for(const [id,w] of pool){ if((r-=w)<=0) return SYMBOLS.find(s=>s.id===id); }
  return SYMBOLS[SYMBOLS.length-1];
}
function randomGrid(){ return Array.from({length:REELS},()=>Array.from({length:ROWS},()=>weightedPick())); }
function makeCell(symbol){
  const cell = document.createElement('div');
  cell.className = 'cell' + (symbol.type === 'icon' ? ' icon' : '');
  if(symbol.type === 'image'){
    const img = document.createElement('img');
    img.src = symbol.src;
    img.alt = symbol.id;
    img.onerror = ()=>{ cell.classList.add('icon'); cell.textContent = '◆'; };
    cell.appendChild(img);
  } else {
    cell.textContent = symbol.icon;
  }
  return cell;
}
function renderGrid(grid, winningCells = []){
  reelsEl.innerHTML = '';
  for(let c=0;c<REELS;c++){
    const reel = document.createElement('div');
    reel.className = 'reel';
    for(let r=0;r<ROWS;r++){
      const cell = makeCell(grid[c][r]);
      if(winningCells.some(([wc,wr])=>wc===c && wr===r)) cell.classList.add('win');
      reel.appendChild(cell);
    }
    reelsEl.appendChild(reel);
  }
}
function updateHud(){
  byId('credits').textContent = credits.toLocaleString();
  byId('bet').textContent = bet.toLocaleString();
  byId('jackpot').textContent = jackpot.toLocaleString();
  byId('lastWin').textContent = lastWin.toLocaleString();
}
function setMessage(msg){ messageEl.textContent = msg; }
function adjustBet(dir){
  if(spinning) return;
  const options = [25,50,100,200];
  let idx = options.indexOf(bet);
  idx = Math.max(0, Math.min(options.length-1, idx + dir));
  bet = options[idx];
  updateHud();
}
function lineSymbols(grid, row){ return Array.from({length:REELS}, (_,c)=>grid[c][row]); }
function evaluate(grid){
  let payout = 0;
  let winningCells = [];
  let msg = 'Miss.';
  let hit = false;
  [0,1,2].forEach(row=>{
    const line = lineSymbols(grid,row);
    const first = line[0].id;
    const streak = line.filter(s=>s.id===first).length;
    if(streak===5 && first==='logo'){
      payout += jackpot;
      jackpot = 25000;
      hit = true;
      msg = 'JACKPOT.';
      winningCells = winningCells.concat([[0,row],[1,row],[2,row],[3,row],[4,row]]);
    } else {
      const counts = {};
      line.forEach(s=>counts[s.id]=(counts[s.id]||0)+1);
      for(const [id,count] of Object.entries(counts)){
        if(count >= 3){
          hit = true;
          const rowWins = [];
          line.forEach((s,c)=>{ if(s.id===id) rowWins.push([c,row]); });
          winningCells = winningCells.concat(rowWins);
          if(['grammy','x100','resume'].includes(id)) payout += bet*4;
          else if(['vault','key','crown'].includes(id)) payout += bet*6;
          else if(id==='hoodie') payout += bet*5;
          else payout += bet*2;
        }
      }
    }
  });
  if(!hit){
    jackpot += Math.max(10, Math.floor(bet * 0.35));
    lastWin = 0;
    return { payout:0, winningCells:[], msg:'No hit. Jackpot climbs.' };
  }
  lastWin = payout;
  if(msg !== 'JACKPOT.') msg = payout >= bet*10 ? 'Big win.' : 'Win.';
  return { payout, winningCells, msg };
}
async function spinAnimation(){
  const loops = 10;
  for(let i=0;i<loops;i++){
    renderGrid(randomGrid());
    await new Promise(r=>setTimeout(r, 70 + i*8));
  }
}
function forceRates(grid){
  if(Math.random() < 0.10){
    const row = Math.floor(Math.random()*ROWS);
    const forced = ['cash','speaker','grammy','x100','resume','hoodie'][Math.floor(Math.random()*6)];
    for(let c=0;c<3;c++) grid[c][row] = SYMBOLS.find(s=>s.id===forced);
  }
  if(Math.random() < 0.008){
    const row = 1;
    const rare = ['vault','key','crown'][Math.floor(Math.random()*3)];
    for(let c=1;c<4;c++) grid[c][row] = SYMBOLS.find(s=>s.id===rare);
  }
  if(Math.random() < 0.0008){
    const row = 1;
    for(let c=0;c<5;c++) grid[c][row] = SYMBOLS.find(s=>s.id==='logo');
  }
  return grid;
}
async function spinOnce(){
  if(spinning) return;
  if(credits < bet){ setMessage('Not enough credits.'); return; }
  spinning = true;
  statusEl.textContent = 'Spinning';
  credits -= bet;
  updateHud();
  setMessage('Spinning...');
  await spinAnimation();
  let grid = forceRates(randomGrid());
  const result = evaluate(grid);
  credits += result.payout;
  renderGrid(grid, result.winningCells);
  updateHud();
  statusEl.textContent = result.payout ? 'Hit' : 'Ready';
  setMessage(result.msg);
  if(result.payout){ stageEl.classList.add('flash'); setTimeout(()=>stageEl.classList.remove('flash'), 1500); }
  spinning = false;
}
async function autoSpin(){
  if(spinning || autoMode) return;
  autoMode = true;
  for(let i=0;i<10;i++){
    if(credits < bet) break;
    await spinOnce();
    await new Promise(r=>setTimeout(r, 180));
  }
  autoMode = false;
}
byId('betDown').addEventListener('click', ()=>adjustBet(-1));
byId('betUp').addEventListener('click', ()=>adjustBet(1));
byId('spinBtn').addEventListener('click', spinOnce);
byId('autoBtn').addEventListener('click', autoSpin);
byId('resetBtn').addEventListener('click', ()=>{
  if(spinning) return;
  credits = 1000; bet = 25; jackpot = 25000; lastWin = 0;
  statusEl.textContent = 'Ready';
  updateHud();
  setMessage('Ready to spin.');
  renderGrid(randomGrid());
});
updateHud();
renderGrid(randomGrid());
