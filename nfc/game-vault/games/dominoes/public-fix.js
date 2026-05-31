/*
PLAY 3D Dominoes — precise end-cap display fix
Scope: visual-only correction for the current open-end domino on a vertical arm.
Why: the last domino on the top arm was rendering slightly on top of the domino beneath it.
This does NOT change scoring, legal plays, spinner rules, Supabase, rewards, or game state.
*/

(function(){
  'use strict';

  var EDGE_NUDGE = 10; // pixels; just enough to make the end tile touch clean instead of overlap

  function readPxVar(el, name){
    var raw = (el.style.getPropertyValue(name) || '0').replace('px','').trim();
    var n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function writePxVar(el, name, value){
    el.style.setProperty(name, Math.round(value) + 'px');
  }

  function clearNudge(el){
    if(!el || !el.dataset) return;
    if(el.dataset.p3dNudged !== '1') return;

    if(el.dataset.p3dOrigX !== undefined) writePxVar(el, '--x', Number(el.dataset.p3dOrigX));
    if(el.dataset.p3dOrigY !== undefined) writePxVar(el, '--y', Number(el.dataset.p3dOrigY));

    delete el.dataset.p3dNudged;
    delete el.dataset.p3dOrigX;
    delete el.dataset.p3dOrigY;
  }

  function nudgeTile(el, dx, dy){
    if(!el || !el.dataset) return;

    if(el.dataset.p3dNudged !== '1'){
      el.dataset.p3dOrigX = String(readPxVar(el, '--x'));
      el.dataset.p3dOrigY = String(readPxVar(el, '--y'));
      el.dataset.p3dNudged = '1';
    }

    writePxVar(el, '--x', Number(el.dataset.p3dOrigX || 0) + dx);
    writePxVar(el, '--y', Number(el.dataset.p3dOrigY || 0) + dy);
  }

  function fixVerticalEndCapOverlap(){
    var tiles = Array.from(document.querySelectorAll('#chain .tile.board-tile'));
    if(!tiles.length) return;

    tiles.forEach(clearNudge);

    // Only touch the current top-arm open end.
    // In the screenshot, that is the 0/2 domino at the top of the vertical branch.
    var topTiles = tiles.filter(function(el){
      return el.classList.contains('top-arm') && el.classList.contains('vertical') && !el.classList.contains('spinner');
    });

    if(topTiles.length){
      var topEnd = topTiles.slice().sort(function(a,b){
        return readPxVar(a, '--y') - readPxVar(b, '--y');
      })[0];

      if(topEnd) nudgeTile(topEnd, 0, -EDGE_NUDGE);
    }
  }

  function boot(){
    fixVerticalEndCapOverlap();

    var chain = document.getElementById('chain');
    if(!chain) return;

    var obs = new MutationObserver(function(){
      requestAnimationFrame(fixVerticalEndCapOverlap);
    });

    obs.observe(chain, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['style','class']
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Play3DDominoEndCapFix = {
    apply: fixVerticalEndCapOverlap,
    edgeNudge: EDGE_NUDGE
  };
})();
