// 3D THE CAPO — scratch build
const LINKS = {
  youtube: "https://youtube.com/@iiidtv?si=xuHENlrbF27-2Z1x",
  ytmusic: "https://music.youtube.com/channel/UCM6GW8j7HMhcPAplgV5Ca4A?si=SxLuzKyyerdefz9a",
  spotify: "https://open.spotify.com/user/31thbrqw3vygxmwfhni7zaa5qxqa?si=0kWc6No5TjSkKP8Fc-lp0w",
  apple: "https://music.apple.com/us/artist/3d-the-capo/1758229296",
  instagram: "https://www.instagram.com/3d_the_capo?igsh=NTc4MTIwNjQ2YQ%3D%3D&utm_source=qr"
};

// Put your product checkout links here later (Shopify/Stripe/etc.)
const PRODUCT_LINKS = {
  tee: "#",
  hat: "#",
  hoodie: "#",
  chain: "#"
};

let cartCount = 0;
const cartCountEl = document.getElementById("cartCount");
const cartBtn = document.getElementById("cartBtn");

document.querySelectorAll("[data-link]").forEach(el => {
  const key = el.getAttribute("data-link");
  if (LINKS[key]) {
    el.href = LINKS[key];
    el.target = "_blank";
    el.rel = "noopener";
  }
});

document.querySelectorAll("[data-product]").forEach(el => {
  const key = el.getAttribute("data-product");
  el.addEventListener("click", (e) => {
    e.preventDefault();
    cartCount += 1;
    cartCountEl.textContent = `(${cartCount})`;
    const href = PRODUCT_LINKS[key] || "#";
    if (href !== "#") window.open(href, "_blank", "noopener");
  });
});

cartBtn?.addEventListener("click", () => {
  alert(`Cart demo: ${cartCount} item(s).\n\nTo make this a real checkout, connect Shopify (Buy Button) or Stripe links.`);
});

const form = document.getElementById("mailForm");
const note = document.getElementById("mailNote");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  if (!email) return;
  note.textContent = "Thanks — you’re on the list (demo). Connect Mailchimp/Formspree to collect emails for real.";
  form.reset();
});

document.getElementById("year").textContent = new Date().getFullYear();
