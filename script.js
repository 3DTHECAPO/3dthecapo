document.getElementById('year').textContent = new Date().getFullYear();
const form = document.getElementById('mailForm');
const note = document.getElementById('mailNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.textContent = "Submitted (demo). Connect Mailchimp / Formspree when you're ready.";
  form.reset();
});
