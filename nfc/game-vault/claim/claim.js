const statusBox = document.getElementById('statusBox');
const input = document.getElementById('claimCodeInput');
const btn = document.getElementById('claimBtn');
const playBtn = document.getElementById('playBtn');

const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
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
  const upper = code.toUpperCase().trim();

  let m = upper.match(/^BOOST-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'boost', amount: parseInt(m[1], 10) || 0, raw: upper };

  m = upper.match(/^MEMBER-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'member', amount: parseInt(m[1], 10) || 0, raw: upper };

  m = upper.match(/^VIP-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'member', amount: parseInt(m[1], 10) || 0, raw: upper };

  return null;
}

function identity(){
  try{
    if(window.Play3DMemberSystem && typeof Play3DMemberSystem.identity === 'function'){
      return Play3DMemberSystem.identity() || {};
    }
  }catch(e){}
  return {};
}

async function postClaimRewardEvent(parsed){
  try{
    const id = identity();
    const email = String(id.email || '').trim().toLowerCase();
    const memberId = id.memberId || id.member_id || id.memberTableId || id.member_table_id || null;
    const memberNumber = id.memberNumber || id.member_number || null;
    const now = new Date().toISOString();
    const payload = {
      member_id: memberId || undefined,
      email: email || undefined,
      reward_type: 'bonus_content',
      reward_label: parsed.type === 'member' ? 'Member Claim Code' : 'Boost Claim Code',
      reward_code: parsed.raw,
      credits: parsed.amount,
      source: 'claim_page',
      game: 'claim',
      created_at: now,
      reward_metadata: {
        event_name: 'claim_code_redeemed',
        source: 'claim_page',
        claim_code: parsed.raw,
        claim_type: parsed.type,
        quantity: parsed.amount,
        credits: parsed.amount,
        email,
        member_table_id: memberId,
        member_number: memberNumber,
        timestamp: now,
        page: window.location.pathname
      }
    };
    Object.keys(payload.reward_metadata).forEach(k=>{if(payload.reward_metadata[k]===null || payload.reward_metadata[k]===undefined || payload.reward_metadata[k]==='') delete payload.reward_metadata[k];});
    await fetch(`${SUPABASE_URL}/rest/v1/reward_events`,{
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body:JSON.stringify(payload)
    });
  }catch(e){}
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

  Play3DBankroll.queueBoost(p.amount);
  markUsed(raw);
  postClaimRewardEvent(p).catch(()=>{});

  statusBox.textContent = p.type === 'member'
    ? 'MEMBER ACTIVE +' + p.amount
    : 'ADDED +' + p.amount;
  playBtn.style.display = 'block';
};
