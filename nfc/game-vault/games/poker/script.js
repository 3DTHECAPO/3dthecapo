(()=>{
  'use strict';

  const suits = ['S','H','D','C'];
  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const order = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
  const bank = window.Play3DGameBank;
  let deck = [];
  let hand = [];
  let hold = [];
  let creditsVal = bank ? bank.getCredits() : 1000;
  let betVal = 25;
  let phase = 'deal';
  const handEl = document.getElementById('hand');


  function suitSymbol(s){
    return ({S:'♠',H:'♥',D:'♦',C:'♣'})[s] || s;
  }

  function mk(){
    deck = [];
    for(const s of suits){
      for(const r of ranks) deck.push({r,s});
    }
    deck.sort(()=>Math.random() - 0.5);
  }

  function straight(vals){
    const v = [...new Set(vals)].sort((a,b)=>a-b);
    if(v.length !== 5) return false;
    if(v.join(',') === '2,3,4,5,14') return true;
    return v[4] - v[0] === 4;
  }

  function evaluate(){
    const counts = {};
    hand.forEach(c=>counts[c.r] = (counts[c.r] || 0) + 1);
    const groups = Object.values(counts).sort((a,b)=>b-a).join(',');
    const nums = hand.map(c=>order[c.r]);
    const flush = hand.length === 5 && hand.every(c=>c.s === hand[0].s);
    const st = straight(nums);
    const high = new Set(hand.map(c=>c.r));
    if(flush && st && ['10','J','Q','K','A'].every(x=>high.has(x))) return {name:'Royal Flush',pay:250};
    if(flush && st) return {name:'Straight Flush',pay:50};
    if(groups === '4,1') return {name:'Four Of A Kind',pay:25};
    if(groups === '3,2') return {name:'Full House',pay:9};
    if(flush) return {name:'Flush',pay:6};
    if(st) return {name:'Straight',pay:4};
    if(groups === '3,1,1') return {name:'Three Of A Kind',pay:3};
    if(groups === '2,2,1') return {name:'Two Pair',pay:2};
    if(groups.startsWith('2')){
      const pair = Object.keys(counts).find(r=>counts[r] === 2);
      return order[pair] >= 11 ? {name:'Jacks Or Better',pay:1} : {name:'Low Pair',pay:0};
    }
    return {name:'No Win',pay:0};
  }

  function card(c,i){
    const red = c.s === 'H' || c.s === 'D';
    const held = hold.includes(i);
    return '<button class="card ' + (red ? 'red ' : '') + (held ? 'hold' : '') + '" data-i="' + i + '"><span class="rank">' + c.r + '</span><span class="suit">' + suitSymbol(c.s) + '</span><small class="mini">' + (held ? 'HOLD' : '') + '</small></button>';
  }

  function saveBank(){
    if(bank) bank.setCredits(creditsVal);
  }

  function render(){
    handEl.innerHTML = hand.map(card).join('');
    credits.textContent = creditsVal;
    bet.textContent = betVal;
    mainScore.textContent = creditsVal;
    stateText.textContent = phase.toUpperCase();
    drawBtn.disabled = phase !== 'draw';
    dealBtn.disabled = phase === 'draw' || creditsVal < betVal;
    playAgainBtn.disabled = phase === 'draw' || creditsVal < betVal;
    betDown.disabled = phase === 'draw';
    betUp.disabled = phase === 'draw';
    document.querySelectorAll('#hand .card').forEach(button=>{
      button.onclick = ()=>{
        const i = Number(button.dataset.i);
        if(phase !== 'draw') return;
        hold = hold.includes(i) ? hold.filter(x=>x !== i) : hold.concat(i);
        render();
      };
    });
  }

  function deal(){
    if(phase === 'draw') return;
    creditsVal = bank ? bank.getCredits() : creditsVal;
    if(creditsVal < betVal){
      rankName.textContent = 'NOT ENOUGH CREDITS';
      stateText.textContent = 'NO CREDITS';
      render();
      return;
    }
    creditsVal -= betVal;
    saveBank();
    mk();
    hand = deck.splice(0,5);
    hold = [];
    phase = 'draw';
    rankName.textContent = 'Pick Holds';
    render();
  }

  function draw(){
    if(phase !== 'draw') return;
    hand = hand.map((c,i)=>hold.includes(i) ? c : deck.pop());
    const res = evaluate();
    const pay = res.pay * betVal;
    creditsVal += pay;
    saveBank();
    rankName.textContent = res.name + ' +' + pay;
    phase = 'deal';
    render();
  }

  dealBtn.onclick = deal;
  playAgainBtn.onclick = deal;
  drawBtn.onclick = draw;
  betDown.onclick = ()=>{
    if(phase === 'draw') return;
    betVal = Math.max(25, betVal - 25);
    render();
  };
  betUp.onclick = ()=>{
    if(phase === 'draw') return;
    betVal = betVal >= 500 ? 25 : betVal + 25;
    render();
  };

  render();
})();
