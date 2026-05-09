(()=>{
  'use strict';
  const suits = ['S','H','D','C'];
  const ranks = ['9','J','Q','K','10','A'];
  let deck = [];
  let hand = [];
  let table = [];
  const hands = document.querySelectorAll('.hand');
  const buttons = document.querySelectorAll('button');
  const dealBtn = buttons[0];
  const autoBtn = buttons[1];

  function buildDeck(){
    deck = [];
    for(let copy=0; copy<2; copy++) for(const s of suits) for(const r of ranks) deck.push({r,s});
    deck.sort(()=>Math.random() - 0.5);
  }

  function card(c){
    return '<button class="card ' + ((c.s === 'H' || c.s === 'D') ? 'red' : '') + '">' + c.r + '<br>' + c.s + '</button>';
  }

  function has(rank,suit){
    return hand.some(c=>c.r === rank && c.s === suit);
  }

  function meldScore(){
    let score = 0;
    suits.forEach(s=>{
      if(['A','10','K','Q','J'].every(r=>has(r,s))) score += 150;
      if(has('K',s) && has('Q',s)) score += 20;
    });
    if(has('Q','S') && has('J','D')) score += 40;
    ranks.forEach(r=>{
      const count = hand.filter(c=>c.r === r).length;
      if(count >= 4) score += r === 'A' ? 100 : 40;
    });
    return score;
  }

  function render(){
    if(hands[0]) hands[0].innerHTML = table.map(card).join('');
    if(hands[1]) hands[1].innerHTML = hand.map(card).join('');
    mainScore.textContent = meldScore();
  }

  function deal(){
    buildDeck();
    hand = deck.splice(0,12);
    table = deck.splice(0,4);
    stateText.textContent = 'DEALT';
    render();
  }

  function autoPlay(){
    if(!hand.length) deal();
    hand.sort((a,b)=>a.s.localeCompare(b.s) || ranks.indexOf(a.r) - ranks.indexOf(b.r));
    stateText.textContent = 'MELD ' + meldScore();
    render();
  }

  dealBtn.onclick = deal;
  autoBtn.onclick = autoPlay;
  deal();
})();
