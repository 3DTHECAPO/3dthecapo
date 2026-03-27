const p=new URLSearchParams(window.location.search);
const u=p.get('unlock');
const show=id=>document.getElementById(id).classList.remove('hidden');
if(u==='album')show('album');
if(u==='track')show('track');
if(u==='video')show('video');
document.getElementById('status').innerText=u?u+' unlocked':'no unlock';
