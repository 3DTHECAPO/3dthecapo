
const STARTING_CREDITS = 1000;
const BETS = [10, 25, 50, 100];
const ROWS = 3;
const REELS = 5;
const CELL_HEIGHT = () => window.innerWidth <= 720 ? 86 : 104;

const SYMBOLS = [
  { id:'speaker', src:'./assets/speaker.svg', weight:18 },
  { id:'hoodie',  src:'./assets/hoodie.svg',  weight:16 },
  { id:'key',     src:'./assets/key.svg',     weight:10 },
  { id:'lock',    src:'./assets/lock.svg',    weight:10 },
  { id:'chain',   src:'./assets/chain.svg',   weight:8 },
  { id:'mic',     src:'./assets/mic.svg',     weight:8 },
  { id:'crown',   src:'./assets/crown.svg',   weight:7 },
  { id:'logo',    src:'./assets/logo.svg',    weight:6 },
  { id:'vault',   src:'./assets/vault.svg',   weight:4 }
];

const payLines = [
  [[0,0],[1,0],[2,0],[3,0],[4,0]],
  [[0,1],[1,1],[2,1],[3,1],[4,1]],
  [[0,2],[1,2],[2,2],[3,2],[4,2]],
  [[0,0],[1,1],[2,2],[3,1],[4,0]],
  [[0,2],[1,1],[2,0],[3,1],[4,2]]
];
const payByCount = {3: 4, 4: 10, 5: 24};
const bonusById = { key:50, lock:50, crown:75, logo:90, vault:150 };

const storageKeys = {
  credits: 'capo_live_slot_credits',
  bet: 'capo_live_slot_bet_idx',
  jackpot: 'capo_live_slot_jackpot'
};

let credits = parseInt(localStorage.getItem(storageKeys.credits) || STARTING_CREDITS, 10);
if (!Number.isFinite(credits) || credits < 0) credits = STARTING_CREDITS;
let betIndex = parseInt(localStorage.getItem(storageKeys.bet) || '1', 10);
if (!Number.isFinite(betIndex) || betIndex < 0 || betIndex >= BETS.length) betIndex = 1;
let jackpot = parseInt(localStorage.getItem(storageKeys.jackpot) || '125000', 10);
if (!Number.isFinite(jackpot) || jackpot < 50000) jackpot = 125000;

let spinning = false;
let currentGrid = [];

const reelsEl = document.getElementById('reels');
const creditsEl = document.getElementById('creditsValue');
const betEl = document.getElementById('betValue');
const jackpotEl = document.getElementById('jackpotValue');
const statusBar = document.getElementById('statusBar');
const machineEl = document.querySelector('.machine');
const entryOverlay = document.getElementById('entryOverlay');
const winOverlay = document.getElementById('winOverlay');
const winTier = document.getElementById('winTier');
const winTitle = document.getElementById('winTitle');
const winAmount = document.getElementById('winAmount');

const weightedPool = SYMBOLS.flatMap(s => Array.from({length: s.weight}, () => s));
const fmt = n => new Intl.NumberFormat('en-US').format(n);
const byId = id => SYMBOLS.find(s => s.id === id);

