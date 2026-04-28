(function(){
  function hasVaultPass(){
    try{
      return !!(window.GV && typeof GV.hasActivePass === 'function' && GV.hasActivePass());
    }catch(e){
      return false;
    }
  }

  function addCredits(amount){
    if(!window.Play3DMemberSystem){
      return { free:true, unlocked:false, bank:0 };
    }

    const rewardEligible = Play3DMemberSystem.isMember() || hasVaultPass();

    if(!rewardEligible){
      return { free:true, unlocked:false, bank:Play3DMemberSystem.getCreditBank() };
    }

    const bank = Play3DMemberSystem.addCredits(amount);
    return {
      free:false,
      unlocked:true,
      bank
    };
  }

  window.Play3DGameRewards = {
    addCredits,
    updateBadge(){ /* optional no-op */ }
  };
})();