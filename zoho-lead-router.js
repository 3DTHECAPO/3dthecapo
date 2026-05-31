/*
PLAY 3D Zoho Lead Router — safe frontend signal only.
Buy Access sends selected tier, code_type, and duration with auto_code:false.
Backend must verify payment before sending a code.
*/
(function(){
  'use strict';

  var ENDPOINT = 'https://fupoedrovfloudefyzna.supabase.co/functions/v1/dynamic-endpoint';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cG9lZHJvdmZsb3VkZWZ5em5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzU2NjEsImV4cCI6MjA5MjM1MTY2MX0.CGgOxXXSXWMjNPcnQR_zMBHk8WkWSb0lhcNlTfCR4xo';

  function normalizeEmail(email){
    return String(email || '').trim().toLowerCase();
  }

  async function submit(input){
    var data = Object.assign({
      source:'buy_access',
      form:'buy_page',
      status:'payment_verification',
      lead_status:'payment_verification',
      auto_code:false,
      destination:'zoho',
      system:'play3d_revenue_email_router'
    }, input || {});

    data.email = normalizeEmail(data.email);
    data.name = String(data.name || '').trim();
    data.created_at = data.created_at || new Date().toISOString();

    if(!data.email) return {ok:false,error:'missing_email'};

    try{
      var res = await fetch(ENDPOINT, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer ' + SUPABASE_KEY
        },
        body:JSON.stringify(data)
      });
      var body = null;
      try{ body = await res.json(); }catch(e){ body = await res.text(); }
      return {ok:res.ok,status:res.status,body:body,payload:data};
    }catch(err){
      console.warn('[PLAY3D ZOHO ROUTER] submit failed', err);
      return {ok:false,error:err.message,payload:data};
    }
  }

  window.Play3DZohoLeadRouter = { submit:submit, endpoint:ENDPOINT };
})();
