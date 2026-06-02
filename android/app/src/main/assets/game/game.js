function showToast(msg) {
  var el = document.getElementById('system-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'system-toast';
    el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;border:1px solid rgba(255,255,255,0.1);';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(function() { el.style.opacity = '0'; }, 3000);
}

/* ===== Car Parking — Game Engine =====
   Top-down view, navigate car into parking spot
   Arrow controls, obstacles, timer-based scoring
*/
const W = 600, H = 700;
let canvas, ctx;
let particles = null;

// ─── Game State ──────────────────────────────────────
let currentLevel = 1;
let playerCar = null;
let parkingSpot = null;
let obstacles = [];
let gameState = 'menu';
let timer = 30;
let maxTimer = 30;
let score = 0;
let collisions = 0;
let totalCollisions = 0;
let gameActive = false;
let isParked = false;
let levelTime = 0;
let keysDown = {};

// ─── Car ─────────────────────────────────────────────
const CAR_W = 40;
const CAR_H = 60;

function createCar(x, y, angle = 0) {
  return { x, y, angle, speed: 0, vx: 0, vy: 0 };
}

// ─── Level Generator ─────────────────────────────────
function generateLevel(level) {
  const bonuses = window.ProgressionSystem ? ProgressionSystem.getActiveBonuses() : {};
  const speedControl = bonuses.speedControl || 1;
  const timeBonus = bonuses.timeBonus || 0;
  
  maxTimer = Math.max(15, 40 - level * 0.5) + timeBonus;
  timer = maxTimer;
  score = 0;
  collisions = 0;
  totalCollisions = 0;
  isParked = false;
  gameActive = true;
  levelTime = 0;
  
  // Grid-based parking lot
  const gridW = Math.min(8 + Math.floor(level / 3), 12);
  const gridH = Math.min(8 + Math.floor(level / 3), 12);
  const cellSize = 50; // parking cell size
  
  // Calculate offset to center the grid
  const gridTotalW = gridW * cellSize;
  const gridTotalH = gridH * cellSize;
  const offsetX = (W - gridTotalW) / 2;
  const offsetY = (H - gridTotalH) / 2 - 30;
  
  obstacles = [];
  
  // Create parked cars as obstacles
  const numObstacles = Math.min(5 + Math.floor(level * 0.8), 20);
  const occupiedCells = new Set();
  
  // Generate a grid of available spots
  const allCells = [];
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      allCells.push({ r, c });
    }
  }
  
  // Shuffle and pick some for obstacles
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }
  
  // Place player car at a starting position
  let playerCell = allCells[0];
  occupiedCells.add(`${playerCell.r},${playerCell.c}`);
  playerCar = createCar(
    offsetX + playerCell.c * cellSize + cellSize/2,
    offsetY + playerCell.r * cellSize + cellSize/2
  );
  
  // Place parking spot (target)
  let spotCell = allCells[allCells.length - 1];
  // Make sure it's far enough
  for (const cell of allCells) {
    const dist = Math.abs(cell.r - playerCell.r) + Math.abs(cell.c - playerCell.c);
    if (dist > 3 && !occupiedCells.has(`${cell.r},${cell.c}`)) {
      spotCell = cell;
      break;
    }
  }
  occupiedCells.add(`${spotCell.r},${spotCell.c}`);
  
  parkingSpot = {
    r: spotCell.r,
    c: spotCell.c,
    x: offsetX + spotCell.c * cellSize,
    y: offsetY + spotCell.r * cellSize,
    w: cellSize,
    h: cellSize,
  };
  
  // Place obstacle cars
  const obstacleColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
  let obsPlaced = 0;
  for (const cell of allCells) {
    if (obsPlaced >= numObstacles) break;
    if (occupiedCells.has(`${cell.r},${cell.c}`)) continue;
    occupiedCells.add(`${cell.r},${cell.c}`);
    
    const isHorizontal = Math.random() > 0.5;
    obstacles.push({
      x: offsetX + cell.c * cellSize,
      y: offsetY + cell.r * cellSize,
      w: isHorizontal ? cellSize * 1.8 : cellSize,
      h: isHorizontal ? cellSize : cellSize * 1.8,
      color: obstacleColors[obsPlaced % obstacleColors.length],
      rotated: isHorizontal,
    });
    obsPlaced++;
  }
  
  // Draw grid lines info
  obstacles.gridInfo = { offsetX, offsetY, cellSize, gridW, gridH };
  
  updateUI();
}

