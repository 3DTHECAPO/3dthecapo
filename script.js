document.getElementById('year').textContent = new Date().getFullYear();

// Reveal on scroll
const reveals = Array.from(document.querySelectorAll('.reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); });
}, { threshold: 0.08 });
reveals.forEach(el => io.observe(el));

// Countdown (set your next drop date here)
const DROP_DATE = new Date(Date.now() + 7*24*60*60*1000);
const out = document.getElementById('countdown');
function tick(){
  const now = new Date();
  let ms = DROP_DATE - now;
  if (ms <= 0){ out.textContent = "LIVE"; return; }
  const s = Math.floor(ms/1000);
  const d = Math.floor(s/86400);
  const h = Math.floor((s%86400)/3600);
  const m = Math.floor((s%3600)/60);
  const ss = s%60;
  out.textContent = `${d}d ${h}h ${m}m ${ss}s`;
  setTimeout(tick, 1000);
}
tick();

// Mailing list (demo)
const form = document.getElementById('mailForm');
const note = document.getElementById('mailNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.textContent = "Submitted (demo). Add Mailchimp/Formspree when ready.";
  form.reset();
});


// Merch filter (v21)
(function(){
  const bar = document.querySelector('.filterbar');
  const cards = Array.from(document.querySelectorAll('.product'));
  if(!bar || !cards.length) return;
  const buttons = Array.from(bar.querySelectorAll('button[data-filter]'));
  const setActive = (btn) => {
    buttons.forEach(b => b.classList.toggle('gold', b === btn));
  };
  const apply = (tag) => {
    cards.forEach(c => {
      const show = (tag === 'all') || (c.dataset.tag === tag);
      c.style.display = show ? '' : 'none';
    });
  };
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.filter || 'all';
      setActive(btn);
      apply(tag);
    });
  });
  // default
  setActive(buttons[0]);
  apply('all');
})();
