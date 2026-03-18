const params = new URLSearchParams(window.location.search);
const unlock = params.get('unlock');

const show = id => document.getElementById(id).classList.remove('hidden');

if(unlock === 'album'){ show('album'); }
if(unlock === 'track'){ show('track'); }
if(unlock === 'video'){ show('video'); }

document.getElementById('status').innerText = unlock ? unlock.toUpperCase()+' UNLOCKED' : 'SELECT ACCESS';
