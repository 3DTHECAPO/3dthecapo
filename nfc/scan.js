(function(){
'use strict';
const codeInput = document.getElementById('vaultCode');
const enterVault = document.getElementById('enterVault');

function normalizeCode(value){
  return (value || '').trim().toUpperCase();
}
function buildVaultUrl(code){
  return './index.html?nfc=1&code=' + encodeURIComponent(normalizeCode(code));
}
function goWithCode(code){
  const finalCode = normalizeCode(code);
  if(!finalCode){
    alert('Enter a valid code.');
    return;
  }
  window.location.href = buildVaultUrl(finalCode);
}
enterVault.addEventListener('click', () => goWithCode(codeInput.value));
codeInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') goWithCode(codeInput.value);
});
})();