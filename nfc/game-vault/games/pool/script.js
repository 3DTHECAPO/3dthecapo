
const canvas = document.getElementById('table');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const pocketR = 24, ballR = 14;
let aiming = false, aimStart = null, aimEnd = null;
let balls = [];
let cue = null;
function reset(){
  cue = {x:W*0.25, y:H/2, vx:0, vy:0, color:'#f4ead6', alive:true};
  balls = [];
  const cols = ['#f0c674','#cf8c2b','#e7d7b2','#d9a548','#aa7b2d','#f4d38d'];
  let startX = W*0.72, startY = H/2;
  let idx = 0;
  for(let row=0; row<5; row++){
    for(let i=0;i<=row;i++){
      balls.push({x:startX + row*26, y:startY - row*15 + i*30, vx:0, vy:0, color:cols[idx++%cols.length], alive:true});
    }
  }
}
function drawTable(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#111'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#2a1d10'; roundRect(20,20,W-40,H-40,28,true);
  ctx.fillStyle = '#0c2313'; roundRect(54,54,W-108,H-108,20,true);
  ctx.strokeStyle = 'rgba(217,165,72,.45)'; ctx.lineWidth = 5; roundRect(54,54,W-108,H-108,20,false);
  const pockets = pocketPositions();
  pockets.forEach(p=>{ctx.beginPath();ctx.fillStyle='#050505';ctx.arc(p.x,p.y,pocketR,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle = 'rgba(255,215,130,.16)'; ctx.fillRect(W/2-2,58,4,H-116);
  ctx.font = 'bold 32px Arial'; ctx.fillStyle='rgba(255,220,145,.24)'; ctx.fillText('CAPO TABLE', W/2-110, 100);
}
function pocketPositions(){
  return [
    {x:54,y:54},{x:W/2,y:54},{x:W-54,y:54},
    {x:54,y:H-54},{x:W/2,y:H-54},{x:W-54,y:H-54},
  ];
}
function drawBall(b){
  if(!b.alive) return;
  ctx.beginPath(); ctx.fillStyle=b.color; ctx.arc(b.x,b.y,ballR,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=2; ctx.arc(b.x-4,b.y-4,4,0,Math.PI*2); ctx.stroke();
}
function update(){
  [cue, ...balls].forEach(b=>{
    if(!b.alive) return;
    b.x += b.vx; b.y += b.vy;
    b.vx *= .992; b.vy *= .992;
    if(Math.abs(b.vx)<.01) b.vx=0; if(Math.abs(b.vy)<.01) b.vy=0;
    if(b.x<68+ballR||b.x>W-68-ballR) b.vx *= -1, b.x=Math.max(68+ballR, Math.min(W-68-ballR,b.x));
    if(b.y<68+ballR||b.y>H-68-ballR) b.vy *= -1, b.y=Math.max(68+ballR, Math.min(H-68-ballR,b.y));
  });
  const arr=[cue,...balls];
  for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
    const a=arr[i], b=arr[j]; if(!a.alive||!b.alive) continue;
    const dx=b.x-a.x, dy=b.y-a.y, dist=Math.hypot(dx,dy);
    if(dist>0 && dist<ballR*2){
      const nx=dx/dist, ny=dy/dist;
      const p=(a.vx*nx+a.vy*ny - b.vx*nx-b.vy*ny);
      a.vx-=p*nx; a.vy-=p*ny; b.vx+=p*nx; b.vy+=p*ny;
      const overlap=ballR*2-dist;
      a.x-=nx*overlap/2; a.y-=ny*overlap/2; b.x+=nx*overlap/2; b.y+=ny*overlap/2;
    }
  }
  const pockets = pocketPositions();
  [cue,...balls].forEach(b=>{
    if(!b.alive) return;
    if(pockets.some(p=>Math.hypot(b.x-p.x,b.y-p.y)<pocketR)){
      b.alive = false;
      if(b === cue){ setTimeout(()=>{cue.alive=true; cue.x=W*0.25; cue.y=H/2; cue.vx=cue.vy=0;},700); }
    }
  });
}
function draw(){
  drawTable();
  balls.forEach(drawBall); drawBall(cue);
  if(aiming && cue.alive){
    ctx.beginPath(); ctx.moveTo(cue.x,cue.y); ctx.lineTo(aimEnd.x,aimEnd.y); ctx.strokeStyle='rgba(255,220,145,.5)'; ctx.lineWidth=4; ctx.stroke();
  }
}
function loop(){ update(); draw(); requestAnimationFrame(loop); }
function roundRect(x,y,w,h,r,fill){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  if(fill) ctx.fill(); else ctx.stroke();
}
canvas.addEventListener('pointerdown',e=>{
  const rect=canvas.getBoundingClientRect(); const x=(e.clientX-rect.left)*W/rect.width, y=(e.clientY-rect.top)*H/rect.height;
  if(Math.hypot(x-cue.x,y-cue.y) < 40 && cue.alive){ aiming=true; aimStart={x,y}; aimEnd={x,y}; }
});
canvas.addEventListener('pointermove',e=>{
  if(!aiming) return; const rect=canvas.getBoundingClientRect(); aimEnd={x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};
});
canvas.addEventListener('pointerup',()=>{
  if(!aiming) return; aiming=false;
  const dx=cue.x-aimEnd.x, dy=cue.y-aimEnd.y; cue.vx = dx*0.08; cue.vy = dy*0.08;
});
document.getElementById('reset').onclick = reset;
document.getElementById('newShot').onclick = ()=>{ cue.vx=cue.vy=0; };
reset(); loop();
