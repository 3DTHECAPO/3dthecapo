
const SYMBOLS = [
  {id:'logo', label:'3D Logo', type:'image', src:'../../assets/logo.jpg', tier:'jackpot'},
  {id:'vault', label:'Vault', type:'image', src:'../../assets/vault-bg.jpg', tier:'rare'},
  {id:'grammy', label:'Grammy', type:'image', src:'../../assets/cover-fgrammy.jpg', tier:'music'},
  {id:'x100', label:'100x3', type:'image', src:'../../assets/cover-100x3.jpg', tier:'music'},
  {id:'resume', label:'My Resume', type:'image', src:'../../assets/cover-resume.jpg', tier:'music'},
  {id:'crown', label:'Crown', type:'icon', icon:'👑', tier:'rare'},
  {id:'speaker', label:'Speaker', type:'icon', icon:'🔊', tier:'common'},
  {id:'hoodie', label:'Merch', type:'icon', icon:'🧥', tier:'merch'},
  {id:'cash', label:'Cash', type:'icon', icon:'💰', tier:'common'},
  {id:'key', label:'Vault Key', type:'icon', icon:'🔐', tier:'rare'},
];
const WEIGHTS = {
  logo: 1,
  vault: 3,
  grammy: 7,
  x100: 7,
  resume: 7,
  crown: 4,
  speaker: 13,
  hoodie: 6,
  cash: 18,
  key: 4,
};
// common small hit around 10-12%, medium around 3%, rare around 1%, merch about 0.3%, jackpot very rare.
const PAYLINES = [[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2]];
const REELS = 5;
const ROWS = 3;
let credits = 1000;
let bet = 25;
let jackpot = 25000;
let lastWin = 0;
let spinning = false;

const reelsEl = document.getElementById('reels');
const messageEl = document.getElementById('message');
const statusEl = document.getElementById('status');
const spinBtn = document.getElementById('spinBtn');

