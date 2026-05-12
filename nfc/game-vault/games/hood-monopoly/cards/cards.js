/* PLAY 3D · Hood Monopoly · V-Town Edition — Vallejo Cards */
window.HM = window.HM || {};
HM.HOOD_CARDS = [
  { id:'h1', text:'Studio session at the Tennessee Street booth went viral. Collect $500.', type:'cash', amount:500 },
  { id:'h2', text:'Mac Dre tribute show on Sonoma Blvd sold out. Collect $300.', type:'cash', amount:300 },
  { id:'h3', text:'Six Flags Fairgrounds collab paid out. Collect $200 from every player.', type:'cashEach', amount:200 },
  { id:'h4', text:'Locked up at Mare Island Brig. Go directly to Jail.', type:'jail' },
  { id:'h5', text:'Won the dice game off Springs Rd. Collect $150.', type:'cash', amount:150 },
  { id:'h6', text:'Bail money paid through the brig. Get Out Of Jail Free.', type:'getOutFree' },
  { id:'h7', text:"V-Town honor — advance to GO. Collect $200.", type:'moveTo', tile:0 },
  { id:'h8', text:'OG put you on game at the Springs Rd barbershop. Collect $100.', type:'cash', amount:100 },
  { id:'h9', text:'Lost the chain at the Sonoma car wash. Pay $75.', type:'cash', amount:-75 },
  { id:'h10', text:'Opening night at the Empress Theatre. Advance to Empress Theatre.', type:'moveTo', tile:21 },
];
HM.STREET_CARDS = [
  { id:'s1', text:'Mixtape dropped on V-Town airwaves. Collect $250.', type:'cash', amount:250 },
  { id:'s2', text:'Caught a hot one on Magazine St. Pay $50.', type:'cash', amount:-50 },
  { id:'s3', text:'Bust on Curtola Parkway. Go to the Brig.', type:'jail' },
  { id:'s4', text:'Take the ferry. Move to Vallejo Ferry Terminal.', type:'moveTo', tile:5 },
  { id:'s5', text:'Speeding down Sonoma Blvd. Pay $20 ticket.', type:'cash', amount:-20 },
  { id:'s6', text:'Backstage pass at the Empress. Get Out Of Jail Free.', type:'getOutFree' },
  { id:'s7', text:'Late session at Crockett Sound Lab. Advance to Crockett Sound Lab.', type:'moveTo', tile:29 },
  { id:'s8', text:'Lowrider repairs at the Springs Rd garage — pay $25 per house and $100 per hotel.', type:'repairs', house:25, hotel:100 },
  { id:'s9', text:'Stash spot found behind the Tennessee liquor store. Collect $300.', type:'cash', amount:300 },
  { id:'s10', text:'Sideshow caught you slipping — step back 3 tiles.', type:'move', amount:-3 },
];
HM.findCard = (deckType, id) => (deckType === 'hood' ? HM.HOOD_CARDS : HM.STREET_CARDS).find(c => c.id === id);
HM.shuffle = (arr) => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