// ─── Canvas Setup ────────────────────────────────────
function initCanvas() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  const maxW = window.innerWidth - 16;
  const maxH = window.innerHeight - 280;
  const scale = Math.min(maxW / W, maxH / H, 1);
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}

// ─── Game Logic ──────────────────────────────────────
function startLevel(level) {
  currentLevel = level;
  if (window.RetentionSystem) RetentionSystem.onGameStart();
  generateLevel(level);
  gameState = 'playing';
  keysDown = {};
  
  document.getElementById('game-over-box').classList.remove('show');
  document.getElementById('level-complete-box').classList.remove('show');
  document.getElementById('level-value').textContent = level;
  
  if (particles) particles.emitLevelUp();
}

function moveCar(dx, dy) {
  if (gameState !== 'playing' || isParked || !gameActive) return;
  if (timer <= 0) return;
  
  const bonuses = window.ProgressionSystem ? ProgressionSystem.getActiveBonuses() : {};
  const speed = 2 + (bonuses.speedControl || 1) * 0.5;
  
  const newX = playerCar.x + dx * speed;
  const newY = playerCar.y + dy * speed;
  const collisionBonus = bonuses.collisionBonus || 0;
  
  // Check bounds
  if (newX < 30 || newX > W - 30 || newY < 30 || newY > H - 30) return;
  
  // Check obstacle collisions
  let hitObstacle = false;
  for (const obs of obstacles) {
    if (rectCollide(newX - CAR_W/2, newY - CAR_H/2, CAR_W, CAR_H, obs.x, obs.y, obs.w, obs.h)) {
      hitObstacle = true;
      break;
    }
  }
  
  // Check parking spot collision
  if (parkingSpot && rectCollide(newX - CAR_W/2, newY - CAR_H/2, CAR_W, CAR_H, parkingSpot.x, parkingSpot.y, parkingSpot.w, parkingSpot.h)) {
    // Check if car is properly positioned in the spot
    const spotCenterX = parkingSpot.x + parkingSpot.w/2;
    const spotCenterY = parkingSpot.y + parkingSpot.h/2;
    const distX = Math.abs(newX - spotCenterX);
    const distY = Math.abs(newY - spotCenterY);
    
    if (distX < parkingSpot.w * 0.3 && distY < parkingSpot.h * 0.3) {
      // Successfully parked!
      isParked = true;
      playerCar.x = newX;
      playerCar.y = newY;
      gameState = 'win';
      showLevelComplete();
      return;
    }
  }
  
  if (hitObstacle) {
    collisions++;
    totalCollisions++;
    document.getElementById('collision-value').textContent = collisions;
    if (particles) particles.emit(newX, newY, '#ff6b6b', 5);
    if (collisionBonus > 0) {
      // Bonus points for collision (bumper upgrade)
      score += collisionBonus * 5;
      updateScore();
    }
    return; // Don't move into obstacle
  }
  
  playerCar.x = newX;
  playerCar.y = newY;
  
  // Update angle based on direction
  if (dx > 0) playerCar.angle = Math.PI/2;
  else if (dx < 0) playerCar.angle = -Math.PI/2;
  else if (dy > 0) playerCar.angle = Math.PI;
  else if (dy < 0) playerCar.angle = 0;
}

