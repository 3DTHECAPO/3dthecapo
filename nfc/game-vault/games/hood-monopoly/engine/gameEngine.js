/* PLAY 3D · Hood Monopoly — Pure game engine */
window.HM = window.HM || {};
(function(){
  const STARTING_CASH = 1500, GO_REWARD = 200, JAIL_FINE = 50, MAX_JAIL_TURNS = 3, JAIL_TILE = 10;

  function createPlayer({ id, name, tokenId, isAI=false, difficulty='medium' }){
    return { id, name, tokenId, isAI, difficulty, cash:STARTING_CASH, position:0,
      properties:[], inJail:false, jailTurns:0, getOutCards:0, bankrupt:false, skipNextTurn:false,
      color: HM.tokenById(tokenId).color };
  }

  function createInitialState({ players }){
    return {
      players, currentPlayerIndex:0, turnPhase:'awaitingRoll',
      dice:[1,1], doubleStreak:0, owners:{}, houses:{},
      hoodDeck: HM.shuffle(HM.HOOD_CARDS).map(c=>c.id),
      streetDeck: HM.shuffle(HM.STREET_CARDS).map(c=>c.id),
      activeCard:null, activeTile:null,
      log:[{ id:'start', text:'Hood Monopoly · V-Town Edition — ready to roll on Vallejo.', t:Date.now() }],
      winner:null,
    };
  }

  function pushLog(state, text){
    return { ...state, log:[{ id:`${Date.now()}-${Math.random().toString(36).slice(2,6)}`, text, t:Date.now() }, ...state.log].slice(0,50) };
  }

  function currentPlayer(state){ return state.players[state.currentPlayerIndex]; }

  function rentForTile(state, tileIndex){
    const tile = HM.BOARD[tileIndex];
    const ownerId = state.owners[tileIndex]; if(!ownerId) return 0;
    if (tile.type === 'property'){
      const houses = state.houses[tileIndex]||0;
      if (houses === 0){
        const groupAll = HM.BOARD.map((t,i)=>({t,i})).filter(x => x.t.type==='property' && x.t.group===tile.group);
        const all = groupAll.every(x => state.owners[x.i] === ownerId);
        return tile.rent[0] * (all?2:1);
      }
      return tile.rent[Math.min(houses,5)];
    }
    if (tile.type === 'transit'){
      const owned = HM.BOARD.map((t,i)=>i).filter(i => HM.BOARD[i].type==='transit' && state.owners[i]===ownerId).length;
      return tile.rent[Math.min(owned,4)-1];
    }
    if (tile.type === 'utility'){
      const owned = HM.BOARD.map((t,i)=>i).filter(i => HM.BOARD[i].type==='utility' && state.owners[i]===ownerId).length;
      const mult = owned === 2 ? 10 : 4;
      return (state.dice[0]+state.dice[1])*mult;
    }
    return 0;
  }

  function rollDice(){ return [1+Math.floor(Math.random()*6), 1+Math.floor(Math.random()*6)]; }

  function transfer(state, fromId, toId, amount){
    const players = state.players.map(p => {
      if (p.id === fromId) return { ...p, cash: p.cash - amount };
      if (toId && p.id === toId) return { ...p, cash: p.cash + amount };
      return p;
    });
    return { ...state, players };
  }

  function movePlayer(state, playerId, steps){
    const players = state.players.map(p => {
      if (p.id !== playerId) return p;
      const oldPos = p.position;
      const newPos = (oldPos + steps + HM.TOTAL_TILES) % HM.TOTAL_TILES;
      let cash = p.cash;
      if (steps > 0 && newPos < oldPos) cash += GO_REWARD;
      return { ...p, position:newPos, cash };
    });
    return { ...state, players };
  }

  function moveToTile(state, playerId, tileIndex, { collectGo=true } = {}){
    const players = state.players.map(p => {
      if (p.id !== playerId) return p;
      let cash = p.cash;
      if (collectGo && tileIndex < p.position) cash += GO_REWARD;
      return { ...p, position:tileIndex, cash };
    });
    return { ...state, players };
  }

  function sendToJail(state, playerId){
    const players = state.players.map(p => p.id === playerId ? { ...p, position:JAIL_TILE, inJail:true, jailTurns:0 } : p);
    return pushLog({ ...state, players }, `${players.find(p=>p.id===playerId).name} got locked up.`);
  }

  function resolveLanding(state){
    const p = currentPlayer(state);
    const tile = HM.BOARD[p.position];
    let s = pushLog(state, `${p.name} landed on ${tile.name}.`);
    if (tile.type === 'corner'){
      if (tile.name === 'Go To Jail'){ s = sendToJail(s, p.id); }
      return { state:s, action:null };
    }
    if (tile.type === 'tax'){
      s = transfer(s, p.id, null, tile.amount);
      s = pushLog(s, `${p.name} paid ${tile.name}: -$${tile.amount}.`);
      return { state:s, action:{ type:'tax', amount:tile.amount } };
    }
    if (tile.type === 'hood-card' || tile.type === 'street-card'){
      const deckType = tile.type === 'hood-card' ? 'hood' : 'street';
      const deckKey = deckType === 'hood' ? 'hoodDeck' : 'streetDeck';
      const deck = [...s[deckKey]];
      const cardId = deck.shift(); deck.push(cardId);
      const card = HM.findCard(deckType, cardId);
      s = { ...s, [deckKey]:deck, activeCard:{ ...card, deck:deckType }, turnPhase:'cardOpen' };
      return { state:s, action:{ type:'card', card } };
    }
    if (tile.type === 'property' || tile.type === 'transit' || tile.type === 'utility'){
      const ownerId = s.owners[p.position];
      if (!ownerId){
        s = { ...s, activeTile:p.position, turnPhase:'propertyOpen' };
        return { state:s, action:{ type:'offer-buy', tileIndex:p.position } };
      }
      if (ownerId === p.id) return { state:s, action:null };
      const rent = rentForTile(s, p.position);
      s = transfer(s, p.id, ownerId, rent);
      const ownerName = s.players.find(pl=>pl.id===ownerId).name;
      s = pushLog(s, `${p.name} paid $${rent} rent to ${ownerName}.`);
      return { state:s, action:{ type:'rent', amount:rent, ownerId } };
    }
    return { state:s, action:null };
  }

  function applyCardEffect(state, card){
    const p = currentPlayer(state);
    let s = state;
    if (card.type === 'cash'){
      s = transfer(s, p.id, null, -card.amount);
      s = pushLog(s, `${p.name}: ${card.amount>=0?'gained':'paid'} $${Math.abs(card.amount)}.`);
    } else if (card.type === 'cashEach'){
      s.players.forEach(o => { if (o.id !== p.id && !o.bankrupt) s = transfer(s, o.id, p.id, card.amount); });
      s = pushLog(s, `${p.name} collected $${card.amount} from every player.`);
    } else if (card.type === 'jail'){
      s = sendToJail(s, p.id);
    } else if (card.type === 'getOutFree'){
      s = { ...s, players:s.players.map(pl => pl.id===p.id ? { ...pl, getOutCards:pl.getOutCards+1 } : pl) };
      s = pushLog(s, `${p.name} got a Get Out Of Jail Free card.`);
    } else if (card.type === 'moveTo'){
      s = moveToTile(s, p.id, card.tile, { collectGo:true });
      s = pushLog(s, `${p.name} moved to ${HM.BOARD[card.tile].name}.`);
      const res = resolveLanding(s);
      return { ...res.state, activeCard:null, turnPhase: res.action ? res.state.turnPhase : 'rolled' };
    } else if (card.type === 'move'){
      s = movePlayer(s, p.id, card.amount);
      const res = resolveLanding(s);
      return { ...res.state, activeCard:null, turnPhase: res.action ? res.state.turnPhase : 'rolled' };
    } else if (card.type === 'skip'){
      s = { ...s, players:s.players.map(pl => pl.id===p.id ? { ...pl, skipNextTurn:true } : pl) };
      s = pushLog(s, `${p.name} will lose their next turn.`);
    } else if (card.type === 'repairs'){
      let houses=0, hotels=0;
      p.properties.forEach(idx => { const h = s.houses[idx]||0; if (h===5) hotels++; else houses += h; });
      const cost = houses*card.house + hotels*card.hotel;
      s = transfer(s, p.id, null, cost);
      s = pushLog(s, `${p.name} paid $${cost} in repairs.`);
    }
    return { ...s, activeCard:null, turnPhase:'rolled' };
  }

  function buyTile(state, playerId, tileIndex){
    const tile = HM.BOARD[tileIndex];
    const player = state.players.find(p=>p.id===playerId);
    if (state.owners[tileIndex] || player.cash < tile.price) return state;
    const players = state.players.map(p => p.id===playerId ? { ...p, cash:p.cash-tile.price, properties:[...p.properties, tileIndex] } : p);
    const owners = { ...state.owners, [tileIndex]:playerId };
    return pushLog({ ...state, players, owners, activeTile:null, turnPhase:'rolled' }, `${player.name} bought ${tile.name} for $${tile.price}.`);
  }

  function declineBuy(state){ return { ...state, activeTile:null, turnPhase:'rolled' }; }

  function applyRoll(state, dice){
    const p = currentPlayer(state);
    const doubles = dice[0] === dice[1];
    let s = { ...state, dice, doubleStreak: doubles ? state.doubleStreak+1 : 0 };
    if (p.inJail){
      if (doubles){
        s = pushLog(s, `${p.name} rolled doubles and walked out of jail.`);
        s = { ...s, players:s.players.map(pl => pl.id===p.id ? { ...pl, inJail:false, jailTurns:0 } : pl) };
        s = movePlayer(s, p.id, dice[0]+dice[1]);
        const res = resolveLanding(s);
        return { ...res.state, turnPhase: res.action ? res.state.turnPhase : 'rolled' };
      }
      const nj = p.jailTurns + 1;
      if (nj >= MAX_JAIL_TURNS){
        s = transfer(s, p.id, null, JAIL_FINE);
        s = { ...s, players:s.players.map(pl => pl.id===p.id ? { ...pl, inJail:false, jailTurns:0 } : pl) };
        s = pushLog(s, `${p.name} paid $${JAIL_FINE} bail.`);
        s = movePlayer(s, p.id, dice[0]+dice[1]);
        const res = resolveLanding(s);
        return { ...res.state, turnPhase: res.action ? res.state.turnPhase : 'rolled' };
      }
      s = { ...s, players:s.players.map(pl => pl.id===p.id ? { ...pl, jailTurns:nj } : pl) };
      s = pushLog(s, `${p.name} stayed locked up (turn ${nj}/${MAX_JAIL_TURNS}).`);
      return { ...s, turnPhase:'rolled' };
    }
    if (doubles && s.doubleStreak >= 3){ s = sendToJail(s, p.id); return { ...s, turnPhase:'rolled' }; }
    s = movePlayer(s, p.id, dice[0]+dice[1]);
    const res = resolveLanding(s);
    return { ...res.state, turnPhase: res.action ? res.state.turnPhase : 'rolled' };
  }

  function nextTurn(state){
    if (state.players.filter(p=>!p.bankrupt).length <= 1){
      const win = state.players.find(p=>!p.bankrupt);
      return { ...state, turnPhase:'gameOver', winner: win ? win.id : null };
    }
    let i = state.currentPlayerIndex;
    for (let n=0; n<state.players.length; n++){ i = (i+1) % state.players.length; if (!state.players[i].bankrupt) break; }
    let players = state.players;
    if (players[i].skipNextTurn){
      players = players.map((p,idx) => idx===i ? { ...p, skipNextTurn:false } : p);
      let j = i;
      for (let n=0; n<players.length; n++){ j = (j+1) % players.length; if (!players[j].bankrupt) break; }
      i = j;
    }
    return pushLog({ ...state, players, currentPlayerIndex:i, turnPhase:'awaitingRoll', doubleStreak:0, activeCard:null, activeTile:null }, `${players[i].name}'s turn.`);
  }

  function checkBankruptcy(state){
    let s = state;
    s.players.forEach(p => {
      if (!p.bankrupt && p.cash < 0){
        s = {
          ...s,
          players: s.players.map(pl => pl.id===p.id ? { ...pl, bankrupt:true, properties:[] } : pl),
          owners: Object.fromEntries(Object.entries(s.owners).filter(([,v]) => v !== p.id)),
        };
        s = pushLog(s, `${p.name} went bankrupt.`);
      }
    });
    const alive = s.players.filter(p=>!p.bankrupt);
    if (alive.length === 1 && s.players.length > 1){ s = { ...s, winner:alive[0].id, turnPhase:'gameOver' }; }
    return s;
  }

  Object.assign(HM, { createPlayer, createInitialState, pushLog, currentPlayer, rentForTile,
    rollDice, movePlayer, moveToTile, sendToJail, resolveLanding, applyCardEffect,
    buyTile, declineBuy, applyRoll, nextTurn, checkBankruptcy });
})();
