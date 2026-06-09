(function(){
  'use strict';

  const byId = (id) => document.getElementById(id);
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // 🔑 PASTE YOUR SUPABASE ANON KEY HERE
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cG9lZHJvdmZsb3VkZWZ5em5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzU2NjEsImV4cCI6MjA5MjM1MTY2MX0.CGgOxXXSXWMjNPcnQR_zMBHk8WkWSb0lhcNlTfCR4xo";

  const yearEl = byId('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const countdownTargets = [byId('countdown')].filter(Boolean);
  const DROP_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  function tick(){
    const now = new Date();
    const ms = DROP_DATE - now;

    if (ms <= 0){
      countdownTargets.forEach(el => el.textContent = 'LIVE');
      return;
    }

    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;

    countdownTargets.forEach(el => el.textContent = `${d}d ${h}h ${m}m ${ss}s`);
    setTimeout(tick, 1000);
  }

  tick();

  // 🔒 PUBLIC EMAIL CODE REQUEST — HARD BLOCK DUPLICATE EMAILS
  function normalizePublicEmail(email){
    return String(email || '').trim().toLowerCase();
  }

  async function publicEmailAlreadyUsed(email){
    const clean = normalizePublicEmail(email);
    if(!clean) return { blocked:false };

    try{
      const res = await fetch(`https://fupoedrovfloudefyzna.supabase.co/rest/v1/vault_codes?recipient_email=eq.${encodeURIComponent(clean)}&select=code,recipient_email&limit=1`, {
        headers:{
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY
        }
      });

      if(!res.ok){
        const text = await res.text();
        console.warn("Duplicate email check failed:", text);
        return { blocked:false, error:text };
      }

      const rows = await res.json().catch(()=>[]);

      // HARD LOCK: if the email exists once in Supabase, block forever.
      if(Array.isArray(rows) && rows.length > 0){
        return { blocked:true, row: rows[0] };
      }

      return { blocked:false };
    }catch(err){
      console.warn("Duplicate email check error:", err);
      return { blocked:false, error:err.message };
    }
  }

  window.emailFirstCode = async function () {
    const emailInput = document.getElementById("email");
    const nameInput = document.getElementById("name");

    const email = normalizePublicEmail(emailInput?.value);
    const name = nameInput?.value || "";

    if (!email) {
      alert("Enter email");
      return;
    }

    const existing = await publicEmailAlreadyUsed(email);

    if(existing.blocked){
      alert("This email already received a PLAY 3D access code.");
      return;
    }

    try {
      const res = await fetch("https://fupoedrovfloudefyzna.supabase.co/functions/v1/dynamic-endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + SUPABASE_KEY
        },
        body: JSON.stringify({
          email: email,
          name: name
        })
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        alert("RAW ERROR: " + text);
        return;
      }

      console.log("Response:", data);

      if (!res.ok) {
        const msg = (data.error || JSON.stringify(data) || "").toLowerCase();

        if(msg.includes("duplicate") || msg.includes("already") || msg.includes("23505")){
          alert("This email already received a PLAY 3D access code.");
          return;
        }

        alert("SERVER ERROR: " + (data.error || JSON.stringify(data)));
        return;
      }

      if (data.success) {
        alert("Check your email");
      } else {
        alert("Error: " + (data.error || "Something went wrong"));
      }

    } catch (err) {
      console.error(err);
      alert("Request failed: " + err.message);
    }
  };

  window.publicEmailAlreadyUsed = publicEmailAlreadyUsed;

  // Merch filter
  qsa('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      qsa('.merch-grid .product').forEach(card => {
        const tag = card.getAttribute('data-tag') || '';
        card.style.display = (filter === 'ALL' || tag === filter) ? '' : 'none';
      });
    });
  });

  const search = byId('merchSearch');

  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();

      qsa('.merch-grid .product').forEach(card => {
        const txt = (
          (qs('.name', card)?.textContent || '') + ' ' +
          (qs('.price', card)?.textContent || '')
        ).toLowerCase();

        card.style.display = (!q || txt.includes(q)) ? '' : 'none';
      });
    });
  }

  // Modal
  const modal = byId('productModal');
  const modalImage = byId('modalImage');
  const modalName = byId('modalName');
  const modalPrice = byId('modalPrice');
  const closeModal = byId('closeModal');

  qsa('.quick-view, .add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!modal) return;

      if (modalImage) modalImage.src = btn.dataset.img || './merch_hat.jpg';
      if (modalName) modalName.textContent = btn.dataset.name || 'Product';
      if (modalPrice) modalPrice.textContent = btn.dataset.price || '';

      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    });
  });

  function hideModal(){
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  if (closeModal) closeModal.addEventListener('click', hideModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }

  const shareButton = byId('putMeOnShareButton');
  const shareFeedback = byId('putMeOnShareFeedback');

  function showShareFeedback(message){
    if(!shareFeedback) return;
    shareFeedback.textContent = message;
    shareFeedback.classList.add('visible');
    clearTimeout(showShareFeedback.timer);
    showShareFeedback.timer = setTimeout(function(){
      shareFeedback.classList.remove('visible');
    }, 2200);
  }

  async function copyShareLink(url){
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);
      return;
    }

    const input = document.createElement('input');
    input.value = url;
    input.setAttribute('readonly','readonly');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }

  if(shareButton){
    shareButton.addEventListener('click', async function(){
      const payload = {
        title: '3D THE CAPO',
        text: 'Yo, check this out.\n\nMusic, merch, games, rewards and exclusive drops.',
        url: 'https://3dthecapo.com'
      };

      try{
        if(navigator.share){
          await navigator.share(payload);
          showShareFeedback('🔥 TELL A FRIEND 2 TELL A FRIEND .');
          return;
        }

        await copyShareLink(payload.url);
        showShareFeedback('🔥 LINK LOADED.');
      }catch(err){
        if(err && err.name === 'AbortError') return;
        try{
          await copyShareLink(payload.url);
          showShareFeedback('🔥 PASTE DAT SHIT YEE.');
        }catch(copyErr){
          showShareFeedback('Copy failed');
        }
      }
    });
  }

})();

