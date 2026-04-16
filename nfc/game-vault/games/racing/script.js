
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'); let running=false, score=0, speed=1, boost=100, keys={}, player, traffic=[];
function init(){ player={lane:1}; traffic=[]; score=0; speed=1; boost=100; ui(); msg('Stay alive and stack rep.'); draw(); }
function ui(){ document.getElementById('score').textContent=Math.floor(score); document.getElementById('speed').textContent=speed.toFixed(1); document.getElementById('boost').textContent=Math.floor(boost); }
function msg(t){document.getElementById('msg').textContent=t}
function spawn(){ traffic.push({lane:Math.floor(Math.random()*3),y:-140,color:['#c33','#39c','#8c3','#ccc'][Math.floor(Math.random()*4)]}); }
function shift(dir){ player.lane=Math.max(0,Math.min(2,player.lane+dir)); }
function loop(){ if(!running) return; if(Math.random()<0.03+speed*0.01) spawn(); if(keys.ArrowLeft){ shift(-1); keys.ArrowLeft=false; } if(keys.ArrowRight){ shift(1); keys.ArrowRight=false; }
 let sp=speed*6; if((keys[' ']||keys.boost) && boost>0){ sp*=1.7; boost-=1.2; } else boost=Math.min(100,boost+0.25);
 traffic.forEach(c=>c.y+=sp); traffic=traffic.filter(c=>c.y<760); const px=300+player.lane*190; traffic.forEach(c=>{ const cx=300+c.lane*190; if(Math.abs(cx-px)<70 && c.y>430 && c.y<590){ running=false; msg('Crash. Reset and run it back.'); } }); score+=sp*0.1; speed=Math.min(4.5,1+score/450); ui(); draw(); requestAnimationFrame(loop); }
function draw(){ const sky=ctx.createLinearGradient(0,0,0,360); sky.addColorStop(0,'#08101d'); sky.addColorStop(1,'#050505'); ctx.fillStyle=sky; ctx.fillRect(0,0,980,360); ctx.fillStyle='#050505'; ctx.fillRect(0,360,980,280); ctx.strokeStyle='rgba(215,166,87,.35)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(170,180); ctx.lineTo(250,60); ctx.lineTo(330,180); ctx.moveTo(650,180); ctx.lineTo(730,50); ctx.lineTo(810,180); ctx.stroke(); for(let i=0;i<12;i++){ ctx.fillStyle='rgba(255,220,140,.22)'; ctx.fillRect(60+i*70,150+Math.sin(i)*12,20,8); }
 ctx.fillStyle='#121212'; ctx.beginPath(); ctx.moveTo(180,640); ctx.lineTo(320,0); ctx.lineTo(660,0); ctx.lineTo(800,640); ctx.closePath(); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(490,640); ctx.lineTo(490,0); ctx.stroke(); ctx.setLineDash([26,26]); ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(390,640); ctx.lineTo(390,0); ctx.moveTo(590,640); ctx.lineTo(590,0); ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.stroke(); ctx.setLineDash([]);
 const px=300+player.lane*190; ctx.fillStyle='#d7a657'; ctx.fillRect(px,500,85,120); ctx.fillStyle='#1d1408'; ctx.fillRect(px+12,516,61,42); ctx.fillStyle='#f4d187'; ctx.fillRect(px+14,600,57,8); if(keys[' ']||keys.boost){ ctx.fillStyle='rgba(240,210,143,.8)'; ctx.fillRect(px+30,620,24,18); }
 traffic.forEach(c=>{ const x=300+c.lane*190; ctx.fillStyle=c.color; ctx.fillRect(x,c.y,85,120); ctx.fillStyle='#111'; ctx.fillRect(x+12,c.y+16,61,40); }); }
window.addEventListener('keydown',e=>keys[e.key]=true); window.addEventListener('keyup',e=>keys[e.key]=false);
document.getElementById('start').onclick=()=>{ if(!running){ running=true; msg('Run the Bay.'); requestAnimationFrame(loop);} };
document.getElementById('reset').onclick=()=>{ running=false; init(); };
const hold=(key,val)=>{ keys[key]=val; };
['leftBtn','rightBtn','boostBtn'].forEach(id=>{ const el=document.getElementById(id); const key=id==='leftBtn'?'ArrowLeft':id==='rightBtn'?'ArrowRight':'boost'; ['pointerdown','touchstart'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault(); hold(key,true);})); ['pointerup','pointerleave','touchend','touchcancel'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault(); hold(key,false);})); });
init();
