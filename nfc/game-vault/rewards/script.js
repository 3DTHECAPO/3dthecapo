(()=>{
  'use strict';

  const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  const REWARD_EVENTS_TABLE = 'reward_events';
  const REWARD_CLAIMS_TABLE = 'reward_claims';
  const DAILY_KEY = 'play3d_daily_bonus_v1';
  const CLAIMED_KEY = 'play3d_member_claimed_rewards_v1';

  const els = {
    refresh: document.getElementById('refreshBtn'),
    locked: document.getElementById('lockedState'),
    dashboard: document.getElementById('dashboard'),
    points: document.getElementById('rewardPoints'),
    credits: document.getElementById('rewardCredits'),
    status: document.getElementById('rewardStatus'),
    nextReward: document.getElementById('nextReward'),
    events: document.getElementById('rewardEvents'),
    pending: document.getElementById('pendingClaims'),
    approved: document.getElementById('approvedClaims'),
    fulfilled: document.getElementById('fulfilledClaims'),
    bonusText: document.getElementById('bonusText'),
    bonusStatus: document.getElementById('bonusStatus'),
    dailyBonus: document.getElementById('dailyBonusBtn'),
    claimMilestone: document.getElementById('claimMilestoneBtn')
  };

  function readJSON(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch(e){ return fallback; }
  }

  function writeJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function money(n){ return Math.max(0, Math.floor(Number(n)||0)).toLocaleString(); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function msg(text){ if(els.bonusStatus) els.bonusStatus.textContent = text; }

  function textRow(message){ return '<div class="placeholder-row">'+escapeHtml(message)+'</div>'; }
  function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }

  function renderList(node, items, fallback){
    if(!node) return;
    node.innerHTML = items.length ? items.map(textRow).join('') : textRow(fallback);
  }

  function member(){ return window.Play3DMemberSystem || null; }
  function identity(){ return member() && member().identity ? member().identity() : {}; }
  function hasAnyAccess(){
    const sys = member();
    if(!sys) return false;
    return !!(sys.hasAccess && sys.hasAccess()) || !!(sys.hasActivePass && sys.hasActivePass()) || !!(sys.isMember && sys.isMember());
  }
  function isPaidMember(){ return !!(member() && member().isMember && member().isMember()); }
  function getCredits(){ return member() && member().getCreditBank ? member().getCreditBank() : Math.max(0, Number(localStorage.getItem('play3d_global_bank_v1')||0)); }
  function getPoints(){ return member() && member().getPoints ? member().getPoints() : Math.max(0, Number(localStorage.getItem('play3d_game_points_v1')||0)); }
  function addCredits(amount){ return member() && member().addCredits ? member().addCredits(amount) : 0; }

  function milestones(){
    const list = Array.isArray(window.Play3DMilestones) ? window.Play3DMilestones : [
      {credits:50000,label:'MERCH ITEM'},
      {credits:100000,label:'PREMIUM DROP'},
      {credits:250000,label:'ELITE REWARD'}
    ];
    const seen = new Set();
    return list
      .filter(m => m && Number(m.credits) > 0 && m.label)
      .sort((a,b)=>Number(a.credits)-Number(b.credits))
      .filter(m => { const k = Number(m.credits)+'|'+String(m.label).toUpperCase(); if(seen.has(k)) return false; seen.add(k); return true; });
  }

  function claimedCredits(){
    const arr = readJSON(CLAIMED_KEY, []);
    return Array.isArray(arr) ? arr.map(Number) : [];
  }

  function markClaimed(credits){
    const arr = claimedCredits();
    if(!arr.includes(Number(credits))) arr.push(Number(credits));
    writeJSON(CLAIMED_KEY, arr);
  }

  function nextMilestone(bank){
    const claimed = claimedCredits();
    return milestones().find(m => bank >= Number(m.credits) && !claimed.includes(Number(m.credits)))
      || milestones().find(m => bank < Number(m.credits))
      || null;
  }

  async function supabasePost(table, payload){
    const attempts = [payload, compactPayload(payload)];
    for(const body of attempts){
      try{
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{
          method:'POST',
          headers:{
            'apikey':SUPABASE_ANON,
            'Authorization':'Bearer '+SUPABASE_ANON,
            'Content-Type':'application/json',
            'Prefer':'return=representation'
          },
          body:JSON.stringify(body)
        });
        if(res.ok) return await res.json().catch(()=>[]);
        const txt = await res.text().catch(()=>'');
        if(!/column|schema|PGRST204|Could not find/i.test(txt)) throw new Error(txt || res.statusText);
      }catch(e){
        if(body === attempts[attempts.length-1]) throw e;
      }
    }
    return [];
  }

  function compactPayload(payload){
    return {
      status: payload.status || 'pending',
      reward_label: payload.reward_label || payload.reward_name || payload.label || 'Reward Claim',
      credits_cost: payload.credits_cost || payload.credits || 0,
      created_at: payload.created_at || new Date().toISOString()
    };
  }

  async function supabaseGet(table, query){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{
        headers:{ 'apikey':SUPABASE_ANON, 'Authorization':'Bearer '+SUPABASE_ANON }
      });
      if(!res.ok) return [];
      const rows = await res.json().catch(()=>[]);
      return Array.isArray(rows) ? rows : [];
    }catch(e){ return []; }
  }

  async function fetchEvents(){
    const id = identity();
    const filters = [];
    if(id.email) filters.push(`metadata->>email=eq.${encodeURIComponent(id.email)}`);
    if(id.memberId) filters.push(`metadata->>member_table_id=eq.${encodeURIComponent(id.memberId)}`);
    const base = 'select=*&order=created_at.desc&limit=10';
    const rows = await supabaseGet(REWARD_EVENTS_TABLE, filters.length ? `${base}&or=(${filters.join(',')})` : base);
    if(rows.length) return rows.map(r => `${String(r.game || r.source || 'PLAY 3D').toUpperCase()} - +${money(r.points || r.credits || 0)} ${r.reward_key || r.event_type || 'reward'}`);

    const engine = readJSON('play3d_reward_engine_v1', {history:[]});
    return Array.isArray(engine.history) ? engine.history.slice(-5).reverse().map(item=>{
      const label = item.reward && item.reward.label || 'Reward event';
      const game = item.game ? String(item.game).toUpperCase() : 'LOCAL';
      return game+' - '+label;
    }) : [];
  }

  async function fetchClaims(){
    const id = identity();
    const base = 'select=*&order=created_at.desc&limit=50';
    const filters = [];
    if(id.email) filters.push(`email=eq.${encodeURIComponent(id.email)}`);
    if(id.memberId) filters.push(`member_id=eq.${encodeURIComponent(id.memberId)}`);
    let rows = await supabaseGet(REWARD_CLAIMS_TABLE, filters.length ? `${base}&or=(${filters.join(',')})` : base);

    if(!rows.length){
      const engine = readJSON('play3d_reward_engine_v1', {history:[]});
      rows = Array.isArray(engine.history) ? engine.history : [];
    }

    const labelFor = row => row.reward_label || row.reward_name || row.label || (row.reward && row.reward.label) || 'Reward Claim';
    const statusFor = row => String(row.status || row.claim_status || (row.claimed ? 'fulfilled' : 'pending')).toLowerCase();
    return {
      pending: rows.filter(r => statusFor(r) === 'pending').map(labelFor),
      approved: rows.filter(r => statusFor(r) === 'approved').map(labelFor),
      fulfilled: rows.filter(r => ['fulfilled','complete','completed','claimed'].includes(statusFor(r))).map(labelFor)
    };
  }

  async function logEvent(type, points, extra){
    const id = identity();
    const payload = {
      event_type:type,
      source:'rewards_page',
      game:'rewards',
      points:Number(points)||0,
      reward_key:type,
      created_at:new Date().toISOString(),
      metadata:Object.assign({
        email:id.email || '',
        member_table_id:id.memberId || '',
        code:id.code || '',
        tier:id.tier || '',
        page:window.location.pathname,
        href:window.location.href
      }, extra || {})
    };
    try{ await supabasePost(REWARD_EVENTS_TABLE, payload); }catch(e){}
  }

  async function claimDaily(){
    if(!isPaidMember()) return msg('Paid member registration required before claimable bonus credits unlock.');
    const last = localStorage.getItem(DAILY_KEY);
    if(last === today()) return msg('Daily bonus already claimed today.');
    const amount = 250;
    const bank = addCredits(amount);
    localStorage.setItem(DAILY_KEY, today());
    await logEvent('daily_bonus', amount, {bank_after:bank});
    msg('Daily bonus claimed: +' + money(amount) + ' credits.');
    render();
  }

  async function claimMilestone(){
    if(!isPaidMember()) return msg('Paid member registration required before reward claims unlock.');
    const bank = getCredits();
    const m = nextMilestone(bank);
    if(!m) return msg('No milestone reward configured.');
    if(bank < Number(m.credits)) return msg(money(Number(m.credits)-bank) + ' credits needed for ' + m.label + '.');

    const id = identity();
    const payload = {
      member_id:id.memberId || null,
      email:id.email || null,
      code:id.code || null,
      tier:id.tier || null,
      reward_label:m.label,
      reward_name:m.label,
      credits_cost:Number(m.credits),
      credits:Number(m.credits),
      status:'pending',
      source:'play3d_rewards_page',
      created_at:new Date().toISOString(),
      metadata:{page:window.location.pathname, href:window.location.href}
    };

    try{
      await supabasePost(REWARD_CLAIMS_TABLE, payload);
      markClaimed(m.credits);
      await logEvent('milestone_claim_submitted', 0, {reward_label:m.label, credits_cost:m.credits});
      msg('Claim submitted: ' + m.label + '. Status: pending approval.');
    }catch(e){
      msg('Claim saved locally. Supabase reward_claims table needs column check.');
      const engine = readJSON('play3d_reward_engine_v1', {history:[],counters:{},rewardsWon:0});
      engine.history = Array.isArray(engine.history) ? engine.history : [];
      engine.history.push({at:Date.now(),game:'rewards',claim_status:'pending',reward:{label:m.label},credits_cost:m.credits});
      writeJSON('play3d_reward_engine_v1', engine);
      markClaimed(m.credits);
    }
    render();
  }

  async function render(){
    const access = hasAnyAccess();
    if(els.locked) els.locked.hidden = access;
    if(els.dashboard) els.dashboard.hidden = !access;
    if(els.refresh) els.refresh.disabled = !access;
    if(!access) return;

    const paid = isPaidMember();
    const bank = getCredits();
    const points = getPoints();
    const m = nextMilestone(bank);
    const claims = await fetchClaims();
    const events = await fetchEvents();

    if(els.points) els.points.textContent = money(points);
    if(els.credits) els.credits.textContent = money(bank);
    if(els.status) els.status.textContent = paid ? 'PAID MEMBER' : 'VISITOR';
    if(els.nextReward) els.nextReward.textContent = m ? `${m.label} @ ${money(m.credits)}` : 'COMPLETE';
    if(els.bonusText) els.bonusText.textContent = paid
      ? 'Daily bonus is active. Milestone claims submit to reward_claims for approval.'
      : 'Visitor access can view rewards. Paid registration unlocks claimable bonus credits.';
    if(els.dailyBonus) els.dailyBonus.disabled = !paid || localStorage.getItem(DAILY_KEY) === today();
    if(els.claimMilestone) els.claimMilestone.disabled = !paid || !m || bank < Number(m.credits);

    renderList(els.events, events, 'No reward events yet.');
    renderList(els.pending, claims.pending, 'No pending claims.');
    renderList(els.approved, claims.approved, 'No approved claims.');
    renderList(els.fulfilled, claims.fulfilled, 'No fulfilled claims.');
  }

  if(els.refresh) els.refresh.addEventListener('click', render);
  if(els.dailyBonus) els.dailyBonus.addEventListener('click', claimDaily);
  if(els.claimMilestone) els.claimMilestone.addEventListener('click', claimMilestone);
  render();
})();
