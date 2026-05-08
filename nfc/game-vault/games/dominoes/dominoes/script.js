(()=>{'use strict';
let stock=[],hand=[],opp=[],chain=[],turn='you',scores={you:0,opp:0},online=false,mySeat='host',applyingRemote=false;
const boardEl=document.getElementById('board'),handEl=document.getElementById('hand');
function makeStock(){let s=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)s.push([a,b]);s.sort(()=>Math.random()-.5);return s}
function newRound(broadcast=true){
 stock=makeStock();hand=stock.splice(0,7);opp=stock.splice(0,7);chain=[];turn='you';msg('New round. Host starts.');render();
 if(broadcast&&online&&!applyingRemote)sendState('new-round');
}
function ends(){return chain.length?[chain[0][0],chain[chain.length-1][1]]:null}
function legal(t){let e=ends();return !e||t[0]===e[0]||t[1]===e[0]||t[0]===e[1]||t[1]===e[1]}
function place(arr,t){let e=ends();if(!e)chain.push(t);else if(t[1]===e[0])chain.unshift(t);else if(t[0]===e[0])chain.unshift([t[1],t[0]]);else if(t[0]===e[1])chain.push(t);else if(t[1]===e[1])chain.push([t[1],t[0]]);else return false;arr.splice(arr.indexOf(t),1);return true}
function canPlay(){if(!online)return turn==='you';return (mySeat==='host'&&turn==='you')||(mySeat==='guest'&&turn==='opp')}
function playFromHand(t){if(!canPlay())return msg('Not your turn.');let arr=online?(mySeat==='host'?hand:opp):hand;if(!place(arr,t))return msg('That tile does not fit.');turn=turn==='you'?'opp':'you';msg('Tile played.');check();render();if(online)sendState('tile-played');else setTimeout(cpuTurn,600)}
function cpuTurn(){if(online||turn!=='opp')return;let t=opp.find(legal);if(t){place(opp,t);msg('CPU played.')}else if(stock.length){opp.push(stock.pop());msg('CPU drew.')}else msg('CPU passed.');turn='you';check();render()}
function draw(){if(!canPlay())return msg('Not your turn.');if(stock.length){(online?(mySeat==='host'?hand:opp):hand).push(stock.pop());msg('Drew tile.');render();if(online)sendState('draw')}} 
function pass(){if(!canPlay())return msg('Not your turn.');turn=turn==='you'?'opp':'you';msg('Passed.');render();if(online)sendState('pass');else setTimeout(cpuTurn,500)}
function check(){if(!hand.length){scores.you++;turn='over';msg((online?'Host':'You')+' wins round.')}if(!opp.length){scores.opp++;turn='over';msg((online?'Guest':'CPU')+' wins round.')}mainScore.textContent=scores.you+'-'+scores.opp;stateText.textContent=online?(canPlay()?'YOUR TURN':'WAITING'):turn.toUpperCase()}
function tile(t,i,source){return `<button class="tile" data-i="${i}" data-source="${source}"><span>${t[0]}</span><i></i><span>${t[1]}</span></button>`}
function render(){
 boardEl.innerHTML=chain.map((t,i)=>tile(t,i,'board')).join('');
 let visible=online&&mySeat==='guest'?opp:hand;
 handEl.innerHTML=visible.map((t,i)=>tile(t,i,'hand')).join('');
 document.querySelectorAll('#hand .tile').forEach(b=>b.onclick=()=>playFromHand(visible[+b.dataset.i]));
 check();roomBadge.textContent=online?(mySeat==='host'?'HOST':'GUEST'):'LOCAL';
}
function msg(m){log.innerHTML='<li>'+m+'</li>'+log.innerHTML}
function state(){return{stock,hand,opp,chain,turn,scores}}
function apply(s){stock=s.stock||[];hand=s.hand||[];opp=s.opp||[];chain=s.chain||[];turn=s.turn||'you';scores=s.scores||scores;render()}
function sendState(type){Play3DMultiplayer.sendMove({type:'dominoes-state',action:type,state:state()})}
function wireMP(){if(!window.Play3DMultiplayer)return;Play3DMultiplayer.installPanel(mpMount,{game:'dominoes'});document.addEventListener('play3d:mp-status',()=>{let s=Play3DMultiplayer.getState();online=!!s.connected;mySeat=s.seat==='guest'?'guest':'host';localBtn.classList.remove('active');onlineBtn.classList.add('active');if(mySeat==='host')sendState('sync-host');render()});Play3DMultiplayer.onMove(ev=>{if(!ev||ev.type!=='dominoes-state'||!ev.state)return;applyingRemote=true;apply(ev.state);applyingRemote=false})}
newGame.onclick=()=>newRound(true);drawBtn.onclick=draw;passBtn.onclick=pass;localBtn.onclick=()=>{online=false;localBtn.classList.add('active');onlineBtn.classList.remove('active');render()};onlineBtn.onclick=()=>{online=true;onlineBtn.classList.add('active');localBtn.classList.remove('active');render()};wireMP();newRound(false);
})();