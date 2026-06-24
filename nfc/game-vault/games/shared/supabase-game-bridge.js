/*
PLAY 3D Supabase Game Bridge V10
Non-visual multiplayer bridge.

Expected URL:
  ?mode=fan&room=ROOMCODE

Uses whichever global Supabase client already exists:
  window.PLAY3D_SUPABASE
  window.supabaseClient
  window.supabase

API:
  window.PLAY3D_SYNC.sendMove(payload)
  window.PLAY3D_SYNC.onMove(callback)
  window.PLAY3D_SYNC.sendGameEvent(type, payload)
  window.PLAY3D_SYNC.onGameEvent(type, callback)
*/

(function(){
  'use strict';

  const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
  const SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  const room = params.get('room');

  const inactive = {
    enabled:false,
    room:null,
    game:null,
    playerId:null,
    connected:false,
    sendMove(){ return Promise.resolve({skipped:true, reason:'not in fan mode'}); },
    onMove(){ return function noop(){}; },
    sendGameEvent(){ return Promise.resolve({skipped:true, reason:'not in fan mode'}); },
    onGameEvent(){ return function noop(){}; }
  };

  if(mode !== 'fan' || !room){
    window.PLAY3D_ROOM = null;
    window.PLAY3D_SYNC = inactive;
    window.Play3DGameSync = inactive;
    return;
  }

  const parts = location.pathname.split('/').filter(Boolean);
  const game = parts[parts.length - 2] || parts[parts.length - 1] || 'unknown';

  const playerIdKey = 'play3d_player_id__' + game + '__' + room;
  let playerId = sessionStorage.getItem(playerIdKey) || localStorage.getItem(playerIdKey);
  if(!playerId){
    playerId = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try{ sessionStorage.setItem(playerIdKey, playerId); }catch(_e){}
    try{ localStorage.setItem(playerIdKey, playerId); }catch(_e){}
  }

  let supabaseClientPromise = null;

  function loadSupabaseJs(){
    if(window.supabase && typeof window.supabase.createClient === 'function'){
      return Promise.resolve(window.supabase);
    }
    if(supabaseClientPromise) return supabaseClientPromise;
    supabaseClientPromise = new Promise((resolve, reject)=>{
      const existing = document.querySelector('script[data-play3d-supabase-js="true"]');
      if(existing){
        existing.addEventListener('load',()=>resolve(window.supabase),{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script = document.createElement('script');
      script.src = SUPABASE_JS_URL;
      script.async = true;
      script.setAttribute('data-play3d-supabase-js','true');
      script.onload = ()=>resolve(window.supabase);
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return supabaseClientPromise;
  }

  async function getClient(){
    const existing = window.PLAY3D_SUPABASE || window.supabaseClient;
    if(existing && typeof existing.channel === 'function') return existing;

    if(window.supabase && typeof window.supabase.channel === 'function'){
      return window.supabase;
    }

    const sdk = await loadSupabaseJs().catch(error=>{
      console.error('[PLAY3D_SYNC] Supabase JS load failed', error);
      return null;
    });

    if(sdk && typeof sdk.createClient === 'function'){
      window.PLAY3D_SUPABASE = sdk.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth:{persistSession:false, autoRefreshToken:false}
      });
      return window.PLAY3D_SUPABASE;
    }

    return null;
  }

  function channelName(){
    return 'play3d:' + game + ':' + room;
  }

  const state = {
    enabled:true,
    connected:false,
    game,
    room,
    playerId,
    channel:null,
    roomPersisted:false,
    moveCallbacks:[],
    eventCallbacks:{},
    presence:{},
    presenceCallbacks:[]
  };

  async function restInsert(table, payload, label){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{
        method:'POST',
        headers:{
          'apikey':SUPABASE_ANON,
          'Authorization':'Bearer '+SUPABASE_ANON,
          'Content-Type':'application/json',
          'Prefer':'return=minimal'
        },
        body:JSON.stringify(payload)
      });

      if(!res.ok){
        const text = await res.text().catch(()=>'');
        if(label === 'play3d_rooms insert' && (res.status === 409 || String(text).includes('23505'))){
          return true;
        }
        console.error('[PLAY3D_SYNC] '+label+' failed', text || res.status);
        return false;
      }

      return true;
    }catch(e){
      console.error('[PLAY3D_SYNC] '+label+' failed', e);
      return false;
    }
  }

  async function persistRoom(){
    if(state.roomPersisted) return true;
    const payload = {
      room_code:room,
      game,
      host_id:playerId,
      status:'open',
      state:{source:'supabase-game-bridge', mode:'fan', path:location.pathname},
      updated_at:new Date().toISOString()
    };
    const ok = await restInsert('play3d_rooms', payload, 'play3d_rooms insert');
    state.roomPersisted = ok;
    return ok;
  }

  function emitPresence(){
    const snapshot = Object.values(state.presence || {});
    state.presenceCallbacks.forEach(cb=>{
      try{ cb(snapshot); }catch(e){ console.error(e); }
    });
  }

  function upsertPresencePlayer(entry){
    if(!entry || !entry.playerId) return;
    state.presence[entry.playerId] = Object.assign({}, state.presence[entry.playerId] || {}, entry);
    emitPresence();
  }

  async function persistMove(msg){
    const payload = {
      room_code:room,
      game,
      player_id:playerId,
      event:{
        type:msg.type,
        payload:msg.payload,
        at:msg.at,
        room:msg.room,
        game:msg.game,
        playerId:msg.playerId
      }
    };
    return restInsert('play3d_moves', payload, 'play3d_moves insert');
  }

  async function ensureChannel(){
    persistRoom();
    const client = await getClient();
    if(!client || typeof client.channel !== 'function'){
      console.warn('[PLAY3D_SYNC] Supabase client not found. Room link active, live sync disabled.');
      return null;
    }

    if(state.channel) return state.channel;

    const channel = client.channel(channelName(), {
      config:{broadcast:{self:false}, presence:{key:playerId}}
    });

    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState ? channel.presenceState() : {};
      state.presence = {};
      Object.values(presenceState || {}).forEach(entries=>{
        (entries || []).forEach(entry=>{
          if(entry && entry.playerId){
            state.presence[entry.playerId] = Object.assign({}, entry);
          }
        });
      });
      emitPresence();
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      (newPresences || []).forEach(entry=> upsertPresencePlayer(entry));
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      (leftPresences || []).forEach(entry=>{
        if(entry && entry.playerId && state.presence[entry.playerId]){
          delete state.presence[entry.playerId];
        }
      });
      emitPresence();
    });

    channel.on('broadcast', {event:'move'}, payload=>{
      const msg = payload.payload;
      state.moveCallbacks.forEach(cb=>{
        try{ cb(msg); }catch(e){ console.error(e); }
      });
    });

    channel.on('broadcast', {event:'game_event'}, payload=>{
      const msg = payload.payload;
      const type = msg && msg.type;
      const callbacks = [
        ...(state.eventCallbacks['*'] || []),
        ...(state.eventCallbacks[type] || [])
      ];
      callbacks.forEach(cb=>{
        try{ cb(msg); }catch(e){ console.error(e); }
      });
    });

    channel.subscribe(status=>{
      state.connected = status === 'SUBSCRIBED';
      if(state.connected){
        channel.track({
          playerId,
          game,
          room,
          joinedAt:new Date().toISOString(),
          ready:false,
          role:'player'
        });
      }
    });

    state.channel = channel;
    return channel;
  }

  async function sendMove(payload){
    return sendGameEvent('move', payload, true);
  }

  async function sendGameEvent(type, payload, asMove){
    const channel = await ensureChannel();
    const msg = {
      type:type || 'event',
      game,
      room,
      playerId,
      at:new Date().toISOString(),
      payload
    };

    if(asMove) persistMove(msg);

    if(!channel){
      const queueKey = 'play3d_offline_events_' + game + '_' + room;
      const q = JSON.parse(localStorage.getItem(queueKey) || '[]');
      q.push(msg);
      localStorage.setItem(queueKey, JSON.stringify(q));
      return {queued:true, msg};
    }

    return channel.send({
      type:'broadcast',
      event: asMove ? 'move' : 'game_event',
      payload:msg
    });
  }

  function onMove(cb){
    state.moveCallbacks.push(cb);
    ensureChannel();
    return function unsubscribe(){
      state.moveCallbacks = state.moveCallbacks.filter(x=>x!==cb);
    };
  }

  function onGameEvent(type, cb){
    const key = type || '*';
    if(!state.eventCallbacks[key]) state.eventCallbacks[key] = [];
    state.eventCallbacks[key].push(cb);
    ensureChannel();
    return function unsubscribe(){
      state.eventCallbacks[key] = state.eventCallbacks[key].filter(x=>x!==cb);
    };
  }

  function onPresence(cb){
    state.presenceCallbacks.push(cb);
    ensureChannel();
    emitPresence();
    return function unsubscribe(){
      state.presenceCallbacks = state.presenceCallbacks.filter(x=>x!==cb);
    };
  }

  async function updatePresence(patch){
    const channel = await ensureChannel();
    if(!channel || typeof channel.track !== 'function') return {skipped:true};
    const current = state.presence[playerId] || {playerId, game, room};
    const next = Object.assign({}, current, patch || {}, {playerId, game, room, updatedAt:new Date().toISOString()});
    upsertPresencePlayer(next);
    return channel.track(next);
  }

  window.PLAY3D_ROOM = {game, room, playerId};
  window.PLAY3D_SYNC = {
    enabled:true,
    get connected(){ return state.connected; },
    room,
    game,
    playerId,
    sendMove,
    onMove,
    sendGameEvent,
    onGameEvent,
    onPresence,
    updatePresence,
    ensureChannel
  };
  window.Play3DGameSync = window.PLAY3D_SYNC;

  ensureChannel();
})();
