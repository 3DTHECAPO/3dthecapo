const ENGINE_KEY = 'play3d_reward_engine_v1';
const MEMBER_KEY = 'play3d_member_v1';
const PASS_KEY = 'play3d_vault_pass_v1';
const CLAIMS_TABLE = 'reward_claims';
let activeFilter = 'all';

const els = {
  total: document.getElementById('totalRewardsValue'),
  unclaimed: document.getElementById('unclaimedRewardsValue'),
  claimed: document.getElementById('claimedRewardsValue'),
  walletList: document.getElementById('walletList'),
  template: document.getElementById('rewardCardTemplate'),
  exportBtn: document.getElementById('exportBtn'),
  clearClaimedBtn: document.getElementById('clearClaimedBtn'),
  filterBtns: Array.from(document.querySelectorAll('.filter-btn'))
};

function loadRewardState(){
  try{
    const raw = localStorage.getItem(ENGINE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && Array.isArray(parsed.history)){
        return {
          history: parsed.history,
          counters: parsed.counters || {},
          rewardsWon: parsed.rewardsWon || 0
        };
      }
    }
  }catch(e){}
  return { history: [], counters: {}, rewardsWon: 0 };
}

function saveRewardState(state){
  localStorage.setItem(ENGINE_KEY, JSON.stringify(state));
}

function formatDate(ts){
  try{
    return new Date(ts).toLocaleString();
  }catch(e){
    return 'Unknown';
  }
}

function rewardTypeLabel(type){
  const map = {
    chips: 'chips',
    discount: 'merch',
    vault: 'nfc',
    fan: 'fan'
  };
  return map[type] || 'reward';
}

function getFilteredRewards(rewards){
  if(activeFilter === 'unclaimed') return rewards.filter(r => !r.claimed);
  if(activeFilter === 'claimed') return rewards.filter(r => r.claimed);
  return rewards;
}

function normalizeRewards(state){
  return state.history.map((entry, index) => ({
    id: index,
    at: entry.at,
    game: entry.game || 'game',
    trigger: entry.trigger || 'reward',
    claimed: !!entry.claimed,
    claim_status: entry.claim_status || '',
    reward_event_id: entry.reward_event_id || entry.rewardEventId || entry.event_id || '',
    reward: entry.reward || {}
  })).reverse();
}

function updateSummary(rewards){
  els.total.textContent = rewards.length.toLocaleString();
  els.unclaimed.textContent = rewards.filter(r => !r.claimed).length.toLocaleString();
  els.claimed.textContent = rewards.filter(r => r.claimed).length.toLocaleString();
}

function copyCode(code){
  if(!code) return;
  navigator.clipboard?.writeText(code).catch(() => {});
}

