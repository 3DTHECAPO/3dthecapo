const steps=[{el:'boot',time:1200},{el:'scan',time:1200},{el:'auth',time:1200},{el:'granted',time:1500},{el:'content',time:0}];
let current=0;
function next(){
document.querySelectorAll('.layer').forEach(el=>el.classList.remove('active'));
const step=steps[current];
const el=document.getElementById(step.el);
if(el){el.classList.add('active');}
if(step.el==='content'){
const u=new URLSearchParams(location.search).get('unlock');
const title=document.getElementById('title');
if(u==='album'){title.innerText='ALBUM UNLOCKED'}
else if(u==='ep'){title.innerText='EP UNLOCKED'}
else if(u==='track'){title.innerText='TRACK UNLOCKED'}
else if(u==='video'){title.innerText='VIDEO UNLOCKED'}
else{title.innerText='ACCESS READY'}
return;}
current++;
setTimeout(next, step.time);}
next();
