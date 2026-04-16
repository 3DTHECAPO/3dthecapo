const assetBase = './assets/';
const symbolDefs = [
  { key: 'logo', label: 'Capo', file: 'logo.png', glyph: '♛', weight: 1 },
  { key: 'vault', label: 'Vault', file: 'vault.png', glyph: '⬢', weight: 2 },
  { key: 'cover1', label: 'Track I', file: 'cover1.jpg', glyph: '♫', weight: 4 },
  { key: 'cover2', label: 'Track II', file: 'cover2.jpg', glyph: '♫', weight: 4 },
  { key: 'cover3', label: 'Track III', file: 'cover3.jpg', glyph: '♫', weight: 4 },
  { key: 'merch1', label: 'Merch', file: 'merch1.jpg', glyph: '⬒', weight: 3 },
  { key: 'merch2', label: 'Drop', file: 'merch2.jpg', glyph: '⬒', weight: 3 },
  { key: 'cash', label: 'Cash', file: 'cash.png', glyph: '$', weight: 5 },
  { key: 'speaker', label: 'Speaker', file: 'speaker.png', glyph: '◉', weight: 3 },
  { key: 'key', label: 'Key', file: 'key.png', glyph: '✦', weight: 1 },
  { key: 'crown', label: 'Crown', file: 'crown.png', glyph: '♕', weight: 2 },
];

const visibleRows = 3;
const reelCount = 5;
const symbolHeightDesktop = 130;
const symbolHeightMobile = 108;
const reelViewHeightDesktop = 390;
const reelViewHeightMobile = 330;
const reelBuffer = 18;
const paylines = [
  [0,0,0,0,0],
  [1,1,1,1,1],
  [2,2,2,2,2]
];

const state = {
  credits: 2500,
  bet: 25,
  spinning: false,
  jackpot: 125000,
  reels: [],
  resultGrid: [],
};

const els = {
  reels: document.getElementById('reels'),
  spinBtn: document.getElementById('spinBtn'),
  betUpBtn: document.getElementById('betUpBtn'),
  betDownBtn: document.getElementById('betDownBtn'),
  maxBetBtn: document.getElementById('maxBetBtn'),
  resetBtn: document.getElementById('resetBtn'),
  creditsValue: document.getElementById('creditsValue'),
  betValue: document.getElementById('betValue'),
  jackpotValue: document.getElementById('jackpotValue'),
  lastWinValue: document.getElementById('lastWinValue'),
  feedText: document.getElementById('feedText'),
  intro: document.getElementById('intro'),
  enterBtn: document.getElementById('enterBtn'),
  winOverlay: document.getElementById('winOverlay'),
  closeWinBtn: document.getElementById('closeWinBtn'),
  winTier: document.getElementById('winTier'),
  winText: document.getElementById('winText'),
  winAmount: document.getElementById('winAmount'),
};

function weightedPick() {
  const pool = symbolDefs.flatMap(s => Array(s.weight).fill(s));
  return pool[Math.floor(Math.random() * pool.length)];
}

function symbolHeight() {
  return window.innerWidth <= 760 ? symbolHeightMobile : symbolHeightDesktop;
}

function reelViewHeight() {
  return window.innerWidth <= 760 ? reelViewHeightMobile : reelViewHeightDesktop;
}

function symbolTemplate(def) {
  return `
    <div class="symbol" data-key="${def.key}">
      <div class="symbol-inner">
        <img src="${assetBase}${def.file}" alt="${def.label}" onerror="this.closest('.symbol').classList.add('fallback'); this.remove();">
        <div class="symbol-glyph">${def.glyph}</div>
        <div class="symbol-label">${def.label}</div>
      </div>
    </div>`;
}

function buildReels() {
  els.reels.innerHTML = '';
  state.reels = [];
  for (let i = 0; i < reelCount; i++) {
    const reel = document.createElement('div');
    reel.className = 'reel';
    const strip = document.createElement('div');
    strip.className = 'reel-strip';
    reel.appendChild(strip);
    els.reels.appendChild(reel);
    state.reels.push({ reel, strip, currentSymbols: [] });
  }
  renderIdleGrid();
}

function renderIdleGrid() {
  const grid = Array.from({ length: visibleRows }, () => Array.from({ length: reelCount }, weightedPick));
  setGrid(grid, false);
}

