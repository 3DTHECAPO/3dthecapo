(function(){
'use strict';
const c=document.getElementById('game'),x=c.getContext('2d');
const scoreEl=score,healthEl=health,goldEl=gold,keyEl=key,timeEl=time,stateEl=stateText;
let W=960,H=540,keys={},running=false,sound=true,last=0,timer=60,scoreVal=0,gameState='ready';
let player, golds, lasers, drones, exit, vaultKey, particles;

function reset(){
  player={x:70,y:H-90,r:16,vx:0,vy:0,h:100,hasKey:false,gold:0};
  exit={x:W-75,y:65,w:54,h:74};
  vaultKey={x:W*0.56,y:H*0.23,r:13,taken:false};
  golds=[];
  for(let i=0;i<18;i++)golds.push({x:120+Math.random()*(W-240),y:105+Math.random()*(H-190),r:8,taken:false,pulse:Math.random()*6});
  lasers=[
    {x:220,y:92,w:10,h:360,dir:1,speed:75,min:92,max:420},
    {x:450,y:70,w:10,h:380,dir:-1,speed:95,min:70,max:420},
    {x:690,y:120,w:10,h:320,dir:1,speed:85,min:80,max:430}
  ];
  drones=[{x:310,y:150,r:18,a:0,rx:100,ry:70,cx:310,cy:210},{x:720,y:310,r:18,a:2,rx:115,ry:80,cx:720,cy:310}];
  particles=[]; timer=60; scoreVal=0; gameState='ready'; running=false; updateHUD(); draw();
}
function start(){if(gameState==='win'||gameState==='lose')reset();running=true;gameState='run';last=performance.now();requestAnimationFrame(loop);tone(220)}
function updateHUD(){scoreEl.textContent=scoreVal;healthEl.textContent=Math.max(0,Math.round(player.h));goldEl.textContent=player.gold;keyEl.textContent=player.hasKey?'Yes':'No';timeEl.textContent=Math.max(0,Math.ceil(timer));stateEl.textContent=gameState.toUpperCase()}
function loop(t){if(!running)return;let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();if(running)requestAnimationFrame(loop)}
function update(dt){
  timer-=dt;if(timer<=0)lose('TIME OUT');
  let ax=0,ay=0;if(keys.ArrowLeft||keys.a)ax=-1;if(keys.ArrowRight||keys.d)ax=1;if(keys.ArrowUp||keys.w)ay=-1;if(keys.ArrowDown||keys.s)ay=1;
  let mag=Math.hypot(ax,ay)||1;player.vx=(ax/mag)*220;player.vy=(ay/mag)*220;player.x+=player.vx*dt;player.y+=player.vy*dt;player.x=Math.max(player.r,Math.min(W-player.r,player.x));player.y=Math.max(player.r,Math.min(H-player.r,player.y));
  lasers.forEach(l=>{l.y+=l.dir*l.speed*dt;if(l.y<l.min||l.y>l.max)l.dir*=-1;if(circleRect(player,l))damage(24*dt)});
  drones.forEach(d=>{d.a+=dt;d.x=d.cx+Math.cos(d.a)*d.rx;d.y=d.cy+Math.sin(d.a*1.2)*d.ry;if(dist(player,d)<player.r+d.r)damage(32*dt)});
  golds.forEach(g=>{g.pulse+=dt*4;if(!g.taken&&dist(player,g)<player.r+g.r){g.taken=true;player.gold++;scoreVal+=100;burst(g.x,g.y,'gold');tone(330)}});
  if(!vaultKey.taken&&dist(player,vaultKey)<player.r+vaultKey.r){vaultKey.taken=true;player.hasKey=true;scoreVal+=500;burst(vaultKey.x,vaultKey.y,'key');tone(440)}
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);
  if(player.hasKey&&rectContains(exit,player.x,player.y)){win()}
  updateHUD();
}
function damage(v){player.h-=v; if(Math.random()<.18)burst(player.x,player.y,'red'); if(player.h<=0)lose('BUSTED')}
function win(){running=false;gameState='win';scoreVal+=Math.ceil(timer)*25+player.gold*50;updateHUD();draw();tone(660)}
function lose(msg){running=false;gameState='lose';stateEl.textContent=msg;draw();tone(110)}
function draw(){
  x.clearRect(0,0,W,H);
  let grd=x.createLinearGradient(0,0,W,H);grd.addColorStop(0,'#100d08');grd.addColorStop(.5,'#050505');grd.addColorStop(1,'#17110a');x.fillStyle=grd;x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(242,210,123,.08)';x.lineWidth=1;for(let i=0;i<W;i+=48){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}for(let j=0;j<H;j+=48){x.beginPath();x.moveTo(0,j);x.lineTo(W,j);x.stroke()}
  drawExit();golds.forEach(drawGold);if(!vaultKey.taken)drawKey();lasers.forEach(drawLaser);drones.forEach(drawDrone);drawPlayer();particles.forEach(drawParticle);
  if(gameState==='ready'||gameState==='win'||gameState==='lose')overlay(gameState==='ready'?'START HEIST':gameState==='win'?'VAULT CLEARED':'HEIST FAILED');
}
function drawExit(){x.fillStyle=player.hasKey?'rgba(49,208,123,.25)':'rgba(242,210,123,.10)';x.strokeStyle=player.hasKey?'#31d07b':'#caa24a';x.lineWidth=3;x.roundRect(exit.x,exit.y,exit.w,exit.h,12);x.fill();x.stroke();x.fillStyle=player.hasKey?'#31d07b':'#f2d27b';x.font='900 14px Oswald';x.textAlign='center';x.fillText('EXIT',exit.x+exit.w/2,exit.y+exit.h/2+5)}
function drawGold(g){if(g.taken)return;x.beginPath();x.fillStyle='#f2d27b';x.shadowColor='#f2d27b';x.shadowBlur=12+Math.sin(g.pulse)*5;x.arc(g.x,g.y,g.r,0,Math.PI*2);x.fill();x.shadowBlur=0}
function drawKey(){x.save();x.translate(vaultKey.x,vaultKey.y);x.rotate(Math.sin(performance.now()/250)*.3);x.strokeStyle='#f2d27b';x.lineWidth=5;x.shadowColor='#f2d27b';x.shadowBlur=16;x.beginPath();x.arc(-6,0,7,0,Math.PI*2);x.moveTo(2,0);x.lineTo(18,0);x.moveTo(12,0);x.lineTo(12,7);x.stroke();x.restore();x.shadowBlur=0}
function drawLaser(l){x.fillStyle='rgba(255,0,60,.14)';x.fillRect(l.x-18,l.y,l.w+36,l.h);x.fillStyle='#ff265c';x.shadowColor='#ff265c';x.shadowBlur=18;x.fillRect(l.x,l.y,l.w,l.h);x.shadowBlur=0}
function drawDrone(d){x.beginPath();x.fillStyle='#111';x.strokeStyle='#f2d27b';x.lineWidth=3;x.shadowColor='#caa24a';x.shadowBlur=16;x.arc(d.x,d.y,d.r,0,Math.PI*2);x.fill();x.stroke();x.shadowBlur=0;x.fillStyle='#ff265c';x.beginPath();x.arc(d.x,d.y,5,0,Math.PI*2);x.fill()}
function drawPlayer(){x.beginPath();x.fillStyle='#f2d27b';x.strokeStyle='#fff0b7';x.lineWidth=3;x.shadowColor='#f2d27b';x.shadowBlur=18;x.arc(player.x,player.y,player.r,0,Math.PI*2);x.fill();x.stroke();x.shadowBlur=0;x.fillStyle='#100c05';x.font='900 16px Black Ops One';x.textAlign='center';x.fillText('3D',player.x,player.y+6)}
function drawParticle(p){x.globalAlpha=Math.max(0,p.life);x.fillStyle=p.color;x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fill();x.globalAlpha=1}
function overlay(txt){x.fillStyle='rgba(0,0,0,.58)';x.fillRect(0,0,W,H);x.fillStyle='#f2d27b';x.font='900 64px Black Ops One';x.textAlign='center';x.fillText(txt,W/2,H/2-8);x.font='700 20px Oswald';x.fillStyle='rgba(245,239,227,.8)';x.fillText('Collect gold • Grab key • Reach exit',W/2,H/2+34)}
function burst(x0,y0,type){let color=type==='red'?'#ff265c':type==='key'?'#31d07b':'#f2d27b';for(let i=0;i<12;i++){let a=Math.random()*Math.PI*2,s=60+Math.random()*120;particles.push({x:x0,y:y0,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:2+Math.random()*3,life:.4+Math.random()*.35,color})}}
function circleRect(c,r){let cx=Math.max(r.x,Math.min(c.x,r.x+r.w)),cy=Math.max(r.y,Math.min(c.y,r.y+r.h));return Math.hypot(c.x-cx,c.y-cy)<c.r}
function rectContains(r,x0,y0){return x0>r.x&&x0<r.x+r.w&&y0>r.y&&y0<r.y+r.h}function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function tone(f){if(!sound)return;try{let A=new (AudioContext||webkitAudioContext)(),o=A.createOscillator(),g=A.createGain();o.frequency.value=f;g.gain.value=.045;o.connect(g);g.connect(A.destination);o.start();setTimeout(()=>{o.stop();A.close()},90)}catch(e){}}
document.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault()});document.addEventListener('keyup',e=>keys[e.key]=false);
let touch=false; c.addEventListener('pointerdown',e=>{touch=true;moveTouch(e)});c.addEventListener('pointermove',e=>{if(touch)moveTouch(e)});c.addEventListener('pointerup',()=>{touch=false;keys={}});function moveTouch(e){let r=c.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*W,my=(e.clientY-r.top)/r.height*H;keys={};if(mx<player.x-12)keys.ArrowLeft=true;if(mx>player.x+12)keys.ArrowRight=true;if(my<player.y-12)keys.ArrowUp=true;if(my>player.y+12)keys.ArrowDown=true}
CanvasRenderingContext2D.prototype.roundRect=CanvasRenderingContext2D.prototype.roundRect||function(x,y,w,h,r){this.beginPath();this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath();return this}
startBtn.onclick=start;restartBtn.onclick=reset;soundBtn.onclick=()=>{sound=!sound;soundBtn.textContent=sound?'Sound On':'Sound Off'};reset();
})();