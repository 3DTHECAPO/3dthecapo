(()=>{
  'use strict';

  const bank = window.Play3DGameBank;
  let creditsVal = bank ? bank.getCredits() : 1000;
  let betVal = 25;
  const symbols = ['7','BAR','STAR','CROWN','GEM','3D'];

  function syncBank(){
    if(bank) bank.setCredits(creditsVal);
  }

  function render(){
    credits.textContent = creditsVal;
    bet.textContent = betVal;
    mainScore.textContent = creditsVal;
    if(jackpot) jackpot.textContent = bank ? bank.getJackpot() : 5000;
    spinBtn.disabled = creditsVal < betVal;
  }

  spinBtn.onclick = ()=>{
    if(creditsVal < betVal){
      stateText.textContent = 'NO CREDITS';
      render();
      return;
    }

    creditsVal -= betVal;
    if(bank) bank.addJackpot(Math.ceil(betVal * 0.2));

    const result = [r1,r2,r3].map(el=>{
      const value = symbols[Math.floor(Math.random() * symbols.length)];
      el.textContent = value;
      return value;
    });

    if(result[0] === result[1] && result[1] === result[2]){
      const prize = bank ? bank.claimJackpot() : betVal * 20;
      creditsVal += prize;
      stateText.textContent = 'JACKPOT +' + prize;
    }else if(result[0] === result[1] || result[1] === result[2] || result[0] === result[2]){
      const prize = betVal * 3;
      creditsVal += prize;
      stateText.textContent = 'WIN +' + prize;
    }else{
      stateText.textContent = 'SPIN';
    }

    syncBank();
    render();
  };

  render();
})();
