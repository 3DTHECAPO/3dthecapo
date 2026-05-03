(function(){
  const MEMBER_KEY = 'play3d_member_v1';
  const BANK_KEY = 'play3d_global_bank_v1';
  const PASS_KEY = 'play3d_vault_pass_v1';

  function isMember(){
    if(localStorage.getItem(MEMBER_KEY) === '1') return true;
    try{
      const raw = localStorage.getItem(PASS_KEY);
      const pass = raw ? JSON.parse(raw) : null;
      if(!pass || !pass.expires_at) return false;
      return new Date(pass.expires_at).getTime() > Date.now();
    }catch(e){
      return false;
    }
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
      label: isMember() ? 'MEMBER' : 'Free Play — sign up to earn rewards.'
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
