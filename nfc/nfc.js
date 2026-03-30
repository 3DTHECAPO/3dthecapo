const steps=['boot','scan','auth','grant','content'];let i=0;
function run(){
document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));
document.getElementById(steps[i]).classList.add('active');
if(steps[i]=='content'){
const u=new URLSearchParams(location.search).get('unlock');
document.getElementById('title').innerText=u?u.toUpperCase()+' UNLOCKED':'READY';
return;}
i++;setTimeout(run,1200);}
run();
