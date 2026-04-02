function enterVault(){
  const code=document.getElementById('code').value.toUpperCase();
  if(!code){alert('Enter code');return;}
  window.location.href='./index.html?nfc=1&code='+code;
}
