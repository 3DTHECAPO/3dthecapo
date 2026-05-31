const SUPABASE_URL='https://fupoedrovfloudefyzna.supabase.co';
const SUPABASE_ANON='sb_publishable_smhu3oxA7tgS1nqZMau3Iw_58e7XzL1';
const TABLE='vault_codes';

const modeSelect=document.getElementById('modeSelect');
const qtyInput=document.getElementById('qtyInput');
const tierSelect=document.getElementById('tierSelect');
const startNumberInput=document.getElementById('startNumberInput');
const rewardPrefixSelect=document.getElementById('rewardPrefixSelect');
const suffixLengthInput=document.getElementById('suffixLengthInput');
const linkBaseInput=document.getElementById('linkBaseInput');
const tagInput=document.getElementById('tagInput');
const expiryModeSelect=document.getElementById('expiryModeSelect');
let currentNumber = Number(localStorage.getItem('play3d_generator_next_number') || startNumberInput.value || 100);
const expiryValueInput=document.getElementById('expiryValueInput');
const customExpiryInput=document.getElementById('customExpiryInput');
const customUnitSelect=document.getElementById('customUnitSelect');
const metadataToggle=document.getElementById('metadataToggle');
const outputModeSelect=document.getElementById('outputModeSelect');
const nfcFields=document.getElementById('nfcFields');
const rewardFields=document.getElementById('rewardFields');
const outputArea=document.getElementById('outputArea');
const countValue=document.getElementById('countValue');
const modeValue=document.getElementById('modeValue');
const batchValue=document.getElementById('batchValue');
const generateBtn=document.getElementById('generateBtn');
const copyBtn=document.getElementById('copyBtn');
const downloadTxtBtn=document.getElementById('downloadTxtBtn');
const downloadJsonBtn=document.getElementById('downloadJsonBtn');
const downloadCsvBtn=document.getElementById('downloadCsvBtn');
const sendSupabaseBtn=document.getElementById('sendSupabaseBtn');
const clearBtn=document.getElementById('clearBtn');
const statusLine=document.getElementById('statusLine');
const recipientEmailInput=document.getElementById('recipientEmailInput');
const recipientNameInput=document.getElementById('recipientNameInput');
const emailCodeBtn=document.getElementById('emailCodeBtn');

const nfcBaseInput=document.getElementById('nfcBaseInput');
const nfcFormatSelect=document.getElementById('nfcFormatSelect');
const makeNfcBtn=document.getElementById('makeNfcBtn');
const copyNfcBtn=document.getElementById('copyNfcBtn');
const downloadNfcCsvBtn=document.getElementById('downloadNfcCsvBtn');
const downloadNfcJsonBtn=document.getElementById('downloadNfcJsonBtn');
const testFirstNfcBtn=document.getElementById('testFirstNfcBtn');
const clearNfcBtn=document.getElementById('clearNfcBtn');
const nfcOutputArea=document.getElementById('nfcOutputArea');
const nfcStatusLine=document.getElementById('nfcStatusLine');


const dropNameInput=document.getElementById('dropNameInput');
const customerContactInput=document.getElementById('customerContactInput');
const makeMessageBtn=document.getElementById('makeMessageBtn');
const copyMessageBtn=document.getElementById('copyMessageBtn');
const markSentBtn=document.getElementById('markSentBtn');
const copyLabelBtn=document.getElementById('copyLabelBtn');
const downloadLabelsBtn=document.getElementById('downloadLabelsBtn');
const clearMessageBtn=document.getElementById('clearMessageBtn');
const customerMessageArea=document.getElementById('customerMessageArea');
const salesStatusLine=document.getElementById('salesStatusLine');


let currentBatch=[];

function setSalesStatus(msg){
  if(salesStatusLine) salesStatusLine.textContent = msg;
}

function getDropName(){
  return dropNameInput ? String(dropNameInput.value || '').trim() : '';
}

function getSelectedDuration(){
  return expiryModeSelect ? String(expiryModeSelect.value || '1h') : '1h';
}

