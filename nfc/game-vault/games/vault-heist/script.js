(()=>{
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const assetPaths = {
    backdrop:'../../assets/original/bg-vault-door.jpg',
    runner:'../../assets/original/hoodie.png',
    barrier:'../../assets/original/chain.png',
    vault:'../../assets/original/vault.png',
    cash:'../../assets/original/cash.png'
  };
  const assets = {};
  let px = 50;
  let score = 0;
  let running = false;
  let assetsReady = false;
  let assetError = '';

  function loadAssets(){
    return Promise.all(Object.entries(assetPaths).map(([key, src]) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => { assets[key] = img; resolve(true); };
      img.onerror = () => { assetError = src; resolve(false); };
      img.src = src;
    }))).then(results => {
      assetsReady = results.every(Boolean);
      if(!assetsReady) stateText.textContent = 'ASSET PATH ERROR';
      draw();
    });
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function drawImage(img, x, y, w, h){
    if(img) ctx.drawImage(img, x, y, w, h);
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!assetsReady){
      ctx.fillStyle = '#050505';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#f2d27b';
      ctx.font = '28px Oswald, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(assetError ? 'ORIGINAL ASSET PATH ERROR' : 'LOADING ORIGINAL ASSETS', canvas.width / 2, canvas.height / 2);
      return;
    }
    drawImage(assets.backdrop, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,.48)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    drawImage(assets.barrier, 402, 26, 82, 355);
    drawImage(assets.vault, 790, 130, 92, 124);
    drawImage(assets.cash, 808, 250, 54, 44);
    drawImage(assets.runner, px - 32, 168, 64, 84);
  }

  function publish(){
    if(window.Play3DGameSync) window.Play3DGameSync.sendMove({game:'vault-heist',x:px,score:score});
  }

  function move(dx, remote){
    if(!assetsReady) return;
    px = clamp(px + dx, 32, canvas.width - 32);
    if(px > 790 && running){
      score++;
      mainScore.textContent = score;
      stateText.textContent = 'CLEARED';
      if(window.Play3DPoints) window.Play3DPoints.award('vault-heist', 300, 'vault_clear');
      running = false;
    }
    if(!remote) publish();
    draw();
  }

  function start(){
    if(!assetsReady){
      stateText.textContent = 'ASSET PATH ERROR';
      draw();
      return;
    }
    px = 50;
    score = 0;
    running = true;
    mainScore.textContent = score;
    stateText.textContent = 'RUNNING';
    draw();
    publish();
  }

  function bindHold(btn,dx){
    let id = null;
    function begin(e){ e.preventDefault(); move(dx); clearInterval(id); id = setInterval(()=>move(dx), 120); }
    function end(){ clearInterval(id); id = null; }
    btn.addEventListener('pointerdown', begin);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('pointerleave', end);
  }

  startBtn.onclick = start;
  if(window.leftBtn && window.rightBtn){
    bindHold(leftBtn, -20);
    bindHold(rightBtn, 20);
  }

  document.addEventListener('keydown', e=>{
    if(e.key === 'ArrowRight' || e.key === 'd'){ e.preventDefault(); move(20); }
    if(e.key === 'ArrowLeft' || e.key === 'a'){ e.preventDefault(); move(-20); }
  });

  window.addEventListener('load', ()=>{
    if(window.Play3DGameSync){
      window.Play3DGameSync.onMove(payload=>{
        if(!payload || payload.game !== 'vault-heist') return;
        px = clamp(Number(payload.x) || px, 32, canvas.width - 32);
        move(0, true);
      });
    }
  });

  loadAssets();
})();
