(function(){
  const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  const REWARD_EVENTS_TABLE = 'reward_events';
  const PASS_KEY = 'play3d_vault_pass_v1';

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  function readVaultPass(){
    return readJSON(PASS_KEY, null) || {};
  }

  function hasActivePass(pass){
    if(!pass || !pass.expires_at) return false;
    const expires = new Date(pass.expires_at).getTime();
    return Number.isFinite(expires) && expires > Date.now();
  }

  function getRewardIdentity(){
    const pass = readVaultPass();
    const sys = window.Play3DMemberSystem;
    const id = sys && sys.identity ? sys.identity() : {};
    const activePass = hasActivePass(pass);

    return {
      paidMember: !!id.paidMember,
      memberLocal: !!id.member,
      hasVaultPass: activePass,
      visitorAccess: activePass && !id.paidMember,
      memberId: id.memberId || null,
      memberNumber: id.memberNumber || id.member_number || null,
      email: id.email || pass.email || pass.recipient_email || pass.recipientEmail || null,
      code: pass.code || localStorage.getItem('play3d_last_code') || '',
      tier: id.tier || pass.tier || '',
      memberStatus: id.memberStatus || '',
      paidRegistration: !!id.paidRegistration
    };
  }

  function buildRewardEvent(amount, game, bank){
    const points = Math.max(0, Math.floor(Number(amount) || 0));
    const identity = getRewardIdentity();
    const now = new Date().toISOString();
    const clientEventId = [
      'reward',
      String(game || 'game'),
      String(points),
      String(Date.now()),
      Math.random().toString(36).slice(2, 8)
    ].join('_');

    const metadata = {
      member_table_id: identity.memberId,
      member_number: identity.memberNumber,
      email: identity.email,
      code: identity.code,
      tier: identity.tier,
      page: window.location.pathname,
      user_agent: navigator.userAgent,
      reward_status: 'earned',
      credits: points,
      client_event_id: clientEventId,
      bank_after: bank,
      paid_member: identity.paidMember,
      paid_registration: identity.paidRegistration,
      visitor_access: identity.visitorAccess,
      member_status: identity.memberStatus,
      has_vault_pass: identity.hasVaultPass,
      href: window.location.href
    };

    Object.keys(metadata).forEach(key => {
      if(metadata[key] === null || metadata[key] === undefined || metadata[key] === '') delete metadata[key];
    });

    return {
      event_type: 'game_win',
      source: 'game_vault',
      game: String(game || 'unknown'),
      points,
      reward_key: 'game_credit',
      created_at: now,
      metadata
    };
  }

  async function postRewardEvent(payload){
    payload = await resolveRewardMemberContext(payload);
    const attempts = [
      payload,
      {
        event_type: payload.event_type,
        game: payload.game,
        points: payload.points,
        created_at: payload.created_at
      }
    ];

    for(const body of attempts){
      try{
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${REWARD_EVENTS_TABLE}`,{
          method:'POST',
          headers:{
            'apikey':SUPABASE_ANON,
            'Authorization':`Bearer ${SUPABASE_ANON}`,
            'Content-Type':'application/json',
            'Prefer':'return=minimal'
          },
          body:JSON.stringify(body)
        });

        if(res.ok) return true;

        const text = await res.text().catch(()=>'');
        if(!/column|schema cache|PGRST204|Could not find/i.test(text)) return false;
      }catch(e){
        return false;
      }
    }

    return false;
  }

  async function resolveRewardMemberContext(payload){
    const metadata = Object.assign({}, payload.metadata || {});
    const memberNumber = String(metadata.member_number || '').trim();
    const email = String(metadata.email || '').trim().toLowerCase();
    if(!memberNumber && !email) return payload;

    try{
      const filter = memberNumber
        ? `member_number=eq.${encodeURIComponent(memberNumber)}`
        : `email=eq.${encodeURIComponent(email)}`;
      let rows = [];
      try{
        rows = await readMembers(`${filter}&select=id,member_number,email&limit=1`);
      }catch(e){
        if(memberNumber) return payload;
        rows = await readMembers(`${filter}&select=id,email&limit=1`);
      }
      const row = rows[0] || null;
      if(!row) return payload;
      metadata.member_table_id = row.id || metadata.member_table_id;
      metadata.member_number = row.member_number || metadata.member_number;
      metadata.email = row.email || metadata.email;
      return Object.assign({}, payload, {metadata});
    }catch(e){
      return payload;
    }
  }

  async function readMembers(query){
    const res = await fetch(`${SUPABASE_URL}/rest/v1/members?${query}`,{
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`
      }
    });
    if(!res.ok) throw new Error('members lookup failed');
    const rows = await res.json().catch(()=>[]);
    return Array.isArray(rows) ? rows : [];
  }

  function logRewardEvent(amount, game, bank){
    const payload = buildRewardEvent(amount, game, bank);
    postRewardEvent(payload).catch(()=>{});
  }

  function addCredits(amount, game){
    if(!window.Play3DMemberSystem){
      return { free:true, unlocked:false, bank:0, reason:'member_system_missing' };
    }

    // ENTRY / 1-hour vault pass is visitor access only.
    // Only paid members from the members table can earn claimable credits.
    if(!Play3DMemberSystem.isMember()){
      return {
        free:true,
        unlocked:false,
        bank:Play3DMemberSystem.getCreditBank(),
        reason: Play3DMemberSystem.hasActivePass && Play3DMemberSystem.hasActivePass()
          ? 'visitor_access_paid_registration_required'
          : 'paid_registration_required'
      };
    }

    const bank = Play3DMemberSystem.addCredits(amount);
    logRewardEvent(amount, game, bank);
    return {
      free:false,
      unlocked: bank >= 50000,
      bank,
      reason:'paid_member_reward_credit'
    };
  }

  window.Play3DGameRewards = {
    addCredits,
    updateBadge(){ /* optional no-op */ },
    getRewardIdentity
  };
})();