function weightedPick(){
  const entries = Object.entries(WEIGHTS);
  const total = entries.reduce((a,[,w])=>a+w,0);
  let r = Math.random()*total;
  for(const [id,w] of entries){
    if((r -= w) <= 0) return SYMBOLS.find(s=>s.id===id);
  }
  return SYMBOLS[SYMBOLS.length-1];
}
function makeCell(symbol){
  const cell = document.createElement('div');
  cell.className = 'cell' + (symbol.type === 'icon' ? ' icon' : '');
  if(symbol.type === 'image'){
    const img = document.createElement('img');
    img.src = symbol.src;
    img.alt = symbol.label;
    cell.appendChild(img);
  } else {
    const icon = document.createElement('div');
    icon.className = 'icon-txt';
    icon.textContent = symbol.icon;
    cell.appendChild(icon);
  }
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = symbol.label;
  cell.appendChild(label);
  return cell;
}
function renderGrid(resultGrid){
  reelsEl.innerHTML = '';
  for(let c=0;c<REELS;c++){
    const reel = document.createElement('div');
    reel.className = 'reel';
    for(let r=0;r<ROWS;r++){
      reel.appendChild(makeCell(resultGrid[c][r]));
    }
    reelsEl.appendChild(reel);
  }
}
function randomGrid(){
  return Array.from({length:REELS}, ()=>Array.from({length:ROWS}, ()=>weightedPick()));
}
function setText(id, val){document.getElementById(id).textContent = val;}
function updateHud(){
  setText('credits', credits.toLocaleString());
  setText('bet', bet.toLocaleString());
  setText('jackpot', jackpot.toLocaleString());
  setText('lastWin', lastWin.toLocaleString());
}
function setMessage(msg){messageEl.textContent = msg;}
function adjustBet(delta){
  if(spinning) return;
  const options=[25,50,100,200];
  let idx = options.indexOf(bet);
  idx = Math.max(0, Math.min(options.length-1, idx + delta));
  bet = options[idx];
  updateHud();
}
function evaluate(grid){
  let payout = 0;
  let messages = [];
  let rewardType = 'none';

  const lines = PAYLINES.map(line => line.map((row, col)=>grid[col][row]));
  const byId = arr => arr.map(s=>s.id);

  for(const symbols of lines){
    const ids = byId(symbols);
    const counts = {};
    ids.forEach(id=>counts[id]=(counts[id]||0)+1);

    if(ids.every(id => id === 'logo')){
      payout += jackpot;
      messages.push('JACKPOT — full 3D logo payline.');
      jackpot = 25000;
      rewardType = 'jackpot';
      continue;
    }

    for(const [id,count] of Object.entries(counts)){
      if(count >= 3){
        const sym = SYMBOLS.find(s=>s.id===id);
        if(sym.tier === 'merch'){
          payout += Math.floor(bet * 6);
          messages.push('Merch line hit.');
          rewardType = rewardType === 'jackpot' ? rewardType : 'merch';
        } else if(sym.tier === 'music'){
          payout += Math.floor(bet * 4);
          messages.push('Music unlock line.');
          if(rewardType === 'none') rewardType = 'music';
        } else if(sym.id === 'vault' || sym.id === 'key' || sym.id === 'crown'){
          payout += Math.floor(bet * 10);
          messages.push('Rare vault bonus.');
          rewardType = rewardType === 'jackpot' ? rewardType : 'rare';
        } else {
          payout += Math.floor(bet * 2);
          messages.push('Common line hit.');
          if(rewardType === 'none') rewardType = 'small';
        }
      }
    }
  }

  // extra rare combination anywhere on screen: 3 keys
  const all = grid.flat();
  const keyCount = all.filter(s=>s.id==='key').length;
  if(keyCount >= 3){
    payout += Math.floor(bet * 5);
    messages.push('Vault key scatter bonus.');
    rewardType = rewardType === 'none' ? 'rare' : rewardType;
  }

  if(payout === 0){
    jackpot += Math.max(10, Math.floor(bet * 0.35));
    lastWin = 0;
    return {payout:0, rewardType:'loss', msg:'No hit. Jackpot climbs. Keep the big rewards rare.'};
  }

  lastWin = payout;
  return {
    payout,
    rewardType,
    msg: messages.join(' ') + ' ' + rewardCopy(rewardType)
  };
}
function rewardCopy(type){
  switch(type){
    case 'jackpot': return 'Best used for a very rare elite unlock or merch claim.';
    case 'merch': return 'Good place for a merch code or claim token.';
    case 'music': return 'Good place for an unreleased snippet or hidden track page.';
    case 'rare': return 'Use this for a vault key, coupon, or higher-value digital reward.';
    default: return 'Use this as points, credits, or a replay bonus.';
  }
}
async function spinOnce(){
  if(spinning) return;
  if(credits < bet){
    setMessage('Not enough credits. Reset or lower the bet.');
    return;
  }
  spinning = true;
  statusEl.textContent = 'Spinning';
  credits -= bet;
  updateHud();
  setMessage('Spinning the vault...');
  const cycles = 12;
  for(let i=0;i<cycles;i++){
    renderGrid(randomGrid());
    await new Promise(r=>setTimeout(r, 90 + i*10));
  }

  let final = randomGrid();

  // tune visible hit rate by gently nudging some losses into small wins
  if(Math.random() < 0.11){
    const lineRow = Math.floor(Math.random()*3);
    const forced = SYMBOLS.find(s=>['cash','speaker','grammy','x100','resume','hoodie'][Math.floor(Math.random()*6)]===s.id);
    for(let c=0;c<3;c++) final[c][lineRow] = forced;
  }
  if(Math.random() < 0.01){
    const lineRow = Math.floor(Math.random()*3);
    const rareForced = SYMBOLS.find(s=>['vault','key','crown'][Math.floor(Math.random()*3)]===s.id);
    for(let c=0;c<3;c++) final[c][lineRow] = rareForced;
  }
  if(Math.random() < 0.0008){
    const lineRow = 1;
    for(let c=0;c<5;c++) final[c][lineRow] = SYMBOLS.find(s=>s.id==='logo');
  }

  renderGrid(final);
  const out = evaluate(final);
  credits += out.payout;
  if(out.rewardType !== 'loss'){
    document.querySelector('.screen-shell').classList.add('flash');
    setTimeout(()=>document.querySelector('.screen-shell').classList.remove('flash'), 2000);
  }
  updateHud();
  statusEl.textContent = out.rewardType === 'loss' ? 'Miss' : 'Hit';
  setMessage(out.msg);
  spinning = false;
}
async function autoSpin(times=10){
  if(spinning) return;
  for(let i=0;i<times;i++){
    if(credits < bet) break;
    await spinOnce();
    await new Promise(r=>setTimeout(r, 220));
  }
}
document.getElementById('betDown').onclick = ()=>adjustBet(-1);
document.getElementById('betUp').onclick = ()=>adjustBet(1);
document.getElementById('spinBtn').onclick = spinOnce;
document.getElementById('resetBtn').onclick = ()=>{
  if(spinning) return;
  credits = 1000; jackpot = 25000; lastWin = 0; statusEl.textContent = 'Ready';
  updateHud(); setMessage('Credits reset. Odds stay controlled.');
  renderGrid(randomGrid());
};
document.getElementById('autoBtn').onclick = ()=>autoSpin(10);
updateHud();
renderGrid(randomGrid());
