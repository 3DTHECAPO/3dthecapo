/* PLAY 3D · Hood Monopoly · V-Town Edition — Vallejo Tokens */
window.HM = window.HM || {};
HM.TOKENS = [
  { id:'lowrider', label:'Lowrider',       color:'#7FFFD4', svg:'M3 12l2-4h14l2 4v3h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3v-3Zm4 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z' },
  { id:'mic',      label:'Studio Mic',     color:'#FF1493', svg:'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-5 9a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V22h-2v-3.08A7 7 0 0 1 5 12h2Z' },
  { id:'crown',    label:'V-Town Crown',   color:'#F2D492', svg:'M3 17l1.6-8 3.4 3 4-6 4 6 3.4-3L21 17H3Zm0 2h18v2H3v-2Z' },
  { id:'ferry',    label:'Vallejo Ferry',  color:'#7FB8FF', svg:'M3 18a3 3 0 0 1 3-1.5c2 0 3 2 6 2s4-2 6-2a3 3 0 0 1 3 1.5v2a3 3 0 0 1-3 1.5c-2 0-3-2-6-2s-4 2-6 2A3 3 0 0 1 3 20v-2Zm1-3 8-9 8 9-2 .8-6-6.6-6 6.6L4 15Zm6-4h4v2h-4v-2Z' },
  { id:'bridge',   label:'Carquinez Bridge',color:'#FFD27A', svg:'M3 15c3 0 4-3 4-7h2c0 5 1 8 8 8v2c-3 0-5-1-6-2v6h-2v-6c-1 1-3 2-6 2v-3Zm12 0c3 0 4-2 4-7h2c0 5 1 8 0 8v-1Zm-12 6v-1h18v1H3Z' },
  { id:'chain',    label:'Gold Chain',     color:'#FFD700', svg:'M5 12a3 3 0 0 1 3-3h2v2H8a1 1 0 0 0 0 2h2v2H8a3 3 0 0 1-3-3Zm9-3h2a3 3 0 1 1 0 6h-2v-2h2a1 1 0 1 0 0-2h-2V9Zm-3 2h2v2h-2v-2Z' },
  { id:'vault',    label:'Vault Key',      color:'#D4AF37', svg:'M8 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-1 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm5 0h9v2h-2v2h-2v-2h-2v3h-2v-3h-1v-2Z' },
  { id:'anchor',   label:'Mare Island Anchor',color:'#9CE6FF', svg:'M12 2a3 3 0 0 1 1 5.83V10h3v2h-3v6.92A6 6 0 0 0 18 13h-2v-2h4v2a8 8 0 0 1-8 8 8 8 0 0 1-8-8v-2h4v2H6a6 6 0 0 0 5 5.92V12H8v-2h3V7.83A3 3 0 0 1 12 2Zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z' },
];
HM.tokenById = (id) => HM.TOKENS.find(t => t.id === id) || HM.TOKENS[0];
HM.tokenSvg = (token, size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#0a0a0a" xmlns="http://www.w3.org/2000/svg"><path d="${token.svg}"/></svg>`;
