(function(){
  'use strict';

  if(window.CAPO_GUIDE_LOADED) return;
  window.CAPO_GUIDE_LOADED = true;

  const ANSWERS = {
    code: 'Tap Enter Code, then use the access code from your merch, pass, or drop. If you are already inside NFC, it stays inside the NFC folder and does not jump to the wrong page.',
    rewards: 'Rewards are tied to member or pass activity. Free players can play, but rewards need a member/pass.',
    claim: 'Go to the rewards area, pick your available reward, and submit the claim form. Some rewards require manual review.',
    museum: 'The Vault Museum is the public exhibit space for drops and vault history.',
    member: 'Join through Buy Access or enter a valid vault pass. Member rewards turn on after access is active.',
    support: 'For support, use the official social links or email/update form on the main site.'
  };

  const TOPICS = [
    ['How do I enter a code?', 'code'],
    ['How do rewards work?', 'rewards'],
    ['How do I claim rewards?', 'claim'],
    ['Where is the museum?', 'museum'],
    ['How do I join?', 'member'],
    ['Contact / support', 'support']
  ];

  /*
    Route fixer:
    - If this guide is loaded anywhere inside /nfc/, links stay inside the real /nfc/ folder.
    - If this guide is loaded on the main site, links go into ./nfc/.
    - This prevents the old broken ../nfc/... behavior.
  */
  function nfcBase(){
    const pathName = window.location.pathname || '';
    const marker = '/nfc/';
    const at = pathName.indexOf(marker);
    if(at !== -1) return pathName.slice(0, at + marker.length - 1);

    // Handles exact /nfc without trailing slash.
    if(pathName.endsWith('/nfc')) return pathName;

    // Main site fallback.
    return './nfc';
  }

  function nfcUrl(relativePath, keepCode){
    const clean = String(relativePath || '').replace(/^\/+/, '');
    let href = nfcBase().replace(/\/$/, '') + '/' + clean;

    if(keepCode){
      const code = new URLSearchParams(window.location.search).get('code');
      if(code){
        href += (href.includes('?') ? '&' : '?') + 'code=' + encodeURIComponent(code);
      }
    }

    return href;
  }

  function hasActivePass(){
    try{
      const raw = localStorage.getItem('play3d_vault_pass_v1');
      const pass = raw ? JSON.parse(raw) : null;
      return !!(pass && pass.expires_at && new Date(pass.expires_at).getTime() > Date.now());
    }catch(e){
      return false;
    }
  }

  function hasMember(){
    return localStorage.getItem('play3d_member_v1') === '1'
      || !!localStorage.getItem('play3d_member_id_v1')
      || hasActivePass();
  }

  function statusText(){
    const lines = [];
    if(hasActivePass()) lines.push('Vault access active.');
    if(hasMember()) lines.push('Member rewards enabled.');
    if(!lines.length) lines.push('Free mode active. Join or enter a pass to earn rewards.');
    return lines.join(' ');
  }

  function makeEl(tag, className, text){
    const el = document.createElement(tag);
    if(className) el.className = className;
    if(text != null) el.textContent = text;
    return el;
  }

  function render(){
    if(document.querySelector('.capo-guide-root')) return;

    const root = makeEl('div', 'capo-guide-root');
    const button = makeEl('button', 'capo-guide-button', 'GUIDE');
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open CAPO GUIDE');

    const panel = makeEl('section', 'capo-guide-panel');
    panel.hidden = true;
    panel.setAttribute('aria-label', 'CAPO GUIDE');

    const head = makeEl('div', 'capo-guide-head');
    head.appendChild(makeEl('div', 'capo-guide-title', 'CAPO GUIDE'));
    const close = makeEl('button', 'capo-guide-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close CAPO GUIDE');
    head.appendChild(close);

    const body = makeEl('div', 'capo-guide-body');
    const status = makeEl('div', 'capo-guide-status', statusText());
    const drop = makeEl('div', 'capo-guide-drop', 'Current drop: new music and vault access are live. Tap into merch, scan your code, or visit the museum.');
    const answer = makeEl('div', 'capo-guide-answer', 'Pick a question and I will point you in the right direction.');
    const grid = makeEl('div', 'capo-guide-grid');

    TOPICS.forEach(([label, key]) => {
      const item = makeEl('button', 'capo-guide-option', label);
      item.type = 'button';
      item.addEventListener('click', () => {
        answer.textContent = ANSWERS[key];
      });
      grid.appendChild(item);
    });

    const links = makeEl('div', 'capo-guide-links');
    [
      ['Enter Code', nfcUrl('scan.html', true)],
      ['Game Vault', nfcUrl('game-vault/', false)],
      ['Rewards', nfcUrl('game-vault/rewards/', false)],
      ['Museum', nfcUrl('museum/', false)]
    ].forEach(([label, href]) => {
      const link = makeEl('a', 'capo-guide-link', label);
      link.href = href;
      links.appendChild(link);
    });

    body.appendChild(status);
    body.appendChild(drop);
    body.appendChild(answer);
    body.appendChild(grid);
    body.appendChild(links);
    panel.appendChild(head);
    panel.appendChild(body);
    root.appendChild(button);
    root.appendChild(panel);
    document.body.appendChild(root);

    function setOpen(open){
      panel.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      status.textContent = statusText();
    }

    button.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape') setOpen(false);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  }else{
    render();
  }
})();
