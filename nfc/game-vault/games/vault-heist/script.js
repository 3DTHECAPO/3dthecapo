(()=>{
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let px = 50;
  let score = 0;
  let running = false;

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function draw(){
    ctx.fillStyle = '#050505';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#ff265c';
    ctx.fillRect(430,40,16,340);
    ctx.fillStyle = '#31d07b';
    ctx.fillRect(820,165,48,90);
    ctx.fillStyle = '#f2d27b';
    ctx.beginPath();
    ctx.arc(px,210,20,0,Math.PI*2);
    ctx.fill();
  }

  function publish(){
    if(window.Play3DGameSync) window.Play3DGameSync.sendMove({game:'vault-heist',x:px,score:score});
  }

  function move(dx, remote){
    px = clamp(px + dx, 24, canvas.width - 24);
    if(px > 800 && running){
      score++;
      mainScore.textContent = score;
      stateText.textContent = 'CLEARED';
      running = false;
    }
    if(!remote) publish();
    draw();
  }

  function start(){
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
        px = clamp(Number(payload.x) || px, 24, canvas.width - 24);
        move(0, true);
      });
    }
  });

  draw();
})();
