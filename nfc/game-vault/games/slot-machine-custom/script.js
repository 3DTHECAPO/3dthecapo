(() => {
  const symbols = ['💎', '👑', '💰', '🎵', '7'];
  const payouts = {
    '💎': 10,
    '👑': 8,
    '💰': 6,
    '🎵': 5,
    '7': 12
  };

  let balance = 1000;
  let jackpot = 5000;
  let bet = 50;
  let spinning = false;

  const reelEls = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
  ];

  const balanceDisplay = document.getElementById('balanceDisplay');
  const jackpotDisplay = document.getElementById('jackpotDisplay');
  const betDisplay = document.getElementById('betDisplay');
  const messageBox = document.getElementById('messageBox');
  const spinBtn = document.getElementById('spinBtn');
  const betUpBtn = document.getElementById('betUpBtn');
  const betDownBtn = document.getElementById('betDownBtn');

  function formatNum(value) {
    return String(value);
  }

  function updateUI() {
    balanceDisplay.textContent = formatNum(balance);
    jackpotDisplay.textContent = formatNum(jackpot);
    betDisplay.textContent = formatNum(bet);
    spinBtn.disabled = spinning || balance < bet;
    betDownBtn.disabled = spinning || bet <= 10;
    betUpBtn.disabled = spinning || bet >= 200 || balance < bet + 10;
  }

  function setMessage(text, state = '') {
    messageBox.textContent = text;
    messageBox.className = 'message-box' + (state ? ' ' + state : '');
  }

  function randomSymbol() {
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function evaluate(result) {
    const [a, b, c] = result;
    const counts = {};
    result.forEach(s => counts[s] = (counts[s] || 0) + 1);

    if (a === b && b === c) {
      const mult = payouts[a] || 4;
      const win = bet * mult;
      balance += win;
      if (a === '7') {
        balance += jackpot;
        setMessage(`JACKPOT! 777 hit for ${win + jackpot}!`, 'jackpot');
        jackpot = 5000;
      } else {
        setMessage(`BIG WIN! ${a}${a}${a} paid ${win}.`, 'win');
        jackpot += Math.floor(bet * 0.2);
      }
      return;
    }

    const pair = Object.values(counts).some(count => count === 2);
    if (pair) {
      const win = bet * 2;
      balance += win;
      jackpot += Math.floor(bet * 0.35);
      setMessage(`Nice hit. Two matched for ${win}.`, 'win');
      return;
    }

    jackpot += Math.floor(bet * 0.5);
    setMessage(`No hit. Vault grows to ${jackpot}.`, 'lose');
  }

  function animateSpin(finalSymbols) {
    spinning = true;
    updateUI();
    setMessage('Spinning the reels...', '');

    reelEls.forEach(el => el.classList.add('spinning'));

    reelEls.forEach((el, index) => {
      const interval = setInterval(() => {
        el.textContent = randomSymbol();
      }, 90);

      setTimeout(() => {
        clearInterval(interval);
        el.textContent = finalSymbols[index];
        el.classList.remove('spinning');

        if (index === reelEls.length - 1) {
          spinning = false;
          evaluate(finalSymbols);
          updateUI();
        }
      }, 900 + index * 450);
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
