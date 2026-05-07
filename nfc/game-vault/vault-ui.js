(function(){
'use strict';

const games = [
  {
    id:'chess',
    title:'Vault Chess',
    pill:'Strategy',
    tags:['Strategy','Fan Mode','AI'],
    href:'./games/chess/',
    bg:'./assets/preview_chess.svg',
    desc:'Luxury chess board with legal moves, CPU mode, timers, and fan challenge placeholder.',
    type:'strategy',
    difficulty:'Medium',
    players:'1-2 Players'
  },
  {
    id:'slots',
    title:'3D Slots',
    pill:'Casino',
    tags:['Casino','Rewards','Fast'],
    href:'./games/slot-machine-custom/',
    bg:'./assets/preview_slots.svg',
    desc:'Premium reel room with vault energy, jackpot glow, and reward-ready structure.',
    type:'casino',
    difficulty:'Easy',
    players:'Solo'
  },
  {
    id:'blackjack',
    title:'Blackjack',
    pill:'High Limit',
    tags:['Casino','Cards','Dealer'],
    href:'./games/blackjack/',
    bg:'./assets/preview_blackjack.svg',
    desc:'Black-and-gold card table for quick premium blackjack sessions.',
    type:'casino',
    difficulty:'Medium',
    players:'Solo'
  },
  {
    id:'poker',
    title:'Poker',
    pill:'Card Room',
    tags:['Casino','Cards','Fan Mode'],
    href:'./games/poker/',
    bg:'./assets/preview_poker.svg',
    desc:'Private table energy with future fan challenge room-code foundation.',
    type:'casino multiplayer',
    difficulty:'Medium',
    players:'1-6 Future'
  },
  {
    id:'rewards',
    title:'Rewards',
    pill:'Vault Perks',
    tags:['Rewards','Member','Claim'],
    href:'./rewards/',
    bg:'./assets/preview_rewards.svg',
    desc:'Rewards wallet, prize codes, and claim path for the vault ecosystem.',
    type:'multiplayer',
    difficulty:'Member',
    players:'All'
  }
];

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

  next.style.backgroundImage = `linear-gradient(180deg,rgba(0,0,0,.38),rgba(0,0,0,.86)),url("${src}")`;
  next.classList.add('bg-active');
  active.classList.remove('bg-active');
  activeBg = activeBg === 'a' ? 'b' : 'a';
}

function card(game){
  return `
    <article class="game-card" data-game="${game.id}" data-type="${game.type}">
      <div class="preview" style="background-image:url('${game.bg}')"></div>
      <div class="card-shade"></div>
      <div class="sweep"></div>
      <div class="card-content">
        <div class="tags">${game.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="kicker">${game.pill}</div>
        <h3>${game.title}</h3>
        <p>${game.desc}</p>
        <div class="meta">
          <span>${game.players}</span>
          <span>${game.difficulty}</span>
        </div>
        <div class="card-actions">
          <a class="cta gold" href="${game.href}" data-play="${game.id}">Play</a>
          <a class="cta ghost" href="${game.href}">Details</a>
        </div>
      </div>
    </article>
  `;
}

function render(){
  const q = (search.value || '').toLowerCase().trim();
  const list = games.filter(g=>{
    const matchQ = !q || (g.title + ' ' + g.tags.join(' ') + ' ' + g.desc).toLowerCase().includes(q);
    const matchF = currentFilter === 'all' || g.type.includes(currentFilter);
    return matchQ && matchF;
  });

  row.innerHTML = list.map(card).join('');

  const first = list[0] || games[0];
  setFeatured(first);

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

document.getElementById('scrollLeft').onclick = ()=>row.scrollBy({left:-460,behavior:'smooth'});
document.getElementById('scrollRight').onclick = ()=>row.scrollBy({left:460,behavior:'smooth'});

function loadLast(){
  try{
    const g = JSON.parse(localStorage.getItem('PLAY3D_LAST_GAME') || 'null');
    if(!g) return;
    lastPlayedTitle.textContent = g.title;
    lastPlayedCopy.textContent = 'Jump back into ' + g.title + '.';
    continueBtn.href = g.href;
  }catch(e){}
}

loadLast();
render();
})();