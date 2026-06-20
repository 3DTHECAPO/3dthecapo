const statusBox = document.getElementById('statusBox');
const input = document.getElementById('claimCodeInput');
const btn = document.getElementById('claimBtn');
const playBtn = document.getElementById('playBtn');

const SUPABASE_URL = 'https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON = 'sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
const USED_KEY = 'used_codes_v1';

function getUsed(){
  try{
    return JSON.parse(localStorage.getItem(USED_KEY) || '[]');
  }catch(e){
    return [];
  }
}

function setUsed(arr){
  localStorage.setItem(USED_KEY, JSON.stringify(arr));
}

function used(code){
  return getUsed().includes(String(code || '').toUpperCase().trim());
}

function markUsed(code){
  const clean = String(code || '').toUpperCase().trim();
  const arr = getUsed();
  if(!arr.includes(clean)){
    arr.push(clean);
    setUsed(arr);
  }
}

function parse(code){
  const upper = String(code || '').toUpperCase().trim();

  let m = upper.match(/^BOOST-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'boost', amount: parseInt(m[1], 10) || 0, raw: upper, needsClaim:false };

  m = upper.match(/^MEMBER-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'member', amount: parseInt(m[1], 10) || 0, raw: upper, needsClaim:true };

  m = upper.match(/^VIP-(\d+)-([A-Z0-9]+)$/);
  if(m) return { type:'vip', amount: parseInt(m[1], 10) || 0, raw: upper, needsClaim:true };

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

function isPaidMember(){
  try{
    if(window.Play3DMemberSystem){
      if(typeof Play3DMemberSystem.isPaidMember === 'function') return !!Play3DMemberSystem.isPaidMember();
      if(typeof Play3DMemberSystem.isMember === 'function') return !!Play3DMemberSystem.isMember();
    }
  }catch(e){}
  return false;
}

async function rewardEventExists(code){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reward_events?reward_code=eq.${encodeURIComponent(code)}&select=id&limit=1`,{
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`
      }
    });
    if(!res.ok) return false;
    const rows = await res.json().catch(()=>[]);
    return Array.isArray(rows) && rows.length > 0;
  }catch(e){
    return false;
  }
}

async function postJson(table, body){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{
    method:'POST',
    headers:{
      'apikey':SUPABASE_ANON,
      'Authorization':`Bearer ${SUPABASE_ANON}`,
      'Content-Type':'application/json',
      'Prefer':'return=minimal'
    },
    body:JSON.stringify(body)
  });
  if(res.ok) return true;
  const text = await res.text().catch(()=>'');
  throw new Error(`${table}: ${text || res.status}`);
}

function buildRewardEvent(parsed, paid){
  const id = identity();
  const email = String(id.email || '').trim().toLowerCase();
  const memberId = id.memberId || id.member_id || id.memberTableId || id.member_table_id || null;
  const memberNumber = id.memberNumber || id.member_number || null;
  const now = new Date().toISOString();

  const rewardLabel = parsed.type === 'boost'
    ? 'Boost Claim Code'
    : parsed.type === 'vip'
      ? 'VIP Claim Code'
      : 'Member Claim Code';

  const metadata = {
    event_name:'claim_code_redeemed',
    source:'claim_page',
    claim_code:parsed.raw,
    claim_type:parsed.type,
    quantity:parsed.amount,
    credits:paid ? parsed.amount : 0,
    requested_credits:parsed.amount,
    paid_member:paid,
    email,
    member_table_id:memberId,
    member_number:memberNumber,
    timestamp:now,
    page:window.location.pathname,
    status:paid ? 'earned' : 'promo_redeemed_not_paid_member'
  };

  Object.keys(metadata).forEach(k=>{
    if(metadata[k] === null || metadata[k] === undefined || metadata[k] === '') delete metadata[k];
  });

  return {
    member_id:memberId || undefined,
    email:email || undefined,
    reward_type:'bonus_content',
    reward_label:rewardLabel,
    reward_code:parsed.raw,
    credits:paid ? parsed.amount : 0,
    source:'claim_page',
    game:'claim',
    created_at:now,
    reward_metadata:metadata
  };
}

function buildRewardClaim(parsed){
  const id = identity();
  const email = String(id.email || '').trim().toLowerCase();
  const memberId = id.memberId || id.member_id || id.memberTableId || id.member_table_id || null;
  const memberNumber = id.memberNumber || id.member_number || null;
  const now = new Date().toISOString();

  return {
    member_id:memberId || undefined,
    member_number:memberNumber || undefined,
    email:email || undefined,
    reward_key:parsed.raw,
    reward_label:parsed.type === 'vip' ? 'VIP Claim Code' : 'Member Claim Code',
    claim_type:parsed.type,
    status:'pending_review',
    claim_status:'pending_review',
    source:'claim_page',
    created_at:now,
    metadata:{
      claim_code:parsed.raw,
      requested_credits:parsed.amount,
      credits:parsed.amount,
      paid_member:isPaidMember(),
      page:window.location.pathname
    }
  };
}

async function logClaim(parsed){
  const paid = isPaidMember();
  const exists = await rewardEventExists(parsed.raw);
  if(exists) return {ok:false, duplicate:true};

  const eventPayload = buildRewardEvent(parsed, paid);
  await postJson('reward_events', eventPayload);

  // Only create reward_claims for claim types that require review/fulfillment.
  // BOOST is just local/promo boost. MEMBER/VIP get admin visibility without
  // client-side fake paid-member activation.
  if(parsed.needsClaim){
    try{
      await postJson('reward_claims', buildRewardClaim(parsed));
    }catch(e){
      console.warn('reward_claims insert skipped/failed', e);
    }
  }

  return {ok:true, paid};
}

btn.onclick = async () => {
  const raw = input.value.trim();
  const p = parse(raw);

  if(!p){
    statusBox.textContent = 'INVALID';
    return;
  }

  if(used(p.raw)){
    statusBox.textContent = 'USED';
    return;
  }

  btn.disabled = true;
  statusBox.textContent = 'CHECKING...';

  try{
    const result = await logClaim(p);
    if(result.duplicate){
      statusBox.textContent = 'USED LIVE';
      markUsed(p.raw);
      return;
    }

    // Removed unsafe client-side paid member upgrade:
    // Play3DMemberSystem.setMember(true)
    // Member/VIP claim codes now create pending_review claim records instead.
    if(window.Play3DBankroll && typeof Play3DBankroll.queueBoost === 'function'){
      Play3DBankroll.queueBoost(p.amount);
    }

    markUsed(p.raw);

    if(p.needsClaim && !result.paid){
      statusBox.textContent = 'CLAIM PENDING REVIEW +' + p.amount;
    }else{
      statusBox.textContent = p.type === 'boost'
        ? 'BOOST ADDED +' + p.amount
        : 'CLAIM RECORDED +' + p.amount;
    }

    playBtn.style.display = 'block';
  }catch(e){
    console.warn(e);
    statusBox.textContent = 'CLAIM ERROR';
  }finally{
    btn.disabled = false;
  }
};
