(function(){
  const PASS_KEY = 'play3d_vault_pass_v1';
  const tierRank = { entry:1, gold:2, elite:3, drop:3, merch:3, master:4 };

  // Museum content admin data. Drop real images into:
  // nfc/museum/assets/exhibits/
  // Then set image:'./assets/exhibits/your-file.jpg'
  const museumExhibits = [
    {
      title:'The Resume Room',
      image:'',
      description:'Entry exhibit for official project artwork, cover visuals, and early-release vault displays.',
      type:'cover art',
      year:'2026',
      tag:'COVER',
      unlockTier:'entry',
      section:'gallery'
    },
    {
      title:'First Listen Vault',
      image:'',
      description:'Entry exhibit for private snippets, preview audio, and locked-in music moments.',
      type:'audio',
      year:'2026',
      tag:'AUDIO',
      unlockTier:'entry',
      section:'gallery'
    },
    {
      title:'Capo Milestone Wall',
      image:'',
      description:'Entry exhibit for release markers, campaign wins, and official 3D THE CAPO milestones.',
      type:'milestone',
      year:'2026',
      tag:'MILESTONE',
      unlockTier:'entry',
      section:'trophy'
    },
    {
      title:'Gold Cover Room',
      image:'',
      description:'Gold exhibit for alternate cover art, premium rollout visuals, and private project artwork.',
      type:'cover art',
      year:'2026',
      tag:'GOLD',
      unlockTier:'gold',
      section:'gallery'
    },
    {
      title:'Behind The Session',
      image:'',
      description:'Gold exhibit for studio photos, behind-the-scenes moments, and recording-room archive pieces.',
      type:'photo',
      year:'2026',
      tag:'STUDIO',
      unlockTier:'gold',
      section:'gallery'
    },
    {
      title:'Rollout Timeline',
      image:'',
      description:'Gold exhibit for project dates, release history, campaign steps, and rollout moments.',
      type:'timeline',
      year:'2026',
      tag:'TIMELINE',
      unlockTier:'gold',
      section:'timeline'
    },
    {
      title:'Elite Merch Vault',
      image:'',
      description:'Elite exhibit for private merch previews, apparel drops, bundles, and product concepts.',
      type:'merch',
      year:'2026',
      tag:'MERCH',
      unlockTier:'elite',
      section:'gallery'
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
      title:'Capo Collector Case',
      image:'',
      description:'Elite exhibit for rare collectibles, founder pieces, high-tier vault items, and exclusive archive drops.',
      type:'collector archive',
      year:'2026',
      tag:'FOUNDER',
      unlockTier:'elite',
      section:'trophy'
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

  function cardMarkup(item, index, open, room, className='exhibit-card'){
    const locked = !open;
    return `
      <article class="${className}${locked ? ' is-locked' : ''}">
        <button class="image-frame" type="button" data-exhibit-index="${index}" ${locked ? 'disabled' : ''} ${frameStyle(item, room)}>
          <span class="frame-tag">${locked ? 'LOCKED' : item.tag || item.type || '3D'}</span>
          <span class="frame-type">${item.type || 'Exhibit'}</span>
        </button>
        <div class="exhibit-body">
          <div class="exhibit-type">${item.year || ''} ${item.type || ''}</div>
          <div class="exhibit-title">${item.title}</div>
          <button class="enter-btn" type="button" data-exhibit-index="${index}" ${locked ? 'disabled' : ''}>${locked ? 'Locked' : 'Expand'}</button>
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
    const items = museumExhibits.filter(item => ['cover art','photo','poster','merch','award','rare collectible','audio','milestone','timeline','collector archive'].includes(String(item.type).toLowerCase()));
    grid.innerHTML = items.map(item => cardMarkup(item, museumExhibits.indexOf(item), canOpenTier(item.unlockTier,tier), item.unlockTier, 'museum-frame-card')).join('');
  }

  function renderVideoWall(tier){
    const wall = document.getElementById('videoWall');
    if(!wall) return;
    const videos = museumExhibits.filter(item => item.section === 'video' || item.type === 'video');
    wall.innerHTML = videos.map(item => {
      const open = canOpenTier(item.unlockTier,tier);
      const idx = museumExhibits.indexOf(item);
      const embed = item.video && open ? `<iframe src="${item.video}" title="${item.title}" loading="lazy" allowfullscreen></iframe>` : `<button class="video-placeholder" data-exhibit-index="${idx}" ${open ? '' : 'disabled'}>${open ? 'Open Video Exhibit' : 'Locked Video Exhibit'}</button>`;
      return `<article class="video-card ${open ? '' : 'is-locked'}">${embed}<h4>${item.title}</h4><p>${item.description}</p></article>`;
    }).join('') || '<div class="empty-museum-slot">Awaiting video uploads. Add YouTube, MP4, trailers, interviews, or music videos in script.js.</div>';
  }

  function renderTrophyShelf(tier){
    const shelf = document.getElementById('trophyShelf');
    if(!shelf) return;
    const items = museumExhibits.filter(item => item.section === 'trophy' || /award|collectible|collector|plaque|record|milestone|founder/i.test(item.type));
    shelf.innerHTML = items.map(item => {
      const open = canOpenTier(item.unlockTier,tier);
      return `<button class="trophy-plaque ${open ? '' : 'is-locked'}" data-exhibit-index="${museumExhibits.indexOf(item)}" ${open ? '' : 'disabled'}><span>${item.tag}</span><b>${item.title}</b><small>${open ? item.year : 'LOCKED'}</small></button>`;
    }).join('');
  }

  function renderHistoryWall(tier){
    const wall = document.getElementById('historyWall');
    if(!wall) return;
    const items = museumExhibits.filter(item => item.section === 'timeline' || /album|single|milestone|music|cover/i.test(item.type));
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
    if(type) type.textContent = item.type || 'Exhibit';
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
