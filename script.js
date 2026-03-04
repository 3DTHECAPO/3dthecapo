(() => {
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));

  // Year
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();

  // Smooth scroll for internal anchors
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({behavior:"smooth", block:"start"});
      }
    });
  });

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) en.target.classList.add("on");
    });
  }, {threshold: 0.12});
  $$(".reveal").forEach(el => io.observe(el));

  // Countdown (demo) - set next Friday 9PM local
  const cd = $("#countdown");
  function nextFriday9pm(){
    const now = new Date();
    const d = new Date(now);
    const day = d.getDay(); // 0 Sun
    const diff = (5 - day + 7) % 7; // Friday=5
    d.setDate(d.getDate() + (diff === 0 && now.getHours() >= 21 ? 7 : diff));
    d.setHours(21,0,0,0);
    return d;
  }
  if (cd) {
    const target = nextFriday9pm();
    const tick = () => {
      const now = new Date();
      const ms = Math.max(0, target - now);
      const s = Math.floor(ms/1000);
      const dd = Math.floor(s/86400);
      const hh = Math.floor((s%86400)/3600);
      const mm = Math.floor((s%3600)/60);
      const ss = s%60;
      cd.textContent = `${dd}d ${hh}h ${mm}m ${ss}s`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // Mailing list (demo)
  const form = $("#mailForm");
  const note = $("#mailNote");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (note) note.textContent = "Saved (demo). Add Mailchimp / Klaviyo later.";
      form.reset();
    });
  }
})();

  // Quick view modal for merch images (V15)
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-backdrop" data-close="1"></div>
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Product preview">
      <button class="modal-x" type="button" aria-label="Close" data-close="1">✕</button>
      <img class="modal-img" alt="" />
      <div class="modal-meta">
        <div class="modal-name"></div>
        <div class="modal-note">Mockup preview • Replace with your final photos anytime.</div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const openModal = (src, name) => {
    modal.classList.add("open");
    const img = modal.querySelector(".modal-img");
    img.src = src;
    img.alt = name || "Product image";
    modal.querySelector(".modal-name").textContent = name || "";
    document.documentElement.style.overflow = "hidden";
  };
  const closeModal = () => {
    modal.classList.remove("open");
    document.documentElement.style.overflow = "";
  };
  modal.addEventListener("click", (e) => {
    if (e.target && e.target.getAttribute("data-close")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  $$(".product .product-media img").forEach(img => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => {
      const card = img.closest(".product");
      const name = card?.getAttribute("data-name") || img.alt || "";
      openModal(img.getAttribute("src"), name);
    });
  });
