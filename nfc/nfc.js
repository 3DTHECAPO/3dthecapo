(function(){
  'use strict';

  const STORAGE_KEY = 'play3d_saved_vault_access_v1';

  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);

  const hasNfc = params.get('nfc') === '1';
  const explicitUnlock = (params.get('unlock') || '').toLowerCase();
  const code = (params.get('code') || '').toUpperCase().trim();

  const statusPill = byId('statusPill');
  const vaultState = byId('vaultState');
  const lockedActions = byId('lockedActions');
  const lockedRoom = byId('lockedRoom');
  const year = byId('year');
  const publicNav = byId('publicNav');
  const privateNav = byId('privateNav');
  const connect = byId('connect');
  const connectDivider = byId('connectDivider');
  const sessionLane = byId('sessionLane');
  const sessionDivider = byId('sessionDivider');
  const sequence = byId('vaultSequence');
  const accessOverlay = byId('accessOverlay');
  const accessGraphic = document.querySelector('.access-graphic');

  if(year) year.textContent = new Date().getFullYear();

  if(accessGraphic){
    accessGraphic.addEventListener('load', () => accessOverlay && accessOverlay.classList.add('image-loaded'));
    if(accessGraphic.complete && accessOverlay) accessOverlay.classList.add('image-loaded');
  }

  const codeMap = {
    ENTRY001:{
      tier:'entry',
      title:'Entry Room',
      copy:'The opening lane for coded audio access, artist-world visuals, and the first private room.',
      chips:['music lane','private visual','coded access']
    },
    GOLD001:{
      tier:'gold',
      title:'Gold Room',
      copy:'Private music, coded visual access, and hidden route-ins for stronger vault value.',
      chips:['private music','hidden merch','private visual','coded reward']
    },
    ELITE001:{
      tier:'elite',
      title:'Elite Room',
      copy:'The premium room for music, visuals, merch placeholders, hidden bundles, and future holder perks.',
      chips:['all-access','premium merch','hidden bundle','future perk']
    },
    DROP777:{
      tier:'gold',
      title:'Special Drop Room',
      copy:'This one-off drop code opens a limited campaign package with coded music, hidden merch, and private visual access.',
      chips:['special drop','limited merch','private visual']
    },
    MERCH999:{
      tier:'elite',
      title:'Merch Room',
      copy:'This code is tuned for hidden merch access, bundle offers, early windows, and premium product drops.',
      chips:['merch-only','bundle offer','early access']
    }
  };

  function saveAccess(pkg){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tier: pkg.tier,
        title: pkg.title,
        copy: pkg.copy,
        chips: Array.isArray(pkg.chips) ? pkg.chips : [],
        code: pkg.code || '',
        source: pkg.source || 'vault'
      }));
    }catch(e){}
  }

  function loadAccess(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return null;
  }

  function fillChips(targetId, items){
    const target = byId(targetId);
    if(!target) return;
    target.innerHTML = '';
    items.forEach(item => {
      const span = document.createElement('span');
      span.className = 'chip';
      span.textContent = item;
      target.appendChild(span);
    });
  }

  document.body.classList.add('locked');

  function showLocked(){
    if(statusPill) statusPill.textContent = 'Locked';
    if(vaultState) vaultState.textContent = 'Access code required';
    if(lockedActions) lockedActions.classList.remove('hidden');
    if(lockedRoom) lockedRoom.classList.remove('hidden');
    if(publicNav) publicNav.classList.remove('hidden');
    if(privateNav) privateNav.classList.add('hidden');
    if(connect) connect.classList.add('hidden');
    if(connectDivider) connectDivider.classList.add('hidden');
    if(sessionLane) sessionLane.classList.add('hidden');
    if(sessionDivider) sessionDivider.classList.add('hidden');
    ['room-entry','room-gold','room-elite'].forEach(id => {
      const el = byId(id);
      if(el) el.classList.add('hidden');
    });
  }

  function runSequence(){
    if(!sequence || !accessOverlay) return;
    sequence.classList.remove('fadeout');
    accessOverlay.classList.remove('show');
    sequence.classList.add('active');
    void sequence.offsetWidth;
    sequence.classList.add('play');
    setTimeout(() => {
      accessOverlay.classList.add('show');
    }, 3050);
    setTimeout(() => {
      sequence.classList.add('fadeout');
    }, 4500);
    setTimeout(() => {
      sequence.classList.remove('active','play','fadeout');
      accessOverlay.classList.remove('show');
    }, 5300);
  }

  function inferTierFromCode(rawCode){
    const c = (rawCode || '').toUpperCase();
    if(!c) return null;
    if(c.startsWith('ELITE') || c.startsWith('MERCH') || c.startsWith('PREM') || c.includes('ELITE') || c.includes('VIP') || c.includes('ALL')) return 'elite';
    if(c.startsWith('GOLD') || c.startsWith('DROP') || c.startsWith('ROLL') || c.startsWith('MUSIC') || c.includes('GOLD')) return 'gold';
    if(c.startsWith('ENTRY') || c.startsWith('LOCK') || c.startsWith('CAPO') || c.startsWith('VAULT') || c.startsWith('FAN') || c.startsWith('CHIP')) return 'entry';
    return 'entry';
  }

  function inferRewardLabel(rawCode){
    const c = (rawCode || '').toUpperCase();
    if(c.startsWith('CHIP')) return 'bonus chips';
    if(c.startsWith('ROLL')) return 'high roller chips';
    if(c.startsWith('DROP')) return 'merch drop';
    if(c.startsWith('VAULT')) return 'vault unlock';
    if(c.startsWith('FAN')) return 'fan reward';
    if(c.startsWith('PREM')) return 'premium merch';
    if(c.startsWith('GOLD')) return 'gold unlock';
    if(c.startsWith('ELITE')) return 'elite unlock';
    if(c.startsWith('ENTRY')) return 'entry unlock';
    return 'coded unlock';
  }

  function buildDynamicPackage(rawCode){
    const tier = inferTierFromCode(rawCode);
    const normalized = (rawCode || '').toUpperCase();
    const title = tier === 'elite' ? 'Elite Room' : tier === 'gold' ? 'Gold Room' : 'Entry Room';
    const rewardLabel = inferRewardLabel(normalized);
    const chips = tier === 'elite'
      ? ['all-access','premium merch','exclusive media',rewardLabel,normalized]
      : tier === 'gold'
      ? ['private music','coded visual','special drop',rewardLabel,normalized]
      : ['vault access','entry lane','coded unlock',rewardLabel,normalized];

    const copy = tier === 'elite'
      ? 'This code opened the elite lane with premium merch moments, hidden media, and higher-level vault rewards.'
      : tier === 'gold'
      ? 'This code opened the gold lane with private music, coded visuals, and stronger vault value.'
      : 'This code opened the entry lane with first-access music, visuals, and private vault access.';

    return {
      tier,
      title,
      copy,
      chips,
      code: normalized,
      source: 'dynamic'
    };
  }

  function showUnlocked(activePackage){
    document.body.classList.remove('locked');

    const activeRoom = byId('room-' + activePackage.tier);
    ['room-entry','room-gold','room-elite'].forEach(id => {
      const el = byId(id);
      if(el) el.classList.add('hidden');
    });
    if(activeRoom) activeRoom.classList.remove('hidden');

    if(lockedRoom) lockedRoom.classList.add('hidden');
    if(lockedActions) lockedActions.classList.add('hidden');
    if(statusPill) statusPill.textContent = activePackage.tier.toUpperCase();
    if(vaultState) vaultState.textContent = activePackage.title;
    if(publicNav) publicNav.classList.add('hidden');
    if(privateNav) privateNav.classList.remove('hidden');
    if(connect) connect.classList.remove('hidden');
    if(connectDivider) connectDivider.classList.remove('hidden');
    if(sessionLane) sessionLane.classList.remove('hidden');
    if(sessionDivider) sessionDivider.classList.remove('hidden');

    if(activePackage.tier === 'entry'){
      if(byId('entryTitle')) byId('entryTitle').textContent = activePackage.title;
      if(byId('entryCopy')) byId('entryCopy').textContent = activePackage.copy;
      fillChips('entryChips', activePackage.chips || []);
    }
    if(activePackage.tier === 'gold'){
      if(byId('goldTitle')) byId('goldTitle').textContent = activePackage.title;
      if(byId('goldCopy')) byId('goldCopy').textContent = activePackage.copy;
      fillChips('goldChips', activePackage.chips || []);
    }
    if(activePackage.tier === 'elite'){
      if(byId('eliteTitle')) byId('eliteTitle').textContent = activePackage.title;
      if(byId('eliteCopy')) byId('eliteCopy').textContent = activePackage.copy;
      fillChips('eliteChips', activePackage.chips || []);
    }

    saveAccess(activePackage);
    window.addEventListener('load', runSequence, { once:true });
  }

  let activePackage = null;

  if(code && codeMap[code]){
    activePackage = { ...codeMap[code], code, source:'mapped' };
  }else if(hasNfc && code){
    activePackage = buildDynamicPackage(code);
  }else if(hasNfc && ['entry','gold','elite'].includes(explicitUnlock)){
    activePackage = {
      tier: explicitUnlock,
      title: explicitUnlock.charAt(0).toUpperCase() + explicitUnlock.slice(1) + ' Room',
      copy: 'Verified access unlocked the ' + explicitUnlock + ' room.',
      chips: [explicitUnlock + ' tier'],
      code: explicitUnlock.toUpperCase() + '001',
      source:'unlock_param'
    };
  }else{
    const saved = loadAccess();
    if(saved && saved.tier){
      activePackage = saved;
    }
  }

  if(!activePackage){
    showLocked();
    return;
  }

  showUnlocked(activePackage);
})();