function setGrid(grid, animated = false) {
  state.resultGrid = grid;
  const symH = symbolHeight();
  state.reels.forEach((entry, reelIndex) => {
    const stripSymbols = [];
    for (let i = 0; i < reelBuffer; i++) stripSymbols.push(weightedPick());
    stripSymbols.push(...grid.map(row => row[reelIndex]));
    for (let i = 0; i < reelBuffer; i++) stripSymbols.push(weightedPick());
    entry.currentSymbols = stripSymbols;
    entry.strip.innerHTML = stripSymbols.map(symbolTemplate).join('');
    entry.strip.style.transition = 'none';
    const finalOffset = -(reelBuffer * (symH + 12));
    entry.strip.style.transform = `translateY(${finalOffset}px)`;
    if (animated) {
      entry.strip.style.transition = '';
    }
  });
}

function updateUI(lastWin = 0) {
  els.creditsValue.textContent = state.credits.toLocaleString();
  els.betValue.textContent = state.bet.toLocaleString();
  els.jackpotValue.textContent = state.jackpot.toLocaleString();
  els.lastWinValue.textContent = lastWin.toLocaleString();
}

function clampBet() {
  if (state.bet < 25) state.bet = 25;
  if (state.bet > 250) state.bet = 250;
}

function message(text) {
  els.feedText.textContent = text;
}

function generateResult() {
  const modeRoll = Math.random();
  const grid = Array.from({ length: visibleRows }, () => Array.from({ length: reelCount }, weightedPick));

  let mode = 'lose';
  if (modeRoll < 0.0008) mode = 'jackpot';
  else if (modeRoll < 0.0038) mode = 'merch';
  else if (modeRoll < 0.0138) mode = 'rare';
  else if (modeRoll < 0.0438) mode = 'medium';
  else if (modeRoll < 0.1638) mode = 'small';
  else if (modeRoll < 0.44) mode = 'near';

  const paylineIndex = Math.floor(Math.random() * 3);
  const row = paylines[paylineIndex][0];

  if (mode === 'small') {
    const s = [weightedPick(), weightedPick(), weightedPick()].map(x => x);
    grid[row][0] = s[0]; grid[row][1] = s[0]; grid[row][2] = s[0];
  }
  if (mode === 'medium') {
    const target = symbolDefs.find(s => ['cover1','cover2','cover3','speaker'].includes(s.key)) || weightedPick();
    grid[row][0] = target; grid[row][1] = target; grid[row][2] = target;
  }
  if (mode === 'rare') {
    const target = symbolDefs.find(s => ['crown','vault','logo'].includes(s.key)) || weightedPick();
    grid[row][0] = target; grid[row][1] = target; grid[row][2] = target;
  }
  if (mode === 'merch') {
    const target = symbolDefs.find(s => ['merch1','merch2','key'].includes(s.key)) || weightedPick();
    grid[row][0] = target; grid[row][1] = target; grid[row][2] = target;
  }
  if (mode === 'jackpot') {
    const target = symbolDefs.find(s => s.key === 'logo') || weightedPick();
    grid[row][0] = target; grid[row][1] = target; grid[row][2] = target; grid[row][3] = target; grid[row][4] = target;
  }
  if (mode === 'near') {
    const target = weightedPick();
    grid[row][0] = target; grid[row][1] = target; grid[row][2] = target;
    const almost = symbolDefs.find(s => s.key !== target.key) || weightedPick();
    grid[row][3] = almost;
  }

  return { grid, mode };
}

function evaluateGrid(grid) {
  let best = { amount: 0, tier: 'MISS', text: 'NO WIN' };
  for (const line of paylines) {
    const row = line[0];
    const symbols = grid[row];
    let count = 1;
    for (let i = 1; i < symbols.length; i++) {
      if (symbols[i].key === symbols[0].key) count++; else break;
    }
    if (count >= 3) {
      const key = symbols[0].key;
      let amount = state.bet * 3;
      let tier = 'WIN';
      let text = `${symbols[0].label.toUpperCase()} HIT`;
      if (['cover1','cover2','cover3','speaker'].includes(key)) { amount = state.bet * 8; tier = 'MUSIC'; text = 'TRACK UNLOCK TIER'; }
      if (['merch1','merch2','key'].includes(key)) { amount = state.bet * 18; tier = 'MERCH'; text = 'MERCH REWARD TIER'; }
      if (['crown','vault'].includes(key)) { amount = state.bet * 22; tier = 'BIG WIN'; text = 'VAULT ACCESS TIER'; }
      if (key === 'logo') { amount = count === 5 ? state.bet * 160 : state.bet * 40; tier = count === 5 ? 'JACKPOT' : 'ELITE'; text = count === 5 ? 'ACCESS GRANTED' : 'CAPO ELITE HIT'; }
      if (count === 4 && tier === 'WIN') amount = state.bet * 6;
      if (count === 5 && tier === 'WIN') amount = state.bet * 12;
      if (amount > best.amount) best = { amount, tier, text };
    }
  }
  return best;
}

