(()=>{'use strict';
const spaces=[
{name:'Start / The Corner',type:'start'}, {name:'West Vallejo Block',price:120,rent:18}, {name:'Hustle Card',type:'hustle'}, {name:'Downtown Studio',price:160,rent:24}, {name:'Raid Check',type:'raid'}, {name:'South Vallejo Shop',price:180,rent:28},
{name:'Tennessee Street',price:200,rent:32}, {name:'Vault Bonus',type:'bonus'}, {name:'Mare Island Lot',price:220,rent:36}, {name:'Sonoma Blvd Strip',price:240,rent:40}, {name:'County Hold',type:'jail'}, {name:'North Vallejo Yard',price:260,rent:44},
{name:'Merch Warehouse',price:280,rent:48}, {name:'Hustle Card',type:'hustle'}, {name:'East Vallejo Plaza',price:300,rent:52}, {name:'Studio Upgrade',type:'bonus'}, {name:'Club 707',price:340,rent:58}, {name:'Raid Check',type:'raid'},
{name:'Car Lot',price:380,rent:66}, {name:'Luxury Condo',price:420,rent:74}, {name:'Capo Casino',price:500,rent:90}, {name:'Vault Tax',type:'tax'}, {name:'Empire Tower',price:620,rent:120}, {name:'Final Corner',type:'bonus'}
];
const players=[
{name:'Player 1',cash:1500,pos:0,owned:[],cls:'p1'},
{name:'Player 2',cash:1500,pos:0,owned:[],cls:'p2'},
{name:'Player 3',cash:1500,pos:0,owned:[],cls:'p3'},
{name:'Player 4',cash:1500,pos:0,owned:[],cls:'p4'}
];
let turn=0,rolled=false,lastRoll=0;
const board=document.getElementById('board'),playersEl=document.getElementById('players'),logEl=document.getElementById('log'),diceEl=document.getElementById('dice'),turnName=document.getElementById('turnName'),turnStatus=document.getElementById('turnStatus');
function money(n){return '$'+n.toLocaleString();}
function log(msg){const p=document.createElement('p');p.textContent=msg;logEl.prepend(p);}
function ownerOf(i){return players.findIndex(p=>p.owned.includes(i));}
function renderBoard(){board.innerHTML='';spaces.forEach((s,i)=>{const own=ownerOf(i);const el=document.createElement('div');el.className='space '+(!s.price?'corner ':'')+(own>=0?'owned-p'+(own+1):'');el.innerHTML=`<div class="space-name">${i}. ${s.name}</div><div class="space-price">${s.price?money(s.price)+' / Rent '+money(s.rent):(s.type||'bonus').toUpperCase()}</div><div class="tokens"></div>`;const t=el.querySelector('.tokens');players.forEach((p,idx)=>{if(p.pos===i){const tok=document.createElement('span');tok.className='token '+p.cls;tok.textContent=idx+1;t.appendChild(tok);}});board.appendChild(el);});}
function renderPlayers(){playersEl.innerHTML=players.map((p,i)=>`<article class="player-card ${i===turn?'active':''}"><h3>${p.name}</h3><div><span>Cash</span><b>${money(p.cash)}</b></div><div><span>Blocks</span><b>${p.owned.length}</b></div><div><span>Position</span><b>${spaces[p.pos].name}</b></div></article>`).join('');turnName.textContent=players[turn].name;}
function render(){renderBoard();renderPlayers();}
function active(){return players[turn];}
function drawHustle(p){const cards=[['Studio session went viral',180],['Merch sold out',220],['Fan donated to the vault',120],['Video shoot ran over budget',-100],['Feature came through',160],['Bad business move',-140]];const c=cards[Math.floor(Math.random()*cards.length)];p.cash+=c[1];log(`${p.name}: ${c[0]} (${c[1]>=0?'+':''}${money(c[1])})`);}
function raid(p){const fine=80+Math.floor(Math.random()*160);p.cash-=fine;log(`${p.name} got hit with a raid fine: -${money(fine)}`);}
function bonus(p){const amt=100+Math.floor(Math.random()*140);p.cash+=amt;log(`${p.name} caught a vault bonus: +${money(amt)}`);}
function land(){const p=active();const s=spaces[p.pos];const own=ownerOf(p.pos);if(s.type==='hustle')drawHustle(p);else if(s.type==='raid')raid(p);else if(s.type==='bonus'||s.type==='start')bonus(p);else if(s.type==='tax'){p.cash-=150;log(`${p.name} paid Vault Tax: -$150`);}else if(s.type==='jail'){p.cash-=120;log(`${p.name} lost time at County Hold: -$120`);}else if(s.price&&own>=0&&own!==turn){p.cash-=s.rent;players[own].cash+=s.rent;log(`${p.name} paid ${money(s.rent)} rent to ${players[own].name} for ${s.name}.`);}else if(s.price&&own===turn){log(`${p.name} landed on their own block: ${s.name}.`);}else if(s.price){log(`${p.name} landed on ${s.name}. Buy it for ${money(s.price)} or end turn.`);}turnStatus.textContent=s.name;}
document.getElementById('rollBtn').onclick=()=>{if(rolled){log('End your turn first.');return;}const p=active();lastRoll=1+Math.floor(Math.random()*6);diceEl.textContent=lastRoll;p.pos=(p.pos+lastRoll)%spaces.length;if(p.pos<lastRoll){p.cash+=200;log(`${p.name} passed Start and collected $200.`);}rolled=true;log(`${p.name} rolled ${lastRoll}.`);land();render();};
document.getElementById('buyBtn').onclick=()=>{const p=active();const idx=p.pos,s=spaces[idx];if(!rolled){log('Roll first before buying.');return;}if(!s.price){log('This space cannot be bought.');return;}if(ownerOf(idx)>=0){log('That block is already owned.');return;}if(p.cash<s.price){log(`${p.name} does not have enough cash.`);return;}p.cash-=s.price;p.owned.push(idx);log(`${p.name} bought ${s.name} for ${money(s.price)}.`);render();};
document.getElementById('endBtn').onclick=()=>{if(!rolled){log('Roll before ending turn.');return;}turn=(turn+1)%players.length;rolled=false;lastRoll=0;diceEl.textContent='--';turnStatus.textContent='Roll to start.';render();};
document.getElementById('resetBtn').onclick=()=>{players.forEach(p=>{p.cash=1500;p.pos=0;p.owned=[];});turn=0;rolled=false;diceEl.textContent='--';turnStatus.textContent='Roll to start.';log('New Hood Monopoly game started.');render();};
log('Hood Monopoly loaded. 2–4 player local mode ready.');render();
})();
