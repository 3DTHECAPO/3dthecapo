(function(){
  const MEMBER_KEY = 'play3d_member_v1';
  const PAID_MEMBER_KEY = 'play3d_paid_member_v1';
  const MEMBER_ID_KEY = 'play3d_member_id_v1';
  const MEMBER_EMAIL_KEY = 'play3d_member_email_v1';
  const MEMBER_PROFILE_KEY = 'play3d_member_profile_v1';
  const BANK_KEY = 'play3d_global_bank_v1';
  const LEGACY_BANK_KEY = 'play3d_game_bank_v1';
  const POINTS_KEY = 'play3d_game_points_v1';
  const PASS_KEY = 'play3d_vault_pass_v1';

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  function writeJSON(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeEmail(email){
    return String(email || '').trim().toLowerCase();
  }

  function readVaultPass(){
    return readJSON(PASS_KEY, null);
  }

  function hasActivePass(){
    try{
      const pass = readVaultPass();
      if(!pass || !pass.expires_at) return false;
      const expires = new Date(pass.expires_at).getTime();
      return Number.isFinite(expires) && expires > Date.now();
    }catch(e){
      return false;
    }
  }

  function hasMasterSession(){
    return !!(window.Play3DAccess && window.Play3DAccess.hasMasterSession && window.Play3DAccess.hasMasterSession());
  }

  function makeMemberId(){
    const existing = localStorage.getItem(MEMBER_ID_KEY);
    if(existing) return existing;
    const stamp = Date.now().toString().slice(-6);
    const rand = Math.random().toString(36).slice(2,5).toUpperCase();
    return 'P3D-' + stamp + rand;
  }

  function getMemberProfile(){
    const profile = readJSON(MEMBER_PROFILE_KEY, {});
    return profile && typeof profile === 'object' ? profile : {};
  }

  function saveMemberProfile(profile){
    const next = Object.assign({}, getMemberProfile(), profile || {}, { updated_at:new Date().toISOString() });
    writeJSON(MEMBER_PROFILE_KEY, next);
    if(next.member_id) localStorage.setItem(MEMBER_ID_KEY, String(next.member_id));
    if(next.email) localStorage.setItem(MEMBER_EMAIL_KEY, normalizeEmail(next.email));
    return next;
  }

  function isPaidMember(){
    return localStorage.getItem(PAID_MEMBER_KEY) === '1' || localStorage.getItem(MEMBER_KEY) === '1';
  }

  function isMember(){
    // Master session can view/admin rewards, but normal ENTRY vault passes are visitor access only.
    if(hasMasterSession()) return true;
    return isPaidMember();
  }

  function hasAccess(){
    return isMember() || hasActivePass();
  }

  function setMember(val, profile){
    // This is now PAID REGISTRATION ONLY. Do not call this from 1-hour ENTRY access.
    const enabled = !!val;
    localStorage.setItem(MEMBER_KEY, enabled ? '1' : '0');
    localStorage.setItem(PAID_MEMBER_KEY, enabled ? '1' : '0');
    if(enabled){
      const pass = readVaultPass() || {};
      const memberId = (profile && profile.member_id) || localStorage.getItem(MEMBER_ID_KEY) || makeMemberId();
      const email = normalizeEmail((profile && profile.email) || localStorage.getItem(MEMBER_EMAIL_KEY) || pass.email || pass.recipient_email || pass.recipientEmail || '');
      saveMemberProfile({
        member_id: memberId,
        email,
        tier: (profile && profile.tier) || pass.tier || 'member',
        source: (profile && profile.source) || 'paid_registration',
        paid_registration:true,
        activated_at: (profile && profile.activated_at) || new Date().toISOString()
      });
    }
  }

  function activatePaidMember(profile){
    setMember(true, Object.assign({source:'paid_registration'}, profile || {}));
    return getMemberProfile();
  }

  function deactivateMember(){
    localStorage.setItem(MEMBER_KEY, '0');
    localStorage.setItem(PAID_MEMBER_KEY, '0');
  }

  function getCreditBank(){
    const primary = Number(localStorage.getItem(BANK_KEY) || 0);
    const legacy = Number(localStorage.getItem(LEGACY_BANK_KEY) || 0);
    const safe = Math.max(0, Math.floor(Number.isFinite(primary) ? primary : 0), Math.floor(Number.isFinite(legacy) ? legacy : 0));
    if(String(primary) !== String(safe)) localStorage.setItem(BANK_KEY, String(safe));
    if(String(legacy) !== String(safe)) localStorage.setItem(LEGACY_BANK_KEY, String(safe));
    return safe;
  }

  function getPoints(){
    return Math.max(0, Math.floor(Number(localStorage.getItem(POINTS_KEY) || 0)));
  }

  function addCredits(amount){
    const safe = Math.max(0, Math.floor(Number(amount) || 0));
    const next = getCreditBank() + safe;
    localStorage.setItem(BANK_KEY, String(next));
    localStorage.setItem(LEGACY_BANK_KEY, String(next));
    return next;
  }

  function addPoints(amount){
    const safe = Math.max(0, Math.floor(Number(amount) || 0));
    const next = getPoints() + safe;
    localStorage.setItem(POINTS_KEY, String(next));
    return next;
  }

  function identity(){
    const pass = readVaultPass() || {};
    const profile = getMemberProfile();
    return {
      paidMember:isPaidMember(),
      member:isMember(),
      visitorAccess:hasActivePass() && !isPaidMember(),
      hasVaultPass:hasActivePass(),
      memberId: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      email: normalizeEmail(profile.email || localStorage.getItem(MEMBER_EMAIL_KEY) || pass.email || pass.recipient_email || pass.recipientEmail || ''),
      code: pass.code || '',
      tier: profile.tier || pass.tier || '',
      paidRegistration: !!profile.paid_registration || isPaidMember()
    };
  }

  function tierInfo(){
    const id = identity();
    if(isMember()){
      return { rewardsEnabled:true, label:'PAID MEMBER', identity:id };
    }
    if(hasActivePass()){
      return { rewardsEnabled:false, label:'Visitor Access — paid registration required for rewards.', identity:id };
    }
    return { rewardsEnabled:false, label:'Free Play — paid registration required for rewards.', identity:id };
  }

  window.Play3DMemberSystem = {
    isMember,
    isPaidMember,
    hasAccess,
    hasActivePass,
    setMember,
    activatePaidMember,
    deactivateMember,
    getMemberProfile,
    saveMemberProfile,
    identity,
    getCreditBank,
    addCredits,
    getPoints,
    addPoints,
    tierInfo,
    keys:{
      MEMBER_KEY,
      PAID_MEMBER_KEY,
      MEMBER_ID_KEY,
      MEMBER_EMAIL_KEY,
      MEMBER_PROFILE_KEY,
      BANK_KEY,
      LEGACY_BANK_KEY,
      POINTS_KEY,
      PASS_KEY
    }
  };
})();
