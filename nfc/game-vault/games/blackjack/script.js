(()=>{
  'use strict';

  let deck = [];
  let player = [];
  let dealer = [];
  const bank = window.Play3DGameBank;
  let credits = bank ? bank.getCredits() : 1000;
  let betAmount = 50;
  let currentBet = 50;
  let live = false;

  const suits = ['S','H','D','C'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

  function makeDeck(){
    deck = [];
    for(let d = 0; d < 4; d++){
      for(const s of suits){
        for(const r of ranks) deck.push({r,s});
      }
    }
    deck.sort(()=>Math.random() - 0.5);
  }

  function value(hand){
    let total = 0;
    let aces = 0;
    hand.forEach(card=>{
      if(card.r === 'A'){ aces++; total += 11; }
      else if(['K','Q','J'].includes(card.r)) total += 10;
      else total += Number(card.r);
    });
    while(total > 21 && aces > 0){ total -= 10; aces--; }
    return total;
  }

  function cardHTML(card, hidden){
    if(hidden) return '<div class="card back">3D</div>';
    const red = card.s === 'H' || card.s === 'D';
    return '<div class="card ' + (red ? 'red' : '') + '">' + card.r + '<br>' + card.s + '</div>';
  }

  function saveBank(){
    if(bank) bank.setCredits(credits);
  }

  function render(showDealer){
    playerHand.innerHTML = player.map(c=>cardHTML(c,false)).join('');
    dealerHand.innerHTML = dealer.map((c,i)=>!showDealer && live && i === 1 ? cardHTML(c,true) : cardHTML(c,false)).join('');
    playerTotal.textContent = 'Total: ' + value(player);
    dealerTotal.textContent = showDealer || !live ? 'Total: ' + value(dealer) : 'Total: ?';
    creditsText.textContent = credits;
    document.getElementById('credits').textContent = credits;
    bet.textContent = betAmount;
    stateText.textContent = live ? 'LIVE' : 'READY';
    dealBtn.disabled = live || credits < betAmount;
    hitBtn.disabled = !live;
    standBtn.disabled = !live;
    doubleBtn.disabled = !live || player.length !== 2 || credits < currentBet;
  }

  function setResult(text){
    result.textContent = text;
    stateText.textContent = text.toUpperCase();
  }

  function finish(text, pay){
    credits += Math.max(0, pay || 0);
    live = false;
    saveBank();
    setResult(text + (pay ? ' +' + pay : ''));
    render(true);
  }

  function deal(){
    if(live) return;
    credits = bank ? bank.getCredits() : credits;
    if(credits < betAmount){ setResult('Not enough credits'); render(true); return; }
    makeDeck();
    currentBet = betAmount;
    credits -= currentBet;
    player = [deck.pop(), deck.pop()];
    dealer = [deck.pop(), deck.pop()];
    live = true;
    saveBank();
    setResult('Hand started');
    if(value(player) === 21) finish('Blackjack', Math.floor(currentBet * 2.5));
    else render(false);
  }

  function hit(){
    if(!live) return;
    player.push(deck.pop());
    if(value(player) > 21) finish('Bust', 0);
    else render(false);
  }

  function stand(){
    if(!live) return;
    while(value(dealer) < 17) dealer.push(deck.pop());
    const pv = value(player);
    const dv = value(dealer);
    if(dv > 21 || pv > dv) finish('You win', currentBet * 2);
    else if(pv === dv) finish('Push', currentBet);
    else finish('Dealer wins', 0);
  }

  function doubleDown(){
    if(!live || player.length !== 2) return;
    if(credits < currentBet){ setResult('Not enough credits'); render(false); return; }
    credits -= currentBet;
    currentBet *= 2;
    saveBank();
    player.push(deck.pop());
    if(value(player) > 21) finish('Bust', 0);
    else stand();
  }

  dealBtn.onclick = deal;
  hitBtn.onclick = hit;
  standBtn.onclick = stand;
  doubleBtn.onclick = doubleDown;

  render(true);
})();
