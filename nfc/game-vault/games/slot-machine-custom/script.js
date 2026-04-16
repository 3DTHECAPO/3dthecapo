const symbols=['👑','💰','🔊','💿','👕','🧢','🔑'];
let credits=500, bet=25, jackpot=2500, spinning=false;
const el=id=>document.getElementById(id);
function render(){el('credits').textContent=credits;el('bet').textContent=bet;el('jackpot').textContent=jackpot;}
function setMsg(t){el('msg').textContent=t;}
function changeBet(d){bet=Math.max(25,Math.min(100,bet+d));render();}
el('plus').onclick=()=>changeBet(25);el('minus').onclick=()=>changeBet(-25);
function rand(){return symbols[Math.floor(Math.random()*symbols.length)]}
function spin(){if(spinning||credits<bet)return setMsg('Not enough credits.');spinning=true;credits-=bet;render();setMsg('Spinning...');const reels=[el('r0'),el('r1'),el('r2')];let ticks=0;const iv=setInterval(()=>{reels.forEach(r=>{r.textContent=rand();r.style.transform=`scale(${1+Math.random()*.08})`});ticks++;if(ticks>16){clearInterval(iv);const final=reels.map(r=>r.textContent);let win=0;let msg='No hit. Spin again.';if(final[0]===final[1]&&final[1]===final[2]){if(final[0]==='👑'){win=jackpot;jackpot=2500;msg='JACKPOT — crown sweep!'}else{win=bet*6;jackpot+=50;msg=`You hit ${final[0]} ${final[0]} ${final[0]}`;}document.querySelector('.machine').classList.add('win');setTimeout(()=>document.querySelector('.machine').classList.remove('win'),1800);} else if(new Set(final).size===2){win=bet*2;jackpot+=25;msg='Two-match bonus.';} else {jackpot+=bet;} credits+=win; render(); setMsg(msg); spinning=false; reels.forEach(r=>r.style.transform='scale(1)');}},95)}
el('spin').onclick=spin;render();
