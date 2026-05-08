
(()=>{
let creditsVal=1000, betVal=25, spinning=false;
const symbols=[
 {name:'logo',src:'./assets/logo.png',weight:2,pay:50},
 {name:'crown',src:'./assets/crown.png',weight:4,pay:25},
 {name:'vault',src:'./assets/vault.png',weight:5,pay:20},
 {name:'cash',src:'./assets/cash.png',weight:7,pay:14},
 {name:'key',src:'./assets/key.png',weight:8,pay:10},
 {name:'lock',src:'./assets/lock.png',weight:10,pay:8},
 {name:'mic',src:'./assets/mic.png',weight:10,pay:7},
 {name:'speaker',src:'./assets/speaker.png',weight:12,pay:6},
 {name:'hoodie',src:'./assets/hoodie.png',weight:12,pay:5},
 {name:'chain',src:'./assets/chain.png',weight:12,pay:5}
];
const bag=[];symbols.forEach(s=>{for(let i=0;i<s.weight;i++)bag.push(s)});
const reels=[r1,r2,r3];
function pick(){return bag[Math.floor(Math.random()*bag.length)]}
function ui(){credits.textContent=creditsVal;mainScore.textContent=creditsVal;bet.textContent=betVal;}
function spin(){if(spinning)return;if(creditsVal<betVal){stateText.textContent='NOT ENOUGH';return}spinning=true;creditsVal-=betVal;lastWin.textContent='0';ui();let ticks=0,timer=setInterval(()=>{reels.forEach(img=>{img.src=pick().src});ticks++;if(ticks>=18){clearInterval(timer);finish();}},65)}
function finish(){const result=[pick(),pick(),pick()];result.forEach((s,i)=>reels[i].src=s.src);let win=0;const names=result.map(s=>s.name);if(names[0]===names[1]&&names[1]===names[2]) win=betVal*result[0].pay;else if(names[0]===names[1]||names[0]===names[2]||names[1]===names[2]) win=betVal*2;creditsVal+=win;lastWin.textContent=win;stateText.textContent=win?('WIN +'+win):'MISS';spinning=false;ui();}
spinBtn.onclick=spin;betUp.onclick=()=>{if(!spinning&&betVal<500){betVal+=25;ui();stateText.textContent='BET '+betVal}};betDown.onclick=()=>{if(!spinning&&betVal>25){betVal-=25;ui();stateText.textContent='BET '+betVal}};ui();
})();
