(function(){
  const PASS_KEY = 'play3d_vault_pass_v1';
  const tierRank = { entry:1, gold:2, elite:3, drop:3, merch:3, master:4 };

  // Museum content admin data. Drop real images into:
  // nfc/museum/assets/exhibits/
  // Then set image:'./assets/exhibits/your-file.jpg'
  const museumExhibits = [
    {
      title:'Day One Photo Slot',
      image:'',
      description:'Placeholder for the first official vault photo, launch-night image, or early supporter memory.',
      type:'photo chapter',
      year:'2026',
      tag:'DAY 1',
      unlockTier:'entry',
      section:'gallery'
    },
    {
      title:'Behind The Scenes Slot',
      image:'',
      description:'Placeholder for studio, rehearsal, filming, or street campaign photos.',
      type:'photo chapter',
      year:'2026',
      tag:'BTS',
      unlockTier:'entry',
      section:'gallery'
    },
    {
      title:'Release Memory Slot',
      image:'',
      description:'Placeholder for cover art, release-night screenshots, listening party photos, or drop-day moments.',
      type:'photo chapter',
      year:'2026',
      tag:'DROP',
      unlockTier:'entry',
      section:'gallery'
    },
    {
      title:'Fan Moment Slot',
      image:'',
      description:'Placeholder for a fan photo, tagged moment, repost, or community highlight.',
      type:'photo chapter',
      year:'2026',
      tag:'FAN',
      unlockTier:'entry',
      section:'gallery'
    },
    {
      title:'Gold Lounge Photo Slot',
      image:'',
      description:'Placeholder for premium listening-room photos, album support moments, or Gold-tier visuals.',
      type:'photo chapter',
      year:'2026',
      tag:'GOLD',
      unlockTier:'gold',
      section:'gallery'
    },
    {
      title:'Studio Session Slot',
      image:'',
      description:'Placeholder for studio photos, behind-the-scenes visuals, and session moments.',
      type:'photo chapter',
      year:'2026',
      tag:'STUDIO',
      unlockTier:'gold',
      section:'gallery'
    },
    {
      title:'Visual Shoot Slot',
      image:'',
      description:'Placeholder for video shoot stills, trailer frames, interviews, or rollout visuals.',
      type:'photo chapter',
      year:'2026',
      tag:'VISUAL',
      unlockTier:'gold',
      section:'gallery'
    },
    {
      title:'Elite Drop Photo Slot',
      image:'',
      description:'Placeholder for VIP merch previews, private drops, and Elite-only photo moments.',
      type:'photo chapter',
      year:'2026',
      tag:'ELITE',
      unlockTier:'elite',
      section:'gallery'
    },
    {
      title:'Hidden Room Memory Slot',
      image:'',
      description:'Placeholder for secret-room clues, hidden drops, private reveals, or vault-only memories.',
      type:'photo chapter',
      year:'2026',
      tag:'SECRET',
      unlockTier:'elite',
      section:'gallery'
    },
    {
      title:'Project Timeline Slot',
      image:'',
      description:'Reserved for future dates, room launches, drops, and important PLAY 3D history.',
      type:'timeline',
      year:'2026',
      tag:'TIMELINE',
      unlockTier:'entry',
      section:'timeline'
    },
    {
      title:'Vault Expansion Slot',
      image:'',
      description:'Reserved for future museum chapters, new rooms, special events, and archive updates.',
      type:'timeline',
      year:'2026',
      tag:'VAULT',
      unlockTier:'gold',
      section:'timeline'
    },
    {
      title:'Unreleased Video Archive',
      image:'',
      description:'Awaiting video upload. Reserved for future music videos, trailers, interviews, and vault footage.',
      type:'video',
      year:'2026',
      tag:'VIDEO',
      unlockTier:'elite',
      section:'video',
      video:''
    },
    {
      title:'Future Fan Showcase',
      image:'',
      description:'Awaiting fan submissions. Future fan art, tagged photos, and community highlights will appear here.',
      type:'fan showcase',
      year:'2026',
      tag:'FAN',
      unlockTier:'entry',
      section:'fan'
    }
  ];

  window.PLAY3DMuseumContent = museumExhibits;

  function readPass(){
    try{
      const raw = localStorage.getItem(PASS_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }

  function currentTier(){
    const pass = readPass();
    if(!pass || !pass.expires_at) return 'entry';
    const expires = new Date(pass.expires_at).getTime();
    if(!Number.isFinite(expires) || expires <= Date.now()) return 'entry';
    return String(pass.tier || 'entry').toLowerCase();
  }

  function canOpenTier(unlockTier, tier){
    return (tierRank[tier] || 1) >= (tierRank[unlockTier || 'entry'] || 1);
  }

  function canOpen(room, tier){
    if(room === 'entry') return true;
    return canOpenTier(room, tier);
  }

  function roomItems(room){
    return museumExhibits.filter(item => (item.unlockTier || 'entry') === room && item.section !== 'fan' && item.section !== 'video');
  }

  function coverClass(room){
    if(room === 'gold') return 'cover gold';
    if(room === 'elite') return 'cover elite';
    return 'cover';
  }

  function frameStyle(item, room){
    if(item.image){
      return `style="background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.58)),url('${item.image}')"`;
    }
    const tone = room === 'elite' ? '#1b1b1b' : room === 'gold' ? '#3b2a10' : '#241a0d';
    return `style="background-image:radial-gradient(circle at 50% 32%,rgba(242,210,123,.28),transparent 32%),linear-gradient(145deg,${tone},#050403)"`;
  }

  function exhibitKind(item){
    const section = String(item.section || '').toLowerCase();
    const type = String(item.type || '').toLowerCase();
    if(section === 'timeline' || type === 'timeline') return 'Timeline';
    if(section === 'fan' || type.indexOf('fan') !== -1) return 'Fan Moment';
    if(section === 'video' || type === 'video') return 'Video';
    if(type.indexOf('photo') !== -1) return 'Memory';
    return 'Exhibit';
  }

  function exhibitMetaLabel(item){
    const year = item.year || 'Vault';
    const kind = exhibitKind(item);
    if(kind === 'Memory') return `${year} Vault Memory`;
    return `${year} ${kind}`;
  }

  function exhibitButtonLabel(item){
    const kind = exhibitKind(item);
    if(kind === 'Timeline') return 'View Timeline';
    if(kind === 'Fan Moment') return 'View Fan Moment';
    if(kind === 'Video') return 'View Video';
    if(kind === 'Memory') return 'View Memory';
    return 'View Exhibit';
  }

  function cardMarkup(item, index, open, room, className='exhibit-card'){
    const locked = !open;
    return `
      <article class="${className}${locked ? ' is-locked' : ''}">
        <button class="image-frame" type="button" data-exhibit-index="${index}" ${locked ? 'disabled' : ''} ${frameStyle(item, room)}>
          <span class="frame-tag">${locked ? 'LOCKED' : item.tag || exhibitKind(item)}</span>
          <span class="frame-type">${exhibitKind(item)}</span>
        </button>
        <div class="exhibit-body">
          <div class="exhibit-type">${exhibitMetaLabel(item)}</div>
          <div class="exhibit-title">${item.title}</div>
          <button class="enter-btn" type="button" data-exhibit-index="${index}" ${locked ? 'disabled' : ''}>${locked ? 'Locked' : exhibitButtonLabel(item)}</button>
        </div>
      </article>
    `;
  }

  function renderRoom(room, tier){
    const section = document.querySelector(`[data-room="${room}"]`);
    const grid = document.getElementById(`${room}Grid`);
    const open = canOpen(room, tier);
    if(section){
      section.classList.toggle('locked', !open);
      const status = section.querySelector('.room-status');
      if(status) status.textContent = open ? 'Open' : 'Locked';
    }
    if(!grid) return;
    grid.innerHTML = roomItems(room).map(item => cardMarkup(item, museumExhibits.indexOf(item), open, room)).join('');
  }

  function setPassState(tier){
    const state = document.getElementById('museumPassState');
    if(state) state.textContent = `${String(tier || 'entry').toUpperCase()} ACCESS`;
  }

  function renderImageWall(tier){
    const grid = document.getElementById('imageWallGrid');
    if(!grid) return;
    const items = museumExhibits.filter(item => ['photo chapter','cover art','photo','poster','merch','timeline','fan showcase'].includes(String(item.type).toLowerCase()));
    grid.innerHTML = items.map(item => cardMarkup(item, museumExhibits.indexOf(item), canOpenTier(item.unlockTier,tier), item.unlockTier, 'museum-frame-card')).join('');
  }

  function renderVideoWall(tier){
    const wall = document.getElementById('videoWall');
    if(!wall) return;
    const videos = museumExhibits.filter(item => item.section === 'video' || item.type === 'video');
    wall.innerHTML = videos.map(item => {
      const open = canOpenTier(item.unlockTier,tier);
      const idx = museumExhibits.indexOf(item);
      const embed = item.video && open ? `<iframe src="${item.video}" title="${item.title}" loading="lazy" allowfullscreen></iframe>` : `<button class="video-placeholder" data-exhibit-index="${idx}" ${open ? '' : 'disabled'}>${open ? 'View Video' : 'Locked Video'}</button>`;
      return `<article class="video-card ${open ? '' : 'is-locked'}">${embed}<h4>${item.title}</h4><p>${item.description}</p></article>`;
    }).join('') || '<div class="empty-museum-slot">Awaiting video uploads. Add YouTube, MP4, trailers, interviews, or music videos in script.js.</div>';
  }

  function renderTrophyShelf(tier){
    const shelf = document.getElementById('trophyShelf');
    if(!shelf) return;
    const cases = [
      { tag:'CASE 01', title:'First Award Case' },
      { tag:'CASE 02', title:'Milestone Plaque Case' },
      { tag:'CASE 03', title:'Win Certificate Case' },
      { tag:'CASE 04', title:'Achievement Display Case' }
    ];
    shelf.innerHTML = cases.map(item => {
      return `<div class="trophy-plaque trophy-empty is-locked"><span>${item.tag}</span><b>${item.title}</b><small>Coming Soon</small></div>`;
    }).join('');
  }

  function renderHistoryWall(tier){
    const wall = document.getElementById('historyWall');
    if(!wall) return;
    const items = museumExhibits.filter(item => item.section === 'timeline');
    wall.innerHTML = items.map(item => {
      const open = canOpenTier(item.unlockTier,tier);
      return `<button class="history-item ${open ? '' : 'is-locked'}" data-exhibit-index="${museumExhibits.indexOf(item)}" ${open ? '' : 'disabled'}><span>${item.year || 'TBA'}</span><b>${item.title}</b><small>${open ? item.description : 'Unlock required'}</small></button>`;
    }).join('');
  }

  function renderFanGrid(tier){
    const grid = document.getElementById('fanGrid');
    if(!grid) return;
    const items = museumExhibits.filter(item => item.section === 'fan');
    grid.innerHTML = items.map(item => cardMarkup(item, museumExhibits.indexOf(item), canOpenTier(item.unlockTier,tier), item.unlockTier, 'museum-frame-card')).join('');
  }

  function openModalByIndex(index){
    const item = museumExhibits[index];
    if(!item) return;
    const modal = document.getElementById('exhibitModal');
    const art = document.getElementById('modalArt');
    const type = document.getElementById('modalType');
    const title = document.getElementById('modalTitle');
    const meta = document.getElementById('modalMeta');
    const text = document.getElementById('modalText');
    const video = document.getElementById('modalVideo');
    const unlock = document.getElementById('modalUnlock');

    if(art){
      art.className = 'modal-art';
      art.setAttribute('style', item.image ? `background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.58)),url('${item.image}')` : frameStyle(item, item.unlockTier).replace(/^style="|"$/g,''));
      art.textContent = item.image ? '' : (item.tag || '3D');
    }
    if(type) type.textContent = exhibitKind(item);
    if(title) title.textContent = item.title;
    if(meta) meta.textContent = [item.year, item.tag, String(item.unlockTier || 'entry').toUpperCase()].filter(Boolean).join(' / ');
    if(text) text.textContent = item.description || '';
    if(video){
      video.classList.toggle('hidden', !item.video);
      video.innerHTML = item.video ? `<iframe src="${item.video}" title="${item.title}" loading="lazy" allowfullscreen></iframe>` : '';
    }
    if(unlock) unlock.textContent = `${String(item.unlockTier || 'entry').toUpperCase()} EXHIBIT`;
    if(modal) modal.classList.remove('hidden');
  }

  function closeModal(){
    const modal = document.getElementById('exhibitModal');
    if(modal) modal.classList.add('hidden');
  }

  function init(){
    const tier = currentTier();
    setPassState(tier);
    renderRoom('entry', tier);
    renderRoom('gold', tier);
    renderRoom('elite', tier);
    renderImageWall(tier);
    renderVideoWall(tier);
    renderTrophyShelf(tier);
    renderHistoryWall(tier);
    renderFanGrid(tier);

    document.body.addEventListener('click', event => {
      const trigger = event.target.closest('[data-exhibit-index]');
      if(!trigger || trigger.disabled) return;
      openModalByIndex(Number(trigger.dataset.exhibitIndex));
    });

    const close = document.getElementById('modalClose');
    if(close) close.addEventListener('click', closeModal);

    const modal = document.getElementById('exhibitModal');
    if(modal){
      modal.addEventListener('click', event => {
        if(event.target === modal) closeModal();
      });
    }

    document.addEventListener('keydown', event => {
      if(event.key === 'Escape') closeModal();
    });
  }

  init();
})();