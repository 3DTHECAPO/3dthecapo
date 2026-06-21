(function(){
  'use strict';

  var POINTS_KEY = 'play3d_game_points_v1';
  var HISTORY_KEY = 'play3d_game_points_history_v1';
  var PROFILE_KEY = 'play3d_player_profile_v1';
  var AWARD_LOG_KEY = 'play3d_game_points_award_log_v1';
  var MILESTONE_LOG_KEY = 'play3d_milestone_event_log_v1';
  var DAILY_EARN_KEY = 'play3d_game_points_daily_earn_v1';
  var SESSION_KEY = 'play3d_game_session_seen_v1';
  var SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  var REWARD_EVENTS_TABLE = 'reward_events';
  var REWARD_CLAIMS_TABLE = 'reward_claims';
  var THRESHOLD = 100000;
  var REWARD_MILESTONES = [100000,250000,400000,550000,700000,850000,1000000];
  var REWARD_MILESTONE_LABELS = {
    100000:'100K POINT REWARD',
    250000:'250K POINT REWARD',
    400000:'400K POINT REWARD',
    550000:'550K POINT REWARD',
    700000:'700K POINT REWARD',
    850000:'850K POINT REWARD',
    1000000:'1M POINT REWARD'
  };
  var TODAY = new Date().toISOString().slice(0, 10);
  var DAILY_REWARD_CAP = 2500;
  var DAILY_GAME_CAP = 1000;

  var RANKS = [
    {name:'BEGINNER', xp:0, points:0, wins:0, jackpots:0},
    {name:'HUSTLER', xp:500, points:1000, wins:3, jackpots:0},
    {name:'GRINDER', xp:1500, points:5000, wins:10, jackpots:0},
    {name:'HIGH ROLLER', xp:5000, points:25000, wins:25, jackpots:1},
    {name:'VAULT RUNNER', xp:12000, points:75000, wins:50, jackpots:2},
    {name:'BOSS', xp:30000, points:200000, wins:100, jackpots:5},
    {name:'CAPO ELITE', xp:75000, points:500000, wins:250, jackpots:10}
  ];

  var RARITY = {
    common:'Common',
    rare:'Rare',
    epic:'Epic',
    legendary:'Legendary',
    vault:'Vault Exclusive'
  };

  var ACHIEVEMENTS = [
    {id:'first_win', name:'First Win', test:function(p){ return p.totalWins >= 1; }},
    {id:'ten_wins', name:'10 Wins', test:function(p){ return p.totalWins >= 10; }},
    {id:'hundred_wins', name:'100 Wins', test:function(p){ return p.totalWins >= 100; }},
    {id:'first_jackpot', name:'First Jackpot', test:function(p){ return p.jackpotCount >= 1; }},
    {id:'points_100k', name:'100,000 Points', test:function(p){ return p.totalPoints >= THRESHOLD; }},
    {id:'member_unlock', name:'Member Unlock', test:function(p){ return !!p.member; }},
    {id:'login_streak_7', name:'7 Day Login Streak', test:function(p){ return p.streaks.login >= 7; }},
    {id:'win_streak_5', name:'5 Win Streak', test:function(p){ return p.streaks.win >= 5; }},
    {id:'jackpot_streak_2', name:'Back To Back Jackpots', test:function(p){ return p.streaks.jackpot >= 2; }},
    {id:'crew_ready', name:'Crew Ready', test:function(p){ return !!p.crew; }}
  ];

  function readJSON(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  function writeJSON(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }

  function daysBetween(a, b){
    var one = new Date(a + 'T00:00:00').getTime();
    var two = new Date(b + 'T00:00:00').getTime();
    return Math.round((two - one) / 86400000);
  }

  function levelTarget(level){
    if(level <= 1) return 100;
    if(level === 2) return 250;
    if(level === 3) return 500;
    return Math.floor(500 * Math.pow(1.42, level - 3));
  }

  function levelFromXP(xp){
    var level = 1;
    while(xp >= levelTarget(level) && level < 100) level++;
    return level;
  }

  function getPoints(){
    var value = Number(localStorage.getItem(POINTS_KEY) || 0);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  function setPoints(value){
    var next = Math.max(0, Math.floor(Number(value) || 0));
    try{ localStorage.setItem(POINTS_KEY, String(next)); }catch(e){}
    syncProfile(function(profile){ profile.totalPoints = next; });
    window.dispatchEvent(new CustomEvent('play3d:pointschange', {detail:getStatus()}));
    return next;
  }

  function getPassSession(){
    try{
      if(window.Play3DPassSession && typeof window.Play3DPassSession.current === 'function') return window.Play3DPassSession.current();
    }catch(e){}
    try{
      var raw = localStorage.getItem('play3d_vault_pass_v1');
      if(!raw) return null;
      var pass = JSON.parse(raw);
      if(!pass || !pass.expires_at) return null;
      return new Date(pass.expires_at).getTime() > Date.now() ? pass : null;
    }catch(e){ return null; }
  }

  function isMember(){
    if(localStorage.getItem('play3d_member_v1') === '1') return true;
    if(localStorage.getItem('play3d_paid_member_v1') === '1') return true;
    try{
      if(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.isPaidMember === 'function'){
        return !!window.Play3DMemberSystem.isPaidMember();
      }
    }catch(e){}
    return false;
  }

  function hasMasterSession(){
    try{
      if(window.Play3DAccess && typeof window.Play3DAccess.hasMasterSession === 'function'){
        return !!window.Play3DAccess.hasMasterSession();
      }
      var session = readJSON('CAPO_MASTER_SESSION', null);
      return !!(session && session.active === true && (!session.expires_at || Number(session.expires_at) > Date.now()));
    }catch(e){
      return false;
    }
  }

  function hasGameAccess(){
    return true;
  }

  function enforceGameAccess(){
    return true;
  }

  var GAME_ACCESS_ALLOWED = true;

  function defaultProfile(){
    return {
      version:1,
      playerName:'PLAY 3D PLAYER',
      rank:'BEGINNER',
      level:1,
      xp:0,
      totalPoints:getPoints(),
      totalWins:0,
      jackpotCount:0,
      gamesPlayed:0,
      games:{},
      streaks:{win:0,login:0,jackpot:0},
      bestStreaks:{win:0,login:0,jackpot:0},
      lastLoginDate:'',
      lastDailyClaim:'',
      member:isMember(),
      vaultTier:'FREE PLAY',
      crew:'Solo Crew',
      inventory:[
        {id:'starter_key', name:'Starter Key', type:'key', rarity:'common', count:1},
        {id:'vault_pass_slot', name:'Vault Pass Slot', type:'vault-pass', rarity:'vault', count:0},
        {id:'bonus_spin', name:'Bonus Spin', type:'bonus-spin', rarity:'rare', count:0},
        {id:'chain_case', name:'Chain Case', type:'chain', rarity:'epic', count:0},
        {id:'hoodie_case', name:'Hoodie Case', type:'hoodie', rarity:'rare', count:0},
        {id:'digital_collectible', name:'Digital Collectible Slot', type:'collectible', rarity:'legendary', count:0},
        {id:'badge_case', name:'Badge Case', type:'badge', rarity:'common', count:0}
      ],
      achievements:{},
      cooldowns:{}
    };
  }

  function normalizeProfile(raw){
    var p = Object.assign(defaultProfile(), raw || {});
    p.streaks = Object.assign({win:0,login:0,jackpot:0}, p.streaks || {});
    p.bestStreaks = Object.assign({win:0,login:0,jackpot:0}, p.bestStreaks || {});
    p.games = p.games || {};
    p.inventory = Array.isArray(p.inventory) ? p.inventory : defaultProfile().inventory;
    p.achievements = p.achievements || {};
    p.cooldowns = p.cooldowns || {};
    p.member = isMember();
    p.totalPoints = Math.max(getPoints(), Number(p.totalPoints) || 0);
    p.level = levelFromXP(Number(p.xp) || 0);
    p.rank = rankFor(p).name;
    p.vaultTier = p.member ? (p.rank === 'CAPO ELITE' ? 'CAPO ELITE' : 'MEMBER') : 'FREE PLAY';
    return p;
  }

  function getProfile(){
    return normalizeProfile(readJSON(PROFILE_KEY, null));
  }

  function saveProfile(profile){
    profile = normalizeProfile(profile);
    writeJSON(PROFILE_KEY, profile);
    window.dispatchEvent(new CustomEvent('play3d:profilechange', {detail:profile}));
    return profile;
  }

  function syncProfile(mutator){
    var profile = getProfile();
    mutator(profile);
    evaluateAchievements(profile);
    return saveProfile(profile);
  }

  function rankFor(profile){
    var current = RANKS[0];
    RANKS.forEach(function(rank){
      if(profile.xp >= rank.xp && profile.totalPoints >= rank.points && profile.totalWins >= rank.wins && profile.jackpotCount >= rank.jackpots) current = rank;
    });
    return current;
  }

  function nextRank(profile){
    var currentIndex = RANKS.findIndex(function(rank){ return rank.name === profile.rank; });
    return RANKS[Math.min(RANKS.length - 1, currentIndex + 1)] || RANKS[RANKS.length - 1];
  }

  function addInventoryItem(profile, item){
    var found = profile.inventory.find(function(x){ return x.id === item.id; });
    if(found) found.count += item.count || 1;
    else profile.inventory.push(Object.assign({count:1, rarity:'common'}, item));
  }

  function currentGameName(){
    var match = location.pathname.replace(/\\/g, '/').match(/\/games\/([^\/]+)/);
    return match && match[1] ? match[1] : 'global';
  }

  function cleanObject(obj){
    Object.keys(obj).forEach(function(key){
      if(obj[key] === null || obj[key] === undefined || obj[key] === '') delete obj[key];
    });
    return obj;
  }

  function fanRoomContext(){
    var params = new URLSearchParams(location.search);
    var mode = params.get('mode') || '';
    var room = params.get('room') || '';
    if(mode !== 'fan' && !room) return {};
    return cleanObject({
      mode:mode || 'fan',
      room_code:room,
      player_id:localStorage.getItem('play3d_player_id') || ''
    });
  }

  function milestoneEventKey(identity, milestone){
    var id = milestone && milestone.id ? String(milestone.id) : '';
    if(!id) return '';
    if(identity.member_number) return 'milestone:' + identity.member_number + ':' + id;
    if(identity.email) return 'milestone:' + identity.email + ':' + id;
    return '';
  }

  async function rewardEventExists(rewardCode){
    if(!rewardCode) return false;
    try{
      var response = await fetch(SUPABASE_URL + '/rest/v1/' + REWARD_EVENTS_TABLE + '?reward_code=eq.' + encodeURIComponent(rewardCode) + '&select=id&limit=1', {
        headers:{
          'apikey':SUPABASE_ANON,
          'Authorization':'Bearer ' + SUPABASE_ANON
        }
      });
      if(!response.ok) return false;
      var rows = await response.json().catch(function(){ return []; });
      return Array.isArray(rows) && rows.length > 0;
    }catch(e){
      return false;
    }
  }

  function buildMilestoneEvent(milestone, profile){
    var identity = rewardIdentity();
    var rewardCode = milestoneEventKey(identity, milestone);
    if(!rewardCode) return null;
    var metadata = cleanObject(Object.assign({
      event_name:'milestone_unlock',
      milestone_key:milestone.id,
      milestone_label:milestone.name,
      member_number:identity.member_number,
      member_table_id:identity.member_table_id,
      email:identity.email,
      game:currentGameName(),
      page:location.pathname,
      rank:profile && profile.rank,
      total_points:profile && profile.totalPoints,
      total_wins:profile && profile.totalWins,
      jackpot_count:profile && profile.jackpotCount
    }, fanRoomContext()));
    if(milestone.pointsRequired){
      metadata.points_required = milestone.pointsRequired;
      metadata.claim_status = 'pending_review';
    }

    return {
      member_id:identity.member_table_id || undefined,
      email:identity.email || undefined,
      reward_type:'bonus_content',
      reward_label:'milestone_unlock',
      reward_code:rewardCode,
      source:'game_vault_milestones',
      game:currentGameName(),
      credits:0,
      created_at:new Date().toISOString(),
      reward_metadata:metadata
    };
  }

  function buildMilestoneClaim(milestone){
    var gate = paidMemberEligibleIdentity();
    var identity = gate.identity;
    if(!gate.paid || !gate.hasIdentity || !milestone.pointsRequired) return null;
    return cleanObject({
      member_id:identity.member_table_id,
      member_number:identity.member_number,
      email:identity.email,
      points_required:milestone.pointsRequired,
      prize_name:milestone.name,
      claim_status:'pending_review',
      created_at:new Date().toISOString()
    });
  }

  async function milestoneClaimExists(milestone, identity){
    var filters = [];
    if(identity.member_table_id) filters.push('member_id=eq.' + encodeURIComponent(identity.member_table_id));
    else if(identity.member_number) filters.push('member_number=eq.' + encodeURIComponent(identity.member_number));
    else if(identity.email) filters.push('email=eq.' + encodeURIComponent(identity.email));
    if(!filters.length) return false;
    filters.push('points_required=eq.' + encodeURIComponent(milestone.pointsRequired));
    try{
      var response = await fetch(
        SUPABASE_URL + '/rest/v1/' + REWARD_CLAIMS_TABLE + '?' + filters.join('&') + '&select=id&limit=1',
        {headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer ' + SUPABASE_ANON}}
      );
      if(!response.ok) return false;
      var rows = await response.json().catch(function(){ return []; });
      return Array.isArray(rows) && rows.length > 0;
    }catch(e){
      return false;
    }
  }

  async function postMilestoneClaim(payload){
    var response = await fetch(SUPABASE_URL + '/rest/v1/' + REWARD_CLAIMS_TABLE, {
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':'Bearer ' + SUPABASE_ANON,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body:JSON.stringify(payload)
    });
    if(response.ok) return true;
    throw new Error(await response.text().catch(function(){ return String(response.status); }));
  }

  function logMilestoneUnlock(milestone, profile){
    var gate = paidMemberEligibleIdentity();
    if(!gate.paid || !gate.hasIdentity) return false;
    var payload = buildMilestoneEvent(milestone, profile);
    if(!payload) return false;
    var localLog = readJSON(MILESTONE_LOG_KEY, {});
    if(localLog[payload.reward_code]) return false;
    Promise.resolve()
      .then(function(){ return rewardEventExists(payload.reward_code); })
      .then(async function(eventExists){
        if(eventExists){
          localLog[payload.reward_code] = {at:new Date().toISOString(), milestone:milestone.id};
          writeJSON(MILESTONE_LOG_KEY, localLog);
          return false;
        }
        if(milestone.pointsRequired){
          var claimExists = await milestoneClaimExists(milestone, gate.identity);
          if(!claimExists){
            var claimPayload = buildMilestoneClaim(milestone);
            if(!claimPayload) return false;
            await postMilestoneClaim(claimPayload);
          }
        }
        var inserted = await postRewardEvent(payload);
        if(inserted){
          localLog[payload.reward_code] = {at:new Date().toISOString(), milestone:milestone.id};
          writeJSON(MILESTONE_LOG_KEY, localLog);
        }
        return inserted;
      })
      .catch(function(error){
        console.warn('PLAY 3D milestone claim/event logging failed', {payload:payload, error:error});
      });
    return true;
  }

  function evaluateRewardMilestones(previousTotal, total, profile){
    REWARD_MILESTONES.forEach(function(pointsRequired){
      if(previousTotal >= pointsRequired || total < pointsRequired) return;
      logMilestoneUnlock({
        id:'points_' + pointsRequired,
        name:REWARD_MILESTONE_LABELS[pointsRequired] || (pointsRequired.toLocaleString() + ' POINT REWARD'),
        pointsRequired:pointsRequired
      }, profile);
    });
  }

  function evaluateAchievements(profile){
    ACHIEVEMENTS.forEach(function(a){
      if(!profile.achievements[a.id] && a.test(profile)){
        profile.achievements[a.id] = {name:a.name, at:new Date().toISOString()};
        addInventoryItem(profile, {id:'badge_' + a.id, name:a.name + ' Badge', type:'badge', rarity:a.id.indexOf('jackpot') >= 0 ? 'legendary' : 'rare', count:1});
        logMilestoneUnlock(a, profile);
      }
    });
  }

  function claimDaily(){
    return syncProfile(function(profile){
      if(profile.lastDailyClaim === TODAY) return;
      var gap = profile.lastLoginDate ? daysBetween(profile.lastLoginDate, TODAY) : 1;
      profile.streaks.login = gap === 1 ? profile.streaks.login + 1 : 1;
      profile.bestStreaks.login = Math.max(profile.bestStreaks.login, profile.streaks.login);
      profile.lastLoginDate = TODAY;
      profile.lastDailyClaim = TODAY;
      var bonusXP = Math.min(250, 25 + profile.streaks.login * 10);
      profile.xp += bonusXP;
      if(profile.streaks.login % 5 === 0) addInventoryItem(profile, {id:'bonus_spin', name:'Bonus Spin', type:'bonus-spin', rarity:'rare', count:1});
    });
  }

  function markGameOpened(game){
    if(!game) return;
    var seen = readJSON(SESSION_KEY, {});
    var key = game + ':' + TODAY;
    if(seen[key]) return;
    seen[key] = true;
    writeJSON(SESSION_KEY, seen);
    syncProfile(function(profile){
      profile.gamesPlayed += 1;
      profile.games[game] = profile.games[game] || {played:0,wins:0,points:0,xp:0};
      profile.games[game].played += 1;
      profile.xp += 10;
    });
  }

  function isWinReason(reason){
    return /win|checkmate|round|contract|clear|jackpot|vault_pass/i.test(reason || '');
  }

  function dailyEarnState(){
    var state = readJSON(DAILY_EARN_KEY, null);
    if(!state || state.date !== TODAY){
      state = {date:TODAY, total:0, games:{}};
    }
    state.games = state.games || {};
    state.total = Math.max(0, Math.floor(Number(state.total) || 0));
    return state;
  }

  function applyDailyCaps(game, points){
    var state = dailyEarnState();
    var key = game || 'game';
    var gameTotal = Math.max(0, Math.floor(Number(state.games[key]) || 0));
    var totalLeft = Math.max(0, DAILY_REWARD_CAP - state.total);
    var gameLeft = Math.max(0, DAILY_GAME_CAP - gameTotal);
    var allowed = Math.max(0, Math.min(points, totalLeft, gameLeft));
    if(allowed > 0){
      state.total += allowed;
      state.games[key] = gameTotal + allowed;
      writeJSON(DAILY_EARN_KEY, state);
    }
    return allowed;
  }

  function rewardIdentity(){
    var pass = getPassSession() || {};
    var memberProfile = readJSON('play3d_member_profile_v1', {});
    var identity = {};
    try{
      if(window.Play3DMemberSystem && typeof window.Play3DMemberSystem.identity === 'function'){
        identity = window.Play3DMemberSystem.identity() || {};
      }
    }catch(e){}
    return {
      member_number:identity.memberNumber || identity.member_number || memberProfile.member_number || pass.member_number || '',
      member_table_id:identity.memberTableId || identity.member_table_id || identity.memberId || identity.member_id || memberProfile.member_id || memberProfile.id || pass.member_table_id || pass.member_id || '',
      email:identity.email || memberProfile.email || pass.email || pass.recipient_email || pass.recipientEmail || '',
      code:pass.code || localStorage.getItem('play3d_last_code') || '',
      tier:identity.tier || memberProfile.tier || pass.tier || pass.code_type || '',
      paidMember:!!(identity.paidMember || identity.paid_member || memberProfile.paid_registration),
      memberStatus:identity.memberStatus || identity.member_status || memberProfile.member_status || ''
    };
  }

  function displayMemberNumber(){
    var identity = rewardIdentity();
    var real = String(identity.real_member_number || identity.realMemberNumber || identity.member_number || '').trim();
    var status = String(identity.memberStatus || '').trim().toUpperCase();
    var activeStatus = ['ACTIVE','PAID','MEMBER','APPROVED','CURRENT'].indexOf(status) !== -1;
    if((identity.paidMember || activeStatus) && /^MEM-\d{6,}$/i.test(real)) return real.toUpperCase();
    return 'Member Pending';
  }

  function paidMemberEligibleIdentity(){
    var identity = rewardIdentity();
    var status = String(identity.memberStatus || '').trim().toUpperCase();
    var activeStatus = ['ACTIVE','PAID','MEMBER','APPROVED','CURRENT'].indexOf(status) !== -1;
    var paid = !!activeStatus;
    var hasIdentity = !!(identity.member_table_id || identity.member_number || identity.email);
    return { paid: paid, hasIdentity: hasIdentity, identity: identity };
  }

  function buildRewardEvent(points, game, reason, total){
    var identity = rewardIdentity();
    var rewardMetadata = {
      event_name:'game_win',
      member_number:identity.member_number,
      member_table_id:identity.member_table_id,
      email:identity.email,
      code:identity.code,
      tier:identity.tier,
      page:location.pathname,
      user_agent:navigator.userAgent,
      reason:reason || 'valid_win',
      reward_status:'earned',
      ledger_type:'progression',
      progression_points:points,
      progression_total:total,
      credit_effect:0
    };
    cleanObject(rewardMetadata);
    var rewardCode = ['game_win', String(game || 'game'), String(Date.now()), Math.random().toString(36).slice(2, 8)].join(':');
    rewardMetadata.reward_key = rewardCode;
    return {
      member_id:identity.member_table_id || undefined,
      email:identity.email || undefined,
      reward_type:'bonus_content',
      reward_label:'game_win',
      reward_code:rewardCode,
      source:'game_vault_shared',
      game:String(game || 'game'),
      credits:0,
      created_at:new Date().toISOString(),
      reward_metadata:rewardMetadata
    };
  }

  async function postRewardEvent(payload){
    var attempts = [
      payload,
      {
        member_id:payload.member_id,
        email:payload.email,
        reward_type:payload.reward_type,
        reward_label:payload.reward_label,
        reward_code:payload.reward_code,
        source:payload.source,
        game:payload.game,
        credits:payload.credits,
        created_at:payload.created_at
      },
      {
        member_id:payload.member_id,
        email:payload.email,
        reward_type:payload.reward_type,
        reward_label:payload.reward_label,
        source:payload.source,
        game:payload.game,
        credits:payload.credits,
        created_at:payload.created_at
      }
    ];
    for(var i = 0; i < attempts.length; i++){
      try{
        var response = await fetch(SUPABASE_URL + '/rest/v1/' + REWARD_EVENTS_TABLE, {
          method:'POST',
          headers:{
            'apikey':SUPABASE_ANON,
            'Authorization':'Bearer ' + SUPABASE_ANON,
            'Content-Type':'application/json',
            'Prefer':'return=minimal'
          },
          body:JSON.stringify(attempts[i])
        });
        if(response.ok) return true;
        console.warn('PLAY 3D reward_events insert failed', {
          attempt:i === 0 ? 'reward_metadata' : i === 1 ? 'without_reward_metadata' : 'without_reward_code',
          payload:attempts[i],
          error:await response.text().catch(function(){ return ''; })
        });
      }catch(error){
        console.warn('PLAY 3D reward_events request failed', {
          attempt:i === 0 ? 'reward_metadata' : i === 1 ? 'without_reward_metadata' : 'without_reward_code',
          payload:attempts[i],
          error:error
        });
      }
    }
    return false;
  }

  function logRewardEvent(points, game, reason, total){
    var gate = paidMemberEligibleIdentity();
    var identity = gate.identity;
    if(!gate.paid) return false;
    if(!gate.hasIdentity) return false;
    postRewardEvent(buildRewardEvent(points, game, reason, total)).catch(function(error){
      console.warn('PLAY 3D reward_events logging failed', error);
    });
    return true;
  }

  function award(game, points, reason){
    points = Math.max(0, Math.floor(Number(points) || 0));
    if(!points) return getStatus();
    var now = Date.now();
    var awardLog = readJSON(AWARD_LOG_KEY, {});
    var key = (game || 'game') + ':' + (reason || 'valid_win');
    var recent = (awardLog[key] || []).filter(function(t){ return now - t < 10 * 60 * 1000; });
    var factor = recent.length >= 6 ? 0.25 : recent.length >= 3 ? 0.5 : 1;
    points = Math.max(1, Math.floor(points * factor));
    points = applyDailyCaps(game || 'game', points);
    if(!points) return getStatus();
    recent.push(now);
    awardLog[key] = recent.slice(-10);
    writeJSON(AWARD_LOG_KEY, awardLog);
    var previousTotal = getPoints();
    var total = setPoints(previousTotal + points);
    var win = isWinReason(reason);
    var jackpot = /jackpot/i.test(reason || '');
    var xpGain = Math.max(5, Math.min(300, Math.floor(points * 0.65)));

    syncProfile(function(profile){
      profile.totalPoints = total;
      profile.games[game || 'game'] = profile.games[game || 'game'] || {played:0,wins:0,points:0,xp:0};
      profile.games[game || 'game'].points += points;
      profile.games[game || 'game'].xp += xpGain;
      profile.xp += xpGain;
      if(win){
        profile.totalWins += 1;
        profile.games[game || 'game'].wins += 1;
        profile.streaks.win += 1;
        profile.bestStreaks.win = Math.max(profile.bestStreaks.win, profile.streaks.win);
      }
      if(jackpot){
        profile.jackpotCount += 1;
        profile.streaks.jackpot += 1;
        profile.bestStreaks.jackpot = Math.max(profile.bestStreaks.jackpot, profile.streaks.jackpot);
        addInventoryItem(profile, {id:'jackpot_chain', name:'Jackpot Chain', type:'chain', rarity:'legendary', count:1});
      }else if(win){
        profile.streaks.jackpot = 0;
      }
      if(/vault_pass/i.test(reason || '')) addInventoryItem(profile, {id:'vault_pass_slot', name:'Vault Pass Slot', type:'vault-pass', rarity:'vault', count:1});
      if(profile.streaks.win > 0 && profile.streaks.win % 5 === 0) addInventoryItem(profile, {id:'win_streak_badge', name:'Win Streak Badge', type:'badge', rarity:'epic', count:1});
      evaluateRewardMilestones(previousTotal, total, profile);
    });

    var history = readJSON(HISTORY_KEY, []);
    history.push({at:new Date().toISOString(), game:game || 'game', points:points, xp:xpGain, reason:reason || 'valid_win', prizeEligible:paidMemberEligibleIdentity().paid});
    writeJSON(HISTORY_KEY, history.slice(-200));
    logRewardEvent(points, game, reason, total);
    return getStatus(total);
  }

  function getStatus(total){
    var points = typeof total === 'number' ? total : getPoints();
    var gate = paidMemberEligibleIdentity();
    return {points:points, threshold:THRESHOLD, remaining:Math.max(0, THRESHOLD - points), member:gate.paid, eligible:gate.paid && points >= THRESHOLD};
  }

  function claimHref(){
    var inGame = /\/games\//.test(location.pathname.replace(/\\/g, '/'));
    return (inGame ? '../../claim/index.html' : './claim/index.html') + '?source=game-points&threshold=' + THRESHOLD;
  }

  function injectProfileStyles(){
    if(document.getElementById('play3d-profile-style')) return;
    var style = document.createElement('style');
    style.id = 'play3d-profile-style';
    style.textContent =
      '.play3d-profile-panel,.play3d-points-panel{border:1px solid rgba(242,210,123,.28);border-radius:20px;background:linear-gradient(180deg,rgba(17,14,9,.86),rgba(0,0,0,.72));box-shadow:0 18px 50px rgba(0,0,0,.45);padding:12px;margin:12px 0;color:#f5efe3}' +
      '.play3d-profile-panel{display:grid;grid-template-columns:1.15fr 1fr;gap:12px;align-items:stretch}' +
      '.play3d-profile-panel span,.play3d-points-panel span{display:block;color:#f2d27b;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:900}' +
      '.play3d-profile-panel b,.play3d-points-panel b{display:block;color:#f5efe3;font-size:18px}' +
      '.play3d-profile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' +
      '.play3d-profile-stat{border:1px solid rgba(242,210,123,.18);border-radius:12px;background:rgba(0,0,0,.34);padding:8px}' +
      '.play3d-profile-stat.member-number{grid-column:span 2;border-color:rgba(242,210,123,.36);background:linear-gradient(180deg,rgba(242,210,123,.12),rgba(0,0,0,.38))}.play3d-profile-stat.member-number b{color:#f2d27b;letter-spacing:.08em}' +
      '.play3d-xp-track{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:8px 0}.play3d-xp-fill{height:100%;background:linear-gradient(90deg,#caa24a,#f2d27b);width:0%}' +
      '.play3d-inventory{display:flex;gap:6px;flex-wrap:wrap}.play3d-item{border:1px solid rgba(242,210,123,.22);border-radius:999px;padding:6px 8px;font-size:11px;font-weight:900;background:rgba(0,0,0,.35)}' +
      '.rarity-common{color:#f5efe3}.rarity-rare{color:#8fd7ff}.rarity-epic{color:#d7a1ff}.rarity-legendary{color:#f2d27b;text-shadow:0 0 12px rgba(242,210,123,.45)}.rarity-vault{color:#fff;text-shadow:0 0 14px rgba(242,210,123,.85)}' +
      '.play3d-profile-name{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.play3d-profile-name input{min-height:38px;border-radius:999px;border:1px solid rgba(242,210,123,.3);background:rgba(0,0,0,.45);color:#f5efe3;padding:8px 12px;font-weight:900}' +
      '@media(max-width:760px){.play3d-profile-panel{grid-template-columns:1fr}.play3d-profile-grid{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(style);
  }

  function renderProfilePanel(){
    var main = document.querySelector('main');
    if(!main || document.querySelector('.play3d-profile-panel')) return;
    injectProfileStyles();
    var panel = document.createElement('section');
    panel.className = 'play3d-profile-panel';
    panel.innerHTML =
      '<div>' +
        '<div class="play3d-profile-name"><span data-p3d-profile-label>Player Profile • Member Pending</span><input data-p3d-name maxlength="24" aria-label="Player name"></div>' +
        '<b data-p3d-rank>BEGINNER</b>' +
        '<div class="play3d-xp-track"><div class="play3d-xp-fill" data-p3d-xp-fill></div></div>' +
        '<small data-p3d-next-rank></small>' +
      '</div>' +
      '<div class="play3d-profile-grid">' +
        '<div class="play3d-profile-stat"><span>Level</span><b data-p3d-level>1</b></div>' +
        '<div class="play3d-profile-stat"><span>Wins</span><b data-p3d-wins>0</b></div>' +
        '<div class="play3d-profile-stat"><span>Streak</span><b data-p3d-streak>0</b></div>' +
        '<div class="play3d-profile-stat member-number"><span>Member #</span><b data-p3d-member-number>NOT SYNCED</b></div>' +
        '<div class="play3d-profile-stat"><span>Tier</span><b data-p3d-tier>FREE PLAY</b></div>' +
        '<div class="play3d-profile-stat"><span>Jackpots</span><b data-p3d-jackpots>0</b></div>' +
        '<div class="play3d-profile-stat"><span>Login</span><b data-p3d-login>0</b></div>' +
      '</div>' +
      '<div><span>Inventory</span><div class="play3d-inventory" data-p3d-inventory></div></div>';
    var modeBar = document.querySelector('.play3d-mode-bar');
    if(modeBar && modeBar.nextSibling) main.insertBefore(panel, modeBar.nextSibling);
    else main.insertBefore(panel, main.firstChild);
    panel.querySelector('[data-p3d-name]').addEventListener('change', function(e){
      syncProfile(function(profile){ profile.playerName = (e.target.value || 'PLAY 3D PLAYER').trim().slice(0, 24); });
    });
    updateProfilePanel();
  }

  function updateProfilePanel(){
    var profile = getProfile();
    var next = nextRank(profile);
    var target = levelTarget(profile.level);
    var prev = profile.level <= 1 ? 0 : levelTarget(profile.level - 1);
    var levelProgress = Math.max(0, Math.min(100, ((profile.xp - prev) / Math.max(1, target - prev)) * 100));
    var name = document.querySelector('[data-p3d-name]');
    if(name && name.value !== profile.playerName) name.value = profile.playerName;
    var rank = document.querySelector('[data-p3d-rank]');
    var level = document.querySelector('[data-p3d-level]');
    var wins = document.querySelector('[data-p3d-wins]');
    var streak = document.querySelector('[data-p3d-streak]');
    var profileLabel = document.querySelector('[data-p3d-profile-label]');
    var memberNumber = document.querySelector('[data-p3d-member-number]');
    var tier = document.querySelector('[data-p3d-tier]');
    var jackpots = document.querySelector('[data-p3d-jackpots]');
    var login = document.querySelector('[data-p3d-login]');
    var fill = document.querySelector('[data-p3d-xp-fill]');
    var nextRankNode = document.querySelector('[data-p3d-next-rank]');
    var inventory = document.querySelector('[data-p3d-inventory]');
    if(rank) rank.textContent = profile.rank;
    if(level) level.textContent = profile.level + ' / ' + target.toLocaleString() + ' XP';
    if(wins) wins.textContent = profile.totalWins.toLocaleString();
    if(streak) streak.textContent = profile.streaks.win.toLocaleString();
    var memberDisplay = displayMemberNumber();
    if(profileLabel) profileLabel.textContent = 'Player Profile • ' + memberDisplay;
    if(memberNumber) memberNumber.textContent = memberDisplay;
    if(tier) tier.textContent = profile.vaultTier;
    if(jackpots) jackpots.textContent = profile.jackpotCount.toLocaleString();
    if(login) login.textContent = profile.streaks.login.toLocaleString();
    if(fill) fill.style.width = levelProgress + '%';
    if(nextRankNode) nextRankNode.textContent = next.name === profile.rank ? 'Top rank reached.' : 'Next rank: ' + next.name + ' needs ' + Math.max(0, next.xp - profile.xp).toLocaleString() + ' XP, ' + Math.max(0, next.points - profile.totalPoints).toLocaleString() + ' points.';
    if(inventory){
      inventory.innerHTML = profile.inventory.filter(function(item){ return item.count > 0; }).slice(0, 7).map(function(item){
        return '<span class="play3d-item rarity-' + item.rarity + '">' + item.name + ' x' + item.count + ' · ' + (RARITY[item.rarity] || item.rarity) + '</span>';
      }).join('') || '<span class="play3d-item rarity-common">Starter inventory ready</span>';
    }
  }

  function renderPanel(){
    var main = document.querySelector('main');
    if(!main || document.querySelector('.play3d-points-panel')) return;
    injectProfileStyles();
    var panel = document.createElement('section');
    panel.className = 'play3d-points-panel';
    panel.innerHTML =
      '<div><span>Prize Points</span><b data-p3d-points>0 / 100,000</b><small data-p3d-prize-status>Free play only.</small></div>' +
      '<button type="button" data-p3d-claim>Member Prize Claim</button>';
    var profilePanel = document.querySelector('.play3d-profile-panel');
    if(profilePanel && profilePanel.nextSibling) main.insertBefore(panel, profilePanel.nextSibling);
    else main.insertBefore(panel, main.firstChild);
    panel.querySelector('[data-p3d-claim]').addEventListener('click', function(){
      var status = getStatus();
      if(status.eligible) location.href = claimHref();
      else panel.querySelector('[data-p3d-prize-status]').textContent = status.member ? 'Keep playing to reach 100,000 points.' : 'Member access required for prize claims.';
    });
    updatePanel();
  }

  function updatePanel(){
    var status = getStatus();
    var pointsNode = document.querySelector('[data-p3d-points]');
    var statusNode = document.querySelector('[data-p3d-prize-status]');
    var claimBtn = document.querySelector('[data-p3d-claim]');
    if(pointsNode) pointsNode.textContent = status.points.toLocaleString() + ' / ' + THRESHOLD.toLocaleString();
    if(statusNode){
      statusNode.textContent = status.eligible ? 'Member prize claim unlocked.' : status.member ? status.remaining.toLocaleString() + ' points to member prize play.' : 'Free play: points track locally, prizes require member access.';
    }
    if(claimBtn){
      claimBtn.disabled = !status.eligible;
      claimBtn.textContent = status.eligible ? 'Claim Prize' : (status.member ? '100,000 Points Required' : 'Member Prize Play');
    }
  }

  function boot(){
    if(!GAME_ACCESS_ALLOWED) return;
    claimDaily();
    renderProfilePanel();
    renderPanel();
    markGameOpened((location.pathname.match(/games\/([^\/]+)/) || [])[1]);
  }

  window.addEventListener('play3d:pointschange', function(){ updatePanel(); updateProfilePanel(); });
  window.addEventListener('play3d:profilechange', updateProfilePanel);
  window.addEventListener('play3d:member-sync', updateProfilePanel);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Play3DProfile = {
    ranks:RANKS,
    achievements:ACHIEVEMENTS,
    rarity:RARITY,
    levelTarget:levelTarget,
    get:getProfile,
    save:saveProfile,
    claimDaily:claimDaily,
    markGameOpened:markGameOpened,
    addInventoryItem:function(item){ return syncProfile(function(profile){ addInventoryItem(profile, item); }); },
    recordAward:award,
    render:updateProfilePanel
  };

  window.Play3DPoints = {
    threshold:THRESHOLD,
    milestones:REWARD_MILESTONES.slice(),
    getPoints:getPoints,
    setPoints:setPoints,
    award:award,
    isMember:isMember,
    getStatus:getStatus,
    claimHref:claimHref,
    renderPanel:renderPanel,
    updatePanel:updatePanel
  };
})();
