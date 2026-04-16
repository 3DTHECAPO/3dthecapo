
const START_CREDITS = 1000;
const STORAGE_KEY = 'capo_slot_credits_v2';
const bets = [25,50,100,250];
let betIndex = 0;
let credits = parseInt(localStorage.getItem(STORAGE_KEY) || START_CREDITS,10);
if (Number.isNaN(credits) || credits < 0) credits = START_CREDITS;
let jackpot = 125000;
let lastWin = 0;
let spinning = false;
const reelCount = 5, rows = 3, symbolH = 118;
const feed = {
  small:['Cash hit','Street payout','Speaker combo'],
  medium:['Cover unlock tier','Vault pulse','Capo line hit'],
  rare:['Merch tier landed','Rare crown line','Vault key line'],
  jackpot:['CAPO JACKPOT','Elite vault hit']
};
const symbols = [
  {id:'cash',src:'assets/cash.png',weight:24,payout:1},
  {id:'speaker',src:'assets/speaker.png',weight:18,payout:1},
  {id:'cover1',src:'assets/cover1.jpg',weight:14,payout:2},
  {id:'cover2',src:'assets/cover2.jpg',weight:14,payout:2},
  {id:'cover3',src:'assets/cover3.jpg',weight:14,payout:2},
  {id:'merch1',src:'assets/merch1.jpg',weight:10,payout:3},
  {id:'merch2',src:'assets/merch2.jpg',weight:10,payout:3},
  {id:'vault',src:'assets/vault.png',weight:8,payout:4},
  {id:'logo',src:'assets/logo.png',weight:5,payout:6},
  {id:'crown',src:'assets/crown.png',weight:4,payout:8},
  {id:'key',src:'assets/key.png',weight:2,payout:12}
];
const reelsEl = document.getElementById('reels');
const spinBtn = document.getElementById('spinBtn');
const betValue = document.getElementById('betValue');
const creditsValue = document.getElementById('creditsValue');
const lastWinValue = document.getElementById('lastWinValue');
const jackpotValue = document.getElementById('jackpotValue');
const overlay = document.getElementById('winOverlay');
const winTier = document.getElementById('winTier');
const winText = document.getElementById('winText');
const winAmount = document.getElementById('winAmount');
const machine = document.querySelector('.machine');
const intro = document.getElementById('intro');
document.getElementById('enterBtn').onclick = ()=> intro.classList.add('hide');
document.getElementById('closeWinBtn').onclick = ()=> overlay.classList.remove('show');
document.getElementById('betDownBtn').onclick = ()=>{ if(spinning) return; betIndex=(betIndex-1+bets.length)%bets.length; renderStats(); };
document.getElementById('betUpBtn').onclick = ()=>{ if(spinning) return; betIndex=(betIndex+1)%bets.length; renderStats(); };
spinBtn.onclick = spin;

