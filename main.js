// Paste your real URLs here (optional).
const LINKS = {
  cart: "#",
  shop: "#merch",
  music: "#music",
  fav: "#connect",
  shopNow: "#",
  newDrop: "#",
  audio: "#",
  video: "#",
  merch: { tee:"#", hat:"#", hoodie:"#", chain:"#"}
};

function setHref(id, href){
  const el = document.getElementById(id);
  if (el && href) el.href = href;
}

setHref("cart", LINKS.cart);
setHref("iconShop", LINKS.shop);
setHref("iconMusic", LINKS.music);
setHref("iconFav", LINKS.fav);
setHref("shopNow", LINKS.shopNow);
setHref("newDropCard", LINKS.newDrop);
setHref("audio", LINKS.audio);
setHref("video", LINKS.video);
setHref("tee", LINKS.merch.tee);
setHref("hat", LINKS.merch.hat);
setHref("hoodie", LINKS.merch.hoodie);
setHref("chain", LINKS.merch.chain);

// Fake mailing list message
const form = document.getElementById("mailForm");
const msg = document.getElementById("msg");
form.addEventListener("submit", (e)=>{
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  msg.textContent = email ? "Thanks for joining." : "Please enter your email.";
  if (email) form.reset();
});
