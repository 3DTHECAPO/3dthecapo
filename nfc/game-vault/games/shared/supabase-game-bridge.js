/*
PLAY 3D Supabase Game Bridge
Non-visual bridge. Does not change layout/background/CSS.

Needs your existing Supabase client config exposed as one of:
- window.supabaseClient
- window.supabase
- window.PLAY3D_SUPABASE

Expected URL:
  ?mode=fan&room=ROOMCODE

This bridge creates a common API:
  window.PLAY3D_ROOM
  window.PLAY3D_SYNC.sendMove(payload)
  window.PLAY3D_SYNC.onMove(callback)
*/

(function(){
  'use strict';

  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  const room = params.get('room');

  if(mode !== 'fan' || !room){
    window.PLAY3D_ROOM = null;
    window.PLAY3D_SYNC = {
      enabled:false,
      room:null,
      sendMove(){ return Promise.resolve({ skipped:true, reason:'not in fan mode' }); },
      onMove(){ return function noop(){}; }
    };
    return;
  }

  const game = location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || 'unknown';
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
    callbacks:[]
  };

  async function ensureChannel(){
    const client = getClient();
    if(!client || typeof client.channel !== 'function'){
      console.warn('[PLAY3D_SYNC] Supabase client not found. Room link active, live sync disabled.', {game, room});
      return null;
    }

    if(state.channel) return state.channel;

    const channel = client.channel(channelName(), {
      config:{ broadcast:{ self:false }, presence:{ key:playerId } }
    });

    channel.on('broadcast', { event:'move' }, payload=>{
      state.callbacks.forEach(cb=>{
        try{ cb(payload.payload); }catch(e){ console.error(e); }
      });
    });

    channel.subscribe(status=>{
      state.connected = status === 'SUBSCRIBED';
      if(state.connected){
        channel.track({ playerId, game, room, joinedAt: new Date().toISOString() });
      }
    });

    state.channel = channel;
    return channel;
  }

  async function sendMove(payload){
    const channel = await ensureChannel();
    const move = {
      game,
      room,
      playerId,
      at: new Date().toISOString(),
      payload
    };

    if(!channel){
      const queueKey = 'play3d_offline_moves_' + game + '_' + room;
      const q = JSON.parse(localStorage.getItem(queueKey) || '[]');
      q.push(move);
      localStorage.setItem(queueKey, JSON.stringify(q));
      return { queued:true, move };
    }

    return channel.send({
      type:'broadcast',
      event:'move',
      payload:move
    });
  }

  function onMove(cb){
    state.callbacks.push(cb);
    ensureChannel();
    return function unsubscribe(){
      state.callbacks = state.callbacks.filter(x=>x!==cb);
    };
  }

  window.PLAY3D_ROOM = { game, room, playerId };
  window.PLAY3D_SYNC = {
    enabled:true,
    get connected(){ return state.connected; },
    room,
    game,
    playerId,
    sendMove,
    onMove,
    ensureChannel
  };

  ensureChannel();
})();