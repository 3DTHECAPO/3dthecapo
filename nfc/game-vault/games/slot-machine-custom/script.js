(()=>{
  'use strict';

  const bank = window.Play3DGameBank;
  const symbols = ['7','BAR','GEM','CROWN','CAPO','WILD'];
  const payouts = {'7':40,BAR:24,GEM:18,CROWN:14,CAPO:10,WILD:8};
  const paylines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];

  let creditsVal = bank ? bank.getCredits() : 1000;
  let betVal = 25;
  let spinning = false;
  const reels = Array.from({length:9},(_,i)=>document.getElementById('r'+(i+1))).filter(Boolean);

  function save(){ if(bank) bank.setCredits(creditsVal); }
  function jackpotValue(){ return bank ? bank.getJackpot() : 5000; }
  function randomSymbol(){ return symbols[Math.floor(Math.random()*symbols.length)]; }
  function setReel(el,value){ if(el) el.querySelector('span').textContent=value; }

  function render(){
    creditsVal=Math.max(0,Math.floor(creditsVal));
    credits.textContent=creditsVal;
    bet.textContent=betVal;
    jackpot.textContent=jackpotValue();
    mainScore.textContent=creditsVal;
    spinBtn.disabled=spinning||creditsVal<betVal;
    betDownBtn.disabled=spinning||betVal<=25;
    betUpBtn.disabled=spinning||betVal>=250||betVal+25>creditsVal;
  }

  function lineScore(a,b,c){
    const line=[a,b,c];
    const counts=line.reduce((m,s)=>{m[s]=(m[s]||0)+1;return m;},{});
    const triple=Object.keys(counts).find(k=>counts[k]===3);
    if(triple){
      if(triple==='7') return {label:'GRAND JACKPOT', amount:bank ? bank.claimJackpot() : betVal*40};
      return {label:triple+' JACKPOT', amount:betVal*payouts[triple]};
    }
    const pair=Object.keys(counts).find(k=>counts[k]===2);
    if(pair) return {label:'PAIR OF '+pair, amount:betVal*2};
    return {label:'NO WIN', amount:0};
  }

  function score(grid){
    let total=0;
    let wins=[];
    for(const line of paylines){
      const res=lineScore(grid[line[0]],grid[line[1]],grid[line[2]]);
      if(res.amount){ total+=res.amount; wins.push(res.label); }
    }
    return {label:wins.length?wins[0]+' x'+wins.length:'NO WIN', amount:total};
  }

  function finishSpin(result){
    result.forEach((v,i)=>setReel(reels[i],v));
    reels.forEach(r=>r.classList.remove('spinning'));
    const win=score(result);
    creditsVal+=win.amount;
    lastWin.textContent=win.amount;
    stateText.textContent=win.label;
    resultLine.textContent=win.amount ? win.label+' pays '+win.amount+' credits across 3x3 paylines.' : 'No win. Pull again.';
    spinning=false;
    playAgainBtn.hidden=false;
    save();
    render();
  }

  function spin(){
    if(spinning) return;
    creditsVal=bank ? bank.getCredits() : creditsVal;
    if(creditsVal<betVal){
      stateText.textContent='NO CREDITS';
      resultLine.textContent='Not enough credits for this bet.';
      render(); return;
    }
    spinning=true;
    creditsVal-=betVal;
    if(bank) bank.addJackpot(Math.ceil(betVal*.2));
    lastWin.textContent='0';
    stateText.textContent='SPINNING 3x3';
    resultLine.textContent='Nine reels spinning...';
    playAgainBtn.hidden=true;
    spinBtn.classList.add('pulled');
    reels.forEach(r=>r.classList.add('spinning'));
    save(); render();

    let ticks=0;
    const interval=setInterval(()=>{
      reels.forEach(r=>setReel(r,randomSymbol()));
      ticks++;
      if(ticks>=14){
        clearInterval(interval);
        spinBtn.classList.remove('pulled');
        finishSpin(reels.map(()=>randomSymbol()));
      }
    },85);
  }

  betDownBtn.addEventListener('click',()=>{if(spinning)return;betVal=Math.max(25,betVal-25);render();});
  betUpBtn.addEventListener('click',()=>{if(spinning)return;betVal=Math.min(250,betVal+25);if(betVal>creditsVal)betVal=Math.max(25,Math.floor(creditsVal/25)*25);render();});
  spinBtn.addEventListener('click',spin);
  playAgainBtn.addEventListener('click',spin);
  render();
})();
