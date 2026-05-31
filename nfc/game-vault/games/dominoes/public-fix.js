/* DOMINOES ONLY - board arm turn / visibility repair
   Problem fixed: long domino chains ran straight off the end of the board.
   This keeps the board readable by bending overflowing arms back into the table. */
(function(){
  'use strict';

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function numVar(el, name){
    var v = getComputedStyle(el).getPropertyValue(name) || el.style.getPropertyValue(name) || '0px';
    return Number(String(v).replace('px','').trim()) || 0;
  }

  function setXY(el, x, y){
    el.style.setProperty('--x', Math.round(x) + 'px');
    el.style.setProperty('--y', Math.round(y) + 'px');
  }

  function tileSize(el){
    var vertical = el.classList.contains('vertical') || el.classList.contains('spinner') || el.classList.contains('domino-bent-end');
    return vertical ? {w:50,h:88} : {w:82,h:42};
  }

  function sortArm(list, arm){
    return list.sort(function(a,b){
      var ax=numVar(a,'--x'), ay=numVar(a,'--y');
      var bx=numVar(b,'--x'), by=numVar(b,'--y');
      if(arm === 'left') return bx-ax;      // nearest center to far left
      if(arm === 'right') return ax-bx;     // nearest center to far right
      if(arm === 'top') return by-ay;       // nearest center to far top
      if(arm === 'bottom') return ay-by;    // nearest center to far bottom
      return 0;
    });
  }

  function bendHorizontalArm(tiles, side, maxX, maxY){
    var dir = side === 'left' ? -1 : 1;
    var rowStep = 58;
    var colStep = 86;
    var bendX = dir * maxX;
    var yStart = side === 'left' ? -rowStep : rowStep;

    tiles.forEach(function(tile, index){
      tile.classList.remove('domino-bent-end');

      var ox = numVar(tile,'--x');
      var oy = numVar(tile,'--y');

      if(Math.abs(ox) <= maxX){
        setXY(tile, ox, Math.max(-maxY, Math.min(maxY, oy)));
        return;
      }

      var overflow = Math.abs(ox) - maxX;
      var turnIndex = Math.max(1, Math.ceil(overflow / colStep));
      var y = yStart + (turnIndex - 1) * rowStep;

      // If the vertical turn also reaches the board edge, snake back inward.
      if(Math.abs(y) > maxY){
        var snakeRow = Math.ceil((Math.abs(y) - maxY) / rowStep);
        y = (y < 0 ? -1 : 1) * maxY;
        bendX = dir * Math.max(80, maxX - snakeRow * colStep);
      }

      tile.classList.add('domino-bent-end');
      setXY(tile, bendX, y);
    });
  }

  function bendVerticalArm(tiles, side, maxX, maxY){
    var dir = side === 'top' ? -1 : 1;
    var rowStep = 90;
    var colStep = 56;
    var bendY = dir * maxY;
    var xStart = side === 'top' ? -colStep : colStep;

    tiles.forEach(function(tile){
      tile.classList.remove('domino-bent-end');

      var ox = numVar(tile,'--x');
      var oy = numVar(tile,'--y');

      if(Math.abs(oy) <= maxY){
        setXY(tile, Math.max(-maxX, Math.min(maxX, ox)), oy);
        return;
      }

      var overflow = Math.abs(oy) - maxY;
      var turnIndex = Math.max(1, Math.ceil(overflow / rowStep));
      var x = xStart + (turnIndex - 1) * colStep;

      if(Math.abs(x) > maxX){
        var snakeCol = Math.ceil((Math.abs(x) - maxX) / colStep);
        x = (x < 0 ? -1 : 1) * maxX;
        bendY = dir * Math.max(80, maxY - snakeCol * rowStep);
      }

      tile.classList.add('domino-bent-end');
      setXY(tile, x, bendY);
    });
  }

  function repairBoard(){
    var chain = document.getElementById('chain');
    var tableCenter = document.querySelector('.table-center');
    if(!chain || !tableCenter) return;

    chain.classList.add('domino-turn-fixed');

    var box = tableCenter.getBoundingClientRect();
    var maxX = Math.max(190, box.width / 2 - 90);
    var maxY = Math.max(150, box.height / 2 - 90);

    var arms = {
      left:Array.from(chain.querySelectorAll('.board-tile.left-arm')),
      right:Array.from(chain.querySelectorAll('.board-tile.right-arm')),
      top:Array.from(chain.querySelectorAll('.board-tile.top-arm')),
      bottom:Array.from(chain.querySelectorAll('.board-tile.bottom-arm'))
    };

    bendHorizontalArm(sortArm(arms.left, 'left'), 'left', maxX, maxY);
    bendHorizontalArm(sortArm(arms.right, 'right'), 'right', maxX, maxY);
    bendVerticalArm(sortArm(arms.top, 'top'), 'top', maxX, maxY);
    bendVerticalArm(sortArm(arms.bottom, 'bottom'), 'bottom', maxX, maxY);
  }

  ready(function(){
    var chain = document.getElementById('chain');
    if(!chain) return;

    var raf = null;
    function schedule(){
      if(raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function(){
        raf = null;
        repairBoard();
      });
    }

    new MutationObserver(schedule).observe(chain, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['style','class']
    });

    window.addEventListener('resize', schedule);
    setInterval(schedule, 800);
    schedule();
  });
})();
