(function(){
  'use strict';

  var BANK_KEY = 'play3d_game_bank_v1';
  var BOOST_KEY = 'play3d_boost_v3';
  var JACKPOT_KEY = 'play3d_jackpot_v1';
  var STARTER = 1000;
  var JACKPOT_START = 5000;

  function readNumber(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      var val = raw === null ? NaN : Number(raw);
      return Number.isFinite(val) ? val : fallback;
    }catch(e){
      return fallback;
    }
  }

  function writeNumber(key, value){
    var next = Math.max(0, Math.floor(Number(value) || 0));
    try{ localStorage.setItem(key, String(next)); }catch(e){}
    return next;
  }

  function applyQueuedBoost(){
    var boost = readNumber(BOOST_KEY, 0);
    if(boost <= 0) return 0;
    var current = readNumber(BANK_KEY, STARTER);
    writeNumber(BANK_KEY, current + boost);
    writeNumber(BOOST_KEY, 0);
    return boost;
  }

  function getCredits(){
    applyQueuedBoost();
    return readNumber(BANK_KEY, STARTER);
  }

  function setCredits(value){
    return writeNumber(BANK_KEY, value);
  }

  function addCredits(amount){
    return setCredits(getCredits() + (Number(amount) || 0));
  }

  function canAfford(amount){
    return getCredits() >= Math.max(0, Number(amount) || 0);
  }

  function wager(amount){
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if(!canAfford(amount)) return false;
    setCredits(getCredits() - amount);
    return true;
  }

  function payout(amount){
    return addCredits(Math.max(0, Number(amount) || 0));
  }

  function getJackpot(){
    return readNumber(JACKPOT_KEY, JACKPOT_START);
  }

  function addJackpot(amount){
    return writeNumber(JACKPOT_KEY, getJackpot() + Math.max(0, Number(amount) || 0));
  }

  function claimJackpot(){
    var prize = getJackpot();
    writeNumber(JACKPOT_KEY, JACKPOT_START);
    payout(prize);
    return prize;
  }

  window.Play3DGameBank = {
    getCredits:getCredits,
    setCredits:setCredits,
    addCredits:addCredits,
    canAfford:canAfford,
    wager:wager,
    payout:payout,
    getJackpot:getJackpot,
    addJackpot:addJackpot,
    claimJackpot:claimJackpot,
    applyQueuedBoost:applyQueuedBoost
  };

  applyQueuedBoost();
})();