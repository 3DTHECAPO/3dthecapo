(function(){
  const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  const MEMBERS_TABLE = 'members';
  // 2026-11-11: the member row comes from the server (member_sync), which needs the fan's vault code and the
  // e-mail it was sent to. The browser no longer reads or updates the members table itself.
  const BACKEND_URL = `${SUPABASE_URL}/functions/v1/dynamic-endpoint`;

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

  function isRealMemberNumber(value){
    return /^MEM-\d{6,}$/i.test(String(value || '').trim());
  }

  function publicMemberNumber(profile, pass){
    const real = (profile && profile.member_number) || (pass && pass.member_number) || '';
    if(isRealMemberNumber(real)) return String(real).trim().toUpperCase();
    const local = (profile && profile.member_id) || localStorage.getItem(MEMBER_ID_KEY) || '';
    return local || null;
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

  function passDurationMs(pass){
    const raw = String((pass && pass.duration) || '').trim().toLowerCase();
    const units = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return Object.prototype.hasOwnProperty.call(units, raw) ? units[raw] : null;
  }

  function isRewardPass(){
    const pass = readVaultPass();
    if(!hasActivePass()) return false;

    const duration = String((pass && pass.duration) || '').trim().toLowerCase();
    if(['promo','free','trial','1h'].includes(duration)) return false;
    if(duration && duration !== 'none') return true;
    if(duration === 'none') return true;

    const tier = String((pass && (pass.tier || pass.code_type || pass.level)) || '').trim().toUpperCase();
    if(['GOLD','ELITE','MASTER','MEMBER','PAID'].includes(tier)) return true;

    const expires = new Date(pass.expires_at).getTime();
    const remaining = expires - Date.now();
    const knownDuration = passDurationMs(pass);
    if(knownDuration !== null) return knownDuration > (2 * 60 * 60 * 1000);
    return Number.isFinite(remaining) && remaining > (2 * 60 * 60 * 1000);
  }

  function hasMasterSession(){
    return !!(window.Play3DAccess && window.Play3DAccess.hasMasterSession && window.Play3DAccess.hasMasterSession());
  }

  function statusIsActive(status){
    const value = String(status || '').trim().toUpperCase();
    return ['ACTIVE','PAID','MEMBER','APPROVED','CURRENT'].includes(value);
  }

  function normalizeMemberRow(row){
    if(!row || typeof row !== 'object') return null;
    return {
      id: row.id || row.ID || row.member_id || row.MEMBER_ID || '',
      member_number: row.member_number || row.MEMBER_NUMBER || '',
      email: normalizeEmail(row.email || row.EMAIL || ''),
      name: row.name || row.NAME || '',
      member_status: row.member_status || row.MEMBER_STATUS || '',
      tier: row.tier || row.TIER || 'MEMBER',
      source: row.source || row.SOURCE || 'members_table',
      created_at: row.created_at || row.CREATED_AT || '',
      last_seen_at: row.last_seen_at || row.LAST_SEEN_AT || ''
    };
  }

  // Exact, case-insensitive email match. Wildcards (% * _) must not match other members.
  function emailPattern(email){
    const clean = normalizeEmail(email);
    if(!clean || /[%*\s]/.test(clean) || !/^[^@]+@[^@]+\.[^@]+$/.test(clean)) return null;
    return clean.replace(/_/g, '\\_');
  }

  function passCode(){
    const pass = readVaultPass() || {};
    return String(pass.code || '').trim().toUpperCase();
  }

  // Returns {status:'found', member} | {status:'not_found'} | {status:'not_verified'} (no code, wrong code, or offline).
  async function lookupMember(email, code){
    const clean = emailPattern(email);
    const cleanCode = String(code || passCode()).trim().toUpperCase();
    if(!clean || !cleanCode) return { status:'not_verified' };
    try{
      const res = await fetch(BACKEND_URL, {
        method:'POST',
        headers:{
          'apikey':SUPABASE_ANON,
          'Authorization':`Bearer ${SUPABASE_ANON}`,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({ source:'member_sync', email:normalizeEmail(email), code:cleanCode })
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok && data && data.member) return { status:'found', member:normalizeMemberRow(data.member) };
      if(res.status === 404 && data && data.status === 'member_not_found') return { status:'not_found' };
    }catch(e){}
    return { status:'not_verified' };
  }

  async function fetchMemberByEmail(email, code){
    const result = await lookupMember(email, code);
    return result.status === 'found' ? result.member : null;
  }

  async function updateLastSeen(){
    // The server updates last_seen_at when it answers member_sync or records a win.
    return true;
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
    try{
      window.dispatchEvent(new CustomEvent('play3d:member-sync', { detail: next }));
    }catch(e){}
    return next;
  }

  function isPaidMember(){
    return localStorage.getItem(PAID_MEMBER_KEY) === '1' || localStorage.getItem(MEMBER_KEY) === '1';
  }

  function isMember(){
    if(hasMasterSession()) return true;
    return isPaidMember() || isRewardPass();
  }

  function hasAccess(){
    return isMember() || hasActivePass();
  }

  function setMember(val, profile){
    // Paid registration only. Do not call this from 1-hour ENTRY access.
    const enabled = !!val;
    localStorage.setItem(MEMBER_KEY, enabled ? '1' : '0');
    localStorage.setItem(PAID_MEMBER_KEY, enabled ? '1' : '0');

    if(enabled){
      const pass = readVaultPass() || {};
      const memberId = (profile && (profile.member_id || profile.id)) || localStorage.getItem(MEMBER_ID_KEY) || makeMemberId();
      const email = normalizeEmail((profile && profile.email) || localStorage.getItem(MEMBER_EMAIL_KEY) || pass.email || pass.recipient_email || pass.recipientEmail || '');
      saveMemberProfile({
        member_id: memberId,
        member_number: (profile && profile.member_number) || pass.member_number || '',
        email,
        name: (profile && profile.name) || '',
        tier: (profile && profile.tier) || pass.tier || 'MEMBER',
        source: (profile && profile.source) || 'paid_registration',
        member_status: (profile && profile.member_status) || 'ACTIVE',
        paid_registration:true,
        activated_at: (profile && profile.activated_at) || new Date().toISOString()
      });
    }
  }

  function activatePaidMember(profile){
    setMember(true, Object.assign({source:'paid_registration', member_status:'ACTIVE'}, profile || {}));
    return getMemberProfile();
  }

  function deactivateMember(){
    localStorage.setItem(MEMBER_KEY, '0');
    localStorage.setItem(PAID_MEMBER_KEY, '0');
  }

  async function syncMemberFromSupabase(email){
    const clean = normalizeEmail(email || localStorage.getItem(MEMBER_EMAIL_KEY) || (readVaultPass() || {}).email || (readVaultPass() || {}).recipient_email || '');
    if(!clean) return { ok:false, reason:'missing_email' };

    const lookup = await lookupMember(clean);
    if(lookup.status === 'not_verified'){
      // No vault code on this device, a code for another e-mail, or offline: leave things as they are.
      return { ok:false, reason:'not_verified' };
    }
    const row = lookup.status === 'found' ? lookup.member : null;
    if(!row) {
      deactivateMember();
      return { ok:false, reason:'not_found' };
    }

    if(!statusIsActive(row.member_status)){
      deactivateMember();
      saveMemberProfile({
        member_id: row.id,
        member_number: row.member_number,
        email: row.email,
        name: row.name,
        tier: row.tier,
        source: row.source,
        member_status: row.member_status,
        paid_registration:false
      });
      return { ok:false, reason:'not_active', member:row };
    }

    activatePaidMember({
      member_id: row.id,
      member_number: row.member_number,
      email: row.email,
      name: row.name,
      tier: row.tier,
      source: row.source,
      member_status: row.member_status,
      paid_registration:true
    });

    return { ok:true, member:row };
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
    const visibleNumber = publicMemberNumber(profile, pass);
    const realNumber = isRealMemberNumber(profile.member_number) ? String(profile.member_number).trim().toUpperCase()
      : isRealMemberNumber(pass.member_number) ? String(pass.member_number).trim().toUpperCase()
      : null;
    return {
      paidMember:isPaidMember(),
      member:isMember(),
      visitorAccess:hasActivePass() && !isPaidMember(),
      rewardPass:isRewardPass(),
      passHolder:isRewardPass(),
      hasVaultPass:hasActivePass(),
      memberId: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      member_id: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      memberTableId: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      member_table_id: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      memberNumber: realNumber || visibleNumber,
      member_number: realNumber || visibleNumber,
      realMemberNumber: realNumber,
      real_member_number: realNumber,
      email: normalizeEmail(profile.email || localStorage.getItem(MEMBER_EMAIL_KEY) || pass.email || pass.recipient_email || pass.recipientEmail || ''),
      code: pass.code || '',
      tier: profile.tier || pass.tier || '',
      memberStatus: profile.member_status || '',
      paidRegistration: !!profile.paid_registration || isPaidMember(),
      rewardEligible: isMember()
    };
  }

  function tierInfo(){
    const id = identity();
    if(isMember()) return { rewardsEnabled:true, label:'PAID MEMBER', identity:id };
    if(hasActivePass()) return { rewardsEnabled:false, label:'Visitor Access — paid registration required for rewards.', identity:id };
    return { rewardsEnabled:false, label:'Free Play — paid registration required for rewards.', identity:id };
  }

  function bootstrap(){
    const pass = readVaultPass() || {};
    const email = normalizeEmail(localStorage.getItem(MEMBER_EMAIL_KEY) || pass.email || pass.recipient_email || pass.recipientEmail || '');
    if(email) syncMemberFromSupabase(email).catch(()=>{});
  }

  window.Play3DMemberSystem = {
    isMember,
    isPaidMember,
    hasAccess,
    hasActivePass,
    isRewardPass,
    setMember,
    activatePaidMember,
    deactivateMember,
    syncMemberFromSupabase,
    fetchMemberByEmail,
    updateLastSeen,
    getMemberProfile,
    saveMemberProfile,
    identity,
    isRealMemberNumber,
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

  bootstrap();
})();
