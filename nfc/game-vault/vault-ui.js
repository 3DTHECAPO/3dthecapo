(function(){
'use strict';

const games = [
  {id:'chess',title:'Vault Chess',pill:'Strategy',tags:['Strategy','Fan Mode','AI'],href:'./games/chess/',bg:'./assets/preview_chess.svg',desc:'Luxury chess board with legal moves, CPU mode, timers, and fan challenge placeholder.',type:'strategy multiplayer',difficulty:'Medium',players:'1-2 Players'},
  {id:'slots',title:'3D Slots',pill:'Casino',tags:['Casino','Rewards','Fast'],href:'./games/slot-machine-custom/',bg:'./assets/preview_slots.svg',desc:'Premium 9-window slot machine with original vault symbols and reward-ready structure.',type:'casino multiplayer',difficulty:'Easy',players:'Fan Ready'},
  {id:'blackjack',title:'Blackjack',pill:'High Limit',tags:['Casino','Cards','Dealer'],href:'./games/blackjack/',bg:'./assets/preview_blackjack.svg',desc:'Black-and-gold card table for quick blackjack sessions.',type:'casino cards multiplayer',difficulty:'Medium',players:'Fan Ready'},
  {id:'poker',title:'Poker',pill:'Card Room',tags:['Casino','Cards','Fan Mode'],href:'./games/poker/',bg:'./assets/preview_poker.svg',desc:'Private table energy with future fan challenge room-code foundation.',type:'casino cards multiplayer',difficulty:'Medium',players:'Future Fan'},
  {id:'spades',title:'Spades',pill:'Team Table',tags:['Cards','Fan Mode','Teams'],href:'./games/spades/',bg:'./assets/preview_spades.svg',desc:'Classic team card room built for future fan tables and room codes.',type:'cards strategy multiplayer',difficulty:'Medium',players:'2-4 Future'},
  {id:'pinochle',title:'Pinochle',pill:'Legacy Cards',tags:['Cards','Strategy','Classic'],href:'./games/pinochle/',bg:'./assets/preview_pinochle.svg',desc:'Old-school strategic card table with luxury vault styling.',type:'cards strategy multiplayer',difficulty:'Hard',players:'2-4 Future'},
  {id:'rummy',title:'Rummy',pill:'Run Builder',tags:['Cards','Strategy','Chill'],href:'./games/rummy/',bg:'./assets/preview_rummy.svg',desc:'Smooth card-meld game concept ready for full gameplay expansion.',type:'cards strategy multiplayer',difficulty:'Medium',players:'1-4 Future'},
  {id:'dominoes',title:'Dominoes',pill:'Street Table',tags:['Strategy','Fan Mode','Classic'],href:'./games/dominoes/',bg:'./assets/preview_dominoes.svg',desc:'Black-and-gold domino table with future fan challenge mode.',type:'strategy multiplayer',difficulty:'Medium',players:'2-4 Future'},
  {id:'heist',title:'Vault Heist',pill:'Surprise Room',tags:['Action','Vault','Rewards'],href:'./games/vault-heist/',bg:'./assets/preview_heist.svg',desc:'Cinematic vault runner concept for future rewards and unlock missions.',type:'strategy multiplayer',difficulty:'Hard',players:'Fan Ready'},
  {id:'rewards',title:'Rewards',pill:'Vault Perks',tags:['Rewards','Member','Claim'],href:'./rewards/',bg:'./assets/preview_rewards.svg',desc:'Rewards wallet, prize codes, and claim path for the vault ecosystem.',type:'multiplayer',difficulty:'Member',players:'All'}
];

const row=document.getElementById('gameRow'),search=document.getElementById('gameSearch'),filters=document.getElementById('filters'),bgA=document.getElementById('bgLayerA'),bgB=document.getElementById('bgLayerB'),featuredName=document.getElementById('featuredName'),featuredLabel=document.getElementById('featuredLabel'),lastPlayedTitle=document.getElementById('lastPlayedTitle'),lastPlayedCopy=document.getElementById('lastPlayedCopy'),continueBtn=document.getElementById('continueBtn');
let currentFilter='all',activeBg='a';
function setBg(src){if(!bgA||!bgB)return;const active=activeBg==='a'?bgA:bgB,next=activeBg==='a'?bgB:bgA;next.style.backgroundImage=`linear-gradient(180deg,rgba(0,0,0,.28),rgba(0,0,0,.78)),url("${src}")`;next.classList.add('bg-active');active.classList.remove('bg-active');activeBg=activeBg==='a'?'b':'a'}
function roomCode(game){const prefix=(game.id||'P3D').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase()||'P3D';return prefix+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
function fanLink(game){return game.href+(game.href.includes('?')?'&':'?')+'mode=fan&room='+encodeURIComponent(roomCode(game))}
function card(game){const isRewards=game.id==='rewards',fan=fanLink(game);return `
    <article class="game-card" data-game="${game.id}" data-type="${game.type}">
      <div class="preview" style="background-image:url('${game.bg}')"></div>
      <div class="card-body">
        <div class="tags">${game.tags.slice(0,3).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="kicker">${game.pill}</div>
        <h3>${game.title}</h3>
        <p>${game.desc}</p>
        <div class="meta"><span>${game.players}</span><span>${game.difficulty}</span></div>
        <div class="card-actions">
          <a class="cta gold" href="${game.href}" data-play="${game.id}" data-action="Play">Play</a>
          <a class="cta ghost" href="${game.href}" data-play="${game.id}" data-action="Open">Open</a>
          ${isRewards?'':`<a class="cta ghost" href="${fan}" data-play="${game.id}" data-action="Fan Join">Fan Join</a>`}
        </div>
      </div>
    </article>`}
function render(){if(!row)return;const q=(search.value||'').toLowerCase().trim();const list=games.filter(g=>{const text=(g.title+' '+g.tags.join(' ')+' '+g.desc+' '+g.players+' '+g.type).toLowerCase();return(!q||text.includes(q))&&(currentFilter==='all'||g.type.includes(currentFilter))});row.innerHTML=list.map(card).join('');setFeatured(list[0]||games[0]);document.querySelectorAll('.game-card').forEach(el=>{const g=games.find(x=>x.id===el.dataset.game);el.addEventListener('mouseenter',()=>setFeatured(g));el.addEventListener('focusin',()=>setFeatured(g))});document.querySelectorAll('[data-play]').forEach(a=>{a.addEventListener('click',()=>{const g=games.find(x=>x.id===a.dataset.play);if(g)localStorage.setItem('PLAY3D_LAST_GAME',JSON.stringify({...g,href:a.getAttribute('href'),lastAction:a.dataset.action||'Play'}))})})}
function setFeatured(g){if(!g)return;featuredName.textContent=g.title;featuredLabel.textContent=g.pill;setBg(g.bg)}
filters.addEventListener('click',e=>{const btn=e.target.closest('[data-filter]');if(!btn)return;document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentFilter=btn.dataset.filter;render()});
search.addEventListener('input',render);document.getElementById('scrollLeft').onclick=()=>row.scrollBy({left:-430,behavior:'smooth'});document.getElementById('scrollRight').onclick=()=>row.scrollBy({left:430,behavior:'smooth'});
function loadLast(){try{const g=JSON.parse(localStorage.getItem('PLAY3D_LAST_GAME')||'null');if(!g)return;lastPlayedTitle.textContent=g.title;lastPlayedCopy.textContent='Jump back into '+g.title+(g.lastAction?' — '+g.lastAction:'')+'.';continueBtn.href=g.href}catch(e){}}
loadLast();render();
})();