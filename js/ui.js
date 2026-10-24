/* ============================================================
   BOUTIQUE LUNA — pantallas, home, tienda y ventanas
   ============================================================ */

(function () {
  const BL = window.BL;
  const $ = BL.$;
  const $$ = BL.$$;
  const ui = BL.ui;
  const heart = BL.art.heartHTML;

  let currentPlayLevel = 1;

  /* ---------------- arranque ---------------- */
  function initUI() {
    // vestidos del splash
    const sd = $('#splashDresses');
    if (sd) {
      sd.innerHTML =
        BL.art.dressHTML('dots', { scale: 7 }) +
        BL.art.dressHTML('floral', { scale: 8 }) +
        BL.art.dressHTML('dots', { scale: 7 });
    }
    const mark = $('#brandMark');
    if (mark) mark.innerHTML = BL.art.iconHTML('heart', { scale: 5, color: '#ff6f9f' });
    const mascot = $('#mascot');
    if (mascot) {
      mascot.innerHTML = BL.art.charHTML(BL.PALETTE_ASSISTANT, {
        assistant: true,
        style: 4,
        emotion: 'happy',
        scale: 5
      });
    }
    $('#hud').classList.add('hidden');
    renderHome();

    $('#enterBtn').addEventListener('click', enterHome);
    $('#playBtn').addEventListener('click', playCurrent);
    $('#shopBtn').addEventListener('click', openShop);
    $('#homeMenuBtn').addEventListener('click', openMenu);
    $('#gameMenuBtn').addEventListener('click', openMenu);

    $('#levelCards').addEventListener('click', (e) => {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const id = Number(card.dataset.level);
      if (id > BL.state.unlocked) {
        BL.Sound.play('error');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        BL.toast('Completa el nivel ' + (id - 1) + ' para desbloquear este nivel.', 'error');
        return;
      }
      BL.Sound.play('click');
      if (BL.state.lives <= 0) { openNoLives(); return; }
      BL.play.startLevel(id);
    });

    const overlays = $('#overlays');
    overlays.addEventListener('click', onOverlayClick);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && BL.play && BL.play.isActive() && !BL.play.isEnding() && !isModalOpen()) {
        openMenu();
      }
    });
  }

  function enterHome() {
    BL.Sound.unlock();
    BL.Sound.play('click');
    const splash = $('#splash');
    splash.classList.add('closing');
    setTimeout(() => splash.classList.add('hidden'), 650);
    $('#hud').classList.remove('hidden');
    ui.screen = 'home';
    renderHome();
    // Pantalla completa a partir del gesto del usuario
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        const p = document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) { /* sin problema */ }
  }

  function playCurrent() {
    BL.Sound.play('click');
    if (BL.state.lives <= 0) { openNoLives(); return; }
    BL.play.startLevel(BL.state.unlocked);
  }

  /* ---------------- home ---------------- */
  function isAllComplete() {
    return BL.LEVELS.every(l => !!BL.state.completed[l.id]);
  }

  function totalStars() {
    return BL.LEVELS.reduce((acc, l) => acc + (BL.state.completed[l.id]?.stars || 0), 0);
  }

  function renderHome() {
    const s = BL.state;
    const allDone = isAllComplete();
    const current = allDone ? BL.LEVELS.length : Math.min(s.unlocked, BL.LEVELS.length);
    currentPlayLevel = current;
    const total = totalStars();

    const cardsEl = $('#levelCards');
    if (cardsEl) {
      cardsEl.innerHTML = BL.LEVELS.map((lv, idx) => {
        const done = !!s.completed[lv.id];
        const unlocked = lv.id <= s.unlocked;
        const isCurrent = lv.id === current && !allDone;
        const stars = done ? s.completed[lv.id].stars : 0;
        const dressType = lv.id % 2 ? 'dots' : 'floral';
        const classes = ['level-card'];
        if (isCurrent) classes.push('current');
        if (done) classes.push('done');
        if (!unlocked) classes.push('is-locked');
        const ribbons = [];
        if (isCurrent) ribbons.push('<div class="card-ribbon">Nivel actual</div>');
        else if (done) ribbons.push('<div class="card-ribbon">Completado</div>');
        const lock = !unlocked
          ? '<div class="card-lock">' + BL.ICONS.lock + '</div>'
          : done
            ? '<div class="card-check">✓</div>'
            : '';
        const starHtml = [1, 2, 3].map(n =>
          '<span class="' + (n <= stars ? 'star-on' : 'star-off') + '">★</span>'
        ).join('');
        return `<button class="${classes.join(' ')}" data-level="${lv.id}"
            style="--c1:${lv.colors[0]};--c2:${lv.colors[1]}"
            aria-label="Nivel ${lv.id}: ${lv.name}${unlocked ? '' : ' (bloqueado)'}">
          ${ribbons.join('')}
          <div class="card-art">
            <span class="card-num">Nivel ${lv.id}</span>
            ${lock}
            <div class="card-dress">${BL.art.dressHTML(dressType, { scale: 6 })}</div>
          </div>
          <div class="card-info">
            <h3>${lv.name}</h3>
            <p>${unlocked ? lv.clients + ' clientas · Ganá ' + lv.target + ' monedas' : 'Completa el nivel ' + (lv.id - 1)}</p>
            <div class="card-stars">${starHtml}</div>
          </div>
        </button>`;
      }).join('');
    }

    const starsEl = $('#totalStars');
    if (starsEl) starsEl.innerHTML = '<span class="star-ico">★</span><b>' + total + '</b><small>/15</small>';

    const playLabel = $('#playLabel');
    if (playLabel) playLabel.textContent = allDone ? 'Repetir Nivel 5' : 'Jugar Nivel ' + current;

    // mascota
    const bubble = $('#mascotBubble');
    if (bubble) {
      let title = '¡Hola! Soy Luna';
      let text = '¿Me ayudas con la tienda?';
      if (s.lives <= 0) {
        title = '¡Uy, sin vidas!';
        text = 'Esperá un ratito o comprá un corazón.';
      } else if (allDone) {
        title = '¡Sos una estrella!';
        text = 'Completaste toda la boutique.';
      } else if (current >= 4) {
        title = '¡Qué emoción!';
        text = 'Ya casi terminamos la colección.';
      } else if (current > 1) {
        title = '¡Hola de nuevo!';
        text = 'Seguimos vistiendo clientas.';
      }
      bubble.innerHTML = '<strong>' + title + '</strong><span>' + text + '</span>';
    }

    syncHomeLive();
  }

  function homeNoteHTML() {
    const s = BL.state;
    if (s.lives <= 0) {
      const left = s.nextLifeAt ? BL.fmtTime(Math.max(0, s.nextLifeAt - Date.now())) : '—';
      return '<span class="note-ico">💤</span> Sin vidas · Próxima en <span class="note-time">' + left + '</span>';
    }
    if (isAllComplete()) {
      return '<span class="note-ico">👑</span> ¡Completaste los 5 niveles! Podés repetir el que más te guste.';
    }
    if (s.unlocked > 1) {
      return '<span class="note-ico">✨</span> Vas por el nivel ' + s.unlocked + '. Cada vez falta menos para la gran gala.';
    }
    return '<span class="note-ico">✦</span> Toca una tarjeta para jugar. Gana monedas y mejora tu boutique.';
  }

  function syncHomeLive() {
    const s = BL.state;
    const note = $('#homeNote');
    if (note) {
      note.innerHTML = homeNoteHTML();
      note.classList.toggle('warn', s.lives <= 0);
    }
    const badge = $('#shopBadge');
    if (badge) {
      let count = 0;
      BL.UPGRADES.forEach(u => {
        const lvl = s.upgrades[u.id] || 0;
        if (lvl < u.max && s.coins >= u.prices[lvl]) count++;
      });
      if (s.lives < BL.MAX_LIVES && s.coins >= BL.HEART_PRICE) count++;
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  function onLivesChanged() {
    syncHomeLive();
  }

  /* ---------------- pantallas ---------------- */
  ui.showHome = function () {
    $('#game').classList.add('hidden');
    $('#home').classList.remove('hidden');
    $('#hud').classList.remove('hidden');
    ui.screen = 'home';
    renderHome();
  };

  ui.showGame = function () {
    $('#home').classList.add('hidden');
    $('#game').classList.remove('hidden');
    $('#hud').classList.remove('hidden');
    ui.screen = 'game';
  };

  ui.renderHome = renderHome;
  ui.syncHomeLive = syncHomeLive;
  ui.onLivesChanged = onLivesChanged;
  ui.playCurrent = playCurrent;

  /* ---------------- ventanas ---------------- */
  ui.isModalOpen = function () { return !!ui.modal; };
  ui.isModalOpen = isModalOpen;

  function isModalOpen() { return !!ui.modal; }

  function openModal(html, opts) {
    const o = opts || {};
    const wasPaused = ui.modalPaused;
    if (BL.play && BL.play.isActive() && !BL.play.isEnding()) {
      BL.play.pause();
      ui.modalPaused = true;
    } else {
      ui.modalPaused = wasPaused || false;
    }
    ui.modal = { type: o.type || '', closable: o.closable !== false, resume: o.resume !== false };
    const overlays = $('#overlays');
    overlays.innerHTML = html;
    overlays.classList.add('active');
    const backdrop = overlays.firstElementChild;
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop && ui.modal && ui.modal.closable) closeModal();
      });
    }
  }

  function closeModal(opts) {
    const o = opts || {};
    const shouldResume = o.resume !== false && ui.modalPaused;
    const overlays = $('#overlays');
    const backdrop = overlays.firstElementChild;
    ui.modal = null;
    ui.modalPaused = false;
    ui.confirmCb = null;
    ui.modalType = '';
    if (!backdrop) {
      overlays.classList.remove('active');
      if (shouldResume && BL.play) BL.play.resume();
      return;
    }
    if (o.instant) {
      overlays.innerHTML = '';
      overlays.classList.remove('active');
    } else {
      backdrop.classList.add('closing');
      setTimeout(() => {
        if (overlays.firstElementChild === backdrop) {
          overlays.innerHTML = '';
          overlays.classList.remove('active');
        }
      }, 220);
    }
    if (shouldResume && BL.play) BL.play.resume();
  }

  function onOverlayClick(e) {
    const close = e.target.closest('[data-close]');
    if (close) {
      BL.Sound.play('click');
      closeModal();
      return;
    }
    const menu = e.target.closest('[data-menu]');
    if (menu) { handleMenu(menu.dataset.menu); return; }
    const buy = e.target.closest('[data-buy]');
    if (buy) { buyUpgrade(buy.dataset.buy); return; }
    const confirm = e.target.closest('[data-confirm]');
    if (confirm) {
      const cb = ui.confirmCb;
      ui.confirmCb = null;
      closeModal({ instant: true, resume: false });
      if (cb) cb();
      return;
    }
    const shopNow = e.target.closest('[data-nolives-shop]');
    if (shopNow) {
      openShopFromNoLives();
      return;
    }
    const playNow = e.target.closest('[data-nolives-play]');
    if (playNow) {
      if (BL.state.lives <= 0) {
        BL.Sound.play('error');
        BL.toast('Todavía no tenés vidas. La próxima está en camino.', 'error');
        return;
      }
      closeModal({ instant: true, resume: false });
      if (BL.play && BL.play.isActive()) BL.play.quit();
      BL.play.startLevel(BL.state.unlocked);
      return;
    }
  }

  ui.openModal = openModal;
  ui.closeModal = closeModal;

  /* ---------------- menú ---------------- */
  function menuItem(action, icon, title, sub, cls) {
    return `<button class="menu-item ${cls || ''}" data-menu="${action}">
      <span class="mi-ico">${icon}</span>
      <span class="mi-copy"><b>${title}</b><small>${sub}</small></span>
      <span class="mi-chev">›</span>
    </button>`;
  }

  function openMenu() {
    const inGame = BL.play && BL.play.isActive();
    const full = !!document.fullscreenElement;
    const soundOn = BL.state.sound;
    const items = [];
    if (inGame) items.push(menuItem('resume', '▶', 'Reanudar', 'Volver a la tienda'));
    items.push(menuItem('howto', '📖', 'Cómo jugar', 'Los pasos para atender mejor'));
    if (inGame) items.push(menuItem('restart', '🔄', 'Reiniciar nivel', 'Empezar este nivel de nuevo', 'soft'));
    if (!inGame) items.push(menuItem('shop', '🛍️', 'Tienda de mejoras', 'Gastar monedas en mejoras', 'alt'));
    items.push(menuItem('sound', soundOn ? '🔊' : '🔇', 'Sonido', soundOn ? 'Activado' : 'Silenciado', 'alt'));
    items.push(menuItem('fullscreen', '⛶', 'Pantalla completa', full ? 'Activada' : 'Desactivada', 'soft'));
    if (inGame) items.push(menuItem('home', '🏠', 'Ir al inicio', 'Salir de este nivel'));

    openModal(`<div class="modal-backdrop">
      <div class="modal menu-modal" role="dialog" aria-modal="true" aria-label="Menú">
        <button class="modal-close" data-close aria-label="Cerrar menú">×</button>
        <div class="modal-head">
          <span class="kicker">Boutique Luna</span>
          <h2>Menú</h2>
          <p>Tomate un descanso. La tienda te espera.</p>
        </div>
        <div class="modal-body">
          <div class="menu-list">${items.join('')}</div>
        </div>
        <div class="modal-foot">
          <span class="menu-version">Se juega con el mouse · v1.0</span>
        </div>
      </div>
    </div>`, { type: 'menu', closable: true });
  }

  function handleMenu(action) {
    switch (action) {
      case 'resume':
        BL.Sound.play('click');
        closeModal();
        break;
      case 'howto':
        BL.Sound.play('click');
        openHowTo();
        break;
      case 'shop':
        BL.Sound.play('click');
        openShop();
        break;
      case 'sound': {
        const on = BL.toggleSound();
        BL.toast(on ? 'Sonido activado' : 'Sonido silenciado', 'info');
        openMenu();
        break;
      }
      case 'fullscreen':
        BL.Sound.play('click');
        BL.toggleFullscreen();
        break;
      case 'restart':
        BL.Sound.play('click');
        openConfirm({
          icon: '🔄',
          title: '¿Reiniciar el nivel?',
          message: 'Vas a empezar este nivel desde cero. Las monedas que ya ganaste quedan guardadas.',
          confirmLabel: 'Sí, reiniciar',
          onConfirm: () => {
            if (BL.play) BL.play.restart();
          }
        });
        break;
      case 'home':
        BL.Sound.play('click');
        if (BL.play && BL.play.isActive()) {
          openConfirm({
            icon: '🏠',
            title: '¿Volver al inicio?',
            message: 'Vas a dejar este nivel. Las monedas que ya ganaste quedan guardadas.',
            confirmLabel: 'Sí, salir',
            onConfirm: () => { if (BL.play) BL.play.quit(); }
          });
        } else {
          closeModal();
        }
        break;
      default:
        break;
    }
  }

  function onFullscreenChange() {
    const item = $('[data-menu="fullscreen"] .mi-copy small');
    if (item) item.textContent = document.fullscreenElement ? 'Activada' : 'Desactivada';
  }
  ui.onFullscreenChange = onFullscreenChange;

  /* ---------------- cómo jugar ---------------- */
  function openHowTo() {
    openModal(`<div class="modal-backdrop">
      <div class="modal howto-modal" role="dialog" aria-modal="true" aria-label="Cómo jugar">
        <button class="modal-close" data-close aria-label="Cerrar">×</button>
        <div class="modal-head">
          <span class="kicker">Manual de la dependienta</span>
          <h2>Cómo jugar</h2>
          <p>Todo se hace con clics. Luna camina sola hasta donde la mandes.</p>
        </div>
        <div class="modal-body">
          <div class="steps-grid">
            <div class="step-card">
              <div class="step-num">1</div>
              <div class="step-copy"><h4>Clienta y probador</h4><p>Los números marcan el orden: <b>1</b> clienta, <b>2</b> probador, <b>3</b> vestido, <b>4</b> entrega, <b>5</b> caja y <b>6</b> bandeja. Terminá un paso antes de empezar el siguiente.</p></div>
            </div>
            <div class="step-card">
              <div class="step-num">2</div>
              <div class="step-copy"><h4>Mirá su ícono</h4><p>El reloj rodea el ícono del pedido, no a la clienta. Buscá ese vestido en el perchero de lunares o de flores.</p></div>
            </div>
            <div class="step-card">
              <div class="step-num">3</div>
              <div class="step-copy"><h4>Entregá de a uno</h4><p>Con el vestido en la mano, toca a la clienta o su probador. Mientras se prueba, el probador queda <b>cerrado</b> y la barra de la cortina marca los 5 segundos.</p></div>
            </div>
            <div class="step-card">
              <div class="step-num">4</div>
              <div class="step-copy"><h4>Cobrá en la caja</h4><p>Cuando termine de probarse todo, camina a la caja. Tocala para cobrar: el cobro tarda 5 segundos y Luna <b>no puede dejar la caja</b> hasta terminar.</p></div>
            </div>
          </div>
          <div class="rules-box">
            <div class="rule"><span class="r-ico">⏱️</span><span><b>20 segundos por pedido.</b> El reloj redondo rodea el ícono del pedido y marca la paciencia, también al asignar probador y al cobrar.</span></div>
            <div class="rule"><span class="r-ico">✋</span><span>Podés llevar <b>hasta 2 vestidos</b>. En la bandeja de abajo a la derecha, tocá <b>cada vestido</b> para que Luna lo lleve directo a su perchero. Ya no se tiran al piso.</span></div>
            <div class="rule"><span class="r-ico red">💔</span><span>Si una clienta se va enojada, se va sin pagar, pero <b>no pierdes una vida</b>. Solo pierdes <b>1 vida</b> al perder el nivel.</span></div>
            <div class="rule"><span class="r-ico">❤️</span><span>Tenés hasta <b>5 vidas</b>. Cada vida vuelve sola cada <b>5 minutos</b>.</span></div>
          </div>
          <div class="shop-note" style="margin-top:13px">
            <span class="n-ico">🛍️</span>
            <span><b>Consejo:</b> ganá monedas atendiendo clientas y gastalas en la tienda de mejoras del inicio.</span>
          </div>
        </div>
        <div class="modal-foot" style="justify-content:center">
          <button class="btn btn-soft" data-close style="min-height:58px;font-size:19px">¡Entendido!</button>
        </div>
      </div>
    </div>`, { type: 'howto', closable: true });
  }

  ui.openMenu = openMenu;
  ui.openHowTo = openHowTo;

  /* ---------------- tienda ---------------- */
  function pipsFor(level, max) {
    let out = '';
    for (let i = 0; i < max; i++) out += '<span class="pip ' + (i < level ? 'on' : '') + '"></span>';
    return '<span class="pips">' + out + '<span class="pip-label">nivel ' + level + '/' + max + '</span></span>';
  }

  function shopInner() {
    const s = BL.state;
    const cards = BL.UPGRADES.map(u => {
      const lvl = s.upgrades[u.id] || 0;
      const maxed = lvl >= u.max;
      const price = maxed ? 0 : u.prices[lvl];
      const can = !maxed && s.coins >= price;
      let btn;
      if (maxed) btn = '<span class="price-btn sold">Máximo</span>';
      else if (!can) btn = '<span class="price-btn poor"><span class="mini-coin"></span>' + price + '</span>';
      else btn = '<button class="price-btn" data-buy="' + u.id + '"><span class="mini-coin"></span>' + price + '</button>';
      return `<div class="shop-card ${maxed ? 'is-max' : ''}">
        <div class="shop-ico">${u.icon}</div>
        <div class="shop-info">
          <h4>${u.name}</h4>
          <p>${u.desc}</p>
          ${pipsFor(lvl, u.max)}
        </div>
        ${btn}
      </div>`;
    }).join('');

    const fullLives = s.lives >= BL.MAX_LIVES;
    const canHeart = !fullLives && s.coins >= BL.HEART_PRICE;
    const heartBtn = fullLives
      ? '<span class="price-btn sold">Lleno</span>'
      : canHeart
        ? '<button class="price-btn" data-buy="heart"><span class="mini-coin"></span>' + BL.HEART_PRICE + '</button>'
        : '<span class="price-btn poor"><span class="mini-coin"></span>' + BL.HEART_PRICE + '</span>';
    const heartsRow = Array.from({ length: BL.MAX_LIVES }, (_, i) =>
      BL.art.iconHTML('heart', { scale: 1.5, color: i < s.lives ? '#ff6f9f' : '#f0d7e1' })
    ).join('');

    return `<div class="modal-head shop-head">
        <div>
          <span class="kicker">Con tus monedas</span>
          <h2>Tienda de mejoras</h2>
          <p>Cositas lindas para que atender sea más fácil.</p>
        </div>
        <div class="wallet-pill">${BL.art.coinHTML(2)}${s.coins}</div>
      </div>
      <div class="modal-body">
        <div class="shop-grid">
          ${cards}
          <div class="shop-card heart-card">
            <div class="shop-ico">❤️</div>
            <div class="shop-info">
              <h4>Corazón extra</h4>
              <p>Recupera 1 vida al instante. Solo si te quedan menos de 5.</p>
              <div style="display:flex;align-items:center;gap:4px;margin-top:6px">${heartsRow}<span style="font-size:14px;color:var(--ink-soft);margin-left:4px">${s.lives}/${BL.MAX_LIVES} vidas</span></div>
            </div>
            ${heartBtn}
          </div>
        </div>
        <div class="shop-note">
          <span class="n-ico">✨</span>
          <span><b>Las mejoras son permanentes.</b> Se aplican a todos los niveles y se guardan solas. Las monedas se ganan atendiendo clientas.</span>
        </div>
      </div>
      <div class="modal-foot">
        <span class="menu-version">Se guarda automáticamente</span>
        <button class="btn btn-soft" data-close style="min-height:52px;font-size:17px;padding:0 22px;border-radius:16px">Listo</button>
      </div>`;
  }

  function openShop() {
    openModal(`<div class="modal-backdrop">
      <div class="modal shop-modal" role="dialog" aria-modal="true" aria-label="Tienda de mejoras">
        <button class="modal-close" data-close aria-label="Cerrar tienda">×</button>
        ${shopInner()}
      </div>
    </div>`, { type: 'shop', closable: true });
    BL.Sound.play('click');
  }

  function refreshShop() {
    const modal = $('.shop-modal');
    if (!modal) return;
    modal.innerHTML = '<button class="modal-close" data-close aria-label="Cerrar tienda">×</button>' + shopInner();
  }

  function buyUpgrade(id) {
    const s = BL.state;
    if (id === 'heart') {
      if (s.lives >= BL.MAX_LIVES) {
        BL.Sound.play('error');
        BL.toast('Ya tenés todas las vidas.', 'error');
        return;
      }
      if (s.coins < BL.HEART_PRICE) {
        BL.Sound.play('error');
        BL.toast('Te faltan ' + (BL.HEART_PRICE - s.coins) + ' monedas.', 'error');
        return;
      }
      s.coins -= BL.HEART_PRICE;
      s.lives = Math.min(BL.MAX_LIVES, s.lives + 1);
      if (s.lives >= BL.MAX_LIVES) s.nextLifeAt = null;
      BL.save();
      BL.Sound.play('buy');
      BL.toast('¡Recuperaste una vida!', 'success');
      BL.updateHUD(true);
      refreshShop();
      renderHome();
      return;
    }
    const up = BL.UPGRADES.find(u => u.id === id);
    if (!up) return;
    const lvl = s.upgrades[id] || 0;
    if (lvl >= up.max) { BL.Sound.play('error'); return; }
    const price = up.prices[lvl];
    if (s.coins < price) {
      BL.Sound.play('error');
      BL.toast('Te faltan ' + (price - s.coins) + ' monedas.', 'error');
      return;
    }
    s.coins -= price;
    s.upgrades[id] = lvl + 1;
    BL.save();
    BL.Sound.play('buy');
    BL.toast('¡Mejora comprada: ' + up.name + '!', 'success');
    BL.updateHUD();
    refreshShop();
    renderHome();
  }

  ui.openShop = openShop;

  function openShopFromNoLives() {
    closeModal({ instant: true, resume: false });
    if (BL.play && BL.play.isActive()) BL.play.quit();
    ui.showHome();
    setTimeout(() => openShop(), 80);
  }

  /* ---------------- confirmación ---------------- */
  function openConfirm(opts) {
    const o = opts || {};
    ui.confirmCb = o.onConfirm || null;
    openModal(`<div class="modal-backdrop">
      <div class="modal confirm-modal" role="dialog" aria-modal="true">
        <div class="confirm-ico">${o.icon || '✨'}</div>
        <h2>${o.title || '¿Estás segura?'}</h2>
        <p>${o.message || ''}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-close>Cancelar</button>
          <button class="btn" data-confirm>${o.confirmLabel || 'Sí'}</button>
        </div>
      </div>
    </div>`, { type: 'confirm', closable: true, resume: false });
  }

  ui.openConfirm = openConfirm;

  /* ---------------- sin vidas ---------------- */
  function openNoLives() {
    const s = BL.state;
    if (s.lives > 0) {
      // por si acaso, dejamos jugar
      if (BL.play && !BL.play.isActive()) BL.play.startLevel(s.unlocked);
      return;
    }
    const left = s.nextLifeAt ? BL.fmtTime(Math.max(0, s.nextLifeAt - Date.now())) : '—';
    openModal(`<div class="modal-backdrop">
      <div class="modal nolives-modal" role="dialog" aria-modal="true" aria-label="Sin vidas">
        <button class="modal-close" data-close aria-label="Cerrar">×</button>
        <div class="nolives-heart">${BL.art.iconHTML('heart', { scale: 7, color: '#d9a6b6' })}</div>
        <span class="kicker">Un ratito de descanso</span>
        <h2>Sin vidas por ahora</h2>
        <p>Las vidas vuelven solas cada 5 minutos. También podés comprar un corazón con tus monedas.</p>
        <div class="countdown-big"><span class="js-countdown">${left}</span><small>próxima vida</small></div>
        <div class="nolives-actions">
          <button class="btn btn-soft" data-nolives-shop>🛍️ Ir a la tienda</button>
          <button class="btn" data-nolives-play>Jugar ahora</button>
        </div>
      </div>
    </div>`, { type: 'nolives', closable: true });
    BL.Sound.play('error');
  }

  ui.openNoLives = openNoLives;

  /* ---------------- init ---------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