function getFirstAvailableEntry(){
  return currentBatch.find(entry => !entry.sent) || currentBatch[0] || null;
}

function getCustomerLink(entry){
  if(typeof getNfcUrl === 'function') return getNfcUrl(entry);
  return 'https://3dthecapo.com/nfc/index.html?code=' + encodeURIComponent(entry.code || '');
}

function buildCustomerMessage(){
  const entry = getFirstAvailableEntry();
  if(!entry) return 'Generate a code first.';

  const name = recipientNameInput && recipientNameInput.value.trim() ? recipientNameInput.value.trim() : '';
  const contact = customerContactInput && customerContactInput.value.trim() ? customerContactInput.value.trim() : '';
  const drop = getDropName();
  const duration = entry.duration || getSelectedDuration();
  const link = getCustomerLink(entry);

  const lines = [];
  lines.push(`Your PLAY 3D vault access is ready${name ? ', ' + name : ''}.`);
  lines.push('');
  if(drop) lines.push(`DROP: ${drop}`);
  lines.push(`CODE: ${entry.code}`);
  lines.push(`ACCESS: ${duration === 'none' ? 'No expiry' : duration}`);
  lines.push('');
  lines.push('Enter here:');
  lines.push(link);
  lines.push('');
  lines.push('Your timer starts when you enter the code.');
  lines.push('- 3D THE CAPO');
  if(contact){
    lines.push('');
    lines.push(`CUSTOMER: ${contact}`);
  }
  return lines.join('\n');
}

function renderCustomerMessage(){
  if(!customerMessageArea) return;
  const entry = getFirstAvailableEntry();
  customerMessageArea.value = buildCustomerMessage();
  setSalesStatus(entry && entry.code ? `Message ready for ${entry.code}.` : 'Generate a batch first.');
}

async function copyCustomerMessage(){
  renderCustomerMessage();
  if(!customerMessageArea || !customerMessageArea.value.trim()) return;
  try{
    await navigator.clipboard.writeText(customerMessageArea.value);
    setSalesStatus('Customer message copied.');
  }catch(e){
    setSalesStatus('Copy failed. Select and copy manually.');
  }
}

function markFirstCodeSent(){
  const entry = getFirstAvailableEntry();
  if(!entry){
    setSalesStatus('Generate a batch first.');
    return;
  }
  entry.sent = true;
  entry.sent_at = new Date().toISOString();
  renderOutput();
  if(typeof renderNfcOutput === 'function') renderNfcOutput();
  renderCustomerMessage();
  setSalesStatus(`Marked ${entry.code} as SENT.`);
}

function buildTagLabel(entry){
  const drop = getDropName();
  const duration = entry.duration || getSelectedDuration();
  return [drop, entry.code || '', duration === 'none' ? 'NO EXPIRY' : duration.toUpperCase(), entry.sent ? 'SENT' : '']
    .filter(Boolean).join(' | ');
}

function buildAllLabels(){
  return currentBatch.map((entry, index) => `${String(index+1).padStart(3,'0')} - ${buildTagLabel(entry)}`).join('\n');
}

async function copyTagLabel(){
  const entry = getFirstAvailableEntry();
  if(!entry){
    setSalesStatus('Generate a batch first.');
    return;
  }
  try{
    await navigator.clipboard.writeText(buildTagLabel(entry));
    setSalesStatus(`Copied label for ${entry.code}.`);
  }catch(e){
    setSalesStatus('Copy label failed.');
  }
}

function downloadLabels(){
  if(!currentBatch.length){
    setSalesStatus('Generate a batch first.');
    return;
  }
  download('play3d-tag-labels.txt', buildAllLabels(), 'text/plain');
  setSalesStatus('Downloaded tag labels.');
}

function clearCustomerMessage(){
  if(customerMessageArea) customerMessageArea.value = '';
  setSalesStatus('Customer message cleared.');
}


