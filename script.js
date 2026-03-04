document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('mailForm');
const note = document.getElementById('mailNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.textContent = "Submitted (demo). Connect Mailchimp / Formspree when you're ready.";
  form.reset();
});

document.querySelectorAll('button[data-logo]').forEach(btn => {
  btn.addEventListener('click', () => {
    const href = btn.getAttribute('data-logo');
    const a = document.createElement('a');
    a.href = href;
    a.download = href.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
});