function pickWeighted(){
  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

function saveState(){
  localStorage.setItem(storageKeys.credits, credits);
  localStorage.setItem(storageKeys.bet, betIndex);
  localStorage.setItem(storageKeys.jackpot, jackpot);
}

function updateHud(){
  creditsEl.textContent = fmt(credits);
  betEl.textContent = fmt(BETS[betIndex]);
  jackpotEl.textContent = fmt(jackpot);
}

function symbolCell(symbol){
  const cell = document.createElement('div');
  cell.className = 'symbol';
  const img = document.createElement('img');
  img.src = symbol.src;
  img.alt = '';
  img.loading = 'eager';
  cell.dataset.id = symbol.id;
  cell.appendChild(img);
  return cell;
}

function buildMachine(){
  reelsEl.innerHTML = '';
  for (let i = 0; i < REELS; i++){
    const windowEl = document.createElement('div');
    windowEl.className = 'reel-window';
    const strip = document.createElement('div');
    strip.className = 'reel-strip';
    windowEl.appendChild(strip);
    reelsEl.appendChild(windowEl);
  }
}

function randomGrid(){
  return Array.from({length: REELS}, () => Array.from({length: ROWS}, () => pickWeighted()));
}

function targetGrid(){
  const grid = randomGrid();
  const jackpotHit = Math.random() < 0.0012;
  const bigHit = Math.random() < 0.02;
  const regularHit = Math.random() < 0.13;
  const nearMiss = Math.random() < 0.34;

  if (jackpotHit){
    const sym = byId('vault');
    for (let c = 0; c < REELS; c++) grid[c][1] = sym;
    return grid;
  }

  if (bigHit){
    const ids = ['logo', 'crown', 'key', 'lock'];
    const sym = byId(ids[Math.floor(Math.random() * ids.length)]);
    const count = Math.random() < 0.55 ? 4 : 5;
    for (let c = 0; c < count; c++) grid[c][1] = sym;
    return grid;
  }

  if (regularHit){
    const sym = pickWeighted();
    const count = 3 + Math.floor(Math.random() * 2);
    for (let c = 0; c < count; c++) grid[c][1] = sym;
    return grid;
  }

  if (nearMiss){
    const sym = pickWeighted();
    for (let c = 0; c < 4; c++) grid[c][1] = sym;
    let miss = pickWeighted();
    if (miss.id === sym.id) miss = byId('speaker');
    grid[4][1] = miss;
  }

  return grid;
}

function evaluate(grid){
  let total = 0;
  const wins = [];
  payLines.forEach(line => {
    const first = grid[line[0][0]][line[0][1]];
    let count = 1;
    for (let i = 1; i < line.length; i++){
      const [c, r] = line[i];
      if (grid[c][r].id === first.id) count++;
      else break;
    }
    if (count >= 3){
      const amount = BETS[betIndex] * payByCount[count] + (bonusById[first.id] || 0);
      total += amount;
      wins.push({id:first.id, count, amount, cells: line.slice(0, count)});
    }
  });
  return { total, wins };
}

function clearHighlights(){
  document.querySelectorAll('.symbol.hit').forEach(n => n.classList.remove('hit'));
}

function highlight(result){
  clearHighlights();
  const strips = [...document.querySelectorAll('.reel-strip')];
  result.wins.forEach(win => {
    win.cells.forEach(([c, r]) => {
      const node = strips[c]?.children[r];
      if (node) node.classList.add('hit');
    });
  });
}

function renderFinalGrid(grid){
  const strips = [...document.querySelectorAll('.reel-strip')];
  strips.forEach((strip, c) => {
    strip.innerHTML = '';
    for (let r = 0; r < ROWS; r++) strip.appendChild(symbolCell(grid[c][r]));
    strip.style.transform = 'translateY(0)';
  });
}

function fillStrip(strip, symbols){
  strip.innerHTML = '';
  symbols.forEach(sym => strip.appendChild(symbolCell(sym)));
}

function message(text){
  statusBar.textContent = text;
}

function animateReel(strip, finalSymbols, reelIndex){
  return new Promise(resolve => {
    const cellH = CELL_HEIGHT();
    const lead = Array.from({length: 18 + reelIndex * 4}, () => pickWeighted());
    const full = lead.concat(finalSymbols);
    fillStrip(strip, full);

    let start = null;
    const duration = 850 + reelIndex * 190;
    const totalDistance = (lead.length) * cellH;

    function frame(ts){
      if (!start) start = ts;
      const elapsed = ts - start;
      const p = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const y = -(totalDistance * ease);
      strip.style.transform = `translateY(${y}px)`;
      if (p < 1){
        requestAnimationFrame(frame);
      } else {
        strip.style.transform = `translateY(${-totalDistance}px)`;
        setTimeout(() => {
          fillStrip(strip, finalSymbols);
          strip.style.transform = 'translateY(0)';
          resolve();
        }, 40);
      }
    }
    requestAnimationFrame(frame);
  });
}

async function spin(){
  if (spinning) return;
  const bet = BETS[betIndex];
  if (credits < bet){
    message('OUT OF CREDITS');
    return;
  }

  spinning = true;
  clearHighlights();
  credits -= bet;
  jackpot += Math.floor(bet * 0.12);
  updateHud();
  message('SPINNING');

  const target = targetGrid();
  const strips = [...document.querySelectorAll('.reel-strip')];

  await Promise.all(strips.map((strip, idx) => animateReel(strip, target[idx], idx)));
  currentGrid = target;

  const result = evaluate(currentGrid);
  if (result.total > 0){
    credits += result.total;
    jackpot = Math.max(50000, jackpot - Math.floor(result.total * 0.35));
    updateHud();
    highlight(result);
    machineEl.classList.remove('flash');
    void machineEl.offsetWidth;
    machineEl.classList.add('flash');

    const biggest = [...result.wins].sort((a,b) => b.amount - a.amount)[0];
    winTier.textContent = biggest.count === 5 ? 'BIG WIN' : 'WIN';
    winTitle.textContent = biggest.id === 'vault' ? 'ACCESS GRANTED' : 'CAPO HIT';
    winAmount.textContent = '+' + fmt(result.total);
    winOverlay.classList.add('show');
    winOverlay.setAttribute('aria-hidden', 'false');
    message(biggest.id === 'vault' ? 'ACCESS GRANTED' : 'WIN');
  } else {
    message('NO HIT');
  }

  saveState();
  spinning = false;
}

document.getElementById('spinBtn').addEventListener('click', spin);
document.getElementById('betDown').addEventListener('click', () => {
  if (spinning) return;
  betIndex = (betIndex - 1 + BETS.length) % BETS.length;
  updateHud();
  saveState();
});
document.getElementById('betUp').addEventListener('click', () => {
  if (spinning) return;
  betIndex = (betIndex + 1) % BETS.length;
  updateHud();
  saveState();
});
document.getElementById('enterBtn').addEventListener('click', () => {
  entryOverlay.classList.add('hide');
});
document.getElementById('closeWinBtn').addEventListener('click', () => {
  winOverlay.classList.remove('show');
  winOverlay.setAttribute('aria-hidden', 'true');
});

buildMachine();
currentGrid = randomGrid();
renderFinalGrid(currentGrid);
updateHud();
message('READY');
