const boot=document.getElementById('boot');
const scan=document.getElementById('scan');
const auth=document.getElementById('auth');
const granted=document.getElementById('granted');
const content=document.getElementById('content');
const title=document.getElementById('title');

setTimeout(()=>{boot.style.display='none';scan.classList.remove('hidden')},1000);
setTimeout(()=>{scan.style.display='none';auth.classList.remove('hidden')},2000);
setTimeout(()=>{auth.style.display='none';granted.classList.remove('hidden')},3000);
setTimeout(()=>{
granted.style.display='none';
content.classList.remove('hidden');

const u=new URLSearchParams(location.search).get('unlock');

if(u==='album'){title.innerText='ALBUM UNLOCKED'}
else if(u==='ep'){title.innerText='EP UNLOCKED'}
else if(u==='track'){title.innerText='TRACK UNLOCKED'}
else if(u==='video'){title.innerText='VIDEO UNLOCKED'}
else{title.innerText='ACCESS READY'}

},4500);
