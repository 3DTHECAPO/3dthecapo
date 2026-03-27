(function(){
  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const panels = {
    album: byId('albumPanel'),
    deluxe: byId('deluxePanel'),
    track: byId('trackPanel'),
    video: byId('videoPanel')
  };

  const title = byId('statusTitle');
  const text = byId('statusText');
  const scan = byId('scanScreen');
  const shell = byId('vaultShell');

  Object.values(panels).forEach(el => el && el.classList.add('hidden'));

  setTimeout(() => {
    if (scan) scan.style.display = 'none';
    if (shell) shell.classList.remove('hidden');

    if (unlock === 'album') {
      panels.album.classList.remove('hidden');
      title.textContent = 'ALBUM UNLOCKED';
      text.textContent = 'Full album owner access is active.';
      panels.album.scrollIntoView({behavior:'smooth', block:'start'});
    } else if (unlock === 'deluxe' || unlock === 'bundle') {
      panels.deluxe.classList.remove('hidden');
      title.textContent = 'DELUXE UNLOCKED';
      text.textContent = 'VIP deluxe content is active.';
      panels.deluxe.scrollIntoView({behavior:'smooth', block:'start'});
    } else if (unlock === 'track' || unlock === 'exclusive') {
      panels.track.classList.remove('hidden');
      title.textContent = 'TRACK UNLOCKED';
      text.textContent = 'Your secret track is ready.';
      panels.track.scrollIntoView({behavior:'smooth', block:'start'});
    } else if (unlock === 'video') {
      panels.video.classList.remove('hidden');
      title.textContent = 'VIDEO UNLOCKED';
      text.textContent = 'Your private visual is ready.';
      panels.video.scrollIntoView({behavior:'smooth', block:'start'});
    } else {
      title.textContent = 'ACCESS READY';
      text.textContent = 'Choose an unlock above or tap your NFC product.';
    }
  }, 1800);
})();