(()=>{
  'use strict';

  const bank = window.Play3DGameBank;
  const SYMBOLS = [
    {id:'crown', label:'CROWN', img:'./assets/symbols/crown.svg', pay:18},
    {id:'vault', label:'VAULT', img:'./assets/symbols/vault.svg', pay:16},
    {id:'moneybag', label:'MONEY BAG', img:'./assets/symbols/moneybag.svg', pay:14},
    {id:'diamond', label:'DIAMOND', img:'./assets/symbols/diamond.svg', pay:22},
    {id:'mic', label:'MIC', img:'./assets/symbols/mic.svg', pay:10},
    {id:'chain', label:'CHAIN', img:'./assets/symbols/chain.svg', pay:8},
    {id:'chips', label:'CHIPS', img:'./assets/symbols/chips.svg', pay:12},
    {id:'goldbars', label:'GOLD BARS', img:'./assets/symbols/goldbars.svg', pay:20},
    {id:'play3d', label:'PLAY 3D', img:'./assets/symbols/play3d.svg', pay:30}
  ];

  let creditsVal = bank ? bank.getCredits() : 1000;
  let betVal = 25;
  let spinning = false;
  const reels = [r1,r2,r3,r4,r5,r6,r7,r8,r9];

  function save(){
    if(bank) bank.setCredits(creditsVal);
  }

  function jackpotValue(){
    return bank ? bank.getJackpot() : 5000;
  }

  function randomSymbol(){
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function setReel(el, symbol){
    const img = el.querySelector('img') || document.createElement('img');
    img.alt = symbol.label;
    img.src = symbol.img;
    img.draggable = false;
    if(!img.parentNode) el.appendChild(img);
    el.dataset.symbol = symbol.id;
    el.dataset.label = symbol.label;
  }

  function render(){
    creditsVal = Math.max(0, Math.floor(creditsVal));
    credits.textContent = creditsVal;
    bet.textContent = betVal;
    jackpot.textContent = jackpotValue();
    mainScore.textContent = creditsVal;
    spinBtn.disabled = spinning || creditsVal < betVal;
    betDownBtn.disabled = spinning || betVal <= 25;
    betUpBtn.disabled = spinning || betVal >= 250 || betVal + 25 > creditsVal;
  }

  const PAYLINES = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,4,8], [2,4,6]
  ];

  function score(result){
    let best = {label:'NO WIN', amount:0};
    for(const line of PAYLINES){
      const combo = line.map(i => result[i]);
      const same = combo.every(s => s.id === combo[0].id);
      const pair = combo[0].id === combo[1].id || combo[1].id === combo[2].id || combo[0].id === combo[2].id;
      if(same){
        const mult = combo[0].pay * (line[1] === 4 ? 1.5 : 1);
        const amount = Math.floor(betVal * mult);
        if(amount > best.amount) best = {label:combo[0].label + ' LINE HIT', amount};
      }else if(pair){
        const amount = betVal * 2;
        if(amount > best.amount) best = {label:'PAIR HIT', amount};
      }
    }

    const allSame = result.every(s => s.id === result[0].id);
    if(allSame){
      return {label:'FULL SCREEN JACKPOT', amount:bank ? bank.claimJackpot() : betVal * 100};
    }
    return best;
  }

  function finishSpin(result){
    result.forEach((value, i)=>setReel(reels[i], value));
    reels.forEach(r=>r.classList.remove('spinning'));
    const win = score(result);
    creditsVal += win.amount;
    lastWin.textContent = win.amount;
    stateText.textContent = win.label;
    resultLine.textContent = win.amount ? win.label + ' pays ' + win.amount + ' credits.' : 'No win. Pull again.';
    spinning = false;
    playAgainBtn.hidden = false;
    save();
    render();
  }

  function spin(){
    if(spinning) return;
    creditsVal = bank ? bank.getCredits() : creditsVal;
    if(creditsVal < betVal){
      stateText.textContent = 'NO CREDITS';
      resultLine.textContent = 'Not enough credits for this bet.';
      render();
      return;
    }
    spinning = true;
    creditsVal -= betVal;
    if(bank) bank.addJackpot(Math.ceil(betVal * 0.2));
    lastWin.textContent = '0';
    stateText.textContent = 'SPINNING';
    resultLine.textContent = 'Nine reel windows spinning...';
    playAgainBtn.hidden = true;
    spinBtn.classList.add('pulled');
    reels.forEach(r=>r.classList.add('spinning'));
    save();
    render();

    let ticks = 0;
    const interval = setInterval(()=>{
      reels.forEach(r=>setReel(r, randomSymbol()));
      ticks++;
      if(ticks >= 18){
        clearInterval(interval);
        spinBtn.classList.remove('pulled');
        finishSpin(reels.map(()=>randomSymbol()));
      }
    }, 80);
  }

  betDownBtn.addEventListener('click', ()=>{
    if(spinning) return;
    betVal = Math.max(25, betVal - 25);
    render();
  });

  betUpBtn.addEventListener('click', ()=>{
    if(spinning) return;
    betVal = Math.min(250, betVal + 25);
    if(betVal > creditsVal) betVal = Math.max(25, Math.floor(creditsVal / 25) * 25);
    render();
  });

  spinBtn.addEventListener('click', spin);
  playAgainBtn.addEventListener('click', spin);

  reels.forEach(r=>setReel(r, randomSymbol()));
  render();
})();
