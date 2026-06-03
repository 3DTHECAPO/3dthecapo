(function(){
'use strict';

const games = [
  {id:'chess',title:'Vault Chess',pill:'Strategy',tags:['Strategy','Fan Mode','AI'],href:'./games/chess/',bg:'./assets/preview_chess.svg',desc:'Luxury chess board with legal moves, CPU mode, timers, and guarded fan-room routing.',type:'strategy multiplayer',difficulty:'Medium',players:'1-2 Players'},
  {id:'defender',title:'3D Defender',pill:'Neon Arcade',tags:['Arcade','Shooter','Neon'],href:'./games/3d-defender/',bg:'assets/preview_defender.svg',desc:'Neon arcade shooter. Survive waves and stack points.',type:'arcade strategy',difficulty:'Medium',players:'Solo'},
  {id:'slots',title:'3D Slots',pill:'Casino',tags:['Casino','Rewards','Fast'],href:'./games/slot-machine-custom/',bg:'./assets/preview_slots.svg',desc:'Premium reel room with vault energy, jackpot glow, and reward-ready structure.',type:'casino',difficulty:'Easy',players:'Solo'},
  {id:'blackjack',title:'Blackjack',pill:'High Limit',tags:['Casino','Cards','Dealer'],href:'./games/blackjack/',bg:'./assets/preview_blackjack.svg',desc:'Black-and-gold card table for quick blackjack sessions.',type:'casino cards',difficulty:'Medium',players:'Solo'},
  {id:'poker',title:'Poker',pill:'Card Room',tags:['Casino','Cards','Fan Mode'],href:'./games/poker/',bg:'./assets/preview_poker.svg',desc:'Private table energy with draw poker, room codes, and member prize points.',type:'casino cards multiplayer',difficulty:'Medium',players:'Solo / Fan'},
  {id:'spades',title:'Spades',pill:'Team Table',tags:['Cards','Fan Mode','Teams'],href:'./games/spades/',bg:'./assets/preview_spades.svg',desc:'Classic team card room with CPU fill, local turns, and room-code guard.',type:'cards strategy multiplayer',difficulty:'Medium',players:'2-4'},
  {id:'pinochle',title:'Pinochle',pill:'Legacy Cards',tags:['Cards','Strategy','Classic'],href:'./games/pinochle/',bg:'./assets/preview_pinochle.svg',desc:'Four-player team pinochle with CPU-filled seats, melds, bidding, and trick play.',type:'cards strategy multiplayer',difficulty:'Hard',players:'4 Players'},
  {id:'rummy',title:'Rummy',pill:'Run Builder',tags:['Cards','Strategy','Chill'],href:'./games/rummy/',bg:'./assets/preview_rummy.svg',desc:'Two-player rummy table with smarter CPU draw/discard and meld-building pressure.',type:'cards strategy',difficulty:'Medium',players:'2 Players'},
  {id:'dominoes',title:'Dominoes',pill:'Street Table',tags:['Strategy','Fan Mode','Classic'],href:'./games/dominoes/',bg:'./assets/preview_dominoes.svg',desc:'Black-and-gold domino table with 2-4 player support, CPU-filled seats, and spinner play.',type:'strategy multiplayer',difficulty:'Medium',players:'2-4 Players'}
];

const hubParams = new URLSearchParams(window.location.search);
function fanRoomQuery(){
  const mode = hubParams.get('mode');
  const room = hubParams.get('room');
  if(mode !== 'fan' || !room) return '';
  return '?mode=fan&room=' + encodeURIComponent(room);
}

function launchHref(game){
  if(!game) return '#';
  return game.href.split('?')[0] + fanRoomQuery();
}

const row = document.getElementById('gameRow');
const search = document.getElementById('gameSearch');
const filters = document.getElementById('filters');
const bgA = document.getElementById('bgLayerA');
const bgB = document.getElementById('bgLayerB');
const featuredName = document.getElementById('featuredName');
const featuredLabel = document.getElementById('featuredLabel');
const lastPlayedTitle = document.getElementById('lastPlayedTitle');
const lastPlayedCopy = document.getElementById('lastPlayedCopy');
const continueBtn = document.getElementById('continueBtn');

let currentFilter = 'all';
let activeBg = 'a';

function setBg(src){
  const active = activeBg === 'a' ? bgA : bgB;
  const next = activeBg === 'a' ? bgB : bgA;
  next.style.backgroundImage = `linear-gradient(180deg,rgba(0,0,0,.28),rgba(0,0,0,.78)),url("${src}")`;
  next.classList.add('bg-active');
  active.classList.remove('bg-active');
  activeBg = activeBg === 'a' ? 'b' : 'a';
}

function card(game){
  const href = launchHref(game);
  return `
    <article class="game-card" data-game="${game.id}" data-type="${game.type}">
      <div class="preview" style="background-image:url('${game.bg}')"></div>
      <div class="card-body">
        <div class="tags">${game.tags.slice(0,3).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="kicker">${game.pill}</div>
        <h3>${game.title}</h3>
        <p>${game.desc}</p>
        <div class="meta">
          <span>${game.players}</span>
          <span>${game.difficulty}</span>
        </div>
        <div class="card-actions">
          <a class="cta gold" href="${href}" data-play="${game.id}">PLAY</a>
          <a class="cta ghost" href="${href}">Open</a>
        </div>
      </div>
    </article>
  `;
}

function render(){
  const q = (search.value || '').toLowerCase().trim();
  const list = games.filter(g=>{
    const text = (g.title + ' ' + g.tags.join(' ') + ' ' + g.desc).toLowerCase();
    const matchQ = !q || text.includes(q);
    const matchF = currentFilter === 'all' || g.type.includes(currentFilter);
    return matchQ && matchF;
  });

  row.innerHTML = list.map(card).join('');
  setFeatured(list[0] || games[0]);

  document.querySelectorAll('.game-card').forEach(el=>{
    const g = games.find(x=>x.id === el.dataset.game);
    el.addEventListener('mouseenter',()=>setFeatured(g));
    el.addEventListener('focusin',()=>setFeatured(g));
  });

  document.querySelectorAll('[data-play]').forEach(a=>{
    a.addEventListener('click',()=>{
      const g = games.find(x=>x.id === a.dataset.play);
      localStorage.setItem('PLAY3D_LAST_GAME', JSON.stringify(g));
    });
  });
}

function setFeatured(g){
  if(!g) return;
  featuredName.textContent = g.title;
  featuredLabel.textContent = g.pill;
  setBg(g.bg);
}

filters.addEventListener('click', e=>{
  const btn = e.target.closest('[data-filter]');
  if(!btn) return;
  document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  render();
});

search.addEventListener('input', render);
document.getElementById('scrollLeft').onclick = ()=>row.scrollBy({left:-430,behavior:'smooth'});
document.getElementById('scrollRight').onclick = ()=>row.scrollBy({left:430,behavior:'smooth'});

function loadLast(){
  try{
    const g = JSON.parse(localStorage.getItem('PLAY3D_LAST_GAME') || 'null');
    if(!g) return;
    lastPlayedTitle.textContent = g.title;
    lastPlayedCopy.textContent = 'Jump back into ' + g.title + '.';
    continueBtn.href = launchHref(g);
  }catch(e){}
}

loadLast();
render();
})();
