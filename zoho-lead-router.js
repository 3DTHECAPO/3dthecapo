/*
PLAY 3D Zoho Lead Router
Routes every email capture into one consistent payload.
Buy Access uses payment_verification and auto_code:false.
Home Updates can use auto_entry_code and auto_code:true.
*/

(function(){
  'use strict';

  var ENDPOINT = 'https://fupoedrovfloudefyzna.supabase.co/functions/v1/dynamic-endpoint';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cG9lZHJvdmZsb3VkZWZ5em5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzU2NjEsImV4cCI6MjA5MjM1MTY2MX0.CGgOxXXSXWMjNPcnQR_zMBHk8WkWSb0lhcNlTfCR4xo';

  function normalizeEmail(email){
    return String(email || '').trim().toLowerCase();
  }

  function routeDefaults(source){
    var key = String(source || '').toLowerCase();

    if(key === 'home_updates'){
      return {
        source:'home_updates',
        form:'home_updates',
        status:'auto_entry_code',
        lead_status:'auto_entry_code',
        tier:'ENTRY',
        code_type:'ENTRY',
        duration:'1h',
        auto_code:true,
        zoho_tag:'HOME_UPDATES_AUTO_ENTRY'
      };
    }

    if(key === 'buy_access'){
      return {
        source:'buy_access',
        form:'buy_access',
        status:'payment_verification',
        lead_status:'payment_verification',
        tier:'',
        code_type:'',
        auto_code:false,
        zoho_tag:'BUY_ACCESS_PAYMENT_VERIFICATION'
      };
    }

    if(key === 'vault_connected'){
      return {
        source:'vault_connected',
        form:'vault_connected',
        status:'vault_connected',
        lead_status:'vault_connected',
        auto_code:false,
        zoho_tag:'VAULT_CONNECTED'
      };
    }

    if(key === 'member_rewards'){
      return {
        source:'member_rewards',
        form:'member_rewards',
        status:'member_rewards',
        lead_status:'member_rewards',
        auto_code:false,
        zoho_tag:'MEMBER_REWARDS'
      };
    }

    return {
      source:key || 'general_email',
      form:key || 'general_email',
      status:'lead',
      lead_status:'lead',
      auto_code:false,
      zoho_tag:'GENERAL_LEAD'
    };
  }

  async function submit(input){
    var data = Object.assign({}, routeDefaults(input && input.source), input || {});
    data.email = normalizeEmail(data.email);

    if(!data.email) return {ok:false, error:'missing_email'};

    data.name = String(data.name || '').trim();
    data.created_at = data.created_at || new Date().toISOString();
    data.destination = 'zoho';
    data.system = 'play3d_revenue_email_router';

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

      return {ok:res.ok, status:res.status, body:body, payload:data};
    }catch(err){
      console.warn('[PLAY3D ZOHO ROUTER] submit failed', err);
      return {ok:false, error:err.message, payload:data};
    }
  }

  window.Play3DZohoLeadRouter = {
    endpoint:ENDPOINT,
    routeDefaults:routeDefaults,
    submit:submit
  };
})();
