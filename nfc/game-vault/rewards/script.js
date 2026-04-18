const ENGINE_KEY = 'play3d_reward_engine_v1';
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

    if(item.claimed){
      claimBtn.textContent = 'Claimed';
      claimBtn.disabled = true;
    }else{
      claimBtn.addEventListener('click', () => {
        const latest = loadRewardState();
        if(latest.history[item.id]){
          latest.history[item.id].claimed = true;
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
