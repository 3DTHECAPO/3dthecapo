
(()=>{
const suits=['♠','♥','♦','♣'], ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const order={'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
let deck=[],hand=[],hold=[],creditsVal=1000,betVal=25,phase='ready';
function mk(){deck=[];for(const s of suits)for(const r of ranks)deck.push({r,s});deck.sort(()=>Math.random()-.5)}
function card(c,i){return `<button class="card ${c.s==='♥'||c.s==='♦'?'red':''} ${hold.includes(i)?'hold':''}" data-i="${i}">${c.r}<br>${c.s}<small>${hold.includes(i)?'HOLD':''}</small></button>`}
function straight(vals){let v=[...new Set(vals)].sort((a,b)=>a-b); if(v.length!==5)return false; if(v.join(',')==='2,3,4,5,14')return true; return v[4]-v[0]===4}
function evaluate(){let counts={};hand.forEach(c=>counts[c.r]=(counts[c.r]||0)+1);let vals=Object.values(counts).sort((a,b)=>b-a).join(',');let nums=hand.map(c=>order[c.r]);let flush=hand.every(c=>c.s===hand[0].s);let st=straight(nums);let high=new Set(hand.map(c=>c.r));
 if(flush&&st&&['10','J','Q','K','A'].every(x=>high.has(x)))return{name:'Royal Flush',pay:250};
 if(flush&&st)return{name:'Straight Flush',pay:50};
 if(vals==='4,1')return{name:'Four Of A Kind',pay:25};
 if(vals==='3,2')return{name:'Full House',pay:9};
 if(flush)return{name:'Flush',pay:6};
 if(st)return{name:'Straight',pay:4};
 if(vals==='3,1,1')return{name:'Three Of A Kind',pay:3};
 if(vals==='2,2,1')return{name:'Two Pair',pay:2};
 if(vals.startsWith('2')){let pair=Object.keys(counts).find(r=>counts[r]===2); if(order[pair]>=11||pair==='A')return{name:'Jacks Or Better',pay:1}; return{name:'Low Pair - No Pay',pay:0}}
 return{name:'No Win',pay:0}}
function render(){handEl.innerHTML=hand.map(card).join('');credits.textContent=creditsVal;bet.textContent=betVal;mainScore.textContent=creditsVal;stateText.textContent=phase.toUpperCase();drawBtn.disabled=phase!=='draw';dealBtn.disabled=phase==='draw';betUp.disabled=betDown.disabled=phase==='draw';document.querySelectorAll('#hand .card').forEach(b=>b.onclick=()=>{let i=+b.dataset.i;if(phase==='draw'){hold=hold.includes(i)?hold.filter(x=>x!==i):[...hold,i];render()}})}
function deal(){if(phase==='draw')return;if(creditsVal<betVal){rankName.textContent='NOT ENOUGH CREDITS';stateText.textContent='NOT ENOUGH';return}mk();creditsVal-=betVal;hand=deck.splice(0,5);hold=[];phase='draw';rankName.textContent='Pick Holds';render()}
function draw(){if(phase!=='draw')return;hand=hand.map((c,i)=>hold.includes(i)?c:deck.pop());let res=evaluate(),pay=res.pay*betVal;creditsVal+=pay;rankName.textContent=res.name+' +'+pay;phase='ready';render()}
dealBtn.onclick=deal;drawBtn.onclick=draw;betUp.onclick=()=>{if(phase!=='draw'&&betVal<500)betVal+=25;render()};betDown.onclick=()=>{if(phase!=='draw'&&betVal>25)betVal-=25;render()};render();
})();
