(function(){
  const MEMBER_KEY = 'play3d_member_v1';
  const BANK_KEY = 'play3d_global_bank_v1';

  function isMember(){
    return localStorage.getItem(MEMBER_KEY) === '1';
  }

  function setMember(val){
    localStorage.setItem(MEMBER_KEY, val ? '1' : '0');
  }

  function getCreditBank(){
    return Math.max(0, Math.floor(Number(localStorage.getItem(BANK_KEY) || 0)));
  }

  function addCredits(amount){
    const safe = Math.max(0, Math.floor(Number(amount) || 0));
    const next = getCreditBank() + safe;
    localStorage.setItem(BANK_KEY, String(next));
    return next;
  }

  function tierInfo(){
    return {
      rewardsEnabled: isMember(),
      label: isMember() ? 'MEMBER' : 'FREE PLAY'
    };
  }

  window.Play3DMemberSystem = {
    isMember,
    setMember,
    getCreditBank,
    addCredits,
    tierInfo
  };
})();