function enterVault(){
  const code = document.getElementById('code').value.toUpperCase();
  if(!code) return alert('Enter code');
  window.location.href = './index.html?nfc=1&code=' + code;
}
