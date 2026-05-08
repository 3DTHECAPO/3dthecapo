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
    moveCallbacks:[],
    eventCallbacks:{}
  };

  async function ensureChannel(){
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

  ensureChannel();
})();
