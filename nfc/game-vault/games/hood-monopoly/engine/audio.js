/* PLAY 3D · Hood Monopoly — WebAudio engine (zero asset deps) */
window.HM = window.HM || {};
(function(){
  const engine = {
    ctx:null, muted:false, musicGain:null, musicNodes:[], musicPlaying:false, volume:0.5,
    _ensure(){ if(!this.ctx){ const C = window.AudioContext||window.webkitAudioContext; if(!C) return false; this.ctx = new C(); } if(this.ctx.state==='suspended') this.ctx.resume(); return true; },
    setMuted(m){ this.muted=!!m; if(this.musicGain) this.musicGain.gain.value = this.muted ? 0 : this.volume*0.25; },
    _tone(o){ const {freq=440,dur=0.12,type='sine',vol=0.2,attack=0.01,decay=0.12,slide=null}=o||{}; if(!this._ensure()||this.muted) return; const ctx=this.ctx; const osc=ctx.createOscillator(); const g=ctx.createGain(); osc.type=type; osc.frequency.value=freq; if(slide) osc.frequency.exponentialRampToValueAtTime(slide,ctx.currentTime+dur); g.gain.value=0; g.gain.linearRampToValueAtTime(vol,ctx.currentTime+attack); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+dur+decay); osc.connect(g).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+dur+decay+0.05); },
    _noise(o){ const {dur=0.2,vol=0.18,hp=600}=o||{}; if(!this._ensure()||this.muted) return; const ctx=this.ctx; const buf=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length); const src=ctx.createBufferSource(); src.buffer=buf; const g=ctx.createGain(); g.gain.value=vol; const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp; src.connect(f).connect(g).connect(ctx.destination); src.start(); },
    dice(){ this._noise({dur:0.3,vol:0.22,hp:800}); setTimeout(()=>this._tone({freq:880,dur:0.06,type:'triangle',vol:0.15}),280); },
    click(){ this._tone({freq:1200,dur:0.04,type:'square',vol:0.08}); },
    buy(){ this._tone({freq:660,dur:0.08,type:'sawtooth',vol:0.15,slide:1320}); },
    rent(){ this._tone({freq:440,dur:0.06,type:'triangle',vol:0.12}); setTimeout(()=>this._tone({freq:660,dur:0.1,type:'triangle',vol:0.14}),70); },
    jail(){ this._tone({freq:220,dur:0.3,type:'sawtooth',vol:0.18,slide:80}); },
    card(){ this._tone({freq:320,dur:0.05,type:'triangle',vol:0.12,slide:880}); },
    victory(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>this._tone({freq:f,dur:0.18,type:'triangle',vol:0.18}),i*120)); },
    bankrupt(){ [400,300,200,100].forEach((f,i)=>setTimeout(()=>this._tone({freq:f,dur:0.25,type:'sawtooth',vol:0.18}),i*140)); },
    startMusic(){
      if(!this._ensure()||this.musicPlaying) return;
      const ctx=this.ctx;
      const master = ctx.createGain(); master.gain.value = this.muted?0:this.volume*0.25; master.connect(ctx.destination); this.musicGain = master;
      const drone = ctx.createOscillator(); drone.type='sawtooth'; drone.frequency.value=55;
      const droneFilt = ctx.createBiquadFilter(); droneFilt.type='lowpass'; droneFilt.frequency.value=320;
      const droneGain = ctx.createGain(); droneGain.gain.value=0.5;
      drone.connect(droneFilt).connect(droneGain).connect(master); drone.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value=0.07;
      const lfoGain = ctx.createGain(); lfoGain.gain.value=180;
      lfo.connect(lfoGain).connect(droneFilt.frequency); lfo.start();
      const pad = ctx.createOscillator(); pad.type='sine'; pad.frequency.value=220;
      const padGain = ctx.createGain(); padGain.gain.value=0.18;
      pad.connect(padGain).connect(master); pad.start();
      this.musicNodes = [drone,lfo,pad,droneGain,padGain,droneFilt,lfoGain];
      this.musicPlaying = true;
    },
    stopMusic(){
      if(!this.musicPlaying) return;
      this.musicNodes.forEach(n=>{ try{ if(n.stop) n.stop(0);}catch(e){} });
      try{ this.musicGain?.disconnect(); }catch(e){}
      this.musicNodes = []; this.musicGain = null; this.musicPlaying = false;
    },
  };
  HM.audio = engine;
})();
