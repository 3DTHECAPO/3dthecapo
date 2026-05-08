
const SUITS=['♠','♥','♦','♣'];
const RANKS=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const RANK_VALUE={A:14,K:13,Q:12,J:11,'10':10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2};
function freshDeck(ranks=RANKS,suits=SUITS,copies=1){let d=[];for(let c=0;c<copies;c++)for(const s of suits)for(const r of ranks)d.push({r,s,id:r+s+'-'+c+'-'+Math.random().toString(36).slice(2)});for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}return d;}
function cardHTML(c,extra=''){return `<button class="card ${c.s==='♥'||c.s==='♦'?'red':''} ${extra}" data-id="${c.id||''}"><b>${c.r}</b><br>${c.s}</button>`;}

(()=>{
let deck=[],handCards=[],holds=new Set(),creditsVal=1000,betVal=25,phase='idle';
function ui(){credits.textContent=creditsVal;bet.textContent=betVal;mainScore.textContent=creditsVal;stateText.textContent=phase.toUpperCase();}
function render(){hand.innerHTML=handCards.map((c,i)=>`<button class="card ${c.s==='♥'||c.s==='♦'?'red':''} ${holds.has(i)?'held':''}" data-i="${i}">${c.r}<br>${c.s}<small>${holds.has(i)?'HOLD':''}</small></button>`).join('');hand.querySelectorAll('button').forEach(b=>b.onclick=()=>toggle(+b.dataset.i));ui();}
function toggle(i){if(phase!=='dealt')return;holds.has(i)?holds.delete(i):holds.add(i);render();}
function deal(){if(phase==='dealt')return;if(creditsVal<betVal){rankName.textContent='NOT ENOUGH CREDITS';return}creditsVal-=betVal;deck=freshDeck();handCards=deck.splice(0,5);holds.clear();phase='dealt';rankName.textContent='Pick holds';render();}
function draw(){if(phase!=='dealt')return;for(let i=0;i<5;i++)if(!holds.has(i))handCards[i]=deck.pop();const ev=evaluate(handCards);let win=betVal*ev.mult;creditsVal+=win;rankName.textContent=ev.name+(win?' +'+win:'');phase='idle';render();}
function counts(arr){return arr.reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{})}
function evaluate(h){const vals=h.map(c=>RANK_VALUE[c.r]).sort((a,b)=>a-b), suits=h.map(c=>c.s);const flush=suits.every(s=>s===suits[0]);let straight=vals.every((v,i)=>i===0||v===vals[i-1]+1) || vals.join(',')==='2,3,4,5,14';const cnt=Object.values(counts(h.map(c=>c.r))).sort((a,b)=>b-a);if(straight&&flush&&Math.max(...vals)===14)return{name:'ROYAL/ACE STRAIGHT FLUSH',mult:250};if(straight&&flush)return{name:'STRAIGHT FLUSH',mult:50};if(cnt[0]===4)return{name:'FOUR OF A KIND',mult:25};if(cnt[0]===3&&cnt[1]===2)return{name:'FULL HOUSE',mult:9};if(flush)return{name:'FLUSH',mult:6};if(straight)return{name:'STRAIGHT',mult:4};if(cnt[0]===3)return{name:'THREE OF A KIND',mult:3};if(cnt[0]===2&&cnt[1]===2)return{name:'TWO PAIR',mult:2};if(cnt[0]===2){const pairRank=Object.entries(counts(h.map(c=>c.r))).find(([r,n])=>n===2)[0];return ['J','Q','K','A'].includes(pairRank)?{name:'JACKS OR BETTER',mult:1}:{name:'LOW PAIR',mult:0}}return{name:'NO WIN',mult:0}}
dealBtn.onclick=deal;drawBtn.onclick=draw;betUp.onclick=()=>{if(phase==='idle'&&betVal<500){betVal+=25;ui()}};betDown.onclick=()=>{if(phase==='idle'&&betVal>25){betVal-=25;ui()}};ui();
})();
