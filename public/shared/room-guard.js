(function(){
  const DEFAULT_REDIRECT = "/public/redeem/";

  function session(){
    return window.Play3DPassSession || null;
  }

  function currentPass(){
    const api = session();
    return api && typeof api.current === "function" ? api.current() : null;
  }

  function hasTierAtLeast(requiredTier){
    const api = session();
    const pass = currentPass();
    if(!pass) return false;
    if(api && typeof api.hasTierAtLeast === "function"){
      return api.hasTierAtLeast(requiredTier, pass);
    }
    const ranks = { ENTRY:1, GOLD:2, ELITE:3, DROP:3, MERCH:3, MASTER:4 };
    const rank = tier => ranks[String(tier || "").toUpperCase()] || 0;
    return rank(pass.tier) >= rank(requiredTier);
  }

  function isMasterPass(){
    const api = session();
    if(api && typeof api.isMasterPass === "function") return api.isMasterPass();
    const pass = currentPass();
    return !!(pass && String(pass.tier || "").toUpperCase() === "MASTER");
  }

  function requireTier(requiredTier, opts){
    const redirect = opts && opts.redirect ? opts.redirect : DEFAULT_REDIRECT;
    if(!hasTierAtLeast(requiredTier)){
      location.replace(redirect);
      return null;
    }
    return currentPass();
  }

  function requireMaster(opts){
    const redirect = opts && opts.redirect ? opts.redirect : DEFAULT_REDIRECT;
    if(!isMasterPass()){
      location.replace(redirect);
      return null;
    }
    return currentPass();
  }

  function hasMemberOrPass(){
    try{
      if(localStorage.getItem("play3d_member_v1") === "1") return true;
    }catch(e){}
    return !!currentPass();
  }

  function requireMemberOrPass(opts){
    const redirect = opts && opts.redirect ? opts.redirect : "/nfc/scan.html";
    if(!hasMemberOrPass()){
      location.replace(redirect);
      return null;
    }
    return currentPass() || { tier:"MEMBER" };
  }

  window.Play3DRoomGuard = {
    currentPass,
    hasTierAtLeast,
    isMasterPass,
    requireTier,
    requireMaster,
    hasMemberOrPass,
    requireMemberOrPass
  };
})();
