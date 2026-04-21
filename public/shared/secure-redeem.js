(function(){
  const cfg = window.PLAY3D_SECURE_CONFIG || {};
  const tableName = cfg.tableName || "vault_codes";

  function normalizeCode(code){
    return String(code || "").trim().toUpperCase();
  }

  function routeFor(codeType){
    return (cfg.routes || {})[codeType] || "/nfc/index.html";
  }

  async function fetchCodeRecord(code){
    const url = `${cfg.supabaseUrl}/rest/v1/${tableName}?code=eq.${encodeURIComponent(code)}&select=*`;
    const res = await fetch(url, {
      headers: {
        "apikey": cfg.supabaseAnonKey,
        "Authorization": `Bearer ${cfg.supabaseAnonKey}`
      }
    });
    if(!res.ok) throw new Error("Fetch failed");
    const rows = await res.json();
    return rows[0] || null;
  }

  async function markCodeUsed(id){
    const url = `${cfg.supabaseUrl}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "apikey": cfg.supabaseAnonKey,
        "Authorization": `Bearer ${cfg.supabaseAnonKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        used: true,
        used_at: new Date().toISOString()
      })
    });
    if(!res.ok) throw new Error("Mark used failed");
    return res.json();
  }

  async function redeemCode(rawCode){
    const code = normalizeCode(rawCode);
    if(!code) return {ok:false, reason:"empty"};

    const row = await fetchCodeRecord(code);
    if(!row) return {ok:false, reason:"invalid"};
    if(row.used) return {ok:false, reason:"used", row};
    if(row.expires_at && new Date(row.expires_at).getTime() < Date.now()){
      return {ok:false, reason:"expired", row};
    }

    await markCodeUsed(row.id);

    const route = row.route || routeFor(row.code_type);
    return { ok: true, route, row };
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