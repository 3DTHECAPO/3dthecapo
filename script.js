
document.getElementById('year').textContent = new Date().getFullYear();

// Tabs
const tabs = document.querySelectorAll('.tab');
const panes = document.querySelectorAll('[data-pane]');
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  const v = t.dataset.tab;
  panes.forEach(p => p.classList.toggle('hidden', p.dataset.pane !== v));
}));

// Coming soon buttons
document.querySelectorAll('[data-comingsoon]').forEach(btn => {
  btn.addEventListener('click', () => alert("Checkout is coming soon. Tell me when you're ready to connect payments."));
});

// Mail demo
const form = document.getElementById('mailForm');
const note = document.getElementById('mailNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.textContent = "Submitted (demo). Add Mailchimp/Formspree when ready.";
  form.reset();
});

// Modal links
const dlg = document.getElementById('notice');
document.getElementById('openNotice').addEventListener('click', () => dlg.showModal());
document.getElementById('closeNotice').addEventListener('click', () => dlg.close());
