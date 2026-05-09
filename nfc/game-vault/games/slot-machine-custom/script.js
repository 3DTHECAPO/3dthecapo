(()=>{
  'use strict';

  const bank = window.Play3DGameBank;
  const symbols = ['7','BAR','GEM','CROWN','CAPO','WILD'];
  const payouts = {
    '7': 40,
    BAR: 24,
    GEM: 18,
    CROWN: 14,
    CAPO: 10,
    WILD: 8
  };

  let creditsVal = bank ? bank.getCredits() : 1000;
  let betVal = 25;
  let spinning = false;
  const reels = [r1,r2,r3];

  function save(){
    if(bank) bank.setCredits(creditsVal);
  }

  function jackpotValue(){
    return bank ? bank.getJackpot() : 5000;
  }

  function setReel(el, value){
    el.querySelector('span').textContent = value;
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

  function randomSymbol(){
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function score(result){
    const counts = result.reduce((acc, s)=>{ acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    const triple = Object.keys(counts).find(k=>counts[k] === 3);
    if(triple){
      if(triple === '7') return {label:'GRAND JACKPOT', amount:bank ? bank.claimJackpot() : betVal * 40};
      return {label:triple + ' JACKPOT', amount:betVal * payouts[triple]};
    }
    const pair = Object.keys(counts).find(k=>counts[k] === 2);
    if(pair) return {label:'PAIR OF ' + pair, amount:betVal * 3};
    return {label:'NO WIN', amount:0};
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
    resultLine.textContent = 'Reels spinning...';
    playAgainBtn.hidden = true;
    spinBtn.classList.add('pulled');
    reels.forEach(r=>r.classList.add('spinning'));
    save();
    render();

    let ticks = 0;
    const interval = setInterval(()=>{
      reels.forEach(r=>setReel(r, randomSymbol()));
      ticks++;
      if(ticks >= 12){
        clearInterval(interval);
        spinBtn.classList.remove('pulled');
        finishSpin([randomSymbol(), randomSymbol(), randomSymbol()]);
      }
    }, 95);
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

  render();
})();
