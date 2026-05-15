<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PLAY 3D — Double Deck Pinochle</title>
<link href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Oswald:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./style.css">
<link rel="stylesheet" href="../shared/mode-bar.css">
</head>
<body>
<div class="bg"></div>
<main class="app">
  <header class="top">
    <a class="brand" href="../../index.html"><span>3D</span><b>PLAY 3D</b></a>
    <nav><a href="../../index.html">Game Vault</a><a href="../../../index.html">Vault</a></nav>
  </header>

  <section class="hero">
    <div>
      <div class="kicker">LOCKED DOUBLE DECK RULES</div>
      <h1>Pinochle</h1>
      <p>4-player double-deck Pinochle. Bid or pass, trump marriage required, no card passing, tricks score until first team hits 500.</p>
    </div>
    <div class="score">
      <span>Phase</span>
      <b id="stateText">READY</b>
      <small id="turnText">YOU</small>
    </div>
  </section>

  <section class="scoreboard panel">
    <div><span>YOU / PARTNER</span><b id="scoreNS">0</b></div>
    <div><span>LEFT / RIGHT</span><b id="scoreEW">0</b></div>
    <div><span>Bid</span><b id="bidText">—</b></div>
    <div><span>Trump</span><b id="trumpText">—</b></div>
  </section>

  <section class="pinochle-table">
    <div class="table-logo">PINOCHLE</div>
    <div class="seat seat-north" id="seatNorth">PARTNER</div>
    <div class="seat seat-west" id="seatWest">LEFT</div>
    <div class="seat seat-east" id="seatEast">RIGHT</div>
    <div class="seat seat-south active" id="seatSouth">YOU</div>

    <div class="table-center">
      <h2>Current Trick</h2>
      <div id="trickArea" class="trick-area"></div>
      <div id="phaseHelp" class="phase-help">Start a hand to deal 20 cards to each player.</div>
    </div>
  </section>

  <section class="panel controls">
    <button id="newGameBtn" type="button">New Game</button>
    <button id="newHandBtn" type="button">Next Hand</button>
    <button id="bidBtn" type="button">Bid +10</button>
    <button id="passBidBtn" type="button">Pass</button>
    <select id="trumpSelect" aria-label="Trump suit">
      <option value="S">Spades ♠</option>
      <option value="H">Hearts ♥</option>
      <option value="D">Diamonds ♦</option>
      <option value="C">Clubs ♣</option>
    </select>
    <button id="setTrumpBtn" type="button">Set Trump</button>
    <button id="showMeldBtn" type="button">Start Tricks</button>
    <button id="autoBtn" type="button">Auto Play</button>
  </section>

  <section class="panel meld-panel">
    <h2>Meld Board</h2>
    <div id="meldBoard" class="meld-board"></div>
  </section>

  <section class="panel hand-panel">
    <div class="panel-head">
      <h2 id="handTitle">Your Hand</h2>
      <p id="handHint">Playable cards highlight during trick play.</p>
    </div>
    <div id="hand" class="hand"></div>
  </section>

  <section class="panel log-panel">
    <h2>Game Log</h2>
    <ul id="log"></ul>
  </section>
</main>

<script src="../shared/mode-bar.js"></script>
<script src="../shared/shared.js"></script>
<script src="../shared/supabase-game-bridge.js"></script>
<script src="./script.js"></script>
</body>
</html>
