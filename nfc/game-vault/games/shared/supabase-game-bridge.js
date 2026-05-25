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

  const playerIdKey = 'play3d_player_id';
  let playerId = localStorage.getItem(playerIdKey);
  if(!playerId){
    playerId = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(playerIdKey, playerId);
  }

  function getClient(){
    return window.PLAY3D_SUPABASE || window.supabaseClient || window.supabase || null;
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
    eventCallbacks:{}
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
    const client = getClient();
    if(!client || typeof client.channel !== 'function'){
      console.warn('[PLAY3D_SYNC] Supabase client not found. Room link active, live sync disabled.');
      return null;
    }

    if(state.channel) return state.channel;

    const channel = client.channel(channelName(), {
      config:{broadcast:{self:false}, presence:{key:playerId}}
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
        channel.track({playerId, game, room, joinedAt:new Date().toISOString()});
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
    ensureChannel
  };
  window.Play3DGameSync = window.PLAY3D_SYNC;

  ensureChannel();
})();
