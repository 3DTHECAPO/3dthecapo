
(function(){
  const GAMES = [
    {title:'Vault Slots', folder:'./slot-machine-custom/', icon:'777', type:'casino', filters:['casino','multiplayer'], tags:['Casino','Fan Mode','Bets'], desc:'Premium slot floor with fan challenge routing and stake controls.'},
    {title:'Blackjack', folder:'./blackjack/', icon:'21', type:'casino', filters:['casino','multiplayer'], tags:['Casino','Fan Mode','Bets'], desc:'Beat the dealer without going over 21. Fan table entry stays available.'},
    {title:'Poker', folder:'./poker/', icon:'♠', type:'cards', filters:['cards','multiplayer'], tags:['Cards','Fan Mode','Bets'], desc:'Card room with front page, table flow, and fan join link.'},
    {title:'Spades', folder:'./spades/', icon:'♠♠', type:'cards', filters:['cards','multiplayer'], tags:['Cards','Fan Mode','Team'], desc:'Team trick-taking room with fan/opponent entry visible.'},
    {title:'Dominoes', folder:'./dominoes/', icon:'▦', type:'strategy', filters:['strategy','multiplayer'], tags:['Strategy','Fan Mode','Table'], desc:'Domino table room with fan/pass-and-play entry visible.'},
    {title:'Vault Chess', folder:'./chess/', icon:'♛', type:'strategy', filters:['strategy','multiplayer'], tags:['Strategy','Fan Mode','2 Player'], desc:'Chess board room with two-player fan challenge entry.'},
    {title:'Rummy', folder:'./rummy/', icon:'R', type:'cards', filters:['cards','multiplayer'], tags:['Cards','Fan Mode'], desc:'Rummy card room with its own front card instead of a blank slot.'},
    {title:'Pinochle', folder:'./pinochle/', icon:'P', type:'cards', filters:['cards','multiplayer'], tags:['Cards','Fan Mode'], desc:'Pinochle room restored to the lineup with front cover.'},
    {title:'Vault Heist', folder:'./vault-heist/', icon:'$', type:'arcade', filters:['strategy','multiplayer'], tags:['Arcade','Fan Mode'], desc:'Challenge room for fan races and vault runs.'}
  ];

  const $ = (sel, parent=document)=>parent.querySelector(sel);
  const $$ = (sel, parent=document)=>Array.from(parent.querySelectorAll(sel));

  let activeFilter = 'all';

  function tagHtml(tags){
    return tags.map(t=>`<span class="tag ${/fan/i.test(t) ? 'fan' : ''}">${t}</span>`).join('');
  }

  function roomUrl(game){
    const room = makeRoomCode(game.title);
    const cleanFolder = game.folder.replace(/\/?$/,'/');
    return `${cleanFolder}?mode=fan&room=${encodeURIComponent(room)}`;
  }

  function makeRoomCode(title){
    const short = title.replace(/[^A-Za-z0-9]/g,'').slice(0,4).toUpperCase() || 'P3D';
    const rand = Math.random().toString(36).slice(2,6).toUpperCase();
    return `${short}-${rand}`;
  }

  function saveLast(title, folder){
    localStorage.setItem('play3d:lastGame', JSON.stringify({title, folder, at:Date.now()}));
    loadLast();
  }

  function card(game){
    const filters = game.filters.join(' ');
    const fanHref = roomUrl(game);
    return `
      <article class="game-card" data-title="${game.title.toLowerCase()}" data-type="${game.type}" data-filter="${filters}" data-tags="${game.tags.join(' ').toLowerCase()}">
        <span class="fan-pill">Fan Join</span>
        <div class="game-front ${game.type}" data-icon="${game.icon}" aria-hidden="true"></div>
        <div class="card-body">
          <div class="tags">${tagHtml(game.tags)}</div>
          <h3>${game.title}</h3>
          <p>${game.desc}</p>
          <div class="play-row">
            <a class="cta gold launch-game" href="${game.folder}" data-title="${game.title}" data-folder="${game.folder}">Play</a>
            <a class="cta red launch-game" href="${fanHref}" data-title="${game.title} Fan Room" data-folder="${fanHref}">Fan Join</a>
          </div>
        </div>
      </article>`;
  }

  function renderCards(){
    const row = $('#gameRow');
    if(!row) return;
    row.classList.remove('empty');
    row.innerHTML = GAMES.map(card).join('');
    applyFilters();
  }

  function applyFilters(){
    const q = ($('#gameSearch')?.value || '').trim().toLowerCase();
    $$('.game-card').forEach(el=>{
      const matchSearch = !q || el.dataset.title.includes(q) || el.dataset.tags.includes(q);
      const matchFilter = activeFilter === 'all'
        || el.dataset.type === activeFilter
        || el.dataset.filter.split(' ').includes(activeFilter);
      el.classList.toggle('hidden', !(matchSearch && matchFilter));
    });
  }

  function bind(){
    $('#gameSearch')?.addEventListener('input', applyFilters);

    $('#filters')?.addEventListener('click', e=>{
      const btn = e.target.closest('.filter');
      if(!btn) return;
      $$('.filter', $('#filters')).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      applyFilters();
    });

    $('#scrollLeft')?.addEventListener('click', ()=>$('#gameRow')?.scrollBy({left:-360,behavior:'smooth'}));
    $('#scrollRight')?.addEventListener('click', ()=>$('#gameRow')?.scrollBy({left:360,behavior:'smooth'}));

    document.addEventListener('click', e=>{
      const a = e.target.closest('.launch-game');
      if(!a) return;
      saveLast(a.dataset.title || a.textContent.trim(), a.dataset.folder || a.href);
    });

    document.addEventListener('mouseover', e=>{
      const c = e.target.closest('.game-card');
      const name = c?.querySelector('h3')?.textContent;
      const featured = $('#featuredName');
      if(name && featured) featured.textContent = name;
    });
  }

  function loadLast(){
    const titleEl = $('#lastPlayedTitle');
    const copyEl = $('#lastPlayedCopy');
    const btn = $('#continueBtn');
    if(!titleEl || !copyEl || !btn) return;

    let last = null;
    try{ last = JSON.parse(localStorage.getItem('play3d:lastGame') || 'null'); }catch(e){}
    if(!last){
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '.55';
      return;
    }
    titleEl.textContent = last.title || 'Recent Game';
    copyEl.textContent = 'Jump back into ' + (last.title || 'your last game') + '.';
    btn.href = last.folder || '#';
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
  }

  function boot(){
    const row = $('#gameRow');
    if(row) row.classList.add('empty');
    renderCards();
    bind();
    loadLast();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
