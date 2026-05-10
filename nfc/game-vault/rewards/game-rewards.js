(function(){
  const REWARD_EVENTS_TABLE = 'reward_events';
  const PASS_KEY = 'play3d_vault_pass_v1';
  const MEMBER_KEY = 'play3d_member_v1';

  function readVaultPass(){
    try{
      const raw = localStorage.getItem(PASS_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      return null;
    }
  }

  function hasActivePass(pass){
    if(!pass || !pass.expires_at) return false;
    const expires = new Date(pass.expires_at).getTime();
    return Number.isFinite(expires) && expires > Date.now();
  }

  function getRewardIdentity(){
    const pass = readVaultPass();
    const activePass = hasActivePass(pass);

    return {
      memberLocal: localStorage.getItem(MEMBER_KEY) === '1',
      hasVaultPass: activePass,
      memberId: pass && (pass.member_id || pass.memberId || pass.user_id || pass.userId) || null,
      email: pass && (pass.email || pass.recipient_email || pass.recipientEmail) || null,
      code: pass && pass.code || '',
      tier: pass && pass.tier || ''
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
        member_local: identity.memberLocal,
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
      return { free:true, unlocked:false, bank:0 };
    }
    if(!Play3DMemberSystem.isMember()){
      return { free:true, unlocked:false, bank:Play3DMemberSystem.getCreditBank() };
    }
    const bank = Play3DMemberSystem.addCredits(amount);
    logRewardEvent(amount, game, bank);
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
