const statusBox = document.getElementById('statusBox');
const input = document.getElementById('claimCodeInput');
const btn = document.getElementById('claimBtn');

const USED_CLAIM_CODES_KEY = 'play3d_used_claim_codes_v1';

function getUsedClaimCodes(){
  try{
    const raw = localStorage.getItem(USED_CLAIM_CODES_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){
    return [];
  }
}

function markClaimCodeUsed(code){
  const used = getUsedClaimCodes();
  if(!used.includes(code)){
    used.push(code);
    localStorage.setItem(USED_CLAIM_CODES_KEY, JSON.stringify(used));
  }
}

function isClaimCodeUsed(code){
  return getUsedClaimCodes().includes(code);
}

function parseBoostCode(raw){
  const code = String(raw || '').trim().toUpperCase();
  const match = code.match(/^BOOST-(\d+)-([A-Z0-9]+)$/);
  if(!match) return null;
  return {
    code,
    amount: Math.max(0, parseInt(match[1], 10) || 0)
  };
}

function setStatus(text){
  statusBox.textContent = text;
}

function applyClaim(rawCode){
  const parsed = parseBoostCode(rawCode);
  if(!parsed || !parsed.amount){
    setStatus('INVALID CODE');
    return;
  }
  if(isClaimCodeUsed(parsed.code)){
    setStatus('CODE ALREADY USED');
    return;
  }
  if(!window.Play3DBankroll){
    setStatus('BANKROLL SYSTEM MISSING');
    return;
  }

  Play3DBankroll.queueBoost(parsed.amount);
  markClaimCodeUsed(parsed.code);
  setStatus('CREDITS ADDED +' + parsed.amount.toLocaleString());
  input.value = parsed.code;
}

btn.addEventListener('click', () => applyClaim(input.value));

const params = new URLSearchParams(window.location.search);
const autoCode = params.get('claim') || '';
if(autoCode){
  input.value = autoCode.toUpperCase();
  applyClaim(autoCode);
}
