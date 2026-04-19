(function(){
  function formatNumber(n){
    return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString();
  }

  function getMilestones(){
    if(window.Play3DMemberSystem && Array.isArray(window.Play3DMemberSystem.milestones)){
      return window.Play3DMemberSystem.milestones.slice().sort((a,b)=>a.credits-b.credits);
    }
    if(window.Play3DMilestones){
      return window.Play3DMilestones.slice().sort((a,b)=>a.credits-b.credits);
    }
    return [];
  }

  function getTierInfo(){
    if(window.Play3DMemberSystem && window.Play3DMemberSystem.tierInfo){
      return window.Play3DMemberSystem.tierInfo();
    }
    return { rewardsEnabled:false, label:'FREE PLAY' };
  }

  function getBank(){
    if(window.Play3DMemberSystem && window.Play3DMemberSystem.getCreditBank){
      return window.Play3DMemberSystem.getCreditBank();
    }
    return 0;
  }

  function getClaimedCredits(){
    try{
      const raw = localStorage.getItem('play3d_member_claimed_rewards_v1');
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){
      return [];
    }
  }

  function getNextMilestone(bank){
    const milestones = getMilestones();
    const claimed = getClaimedCredits();
    for(const m of milestones){
      if(bank < m.credits || !claimed.includes(m.credits)){
        return m;
      }
    }
    return milestones[milestones.length - 1] || null;
  }

  function getPreviousMilestone(bank){
    const milestones = getMilestones();
    let prev = { credits: 0, label: 'Start' };
    for(const m of milestones){
      if(bank >= m.credits) prev = m;
    }
    return prev;
  }

  function renderTracker(){
    const root = document.getElementById('rewardTracker');
    if(!root) return;

    const info = getTierInfo();
    const bank = getBank();
    const next = getNextMilestone(bank);
    const prev = getPreviousMilestone(bank);

    const modeEl = document.getElementById('rewardTrackerMode');
    const bankEl = document.getElementById('rewardTrackerBank');
    const nextEl = document.getElementById('rewardTrackerNext');
    const subEl = document.getElementById('rewardTrackerSub');
    const fillEl = document.getElementById('rewardTrackerFill');

    if(modeEl) modeEl.textContent = info.label || 'FREE PLAY';
    if(bankEl) bankEl.textContent = formatNumber(bank);

    if(!info.rewardsEnabled){
      if(nextEl) nextEl.textContent = 'MEMBER REWARDS LOCKED';
      if(subEl) subEl.textContent = 'Subscribers / buyers only. Free visitors stay in free play.';
      if(fillEl) fillEl.style.width = '0%';
      return;
    }

    if(!next){
      if(nextEl) nextEl.textContent = 'ALL REWARDS CLEARED';
      if(subEl) subEl.textContent = 'You cleared every current milestone.';
      if(fillEl) fillEl.style.width = '100%';
      return;
    }

    const start = prev && prev.credits < next.credits ? prev.credits : 0;
    const span = Math.max(1, next.credits - start);
    const progress = Math.max(0, Math.min(100, ((bank - start) / span) * 100));
    const remaining = Math.max(0, next.credits - bank);

    if(nextEl) nextEl.textContent = `${next.label.toUpperCase()} AT ${formatNumber(next.credits)}`;
    if(subEl) subEl.textContent = remaining > 0
      ? `${formatNumber(remaining)} credits until next unlock`
      : 'Milestone reached';
    if(fillEl) fillEl.style.width = `${progress}%`;
  }

  window.Play3DRewardTrackerUI = {
    render: renderTracker
  };

  window.addEventListener('load', renderTracker);
})();