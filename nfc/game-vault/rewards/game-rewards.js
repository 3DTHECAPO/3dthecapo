(function(){
  function addCredits(amount){
    if(!window.Play3DMemberSystem){
      return {free:true, unlocked:false};
    }

    if(!Play3DMemberSystem.isMember()){
      return {free:true, unlocked:false};
    }

    const bank = Play3DMemberSystem.addCredits(amount);

    if(bank >= 50000){
      return {free:false, unlocked:true};
    }

    return {free:false, unlocked:false};
  }

  window.Play3DGameRewards = {
    addCredits
  };
})();