(()=>{
  'use strict';

  const bank = window.Play3DGameBank;
  const points = window.Play3DPoints;
  const regularSymbols = [
    {id:'cash', src:'./assets/cash.png'},
    {id:'chain', src:'./assets/chain.png'},
    {id:'crown', src:'./assets/crown.png'},
    {id:'hoodie', src:'./assets/hoodie.png'},
    {id:'key', src:'./assets/key.png'},
    {id:'lock', src:'./assets/lock.png'},
    {id:'mic', src:'./assets/mic.png'},
    {id:'speaker', src:'./assets/speaker.png'},
    {id:'vault', src:'./assets/vault.png'},
    {id:'play-3d', src:'./assets/play-3d-logo.svg'}
  ];
  const vaultPassSymbols = [
    {id:'vault-pass-100x3', src:'./assets/cover-100x3.png'},
    {id:'vault-pass-grammy', src:'./assets/cover-fuck-a-grammy.png'},
    {id:'vault-pass-resume', src:'./assets/cover-my-resume.png'},
    {id:'vault-pass-cover3', src:'./assets/cover3.jpg'}
  ];
  const paytable = {
    'play-3d':100,
    crown:50,
    vault:35,
    cash:25,
    mic:20,
    chain:15,
    speaker:12,
    hoodie:10,
    'album-cover':8
  };
  const paylines = [
    {id:'1', marker:'1 TOP', label:'1 Top Row', cells:[0,1,2]},
    {id:'2', marker:'2 MID', label:'2 Middle Row', cells:[3,4,5]},
    {id:'3', marker:'3 BOT', label:'3 Bottom Row', cells:[6,7,8]},
    {id:'4', marker:'4 ↘', label:'4 Left Diagonal', cells:[0,4,8]},
    {id:'5', marker:'5 ↗', label:'5 Right Diagonal', cells:[2,4,6]},
    {id:'6', marker:'6 COL L', label:'6 Left Column', cells:[0,3,6]},
    {id:'7', marker:'7 COL M', label:'7 Middle Column', cells:[1,4,7]},
    {id:'8', marker:'8 COL R', label:'8 Right Column', cells:[2,5,8]}
  ];
  const hasWildAsset = false;

  let creditsVal = bank ? bank.getCredits() : 1000;
  let betVal = 25;
  let spinning = false;
  const cells = [];
  const reelBoardEl = document.getElementById('reelBoard');
  const creditsEl = document.getElementById('credits');
  const betEl = document.getElementById('bet');
  const jackpotEl = document.getElementById('jackpot');
  const mainScoreEl = document.getElementById('mainScore');
  const spinBtnEl = document.getElementById('spinBtn');
  const betDownBtnEl = document.getElementById('betDownBtn');
  const betUpBtnEl = document.getElementById('betUpBtn');
  const playAgainBtnEl = document.getElementById('playAgainBtn');
  const lastWinEl = document.getElementById('lastWin');
  const lineWinEl = document.getElementById('lineWin');
  const winningLinesEl = document.getElementById('winningLines');
  const stateTextEl = document.getElementById('stateText');
  const resultLineEl = document.getElementById('resultLine');
  const paytableEl = document.getElementById('paytable');
  const wildNoteEl = document.getElementById('wildNote');
  const leftLineMarkersEl = document.getElementById('leftLineMarkers');
  const rightLineMarkersEl = document.getElementById('rightLineMarkers');
  const vaultPassOverlayEl = document.getElementById('vaultPassOverlay');
  const closeVaultPassBtnEl = document.getElementById('closeVaultPassBtn');
  const claimVaultPassBtnEl = document.getElementById('claimVaultPassBtn');

  function save(){
    if(bank) bank.setCredits(creditsVal);
  }

  function jackpotValue(){
    return bank ? bank.getJackpot() : 5000;
  }

  function weightedSymbol(){
    if(Math.random() < 0.018) return vaultPassSymbols[Math.floor(Math.random() * vaultPassSymbols.length)];
    return regularSymbols[Math.floor(Math.random() * regularSymbols.length)];
  }
  function isAlbumCover(symbol){
    return symbol.id.indexOf('vault-pass') === 0;
  }
  function payoutKey(symbol){
    return isAlbumCover(symbol) ? 'album-cover' : symbol.id;
  }
  function payoutFor(symbols){
    const keys = symbols.map(payoutKey);
    if(keys[0] === keys[1] && keys[1] === keys[2]){
      return paytable[keys[0]] || 5;
    }
    return 0;
  }

  function setCell(cell, symbol){
    cell.dataset.symbol = symbol.id;
    cell.dataset.vaultPass = String(symbol.id.indexOf('vault-pass') === 0);
    cell.innerHTML = '<img src="' + symbol.src + '" alt="' + symbol.id + '">';
    const image = cell.querySelector('img');
    image.onerror = ()=>{
      console.error('Missing slot asset:', symbol.src);
      cell.classList.add('asset-missing');
      cell.textContent = symbol.id;
    };
  }

  function buildBoard(){
    reelBoardEl.innerHTML = '';
    cells.length = 0;
    for(let i = 0; i < 9; i++){
      const cell = document.createElement('div');
      cell.className = 'reel-cell';
      setCell(cell, regularSymbols[i % regularSymbols.length]);
      cells.push(cell);
      reelBoardEl.appendChild(cell);
    }
  }
  function buildLineMarkers(){
    const left = paylines.slice(0,4);
    const right = paylines.slice(4);
    leftLineMarkersEl.innerHTML = left.map(line=>'<div class="line-marker" data-line-marker="'+line.id+'">'+line.marker+'</div>').join('');
    rightLineMarkersEl.innerHTML = right.map(line=>'<div class="line-marker" data-line-marker="'+line.id+'">'+line.marker+'</div>').join('');
  }
  function renderPaytable(){
    const rows = [
      ['3x 3D Logo','100x'],
      ['3x Crown','50x'],
      ['3x Vault','35x + jackpot'],
      ['3x Cash','25x'],
      ['3x Mic','20x'],
      ['3x Chain','15x'],
      ['3x Speaker','12x'],
      ['3x Hoodie','10x'],
      ['3x Album Cover','8x'],
      ['Any other 3-match','5x']
    ];
    paytableEl.innerHTML = rows.map(([label,value])=>'<div><span>'+label+'</span><b>'+value+'</b></div>').join('');
    wildNoteEl.textContent = hasWildAsset
      ? 'Wild asset active.'
      : 'No wild asset exists in this slot set, so no wild payouts are used.';
  }
  function clearWinningState(){
    cells.forEach(cell=>cell.classList.remove('winning'));
    document.querySelectorAll('.payline-overlay line,.line-marker').forEach(el=>el.classList.remove('active'));
  }
  function showWinningLines(wins){
    clearWinningState();
    wins.forEach(win=>{
      win.line.cells.forEach(index=>cells[index].classList.add('winning'));
      const lineEl = document.querySelector('.payline-overlay [data-line-id="'+win.line.id+'"]');
      if(lineEl) lineEl.classList.add('active');
      document.querySelectorAll('[data-line-marker="'+win.line.id+'"]').forEach(marker=>marker.classList.add('active'));
    });
  }

  function render(){
    creditsVal = Math.max(0, Math.floor(creditsVal));
    creditsEl.textContent = creditsVal;
    betEl.textContent = betVal;
    jackpotEl.textContent = jackpotValue();
    mainScoreEl.textContent = creditsVal;
    spinBtnEl.disabled = spinning || creditsVal < betVal;
    betDownBtnEl.disabled = spinning || betVal <= 25;
    betUpBtnEl.disabled = spinning || betVal >= 250 || betVal + 25 > creditsVal;
  }

  function lineScore(board){
    const wins = [];
    for(const line of paylines){
      const symbols = line.cells.map(index=>board[index]);
      const multiplier = payoutFor(symbols);
      if(multiplier){
        wins.push({
          line,
          symbols,
          multiplier,
          amount:betVal * multiplier,
          jackpot:symbols.every(symbol=>symbol.id === 'vault')
        });
      }
    }
    return {
      total:wins.reduce((sum,win)=>sum+win.amount,0),
      jackpotHit:wins.some(win=>win.jackpot),
      wins
    };
  }

  function vaultPassCount(board){
    return board.filter(symbol => symbol.id.indexOf('vault-pass') === 0).length;
  }

  function showVaultPass(){
    try{
      localStorage.setItem('play3d_vault_pass_bonus_v1', JSON.stringify({at:new Date().toISOString(), source:'slot-machine-custom'}));
    }catch(e){}
    vaultPassOverlayEl.hidden = false;
  }

  function finishSpin(board){
    board.forEach((symbol, i)=>setCell(cells[i], symbol));
    cells.forEach(cell => cell.classList.remove('spinning'));
    const passCount = vaultPassCount(board);
    const scored = lineScore(board);
    let win = scored.total;
    let label = win ? 'ASSET LINE WIN' : 'NO WIN';
    showWinningLines(scored.wins);

    if(scored.jackpotHit && bank){
      win += bank.claimJackpot();
      label = 'VAULT JACKPOT';
    }
    if(passCount >= 3){
      label = 'VAULT PASS';
      win += betVal * 25;
      showVaultPass();
    }

    creditsVal += win;
    lastWinEl.textContent = win;
    lineWinEl.textContent = scored.total;
    winningLinesEl.textContent = scored.wins.length ? scored.wins.map(win=>win.line.label).join(', ') : 'None';
    stateTextEl.textContent = label;
    resultLineEl.textContent = passCount >= 3
      ? 'Vault Pass unlocked. Claim button is ready.'
      : win
        ? label + ' pays ' + win + ' credits.'
        : 'No win. Pull again.';
    if(points && win > 0) points.award('slot-machine-custom', Math.min(300, Math.max(25, Math.floor(win / 8))), label.toLowerCase().replaceAll(' ','_'));
    spinning = false;
    playAgainBtnEl.hidden = false;
    save();
    render();
  }

  function spin(){
    if(spinning) return;
    creditsVal = bank ? bank.getCredits() : creditsVal;
    if(creditsVal < betVal){
      stateTextEl.textContent = 'NO CREDITS';
      resultLineEl.textContent = 'Not enough credits for this bet.';
      render();
      return;
    }
    spinning = true;
    creditsVal -= betVal;
    if(bank) bank.addJackpot(Math.ceil(betVal * 0.08));
    lastWinEl.textContent = '0';
    lineWinEl.textContent = '0';
    winningLinesEl.textContent = 'None';
    stateTextEl.textContent = 'SPINNING';
    resultLineEl.textContent = 'Reels spinning...';
    playAgainBtnEl.hidden = true;
    spinBtnEl.classList.add('pulled');
    cells.forEach(cell => cell.classList.add('spinning'));
    clearWinningState();
    save();
    render();

    let ticks = 0;
    const interval = setInterval(()=>{
      cells.forEach(cell => setCell(cell, weightedSymbol()));
      ticks++;
      if(ticks >= 15){
        clearInterval(interval);
        spinBtnEl.classList.remove('pulled');
        finishSpin(Array.from({length:9}, weightedSymbol));
      }
    }, 80);
  }

  betDownBtnEl.addEventListener('click', ()=>{
    if(spinning) return;
    betVal = Math.max(25, betVal - 25);
    render();
  });

  betUpBtnEl.addEventListener('click', ()=>{
    if(spinning) return;
    betVal = Math.min(250, betVal + 25);
    if(betVal > creditsVal) betVal = Math.max(25, Math.floor(creditsVal / 25) * 25);
    render();
  });

  spinBtnEl.addEventListener('click', spin);
  playAgainBtnEl.addEventListener('click', spin);
  closeVaultPassBtnEl.addEventListener('click', ()=>{ vaultPassOverlayEl.hidden = true; });
  claimVaultPassBtnEl.addEventListener('click', ()=>{
    const status = points ? points.getStatus() : {eligible:false, member:false};
    if(status.eligible) location.href = points.claimHref();
    else resultLineEl.textContent = status.member ? 'Vault Pass saved. Reach 100,000 points to claim prizes.' : 'Vault Pass saved. Member access is required for prize claims.';
    vaultPassOverlayEl.hidden = true;
  });

  buildBoard();
  buildLineMarkers();
  renderPaytable();
  render();
})();
