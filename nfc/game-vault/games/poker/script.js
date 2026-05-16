(()=>{
  'use strict';

  const suits = ['S','H','D','C'];
  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const order = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
  const suitIcon = {S:'\u2660', H:'\u2665', D:'\u2666', C:'\u2663'};
  const bank = window.Play3DGameBank;
  let deck = [];
  let hand = [];
  let hold = [];
  let creditsVal = bank ? bank.getCredits() : 1000;
  let betVal = 25;
  let phase = 'deal';
  const handEl = document.getElementById('hand');
  const creditsEl = document.getElementById('credits');
  const betEl = document.getElementById('bet');
  const mainScoreEl = document.getElementById('mainScore');
  const stateTextEl = document.getElementById('stateText');
  const drawBtnEl = document.getElementById('drawBtn');
  const dealBtnEl = document.getElementById('dealBtn');
  const playAgainBtnEl = document.getElementById('playAgainBtn');
  const betDownEl = document.getElementById('betDown');
  const betUpEl = document.getElementById('betUp');
  const rankNameEl = document.getElementById('rankName');

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
    return '<button class="card ' + (red ? 'red ' : '') + (held ? 'hold' : '') + '" data-i="' + i + '"><span>' + c.r + '</span><b>' + suitIcon[c.s] + '</b><small>' + (held ? 'HOLD' : c.r) + '</small></button>';
  }

  function saveBank(){
    if(bank) bank.setCredits(creditsVal);
  }

  function render(){
    handEl.innerHTML = hand.map(card).join('');
    creditsEl.textContent = creditsVal;
    betEl.textContent = betVal;
    mainScoreEl.textContent = creditsVal;
    stateTextEl.textContent = phase.toUpperCase();
    drawBtnEl.disabled = phase !== 'draw';
    dealBtnEl.disabled = phase === 'draw' || creditsVal < betVal;
    playAgainBtnEl.disabled = phase === 'draw' || creditsVal < betVal;
    betDownEl.disabled = phase === 'draw';
    betUpEl.disabled = phase === 'draw';
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
      rankNameEl.textContent = 'NOT ENOUGH CREDITS';
      stateTextEl.textContent = 'NO CREDITS';
      render();
      return;
    }
    creditsVal -= betVal;
    saveBank();
    mk();
    hand = deck.splice(0,5);
    hold = [];
    phase = 'draw';
    rankNameEl.textContent = 'Pick Holds';
    render();
  }

  function draw(){
    if(phase !== 'draw') return;
    hand = hand.map((c,i)=>hold.includes(i) ? c : deck.pop());
    const res = evaluate();
    const pay = res.pay * betVal;
    creditsVal += pay;
    if(window.Play3DPoints && pay > 0) window.Play3DPoints.award('poker', Math.min(250, Math.max(25, Math.floor(pay / 3))), res.name.toLowerCase().replaceAll(' ','_'));
    saveBank();
    rankNameEl.textContent = res.name + ' +' + pay;
    phase = 'deal';
    render();
  }

  dealBtnEl.onclick = deal;
  playAgainBtnEl.onclick = deal;
  drawBtnEl.onclick = draw;
  betDownEl.onclick = ()=>{
    if(phase === 'draw') return;
    betVal = Math.max(25, betVal - 25);
    render();
  };
  betUpEl.onclick = ()=>{
    if(phase === 'draw') return;
    betVal = betVal >= 500 ? 25 : betVal + 25;
    render();
  };

  render();
})();
