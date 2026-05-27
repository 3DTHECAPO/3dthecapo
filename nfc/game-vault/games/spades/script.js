(()=>{
  'use strict';

  function play3dAnnounce(event, type, message){
    window.dispatchEvent(new CustomEvent('superior:event', { detail:{ category:'spades', event:event, type:type, message:message } }));
  }

  const suits = ['S','H','D','C'];
  const ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const seats = ['south','west','north','east'];
  const team = { south:'NS', north:'NS', west:'EW', east:'EW' };
  const power = rank => 14 - ranks.indexOf(rank);
  const suitIcon = {S:'\u2660', H:'\u2665', D:'\u2666', C:'\u2663'};
  const state = {
    hands:{}, turn:'south', dealer:'east', trick:[], spadesBroken:false, phase:'idle',
    score:{ NS:0, EW:0 }, bags:{ NS:0, EW:0 }, bids:{}, taken:{}
  };
  let mode = window.Play3DModeBar ? window.Play3DModeBar.getMode() : 'cpu';
  function thinkDelay(){ return 400 + Math.floor(Math.random() * 1000); }

  function buildDeck(){
    const deck = [];
    for(const s of suits) for(const r of ranks) deck.push({ r, s, id:r + s + deck.length });
    if(deck.length !== 52) throw new Error('Spades deck invariant failed: ' + deck.length);
    for(let i = deck.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function sortCards(a,b){ return suits.indexOf(a.s) - suits.indexOf(b.s) || ranks.indexOf(a.r) - ranks.indexOf(b.r); }

  function deal(){
    const deck = buildDeck();
    state.hands = { south:[], west:[], north:[], east:[] };
    for(let i = 0; i < 52; i++) state.hands[seats[i % 4]].push(deck[i]);
    for(const seat of seats) state.hands[seat].sort(sortCards);
    state.turn = 'south';
    state.trick = [];
    state.spadesBroken = false;
    state.phase = 'bid';
    state.bids = { south:null, west:null, north:null, east:null };
    state.taken = { south:0, west:0, north:0, east:0 };
    log(mode === 'fan' ? 'Fan room opened with guarded table state.' : 'New 52-card spades hand dealt. Bid first.');
    render();
  }

  function estimateBid(seat){
    const hand = state.hands[seat] || [];
    let bid = hand.filter(c => power(c.r) >= 12).length;
    bid += Math.floor(hand.filter(c => c.s === 'S' && power(c.r) >= 9).length / 2);
    return Math.max(1, Math.min(5, bid));
  }

  function placeBid(seat, bid){
    if(state.phase !== 'bid' || state.bids[seat] !== null) return;
    state.bids[seat] = Number(bid);
    log(seatName(seat) + ' bid ' + (Number(bid) === 0 ? 'nil' : bid) + '.');
    play3dAnnounce(Number(bid) === 0 ? 'NIL' : 'BID', 'casino');
    for(const cpu of seats.filter(s => s !== 'south')){
      if(state.bids[cpu] === null) state.bids[cpu] = estimateBid(cpu);
    }
    if(seats.every(s => state.bids[s] !== null)){
      state.phase = 'play';
      state.turn = 'south';
      log('Contracts set. North/South ' + teamBid('NS') + ', East/West ' + teamBid('EW') + '.');
      if(mode === 'cpu' && state.turn !== 'south') scheduleBot();
    }
    render();
  }

  function teamBid(t){ return seats.filter(s => team[s] === t).reduce((sum,s)=>sum + Number(state.bids[s] || 0), 0); }
  function teamTaken(t){ return seats.filter(s => team[s] === t).reduce((sum,s)=>sum + state.taken[s], 0); }

  function legalCards(seat){
    const hand = state.hands[seat] || [];
    if(!state.trick.length){
      if(!state.spadesBroken){
        const nonSpades = hand.filter(card => card.s !== 'S');
        if(nonSpades.length) return nonSpades;
      }
      return hand;
    }
    const lead = state.trick[0].card.s;
    const follow = hand.filter(card => card.s === lead);
    return follow.length ? follow : hand;
  }

  function play(seat, card){
    if(state.phase !== 'play' || seat !== state.turn || !card) return;
    const legal = legalCards(seat);
    if(!legal.some(item => item.id === card.id)){ log('Follow suit if you can.'); return; }
    state.hands[seat] = state.hands[seat].filter(item => item.id !== card.id);
    state.trick.push({ seat, card });
    if(card.s === 'S') state.spadesBroken = true;
    if(state.trick.length === 4){ finishTrick(); return; }
    state.turn = seats[(seats.indexOf(state.turn) + 1) % 4];
    render();
    if(mode === 'cpu' && state.turn !== 'south') scheduleBot();
  }

  function scheduleBot(){
    turnText.textContent = 'OPPONENT THINKING...';
    window.setTimeout(botTurn, thinkDelay());
  }

  function botTurn(){
    if(mode !== 'cpu' || state.phase !== 'play') return;
    const legal = legalCards(state.turn);
    const leadSuit = state.trick[0] ? state.trick[0].card.s : null;
    const currentWin = state.trick.length ? trickWinnerCard() : null;
    const sorted = [...legal].sort((a,b)=>power(a.r) - power(b.r));
    let card = sorted[0];
    if(leadSuit && currentWin){
      const winners = sorted.filter(c => beats(c, currentWin.card, leadSuit));
      if(winners.length) card = winners[0];
    }
    play(state.turn, card);
  }

  function beats(card, best, leadSuit){
    if(card.s === best.s) return power(card.r) > power(best.r);
    if(card.s === 'S' && best.s !== 'S') return true;
    if(best.s === 'S') return false;
    return card.s === leadSuit && best.s !== leadSuit;
  }

  function trickWinnerCard(){
    let best = state.trick[0];
    const lead = best.card.s;
    for(const item of state.trick.slice(1)){
      if(beats(item.card, best.card, lead)) best = item;
    }
    return best;
  }

  function finishTrick(){
    const win = trickWinnerCard().seat;
    state.taken[win]++;
    log(seatName(win) + ' won the trick.');
    play3dAnnounce('TRICK','boss');
    state.turn = win;
    state.trick = [];
    if((state.hands.south || []).length === 0){ finishHand(); return; }
    render();
    if(mode === 'cpu' && state.turn !== 'south') scheduleBot();
  }

  function finishHand(){
    scoreTeam('NS');
    scoreTeam('EW');
    state.phase = 'over';
    if(window.Play3DPoints && state.score.NS >= state.score.EW) window.Play3DPoints.award('spades', 175, 'contract_hand');
    log('Hand scored. Bags: NS ' + state.bags.NS + ', EW ' + state.bags.EW + '.');
    play3dAnnounce('WIN','success');
    render();
  }

  function scoreTeam(t){
    const bid = teamBid(t);
    const taken = teamTaken(t);
    let delta = 0;
    const nilSeats = seats.filter(s => team[s] === t && Number(state.bids[s]) === 0);
    for(const seat of nilSeats) delta += state.taken[seat] === 0 ? 100 : -100;
    const nonNilBid = seats.filter(s => team[s] === t && Number(state.bids[s]) > 0).reduce((sum,s)=>sum + Number(state.bids[s]), 0);
    const nonNilTaken = seats.filter(s => team[s] === t && Number(state.bids[s]) > 0).reduce((sum,s)=>sum + state.taken[s], 0);
    if(nonNilTaken >= nonNilBid){
      const over = nonNilTaken - nonNilBid;
      delta += nonNilBid * 10 + over;
      state.bags[t] += over;
      if(state.bags[t] >= 10){ delta -= 100; state.bags[t] -= 10; }
    } else {
      delta -= nonNilBid * 10;
    }
    state.score[t] += delta;
  }

  function activeSeat(){ return mode === 'local' ? state.turn : 'south'; }

  function cardHTML(card,index,disabled){
    const red = card.s === 'H' || card.s === 'D';
    return '<button class="card ' + (red ? 'red ' : '') + (disabled ? 'disabled' : '') + '" data-i="' + index + '"><span>' + card.r + '</span><b>' + suitIcon[card.s] + '</b><small>' + card.r + '</small></button>';
  }

  function renderHand(){
    const seat = activeSeat();
    const hand = state.hands[seat] || [];
    const legal = state.phase === 'play' ? legalCards(seat).map(card => card.id) : [];
    const disabled = state.phase !== 'play' || (mode !== 'local' && state.turn !== 'south');
    document.getElementById('hand').innerHTML = hand.map((card,i)=>cardHTML(card,i,disabled || !legal.includes(card.id))).join('');
    document.querySelectorAll('#hand .card').forEach(button=>{
      button.onclick = () => play(seat, hand[Number(button.dataset.i)]);
    });
  }

  function renderTrick(){
    document.getElementById('trickArea').innerHTML = state.trick.map(item=>{
      const red = item.card.s === 'H' || item.card.s === 'D';
      return '<div class="played-card"><span>' + seatName(item.seat) + '</span><div class="card ' + (red ? 'red' : '') + '"><span>' + item.card.r + '</span><b>' + suitIcon[item.card.s] + '</b><small>' + item.card.r + '</small></div></div>';
    }).join('');
  }

  function renderSeats(){
    for(const seat of seats){
      const el = document.querySelector('.' + ({south:'bottom', north:'top', west:'left', east:'right'}[seat]) + '-seat');
      if(el) el.innerHTML = seatName(seat).toUpperCase() + '<br><small>Bid ' + (state.bids[seat] ?? '-') + ' / Tricks ' + (state.taken[seat] || 0) + '</small>';
    }
  }

  function render(){
    renderHand();
    renderTrick();
    renderSeats();
    scoreText.textContent = state.score.NS + ' - ' + state.score.EW;
    const label = state.phase === 'bid' ? 'BID PHASE' : state.phase === 'over' ? 'HAND OVER' : (mode === 'local' ? seatName(state.turn).toUpperCase() + ' TURN' : (state.turn === 'south' ? 'YOUR TURN' : seatName(state.turn).toUpperCase() + ' TURN'));
    turnText.textContent = label + (state.spadesBroken ? ' / SPADES BROKEN' : '');
  }

  function seatName(seat){ return { south:'You', north:'North', east:'East', west:'West' }[seat]; }
  function log(msg){ document.getElementById('log').innerHTML = '<li>' + msg + '</li>' + document.getElementById('log').innerHTML; }

  document.getElementById('newBtn').onclick = deal;
  document.getElementById('autoBtn').onclick = ()=>{
    if(state.phase === 'bid') placeBid('south', estimateBid('south'));
    else {
      const seat = activeSeat();
      const card = legalCards(seat)[0];
      if(card) play(seat, card);
    }
  };
  document.querySelectorAll('.bidBtn').forEach(btn => btn.onclick = () => placeBid('south', btn.dataset.bid));
  window.addEventListener('play3d:modechange', event=>{ mode = event.detail.mode; deal(); });
  deal();
})();
