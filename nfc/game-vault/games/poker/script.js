(()=>{
  'use strict';
  const suits = ['S','H','D','C'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const order = Object.fromEntries(ranks.map((r,i)=>[r,i + 1]));
  const suitIcon = {S:'\u2660', H:'\u2665', D:'\u2666', C:'\u2663'};
  const HAND_SIZE = 10;
  const state = { deck:[], stock:[], discard:[], hands:[], playerMelds:[], cpuMelds:[], selected:new Set(), phase:'idle', score:0, turn:0, playerCount:2, nextId:1 };
  const els = {
    opponent:document.getElementById('opponentHand'),
    table:document.getElementById('tableCards'),
    melds:document.getElementById('meldArea'),
    player:document.getElementById('playerHand'),
    score:document.getElementById('mainScore'),
    text:document.getElementById('stateText')
  };

  function thinkDelay(){ return 400 + Math.floor(Math.random() * 1000); }
  function shuffle(cards){ for(let i = cards.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; } return cards; }
  function buildDeck(){ return shuffle(suits.flatMap(s => ranks.map(r => ({ id:'r'+(state.nextId++), r, s })))); }
  function sortHand(hand){ hand.sort((a,b)=>a.s.localeCompare(b.s) || order[a.r] - order[b.r]); }
  function isRed(c){ return c.s === 'H' || c.s === 'D'; }
  function card(c){
    const on = state.selected.has(c.id);
    return '<button class="card ' + (isRed(c) ? 'red ' : '') + (on ? 'selected' : '') + '" data-id="' + c.id + '"><span>' + c.r + '</span><b>' + suitIcon[c.s] + '</b><small>' + c.r + '</small></button>';
  }
  function back(count){ return Array.from({ length:count }, (_,i)=>'<div class="card back">PLAY<br>' + (i + 1) + '</div>').join(''); }
  function isSet(cards){ return cards.length >= 3 && cards.every(c => c.r === cards[0].r); }
  function isRun(cards){
    if(cards.length < 3 || !cards.every(c => c.s === cards[0].s)) return false;
    const nums = [...new Set(cards.map(c => order[c.r]))].sort((a,b)=>a-b);
    return nums.length === cards.length && nums.every((n,i)=>i === 0 || n === nums[i - 1] + 1);
  }
  function isMeld(cards){ return isSet(cards) || isRun(cards); }
  function cardValue(c){ if(c.r === 'A') return 15; if(['K','Q','J'].includes(c.r)) return 10; return Number(c.r); }
  function deadwood(hand){ return hand.reduce((sum,c)=>sum + cardValue(c), 0); }
  function removeByIds(hand, ids){ const picked = hand.filter(card => ids.includes(card.id)); ids.forEach(id => { const idx = hand.findIndex(card => card.id === id); if(idx >= 0) hand.splice(idx, 1); }); return picked; }
  function combinations(items, size){ const out = []; function walk(start, bag){ if(bag.length === size){ out.push([...bag]); return; } for(let i = start; i < items.length; i++){ bag.push(items[i]); walk(i + 1, bag); bag.pop(); } } walk(0, []); return out; }
  function findMeldIndexes(hand){
    for(let size = Math.min(5, hand.length); size >= 3; size--){
      const found = combinations(hand.map((_,i)=>i), size).find(combo => isMeld(combo.map(i => hand[i])));
      if(found) return found;
    }
    return null;
  }
  function scoreMeld(cards){ return cards.reduce((sum,c)=>sum + cardValue(c), 0); }

  function render(){
    const player = state.hands[0] || [];
    const opponentCards = state.hands.slice(1).reduce((sum, hand)=>sum + hand.length, 0);
    els.opponent.innerHTML = '<div class="opponent-stack">' + back(opponentCards) + '</div><div class="count-card">2 Players</div>';
    const topDiscard = state.discard[state.discard.length - 1];
    els.table.innerHTML = '<div class="count-card">Stock<br>' + state.stock.length + '</div>' + (topDiscard ? card(topDiscard) : '<div class="count-card">Discard<br>Empty</div>');
    els.melds.innerHTML = state.playerMelds.map(m => '<div class="meld-set">' + m.map(card).join('') + '</div>').join('') || '<div class="count-card">No melds yet</div>';
    els.player.innerHTML = player.map(card).join('');
    els.score.textContent = state.score;
    if(els.text.textContent !== 'OPPONENT THINKING...') els.text.textContent = state.phase.toUpperCase();
  }

  function deal(){
    state.playerCount = 2;
    state.nextId = 1;
    state.deck = buildDeck();
    state.hands = Array.from({length:state.playerCount}, () => {
      const hand = state.deck.splice(0, HAND_SIZE);
      sortHand(hand);
      return hand;
    });
    state.discard = [state.deck.pop()];
    state.stock = state.deck;
    state.playerMelds = [];
    state.cpuMelds = [];
    state.selected.clear();
    state.lastDrawnDiscardId = null;
    state.score = 0;
    state.turn = 0;
    state.phase = 'draw';
    render();
  }
  function recycleDiscard(){ const top = state.discard.pop(); state.stock = shuffle(state.discard); state.discard = top ? [top] : []; }
  function drawFromStock(){ if(state.phase !== 'draw') return; if(!state.stock.length) recycleDiscard(); const drawn = state.stock.pop(); if(!drawn){ els.text.textContent = 'NO STOCK AVAILABLE'; render(); return; } state.hands[0].push(drawn); sortHand(state.hands[0]); state.phase = 'meld'; render(); }
  function drawFromDiscard(){ if(state.phase !== 'draw') return; const drawn = state.discard.pop(); if(!drawn){ els.text.textContent = 'DISCARD EMPTY'; render(); return; } state.hands[0].push(drawn); sortHand(state.hands[0]); state.phase = 'meld'; render(); }
  function meldSelected(){
    if(state.phase !== 'meld') return;
    const ids = [...state.selected];
    const picked = state.hands[0].filter(card => ids.includes(card.id));
    if(!isMeld(picked)){ els.text.textContent = 'SELECT A SET OR RUN'; return; }
    removeByIds(state.hands[0], ids);
    state.playerMelds.push(picked);
    state.score += scoreMeld(picked);
    state.selected.clear();
    if(window.Play3DPoints) window.Play3DPoints.award('rummy', Math.max(10, scoreMeld(picked)), 'meld');
    checkRound();
    render();
  }
  function discardSelected(){
    if(state.phase !== 'meld') return;
    const ids = [...state.selected];
    if(ids.length !== 1){ els.text.textContent = 'SELECT ONE DISCARD'; return; }
    const [discarded] = removeByIds(state.hands[0], ids);
    state.discard.push(discarded);
    state.selected.clear();
    checkRound();
    if(state.phase !== 'over'){ state.phase = 'cpu'; state.turn = 1; scheduleCpu(); render(); }
  }
  function scheduleCpu(){ els.text.textContent = 'OPPONENT THINKING...'; window.setTimeout(cpuTurn, thinkDelay()); }
  function cpuTurn(){
    if(state.phase !== 'cpu') return;
    const hand = state.hands[state.turn] || [];
    const discard = state.discard[state.discard.length - 1];
    const drawDiscard = discard && findMeldIndexes([...hand, discard]);
    const drawnFromDiscard = !!drawDiscard;
    const drawn = drawnFromDiscard ? state.discard.pop() : (state.stock.pop() || (recycleDiscard(), state.stock.pop()));
    const drawnId = drawn && drawn.id;
    if(drawn) hand.push(drawn);
    const meld = findMeldIndexes(hand);
    if(meld) state.cpuMelds.push(removeByIds(hand, meld.map(index => hand[index].id)));
    if(hand.length){
      hand.sort((a,b)=>cardValue(b) - cardValue(a));
      let discardIndex = 0;
      if(drawnFromDiscard && drawnId && hand.length > 1 && hand[0] && hand[0].id === drawnId){
        const alt = hand.findIndex(c=>c.id !== drawnId);
        if(alt >= 0) discardIndex = alt;
      }
      state.discard.push(hand.splice(discardIndex,1)[0]);
    }
    checkRound();
    if(state.phase !== 'over'){
      state.turn = (state.turn + 1) % state.playerCount;
      if(state.turn === 0) state.phase = 'draw';
      else { render(); scheduleCpu(); return; }
    }
    render();
  }
  function checkRound(){
    const player = state.hands[0] || [];
    const opponents = state.hands.slice(1);
    if(!player.length || opponents.some(hand => !hand.length)){
      const playerNet = opponents.reduce((sum, hand)=>sum + deadwood(hand), 0);
      const cpuNet = deadwood(player);
      if(!player.length || playerNet <= cpuNet){
        state.score += playerNet;
        if(window.Play3DPoints) window.Play3DPoints.award('rummy', Math.max(50, playerNet), 'round_win');
        state.phase = 'over';
        els.text.textContent = 'PLAYER WINS';
      } else {
        state.phase = 'over';
        els.text.textContent = 'CPU WINS';
      }
    }
  }
  els.player.addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if(!btn || state.phase === 'cpu') return;
    const id = btn.dataset.id;
    if(!id || !(state.hands[0] || []).some(card => card.id === id)) return;
    if(state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    render();
  });
  document.getElementById('dealBtn').onclick = deal;
  document.getElementById('drawStockBtn').onclick = drawFromStock;
  document.getElementById('drawDiscardBtn').onclick = drawFromDiscard;
  document.getElementById('meldBtn').onclick = meldSelected;
  document.getElementById('discardBtn').onclick = discardSelected;
  window.addEventListener('play3d:modechange', deal);
  deal();
})();
