(function(){
  const START_THRESHOLD = 100000;
  const STEP_THRESHOLD = 150000;

  function rewardThreshold(level){
    return START_THRESHOLD + (Math.max(0, Number(level || 0)) * STEP_THRESHOLD);
  }

  const MILESTONES = [
    { credits: rewardThreshold(0), prefix: 'VAULT', label: 'Music Unlock', level: 1 },
    { credits: rewardThreshold(1), prefix: 'DROP', label: 'Merch Item', level: 2 },
    { credits: rewardThreshold(2), prefix: 'PREM', label: 'Premium Drop', level: 3 },
    { credits: rewardThreshold(3), prefix: 'ELITE', label: 'Premium Merch', level: 4 },
    { credits: rewardThreshold(4), prefix: 'BUNDLE', label: 'Elite Bundle', level: 5 },
    { credits: rewardThreshold(5), prefix: 'VIP', label: 'VIP Reward', level: 6 },
    { credits: rewardThreshold(6), prefix: 'LEGACY', label: 'Million Credit Reward', level: 7 }
  ];

  window.Play3DRewardThresholds = {
    start: START_THRESHOLD,
    step: STEP_THRESHOLD,
    thresholdForLevel: rewardThreshold,
    milestones: MILESTONES
  };

  window.Play3DMilestones = MILESTONES;
})();
