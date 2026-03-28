(function(){
  const byId = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  const unlock = (params.get('unlock') || '').toLowerCase();
  const providedKey = (hash.get('k') || params.get('key') || '').trim();

  const status = byId('unlockStatus');
  const sections = {
    album: byId('albumSection'),
    deluxe: byId('deluxeSection'),
    track: byId('trackSection'),
    video: byId('videoSection')
  };

  Object.values(sections).forEach(el => el && el.classList.add('hidden'));

  const SECRET_SEED = 'CAPO-V14-STEALTH';
  const WINDOW_DAYS = 2; // allow +/- 2 days for easier tag deployment

  function formatDateUTC(date){
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  function hashString(input){
    let h = 2166136261 >>> 0;
    for(let i = 0; i < input.length; i++){
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
  }

  function validKeysFor(unlockType){
    const keys = [];
    const now = new Date();
    for(let offset = -WINDOW_DAYS; offset <= WINDOW_DAYS; offset++){
      const d = new Date(now);
      d.setUTCDate(now.getUTCDate() + offset);
      const stamp = formatDateUTC(d);
      keys.push(hashString(`${SECRET_SEED}:${unlockType}:${stamp}`));
    }
    return keys;
  }

  let active = null;
  if (unlock === 'album') active = 'album';
  else if (unlock === 'deluxe' || unlock === 'album-deluxe') active = 'deluxe';
  else if (unlock === 'track' || unlock === 'exclusive') active = 'track';
  else if (unlock === 'video') active = 'video';

  if(!active){
    if(status) status.textContent = 'Choose an unlock path.';
    return;
  }

  const acceptedKeys = validKeysFor(active);
  const isValid = providedKey && acceptedKeys.includes(providedKey.toUpperCase());

  if (!isValid) {
    if(status){
      status.textContent = providedKey ? 'ACCESS DENIED' : 'WAITING FOR NFC KEY';
    }
    return;
  }

  if (sections[active]) {
    sections[active].classList.remove('hidden');
    if(status) status.textContent = `${active.toUpperCase()} UNLOCKED`;
  }
})();