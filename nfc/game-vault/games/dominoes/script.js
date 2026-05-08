
(()=>{
let boneyard=[],player=[],bot=[],chain=[],over=false,creditsVal=1000,betVal=25;
function tileSet(){let a=[];for(let i=0;i<=6;i++)for(let j=i;j<=6;j++)a.push([i,j]);return a.sort(()=>Math.random()-.5)}
function ends(){if(!chain.length)return null;return [chain[0][0],chain[chain.length-1][1]]}
function legalTile(t){let e=ends();return !e||t[0]===e[0]||t[1]===e[0]||t[0]===e[1]||t[1]===e[1]}
function anyLegal(arr){return arr.some(legalTile)}
function pips(arr){return arr.flat().reduce((a,b)=>a+b,0)}
function place(arr,t){let i=arr.indexOf(t),e=ends();if(i<0)return false;if(!e)chain.push(t);else if(t[1]===e[0])chain.unshift(t);else if(t[0]===e[0])chain.unshift([t[1],t[0]]);else if(t[0]===e[1])chain.push(t);else if(t[1]===e[1])chain.push([t[1],t[0]]);else return false;arr.splice(i,1);return true}
function finish(who){over=true;let diff=Math.abs(pips(player)-pips(bot));let pay=who==='YOU WIN'?betVal*2+diff:0;if(pay)creditsVal+=pay;msg(who+(pay?' +'+pay:''));render()}
function check(){if(!player.length){finish('YOU WIN');return true}if(!bot.length){finish('BOT WINS');return true}if(!boneyard.length&&!anyLegal(player)&&!anyLegal(bot)){finish(pips(player)<=pips(bot)?'YOU WIN':'BOT WINS');return true}return false}
function botTurn(){if(over)return;let t=bot.find(legalTile);if(t){place(bot,t);msg('Bot played. Your move.')}else if(boneyard.length){bot.push(boneyard.pop());msg('Bot drew. Your move.')}else msg('Bot passed. Your move.');check();render()}
function play(i){if(over)return;let t=player[i];if(!legalTile(t)){msg('Illegal tile');return}place(player,t);if(!check())botTurn();render()}
function drawTile(){if(over)return;if(anyLegal(player)){msg('You have a playable tile.');return}if(boneyard.length){player.push(boneyard.pop());msg('Drew tile');render()}else{msg('No tiles left. Pass.')}}
function pass(){if(over)return;if(anyLegal(player)){msg('You cannot pass with a playable tile.');return}botTurn()}
function msg(t){log.textContent=t;stateText.textContent=t.toUpperCase().slice(0,12)}
function tile(t,i,playable=false){return `<button class="tile ${playable?'playable':''}" ${i!==undefined?`data-i="${i}"`:''}><span>${t[0]}</span><span>${t[1]}</span></button>`}
function render(){chainEl.innerHTML=chain.map(t=>tile(t)).join('')||'<span class="pill">Start the chain</span>';handEl.innerHTML=player.map((t,i)=>tile(t,i,legalTile(t))).join('');document.querySelectorAll('#handEl .tile').forEach(b=>b.onclick=()=>play(+b.dataset.i));mainScore.textContent=player.length;}
function start(){if(creditsVal<betVal){msg('Not enough credits');return}creditsVal-=betVal;boneyard=tileSet();player=boneyard.splice(0,7);bot=boneyard.splice(0,7);chain=[];over=false;msg('New round. Play any tile.');render()}
drawBtn.onclick=drawTile;passBtn.onclick=pass;newBtn.onclick=start;start();
})();
