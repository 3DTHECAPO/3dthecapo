(()=>{
  'use strict';

  function play3dAnnounce(event, type, message){
    window.dispatchEvent(new CustomEvent('superior:event', { detail:{ category:'spades', event:event, type:type, message:message } }));
  }

  const shuffleSound = new Audio('./sounds/card-shuffle.mp3');
  const playSound = new Audio('./sounds/card-play.wav');

  function playShuffle(){
    shuffleSound.currentTime = 0;
    shuffleSound.play().catch(()=>{});
  }

  function playCard(){
    playSound.currentTime = 0;
    playSound.play().catch(()=>{});
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
  const FAN_PARAMS = new URLSearchParams(location.search);
  const FAN_MODE = FAN_PARAMS.get('mode') === 'fan' && !!FAN_PARAMS.get('room');
  const FAN_SEAT_PREF_KEY = 'play3d_spades_preferred_seat__' + (FAN_PARAMS.get('room') || 'room');
  let fanPlayers = [];
  let fanSeatMap = {};
  let fanMySeat = 'south';
  let fanPreferredSeat = sessionStorage.getItem(FAN_SEAT_PREF_KEY) || localStorage.getItem(FAN_SEAT_PREF_KEY) || 'south';
  if(!seats.includes(fanPreferredSeat)) fanPreferredSeat = 'south';
  let fanSyncReady = false;
  let applyingRemoteState = false;

  function spadesSync(){ return window.PLAY3D_SYNC || window.Play3DGameSync || null; }
  function fanPlayerId(){ const sync = spadesSync(); return sync && sync.playerId ? sync.playerId : 'local'; }
  function orderedFanPlayers(list){
    return (list || []).filter(p => p && p.playerId).sort((a,b)=>String(a.joinedAt || a.updatedAt || a.playerId).localeCompare(String(b.joinedAt || b.updatedAt || b.playerId)));
  }
  function rebuildFanSeats(list){
    if(!FAN_MODE) return;
    const ordered = orderedFanPlayers(list).slice(0, 4);
    fanPlayers = ordered;
    fanSeatMap = {};
    const occupied = {};
    function wantedSeat(player){
      const raw = player && (player.preferredSeat || player.seat);
      return seats.includes(raw) ? raw : null;
    }
    ordered.forEach(player => {
      const desired = wantedSeat(player);
      if(desired && !occupied[desired]){
        fanSeatMap[player.playerId] = desired;
        occupied[desired] = true;
      }
    });
    ordered.forEach(player => {
      if(Object.prototype.hasOwnProperty.call(fanSeatMap, player.playerId)) return;
      for(const seat of seats){
        if(!occupied[seat]){
          fanSeatMap[player.playerId] = seat;
          occupied[seat] = true;
          break;
        }
      }
    });
    const mine = fanPlayerId();
    if(Object.prototype.hasOwnProperty.call(fanSeatMap, mine)) fanMySeat = fanSeatMap[mine];
  }
  function isFanSeat(seat){
    if(!FAN_MODE) return seat === 'south';
    return Object.values(fanSeatMap).includes(seat);
  }
  function isMySeat(seat){
    if(!FAN_MODE) return seat === 'south';
    return seat === fanMySeat;
  }
  function cleanFanState(){
    return {
      hands:state.hands, turn:state.turn, dealer:state.dealer, trick:state.trick,
      spadesBroken:state.spadesBroken, phase:state.phase, score:state.score,
      bags:state.bags, bids:state.bids, taken:state.taken
    };
  }
  function applyFanState(snapshot, label){
    if(!snapshot || typeof snapshot !== 'object') return;
    applyingRemoteState = true;
    Object.keys(snapshot).forEach(key => { if(key in state) state[key] = snapshot[key]; });
    applyingRemoteState = false;
    render();
    if(label) log(label);
    scheduleFanCpuIfNeeded();
  }
  function broadcastFanState(reason){
    if(!FAN_MODE || applyingRemoteState) return;
    const sync = spadesSync();
    if(!sync || typeof sync.sendGameEvent !== 'function') return;
    sync.sendGameEvent('spades_state', {game:'spades', reason:reason || 'state', seat:fanMySeat, state:cleanFanState()});
  }
  function scheduleFanCpuIfNeeded(){
    if(!FAN_MODE) return;
    if((state.phase === 'play' || state.phase === 'bid') && !isFanSeat(state.turn)) scheduleBot();
  }
  function setFanPreferredSeat(seat){
    if(!seats.includes(seat)) return;
    fanPreferredSeat = seat;
    try{ sessionStorage.setItem(FAN_SEAT_PREF_KEY, seat); }catch(e){}
    try{ localStorage.setItem(FAN_SEAT_PREF_KEY, seat); }catch(e){}
    const sync = spadesSync();
    if(sync && sync.updatePresence) sync.updatePresence({ready:false, seat:fanPreferredSeat, preferredSeat:fanPreferredSeat, game:'spades'});
    render();
    broadcastFanState('seat_choice');
  }
  function fanSeatChoiceHTML(){
    if(!FAN_MODE) return '';
    const labels = {south:'South: You / Host', north:'North: Your Partner', west:'West: Against You', east:'East: Against You'};
    return '<div class="fan-seat-chooser">' + seats.map(seat => '<button type="button" data-fan-seat="'+seat+'" '+(fanMySeat===seat?'class="active"':'')+'>'+labels[seat]+'</button>').join('') + '</div>';
  }
  function fanSyncBoot(){
    if(!FAN_MODE || fanSyncReady) return;
    const sync = spadesSync();
    if(!sync || typeof sync.onGameEvent !== 'function') return;
    fanSyncReady = true;
    if(sync.onPresence){
      sync.onPresence(players => {
        rebuildFanSeats(players);
        if(sync.updatePresence) sync.updatePresence({ready:false, seat:fanPreferredSeat, preferredSeat:fanPreferredSeat, game:'spades'});
        render();
        scheduleFanCpuIfNeeded();
      });
    }
    sync.onGameEvent('spades_state', msg => {
      if(!msg || msg.playerId === fanPlayerId()) return;
      const payload = msg.payload || msg;
      if(payload && payload.game === 'spades' && payload.state) applyFanState(payload.state, 'REMOTE TABLE UPDATE');
    });
    sync.onGameEvent('spades_request_state', msg => {
      if(!msg || msg.playerId === fanPlayerId()) return;
      if(fanMySeat === 'south') broadcastFanState('state_response');
    });
    if(sync.updatePresence) sync.updatePresence({ready:false, seat:fanPreferredSeat, preferredSeat:fanPreferredSeat, game:'spades'});
    setTimeout(() => { if(sync.sendGameEvent) sync.sendGameEvent('spades_request_state', {game:'spades', seat:fanMySeat}); }, 900);
  }
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
    if(FAN_MODE && fanMySeat !== 'south'){
      const sync = spadesSync();
      if(sync && sync.sendGameEvent) sync.sendGameEvent('spades_request_state', {game:'spades', seat:fanMySeat});
      log('Waiting for host deal.');
      render();
      return;
    }
    playShuffle();
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
    broadcastFanState('deal');
    if(FAN_MODE) scheduleFanCpuIfNeeded();
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
    for(const cpu of seats.filter(s => FAN_MODE ? !isFanSeat(s) : s !== 'south')){
      if(state.bids[cpu] === null) state.bids[cpu] = estimateBid(cpu);
    }
    if(seats.every(s => state.bids[s] !== null)){
      state.phase = 'play';
      state.turn = 'south';
      log('Contracts set. North/South ' + teamBid('NS') + ', East/West ' + teamBid('EW') + '.');
      if(FAN_MODE) scheduleFanCpuIfNeeded();
      else if(mode === 'cpu' && state.turn !== 'south') scheduleBot();
    }
    render();
    broadcastFanState('bid');
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
    playCard();
    state.hands[seat] = state.hands[seat].filter(item => item.id !== card.id);
    state.trick.push({ seat, card });
    if(card.s === 'S') state.spadesBroken = true;
    if(state.trick.length === 4){ finishTrick(); return; }
    state.turn = seats[(seats.indexOf(state.turn) + 1) % 4];
    render();
    broadcastFanState('card_played');
    if(FAN_MODE) scheduleFanCpuIfNeeded();
    else if(mode === 'cpu' && state.turn !== 'south') scheduleBot();
  }

  function scheduleBot(){
    if(FAN_MODE && isFanSeat(state.turn)) return;
    turnText.textContent = 'OPPONENT THINKING...';
    window.setTimeout(botTurn, thinkDelay());
  }

  function botTurn(){
    if((!FAN_MODE && mode !== 'cpu') || state.phase !== 'play') return;
    if(FAN_MODE && isFanSeat(state.turn)) return;
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
    broadcastFanState('trick_finished');
    if(FAN_MODE) scheduleFanCpuIfNeeded();
    else if(mode === 'cpu' && state.turn !== 'south') scheduleBot();
  }

  function finishHand(){
    scoreTeam('NS');
    scoreTeam('EW');
    state.phase = 'over';
    if(window.Play3DPoints && state.score.NS >= state.score.EW) window.Play3DPoints.award('spades', 175, 'contract_hand');
    log('Hand scored. Bags: NS ' + state.bags.NS + ', EW ' + state.bags.EW + '.');
    play3dAnnounce('WIN','success');
    render();
    broadcastFanState('hand_finished');
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

  function activeSeat(){ return FAN_MODE ? fanMySeat : (mode === 'local' ? state.turn : 'south'); }

  function cardHTML(card,index,disabled){
    const red = card.s === 'H' || card.s === 'D';
    return '<button class="card ' + (red ? 'red ' : '') + (disabled ? 'disabled' : '') + '" data-i="' + index + '"><span>' + card.r + '</span><b>' + suitIcon[card.s] + '</b><small>' + card.r + '</small></button>';
  }

  function renderHand(){
    const seat = activeSeat();
    const hand = state.hands[seat] || [];
    const legal = state.phase === 'play' ? legalCards(seat).map(card => card.id) : [];
    const disabled = state.phase !== 'play' || (FAN_MODE ? state.turn !== fanMySeat : (mode !== 'local' && state.turn !== 'south'));
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
    const label = state.phase === 'bid' ? 'BID PHASE' : state.phase === 'over' ? 'HAND OVER' : (FAN_MODE ? (state.turn === fanMySeat ? 'YOUR TURN' : seatName(state.turn).toUpperCase() + ' TURN') : (mode === 'local' ? seatName(state.turn).toUpperCase() + ' TURN' : (state.turn === 'south' ? 'YOUR TURN' : seatName(state.turn).toUpperCase() + ' TURN')));
    turnText.textContent = label + (state.spadesBroken ? ' / SPADES BROKEN' : '');
    const logNode = document.getElementById('log');
    if(FAN_MODE && logNode && !document.getElementById('fanSeatChooser')){
      const li = document.createElement('li');
      li.id = 'fanSeatChooser';
      li.innerHTML = fanSeatChoiceHTML();
      logNode.prepend(li);
      li.querySelectorAll('[data-fan-seat]').forEach(btn => btn.onclick = () => setFanPreferredSeat(btn.dataset.fanSeat));
    }
  }

  function seatName(seat){
    if(FAN_MODE){
      if(seat === fanMySeat) return 'You';
      const occupied = Object.values(fanSeatMap).includes(seat);
      if(occupied) return seat.charAt(0).toUpperCase() + seat.slice(1) + ' Fan';
      return seat.charAt(0).toUpperCase() + seat.slice(1) + ' CPU';
    }
    return { south:'You', north:'North', east:'East', west:'West' }[seat];
  }
  function log(msg){ document.getElementById('log').innerHTML = '<li>' + msg + '</li>' + document.getElementById('log').innerHTML; }

  document.getElementById('newBtn').onclick = deal;
  document.getElementById('autoBtn').onclick = ()=>{
    if(state.phase === 'bid') placeBid(activeSeat(), estimateBid(activeSeat()));
    else {
      const seat = activeSeat();
      const card = legalCards(seat)[0];
      if(card) play(seat, card);
    }
  };
  document.querySelectorAll('.bidBtn').forEach(btn => btn.onclick = () => placeBid(activeSeat(), btn.dataset.bid));
  window.addEventListener('play3d:modechange', event=>{ mode = event.detail.mode; fanSyncBoot(); deal(); });
  if(FAN_MODE){
    fanSyncBoot();
    render();
    setTimeout(()=>{
      fanSyncBoot();
      if(fanMySeat === 'south') deal();
      else{
        const sync = spadesSync();
        if(sync && sync.sendGameEvent) sync.sendGameEvent('spades_request_state', {game:'spades', seat:fanMySeat});
        log('Waiting for host table.');
      }
    }, 1000);
  }else{
    deal();
  }
})();