function weightedPick(){
  const total = symbols.reduce((a,s)=>a+s.weight,0);
  let n = Math.random()*total;
  for (const s of symbols){ n-=s.weight; if(n<=0) return s; }
  return symbols[0];
}
function createSymbol(sym){
  const d=document.createElement('div'); d.className='symbol';
  const img=document.createElement('img'); img.src=sym.src; img.alt=''; img.onerror=()=>{img.style.display='none'; d.textContent='★'; d.style.fontSize='44px'; d.style.color='var(--gold3)';};
  d.appendChild(img); d.dataset.id=sym.id; return d;
}
function buildReels(){
  reelsEl.innerHTML='';
  for(let i=0;i<reelCount;i++){
    const reel=document.createElement('div'); reel.className='reel';
    const strip=document.createElement('div'); strip.className='reel-strip';
    for(let j=0;j<18;j++){ strip.appendChild(createSymbol(weightedPick())); }
    reel.appendChild(strip); reelsEl.appendChild(reel);
  }
}
function renderStats(){
  betValue.textContent = bets[betIndex];
  creditsValue.textContent = credits;
  lastWinValue.textContent = lastWin;
  jackpotValue.textContent = jackpot.toLocaleString();
  spinBtn.disabled = spinning || credits < bets[betIndex];
  spinBtn.textContent = credits < bets[betIndex] ? 'Out of Credits' : 'Spin';
}
function saveCredits(){ localStorage.setItem(STORAGE_KEY, String(credits)); }
function forceOutcome(kind){
  const common=['cash','speaker','cover1','cover2','cover3'];
  const rewardSets={ medium:'vault', rare:'logo', jackpot:'key' };
  const grid = Array.from({length:rows},()=>Array.from({length:reelCount},()=>weightedPick().id));
  if(kind==='small'){ const id = common[Math.floor(Math.random()*common.length)]; for(let i=0;i<3;i++) grid[1][i]=id; }
  if(kind==='medium'){ for(let i=0;i<3;i++) grid[1][i]=rewardSets.medium; }
  if(kind==='rare'){ for(let i=0;i<3;i++) grid[1][i]=rewardSets.rare; }
  if(kind==='jackpot'){ for(let i=0;i<3;i++) grid[1][i]=rewardSets.jackpot; }
  return grid;
}
function naturalGrid(){ return Array.from({length:rows},()=>Array.from({length:reelCount},()=>weightedPick().id)); }
function outcomeType(){
  const r=Math.random();
  if(r<0.0008) return 'jackpot';
  if(r<0.008) return 'rare';
  if(r<0.035) return 'medium';
  if(r<0.14) return 'small';
  return 'none';
}
function evaluate(grid){
  let best = {match:0, amount:0, ids:[]};
  for(let row=0; row<rows; row++){
    let run=1;
    for(let c=1;c<reelCount;c++){
      if(grid[row][c]===grid[row][c-1]) run++; else break;
    }
    if(run>=3){
      const sym = symbols.find(s=>s.id===grid[row][0]);
      const multiplier = run===5 ? 5 : run===4 ? 3 : 1.6;
      const amount = Math.floor(bets[betIndex] * sym.payout * multiplier);
      if(amount > best.amount) best = {match:run, amount, ids:[...Array(run).keys()].map(i=>`${row}-${i}`), symbol:sym.id};
    }
  }
  return best;
}
function refillStrip(strip, finalColumn){
  strip.innerHTML='';
  const filler = [];
  for(let i=0;i<12;i++) filler.push(weightedPick());
  filler.push(symbols.find(s=>s.id===finalColumn[0]));
  filler.push(symbols.find(s=>s.id===finalColumn[1]));
  filler.push(symbols.find(s=>s.id===finalColumn[2]));
  filler.push(weightedPick());
  filler.push(weightedPick());
  filler.forEach(sym=> strip.appendChild(createSymbol(sym)));
}
function spin(){
  const cost = bets[betIndex];
  if(spinning || credits < cost) return;
  spinning = true; overlay.classList.remove('show'); machine.classList.remove('win-flash','jackpot-hit');
  credits -= cost; jackpot += Math.floor(cost * .35); lastWin = 0; saveCredits(); renderStats();
  const type = outcomeType();
  const finalGrid = type==='none' ? naturalGrid() : forceOutcome(type);
  const reelEls = [...document.querySelectorAll('.reel-strip')];
  reelEls.forEach((strip,i)=>{ refillStrip(strip, finalGrid.map(row=>row[i])); });
  reelEls.forEach((strip,i)=>{
    const finalY = -(12 * 118 + 8); // approximate top offset before final 3 visible cells
    strip.animate([
      { transform:'translateY(0px)' },
      { transform:`translateY(-${980 + i*80}px)` },
      { transform:`translateY(${finalY}px)` }
    ], { duration: 1200 + i*220, easing:'cubic-bezier(.15,.9,.2,1)', fill:'forwards' });
  });
  setTimeout(()=> finishSpin(finalGrid, type), 1200 + (reelCount-1)*220 + 80);
}
function finishSpin(grid, forcedType){
  const result = evaluate(grid);
  const reelDivs = [...document.querySelectorAll('.reel')];
  reelDivs.forEach(reel => [...reel.querySelectorAll('.symbol')].forEach(s=>s.classList.remove('active')));
  if(result.amount>0){
    credits += result.amount; lastWin = result.amount; saveCredits();
    const tier = forcedType==='jackpot' ? 'JACKPOT' : forcedType==='rare' ? 'RARE HIT' : forcedType==='medium' ? 'BIG WIN' : 'WIN';
    winTier.textContent = tier;
    winText.textContent = (feed[forcedType] || feed.small)[Math.floor(Math.random()*((feed[forcedType]||feed.small).length))];
    winAmount.textContent = `+${result.amount}`;
    overlay.classList.add('show');
    if(forcedType==='jackpot'){ machine.classList.add('jackpot-hit'); jackpot = Math.max(50000, jackpot - 5000); }
    else { machine.classList.add('win-flash'); }
  }
  renderStats();
  spinning = false; renderStats();
}
buildReels(); renderStats();
