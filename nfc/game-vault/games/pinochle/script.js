(()=>{
  'use strict';

  const suits = ['S','H','D','C'];
  const ranks = ['9','J','Q','K','10','A'];
  const order = {A:6,'10':5,K:4,Q:3,J:2,'9':1};
  const values = {A:11,'10':10,K:4,Q:3,J:2,'9':0};
  const suitIcon = {S:'\u2660', H:'\u2665', D:'\u2666', C:'\u2663'};
  const DECK_SIZE = 48;

  let hands = [];
  let stock = [];
  let trick = [];
  let captured = [[],[],[],[]];
  let score = [0,0];
  let current = 0;
  let trump = 'S';
  let teamMode = false;
  let meldTaken = false;
  function thinkDelay(){ return 400 + Math.floor(Math.random() * 1000); }

  function buildDeck(){
    const deck = [];
    for(let copy = 0; copy < 2; copy++){
      for(const suit of suits){
        for(const rank of ranks) deck.push({rank, suit, id:rank + suit + copy});
      }
    }
    if(deck.length !== DECK_SIZE) throw new Error('Pinochle deck must be 48 cards');
    return deck.sort(() => Math.random() - 0.5);
  }

  function players(){
    return teamMode ? 4 : 2;
  }

  function deal(){
    const deck = buildDeck();
    const count = players();
    hands = Array.from({length:count}, () => []);
    captured = Array.from({length:count}, () => []);
    score = [0,0];
    trick = [];
    meldTaken = false;
    current = 0;

    const handSize = teamMode ? 12 : 12;
    for(let i = 0; i < handSize; i++){
      for(let p = 0; p < count; p++) hands[p].push(deck.pop());
    }
    stock = teamMode ? [] : deck;
    trump = stock[0] ? stock[0].suit : hands[0][0].suit;
    sortHands();
    assertInvariant();
    render('DEALT - TRUMP ' + trump);
    if(current !== 0) scheduleCpu();
  }

  function assertInvariant(){
    const total = hands.flat().length + stock.length + trick.length + captured.flat().length;
    if(total !== DECK_SIZE) throw new Error('Pinochle card invariant failed: ' + total);
  }

  function sortHands(){
    hands.forEach(hand => hand.sort((a,b) => a.suit.localeCompare(b.suit) || order[a.rank] - order[b.rank]));
  }

  function cardHTML(card, index, enabled){
    const red = card.suit === 'H' || card.suit === 'D';
    return '<button class="card ' + (red ? 'red ' : '') + (!enabled ? 'disabled' : '') + '" data-i="' + index + '"><span>' + card.rank + '</span><b>' + suitIcon[card.suit] + '</b><small>' + card.rank + '</small></button>';
  }

  function backs(count){
    return Array.from({length:count}, () => '<div class="card back">PLAY<br>3D</div>').join('');
  }

  function team(player){
    return teamMode ? player % 2 : player;
  }

  function legalCards(player){
    const hand = hands[player] || [];
    if(!trick.length) return hand;
    const lead = trick[0].card.suit;
    const follow = hand.filter(card => card.suit === lead);
    return follow.length ? follow : hand;
  }

  function beats(candidate, best){
    if(candidate.suit === best.suit) return order[candidate.rank] > order[best.rank];
    return candidate.suit === trump && best.suit !== trump;
  }

  function trickWinner(){
    let best = trick[0];
    for(const play of trick.slice(1)) if(beats(play.card, best.card)) best = play;
    return best.player;
  }

  function drawAfterTrick(winner){
    if(teamMode || !stock.length) return;
    const loser = winner === 0 ? 1 : 0;
    if(stock.length) hands[winner].push(stock.pop());
    if(stock.length) hands[loser].push(stock.pop());
    sortHands();
  }

  function finishTrick(){
    const winner = trickWinner();
    captured[winner].push(...trick.map(play => play.card));
    const trickPoints = trick.reduce((sum, play) => sum + values[play.card.rank], 0);
    score[team(winner)] += trickPoints;
    trick = [];
    drawAfterTrick(winner);
    current = winner;
    assertInvariant();
    render('TRICK TO ' + seatName(winner));
    if(hands.every(hand => hand.length === 0)){
      score[team(winner)] += 10;
      if(window.Play3DPoints && score[0] > score[1]) window.Play3DPoints.award('pinochle', 250, 'round_win');
      render('ROUND OVER');
      return;
    }
    if(current !== 0) scheduleCpu();
  }

  function play(player, cardIndex){
    if(player !== current) return;
    const hand = hands[player];
    const card = hand[cardIndex];
    if(!card) return;
    if(!legalCards(player).some(item => item.id === card.id)){
      render('FOLLOW SUIT');
      return;
    }
    hand.splice(cardIndex, 1);
    trick.push({player, card});
    if(trick.length === players()) finishTrick();
    else {
      current = (current + 1) % players();
      assertInvariant();
      render('TRICK LIVE');
      if(current !== 0) scheduleCpu();
    }
  }

  function scheduleCpu(){
    render('OPPONENT THINKING...');
    setTimeout(cpuTurn, thinkDelay());
  }

  function cpuTurn(){
    if(current === 0 || !hands[current] || !hands[current].length) return;
    const legal = legalCards(current);
    const winning = legal.filter(card => trick.length && beats(card, trick[0].card));
    const pool = winning.length ? winning : legal;
    const chosen = pool.sort((a,b) => values[a.rank] - values[b.rank])[0];
    play(current, hands[current].findIndex(card => card.id === chosen.id));
  }

  function meldScore(hand){
    let total = 0;
    const counts = {};
    hand.forEach(card => {
      const key = card.rank + card.suit;
      counts[key] = (counts[key] || 0) + 1;
    });
    const count = (rank, suit) => counts[rank + suit] || 0;
    for(const suit of suits){
      const runCopies = Math.min(count('A', suit), count('10', suit), count('K', suit), count('Q', suit), count('J', suit));
      if(suit === trump){
        if(runCopies >= 2) total += 1500;
        else if(runCopies === 1) total += 150;
      }
      const marriages = Math.min(count('K', suit), count('Q', suit));
      total += marriages * (suit === trump ? 40 : 20);
      total += count('9', suit) * (suit === trump ? 10 : 0);
    }
    const aroundCopies = rank => Math.min(...suits.map(suit => count(rank, suit)));
    const aroundScore = (rank, single, double) => {
      const copies = aroundCopies(rank);
      if(copies >= 2) total += double;
      else if(copies === 1) total += single;
    };
    aroundScore('A', 100, 1000);
    aroundScore('K', 80, 800);
    aroundScore('Q', 60, 600);
    aroundScore('J', 40, 400);
    const pinochles = Math.min(count('Q', 'S'), count('J', 'D'));
    if(pinochles >= 2) total += 300;
    else if(pinochles === 1) total += 40;
    return total;
  }

  function takeMeld(){
    if(meldTaken) return;
    const meld = meldScore(hands[0]);
    score[0] += meld;
    meldTaken = true;
    if(window.Play3DPoints && meld > 0) window.Play3DPoints.award('pinochle', Math.min(150, Math.floor(meld / 2)), 'meld_score');
    render('MELD ' + meld);
  }

  function render(label){
    const opponentCount = teamMode ? (hands[1] || []).length + (hands[2] || []).length + (hands[3] || []).length : (hands[1] || []).length;
    opponentHand.innerHTML = backs(opponentCount);
    trickPile.innerHTML = trick.map(play => '<div><small>' + seatName(play.player) + '</small>' + cardHTML(play.card, 0, false) + '</div>').join('');
    meldArea.innerHTML = '<div class="count-card">Trump ' + trump + '</div><div class="count-card">Meld ' + (meldTaken ? 'Taken' : meldScore(hands[0])) + '</div><div class="count-card">' + (teamMode ? '4 Player Teams' : '2 Player Stock') + '</div>';
    stockArea.innerHTML = stock.length ? backs(Math.min(8, stock.length)) + '<div class="count-card">Stock ' + stock.length + '</div>' : '<div class="count-card">No Stock</div>';
    playerHand.innerHTML = (hands[0] || []).map((card, index) => cardHTML(card, index, current === 0 && legalCards(0).some(item => item.id === card.id))).join('');
    playerHand.querySelectorAll('.card').forEach(button => button.onclick = () => play(0, Number(button.dataset.i)));
    mainScore.textContent = score[0] + ' - ' + score[1];
    stateText.textContent = label || (current === 0 ? 'YOUR TURN' : seatName(current) + ' TURN');
    renderSeats();
  }

  function seatName(player){
    return ['YOU','CPU 1','PARTNER','CPU 2'][player] || 'CPU';
  }

  function renderSeats(){
    [0,1,2,3].forEach(player => {
      const el = document.getElementById('seat' + player);
      if(!el) return;
      if(player >= players()){
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.innerHTML = '<b>' + seatName(player) + '</b><small>' + ((hands[player] || []).length) + ' cards</small>' + (player === 0 ? '' : '<div class="seat-cards">' + backs(Math.min(6, (hands[player] || []).length)) + '</div>');
    });
  }

  dealBtn.onclick = deal;
  meldBtn.onclick = takeMeld;
  teamBtn.onclick = ()=>{
    teamMode = !teamMode;
    teamBtn.textContent = teamMode ? '2 Player Mode' : 'Team Mode';
    deal();
  };
  window.addEventListener('play3d:modechange', deal);

  deal();
})();
