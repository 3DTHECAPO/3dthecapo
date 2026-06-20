window.Play3DRewardThresholds = window.Play3DRewardThresholds || {
  start: 100000,
  step: 150000,
  thresholdForLevel(level){
    return 100000 + (Math.max(0, Number(level || 0)) * 150000);
  }
};

window.Play3DMilestones = [
  { credits: 100000, label: 'MUSIC UNLOCK', level: 1 },
  { credits: 250000, label: 'MERCH ITEM', level: 2 },
  { credits: 400000, label: 'PREMIUM DROP', level: 3 },
  { credits: 550000, label: 'PREMIUM MERCH', level: 4 },
  { credits: 700000, label: 'ELITE BUNDLE', level: 5 },
  { credits: 850000, label: 'VIP REWARD', level: 6 },
  { credits: 1000000, label: 'MILLION CREDIT REWARD', level: 7 }
];
