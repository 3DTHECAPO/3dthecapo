(()=>{
  'use strict';

  const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  const REWARD_EVENTS_TABLE = 'reward_events';
  const REWARD_CLAIMS_TABLE = 'reward_claims';

  const els = {
    refresh: document.getElementById('refreshBtn'),
    locked: document.getElementById('lockedState'),
    dashboard: document.getElementById('dashboard'),
    points: document.getElementById('rewardPoints'),
    credits: document.getElementById('rewardCredits'),
    events: document.getElementById('rewardEvents'),
    pending: document.getElementById('pendingClaims'),
    approved: document.getElementById('approvedClaims'),
    fulfilled: document.getElementById('fulfilledClaims')
  };

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function normalizeEmail(email){
    return String(email || '').trim().toLowerCase();
  }

  function identity(){
    if(window.Play3DMemberSystem && typeof Play3DMemberSystem.identity === 'function'){
      return Play3DMemberSystem.identity() || {};
    }
    return {};
  }

  function textRow(message){
    return '<div class="placeholder-row">'+esc(message)+'</div>';
  }

  function renderList(node, items, fallback){
    if(!node) return;
    node.innerHTML = items.length ? items.map(textRow).join('') : textRow(fallback);
  }

  async function supabaseRead(table, query){
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`
      }
    });
    const data = await res.json().catch(()=>[]);
    if(!res.ok) throw new Error(`${table}: ${JSON.stringify(data)}`);
    return Array.isArray(data) ? data : [];
  }

  function eventMetadata(row){
    return row && typeof row.reward_metadata === 'object' && row.reward_metadata
      ? row.reward_metadata
      : row && typeof row.metadata === 'object' && row.metadata
        ? row.metadata
        : {};
  }

  function eventCredits(row){
    const meta = eventMetadata(row);
    return Number(row.credits ?? row.points ?? meta.credits ?? meta.points ?? 0) || 0;
  }

  function eventLabel(row){
    const meta = eventMetadata(row);
    return row.reward_label || row.event_type || row.reward_type || meta.event_name || meta.reward_key || 'Reward Event';
  }

  function claimStatus(row){
    return String(row.claim_status || row.status || 'pending').toLowerCase();
  }

  function claimLabel(row){
    return row.reward_label || row.reward_key || row.claim_type || row.reward_name || 'Reward Claim';
  }

  function identityFilters(){
    const id = identity();
    const email = normalizeEmail(id.email);
    const memberId = String(id.memberId || id.member_id || id.memberTableId || id.member_table_id || '').trim();
    const memberNumber = String(id.memberNumber || id.member_number || '').trim();
    return { email, memberId, memberNumber };
  }

  async function loadLiveRewardEvents(){
    const id = identityFilters();
    const queries = [];
    if(id.email) queries.push(`email=eq.${encodeURIComponent(id.email)}&select=*&order=created_at.desc&limit=50`);
    if(id.memberId) queries.push(`member_id=eq.${encodeURIComponent(id.memberId)}&select=*&order=created_at.desc&limit=50`);
    return await loadMemberRows(REWARD_EVENTS_TABLE, queries);
  }

  async function loadLiveClaims(){
    const id = identityFilters();
    const queries = [];
    if(id.email) queries.push(`email=eq.${encodeURIComponent(id.email)}&select=*&order=created_at.desc&limit=100`);
    if(id.memberNumber) queries.push(`member_number=eq.${encodeURIComponent(id.memberNumber)}&select=*&order=created_at.desc&limit=100`);
    if(id.memberId) queries.push(`member_id=eq.${encodeURIComponent(id.memberId)}&select=*&order=created_at.desc&limit=100`);
    return await loadMemberRows(REWARD_CLAIMS_TABLE, queries);
  }

  async function loadMemberRows(table, queries){
    if(!queries.length) return [];
    const results = await Promise.all(queries.map(query=>supabaseRead(table, query).catch(()=>[])));
    const seen = new Set();
    return results.flat().filter(row=>{
      const key = String(row.id || row.reward_code || row.claim_id || JSON.stringify(row));
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a,b)=>new Date(b.created_at || 0).getTime()-new Date(a.created_at || 0).getTime());
  }

  function loadLocalRewardEvents(){
    const engine = readJSON('play3d_reward_engine_v1', {history:[]});
    return Array.isArray(engine.history) ? engine.history.slice(-5).reverse().map(item=>{
      const label = item.reward && item.reward.label || 'Reward event';
      const game = item.game ? String(item.game).toUpperCase() : 'LOCAL';
      return game+' - '+label;
    }) : [];
  }

  function getPaidMemberAccess(){
    return !!(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.isMember === 'function' && window.Play3DMemberSystem.isMember());
  }

  function getCredits(){
    if(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.getCreditBank === 'function'){
      return Play3DMemberSystem.getCreditBank();
    }
    const globalBank = Number(localStorage.getItem('play3d_global_bank_v1') || 0);
    const legacyBank = Number(localStorage.getItem('play3d_game_bank_v1') || 0);
    return Math.max(0, Math.floor(globalBank || 0), Math.floor(legacyBank || 0));
  }

  function getPoints(profile){
    if(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.getPoints === 'function'){
      return Play3DMemberSystem.getPoints();
    }
    return Math.max(0, Number(localStorage.getItem('play3d_game_points_v1') || profile.totalPoints || 0));
  }

  async function render(){
    const hasAccess = getPaidMemberAccess();
    if(els.locked) els.locked.hidden = hasAccess;
    if(els.dashboard) els.dashboard.hidden = !hasAccess;
    if(els.refresh) els.refresh.disabled = !hasAccess;
    if(!hasAccess){
      if(els.locked){
        const p = els.locked.querySelector('p');
        if(p) p.textContent = 'Paid registration is required to view and claim rewards. Entry passes are visitor access only.';
      }
      return;
    }

    const profile = readJSON('play3d_player_profile_v1', {});
    const points = getPoints(profile);
    const localCredits = getCredits();

    if(els.points) els.points.textContent = points.toLocaleString();
    if(els.credits) els.credits.textContent = localCredits.toLocaleString();

    try{
      const [events, claims] = await Promise.all([loadLiveRewardEvents(), loadLiveClaims()]);
      const totalCredits = events.reduce((sum,row)=>sum + eventCredits(row), 0);
      if(els.credits) els.credits.textContent = Math.max(localCredits, totalCredits).toLocaleString();

      renderList(
        els.events,
        events.slice(0,10).map(row=>`${String(row.game || row.source || 'PLAY 3D').toUpperCase()} - ${eventLabel(row)} +${eventCredits(row).toLocaleString()}`),
        'No live reward events yet.'
      );

      renderList(
        els.pending,
        claims.filter(row=>['pending','pending_review','open','requested','new'].includes(claimStatus(row))).map(row=>claimLabel(row)),
        'No pending claims.'
      );
      renderList(
        els.approved,
        claims.filter(row=>['approved','ready','processing'].includes(claimStatus(row))).map(row=>claimLabel(row)),
        'No approved claims.'
      );
      renderList(
        els.fulfilled,
        claims.filter(row=>['fulfilled','complete','completed','shipped'].includes(claimStatus(row))).map(row=>claimLabel(row)),
        'No fulfilled claims.'
      );
      const denied = claims.filter(row=>claimStatus(row)==='denied');
      if(denied.length && els.pending){
        els.pending.insertAdjacentHTML('beforeend', denied.map(row=>textRow('Denied - '+claimLabel(row))).join(''));
      }
    }catch(error){
      renderList(els.events, loadLocalRewardEvents(), 'No reward events yet.');
      renderList(els.pending, [], 'No pending claims. Live rewards unavailable: '+error.message);
      renderList(els.approved, [], 'No approved claims.');
      renderList(els.fulfilled, [], 'No fulfilled claims.');
    }
  }

  if(els.refresh) els.refresh.addEventListener('click', render);
  render();
})();
