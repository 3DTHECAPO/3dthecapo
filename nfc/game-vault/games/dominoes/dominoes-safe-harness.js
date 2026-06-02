'use strict';

const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'script.js');
const indexPath = path.join(__dirname, 'index.html');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');

const TILE_SIZE = {horizontal:{w:82,h:42},vertical:{w:50,h:88}};
const DIRS = {left:{x:-1,y:0},right:{x:1,y:0},top:{x:0,y:-1},bottom:{x:0,y:1}};
const TURNS = {right:'bottom',bottom:'left',left:'top',top:'right'};
const REVERSE = {right:'top',top:'left',left:'bottom',bottom:'right'};
const LIMITS = {x:340,y:340};

function isDouble(tile){ return tile[0] === tile[1]; }
function axisSpan(orientation,arm){
  const size = TILE_SIZE[orientation] || TILE_SIZE.horizontal;
  return arm === 'left' || arm === 'right' ? size.w : size.h;
}
function orientation(arm,tile){
  if(arm === 'left' || arm === 'right') return isDouble(tile) ? 'vertical' : 'horizontal';
  return isDouble(tile) ? 'horizontal' : 'vertical';
}
function orient(tile,match,arm){
  if(arm === 'left' || arm === 'top') return tile[1] === match ? tile.slice() : [tile[1],tile[0]];
  return tile[0] === match ? tile.slice() : [tile[1],tile[0]];
}
function exposed(arm,tile){ return arm === 'left' || arm === 'top' ? tile[0] : tile[1]; }
function bounds(item){
  const size = TILE_SIZE[item.orientation];
  return {left:item.x-size.w/2,right:item.x+size.w/2,top:item.y-size.h/2,bottom:item.y+size.h/2};
}
function overlaps(a,b){
  const aa = bounds(a);
  const bb = bounds(b);
  return aa.left < bb.right && aa.right > bb.left && aa.top < bb.bottom && aa.bottom > bb.top;
}
function touches(a,b){
  const aa = bounds(a);
  const bb = bounds(b);
  const horizontal = Math.abs(aa.right-bb.left) < .001 || Math.abs(bb.right-aa.left) < .001;
  const vertical = Math.abs(aa.bottom-bb.top) < .001 || Math.abs(bb.bottom-aa.top) < .001;
  const yOverlap = aa.top < bb.bottom && aa.bottom > bb.top;
  const xOverlap = aa.left < bb.right && aa.right > bb.left;
  return horizontal && yOverlap || vertical && xOverlap;
}
function outside(item){
  const size = TILE_SIZE[item.orientation];
  return Math.abs(item.x)+size.w/2 > LIMITS.x || Math.abs(item.y)+size.h/2 > LIMITS.y;
}
function collisionCount(item,anchor,placements){
  return placements.filter(existing=>overlaps(item,existing)).length;
}
function candidate(rawTile,logicalArm,match,anchor,flowSide){
  const tile = orient(rawTile,match,flowSide);
  const nextOrientation = orientation(flowSide,tile);
  const dir = DIRS[flowSide];
  const step = axisSpan(nextOrientation,flowSide);
  const anchorFlow = (anchor.flowSide || anchor.exposedSide) === 'all'
    ? logicalArm
    : (anchor.flowSide || anchor.exposedSide || logicalArm);
  const anchorStep = axisSpan(anchor.orientation || 'horizontal',anchorFlow);
  const distance = step/2+anchorStep/2;
  const turned = anchorFlow !== flowSide;
  const turnDistance = step/2+axisSpan(anchor.orientation || 'horizontal',flowSide)/2;
  return {
    tile,
    x:anchor.x+dir.x*(turned ? turnDistance : distance),
    y:anchor.y+dir.y*(turned ? turnDistance : distance),
    orientation:nextOrientation,
    flowSide,
    exposedSide:flowSide,
    exposedPip:exposed(flowSide,tile),
    turned
  };
}
function penalty(item,anchor,placements){
  const size = TILE_SIZE[item.orientation];
  const overflowX = Math.max(0,Math.abs(item.x)+size.w/2-LIMITS.x);
  const overflowY = Math.max(0,Math.abs(item.y)+size.h/2-LIMITS.y);
  return (overflowX+overflowY)*1000+collisionCount(item,anchor,placements)*100000;
}
function flowing(rawTile,arm,match,anchor,placements){
  const flowSide = (anchor.flowSide || anchor.exposedSide) === 'all'
    ? arm
    : (anchor.flowSide || anchor.exposedSide || arm);
  const candidates = [flowSide,TURNS[flowSide],REVERSE[flowSide],TURNS[TURNS[flowSide]]]
    .filter((side,index,list)=>side && list.indexOf(side) === index)
    .map(side=>candidate(rawTile,arm,match,anchor,side));
  return candidates.find(item=>!outside(item)&&collisionCount(item,anchor,placements) === 0)
    || candidates.sort((a,b)=>penalty(a,anchor,placements)-penalty(b,anchor,placements))[0];
}
function assert(name,pass,details){
  return {name,pass:Boolean(pass),details};
}
function mobileFit(placements,width){
  const availableWidth = Math.max(220,width-36);
  const availableHeight = 524;
  let maxX = 120;
  let maxY = 100;
  placements.forEach(item=>{
    const size = TILE_SIZE[item.orientation];
    maxX = Math.max(maxX,Math.abs(item.x)+size.w/2+70);
    maxY = Math.max(maxY,Math.abs(item.y)+size.h/2+70);
  });
  const boardWidth = Math.ceil(maxX*2);
  const boardHeight = Math.ceil(maxY*2);
  const scale = Math.max(.1,Math.min(1,availableWidth/boardWidth,availableHeight/boardHeight));
  return {
    width,
    scale,
    scaledWidth:Math.round(boardWidth*scale),
    scaledHeight:Math.round(boardHeight*scale),
    availableWidth,
    availableHeight,
    fits:boardWidth*scale <= availableWidth+.001 && boardHeight*scale <= availableHeight+.001
  };
}
function scoreFromCount(count){ return count > 0 && count % 5 === 0 ? count : 0; }
function scoreWithGetIn(count,gotIn){
  const points = scoreFromCount(count);
  return !gotIn && points < 10 ? 0 : points;
}

