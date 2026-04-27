(function(){
  const cfg = window.PLAY3D_SECURE_CONFIG || {};
  const tableName = cfg.tableName || "vault_codes";
  const supabaseUrl = cfg.supabaseUrl;
  const supabaseAnonKey = cfg.supabaseAnonKey;

  function normalizeCode(code){
    return String(code || "").trim().toUpperCase();
  }

  function routeFor(codeType, code){
    // IMPORTANT: always route through /nfc/index.html so ACCESS GRANTED + cinematic doors can run.
    // The room/tier is still decided from Supabase inside /nfc/nfc.js.
    const safeCode = encodeURIComponent(normalizeCode(code));
    return `/nfc/index.html?code=${safeCode}&play=1`;
  }

  async function fetchCodeRecord(code){
    const url = `${supabaseUrl}/rest/v1/${tableName}?code=eq.${encodeURIComponent(code)}&select=*`;
    const res = await fetch(url, {
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`
      }
    });
    if(!res.ok) throw new Error("Fetch failed");
    const rows = await res.json();
    return rows[0] || null;
  }

  async function patchCodeHit(id){
    if(!id) return;
    try{
      const url = `${supabaseUrl}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`;
      await fetch(url, {
        method: "PATCH",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        // This restores your analytics dashboard because it reads used/used_at.
        // It does NOT block re-entry because consumeOnRedeem remains false.
        body: JSON.stringify({
          used: true,
          used_at: new Date().toISOString()
        })
      });
    }catch(e){
      console.warn("Analytics code hit patch failed", e);
    }
  }

  async function logVaultEvent(row, eventType){
    try{
      await fetch(`${supabaseUrl}/rest/v1/vault_logs`,{
        method:'POST',
        headers:{
          'apikey': supabaseAnonKey,
          'Authorization':`Bearer ${supabaseAnonKey}`,
          'Content-Type':'application/json',
          'Prefer':'return=minimal'
        },
        body:JSON.stringify({
          code: row && row.code ? row.code : '',
          tier: row && row.code_type ? row.code_type : '',
          event_type: eventType,
          user_agent: navigator.userAgent,
          page: window.location.pathname
        })
      });
    }catch(e){
      console.warn("vault_logs insert failed", e);
    }
  }

  async function redeemCode(rawCode){
    const code = normalizeCode(rawCode);
    if(!code) return {ok:false, reason:"empty"};

    const row = await fetchCodeRecord(code);
    if(!row){
      await logVaultEvent({code, code_type:''}, 'invalid');
      return {ok:false, reason:"invalid"};
    }

    if(row.used && cfg.consumeOnRedeem === true){
      await logVaultEvent(row, 'used_blocked');
      return {ok:false, reason:"used", row};
    }

    if(row.expires_at && new Date(row.expires_at).getTime() < Date.now()){
      await logVaultEvent(row, 'expired');
      return {ok:false, reason:"expired", row};
    }

    await patchCodeHit(row.id);
    await logVaultEvent(row, 'redeem_success');

    const route = routeFor(row.code_type, row.code);
    let pass = null;
    if(window.Play3DPassSession){
      pass = window.Play3DPassSession.create({
        tier: row.code_type,
        code: row.code,
        route,
        expires_at: row.expires_at || null
      });
    }

    return { ok: true, route, row, pass };
  }

  function statusMessage(reason){
    if(reason === "empty") return ["NO CODE ENTERED","Enter a code to continue."];
    if(reason === "invalid") return ["INVALID CODE","That code was not found."];
    if(reason === "used") return ["CODE ALREADY USED","This code has already been redeemed."];
    if(reason === "expired") return ["CODE EXPIRED","This code is no longer active."];
    return ["ERROR","Please try again."];
  }

  window.Play3DSecureRedeem = { redeemCode, statusMessage, normalizeCode };
})();
