
(()=>{
let boneyard=[],player=[],bot=[],chain=[],turn='player';
function make(){let t=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)t.push([a,b]);for(let i=t.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[t[i],t[j]]=[t[j],t[i]]}return t;}
function ends(){if(!chain.length)return null;return [chain[0][0],chain[chain.length-1][1]]}
function tile(t,i){return `<button class="domino" data-i="${i}"><span>${t[0]}</span><span>${t[1]}</span></button>`}
function score(h){return h.reduce((s,t)=>s+t[0]+t[1],0)}
function render(msg){chainEl.innerHTML=chain.map((t)=>`<div class="domino ontable"><span>${t[0]}</span><span>${t[1]}</span></div>`).join('');handEl.innerHTML=player.map(tile).join('');handEl.querySelectorAll('button').forEach(b=>b.onclick=()=>play(+b.dataset.i));log.textContent=msg||`Open ends: ${ends()?ends().join(' / '):'start any tile'} | Boneyard: ${boneyard.length} | Bot: ${bot.length}`;}
function start(){boneyard=make();player=boneyard.splice(0,7);bot=boneyard.splice(0,7);chain=[];turn='player';render('New round. Play any tile to start.');}
function canPlay(t){let e=ends();return !e||t[0]===e[0]||t[1]===e[0]||t[0]===e[1]||t[1]===e[1]}
function place(t){let e=ends();if(!e){chain.push(t);return true}if(t[1]===e[0])chain.unshift(t);else if(t[0]===e[0])chain.unshift([t[1],t[0]]);else if(t[0]===e[1])chain.push(t);else if(t[1]===e[1])chain.push([t[1],t[0]]);else return false;return true}
function play(i){if(turn!=='player')return;let t=player[i];if(!canPlay(t)){render('That tile does not match either open end.');return}place(t);player.splice(i,1);if(!player.length){render('YOU WIN THE ROUND.');return}turn='bot';botMove();}
function botMove(){let i=bot.findIndex(canPlay);if(i>=0){place(bot[i]);bot.splice(i,1);if(!bot.length){render('BOT WINS THE ROUND.');return}}else if(boneyard.length)bot.push(boneyard.pop());turn='player';render(i>=0?'Bot played. Your move.':'Bot drew. Your move.');}
drawBtn.onclick=()=>{if(turn!=='player')return;if(player.some(canPlay)){render('You have a playable tile — no draw needed.');return}if(boneyard.length){player.push(boneyard.pop());render('You drew a tile.')}else render('Boneyard empty. Pass if you cannot play.')};
passBtn.onclick=()=>{if(turn!=='player')return;if(player.some(canPlay)){render('You cannot pass with a playable tile.');return}turn='bot';botMove();};newBtn.onclick=start;start();
})();
