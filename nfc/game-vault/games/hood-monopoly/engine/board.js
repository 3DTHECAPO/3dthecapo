/* PLAY 3D · Hood Monopoly · V-Town Edition — Vallejo 40-tile board */
window.HM = window.HM || {};

HM.GROUPS = {
  brown:   { color:'#4B3621', name:'West Vallejo' },
  cyan:    { color:'#7FFFD4', name:'North Vallejo' },
  magenta: { color:'#8A2BE2', name:'Sonoma Strip' },
  orange:  { color:'#FF8C00', name:'East Vallejo' },
  red:     { color:'#DC143C', name:'Club Row' },
  yellow:  { color:'#FFD700', name:'V-Town Studios' },
  teal:    { color:'#00CED1', name:'Mare Island & Marina' },
  pink:    { color:'#FF1493', name:'Downtown Tier' },
};

const prop = (name, group, price, rent) => ({ type:'property', name, group, price, rent, buildCost: Math.round(price*0.5) });
const rail = (name, price=200) => ({ type:'transit', name, price, rent:[25,50,100,200] });
const util = (name, price=150) => ({ type:'utility', name, price });

HM.BOARD = [
  { type:'corner', name:'GO',          sub:'Welcome to V-Town' },
  prop('West Vallejo',           'brown',  60, [2, 10, 30, 90, 160, 250]),
  { type:'hood-card', name:'Hood Card' },
  prop('Magazine Street',        'brown',  60, [4, 20, 60, 180, 320, 450]),
  { type:'tax', name:'Tennessee Tax', amount:200 },
  rail('Vallejo Ferry Terminal'),
  prop('Springs Road',           'cyan',  100, [6, 30, 90, 270, 400, 550]),
  { type:'street-card', name:'Street Card' },
  prop('Lincoln Road',           'cyan',  100, [6, 30, 90, 270, 400, 550]),
  prop('Glen Cove',              'cyan',  120, [8, 40, 100, 300, 450, 600]),
  { type:'corner', name:'Brig', sub:'Just Visiting' },
  prop('Sonoma Blvd',            'magenta',140,[10, 50, 150, 450, 625, 750]),
  util('Mare Island Power Co'),
  prop('Curtola Parkway',        'magenta',140,[10, 50, 150, 450, 625, 750]),
  prop('Tennessee Street',       'magenta',160,[12, 60, 180, 500, 700, 900]),
  rail('Carquinez Bridge'),
  prop('Tuolumne Heights',       'orange', 180,[14, 70, 200, 550, 750, 950]),
  { type:'hood-card', name:'Hood Card' },
  prop('Mariposa Blocks',        'orange', 180,[14, 70, 200, 550, 750, 950]),
  prop('Solano Avenue',          'orange', 200,[16, 80, 220, 600, 800, 1000]),
  { type:'corner', name:'Waterfront', sub:'Block Party' },
  prop('Empress Theatre',        'red',    220,[18, 90, 250, 700, 875, 1050]),
  { type:'street-card', name:'Street Card' },
  prop('Vista Club',             'red',    220,[18, 90, 250, 700, 875, 1050]),
  prop('Diamond Lounge',         'red',    240,[20, 100, 300, 750, 925, 1100]),
  rail('Lowrider Garage'),
  prop('Tennessee Studios',      'yellow', 260,[22, 110, 330, 800, 975, 1150]),
  prop('V-Town Booth',           'yellow', 260,[22, 110, 330, 800, 975, 1150]),
  util('Vallejo Water Co'),
  prop('Crockett Sound Lab',     'yellow', 280,[24, 120, 360, 850, 1025, 1200]),
  { type:'corner', name:'Sent To The Brig', sub:'Mare Island' },
  prop('Marina Vista',           'teal',   300,[26, 130, 390, 900, 1100, 1275]),
  prop('Glen Cove Marina',       'teal',   300,[26, 130, 390, 900, 1100, 1275]),
  { type:'hood-card', name:'Hood Card' },
  prop('Mare Island Shipyard',   'teal',   320,[28, 150, 450, 1000, 1200, 1400]),
  rail('Six Flags Fairgrounds'),
  { type:'street-card', name:'Street Card' },
  prop('Georgia Street',         'pink',   350,[35, 175, 500, 1100, 1300, 1500]),
  { type:'tax', name:'Luxury Tax', amount:100 },
  prop('Downtown Vallejo',       'pink',   400,[50, 200, 600, 1400, 1700, 2000]),
];

HM.TOTAL_TILES = 40;

HM.tileGridPosition = (i) => {
  if (i === 0)  return { row:11, col:11 };
  if (i < 10)   return { row:11, col:11 - i };
  if (i === 10) return { row:11, col:1 };
  if (i < 20)   return { row:21 - i, col:1 };
  if (i === 20) return { row:1,  col:1 };
  if (i < 30)   return { row:1,  col:i - 19 };
  if (i === 30) return { row:1,  col:11 };
  return { row:i - 29, col:11 };
};

HM.tileSide = (i) => {
  if ([0,10,20,30].includes(i)) return 'corner';
  if (i < 10) return 'bottom';
  if (i < 20) return 'left';
  if (i < 30) return 'top';
  return 'right';
};