const TIER_ROUTES = {
  ENTRY:'/nfc/entry-backdrop.html',
  GOLD:'/nfc/vault-interface.html',
  ELITE:'/nfc/album-chamber.html',
  DROP:'/nfc/merch-drop-room.html',
  MERCH:'/nfc/exclusive-merch-vault.html'
};

function setStatus(msg){
  if(statusLine) statusLine.textContent = msg;
}

function updateModeUi(){
  const mode=modeSelect.value;
  nfcFields.classList.toggle('hidden',mode!=='nfc');
  rewardFields.classList.toggle('hidden',mode!=='reward');
  modeValue.textContent=mode.toUpperCase();
}
updateModeUi();
modeSelect.addEventListener('change',()=>{ updateModeUi(); generateCodes(); renderCustomerMessage(); if(typeof renderNfcOutput === 'function') renderNfcOutput(); });

function randomSuffix(len){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out='';
  for(let i=0;i<len;i++) out+=chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function getExpiry(){
  const value = expiryModeSelect ? String(expiryModeSelect.value || 'none').trim() : 'none';

  if (value === 'none' || value === '') return null;

  function add(amount, unit){
    const n = parseInt(amount, 10);
    if (!n || n < 1) return null;

    const d = new Date();
    const u = String(unit || 'h').toLowerCase();

    if (u === 'm' || u.includes('min')) {
      d.setMinutes(d.getMinutes() + n);
    } else if (u === 'h' || u.includes('hour') || u.includes('hr')) {
      d.setHours(d.getHours() + n);
    } else {
      d.setDate(d.getDate() + n);
    }

    return d.toISOString();
  }

  if (value === 'custom') {
    const amount = customExpiryInput ? customExpiryInput.value : '';
    const unit = customUnitSelect ? customUnitSelect.value : 'h';
    return add(amount, unit);
  }

  const match = value.match(/^(\d+)\s*([a-zA-Z]+)$/);
  if (match) return add(match[1], match[2]);

  if (/^\d+$/.test(value)) {
    const label = expiryModeSelect && expiryModeSelect.selectedOptions && expiryModeSelect.selectedOptions[0]
      ? String(expiryModeSelect.selectedOptions[0].textContent || '').toLowerCase()
      : '';

    const unit = label.includes('min') ? 'm' :
                 label.includes('hour') || label.includes('hr') ? 'h' :
                 label.includes('day') ? 'd' :
                 'h';

    return add(value, unit);
  }

  return null;
}

function escapeSql(value){
  return String(value).replace(/'/g,"''");
}

function normalizeEmail(email){
  return String(email || '').trim().toLowerCase();
}

async function emailAlreadyHasCode(email){
  const clean = normalizeEmail(email);
  if(!clean) return { blocked:false };

  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?recipient_email=eq.${encodeURIComponent(clean)}&select=code,recipient_email&limit=1`, {
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`
      }
    });

    if(!res.ok){
      return { blocked:false, error: await res.text() };
    }

    const rows = await res.json().catch(()=>[]);

    // HARD LOCK: if this email exists anywhere, block forever.
    if(Array.isArray(rows) && rows.length > 0){
      return { blocked:true, row: rows[0] };
    }

    return { blocked:false };
  }catch(err){
    return { blocked:false, error:err.message };
  }
}

