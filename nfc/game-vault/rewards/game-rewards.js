(function(){
  function addCredits(amount){
    if(!window.Play3DMemberSystem){
      return { free:true, unlocked:false, bank:0 };
    }
    if(!Play3DMemberSystem.isMember()){
      return { free:true, unlocked:false, bank:Play3DMemberSystem.getCreditBank() };
    }
    const bank = Play3DMemberSystem.addCredits(amount);
    return {
      free:false,
      unlocked: bank >= 50000,
      bank
    };
  }

  window.Play3DGameRewards = {
    addCredits,
    updateBadge(){ /* optional no-op */ }
  };
})();