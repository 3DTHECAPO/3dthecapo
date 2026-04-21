(function(){
  const KEY = "play3d_vault_pass_v1";
  const cfg = window.PLAY3D_SECURE_CONFIG || {};
  const hoursByTier = cfg.sessionHours || {};

  function now(){ return Date.now(); }

  function getHoursForTier(tier){
    const t = String(tier || "").toUpperCase();
    return Number(hoursByTier[t] || 24);
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      return null;
    }
  }

  function save(data){
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function clear(){
    localStorage.removeItem(KEY);
  }

  function create(payload){
    const tier = String(payload.tier || "").toUpperCase();
    const code = String(payload.code || "").toUpperCase();
    const route = payload.route || "";
    let expiresAt = payload.expires_at || null;

    if(expiresAt){
      expiresAt = new Date(expiresAt).toISOString();
    }else{
      const dt = new Date(now() + getHoursForTier(tier) * 60 * 60 * 1000);
      expiresAt = dt.toISOString();
    }

    const pass = {
      tier,
      code,
      route,
      created_at: new Date(now()).toISOString(),
      expires_at: expiresAt
    };
    save(pass);
    return pass;
  }

  function isValid(pass){
    if(!pass) return false;
    if(!pass.tier) return false;
    if(!pass.expires_at) return false;
    return new Date(pass.expires_at).getTime() > now();
  }

  function current(){
    const pass = load();
    if(!isValid(pass)){
      clear();
      return null;
    }
    return pass;
  }

  function requireAccess(opts){
    const pass = current();
    if(!pass){
      window.location.href = (opts && opts.redirect) || "/nfc/index.html";
      return null;
    }
    const needed = opts && opts.allowedTiers ? opts.allowedTiers.map(x => String(x).toUpperCase()) : [];
    if(needed.length && !needed.includes(pass.tier)){
      window.location.href = (opts && opts.redirect) || "/nfc/index.html";
      return null;
    }
    return pass;
  }

  function formatExpiry(pass){
    if(!pass || !pass.expires_at) return "";
    try{
      return new Date(pass.expires_at).toLocaleString();
    }catch(e){
      return pass.expires_at;
    }
  }

  window.Play3DPassSession = {
    create, clear, current, requireAccess, formatExpiry
  };
})();