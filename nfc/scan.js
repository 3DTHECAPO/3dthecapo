(function(){
'use strict';

const codeInput = document.getElementById('vaultCode');
const enterVault = document.getElementById('enterVault');
const scannerBox = document.getElementById('scannerBox');

function normalizeCode(value){
  return (value || '').trim().toUpperCase();
}

function buildVaultUrl(code){
  return './index.html?code=' + encodeURIComponent(normalizeCode(code));
}

function playTapAnimation(){
  if(!scannerBox) return;

  scannerBox.classList.remove('tap-active');
  void scannerBox.offsetWidth;
  scannerBox.classList.add('tap-active');

  setTimeout(()=>{
    scannerBox.classList.remove('tap-active');
  }, 950);
}

function runScanCinematic(finalCode){
  const cinematic = document.getElementById('scanCinematic');
  const status = cinematic ? cinematic.querySelector('.scan-status') : null;

  if(!cinematic){
    window.location.href = buildVaultUrl(finalCode);
    return;
  }

  cinematic.classList.add('active');
  cinematic.setAttribute('aria-hidden', 'false');

  if(status) status.textContent = 'INITIALIZING...';

  setTimeout(()=>{
    if(status) status.textContent = 'AUTHENTICATING...';
  }, 700);

  setTimeout(()=>{
    if(status) status.textContent = 'ACCESS GRANTED';
    cinematic.classList.add('granted');
  }, 1700);

  setTimeout(()=>{
    window.location.href = buildVaultUrl(finalCode);
  }, 2600);
}

function goWithCode(code){
  const finalCode = normalizeCode(code);

  if(!finalCode){
    alert('Enter a valid code.');
    return;
  }

  playTapAnimation();
  runScanCinematic(finalCode);
}

if(enterVault){
  enterVault.addEventListener('click', () => goWithCode(codeInput ? codeInput.value : ''));
}

if(codeInput){
  codeInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') goWithCode(codeInput.value);
  });
}

if(scannerBox){
  scannerBox.addEventListener('click', playTapAnimation);
  scannerBox.addEventListener('touchstart', playTapAnimation, {passive:true});
}

})();