(function(){
  window.requestAnimationFrame(() => {
    document.body.classList.add('site-loaded');
  });
})();

// PLAY 3D BUY PAGE — VAULT PRESSURE + SOLD OUT LOCK
async function loadVaultPressure(){
  const ids = ["entryCount","entry","gold","elite"];
  if(!ids.some(id => document.getElementById(id))) return;

  try{
    if(typeof SUPABASE_KEY === "undefined" || !SUPABASE_KEY){
      console.warn("Vault pressure skipped: SUPABASE_KEY missing.");
      return;
    }

    const res = await fetch("https://fupoedrovfloudefyzna.supabase.co/rest/v1/vault_codes?select=code_type,sent,recipient_email", {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY
      }
    });

    const data = await res.json();

    if(!Array.isArray(data)){
      console.warn("Vault pressure unexpected response:", data);
      return;
    }

    const available = type =>
      data.filter(x =>
        x.code_type === type &&
        !x.sent &&
        !x.recipient_email
      ).length;

    const entry = available("ENTRY");
    const gold = available("GOLD");
    const elite = available("ELITE");

    if(document.getElementById("entryCount")) document.getElementById("entryCount").innerText = entry;
    if(document.getElementById("entry")) document.getElementById("entry").innerText = entry;
    if(document.getElementById("gold")) document.getElementById("gold").innerText = gold;
    if(document.getElementById("elite")) document.getElementById("elite").innerText = elite;

    if(entry <= 0){
      document.querySelectorAll("a[href*='cash.app'], .cash-btn, .buy-btn").forEach(btn=>{
        btn.innerText = "SOLD OUT";
        btn.style.pointerEvents = "none";
        btn.style.opacity = ".45";
        btn.style.filter = "grayscale(1)";
      });

      if(document.getElementById("entryCount")){
        document.getElementById("entryCount").innerText = "SOLD OUT";
      }
    }

  }catch(err){
    console.log("Vault pressure not loaded:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadVaultPressure);


// PLAY 3D SITE-STYLE DRAGGABLE CLASSIC iPOD
document.addEventListener("DOMContentLoaded", function(){
  const player = document.getElementById("play3dIpodPlayer");
  const handle = document.getElementById("p3dIpodHandle");
  const audio = document.getElementById("p3dIpodAudio");

  if(!player || !audio) return;

  const fallbackTracks = [
    {
      title:"100x3",
      artist:"3D THE CAPO",
      sources:["./music/100x3.mp3","./music/100x3.wav","./music/100x3.MP3","./music/100x3.WAV"],
      cover:"./player-placeholder.jpg"
    },
    {
      title:"Fuck A Grammy",
      artist:"3D THE CAPO",
      sources:["./music/fuck-a-grammy.mp3","./music/fuck-a-grammy.wav","./music/fuck-a-grammy.MP3","./music/fuck-a-grammy.WAV"],
      cover:"./player-placeholder.jpg"
    },
    {
      title:"True Story",
      artist:"3D THE CAPO",
      sources:["./music/true-story.mp3","./music/true-story.wav","./music/true-story.MP3","./music/true-story.WAV"],
      cover:"./player-placeholder.jpg"
    }
  ];

  let tracks = fallbackTracks.slice();
  let index = 0;
  let sourceIndex = 0;
  let skippedTrackCount = 0;
  let warnedMissingAudio = false;

  const minBtn = document.getElementById("p3dIpodMin");
  const subwooferToggle = document.getElementById("p3dSubwooferToggle");
  const playerModeKey = "PLAY3D_STEP_LOUD_PLAYER_OPEN";
  const cover = document.getElementById("p3dIpodCover");
  const title = document.getElementById("p3dIpodTitle");
  const artist = document.getElementById("p3dIpodArtist");
  const progress = document.getElementById("p3dIpodProgress");
  const progressFill = document.getElementById("p3dIpodProgressFill");
  const current = document.getElementById("p3dIpodCurrent") || document.getElementById("p3dIpodTime");
  const duration = document.getElementById("p3dIpodDuration");
  const prev = document.getElementById("p3dIpodPrev");
  const next = document.getElementById("p3dIpodNext");
  const playPause = document.getElementById("p3dIpodPlayPause");
  const center = document.getElementById("p3dIpodCenter");

  function fmt(sec){
    if(!Number.isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2,"0");
    return m + ":" + s;
  }

  function mimeForSource(src){
    const clean = String(src || '').split('?')[0].split('#')[0].toLowerCase();
    if(clean.endsWith('.mp3')) return 'audio/mpeg';
    if(clean.endsWith('.wav')) return 'audio/wav';
    return '';
  }

  function isSafeAudioPath(src){
    const clean = String(src || '').trim();
    const lower = clean.toLowerCase();
    if(!clean) return false;
    if(lower.startsWith('javascript:') || lower.startsWith('data:')) return false;
    if(lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('//')) return false;
    if(clean.includes('\\')) return false;
    if(!(clean.startsWith('./') || clean.startsWith('/'))) return false;
    return /\.(mp3|wav)([?#].*)?$/i.test(clean);
  }

  function normalizeTrack(entry){
    if(!entry || typeof entry !== 'object') return null;
    const rawSources = Array.isArray(entry.sources) ? entry.sources : [entry.src];
    const sources = rawSources
      .map(src => String(src || '').trim())
      .filter(isSafeAudioPath);

    if(!sources.length) return null;

    return {
      title: String(entry.title || 'PLAY 3D Track').trim(),
      artist: String(entry.artist || '3D THE CAPO').trim(),
      sources,
      cover: String(entry.cover || './player-placeholder.jpg').trim() || './player-placeholder.jpg'
    };
  }

  async function loadMusicLibrary(){
    try{
      const res = await fetch('./music-library.json', { cache:'no-store' });
      if(!res.ok) throw new Error('music-library.json unavailable');
      const data = await res.json();
      if(!Array.isArray(data)) throw new Error('music-library.json must be an array');
      const libraryTracks = data.map(normalizeTrack).filter(Boolean);
      if(libraryTracks.length){
        tracks = libraryTracks;
      }
    }catch(err){
      tracks = fallbackTracks.slice();
      console.warn('Music library fallback active:', err.message || err);
    }
  }

  function playableSources(track){
    return (track.sources || [])
      .filter(Boolean)
      .filter(isSafeAudioPath)
      .filter(src => audio.canPlayType(mimeForSource(src)) !== '');
  }

  function setPlayIcon(label){
    const icon = label === 'Pause' ? 'Pause' : 'Play';
    if(center) center.textContent = icon;
    if(playPause) playPause.textContent = icon;
  }

  function warnMissingAudio(){
    if(warnedMissingAudio) return;
    warnedMissingAudio = true;
    console.warn('No playable PLAY 3D music files are available. Check music-library.json paths and file types.');
    if(title) title.textContent = 'Select Track';
  }

  function setTrackMeta(track){
    if(cover) cover.src = track.cover || './player-placeholder.jpg';
    if(title) title.textContent = track.title || 'Select Track';
    if(artist) artist.textContent = track.artist || '3D THE CAPO';
    if(progress) progress.value = 0;
    if(progressFill) progressFill.style.width = '0%';
    if(current) current.textContent = '0:00';
    if(duration) duration.textContent = '0:00';
    setPlayIcon('Play');
  }

  function setAudioSource(track, startAt){
    const sources = playableSources(track);
    if(startAt >= sources.length){
      audio.removeAttribute('src');
      return false;
    }
    sourceIndex = startAt;
    audio.src = sources[sourceIndex];
    return true;
  }

  function skipToNextTrack(){
    skippedTrackCount += 1;
    if(!tracks.length || skippedTrackCount >= tracks.length){
      setPlayIcon('Play');
      warnMissingAudio();
      return;
    }

    index = (index + 1) % tracks.length;
    sourceIndex = 0;
    const track = tracks[index];
    setTrackMeta(track);

    if(setAudioSource(track, 0)){
      tryPlayCurrentSource();
    }else{
      skipToNextTrack();
    }
  }

  function tryPlayCurrentSource(){
    return audio.play().then(function(){
      skippedTrackCount = 0;
      setPlayIcon('Pause');
      return true;
    }).catch(function(){
      const track = tracks[index];
      if(setAudioSource(track, sourceIndex + 1)){
        return tryPlayCurrentSource();
      }
      skipToNextTrack();
      return false;
    });
  }

  function loadTrack(i, autoplay){
    if(!tracks.length){
      warnMissingAudio();
      return;
    }

    skippedTrackCount = 0;
    index = (i + tracks.length) % tracks.length;
    sourceIndex = 0;
    warnedMissingAudio = false;
    const track = tracks[index];

    setTrackMeta(track);
    if(!setAudioSource(track, 0)){
      if(autoplay) skipToNextTrack();
      return;
    }

    if(autoplay){
      tryPlayCurrentSource();
    }
  }

  function togglePlay(){
    if(audio.paused){
      tryPlayCurrentSource();
    }else{
      audio.pause();
      setPlayIcon('Play');
    }
  }

  if(center) center.addEventListener('click', togglePlay);
  if(playPause) playPause.addEventListener('click', togglePlay);
  if(prev) prev.addEventListener('click', function(){ loadTrack(index - 1, true); });
  if(next) next.addEventListener('click', function(){ loadTrack(index + 1, true); });

  audio.addEventListener('error', function(){
    const track = tracks[index];
    if(track && setAudioSource(track, sourceIndex + 1)){
      tryPlayCurrentSource();
    }else{
      skipToNextTrack();
    }
  });

  audio.addEventListener('timeupdate', function(){
    if(audio.duration){
      const pct = (audio.currentTime / audio.duration) * 100;
      if(progress) progress.value = pct;
      if(progressFill) progressFill.style.width = pct + '%';
      if(current) current.textContent = fmt(audio.currentTime);
      if(duration) duration.textContent = fmt(audio.duration);
    }
  });

  if(progress){
    progress.addEventListener('input', function(){
      if(audio.duration) audio.currentTime = (progress.value / 100) * audio.duration;
    });
  }

  audio.addEventListener('ended', function(){ loadTrack(index + 1, true); });

  function setPlayerOpen(open, persist){
    document.body.classList.toggle('p3d-player-open', !!open);
    player.classList.toggle('minimized', !open);
    if(subwooferToggle) subwooferToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(minBtn) minBtn.textContent = open ? '—' : '+';
    if(persist){
      try{ localStorage.setItem(playerModeKey, open ? '1' : '0'); }catch(err){}
    }
  }

  function restorePlayerMode(){
    let saved = '0';
    try{ saved = localStorage.getItem(playerModeKey) || '0'; }catch(err){}
    setPlayerOpen(saved === '1', false);
  }

  if(subwooferToggle){
    subwooferToggle.addEventListener('click', function(){
      if(subwooferToggle.dataset.dragged === '1'){
        subwooferToggle.dataset.dragged = '0';
        return;
      }
      setPlayerOpen(true, true);
    });
  }

  if(minBtn){
    minBtn.addEventListener('click', function(e){
      e.stopPropagation();
      e.preventDefault();
      setPlayerOpen(false, true);
    });
  }

  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartLeft = 0;
  let dragStartRight = 0;
  let dragStartTop = 0;
  let dragStartBottom = 0;
  let dragStartTranslateX = 0;
  let dragStartTranslateY = 0;
  let currentTranslateX = 0;
  let currentTranslateY = 0;

  player.addEventListener('dragstart', function(e){
    e.preventDefault();
  });

  function startDrag(clientX, clientY){
    dragging = true;
    const rect = player.getBoundingClientRect();
    dragStartX = clientX;
    dragStartY = clientY;
    dragStartLeft = rect.left;
    dragStartRight = rect.right;
    dragStartTop = rect.top;
    dragStartBottom = rect.bottom;
    dragStartTranslateX = currentTranslateX;
    dragStartTranslateY = currentTranslateY;
  }

  function moveDrag(clientX, clientY){
    if(!dragging) return;

    const minDeltaX = -dragStartLeft;
    const maxDeltaX = window.innerWidth - dragStartRight;
    const minDeltaY = -dragStartTop;
    const maxDeltaY = window.innerHeight - dragStartBottom;

    let deltaX = clientX - dragStartX;
    let deltaY = clientY - dragStartY;

    deltaX = Math.max(minDeltaX, Math.min(maxDeltaX, deltaX));
    deltaY = Math.max(minDeltaY, Math.min(maxDeltaY, deltaY));

    currentTranslateX = dragStartTranslateX + deltaX;
    currentTranslateY = dragStartTranslateY + deltaY;
    player.style.transform = 'translate3d(' + currentTranslateX + 'px, ' + currentTranslateY + 'px, 0)';
  }

  function isDragControl(target){
    return target && target.closest && target.closest('button,input');
  }

  function stopDrag(){
    dragging = false;
    if(handle) handle.classList.remove('dragging');
  }

  if(handle && window.PointerEvent){
    handle.addEventListener('pointerdown', function(e){
      if(isDragControl(e.target)) return;
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
      handle.classList.add('dragging');
      try{ handle.setPointerCapture(e.pointerId); }catch(err){}
    });

    document.addEventListener('pointermove', function(e){
      if(!dragging) return;
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    }, { passive:false });

    document.addEventListener('pointerup', stopDrag);
    document.addEventListener('pointercancel', stopDrag);
  }else if(handle){
    handle.addEventListener('mousedown', function(e){
      if(isDragControl(e.target)) return;
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
      handle.classList.add('dragging');
    });

    document.addEventListener('mousemove', function(e){
      moveDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', stopDrag);

    handle.addEventListener('touchstart', function(e){
      if(isDragControl(e.target)) return;
      if(!e.touches || !e.touches.length) return;
      e.preventDefault();
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
      handle.classList.add('dragging');
    }, { passive:false });

    document.addEventListener('touchmove', function(e){
      if(!dragging || !e.touches || !e.touches.length) return;
      e.preventDefault();
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    }, { passive:false });

    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);
  }

  if(subwooferToggle && window.PointerEvent){
    let subDragging = false;
    let subStartX = 0;
    let subStartY = 0;
    let subStartLeft = 0;
    let subStartRight = 0;
    let subStartTop = 0;
    let subStartBottom = 0;
    let subTranslateX = 0;
    let subTranslateY = 0;

    subwooferToggle.addEventListener('pointerdown', function(e){
      subDragging = true;
      subStartX = e.clientX;
      subStartY = e.clientY;
      const rect = subwooferToggle.getBoundingClientRect();
      subStartLeft = rect.left;
      subStartRight = rect.right;
      subStartTop = rect.top;
      subStartBottom = rect.bottom;
      try{ subwooferToggle.setPointerCapture(e.pointerId); }catch(err){}
    });

    subwooferToggle.addEventListener('pointermove', function(e){
      if(!subDragging) return;
      const minDeltaX = -subStartLeft;
      const maxDeltaX = window.innerWidth - subStartRight;
      const minDeltaY = -subStartTop;
      const maxDeltaY = window.innerHeight - subStartBottom;
      let deltaX = e.clientX - subStartX;
      let deltaY = e.clientY - subStartY;
      if(Math.abs(deltaX) + Math.abs(deltaY) > 8) subwooferToggle.dataset.dragged = '1';
      deltaX = Math.max(minDeltaX, Math.min(maxDeltaX, deltaX));
      deltaY = Math.max(minDeltaY, Math.min(maxDeltaY, deltaY));
      subTranslateX += deltaX;
      subTranslateY += deltaY;
      subStartX = e.clientX;
      subStartY = e.clientY;
      subwooferToggle.style.transform = 'translate3d(' + subTranslateX + 'px, ' + subTranslateY + 'px, 0)';
    });

    subwooferToggle.addEventListener('pointerup', function(){
      subDragging = false;
      setTimeout(function(){ subwooferToggle.dataset.dragged = '0'; }, 80);
    });

    subwooferToggle.addEventListener('pointercancel', function(){
      subDragging = false;
      setTimeout(function(){ subwooferToggle.dataset.dragged = '0'; }, 80);
    });
  }

  loadMusicLibrary().then(function(){
    loadTrack(0, false);
  });

  restorePlayerMode();
});
