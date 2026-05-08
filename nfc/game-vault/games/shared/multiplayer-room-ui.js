/*
PLAY 3D Multiplayer Room UI
Visible fan room overlay for every game.
Loads only when URL has ?mode=fan&room=CODE.
Does not change game logic.
*/

(function(){
  'use strict';

  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  const room = params.get('room');

  if(mode !== 'fan' || !room) return;

  const gameName = (location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || 'game')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const css = document.createElement('style');
  css.id = 'play3d-room-ui-style';
  css.textContent = `
    .p3d-room-ui{
      position:fixed;
      left:14px;
      right:14px;
      bottom:14px;
      z-index:999999;
      display:grid;
      grid-template-columns:1fr auto auto;
      gap:10px;
      align-items:center;
      padding:12px;
      border:1px solid rgba(242,210,123,.35);
      border-radius:18px;
      background:rgba(0,0,0,.88);
      color:#f5efe3;
      font-family:Oswald,Arial,sans-serif;
      box-shadow:0 18px 60px rgba(0,0,0,.65);
      backdrop-filter:blur(10px);
    }

    .p3d-room-ui b{
      display:block;
      color:#f2d27b;
      font-family:"Black Ops One",Impact,sans-serif;
      letter-spacing:.06em;
      text-transform:uppercase;
      font-size:16px;
    }

    .p3d-room-ui small{
      display:block;
      color:rgba(245,239,227,.76);
      margin-top:3px;
      letter-spacing:.05em;
    }

    .p3d-room-status{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      align-items:center;
      justify-content:flex-end;
    }

    .p3d-pill{
      border:1px solid rgba(242,210,123,.25);
      border-radius:999px;
      padding:7px 10px;
      color:#f5efe3;
      background:rgba(255,255,255,.05);
      font-size:12px;
      font-weight:900;
      text-transform:uppercase;
      letter-spacing:.08em;
      white-space:nowrap;
    }

    .p3d-pill.live{
      color:#100c05;
      background:linear-gradient(180deg,#f2d27b,#caa24a 58%,#805c1a);
    }

    .p3d-room-ui button,
    .p3d-room-ui a{
      border:1px solid rgba(242,210,123,.35);
      border-radius:999px;
      min-height:40px;
      padding:10px 13px;
      background:rgba(255,255,255,.05);
      color:#f5efe3;
      text-decoration:none;
      font:900 12px Oswald,Arial,sans-serif;
      text-transform:uppercase;
      letter-spacing:.08em;
      cursor:pointer;
      white-space:nowrap;
    }

    .p3d-room-ui button:hover,
    .p3d-room-ui a:hover{
      background:linear-gradient(180deg,#f2d27b,#caa24a 58%,#805c1a);
      color:#100c05;
    }

    .p3d-room-min{
      position:fixed;
      bottom:14px;
      right:14px;
      z-index:999999;
      display:none;
      border:1px solid rgba(242,210,123,.35);
      border-radius:999px;
      padding:10px 13px;
      background:rgba(0,0,0,.88);
      color:#f2d27b;
      font:900 12px Oswald,Arial,sans-serif;
      text-transform:uppercase;
      letter-spacing:.08em;
      cursor:pointer;
    }

    body.p3d-room-collapsed .p3d-room-ui{display:none}
    body.p3d-room-collapsed .p3d-room-min{display:block}

    @media(max-width:760px){
      .p3d-room-ui{
        grid-template-columns:1fr;
        align-items:stretch;
      }
      .p3d-room-status{
        justify-content:flex-start;
      }
      .p3d-room-ui button,
      .p3d-room-ui a{
        width:100%;
      }
    }
  `;
  document.head.appendChild(css);

  const wrap = document.createElement('div');
  wrap.className = 'p3d-room-ui';
  wrap.innerHTML = `
    <div>
      <b>Fan Room Active</b>
      <small><span id="p3dRoomGame">${gameName}</span> • Room <span id="p3dRoomCode">${room}</span></small>
    </div>

    <div class="p3d-room-status">
      <span class="p3d-pill live" id="p3dBridgeStatus">Room Link</span>
      <span class="p3d-pill" id="p3dPlayerStatus">Player: You</span>
      <span class="p3d-pill" id="p3dReadyStatus">Not Ready</span>
    </div>

    <div class="p3d-room-actions">
      <button type="button" id="p3dReadyBtn">Ready</button>
      <button type="button" id="p3dCopyInviteBtn">Copy Invite</button>
      <button type="button" id="p3dHideRoomBtn">Hide</button>
    </div>
  `;

  const mini = document.createElement('button');
  mini.className = 'p3d-room-min';
  mini.type = 'button';
  mini.textContent = 'Room ' + room;

  document.body.appendChild(wrap);
  document.body.appendChild(mini);

  const readyBtn = document.getElementById('p3dReadyBtn');
  const copyBtn = document.getElementById('p3dCopyInviteBtn');
  const hideBtn = document.getElementById('p3dHideRoomBtn');
  const bridgeStatus = document.getElementById('p3dBridgeStatus');
  const playerStatus = document.getElementById('p3dPlayerStatus');
  const readyStatus = document.getElementById('p3dReadyStatus');

  let ready = false;

  function updateBridgeStatus(){
    const sync = window.PLAY3D_SYNC;
    if(sync && sync.enabled){
      bridgeStatus.textContent = sync.connected ? 'Live Sync' : 'Room Link';
      if(sync.playerId){
        playerStatus.textContent = 'Player: ' + String(sync.playerId).slice(0, 8);
      }
    }else{
      bridgeStatus.textContent = 'Room Link';
    }
  }

  function sendReady(){
    const sync = window.PLAY3D_SYNC;
    if(sync && sync.sendGameEvent){
      sync.sendGameEvent('player_ready', {ready, room, game:gameName});
    }
  }

  readyBtn.addEventListener('click', function(){
    ready = !ready;
    readyStatus.textContent = ready ? 'Ready' : 'Not Ready';
    readyBtn.textContent = ready ? 'Unready' : 'Ready';
    sendReady();
  });

  copyBtn.addEventListener('click', async function(){
    try{
      await navigator.clipboard.writeText(location.href);
      copyBtn.textContent = 'Copied';
      setTimeout(()=>copyBtn.textContent='Copy Invite', 1200);
    }catch(e){
      prompt('Copy invite link:', location.href);
    }
  });

  hideBtn.addEventListener('click', function(){
    document.body.classList.add('p3d-room-collapsed');
  });

  mini.addEventListener('click', function(){
    document.body.classList.remove('p3d-room-collapsed');
  });

  if(window.PLAY3D_SYNC && window.PLAY3D_SYNC.onGameEvent){
    window.PLAY3D_SYNC.onGameEvent('player_ready', function(msg){
      if(!msg || msg.playerId === window.PLAY3D_SYNC.playerId) return;
      const isReady = !!(msg.payload && msg.payload.ready);
      playerStatus.textContent = isReady ? 'Fan Ready' : 'Fan Joined';
    });
  }

  updateBridgeStatus();
  setInterval(updateBridgeStatus, 1000);
})();
