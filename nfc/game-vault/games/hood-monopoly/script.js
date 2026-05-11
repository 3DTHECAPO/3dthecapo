(()=>{
  'use strict';

  const tokenDefs = [
    {id:'lowrider', name:'Lowrider Car'},
    {id:'bart', name:'BART Train'},
    {id:'trap', name:'Trap House'},
    {id:'crown', name:'Gold Crown'},
    {id:'moneybag', name:'Money Bag'},
    {id:'mic', name:'Microphone'},
    {id:'key', name:'Vault Key'},
    {id:'sneaker', name:'Sneaker'}
  ];
  const colors = ['#d94b4b','#47a8ff','#47d98b','#b873ff'];
  const boardPattern = [
    [10,10],[9,10],[8,10],[7,10],[6,10],[5,10],[4,10],[3,10],[2,10],[1,10],[0,10],
    [0,9],[0,8],[0,7],[0,6],[0,5],[0,4],[0,3],[0,2],[0,1],[0,0],
    [1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],
    [10,1],[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9]
  ];
  const spaces = [
    corner('START','Collect $200 when passing'),
    property('West Vallejo Trap House',60,8,'#7b4a24','trap'), card('Hustle Cards','hustle'), property('Downtown Corner Store',60,10,'#7b4a24','store'),
    tax('Studio Fees',75), station('BART Station - Downtown'), property('Sonoma Blvd Liquor Store',100,12,'#69a7ff','liquor'), card('Raid Cards','raid'), property('Tennessee St Barbershop',120,16,'#69a7ff','barber'), property('Springs Road Merch Warehouse',150,20,'#69a7ff','warehouse'), corner('County Hold','Pay $100 or roll doubles to leave'),
    property('Mare Island Studio Lot',140,18,'#d65379','studio'), property('North Vallejo Club Section',140,18,'#d65379','club'), station('BART Station - Waterfront'), property('Vallejo Waterfront Car Lot',160,22,'#d65379','car'), card('Hustle Cards','hustle'), property('Casino Room',180,24,'#f09842','casino'), property('Vault Room',200,28,'#f09842','vault'), tax('Legal Team',100), property('Georgia Street Video Shoot',250,34,'#f09842','video'), corner('Free Studio Session','Random bonus or card'),
    property('Album Drop',220,32,'#e84242','album'), card('Raid Cards','raid'), property('Pop-Up Shop',220,32,'#e84242','popup'), station('BART Station - Magazine'), property('Chain Store',240,36,'#e84242','chain'), property('Block Party',260,40,'#35b86f','party'), card('Hustle Cards','hustle'), property('East Vallejo',280,44,'#35b86f','map'), property('South Vallejo',300,50,'#315ce8','map'), corner('Go To County','Report to County Hold'),
    property('Magazine Street',300,50,'#315ce8','map'), property('Broadway',320,55,'#315ce8','map'), card('Raid Cards','raid'), tax('Street Tax',110), property('Lemon Street',350,60,'#8c4cf2','map'), station('BART Station - North'), property('North Vallejo',360,65,'#8c4cf2','map'), card('Hustle Cards','hustle'), property('Empire Tower',400,80,'#d8b14b','tower')
  ];
  const hustleCards = [
    {title:'Merch Drop Sold Out', text:'Collect $250 from the bank.', money:250},
    {title:'Studio Session Went Viral', text:'Collect $300.', money:300},
    {title:'Feature Verse Paid', text:'Collect $200.', money:200},
    {title:'Pop-Up Shop Hit', text:'Collect $150.', money:150},
    {title:'Block Party Boosted Respect', text:'Collect $100 from each player.', collectPlayers:100},
    {title:'BART Hustle Run', text:'Move to the nearest BART Station.', nearest:'bart'},
    {title:'Album Drop Streaming Bonus', text:'Collect $400.', money:400},
    {title:'Studio Connect', text:'Upgrade one owned block for half price.', upgrade:true},
    {title:'Fast Pass', text:'Move to START and collect $200.', move:0, collect:true}
  ];
  const raidCards = [
    {title:'Police Sweep', text:'Pay $200.', money:-200},
    {title:'Car Impounded', text:'Pay $150.', money:-150},
    {title:'Studio Equipment Broke', text:'Pay $175.', money:-175},
    {title:'Fake Friend Tax', text:'Pay $100.', money:-100},
    {title:'Chain Snatched Scare', text:'Lose $125.', money:-125},
    {title:'Go Directly To County Hold', text:'Do not pass START.', county:true},
    {title:'Missed Rent Payment', text:'Pay bank $120.', money:-120}
  ];

  let state = null;
  let selectedProperty = null;

  const boardEl = document.getElementById('board');
  const setupPanel = document.getElementById('setupPanel');
  const gamePanel = document.getElementById('gamePanel');
  const playerSetup = document.getElementById('playerSetup');
  const playerCount = document.getElementById('playerCount');
  const rollBtn = document.getElementById('rollBtn');
  const turnName = document.getElementById('turnName');
  const turnStatus = document.getElementById('turnStatus');
  const playerStats = document.getElementById('playerStats');
  const ownedList = document.getElementById('ownedList');
  const gameLog = document.getElementById('gameLog');
  const modal = document.getElementById('modal');
  const modalKicker = document.getElementById('modalKicker');
  const modalTitle = document.getElementById('modalTitle');
  const modalText = document.getElementById('modalText');
  const modalActions = document.getElementById('modalActions');
  const propertyCard = document.getElementById('propertyCard');

  function corner(name, desc){ return {type:'corner', name, desc}; }
  function property(name, price, rent, color, kind='business'){ return {type:'property', kind, name, price, rent, color, owner:null, upgrades:0}; }
  function station(name){ return {type:'property', kind:'bart', name, price:200, rent:25, color:'#f4c65a', owner:null, upgrades:0}; }
  function card(name, deck){ return {type:'card', name, deck}; }
  function tax(name, amount){ return {type:'tax', name, amount}; }
  function money(n){ return '$' + n.toLocaleString(); }
  function player(){ return state.players[state.current]; }
  function log(line){
    state.log.unshift(line);
    state.log = state.log.slice(0,36);
  }

  function buildSetup(){
    playerSetup.innerHTML = '';
    const count = Number(playerCount.value);
    for(let i=0;i<count;i++){
      const row = document.createElement('div');
      row.className = 'player-row';
      row.innerHTML = `
        <input id="pname${i}" value="Player ${i+1}" maxlength="18" aria-label="Player ${i+1} name">
        <select id="ptoken${i}" aria-label="Player ${i+1} token">
          ${tokenDefs.map((t,idx)=>`<option value="${t.id}" ${idx===i?'selected':''}>${t.name}</option>`).join('')}
        </select>`;
      playerSetup.appendChild(row);
    }
  }

  function tokenSvg(token, className='token'){
    return `<span class="${className}"><svg viewBox="0 0 96 96" aria-hidden="true"><use href="./assets/tokens.svg#token-${token}"></use></svg></span>`;
  }

  function artFor(space){
    const key = space.type === 'corner' ? space.name.toLowerCase().replaceAll(' ','-') : (space.kind || space.deck || space.type);
    return `<div class="space-art"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="./assets/board-art.svg#art-${key}"></use></svg></div>`;
  }

  function badgeFor(space){
    if(!space.upgrades) return '';
    return `<div class="badge-stack">${Array.from({length:space.upgrades},()=>'<span class="upgrade-badge"></span>').join('')}</div>`;
  }

  function renderBoard(){
    boardEl.querySelectorAll('.space').forEach(node=>node.remove());
    spaces.forEach((space, index)=>{
      const [row,col] = boardPattern[index];
      const el = document.createElement('div');
      el.className = 'space' + (space.type === 'corner' ? ' corner' : '');
      el.style.gridRow = (row + 1);
      el.style.gridColumn = (col + 1);
      if(state && index === player().position) el.classList.add('current');
      const stripe = space.color ? `<div class="stripe" style="background:${space.color}"></div>` : '<div class="stripe"></div>';
      el.classList.add('space-' + (space.kind || space.deck || space.type));
      el.innerHTML = `${stripe}${artFor(space)}${badgeFor(space)}<div class="space-name">${space.name}</div><div class="space-price">${space.price ? money(space.price) : (space.amount ? money(space.amount) : '')}</div><div class="tokens" data-tokens="${index}"></div>`;
      boardEl.appendChild(el);
    });
    renderTokens();
  }

  function renderTokens(){
    boardEl.querySelectorAll('[data-tokens]').forEach(t=>t.innerHTML='');
    if(!state) return;
    state.players.forEach((p,idx)=>{
      const slot = boardEl.querySelector(`[data-tokens="${p.position}"]`);
      if(slot){
        slot.insertAdjacentHTML('beforeend', tokenSvg(p.token));
        const token = slot.lastElementChild;
        token.style.setProperty('--player-color', colors[idx]);
        if(idx === state.current) token.classList.add('active-token');
      }
    });
  }

  function renderDice(a=1,b=1,rolling=false){
    drawDie(document.getElementById('dieOne'), a, rolling);
    drawDie(document.getElementById('dieTwo'), b, rolling);
  }
  function drawDie(el, value, rolling){
    const map = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
    el.classList.toggle('rolling', rolling);
    el.innerHTML = Array.from({length:9},(_,i)=>map[value].includes(i)?'<span class="pip"></span>':'<span></span>').join('');
  }

  function renderPanels(){
    if(!state) return;
    const current = player();
    turnName.textContent = current.name;
    turnStatus.textContent = state.awaitingAction ? 'Choose an action to finish the turn.' : (state.gameOver ? 'Game over.' : 'Roll when ready.');
    rollBtn.disabled = state.awaitingAction || state.gameOver;
    playerStats.innerHTML = state.players.map((p,idx)=>`
      <div class="player-stat ${idx===state.current?'active':''}">
        ${tokenSvg(p.token,'mini-token')}
        <div><b>${p.name}</b><br><small>${p.properties.length} blocks${p.inCounty ? ' - County Hold' : ''}</small></div>
        <div class="money">${money(p.cash)}</div>
      </div>`).join('');
    const owned = current.properties.map(i=>spaces[i]);
    ownedList.innerHTML = owned.length ? owned.map(s=>`
      <div class="owned-card">
        <b>${s.name}</b><br><span>Rent ${money(rentFor(s))} - Level ${s.upgrades}</span>
        <button data-upgrade="${spaces.indexOf(s)}" type="button">Upgrade ${money(upgradeCost(s))}</button>
      </div>`).join('') : '<div class="owned-card">No blocks owned yet.</div>';
    ownedList.querySelectorAll('[data-upgrade]').forEach(btn=>btn.onclick=()=>upgradeProperty(Number(btn.dataset.upgrade)));
    gameLog.innerHTML = state.log.map(line=>`<div class="log-line">${line}</div>`).join('');
    renderBoard();
  }

  function startGame(){
    const count = Number(playerCount.value);
    const used = new Set();
    const players = [];
    for(let i=0;i<count;i++){
      let token = document.getElementById('ptoken'+i).value;
      if(used.has(token)) token = tokenDefs.find(t=>!used.has(t.id)).id;
      used.add(token);
      players.push({
        name:document.getElementById('pname'+i).value.trim() || `Player ${i+1}`,
        token,
        cash:1500,
        position:0,
        properties:[],
        inCounty:false,
        countyTurns:0,
        bankrupt:false
      });
    }
    state = {players,current:0,dice:[1,1],awaitingAction:false,gameOver:false,log:['Game started. Build the empire.']};
    setupPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    renderBoard();
    renderDice();
    renderPanels();
  }

  async function rollDice(){
    if(!state || state.awaitingAction || state.gameOver) return;
    const p = player();
    if(p.inCounty){
      showCountyChoice();
      return;
    }
    renderDice(1,1,true);
    rollBtn.disabled = true;
    await wait(650);
    const a = 1 + Math.floor(Math.random()*6);
    const b = 1 + Math.floor(Math.random()*6);
    state.dice = [a,b];
    renderDice(a,b,false);
    log(`${p.name} rolled ${a + b}.`);
    await movePlayer(a+b);
    resolveLanding();
  }

  async function rollFromCounty(){
    hideModal();
    state.awaitingAction = false;
    const p = player();
    renderDice(1,1,true);
    rollBtn.disabled = true;
    await wait(650);
    const a = 1 + Math.floor(Math.random()*6);
    const b = 1 + Math.floor(Math.random()*6);
    state.dice = [a,b];
    renderDice(a,b,false);
    if(a === b){
      p.inCounty = false;
      p.countyTurns = 0;
      log(`${p.name} rolled doubles and left County Hold.`);
      await movePlayer(a+b);
      resolveLanding();
    }else{
      p.countyTurns += 1;
      log(`${p.name} did not roll doubles and remains in County Hold.`);
      endTurn();
    }
  }

  function showCountyChoice(){
    const p = player();
    state.awaitingAction = true;
    showModal({
      kicker:'County Hold',
      title:'County Hold',
      text:`${p.name} can pay $100 to leave now or roll doubles. Current cash: ${money(p.cash)}.`,
      actions:[
        {label:'Pay $100', primary:true, fn:()=>{ p.cash -= 100; cashFly(-100); p.inCounty=false; p.countyTurns=0; hideModal(); state.awaitingAction=false; log(`${p.name} paid $100 to leave County Hold.`); checkBankrupt(p); endTurn(); }},
        {label:'Roll Doubles', fn:rollFromCounty}
      ]
    });
  }

  async function movePlayer(steps){
    const p = player();
    for(let i=0;i<steps;i++){
      p.position = (p.position + 1) % spaces.length;
      if(p.position === 0){ p.cash += 200; log(`${p.name} passed START and collected $200.`); }
      renderBoard();
      await wait(130);
    }
  }

  function resolveLanding(){
    const p = player();
    const space = spaces[p.position];
    if(space.type === 'property'){
      if(space.owner === null){
        state.awaitingAction = true;
        selectedProperty = p.position;
        showPropertyModal(space, p);
      }else if(space.owner === state.current){
        log(`${p.name} landed on their own ${space.name}.`);
        endTurn();
      }else{
        const owner = state.players[space.owner];
        const rent = rentFor(space);
        p.cash -= rent;
        owner.cash += rent;
        cashFly(-rent);
        log(`${p.name} paid ${owner.name} ${money(rent)} rent for ${space.name}.`);
        checkBankrupt(p);
        endTurn();
      }
      return;
    }
    if(space.type === 'tax'){
      p.cash -= space.amount;
      cashFly(-space.amount);
      log(`${p.name} paid ${money(space.amount)} for ${space.name}.`);
      checkBankrupt(p);
      endTurn();
      return;
    }
    if(space.type === 'card'){
      drawCard(space.deck);
      return;
    }
    if(space.name === 'Go To County'){
      sendToCounty(p);
      endTurn();
      return;
    }
    if(space.name === 'Free Studio Session'){
      if(Math.random() > .45){ p.cash += 100; log(`${p.name} got a free studio bonus: $100.`); endTurn(); }
      else drawCard('hustle');
      return;
    }
    log(`${p.name} landed on ${space.name}.`);
    endTurn();
  }

  function showPropertyModal(space, p){
    showModal({
      kicker:'Unowned Block',
      title:space.name,
      text:`Buy this block for ${money(space.price)} and collect ${money(space.rent)} base rent.`,
      property:space,
      actions:[
        {label:'Buy', primary:true, fn:()=>buyProperty(selectedProperty)},
        {label:'Skip', fn:()=>{ hideModal(); state.awaitingAction=false; endTurn(); }}
      ]
    });
  }

  function buyProperty(index){
    const p = player();
    const space = spaces[index];
    if(p.cash < space.price){
      log(`${p.name} cannot afford ${space.name}.`);
    }else{
      p.cash -= space.price;
      space.owner = state.current;
      p.properties.push(index);
      cashFly(-space.price);
      log(`${p.name} bought ${space.name} for ${money(space.price)}.`);
    }
    hideModal();
    state.awaitingAction = false;
    checkBankrupt(p);
    endTurn();
  }

  function upgradeProperty(index){
    const p = player();
    const space = spaces[index];
    if(!space || space.owner !== state.current || state.awaitingAction || state.gameOver) return;
    const cost = upgradeCost(space);
    if(space.upgrades >= 3){ log(`${space.name} is already maxed out.`); }
    else if(p.cash < cost){ log(`${p.name} needs ${money(cost)} to upgrade ${space.name}.`); }
    else{
      p.cash -= cost;
      space.upgrades += 1;
      cashFly(-cost);
      log(`${p.name} upgraded ${space.name} to level ${space.upgrades}.`);
    }
    renderPanels();
  }

  function rentFor(space){
    if(space.kind === 'bart' && space.owner !== null){
      const count = state.players[space.owner].properties.filter(i=>spaces[i].kind === 'bart').length;
      return [0,25,50,100,200][count] || 25;
    }
    return space.rent + (space.upgrades * Math.ceil(space.rent * .65));
  }
  function upgradeCost(space){ return Math.ceil(space.price * (.55 + space.upgrades * .25)); }

  function drawCard(deck){
    const cards = deck === 'hustle' ? hustleCards : raidCards;
    const card = cards[Math.floor(Math.random()*cards.length)];
    const p = player();
    state.awaitingAction = true;
    showModal({
      kicker:deck === 'hustle' ? 'Hustle Card' : 'Raid Card',
      title:card.title,
      text:card.text,
      actions:[{label:'Run It', primary:true, fn:()=>{ applyCard(card); hideModal(); state.awaitingAction=false; checkBankrupt(p); endTurn(); }}]
    });
  }

  function applyCard(card){
    const p = player();
    if(card.money){ p.cash += card.money; cashFly(card.money); }
    if(card.collectPlayers){
      state.players.forEach((other, idx)=>{
        if(idx !== state.current && !other.bankrupt){
          other.cash -= card.collectPlayers;
          p.cash += card.collectPlayers;
        }
      });
      cashFly(card.collectPlayers * (state.players.length - 1));
    }
    if(card.county) sendToCounty(p);
    if(card.nearest === 'bart'){
      const old = p.position;
      const stations = spaces.map((s,i)=>s.kind === 'bart' ? i : -1).filter(i=>i >= 0);
      const next = stations.find(i=>i > old) ?? stations[0];
      if(next < old) p.cash += 200;
      p.position = next;
      log(`${p.name} moved to ${spaces[next].name}.`);
    }
    if(card.move !== undefined){
      if(card.collect && p.position !== 0) p.cash += 200;
      p.position = card.move;
    }
    if(card.back) p.position = (p.position - card.back + spaces.length) % spaces.length;
    if(card.upgrade){
      const owned = p.properties.map(i=>spaces[i]).find(s=>s.upgrades < 3);
      if(owned && p.cash >= Math.ceil(upgradeCost(owned)/2)){
        p.cash -= Math.ceil(upgradeCost(owned)/2);
        owned.upgrades += 1;
        log(`${p.name} used a Studio Connect upgrade on ${owned.name}.`);
      }
    }
    log(`${p.name}: ${card.title}.`);
  }

  function sendToCounty(p){
    p.position = 10;
    p.inCounty = true;
    p.countyTurns = 0;
    log(`${p.name} was sent to County Hold.`);
  }

  function endTurn(){
    if(!state) return;
    checkWinner();
    if(state.gameOver){ renderPanels(); return; }
    do{
      state.current = (state.current + 1) % state.players.length;
    }while(state.players[state.current].bankrupt);
    state.awaitingAction = false;
    renderPanels();
  }

  function checkBankrupt(p){
    if(p.cash >= 0 || p.bankrupt) return;
    p.bankrupt = true;
    log(`${p.name} is bankrupt.`);
    p.properties.forEach(i=>{ spaces[i].owner = null; spaces[i].upgrades = 0; });
    p.properties = [];
  }

  function checkWinner(){
    const alive = state.players.filter(p=>!p.bankrupt);
    if(alive.length === 1){
      state.gameOver = true;
      confetti();
      showModal({
        kicker:'Winner',
        title:`${alive[0].name} owns the board`,
        text:'The street empire is locked. Reset to run it back.',
        actions:[{label:'New Game', primary:true, fn:()=>{ hideModal(); resetGame(); }}]
      });
    }
  }

  function showModal({kicker,title,text,property,actions}){
    modalKicker.textContent = kicker;
    modalTitle.textContent = title;
    modalText.textContent = text;
    propertyCard.classList.toggle('hidden', !property);
    propertyCard.innerHTML = property ? `<h3>${property.name}</h3><p>Price ${money(property.price)} - Rent ${money(rentFor(property))} - Upgrade ${money(upgradeCost(property))}</p>` : '';
    modalActions.innerHTML = '';
    actions.forEach(action=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      if(action.primary) btn.className = 'primary';
      btn.onclick = action.fn;
      modalActions.appendChild(btn);
    });
    modal.classList.remove('hidden');
  }
  function hideModal(){ modal.classList.add('hidden'); }
  function wait(ms){ return new Promise(resolve=>setTimeout(resolve, ms)); }
  function cashFly(amount){
    const el = document.createElement('div');
    el.className = 'cash-fly' + (amount < 0 ? ' negative' : '');
    el.textContent = (amount < 0 ? '-' : '+') + money(Math.abs(amount));
    document.body.appendChild(el);
    window.setTimeout(()=>el.remove(), 950);
  }
  function confetti(){
    const el = document.createElement('div');
    el.className = 'confetti';
    document.body.appendChild(el);
    window.setTimeout(()=>el.remove(), 1700);
  }

  function saveGame(){
    if(!state) return;
    const payload = {state, spaces:spaces.map(s=>({owner:s.owner, upgrades:s.upgrades}))};
    localStorage.setItem('play3d_hood_monopoly_save', JSON.stringify(payload));
    log('Game saved.');
    renderPanels();
  }
  function loadGame(){
    const raw = localStorage.getItem('play3d_hood_monopoly_save');
    if(!raw) return;
    try{
      const payload = JSON.parse(raw);
      payload.spaces.forEach((saved,i)=>{ if(spaces[i]){ spaces[i].owner=saved.owner; spaces[i].upgrades=saved.upgrades; } });
      state = payload.state;
      setupPanel.classList.add('hidden');
      gamePanel.classList.remove('hidden');
      renderDice(state.dice[0], state.dice[1]);
      renderPanels();
      log('Game loaded.');
      renderPanels();
    }catch(e){
      console.warn('Hood Monopoly save could not load', e);
    }
  }
  function resetGame(){
    spaces.forEach(s=>{ if(s.type === 'property'){ s.owner = null; s.upgrades = 0; } });
    state = null;
    setupPanel.classList.remove('hidden');
    gamePanel.classList.add('hidden');
    hideModal();
    buildSetup();
  }

  playerCount.onchange = buildSetup;
  document.getElementById('startGameBtn').onclick = startGame;
  rollBtn.onclick = rollDice;
  document.getElementById('saveBtn').onclick = saveGame;
  document.getElementById('loadBtn').onclick = loadGame;
  document.getElementById('resetBtn').onclick = resetGame;
  document.getElementById('modalClose').onclick = ()=>{ if(!state || !state.awaitingAction) hideModal(); };
  buildSetup();
  renderBoard();
  renderDice();
})();
