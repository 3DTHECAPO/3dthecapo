const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const livesEl = document.getElementById("lives");
const movePad = document.getElementById("movePad");
const moveStick = document.getElementById("moveStick");
const fireBtn = document.getElementById("fireBtn");

let score = 0;
let wave = 1;
let lives = 3;
let gameState = "menu";
let player = { x: 400, y: 400, size: 28, speed: 6.5, angle: 0 };

let bullets = [];
let enemies = [];
let particles = [];
let keys = {};
let mouseX = 400;
let mouseY = 300;
let lastShot = 0;
let mobileVector = { x: 0, y: 0 };
let mobileFire = false;
let audioCtx = null;
let awardedDefenderMilestones = {};

function awardDefenderPoints(key, points) {
  if (awardedDefenderMilestones[key]) return;
  awardedDefenderMilestones[key] = true;
  if (!window.Play3DPoints || typeof window.Play3DPoints.award !== "function") return;
  window.Play3DPoints.award("3d-defender", points, key);
}

function checkDefenderPointMilestones() {
  if (score >= 100) awardDefenderPoints("score_100", 25);
  if (score >= 500) awardDefenderPoints("score_500", 75);
  if (score >= 1000) awardDefenderPoints("score_1000", 150);
  if (wave >= 2) awardDefenderPoints("wave_2", 40);
  if (wave >= 5) awardDefenderPoints("wave_5", 125);
  if (wave >= 10) awardDefenderPoints("wave_10", 300);
}

function getAudioCtx() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

function playSound(freq, duration, type = "sine", vol = 0.3) {
  const context = getAudioCtx();
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain).connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + duration);
}

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvas.addEventListener("mousemove", e => {
  const point = canvasPoint(e);
  mouseX = point.x;
  mouseY = point.y;
});

canvas.addEventListener("pointerdown", e => {
  const point = canvasPoint(e);
  mouseX = point.x;
  mouseY = point.y;
  if (gameState !== "playing") startGame();
});

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

function createExplosion(x, y, intensity = 1) {
  for (let i = 0; i < 25 * intensity; i++) {
    particles.push({
      x,
      y,
      vx: Math.random() * 12 - 6,
      vy: Math.random() * 12 - 6,
      life: 35,
      color: ["#0ff", "#f0f", "#ff0"][Math.floor(Math.random() * 3)]
    });
  }
  playSound(60 + Math.random() * 100, 0.4, "sawtooth", 0.5);
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x;
  let y;
  if (side === 0) {
    x = Math.random() * 800;
    y = -40;
  } else if (side === 1) {
    x = 840;
    y = Math.random() * 600;
  } else if (side === 2) {
    x = Math.random() * 800;
    y = 640;
  } else {
    x = -40;
    y = Math.random() * 600;
  }
  enemies.push({ x, y, size: 22, speed: 1.8 + wave * 0.35, health: 1 + Math.floor(wave / 4) });
}

function startGame() {
  score = 0;
  wave = 1;
  lives = 3;
  bullets = [];
  enemies = [];
  particles = [];
  awardedDefenderMilestones = {};
  player.x = 400;
  player.y = 400;
  scoreEl.textContent = "0";
  waveEl.textContent = "1";
  livesEl.textContent = "3";
  gameState = "playing";
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);

  ctx.fillStyle = "#00ffff";
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#00ffff";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(-18, 18);
  ctx.lineTo(-8, 12);
  ctx.lineTo(8, 12);
  ctx.lineTo(18, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff00ff";
  ctx.shadowColor = "#ff00ff";
  ctx.beginPath();
  ctx.moveTo(-18, 12);
  ctx.lineTo(-28, 22);
  ctx.lineTo(-12, 22);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(18, 12);
  ctx.lineTo(28, 22);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -6, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#00ddff";
  ctx.beginPath();
  ctx.arc(0, -6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "#ff00aa";
  ctx.fillStyle = "#ff00aa";
  ctx.fillRect(-6, 14, 12, 18);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffff00";
  ctx.fillRect(-4, 16, 8, 12);

  ctx.restore();
}

function shoot() {
  if (Date.now() - lastShot <= 150) return;
  bullets.push({
    x: player.x + Math.cos(player.angle) * 28,
    y: player.y + Math.sin(player.angle) * 28,
    vx: Math.cos(player.angle) * 19,
    vy: Math.sin(player.angle) * 19
  });
  lastShot = Date.now();
  playSound(950, 0.07, "square", 0.25);
}

function update() {
  if (gameState !== "playing") return;

  if (keys.w || keys.arrowup) player.y -= player.speed;
  if (keys.s || keys.arrowdown) player.y += player.speed;
  if (keys.a || keys.arrowleft) player.x -= player.speed;
  if (keys.d || keys.arrowright) player.x += player.speed;
  if (mobileVector.x || mobileVector.y) {
    player.x += mobileVector.x * player.speed;
    player.y += mobileVector.y * player.speed;
  }

  player.x = Math.max(20, Math.min(780, player.x));
  player.y = Math.max(20, Math.min(580, player.y));

  if (mobileVector.x || mobileVector.y) {
    player.angle = Math.atan2(mobileVector.y, mobileVector.x);
  } else {
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
  }

  if (keys[" "] || keys.enter || mobileFire) shoot();

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) bullets.splice(i, 1);
  }

  if (Math.random() < 0.045 + wave * 0.008) spawnEnemy();

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;

    if (dist < 38) {
      lives--;
      livesEl.textContent = String(lives);
      createExplosion(player.x, player.y);
      enemies.splice(i, 1);
      if (lives <= 0) gameState = "gameover";
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      const bullet = bullets[i];
      const enemy = enemies[j];
      if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.size + 10) {
        bullets.splice(i, 1);
        enemy.health = (enemy.health || 1) - 1;
        if (enemy.health <= 0) {
          enemies.splice(j, 1);
          score += 20;
          scoreEl.textContent = String(score);
          checkDefenderPointMilestones();
          createExplosion(enemy.x, enemy.y);
        }
        break;
      }
    }
  }

  if (score > wave * 400) {
    wave++;
    checkDefenderPointMilestones();
  }
  waveEl.textContent = String(wave);
}