function readVaultPass(){
  try{
    const raw = localStorage.getItem(PASS_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}

function validVaultPass(){
  if(window.Play3DPassSession && Play3DPassSession.current){
    return Play3DPassSession.current();
  }

  const pass = readVaultPass();
  if(!pass || !pass.expires_at) return null;

  const expires = new Date(pass.expires_at).getTime();
  return Number.isFinite(expires) && expires > Date.now() ? pass : null;
}

function getClaimIdentity(){
  const pass = validVaultPass();
  const isLocalMember = localStorage.getItem(MEMBER_KEY) === '1';

  if(!isLocalMember && !pass) return null;

  return {
    pass,
    member_id: pass && (pass.member_id || pass.memberId || pass.user_id || pass.userId) || null,
    email: pass && (pass.email || pass.recipient_email || pass.recipientEmail) || null
  };
}

function getRewardEventId(item){
  return item.reward_event_id
    || item.rewardEventId
    || item.event_id
    || (item.reward && (item.reward.reward_event_id || item.reward.rewardEventId || item.reward.event_id))
    || null;
}

function getRewardKey(item){
  return (item.reward && (item.reward.reward_key || item.reward.rewardKey || item.reward.code || item.reward.type))
    || item.trigger
    || 'reward';
}

function getSupabaseConfig(){
  const cfg = window.PLAY3D_SECURE_CONFIG || {};
  return {
    url: cfg.supabaseUrl || 'https://fupoedrovfloudefyzna.supabase.co',
    key: cfg.supabaseAnonKey || 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1'
  };
}

async function hasDuplicateClaim(rewardEventId){
  if(!rewardEventId) return false;

  const cfg = getSupabaseConfig();
  const url = `${cfg.url}/rest/v1/${CLAIMS_TABLE}?reward_event_id=eq.${encodeURIComponent(rewardEventId)}&select=id&limit=1`;
  const res = await fetch(url,{
    headers:{
      'apikey':cfg.key,
      'Authorization':`Bearer ${cfg.key}`
    }
  });

  if(!res.ok) return false;

  const rows = await res.json().catch(()=>[]);
  return Array.isArray(rows) && rows.length > 0;
}

async function submitRewardClaim(item){
  const identity = getClaimIdentity();
  if(!identity){
    return { ok:false, message:'Members or valid pass holders only.' };
  }

  const rewardEventId = getRewardEventId(item);

  if(rewardEventId && await hasDuplicateClaim(rewardEventId)){
    return { ok:false, duplicate:true, message:'Claim already submitted.' };
  }

  const cfg = getSupabaseConfig();
  const body = {
    email: identity.email,
    member_id: identity.member_id,
    reward_event_id: rewardEventId,
    reward_key: getRewardKey(item),
    reward_title: item.reward && item.reward.label || 'Reward',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const res = await fetch(`${cfg.url}/rest/v1/${CLAIMS_TABLE}`,{
    method:'POST',
    headers:{
      'apikey':cfg.key,
      'Authorization':`Bearer ${cfg.key}`,
      'Content-Type':'application/json',
      'Prefer':'return=representation'
    },
    body:JSON.stringify(body)
  });

  if(!res.ok){
    return { ok:false, message:'Claim could not be submitted.' };
  }

  const rows = await res.json().catch(()=>[]);
  return { ok:true, claim:Array.isArray(rows) ? rows[0] : null, message:'Claim submitted. Pending review.' };
}

function setClaimMessage(node, message){
  const extra = node.querySelector('.reward-extra');
  if(extra) extra.textContent = message;
}

function render(){
  const state = loadRewardState();
  const rewards = normalizeRewards(state);
  const filtered = getFilteredRewards(rewards);
  updateSummary(rewards);

  els.walletList.innerHTML = '';
  if(filtered.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = 'No rewards in this view yet.<br>Win games to generate merch, NFC, chip, and fan rewards.';
    els.walletList.appendChild(empty);
    return;
  }

  filtered.forEach(item => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.querySelector('.reward-name').textContent = item.reward.label || 'Reward';
    node.querySelector('.reward-meta').textContent = `${String(item.game).toUpperCase()} • ${formatDate(item.at)}`;
    node.querySelector('.reward-badge').textContent = item.claimed ? 'Claimed' : rewardTypeLabel(item.reward.type);
    node.querySelector('.reward-desc').textContent = item.reward.description || 'Reward unlocked.';
    node.querySelector('.reward-code').textContent = item.reward.code || 'NO-CODE';
    node.querySelector('.reward-extra').textContent =
      `Trigger: ${String(item.trigger).replaceAll('_',' ')} • Type: ${rewardTypeLabel(item.reward.type)}`;

    const claimBtn = node.querySelector('.claim-btn');
    const copyBtn = node.querySelector('.copy-btn');

    if(item.claimed || item.claim_status === 'pending'){
      claimBtn.textContent = item.claim_status === 'pending' ? 'Pending' : 'Claimed';
      claimBtn.disabled = true;
    }else{
      claimBtn.addEventListener('click', async () => {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Submitting';
        setClaimMessage(node, 'Submitting claim...');

        const result = await submitRewardClaim(item);

        if(!result.ok){
          claimBtn.disabled = false;
          claimBtn.textContent = 'Claim';
          setClaimMessage(node, result.message);
          return;
        }

        const latest = loadRewardState();
        if(latest.history[item.id]){
          latest.history[item.id].claimed = true;
          latest.history[item.id].claim_status = 'pending';
          if(result.claim && result.claim.id) latest.history[item.id].reward_claim_id = result.claim.id;
          saveRewardState(latest);
          render();
        }
      });
    }

    copyBtn.addEventListener('click', () => copyCode(item.reward.code));
    els.walletList.appendChild(node);
  });
}

els.filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    els.filterBtns.forEach(b => b.classList.toggle('active', b === btn));
    render();
  });
});

els.exportBtn.addEventListener('click', () => {
  const state = loadRewardState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'play3d-rewards-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

els.clearClaimedBtn.addEventListener('click', () => {
  const state = loadRewardState();
  state.history = state.history.filter(item => !item.claimed);
  saveRewardState(state);
  render();
});

render();
