
(function(){
  const params = new URLSearchParams(location.search);
  const gameName = (document.title || 'PLAY 3D Game').replace(/^PLAY 3D\s*[—-]\s*/,'');
  const existingRoom = params.get('room') || '';
  const mode = params.get('mode') || '';

  function makeRoom(){
    const short = gameName.replace(/[^A-Za-z0-9]/g,'').slice(0,4).toUpperCase() || 'P3D';
    return short + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
  }

  function roomLink(code){
    const u = new URL(location.href);
    u.searchParams.set('mode','fan');
    u.searchParams.set('room',code);
    return u.toString();
  }

  function openRoom(code){
    const finalCode = code || makeRoom();
    localStorage.setItem('play3d:fanRoom', JSON.stringify({game:gameName, room:finalCode, url:roomLink(finalCode), at:Date.now()}));
    const modal = document.querySelector('.p3d-roombox');
    if(!modal) return;
    modal.querySelector('.room-code').textContent = finalCode;
    modal.querySelector('#p3dShareLink').value = roomLink(finalCode);
    modal.classList.add('open');
  }

  function joinRoom(){
    const input = document.querySelector('#p3dJoinCode');
    const code = (input?.value || '').trim().toUpperCase();
    if(!code){
      input?.focus();
      return;
    }
    location.href = roomLink(code);
  }

  function copyLink(){
    const input = document.querySelector('#p3dShareLink');
    input?.select();
    try{ document.execCommand('copy'); }catch(e){}
  }

  function boot(){
    const bar = document.createElement('div');
    bar.className = 'p3d-fanbar';
    bar.innerHTML = `
      <div><b>Fan Multiplayer</b><br><small>${existingRoom ? 'Room active: ' + existingRoom : 'Create or join a fan room for this game.'}</small></div>
      <div class="p3d-actions">
        <button class="gold" type="button" id="p3dCreateRoom">Create Room</button>
        <button type="button" id="p3dOpenJoin">Join Room</button>
        <a href="../index.html">Game Vault</a>
      </div>`;
    document.body.appendChild(bar);

    const modal = document.createElement('div');
    modal.className = 'p3d-roombox';
    modal.innerHTML = `
      <div class="p3d-roomcard">
        <h2>Fan Room</h2>
        <p>Share this room code/link with a fan. This preserves your fan-mode entry flow and is ready for live Supabase sync wiring.</p>
        <div class="room-code">${existingRoom || '----'}</div>
        <label>Share Link</label>
        <input id="p3dShareLink" readonly value="${existingRoom ? roomLink(existingRoom).replace(/"/g,'&quot;') : ''}">
        <label>Join Code</label>
        <input id="p3dJoinCode" placeholder="PASTE ROOM CODE">
        <div class="row">
          <button class="gold" type="button" id="p3dJoinBtn">Join</button>
          <button type="button" id="p3dCopyBtn">Copy Link</button>
          <button type="button" id="p3dCloseRoom">Close</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.querySelector('#p3dCreateRoom')?.addEventListener('click',()=>openRoom());
    document.querySelector('#p3dOpenJoin')?.addEventListener('click',()=>openRoom(existingRoom || makeRoom()));
    document.querySelector('#p3dJoinBtn')?.addEventListener('click',joinRoom);
    document.querySelector('#p3dCopyBtn')?.addEventListener('click',copyLink);
    document.querySelector('#p3dCloseRoom')?.addEventListener('click',()=>modal.classList.remove('open'));

    if(mode === 'fan' || existingRoom){
      setTimeout(()=>openRoom(existingRoom || makeRoom()), 350);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
