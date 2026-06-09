(function(){
  const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  const MEMBERS_TABLE = 'members';

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

  async function fetchMemberByEmail(email){
    const clean = normalizeEmail(email);
    if(!clean) return null;

    const tries = [
      `${SUPABASE_URL}/rest/v1/${MEMBERS_TABLE}?email=ilike.${encodeURIComponent(clean)}&select=*&limit=1`,
      `${SUPABASE_URL}/rest/v1/${MEMBERS_TABLE}?EMAIL=ilike.${encodeURIComponent(clean)}&select=*&limit=1`
    ];

    for(const url of tries){
      try{
        const res = await fetch(url, {
          headers:{
            'apikey':SUPABASE_ANON,
            'Authorization':`Bearer ${SUPABASE_ANON}`
          }
        });
        if(!res.ok) continue;
        const rows = await res.json().catch(()=>[]);
        if(Array.isArray(rows) && rows[0]) return normalizeMemberRow(rows[0]);
      }catch(e){}
    }

    return null;
  }

  async function updateLastSeen(email){
    const clean = normalizeEmail(email);
    if(!clean) return false;
    const now = new Date().toISOString();

    const attempts = [
      { filter:'email', body:{ last_seen_at: now } },
      { filter:'EMAIL', body:{ LAST_SEEN_AT: now } }
    ];

    for(const attempt of attempts){
      try{
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${MEMBERS_TABLE}?${attempt.filter}=ilike.${encodeURIComponent(clean)}`, {
          method:'PATCH',
          headers:{
            'apikey':SUPABASE_ANON,
            'Authorization':`Bearer ${SUPABASE_ANON}`,
            'Content-Type':'application/json',
            'Prefer':'return=minimal'
          },
          body:JSON.stringify(attempt.body)
        });
        if(res.ok) return true;
      }catch(e){}
    }

    return false;
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
    if(hasMasterSession()) return true;
    return isPaidMember();
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

    const row = await fetchMemberByEmail(clean);
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

    updateLastSeen(row.email).catch(()=>{});
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
    return {
      paidMember:isPaidMember(),
      member:isMember(),
      visitorAccess:hasActivePass() && !isPaidMember(),
      hasVaultPass:hasActivePass(),
      memberId: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      member_id: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      memberTableId: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      member_table_id: profile.member_id || localStorage.getItem(MEMBER_ID_KEY) || null,
      memberNumber: profile.member_number || pass.member_number || null,
      member_number: profile.member_number || pass.member_number || null,
      email: normalizeEmail(profile.email || localStorage.getItem(MEMBER_EMAIL_KEY) || pass.email || pass.recipient_email || pass.recipientEmail || ''),
      code: pass.code || '',
      tier: profile.tier || pass.tier || '',
      memberStatus: profile.member_status || '',
      paidRegistration: !!profile.paid_registration || isPaidMember()
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
    setMember,
    activatePaidMember,
    deactivateMember,
    syncMemberFromSupabase,
    fetchMemberByEmail,
    updateLastSeen,
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

  bootstrap();
})();
