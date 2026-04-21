window.GV = {
  params: new URLSearchParams(location.search),
  isBonus() { return this.params.get('nfc') === '1' || localStorage.getItem('gv_bonus') === '1'; },
  setReward(key, value='1'){ localStorage.setItem('gv_reward_'+key, value); },
  getReward(key){ return localStorage.getItem('gv_reward_'+key); },
  enableBonus(){ localStorage.setItem('gv_bonus','1'); }
};

if (GV.params.get('nfc') === '1') GV.enableBonus();

(function(){
  const PASS_KEY = "play3d_vault_pass_v1";
  const path = (location.pathname || "").toLowerCase();
  const file = path.split("/").pop() || "";

  // Pages that should stay public / reachable without a pass
  const publicPages = new Set([
    "",
    "index.html",
    "scan.html",
    "logout.html"
  ]);

  function loadPass(){
    try{
      const raw = localStorage.getItem(PASS_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      return null;
    }
  }

  function passIsValid(pass){
    if(!pass) return false;
    if(!pass.expires_at) return false;
    const expiry = new Date(pass.expires_at).getTime();
    if(!expiry || Number.isNaN(expiry)) return false;
    return expiry > Date.now();
  }

  function clearExpiredPass(){
    const pass = loadPass();
    if(pass && !passIsValid(pass)){
      localStorage.removeItem(PASS_KEY);
    }
  }

  function isProtectedRoomPage(){
    if(!path.includes("/nfc/")) return false;
    if(publicPages.has(file)) return false;
    if(file.endsWith(".css") || file.endsWith(".js") || file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg") || file.endsWith(".webp")) return false;
    return file.endsWith(".html");
  }

  function goToSecureEntry(){
    location.href = "/public/redeem/";
  }

  clearExpiredPass();

  if(isProtectedRoomPage()){
    const pass = loadPass();
    if(!passIsValid(pass)){
      goToSecureEntry();
      return;
    }

    // If a valid pass exists, preserve bonus mode for older page logic
    GV.enableBonus();
    localStorage.setItem("gv_pass_tier", String(pass.tier || "").toUpperCase());
    localStorage.setItem("gv_pass_route", String(pass.route || ""));
    localStorage.setItem("gv_pass_expiry", String(pass.expires_at || ""));
  }
})();
