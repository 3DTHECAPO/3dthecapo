(()=>{const c=game,x=c.getContext('2d');let px=50,score=0;function draw(){x.fillStyle='#050505';x.fillRect(0,0,c.width,c.height);x.fillStyle='#f2d27b';x.beginPath();x.arc(px,210,20,0,Math.PI*2);x.fill();x.fillStyle='#0b0b0b';x.fillRect(430,40,16,340);x.fillStyle='#31d07b';x.fillRect(820,165,48,90)}startBtn.onclick=()=>{px=50;score=0;stateText.textContent='RUNNING';draw()};document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')px+=20;if(e.key==='ArrowLeft')px-=20;if(px>800){score++;mainScore.textContent=score;stateText.textContent='CLEARED'}draw()});draw()})();


/* PLAY3D V10 vault-heist bridge */
(function(){
  if(!window.PLAY3D_SYNC || !window.PLAY3D_SYNC.enabled) return;
  function snap(action){
    window.PLAY3D_SYNC.sendGameEvent('heist_state', {
      action,
      score: document.getElementById('mainScore')?.textContent || '',
      state: document.getElementById('stateText')?.textContent || ''
    });
  }
  document.addEventListener('click', function(e){
    if(['startBtn'].includes(e.target.id) || e.target.tagName === 'BUTTON'){
      setTimeout(()=>snap(e.target.id || 'button'), 60);
    }
  });
  document.addEventListener('keydown', function(e){
    if(['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)){
      window.PLAY3D_SYNC.sendMove({type:'heist_key', key:e.key});
    }
  });
})();

