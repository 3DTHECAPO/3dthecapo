(function(){
  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const unlock = (params.get('unlock') || '').toLowerCase();

  const status = byId('unlockStatus');
  const sections = {
    album: byId('albumSection'),
    deluxe: byId('deluxeSection'),
    track: byId('trackSection'),
    video: byId('videoSection')
  };

  Object.values(sections).forEach(el => el && el.classList.add('hidden'));

  let active = null;
  if (unlock === 'album') active = 'album';
  else if (unlock === 'deluxe' || unlock === 'album-deluxe') active = 'deluxe';
  else if (unlock === 'track' || unlock === 'exclusive') active = 'track';
  else if (unlock === 'video') active = 'video';

  if (active && sections[active]) {
    sections[active].classList.remove('hidden');
    if (status) status.textContent = active.toUpperCase() + ' UNLOCKED';
    setTimeout(() => sections[active].scrollIntoView({behavior:'smooth', block:'start'}), 120);
  } else {
    if (status) status.textContent = 'SELECT AN UNLOCK';
  }
})();