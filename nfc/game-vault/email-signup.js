(function(){
  'use strict';

  function supabaseClient(){
    return window.PLAY3D_SUPABASE || window.supabaseClient || window.supabase || null;
  }

  async function saveEmailSignup(email, source){
    var client = supabaseClient();
    if(!client || typeof client.from !== 'function') return {skipped:true};
    var now = new Date().toISOString();
    var payload = {
      email:email,
      source:source || 'game_vault',
      status:'active',
      updated_at:now,
      last_seen_at:now
    };
    try{
      var table = client.from('email_signups');
      if(table && typeof table.upsert === 'function'){
        var upsert = await table.upsert(payload, {onConflict:'email'});
        if(!upsert.error) return upsert;
      }
    }catch(e){}
    try{
      var patch = await client.from('email_signups').update({
        updated_at:now,
        last_seen_at:now,
        status:'active',
        source:payload.source
      }).eq('email', email);
      if(!patch.error) return patch;
    }catch(e){}
    return client.from('email_signups').insert(Object.assign({}, payload, {created_at:now}));
  }

  document.addEventListener('submit', async function(event){
    var form = event.target && event.target.closest && event.target.closest('[data-play3d-email-signup], [data-email-signup], #emailSignupForm');
    if(!form) return;
    var input = form.querySelector('input[type="email"], input[name="email"], [data-email-input]');
    var email = input && String(input.value || '').trim().toLowerCase();
    if(!email) return;
    event.preventDefault();
    try{
      await saveEmailSignup(email, form.getAttribute('data-source') || 'game_vault');
      form.dispatchEvent(new CustomEvent('play3d:email-signup-saved', {detail:{email:email}}));
    }catch(e){
      form.dispatchEvent(new CustomEvent('play3d:email-signup-error', {detail:{email:email,error:e}}));
    }
  });

  window.Play3DEmailSignup = {save:saveEmailSignup};
})();
