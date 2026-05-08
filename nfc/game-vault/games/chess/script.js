
(()=>{
const P={r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',p:'♟',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔',P:'♙'};
let board=[],sel=null,turn='w';
function reset(){board=['rnbqkbnr','pppppppp','........','........','........','........','PPPPPPPP','RNBQKBNR'].map(r=>r.split(''));turn='w';sel=null;draw('White to move');}
function color(p){if(p==='.')return null;return p===p.toUpperCase()?'w':'b'}
function pathClear(fr,fc,tr,tc){let dr=Math.sign(tr-fr),dc=Math.sign(tc-fc);let r=fr+dr,c=fc+dc;while(r!==tr||c!==tc){if(board[r][c]!=='.')return false;r+=dr;c+=dc}return true}
function legal(fr,fc,tr,tc){if(fr===tr&&fc===tc)return false;let p=board[fr][fc],target=board[tr][tc],own=color(p),opp=own==='w'?'b':'w';if(color(target)===own)return false;let dr=tr-fr,dc=tc-fc,adr=Math.abs(dr),adc=Math.abs(dc),lower=p.toLowerCase();
 if(lower==='p'){let dir=own==='w'?-1:1,start=own==='w'?6:1;if(dc===0&&target==='.'&&dr===dir)return true;if(dc===0&&fr===start&&dr===2*dir&&target==='.'&&board[fr+dir][fc]==='.')return true;if(adc===1&&dr===dir&&color(target)===opp)return true;return false}
 if(lower==='n')return (adr===2&&adc===1)||(adr===1&&adc===2);
 if(lower==='b')return adr===adc&&pathClear(fr,fc,tr,tc);
 if(lower==='r')return (dr===0||dc===0)&&pathClear(fr,fc,tr,tc);
 if(lower==='q')return ((adr===adc)||(dr===0||dc===0))&&pathClear(fr,fc,tr,tc);
 if(lower==='k')return adr<=1&&adc<=1;
 return false}
function draw(msg){boardEl.innerHTML='';for(let r=0;r<8;r++)for(let c=0;c<8;c++){let s=document.createElement('button');s.className='sq '+((r+c)%2?'dark':'light')+(sel&&sel[0]===r&&sel[1]===c?' selected':'');s.dataset.r=r;s.dataset.c=c;s.textContent=P[board[r][c]]||'';s.onclick=()=>click(r,c);boardEl.appendChild(s)}log.textContent=msg||((turn==='w'?'White':'Black')+' to move')}
function click(r,c){let p=board[r][c];if(!sel){if(p!=='.'&&color(p)===turn){sel=[r,c];draw('Selected '+P[p]);}return}let [fr,fc]=sel;if(legal(fr,fc,r,c)){board[r][c]=board[fr][fc];board[fr][fc]='.';turn=turn==='w'?'b':'w';sel=null;draw();}else{sel=null;draw('Illegal move. Try again.')}}
const boardEl=document.getElementById('board');newBtn.onclick=reset;reset();
})();
