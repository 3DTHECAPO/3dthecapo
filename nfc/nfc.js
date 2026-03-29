(function(){
  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const intro = byId('intro');
  const vault = byId('vault');
  const title = byId('title');
  const subtitle = byId('subtitle');

  const panels = {
    album: byId('album'),
    deluxe: byId('deluxe'),
    track: byId('track'),
    video: byId('video')
  };

  Object.values(panels).forEach(el => el && el.classList.add('hidden'));

  setTimeout(() => {
    if (intro) intro.style.display = 'none';
    if (vault) vault.classList.remove('hidden');

    if (unlock === 'album') {
      panels.album.classList.remove('hidden');
      title.textContent = 'ALBUM UNLOCKED';
      subtitle.textContent = 'Full album access is active.';
    } else if (unlock === 'deluxe' || unlock === 'bundle') {
      panels.deluxe.classList.remove('hidden');
      title.textContent = 'DELUXE UNLOCKED';
      subtitle.textContent = 'VIP deluxe content is active.';
    } else if (unlock === 'track' || unlock === 'exclusive') {
      panels.track.classList.remove('hidden');
      title.textContent = 'TRACK UNLOCKED';
      subtitle.textContent = 'Your secret track is ready.';
    } else if (unlock === 'video') {
      panels.video.classList.remove('hidden');
      title.textContent = 'VIDEO UNLOCKED';
      subtitle.textContent = 'Your private visual is ready.';
    } else {
      title.textContent = 'ACCESS READY';
      subtitle.textContent = 'Choose an unlock above or tap your NFC product.';
    }
  }, 1800);
})();