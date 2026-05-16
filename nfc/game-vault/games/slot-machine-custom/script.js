(()=>{
  'use strict';

  const bank = window.Play3DGameBank;
  const points = window.Play3DPoints;
  const regularSymbols = [
    {id:'cash', src:'./assets/cash.png', pay:10},
    {id:'chain', src:'./assets/chain.png', pay:12},
    {id:'crown', src:'./assets/crown.png', pay:18},
    {id:'hoodie', src:'./assets/hoodie.png', pay:14},
    {id:'key', src:'./assets/key.png', pay:15},
    {id:'lock', src:'./assets/lock.png', pay:15},
    {id:'mic', src:'./assets/mic.png', pay:16},
    {id:'speaker', src:'./assets/speaker.png', pay:13},
    {id:'vault', src:'./assets/vault.png', pay:24},
    {id:'play-3d', src:'./assets/play-3d-logo.svg', pay:20}
  ];
  const vaultPassSymbols = [
    {id:'vault-pass-100x3', src:'./assets/cover-100x3.png'},
    {id:'vault-pass-grammy', src:'./assets/cover-fuck-a-grammy.png'},
    {id:'vault-pass-resume', src:'./assets/cover-my-resume.png'},
    {id:'vault-pass-cover3', src:'./assets/cover3.jpg'}
  ];

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
  const stateTextEl = document.getElementById('stateText');
  const resultLineEl = document.getElementById('resultLine');
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
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    let total = 0;
    let jackpotHit = false;
    const pays = Object.fromEntries(regularSymbols.map(s => [s.id, s.pay]));

    for(const line of lines){
      const ids = line.map(i => board[i].id);
      if(ids[0] === ids[1] && ids[1] === ids[2] && pays[ids[0]]){
        total += betVal * pays[ids[0]];
        if(ids[0] === 'vault') jackpotHit = true;
      }
    }
    return {total, jackpotHit};
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
    stateTextEl.textContent = 'SPINNING';
    resultLineEl.textContent = 'Reels spinning...';
    playAgainBtnEl.hidden = true;
    spinBtnEl.classList.add('pulled');
    cells.forEach(cell => cell.classList.add('spinning'));
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
  render();
})();
