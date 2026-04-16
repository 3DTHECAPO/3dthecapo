
const TILE_HEIGHT = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tileH'));
const creditsEl = document.getElementById('creditsValue');
const betEl = document.getElementById('betValue');
const jackpotEl = document.getElementById('jackpotValue');
const messageBoard = document.getElementById('messageBoard');
const bestHitEl = document.getElementById('bestHit');
const lastWinEl = document.getElementById('lastWin');
const spinBtn = document.getElementById('spinBtn');
const autoBtn = document.getElementById('autoBtn');
const plusBetBtn = document.getElementById('plusBetBtn');
const minusBetBtn = document.getElementById('minusBetBtn');
const machineShell = document.querySelector('.machine-shell');
const introOverlay = document.getElementById('introOverlay');
const rewardModal = document.getElementById('rewardModal');
const rewardTitle = document.getElementById('rewardTitle');
const rewardCopy = document.getElementById('rewardCopy');
const closeRewardBtn = document.getElementById('closeRewardBtn');
document.getElementById('enterBtn').addEventListener('click', () => introOverlay.setAttribute('aria-hidden','true'));
closeRewardBtn.addEventListener('click', () => rewardModal.setAttribute('aria-hidden','true'));

const symbolMap = {
  logo: { label: 'CAPO', type: 'img', src: './assets/logo.jpg', reward: 'Elite Capo Hit' },
  vault: { label: 'VAULT', type: 'img', src: './assets/vault-bg.jpg', reward: 'Vault Access' },
  fgrammy: { label: 'F.A.G.', type: 'img', src: './assets/cover-fgrammy.jpg', reward: 'Track Reward' },
  x100x3: { label: '100x3', type: 'img', src: './assets/cover-100x3.jpg', reward: 'Track Reward' },
  resume: { label: 'RESUME', type: 'img', src: './assets/cover-resume.jpg', reward: 'Track Reward' },
  crown: { label: 'CROWN', type: 'svg', src: './assets/crown.svg', reward: 'Boss Crown' },
  cash: { label: 'CASH', type: 'svg', src: './assets/cash.svg', reward: 'Credit Hit' },
  speaker: { label: 'SPEAKER', type: 'svg', src: './assets/speaker.svg', reward: 'Music Reward' },
  key: { label: 'KEY', type: 'svg', src: './assets/key.svg', reward: 'Vault Key' },
  hoodie: { label: 'HOODIE', type: 'svg', src: './assets/hoodie.svg', reward: 'Merch Reward' }
};
const weights = { cash:16, speaker:12, fgrammy:10, x100x3:10, resume:10, hoodie:7, crown:5, vault:4, key:2, logo:1 };
const config = { credits:500, bet:25, jackpot:25000, autoLeft:0, spinning:false, bestHit:'—' };
const reels = [...document.querySelectorAll('.reel-strip')];
let currentGrid = Array.from({length:3}, () => Array(5).fill('cash'));

