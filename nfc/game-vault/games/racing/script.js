
const c=document.getElementById('game'),x=c.getContext('2d'); let started=false, over=false, score=0,speed=8,roadOffset=0;
const player={lane:1,y:c.height-180,w:100,h:160}; let cars=[];
function spawn(){cars.push({lane:Math.floor(Math.random()*3),y:-200,w:100,h:160,color:['#d9a548','#444','#c77a2c'][Math.floor(Math.random()*3)]})}
function reset(){cars=[];score=0;speed=8;over=false;player.lane=1; for(let i=0;i<4;i++)spawn();}
function drawBg(){
  x.fillStyle='#050607'; x.fillRect(0,0,c.width,c.height);
  x.fillStyle='rgba(255,190,90,.12)'; x.fillRect(0,0,c.width,180);
  // bridge lights
  for(let i=0;i<12;i++){ let yy=(i*130+roadOffset*2)%c.height; x.fillStyle='rgba(255,160,70,.7)'; x.beginPath(); x.arc(120,yy,4,0,Math.PI*2); x.fill(); x.beginPath(); x.arc(c.width-120,yy,4,0,Math.PI*2); x.fill(); }
  x.fillStyle='#111'; x.fillRect(150,0,600,c.height);
  x.strokeStyle='rgba(255,220,140,.34)'; x.lineWidth=8; x.strokeRect(150,0,600,c.height);
  x.strokeStyle='rgba(255,255,255,.6)'; x.lineWidth=6;
  for(let i=0;i<15;i++){ let y=(i*120+roadOffset)%c.height; x.beginPath(); x.moveTo(450,y); x.lineTo(450,y+60); x.stroke(); }
  x.fillStyle='rgba(255,220,145,.8)'; x.font='bold 40px Arial'; x.fillText('DIST '+Math.floor(score), 30, 60);
  if(over){ x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(0,0,c.width,c.height); x.fillStyle='#fff3cf'; x.font='bold 74px Arial'; x.fillText('CRASH', 300, 450); x.font='28px Arial'; x.fillText('Press Reset and run it back.', 265, 510); }
}
function laneX(l){ return 190 + l*180; }
function drawCar(car,playerFlag=false){
  x.fillStyle=car.color; x.fillRect(laneX(car.lane),car.y,car.w,car.h);
  x.fillStyle='#111'; x.fillRect(laneX(car.lane)+16,car.y+18,68,38);
  x.fillStyle=playerFlag?'#ffe099':'#ffd481'; x.fillRect(laneX(car.lane)+20,car.y+128,60,14);
}
function update(){
  if(!started||over) return;
  roadOffset += speed; score += speed*0.1; speed += 0.002;
  cars.forEach(car=>car.y += speed);
  if(cars[0] && cars[0].y > c.height+200){ cars.shift(); spawn(); }
  cars.forEach(car=>{
    if(car.lane===player.lane && car.y+car.h > player.y && car.y < player.y + player.h) over=true;
  });
}
function draw(){ drawBg(); cars.forEach(car=>drawCar(car)); drawCar({lane:player.lane,y:player.y,w:player.w,h:player.h,color:'#d9a548'}, true); requestAnimationFrame(draw); }
setInterval(update,16);
draw();
document.getElementById('start').onclick=()=>{started=true;over=false;}
document.getElementById('reset').onclick=()=>{reset();started=true;}
window.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft') player.lane=Math.max(0,player.lane-1); if(e.key==='ArrowRight') player.lane=Math.min(2,player.lane+1); });
let touchStart=null;
c.addEventListener('pointerdown',e=>touchStart=e.clientX);
c.addEventListener('pointerup',e=>{ if(touchStart===null) return; const dx=e.clientX-touchStart; if(dx>30) player.lane=Math.min(2,player.lane+1); else if(dx<-30) player.lane=Math.max(0,player.lane-1); touchStart=null; });
reset();