function rectCollide(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function update(dt) {
  if (gameState !== 'playing' || isParked || !gameActive) return;
  if (timer <= 0) return;
  
  levelTime += dt;
  
  // Count down timer
  timer -= dt;
  if (timer <= 0) {
    timer = 0;
    gameState = 'lose';
    showGameOver();
  }
  
  // Auto-movement from keyboard
  if (keysDown['ArrowUp'] || keysDown['w']) moveCar(0, -1);
  if (keysDown['ArrowDown'] || keysDown['s']) moveCar(0, 1);
  if (keysDown['ArrowLeft'] || keysDown['a']) moveCar(-1, 0);
  if (keysDown['ArrowRight'] || keysDown['d']) moveCar(1, 0);
  
  updateUI();
}

// ─── Render ──────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  
  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a2a');
  grad.addColorStop(1, '#1a1a3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  
  // Draw parking lot grid
  if (obstacles.gridInfo) {
    const g = obstacles.gridInfo;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= g.gridH; r++) {
      ctx.beginPath();
      ctx.moveTo(g.offsetX, g.offsetY + r * g.cellSize);
      ctx.lineTo(g.offsetX + g.gridW * g.cellSize, g.offsetY + r * g.cellSize);
      ctx.stroke();
    }
    for (let c = 0; c <= g.gridW; c++) {
      ctx.beginPath();
      ctx.moveTo(g.offsetX + c * g.cellSize, g.offsetY);
      ctx.lineTo(g.offsetX + c * g.cellSize, g.offsetY + g.gridH * g.cellSize);
      ctx.stroke();
    }
  }
  
  // Draw parking spot (target)
  if (parkingSpot) {
    ctx.save();
    ctx.strokeStyle = '#4cd137';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(parkingSpot.x + 2, parkingSpot.y + 2, parkingSpot.w - 4, parkingSpot.h - 4);
    ctx.setLineDash([]);
    
    // P icon
    ctx.fillStyle = 'rgba(76, 209, 55, 0.15)';
    ctx.fillRect(parkingSpot.x, parkingSpot.y, parkingSpot.w, parkingSpot.h);
    
    ctx.fillStyle = 'rgba(76, 209, 55, 0.6)';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🅿️', parkingSpot.x + parkingSpot.w/2, parkingSpot.y + parkingSpot.h/2);
    ctx.restore();
  }
  
  // Draw obstacles (parked cars)
  for (const obs of obstacles) {
    if (!obs.w) continue; // Skip grid info
    ctx.save();
    ctx.fillStyle = obs.color;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    
    // Draw car body
    ctx.beginPath();
    ctx.roundRect(obs.x + 2, obs.y + 2, obs.w - 4, obs.h - 4, 6);
    ctx.fill();
    
    // Windshield
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    if (obs.rotated) {
      ctx.fillRect(obs.x + obs.w * 0.1, obs.y + 4, obs.w * 0.8, 8);
      ctx.fillRect(obs.x + obs.w * 0.1, obs.y + obs.h - 12, obs.w * 0.8, 8);
    } else {
      ctx.fillRect(obs.x + 4, obs.y + obs.h * 0.1, 8, obs.h * 0.8);
      ctx.fillRect(obs.x + obs.w - 12, obs.y + obs.h * 0.1, 8, obs.h * 0.8);
    }
    
    // Lights
    ctx.fillStyle = '#ffd700';
    if (obs.rotated) {
      ctx.fillRect(obs.x + 4, obs.y + 4, 8, 6);
      ctx.fillRect(obs.x + obs.w - 12, obs.y + 4, 8, 6);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(obs.x + 4, obs.y + obs.h - 10, 8, 6);
      ctx.fillRect(obs.x + obs.w - 12, obs.y + obs.h - 10, 8, 6);
    } else {
      ctx.fillRect(obs.x + 4, obs.y + 4, 6, 8);
      ctx.fillRect(obs.x + 4, obs.y + obs.h - 12, 6, 8);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(obs.x + obs.w - 10, obs.y + 4, 6, 8);
      ctx.fillRect(obs.x + obs.w - 10, obs.y + obs.h - 12, 6, 8);
    }
    
    ctx.restore();
  }
  
  // Draw player car
  if (playerCar) {
    ctx.save();
    ctx.translate(playerCar.x, playerCar.y);
    ctx.rotate(playerCar.angle);
    
    const state = window.ProgressionSystem?.getState();
    const carColorMap = {
      red: '#e74c3c', blue: '#3498db', green: '#2ecc71', black: '#2d3436',
      white: '#dfe6e9', yellow: '#f1c40f', purple: '#9b59b6', cyan: '#00cec9'
    };
    const carColorId = state?.activeCarColor || 'red';
    const color = carColorMap[carColorId] || '#e74c3c';
    
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;
    
    // Car body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-CAR_W/2, -CAR_H/2, CAR_W, CAR_H, 8);
    ctx.fill();
    
    // Windshield
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.roundRect(-CAR_W/2 + 6, -CAR_H/2 + 8, CAR_W - 12, 16, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-CAR_W/2 + 6, CAR_H/2 - 24, CAR_W - 12, 16, 4);
    ctx.fill();
    
    // Windows
    ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(-CAR_W/2 + 8, -CAR_H/2 + 10, (CAR_W-16)/3, 12, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-CAR_W/2 + 8 + (CAR_W-16)/3 + 4, -CAR_H/2 + 10, (CAR_W-16)/3, 12, 3);
    ctx.fill();
    
    // Headlights
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(-CAR_W/2 + 8, -CAR_H/2 + 5, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CAR_W/2 - 8, -CAR_H/2 + 5, 4, 0, Math.PI*2);
    ctx.fill();
    
    // Taillights
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.arc(-CAR_W/2 + 8, CAR_H/2 - 5, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CAR_W/2 - 8, CAR_H/2 - 5, 4, 0, Math.PI*2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.restore();
    
    // Arrow indicator showing direction to parking spot
    if (parkingSpot && !isParked && gameState === 'playing') {
      const sx = parkingSpot.x + parkingSpot.w/2;
      const sy = parkingSpot.y + parkingSpot.h/2;
      ctx.save();
      ctx.strokeStyle = 'rgba(76, 209, 55, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(playerCar.x, playerCar.y);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
  
  // Particles
  if (particles) { particles.update(); particles.draw(ctx); }
}

// ─── UI ──────────────────────────────────────────────
function updateUI() {
  document.getElementById('timer-value').textContent = Math.ceil(Math.max(0, timer));
  document.getElementById('level-value').textContent = currentLevel;
  document.getElementById('collision-value').textContent = collisions;
  
  // Timer color based on remaining time
  const timerEl = document.getElementById('timer-value');
  if (timer <= 10) timerEl.style.color = '#ff6b6b';
  else if (timer <= 20) timerEl.style.color = '#f39c12';
  else timerEl.style.color = 'var(--accent-red)';
}

function updateScore() {
  document.getElementById('score-value').textContent = score;
}

function updateHUD() {
  if (!window.ProgressionSystem) return;
  const state = ProgressionSystem.getState();
  const coins = document.getElementById('hud-coins');
  const gems = document.getElementById('hud-gems');
  if (coins) coins.textContent = state.coins;
  if (gems) gems.textContent = state.gems;
}

function showLevelComplete() {
  document.getElementById('game-over-box').classList.remove('show');
  
  const bonuses = window.ProgressionSystem ? ProgressionSystem.getActiveBonuses() : {};
  const collisionBonus = bonuses.collisionBonus || 0;
  
  // Calculate score based on time and precision
  const timeScore = Math.floor((timer / maxTimer) * 100);
  const collisionPenalty = Math.max(0, (collisions - collisionBonus) * 20);
  score = Math.max(0, timeScore - collisionPenalty + 50);
  
  // Rating (stars)
  let rating = 5;
  if (collisions > 0) rating -= collisions;
  if (timer < maxTimer * 0.3) rating -= 1;
  rating = Math.max(1, Math.min(5, rating));
  
  const ratingStars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  document.getElementById('rating-text').textContent = ratingStars;
  document.getElementById('complete-score').textContent = 'Score: ' + score;
  document.getElementById('level-complete-box').classList.add('show');
  
  const coinReward = Math.floor(score * 0.5);
  document.getElementById('reward-display').textContent = '+' + coinReward + ' 🪙';
  
  if (window.ProgressionSystem) {
    ProgressionSystem.endOfGame({
      won: true,
      level: currentLevel,
      score: score,
      perfect: collisions === 0,
      fast: timer / maxTimer > 0.7,
      parallel: currentLevel >= 15,
    });
    ProgressionSystem.addCoins(coinReward);
    const unlocked = ProgressionSystem.checkAchievements();
    updateHUD();
  }
  // New system hooks
  if (window.RetentionSystem) RetentionSystem.onGameEnd(score);
  if (window.ChallengesSystem) {
    ChallengesSystem.reportProgress('score', score);
    ChallengesSystem.reportProgress('games', 1);
    if (collisions === 0) ChallengesSystem.reportProgress('perfect', 1);
  }
  if (window.AdsManager) AdsManager.tryShowInterstitial();
  
  if (particles) particles.emitReward(playerCar.x, playerCar.y);
}

function showGameOver() {
  document.getElementById('game-over-box').classList.add('show');
  if (window.ProgressionSystem) {
    ProgressionSystem.endOfGame({ won: false, level: currentLevel, score: 0, perfect: false, fast: false, parallel: false });
    ProgressionSystem.checkAchievements();
  }
  // New system hooks
  if (window.RetentionSystem) RetentionSystem.onGameEnd(0);
  if (window.ChallengesSystem) ChallengesSystem.reportProgress('games', 1);
  if (window.AdsManager) AdsManager.tryShowInterstitial();
}

function showNotification(msg) {
  const el = document.getElementById('notification');
  if (el) { el.textContent = msg; el.className = 'show'; clearTimeout(el._timeout); el._timeout = setTimeout(() => el.className = '', 2500); }
}

// ─── Controls ────────────────────────────────────────
function initControls() {
  // Button controls
  const buttons = [
    { id: 'btn-up', dx: 0, dy: -1 },
    { id: 'btn-down', dx: 0, dy: 1 },
    { id: 'btn-left', dx: -1, dy: 0 },
    { id: 'btn-right', dx: 1, dy: 0 },
  ];
  
  for (const btn of buttons) {
    const el = document.getElementById(btn.id);
    if (!el) continue;
    
    const moveFn = () => moveCar(btn.dx, btn.dy);
    
    // Click/tap
    el.addEventListener('mousedown', (e) => { e.preventDefault(); moveFn(); });
    el.addEventListener('touchstart', (e) => { e.preventDefault(); moveFn(); }, { passive: false });
    
    // Hold to repeat
    let holdInterval = null;
    el.addEventListener('mousedown', () => { holdInterval = setInterval(moveFn, 150); });
    el.addEventListener('mouseup', () => { if (holdInterval) clearInterval(holdInterval); holdInterval = null; });
    el.addEventListener('mouseleave', () => { if (holdInterval) clearInterval(holdInterval); holdInterval = null; });
    el.addEventListener('touchstart', () => { holdInterval = setInterval(moveFn, 150); }, { passive: false });
    el.addEventListener('touchend', () => { if (holdInterval) clearInterval(holdInterval); holdInterval = null; });
    el.addEventListener('touchcancel', () => { if (holdInterval) clearInterval(holdInterval); holdInterval = null; });
  }
  
  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    keysDown[e.key] = true;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (!isParked && gameState === 'playing') {
        if (e.key === 'ArrowUp') moveCar(0, -1);
        else if (e.key === 'ArrowDown') moveCar(0, 1);
        else if (e.key === 'ArrowLeft') moveCar(-1, 0);
        else if (e.key === 'ArrowRight') moveCar(1, 0);
      }
    }
  });
  document.addEventListener('keyup', (e) => { keysDown[e.key] = false; });
}

