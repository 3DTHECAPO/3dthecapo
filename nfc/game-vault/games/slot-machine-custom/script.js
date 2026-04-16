(() => {
  const symbols = ['👑', '💎', '💰', '🎵', '7', '🪙'];
  const payouts = {
    '👑': 10,
    '💎': 8,
    '💰': 6,
    '🎵': 5,
    '🪙': 4,
    '7': 12
  };

  let balance = 1000;
  let jackpot = 5000;
  let bet = 50;
  let spinning = false;
  let streak = 0;

  const reelEls = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
  ];
  const reelWindows = reelEls.map((el) => el.parentElement);

  const balanceDisplay = document.getElementById('balanceDisplay');
  const jackpotDisplay = document.getElementById('jackpotDisplay');
  const betDisplay = document.getElementById('betDisplay');
  const messageBox = document.getElementById('messageBox');
  const spinBtn = document.getElementById('spinBtn');
  const betUpBtn = document.getElementById('betUpBtn');
  const betDownBtn = document.getElementById('betDownBtn');
  const statusPill = document.getElementById('statusPill');
  const heatMeter = document.getElementById('heatMeter');
  const luckMeter = document.getElementById('luckMeter');

  function fmt(value) {
    return value.toLocaleString('en-US');
  }

  function randomSymbol() {
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function updateMeters() {
    const heat = Math.min(100, 25 + (bet / 2));
    const luck = Math.min(100, 35 + (streak * 10) + (jackpot / 200));
    heatMeter.style.width = `${heat}%`;
    luckMeter.style.width = `${luck}%`;
  }

  function updateUI() {
    balanceDisplay.textContent = fmt(balance);
    jackpotDisplay.textContent = fmt(jackpot);
    betDisplay.textContent = fmt(bet);

    spinBtn.disabled = spinning || balance < bet;
    betDownBtn.disabled = spinning || bet <= 10;
    betUpBtn.disabled = spinning || bet >= 200 || balance < bet + 10;

    if (spinning) {
      statusPill.textContent = 'SPINNING';
    } else if (balance < bet) {
      statusPill.textContent = 'LOW CREDITS';
    } else {
      statusPill.textContent = 'VAULT LIVE';
    }

    updateMeters();
  }

  function setMessage(text, state = '') {
    messageBox.textContent = text;
    messageBox.className = `message-box${state ? ` ${state}` : ''}`;
  }

  function clearWinRings() {
    reelWindows.forEach((win) => win.classList.remove('win-ring'));
  }

  function flashWin(result) {
    clearWinRings();
    const allSame = result[0] === result[1] && result[1] === result[2];
    if (allSame) {
      reelWindows.forEach((win) => win.classList.add('win-ring'));
      return;
    }

    const counts = {};
    result.forEach((sym) => { counts[sym] = (counts[sym] || 0) + 1; });
    const pairSymbol = Object.keys(counts).find((key) => counts[key] >= 2);
    if (!pairSymbol) return;

    result.forEach((sym, idx) => {
      if (sym === pairSymbol) reelWindows[idx].classList.add('win-ring');
    });
  }

  function evaluate(result) {
    const [a, b, c] = result;
    const counts = {};
    result.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });

    if (a === b && b === c) {
      const mult = payouts[a] || 4;
      const win = bet * mult;
      balance += win;
      streak += 1;
      flashWin(result);

      if (a === '7') {
        const jackpotTake = jackpot;
        balance += jackpotTake;
        jackpot = 5000;
        setMessage(`JACKPOT HIT. 777 cracked the vault for ${fmt(win + jackpotTake)}.`, 'jackpot');
      } else {
        jackpot += Math.floor(bet * 0.25);
        setMessage(`BIG WIN. ${a}${a}${a} paid ${fmt(win)}.`, 'win');
      }
      return;
    }

    const hasPair = Object.values(counts).some((count) => count === 2);
    if (hasPair) {
      const win = bet * 2;
      balance += win;
      jackpot += Math.floor(bet * 0.4);
      streak += 1;
      flashWin(result);
      setMessage(`Nice hit. Matching pair paid ${fmt(win)}.`, 'win');
      return;
    }

    streak = 0;
    clearWinRings();
    jackpot += Math.floor(bet * 0.6);
    setMessage(`No hit. The vault jackpot climbed to ${fmt(jackpot)}.`, 'lose');
  }

  function animateSpin(finalSymbols) {
    spinning = true;
    clearWinRings();
    updateUI();
    setMessage('Vault reels spinning...', '');

    reelEls.forEach((el) => el.classList.add('spinning'));

    reelEls.forEach((el, index) => {
      const interval = setInterval(() => {
        el.textContent = randomSymbol();
      }, 85);

      setTimeout(() => {
        clearInterval(interval);
        el.textContent = finalSymbols[index];
        el.classList.remove('spinning');

        if (index === reelEls.length - 1) {
          spinning = false;
          evaluate(finalSymbols);
          updateUI();
        }
      }, 950 + index * 420);
    });
  }

  spinBtn.addEventListener('click', () => {
    if (spinning || balance < bet) return;
    balance -= bet;
    const finalSymbols = [randomSymbol(), randomSymbol(), randomSymbol()];
    animateSpin(finalSymbols);
    updateUI();
  });

  betUpBtn.addEventListener('click', () => {
    if (spinning) return;
    bet = Math.min(200, bet + 10);
    updateUI();
  });

  betDownBtn.addEventListener('click', () => {
    if (spinning) return;
    bet = Math.max(10, bet - 10);
    updateUI();
  });

  updateUI();
})();