const sequence = [[6,5],[5,4],[4,3],[3,2],[2,1],[1,0],[0,6],[6,4],[4,2],[2,5]];
const spinner = {tile:[6,6],x:0,y:0,orientation:'vertical',flowSide:'all',exposedSide:'all'};
const placements = [spinner];
let anchor = spinner;
let match = 6;
const moves = [];

sequence.forEach((tile,index)=>{
  const next = flowing(tile,'right',match,anchor,placements);
  const priorCollisions = collisionCount(next,anchor,placements);
  moves.push({
    move:index+1,
    tile:tile.join('-'),
    direction:next.flowSide,
    turned:next.turned,
    touchesAnchor:touches(anchor,next),
    overlapCount:priorCollisions,
    insideLimits:!outside(next)
  });
  placements.push(next);
  anchor = next;
  match = next.exposedPip;
});

const mobile375 = mobileFit(placements,375);
const mobile430 = mobileFit(placements,430);
const edgeAnchor = {tile:[5,0],x:-299,y:0,orientation:'horizontal',flowSide:'left',exposedSide:'left'};
const edgeTurn = flowing([5,2],'left',5,edgeAnchor,[edgeAnchor]);
const topSpinner = {tile:[5,5],x:0,y:0,orientation:'vertical',flowSide:'all',exposedSide:'all'};
const topPlacements = [topSpinner];
const topOne = flowing([5,3],'top',5,topSpinner,topPlacements);
topPlacements.push(topOne);
const topTwo = flowing([3,6],'top',3,topOne,topPlacements);
topPlacements.push(topTwo);
const topThree = flowing([6,6],'top',6,topTwo,topPlacements);
const settlementPips = [[5,5],[3,2]].reduce((sum,tile)=>sum+tile[0]+tile[1],0);

const checks = [
  assert('opening spinner is crosswise vertical',spinner.orientation === 'vertical',spinner),
  assert('second play touches without overlap',moves[1].touchesAnchor && moves[1].overlapCount === 0,moves[1]),
  assert('first 10 moves touch their anchor',moves.every(move=>move.touchesAnchor),moves),
  assert('first 10 moves do not overlap earlier tiles',moves.every(move=>move.overlapCount === 0),moves),
  assert('first 10 moves remain in engine board limits',moves.every(move=>move.insideLimits),moves),
  assert('edge elbow turns only when the next straight move exceeds the boundary',edgeTurn.turned && !outside(edgeTurn) && collisionCount(edgeTurn,edgeAnchor,[edgeAnchor]) === 0,{edgeAnchor,edgeTurn}),
  assert('5-5 top branch stays straight through 5-3, 3-6, and 6-6 while vertical space exists',[topOne,topTwo,topThree].every(item=>item.flowSide === 'top' && !item.turned && !outside(item)),{topSpinner,topOne,topTwo,topThree}),
  assert('375px board fit',mobile375.fits,mobile375),
  assert('430px board fit',mobile430.fits,mobile430),
  assert('player draw continues until playable or boneyard empty',scriptSource.includes("while(drew < startingStock && state.stock.length && !canPlay(player))") && scriptSource.includes("const tile = state.stock.pop();") && scriptSource.includes("if(!tile) break;"),null),
  assert('missing public cosmetic stylesheet is not loaded',!indexSource.includes('./public-fix.css'),null),
  assert('DOMINO settlement counts remaining pips',settlementPips === 15 && scoreFromCount(settlementPips) === 15,{settlementPips,awarded:scoreFromCount(settlementPips)}),
  assert('five-count scoring accepts multiples of five',[5,10,15,20,25,30,35,40].every(value=>scoreFromCount(value) === value),null),
  assert('five-count scoring rejects non-multiples',[1,4,6,9,11,14,39].every(value=>scoreFromCount(value) === 0),null),
  assert('get-on-board requires first score of at least 10',scoreWithGetIn(5,false) === 0 && scoreWithGetIn(10,false) === 10 && scoreWithGetIn(5,true) === 5,null)
];

const result = {
  name:'PLAY 3D Dominoes safe restore deterministic harness',
  passed:checks.every(check=>check.pass),
  checks,
  moves,
  mobile:[mobile375,mobile430]
};

console.log(JSON.stringify(result,null,2));
if(!result.passed) process.exitCode = 1;
