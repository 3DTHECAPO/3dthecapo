(function(){
'use strict';
const codeInput = document.getElementById('vaultCode');
const sessionMinutes = document.getElementById('sessionMinutes');
const sessionStatus = document.getElementById('sessionStatus');
const enterVault = document.getElementById('enterVault');
const saveSession = document.getElementById('saveSession');
const clearSession = document.getElementById('clearSession');
const simEntry = document.getElementById('simulateEntry');
const simGold = document.getElementById('simulateGold');
const simElite = document.getElementById('simulateElite');
const SESSION_KEY = 'capo_vault_session_v1';
function normalizeCode(value){ return (value || '').trim().toUpperCase(); }
function buildVaultUrl(code){ return './index.html?nfc=1&code=' + encodeURIComponent(normalizeCode(code)); }
function getSession(){ try{ const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; }catch(err){ return null; } }
function setSession(code, minutes){ const expiresAt = Date.now() + (minutes * 60 * 1000); localStorage.setItem(SESSION_KEY, JSON.stringify({ code: normalizeCode(code), expiresAt })); renderSession(); }
function clearVaultSession(){ localStorage.removeItem(SESSION_KEY); renderSession(); }
function renderSession(){
  const session = getSession();
  if(!session || !session.code || !session.expiresAt){ sessionStatus.textContent = 'No active vault session.'; return; }
  if(Date.now() > session.expiresAt){ localStorage.removeItem(SESSION_KEY); sessionStatus.textContent = 'Previous session expired.'; return; }
  const mins = Math.max(1, Math.round((session.expiresAt - Date.now()) / 60000));
  sessionStatus.textContent = 'Active session: ' + session.code + ' • expires in ' + mins + ' min';
}
function goWithCode(code){
  const finalCode = normalizeCode(code);
  if(!finalCode){ alert('Enter a valid code.'); return; }
  window.location.href = buildVaultUrl(finalCode);
}
enterVault.addEventListener('click', () => goWithCode(codeInput.value));
saveSession.addEventListener('click', () => {
  const code = normalizeCode(codeInput.value);
  if(!code){ alert('Enter a valid code first.'); return; }
  setSession(code, parseInt(sessionMinutes.value, 10));
});
clearSession.addEventListener('click', clearVaultSession);
simEntry.addEventListener('click', () => goWithCode('ENTRY001'));
simGold.addEventListener('click', () => goWithCode('GOLD001'));
simElite.addEventListener('click', () => goWithCode('ELITE001'));
renderSession();
const session = getSession();
if(session && session.code && session.expiresAt && Date.now() < session.expiresAt){
  const auto = new URLSearchParams(window.location.search).get('auto');
  if(auto === '1'){ window.location.href = buildVaultUrl(session.code); }
}
})();