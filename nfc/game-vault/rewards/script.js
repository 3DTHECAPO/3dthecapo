(()=>{'use strict';
const SUPABASE_URL='https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON='sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
const TABLES={members:'members',vaultCodes:'vault_codes',rewardEvents:'reward_events',rewardClaims:'reward_claims'};
const MILESTONES=[
  {credits:100000,label:'MUSIC UNLOCK'},
  {credits:250000,label:'MERCH ITEM'},
  {credits:400000,label:'PREMIUM DROP'},
  {credits:550000,label:'PREMIUM MERCH'},
  {credits:700000,label:'ELITE BUNDLE'},
  {credits:850000,label:'VIP REWARD'},
  {credits:1000000,label:'MILLION CREDIT REWARD'}
];
const $=id=>document.getElementById(id);
const els={refresh:$('refreshBtn'),exportCsv:$('exportCsvBtn'),copyReport:$('copyReportBtn'),search:$('searchInput'),statusFilter:$('statusFilter'),sort:$('sortSelect'),limit:$('limitInput'),statusLine:$('statusLine'),body:$('memberBody'),totalMembers:$('totalMembers'),activeMembers:$('activeMembers'),activePasses:$('activePasses'),totalCredits:$('totalCredits'),totalEvents:$('totalEvents'),openClaims:$('openClaims'),codesGenerated:$('codesGenerated'),codesUsed:$('codesUsed'),expiredPasses:$('expiredPasses'),detailSub:$('detailSub'),dMemberNumber:$('dMemberNumber'),dName:$('dName'),dEmail:$('dEmail'),dStatus:$('dStatus'),dTier:$('dTier'),dCode:$('dCode'),dExpires:$('dExpires'),dDaysLeft:$('dDaysLeft'),dCredits:$('dCredits'),dPoints:$('dPoints'),dEvents:$('dEvents'),dClaims:$('dClaims'),nextRewardLabel:$('nextRewardLabel'),nextRewardSub:$('nextRewardSub'),progressFill:$('progressFill'),detailEvents:$('detailEvents'),detailClaims:$('detailClaims'),liveToggle:$('liveRefreshToggle'),liveSeconds:$('liveRefreshSeconds'),lastLiveSync:$('lastLiveSyncInput'),selectedLive:$('selectedMemberLiveInput')};
let state={members:[],passes:[],events:[],claims:[],rows:[],filtered:[]};
let selectedMemberRow=null;
let liveRefreshTimer=null;
let liveRefreshInFlight=false;
let lastSelectedKey='';
function setStatus(m){if(els.statusLine)els.statusLine.textContent=m}
function s(v){return String(v??'').trim()} function low(v){return s(v).toLowerCase()} function up(v){return s(v).toUpperCase()} function n(v){const x=Number(v||0);return Number.isFinite(x)?x:0} function fmt(v){return Math.max(0,Math.floor(n(v))).toLocaleString()} function esc(v){return s(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function ms(v){const t=new Date(v||0).getTime();return Number.isFinite(t)?t:0} function fd(v){if(!v)return'-';try{return new Date(v).toLocaleString()}catch(e){return s(v)}} function dl(v){if(!v)return null;return (ms(v)-Date.now())/(1000*60*60*24)} function fdl(v){const d=dl(v);if(d===null)return'-';if(d<0)return'Expired';if(d<1)return Math.max(0,Math.ceil(d*24))+' hr';return Math.ceil(d)+' days'} function activePass(v){const d=dl(v);return d!==null&&d>0}

/* === REAL LIVE CREDIT TRACKING FROM EVENTS === */
function liveCreditMeta(ev){
  return ev?.reward_metadata || ev?.metadata || ev?.meta || {};
}

function liveCreditNumber(v){
  const x=Number(v||0);
  return Number.isFinite(x)?x:0;
}

function liveCreditType(ev){
  const meta=liveCreditMeta(ev);
  return low(meta.credit_type || ev.credit_type || meta.credits_type || ev.credits_type || meta.type || '');
}

function liveCreditAction(ev){
  const meta=liveCreditMeta(ev);
  return low(meta.action || ev.action || meta.reward_status || '');
}

function liveCreditPayment(ev){
  const meta=liveCreditMeta(ev);
  return low(meta.payment_method || ev.payment_method || '');
}

function liveCreditAmountPaid(ev){
  const meta=liveCreditMeta(ev);
  return Number(meta.amount_paid || ev.amount_paid || 0) || 0;
}

function liveCreditStatus(ev){
  const meta=liveCreditMeta(ev);
  return low(meta.payment_status || meta.reward_status || ev.payment_status || ev.status || '');
}

function isPendingPurchaseEvent(ev){
  const meta=liveCreditMeta(ev);
  const label=low(ev.reward_label || '');
  const eventName=low(meta.event_name || '');
  const status=liveCreditStatus(ev);
  return label.includes('purchase pending') ||
    eventName==='credit_purchase_request' ||
    ['pending','pending_review','reward_payment_verification','payment_verification','payment_started'].includes(status);
}

function isDeniedPurchaseEvent(ev){
  return ['denied','rejected','cancelled','canceled','failed'].includes(liveCreditStatus(ev));
}

function isGameRewardEvent(ev){
  const meta=liveCreditMeta(ev);
  return low(ev.reward_label || meta.event_name || '')==='game_win';
}

function liveCreditValue(ev){
  const meta=liveCreditMeta(ev);
  return liveCreditNumber(ev.credits ?? meta.credits ?? ev.points ?? meta.points ?? 0);
}

function isLiveCreditEvent(ev){
  const meta=liveCreditMeta(ev);
  const label=low(ev.reward_label || meta.reward_label || '');
  const source=low(ev.source || meta.source || '');
  const rtype=low(ev.reward_type || meta.reward_type || '');
  const eventName=low(meta.event_name || '');
  const ctype=liveCreditType(ev);
  const action=liveCreditAction(ev);
  return label==='admin_adjustment' ||
    label==='credit purchase' ||
    label==='credit purchase pending' ||
    label==='purchase_bonus' ||
    eventName==='admin_adjustment' ||
    eventName==='credit_purchase' ||
    eventName==='credit_purchase_request' ||
    eventName==='purchase_bonus' ||
    eventName==='game_win' ||
    source.includes('credit') ||
    rtype.includes('credit') ||
    ['purchased','earned','spent','refund','correction','reset'].includes(ctype) ||
    ['purchase','add','spend','subtract','refund','reset'].includes(action);
}

function buildLiveCreditTotals(r){
  const events=(r?.events||[]).filter(isLiveCreditEvent).slice().sort((a,b)=>ms(a.created_at)-ms(b.created_at));
  let purchased=0, pendingPurchased=0, earned=0, spent=0, refunded=0, revenue=0, balance=0, lifetime=0, lastPurchase='';

  events.forEach(ev=>{
    const meta=liveCreditMeta(ev);
    const credits=liveCreditValue(ev);
    const type=liveCreditType(ev);
    const action=liveCreditAction(ev);
    const payment=liveCreditPayment(ev);
    const paid=liveCreditAmountPaid(ev);
    const bankAfter=meta.bank_after ?? ev.bank_after ?? meta.balance_after ?? ev.balance_after;
    const pending=isPendingPurchaseEvent(ev);
    const denied=isDeniedPurchaseEvent(ev);

    if(pending){
      pendingPurchased += Math.max(0,Number(meta.requested_credits ?? meta.quantity ?? credits) || 0);
      return;
    }
    if(denied) return;

    if(bankAfter !== undefined && bankAfter !== null && bankAfter !== ''){
      balance=liveCreditNumber(bankAfter);
    }else{
      balance=Math.max(0,balance+credits);
    }

    if(type==='purchased' || action==='purchase' || low(ev.reward_label)==='credit purchase' || low(ev.reward_label)==='purchase_bonus' || low(meta.event_name)==='purchase_bonus' || payment==='stripe' || payment==='cash_app' || low(ev.reward_type)==='credit_purchase'){
      purchased += Math.max(0,credits);
      revenue += Math.max(0,paid);
      lifetime += Math.max(0,credits);
      if(!lastPurchase || ms(ev.created_at)>ms(lastPurchase)) lastPurchase=ev.created_at || '';
    }else if(type==='spent' || action==='spend'){
      spent += Math.abs(credits);
    }else if(type==='refund' || action==='refund'){
      refunded += Math.abs(credits);
      spent += Math.abs(credits);
    }else if(type==='correction' || action==='subtract'){
      if(credits<0) spent += Math.abs(credits);
      else earned += credits;
    }else if(type==='reset' || action==='reset'){
      spent += Math.abs(credits);
    }else if(credits>0){
      earned += credits;
      lifetime += credits;
    }else if(credits<0){
      spent += Math.abs(credits);
    }
  });

  // If no credit events exist yet, keep existing member credit field as current only.
  if(!events.length){
    balance=liveCreditNumber(r?.member?.credits ?? r?.member?.credit_count ?? r?.member?.current_credits ?? r?.member?.total_credits ?? r?.credits ?? 0);
    lifetime=liveCreditNumber(r?.member?.lifetime_credits ?? balance);
    purchased=liveCreditNumber(r?.member?.purchased_credits ?? 0);
    earned=liveCreditNumber(r?.member?.earned_credits ?? Math.max(0,balance-purchased));
    spent=liveCreditNumber(r?.member?.spent_credits ?? 0);
    revenue=liveCreditNumber(r?.member?.credit_revenue ?? 0);
  }

  return {events,purchased,pendingPurchased,earned,spent,refunded,revenue,balance,lifetime,lastPurchase};
}

function applyLiveCreditTotalsToRow(r){
  if(!r) return r;
  const totals=buildLiveCreditTotals(r);
  r.creditBreakdown=totals;
  r.credits=totals.balance;
  r.points=Math.max(liveCreditNumber(r.points), totals.lifetime);
  return r;
}
/* === END REAL LIVE CREDIT TRACKING FROM EVENTS === */

async function readTable(table,query){const res=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{headers:{apikey:SUPABASE_ANON,Authorization:`Bearer ${SUPABASE_ANON}`}});if(!res.ok)throw new Error(`${table}: ${res.status} ${await res.text().catch(()=>res.statusText)}`);const rows=await res.json().catch(()=>[]);return Array.isArray(rows)?rows:[]}
async function soft(table,queries){for(const q of queries){try{return await readTable(table,q)}catch(e){console.warn('[Tracker]',e.message)}}return[]}
async function load(){setStatus('Loading real members only...');const limit=Math.max(10,Math.min(1000,Number(els.limit?.value||250)));const [members,passes,events,claims]=await Promise.all([soft(TABLES.members,[`select=*&order=last_seen_at.desc.nullslast&limit=${limit}`,`select=*&limit=${limit}`]),soft(TABLES.vaultCodes,[`select=*&order=created_at.desc.nullslast&limit=${limit*4}`,`select=*&limit=${limit*4}`]),soft(TABLES.rewardEvents,[`select=*&order=created_at.desc.nullslast&limit=${limit*4}`,`select=*&limit=${limit*4}`]),soft(TABLES.rewardClaims,[`select=*&order=created_at.desc.nullslast&limit=${limit*4}`,`select=*&limit=${limit*4}`])]);state={members,passes,events,claims,rows:[],filtered:[]};state.rows=buildRows();applyFilters();setStatus(`Loaded ${state.rows.length} real members. Tracking codes, used codes, active passes, expired passes, credits, reward events, and claims live.`)}
function rowMetadata(o){return o?.reward_metadata||o?.metadata||o?.meta||{}}
function email(o){const meta=rowMetadata(o);return low(o?.email||o?.recipient_email||o?.recipientEmail||o?.sent_to||o?.customer_email||meta.email||'')} function code(o){const meta=rowMetadata(o);return up(o?.code||o?.vault_code||o?.access_code||meta.code||'')} function tier(o){const meta=rowMetadata(o);return up(o?.tier||o?.code_type||o?.member_tier||meta.tier||'')} function memNo(m){return s(m?.member_number||m?.memberNumber||m?.member_id||m?.id||m?.ID||'')} function name(m){return s(m?.name||m?.full_name||m?.member_name||m?.display_name||m?.NAME||'')} function status(m){return up(m?.member_status||m?.status||m?.subscription_status||'')} function paid(m){return ['ACTIVE','PAID','MEMBER','APPROVED','CURRENT'].includes(status(m))||!!m?.paid_registration||!!m?.paid_member} function credits(m){return n(m?.credits||m?.credit_count||m?.current_credits||m?.total_credits||m?.lifetime_credits||m?.reward_credits||0)} function points(m){return n(m?.points||m?.total_points||m?.reward_points||0)}
function findPassFor(r){const list=state.passes.filter(p=>(r.email&&email(p)===r.email)||(r.code&&code(p)===r.code)||(r.memberNumber&&s(p.member_number||p.metadata?.member_number)===r.memberNumber)||(r.memberId&&s(p.member_id||p.member_table_id||p.metadata?.member_table_id)===r.memberId));list.sort((a,b)=>ms(b.expires_at||b.used_at||b.created_at)-ms(a.expires_at||a.used_at||a.created_at));return list[0]||null}
function buildRows(){const rows=state.members.map(m=>{const r={member:m,email:email(m),name:name(m),memberNumber:memNo(m),memberId:s(m.id||m.ID||m.member_id||''),code:code(m),tier:tier(m),credits:credits(m),points:points(m),last_seen_at:m.last_seen_at||m.updated_at||m.created_at||'',events:[],claims:[]};const p=findPassFor(r);r.pass=p;r.code=r.code||(p?code(p):'');r.tier=r.tier||(p?tier(p):'');r.expires_at=p?p.expires_at:(m.pass_expires_at||m.expires_at||'');r.status=paid(m)?'active':(activePass(r.expires_at)?'pass':(r.expires_at?'expired':'no_access'));return r});
function match(payload){const meta=rowMetadata(payload),e=email(payload),c=code(payload),mn=s(payload.member_number||payload.memberNumber||payload.member_table_id||meta.member_number||''),mid=s(payload.member_id||payload.member_table_id||meta.member_table_id||meta.member_id||'');return rows.find(r=>(e&&r.email===e)||(c&&r.code===c)||(mn&&r.memberNumber===mn)||(mid&&r.memberId===mid))}
state.events.forEach(ev=>{const r=match(ev);if(!r)return;r.events.push(ev);const meta=rowMetadata(ev);r.credits=Math.max(r.credits,n(meta.bank_after||ev.bank_after||r.credits));if(!isPendingPurchaseEvent(ev)&&!isDeniedPurchaseEvent(ev))r.points+=n(ev.credits??meta.credits??ev.points??meta.points??0);r.last_seen_at=ev.created_at||r.last_seen_at});
state.claims.forEach(cl=>{const r=match(cl);if(!r)return;r.claims.push(cl);r.last_seen_at=cl.updated_at||cl.created_at||r.last_seen_at});rows.forEach(applyLiveCreditTotalsToRow);return rows}
function codeStats(){
  const rows = state.passes || [];
  return {
    generated: rows.length,
    used: rows.filter(p => p.used === true || String(p.used).toLowerCase() === 'true' || !!p.used_at).length,
    expired: rows.filter(p => p.expires_at && !activePass(p.expires_at)).length,
    active: rows.filter(p => activePass(p.expires_at)).length,
    unused: rows.filter(p => !(p.used === true || String(p.used).toLowerCase() === 'true' || !!p.used_at)).length
  };
}
function badge(r){if(r.status==='active')return['ACTIVE MEMBER','ok'];if(r.status==='pass')return['PASS ONLY','warn'];if(r.status==='expired')return['EXPIRED PASS','bad'];return['NO ACCESS','bad']}
function applyFilters(){const q=low(els.search?.value||''),f=low(els.statusFilter?.value||'');let rows=state.rows.slice();if(q)rows=rows.filter(r=>[r.memberNumber,r.name,r.email,r.code,r.tier,r.status].some(v=>low(v).includes(q)));if(f)rows=rows.filter(r=>r.status===f);const sort=els.sort?.value||'last_seen';rows.sort((a,b)=>sort==='credits'?b.credits-a.credits:sort==='days_left'?(dl(b.expires_at)||-999999)-(dl(a.expires_at)||-999999):sort==='events'?b.events.length-a.events.length:sort==='claims'?b.claims.length-a.claims.length:sort==='name'?s(a.name||a.email).localeCompare(s(b.name||b.email)):ms(b.last_seen_at)-ms(a.last_seen_at));state.filtered=rows;render()}
function render(){
  const rows = state.filtered || [];
  const cs = codeStats();
  const allRows = state.rows || [];

  if(els.totalMembers) els.totalMembers.textContent = fmt(allRows.length);
  if(els.activeMembers) els.activeMembers.textContent = fmt(allRows.filter(r=>r.status==='active').length);
  if(els.activePasses) els.activePasses.textContent = fmt(cs.active);
  if(els.totalCredits) els.totalCredits.textContent = fmt(allRows.reduce((a,r)=>a+n(r.credits),0));
  if(els.totalEvents) els.totalEvents.textContent = fmt(allRows.reduce((a,r)=>a+(r.events||[]).length,0));
  if(els.openClaims) els.openClaims.textContent = fmt(allRows.reduce((a,r)=>a+(r.claims||[]).filter(c=>!['approved','fulfilled','rejected','denied','complete','completed'].includes(low(c.status||c.claim_status))).length,0));
  if(els.codesGenerated) els.codesGenerated.textContent = fmt(cs.generated);
  if(els.codesUsed) els.codesUsed.textContent = fmt(cs.used);
  if(els.expiredPasses) els.expiredPasses.textContent = fmt(cs.expired);

  if(!rows.length){
    if(els.body) els.body.innerHTML='<tr><td colspan="10">No real members found in members table.</td></tr>';
    return;
  }

  if(els.body){
    els.body.innerHTML = rows.map((r,i)=>{
      const [lab,cls]=badge(r);
      return `<tr data-index="${i}"><td>${esc(r.memberNumber||'-')}</td><td><strong>${esc(r.name||r.email||'Unknown')}</strong><span class="small-muted">${esc(r.email||'-')}</span></td><td><span class="badge ${cls}">${esc(lab)}</span></td><td>${esc(r.tier||'-')}</td><td>${esc(r.code||'-')}</td><td>${esc(fdl(r.expires_at))}</td><td>${fmt(r.credits)}</td><td>${fmt((r.events||[]).length)}</td><td>${fmt((r.claims||[]).length)}</td><td>${esc(fd(r.last_seen_at))}</td></tr>`;
    }).join('');
  }
  els.body.querySelectorAll('tr[data-index]').forEach(tr=>tr.addEventListener('click',()=>selectRow(rows[Number(tr.dataset.index)])))}
function nextM(c){return MILESTONES.find(m=>n(c)<m.credits)||MILESTONES[MILESTONES.length-1]} function prevM(c){let p={credits:0,label:'Start'};MILESTONES.forEach(m=>{if(n(c)>=m.credits)p=m});return p}
function rewardEventLabel(ev){const meta=creditEventMeta(ev);const raw=ev?.reward_label||meta.reward_label||meta.event_name||ev?.event_type||ev?.reward_key||'reward_event';return s(raw).replace(/[_-]+/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase())}
function rewardEventCode(ev){const meta=creditEventMeta(ev);return s(ev?.reward_code||meta.reward_code||meta.reward_key||ev?.reward_key||'')}
function signedCredits(value){const amount=Math.trunc(n(value));return amount>0?`+${amount.toLocaleString()}`:amount.toLocaleString()}
function selectRow(r){selectedMemberRow=r;lastSelectedKey=selectedRowKey(r);fillCreditManagerFromSelected(r);updateLiveUi();window.Play3DVaultMemberFilter?.setMember(r);const [lab]=badge(r);els.detailSub.textContent=r.name||r.email||r.code||'Selected member';els.dMemberNumber.textContent=r.memberNumber||'-';els.dName.textContent=r.name||'-';els.dEmail.textContent=r.email||'-';els.dStatus.textContent=lab;els.dTier.textContent=r.tier||'-';els.dCode.textContent=r.code||'-';els.dExpires.textContent=fd(r.expires_at);els.dDaysLeft.textContent=fdl(r.expires_at);els.dCredits.textContent=fmt(r.credits);els.dPoints.textContent=fmt(r.points);els.dEvents.textContent=fmt(r.events.length);els.dClaims.textContent=fmt(r.claims.length);const nx=nextM(r.credits),pv=prevM(r.credits),span=Math.max(1,nx.credits-pv.credits),pct=Math.max(0,Math.min(100,((r.credits-pv.credits)/span)*100));els.nextRewardLabel.textContent=`Next reward: ${nx.label} at ${fmt(nx.credits)}`;els.nextRewardSub.textContent=r.credits>=nx.credits?'Milestone reached':`${fmt(nx.credits-r.credits)} credits left`;els.progressFill.style.width=pct+'%';els.detailEvents.innerHTML=r.events.slice(0,10).map(ev=>`<div class="mini-row"><strong>${esc(rewardEventLabel(ev))} ${liveCreditValue(ev)?esc(signedCredits(liveCreditValue(ev))):''}</strong><small>${esc(ev.game||ev.source||'')}${rewardEventCode(ev)?` • ${esc(rewardEventCode(ev))}`:''} • ${esc(fd(ev.created_at))}</small></div>`).join('')||'<div class="mini-row">No reward events.</div>';els.detailClaims.innerHTML=r.claims.slice(0,10).map(cl=>`<div class="mini-row"><strong>${esc(cl.reward_label||cl.reward_name||cl.claim_type||cl.reward_key||'claim')}</strong><small>${esc(cl.status||cl.claim_status||'pending')} • ${esc(fd(cl.created_at))}</small></div>`).join('')||'<div class="mini-row">No claims.</div>'}


/* === CREDIT MANAGER PURCHASE TRACKING === */
const CREDIT_EVENT_TABLE=TABLES.rewardEvents;

function creditEl(id){return document.getElementById(id)}
function setCreditStatus(m){const el=creditEl('creditStatusLine');if(el)el.textContent=m}
function creditValue(id){return s(creditEl(id)?.value||'')}
function creditSet(id,value){const el=creditEl(id);if(el)el.value=value??''}
function creditText(id,value){const el=creditEl(id);if(el)el.textContent=value??'-'}
function money(v){return '$'+(Number(v||0).toFixed(2))}

function creditEventMeta(ev){
  return ev?.reward_metadata || ev?.metadata || ev?.meta || {};
}

function isCreditAdjustmentEvent(ev){
  return low(ev?.reward_label||'')==='admin_adjustment' ||
    low(ev?.source||'').includes('credit') ||
    low(creditEventMeta(ev).event_name||'')==='admin_adjustment';
}

function eventCreditType(ev){
  const meta=creditEventMeta(ev);
  return low(meta.credit_type || ev.credit_type || meta.credits_type || ev.credits_type || '');
}

function eventPaymentMethod(ev){
  const meta=creditEventMeta(ev);
  return low(meta.payment_method || ev.payment_method || '');
}

function calculateCreditBreakdown(r){
  const t = buildLiveCreditTotals(r);
  return {
    purchased:t.purchased,
    pendingPurchased:t.pendingPurchased,
    earned:t.earned,
    spent:t.spent,
    refunded:t.refunded,
    lifetime:t.lifetime,
    revenue:t.revenue,
    lastPurchase:t.lastPurchase,
    current:t.balance
  };
}

function fillCreditManagerFromSelected(r){
  if(!r) return;
  const b=calculateCreditBreakdown(r);

  creditText('creditSelectedMember', r.memberNumber || r.memberId || '-');
  creditText('creditSelectedEmail', r.email || '-');
  creditText('creditSelectedBalance', fmt(r.credits));
  creditText('creditPurchasedTotal', fmt(b.purchased));
  creditText('creditEarnedTotal', fmt(b.earned));
  creditText('creditSpentTotal', fmt(b.spent));
  creditText('creditLifetimeTotal', fmt(b.lifetime));
  creditText('creditRevenueTotal', money(b.revenue));
  creditText('creditLastPurchase', b.lastPurchase ? fd(b.lastPurchase) : '-');
  creditText('creditLiveSource', 'reward_events live');
  creditText('creditSelectedCode', r.code || '-');
  creditText('creditSelectedTier', r.tier || '-');
  creditText('creditSelectedStatus', r.status || '-');

  creditSet('creditMemberIdInput', r.memberId || r.memberNumber || '');
  creditSet('creditEmailInput', r.email || '');
  creditSet('creditCodeInput', r.code || '');

  const reason=creditEl('creditReasonInput');
  if(reason && !reason.value.trim()) reason.value='member credit adjustment';

  syncCreditActionFields();
  setCreditStatus('Credit Manager loaded for selected member.');
}

function syncCreditActionFields(){
  const action=creditValue('creditActionSelect') || 'add';
  const method=creditEl('creditPaymentMethodSelect');
  const typeOut=creditEl('creditTypeOutput');
  const paid=creditEl('creditAmountPaidInput');

  let type='earned';

  if(action==='purchase'){
    type='purchased';
    if(method && !method.value) method.value='stripe';
    if(paid && Number(paid.value||0)===0) paid.value='5.00';
  }else if(action==='spend'){
    type='spent';
    if(method) method.value='';
    if(paid) paid.value='0';
  }else if(action==='refund'){
    type='refund';
    if(method && !method.value) method.value='stripe';
  }else if(action==='subtract'){
    type='correction';
    if(method) method.value='';
    if(paid) paid.value='0';
  }else if(action==='reset'){
    type='reset';
    if(method) method.value='';
    if(paid) paid.value='0';
  }else{
    type='earned';
    if(method && ['stripe','cash_app'].includes(method.value)) method.value='';
    if(paid) paid.value='0';
  }

  if(typeOut) typeOut.value=type;
}

function creditCleanPayload(){
  const action=creditValue('creditActionSelect') || 'add';
  const creditType=creditValue('creditTypeOutput') || 'earned';
  const rawAmount=Math.max(0,Math.floor(n(creditValue('creditAmountInput'))));
  const oldBalance=selectedMemberRow ? n(selectedMemberRow.credits) : 0;
  const amountPaid=Number(creditValue('creditAmountPaidInput')||0) || 0;
  const paymentMethod=creditValue('creditPaymentMethodSelect');
  const paymentRef=creditValue('creditPaymentRefInput');

  let delta=rawAmount;
  if(action==='subtract' || action==='spend' || action==='refund') delta=-rawAmount;
  if(action==='reset') delta=-oldBalance;

  const newBalance=action==='reset' ? 0 : Math.max(0, oldBalance + delta);
  const now=new Date().toISOString();

  return {
    member_id: creditValue('creditMemberIdInput') || selectedMemberRow?.memberId || null,
    member_table_id: selectedMemberRow?.memberId || null,
    member_number: selectedMemberRow?.memberNumber || null,
    email: low(creditValue('creditEmailInput') || selectedMemberRow?.email || ''),
    code: up(creditValue('creditCodeInput') || selectedMemberRow?.code || ''),
    tier: selectedMemberRow?.tier || '',
    credits: delta,
    amount: rawAmount,
    amount_paid: amountPaid,
    payment_method: paymentMethod || null,
    payment_ref: paymentRef || null,
    credit_type: creditType,
    credits_type: creditType,
    balance_before: oldBalance,
    balance_after: newBalance,
    action,
    reason: creditValue('creditReasonInput'),
    admin_source:'member_tracker_credit_manager',
    created_at:now,
    metadata:{
      page:window.location.pathname,
      href:window.location.href,
      member_number:selectedMemberRow?.memberNumber || '',
      code:selectedMemberRow?.code || '',
      tier:selectedMemberRow?.tier || '',
      bank_before:oldBalance,
      bank_after:newBalance,
      amount_paid:amountPaid,
      payment_method:paymentMethod || '',
      payment_ref:paymentRef || '',
      credit_type:creditType,
      credits_type:creditType,
      protected_systems_untouched:[
        'vault_codes','vault_logs','nfc','email_flow','routing',
        'used','used_at','expires_at','sent_at','duration','recipient_email'
      ]
    }
  };
}

function validateCreditPayload(p){
  if(!p.email && !p.member_id && !p.code) return 'Select a member or enter email/member/code.';
  if(p.action!=='reset' && !Math.abs(p.credits)) return 'Enter credit amount greater than 0.';
  if(p.action==='purchase' && !p.payment_method) return 'Choose Stripe or Cash App for purchase tracking.';
  if(p.action==='purchase' && !p.amount_paid) return 'Enter Amount Paid for credit purchase.';
  if(!p.reason) return 'Reason is required.';
  return '';
}

async function postJson(table, body){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{
    method:'POST',
    headers:{
      apikey:SUPABASE_ANON,
      Authorization:`Bearer ${SUPABASE_ANON}`,
      'Content-Type':'application/json',
      Prefer:'return=representation'
    },
    body:JSON.stringify(Array.isArray(body)?body:[body])
  });
  const text=await res.text().catch(()=>'');
  let data=null;
  try{data=text?JSON.parse(text):[]}catch(e){data=text}
  if(!res.ok) throw new Error(`${table}: ${typeof data==='string'?data:JSON.stringify(data)}`);
  return data;
}

async function patchMemberCredits(p){
  if(!selectedMemberRow || !selectedMemberRow.memberId) return {skipped:'No selected member table id.'};

  const breakdown=calculateCreditBreakdown(selectedMemberRow);
  const purchased=breakdown.purchased + (p.credit_type==='purchased' ? Math.max(0,p.credits) : 0);
  const earned=breakdown.earned + (p.credit_type==='earned' ? Math.max(0,p.credits) : 0);
  const spent=breakdown.spent + (['spent','refund','correction'].includes(p.credit_type) ? Math.abs(Math.min(0,p.credits)) : 0);
  const lifetime=breakdown.lifetime + (p.credits>0 ? p.credits : 0);
  const revenue=breakdown.revenue + (p.action==='purchase' ? Number(p.amount_paid||0) : 0);

  const candidates=[
    {
      credits:p.balance_after,
      purchased_credits:purchased,
      earned_credits:earned,
      spent_credits:spent,
      lifetime_credits:lifetime,
      credit_revenue:revenue,
      updated_at:p.created_at
    },
    {
      current_credits:p.balance_after,
      purchased_credits:purchased,
      earned_credits:earned,
      spent_credits:spent,
      lifetime_credits:lifetime,
      credit_revenue:revenue,
      updated_at:p.created_at
    },
    {credits:p.balance_after, updated_at:p.created_at},
    {credit_count:p.balance_after, updated_at:p.created_at},
    {current_credits:p.balance_after, updated_at:p.created_at},
    {total_credits:p.balance_after, updated_at:p.created_at}
  ];

  let lastErr=null;
  for(const body of candidates){
    try{
      const res=await fetch(`${SUPABASE_URL}/rest/v1/${TABLES.members}?id=eq.${encodeURIComponent(selectedMemberRow.memberId)}`,{
        method:'PATCH',
        headers:{
          apikey:SUPABASE_ANON,
          Authorization:`Bearer ${SUPABASE_ANON}`,
          'Content-Type':'application/json',
          Prefer:'return=representation'
        },
        body:JSON.stringify(body)
      });
      const text=await res.text().catch(()=>'');
      if(res.ok) return text?JSON.parse(text):[];
      lastErr=text;
    }catch(e){lastErr=e.message}
  }
  return {warning:lastErr || 'Member credits column update skipped.'};
}

function creditRewardEventPayload(p){
  const isPurchase=p.credit_type==='purchased';
  const eventName=isPurchase?'credit_purchase':'admin_adjustment';
  const rewardCode=`credit:${p.member_number||p.member_table_id||p.email||'member'}:${p.action}:${p.created_at}`;
  return {
    member_id:p.member_table_id || undefined,
    email:p.email || undefined,
    reward_type:'bonus_content',
    reward_label:isPurchase?'Credit Purchase':'admin_adjustment',
    reward_code:rewardCode,
    source:'member_tracker_credit_manager',
    game:'admin',
    credits:p.credits,
    created_at:p.created_at,
    reward_metadata:{
      event_name:eventName,
      reward_key:rewardCode,
      source:isPurchase?'credit_manager_purchase':'member_tracker_credit_manager',
      purchase_type:isPurchase?p.action:'',
      quantity:p.amount,
      amount:p.amount_paid,
      notes:p.reason,
      timestamp:p.created_at,
      code:p.code,
      email:p.email,
      tier:p.tier,
      member_table_id:p.member_table_id,
      member_number:p.member_number,
      reward_status:p.action,
      credits:p.credits,
      credit_type:p.credit_type,
      credits_type:p.credit_type,
      amount_paid:p.amount_paid,
      payment_method:p.payment_method,
      payment_ref:p.payment_ref,
      bank_before:p.balance_before,
      bank_after:p.balance_after,
      reason:p.reason,
      action:p.action,
      admin_source:p.admin_source,
      protected_systems_untouched:p.metadata.protected_systems_untouched
    }
  };
}

function creditEventFallback(p){
  const isPurchase=p.credit_type==='purchased';
  return {
    member_id:p.member_table_id || undefined,
    email:p.email || undefined,
    reward_type:'bonus_content',
    reward_label:isPurchase?'Credit Purchase':'admin_adjustment',
    reward_code:`credit:${p.member_number||p.member_table_id||p.email||'member'}:${p.action}:${p.created_at}`,
    source:'member_tracker_credit_manager',
    game:'admin',
    credits:p.credits,
    created_at:p.created_at
  };
}

async function postCreditRewardEvent(p){
  try{return await postJson(CREDIT_EVENT_TABLE, creditRewardEventPayload(p))}
  catch(primaryError){
    console.warn('[Credit Manager] reward_metadata payload rejected; retrying confirmed minimal reward_events payload.',primaryError);
    return await postJson(CREDIT_EVENT_TABLE, creditEventFallback(p));
  }
}

async function applyCreditAdjustment(){
  const p=creditCleanPayload();
  const err=validateCreditPayload(p);
  const out=creditEl('creditOutputArea');
  if(err){setCreditStatus(err);if(out)out.value=err;return}

  setCreditStatus('Saving credit record...');
  if(out)out.value='Saving credit record...';

  const result={ledger:'reward_events',reward_event:null,member_update:null,summary:{
    action:p.action,
    credit_type:p.credit_type,
    credits:p.credits,
    amount_paid:p.amount_paid,
    payment_method:p.payment_method,
    balance_before:p.balance_before,
    balance_after:p.balance_after
  },notes:[
    'Credit Manager tracks purchased / earned / spent / refund credits.',
    'vault_codes / vault_logs / NFC / email / routing / timers were not touched.'
  ]};

  try{
    result.reward_event=await postCreditRewardEvent(p);
    result.member_update=await patchMemberCredits(p);

    if(selectedMemberRow){
      selectedMemberRow.events.unshift(creditRewardEventPayload(p));
      applyLiveCreditTotalsToRow(selectedMemberRow);
      fillCreditManagerFromSelected(selectedMemberRow);
      selectRow(selectedMemberRow);
      render();
    }

    if(out)out.value=JSON.stringify(result,null,2);
    setCreditStatus(`${p.action} saved. ${p.credit_type} credits tracked. New balance: ${fmt(p.balance_after)}. Refreshing live data...`);
    await liveRefreshNow('credit saved / event totals rebuilt');
  }catch(e){
    if(out)out.value=`CREDIT SAVE FAILED

${e.message}`;
    setCreditStatus('Credit save failed: '+e.message.slice(0,140));
  }
}

function creditLookupQuery(){
  const email=low(creditValue('creditEmailInput') || selectedMemberRow?.email || '');
  const memberId=creditValue('creditMemberIdInput') || selectedMemberRow?.memberId || '';
  const code=up(creditValue('creditCodeInput') || selectedMemberRow?.code || '');
  if(email) return `email=eq.${encodeURIComponent(email)}&`;
  if(memberId) return `member_id=eq.${encodeURIComponent(memberId)}&`;
  if(code) return `reward_code=eq.${encodeURIComponent(code)}&`;
  return '';
}

async function lookupCreditHistory(){
  const out=creditEl('creditOutputArea');
  const filter=creditLookupQuery();
  if(!filter){setCreditStatus('Select a member or enter email/member/code to lookup.');return}
  setCreditStatus('Looking up credit history...');
  try{
    const fetched=await readTable(CREDIT_EVENT_TABLE, `${filter}select=*&order=created_at.desc&limit=100`);
    const rows=fetched.filter(isLiveCreditEvent).slice(0,50);
    const totals=rows.reduce((acc,ev)=>{
      const meta=creditEventMeta(ev);
      const credits=n(ev.credits||meta.credits||0);
      const type=eventCreditType(ev);
      if(isPendingPurchaseEvent(ev)) acc.pending+=Math.max(0,n(meta.requested_credits??meta.quantity??credits));
      else if(isDeniedPurchaseEvent(ev)) return acc;
      else if(type==='purchased') acc.purchased+=Math.max(0,credits);
      else if(type==='spent'||type==='refund') acc.spent+=Math.abs(credits);
      else if(credits>0) acc.earned+=credits;
      acc.revenue+=Number(meta.amount_paid||ev.amount_paid||0)||0;
      return acc;
    },{purchased:0,pending:0,earned:0,spent:0,revenue:0});
    const history=rows.map(ev=>({
      reward_label:rewardEventLabel(ev),
      reward_code:rewardEventCode(ev),
      credits:liveCreditValue(ev),
      reward_metadata:creditEventMeta(ev),
      source:ev.source||'',
      created_at:ev.created_at||''
    }));
    if(out)out.value=JSON.stringify({totals,history},null,2);
    setCreditStatus(`Loaded ${rows.length} credit event(s).`);
    updateLiveUi();
  }catch(e){
    if(out)out.value='LOOKUP FAILED\n\n'+e.message;
    setCreditStatus('Lookup failed: '+e.message.slice(0,140));
  }
}

async function sendRewardNotification(){
  const p=creditCleanPayload();
  const out=creditEl('creditOutputArea');
  if(!p.email){setCreditStatus('Email required.');return}
  if(!p.reason){setCreditStatus('Reason/message required.');return}
  setCreditStatus('Sending reward email...');
  try{
    const res=await fetch(`${SUPABASE_URL}/functions/v1/dynamic-endpoint`,{
      method:'POST',
      headers:{
        apikey:SUPABASE_ANON,
        Authorization:`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        source:'reward_notification',
        email:p.email,
        credits:p.credits,
        reward_name:p.credit_type==='purchased'?'PLAY 3D Credit Purchase':'PLAY 3D Reward Credits',
        reward_status:p.action,
        reason:p.reason,
        code:p.code,
        amount_paid:p.amount_paid,
        payment_method:p.payment_method
      })
    });
    const data=await res.json().catch(async()=>({error:await res.text()}));
    if(!res.ok || data.success===false) throw new Error(data.error||'Reward email failed.');
    if(out)out.value='Reward email sent.';
    setCreditStatus('Reward email sent.');
  }catch(e){
    if(out)out.value='REWARD EMAIL FAILED\n\n'+e.message;
    setCreditStatus('Reward email failed: '+e.message.slice(0,140));
  }
}

async function copyCreditLog(){
  const out=creditEl('creditOutputArea');
  if(!out || !out.value.trim())return;
  try{await navigator.clipboard.writeText(out.value);setCreditStatus('Credit log copied.')}
  catch(e){prompt('Copy credit log:',out.value)}
}

function clearCreditLog(){
  const out=creditEl('creditOutputArea');
  if(out)out.value='';
  setCreditStatus('Credit log cleared.');
}



function wireCreditManager(){
  creditEl('addCreditsBtn')?.addEventListener('click',applyCreditAdjustment);
  creditEl('lookupCreditsBtn')?.addEventListener('click',lookupCreditHistory);
  creditEl('sendRewardEmailBtn')?.addEventListener('click',sendRewardNotification);
  creditEl('copyCreditLogBtn')?.addEventListener('click',copyCreditLog);
  creditEl('clearCreditLogBtn')?.addEventListener('click',clearCreditLog);
  creditEl('creditActionSelect')?.addEventListener('change',syncCreditActionFields);
  creditEl('creditPaymentMethodSelect')?.addEventListener('change',syncCreditActionFields);
  syncCreditActionFields();
}
/* === END CREDIT MANAGER PURCHASE TRACKING === */



/* === LIVE TRACKING FIX === */
function selectedRowKey(r){
  if(!r) return '';
  return r.memberId || r.memberNumber || r.email || r.code || '';
}

function findRowByKey(key){
  if(!key) return null;
  return state.rows.find(r => selectedRowKey(r) === key || r.memberId === key || r.memberNumber === key || r.email === key || r.code === key) || null;
}

function updateLiveUi(){
  if(els.lastLiveSync) els.lastLiveSync.value = new Date().toLocaleTimeString();
  if(els.selectedLive) els.selectedLive.value = selectedMemberRow ? (selectedMemberRow.memberNumber || selectedMemberRow.email || selectedMemberRow.code || 'Selected') : 'None';
}

const originalLoadForLiveTracking = typeof load === 'function' ? load : null;
if(originalLoadForLiveTracking && !window.__PLAY3D_LIVE_TRACKING_PATCHED__){
  load = async function(){
    const keepKey = lastSelectedKey || selectedRowKey(selectedMemberRow);
    await originalLoadForLiveTracking.apply(this, arguments);
    if(keepKey){
      const updated = findRowByKey(keepKey);
      if(updated){
        selectedMemberRow = updated;
        lastSelectedKey = selectedRowKey(updated);
        fillCreditManagerFromSelected(updated);
        try{ selectRow(updated); }catch(e){}
      }
    }
    updateLiveUi();
  };
  window.__PLAY3D_LIVE_TRACKING_PATCHED__ = true;
}

async function liveRefreshNow(reason){
  if(liveRefreshInFlight) return;
  if(els.liveToggle && els.liveToggle.value === 'off') return;
  liveRefreshInFlight = true;
  try{
    await load();
    setStatus('Live tracker synced: members + codes + passes + credits + claims' + (reason ? ' — ' + reason : '') + '.');
  }catch(e){
    setStatus('Live tracking sync failed: ' + e.message.slice(0,140));
  }finally{
    liveRefreshInFlight = false;
  }
}

function startLiveTracking(){
  if(liveRefreshTimer) clearInterval(liveRefreshTimer);
  const seconds = Math.max(15, Number(els.liveSeconds && els.liveSeconds.value || 30));
  liveRefreshTimer = setInterval(()=>liveRefreshNow('auto refresh'), seconds * 1000);
  setStatus('Live tracking ON. Refreshing every ' + seconds + ' seconds.');
}

function stopLiveTracking(){
  if(liveRefreshTimer) clearInterval(liveRefreshTimer);
  liveRefreshTimer = null;
  setStatus('Live tracking OFF.');
}

function wireLiveTracking(){
  els.liveToggle?.addEventListener('change',()=>{
    if(els.liveToggle.value === 'off') stopLiveTracking();
    else { startLiveTracking(); liveRefreshNow('turned on'); }
  });
  els.liveSeconds?.addEventListener('change',()=>{
    if(!els.liveToggle || els.liveToggle.value !== 'off') startLiveTracking();
  });
  startLiveTracking();
}
/* === END LIVE TRACKING FIX === */


/* === FULL LIVE TRACKER RESTORE === */
function fullTrackerSnapshot(){
  const cs = codeStats();
  return {
    real_members:(state.rows||[]).length,
    active_paid:(state.rows||[]).filter(r=>r.status==='active').length,
    active_passes:cs.active,
    codes_generated:cs.generated,
    codes_used:cs.used,
    expired_passes:cs.expired,
    total_credits:(state.rows||[]).reduce((a,r)=>a+n(r.credits),0),
    reward_events:(state.rows||[]).reduce((a,r)=>a+(r.events||[]).length,0),
    open_claims:(state.rows||[]).reduce((a,r)=>a+(r.claims||[]).filter(c=>!['approved','fulfilled','rejected','denied','complete','completed'].includes(low(c.status||c.claim_status))).length,0),
    last_sync:new Date().toISOString()
  };
}

window.Play3DFullLiveTracker = {
  snapshot: fullTrackerSnapshot,
  refresh: liveRefreshNow,
  load: load
};
/* === END FULL LIVE TRACKER RESTORE === */

function csvEsc(v){const x=s(v);return /[",\n]/.test(x)?`"${x.replace(/"/g,'""')}"`:x} function exportCsv(){const lines=[['member_number','name','email','status','tier','linked_code','expires_at','days_left','credits','points','events','claims','last_seen_at'].join(',')];state.filtered.forEach(r=>lines.push([r.memberNumber,r.name,r.email,r.status,r.tier,r.code,r.expires_at,fdl(r.expires_at),r.credits,r.points,r.events.length,r.claims.length,r.last_seen_at].map(csvEsc).join(',')));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));a.download=`play3d-real-members-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)}
async function copyReport(){const text=state.filtered.map(r=>`${r.memberNumber||'-'} | ${r.name||'-'} | ${r.email||'-'} | ${r.status} | ${r.tier||'-'} | ${r.code||'-'} | ${fdl(r.expires_at)} | credits ${fmt(r.credits)} | events ${r.events.length} | claims ${r.claims.length}`).join('\n');try{await navigator.clipboard.writeText(text);setStatus('Copied real-member report.')}catch(e){prompt('Copy report:',text)}}
['input','change'].forEach(ev=>{els.search?.addEventListener(ev,applyFilters);els.statusFilter?.addEventListener(ev,applyFilters);els.sort?.addEventListener(ev,applyFilters)});els.refresh?.addEventListener('click',()=>load().catch(e=>setStatus('Load failed: '+e.message)));els.exportCsv?.addEventListener('click',exportCsv);els.copyReport?.addEventListener('click',copyReport);wireCreditManager();wireLiveTracking();load().catch(e=>setStatus('Load failed: '+e.message));
})();

/* === VAULT CODE MANAGER EMBEDDED FROM USER FILES === */
const ALLOWED_FIELDS = [
  "code",
  "recipient_email",
  "duration",
  "expires_at",
  "used",
  "used_at",
  "route",
  "sent",
  "sent_to",
  "sent_at",
  "batch_tag"
];

const FALLBACK_BASE = "https://3dthecapo.com";
const DEFAULT_ROUTE = "/nfc/index.html";

const state = {
  config: { url: "", key: "", source: "" },
  rows: [],
  visibleRows: [],
  extendCode: "",
  memberFilter: null
};

const $ = id => document.getElementById(id);

function maskSecrets(value){
  return String(value || "")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-***MASKED***")
    .replace(/AIza[0-9A-Za-z_-]{12,}/g, "AIza***MASKED***")
    .replace(/sb_[A-Za-z0-9_-]{12,}/g, "sb_***MASKED***")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "eyJ***MASKED***");
}

function setStatus(id, message, isError=false){
  const node = $(id);
  if(!node) return;
  node.textContent = maskSecrets(message);
  node.style.color = isError ? "var(--red)" : "var(--muted)";
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalize(value){
  return String(value ?? "").trim().toLowerCase();
}

function boolMatches(value, target){
  if(target === "all") return true;
  return String(Boolean(value)) === target;
}

function getFilters(){
  return {
    code: normalize($("filterCode").value),
    email: normalize($("filterEmail").value),
    batch: normalize($("filterBatch").value),
    route: normalize($("filterRoute").value),
    used: $("filterUsed").value,
    sent: $("filterSent").value
  };
}

function memberFilterLabel(filter){
  return filter.display || filter.email || filter.code || filter.memberNumber || filter.memberId || "selected member";
}

function rowMatchesMemberFilter(row, filter){
  if(!filter) return true;
  const rowRecipient = normalize(row.recipient_email);
  const rowSentTo = normalize(row.sent_to);
  const rowCode = normalize(row.code);
  const rowMemberNumber = normalize(row.member_number);
  const rowMemberId = normalize(row.member_id || row.member_table_id);
  if(filter.email && (rowRecipient === filter.email || rowSentTo === filter.email)) return true;
  if(filter.code && rowCode === filter.code) return true;
  if(filter.memberNumber && rowMemberNumber === filter.memberNumber) return true;
  if(filter.memberId && rowMemberId === filter.memberId) return true;
  return false;
}

function renderMemberFilterIndicator(){
  const indicator = $("vaultMemberFilterIndicator");
  const text = $("vaultMemberFilterText");
  if(!indicator || !text) return;
  if(!state.memberFilter){
    indicator.hidden = true;
    text.textContent = "";
    return;
  }
  indicator.hidden = false;
  text.textContent = `Filtered to member: ${memberFilterLabel(state.memberFilter)}`;
}

async function setVaultMemberFilter(member){
  state.memberFilter = member ? {
    email: normalize(member.email),
    code: normalize(member.code),
    memberNumber: normalize(member.memberNumber),
    memberId: normalize(member.memberId),
    display: member.email || member.memberNumber || member.code || member.memberId || "selected member"
  } : null;
  renderMemberFilterIndicator();
  if(state.memberFilter && !state.rows.length){
    await loadRows();
  }else{
    applyFilters();
  }
}

function clearVaultMemberFilter(){
  state.memberFilter = null;
  renderMemberFilterIndicator();
  applyFilters();
}

window.Play3DVaultMemberFilter = {
  setMember: setVaultMemberFilter,
  clear: clearVaultMemberFilter,
  get: () => state.memberFilter ? { ...state.memberFilter } : null
};

async function loadConfigFromAdmin(){
  state.config = {
    url: "https://fupoedrovfloudefyzna.supabase.co".trim().replace(/\/$/,""),
    key: "sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1".trim(),
    source: "member-manager"
  };
  setStatus("configStatus", "Loaded Supabase config from Member Manager. Key hidden.");
  return true;
}

function useManualConfig(){
  const url = $("manualUrl").value.trim().replace(/\/$/,"");
  const key = $("manualKey").value.trim();
  if(!url || !key){
    setStatus("configStatus", "Manual config needs both Supabase URL and key.", true);
    return false;
  }
  state.config = { url, key, source: "manual" };
  setStatus("configStatus", "Manual Supabase config loaded for this page session. Key hidden.");
  $("manualKey").value = "";
  return true;
}

function headers(prefer){
  const base = {
    "apikey": state.config.key,
    "Authorization": `Bearer ${state.config.key}`,
    "Content-Type": "application/json"
  };
  if(prefer) base.Prefer = prefer;
  return base;
}

function requireConfig(){
  if(!state.config.url || !state.config.key){
    throw new Error("Supabase config is not loaded.");
  }
}

async function supabaseFetch(path, options={}){
  requireConfig();
  const res = await fetch(`${state.config.url}${path}`, options);
  if(!res.ok){
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase request failed (${res.status}). ${text.slice(0,160)}`);
  }
  if(res.status === 204) return [];
  return res.json();
}

async function loadRows(){
  if(!state.config.url || !state.config.key){
    const loaded = await loadConfigFromAdmin();
    if(!loaded) return;
  }
  setStatus("tableStatus", "Loading vault_codes...");
  const select = ALLOWED_FIELDS.join(",");
  try{
    const rows = await supabaseFetch(`/rest/v1/vault_codes?select=${select}&order=code.asc&limit=1000`, {
      method: "GET",
      headers: headers()
    });
    state.rows = Array.isArray(rows) ? rows : [];
    applyFilters();
    setStatus("tableStatus", `Loaded ${state.rows.length} row(s) from vault_codes.`);
  }catch(error){
    setStatus("tableStatus", error.message, true);
  }
}

function applyFilters(){
  const filters = getFilters();
  state.visibleRows = state.rows.filter(row => {
    const matchesMember = rowMatchesMemberFilter(row, state.memberFilter);
    const matchesCode = !filters.code || normalize(row.code).includes(filters.code);
    const matchesEmail = !filters.email || normalize(row.recipient_email).includes(filters.email);
    const matchesBatch = !filters.batch || normalize(row.batch_tag).includes(filters.batch);
    const matchesRoute = !filters.route || normalize(row.route).includes(filters.route);
    const matchesUsed = boolMatches(row.used, filters.used);
    const matchesSent = boolMatches(row.sent, filters.sent);
    return matchesMember && matchesCode && matchesEmail && matchesBatch && matchesRoute && matchesUsed && matchesSent;
  });
  renderRows();
  renderStats();
}

function renderStats(){
  $("totalCount").textContent = state.rows.length;
  $("visibleCount").textContent = state.visibleRows.length;
  $("usedCount").textContent = state.rows.filter(row => Boolean(row.used)).length;
  $("sentCount").textContent = state.rows.filter(row => Boolean(row.sent)).length;
}

function booleanBadge(value){
  const bool = Boolean(value);
  return `<span class="boolean ${bool ? "true" : "false"}">${bool ? "true" : "false"}</span>`;
}

function cell(value, className=""){
  const empty = value === null || value === undefined || value === "";
  return `<td class="${empty ? "muted" : className}">${empty ? "-" : escapeHtml(value)}</td>`;
}

function renderRows(){
  const body = $("rowsBody");
  if(!state.visibleRows.length){
    const emptyMessage = state.memberFilter
      ? `No passes match the active member filter: ${escapeHtml(memberFilterLabel(state.memberFilter))}.`
      : (state.rows.length ? "No rows match the current filters." : "Load records to begin.");
    body.innerHTML = `<tr><td colspan="12" class="empty">${emptyMessage}</td></tr>`;
    return;
  }
  body.innerHTML = state.visibleRows.map(row => `
    <tr>
      ${cell(row.code, "code-cell")}
      ${cell(row.recipient_email)}
      ${cell(row.duration)}
      ${cell(row.expires_at)}
      <td>${booleanBadge(row.used)}</td>
      ${cell(row.used_at)}
      ${cell(row.route)}
      <td>${booleanBadge(row.sent)}</td>
      ${cell(row.sent_to)}
      ${cell(row.sent_at)}
      ${cell(row.batch_tag)}
      <td>
        <div class="row-actions">
          <button type="button" class="danger" data-action="revoke" data-code="${escapeHtml(row.code)}">Revoke</button>
          <button type="button" class="secondary" data-action="extend" data-code="${escapeHtml(row.code)}">Extend</button>
          <button type="button" class="secondary" data-action="clear-email" data-code="${escapeHtml(row.code)}">Clear Email</button>
          <button type="button" data-action="copy-link" data-code="${escapeHtml(row.code)}">Copy Link</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function findRow(code){
  return state.rows.find(row => String(row.code) === String(code));
}

async function patchByCode(code, patch){
  if(!code) throw new Error("Missing code for update.");
  const body = {};
  Object.keys(patch).forEach(key => {
    if(ALLOWED_FIELDS.includes(key)) body[key] = patch[key];
  });
  const updated = await supabaseFetch(`/rest/v1/vault_codes?code=eq.${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: headers("return=representation"),
    body: JSON.stringify(body)
  });
  const replacement = Array.isArray(updated) ? updated[0] : null;
  state.rows = state.rows.map(row => String(row.code) === String(code) ? { ...row, ...body, ...(replacement || {}) } : row);
  applyFilters();
}

async function revokeCode(code){
  const confirmed = confirm(`Revoke access for code ${code}? This sets used=true and used_at to now.`);
  if(!confirmed) return;
  try{
    await patchByCode(code, { used: true, used_at: new Date().toISOString() });
    setStatus("tableStatus", `Revoked ${code}.`);
  }catch(error){
    setStatus("tableStatus", error.message, true);
  }
}

function openExtendDialog(code){
  const row = findRow(code);
  state.extendCode = code;
  $("extendCodeLabel").textContent = `Update expires_at only for ${code}.`;
  $("extendExpiresAt").value = toDateTimeLocal(row && row.expires_at ? row.expires_at : "");
  $("extendDialog").showModal();
}

function toDateTimeLocal(value){
  if(!value) return "";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0,16);
}

function fromDateTimeLocal(value){
  if(!value) return "";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

async function confirmExtend(){
  const code = state.extendCode;
  const expiresAt = fromDateTimeLocal($("extendExpiresAt").value);
  if(!code || !expiresAt){
    setStatus("tableStatus", "Choose a valid expires_at date before updating.", true);
    return;
  }
  try{
    await patchByCode(code, { expires_at: expiresAt });
    $("extendDialog").close();
    setStatus("tableStatus", `Updated expires_at for ${code}.`);
  }catch(error){
    setStatus("tableStatus", error.message, true);
  }
}

async function clearRecipientEmail(code){
  const confirmed = confirm(`Clear recipient_email for ${code}? This does not clear sent_to or sent_at.`);
  if(!confirmed) return;
  try{
    await patchByCode(code, { recipient_email: null });
    setStatus("tableStatus", `Cleared recipient_email for ${code}.`);
  }catch(error){
    setStatus("tableStatus", error.message, true);
  }
}

function buildRouteLink(row){
  const route = String(row.route || DEFAULT_ROUTE).trim() || DEFAULT_ROUTE;
  let url;
  try{
    url = new URL(route, FALLBACK_BASE);
  }catch{
    url = new URL(DEFAULT_ROUTE, FALLBACK_BASE);
  }
  url.searchParams.set("code", row.code || "");
  return url.href;
}

async function copyLink(code){
  const row = findRow(code);
  if(!row) return;
  const link = buildRouteLink(row);
  try{
    await navigator.clipboard.writeText(link);
    setStatus("tableStatus", `Copied route link for ${code}.`);
  }catch{
    prompt("Copy route link", link);
  }
}

function exportCsv(){
  const rows = [ALLOWED_FIELDS.join(",")];
  state.visibleRows.forEach(row => {
    rows.push(ALLOWED_FIELDS.map(field => csvCell(row[field])).join(","));
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vault-codes-visible-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value){
  const text = String(value ?? "");
  return `"${text.replace(/"/g,'""')}"`;
}

function clearFilters(){
  ["filterCode","filterEmail","filterBatch","filterRoute"].forEach(id => { $(id).value = ""; });
  $("filterUsed").value = "all";
  $("filterSent").value = "all";
  applyFilters();
}

function bindEvents(){
  $("loadCodesBtn").addEventListener("click", loadRows);
  $("useManualConfigBtn").addEventListener("click", () => {
    if(useManualConfig()) loadRows();
  });
  $("vaultExportCsvBtn").addEventListener("click", exportCsv);
  $("clearFiltersBtn").addEventListener("click", clearFilters);
  $("clearMemberFilterBtn").addEventListener("click", clearVaultMemberFilter);
  ["filterCode","filterEmail","filterBatch","filterRoute","filterUsed","filterSent"].forEach(id => {
    $(id).addEventListener("input", applyFilters);
    $(id).addEventListener("change", applyFilters);
  });
  $("rowsBody").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if(!button) return;
    const { action, code } = button.dataset;
    if(action === "revoke") revokeCode(code);
    if(action === "extend") openExtendDialog(code);
    if(action === "clear-email") clearRecipientEmail(code);
    if(action === "copy-link") copyLink(code);
  });
  $("cancelExtendBtn").addEventListener("click", () => $("extendDialog").close());
  $("confirmExtendBtn").addEventListener("click", confirmExtend);
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadConfigFromAdmin();
  renderMemberFilterIndicator();
});

/* === END VAULT CODE MANAGER EMBED === */