async function forcePatchRecipientEmail(code, email, duration){
  const cleanCode = String(code || '').trim().toUpperCase();
  const cleanEmail = normalizeEmail(email);
  if(!cleanCode || !cleanEmail) return false;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(cleanCode)}`, {
    method:'PATCH',
    headers:{
      'apikey':SUPABASE_ANON,
      'Authorization':`Bearer ${SUPABASE_ANON}`,
      'Content-Type':'application/json',
      'Prefer':'return=representation'
    },
    body:JSON.stringify({
      recipient_email: cleanEmail,
      duration: duration || '1h',
      expires_at: null
    })
  });

  if(!res.ok){
    const text = await res.text();
    if(text.toLowerCase().includes('duplicate') || text.includes('23505') || text.toLowerCase().includes('unique')){
      throw new Error('DUPLICATE_EMAIL_BLOCKED');
    }
    throw new Error(text);
  }

  const rows = await res.json().catch(()=>[]);
  return Array.isArray(rows) && rows[0] ? rows[0] : true;
}


function renderOutput(){
  const includeMeta=metadataToggle.checked;
  const mode=outputModeSelect.value;
  let out='';

  if(mode==='sql'){
    if(!currentBatch.length){
      outputArea.value='';
      return;
    }
    const values=currentBatch.map(entry=>{
      const expires=entry.expires_at ? `'${escapeSql(entry.expires_at)}'` : 'null';
      const tag=entry.tag ? `'${escapeSql(entry.tag)}'` : 'null';
      return `('${escapeSql(entry.code)}','${escapeSql(entry.code_type)}','${escapeSql(entry.route || '')}',false,${expires},${tag})`;
    }).join(',\n');
    out = `insert into public.vault_codes (code, code_type, route, used, expires_at, batch_tag) values\n${values}\non conflict (code) do nothing;`;
  } else if(mode==='links'){
    out = currentBatch.map(entry=>entry.link).join('\n');
  } else if(mode==='codes'){
    out = currentBatch.map(entry=>entry.code).join('\n');
  } else if(mode==='json'){
    out = JSON.stringify(currentBatch,null,2);
  } else if(mode==='csv'){
    const head=['code','code_type','route','used','expires_at','batch_tag','recipient_email','link'];
    const rows=currentBatch.map(entry=>[
      entry.code, entry.code_type, entry.route || '', 'false', entry.expires_at || '', entry.tag || '', entry.recipient_email || '', entry.link || ''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    out=[head.join(','),...rows].join('\n');
  }

  if(includeMeta && (mode==='links' || mode==='codes')){
    const lines=[];
    currentBatch.forEach((entry,index)=>{
      lines.push(`${index+1}. ${mode==='links' ? entry.link : entry.code}`);
      if(entry.code) lines.push(`   CODE: ${entry.code}`);
      if(entry.tag) lines.push(`   TAG: ${entry.tag}`);
      if(entry.recipient_email) lines.push(`   EMAIL: ${entry.recipient_email}`);
      if(entry.expiresOn) lines.push(`   EXPIRES: ${entry.expiresOn}`);
      if(entry.route) lines.push(`   ROUTE: ${entry.route}`);
    });
    out = lines.join('\n');
  }

  outputArea.value=out;
  countValue.textContent=String(currentBatch.length);
  batchValue.textContent=currentBatch.length ? (tagInput.value.trim() || 'Ready') : 'None';
}

function generateCodes(){
  const qty=Math.max(1,Math.min(500,Number(qtyInput.value)||1));
  currentNumber = Math.max(1, Number(startNumberInput.value) || currentNumber || 100);
  let linkBase=linkBaseInput.value.trim();
  const tag=tagInput.value.trim();
  // Do NOT start timer during generation.
  const mode=modeSelect.value;

  if(linkBase==='https://3dthecapo.com/nfc/index.html?nfc=1&code=' || !linkBase){
    linkBase='https://3dthecapo.com/public/vault/?code=';
    linkBaseInput.value=linkBase;
  }

  const batch=[];
  if(mode==='nfc'){
    const tier=tierSelect.value.toUpperCase();
    
    const route=TIER_ROUTES[tier] || '/nfc/entry-backdrop.html';
    for(let i=0;i<qty;i++){
      const code = `${tier}${String(currentNumber).padStart(3,'0')}`;
      currentNumber++;
      localStorage.setItem('play3d_generator_next_number', String(currentNumber));
      startNumberInput.value = currentNumber;
      batch.push({
  mode,
  code,
  code_type: tier,
  route,
  tag,
  duration: expiryModeSelect ? expiryModeSelect.value : '1h',
  drop_name: getDropName ? getDropName() : '',
  sent: false,
  expires_at: null, // timer starts when user redeems/opens link
  link: `${linkBase}${encodeURIComponent(code)}`
});
    }
  } else {
    const prefix=rewardPrefixSelect.value;
    const len=Math.max(4,Math.min(12,Number(suffixLengthInput.value)||6));
    const seen=new Set();
    while(batch.length<qty){
      const code=`${prefix}-${randomSuffix(len)}`;
      if(seen.has(code)) continue;
      seen.add(code);
      batch.push({
  mode,
  code,
  code_type: prefix,
  route: '',
  tag,
  duration: expiryModeSelect ? expiryModeSelect.value : '1h',
  drop_name: getDropName ? getDropName() : '',
  sent: false,
  expires_at: null, // timer starts when user redeems/opens link
  link: `${linkBase}${encodeURIComponent(code)}`
});
    }
  }

  currentBatch=batch;
  renderOutput();
  setStatus(`Generated ${currentBatch.length} code(s).`);
}

async function copyAll(){
  if(!outputArea.value.trim()) return;
  try{
    await navigator.clipboard.writeText(outputArea.value);
    setStatus('Copied.');
  }catch(e){
    setStatus('Copy failed. Long press and copy manually.');
  }
}


function setNfcStatus(msg){
  if(nfcStatusLine) nfcStatusLine.textContent = msg;
}

function getNfcBase(){
  let base = nfcBaseInput ? nfcBaseInput.value.trim() : 'https://3dthecapo.com/nfc/index.html?code=';
  if(!base) base = 'https://3dthecapo.com/nfc/index.html?code=';
  if(!base.includes('?code=')){
    if(base.endsWith('/')) base += 'nfc/index.html?code=';
    else base += '/nfc/index.html?code=';
  }
  return base;
}

function getNfcUrl(entry){
  return getNfcBase() + encodeURIComponent(entry.code || '');
}

function buildNfcLinks(){
  return currentBatch.map(entry => getNfcUrl(entry)).join('\n');
}

function buildNfcCsv(){
  const rows = ['code,nfc_url,code_type,duration,batch_tag,recipient_email'];
  currentBatch.forEach(entry => {
    const vals = [
      entry.code || '',
      getNfcUrl(entry),
      entry.code_type || '',
      entry.duration || (expiryModeSelect ? expiryModeSelect.value : ''),
      entry.tag || '',
      entry.recipient_email || ''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`);
    rows.push(vals.join(','));
  });
  return rows.join('\n');
}

