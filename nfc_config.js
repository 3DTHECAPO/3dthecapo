// Edit later when you have NFC tags.
// Program tags to: https://YOURDOMAIN/nfc.html?t=disc1 (or disc2, vip, merch, etc.)
window.NFC_ROUTES = {
  default: { title: "Welcome", desc: "Open the official site.", button: "Open site", href: "./index.html#top" },
  disc1:   { title: "Mini CD — Disc 1", desc: "Go straight to Music.", button: "Play music", href: "./index.html#music" },
  merch:   { title: "Merch Drop", desc: "Go straight to merch.", button: "Shop merch", href: "./index.html#merch" },
  vip:     { title: "VIP Access", desc: "Join the list to unlock VIP drops later.", button: "Join list", href: "./index.html#mail" }
};
