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
    ep: byId('ep'),
    track: byId('track'),
    video: byId('video')
  };

  Object.values(panels).forEach(el => el && el.classList.add('hidden'));

  setTimeout(() => {
    if (intro) intro.style.display = 'none';
    if (vault) vault.classList.remove('hidden');

    if (unlock === 'album') {
      if (panels.album) panels.album.classList.remove('hidden');
      if (title) title.textContent = 'ALBUM UNLOCKED';
      if (subtitle) subtitle.textContent = 'Full album access is active.';
    } else if (unlock === 'ep') {
      if (panels.ep) panels.ep.classList.remove('hidden');
      if (title) title.textContent = 'EP UNLOCKED';
      if (subtitle) subtitle.textContent = 'Future EP access is active.';
    } else if (unlock === 'track' || unlock === 'exclusive') {
      if (panels.track) panels.track.classList.remove('hidden');
      if (title) title.textContent = 'TRACK UNLOCKED';
      if (subtitle) subtitle.textContent = 'Your secret track is ready.';
    } else if (unlock === 'video') {
      if (panels.video) panels.video.classList.remove('hidden');
      if (title) title.textContent = 'VIDEO UNLOCKED';
      if (subtitle) subtitle.textContent = 'Your private visual is ready.';
    } else {
      if (title) title.textContent = 'ACCESS READY';
      if (subtitle) subtitle.textContent = 'Choose an unlock above or tap your NFC product.';
    }
  }, 1800);
})();