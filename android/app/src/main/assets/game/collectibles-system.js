/* ===== Collectibles System =====
   Badges, titles, cards, skin collections
   Players collect items by completing achievements, streaks, milestones
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = 'collectibles_system';

  // ─── Default Collections ───────────────────────────
  const DEFAULT_BADGES = [
    { id: 'badge_first_win',       name: 'First Victory',        desc: 'Win your first game',             icon: '🎖️',    tier: 'bronze',  requirement: 'win_1',     reward: { coins: 100 } },
    { id: 'badge_streak_7',        name: 'Weekly Warrior',      desc: '7-day login streak',              icon: '🔥',     tier: 'silver',  requirement: 'streak_7',  reward: { gems: 10 } },
    { id: 'badge_streak_30',       name: 'Monthly Legend',      desc: '30-day login streak',             icon: '💫',     tier: 'gold',    requirement: 'streak_30', reward: { gems: 50 } },
    { id: 'badge_score_10k',       name: '10K Club',            desc: 'Score 10,000 in one game',        icon: '🏆',     tier: 'silver',  requirement: 'score_10k', reward: { coins: 1000 } },
    { id: 'badge_score_100k',      name: 'Centurion',           desc: 'Score 100,000 in one game',       icon: '👑',     tier: 'gold',    requirement: 'score_100k', reward: { gems: 30 } },
    { id: 'badge_games_100',       name: 'Dedicated',           desc: 'Play 100 games',                  icon: '🎮',     tier: 'bronze',  requirement: 'games_100', reward: { coins: 500 } },
    { id: 'badge_games_1000',      name: 'Game Master',         desc: 'Play 1,000 games',                icon: '🎯',     tier: 'gold',    requirement: 'games_1000', reward: { gems: 100 } },
    { id: 'badge_perfect_10',      name: 'Perfectionist',       desc: 'Get 10 perfect games',            icon: '💎',     tier: 'silver',  requirement: 'perfect_10', reward: { gems: 25 } },
    { id: 'badge_collector',       name: 'Collector',           desc: 'Collect 5 badges',                icon: '📦',     tier: 'bronze',  requirement: 'badges_5',  reward: { coins: 200 } },
    { id: 'badge_collector_gold',  name: 'Master Collector',    desc: 'Collect all badges',              icon: '🏅',     tier: 'legendary', requirement: 'badges_all', reward: { gems: 200, coins: 5000 } },
    { id: 'badge_combo_5',         name: 'Combo King',          desc: 'Reach 5x combo',                  icon: '🔥',     tier: 'bronze',  requirement: 'combo_5',   reward: { coins: 300 } },
    { id: 'badge_combo_10',        name: 'Unstoppable',         desc: 'Reach 10x combo',                 icon: '💥',     tier: 'silver',  requirement: 'combo_10',  reward: { gems: 15 } },
    { id: 'badge_upgrade_all',     name: 'Fully Equipped',      desc: 'Max all upgrades to level 5',     icon: '⚡',     tier: 'gold',    requirement: 'upgrade_all', reward: { gems: 50 } },
    { id: 'badge_vip',             name: 'VIP Supporter',       desc: 'Purchase any item in the store',  icon: '⭐',     tier: 'gold',    requirement: 'purchase_1', reward: { gems: 20 } },
    { id: 'badge_legend',          name: 'True Legend',         desc: 'Reach player level 100',           icon: '👑',     tier: 'legendary', requirement: 'level_100', reward: { gems: 500 } },
  ];

  const DEFAULT_TITLES = [
    { id: 'title_newbie',       name: 'Newbie',            desc: 'Play your first game',              icon: '🌱', tier: 'common',    requirement: 'play_1' },
    { id: 'title_gamer',        name: 'Gamer',             desc: 'Play 50 games',                     icon: '🎮', tier: 'common',    requirement: 'play_50' },
    { id: 'title_pro',          name: 'Pro Player',        desc: 'Play 500 games',                    icon: '⭐', tier: 'rare',     requirement: 'play_500' },
    { id: 'title_elite',        name: 'Elite',             desc: 'Play 2,000 games',                  icon: '💫', tier: 'epic',     requirement: 'play_2000' },
    { id: 'title_legend',       name: 'Legend',            desc: 'Play 10,000 games',                 icon: '👑', tier: 'legendary', requirement: 'play_10000' },
    { id: 'title_streaker',     name: 'Streak Master',     desc: '7-day login streak',                icon: '🔥', tier: 'rare',     requirement: 'streak_7' },
    { id: 'title_scorer',       name: 'High Scorer',       desc: 'Score 50,000 in one game',          icon: '🏆', tier: 'epic',     requirement: 'score_50k' },
    { id: 'title_collector',    name: 'Collector',         desc: 'Collect 10 badges',                 icon: '📦', tier: 'rare',     requirement: 'badges_10' },
    { id: 'title_combo',        name: 'Combo God',         desc: 'Reach 15x combo',                   icon: '💥', tier: 'epic',     requirement: 'combo_15' },
    { id: 'title_perfect',      name: 'Perfect',           desc: 'Get 50 perfect games',              icon: '💎', tier: 'legendary', requirement: 'perfect_50' },
  ];

  // ─── State ─────────────────────────────────────────
  let config = {
    badges: [],
    titles: [],
  };

  let state = {
    unlockedBadges: [],    // [{ id, unlockedAt }]
    unlockedTitles: [],    // [{ id, unlockedAt }]
    activeTitle: null,     // id of currently equipped title
    trackers: {
      wins: 0,
      streak: 0,
      highestScore: 0,
      totalGames: 0,
      perfectGames: 0,
      maxCombo: 0,
      upgradesMaxed: false,
      totalBadges: 0,
      madePurchase: false,
      playerLevel: 1,
    },
  };

  let isInitialized = false;

  // ─── Init ──────────────────────────────────────────
  function init(overrides) {
    if (overrides) {
      if (overrides.badges) config.badges = overrides.badges;
      if (overrides.titles) config.titles = overrides.titles;
    }
    if (config.badges.length === 0) config.badges = DEFAULT_BADGES;
    if (config.titles.length === 0) config.titles = DEFAULT_TITLES;

    loadState();
    isInitialized = true;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = Object.assign(state, JSON.parse(saved));
    } catch(e) {}
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // ─── Update Trackers ───────────────────────────────
  function updateTracker(key, value) {
    if (tracker in state && state.trackers[key] < value) {
      state.trackers[key] = value;
    }
    // For counter types (wins, totalGames, etc), increment
    if (typeof value === 'number' && key !== 'highestScore' && key !== 'maxCombo' && key !== 'playerLevel') {
      // These are set directly, not incremented
    }
    checkUnlocks();
    saveState();
  }

  function incrementTracker(key, amount) {
    if (state.trackers[key] !== undefined) {
      state.trackers[key] += (amount || 1);
    }
    checkUnlocks();
    saveState();
  }

  function setTracker(key, value) {
    if (state.trackers[key] !== undefined) {
      if (typeof value === 'number' && value > state.trackers[key]) {
        state.trackers[key] = value;
      } else if (typeof value !== 'number') {
        state.trackers[key] = value;
      }
    }
    checkUnlocks();
    saveState();
  }

  // ─── Check & Unlock ────────────────────────────────
  function checkUnlocks() {
    const t = state.trackers;
    const unlockedIds = new Set(state.unlockedBadges.map(b => b.id));
    let newUnlocks = [];

    // Check badges
    config.badges.forEach(badge => {
      if (unlockedIds.has(badge.id)) return;
      if (checkRequirement(badge.requirement, t)) {
        state.unlockedBadges.push({ id: badge.id, unlockedAt: Date.now() });
        newUnlocks.push({ type: 'badge', item: badge });
        // Grant reward
        if (badge.reward && global.ProgressionSystem) {
          if (badge.reward.coins) global.ProgressionSystem.addCoins(badge.reward.coins);
          if (badge.reward.gems) global.ProgressionSystem.addGems(badge.reward.gems);
        }
      }
    });

    state.trackers.totalBadges = state.unlockedBadges.length;

    // Check titles
    const unlockedTitleIds = new Set(state.unlockedTitles.map(t => t.id));
    config.titles.forEach(title => {
      if (unlockedTitleIds.has(title.id)) return;
      if (checkRequirement(title.requirement, t)) {
        state.unlockedTitles.push({ id: title.id, unlockedAt: Date.now() });
        newUnlocks.push({ type: 'title', item: title });
      }
    });

    // Show notification for new unlocks
    newUnlocks.forEach(n => {
      const msg = n.type === 'badge'
        ? '🏅 Badge unlocked: ' + n.item.name + '!'
        : '📜 Title unlocked: ' + n.item.name + '!';
      showToast(msg);
      // Popup
      showUnlockPopup(n);
    });

    saveState();
    return newUnlocks;
  }

  function checkRequirement(req, t) {
    const map = {
      'win_1':        () => t.wins >= 1,
      'streak_7':     () => t.streak >= 7,
      'streak_30':    () => t.streak >= 30,
      'score_10k':    () => t.highestScore >= 10000,
      'score_100k':   () => t.highestScore >= 100000,
      'games_100':    () => t.totalGames >= 100,
      'games_1000':   () => t.totalGames >= 1000,
      'perfect_10':   () => t.perfectGames >= 10,
      'badges_5':     () => t.totalBadges >= 5,
      'badges_all':   () => state.unlockedBadges.length >= config.badges.length,
      'badges_10':    () => t.totalBadges >= 10,
      'combo_5':      () => t.maxCombo >= 5,
      'combo_10':     () => t.maxCombo >= 10,
      'combo_15':     () => t.maxCombo >= 15,
      'upgrade_all':  () => t.upgradesMaxed,
      'purchase_1':   () => t.madePurchase,
      'level_100':    () => t.playerLevel >= 100,
      'play_1':       () => t.totalGames >= 1,
      'play_50':      () => t.totalGames >= 50,
      'play_500':     () => t.totalGames >= 500,
      'play_2000':    () => t.totalGames >= 2000,
      'play_10000':   () => t.totalGames >= 10000,
      'score_50k':    () => t.highestScore >= 50000,
      'perfect_50':   () => t.perfectGames >= 50,
    };
    return (map[req] && map[req]()) || false;
  }

  // ─── Set Active Title ──────────────────────────────
  function setActiveTitle(titleId) {
    const has = state.unlockedTitles.find(t => t.id === titleId);
    if (has) {
      state.activeTitle = titleId;
      saveState();
      return true;
    }
    return false;
  }

  function getActiveTitle() {
    if (!state.activeTitle) return null;
    return config.titles.find(t => t.id === state.activeTitle) || null;
  }

  // ─── UI ────────────────────────────────────────────
  function showCollectiblesModal() {
    let html = '<div class="collectibles-modal">';
    html += '<h3 style="margin:0 0 12px;text-align:center;color:var(--accent-gold);">🏅 Collections</h3>';

    // Badges
    html += '<h4 style="margin:0 0 8px;font-size:14px;color:var(--accent-blue);">🏅 Badges (' + state.unlockedBadges.length + '/' + config.badges.length + ')</h4>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px;margin-bottom:16px;">';
    config.badges.forEach(b => {
      const unlocked = state.unlockedBadges.find(u => u.id === b.id);
      const tierColors = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', legendary: '#ff4500', common: '#a0a0a0', rare: '#4a9eff', epic: '#9b59b6' };
      const color = tierColors[b.tier] || '#a0a0a0';
      html += '<div style="text-align:center;padding:8px 4px;border-radius:8px;background:' + (unlocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)') + ';border:1px solid ' + (unlocked ? color : 'rgba(255,255,255,0.1)') + ';' + (unlocked ? '' : 'opacity:0.4;') + '">' +
        '<div style="font-size:24px;">' + (unlocked ? b.icon : '❓') + '</div>' +
        '<div style="font-size:10px;margin-top:3px;font-weight:600;">' + (unlocked ? b.name : '???') + '</div>' +
        '<div style="font-size:8px;color:var(--text-secondary);margin-top:1px;">' + (unlocked ? b.desc : b.tier) + '</div>' +
      '</div>';
    });
    html += '</div>';

    // Titles
    html += '<h4 style="margin:0 0 8px;font-size:14px;color:var(--accent-purple);">📜 Titles (' + state.unlockedTitles.length + '/' + config.titles.length + ')</h4>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-bottom:8px;">';
    config.titles.forEach(t => {
      const unlocked = state.unlockedTitles.find(u => u.id === t.id);
      const isActive = state.activeTitle === t.id;
      html += '<div style="padding:6px 8px;border-radius:8px;background:' + (unlocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)') + ';border:1px solid ' + (isActive ? 'var(--accent-gold)' : unlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)') + ';' + (unlocked ? 'cursor:pointer;' : 'opacity:0.3;') + '" onclick="' + (unlocked ? 'CollectiblesSystem.setActiveTitle(\'' + t.id + '\');showToast(\'Title set to: ' + t.name + '\');this.closest(\'.collectibles-modal\').querySelectorAll(\'div\').forEach(e=>e.style.borderColor=\'\');this.style.borderColor=\'var(--accent-gold)\';' : '') + '">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="font-size:16px;">' + (unlocked ? t.icon : '🔒') + '</span>' +
          '<span style="font-size:12px;font-weight:600;">' + (unlocked ? t.name : '???') + '</span>' +
          (isActive ? '<span style="font-size:10px;background:var(--accent-gold);color:#000;padding:1px 6px;border-radius:4px;font-weight:700;">ACTIVE</span>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';

    html += '</div>';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box" style="min-width:320px;max-height:80vh;overflow-y:auto;">' + html +
      '<button class="game-btn btn-restart" style="margin:14px auto 0;display:block;" onclick="this.closest(\'.modal-overlay\').remove()">Close</button></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── Unlock Popup ──────────────────────────────────
  function showUnlockPopup(data) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.animation = 'fadeIn 0.3s';
    overlay.innerHTML = '<div class="modal-box" style="min-width:280px;text-align:center;animation:popIn 0.4s;">' +
      '<div style="font-size:48px;margin-bottom:8px;">' + (data.type === 'badge' ? '🏅' : '📜') + '</div>' +
      '<h3 style="margin:0 0 4px;color:var(--accent-gold);">New ' + (data.type === 'badge' ? 'Badge' : 'Title') + ' Unlocked!</h3>' +
      '<div style="font-size:22px;font-weight:700;margin:8px 0;">' + data.item.icon + ' ' + data.item.name + '</div>' +
      '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">' + data.item.desc + '</div>' +
      (data.item.reward ? '<div style="font-size:13px;color:var(--accent-gold);">Reward: +' + (data.item.reward.coins || 0) + '🪙 +' + (data.item.reward.gems || 0) + '💎</div>' : '') +
      '<button class="game-btn btn-restart" style="margin:14px auto 0;display:block;" onclick="this.closest(\'.modal-overlay\').remove()">Awesome!</button>' +
    '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── Toast ─────────────────────────────────────────
  function showToast(msg) {
    if (global.showToast) { global.showToast(msg); return; }
    let el = document.getElementById('collect-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'collect-toast';
      el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  // ─── Public API ────────────────────────────────────
  const CollectiblesSystem = {
    init,
    incrementTracker,
    setTracker,
    updateTracker: setTracker,
    setActiveTitle,
    getActiveTitle,
    showCollectiblesModal,
    checkUnlocks,
    getState: () => ({
      unlockedBadges: [...state.unlockedBadges],
      unlockedTitles: [...state.unlockedTitles],
      activeTitle: state.activeTitle,
      trackers: { ...state.trackers },
    }),
    getConfig: () => ({
      badges: config.badges,
      titles: config.titles,
    }),
    isInitialized: () => isInitialized,
  };

  global.CollectiblesSystem = CollectiblesSystem;
})(typeof window !== 'undefined' ? window : this);
