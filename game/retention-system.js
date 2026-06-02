/* ===== Retention System =====
   Daily login rewards, leaderboards (local), offline earnings, stats tracking
   Works with existing progression.js for rewards
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = 'retention_system';

  // ─── Default Login Rewards (7-day cycle) ──────────
  const DEFAULT_LOGIN_REWARDS = [
    { day: 1,  reward: { coins: 100, gems: 0 },  icon: '🪙', label: '100 Coins' },
    { day: 2,  reward: { coins: 0,   gems: 5 },  icon: '💎', label: '5 Gems' },
    { day: 3,  reward: { coins: 200, gems: 0 },  icon: '🪙', label: '200 Coins' },
    { day: 4,  reward: { coins: 0,   gems: 10 }, icon: '💎', label: '10 Gems' },
    { day: 5,  reward: { coins: 500, gems: 0 },  icon: '🎁', label: '500 Coins' },
    { day: 6,  reward: { coins: 0,   gems: 15 }, icon: '💎', label: '15 Gems' },
    { day: 7,  reward: { coins: 1000, gems: 25 }, icon: '👑', label: '1,000 Coins + 25 Gems' },
  ];

  const DAY_MS = 24 * 60 * 60 * 1000;

  // ─── State ─────────────────────────────────────────
  let config = {
    loginRewards: [],
    offlineEarningRate: 10,   // coins per minute offline
    offlineMaxHours: 12,       // max offline earnings
  };

  let state = {
    // Login streak
    loginStreak: 0,
    lastLoginDate: null,
    claimedDays: [],          // which days in current cycle claimed
    currentCycleDay: 1,       // day in 7-day cycle (1-7)

    // Leaderboard (local)
    leaderboard: [],          // [{ name, score, date }]

    // Offline tracking
    lastPlayTime: null,

    // Stats
    totalGamesPlayed: 0,
    totalPlayTimeMs: 0,
    highestScore: 0,
    level: 1,
  };

  let isInitialized = false;

  // ─── Init ──────────────────────────────────────────
  function init(overrides) {
    if (overrides && overrides.loginRewards) config.loginRewards = overrides.loginRewards;
    if (overrides && overrides.offlineEarningRate) config.offlineEarningRate = overrides.offlineEarningRate;
    if (overrides && overrides.offlineMaxHours) config.offlineMaxHours = overrides.offlineMaxHours;
    if (config.loginRewards.length === 0) config.loginRewards = DEFAULT_LOGIN_REWARDS;

    loadState();
    checkLogin();
    isInitialized = true;
  }

  // ─── Persistence ───────────────────────────────────
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = Object.assign(state, JSON.parse(saved));
    } catch(e) {}
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // ─── Daily Login Check ─────────────────────────────
  function checkLogin() {
    const today = new Date().toDateString();

    // First time ever
    if (!state.lastLoginDate) {
      state.loginStreak = 1;
      state.lastLoginDate = today;
      state.currentCycleDay = 1;
      state.claimedDays = [];
      saveState();
      return { isNewDay: true, streak: 1, hasReward: true, reward: config.loginRewards[0] };
    }

    if (state.lastLoginDate === today) {
      // Already logged in today
      return { isNewDay: false, streak: state.loginStreak, hasReward: false };
    }

    // New day
    const yesterday = new Date(Date.now() - DAY_MS).toDateString();
    if (state.lastLoginDate === yesterday) {
      // Consecutive day — continue streak
      state.loginStreak++;
    } else {
      // Missed a day — reset streak
      state.loginStreak = 1;
      state.currentCycleDay = 1;
      state.claimedDays = [];
    }

    state.lastLoginDate = today;

    // Calculate cycle day
    // Cycle day = (streak - 1) % 7 + 1, but respect claim status
    state.currentCycleDay = ((state.loginStreak - 1) % 7) + 1;

    const reward = config.loginRewards[state.currentCycleDay - 1];
    const hasReward = reward && !state.claimedDays.includes(state.currentCycleDay);

    // Auto-claim if reward exists
    if (hasReward) {
      state.claimedDays.push(state.currentCycleDay);
      if (global.ProgressionSystem) {
        if (reward.reward.coins) global.ProgressionSystem.addCoins(reward.reward.coins);
        if (reward.reward.gems) global.ProgressionSystem.addGems(reward.reward.gems);
      }
    }

    saveState();
    return { isNewDay: true, streak: state.loginStreak, hasReward, reward };
  }

  // ─── Offline Earnings ──────────────────────────────
  function getOfflineEarnings() {
    if (!state.lastPlayTime) return 0;

    const now = Date.now();
    const elapsedMs = now - state.lastPlayTime;
    const elapsedMin = Math.min(elapsedMs / 60000, config.offlineMaxHours * 60);

    if (elapsedMin < 1) return 0;

    const earnings = Math.floor(elapsedMin * config.offlineEarningRate);
    return earnings;
  }

  function claimOfflineEarnings() {
    const earnings = getOfflineEarnings();
    if (earnings > 0 && global.ProgressionSystem) {
      global.ProgressionSystem.addCoins(earnings);
    }
    return earnings;
  }

  function onGameStart() {
    state.lastPlayTime = Date.now();
    state.totalGamesPlayed++;
    saveState();
  }

  function onGameEnd(score) {
    // Update highest score
    if (score > state.highestScore) state.highestScore = score;
    if (state.lastPlayTime) {
      state.totalPlayTimeMs += Date.now() - state.lastPlayTime;
    }
    saveState();
  }

  // ─── Local Leaderboard ─────────────────────────────
  function submitScore(name, score) {
    state.leaderboard.push({
      name: name || 'Player',
      score: score,
      date: new Date().toISOString(),
    });
    state.leaderboard.sort((a, b) => b.score - a.score);
    // Keep top 100
    if (state.leaderboard.length > 100) state.leaderboard = state.leaderboard.slice(0, 100);
    saveState();

    // Check if it's a new personal best
    return score >= state.highestScore;
  }

  function getLeaderboard(limit) {
    return state.leaderboard.slice(0, limit || 10);
  }

  function clearLeaderboard() {
    state.leaderboard = [];
    saveState();
  }

  // ─── UI ────────────────────────────────────────────
  function showLoginRewardsModal() {
    const today = new Date().toDateString();
    const streakDay = state.currentCycleDay;

    let html = '<div class="login-rewards-modal" style="text-align:center;">';
    html += '<h3 style="margin:0 0 6px;color:var(--accent-gold);">📅 Daily Login</h3>';
    html += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">';
    html += '🔥 ' + state.loginStreak + '-day streak!';
    if (state.loginStreak >= 7) html += ' — Unstoppable! 🏆';
    html += '</div>';

    html += '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-bottom:12px;">';
    config.loginRewards.forEach((r, i) => {
      const day = i + 1;
      const claimed = state.claimedDays.includes(day);
      const isToday = day === streakDay && state.lastLoginDate === today;
      const locked = !isToday && !claimed && day > streakDay;

      html += '<div style="width:50px;padding:6px 4px;border-radius:8px;text-align:center;' +
        (claimed ? 'background:rgba(76,175,80,0.15);border:1px solid rgba(76,175,80,0.3);' :
         isToday ? 'background:rgba(255,193,7,0.15);border:1px solid var(--accent-gold);' :
         'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);') + '">' +
        '<div style="font-size:20px;">' + (claimed ? '✅' : locked ? '🔒' : r.icon) + '</div>' +
        '<div style="font-size:9px;color:var(--text-secondary);margin-top:2px;">' + r.label + '</div>' +
        (isToday && !claimed ? '<div style="font-size:8px;color:var(--accent-gold);margin-top:1px;">TODAY</div>' : '') +
      '</div>';
    });
    html += '</div>';

    // Offline earnings
    const offlineEarnings = getOfflineEarnings();
    if (offlineEarnings > 0) {
      html += '<div style="padding:8px;background:rgba(76,175,80,0.08);border-radius:8px;margin-bottom:8px;font-size:13px;">';
      html += '⏰ While you were away: <strong style="color:var(--accent-gold);">+' + offlineEarnings + ' 🪙</strong>';
      html += '<button class="game-btn btn-small" style="margin:6px auto 0;display:block;padding:4px 14px;font-size:12px;" onclick="RetentionSystem.claimOfflineEarnings();showToast(\'Offline earnings claimed! +' + offlineEarnings + ' 🪙\');this.closest(\'div\').style.display=\'none\';">Claim</button>';
      html += '</div>';
    }

    // Stats
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:11px;color:var(--text-secondary);margin-top:8px;">';
    html += '<div style="padding:6px;background:rgba(255,255,255,0.03);border-radius:6px;">🎮 ' + state.totalGamesPlayed + ' games</div>';
    html += '<div style="padding:6px;background:rgba(255,255,255,0.03);border-radius:6px;">🏆 ' + state.highestScore + ' high</div>';
    html += '<div style="padding:6px;background:rgba(255,255,255,0.03);border-radius:6px;">⭐ Lv ' + state.level + '</div>';
    html += '</div>';

    html += '</div>';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box" style="min-width:300px;">' + html +
      '<button class="game-btn btn-restart" style="margin:14px auto 0;display:block;" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  function showLeaderboardModal() {
    const entries = getLeaderboard(20);
    let html = '<h3 style="margin:0 0 10px;text-align:center;color:var(--accent-gold);">🏆 Leaderboard</h3>';

    if (entries.length === 0) {
      html += '<p style="text-align:center;color:var(--text-secondary);font-size:14px;">No scores yet. Play a game to get on the board!</p>';
    } else {
      html += '<div style="max-height:400px;overflow-y:auto;">';
      entries.forEach((e, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        html += '<div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,0.03);">' +
          '<span style="font-size:18px;width:28px;text-align:center;">' + medal + '</span>' +
          '<span style="flex:1;font-size:13px;font-weight:600;">' + (e.name || 'Player') + '</span>' +
          '<span style="font-size:14px;font-weight:700;color:var(--accent-gold);">' + e.score.toLocaleString() + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box" style="min-width:300px;">' + html +
      '<button class="game-btn btn-restart" style="margin:14px auto 0;display:block;" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── Toast ─────────────────────────────────────────
  function showToast(msg) {
    if (global.showToast) { global.showToast(msg); return; }
    let el = document.getElementById('retention-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'retention-toast';
      el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  // ─── Public API ────────────────────────────────────
  const RetentionSystem = {
    init,
    checkLogin,
    getOfflineEarnings,
    claimOfflineEarnings,
    onGameStart,
    onGameEnd,
    submitScore,
    getLeaderboard,
    clearLeaderboard,
    showLoginRewardsModal,
    showLeaderboardModal,
    getState: () => ({ ...state }),
    getConfig: () => ({ ...config }),
    isInitialized: () => isInitialized,
  };

  global.RetentionSystem = RetentionSystem;
})(typeof window !== 'undefined' ? window : this);
