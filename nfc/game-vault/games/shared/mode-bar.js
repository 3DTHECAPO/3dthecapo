(function(){
  'use strict';

  if(window.Play3DModeBarLoaded) return;
  window.Play3DModeBarLoaded = true;

  var params = new URLSearchParams(location.search);
  var initialMode = params.get('mode') === 'fan' ? 'fan' : (localStorage.getItem('play3d_game_mode') || 'cpu');

  function roomCode(){
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = 'FAN-';
    for(var i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function setMode(mode, status){
    localStorage.setItem('play3d_game_mode', mode);
    window.Play3DGameMode = mode;
    document.querySelectorAll('[data-p3d-mode]').forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.p3dMode === mode);
    });
    var line = document.querySelector('.play3d-mode-status');
    if(line) line.textContent = status || (mode === 'cpu' ? 'Play vs Computer active.' : mode === 'local' ? 'Local 2 Player active on this device.' : 'Fan Challenge room mode active.');
    window.dispatchEvent(new CustomEvent('play3d:modechange', {detail:{mode:mode}}));
  }

  window.Play3DModeBar = {
    getMode:function(){ return window.Play3DGameMode || initialMode || 'cpu'; },
    setMode:setMode
  };

  function openFanRoom(){
    var next = new URL(location.href);
    next.searchParams.set('mode', 'fan');
    next.searchParams.set('room', params.get('room') || roomCode());
    location.href = next.toString();
  }

  function build(){
    var main = document.querySelector('main');
    if(!main || document.querySelector('.play3d-mode-bar')) return;
    var bar = document.createElement('section');
    bar.className = 'play3d-mode-bar';
    bar.setAttribute('aria-label', 'Game modes');
    bar.innerHTML =
      '<button type="button" data-p3d-mode="cpu">Play vs Computer</button>' +
      '<button type="button" data-p3d-mode="local">Local 2 / 4 Player</button>' +
      '<button type="button" data-p3d-mode="fan">Fan Challenge / Multiplayer</button>' +
      '<a href="../../index.html">Back to Game Vault</a>' +
      '<div class="play3d-mode-status"></div>';
    var header = main.querySelector('header');
    if(header && header.nextSibling) main.insertBefore(bar, header.nextSibling);
    else main.insertBefore(bar, main.firstChild);

    bar.querySelector('[data-p3d-mode="cpu"]').addEventListener('click', function(){
      setMode('cpu', 'Play vs Computer active. CPU/bot flow will run when this game supports it.');
    });
    bar.querySelector('[data-p3d-mode="local"]').addEventListener('click', function(){
      setMode('local', 'Local 2 / 4 Player active. Same-device turns are enabled where the rules support them.');
    });
    bar.querySelector('[data-p3d-mode="fan"]').addEventListener('click', openFanRoom);

    if(initialMode === 'fan'){
      setMode('fan', params.get('room') ? 'Fan Challenge active: room ' + params.get('room') + '.' : 'Fan Challenge room code coming online.');
    }else{
      setMode(initialMode);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
