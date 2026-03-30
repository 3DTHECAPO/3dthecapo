const intro=document.getElementById('intro');
const vault=document.getElementById('vault');
const status=document.getElementById('status');

setTimeout(()=>{
intro.style.display='none';
const u=new URLSearchParams(location.search).get('unlock');
status.innerText=u?u.toUpperCase()+' UNLOCKED':'VAULT READY';
},2000);
