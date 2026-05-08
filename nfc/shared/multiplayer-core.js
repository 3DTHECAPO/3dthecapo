/* PLAY 3D MULTIPLAYER CORE V1
   Universal room-code engine for all games.

   What it does:
   - create room code
   - join room code
   - player seat assignment
   - send game events
   - receive game events
   - local offline fallback

   Each game will call:
   Play3DMultiplayer.init({ game:"chess" })
   Play3DMultiplayer.sendMove({ type:"move", payload:{...} })
   Play3DMultiplayer.onMove(function(move){ ... })
*/
(function(){
  'use strict';

  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let state = {
    game: 'unknown',
    roomCode: '',
    playerId: '',
    playerName: '',
    seat: '',
    connected: false,
    online: false,
    listeners: [],
    channel: null,
    supabase: null
  };

  function makeId(prefix){
    return prefix + '-' + Math.random().toString(36).slice(2,10).toUpperCase();
  }

  function makeRoomCode(){
    let code = 'P3D-';
    for(let i=0;i<5;i++) code += alphabet[Math.floor(Math.random()*alphabet.length)];
    return code;
  }

  function getConfig(){
    return window.PLAY3D_MULTIPLAYER_CONFIG || {};
  }

  function isConfigured(){
    const cfg = getConfig();
    return !!(
      cfg.supabaseUrl &&
      cfg.supabaseAnonKey &&
      !cfg.supabaseUrl.includes('PASTE_') &&
      !cfg.supabaseAnonKey.includes('PASTE_')
    );
  }

  function loadSupabase(){
    return new Promise((resolve,reject)=>{
      if(window.supabase){
        resolve(window.supabase);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = ()=>resolve(window.supabase);
      s.onerror = ()=>reject(new Error('Supabase script failed to load'));
      document.head.appendChild(s);
    });
  }

  async function connectSupabase(){
    if(!isConfigured()) return null;
    const cfg = getConfig();
    const supaLib = await loadSupabase();
    state.supabase = supaLib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    state.online = true;
    return state.supabase;
  }

  async function createRoom(game){
    state.game = game || state.game;
    state.roomCode = makeRoomCode();
    state.playerId = state.playerId || makeId('PLAYER');
    state.playerName = state.playerName || 'Host';
    state.seat = 'host';

    try{
      const supa = await connectSupabase();
      if(supa){
        const cfg = getConfig();
        await supa.from(cfg.roomTable || 'play3d_rooms').insert({
          room_code: state.roomCode,
          game: state.game,
          host_id: state.playerId,
          status: 'open',
          created_at: new Date().toISOString(),
          state: {}
        });
        subscribeRoom();
      }
    }catch(e){
      console.warn('PLAY3D multiplayer online create failed, using local fallback:', e.message);
    }

    state.connected = true;
    saveState();
    emitStatus('Room created: ' + state.roomCode);
    return state.roomCode;
  }

  async function joinRoom(roomCode, game){
    state.game = game || state.game;
    state.roomCode = String(roomCode || '').trim().toUpperCase();
    state.playerId = state.playerId || makeId('PLAYER');
    state.playerName = state.playerName || 'Fan';
    state.seat = 'guest';

    try{
      const supa = await connectSupabase();
      if(supa){
        subscribeRoom();
        await sendMove({ type:'join', playerId:state.playerId, playerName:state.playerName, seat:state.seat });
      }
    }catch(e){
      console.warn('PLAY3D multiplayer online join failed, using local fallback:', e.message);
    }

    state.connected = true;
    saveState();
    emitStatus('Joined room: ' + state.roomCode);
    return state.roomCode;
  }

  function subscribeRoom(){
    if(!state.supabase || !state.roomCode) return;
    if(state.channel) state.supabase.removeChannel(state.channel);

    const cfg = getConfig();
    const moveTable = cfg.moveTable || 'play3d_moves';

    state.channel = state.supabase
      .channel('play3d-room-' + state.roomCode)
      .on(
        'postgres_changes',
        {
          event:'INSERT',
          schema:'public',
          table:moveTable,
          filter:'room_code=eq.' + state.roomCode
        },
        payload=>{
          const row = payload.new;
          if(row.player_id === state.playerId) return;
          notifyMove(row.event || row.move || row);
        }
      )
      .subscribe();
  }

  async function sendMove(event){
    const move = {
      room_code: state.roomCode,
      game: state.game,
      player_id: state.playerId,
      event: event,
      created_at: new Date().toISOString()
    };

    if(state.supabase && state.roomCode){
      try{
        const cfg = getConfig();
        await state.supabase.from(cfg.moveTable || 'play3d_moves').insert(move);
      }catch(e){
        console.warn('PLAY3D sendMove online failed:', e.message);
      }
    }

    // Local fallback event so same-device testing still works.
    try{
      localStorage.setItem('PLAY3D_MP_LAST_' + state.roomCode, JSON.stringify(move));
    }catch(e){}

    return move;
  }

  function onMove(fn){
    if(typeof fn === 'function') state.listeners.push(fn);
  }

  function notifyMove(move){
    state.listeners.forEach(fn=>{
      try{ fn(move); }catch(e){ console.warn(e); }
    });
  }

  function saveState(){
    try{ localStorage.setItem('PLAY3D_MP_STATE', JSON.stringify(state)); }catch(e){}
  }

  function loadState(){
    try{
      const raw = localStorage.getItem('PLAY3D_MP_STATE');
      if(!raw) return;
      const saved = JSON.parse(raw);
      state = Object.assign(state, saved, { listeners:[], channel:null, supabase:null });
    }catch(e){}
  }

  function emitStatus(msg){
    document.dispatchEvent(new CustomEvent('play3d:mp-status',{detail:{message:msg,state:getState()}}));
  }

  function getState(){
    return {
      game:state.game,
      roomCode:state.roomCode,
      playerId:state.playerId,
      playerName:state.playerName,
      seat:state.seat,
      connected:state.connected,
      online:state.online
    };
  }

  function installPanel(target, options){
    const opts = options || {};
    const game = opts.game || state.game || 'unknown';
    const mount = target || document.body;

    if(document.getElementById('p3dMultiplayerPanel')) return;

    const panel = document.createElement('section');
    panel.id = 'p3dMultiplayerPanel';
    panel.className = 'p3d-mp-panel';
    panel.innerHTML = `
      <h2>Fan Challenge</h2>
      <div class="p3d-mp-row">
        <input id="p3dMpName" placeholder="Player name" value="${opts.defaultName || ''}">
        <input id="p3dMpRoom" placeholder="Room code">
      </div>
      <div class="p3d-mp-row">
        <button id="p3dMpCreate">Create Room</button>
        <button id="p3dMpJoin">Join Room</button>
        <button id="p3dMpCopy">Copy Link</button>
      </div>
      <div class="p3d-mp-status" id="p3dMpStatus">Offline-ready. Add Supabase anon config for live online play.</div>
    `;

    mount.appendChild(panel);

    const roomInput = panel.querySelector('#p3dMpRoom');
    const nameInput = panel.querySelector('#p3dMpName');
    const status = panel.querySelector('#p3dMpStatus');

    function setStatus(t){ status.innerHTML = t; }

    panel.querySelector('#p3dMpCreate').onclick = async ()=>{
      state.playerName = nameInput.value || 'Host';
      const code = await createRoom(game);
      roomInput.value = code;
      setStatus('Room: <span class="p3d-mp-room">' + code + '</span> ' + (state.online ? 'ONLINE' : 'LOCAL TEST MODE'));
    };

    panel.querySelector('#p3dMpJoin').onclick = async ()=>{
      state.playerName = nameInput.value || 'Fan';
      const code = roomInput.value;
      if(!code){ setStatus('Enter a room code.'); return; }
      await joinRoom(code, game);
      setStatus('Joined: <span class="p3d-mp-room">' + state.roomCode + '</span> ' + (state.online ? 'ONLINE' : 'LOCAL TEST MODE'));
    };

    panel.querySelector('#p3dMpCopy').onclick = async ()=>{
      const code = roomInput.value || state.roomCode;
      if(!code){ setStatus('Create or join a room first.'); return; }
      const u = new URL(window.location.href);
      u.searchParams.set('room', code);
      u.searchParams.set('mp', '1');
      try{ await navigator.clipboard.writeText(u.toString()); setStatus('Room link copied.'); }
      catch(e){ setStatus('Copy this: ' + u.toString()); }
    };

    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if(room){
      roomInput.value = room;
      setStatus('Room code detected: <span class="p3d-mp-room">' + room + '</span>. Press Join Room.');
    }
  }

  loadState();

  window.Play3DMultiplayer = {
    createRoom,
    joinRoom,
    sendMove,
    onMove,
    getState,
    installPanel,
    isConfigured
  };
})();
