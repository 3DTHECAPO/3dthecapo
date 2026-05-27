(function(){
  'use strict';

  var STORAGE_KEY = 'play3d_announcer_voice_enabled_v1';
  var MUTE_KEY = 'play3d_announcer_muted_v1';
  var maxMessages = 2;
  var queue = [];
  var speaking = false;

  function readFlag(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      if(raw === null) return fallback;
      return raw === 'true';
    }catch(e){ return fallback; }
  }

  function saveFlag(key, value){
    try{ localStorage.setItem(key, String(!!value)); }catch(e){}
  }

  var voiceEnabled = readFlag(STORAGE_KEY, true);
  var muted = readFlag(MUTE_KEY, false);

  function ensureHost(){
    var host = document.getElementById('superiorAnnouncerHost');
    if(!host){
      host = document.createElement('div');
      host.id = 'superiorAnnouncerHost';
      host.className = 'superior-announcer-host';
      document.body.appendChild(host);
    }
    return host;
  }

  function typeClass(type){
    return 'superior-announcer ' + String(type || 'normal').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  function show(message, type){
    var host = ensureHost();
    while(host.children.length >= maxMessages) host.removeChild(host.firstElementChild);
    var item = document.createElement('div');
    item.className = typeClass(type);
    item.textContent = String(message || '');
    host.appendChild(item);
    requestAnimationFrame(function(){ item.classList.add('show'); });
    setTimeout(function(){
      item.classList.remove('show');
      setTimeout(function(){ if(item.parentNode) item.parentNode.removeChild(item); }, 280);
    }, 3300);
  }

  function speakNext(){
    if(speaking || !queue.length) return;
    if(!voiceEnabled || muted || !('speechSynthesis' in window)){
      queue.length = 0;
      return;
    }
    var text = queue.shift();
    speaking = true;
    try{
      var utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.02;
      utter.pitch = 0.86;
      utter.volume = 1;
      utter.onend = utter.onerror = function(){
        speaking = false;
        speakNext();
      };
      window.speechSynthesis.speak(utter);
    }catch(e){
      speaking = false;
      console.warn('[PLAY3D ANNOUNCER] speech failed', e);
      speakNext();
    }
  }

  function speak(message){
    if(!voiceEnabled || muted) return;
    queue.push(String(message || ''));
    speakNext();
  }

  function getLine(category, event){
    var lines = window.SuperiorLines || {};
    var cat = lines[String(category || '').toLowerCase()] || {};
    var list = cat[String(event || '').toUpperCase()] || cat[String(event || '').toLowerCase()] || [];
    if(!Array.isArray(list) || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  var SuperiorEvents = {
    say:function(message, type){
      var text = String(message || '');
      if(!text) return;
      console.log('[PLAY3D ANNOUNCER]', 'say', type || 'normal', text);
      show(text, type || 'normal');
      speak(text);
    },
    queue:function(message, type){ this.say(message, type); },
    random:function(category, event){ return getLine(category, event); },
    voiceOn:function(){ voiceEnabled = true; muted = false; saveFlag(STORAGE_KEY, true); saveFlag(MUTE_KEY, false); this.say('PLAY 3D announcer voice on.', 'success'); },
    voiceOff:function(){ voiceEnabled = false; saveFlag(STORAGE_KEY, false); console.log('[PLAY3D ANNOUNCER] voice off'); },
    mute:function(){ muted = true; saveFlag(MUTE_KEY, true); console.log('[PLAY3D ANNOUNCER] muted'); },
    unmute:function(){ muted = false; saveFlag(MUTE_KEY, false); this.say('PLAY 3D announcer unmuted.', 'success'); },
    enable:function(){ this.unmute(); },
    disable:function(){ this.mute(); },
    isVoiceEnabled:function(){ return !!voiceEnabled && !muted; }
  };

  window.SuperiorEvents = SuperiorEvents;
  window.Superior = window.Superior || SuperiorEvents;

  window.addEventListener('superior:event', function(evt){
    var detail = evt.detail || {};
    var category = String(detail.category || 'normal').toLowerCase();
    var event = String(detail.event || 'normal').toUpperCase();
    var message = detail.message || getLine(category, event) || event.replaceAll('_', ' ');
    var type = detail.type || (category === 'casino' ? 'casino' : category === 'vault' ? 'elite' : category === 'pinochle' ? 'casino' : 'boss');
    console.log('[PLAY3D ANNOUNCER]', category, event, message);
    SuperiorEvents.say(message, type);
  });
})();