function buildNfcJson(){
  return JSON.stringify(currentBatch.map(entry => ({
    code: entry.code || '',
    nfc_url: getNfcUrl(entry),
    code_type: entry.code_type || '',
    duration: entry.duration || (expiryModeSelect ? expiryModeSelect.value : ''),
    batch_tag: entry.tag || '',
    recipient_email: entry.recipient_email || ''
  })), null, 2);
}

function renderNfcOutput(){
  if(!nfcOutputArea) return;
  if(!currentBatch.length){
    nfcOutputArea.value = '';
    setNfcStatus('Generate a batch first.');
    return;
  }
  const format = nfcFormatSelect ? nfcFormatSelect.value : 'links';
  if(format === 'csv'){
    nfcOutputArea.value = buildNfcCsv();
    setNfcStatus(`NFC Batch CSV ready for ${currentBatch.length} code(s).`);
  } else if(format === 'json'){
    nfcOutputArea.value = buildNfcJson();
    setNfcStatus(`NFC Batch JSON ready for ${currentBatch.length} code(s).`);
  } else {
    nfcOutputArea.value = buildNfcLinks();
    setNfcStatus(`NFC Ready Links ready for ${currentBatch.length} code(s).`);
  }
}

async function copyNfcOutput(){
  renderNfcOutput();
  if(!nfcOutputArea || !nfcOutputArea.value.trim()) return;
  try{
    await navigator.clipboard.writeText(nfcOutputArea.value);
    setNfcStatus('Copied NFC output.');
  }catch(e){
    setNfcStatus('Copy failed. Select and copy manually.');
  }
}

