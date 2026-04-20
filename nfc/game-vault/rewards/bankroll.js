(function(){
const BASE=1000;
const START='play3d_start';
const BOOST='play3d_boost';
function ensureStarter(v){
 if(!localStorage.getItem(START)){
  localStorage.setItem(START,'1');
  if(!v||v<=0) return {value:BASE,msg:'STARTER '+BASE};
 }
 return {value:v,msg:''};
}
function queueBoost(a){
 const v=Number(localStorage.getItem(BOOST)||0);
 localStorage.setItem(BOOST,v+Number(a||0));
}
function applyBoost(v){
 const b=Number(localStorage.getItem(BOOST)||0);
 if(b>0){localStorage.setItem(BOOST,0);return {value:v+b,msg:'BOOST +'+b};}
 return {value:v,msg:''};
}
window.Play3DBankroll={ensureStarter,queueBoost,applyBoost};
})();