(()=>{
let c=Number(localStorage.p3d_slots_player||1000), fan=Number(localStorage.p3d_slots_fan||1000), b=25;
const s=['7','BAR','★','♛','💎','3D'];
function pick(){return s[Math.floor(Math.random()*s.length)]}
function payout(a){if(a[0]===a[1]&&a[1]===a[2])return b*20;if(a[0]===a[1]||a[1]===a[2]||a[0]===a[2])return b*3;return 0}
function ui(){credits.textContent=c;fanCredits.textContent=fan;bet.textContent=b;mainScore.textContent=c;localStorage.p3d_slots_player=c;localStorage.p3d_slots_fan=fan}
function roll(){return [r1,r2,r3].map(x=>{let v=pick();x.textContent=v;return v})}
spinBtn.onclick=()=>{if(c<b){slotResult.textContent='Not enough player credits';return}c-=b;let a=roll(),p=payout(a);c+=p;stateText.textContent=p?'PLAYER WIN':'PLAYER MISS';slotResult.textContent=p?`Player won +${p}`:`Player lost ${b}`;ui()};
fanBtn.onclick=()=>{if(fan<b){slotResult.textContent='Fan has no credits';return}fan-=b;let a=[pick(),pick(),pick()],p=payout(a);fan+=p;stateText.textContent=p?'FAN WIN':'FAN MISS';slotResult.textContent=p?`Fan won +${p}`:`Fan lost ${b}`;ui()};
betUp.onclick=()=>{if(b<500){b+=25;ui()}};betDown.onclick=()=>{if(b>25){b-=25;ui()}};ui();
})();