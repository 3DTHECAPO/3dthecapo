/* PLAY 3D · Hood Monopoly · Cinematic Edition — main controller */
(function(){
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  // --- State ---
  let stage = 'loading';
  let lobby = { mode:'solo', aiCount:2, humanCount:2, difficulty:'medium', picks:{}, names:{} };
  let state = null;
  let rolling = false;
  let aiTimer = null;

  // --- Stage routing ---
  function setStage(next){
    stage = next;
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${next}`));
    if (next === 'menu') { $('#btn-continue').classList.toggle('hidden', !HM.hasSave()); }
    if (next === 'lobby') renderLobby();
    if (next === 'game') { renderGameShell(); renderAll(); maybeAITurn(); }
  }

  // --- LOADING ---
  (function loading(){
    let p = 0;
    const fill = $('#loading-bar-fill'), pct = $('#loading-progress'), phase = $('#loading-phase');
    const t = setInterval(() => {
      p = Math.min(100, p + Math.random()*9 + 4);
      fill.style.width = p + '%';
      pct.textContent = Math.floor(p) + '%';
      if (p >= 100){ clearInterval(t); phase.textContent = 'VAULT UNLOCKED'; setTimeout(() => setStage('menu'), 700); }
    }, 180);
  })();

  // --- MENU ---
  $('#btn-new-game').addEventListener('click', () => { HM.audio.click(); setStage('lobby'); });
  $('#btn-continue').addEventListener('click', () => {
    HM.audio.click();
    const s = HM.loadGame(); if (!s) return;
    state = s; setStage('game');
  });

  // --- LOBBY ---
  function renderLobby(){
    $('#solo-controls').classList.toggle('hidden', lobby.mode !== 'solo');
    $('#local-controls').classList.toggle('hidden', lobby.mode !== 'local');
    const totalHumans = lobby.mode === 'solo' ? 1 : lobby.humanCount;
    const totalAI = lobby.mode === 'solo' ? lobby.aiCount : 0;
    const total = totalHumans + totalAI;
    $('#difficulty-row-wrap').classList.toggle('hidden', totalAI === 0);

    // sync token picks
    const used = new Set();
    const newPicks = {}, newNames = {};
    for (let i=0; i<total; i++){
      const prev = lobby.picks[i];
      let tok = prev && !used.has(prev) ? prev : HM.TOKENS.find(t => !used.has(t.id))?.id;
      if (tok) used.add(tok);
      newPicks[i] = tok;
      newNames[i] = lobby.names[i] || (i < totalHumans ? `Player ${i+1}` : `CPU ${i - totalHumans + 1}`);
    }
    lobby.picks = newPicks; lobby.names = newNames;

    const list = $('#players-list'); list.innerHTML = '';
    for (let i=0; i<total; i++){
      const isAI = i >= totalHumans;
      const tok = HM.tokenById(lobby.picks[i]);
      const row = document.createElement('div'); row.className = 'player-row';
      row.innerHTML = `
        <span class="role ${isAI?'cpu':'you'}">${isAI?'CPU':'YOU'}</span>
        <input value="${lobby.names[i]}" data-i="${i}" data-testid="player-name-${i}" />
        <select data-i="${i}" data-testid="token-select-${i}">
          ${HM.TOKENS.map(t => `<option value="${t.id}" ${t.id===lobby.picks[i]?'selected':''} ${Object.values(lobby.picks).includes(t.id) && lobby.picks[i]!==t.id?'disabled':''}>${t.label}</option>`).join('')}
        </select>
        <span class="swatch" style="background:${tok.color};color:${tok.color}"></span>
      `;
      list.appendChild(row);
    }
    list.querySelectorAll('input').forEach(inp => inp.addEventListener('input', e => { lobby.names[+e.target.dataset.i] = e.target.value; }));
    list.querySelectorAll('select').forEach(sel => sel.addEventListener('change', e => {
      const idx = +e.target.dataset.i, newTok = e.target.value;
      const swap = Object.entries(lobby.picks).find(([k,v]) => v === newTok && +k !== idx);
      if (swap) lobby.picks[swap[0]] = lobby.picks[idx];
      lobby.picks[idx] = newTok; renderLobby();
    }));
  }
  $$('.mode-btn').forEach(b => b.addEventListener('click', () => { $$('.mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); lobby.mode = b.dataset.mode; renderLobby(); }));
  $('#ai-count-row').addEventListener('click', e => { const b = e.target.closest('.num-btn'); if(!b) return; $$('#ai-count-row .num-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); lobby.aiCount = +b.dataset.n; renderLobby(); });
  $('#human-count-row').addEventListener('click', e => { const b = e.target.closest('.num-btn'); if(!b) return; $$('#human-count-row .num-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); lobby.humanCount = +b.dataset.n; renderLobby(); });
  $('#difficulty-row').addEventListener('click', e => { const b = e.target.closest('.diff-btn'); if(!b) return; $$('#difficulty-row .diff-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); lobby.difficulty = b.dataset.diff; });
  $('#btn-lobby-back').addEventListener('click', () => { HM.audio.click(); setStage('menu'); });
  $('#btn-lobby-start').addEventListener('click', () => {
    HM.audio.click();
    const totalHumans = lobby.mode === 'solo' ? 1 : lobby.humanCount;
    const totalAI = lobby.mode === 'solo' ? lobby.aiCount : 0;
    const players = [];
    for (let i=0; i<totalHumans; i++) players.push(HM.createPlayer({ id:`p${i+1}`, name:lobby.names[i] || `Player ${i+1}`, tokenId:lobby.picks[i], isAI:false }));
    for (let i=0; i<totalAI; i++){ const idx = totalHumans + i; players.push(HM.createPlayer({ id:`ai${i+1}`, name:lobby.names[idx] || `CPU ${i+1}`, tokenId:lobby.picks[idx], isAI:true, difficulty:lobby.difficulty })); }
    state = HM.createInitialState({ players });
    setStage('game');
  });

  // --- GAME ---
  function renderGameShell(){
    const board = $('#game-board'); board.innerHTML = '';
    // center
    const center = document.createElement('div'); center.className = 'board-center';
    center.style.gridRow = '2 / span 9'; center.style.gridColumn = '2 / span 9';
    center.innerHTML = `
      <div class="center-bg"></div>
      <div class="center-fade"></div>
      <div class="center-content">
        <p class="eyebrow gold">PLAY 3D · V-TOWN EDITION</p>
        <h1 class="display gold-grad">HOOD<br/>MONOPOLY</h1>
        <div class="center-divider"></div>
        <p class="eyebrow muted">VALLEJO · ${state.players.length} PLAYERS</p>
        <div class="card-piles">
          <div class="card-pile hood"><div class="card-pile-q">?</div><div class="card-pile-label" style="color:#D4AF37">HOOD CARDS</div></div>
          <div class="card-pile street"><div class="card-pile-q">?</div><div class="card-pile-label" style="color:#FF1493">STREET CARDS</div></div>
        </div>
      </div>`;
    board.appendChild(center);
    // tiles
    HM.BOARD.forEach((tile, idx) => {
      const { row, col } = HM.tileGridPosition(idx);
      const side = HM.tileSide(idx);
      const tileEl = document.createElement('div');
      tileEl.className = 'tile'; tileEl.dataset.testid = `tile-${idx}`; tileEl.dataset.idx = idx;
      tileEl.style.gridRow = row; tileEl.style.gridColumn = col;
      tileEl.innerHTML = tileInner(tile, side, idx);
      board.appendChild(tileEl);
    });
  }

  function tileInner(tile, side, idx){
    if (tile.type === 'corner'){
      const cls = tile.name === 'GO' ? 'go' : tile.name === 'Jail' ? 'jail' : tile.name === 'Go To Jail' ? 'gotojail' : 'parking';
      return `<span class="tile-sub" style="color:inherit;opacity:.6">${tile.sub}</span><span class="tile-corner ${cls}">${tile.name}</span>`;
    }
    if (tile.type === 'tax')        return `<span class="tile-sub" style="color:#FF1493">PAY</span><span class="tile-name">${tile.name}</span><span class="tile-price" style="color:#FF1493">−$${tile.amount}</span>`;
    if (tile.type === 'hood-card')  return `<span class="tile-sub" style="color:#D4AF37">DRAW</span><span class="tile-name">HOOD CARD</span>`;
    if (tile.type === 'street-card')return `<span class="tile-sub" style="color:#FF1493">DRAW</span><span class="tile-name">STREET CARD</span>`;
    if (tile.type === 'transit')    return `<span class="tile-sub" style="color:#7FFFD4">TRANSIT</span><span class="tile-name">${tile.name}</span><span class="tile-price">$${tile.price}</span>`;
    if (tile.type === 'utility')    return `<span class="tile-sub" style="color:#F2D492">UTILITY</span><span class="tile-name">${tile.name}</span><span class="tile-price">$${tile.price}</span>`;
    // property
    const g = HM.GROUPS[tile.group];
    const bandPos = side === 'top' ? 'bottom' : side === 'left' ? 'right' : side === 'right' ? 'left' : 'top';
    return `<span class="tile-band ${bandPos}" style="background:${g.color}"></span>
      <span class="tile-name" style="margin-top:${(bandPos==='top'||bandPos==='bottom')?'18%':'0'}">${tile.name}</span>
      <span class="tile-price">$${tile.price}</span>`;
  }

  function renderAll(){
    if (!state) return;
    renderHUD(); renderEventLog(); renderTurnPanel(); renderTiles(); HM.saveGame(state); evaluateGameAfter();
  }

  function renderHUD(){
    const cur = HM.currentPlayer(state);
    const ownersByPlayer = {};
    Object.entries(state.owners).forEach(([idx, pid]) => { (ownersByPlayer[pid] = ownersByPlayer[pid] || []).push(+idx); });
    const list = $('#player-hud'); list.innerHTML = '';
    state.players.forEach(p => {
      const props = ownersByPlayer[p.id] || [];
      const tok = HM.tokenById(p.tokenId);
      const card = document.createElement('div');
      card.className = `hud-card ${p.id===cur.id?'active':''} ${p.bankrupt?'bankrupt':''}`;
      card.dataset.testid = `player-card-${p.id}`;
      const tags = [
        p.isAI ? `<span class="hud-tag cpu">CPU·${p.difficulty?.toUpperCase()}</span>` : '',
        p.inJail ? `<span class="hud-tag jail">LOCKED</span>` : '',
        p.bankrupt ? `<span class="hud-tag out">OUT</span>` : '',
      ].join('');
      card.innerHTML = `
        ${p.id===cur.id?`<span class="your-turn-tag">YOUR TURN</span>`:''}
        <div class="hud-row">
          <div class="hud-token" style="background:radial-gradient(circle,${tok.color},${tok.color}88);color:${tok.color}">${HM.tokenSvg(tok, 16)}</div>
          <div class="hud-info">
            <div class="hud-name">${p.name}${tags}</div>
            <div class="hud-cash" data-testid="player-cash-${p.id}">$${p.cash}</div>
          </div>
        </div>
        ${props.length?`<div class="hud-props">${props.slice(0,10).map(i=>`<span title="${HM.BOARD[i].name}">${HM.BOARD[i].name}</span>`).join('')}${props.length>10?`<span>+${props.length-10}</span>`:''}</div>`:''}
        ${p.getOutCards>0?`<div class="eyebrow" style="color:#7FFFD4;margin-top:.3rem;font-size:.55rem">${p.getOutCards}× GET OUT FREE</div>`:''}
      `;
      list.appendChild(card);
    });
  }

  function renderEventLog(){
    const list = $('#event-log-list'); list.innerHTML = '';
    state.log.slice(0, 8).forEach(e => { const d = document.createElement('div'); d.className = 'entry'; d.textContent = e.text; list.appendChild(d); });
  }

  function renderTurnPanel(){
    const cur = HM.currentPlayer(state);
    $('#turn-name').textContent = cur ? cur.name : '—';
    $('#turn-meta').textContent = cur ? `${cur.isAI?`CPU · ${cur.difficulty}`:'You'}${cur.inJail?' · LOCKED UP':''}` : '—';
    $('#phase-val').textContent = phaseLabel(state.turnPhase);
    $('#dice-meta').textContent = `DICE · ${state.dice[0]} + ${state.dice[1]} = ${state.dice[0]+state.dice[1]}`;
    $('#die-0').textContent = state.dice[0]; $('#die-1').textContent = state.dice[1];
    const isHuman = cur && !cur.isAI && state.turnPhase !== 'gameOver';
    $('#btn-roll').disabled = !isHuman || state.turnPhase !== 'awaitingRoll' || rolling;
    $('#btn-end-turn').classList.toggle('hidden', !(isHuman && state.turnPhase === 'rolled'));

    // Modals
    const propModal = $('#modal-property'), cardModal = $('#modal-card');
    const propOpen = state.turnPhase === 'propertyOpen' && state.activeTile != null && isHuman;
    propModal.classList.toggle('hidden', !propOpen);
    if (propOpen) renderPropertyModal(state.activeTile, cur);
    const cardOpen = state.turnPhase === 'cardOpen' && !!state.activeCard && isHuman;
    cardModal.classList.toggle('hidden', !cardOpen);
    if (cardOpen) renderCardModal(state.activeCard);

    const endModal = $('#modal-end');
    endModal.classList.toggle('hidden', state.turnPhase !== 'gameOver');
    if (state.turnPhase === 'gameOver') renderEndModal();
  }

  function phaseLabel(p){
    return ({ awaitingRoll:'AWAITING ROLL', rolled:'POST-ROLL', cardOpen:'DRAWING CARD', propertyOpen:'PROPERTY OFFER', gameOver:'VAULT CLOSED' })[p] || (p||'').toUpperCase();
  }

  function renderTiles(){
    $$('.tile').forEach(el => {
      const idx = +el.dataset.idx;
      const ownerId = state.owners[idx];
      const owner = state.players.find(p => p.id === ownerId);
      el.classList.toggle('owned', !!owner);
      el.querySelectorAll('.tile-owner-dot, .tile-tokens').forEach(x => x.remove());
      if (owner){
        const d = document.createElement('span'); d.className='tile-owner-dot'; d.style.background = owner.color; el.appendChild(d);
      }
      const here = state.players.filter(p => p.position === idx && !p.bankrupt);
      if (here.length){
        const wrap = document.createElement('div'); wrap.className = 'tile-tokens';
        here.forEach(p => {
          const tok = HM.tokenById(p.tokenId);
          const t = document.createElement('span');
          t.className = 'tile-token'; t.style.background = tok.color; t.style.color = tok.color; t.title = p.name;
          t.dataset.testid = `player-token-${p.id}`;
          t.innerHTML = HM.tokenSvg(tok, 11);
          wrap.appendChild(t);
        });
        el.appendChild(wrap);
      }
    });
  }

  function renderPropertyModal(idx, player){
    const t = HM.BOARD[idx];
    $('#prop-name').textContent = t.name;
    const groupEl = $('#prop-group');
    if (t.type === 'property'){ groupEl.classList.remove('hidden'); groupEl.style.background = HM.GROUPS[t.group].color; groupEl.textContent = HM.GROUPS[t.group].name; }
    else groupEl.classList.add('hidden');
    const stats = [];
    stats.push(stat('PRICE', `$${t.price}`)); stats.push(stat('YOUR CASH', `$${player.cash}`));
    if (t.type === 'property'){ stats.push(stat('BASE RENT', `$${t.rent[0]}`)); stats.push(stat('HOTEL RENT', `$${t.rent[5]}`)); }
    if (t.type === 'transit') stats.push(stat('RENT (1·2·3·4)', t.rent.map(r=>`$${r}`).join(' · ')));
    if (t.type === 'utility') stats.push(stat('RENT', '4× or 10× dice'));
    $('#prop-stats').innerHTML = stats.join('');
    $('#btn-buy').disabled = player.cash < t.price;
  }
  function stat(label, val){ return `<div class="prop-stat"><div class="prop-stat-label">${label}</div><div class="prop-stat-val">${val}</div></div>`; }

  function renderCardModal(card){
    const isHood = card.deck === 'hood';
    const inner = $('#card-inner'); inner.classList.remove('flipped');
    const back = $('#card-back'), front = $('#card-front');
    back.classList.toggle('street-deck', !isHood);
    front.classList.toggle('street-deck', !isHood);
    $('#card-back-label').textContent = isHood ? 'HOOD CARD' : 'STREET CARD';
    $('#card-front-label').textContent = isHood ? 'HOOD CARD' : 'STREET CARD';
    $('#card-front-label').style.color = isHood ? '#D4AF37' : '#FF1493';
    $('#card-text').textContent = card.text;
    setTimeout(() => inner.classList.add('flipped'), 240);
  }

  function renderEndModal(){
    const winner = state.players.find(p => p.id === state.winner);
    if (!winner) return;
    const tok = HM.tokenById(winner.tokenId);
    $('#end-winner-token').innerHTML = `<div class="hud-token" style="background:radial-gradient(circle,${tok.color},${tok.color}88);color:${tok.color}">${HM.tokenSvg(tok, 22)}</div>`;
    $('#end-winner-name').textContent = winner.name;
    $('#end-winner-sub').textContent = `RUNS THE STREETS · $${winner.cash}`;
    $('#end-ranking').innerHTML = state.players.map(p => `<div class="rank-row ${p.id===winner.id?'winner':''}"><span>${p.name}</span><span>$${p.cash}${p.bankrupt?' · OUT':''}</span></div>`).join('');
  }

  function evaluateGameAfter(){
    const checked = HM.checkBankruptcy(state);
    if (checked !== state){
      if (checked.winner && !state.winner) HM.audio.victory();
      state = checked; renderAll();
    }
  }

  // --- Dice / actions ---
  function doRoll(){
    if (rolling) return; rolling = true;
    HM.audio.dice();
    $('#die-0').classList.add('rolling'); $('#die-1').classList.add('rolling');
    let n = 0;
    const tick = setInterval(() => {
      state = { ...state, dice: HM.rollDice() };
      $('#die-0').textContent = state.dice[0]; $('#die-1').textContent = state.dice[1];
      if (++n > 6){
        clearInterval(tick);
        const dice = HM.rollDice(); rolling = false;
        $('#die-0').classList.remove('rolling'); $('#die-1').classList.remove('rolling');
        state = HM.applyRoll(state, dice); renderAll(); maybeAITurn();
      }
    }, 90);
  }
  $('#btn-roll').addEventListener('click', doRoll);
  $('#btn-end-turn').addEventListener('click', () => { state = HM.nextTurn(state); renderAll(); maybeAITurn(); });
  $('#btn-buy').addEventListener('click', () => { HM.audio.buy(); state = HM.buyTile(state, HM.currentPlayer(state).id, state.activeTile); renderAll(); });
  $('#btn-pass').addEventListener('click', () => { HM.audio.click(); state = HM.declineBuy(state); renderAll(); });
  $('#btn-card-continue').addEventListener('click', () => { HM.audio.click(); state = HM.applyCardEffect(state, state.activeCard); renderAll(); });
  $('#btn-quit').addEventListener('click', () => { HM.clearGame(); setStage('menu'); });
  $('#btn-restart').addEventListener('click', () => { HM.clearGame(); setStage('menu'); });
  $('#btn-menu').addEventListener('click', () => { HM.clearGame(); setStage('menu'); });

  // --- AI driver ---
  function maybeAITurn(){
    clearTimeout(aiTimer);
    const cur = HM.currentPlayer(state);
    if (!cur || !cur.isAI || state.turnPhase === 'gameOver') return;
    aiTimer = setTimeout(() => {
      if (state.turnPhase === 'awaitingRoll') doRoll();
      else if (state.turnPhase === 'propertyOpen'){
        if (HM.aiShouldBuy(state, cur, state.activeTile, cur.difficulty)){ HM.audio.buy(); state = HM.buyTile(state, cur.id, state.activeTile); }
        else state = HM.declineBuy(state);
        renderAll(); maybeAITurn();
      } else if (state.turnPhase === 'cardOpen'){
        HM.audio.card(); state = HM.applyCardEffect(state, state.activeCard); renderAll(); maybeAITurn();
      } else if (state.turnPhase === 'rolled'){
        state = HM.nextTurn(state); renderAll(); maybeAITurn();
      }
    }, 800);
  }

  // --- Audio HUD ---
  let musicOn = false, muted = false;
  $('#btn-music').addEventListener('click', () => {
    musicOn = !musicOn;
    if (musicOn) HM.audio.startMusic(); else HM.audio.stopMusic();
    $('#btn-music').classList.toggle('on', musicOn);
  });
  $('#btn-mute').addEventListener('click', () => {
    muted = !muted; HM.audio.setMuted(muted);
    $('#btn-mute').textContent = muted ? '🔇' : '🔊';
    $('#btn-mute').classList.toggle('muted', muted);
  });
})();
