
(function(){
  'use strict';

  window.Play3DAAA = {
    boot(){
      this.installBackground();
      this.installParticles();
      this.installAudio();
      this.installHoverFX();
      console.log('PLAY 3D AAA ENGINE ACTIVE');
    },

    installBackground(){
      if(document.querySelector('.p3d-cinematic-bg')) return;

      const bg = document.createElement('div');
      bg.className = 'p3d-cinematic-bg';
      bg.innerHTML = `
        <div class="p3d-fog"></div>
        <div class="p3d-glow"></div>
        <div class="p3d-grid"></div>
      `;
      document.body.prepend(bg);
    },

    installParticles(){
      const wrap = document.createElement('div');
      wrap.className = 'p3d-particles';

      for(let i=0;i<36;i++){
        const p = document.createElement('div');
        p.className = 'p3d-particle';
        p.style.left = Math.random()*100 + '%';
        p.style.animationDuration = (8 + Math.random()*14) + 's';
        p.style.animationDelay = (Math.random()*6) + 's';
        wrap.appendChild(p);
      }

      document.body.appendChild(wrap);
    },

    installAudio(){
      window.Play3DSFX = {
        click(){
          try{
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.value = 180;
            gain.gain.value = 0.02;
            osc.start();
            osc.stop(ctx.currentTime + .05);
          }catch(e){}
        }
      };

      document.addEventListener('click', e=>{
        if(e.target.closest('button,.card,.tile,.sq')){
          window.Play3DSFX.click();
        }
      });
    },

    installHoverFX(){
      document.querySelectorAll('.panel,.table,.board-shell,.hero,.tile,.card')
        .forEach(el=>{
          el.classList.add('p3d-hover');
          el.classList.add('p3d-shine');
        });
    }
  };

  window.addEventListener('DOMContentLoaded', ()=>{
    window.Play3DAAA.boot();
  });
})();