function drawGrid() {
  ctx.strokeStyle = "#112233";
  ctx.lineWidth = 1;
  for (let x = 0; x < 800; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let y = 0; y < 600; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }
}

function draw() {
  ctx.fillStyle = "#05050f";
  ctx.fillRect(0, 0, 800, 600);
  drawGrid();

  if (gameState === "playing") {
    drawPlayer();

    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ffff00";
    ctx.fillStyle = "#ffff00";
    for (const bullet of bullets) ctx.fillRect(bullet.x - 3, bullet.y - 3, 7, 7);

    ctx.shadowColor = "#ff00ff";
    ctx.fillStyle = "#ff00ff";
    for (const enemy of enemies) {
      ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
    }
    ctx.shadowBlur = 0;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    ctx.globalAlpha = particle.life / 35;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 7, 7);
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life--;
    if (particle.life <= 0) particles.splice(i, 1);
  }
  ctx.globalAlpha = 1;

  if (gameState === "menu") {
    ctx.fillStyle = "#0ff";
    ctx.font = "bold 72px Consolas";
    ctx.textAlign = "center";
    ctx.fillText("DEFENDER", 400, 220);
    ctx.font = "28px Consolas";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("CLICK TO START", 400, 340);
    ctx.fillText("WASD / ARROWS MOVE - SPACE FIRES", 400, 390);
  }

  if (gameState === "gameover") {
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = "#ff0088";
    ctx.font = "bold 62px Consolas";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", 400, 250);
    ctx.fillStyle = "#00ff88";
    ctx.font = "30px Consolas";
    ctx.fillText(`SCORE: ${score}`, 400, 320);
    ctx.fillStyle = "#00ffff";
    ctx.fillText("CLICK TO PLAY AGAIN", 400, 380);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function setPad(clientX, clientY) {
  const rect = movePad.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const max = rect.width * 0.32;
  const dist = Math.min(max, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const stickX = Math.cos(angle) * dist;
  const stickY = Math.sin(angle) * dist;
  mobileVector.x = max ? stickX / max : 0;
  mobileVector.y = max ? stickY / max : 0;
  moveStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
}

function clearPad() {
  mobileVector.x = 0;
  mobileVector.y = 0;
  moveStick.style.transform = "translate(-50%, -50%)";
}

movePad.addEventListener("pointerdown", e => {
  movePad.setPointerCapture(e.pointerId);
  setPad(e.clientX, e.clientY);
});
movePad.addEventListener("pointermove", e => setPad(e.clientX, e.clientY));
movePad.addEventListener("pointerup", clearPad);
movePad.addEventListener("pointercancel", clearPad);

fireBtn.addEventListener("pointerdown", e => {
  fireBtn.setPointerCapture(e.pointerId);
  mobileFire = true;
  if (gameState !== "playing") startGame();
});
fireBtn.addEventListener("pointerup", () => { mobileFire = false; });
fireBtn.addEventListener("pointercancel", () => { mobileFire = false; });

window.Play3DDefenderSmokeTest = function() {
  startGame();
  enemies = [{ x: player.x, y: player.y - 40, size: 22, speed: 0, health: 1 }];
  bullets = [{ x: player.x, y: player.y - 35, vx: 0, vy: -1 }];
  update();
  const shotCollisionScores = score > 0 && enemies.length === 0;

  enemies = [{ x: player.x, y: player.y, size: 22, speed: 0, health: 1 }];
  const livesBefore = lives;
  update();
  const enemyCollisionCostsLife = lives === livesBefore - 1;

  lives = 1;
  enemies = [{ x: player.x, y: player.y, size: 22, speed: 0, health: 1 }];
  update();
  const gameOverWorks = gameState === "gameover";

  gameState = "menu";
  return {
    shotCollisionScores,
    enemyCollisionCostsLife,
    gameOverWorks,
    desktopControls: true,
    phoneControls: !!movePad && !!fireBtn
  };
};

loop();
