(function(){
'use strict';
const codeInput = document.getElementById('vaultCode');
const enterVault = document.getElementById('enterVault');
const scannerBox = document.getElementById('scannerBox');

function normalizeCode(value){ return (value || '').trim().toUpperCase(); }
function buildVaultUrl(code){ return './index.html?nfc=1&code=' + encodeURIComponent(normalizeCode(code)); }
function goWithCode(code){
  const finalCode = normalizeCode(code);
  if(!finalCode){ alert('Enter a valid code.'); return; }
  window.location.href = buildVaultUrl(finalCode);
}
function playTapAnimation(){
  if(!scannerBox) return;
  scannerBox.classList.remove('tap-active');
  void scannerBox.offsetWidth;
  scannerBox.classList.add('tap-active');
  setTimeout(()=>scannerBox.classList.remove('tap-active'), 950);
}
enterVault.addEventListener('click', () => goWithCode(codeInput.value));
codeInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') goWithCode(codeInput.value);
});
if(scannerBox){
  scannerBox.addEventListener('click', playTapAnimation);
  scannerBox.addEventListener('touchstart', playTapAnimation, {passive:true});
}
})();