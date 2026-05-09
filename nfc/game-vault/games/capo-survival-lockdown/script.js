(()=>{'use strict';
const game=document.body.dataset.game;
const screen=document.getElementById('screen');
const stateText=document.getElementById('stateText');
const mainScore=document.getElementById('mainScore');
const logEl=document.getElementById('log');
const player=document.getElementById('player');
let score=0,health=100,timer=60,running=false,x=50,y=70;
let loop=null;

function log(msg){const p=document.createElement('div');p.textContent='> '+msg;logEl.prepend(p)}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function update(){mainScore.textContent=score;healthEl().textContent=health;timerEl().textContent=timer;player.style.left=x+'%';player.style.top=y+'%';if(game==='nightmare-vault')screen.style.background='radial-gradient(circle at '+x+'% '+y+'%, rgba(242,210,123,.20), rgba(0,0,0,.92) 35%)'}
function healthEl(){return document.getElementById('health')}
function timerEl(){return document.getElementById('timer')}
function move(dx,dy,remote){
  x=clamp(x+dx,5,95);y=clamp(y+dy,8,92);update();
  if(!remote&&window.Play3DGameSync)window.Play3DGameSync.sendMove({x:x,y:y,score:score,health:health,game:game});
}
function clearScreen(){[...screen.querySelectorAll('.target,.loot,.enemy,.door,.power,.laser,.remote-player')].forEach(e=>e.remove())}
function addThing(cls,text,left,top){const d=document.createElement('div');d.className=cls;d.textContent=text;d.style.left=left+'%';d.style.top=top+'%';d.style.width='70px';d.style.height='50px';screen.appendChild(d);return d}
function dist(a,b){const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.hypot((ar.left+ar.width/2)-(br.left+br.width/2),(ar.top+ar.height/2)-(br.top+br.height/2))}
function setup(){
 clearScreen();
 if(game==='vault-raid-707'){addThing('loot','LOOT',18,22);addThing('target','HACK',72,28);addThing('door','EXIT',82,78);const l=document.createElement('div');l.className='laser';l.style.left='20%';l.style.top='55%';l.style.width='65%';l.style.transform='rotate(-8deg)';screen.appendChild(l);log('Raid loaded. Grab loot, hack terminal, reach exit.')}
 if(game==='capo-survival-lockdown'){addThing('enemy','BREACH',20,18);addThing('enemy','BREACH',76,25);addThing('loot','SUPPLY',52,45);addThing('door','BUNKER',48,82);log('Lockdown started. Survive waves and collect supplies.')}
 if(game==='3d-casino-empire'){addThing('target','TABLE',22,28);addThing('target','VIP',68,30);addThing('loot','CASH',50,58);addThing('door','OFFICE',78,80);log('Casino floor open. Upgrade tables and stack cash.')}
 if(game==='nightmare-vault'){addThing('power','POWER',18,25);addThing('target','CLUE',70,34);addThing('enemy','ENTITY',50,58);addThing('door','ESCAPE',80,82);log('Nightmare sector active. Restore power and escape.')}
 update();
}
function tick(){
 if(!running)return;
 timer--;if(timer<=0){health-=20;timer=30;log('Time penalty hit.')}
 [...screen.querySelectorAll('.loot,.target,.door,.power')].forEach(el=>{if(dist(player,el)<55){score+=el.className.includes('door')?100:25;log('Collected '+el.textContent+' + points');el.remove()}});
 [...screen.querySelectorAll('.enemy')].forEach(el=>{if(dist(player,el)<60){health-=10;log('Damage taken.');el.style.left=(10+Math.random()*75)+'%'}});
 if(health<=0){running=false;stateText.textContent='FAILED';log('Mission failed.');clearInterval(loop)}
 if(score>=175){running=false;stateText.textContent='COMPLETE';log('Mission complete.');clearInterval(loop)}
 update();
}
function start(){running=true;score=0;health=100;timer=60;x=50;y=70;stateText.textContent='ACTIVE';setup();clearInterval(loop);loop=setInterval(tick,1000)}
function reset(){running=false;score=0;health=100;timer=60;x=50;y=70;stateText.textContent='READY';clearInterval(loop);setup();update()}
function bindHold(btn,dx,dy){
 let id=null;
 function begin(e){e.preventDefault();move(dx,dy);clearInterval(id);id=setInterval(()=>move(dx,dy),120)}
 function end(){clearInterval(id);id=null}
 btn.addEventListener('pointerdown',begin);
 btn.addEventListener('pointerup',end);
 btn.addEventListener('pointercancel',end);
 btn.addEventListener('pointerleave',end);
}
startBtn.onclick=start;resetBtn.onclick=reset;
bindHold(upBtn,0,-6);bindHold(downBtn,0,6);bindHold(leftBtn,-6,0);bindHold(rightBtn,6,0);
document.addEventListener('keydown',e=>{const keys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];if(keys.includes(e.key))e.preventDefault();if(e.key==='ArrowUp'||e.key==='w')move(0,-5);if(e.key==='ArrowDown'||e.key==='s')move(0,5);if(e.key==='ArrowLeft'||e.key==='a')move(-5,0);if(e.key==='ArrowRight'||e.key==='d')move(5,0)});
window.addEventListener('load',()=>{if(window.Play3DGameSync){window.Play3DGameSync.onMove(payload=>{if(!payload||payload.game!==game)return;let ghost=screen.querySelector('.remote-player');if(!ghost){ghost=document.createElement('div');ghost.className='remote-player player';ghost.style.opacity='.55';ghost.style.background='linear-gradient(180deg,#9be7ff,#2b8cff)';screen.appendChild(ghost)}ghost.style.left=clamp(Number(payload.x)||50,5,95)+'%';ghost.style.top=clamp(Number(payload.y)||70,8,92)+'%';})}});
setup();
})();
