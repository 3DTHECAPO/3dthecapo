const statusBox = document.getElementById('statusBox');
const input = document.getElementById('claimCodeInput');
const btn = document.getElementById('claimBtn');
const playBtn = document.getElementById('playBtn');

const USED_KEY = 'used_codes_v1';

function getUsed(){
  return JSON.parse(localStorage.getItem(USED_KEY) || '[]');
}

function setUsed(arr){
  localStorage.setItem(USED_KEY, JSON.stringify(arr));
}

function used(code){
  return getUsed().includes(code);
}

function markUsed(code){
  const arr = getUsed();
  if(!arr.includes(code)){
    arr.push(code);
    setUsed(arr);
  }
}

function parse(code){
  const m = code.toUpperCase().match(/^BOOST-(\d+)-([A-Z0-9]+)$/);
  if(!m) return null;
  return {amount: parseInt(m[1])};
}

btn.onclick = () => {
  const raw = input.value.trim();
  const p = parse(raw);

  if(!p){
    statusBox.textContent = 'INVALID';
    return;
  }

  if(used(raw)){
    statusBox.textContent = 'USED';
    return;
  }

  Play3DBankroll.queueBoost(p.amount);
  markUsed(raw);

  statusBox.textContent = 'ADDED +' + p.amount;
  playBtn.style.display = 'block';
};
