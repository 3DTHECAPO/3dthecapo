(function(){
  var DELAY = 460;
  var overlay;

  function ensureOverlay(){
    if (overlay) return overlay;
    overlay = document.querySelector('.vault-transition-layer');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'vault-transition-layer';
      overlay.setAttribute('aria-hidden','true');
      overlay.innerHTML = '<div class="vault-transition-glow"></div>';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function isSamePageHash(url){
    return url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && url.hash;
  }

  function shouldTransition(anchor, event){
    if (!anchor || !anchor.href) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return false;
    var url;
    try { url = new URL(anchor.getAttribute('href'), location.href); } catch(e) { return false; }
    if (!/^https?:$|^file:$/.test(url.protocol)) return false;
    if (url.origin !== location.origin && url.protocol !== 'file:') return false;
    if (isSamePageHash(url)) return false;
    return true;
  }

  function enter(){
    document.body.classList.add('vault-transition-ready');
    ensureOverlay();
    requestAnimationFrame(function(){
      document.body.classList.add('vault-transition-in');
      setTimeout(function(){
        document.body.classList.remove('vault-transition-in','vault-transition-ready');
      }, 620);
    });
  }

  function leave(href){
    ensureOverlay();
    document.body.classList.add('vault-transition-out');
    setTimeout(function(){ window.location.href = href; }, DELAY);
  }

  document.addEventListener('DOMContentLoaded', enter);
  document.addEventListener('click', function(event){
    var anchor = event.target.closest && event.target.closest('a[href]');
    if (!shouldTransition(anchor, event)) return;
    event.preventDefault();
    leave(anchor.href);
  }, true);
})();
