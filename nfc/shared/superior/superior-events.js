(function(){
  'use strict';

  const MAX_STACK = 2;
  const DEFAULT_TYPE = 'normal';
  const DISPLAY_MS = 3200;
  const EXIT_MS = 360;
  const typeByCategory = {
    dominoes: 'casino',
    pinochle: 'elite',
    casino: 'casino',
    vault: 'boss'
  };

  let enabled = true;
  let container = null;
  const queue = [];

  function safeText(value){
    return String(value == null ? '' : value).trim();
  }

  function ensureContainer(){
    if(container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.id = 'superiorEventOverlay';
    container.className = 'superior-event-overlay';
    container.setAttribute('aria-live','polite');
    container.setAttribute('aria-atomic','false');
    document.body.appendChild(container);
    return container;
  }

  function normalizeType(type){
    const value = safeText(type || DEFAULT_TYPE).toLowerCase();
    return ['normal','success','warning','elite','boss','casino','music'].includes(value) ? value : DEFAULT_TYPE;
  }

  function trimStack(){
    if(!container) return;
    while(container.children.length > MAX_STACK){
      container.removeChild(container.children[0]);
    }
  }

  function renderMessage(message,type){
    if(!enabled) return null;
    const text = safeText(message);
    if(!text) return null;

    const root = ensureContainer();
    const item = document.createElement('div');
    item.className = 'superior-event-message superior-event-' + normalizeType(type);
    item.textContent = text;
    root.appendChild(item);
    trimStack();

    requestAnimationFrame(function(){ item.classList.add('is-visible'); });
    window.setTimeout(function(){
      item.classList.remove('is-visible');
      item.classList.add('is-exiting');
      window.setTimeout(function(){
        if(item.parentNode) item.parentNode.removeChild(item);
      }, EXIT_MS);
    }, DISPLAY_MS);

    return item;
  }

  function getLineSet(category,eventName){
    const all = window.SuperiorLines || {};
    const cat = safeText(category).toLowerCase();
    const event = safeText(eventName).toUpperCase();
    if(!cat || !all[cat]) return null;
    if(event && Array.isArray(all[cat][event])) return all[cat][event];
    const merged = [];
    Object.keys(all[cat]).forEach(function(key){
      if(Array.isArray(all[cat][key])) merged.push.apply(merged, all[cat][key]);
    });
    return merged.length ? merged : null;
  }

  function random(category,eventName){
    const set = getLineSet(category,eventName);
    if(!set || !set.length) return '';
    return set[Math.floor(Math.random() * set.length)];
  }

  function say(message,type){
    return renderMessage(message,type);
  }

  function queueMessage(message,type){
    const item = { message:safeText(message), type:normalizeType(type) };
    if(!item.message) return null;
    queue.push(item);
    return say(item.message,item.type);
  }

  function enable(){ enabled = true; return enabled; }
  function disable(){ enabled = false; return enabled; }

  function handleSuperiorEvent(event){
    const detail = event && event.detail ? event.detail : {};
    const category = safeText(detail.category).toLowerCase();
    const eventName = safeText(detail.event).toUpperCase();
    const message = safeText(detail.message || detail.text) || random(category,eventName);
    const type = detail.type || typeByCategory[category] || DEFAULT_TYPE;
    if(message) say(message,type);
  }

  const api = window.Superior || {};
  api.say = say;
  api.queue = queueMessage;
  api.random = random;
  api.enable = enable;
  api.disable = disable;
  api.isEnabled = function(){ return enabled; };
  api._queue = queue;

  window.Superior = api;
  window.addEventListener('superior:event', handleSuperiorEvent);
})();
