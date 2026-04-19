(function(){
  const BASE = 1000;
  const START_KEY = 'play3d_started_v3';
  const BOOST_KEY = 'play3d_boost_v3';

  function ensureStarter(current){
    const started = localStorage.getItem(START_KEY);
    if(!started){
      localStorage.setItem(START_KEY,'1');
      if(!current || current <= 0){
        return {value: BASE, msg: 'STARTER ' + BASE};
      }
    }
    return {value: current, msg:''};
  }

  function queueBoost(amount){
    const val = Number(localStorage.getItem(BOOST_KEY)||0);
    localStorage.setItem(BOOST_KEY, val + amount);
  }

  function applyBoost(current){
    const val = Number(localStorage.getItem(BOOST_KEY)||0);
    if(val>0){
      localStorage.setItem(BOOST_KEY,0);
      return {value: current + val, msg: 'BOOST +' + val};
    }
    return {value: current, msg:''};
  }

  window.Play3DBankroll = {
    ensureStarter,
    queueBoost,
    applyBoost
  };
})();