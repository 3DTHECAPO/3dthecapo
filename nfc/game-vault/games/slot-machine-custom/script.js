(()=>{
const symbols=[
 {name:'3D Logo',src:'./assets/logo.png',pay:30,w:7},
 {name:'Crown',src:'./assets/crown.png',pay:25,w:8},
 {name:'Vault',src:'./assets/vault.png',pay:22,w:9},
 {name:'Cash',src:'./assets/cash.png',pay:18,w:10},
 {name:'Key',src:'./assets/key.png',pay:14,w:12},
 {name:'Mic',src:'./assets/mic.png',pay:12,w:13},
 {name:'Speaker',src:'./assets/speaker.png',pay:10,w:14},
 {name:'Hoodie',src:'./assets/hoodie.png',pay:9,w:15},
 {name:'Chain',src:'./assets/chain.png',pay:8,w:16},
 {name:'Lock',src:'./assets/lock.png',pay:7,w:17},
 {name:'100x3',src:'./assets/cover-100x3.png',pay:20,w:8},
 {name:'My Resume',src:'./assets/cover-my-resume.png',pay:20,w:8}
];
let credits=Number(localStorage.getItem('play3d_slots_credits')||1000), bet=25;
const bag=[]; symbols.forEach(s=>{for(let i=0;i<s.w;i++)bag.push(s)});
function pick(){return bag[Math.floor(Math.random()*bag.length)]}
function set(el,s){el.src=s.src; el.alt=s.name}
function ui(){creditsEl.textContent=credits; mainScore.textContent=credits; betEl.textContent=bet; localStorage.setItem('play3d_slots_credits',credits)}
const creditsEl=document.getElementById('credits'), betEl=document.getElementById('bet');
function spin(){ if(credits<bet){stateText.textContent='NOT ENOUGH';return} credits-=bet; let res=[pick(),pick(),pick()]; [r1,r2,r3].forEach((el,i)=>set(el,res[i])); let win=0; if(res[0].name===res[1].name && res[1].name===res[2].name){win=bet*res[0].pay; stateText.textContent='JACKPOT'} else if(res[0].name===res[1].name || res[1].name===res[2].name || res[0].name===res[2].name){win=bet*3; stateText.textContent='MATCH WIN'} else {stateText.textContent='NO MATCH'} credits+=win; lastWin.textContent=win; ui(); }
betUp.onclick=()=>{if(bet<500)bet+=25; ui()}; betDown.onclick=()=>{if(bet>25)bet-=25; ui()}; spinBtn.onclick=spin; ui();
})();