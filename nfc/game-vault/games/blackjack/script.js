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
  const playerHandEl = document.getElementById('playerHand');
  const dealerHandEl = document.getElementById('dealerHand');
  const playerTotalEl = document.getElementById('playerTotal');
  const dealerTotalEl = document.getElementById('dealerTotal');
  const creditsTextEl = document.getElementById('creditsText');
  const creditsEl = document.getElementById('credits');
  const betEl = document.getElementById('bet');
  const stateTextEl = document.getElementById('stateText');
  const dealBtnEl = document.getElementById('dealBtn');
  const hitBtnEl = document.getElementById('hitBtn');
  const standBtnEl = document.getElementById('standBtn');
  const doubleBtnEl = document.getElementById('doubleBtn');
  const playAgainBtnEl = document.getElementById('playAgainBtn');
  const resultEl = document.getElementById('result');

  const suits = ['S','H','D','C'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const suitIcon = {S:'\u2660', H:'\u2665', D:'\u2666', C:'\u2663'};
  function thinkDelay(){ return 400 + Math.floor(Math.random() * 1000); }

  function makeDeck(){
    deck = [];
    for(const s of suits){
      for(const r of ranks) deck.push({r,s});
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
    if(hidden) return '<div class="card back">PLAY<br>3D</div>';
    const red = card.s === 'H' || card.s === 'D';
    return '<div class="card ' + (red ? 'red' : '') + '"><span>' + card.r + '</span><b>' + suitIcon[card.s] + '</b><small>' + card.r + '</small></div>';
  }

  function saveBank(){
    if(bank) bank.setCredits(credits);
  }

  function render(showDealer){
    playerHandEl.innerHTML = player.map(c=>cardHTML(c,false)).join('');
    dealerHandEl.innerHTML = dealer.map((c,i)=>!showDealer && live && i === 1 ? cardHTML(c,true) : cardHTML(c,false)).join('');
    playerTotalEl.textContent = 'Total: ' + value(player);
    dealerTotalEl.textContent = showDealer || !live ? 'Total: ' + value(dealer) : 'Total: ?';
    creditsTextEl.textContent = credits;
    creditsEl.textContent = credits;
    betEl.textContent = betAmount;
    if(stateTextEl.textContent !== 'OPPONENT THINKING...') stateTextEl.textContent = live ? 'LIVE' : 'READY';
    dealBtnEl.disabled = live || credits < betAmount;
    hitBtnEl.disabled = !live;
    standBtnEl.disabled = !live;
    doubleBtnEl.disabled = !live || player.length !== 2 || credits < currentBet;
    playAgainBtnEl.disabled = live || credits < betAmount;
  }

  function setResult(text){
    resultEl.textContent = text;
    stateTextEl.textContent = text.toUpperCase();
  }

  function finish(text, pay){
    credits += Math.max(0, pay || 0);
    if(window.Play3DPoints && pay > currentBet) window.Play3DPoints.award('blackjack', Math.min(180, Math.floor(pay / 4)), 'blackjack_win');
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

  function settleDealer(){
    const pv = value(player);
    const dv = value(dealer);
    if(dv > 21 || pv > dv) finish('You win', currentBet * 2);
    else if(pv === dv) finish('Push', currentBet);
    else finish('Dealer wins', 0);
  }

  function dealerStep(){
    if(!live) return;
    if(value(dealer) < 17){
      stateTextEl.textContent = 'OPPONENT THINKING...';
      render(true);
      window.setTimeout(()=>{
        dealer.push(deck.pop());
        render(true);
        dealerStep();
      }, thinkDelay());
      return;
    }
    settleDealer();
  }

  function stand(){
    if(!live) return;
    stateTextEl.textContent = 'OPPONENT THINKING...';
    render(true);
    window.setTimeout(dealerStep, thinkDelay());
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

  dealBtnEl.onclick = deal;
  hitBtnEl.onclick = hit;
  standBtnEl.onclick = stand;
  doubleBtnEl.onclick = doubleDown;
  playAgainBtnEl.onclick = deal;

  render(true);
})();
