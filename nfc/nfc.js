(function(){
  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const intro = byId('intro');
  const vault = byId('vault');
  const status = byId('unlockStatus');
  const subtitle = byId('subtitle');

  const sections = {
    album: byId('albumSection'),
    ep: byId('epSection'),
    track: byId('trackSection'),
    video: byId('videoSection')
  };

  Object.values(sections).forEach(el => el && el.classList.add('hidden'));

  setTimeout(() => {
    if (intro) intro.style.display = 'none';
    if (vault) vault.classList.remove('hidden');

    let active = null;
    if (unlock === 'album') active = 'album';
    else if (unlock === 'ep') active = 'ep';
    else if (unlock === 'track' || unlock === 'exclusive') active = 'track';
    else if (unlock === 'video') active = 'video';

    if (active && sections[active]) {
      sections[active].classList.remove('hidden');
      if (status) status.textContent = active.toUpperCase() + ' UNLOCKED';
      if (subtitle) {
        if (active === 'album') subtitle.textContent = 'Full album access is active.';
        else if (active === 'ep') subtitle.textContent = 'Future EP access is active.';
        else if (active === 'track') subtitle.textContent = 'Your secret track is ready.';
        else if (active === 'video') subtitle.textContent = 'Your private visual is ready.';
      }
      setTimeout(() => sections[active].scrollIntoView({behavior:'smooth', block:'start'}), 120);
    } else {
      if (status) status.textContent = 'SELECT AN UNLOCK';
      if (subtitle) subtitle.textContent = 'Choose an unlock above or tap your NFC product.';
    }
  }, 1800);
})();