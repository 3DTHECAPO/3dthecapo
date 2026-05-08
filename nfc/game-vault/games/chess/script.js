
(()=>{
let b=[],sel=null,turn='w',gameOver=false;const start=['r','n','b','q','k','b','n','r'];
const icons={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
function reset(){b=Array(64).fill('');for(let i=0;i<8;i++){b[i]='b'+start[i];b[i+8]='bp';b[48+i]='wp';b[56+i]='w'+start[i]}sel=null;turn='w';gameOver=false;log.textContent='White to move. Legal chess movement is active.';draw()}
function rc(i){return [Math.floor(i/8),i%8]} function idx(r,c){return r*8+c} function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function clearPath(a,z){let [ar,ac]=rc(a),[zr,zc]=rc(z),dr=Math.sign(zr-ar),dc=Math.sign(zc-ac);let r=ar+dr,c=ac+dc;while(r!==zr||c!==zc){if(b[idx(r,c)])return false;r+=dr;c+=dc}return true}
function legal(a,z){if(gameOver||a===z||!b[a])return false;let p=b[a],side=p[0],kind=p[1],target=b[z];if(target&&target[0]===side)return false;let [ar,ac]=rc(a),[zr,zc]=rc(z),dr=zr-ar,dc=zc-ac,adr=Math.abs(dr),adc=Math.abs(dc);
 if(kind==='p'){let dir=side==='w'?-1:1,startRow=side==='w'?6:1;if(dc===0&&!target&&dr===dir)return true;if(dc===0&&!target&&ar===startRow&&dr===2*dir&&!b[idx(ar+dir,ac)])return true;if(adc===1&&dr===dir&&target&&target[0]!==side)return true;return false}
 if(kind==='n')return (adr===2&&adc===1)||(adr===1&&adc===2);
 if(kind==='b')return adr===adc&&clearPath(a,z);
 if(kind==='r')return (dr===0||dc===0)&&clearPath(a,z);
 if(kind==='q')return ((adr===adc)||(dr===0||dc===0))&&clearPath(a,z);
 if(kind==='k')return adr<=1&&adc<=1;
 return false}
function draw(){board.innerHTML='';b.forEach((p,i)=>{let s=document.createElement('button');s.style.height='70px';s.style.border='1px solid #111';s.style.fontSize='42px';s.style.background=((Math.floor(i/8)+i)%2)?'#7d5a22':'#e6d097';s.style.color=p[0]==='b'?'#111':'#fff';s.style.textShadow='0 2px 5px #000';s.textContent=icons[p]||'';if(sel===i)s.style.outline='4px solid gold';if(sel!==null&&legal(sel,i))s.style.boxShadow='inset 0 0 0 5px rgba(255,215,0,.55)';s.onclick=()=>click(i);board.appendChild(s)});mainScore.textContent=gameOver?'WIN':(turn==='w'?'WHITE':'BLACK');stateText.textContent=gameOver?'GAME OVER':'TURN'}
function click(i){if(gameOver)return;if(sel===null){if(b[i]&&b[i][0]===turn){sel=i;draw()}return}if(i===sel){sel=null;draw();return}if(legal(sel,i)){let captured=b[i];b[i]=b[sel];b[sel]='';if(captured&&captured[1]==='k'){gameOver=true;log.textContent=(turn==='w'?'White':'Black')+' captured the king and wins.'}else{turn=turn==='w'?'b':'w';log.textContent=(turn==='w'?'White':'Black')+' to move.'}sel=null;draw()}else{log.textContent='Illegal move for that piece.';sel=null;draw()}}
newBtn.onclick=reset;reset();
})();