function downloadNfcCsv(){
  if(!currentBatch.length){
    setNfcStatus('Generate a batch first.');
    return;
  }
  download('play3d-nfc-batch.csv', buildNfcCsv(), 'text/csv');
  setNfcStatus('Downloaded NFC CSV.');
}

function downloadNfcJson(){
  if(!currentBatch.length){
    setNfcStatus('Generate a batch first.');
    return;
  }
  download('play3d-nfc-batch.json', buildNfcJson(), 'application/json');
  setNfcStatus('Downloaded NFC JSON.');
}

function testFirstNfcLink(){
  if(!currentBatch.length){
    setNfcStatus('Generate a batch first.');
    return;
  }
  window.open(getNfcUrl(currentBatch[0]), '_blank', 'noopener');
  setNfcStatus('Opened first NFC link in new tab.');
}

function clearNfcOutput(){
  if(nfcOutputArea) nfcOutputArea.value = '';
  setNfcStatus('NFC output cleared.');
}

function download(name,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function sendToSupabase(){
  if(!currentBatch.length){
    setStatus('Generate a batch first.');
    return;
  }

  const selectedDuration = expiryModeSelect ? String(expiryModeSelect.value || '1h') : '1h';

  const records=currentBatch.map(({code, code_type, route, tag, recipient_email})=>({
    code,
    code_type,
    route: route || '',
    used:false,
    expires_at: null,
    duration: selectedDuration,
    recipient_email: recipient_email || null,
    batch_tag: tag || null
  }));

  setStatus('Sending to Supabase...');
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=code`, {
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'application/json',
        'Prefer':'resolution=merge-duplicates,return=representation'
      },
      body:JSON.stringify(records)
    });

    if(!res.ok){
      const text=await res.text();
      setStatus(`Send failed: ${text.slice(0,120)}`);
      outputArea.value = `SEND FAILED\n\n${text}`;
      return;
    }

    await res.json().catch(()=>[]);
    setStatus(`Sent/synced ${currentBatch.length} code(s) to Supabase.`);
  }catch(err){
    setStatus(`Send failed: ${err.message}`);
    outputArea.value = `SEND FAILED\n\n${err.message}`;
  }
}
function getExpiryFromNow(){
  return getExpiry();
}

async function activateCodeForEmail(entry){
  if(!entry || !entry.code){
    setStatus('Generate a code first.');
    return null;
  }

  const recipientEmail = normalizeEmail(recipientEmailInput ? recipientEmailInput.value : '');
  if(!recipientEmail){
    setStatus('Enter recipient email first.');
    alert('Enter recipient email first.');
    return null;
  }

  const localKey = 'play3d_email_issued_' + recipientEmail;
  const localExisting = localStorage.getItem(localKey);
  if(localExisting){
    setStatus(`BLOCKED: ${recipientEmail} already has ${localExisting}.`);
    alert(`${recipientEmail} already has a code on this device: ${localExisting}`);
    return null;
  }

  const existing = await emailAlreadyHasCode(recipientEmail);
  if(existing.blocked){
    const existingCode = existing.row && existing.row.code ? existing.row.code : 'an active code';
    localStorage.setItem(localKey, existingCode);
    setStatus(`BLOCKED: ${recipientEmail} already has ${existingCode}.`);
    alert(`${recipientEmail} already has a code: ${existingCode}\n\nDo not issue another code to the same email.`);
    return null;
  }

  const selectedDuration = expiryModeSelect ? String(expiryModeSelect.value || '1h') : (entry.duration || '1h');

  entry.duration = selectedDuration;
  entry.expires_at = null;
  entry.recipient_email = recipientEmail;

  const record = {
    code: entry.code,
    code_type: entry.code_type,
    route: entry.route || '',
    used:false,
    expires_at: null,
    duration: selectedDuration,
    recipient_email: recipientEmail,
    batch_tag: entry.tag || null
  };

  try{
    setStatus(`Saving emailed code for ${recipientEmail}...`);

    const upsert = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=code`, {
      method:'POST',
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`,
        'Content-Type':'application/json',
        'Prefer':'resolution=merge-duplicates,return=representation'
      },
      body:JSON.stringify([record])
    });

    if(!upsert.ok){
      const text = await upsert.text();

      if(text.toLowerCase().includes('duplicate') || text.includes('23505') || text.toLowerCase().includes('unique')){
        setStatus(`BLOCKED: ${recipientEmail} already has a code.`);
        alert(`${recipientEmail} already has a code. Duplicate emails are blocked.`);
        return null;
      }

      setStatus(`EMAIL CODE SAVE FAILED: ${text.slice(0,180)}`);
      alert('Email code save failed: ' + text.slice(0,180));
      return null;
    }

    const patched = await forcePatchRecipientEmail(entry.code, recipientEmail, selectedDuration);

    if(patched && patched.recipient_email){
      entry.recipient_email = patched.recipient_email;
      entry.duration = patched.duration || selectedDuration;
    }else{
      entry.recipient_email = recipientEmail;
      entry.duration = selectedDuration;
    }

    const verify = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(entry.code)}&select=code,recipient_email,duration,expires_at&limit=1`, {
      headers:{
        'apikey':SUPABASE_ANON,
        'Authorization':`Bearer ${SUPABASE_ANON}`
      }
    });
    const verifyRows = verify.ok ? await verify.json().catch(()=>[]) : [];
    const verifyRow = Array.isArray(verifyRows) && verifyRows[0] ? verifyRows[0] : null;

    if(!verifyRow || normalizeEmail(verifyRow.recipient_email) !== recipientEmail){
      setStatus('EMAIL SAVE VERIFY FAILED — recipient_email still not saved.');
      alert('Supabase did not save recipient_email. Do not email this code yet.');
      return null;
    }

    localStorage.setItem(localKey, entry.code);

    entry.expires_at = null;
    renderOutput();
    renderCustomerMessage();
    if(typeof renderNfcOutput === 'function') renderNfcOutput();

    setStatus(`Email code saved: ${entry.code} → ${entry.recipient_email} • duration ${entry.duration}.`);
    return entry;

  }catch(err){
    if(String(err.message || '').includes('DUPLICATE_EMAIL_BLOCKED')){
      setStatus(`BLOCKED: ${recipientEmail} already has a code.`);
      alert(`${recipientEmail} already has a code. Duplicate emails are blocked.`);
      return null;
    }

    setStatus(`EMAIL CODE SAVE ERROR: ${err.message}`);
    alert('Email code save error: ' + err.message);
    return null;
  }
}
function openEmailDraft(entry){
  const email = normalizeEmail(recipientEmailInput ? recipientEmailInput.value : '');
  const name = recipientNameInput ? recipientNameInput.value.trim() : '';
  if(!email){
    setStatus('Enter recipient email first.');
    return;
  }

  const duration = entry.duration || (expiryModeSelect ? expiryModeSelect.value : '1h');
  const durationLine = duration === 'none'
    ? '\nAccess: No expiry'
    : `\nAccess duration: ${duration}\nTimer starts when you enter/use the code.`;

  const subject = encodeURIComponent('Your PLAY 3D Vault Code');
  const body = encodeURIComponent(`What up ${name || ''},\n\nYour PLAY 3D vault code is: ${entry.code}\n\nUnlock link:\n${entry.link}${durationLine}\n\n- 3D THE CAPO`);
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}

