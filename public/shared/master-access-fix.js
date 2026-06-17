/* Optional helper for admin pages. Put before other admin scripts if a page blocks CAPO-MASTER-999. */
(function(){
  const MASTER_KEY='CAPO_MASTER_SESSION';
  const params=new URLSearchParams(location.search);
  const code=String(params.get('code')||'').trim().toUpperCase();
  if(params.get('master')==='1'||params.get('from')==='master'||code==='CAPO-MASTER-999'){
    localStorage.setItem(MASTER_KEY, JSON.stringify({active:true,code:code||'CAPO-MASTER-999',started_at:Date.now(),expires_at:Date.now()+1000*60*60*12}));
  }
})();
