
const SYMBOLS=[
{id:'logo',label:'Capo',type:'image',src:'../../assets/logo.jpg',tier:'jackpot'},
{id:'vault',label:'Vault',type:'image',src:'../../assets/vault-bg.jpg',tier:'rare'},
{id:'grammy',label:'Grammy',type:'image',src:'../../assets/cover-fgrammy.jpg',tier:'music'},
{id:'x100',label:'100x3',type:'image',src:'../../assets/cover-100x3.jpg',tier:'music'},
{id:'resume',label:'Resume',type:'image',src:'../../assets/cover-resume.jpg',tier:'music'},
{id:'hoodie',label:'Hoodie',type:'icon',icon:'🧥',tier:'merch'},
{id:'hat',label:'Hat',type:'icon',icon:'🧢',tier:'merch'},
{id:'speaker',label:'Speaker',type:'icon',icon:'🔊',tier:'common'},
{id:'crown',label:'Crown',type:'icon',icon:'👑',tier:'rare'},
{id:'cash',label:'Cash',type:'icon',icon:'💰',tier:'common'},
{id:'key',label:'Key',type:'icon',icon:'🔐',tier:'rare'}
];
const weights={logo:1,vault:3,grammy:6,x100:6,resume:6,hoodie:5,hat:5,speaker:13,crown:3,cash:17,key:3};
const REELS=5, ROWS=3, PAYLINES=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2]];
const reelsEl=document.getElementById('reels'), msgEl=document.getElementById('message'), statusEl=document.getElementById('status'), screenEl=document.getElementById('screen');
const spinBtn=document.getElementById('spinBtn');
let credits=1000, bet=25, jackpot=25000, lastWin=0, spinning=false, autoRemaining=0;
const options=[25,50,100,200];
function weightedPick(){const total=Object.values(weights).reduce((a,b)=>a+b,0); let r=Math.random()*total; for(const [id,w] of Object.entries(weights)){r-=w; if(r<=0)return SYMBOLS.find(s=>s.id===id)} return SYMBOLS[0]}
function randomGrid(){return Array.from({length:REELS},()=>Array.from({length:ROWS},()=>weightedPick()))}
function buildCell(sym){const d=document.createElement('div'); d.className='cell'; d.dataset.id=sym.id; if(sym.type==='image'){const img=document.createElement('img'); img.src=sym.src; img.alt=sym.label; d.appendChild(img);} else {const i=document.createElement('div'); i.className='icon'; i.textContent=sym.icon; d.appendChild(i);} const l=document.createElement('div'); l.className='label'; l.textContent=sym.label; d.appendChild(l); return d}
function render(grid,spinningNow=false){reelsEl.innerHTML=''; for(let c=0;c<REELS;c++){const reel=document.createElement('div'); reel.className='reel'+(spinningNow?' spin':''); for(let r=0;r<ROWS;r++) reel.appendChild(buildCell(grid[c][r])); reelsEl.appendChild(reel)}}
function hud(){document.getElementById('credits').textContent=credits.toLocaleString(); document.getElementById('bet').textContent=bet.toLocaleString(); document.getElementById('jackpot').textContent=jackpot.toLocaleString(); document.getElementById('lastWin').textContent=lastWin.toLocaleString();}
function setMessage(t,big=false){msgEl.textContent=t; msgEl.classList.toggle('big',!!big)}
function adjustBet(dir){if(spinning) return; let idx=options.indexOf(bet); idx=Math.max(0,Math.min(options.length-1,idx+dir)); bet=options[idx]; hud()}
function payout(sym,count){if(count<3) return 0; if(sym.id==='logo' && count===5) return jackpot; if(sym.tier==='merch') return bet*(6 + (count-3)*3); if(sym.tier==='music') return bet*(4 + (count-3)*2); if(sym.tier==='rare') return bet*(8 + (count-3)*4); return bet*(2 + (count-3))}
function analyze(grid){let total=0; let messages=[]; let reward='loss'; const wins=[];
 for(let lineIndex=0; lineIndex<PAYLINES.length; lineIndex++){
   const line=PAYLINES[lineIndex]; const rowSyms=line.map((row,col)=>grid[col][row]); const first=rowSyms[0]; let streak=1; for(let i=1;i<rowSyms.length;i++){ if(rowSyms[i].id===first.id) streak++; else break; }
   if(streak>=3){ total+=payout(first,streak); messages.push(`${first.label} x${streak}`); wins.push({line:lineIndex,row:lineIndex,count:streak,id:first.id}); if(first.id==='logo'&&streak===5){ reward='jackpot'; jackpot=25000;} else if(first.tier==='merch' && reward!=='jackpot') reward='merch'; else if(first.tier==='music' && !['jackpot','merch'].includes(reward)) reward='music'; else if(first.tier==='rare' && !['jackpot','merch','music'].includes(reward)) reward='rare'; else if(reward==='loss') reward='small'; }
 }
 const flat=grid.flat(); const keyCount=flat.filter(s=>s.id==='key').length; if(keyCount>=3){ total += bet*5; messages.push('Key scatter'); if(reward==='loss') reward='rare'; }
 return {total,reward,messages,wins};
}
function highlight(result){document.querySelectorAll('.cell').forEach(c=>c.classList.remove('win')); result.wins.forEach(w=>{ const reelEls=[...document.querySelectorAll('.reel')]; for(let c=0;c<w.count;c++){ reelEls[c]?.children[w.row]?.classList.add('win'); } }); if(result.total>0){ screenEl.classList.add('flash'); setTimeout(()=>screenEl.classList.remove('flash'),500); } }
function forceWinGrid(kind='small'){ const pool={small:['cash','speaker'],music:['grammy','x100','resume'],merch:['hoodie','hat'],rare:['vault','crown','key'],jackpot:['logo']}; let id=(pool[kind]||pool.small)[Math.floor(Math.random()*(pool[kind]||pool.small).length)]; const sym=SYMBOLS.find(s=>s.id===id); const grid=randomGrid(); const row=Math.floor(Math.random()*3); for(let i=0;i<3+(kind==='jackpot'?2:0);i++) grid[i][row]=sym; return grid; }
function chooseGrid(){ const roll=Math.random(); if(roll<0.0008) return forceWinGrid('jackpot'); if(roll<0.0038) return forceWinGrid('merch'); if(roll<0.0138) return forceWinGrid('rare'); if(roll<0.0438) return forceWinGrid('music'); if(roll<0.1638) return forceWinGrid('small'); return randomGrid(); }
function spin(){ if(spinning || credits<bet) return; spinning=true; credits-=bet; lastWin=0; statusEl.textContent='Spinning'; hud(); setMessage('Reels spinning...'); render(randomGrid(), true); spinBtn.disabled=true;
 const delays=[350,550,750,950,1180]; let finalGrid=chooseGrid(); delays.forEach((ms,idx)=>setTimeout(()=>{ const reels=[...document.querySelectorAll('.reel')]; reels[idx].classList.remove('spin'); reels[idx].innerHTML=''; for(let r=0;r<ROWS;r++) reels[idx].appendChild(buildCell(finalGrid[idx][r])); },ms));
 setTimeout(()=>{ const result=analyze(finalGrid); highlight(result); if(result.total>0){ credits+=result.total; lastWin=result.total; jackpot += Math.floor(bet*0.15); statusEl.textContent=result.reward==='jackpot'?'JACKPOT!':'Win'; const rewardText={jackpot:'ACCESS GRANTED — JACKPOT HIT',merch:'MERCH REWARD HIT',music:'MUSIC REWARD HIT',rare:'RARE BONUS HIT',small:'SMALL WIN'}; setMessage(`${rewardText[result.reward] || 'WIN'} • ${result.messages.join(' • ')} • +${result.total.toLocaleString()}`, true); }
 else { jackpot += Math.floor(bet*0.35); statusEl.textContent='Miss'; setMessage('No hit this spin. Build the jackpot and try again.'); }
 hud(); spinning=false; spinBtn.disabled=false; if(autoRemaining>0){ autoRemaining--; if(autoRemaining>0) setTimeout(spin,250); }
 },1400);
}
function resetGame(){ credits=1000; bet=25; jackpot=25000; lastWin=0; autoRemaining=0; statusEl.textContent='Ready'; render(randomGrid()); hud(); setMessage('Spin to land music, merch, keys, vaults, or the logo jackpot.'); document.querySelectorAll('.cell').forEach(c=>c.classList.remove('win'));}
document.getElementById('betDown').onclick=()=>adjustBet(-1); document.getElementById('betUp').onclick=()=>adjustBet(1); spinBtn.onclick=spin; document.getElementById('resetBtn').onclick=resetGame; document.getElementById('autoBtn').onclick=()=>{ if(spinning) return; autoRemaining=10; spin(); };
resetGame();
