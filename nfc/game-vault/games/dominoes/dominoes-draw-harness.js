'use strict';

function drawUntilPlayable(hand,stock,canPlay){
  const startingStock = stock.length;
  let drew = 0;
  while(drew < startingStock && stock.length && !canPlay(hand)){
    const tile = stock.pop();
    if(!tile) break;
    hand.push(tile);
    drew++;
  }
  return {drew,hand,stock,playable:canPlay(hand)};
}

function sameTiles(a,b){
  return JSON.stringify(a) === JSON.stringify(b);
}

const playableAfterTwo = drawUntilPlayable([],[[1,1],[6,5],[2,2]],hand=>hand.some(tile=>tile[0] === 6 || tile[1] === 6));
const emptyYard = drawUntilPlayable([],[[1,1],[2,2],[3,3]],hand=>hand.some(tile=>tile[0] === 6 || tile[1] === 6));
const alreadyPlayable = drawUntilPlayable([[6,4]],[[1,1],[2,2]],hand=>hand.some(tile=>tile[0] === 6 || tile[1] === 6));
const uniqueSource = [[1,2],[3,4],[5,6]];
const uniqueDraw = drawUntilPlayable([],uniqueSource.map(tile=>tile.slice()),()=>false);

const checks = [
  {
    name:'stops immediately when a playable bone is drawn',
    pass:playableAfterTwo.drew === 2 && playableAfterTwo.playable === true && playableAfterTwo.stock.length === 1,
    details:playableAfterTwo
  },
  {
    name:'draws through boneyard and stops when empty',
    pass:emptyYard.drew === 3 && emptyYard.playable === false && emptyYard.stock.length === 0,
    details:emptyYard
  },
  {
    name:'does not draw when hand already has a legal bone',
    pass:alreadyPlayable.drew === 0 && alreadyPlayable.stock.length === 2,
    details:alreadyPlayable
  },
  {
    name:'each stock bone is removed and added once',
    pass:uniqueDraw.drew === 3 && uniqueDraw.stock.length === 0 && sameTiles(uniqueDraw.hand,[[5,6],[3,4],[1,2]]),
    details:uniqueDraw
  },
  {
    name:'bounded guard prevents infinite draw loop',
    pass:emptyYard.drew <= 3 && uniqueDraw.drew <= 3,
    details:{emptyYardDraws:emptyYard.drew,uniqueDraws:uniqueDraw.drew}
  }
];

const result = {
  name:'PLAY 3D Dominoes draw-rule harness',
  passed:checks.every(check=>check.pass),
  checks
};

console.log(JSON.stringify(result,null,2));
if(!result.passed) process.exitCode = 1;
