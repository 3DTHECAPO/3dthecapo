const STARTING_CREDITS = 1000;
const BETS = [25, 50, 100, 250];
const STORAGE_KEY = 'play3d_production_v1';

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
  {id:'logo',src:'assets/logo.png',kind:'logo',weight:2,payout:50}
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
  message: document.getElementById('messageBar')
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      return {
        credits: Number.isFinite(parsed.credits) ? parsed.credits : STARTING_CREDITS,
        betIndex: Number.isInteger(parsed.betIndex) ? Math.max(0, Math.min(BETS.length - 1, parsed.betIndex)) : 0,
        jackpot: Number.isFinite(parsed.jackpot) ? parsed.jackpot : 125000,
        lastWin: Number.isFinite(parsed.lastWin) ? parsed.lastWin : 0
      };
    }
  }catch(e){}
  return { credits: STARTING_CREDITS, betIndex: 0, jackpot: 125000, lastWin: 0 };
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pickSymbol(){
  const total = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let target = Math.random() * total;
  for(const symbol of SYMBOLS){
    target -= symbol.weight;
    if(target <= 0) return symbol;
  }
  return SYMBOLS[0];
}

function buildBoard(){
  return Array.from({length: 3}, () => Array.from({length: 5}, () => pickSymbol()));
}

function makeCell(symbol){
  const cell = document.createElement('div');
  cell.className = 'cell ' + symbol.kind + (symbol.kind === 'object' ? ' object' : '');

  const frame = document.createElement('div');
  frame.className = 'cellFrame';

  const img = document.createElement('img');
  img.src = symbol.src;
  img.alt = '';

  frame.appendChild(img);
  cell.appendChild(frame);
  return cell;
}

function renderBoard(board){
  els.reels.innerHTML = '';
  for(let col = 0; col < 5; col++){
    const reel = document.createElement('div');
    reel.className = 'reel';
    for(let row = 0; row < 3; row++){
      reel.appendChild(makeCell(board[row][col]));
    }
    els.reels.appendChild(reel);
  }
}

function updateUi(status = 'READY', message = ''){
  els.credits.textContent = state.credits.toLocaleString();
  els.bet.textContent = BETS[state.betIndex].toLocaleString();
  els.lastWin.textContent = state.lastWin.toLocaleString();
  els.status.textContent = status;
  els.jackpot.textContent = Math.round(state.jackpot).toLocaleString();
  els.message.textContent = message;
}

function evaluate(board){
  const bet = BETS[state.betIndex];
  let total = 0;
  const lines = [board[0], board[1], board[2]];

  for(const line of lines){
    const counts = {};
    line.forEach(symbol => {
      counts[symbol.id] = (counts[symbol.id] || 0) + 1;
    });

    for(const symbol of SYMBOLS){
      const count = counts[symbol.id] || 0;
      if(count >= 3){
        const mult = count === 5 ? symbol.payout * 2 : count === 4 ? symbol.payout * 1.4 : symbol.payout;
        total += Math.round(bet * mult);
      }
    }
  }
  return total;
}

function spinOnce(){
  if(spinning) return;

  const bet = BETS[state.betIndex];
  if(state.credits < bet){
    updateUi('NO CREDITS', 'OUT OF CREDITS');
    return;
  }

  spinning = true;
  state.credits -= bet;
  state.jackpot += Math.round(bet * 0.35);
  state.lastWin = 0;
  updateUi('SPINNING', '');

  const liveReels = Array.from(document.querySelectorAll('.reel'));
  const timers = liveReels.map((reel, index) => setInterval(() => {
    reel.innerHTML = '';
    for(let row = 0; row < 3; row++){
      reel.appendChild(makeCell(pickSymbol()));
    }
  }, 88 + index * 18));

  setTimeout(() => {
    const finalBoard = buildBoard();
    timers.forEach((timer, index) => setTimeout(() => clearInterval(timer), index * 140));

    setTimeout(() => {
      renderBoard(finalBoard);
      const win = evaluate(finalBoard);
      state.lastWin = win;
      if(win > 0){
        state.credits += win;
        updateUi('WIN', 'WON ' + win.toLocaleString());
      }else{
        updateUi('READY', '');
      }
      saveState();
      spinning = false;
    }, 620);
  }, 520);
}

document.getElementById('downBetBtn').addEventListener('click', () => {
  if(spinning) return;
  state.betIndex = Math.max(0, state.betIndex - 1);
  saveState();
  updateUi();
});

document.getElementById('upBetBtn').addEventListener('click', () => {
  if(spinning) return;
  state.betIndex = Math.min(BETS.length - 1, state.betIndex + 1);
  saveState();
  updateUi();
});

document.getElementById('spinBtn').addEventListener('click', spinOnce);
document.getElementById('leverBtn').addEventListener('click', spinOnce);

document.getElementById('autoBtn').addEventListener('click', () => {
  let spinsLeft = 10;

  const run = () => {
    if(spinsLeft <= 0 || spinning || state.credits < BETS[state.betIndex]) return;
    spinOnce();
    spinsLeft -= 1;

    const wait = setInterval(() => {
      if(!spinning){
        clearInterval(wait);
        run();
      }
    }, 120);
  };

  run();
});

renderBoard(buildBoard());
updateUi();
