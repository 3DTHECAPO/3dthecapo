(function(){
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
    return readJSON(PASS_KEY, null);
  }

  function hasActivePass(pass){
    if(!pass || !pass.expires_at) return false;
    const expires = new Date(pass.expires_at).getTime();
    return Number.isFinite(expires) && expires > Date.now();
  }

  function getRewardIdentity(){
    const pass = readVaultPass() || {};
    const activePass = hasActivePass(pass);
    const sys = window.Play3DMemberSystem;
    const id = sys && sys.identity ? sys.identity() : {};

    return {
      paidMember: !!id.paidMember,
      memberLocal: !!id.member,
      hasVaultPass: activePass,
      visitorAccess: activePass && !id.paidMember,
      memberId: id.memberId || null,
      email: id.email || pass.email || pass.recipient_email || pass.recipientEmail || null,
      code: pass.code || '',
      tier: id.tier || pass.tier || '',
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

    return {
      event_type: 'reward_credit',
      source: 'game_vault',
      game: String(game || 'unknown'),
      points,
      reward_key: 'game_credit',
      member_id: identity.memberId,
      email: identity.email,
      code: identity.code,
      tier: identity.tier,
      page: window.location.pathname,
      user_agent: navigator.userAgent,
      created_at: now,
      metadata: {
        client_event_id: clientEventId,
        bank_after: bank,
        paid_member: identity.paidMember,
        paid_registration: identity.paidRegistration,
        visitor_access: identity.visitorAccess,
        has_vault_pass: identity.hasVaultPass,
        href: window.location.href
      }
    };
  }

  async function postRewardEvent(payload){
    const cfg = window.PLAY3D_SECURE_CONFIG || {};
    if(!cfg.supabaseUrl || !cfg.supabaseAnonKey) return false;
    const attempts = [
      payload,
      {
        event_type: payload.event_type,
        source: payload.source,
        game: payload.game,
        points: payload.points,
        reward_key: payload.reward_key,
        member_id: payload.member_id,
        email: payload.email,
        code: payload.code,
        tier: payload.tier,
        created_at: payload.created_at
      },
      {
        event_type: payload.event_type,
        game: payload.game,
        points: payload.points,
        created_at: payload.created_at
      }
    ];

    for(const body of attempts){
      try{
        const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${REWARD_EVENTS_TABLE}`,{
          method:'POST',
          headers:{
            'apikey':cfg.supabaseAnonKey,
            'Authorization':`Bearer ${cfg.supabaseAnonKey}`,
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

  function logRewardEvent(amount, game, bank){
    const payload = buildRewardEvent(amount, game, bank);
    postRewardEvent(payload).catch(()=>{});
  }

  function addCredits(amount, game){
    if(!window.Play3DMemberSystem){
      return { free:true, unlocked:false, bank:0, reason:'member_system_missing' };
    }

    // 1-hour ENTRY / active vault pass is visitor access only.
    // Paid registration or master/admin session is required before credits become claimable.
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
