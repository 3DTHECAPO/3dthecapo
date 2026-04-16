
const STARTING_CREDITS=1000;
const BETS=[10,25,50,100];
const SYMBOLS=[
{id:'speaker',src:'./assets/speaker.png',weight:18},
{id:'merch1',src:'./assets/merch1.jpg',weight:12},
{id:'key',src:'./assets/key.png',weight:10},
{id:'lock',src:'./assets/lock.svg',weight:10},
{id:'crown',src:'./assets/crown.png',weight:8},
{id:'logo',src:'./assets/logo.png',weight:8},
{id:'cover1',src:'./assets/cover1.jpg',weight:7},
{id:'cover2',src:'./assets/cover2.jpg',weight:7},
{id:'cover3',src:'./assets/cover3.jpg',weight:7},
{id:'vault',src:'./assets/vault.png',weight:4},
];
const paylines=[[[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,1],[1,1],[2,1],[3,1],[4,1]],[[0,2],[1,2],[2,2],[3,2],[4,2]],[[0,0],[1,1],[2,2],[3,1],[4,0]],[[0,2],[1,1],[2,0],[3,1],[4,2]]];
const payoutMultipliers={3:4,4:10,5:25};
const rareBonuses={key:60,lock:60,crown:90,logo:90,vault:120};
let credits=parseInt(localStorage.getItem('capo_slot_credits')||STARTING_CREDITS,10); if(!Number.isFinite(credits)||credits<0) credits=STARTING_CREDITS;
let betIndex=parseInt(localStorage.getItem('capo_slot_bet_idx')||'1',10); if(!Number.isFinite(betIndex)||betIndex<0||betIndex>=BETS.length) betIndex=1;
let jackpot=parseInt(localStorage.getItem('capo_slot_jackpot')||'125000',10); if(!Number.isFinite(jackpot)||jackpot<50000) jackpot=125000;
let isSpinning=false; let currentGrid=[];
const reelsEl=document.getElementById('reels'), creditsEl=document.getElementById('creditsValue'), betEl=document.getElementById('betValue'), jackpotEl=document.getElementById('jackpotValue'), messageBar=document.getElementById('messageBar'), machineEl=document.querySelector('.machine'), winOverlay=document.getElementById('winOverlay'), winTier=document.getElementById('winTier'), winText=document.getElementById('winText'), winAmount=document.getElementById('winAmount');
const weightedPool=SYMBOLS.flatMap(s=>Array.from({length:s.weight},()=>s));
const fmt=n=>new Intl.NumberFormat('en-US').format(n);
function pickWeighted(){return weightedPool[Math.floor(Math.random()*weightedPool.length)]}
function saveState(){localStorage.setItem('capo_slot_credits',credits);localStorage.setItem('capo_slot_bet_idx',betIndex);localStorage.setItem('capo_slot_jackpot',jackpot)}
function updateHud(){creditsEl.textContent=fmt(credits);betEl.textContent=fmt(BETS[betIndex]);jackpotEl.textContent=fmt(jackpot)}
function makeSymbolCell(symbol){const div=document.createElement('div');div.className='symbol';const img=document.createElement('img');img.src=symbol.src;img.alt='';img.loading='eager';img.onerror=()=>{img.src='./assets/crown.png'};div.appendChild(img);return div}
function buildReels(){reelsEl.innerHTML='';for(let c=0;c<5;c++){const reel=document.createElement('div');reel.className='reel';const strip=document.createElement('div');strip.className='strip';reel.appendChild(strip);reelsEl.appendChild(reel)}}
function renderGrid(grid){[...document.querySelectorAll('.reel .strip')].forEach((strip,c)=>{strip.innerHTML='';for(let r=0;r<3;r++) strip.appendChild(makeSymbolCell(grid[c][r]))})}
function randomGrid(){return Array.from({length:5},()=>Array.from({length:3},()=>pickWeighted()))}
function forcedGrid(){const base=randomGrid();const centerWin=Math.random()<0.16;const bigWin=Math.random()<0.028;const jackpotHit=Math.random()<0.0025;if(jackpotHit){const rare=SYMBOLS.find(s=>s.id==='vault');for(let c=0;c<5;c++) base[c][1]=rare;return base}if(bigWin){const rareIds=['logo','crown','key','lock'];const sym=SYMBOLS.find(s=>s.id===rareIds[Math.floor(Math.random()*rareIds.length)]);const count=Math.random()<0.45?4:5;for(let c=0;c<count;c++) base[c][1]=sym;return base}if(centerWin){const sym=pickWeighted();const count=3+Math.floor(Math.random()*2);for(let c=0;c<count;c++) base[c][1]=sym;return base}if(Math.random()<0.38){const sym=pickWeighted();for(let c=0;c<4;c++) base[c][1]=sym;let miss=pickWeighted();if(miss.id===sym.id) miss=SYMBOLS[0];base[4][1]=miss}return base}
function evaluate(grid){const wins=[];let total=0;paylines.forEach(line=>{let count=1;const first=grid[line[0][0]][line[0][1]];for(let i=1;i<line.length;i++){const [c,r]=line[i];if(grid[c][r].id===first.id) count++;else break}if(count>=3){let amount=BETS[betIndex]*(payoutMultipliers[count]||0);if(rareBonuses[first.id]) amount+=rareBonuses[first.id];total+=amount;wins.push({id:first.id,count,amount,cells:line.slice(0,count)})}});return {wins,total}}
function clearHighlights(){document.querySelectorAll('.symbol.win').forEach(el=>el.classList.remove('win'))}
function highlightWins(winData){clearHighlights();const reelEls=[...document.querySelectorAll('.reel .strip')];winData.wins.forEach(win=>{win.cells.forEach(([c,r])=>{const cell=reelEls[c].children[r];if(cell) cell.classList.add('win')})})}
async function spin(){if(isSpinning)return;const bet=BETS[betIndex];if(credits<bet){messageBar.textContent='Out of Credits';return}isSpinning=true;clearHighlights();credits-=bet;jackpot+=Math.floor(bet*.12);updateHud();messageBar.textContent='Spinning';const target=forcedGrid();const reelEls=[...document.querySelectorAll('.reel .strip')];for(let c=0;c<5;c++){const strip=reelEls[c];strip.innerHTML='';for(let i=0;i<16;i++) strip.appendChild(makeSymbolCell(pickWeighted()))}await Promise.all(reelEls.map((strip,idx)=>new Promise(resolve=>{let ticks=0;const totalTicks=14+idx*4;const timer=setInterval(()=>{strip.innerHTML='';const items=(ticks>=totalTicks-3)?[...Array.from({length:3},(_,r)=>target[idx][r]),...Array.from({length:13},()=>pickWeighted())]:Array.from({length:16},()=>pickWeighted());items.forEach(sym=>strip.appendChild(makeSymbolCell(sym)));strip.style.transform=`translateY(-${(ticks%4)*16}px)`;ticks++;if(ticks>totalTicks){clearInterval(timer);strip.style.transform='translateY(0)';strip.innerHTML='';for(let r=0;r<3;r++) strip.appendChild(makeSymbolCell(target[idx][r]));resolve()}},70)})));currentGrid=target;const result=evaluate(currentGrid);if(result.total>0){credits+=result.total;jackpot=Math.max(50000,jackpot-Math.floor(result.total*.4));updateHud();highlightWins(result);machineEl.classList.remove('flash');void machineEl.offsetWidth;machineEl.classList.add('flash');const highest=[...result.wins].sort((a,b)=>b.amount-a.amount)[0];winTier.textContent=highest.count===5?'Jackpot Line':'Win';winText.textContent=highest.id==='vault'?'Access Granted':'Capo Hit';winAmount.textContent='+'+fmt(result.total);winOverlay.classList.add('show');messageBar.textContent='Win'}else{messageBar.textContent='No Hit'}saveState();isSpinning=false}
document.getElementById('spinBtn').addEventListener('click',spin);document.getElementById('betDown').addEventListener('click',()=>{if(isSpinning)return;betIndex=(betIndex-1+BETS.length)%BETS.length;updateHud();saveState()});document.getElementById('betUp').addEventListener('click',()=>{if(isSpinning)return;betIndex=(betIndex+1)%BETS.length;updateHud();saveState()});document.getElementById('enterBtn').addEventListener('click',()=>document.getElementById('entryOverlay').classList.add('hide'));document.getElementById('closeWinBtn').addEventListener('click',()=>winOverlay.classList.remove('show'));
buildReels();currentGrid=randomGrid();renderGrid(currentGrid);updateHud();
