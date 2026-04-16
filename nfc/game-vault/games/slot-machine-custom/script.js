const symbols = [
  { icon: '💰', weight: 5, name: 'Money' },
  { icon: '👑', weight: 3, name: 'Crown' },
  { icon: '💎', weight: 4, name: 'Diamond' },
  { icon: '7️⃣', weight: 1, name: 'Seven' },
  { icon: '🔥', weight: 4, name: 'Fire' },
  { icon: '🎤', weight: 3, name: 'Mic' }
];

const reels = [
  document.getElementById('reel1'),
  document.getElementById('reel2'),
  document.getElementById('reel3')
];
const balanceEl = document.getElementById('balance');
const betDisplayEl = document.getElementById('betDisplay');
const jackpotEl = document.getElementById('jackpot');
const messageEl = document.getElementById('message');
const spinBtn = document.getElementById('spinBtn');
const betUpBtn = document.getElementById('betUp');
const betDownBtn = document.getElementById('betDown');
const chips = [...document.querySelectorAll('.chip')];

let balance = 1000;
let bet = 25;
let jackpot = 5000;
let spinning = false;

function weightedPick() {
  const total = symbols.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * total;
  for (const symbol of symbols) {
    roll -= symbol.weight;
    if (roll <= 0) return symbol;
  }
  return symbols[0];
}

function setMessage(text, type='') {
  messageEl.textContent = text;
  messageEl.className = 'message' + (type ? ` ${type}` : '');
}

function format(num) {
  return Math.max(0, Math.floor(num)).toLocaleString();
}

function updateUI() {
  balanceEl.textContent = format(balance);
  betDisplayEl.textContent = format(bet);
  jackpotEl.textContent = format(jackpot);
  chips.forEach(chip => chip.classList.toggle('active', Number(chip.dataset.bet) === bet));
  betDownBtn.disabled = spinning || bet <= 25;
  betUpBtn.disabled = spinning || bet >= 250;
  spinBtn.disabled = spinning || balance < bet;
}

function payoutFor(result) {
  const icons = result.map(r => r.icon);
  const allSame = icons.every(i => i === icons[0]);
  const sevens = icons.filter(i => i === '7️⃣').length;
  const crowns = icons.filter(i => i === '👑').length;

  if (allSame && icons[0] === '7️⃣') {
    return { amount: jackpot, text: 'JACKPOT HIT — 7️⃣7️⃣7️⃣! THE VAULT BURST OPEN.', type: 'win', resetJackpot: true };
  }
  if (allSame && icons[0] === '👑') {
    return { amount: bet * 15, text: 'CROWN SWEEP — premium hit.', type: 'win' };
  }
  if (allSame && icons[0] === '💎') {
    return { amount: bet * 12, text: 'DIAMOND LINE — icy payout.', type: 'win' };
  }
  if (allSame && icons[0] === '💰') {
    return { amount: bet * 10, text: 'MONEY BAGS — bankroll up.', type: 'win' };
  }
  if (allSame) {
    return { amount: bet * 7, text: `${result[0].name.toUpperCase()} MATCH — clean hit.`, type: 'win' };
  }
  if (sevens === 2) {
    return { amount: bet * 3, text: 'DOUBLE 7 BONUS.', type: 'win' };
  }
  if (crowns === 2) {
    return { amount: bet * 2, text: 'DOUBLE CROWN BONUS.', type: 'win' };
  }
  return { amount: 0, text: 'No hit. Spin again.', type: 'lose' };
}

function animateSpin(finalResult) {
  return Promise.all(reels.map((reel, idx) => {
    reel.classList.add('spinning');
    return new Promise(resolve => {
      const interval = setInterval(() => {
        reel.textContent = symbols[Math.floor(Math.random() * symbols.length)].icon;
      }, 80);

      const stopDelay = 850 + idx * 380;
      setTimeout(() => {
        clearInterval(interval);
        reel.classList.remove('spinning');
        reel.textContent = finalResult[idx].icon;
        resolve();
      }, stopDelay);
    });
  }));
}

async function spin() {
  if (spinning || balance < bet) return;
  spinning = true;
  balance -= bet;
  jackpot += Math.round(bet * 0.25);
  setMessage('The vault is spinning...', '');
  updateUI();

  const result = [weightedPick(), weightedPick(), weightedPick()];
  await animateSpin(result);

  const payout = payoutFor(result);
  if (payout.amount > 0) {
    balance += payout.amount;
  }
  if (payout.resetJackpot) {
    jackpot = 5000;
  }

  setMessage(`${payout.text} ${payout.amount > 0 ? `+${format(payout.amount)}` : ''}`.trim(), payout.type);

  if (balance < 25) {
    setMessage('Balance too low. Refresh or add your own wallet logic later.', 'lose');
  }

  spinning = false;
  updateUI();
}

spinBtn.addEventListener('click', spin);
betUpBtn.addEventListener('click', () => {
  bet = Math.min(250, bet + 25);
  updateUI();
});
betDownBtn.addEventListener('click', () => {
  bet = Math.max(25, bet - 25);
  updateUI();
});
chips.forEach(chip => chip.addEventListener('click', () => {
  if (spinning) return;
  bet = Number(chip.dataset.bet);
  updateUI();
}));

updateUI();
