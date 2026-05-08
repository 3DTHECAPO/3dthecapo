(function(){
'use strict';

const games = [
  {id:'chess',title:'Vault Chess',pill:'Strategy',tags:['Strategy','Fan Mode','2 Player'],href:'./games/chess/',bg:'./assets/preview_chess.svg',desc:'Luxury chess board with legal moves, fan challenge entry, timers, and room-code foundation.',type:'strategy multiplayer',difficulty:'Medium',players:'1-2 Players'},
  {id:'slots',title:'3D Slots',pill:'Casino',tags:['Casino','Fan Mode','Bets'],href:'./games/slot-machine-custom/',bg:'./assets/preview_slots.svg',desc:'Premium reel room with vault energy, jackpot glow, stake controls, and fan challenge entry.',type:'casino multiplayer',difficulty:'Easy',players:'Fan Ready'},
  {id:'blackjack',title:'Blackjack',pill:'High Limit',tags:['Casino','Cards','Fan Mode'],href:'./games/blackjack/',bg:'./assets/preview_blackjack.svg',desc:'Black-and-gold card table for blackjack sessions with fan room-code entry.',type:'casino cards multiplayer',difficulty:'Medium',players:'Fan Ready'},
  {id:'poker',title:'Poker',pill:'Card Room',tags:['Casino','Cards','Fan Mode'],href:'./games/poker/',bg:'./assets/preview_poker.svg',desc:'Private table energy with fan challenge room-code foundation.',type:'casino cards multiplayer',difficulty:'Medium',players:'Fan Ready'},
  {id:'spades',title:'Spades',pill:'Team Table',tags:['Cards','Fan Mode','Teams'],href:'./games/spades/',bg:'./assets/preview_spades.svg',desc:'Classic team card room built for fan tables and room codes.',type:'cards strategy multiplayer',difficulty:'Medium',players:'2-4 Fan'},
  {id:'pinochle',title:'Pinochle',pill:'Legacy Cards',tags:['Cards','Strategy','Fan Mode'],href:'./games/pinochle/',bg:'./assets/preview_pinochle.svg',desc:'Old-school strategic card table with fan room-code entry.',type:'cards strategy multiplayer',difficulty:'Hard',players:'2-4 Fan'},
  {id:'rummy',title:'Rummy',pill:'Run Builder',tags:['Cards','Strategy','Fan Mode'],href:'./games/rummy/',bg:'./assets/preview_rummy.svg',desc:'Smooth card-meld room with fan join entry and room-code foundation.',type:'cards strategy multiplayer',difficulty:'Medium',players:'1-4 Fan'},
  {id:'dominoes',title:'Dominoes',pill:'Street Table',tags:['Strategy','Fan Mode','Classic'],href:'./games/dominoes/',bg:'./assets/preview_dominoes.svg',desc:'Black-and-gold domino table with fan challenge mode.',type:'strategy multiplayer',difficulty:'Medium',players:'2-4 Fan'},
  {id:'heist',title:'Vault Heist',pill:'Surprise Room',tags:['Action','Vault','Fan Mode'],href:'./games/vault-heist/',bg:'./assets/preview_heist.svg',desc:'Cinematic vault runner concept for fan races, rewards, and unlock missions.',type:'strategy multiplayer',difficulty:'Hard',players:'Fan Ready'},
  {id:'rewards',title:'Rewards',pill:'Vault Perks',tags:['Rewards','Member','Claim'],href:'./rewards/',bg:'./assets/preview_rewards.svg',desc:'Rewards wallet, prize codes, and claim path for the vault ecosystem.',type:'multiplayer',difficulty:'Member',players:'All'}
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

function makeRoomCode(game){
  const prefix = String(game.id || game.title || 'P3D').replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase() || 'P3D';
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return prefix + '-' + rand;
}

function fanHref(game){
  if(game.id === 'rewards') return game.href;
  const joiner = game.href.includes('?') ? '&' : '?';
  return game.href + joiner + 'mode=fan&room=' + encodeURIComponent(makeRoomCode(game));
}

function setBg(src){
  if(!bgA || !bgB || !src) return;

  const active = activeBg === 'a' ? bgA : bgB;
  const next = activeBg === 'a' ? bgB : bgA;

  next.style.backgroundImage = `linear-gradient(180deg,rgba(0,0,0,.28),rgba(0,0,0,.78)),url("${src}")`;
  next.classList.add('bg-active');
  active.classList.remove('bg-active');

  activeBg = activeBg === 'a' ? 'b' : 'a';
}

function card(game){
  const fan = fanHref(game);
  const secondLabel = game.id === 'rewards' ? 'Open' : 'Fan Join';

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
          <a class="cta gold" href="${game.href}" data-play="${game.id}">Play</a>
          <a class="cta ghost" href="${fan}" data-play="${game.id}" data-fan="${game.id !== 'rewards' ? 'true' : 'false'}">${secondLabel}</a>
        </div>
      </div>
    </article>
  `;
}

function render(){
  if(!row) return;

  const q = (search && search.value ? search.value : '').toLowerCase().trim();

  const list = games.filter(g=>{
    const text = (g.title + ' ' + g.tags.join(' ') + ' ' + g.desc + ' ' + g.players + ' ' + g.type).toLowerCase();
    const matchQ = !q || text.includes(q);
    const matchF = currentFilter === 'all' || g.type.includes(currentFilter) || g.tags.join(' ').toLowerCase().includes(currentFilter);
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
      if(!g) return;

      const save = {
        ...g,
        href: a.getAttribute('href'),
        lastAction: a.dataset.fan === 'true' ? 'Fan Join' : 'Play'
      };

      localStorage.setItem('PLAY3D_LAST_GAME', JSON.stringify(save));
    });
  });
}

function setFeatured(g){
  if(!g) return;

  if(featuredName) featuredName.textContent = g.title;
  if(featuredLabel) featuredLabel.textContent = g.pill;

  setBg(g.bg);
}

if(filters){
  filters.addEventListener('click', e=>{
    const btn = e.target.closest('[data-filter]');
    if(!btn) return;

    document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');

    currentFilter = btn.dataset.filter;
    render();
  });
}

if(search){
  search.addEventListener('input', render);
}

const scrollLeft = document.getElementById('scrollLeft');
const scrollRight = document.getElementById('scrollRight');

if(scrollLeft){
  scrollLeft.onclick = ()=>row && row.scrollBy({left:-430,behavior:'smooth'});
}

if(scrollRight){
  scrollRight.onclick = ()=>row && row.scrollBy({left:430,behavior:'smooth'});
}

function loadLast(){
  try{
    const g = JSON.parse(localStorage.getItem('PLAY3D_LAST_GAME') || 'null');
    if(!g) return;

    if(lastPlayedTitle) lastPlayedTitle.textContent = g.title;
    if(lastPlayedCopy) lastPlayedCopy.textContent = 'Jump back into ' + g.title + (g.lastAction ? ' — ' + g.lastAction : '') + '.';
    if(continueBtn) continueBtn.href = g.href;
  }catch(e){}
}

loadLast();
render();

window.PLAY3D_GAME_VAULT = {
  games,
  render,
  fanHref,
  setFeatured
};
})();
