window.GameVault = {
  money(n){ return `$${Number(n).toLocaleString(undefined,{maximumFractionDigits:0})}`; },
  rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; },
  pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; },
  confetti(messageEl, text){
    if(!messageEl) return;
    messageEl.textContent = text;
    messageEl.animate([
      { transform:'scale(.98)', opacity:.5 },
      { transform:'scale(1.03)', opacity:1 },
      { transform:'scale(1)', opacity:1 }
    ], { duration:450, easing:'ease-out' });
  }
};