// ─── Game Loop ───────────────────────────────────────
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  
  update(dt);
  render();
  
  requestAnimationFrame(gameLoop);
}

// ─── Init ────────────────────────────────────────────
function init() {
  initCanvas();
  initControls();
  
  particles = new ParticleSystem();
  
  if (window.ProgressionSystem) {
    ProgressionSystem.load();
    const state = ProgressionSystem.getState();
    currentLevel = Math.min(state.highestLevel, 30);
    updateHUD();
    setInterval(updateHUD, 3000);
  }

  // Initialize new systems
  if (window.AdsManager) AdsManager.init();
  if (window.ChallengesSystem) ChallengesSystem.init();
  if (window.StoreRotator) StoreRotator.init();
  if (window.RetentionSystem) RetentionSystem.init();
  if (window.CollectiblesSystem) CollectiblesSystem.init();
  if (window.TutorialSystem) {
    TutorialSystem.init({ gameTitle: 'Car Parking' });
    if (TutorialSystem.shouldShow()) setTimeout(() => TutorialSystem.start(), 500);
  }
  
  // UI Buttons
  document.getElementById('play-btn')?.addEventListener('click', () => startLevel(currentLevel));
  document.getElementById('restart-btn')?.addEventListener('click', () => startLevel(currentLevel));
  document.getElementById('next-level-btn')?.addEventListener('click', () => {
    currentLevel = Math.min(currentLevel + 1, 30);
    startLevel(currentLevel);
  });
  document.getElementById('shop-btn')?.addEventListener('click', () => {
    if (window.ShopUI) ShopUI.open();
  });
  
  startLevel(currentLevel);
  gameLoop(performance.now());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