async function emailFirstCode(){
  if(!currentBatch.length){
    setStatus('Generate a code first.');
    return;
  }

  setStatus('Checking email and preparing code...');
  const nextEntry = currentBatch.find(e => !e.emailed) || currentBatch[0];
  const entry = await activateCodeForEmail(nextEntry);

  if(!entry) return;

  entry.emailed = true;
  entry.emailed_at = new Date().toISOString();
  renderOutput();
  if(typeof renderNfcOutput === 'function') renderNfcOutput();

  openEmailDraft(entry);
}
generateBtn.addEventListener('click',generateCodes);
copyBtn.addEventListener('click',copyAll);
downloadTxtBtn.addEventListener('click',()=>{
  if(!currentBatch.length) return;
  download('play3d-codes.txt',outputArea.value,'text/plain');
});
downloadJsonBtn.addEventListener('click',()=>{
  if(!currentBatch.length) return;
  download('play3d-codes.json',JSON.stringify(currentBatch,null,2),'application/json');
});
if(downloadCsvBtn){
  downloadCsvBtn.addEventListener('click',()=>{
    if(!currentBatch.length) return;
    const previous=outputModeSelect.value;
    outputModeSelect.value='csv';
    renderOutput();
    download('play3d-codes.csv',outputArea.value,'text/csv');
    outputModeSelect.value=previous;
    renderOutput();
  });
}
if(sendSupabaseBtn){
  sendSupabaseBtn.addEventListener('click',sendToSupabase);
}
if(emailCodeBtn){
  emailCodeBtn.addEventListener('click',emailFirstCode);
}
clearBtn.addEventListener('click',()=>{
  currentBatch=[];
  outputArea.value='';
  countValue.textContent='0';
  batchValue.textContent='None';
  setStatus('Cleared.');
});

