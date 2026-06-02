/* ===== Tutorial System =====
   Interactive tutorial walkthrough with step-by-step guidance
   Shows once for new players. Configurable per game.
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = 'tutorial_seen';

  // ─── Default Tutorial Steps (override per game) ───
  const DEFAULT_STEPS = [
    {
      id: 'welcome',
      text: 'Welcome! Tap anywhere to start playing.',
      target: null,
      position: 'center',
      requireAction: 'tap',
      nextOnAction: true,
      highlight: null,
    },
    {
      id: 'gameplay',
      text: 'Use ← → arrows to move pieces. Tap ↑ to rotate.',
      target: '#game-board',
      position: 'bottom',
      requireAction: null,
      nextOnAction: false,
      highlight: '#game-board',
    },
    {
      id: 'score',
      text: 'Complete lines to earn points! More lines = more coins.',
      target: '.hud-bar',
      position: 'top',
      requireAction: null,
      nextOnAction: false,
      highlight: '.score-display',
    },
    {
      id: 'upgrades',
      text: 'Earn coins to upgrade your Weapon, Case, and Outfit in the Shop!',
      target: '#btn-shop',
      position: 'top',
      requireAction: null,
      nextOnAction: false,
      highlight: '#btn-shop',
    },
    {
      id: 'ads',
      text: 'Watch ads for bonus coins and gems. Or buy Remove Ads!',
      target: '#btn-ad-reward',
      position: 'top',
      requireAction: null,
      nextOnAction: false,
      highlight: '#btn-ad-reward',
    },
    {
      id: 'challenges',
      text: 'Complete daily challenges for extra rewards!',
      target: '#btn-challenges',
      position: 'top',
      requireAction: null,
      nextOnAction: false,
      highlight: '#btn-challenges',
    },
    {
      id: 'complete',
      text: 'That\'s it! You\'re ready to go. Good luck! 🎉',
      target: null,
      position: 'center',
      requireAction: 'tap',
      nextOnAction: true,
      highlight: null,
    },
  ];

  let config = {
    steps: [],
    gameTitle: 'Game',
    forceShow: false,     // for testing
  };

  let currentStep = -1;
  let isRunning = false;
  let onComplete = null;

  // ─── Init ──────────────────────────────────────────
  function init(overrides) {
    if (overrides) {
      if (overrides.steps) config.steps = overrides.steps;
      if (overrides.gameTitle) config.gameTitle = overrides.gameTitle;
      if (overrides.forceShow) config.forceShow = overrides.forceShow;
    }
    if (config.steps.length === 0) config.steps = DEFAULT_STEPS;
  }

  // ─── Check if tutorial should show ─────────────────
  function shouldShow() {
    if (config.forceShow) return true;
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch(e) {
      return true;
    }
  }

  function markSeen() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch(e) {}
  }

  // ─── Start Tutorial ────────────────────────────────
  function start(callback) {
    if (isRunning) return;
    isRunning = true;
    currentStep = -1;
    onComplete = callback || null;
    nextStep();
  }

  // ─── Next Step ─────────────────────────────────────
  function nextStep() {
    currentStep++;
    if (currentStep >= config.steps.length) {
      endTutorial();
      return;
    }

    const step = config.steps[currentStep];
    showStep(step);
  }

  // ─── Show Step ─────────────────────────────────────
  function showStep(step) {
    // Remove any existing tutorial overlay
    removeOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);';

    // Highlight element if specified
    if (step.highlight) {
      const el = document.querySelector(step.highlight);
      if (el) {
        el.style.position = 'relative';
        el.style.zIndex = '10001';
        el.style.boxShadow = '0 0 0 4px var(--accent-gold, #ffd700), 0 0 20px rgba(255,215,0,0.5)';
        el.style.borderRadius = '8px';
        if (step.id === 'gameplay') {
          // For gameplay step, make the overlay only cover non-game area
          overlay.style.pointerEvents = 'none';
        }
      }
    }

    // Position the message box
    const msgBox = document.createElement('div');
    msgBox.className = 'tutorial-message';
    msgBox.style.cssText = 'background:rgba(20,20,30,0.95);border:1px solid var(--accent-gold, #ffd700);border-radius:16px;padding:20px 24px;max-width:320px;text-align:center;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.5);animation:popIn 0.3s;';

    if (step.target && step.position === 'top') {
      // Position above target
      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        msgBox.style.position = 'fixed';
        msgBox.style.top = Math.max(10, rect.top - 100) + 'px';
        msgBox.style.left = '50%';
        msgBox.style.transform = 'translateX(-50%)';
        overlay.style.background = 'none';
        overlay.style.pointerEvents = 'none';
      }
    } else if (step.target && step.position === 'bottom') {
      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        msgBox.style.position = 'fixed';
        msgBox.style.top = Math.min(window.innerHeight - 160, rect.bottom + 20) + 'px';
        msgBox.style.left = '50%';
        msgBox.style.transform = 'translateX(-50%)';
        overlay.style.background = 'none';
        overlay.style.pointerEvents = 'none';
      }
    }

    msgBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;justify-content:center;">
        <span style="background:var(--accent-gold, #ffd700);color:#000;font-size:11px;font-weight:700;padding:2px 10px;border-radius:10px;">TIP ${currentStep + 1}/${config.steps.length}</span>
      </div>
      <div style="font-size:15px;line-height:1.5;margin-bottom:14px;">${step.text}</div>
      <div style="display:flex;gap:8px;justify-content:center;">
        ${step.requireAction === 'tap' ? '' : '<button class="game-btn btn-small" id="tutorial-skip" style="background:transparent;border:1px solid rgba(255,255,255,0.3);color:var(--text-secondary);font-size:12px;">Skip</button>'}
        <button class="game-btn btn-small" id="tutorial-next" style="background:var(--accent-gold, #ffd700);color:#000;font-size:13px;font-weight:700;">${step.requireAction === 'tap' ? 'Got it! 👆' : 'Next →'}</button>
      </div>
    `;

    overlay.appendChild(msgBox);
    document.body.appendChild(overlay);

    // Handle next button (unless action required)
    if (step.requireAction !== 'tap') {
      document.getElementById('tutorial-next').addEventListener('click', (e) => {
        e.stopPropagation();
        nextStep();
      });
      document.getElementById('tutorial-skip').addEventListener('click', (e) => {
        e.stopPropagation();
        endTutorial();
      });
    } else {
      // Tap anywhere to continue
      overlay.addEventListener('click', () => {
        nextStep();
      });
    }
  }

  // ─── Remove Overlay ────────────────────────────────
  function removeOverlay() {
    const existing = document.getElementById('tutorial-overlay');
    if (existing) existing.remove();
    // Clear highlights
    config.steps.forEach(s => {
      if (s.highlight) {
        const el = document.querySelector(s.highlight);
        if (el) {
          el.style.boxShadow = '';
          el.style.zIndex = '';
        }
      }
    });
  }

  // ─── End Tutorial ──────────────────────────────────
  function endTutorial() {
    removeOverlay();
    markSeen();
    isRunning = false;
    if (onComplete) onComplete();
  }

  // ─── Public API ────────────────────────────────────
  const TutorialSystem = {
    init,
    shouldShow,
    start,
    markSeen,
    nextStep,
    endTutorial,
    isRunning: () => isRunning,
    getCurrentStep: () => currentStep,
  };

  global.TutorialSystem = TutorialSystem;
})(typeof window !== 'undefined' ? window : this);
