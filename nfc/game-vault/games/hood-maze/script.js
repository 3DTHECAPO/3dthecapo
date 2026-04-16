
const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
const tile=40; let level=1, score=0, lives=3, running=false, last=0, input='left';
const maze=[
'########################',
'#........##..........$.#',
'#.####.#.##.#####.####.#',
'#o#  #.#....#   #....#.#',
'#.## #.###### ###.##.#.#',
'#....#....##....#....#.#',
'####.####.##.####.####.#',
'#....#..........#......#',
'#.####.###HH###.####.#.#',
'#......#......#......#.#',
'######.#.####.#.######.#',
'#......#.#  #.#.....$..#',
'#.######.####.######.#.#',
'#......................#',
'########################'];
let grid, player, enemies=[];
function resetLevel(){grid=maze.map(r=>r.split('')); player={x:1,y:1,dir:'left'}; enemies=[{x:11,y:8,dir:'left',color:'#d7a657'},{x:12,y:8,dir:'right',color:'#c44'},{x:10,y:8,dir:'up',color:'#7cc'}]; document.getElementById('level').textContent=level; document.getElementById('score').textContent=score; document.getElementById('lives').textContent=lives; msg('Clear every pickup. Avoid the heat.');}
function msg(t){document.getElementById('msg').textContent=t}
function walkable(x,y){const c=grid[y]?.[x]; return c && c!=='#' && c!==' ';}
function moveEnt(ent,dir){ const d={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[dir]; if(!d) return false; const nx=ent.x+d[0], ny=ent.y+d[1]; if(walkable(nx,ny)){ ent.x=nx; ent.y=ny; ent.dir=dir; return true; } return false; }
function update(){ moveEnt(player,input); const cell=grid[player.y][player.x]; if(cell==='.' ){ grid[player.y][player.x]=''; score+=10; } if(cell==='$'){ grid[player.y][player.x]=''; score+=60; } document.getElementById('score').textContent=score;
 enemies.forEach(e=>{ const dirs=['left','right','up','down'].sort(()=>Math.random()-.5); if(!moveEnt(e,e.dir)) dirs.some(d=>moveEnt(e,d)); if(Math.random()<0.35) dirs.some(d=>moveEnt(e,d)); if(e.x===player.x && e.y===player.y){ lives--; document.getElementById('lives').textContent=lives; if(lives<=0){ running=false; msg('Busted. Hit reset and run it back.'); } else { player.x=1; player.y=1; msg('Heat caught you. Keep moving.'); } } });
 const left=grid.flat().filter(c=>c==='.'||c==='$').length; if(left===0){ level++; score+=200; resetLevel(); msg('Block cleared. Next level.'); }}
function draw(){ ctx.fillStyle='#070707'; ctx.fillRect(0,0,canvas.width,canvas.height); for(let y=0;y<grid.length;y++) for(let x=0;x<grid[y].length;x++){ const c=grid[y][x]; const px=x*tile, py=y*tile; if(c==='#'){ ctx.fillStyle='#121212'; ctx.fillRect(px,py,tile,tile); ctx.strokeStyle='rgba(215,166,87,.28)'; ctx.strokeRect(px+2,py+2,tile-4,tile-4);} if(c==='.') {ctx.fillStyle='#f2d18b'; ctx.beginPath(); ctx.arc(px+20,py+20,4,0,Math.PI*2); ctx.fill();} if(c==='$'){ctx.fillStyle='#57d28c'; ctx.beginPath(); ctx.arc(px+20,py+20,8,0,Math.PI*2); ctx.fill();}}
 ctx.fillStyle='#d7a657'; ctx.beginPath(); ctx.arc(player.x*tile+20,player.y*tile+20,14,0,Math.PI*2); ctx.fill(); enemies.forEach(e=>{ ctx.fillStyle=e.color; ctx.beginPath(); ctx.arc(e.x*tile+20,e.y*tile+20,13,0,Math.PI*2); ctx.fill(); });
 ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(0,0,canvas.width,52); ctx.fillStyle='#f5dca8'; ctx.font='bold 22px Arial'; ctx.fillText('HOOD MAZE',20,32); }
function loop(ts){ if(!running) {draw(); return;} if(ts-last>190){ update(); last=ts; } draw(); requestAnimationFrame(loop);} 
window.addEventListener('keydown',e=>{ const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}; if(map[e.key]) input=map[e.key];}); document.querySelectorAll('.dir').forEach(b=>b.onclick=()=>input=b.dataset.dir);
document.getElementById('start').onclick=()=>{ if(!running){ running=true; msg('Run the block.'); requestAnimationFrame(loop);} };
document.getElementById('reset').onclick=()=>{ level=1; score=0; lives=3; running=false; resetLevel(); draw(); };
resetLevel(); draw();
