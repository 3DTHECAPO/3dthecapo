(()=>{const suits=['♠','♥','♦','♣'],ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];let deck=[],h=[],hold=[],creditsVal=1000,betVal=25,phase='deal';const handEl=document.getElementById('hand');function mk(){deck=[];for(const s of suits)for(const r of ranks)deck.push({r,s,id:r+s+Math.random()});deck.sort(()=>Math.random()-.5)}function deal(){if(creditsVal<betVal)return;mk();creditsVal-=betVal;h=deck.splice(0,5);hold=[];phase='draw';rankName.textContent='Pick Holds';render()}function draw(){if(phase!=='draw')return;h=h.map((c,i)=>hold.includes(i)?c:deck.pop());let res=evaluate();creditsVal+=res.pay*betVal;rankName.textContent=res.name;phase='deal';render()}function evaluate(){let counts={};h.forEach(c=>counts[c.r]=(counts[c.r]||0)+1);let vals=Object.values(counts).sort((a,b)=>b-a).join('');let flush=h.every(c=>c.s===h[0].s);if(vals==='4,1')return{name:'Four Of A Kind',pay:25};if(vals==='3,2')return{name:'Full House',pay:9};if(flush)return{name:'Flush',pay:6};if(vals==='3,1,1')return{name:'Three Of A Kind',pay:3};if(vals==='2,2,1')return{name:'Two Pair',pay:2};if(vals.startsWith('2'))return{name:'Pair',pay:1};return{name:'No Win',pay:0}}function card(c,i){return `<button class="card ${c.s==='♥'||c.s==='♦'?'red':''} ${hold.includes(i)?'hold':''}" data-i="${i}">${c.r}<br>${c.s}</button>`}function render(){handEl.innerHTML=h.map(card).join('');credits.textContent=creditsVal;bet.textContent=betVal;mainScore.textContent=creditsVal;stateText.textContent=phase.toUpperCase();document.querySelectorAll('#hand .card').forEach(b=>b.onclick=()=>{let i=+b.dataset.i;if(phase==='draw'){hold=hold.includes(i)?hold.filter(x=>x!==i):[...hold,i];render()}})}dealBtn.onclick=deal;drawBtn.onclick=draw;betUp.onclick=()=>{betVal=betVal===25?50:betVal===50?100:betVal===100?250:500;render()};
if(typeof betDown!=='undefined')betDown.onclick=()=>{betVal=betVal===500?250:betVal===250?100:betVal===100?50:25;render()};
render()})();


/* PLAY3D V10 poker bridge */
(function(){
  if(!window.PLAY3D_SYNC || !window.PLAY3D_SYNC.enabled) return;
  function snap(action){
    window.PLAY3D_SYNC.sendGameEvent('poker_state', {
      action,
      credits: document.getElementById('credits')?.textContent || '',
      bet: document.getElementById('bet')?.textContent || '',
      rank: document.getElementById('rankName')?.textContent || '',
      phase: document.getElementById('stateText')?.textContent || ''
    });
  }
  document.addEventListener('click', function(e){
    const id = e.target && e.target.id;
    if(['dealBtn','drawBtn','betUp','betDown'].includes(id) || e.target.closest('#hand .card')){
      setTimeout(()=>snap(id || 'hold'), 60);
    }
  });
  window.PLAY3D_SYNC.onGameEvent('poker_state', function(msg){
    if(!msg || msg.playerId === window.PLAY3D_SYNC.playerId) return;
    const s = document.getElementById('stateText');
    if(s) s.textContent = 'REMOTE ' + ((msg.payload && msg.payload.action) || 'MOVE');
  });
})();