function spin() {
  if (state.spinning) return;
  if (state.credits < state.bet) {
    message('Not enough credits. Reset the machine.');
    return;
  }
  state.spinning = true;
  els.spinBtn.disabled = true;
  state.credits -= state.bet;
  state.jackpot += Math.floor(state.bet * 0.25);
  updateUI(0);
  message('Reels spinning...');

  const { grid, mode } = generateResult();
  const symH = symbolHeight() + 12;

  state.reels.forEach((entry, idx) => {
    const stripSymbols = [];
    for (let i = 0; i < reelBuffer + 8 + idx * 2; i++) stripSymbols.push(weightedPick());
    stripSymbols.push(...grid.map(row => row[idx]));
    for (let i = 0; i < 6; i++) stripSymbols.push(weightedPick());
    entry.currentSymbols = stripSymbols;
    entry.strip.innerHTML = stripSymbols.map(symbolTemplate).join('');
    entry.strip.style.transition = 'none';
    entry.strip.style.transform = 'translateY(0px)';
    entry.strip.getBoundingClientRect();
    const finalIndex = stripSymbols.length - 6 - visibleRows;
    const offset = -(finalIndex * symH);
    const duration = 1200 + idx * 350;
    entry.strip.style.transition = `transform ${duration}ms cubic-bezier(.12,.88,.18,1)`;
    requestAnimationFrame(() => {
      entry.strip.style.transform = `translateY(${offset}px)`;
    });
  });

  const totalDuration = 1200 + (reelCount - 1) * 350 + 120;
  setTimeout(() => {
    const result = evaluateGrid(grid);
    state.credits += result.amount;
    if (result.tier === 'JACKPOT') {
      state.credits += Math.floor(state.jackpot * 0.02);
      state.jackpot = 125000;
    }
    updateUI(result.amount);
    state.resultGrid = grid;
    state.spinning = false;
    els.spinBtn.disabled = false;

    if (result.amount > 0) {
      document.body.classList.add('win-flash');
      setTimeout(() => document.body.classList.remove('win-flash'), 1000);
      showWin(result);
      message(`${result.text} — ${mode === 'jackpot' ? 'rare hit' : 'payout confirmed'}.`);
    } else {
      message(mode === 'near' ? 'Near miss. Vault almost opened.' : 'Miss. Spin again.');
    }
  }, totalDuration);
}

function showWin(result) {
  els.winTier.textContent = result.tier;
  els.winText.textContent = result.text;
  els.winAmount.textContent = `+${result.amount.toLocaleString()}`;
  els.winOverlay.classList.add('show');
  els.winOverlay.setAttribute('aria-hidden', 'false');
}

function hideWin() {
  els.winOverlay.classList.remove('show');
  els.winOverlay.setAttribute('aria-hidden', 'true');
}

function resetMachine() {
  state.credits = 2500;
  state.bet = 25;
  state.jackpot = 125000;
  updateUI(0);
  renderIdleGrid();
  message('System reset. Press spin.');
}

function bind() {
  els.spinBtn.addEventListener('click', spin);
  els.betUpBtn.addEventListener('click', () => { if (!state.spinning) { state.bet += 25; clampBet(); updateUI(0); } });
  els.betDownBtn.addEventListener('click', () => { if (!state.spinning) { state.bet -= 25; clampBet(); updateUI(0); } });
  els.maxBetBtn.addEventListener('click', () => { if (!state.spinning) { state.bet = 250; updateUI(0); } });
  els.resetBtn.addEventListener('click', () => { if (!state.spinning) resetMachine(); });
  els.enterBtn.addEventListener('click', () => els.intro.classList.remove('show'));
  els.closeWinBtn.addEventListener('click', hideWin);
  els.winOverlay.addEventListener('click', (e) => { if (e.target === els.winOverlay) hideWin(); });
  window.addEventListener('resize', renderIdleGrid);
}

buildReels();
updateUI(0);
bind();
message('System ready. Press spin.');
