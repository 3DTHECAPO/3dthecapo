(()=>{
  'use strict';
  const suits = ['S','H','D','C'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const order = Object.fromEntries(ranks.map((r,i)=>[r,i+1]));
  let deck = [];
  let hand = [];
  const hands = document.querySelectorAll('.hand');
  const dealBtn = document.getElementById('dealBtn');
  const autoBtn = document.getElementById('autoBtn');

  function buildDeck(){
    deck = [];
    for(const s of suits) for(const r of ranks) deck.push({r,s});
    deck.sort(()=>Math.random() - 0.5);
  }

  function card(c){
    return '<button class="card ' + ((c.s === 'H' || c.s === 'D') ? 'red' : '') + '">' + c.r + '<br>' + c.s + '</button>';
  }

  function scoreRuns(cards){
    let score = 0;
    suits.forEach(s=>{
      const nums = cards.filter(c=>c.s === s).map(c=>order[c.r]).sort((a,b)=>a-b);
      let run = 1;
      for(let i=1;i<nums.length;i++){
        if(nums[i] === nums[i-1] + 1) run++;
        else{ if(run >= 3) score += run * 10; run = 1; }
      }
      if(run >= 3) score += run * 10;
    });
    ranks.forEach(r=>{
      const set = cards.filter(c=>c.r === r).length;
      if(set >= 3) score += set * 8;
    });
    return score;
  }

  function render(){
    if(hands[0]) hands[0].innerHTML = deck.slice(0,4).map(card).join('');
    if(hands[1]) hands[1].innerHTML = hand.map(card).join('');
    mainScore.textContent = scoreRuns(hand);
  }

  function deal(){
    buildDeck();
    hand = deck.splice(0,10).sort((a,b)=>order[a.r]-order[b.r]);
    stateText.textContent = 'DEALT';
    render();
  }

  function autoPlay(){
    if(!hand.length) deal();
    hand.sort((a,b)=>a.s.localeCompare(b.s) || order[a.r] - order[b.r]);
    const mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';
    stateText.textContent = (mode === 'local' ? 'LOCAL MELDS ' : 'MELDS ') + scoreRuns(hand);
    render();
  }

  dealBtn.onclick = deal;
  autoBtn.onclick = autoPlay;
  deal();
})();
