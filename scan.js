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
  }, 1100);
}

function setStatus(text){
  const cinematic = document.getElementById('scanCinematic');
  const status = cinematic ? cinematic.querySelector('.scan-status') : null;
  if(status) status.textContent = text;
}

function runScanCinematic(finalCode){
  const cinematic = document.getElementById('scanCinematic');

  if(!cinematic){
    window.location.href = buildVaultUrl(finalCode);
    return;
  }

  cinematic.classList.remove('granted','phase-two','phase-three');
  cinematic.classList.add('active');
  cinematic.setAttribute('aria-hidden', 'false');

  setStatus('INITIALIZING...');

  setTimeout(()=>{
    cinematic.classList.add('phase-two');
    setStatus('SCANNING KEY...');
  }, 650);

  setTimeout(()=>{
    setStatus('AUTHENTICATING...');
  }, 1300);

  setTimeout(()=>{
    cinematic.classList.add('phase-three');
    setStatus('VERIFYING ACCESS...');
  }, 1850);

  setTimeout(()=>{
    cinematic.classList.add('granted');
    setStatus('ACCESS GRANTED');
  }, 2450);

  setTimeout(()=>{
    window.location.href = buildVaultUrl(finalCode);
  }, 3350);
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