// SAFE INPUT HANDLING — DO NOT AUTO-INCREMENT CODES WHEN EDITING SETTINGS
if(metadataToggle) metadataToggle.addEventListener('change', renderOutput);
if(outputModeSelect) outputModeSelect.addEventListener('change', renderOutput);

if(modeSelect){
  modeSelect.addEventListener('change',()=>{
    updateModeUi();
    renderOutput();
    renderCustomerMessage();
    if(typeof renderNfcOutput === 'function') renderNfcOutput();
  });
}

if(tierSelect){
  tierSelect.addEventListener('change',()=>{
    const t=tierSelect.value;
    const n=localStorage.getItem('play3d_next_'+t);
    if(n && startNumberInput) startNumberInput.value=n;
  });
}


if(makeMessageBtn) makeMessageBtn.addEventListener('click', renderCustomerMessage);
if(copyMessageBtn) copyMessageBtn.addEventListener('click', copyCustomerMessage);
if(markSentBtn) markSentBtn.addEventListener('click', markFirstCodeSent);
if(copyLabelBtn) copyLabelBtn.addEventListener('click', copyTagLabel);
if(downloadLabelsBtn) downloadLabelsBtn.addEventListener('click', downloadLabels);
if(clearMessageBtn) clearMessageBtn.addEventListener('click', clearCustomerMessage);
if(dropNameInput) dropNameInput.addEventListener('input', ()=>{
  renderCustomerMessage();
  if(typeof renderNfcOutput === 'function') renderNfcOutput();
});
if(customerContactInput) customerContactInput.addEventListener('input', renderCustomerMessage);


if(makeNfcBtn) makeNfcBtn.addEventListener('click', renderNfcOutput);
if(copyNfcBtn) copyNfcBtn.addEventListener('click', copyNfcOutput);
if(downloadNfcCsvBtn) downloadNfcCsvBtn.addEventListener('click', downloadNfcCsv);
if(downloadNfcJsonBtn) downloadNfcJsonBtn.addEventListener('click', downloadNfcJson);
if(testFirstNfcBtn) testFirstNfcBtn.addEventListener('click', testFirstNfcLink);
if(clearNfcBtn) clearNfcBtn.addEventListener('click', clearNfcOutput);
if(nfcFormatSelect) nfcFormatSelect.addEventListener('change', renderNfcOutput);
if(nfcBaseInput) nfcBaseInput.addEventListener('input', renderNfcOutput);

generateCodes();
if(typeof renderNfcOutput === 'function') renderNfcOutput();
renderCustomerMessage();


// Debug helpers for browser console
window.getExpiry = getExpiry;
window.currentBatch = currentBatch;

window.emailAlreadyHasCode = emailAlreadyHasCode;
window.forcePatchRecipientEmail = forcePatchRecipientEmail;