function weightedRandom() {
  const total = Object.values(weights).reduce((a,b)=>a+b,0);
  let roll = Math.random() * total;
  for (const [key, weight] of Object.entries(weights)) { roll -= weight; if (roll <= 0) return key; }
  return 'cash';
}
function createSymbolCard(symbol) {
  const wrap = document.createElement('div'); wrap.className = 'symbol';
  const card = document.createElement('div'); card.className = 'symbol-card';
  const meta = symbolMap[symbol];
  if (meta.type === 'img') {
    const img = document.createElement('img'); img.src = meta.src; img.alt = meta.label; card.appendChild(img);
  } else {
    const obj = document.createElement('object'); obj.data = meta.src; obj.type = 'image/svg+xml'; obj.setAttribute('aria-label', meta.label); card.appendChild(obj);
  }
  const label = document.createElement('div'); label.className = 'symbol-label'; label.textContent = meta.label; card.appendChild(label);
  wrap.appendChild(card); return wrap;
}
function updateHud() {
  creditsEl.textContent = config.credits.toLocaleString();
  betEl.textContent = config.bet;
  jackpotEl.textContent = config.jackpot.toLocaleString();
  bestHitEl.textContent = config.bestHit;
}
function renderInitial() {
  currentGrid = Array.from({length:3}, () => Array.from({length:5}, weightedRandom));
  reels.forEach((reel, index) => {
    reel.innerHTML = '';
    for (let row = 0; row < 9; row++) reel.appendChild(createSymbolCard(currentGrid[row % 3][index]));
    reel.style.transition = 'none';
    reel.style.transform = `translateY(-${TILE_HEIGHT() * 3}px)`;
  });
  updateHud();
}
function buildTargetGrid() {
  const target = Array.from({length:3}, () => Array.from({length:5}, weightedRandom));
  const roll = Math.random();
  if (roll < 0.0008) {
    const sym = Math.random() < 0.5 ? 'logo' : 'key';
    for (let c=0;c<5;c++) target[1][c] = sym;
  } else if (roll < 0.0038) {
    const sym = Math.random() < 0.5 ? 'hoodie' : 'crown';
    for (let c=0;c<5;c++) target[1][c] = sym;
  } else if (roll < 0.0138) {
    const symPool = ['vault','crown','speaker','hoodie'];
    const sym = symPool[Math.floor(Math.random() * symPool.length)];
    for (let c=0;c<4;c++) target[1][c] = sym;
  } else if (roll < 0.0438) {
    const symPool = ['fgrammy','x100x3','resume','speaker','cash'];
    const sym = symPool[Math.floor(Math.random() * symPool.length)];
    for (let c=0;c<3;c++) target[1][c] = sym;
  } else if (roll < 0.1638) {
    const symPool = ['cash','speaker','fgrammy','x100x3','resume'];
    const sym = symPool[Math.floor(Math.random() * symPool.length)];
    for (let c=0;c<2;c++) target[1][c] = sym;
  }
  return target;
}
function fillStripForSpin(reel, reelIndex, targetColumn) {
  reel.innerHTML = '';
  const tilesBefore = 20 + reelIndex * 4;
  for (let i=0; i<tilesBefore; i++) reel.appendChild(createSymbolCard(weightedRandom()));
  reel.appendChild(createSymbolCard(targetColumn[0]));
  reel.appendChild(createSymbolCard(targetColumn[1]));
  reel.appendChild(createSymbolCard(targetColumn[2]));
}
function evaluateMiddleRow(row) {
  let best = {count: 1, symbol: row[0]}, currentCount = 1;
  for (let i=1;i<row.length;i++) {
    if (row[i] === row[i-1]) { currentCount++; if (currentCount > best.count) best = {count: currentCount, symbol: row[i]}; }
    else currentCount = 1;
  }
  if (best.count < 2) return { amount:0, tier:'none', symbol:null, title:'No Hit', copy:'No reward this spin.', count:0 };
  const payouts = {2:25,3:90,4:280,5:1200};
  let base = payouts[best.count] || 0;
  if (['speaker','fgrammy','x100x3','resume'].includes(best.symbol)) base *= 1.4;
  if (['hoodie','crown','vault'].includes(best.symbol)) base *= 2.3;
  if (['key','logo'].includes(best.symbol)) base *= 5.2;
  const amount = Math.round(base * (config.bet / 25));
  let tier = 'small';
  if (best.count === 3) tier = 'medium';
  if (best.count === 4) tier = 'rare';
  if (best.count === 5 && ['hoodie','crown','vault'].includes(best.symbol)) tier = 'merch';
  if (best.count === 5 && ['key','logo'].includes(best.symbol)) tier = 'jackpot';
  const names = { small:'CREDIT HIT', medium:'MUSIC HIT', rare:'VAULT HIT', merch:'MERCH HIT', jackpot:'ELITE JACKPOT' };
  const meta = symbolMap[best.symbol];
  const copy = tier === 'jackpot'
    ? `Five ${meta.label} symbols across the main line. This is your rarest cinematic hit.`
    : `${best.count} ${meta.label} symbols landed across the main line. ${meta.reward}.`;
  return { amount, tier, symbol: best.symbol, title: names[tier], copy, count: best.count };
}
function setMessage(text) { messageBoard.textContent = text; }
function finishSpin(target) {
  currentGrid = target;
  const outcome = evaluateMiddleRow(target[1].slice());
  let finalWin = outcome.amount;
  if (outcome.tier === 'jackpot') finalWin += Math.round(config.jackpot * 0.01);
  if (finalWin > 0) {
    config.credits += finalWin;
    lastWinEl.textContent = finalWin.toLocaleString();
    config.bestHit = outcome.tier === 'jackpot' ? 'ELITE JACKPOT' : `${outcome.count} ${symbolMap[outcome.symbol].label}`;
    machineShell.classList.add('big-win');
    setMessage(`${outcome.title} • +${finalWin.toLocaleString()} CREDITS`);
    rewardTitle.textContent = outcome.title;
    rewardCopy.textContent = outcome.copy;
    rewardModal.setAttribute('aria-hidden','false');
  } else {
    machineShell.classList.remove('big-win');
    lastWinEl.textContent = '0';
    setMessage('MISS • TRY AGAIN');
  }
  updateHud();
  machineShell.classList.remove('spinning');
  config.spinning = false;
  spinBtn.disabled = false; autoBtn.disabled = false; plusBetBtn.disabled = false; minusBetBtn.disabled = false;
  if (config.autoLeft > 0 && config.credits >= config.bet) { config.autoLeft--; window.setTimeout(spin, 650); }
}
function spin() {
  if (config.spinning) return;
  if (config.credits < config.bet) { setMessage('NOT ENOUGH CREDITS'); return; }
  rewardModal.setAttribute('aria-hidden','true');
  machineShell.classList.remove('big-win');
  config.spinning = true;
  config.credits -= config.bet; updateHud();
  setMessage('SPINNING...');
  machineShell.classList.add('spinning');
  spinBtn.disabled = true; autoBtn.disabled = true; plusBetBtn.disabled = true; minusBetBtn.disabled = true;
  const target = buildTargetGrid();
  reels.forEach((reel, reelIndex) => {
    const column = [target[0][reelIndex], target[1][reelIndex], target[2][reelIndex]];
    fillStripForSpin(reel, reelIndex, column);
    const distance = (reel.children.length - 3) * TILE_HEIGHT();
    reel.style.transition = 'none';
    reel.style.transform = `translateY(0px)`;
    reel.offsetHeight;
    const duration = 1600 + reelIndex * 280;
    reel.style.transition = `transform ${duration}ms cubic-bezier(0.12,0.86,0.18,1)`;
    reel.style.transform = `translateY(-${distance}px)`;
  });
  window.setTimeout(() => finishSpin(target), 1600 + (reels.length - 1) * 280 + 120);
}
spinBtn.addEventListener('click', spin);
autoBtn.addEventListener('click', () => { if (!config.spinning) { config.autoLeft = 5; spin(); } });
plusBetBtn.addEventListener('click', () => { if (!config.spinning) { config.bet = Math.min(100, config.bet + 5); updateHud(); }});
minusBetBtn.addEventListener('click', () => { if (!config.spinning) { config.bet = Math.max(5, config.bet - 5); updateHud(); }});
window.addEventListener('resize', renderInitial);
renderInitial();
setMessage('READY TO SPIN');
