/* ============================================================
   BOUTIQUE LUNA — estado, guardado, HUD y utilidades
   ============================================================ */

(function () {
  const BL = window.BL;
  const SAVE_KEY = 'boutiqueLuna.save.v1';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtTime(ms) {
    if (ms == null || ms < 0) return '';
    const total = Math.ceil(ms / 1000);
    return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
  }

  function defaultState() {
    return {
      v: 1,
      coins: 0,
      lives: 5,
      nextLifeAt: null,
      unlocked: 1,
      completed: {},
      upgrades: { shoes: 0, tea: 0, register: 0, tip: 0 },
      sound: true
    };
  }

  function loadState() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { raw = null; }
    const def = defaultState();
    const s = raw && typeof raw === 'object' ? raw : {};
    const out = Object.assign(def, s);
    out.upgrades = Object.assign({ shoes: 0, tea: 0, register: 0, tip: 0 }, s.upgrades || {});
    out.completed = (s.completed && typeof s.completed === 'object') ? s.completed : {};
    out.coins = Math.max(0, Math.floor(Number(out.coins) || 0));
    out.lives = clamp(Math.floor(Number(out.lives) == null || isNaN(Number(out.lives)) ? 5 : Number(out.lives)), 0, BL.MAX_LIVES);
    out.unlocked = clamp(Math.floor(Number(out.unlocked) || 1), 1, BL.LEVELS.length);
    out.sound = out.sound !== false;
    Object.keys(out.upgrades).forEach(k => {
      out.upgrades[k] = clamp(Math.floor(Number(out.upgrades[k]) || 0), 0, 3);
    });
    Object.keys(out.completed).forEach(k => {
      const c = out.completed[k];
      if (!c || typeof c !== 'object') { delete out.completed[k]; return; }
      c.stars = clamp(Math.floor(Number(c.stars) || 1), 1, 3);
    });
    if (out.lives >= BL.MAX_LIVES) out.nextLifeAt = null;
    else if (!out.nextLifeAt) out.nextLifeAt = Date.now() + BL.LIFE_MS;
    return out;
  }

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(BL.state)); } catch (e) { /* silencio */ }
  }

  function refreshLives(notify) {
    const s = BL.state;
    if (!s) return false;
    if (s.lives >= BL.MAX_LIVES) {
      if (s.nextLifeAt != null) { s.nextLifeAt = null; saveState(); }
      return false;
    }
    if (!s.nextLifeAt) s.nextLifeAt = Date.now() + BL.LIFE_MS;
    let gained = 0;
    const now = Date.now();
    while (s.lives < BL.MAX_LIVES && now >= s.nextLifeAt) {
      s.lives++;
      gained++;
      if (s.lives >= BL.MAX_LIVES) { s.nextLifeAt = null; break; }
      s.nextLifeAt += BL.LIFE_MS;
    }
    if (gained > 0) {
      saveState();
      updateHUD(true);
      if (notify && BL.Sound) {
        BL.Sound.play('heart');
        toast(gained > 1 ? '¡Recuperaste ' + gained + ' vidas!' : '¡Recuperaste una vida!', 'success');
      }
      if (BL.ui && BL.ui.onLivesChanged) BL.ui.onLivesChanged();
    }
    return gained > 0;
  }

  function loseLife() {
    const s = BL.state;
    refreshLives(false);
    if (s.lives <= 0) return 0;
    s.lives = Math.max(0, s.lives - 1);
    if (s.nextLifeAt == null) s.nextLifeAt = Date.now() + BL.LIFE_MS;
    saveState();
    updateHUD();
    // pequeña animación en el corazón perdido
    const heartsEl = $('.js-hearts');
    if (heartsEl) {
      const hearts = Array.from(heartsEl.children);
      const lost = hearts[s.lives];
      if (lost) {
        lost.classList.add('broken');
        setTimeout(() => lost.classList.remove('broken'), 750);
      }
    }
    if (BL.ui && BL.ui.onLivesChanged) BL.ui.onLivesChanged();
    return s.lives;
  }

  function updateHUD(animateHearts) {
    const s = BL.state;
    if (!s) return;
    $$('.js-coins').forEach(el => { el.textContent = s.coins; });
    $$('.coin-ico').forEach(el => {
      if (!el.querySelector('img')) el.innerHTML = BL.art.iconHTML('coin', { scale: 2 });
    });
    const heartsEl = $('.js-hearts');
    if (heartsEl) {
      const prev = Number(heartsEl.dataset.prev || s.lives);
      let html = '';
      for (let i = 0; i < BL.MAX_LIVES; i++) {
        const full = i < s.lives;
        const beat = animateHearts && full && i >= prev ? 'beat' : '';
        html += BL.art.heartHTML(full, beat);
      }
      heartsEl.innerHTML = html;
      heartsEl.dataset.prev = s.lives;
      heartsEl.setAttribute('aria-label', s.lives + ' de ' + BL.MAX_LIVES + ' vidas');
    }
    const timerEl = $('.js-life-timer');
    if (timerEl) {
      if (s.lives < BL.MAX_LIVES && s.nextLifeAt) {
        const left = Math.max(0, s.nextLifeAt - Date.now());
        timerEl.classList.remove('hidden');
        timerEl.innerHTML = BL.art.iconHTML('clock', { scale: 2, color: '#b06a82' }) + '<span>' + fmtTime(left) + '</span>';
        timerEl.title = 'Próxima vida en ' + fmtTime(left);
      } else {
        timerEl.classList.add('hidden');
        timerEl.innerHTML = '';
      }
    }
    if (BL.ui && BL.ui.syncHomeLive) BL.ui.syncHomeLive();
    $$('.js-countdown').forEach(el => {
      if (s.lives >= BL.MAX_LIVES) { el.textContent = '¡Lleno!'; return; }
      if (!s.nextLifeAt) { el.textContent = '—'; return; }
      el.textContent = fmtTime(Math.max(0, s.nextLifeAt - Date.now()));
    });
  }

  /* ---------------- toasts ---------------- */
  function toast(text, kind) {
    const holder = $('#toasts');
    if (!holder) return;
    const k = kind || 'info';
    const chars = { info: '✦', success: '✓', error: '!', coin: '★' };
    const el = document.createElement('div');
    el.className = 'toast ' + k;
    el.innerHTML = '<span class="t-ico">' + (chars[k] || '✦') + '</span><span>' + text + '</span>';
    holder.appendChild(el);
    while (holder.children.length > 3) holder.removeChild(holder.firstElementChild);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  /* ---------------- efectos ---------------- */
  const fx = {
    float(text, x, y, cls) {
      const layer = $('#fx');
      if (!layer) return;
      const el = document.createElement('div');
      el.className = 'fx-float ' + (cls || '');
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.innerHTML = text;
      layer.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    },
    coins(x, y, n) {
      const layer = $('#fx');
      if (!layer) return;
      const count = n || 6;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fx-coin';
        el.style.left = (x + (Math.random() * 90 - 45)) + 'px';
        el.style.top = (y + (Math.random() * 40 - 20)) + 'px';
        el.style.setProperty('--dx', (Math.random() * 70 - 35) + 'px');
        el.style.animationDelay = (i * 40) + 'ms';
        el.innerHTML = BL.art.iconHTML('coin', { scale: 2 });
        layer.appendChild(el);
        setTimeout(() => el.remove(), 1600);
      }
    },
    hearts(x, y, n) {
      const layer = $('#fx');
      if (!layer) return;
      const count = n || 4;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fx-heart';
        el.style.left = (x + (Math.random() * 80 - 40)) + 'px';
        el.style.top = (y + (Math.random() * 30 - 15)) + 'px';
        el.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
        el.style.animationDelay = (i * 55) + 'ms';
        el.innerHTML = BL.art.iconHTML('heart', { scale: 2, color: '#ff6f9f' });
        layer.appendChild(el);
        setTimeout(() => el.remove(), 1300);
      }
    },
    shake() {
      const screen = $('#game');
      if (!screen) return;
      screen.classList.remove('shake');
      void screen.offsetWidth;
      screen.classList.add('shake');
      setTimeout(() => screen.classList.remove('shake'), 500);
    },
    flashLife() {
      const screen = $('#game');
      if (!screen) return;
      const el = document.createElement('div');
      el.className = 'life-flash';
      screen.appendChild(el);
      setTimeout(() => el.remove(), 700);
    },
    confetti(container, count) {
      if (!container) return;
      const holder = document.createElement('div');
      holder.className = 'confetti-holder';
      const colors = ['#ff7da9', '#ffd166', '#7ac9a4', '#b9a4e8', '#7dc7ee', '#ff9fbe'];
      for (let i = 0; i < (count || 60); i++) {
        const c = document.createElement('span');
        c.className = 'confetti';
        c.style.left = (Math.random() * 100) + '%';
        c.style.background = colors[i % colors.length];
        c.style.setProperty('--delay', (Math.random() * 0.8) + 's');
        c.style.setProperty('--dur', (2.4 + Math.random() * 2) + 's');
        c.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
        c.style.width = (6 + Math.random() * 8) + 'px';
        c.style.height = (10 + Math.random() * 12) + 'px';
        holder.appendChild(c);
      }
      container.appendChild(holder);
    }
  };

  /* ---------------- pantalla ---------------- */
  function fitStage() {
    const stage = $('#stage');
    if (!stage) return;
    const scale = Math.min(window.innerWidth / BL.STAGE.w, window.innerHeight / BL.STAGE.h);
    stage.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  }

  /* ---------------- sonido / pantalla completa ---------------- */
  function toggleSound() {
    BL.state.sound = !BL.state.sound;
    saveState();
    BL.Sound.enabled = BL.state.sound;
    if (BL.state.sound) BL.Sound.play('click');
    return BL.state.sound;
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
      }
    } catch (e) { /* algunos navegadores lo bloquean */ }
    if (BL.ui && BL.ui.onFullscreenChange) BL.ui.onFullscreenChange();
  }

  /* ---------------- init ---------------- */
  function init() {
    BL.state = loadState();
    BL.Sound.enabled = BL.state.sound;
    refreshLives(false);
    updateHUD();
    fitStage();
    window.addEventListener('resize', fitStage);
    document.addEventListener('fullscreenchange', () => {
      if (BL.ui && BL.ui.onFullscreenChange) BL.ui.onFullscreenChange();
    });
    setInterval(() => {
      const gained = refreshLives(true);
      if (!gained) {
        updateHUD();
      }
    }, 1000);
  }

  BL.$ = $;
  BL.$$ = $$;
  BL.clamp = clamp;
  BL.fmtTime = fmtTime;
  BL.save = saveState;
  BL.refreshLives = refreshLives;
  BL.loseLife = loseLife;
  BL.updateHUD = updateHUD;
  BL.toast = toast;
  BL.fx = fx;
  BL.toggleSound = toggleSound;
  BL.toggleFullscreen = toggleFullscreen;
  BL.fitStage = fitStage;
  BL.ui = BL.ui || {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
