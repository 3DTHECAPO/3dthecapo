(()=>{
  'use strict';

  function play3dAnnounce(event, type, message){
    window.dispatchEvent(new CustomEvent('superior:event', { detail:{ category:'slots', event:event, type:type, message:message } }));
  }

  const soundStatus = Object.create(null);
  const slotWheelSound = createSound('slot-wheel', './sounds/slot-wheel.wav');
  const smallHitSound = createSound('small-hit', './sounds/small-hit.wav');
  const bigWinSound = createSound('slot-machine-big-win', './sounds/slot-machine-big-win.wav');

  function reportSoundIssue(name, message, extra){
    const detail = extra ? ' ' + JSON.stringify(extra) : '';
    console.warn('[PLAY 3D SLOTS SOUND] ' + name + ': ' + message + detail);
    const line = document.getElementById('resultLine');
    if(line && !line.dataset.soundWarningShown){
      line.dataset.soundWarningShown = '1';
      line.textContent = 'Sound warning: ' + name + ' ' + message + '. Spin still works.';
    }
  }

  function createSound(name, src){
    const sound = new Audio(src);
    sound.preload = 'auto';
    sound.dataset.soundName = name;
    soundStatus[name] = {src, loaded:false, error:null};
    sound.addEventListener('canplaythrough', ()=>{
      soundStatus[name].loaded = true;
    }, {once:true});
    sound.addEventListener('error', ()=>{
      const mediaError = sound.error ? {
        code:sound.error.code,
        message:sound.error.message || ''
      } : null;
      soundStatus[name].error = mediaError || 'unknown media error';
      reportSoundIssue(name, 'failed to load ' + src, mediaError);
    });
    sound.load();
    return sound;
  }

  window.Play3DSlotsSoundStatus = function(){
    return JSON.parse(JSON.stringify(soundStatus));
  };

  function playSound(sound, loop=false){
    if(!sound) return;
    const name = sound.dataset.soundName || sound.src || 'unknown';
    try{
      if(sound.error){
        reportSoundIssue(name, 'cannot play because the audio file has a media error', {code:sound.error.code, message:sound.error.message || ''});
        return;
      }
      if(sound.readyState === 0){
        reportSoundIssue(name, 'has not loaded yet; verify the file is not empty or blocked', {src:sound.currentSrc || sound.src});
      }
      sound.pause();
      sound.currentTime = 0;
      sound.loop = !!loop;
      const attempt = sound.play();
      if(attempt && typeof attempt.catch === 'function'){
        attempt.catch(err=>{
          reportSoundIssue(name, 'playback failed', {name:err && err.name, message:err && err.message});
        });
      }
    }catch(e){
      reportSoundIssue(name, 'playback threw', {name:e && e.name, message:e && e.message});
    }
  }

  function stopSound(sound){
    if(!sound) return;
    try{
      sound.pause();
      sound.currentTime = 0;
      sound.loop = false;
    }catch(e){
      reportSoundIssue(sound.dataset.soundName || 'unknown', 'stop threw', {name:e && e.name, message:e && e.message});
    }
  }

  function playSpinSound(){ playSound(slotWheelSound, true); }
  function stopSpinSound(){ stopSound(slotWheelSound); }
  function playSmallHit(){ playSound(smallHitSound); }
  function playBigWin(){ playSound(bigWinSound); }

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
    {id:'vault', src:'./assets/vault.png', pay:24}
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
  const payListEl = document.getElementById('payList');
  const paylineOverlay = document.getElementById('paylineOverlay');
  const payLines = [
    {key:'top', name:'Top row', cells:[0,1,2]},
    {key:'middle', name:'Middle row', cells:[3,4,5]},
    {key:'bottom', name:'Bottom row', cells:[6,7,8]},
    {key:'diagonal-down', name:'Diagonal down', cells:[0,4,8]},
    {key:'diagonal-up', name:'Diagonal up', cells:[2,4,6]},
    {key:'left-column', name:'Left column', cells:[0,3,6]},
    {key:'middle-column', name:'Middle column', cells:[1,4,7]},
    {key:'right-column', name:'Right column', cells:[2,5,8]}
  ];
  let lastLineHits = [];

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
    cell.innerHTML = '<img src="' + symbol.src + '" alt="">';
  }

  function buildBoard(){
    reelBoard.innerHTML = '';
    for(let i = 0; i < 9; i++){
      const cell = document.createElement('div');
      cell.className = 'reel-cell';
      setCell(cell, regularSymbols[i % regularSymbols.length]);
      cells.push(cell);
      reelBoard.appendChild(cell);
    }
  }

  function render(){
    creditsVal = Math.max(0, Math.floor(creditsVal));
    credits.textContent = creditsVal;
    bet.textContent = betVal;
    jackpot.textContent = jackpotValue();
    mainScore.textContent = creditsVal;
    spinBtn.disabled = spinning || creditsVal < betVal;
    betDownBtn.disabled = spinning || betVal <= 25;
    betUpBtn.disabled = spinning || betVal >= 250 || betVal + 25 > creditsVal;
    renderPayList();
  }

  function symbolLabel(id){
    return id.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderPayList(){
    if(!payListEl) return;
    const rows = [];
    lastLineHits.forEach(hit => {
      rows.push('<div class="last-hit"><span>Last hit: ' + hit.line + ' - ' + hit.combo + '</span><b>' + hit.payout + '</b></div>');
    });
    regularSymbols.forEach(symbol => {
      const payout = betVal * symbol.pay;
      rows.push('<div><span>3 ' + symbolLabel(symbol.id) + '</span><b>' + symbol.pay + 'x / ' + payout + '</b></div>');
    });
    rows.push('<div><span>3 Vault Pass Covers</span><b>25x / ' + (betVal * 25) + '</b></div>');
    rows.push('<div><span>Vault Jackpot Line</span><b>Jackpot + line</b></div>');
    payListEl.innerHTML = rows.join('');
  }

  function clearPaylines(){
    if(!paylineOverlay) return;
    paylineOverlay.querySelectorAll('.line').forEach(line => line.classList.remove('hit'));
  }

  function showPaylineHits(hits){
    clearPaylines();
    if(!paylineOverlay || !hits || !hits.length) return;
    hits.forEach(hit => {
      const line = paylineOverlay.querySelector('[data-line="' + hit.key + '"]');
      if(line) line.classList.add('hit');
    });
  }

  function lineScore(board){
    let total = 0;
    let jackpotHit = false;
    const pays = Object.fromEntries(regularSymbols.map(s => [s.id, s.pay]));
    const hits = [];

    for(let i = 0; i < payLines.length; i++){
      const line = payLines[i];
      const ids = line.cells.map(i => board[i].id);
      if(ids[0] === ids[1] && ids[1] === ids[2] && pays[ids[0]]){
        const payout = betVal * pays[ids[0]];
        total += payout;
        hits.push({key:line.key, line:line.name, combo:'3 ' + symbolLabel(ids[0]), payout});
        if(ids[0] === 'vault') jackpotHit = true;
      }
    }
    return {total, jackpotHit, hits};
  }

  function vaultPassCount(board){
    return board.filter(symbol => symbol.id.indexOf('vault-pass') === 0).length;
  }

  function showVaultPass(){
    try{
      localStorage.setItem('play3d_vault_pass_bonus_v1', JSON.stringify({at:new Date().toISOString(), source:'slot-machine-custom'}));
    }catch(e){}
    vaultPassOverlay.hidden = false;
  }

  function finishSpin(board){
    stopSpinSound();
    board.forEach((symbol, i)=>setCell(cells[i], symbol));
    cells.forEach(cell => cell.classList.remove('spinning'));
    const passCount = vaultPassCount(board);
    const scored = lineScore(board);
    lastLineHits = scored.hits || [];
    showPaylineHits(lastLineHits);
    let win = scored.total;
    let label = win ? 'ASSET LINE WIN' : 'NO WIN';

    if(scored.jackpotHit && bank){
      win += bank.claimJackpot();
      label = 'VAULT JACKPOT';
      playBigWin();
    }
    if(win > 0 && !scored.jackpotHit) playSmallHit();

    if(passCount >= 3){
      label = 'VAULT PASS';
      win += betVal * 25;
      showVaultPass();
      playBigWin();
    }

    creditsVal += win;
    lastWin.textContent = win;
    stateText.textContent = label;
    resultLine.textContent = passCount >= 3
      ? 'Vault Pass unlocked. Claim button is ready.'
      : win
        ? label + ' pays ' + win + ' credits. ' + (scored.hits && scored.hits.length ? scored.hits.map(hit => hit.line + ': ' + hit.combo + ' = ' + hit.payout).join(' | ') : '')
        : 'No win. Pull again.';
    if(points && win > 0) points.award('slot-machine-custom', Math.min(300, Math.max(25, Math.floor(win / 8))), label.toLowerCase().replaceAll(' ','_'));
    spinning = false;
    playAgainBtn.hidden = false;
    save();
    render();
  }

  function spin(){
    if(spinning) return;
    creditsVal = bank ? bank.getCredits() : creditsVal;
    if(creditsVal < betVal){
      stateText.textContent = 'NO CREDITS';
      resultLine.textContent = 'Not enough credits for this bet.';
      render();
      return;
    }
    spinning = true;
    playSpinSound();
    creditsVal -= betVal;
    if(bank) bank.addJackpot(Math.ceil(betVal * 0.08));
    lastWin.textContent = '0';
    stateText.textContent = 'SPINNING';
    resultLine.textContent = 'Reels spinning...';
    playAgainBtn.hidden = true;
    lastLineHits = [];
    clearPaylines();
    spinBtn.classList.add('pulled');
    cells.forEach(cell => cell.classList.add('spinning'));
    save();
    render();

    let ticks = 0;
    const interval = setInterval(()=>{
      cells.forEach(cell => setCell(cell, weightedSymbol()));
      ticks++;
      if(ticks >= 15){
        clearInterval(interval);
        spinBtn.classList.remove('pulled');
        finishSpin(Array.from({length:9}, weightedSymbol));
      }
    }, 80);
  }

  betDownBtn.addEventListener('click', ()=>{
    if(spinning) return;
    betVal = Math.max(25, betVal - 25);
    render();
  });

  betUpBtn.addEventListener('click', ()=>{
    if(spinning) return;
    betVal = Math.min(250, betVal + 25);
    if(betVal > creditsVal) betVal = Math.max(25, Math.floor(creditsVal / 25) * 25);
    render();
  });

  spinBtn.addEventListener('click', spin);
  playAgainBtn.addEventListener('click', spin);
  closeVaultPassBtn.addEventListener('click', ()=>{ vaultPassOverlay.hidden = true; });
  claimVaultPassBtn.addEventListener('click', ()=>{
    const status = points ? points.getStatus() : {eligible:false, member:false};
    if(status.eligible) location.href = points.claimHref();
    else resultLine.textContent = status.member ? 'Vault Pass saved. Reach 100,000 points to claim prizes.' : 'Vault Pass saved. Member access is required for prize claims.';
    vaultPassOverlay.hidden = true;
  });

  buildBoard();
  render();
})();
