(function(){
  const PASS_KEY = 'play3d_vault_pass_v1';
  const tierRank = { entry:1, gold:2, elite:3, drop:3, merch:3, master:4 };

  const exhibits = {
    entry: [
      {
        title:'First Door Archive',
        type:'Visual',
        mark:'ENTRY',
        text:'A placeholder exhibit for the opening vault door, early visuals, and first-room access moments.'
      },
      {
        title:'Capo Audio Lane',
        type:'Audio',
        mark:'3D',
        text:'A future slot for private audio previews, drops, voice notes, or coded listening sessions.'
      },
      {
        title:'Starter Relic',
        type:'Artifact',
        mark:'VAULT',
        text:'An entry-tier archive card for early supporters and first scans from in-person NFC sales.'
      }
    ],
    gold: [
      {
        title:'Gold Chamber Cover',
        type:'Music',
        mark:'GOLD',
        text:'A premium placeholder for album chambers, coded covers, and private rollout material.'
      },
      {
        title:'Hidden Interface Study',
        type:'Interface',
        mark:'UI',
        text:'A gold-tier exhibit for future vault interface moments, access panels, and member-only screens.'
      },
      {
        title:'Drop Route Map',
        type:'Route',
        mark:'MAP',
        text:'A cinematic placeholder for future drop routes, merch windows, and private code paths.'
      }
    ],
    elite: [
      {
        title:'Elite Merch Vault',
        type:'Merch',
        mark:'ELITE',
        text:'A top-tier exhibit for exclusive merch previews, premium bundles, and claimable collector pieces.'
      },
      {
        title:'Private Film Wall',
        type:'Video',
        mark:'FILM',
        text:'A future gallery slot for unreleased visuals, behind-the-scenes clips, and premium vault cinema.'
      },
      {
        title:'Holder Relic',
        type:'Artifact',
        mark:'RARE',
        text:'A placeholder for high-value holder perks, archive drops, and luxury museum moments.'
      }
    ]
  };

  function readPass(){
    try{
      const raw = localStorage.getItem(PASS_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      return null;
    }
  }

  function currentTier(){
    const pass = readPass();
    if(!pass || !pass.expires_at) return 'entry';

    const expires = new Date(pass.expires_at).getTime();
    if(!Number.isFinite(expires) || expires <= Date.now()) return 'entry';

    return String(pass.tier || 'entry').toLowerCase();
  }

  function canOpen(room, tier){
    if(room === 'entry') return true;
    return (tierRank[tier] || 1) >= (tierRank[room] || 1);
  }

  function coverClass(room){
    if(room === 'gold') return 'cover gold';
    if(room === 'elite') return 'cover elite';
    return 'cover';
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

    grid.innerHTML = exhibits[room].map((item, index) => `
      <article class="exhibit-card">
        <div class="${coverClass(room)}">${item.mark}</div>
        <div class="exhibit-body">
          <div class="exhibit-type">${item.type}</div>
          <div class="exhibit-title">${item.title}</div>
          <button class="enter-btn" type="button" data-room="${room}" data-index="${index}" ${open ? '' : 'disabled'}>${open ? 'Enter' : 'Locked'}</button>
        </div>
      </article>
    `).join('');
  }

  function setPassState(tier){
    const state = document.getElementById('museumPassState');
    if(state) state.textContent = `${String(tier || 'entry').toUpperCase()} ACCESS`;
  }

  function openModal(room, index){
    const item = exhibits[room] && exhibits[room][index];
    if(!item) return;

    const modal = document.getElementById('exhibitModal');
    const art = document.getElementById('modalArt');
    const type = document.getElementById('modalType');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');

    if(art){
      art.className = 'modal-art';
      art.style.background = room === 'elite'
        ? 'radial-gradient(circle at 50% 32%,rgba(255,255,255,.24),transparent 32%),linear-gradient(145deg,#1b1b1b,#050403)'
        : room === 'gold'
          ? 'radial-gradient(circle at 50% 32%,rgba(242,210,123,.36),transparent 32%),linear-gradient(145deg,#3b2a10,#050403)'
          : 'radial-gradient(circle at 50% 32%,rgba(242,210,123,.3),transparent 32%),linear-gradient(145deg,#2b200f,#050403)';
    }

    if(type) type.textContent = item.type;
    if(title) title.textContent = item.title;
    if(text) text.textContent = item.text;
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

    document.body.addEventListener('click', event => {
      const button = event.target.closest('.enter-btn');
      if(!button || button.disabled) return;
      openModal(button.dataset.room, Number(button.dataset.index));
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
