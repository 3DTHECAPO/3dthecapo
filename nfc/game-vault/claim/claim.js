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

function supabaseClient(){
  return window.PLAY3D_SUPABASE || window.supabaseClient || window.supabase || null;
}

async function insertClaimRows(parsed){
  const client = supabaseClient();
  if(!client || typeof client.from !== 'function') throw new Error('Reward claims connection unavailable');
  const now = new Date().toISOString();
  const claim = {
    claim_code:parsed.raw,
    reward_type:parsed.type,
    amount:parsed.amount,
    status:'pending',
    source:'game_vault_claim',
    created_at:now
  };
  const reward = await client.from('reward_claims').insert(claim);
  if(reward.error) throw reward.error;
  try{
    await client.from('claim_log').insert({
      claim_code:parsed.raw,
      event_type:'submitted',
      status:'pending',
      source:'game_vault_claim',
      created_at:now
    });
  }catch(e){}
  return {ok:true};
}

function parse(code){
  const upper = code.toUpperCase().trim();

  let m = upper.match(/^BOOST-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'boost', amount: parseInt(m[1], 10) || 0, raw: upper };

  m = upper.match(/^MEMBER-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'member', amount: parseInt(m[1], 10) || 0, raw: upper };

  m = upper.match(/^VIP-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'member', amount: parseInt(m[1], 10) || 0, raw: upper };

  return null;
}

btn.onclick = async () => {
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

  if(p.type === 'member' && window.Play3DMemberSystem){
    Play3DMemberSystem.setMember(true);
  }

  try{
    await insertClaimRows(p);
  }catch(e){
    statusBox.textContent = 'CLAIM SAVE ERROR';
    return;
  }

  Play3DBankroll.queueBoost(p.amount);
  markUsed(raw);

  statusBox.textContent = p.type === 'member'
    ? 'MEMBER ACTIVE +' + p.amount
    : 'ADDED +' + p.amount;
  playBtn.style.display = 'block';
};
