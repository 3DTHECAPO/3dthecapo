(function(){
  'use strict';

  if(window.CAPO_GUIDE_LOADED) return;
  window.CAPO_GUIDE_LOADED = true;

  const ANSWERS = {
    code: 'Tap Vault or Enter Code, then use the access code from your merch, pass, or drop. Start at the scan page.',
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

  function path(url){
    const isNfc = location.pathname.includes('/nfc/');
    return isNfc ? '../' + url.replace(/^\.\//, '') : url;
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
    const close = makeEl('button', 'capo-guide-close', 'x');
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
      ['Enter Code', './index.html'],
      ['Game Vault', './game-vault/'],
      ['Rewards', './game-vault/rewards/'],
      ['Museum', './museum/']
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
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  }else{
    render();
  }
})();
