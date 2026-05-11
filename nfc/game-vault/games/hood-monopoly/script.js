(()=>{
'use strict';
const spaces=[
 {t:'start',n:'Start',d:'Pass Start and collect $200.'},
 {t:'property',n:'West Vallejo',p:120,r:20,d:'Old school block with loyal traffic.'},
 {t:'hustle',n:'Hustle Card',d:'Draw a hustle card.'},
 {t:'property',n:'Downtown Studio',p:160,r:30,d:'Record hits and charge session rent.'},
 {t:'fee',n:'Traffic Stop',p:-75,d:'Pay $75.'},
 {t:'property',n:'South Vallejo Shop',p:180,r:35,d:'Corner store with steady flow.'},
 {t:'property',n:'North Vallejo Lot',p:200,r:40,d:'Car lot collecting big rent.'},
 {t:'raid',n:'Raid Card',d:'Draw a raid card.'},
 {t:'property',n:'East Vallejo Strip',p:220,r:45,d:'Retail strip with strong control.'},
 {t:'jail',n:'County Hold',d:'Lose one turn.'},
 {t:'property',n:'Mare Island Yard',p:260,r:55,d:'Industrial money block.'},
 {t:'hustle',n:'Hustle Card',d:'Draw a hustle card.'},
 {t:'property',n:'Sonoma Blvd',p:280,r:60,d:'Main road money lane.'},
 {t:'fee',n:'Studio Bill',p:-100,d:'Pay $100.'},
 {t:'property',n:'Tennessee Street',p:300,r:70,d:'High-traffic premium block.'},
 {t:'property',n:'Capo Lounge',p:340,r:80,d:'VIP nightlife rent machine.'},
 {t:'raid',n:'Raid Card',d:'Draw a raid card.'},
 {t:'property',n:'Vault Casino',p:380,r:95,d:'Big room, big rent.'},
 {t:'bonus',n:'Merch Drop',p:150,d:'Collect $150.'},
 {t:'property',n:'3D Tower',p:450,r:120,d:'Top boss property.'}
];
const hustle=[['Viral freestyle',180],['Merch sold out',220],['Fan sent a tip',90],['Club booking paid',160],['Studio feature cleared',130]];
const raid=[['Police sweep',-180],['Printer jam ruined blanks',-80],['Car repair hit',-120],['Show got cancelled',-150],['Dodged the raid',75]];
const players=[
 {n:'Player 1',cash:1500,pos:0,props:[],skip:false,dead:false},
 {n:'Player 2',cash:1500,pos:0,props:[],skip:false,dead:false},
 {n:'Player 3',cash:1500,pos:0,props:[],skip:false,dead:false},
 {n:'Player 4',cash:1500,pos:0,props:[],skip:false,dead:false}
];
let turn=0,rolled=false,round=1;
const $=id=>document.getElementById(id);
const board=$('board'),playersEl=$('players'),logEl=$('log');
const rollBtn=$('rollBtn'),buyBtn=$('buyBtn'),endBtn=$('endBtn'),newGameBtn=$('newGameBtn');
const turnName=$('turnName'),turnCash=$('turnCash'),roundText=$('roundText'),statusText=$('statusText'),dice=$('dice');
const spaceType=$('spaceType'),spaceName=$('spaceName'),spaceDesc=$('spaceDesc'),spaceMeta=$('spaceMeta');
const path=[0,1,2,3,4,5,6,13,20,27,34,41,48,47,46,45,44,43,42,35,28,21,14,7];
function ownerOf(i){return players.findIndex(p=>p.props.includes(i));}
function current(){return players[turn];}
function cash(v){return (v<0?'-$':'$')+Math.abs(v);}
function log(msg){const d=document.createElement('div');d.textContent=msg;logEl.prepend(d);}
function buildBoard(){board.innerHTML='';for(let i=0;i<49;i++){const cell=document.createElement('div');if(!path.includes(i)){cell.className='space center';if(i===24)cell.innerHTML='<div><h2>HOOD MONOPOLY</h2><p>Buy blocks. Collect rent. Survive raids. Own the city.</p></div>';board.appendChild(cell);continue}const s=spaces[path.indexOf(i)];const idx=path.indexOf(i);const o=ownerOf(idx);cell.className='space'+(o>=0?' owned':'')+(idx===current().pos?' current':'');cell.dataset.index=idx;cell.innerHTML=`<span class="tag">${s.t}</span><div class="space-name">${s.n}</div>${s.p?`<div class="space-price">${cash(s.p)}</div>`:''}<div class="tokens"></div>`;const tok=cell.querySelector('.tokens');players.forEach((p,pi)=>{if(p.pos===idx&&!p.dead){const t=document.createElement('span');t.className='token p'+pi;t.textContent=pi+1;tok.appendChild(t)}});board.appendChild(cell)}}
function renderPlayers(){playersEl.innerHTML='';players.forEach((p,i)=>{const d=document.createElement('div');d.className='player'+(i===turn?' active':'');d.innerHTML=`<b>${p.n}</b><small>${p.dead?'Busted':p.skip?'Skipping next turn':'Cash '+cash(p.cash)}</small><div class="assets">Blocks: ${p.props.length?p.props.map(x=>spaces[x].n).join(', '):'None'}</div>`;playersEl.appendChild(d)})}
function showSpace(){const p=current(),s=spaces[p.pos],o=ownerOf(p.pos);spaceType.textContent=s.t;spaceName.textContent=s.n;spaceDesc.textContent=s.d;spaceMeta.innerHTML='';if(s.t==='property'){spaceMeta.innerHTML=`<div>Price: ${cash(s.p)}</div><div>Rent: ${cash(s.r)}</div><div>Owner: ${o>=0?players[o].n:'Unowned'}</div>`;buyBtn.disabled=!(rolled&&o<0&&p.cash>=s.p)}else buyBtn.disabled=true;}
function render(){turnName.textContent=current().n;turnCash.textContent=cash(current().cash);roundText.textContent='Round '+round;rollBtn.disabled=rolled||current().dead;endBtn.disabled=!rolled;buildBoard();renderPlayers();showSpace();}
function pay(player,amount){player.cash+=amount;if(player.cash<0){player.dead=true;log(player.n+' went broke and is out.');}}
function land(){const p=current(),s=spaces[p.pos];statusText.textContent=s.n;if(s.t==='property'){const o=ownerOf(p.pos);if(o>=0&&o!==turn){pay(p,-s.r);pay(players[o],s.r);log(p.n+' paid '+cash(s.r)+' rent to '+players[o].n+' for '+s.n+'.')}else if(o<0){log(p.n+' landed on unowned '+s.n+'.')}}if(s.t==='fee'){pay(p,s.p);log(p.n+' paid '+cash(s.p)+' at '+s.n+'.')}if(s.t==='bonus'){pay(p,s.p);log(p.n+' collected '+cash(s.p)+' from '+s.n+'.')}if(s.t==='jail'){p.skip=true;log(p.n+' got held. Skip next turn.')}if(s.t==='hustle'){const c=hustle[Math.floor(Math.random()*hustle.length)];pay(p,c[1]);log(p.n+' drew Hustle: '+c[0]+' '+cash(c[1])+'.')}if(s.t==='raid'){const c=raid[Math.floor(Math.random()*raid.length)];pay(p,c[1]);log(p.n+' drew Raid: '+c[0]+' '+cash(c[1])+'.')}render();checkWinner();}
function move(steps){const p=current();let count=0;const timer=setInterval(()=>{p.pos=(p.pos+1)%spaces.length;if(p.pos===0){pay(p,200);log(p.n+' passed Start and collected $200.')}count++;buildBoard();if(count>=steps){clearInterval(timer);land()}},180)}
function activePlayers(){return players.filter(p=>!p.dead)}
function checkWinner(){if(activePlayers().length===1){statusText.textContent=activePlayers()[0].n+' Wins';rollBtn.disabled=true;endBtn.disabled=true;buyBtn.disabled=true;log(activePlayers()[0].n+' owns the city.')}}
rollBtn.onclick=()=>{const p=current();if(p.skip){p.skip=false;rolled=true;log(p.n+' skipped this turn.');render();return}const r=1+Math.floor(Math.random()*6);dice.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][r-1];rolled=true;statusText.textContent='Rolled '+r;log(p.n+' rolled '+r+'.');render();move(r)};
buyBtn.onclick=()=>{const p=current(),s=spaces[p.pos];if(s.t!=='property'||ownerOf(p.pos)>=0||p.cash<s.p)return;pay(p,-s.p);p.props.push(p.pos);log(p.n+' bought '+s.n+' for '+cash(s.p)+'.');render();};
endBtn.onclick=()=>{do{turn=(turn+1)%players.length;if(turn===0)round++;}while(players[turn].dead&&activePlayers().length>1);rolled=false;statusText.textContent='Ready';dice.textContent='🎲';render();};
newGameBtn.onclick=()=>{players.forEach(p=>{p.cash=1500;p.pos=0;p.props=[];p.skip=false;p.dead=false});turn=0;rolled=false;round=1;logEl.innerHTML='';log('New game started.');render();};
log('Hood Monopoly loaded. Roll dice to begin.');render();
})();
