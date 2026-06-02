/* ===== Store Rotator =====
   Rotating daily/weekly offers, "Best Value" tags, limited-time bundles
   Works alongside existing shop.js — just adds promotional layer
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = 'store_rotator';

  // ─── Config ────────────────────────────────────────
  const DEFAULT_DEAL_POOL = [
    {
      id: 'deal_discount_upgrades',
      title: 'Upgrade Sale!',
      desc: '50% off coins cost for all upgrades',
      type: 'discount_upgrades',
      discountPct: 50,
      duration: 'daily',
      icon: '⚡',
      priority: 1,
    },
    {
      id: 'deal_free_gems',
      title: 'Free Gems!',
      desc: 'Get 25 bonus gems with your next purchase',
      type: 'bonus_gems',
      bonusAmount: 25,
      duration: 'daily',
      icon: '💎',
      priority: 2,
    },
    {
      id: 'deal_bundle_discount',
      title: 'Bundle Blowout!',
      desc: 'Starter Bundle 40% off',
      type: 'discount_bundle',
      bundleId: 'bundle_starter',
      discountPct: 40,
      duration: 'weekly',
      icon: '🎁',
      priority: 3,
    },
    {
      id: 'deal_gem_bonus',
      title: 'Gem Bonus!',
      desc: 'All gem packs get +50% bonus gems',
      type: 'gem_bonus',
      bonusPct: 50,
      duration: 'daily',
      icon: '💎',
      priority: 2,
    },
    {
      id: 'deal_legendary_skin',
      title: 'Legendary Offer!',
      desc: 'Void Walker skin 30% off',
      type: 'discount_skin',
      skinId: 'lg_void',
      discountPct: 30,
      duration: 'weekly',
      icon: '🌟',
      priority: 4,
    },
    {
      id: 'deal_double_xp',
      title: '2x XP Weekend!',
      desc: 'Double XP for all games',
      type: 'double_xp',
      multiplier: 2,
      duration: 'weekly',
      icon: '⭐',
      priority: 1,
    },
  ];

  let config = {
    dealPool: [],
    numDailyDeals: 1,
    numWeeklyDeals: 2,
  };

  let state = {
    dailyDeals: [],
    weeklyDeals: [],
    lastDailyRefresh: null,
    lastWeeklyRefresh: null,
    // Track which deals have been shown to player
    seenDeals: [],
    // Track which daily deals were purchased (so they disappear once bought)
    purchasedDealIds: [],
  };

  let isInitialized = false;

  // ─── Init ──────────────────────────────────────────
  function init(overrides) {
    if (overrides) {
      if (overrides.dealPool) config.dealPool = overrides.dealPool;
      if (overrides.numDailyDeals !== undefined) config.numDailyDeals = overrides.numDailyDeals;
      if (overrides.numWeeklyDeals !== undefined) config.numWeeklyDeals = overrides.numWeeklyDeals;
    }
    if (config.dealPool.length === 0) config.dealPool = DEFAULT_DEAL_POOL;

    loadState();
    refreshDeals();
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

  // ─── Refresh ───────────────────────────────────────
  function refreshDeals() {
    const today = new Date().toDateString();
    const week = getWeekId();

    if (state.lastDailyRefresh !== today) {
      state.dailyDeals = pickDeals('daily', config.numDailyDeals);
      state.lastDailyRefresh = today;
      saveState();
    }

    if (state.lastWeeklyRefresh !== week) {
      state.weeklyDeals = pickDeals('weekly', config.numWeeklyDeals);
      state.lastWeeklyRefresh = week;
      saveState();
    }
  }

  function getWeekId() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + week;
  }

  function pickDeals(duration, count) {
    const pool = config.dealPool.filter(d => d.duration === duration);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, pool.length));
  }

  // ─── Get Active Deals ──────────────────────────────
  function getActiveDeals() {
    const active = [];

    state.dailyDeals.forEach(d => {
      if (!state.purchasedDealIds.includes(d.id)) {
        active.push({ ...d, timeLeft: 'Ends today' });
      }
    });

    state.weeklyDeals.forEach(d => {
      if (!state.purchasedDealIds.includes(d.id)) {
        active.push({ ...d, timeLeft: 'Ends this week' });
      }
    });

    // Sort by priority (lower = more important)
    active.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    return active;
  }

  // ─── Mark Deal as Purchased ────────────────────────
  function onDealPurchased(dealId) {
    if (!state.purchasedDealIds.includes(dealId)) {
      state.purchasedDealIds.push(dealId);
      saveState();
    }
  }

  // ─── Mark Deal as Seen ─────────────────────────────
  function markDealSeen(dealId) {
    if (!state.seenDeals.includes(dealId)) {
      state.seenDeals.push(dealId);
      saveState();
    }
  }

  // ─── Get "Best Value" tag for items ────────────────
  function getBestValueTag(itemId) {
    const deals = getActiveDeals();
    for (const d of deals) {
      if (d.type === 'discount_bundle' && d.bundleId === itemId) return '🔥 ' + d.discountPct + '% OFF';
      if (d.type === 'discount_skin' && d.skinId === itemId) return '🔥 ' + d.discountPct + '% OFF';
      if (d.type === 'gem_bonus' && itemId && itemId.startsWith('gems_')) return '⭐ +' + d.bonusPct + '% BONUS';
    }
    // Popular items always get "Best Value"
    const popularGems = ['gems_medium'];
    if (popularGems.includes(itemId)) return '⭐ Best Value';
    return null;
  }

  // ─── Get Discount Multiplier ───────────────────────
  function getDiscountMultiplier(itemType, itemId) {
    const deals = getActiveDeals();
    for (const d of deals) {
      if (d.type === 'discount_upgrades' && itemType === 'upgrade') return 1 - (d.discountPct / 100);
      if (d.type === 'discount_bundle' && d.bundleId === itemId) return 1 - (d.discountPct / 100);
      if (d.type === 'discount_skin' && d.skinId === itemId) return 1 - (d.discountPct / 100);
    }
    return 1;
  }

  // ─── Get XP Multiplier ─────────────────────────────
  function getXpMultiplier() {
    const deals = getActiveDeals();
    for (const d of deals) {
      if (d.type === 'double_xp') return d.multiplier || 2;
    }
    return 1;
  }

  // ─── Get Gem Bonus Amount ──────────────────────────
  function getGemBonus(gems) {
    const deals = getActiveDeals();
    for (const d of deals) {
      if (d.type === 'gem_bonus') return Math.floor(gems * (d.bonusPct / 100));
      if (d.type === 'bonus_gems') return d.bonusAmount || 0;
    }
    return 0;
  }

  // ─── UI: build "Deals" section for shop ────────────
  function buildDealsHTML() {
    const deals = getActiveDeals();
    if (deals.length === 0) return '';

    let html = '<div class="deals-section" style="margin-bottom:16px;">';
    html += '<h3 style="text-align:center;margin:0 0 12px;color:var(--accent-gold);font-size:16px;">🎉 Limited Offers</h3>';

    deals.forEach(d => {
      html += '<div class="deal-card" style="background:linear-gradient(135deg,rgba(255,193,7,0.12),rgba(255,87,34,0.08));border:1px solid rgba(255,193,7,0.3);border-radius:12px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">' +
        '<span style="font-size:28px;">' + (d.icon || '🎉') + '</span>' +
        '<div style="flex:1;">' +
          '<div style="font-size:14px;font-weight:700;color:var(--accent-gold);">' + d.title + '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);">' + d.desc + '</div>' +
          '<div style="font-size:10px;color:#ff9800;margin-top:2px;">⏱️ ' + d.timeLeft + '</div>' +
        '</div>' +
        '<span style="font-size:10px;background:rgba(255,193,7,0.2);padding:3px 8px;border-radius:6px;color:var(--accent-gold);font-weight:600;">LIVE</span>' +
      '</div>';
    });

    html += '</div>';
    return html;
  }

  // ─── Public API ────────────────────────────────────
  const StoreRotator = {
    init,
    getActiveDeals,
    onDealPurchased,
    markDealSeen,
    getBestValueTag,
    getDiscountMultiplier,
    getXpMultiplier,
    getGemBonus,
    buildDealsHTML,
    refreshDeals,
    getState: () => ({ ...state }),
    getConfig: () => ({ ...config }),
    isInitialized: () => isInitialized,
  };

  global.StoreRotator = StoreRotator;
})(typeof window !== 'undefined' ? window : this);
