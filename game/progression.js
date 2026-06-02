/* ===== Car Parking — Full Progression System ===== */
(function() {
  'use strict';
  const SAVE_KEY = 'cp_progress';
  const DAILY_KEY = 'cp_daily_bonus';

  const UPGRADE_TIERS = {
    weapon: {
      name: 'Engine',
      icon: '🔧',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Stock Engine',   bonus: { speedControl: 1 }, gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Sport Engine',   bonus: { speedControl: 2 }, gemReq: 50,  coinsReq: 1000 },
        { level: 2, name: 'Turbo Engine',   bonus: { speedControl: 2 }, gemReq: 80,  coinsReq: 2000 },
        { level: 3, name: 'Racing Engine',  bonus: { speedControl: 3 }, gemReq: 120, coinsReq: 4000 },
        { level: 4, name: 'Supercharged',   bonus: { speedControl: 3 }, gemReq: 200, coinsReq: 8000 },
        { level: 5, name: '⚡ Hyper Drive', bonus: { speedControl: 4 }, gemReq: 500, coinsReq: 20000 },
      ]
    },
    case: {
      name: 'Bumper',
      icon: '🛞',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Stock Bumper',    bonus: { collisionBonus: 0 }, gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Rubber Bumper',   bonus: { collisionBonus: 1 }, gemReq: 40,  coinsReq: 800 },
        { level: 2, name: 'Steel Bumper',    bonus: { collisionBonus: 1 }, gemReq: 70,  coinsReq: 1600 },
        { level: 3, name: 'Reinforced',      bonus: { collisionBonus: 2 }, gemReq: 100, coinsReq: 3200 },
        { level: 4, name: 'Armor Plated',    bonus: { collisionBonus: 2 }, gemReq: 180, coinsReq: 6400 },
        { level: 5, name: '💎 Diamond Guard',bonus: { collisionBonus: 3 }, gemReq: 400, coinsReq: 16000 },
      ]
    },
    outfit: {
      name: 'Light',
      icon: '💡',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Dim Light',      bonus: { timeBonus: 0 },    gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Standard Light', bonus: { timeBonus: 3 },    gemReq: 30,  coinsReq: 600 },
        { level: 2, name: 'Bright Light',   bonus: { timeBonus: 5 },    gemReq: 60,  coinsReq: 1200 },
        { level: 3, name: 'LED Light',      bonus: { timeBonus: 8 },    gemReq: 90,  coinsReq: 2400 },
        { level: 4, name: 'Xenon Light',    bonus: { timeBonus: 10 },   gemReq: 150, coinsReq: 4800 },
        { level: 5, name: '🔥 Laser Beam',  bonus: { timeBonus: 15 },   gemReq: 350, coinsReq: 12000 },
      ]
    }
  };

  const PREMIUM_ITEMS = {
    legendarySkins: [
      { id: 'lg_goldcar',  name: 'Gold Car',     desc: 'Luxurious golden car skin',  price: 4.99, gemPrice: 0, tier: 'legendary', type: 'car_skin' },
      { id: 'lg_neoncar',  name: 'Neon Racer',   desc: 'Neon-striped racing car',    price: 6.99, gemPrice: 0, tier: 'legendary', type: 'car_skin' },
    ],
    premiumCases: [
      { id: 'pc_royal',    name: 'Royal Pass',   desc: '7 days: 2x coins + 50 gems/day', price: 4.99, gemPrice: 0, type: 'subscription', duration: '7d' },
    ],
    bundles: [
      { id: 'bundle_starter', name: 'Starter Bundle', desc: '200 gems + 5 extra seconds + exclusive car', price: 2.99, gemPrice: 0, type: 'one_time' },
      { id: 'bundle_mega',    name: 'Mega Pack',      desc: '500 gems + 15 extra seconds + neon theme',  price: 7.99, gemPrice: 0, type: 'one_time' },
    ],
    removeAds: { id: 'remove_ads', name: 'Remove Ads', desc: 'Permanently remove all ads', price: 2.99, gemPrice: 0, type: 'one_time' },
  };

  const GEM_PACKS = [
    { id: 'gems_small',  name: 'Small Gem Pack',   gems: 100,  price: 0.99,  bonus: 0,    popular: false },
    { id: 'gems_medium', name: 'Standard Gem Pack', gems: 500,  price: 3.99,  bonus: 50,   popular: true  },
    { id: 'gems_large',  name: 'Large Gem Pack',   gems: 1200, price: 7.99,  bonus: 200,  popular: false },
    { id: 'gems_mega',   name: 'Mega Gem Pack',    gems: 4000, price: 19.99, bonus: 1000, popular: false },
  ];

  const CATALOG = {
    themes: [
      { id: 'default',   name: 'Classic Dark',   price: 0,    desc: 'Original dark theme',        colors: { bg: '#0f1020', accent: '#1a1a2e' } },
      { id: 'garage',    name: 'Underground',    price: 500,  desc: 'Underground parking',        colors: { bg: '#1a1a1a', accent: '#3a3a3a' } },
      { id: 'outdoor',   name: 'Open Lot',       price: 800,  desc: 'Bright outdoor lot',         colors: { bg: '#2a3a4a', accent: '#4a6a8a' } },
      { id: 'mall',      name: 'Shopping Mall',  price: 1200, desc: 'Colorful mall parking',     colors: { bg: '#1a0a2a', accent: '#3a1a5a' } },
      { id: 'neon',      name: 'Neon City',      price: 2000, desc: 'Neon-lit city parking',      colors: { bg: '#0a0020', accent: '#2a0050' } },
    ],
    carColors: [
      { id: 'red',       name: 'Red',            price: 0,    desc: 'Classic red car',           color: '#e74c3c' },
      { id: 'blue',      name: 'Blue',           price: 600,  desc: 'Cool blue car',             color: '#3498db' },
      { id: 'green',     name: 'Green',          price: 600,  desc: 'Forest green car',          color: '#2ecc71' },
      { id: 'black',     name: 'Black',          price: 800,  desc: 'Sleek black car',           color: '#2d3436' },
      { id: 'white',     name: 'White',          price: 1000, desc: 'Clean white car',           color: '#dfe6e9' },
      { id: 'yellow',    name: 'Yellow',         price: 1200, desc: 'Bright yellow car',         color: '#f1c40f' },
      { id: 'purple',    name: 'Purple',         price: 1500, desc: 'Royal purple car',          color: '#9b59b6' },
      { id: 'cyan',      name: 'Cyan',           price: 2000, desc: 'Cyan sport car',            color: '#00cec9' },
    ],
    parkingThemes: [
      { id: 'standard',  name: 'Standard Lines', price: 0,    desc: 'White parking lines' },
      { id: 'neon',      name: 'Neon Lines',     price: 800,  desc: 'Neon glow parking lines' },
      { id: 'glow',      name: 'Glow Marks',     price: 1500, desc: 'Glowing parking markers' },
    ],
    hornSounds: [
      { id: 'beep',      name: 'Beep',           price: 0,    desc: 'Standard horn beep' },
      { id: 'honk',      name: 'Honk',           price: 500,  desc: 'Loud truck honk' },
      { id: 'melody',    name: 'Melody',         price: 1000, desc: 'Musical melody' },
      { id: 'police',    name: 'Siren',          price: 2000, desc: 'Police siren sound' },
    ],
    powerupPacks: [
      { id: 'time',      name: 'Time Boost',     price: 300,  items: { timeBonus: 5 },     desc: '+5 seconds bonus' },
      { id: 'shield',    name: 'Shield',         price: 400,  items: { shield: 3 },        desc: '3 collision shields' },
      { id: 'mega',      name: 'Mega Bundle',    price: 1000, items: { timeBonus: 15, shield: 5 }, desc: '+15s + 5 shields' },
    ],
  };

  const ACHIEVEMENTS = [
    { id: 'first_win',    name: 'First Park',       desc: 'Park successfully for the first time',  reward: { coins: 50, gems: 0 },  icon: '🚗', check: p => p.totalWins >= 1 },
    { id: 'win_10',       name: 'Parking Pro',      desc: 'Complete 10 levels',                    reward: { coins: 200, gems: 5 }, icon: '🏎️', check: p => p.totalWins >= 10 },
    { id: 'win_50',       name: 'Parking Master',   desc: 'Complete 50 levels',                    reward: { coins: 1000, gems: 20 },icon: '🏆', check: p => p.totalWins >= 50 },
    { id: 'no_collision',  name: 'Perfect Park',    desc: 'Complete a level without collisions',   reward: { coins: 300, gems: 10 },icon: '🎯', check: p => p.perfectLevels >= 1 },
    { id: 'fast_20',       name: 'Speed Demon',    desc: 'Complete a level in under 20 seconds',   reward: { coins: 500, gems: 15 },icon: '⚡', check: p => p.fastLevels >= 1 },
    { id: 'parallel',      name: 'Parallel Pro',   desc: 'Complete a parallel parking level',      reward: { coins: 400, gems: 10 },icon: '↔️', check: p => p.parallelWins >= 1 },
  ];

  function defaultState() {
    return {
      coins: 100, gems: 0, totalGems: 0, xp: 0, level: 1, highestLevel: 1,
      totalWins: 0, totalPlays: 0, perfectLevels: 0, fastLevels: 0, parallelWins: 0,
      upgrades: { weapon: 0, case: 0, outfit: 0 },
      ownedThemes: ['default'], ownedCarColors: ['red'], ownedParkingThemes: ['standard'], ownedHornSounds: ['beep'],
      activeTheme: 'default', activeCarColor: 'red', activeParkingTheme: 'standard', activeHorn: 'beep',
      powerups: { timeBonus: 0, shield: 0 },
      inventory: {}, achievements: {}, lastSaveDate: null, adFree: false, subscriptions: {},
      completedLevels: {},
    };
  }

  let state = null;
  function save(){state.lastSaveDate=new Date().toISOString();try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){}}
  function load(){try{const r=localStorage.getItem(SAVE_KEY);if(r){state={...defaultState(),...JSON.parse(r)};save();return true;}}catch(e){}reset();return false;}
  function reset(){state=defaultState();save();}
  function xpForLevel(l){return Math.floor(100*Math.pow(1.2,l-1));}
  function addXp(a){if(!state)return false;state.xp+=a;let l=false;while(state.xp>=xpForLevel(state.level)){state.xp-=xpForLevel(state.level);state.level++;l=true;}save();return l;}
  function addCoins(a){if(!state)return 0;state.coins+=a;save();return state.coins;}
  function spendCoins(a){if(!state||state.coins<a)return false;state.coins-=a;save();return true;}
  function addGems(a){if(!state)return 0;state.gems+=a;state.totalGems+=a;save();return state.gems;}
  function spendGems(a){if(!state||state.gems<a)return false;state.gems-=a;save();return true;}
  function getUpgradeCost(cat,cl){const t=UPGRADE_TIERS[cat];if(!t)return null;const n=cl+1;const ld=t.levels.find(l=>l.level===n);if(!ld)return null;return{coins:ld.coinsReq,gems:ld.gemReq};}
  function upgradeItem(cat,ug=false){if(!state)return{success:false,reason:'no_state'};const t=UPGRADE_TIERS[cat];if(!t)return{success:false,reason:'invalid'};const c=state.upgrades[cat]||0;if(c>=t.maxLevel)return{success:false,reason:'max'};const cs=getUpgradeCost(cat,c);if(!cs)return{success:false,reason:'nodata'};if(ug){if(state.gems<cs.gems)return{success:false,reason:'nogems'};spendGems(cs.gems);}else{if(state.coins<cs.coins)return{success:false,reason:'nocoins'};spendCoins(cs.coins);}state.upgrades[cat]++;save();return{success:true,newLevel:state.upgrades[cat]};}
  function getActiveBonuses(){if(!state)return{speedControl:1,collisionBonus:0,timeBonus:0};const b={speedControl:1,collisionBonus:0,timeBonus:0};const w=UPGRADE_TIERS.weapon.levels[state.upgrades.weapon||0];if(w)b.speedControl=w.bonus.speedControl;const c=UPGRADE_TIERS.case.levels[state.upgrades.case||0];if(c)b.collisionBonus=c.bonus.collisionBonus;const o=UPGRADE_TIERS.outfit.levels[state.upgrades.outfit||0];if(o)b.timeBonus=o.bonus.timeBonus;return b;}
  function ownsPremiumItem(id){return state&&state.inventory&&state.inventory[id]===true;}
  function purchasePremiumItem(id){if(!state)return false;state.inventory[id]=true;if(id==='remove_ads'){state.adFree=true;if(window.AdsManager)AdsManager.onAdsRemoved();}const bg={bundle_starter:200,bundle_mega:500};if(bg[id])addGems(bg[id]);save();return true;}
  function checkAchievements(){if(!state)return[];const u=[];for(const a of ACHIEVEMENTS){if(state.achievements[a.id])continue;if(a.check(state)){state.achievements[a.id]=true;addCoins(a.reward.coins);if(a.reward.gems)addGems(a.reward.gems);u.push(a);}}if(u.length>0)save();return u;}
  function claimDailyBonus(){if(!state)return null;const n=new Date();const t=n.toDateString();try{const l=localStorage.getItem(DAILY_KEY);if(l===t)return null;const y=new Date(n);y.setDate(y.getDate()-1);const s=l===y.toDateString()?(state.dailyStreak||0)+1:1;state.dailyStreak=s;const c=Math.min(100+(s-1)*20,1000);const g=s>=7?5:s>=3?2:0;addCoins(c);if(g)addGems(g);localStorage.setItem(DAILY_KEY,t);save();return{streak:s,coins:c,gems:g};}catch(e){return null;}}
  function endOfGame(r){if(!state)return;state.totalPlays++;if(r.won){state.totalWins++;if(r.level>state.highestLevel)state.highestLevel=r.level;if(!state.completedLevels[r.level]||r.score>(state.completedLevels[r.level]||0))state.completedLevels[r.level]=r.score;}if(r.perfect)state.perfectLevels++;if(r.fast)state.fastLevels++;if(r.parallel)state.parallelWins++;addXp(r.won?100:20);if(r.won)addCoins(20+Math.floor(r.score/10));save();}
  function getState(){return state;}
  function getUpgradeTiers(){return UPGRADE_TIERS;}
  function getPremiumItems(){return PREMIUM_ITEMS;}
  function getGemPacks(){return GEM_PACKS;}
  function getCatalog(){return CATALOG;}
  function getAchievements(){return ACHIEVEMENTS;}
  function getCoinBalance(){return state?state.coins:0;}
  function getGemBalance(){return state?state.gems:0;}
  window.ProgressionSystem={load,save,reset,addCoins,spendCoins,getCoinBalance,addGems,spendGems,getGemBalance,addXp,xpForLevel,upgradeItem,getUpgradeCost,getActiveBonuses,getUpgradeTiers,UPGRADE_TIERS,getPremiumItems,PREMIUM_ITEMS,getGemPacks,GEM_PACKS,ownsPremiumItem,purchasePremiumItem,getCatalog,CATALOG,getAchievements,ACHIEVEMENTS,checkAchievements,endOfGame,claimDailyBonus,getState,defaultState};
})();
