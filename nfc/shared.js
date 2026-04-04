
window.GV = {
  params: new URLSearchParams(location.search),
  isBonus() { return this.params.get('nfc') === '1' || localStorage.getItem('gv_bonus') === '1'; },
  setReward(key, value='1'){ localStorage.setItem('gv_reward_'+key, value); },
  getReward(key){ return localStorage.getItem('gv_reward_'+key); },
  enableBonus(){ localStorage.setItem('gv_bonus','1'); }
};
if (GV.params.get('nfc') === '1') GV.enableBonus();
