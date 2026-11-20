/* Retired 2026-11-20: master access is checked by the server (master_unlock / master_verify).
   This helper used to open master access from a link; it now does nothing and is kept only so
   any old page that still loads it does not break. */
(function(){})();
