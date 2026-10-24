/* ============================================================
   BOUTIQUE LUNA — partida pixel
   ============================================================ */

(function () {
  'use strict';

  const BL = window.BL;
  const $ = BL.$;
  const ART = BL.ART;
  const ROOM = BL.ROOM;
  const S = ART.scale;

  let game = null;
  let raf = 0;
  let canvas = null;
  let ctx = null;

  /* ============================================================
     Utilidades
     ============================================================ */
  function clamp(v, a, b) { return BL.clamp(v, a, b); }
  function teaBonus() { return (BL.state.upgrades.tea || 0) * 4; }
  function clientTime() { return BL.CLIENT_TIME + teaBonus(); }
  function registerLevel() { return BL.state.upgrades.register || 0; }
  function payTime() { return Math.max(3, BL.CHARGE_TIME - registerLevel()); }
  function tipLevel() { return BL.state.upgrades.tip || 0; }
  function playerSpeed() { return 84 * (1 + 0.2 * (BL.state.upgrades.shoes || 0)); }
  function clientSpeed() { return 58; }
  function amountFor(c) { return c.order.length * BL.COINS_PER_DRESS + tipLevel(); }
  function modalOpen() { return !!(BL.ui && BL.ui.isModalOpen && BL.ui.isModalOpen()); }
  function clientById(id) { return game ? game.clients.find(c => c.id === id) : null; }
  function roomClient(room) { return room && room.clientId ? clientById(room.clientId) : null; }
  function activeStates() {
    return ['walkingIn', 'waiting', 'toRoom', 'inRoom', 'toPay', 'waitingPay', 'paying'];
  }
  function isActiveClient(c) { return activeStates().indexOf(c.state) >= 0; }
  function freeRoom() { return game ? game.rooms.find(r => r.state === 'free') : null; }
  function after(seconds, fn) {
    if (!game) return;
    game.delays.push({ t: game.time + Math.max(0, seconds), fn });
  }
  function runDelays() {
    if (!game || !game.delays.length) return;
    const due = [];
    game.delays = game.delays.filter(d => {
      if (d.t <= game.time) { due.push(d); return false; }
      return true;
    });
    due.forEach(d => { try { d.fn(); } catch (e) { console.error(e); } });
  }

  /* ============================================================
     Partida
     ============================================================ */
  function createGame(levelId) {
    const level = BL.LEVELS[levelId - 1];
    return {
      active: true,
      started: false,
      paused: true,
      ending: null,
      failReason: null,
      time: 0,
      lastT: 0,
      level,
      levelId,
      clients: [],
      nextId: 1,
      spawned: 0,
      spawnTimer: 1.2,
      earned: 0,
      angry: 0,
      paid: 0,
      selectedId: null,
      everAssigned: false,
      rooms: ROOM.cabins.map((_, i) => ({ index: i, state: 'free', clientId: null })),
      floorItems: [],
      nextItemId: 1,
      delays: [],
      checkTimer: 0.3,
      hintKey: '',
      flash: null,
      hover: null,
      charge: null,
      trayFlash: 0,
      paletteBag: [],
      player: {
        x: ROOM.playerStart.x,
        y: ROOM.playerStart.y,
        tx: ROOM.playerStart.x,
        ty: ROOM.playerStart.y,
        walking: false,
        cmd: null,
        queue: [],
        onArrive: null,
        carry: []
      }
    };
  }

  function startLevel(levelId) {
    if (!BL.state || BL.state.lives <= 0) {
      if (game) { cleanup(); BL.ui.showHome(); }
      BL.ui.openNoLives();
      return;
    }
    levelId = clamp(Number(levelId) || 1, 1, BL.LEVELS.length);
    BL.ui.closeModal({ instant: true, resume: false });
    cleanup();
    BL.ui.showGame();
    BL.updateHUD();
    game = createGame(levelId);
    const goalCoin = $('#goalCoin');
    if (goalCoin) goalCoin.src = BL.art.dataURL(BL.art.iconSprite('coin'), 'coin');
    $('#levelChipName').textContent = 'Nivel ' + levelId + ' · ' + game.level.name;
    updateGoal();
    updateHandsLabel();
    refreshHint(true);
    render();
    openIntro();
  }

  function cleanup() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (game) {
      game.active = false;
      game = null;
    }
    const tutor = $('#tutorialPointer');
    if (tutor) tutor.classList.add('hidden');
    if (ctx) ctx.clearRect(0, 0, ART.w, ART.h);
  }

  function openIntro() {
    const lv = game.level;
    const html = `<div class="modal-backdrop intro-backdrop">
      <div class="modal intro-modal" role="dialog" aria-modal="true" aria-label="Nivel ${lv.id}">
        <div class="intro-ribbon">Nivel ${lv.id} de ${BL.LEVELS.length}</div>
        <h2>${lv.name}</h2>
        <p class="intro-sub">${lv.subtitle}</p>
        <div class="intro-stats">
          <div class="stat"><div class="s-ico">${BL.art.charHTML(BL.CLIENTS[0], { style: 0, scale: 2 })}</div><b>${lv.clients}</b><small>clientas</small></div>
          <div class="stat gold"><div class="s-ico">${BL.art.coinHTML(3)}</div><b>${lv.target}</b><small>monedas para ganar</small></div>
        </div>
        <button class="btn" data-intro-start>¡Empezar!</button>
      </div>
    </div>`;
    BL.ui.openModal(html, { type: 'intro', closable: false, resume: false });
  }

  function beginPlay() {
    if (!game || game.started || game.ending) return;
    BL.Sound.play('level');
    BL.ui.closeModal({ resume: false });
    game.started = true;
    game.spawnTimer = 0.8;
    game.lastT = performance.now();
    game.paused = false;
    raf = requestAnimationFrame(loop);
    refreshHint(true);
    updateTutorial();
  }

  function pauseGame() {
    if (!game || !game.active) return;
    game.paused = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function resumeGame() {
    if (!game || !game.active || !game.started || game.ending) return;
    if (!game.paused) return;
    game.paused = false;
    game.lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function quitGame() {
    cleanup();
    BL.ui.closeModal({ instant: true, resume: false });
    BL.ui.showHome();
    BL.updateHUD();
  }

  function restartGame() {
    if (!game) return;
    startLevel(game.level.id);
  }

  function loop(t) {
    if (!game || !game.active || game.paused) return;
    const dt = Math.min(0.05, Math.max(0, (t - (game.lastT || t)) / 1000));
    game.lastT = t;
    update(dt);
    if (game && game.active && !game.paused) raf = requestAnimationFrame(loop);
  }

  /* ============================================================
     Clientes
     ============================================================ */
  function takePalette() {
    if (!game.paletteBag.length) {
      const bag = BL.CLIENTS.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
      }
      game.paletteBag = bag;
    }
    return BL.CLIENTS[game.paletteBag.pop()];
  }

  function buildOrder(count) {
    const order = [];
    if (count >= 2) order.push('dots', 'floral');
    while (order.length < count) order.push(Math.random() < 0.5 ? 'dots' : 'floral');
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    return order;
  }

  function freeWaitSpot() {
    const used = new Set();
    game.clients.forEach(c => { if (c.spotIndex != null && c.state !== 'done') used.add(c.spotIndex); });
    for (let i = 0; i < ROOM.waiting.length; i++) if (!used.has(i)) return i;
    return -1;
  }

  function spawnClient() {
    if (!game || game.ending) return;
    const data = takePalette();
    const count = game.level.dresses[game.spawned] || 2;
    let spotIndex = freeWaitSpot();
    if (spotIndex < 0) spotIndex = game.spawned % ROOM.waiting.length;
    const spot = ROOM.waiting[spotIndex];
    const c = {
      id: game.nextId++,
      name: data.name,
      palette: data,
      style: game.spawned % 4,
      order: buildOrder(count),
      pending: [],
      state: 'walkingIn',
      x: ROOM.spawn.x,
      y: ROOM.spawn.y,
      tx: spot.x,
      ty: spot.y,
      walking: true,
      timeLeft: 0,
      timeMax: clientTime(),
      tryLeft: 0,
      tryTotal: BL.TRY_ON,
      trying: null,
      emotion: 'happy',
      roomIndex: null,
      spotIndex,
      paySpotIndex: null,
      payAt: 0
    };
    c.pending = c.order.slice();
    game.clients.push(c);
    game.spawned++;
    BL.Sound.play('bell');
    refreshHint(true);
  }

  function renderClientSprite(c) {
    return BL.art.characterSprite(c.palette, { style: c.style, emotion: c.emotion });
  }

  function updateClients(dt) {
    if (!game) return;
    game.clients.forEach(c => {
      if (c.state === 'walkingIn' || c.state === 'toRoom' || c.state === 'toPay' ||
          c.state === 'leaving' || c.state === 'angry') {
        const done = stepMove(c, clientSpeed(), dt);
        c.walking = !done;
        if (done) onClientArrive(c);
      } else {
        c.walking = false;
      }
      if (!game || !c) return;

      if (c.tryLeft > 0) {
        c.tryLeft = Math.max(0, c.tryLeft - dt);
        if (c.tryLeft <= 0) completeTryOn(c);
        return;
      }
      const ticking = c.state === 'waiting' ||
        (c.state === 'inRoom' && c.pending.length > 0) ||
        c.state === 'waitingPay';
      if (ticking) {
        c.timeLeft -= dt;
        if (c.timeLeft <= 0) timeOutClient(c);
      }
    });
    game.clients = game.clients.filter(c => c.state !== 'done');
  }

  function stepMove(o, speed, dt) {
    const dx = o.tx - o.x;
    const dy = o.ty - o.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) { o.x = o.tx; o.y = o.ty; return true; }
    const step = Math.min(dist, speed * dt);
    o.x += (dx / dist) * step;
    o.y += (dy / dist) * step;
    return false;
  }

  function onClientArrive(c) {
    if (!game) return;
    if (c.state === 'walkingIn') {
      c.state = 'waiting';
      c.walking = false;
      c.timeLeft = c.timeMax;
      c.emotion = 'happy';
      BL.Sound.play('bell');
      refreshHint(true);
      return;
    }
    if (c.state === 'toRoom') {
      enterRoom(c);
      return;
    }
    if (c.state === 'toPay') {
      c.state = 'waitingPay';
      c.walking = false;
      c.timeLeft = c.timeMax;
      c.emotion = 'happy';
      BL.Sound.play('bell');
      refreshHint(true);
      return;
    }
    if (c.state === 'leaving' || c.state === 'angry') {
      c.state = 'done';
      if (c.spotIndex != null) c.spotIndex = null;
      if (c.paySpotIndex != null) c.paySpotIndex = null;
    }
  }

  function enterRoom(c) {
    const room = c.roomIndex == null ? null : game.rooms[c.roomIndex];
    if (!room || c.state !== 'toRoom') return;
    const stand = ROOM.clientStand[c.roomIndex];
    c.x = stand.x;
    c.y = stand.y;
    c.state = 'inRoom';
    c.walking = false;
    c.timeLeft = c.timeMax;
    c.emotion = 'happy';
    room.state = 'occupied';
    room.clientId = c.id;
    BL.Sound.play('curtain');
    flashHint('¡' + c.name + ' quiere un vestido de ' + BL.DRESSES[c.pending[0]].name.toLowerCase() + '!', '👗');
    refreshHint(true);
  }

  function timeOutClient(c) {
    if (!game || game.ending || !c) return;
    if (c.state === 'walkingIn' || c.state === 'toRoom' || c.state === 'leaving' || c.state === 'done') return;
    const wasRoom = c.roomIndex;
    c.state = 'angry';
    c.emotion = 'angry';
    c.timeLeft = 0;
    c.tryLeft = 0;
    c.trying = null;
    c.pending = [];
    c.walking = true;
    c.tx = ROOM.exit.x;
    c.ty = ROOM.exit.y;
    if (wasRoom != null) {
      const room = game.rooms[wasRoom];
      if (room && room.clientId === c.id) {
        room.state = 'free';
        room.clientId = null;
      }
    }
    c.roomIndex = null;
    if (c.paySpotIndex != null) c.paySpotIndex = null;
    if (game.selectedId === c.id) game.selectedId = null;
    game.angry++;
    BL.Sound.play('error');
    BL.toast(c.name + ' se fue enojada', 'error');
    flashHint('¡' + c.name + ' se cansó de esperar y se fue!', '💔');
    checkEnd();
  }

  /* ============================================================
     Luna (jugadora)
     ============================================================ */
  function playerAt(x, y) {
    return Math.hypot(game.player.x - x, game.player.y - y) < 2;
  }

  function enqueue(cmd) {
    if (!game || game.ending || !game.started || modalOpen()) return false;
    const p = game.player;
    if (game.charge) {
      flashHint('Luna está cobrando. No puede dejar la caja hasta terminar.', '💳');
      return false;
    }
    if (p.cmd || p.queue.length) {
      flashHint('Terminá la acción actual antes de empezar la siguiente.', '✋');
      return false;
    }
    startCommand(cmd);
    return true;
  }

  function startCommand(cmd) {
    const p = game.player;
    p.cmd = cmd;
    p.onArrive = null;
    let target = null;

    if (cmd.type === 'take') {
      const rack = ROOM.racks[cmd.rack];
      target = { x: rack.x + rack.w / 2, y: ROOM.wallH + 10 };
      p.onArrive = () => {
        if (p.carry.length >= 2) {
          flashHint('Tenés las manos llenas. Llevá algo a un perchero.', '✋');
          return finishCommand();
        }
        p.carry.push(rack.type);
        BL.Sound.play('pick');
        flashHint('Vestido de ' + BL.DRESSES[rack.type].name.toLowerCase() + ' en mano.', '👗');
        updateHandsLabel();
        finishCommand();
      };
    } else if (cmd.type === 'hang') {
      const rack = ROOM.racks[cmd.rack];
      target = { x: rack.x + rack.w / 2, y: ROOM.wallH + 10 };
      p.onArrive = () => {
        const keep = [];
        const back = [];
        if (cmd.itemIndex != null) {
          const itemIndex = cmd.itemIndex;
          if (itemIndex < 0 || itemIndex >= p.carry.length || p.carry[itemIndex] !== rack.type) {
            BL.Sound.play('error');
            flashHint('Ese vestido ya no está en la bandeja.', '👀');
            return finishCommand();
          }
          back.push(p.carry[itemIndex]);
          p.carry.splice(itemIndex, 1);
        } else {
          p.carry.forEach(t => { if (t === rack.type) back.push(t); else keep.push(t); });
          if (!back.length) {
            BL.Sound.play('error');
            flashHint('En este perchero van los vestidos de ' + BL.DRESSES[rack.type].name.toLowerCase() + '.', '👀');
            return finishCommand();
          }
          p.carry = keep;
        }
        BL.Sound.play('hang');
        flashHint(back.length === 1 ? 'Dejaste el vestido en su perchero.' : 'Dejaste los vestidos en su perchero.', '✅');
        updateHandsLabel();
        finishCommand();
      };
    } else if (cmd.type === 'deliver') {
      const roomIndex = cmd.roomIndex;
      const dest = ROOM.deliver[roomIndex];
      target = { x: dest.x, y: dest.y };
      p.onArrive = () => {
        deliverToRoom(roomIndex);
        finishCommand();
      };
    } else if (cmd.type === 'pay') {
      target = { x: ROOM.register.x - 12, y: ROOM.register.y + 20 };
      p.onArrive = () => {
        startCharge();
        finishCommand();
      };
    } else if (cmd.type === 'pickup') {
      const item = game.floorItems.find(it => it.id === cmd.itemId);
      if (!item) return finishCommand();
      target = { x: item.x, y: item.y };
      p.onArrive = () => {
        const it = game.floorItems.find(x => x.id === cmd.itemId);
        if (!it) return finishCommand();
        if (p.carry.length >= 2) {
          flashHint('Tenés las manos llenas.', '✋');
          return finishCommand();
        }
        p.carry.push(it.type);
        game.floorItems = game.floorItems.filter(x => x.id !== it.id);
        BL.Sound.play('pick');
        updateHandsLabel();
        flashHint('Levantaste el vestido de ' + BL.DRESSES[it.type].name.toLowerCase() + '.', '👗');
        finishCommand();
      };
    }

    if (!target) return finishCommand();
    p.tx = target.x;
    p.ty = target.y;
    if (playerAt(target.x, target.y)) {
      p.walking = false;
      const cb = p.onArrive; p.onArrive = null;
      if (cb) cb();
      return;
    }
    p.walking = true;
    refreshHint(false);
  }

  function finishCommand() {
    if (!game) return;
    const p = game.player;
    p.cmd = null;
    p.onArrive = null;
    p.walking = false;
    if (p.queue.length) {
      const next = p.queue.shift();
      startCommand(next);
    } else {
      refreshHint(true);
    }
  }

  function updatePlayer(dt) {
    const p = game.player;
    if (!p.walking) return;
    const done = stepMove(p, playerSpeed(), dt);
    if (done) {
      p.walking = false;
      const cb = p.onArrive;
      p.onArrive = null;
      if (cb) cb();
    }
  }

  function updateHandsLabel() {
    if (!game) return;
    const el = $('#handsLabel');
    if (!el) return;
    const n = game.player.carry.length;
    const step = computeStep();
    const showStep = !!(step && step.n === 6);
    const key = n + '|' + (showStep ? '6' : '');
    if (el.dataset.key !== key) {
      el.dataset.key = key;
      el.innerHTML = (showStep ? '<span class="hands-step">6</span>' : '') + 'Manos ' + n + '/2';
    }
    el.classList.toggle('full', n >= 2);
  }

  /* ============================================================
     Entregas, probador y caja
     ============================================================ */
  function deliverToRoom(roomIndex) {
    if (!game || game.ending) return;
    const room = game.rooms[roomIndex];
    const c = roomClient(room);
    const p = game.player;
    if (!p.carry.length) return;
    if (!c || c.state !== 'inRoom' || !c.pending.length) {
      flashHint('Ese probador no tiene un pedido pendiente.', '👗');
      return;
    }
    if (c.tryLeft > 0) {
      flashHint(c.name + ' se está probando. Esperá un momento.', '⏳');
      return;
    }
    const want = c.pending[0];
    const at = p.carry.indexOf(want);
    if (at < 0) {
      BL.Sound.play('error');
      flashHint('Esa clienta pidió ' + BL.DRESSES[want].name.toLowerCase() + '. Mirá su ícono.', '👀');
      return;
    }
    p.carry.splice(at, 1);
    updateHandsLabel();
    c.trying = want;
    c.pending.shift();
    c.tryLeft = BL.TRY_ON;
    c.tryTotal = BL.TRY_ON;
    BL.Sound.play('deliver');
    BL.fx.hearts(c.x * S, (c.y - 26) * S, 5);
    flashHint(c.name + ' se está probando el vestido…', '👗');
    refreshHint(true);
  }

  function completeTryOn(c) {
    if (!game || !c || c.state !== 'inRoom') return;
    c.trying = null;
    BL.Sound.play('bell');
    if (c.pending.length) {
      c.timeLeft = c.timeMax;
      c.emotion = 'happy';
      flashHint('¡Le encantó! Ahora ' + c.name + ' quiere ' + BL.DRESSES[c.pending[0]].name.toLowerCase() + '.', '✨');
      refreshHint(true);
    } else {
      finishOrder(c);
    }
  }

  function finishOrder(c) {
    if (!c || c.state !== 'inRoom') return;
    const room = game.rooms[c.roomIndex];
    if (room && room.clientId === c.id) {
      room.state = 'free';
      room.clientId = null;
    }
    c.roomIndex = null;
    c.state = 'ready';
    c.emotion = 'happy';
    c.timeLeft = c.timeMax;
    BL.Sound.play('bell');
    BL.fx.hearts(c.x * S, (c.y - 26) * S, 7);
    flashHint('¡' + c.name + ' terminó! Ahora va a la caja.', '💳');
    after(0.7, () => {
      if (!game || !c || c.state !== 'ready') return;
      c.state = 'toPay';
      c.payAt = game.time;
      c.walking = true;
      assignPaySpot(c);
      BL.Sound.play('curtain');
      refreshHint(true);
    });
    refreshHint(true);
  }

  function assignPaySpot(c) {
    const used = new Set();
    game.clients.forEach(o => { if (o.paySpotIndex != null && o.state !== 'done') used.add(o.paySpotIndex); });
    let idx = -1;
    for (let i = 0; i < ROOM.pay.length; i++) if (!used.has(i)) { idx = i; break; }
    if (idx < 0) idx = c.id % ROOM.pay.length;
    c.paySpotIndex = idx;
    const spot = ROOM.pay[idx];
    c.tx = spot.x;
    c.ty = spot.y;
  }

  function payQueue() {
    if (!game) return [];
    return game.clients
      .filter(c => c.state === 'waitingPay' || c.state === 'paying' || c.state === 'toPay')
      .sort((a, b) => (a.payAt || 0) - (b.payAt || 0) || a.id - b.id);
  }

  function nextPayClient() {
    const q = payQueue();
    return q.length && q[0].state === 'waitingPay' ? q[0] : null;
  }

  /* ============================================================
     Pasos numerados y acciones secuenciales
     ============================================================ */
  function waitingClients() {
    return game.clients
      .filter(c => c.state === 'waiting')
      .slice()
      .sort((a, b) => a.timeLeft - b.timeLeft || a.id - b.id);
  }

  function findDeliverTarget() {
    if (!game) return null;
    const p = game.player;
    const options = game.rooms.map(room => ({ room, c: roomClient(room) }))
      .filter(({ c }) => c && c.state === 'inRoom' && c.tryLeft <= 0 &&
        c.pending.length && p.carry.indexOf(c.pending[0]) >= 0)
      .sort((a, b) => a.c.timeLeft - b.c.timeLeft || a.c.id - b.c.id);
    return options[0] || null;
  }

  function findAssignedNeed() {
    if (!game) return null;
    const p = game.player;
    const options = game.clients.filter(c => {
      if (c.state !== 'inRoom' && c.state !== 'toRoom') return false;
      if (!c.pending.length) return false;
      if (c.state === 'inRoom' && c.tryLeft > 0) return false;
      return p.carry.indexOf(c.pending[0]) < 0;
    }).sort((a, b) => {
      const at = a.state === 'inRoom' ? a.timeLeft : Infinity;
      const bt = b.state === 'inRoom' ? b.timeLeft : Infinity;
      return at - bt || a.id - b.id;
    });
    const c = options[0];
    if (!c) return null;
    const rackIndex = ROOM.racks.findIndex(r => r.type === c.pending[0]);
    if (rackIndex < 0) return null;
    return { c, rackIndex };
  }

  function findWaitCarry() {
    if (!game) return null;
    const p = game.player;
    const options = game.clients.filter(c => {
      if (c.state !== 'inRoom' && c.state !== 'toRoom') return false;
      if (!c.pending.length) return false;
      if (p.carry.indexOf(c.pending[0]) < 0) return false;
      return c.state === 'toRoom' || c.tryLeft > 0;
    }).sort((a, b) => a.id - b.id);
    return options[0] || null;
  }

  function neededDressTypes() {
    const set = new Set();
    if (!game) return set;
    game.clients.forEach(c => {
      if (c.state === 'walkingIn' || c.state === 'waiting' || c.state === 'inRoom' || c.state === 'toRoom') {
        c.pending.forEach(type => set.add(type));
      }
    });
    return set;
  }

  function findExtraCarry() {
    if (!game) return -1;
    const needed = neededDressTypes();
    return game.player.carry.findIndex(type => !needed.has(type));
  }

  function computeStep() {
    if (!game || !game.started || game.ending) return null;
    const p = game.player;

    // Los números solo aparecen sobre lo que la jugadora ya eligió o sobre
    // la acción que está ocurriendo. No se numeran objetivos sin seleccionar.
    if (game.charge) return { n: 5, targets: [{ type: 'register' }] };

    if (p.cmd) {
      if (p.cmd.type === 'take') return { n: 3, targets: [{ type: 'rack', index: p.cmd.rack }] };
      if (p.cmd.type === 'deliver') return { n: 4, targets: [{ type: 'cabin', index: p.cmd.roomIndex }] };
      if (p.cmd.type === 'pay') return { n: 5, targets: [{ type: 'register' }] };
      if (p.cmd.type === 'hang') {
        const target = p.cmd.itemIndex != null
          ? { type: 'tray', index: p.cmd.itemIndex }
          : { type: 'tray' };
        return { n: 6, targets: [target] };
      }
      return null;
    }

    if (game.selectedId != null) {
      const c = clientById(game.selectedId);
      if (c) return { n: 1, targets: [{ type: 'client', clientId: c.id }] };
    }

    // La clienta ya fue seleccionada junto con su probador: el 2 queda
    // sobre el probador elegido mientras ella camina hacia allí.
    const toRoom = game.clients.find(c => c.state === 'toRoom' && c.roomIndex != null);
    if (toRoom) return { n: 2, targets: [{ type: 'cabin', index: toRoom.roomIndex }] };

    return null;
  }

  function startCharge() {
    if (!game || game.ending) return;
    const c = nextPayClient();
    if (!c) {
      const q = payQueue();
      if (q.length) flashHint('Esperá a que ' + q[0].name + ' llegue a la caja.', '⏳');
      else flashHint('Todavía no hay nadie para cobrar.', '🪙');
      return;
    }
    c.state = 'paying';
    c.emotion = 'happy';
    game.charge = {
      clientId: c.id,
      left: payTime(),
      total: payTime()
    };
    BL.Sound.play('pay');
    flashHint('Cobrando a ' + c.name + '…', '💳');
    refreshHint(true);
  }

  function updateCharge(dt) {
    if (!game || !game.charge) return;
    game.charge.left -= dt;
    if (game.charge.left <= 0) completePayment();
  }

  function completePayment() {
    if (!game) return;
    const ch = game.charge;
    game.charge = null;
    if (!ch) return;
    const c = clientById(ch.clientId);
    if (!c || c.state !== 'paying') { refreshHint(true); return; }
    const amount = amountFor(c);
    game.earned += amount;
    game.paid++;
    BL.state.coins += amount;
    BL.save();
    BL.updateHUD();
    updateGoal();
    BL.Sound.play('coin');
    BL.fx.coins(ROOM.register.x * S + 200, ROOM.register.y * S - 90, 9);
    BL.fx.float('+' + amount, ROOM.register.x * S + 250, ROOM.register.y * S - 150, 'gold');
    c.state = 'leaving';
    c.emotion = 'happy';
    c.paySpotIndex = null;
    c.walking = true;
    c.tx = ROOM.exit.x;
    c.ty = ROOM.exit.y;
    flashHint('¡' + c.name + ' pagó! Gracias por venir.', '🪙');
    refreshHint(true);
    if (game.earned >= game.level.target) {
      endGame('win');
      return;
    }
    checkEnd();
  }

  /* ============================================================
     Asignar probador (clienta → probador)
     ============================================================ */
  function selectClient(c) {
    if (!c || c.state !== 'waiting') return;
    if (game.selectedId === c.id) {
      game.selectedId = null;
      BL.Sound.play('click');
      flashHint('Selección cancelada.', '✦');
      refreshHint(true);
      return;
    }
    game.selectedId = c.id;
    BL.Sound.play('select');
    if (!freeRoom()) {
      flashHint('Los probadores están ocupados.', '⏳');
    } else {
      flashHint('Clienta seleccionada: ' + c.name + '.', '🚪');
    }
    refreshHint(true);
  }

  function assignRoom(room) {
    if (!game || !room) return;
    const c = clientById(game.selectedId);
    if (!c || c.state !== 'waiting') {
      game.selectedId = null;
      flashHint('Elegí una clienta que esté esperando.', '🪄');
      refreshHint(true);
      return;
    }
    if (room.state !== 'free') {
      BL.Sound.play('error');
      flashHint('Ese probador está ocupado.', '🚪');
      return;
    }
    room.state = 'reserved';
    room.clientId = c.id;
    c.state = 'toRoom';
    c.roomIndex = room.index;
    c.spotIndex = null;
    c.walking = true;
    const stand = ROOM.clientStand[room.index];
    c.tx = stand.x;
    c.ty = stand.y;
    game.selectedId = null;
    game.everAssigned = true;
    BL.Sound.play('curtain');
    flashHint('¡' + c.name + ' va al probador ' + (room.index + 1) + '!', '🚪');
    refreshHint(true);
    updateTutorial();
  }

  /* ============================================================
     Acciones de clic
     ============================================================ */
  function onRackClick(index) {
    if (!canInteract()) return;
    const p = game.player;
    const type = ROOM.racks[index].type;
    if (game.selectedId != null) {
      flashHint('Terminá la selección de la clienta.', '🚪');
      return;
    }
    const same = p.carry.indexOf(type) >= 0;
    if (same || p.carry.length >= 2) {
      if (!same) {
        flashHint('Manos llenas: no hay un vestido de ' + BL.DRESSES[type].name.toLowerCase() + ' para colgar.', '✋');
        return;
      }
      if (enqueue({ type: 'hang', rack: index })) {
        flashHint('Luna va a dejar el vestido de ' + BL.DRESSES[type].name.toLowerCase() + ' en su perchero.', '👟');
      }
      return;
    }
    if (enqueue({ type: 'take', rack: index })) {
      flashHint(p.carry.length ? 'Luna va por otro vestido. Podés llevar hasta 2.' : 'Luna va por el vestido de ' + BL.DRESSES[type].name.toLowerCase() + '.', '👟');
    }
  }

  function onClientClick(c) {
    if (!canInteract()) return;
    const p = game.player;
    BL.Sound.play('click');
    if (c.state === 'waiting') {
      selectClient(c);
      return;
    }
    if (c.state === 'inRoom') {
      if (c.tryLeft > 0) {
        flashHint(c.name + ' se está probando. El probador está cerrado.', '⏳');
        return;
      }
      if (!c.pending.length) {
        flashHint('Ya no le queda nada por probarse.', '✨');
        return;
      }
      if (!p.carry.length) {
        flashHint(c.name + ' quiere ' + BL.DRESSES[c.pending[0]].name.toLowerCase() + '.', '👗');
        return;
      }
      if (p.carry.indexOf(c.pending[0]) < 0) {
        BL.Sound.play('error');
        flashHint('Esa clienta pidió ' + BL.DRESSES[c.pending[0]].name.toLowerCase() + '.', '👀');
        return;
      }
      if (enqueue({ type: 'deliver', roomIndex: c.roomIndex })) {
        flashHint('Luna lleva el vestido al probador ' + (c.roomIndex + 1) + '.', '👗');
      }
      return;
    }
    if (c.state === 'toRoom') { flashHint(c.name + ' está yendo al probador ' + (c.roomIndex + 1) + '.', '🚪'); return; }
    if (c.state === 'waitingPay') {
      flashHint(c.name + ' está lista para pagar.', '💳');
      return;
    }
    if (c.state === 'toPay') { flashHint(c.name + ' está yendo a la caja.', '💳'); return; }
    if (c.state === 'ready') { flashHint(c.name + ' terminó; ya va a la caja.', '💳'); return; }
    if (c.state === 'paying') { flashHint('Luna ya está cobrando.', '💳'); return; }
  }

  function onCabinClick(index) {
    if (!canInteract()) return;
    BL.Sound.play('click');
    const room = game.rooms[index];
    const c = roomClient(room);
    const p = game.player;

    if (game.selectedId != null) {
      assignRoom(room);
      return;
    }
    if (c && c.state === 'inRoom') {
      if (c.tryLeft > 0) {
        flashHint(c.name + ' se está probando. El probador está cerrado.', '⏳');
        return;
      }
      if (!c.pending.length) {
        flashHint('Ya no le queda nada por probarse.', '✨');
        return;
      }
      if (!p.carry.length) {
        flashHint(c.name + ' quiere ' + BL.DRESSES[c.pending[0]].name.toLowerCase() + '.', '👗');
        return;
      }
      if (p.carry.indexOf(c.pending[0]) < 0) {
        BL.Sound.play('error');
        flashHint('Esa clienta pidió ' + BL.DRESSES[c.pending[0]].name.toLowerCase() + '.', '👀');
        return;
      }
      if (enqueue({ type: 'deliver', roomIndex: index })) {
        flashHint('Luna lleva el vestido al probador ' + (index + 1) + '.', '👗');
      }
      return;
    }
    if (c && c.state === 'toRoom') {
      flashHint(c.name + ' está yendo al probador ' + (index + 1) + '.', '🚪');
      return;
    }
    if (room.state === 'free') {
      flashHint('Elegí una clienta primero.', '🪄');
      return;
    }
    flashHint('Este probador está ocupado.', '🚪');
  }

  function onRegisterClick() {
    if (!canInteract()) return;
    BL.Sound.play('click');
    if (game.charge) { flashHint('Luna está cobrando. No puede dejar la caja.', '💳'); return; }
    if (game.selectedId != null) {
      flashHint('Primero elegí un probador para la clienta seleccionada.', '🚪');
      return;
    }
    const q = payQueue();
    if (!q.length) {
      const ready = game.clients.find(c => c.state === 'ready');
      if (ready) flashHint('Esperá a que ' + ready.name + ' llegue a la caja.', '⏳');
      else flashHint('Nadie está listo para pagar todavía.', '🪙');
      return;
    }
    if (q[0].state === 'toPay') { flashHint('Esperá a que ' + q[0].name + ' llegue a la caja.', '⏳'); return; }
    if (q[0].state === 'paying') { flashHint('Luna ya está cobrando.', '💳'); return; }
    if (enqueue({ type: 'pay' })) {
      flashHint('Luna va a la caja para cobrar a ' + q[0].name + '.', '💳');
    }
  }

  function onTrayClick() {
    if (!canInteract()) return;
    const p = game.player;
    if (!p.carry.length) {
      flashHint('La bandeja está vacía.', '✋');
      return;
    }
    flashHint('Vestido en la bandeja.', '👗');
  }

  function onTrayItemClick(index) {
    if (!canInteract()) return;
    const p = game.player;
    const type = p.carry[index];
    if (!type) return;
    const rackIndex = ROOM.racks.findIndex(r => r.type === type);
    if (rackIndex < 0) {
      flashHint('No encontré el perchero de ese vestido.', '👀');
      return;
    }
    if (enqueue({ type: 'hang', rack: rackIndex, itemIndex: index })) {
      game.trayFlash = 0.6;
      flashHint('Luna lleva el vestido de ' + BL.DRESSES[type].name.toLowerCase() + ' a su perchero.', '👟');
    }
  }

  function onFloorItemClick(item) {
    if (!canInteract()) return;
    if (game.player.carry.length >= 2) {
      flashHint('Tenés las manos llenas (2/2).', '✋');
      return;
    }
    if (enqueue({ type: 'pickup', itemId: item.id })) {
      flashHint('Luna va a levantar el vestido del piso.', '👟');
    }
  }

  function canInteract() {
    return !!game && game.active && game.started && !game.ending && !modalOpen();
  }

  /* ============================================================
     Detección de clics
     ============================================================ */
  function clientBox(c) {
    return { x: c.x - 12, y: c.y - 60, w: 24, h: 66 };
  }
  function rackBox(r) {
    return { x: r.x - 2, y: r.y - 4, w: r.w + 4, h: r.h + 18 };
  }
  function cabinBox(i) {
    const cab = ROOM.cabins[i];
    return { x: cab.x - 2, y: cab.y - 6, w: cab.w + 4, h: cab.h + 62 };
  }
  function registerBox() {
    const r = ROOM.register;
    return { x: r.x - 4, y: r.y - 28, w: r.w + 8, h: r.h + 32 };
  }
  function trayBox() {
    const t = ROOM.tray;
    return { x: t.x - 6, y: t.y - 10, w: t.w + 8, h: t.h + 12 };
  }
  function trayItemBox(i) {
    const t = ROOM.tray;
    return { x: t.x + 2 + i * 17, y: t.y + 5, w: 16, h: 18 };
  }
  function inBox(x, y, b) {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  function hitAt(x, y) {
    if (!game) return null;
    const clients = game.clients
      .filter(c => c.state !== 'done')
      .slice()
      .sort((a, b) => b.y - a.y);
    for (const c of clients) {
      if (inBox(x, y, clientBox(c))) return { type: 'client', client: c };
    }
    for (let i = 0; i < game.player.carry.length; i++) {
      if (inBox(x, y, trayItemBox(i))) return { type: 'trayItem', index: i, dressType: game.player.carry[i] };
    }
    const items = game.floorItems.slice().sort((a, b) => b.y - a.y);
    if (inBox(x, y, trayBox())) return { type: 'tray' };
    for (const it of items) {
      if (inBox(x, y, { x: it.x - 9, y: it.y - 14, w: 18, h: 18 })) return { type: 'item', item: it };
    }
    if (inBox(x, y, registerBox())) return { type: 'register' };
    for (let i = 0; i < ROOM.cabins.length; i++) {
      if (inBox(x, y, cabinBox(i))) return { type: 'cabin', index: i };
    }
    for (let i = 0; i < ROOM.racks.length; i++) {
      if (inBox(x, y, rackBox(ROOM.racks[i]))) return { type: 'rack', index: i };
    }
    return null;
  }

  function dispatchClick(x, y) {
    if (!canInteract()) return;
    if (game.charge) {
      flashHint('Luna está cobrando. No puede dejar la caja hasta terminar.', '💳');
      return;
    }
    if (game.player.cmd || game.player.queue.length) {
      flashHint('Terminá la acción actual antes de empezar la siguiente.', '✋');
      return;
    }
    const hit = hitAt(x, y);
    if (!hit) {
      if (game.selectedId != null) {
        game.selectedId = null;
        flashHint('Selección cancelada.', '✦');
        refreshHint(true);
      }
      return;
    }
    if (game.selectedId != null && hit.type !== 'client' && hit.type !== 'cabin') {
      flashHint('Primero elegí un probador para la clienta seleccionada.', '🚪');
      return;
    }
    if (hit.type === 'client') return onClientClick(hit.client);
    if (hit.type === 'trayItem') return onTrayItemClick(hit.index);
    if (hit.type === 'tray') return onTrayClick();
    if (hit.type === 'register') return onRegisterClick();
    if (hit.type === 'cabin') return onCabinClick(hit.index);
    if (hit.type === 'rack') return onRackClick(hit.index);
    if (hit.type === 'item') return onFloorItemClick(hit.item);
  }

  /* ============================================================
     Pistas
     ============================================================ */
  function flashHint(text, icon) {
    if (!game) return;
    game.flash = { text, icon: icon || '💡', until: game.time + 2.8 };
    game.hintKey = '';
    refreshHint(true);
  }

  function computeHint() {
    if (!game) return { icon: '✦', text: '' };
    if (game.ending) return { icon: '✨', text: 'La boutique descansa por un momento…' };
    if (!game.started) return { icon: '✦', text: 'Preparando la boutique…' };
    if (game.flash && game.time < game.flash.until) return { icon: game.flash.icon, text: game.flash.text };

    const p = game.player;
    if (game.charge) return { icon: '💳', text: 'Cobrando… Luna no puede dejar la caja.' };
    if (p.cmd) {
      if (p.cmd.type === 'take') return { icon: '👟', text: 'Luna va por un vestido…' };
      if (p.cmd.type === 'pay') return { icon: '💳', text: 'Luna va a la caja…' };
      if (p.cmd.type === 'deliver') return { icon: '👗', text: 'Luna lleva el vestido…' };
      if (p.cmd.type === 'hang') return { icon: '👟', text: 'Luna lleva el vestido a su perchero…' };
      if (p.cmd.type === 'pickup') return { icon: '👟', text: 'Luna levanta el vestido del piso…' };
    }
    if (game.selectedId != null) {
      const c = clientById(game.selectedId);
      if (!freeRoom()) return { icon: '⏳', text: 'Los probadores están ocupados.' };
      return { icon: '🚪', text: c ? c.name + ' está seleccionada.' : 'Clienta seleccionada.' };
    }

    const deliver = findDeliverTarget();
    if (deliver) {
      const c = deliver.c;
      return { icon: '👗', text: 'Vestido listo para ' + c.name + '.' };
    }

    const need = findAssignedNeed();
    if (need) {
      if (p.carry.length >= 2) {
        return { icon: '✋', text: 'Manos llenas: hay un vestido para colgar.' };
      }
      const c = need.c;
      const dress = BL.DRESSES[c.pending[0]].name.toLowerCase();
      if (c.state === 'toRoom') {
        return { icon: '👗', text: c.name + ' va al probador ' + (c.roomIndex + 1) + '.' };
      }
      return { icon: '👗', text: c.name + ' espera un vestido de ' + dress + '.' };
    }

    const pay = payQueue()[0];
    if (pay) {
      if (pay.state === 'toPay') return { icon: '⏳', text: pay.name + ' va a la caja.' };
      if (pay.state === 'paying') return { icon: '💳', text: 'Cobrando a ' + pay.name + '…' };
      return { icon: '💳', text: pay.name + ' está lista para pagar.' };
    }

    const waiting = waitingClients();
    if (waiting.length) {
      if (freeRoom()) return { icon: '🚪', text: 'Hay una clienta esperando.' };
      if (findExtraCarry() >= 0) return { icon: '✋', text: 'Vestido en la bandeja.' };
      return { icon: '⏳', text: 'Los probadores están ocupados.' };
    }

    if (findExtraCarry() >= 0) {
      return { icon: '✋', text: 'Vestido en la bandeja.' };
    }

    const waitCarry = findWaitCarry();
    if (waitCarry) {
      const what = waitCarry.state === 'toRoom' ? 'llegue al probador' : 'termine de probarse';
      return { icon: '⏳', text: 'Esperando a que ' + waitCarry.name + ' ' + what + '.' };
    }

    const trying = game.clients.find(c => c.state === 'inRoom' && c.tryLeft > 0);
    if (trying) return { icon: '⏳', text: trying.name + ' se está probando. El probador está cerrado.' };

    if (game.spawned < game.level.clients) return { icon: '✦', text: 'Esperando a la próxima clienta…' };
    if (game.earned < game.level.target) {
      return { icon: '🪙', text: 'Faltan ' + (game.level.target - game.earned) + ' monedas para la meta.' };
    }
    return { icon: '✨', text: '¡Buen trabajo!' };
  }

  function hintIconHTML(icon) {
    const map = {
      '👗': () => BL.art.dressHTML('dots', { scale: 2.1 }),
      '💳': () => BL.art.iconHTML('coin', { scale: 2.5 }),
      '👟': () => BL.art.iconHTML('arrow', { scale: 2.5 }),
      '✋': () => BL.art.iconHTML('hand', { scale: 2.5 }),
      '🪄': () => BL.art.iconHTML('star', { scale: 2.5, color: '#f0bb3e' }),
      '⏳': () => BL.art.iconHTML('clock', { scale: 2.5, color: '#b06a82' }),
      '🪙': () => BL.art.iconHTML('coin', { scale: 2.5 }),
      '💔': () => BL.art.iconHTML('heart', { scale: 2.5, color: '#c9a3b2' }),
      '🚪': () => BL.art.iconHTML('room', { scale: 2.5 }),
      '👀': () => BL.art.iconHTML('hand', { scale: 2.5 }),
      '💡': () => BL.art.iconHTML('star', { scale: 2.5, color: '#f0bb3e' }),
      '✦': () => BL.art.iconHTML('star', { scale: 2.5, color: '#f0bb3e' }),
      '✨': () => BL.art.iconHTML('star', { scale: 2.5, color: '#f0bb3e' })
    };
    return map[icon] ? map[icon]() : null;
  }

  function updateStepChip(step) {
    const el = $('#hintStep');
    if (!el) return;
    const prev = el.dataset.key || '';
    const next = step ? String(step.n) : '';
    // Al cambiar de paso, la pista de acción manda sobre el aviso anterior.
    if (game && game.flash && next && next !== prev) game.flash = null;
    if (!step) {
      el.classList.add('hidden');
      el.textContent = '';
      el.dataset.key = '';
      return;
    }
    el.classList.remove('hidden');
    if (el.dataset.key !== String(step.n)) {
      el.dataset.key = String(step.n);
      el.textContent = String(step.n);
    }
  }

  function refreshHint(force) {
    if (!game) return;
    updateStepChip(computeStep());
    const h = computeHint();
    const key = h.icon + '|' + h.text;
    if (!force && key === game.hintKey) return;
    game.hintKey = key;
    const ico = $('#hintIco');
    const txt = $('#hintText');
    if (ico) {
      const ih = hintIconHTML(h.icon);
      if (ih) ico.innerHTML = ih;
      else ico.textContent = h.icon;
    }
    if (txt) txt.innerHTML = h.text;
    const card = $('#hintCard');
    if (card && force) {
      card.classList.remove('bump');
      void card.offsetWidth;
      card.classList.add('bump');
    }
  }

  function updateGoal() {
    if (!game) return;
    const target = game.level.target;
    const earned = game.earned;
    const goalText = $('#goalText');
    if (goalText) goalText.textContent = Math.min(earned, target) + ' / ' + target;
    const bar = $('#goalBar');
    if (bar) bar.style.width = (clamp(earned / target, 0, 1) * 100) + '%';
  }

  function updateTutorial() {
    // La guía con manito fue retirada: la jugadora elige libremente.
    // Los números solo aparecen sobre lo que ya seleccionó.
    const p = $('#tutorialPointer');
    if (p) p.classList.add('hidden');
  }

  /* ============================================================
     Dibujo
     ============================================================ */
  function roundRectPath(x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function fillRR(x, y, w, h, r, fill) {
    roundRectPath(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawRing(c) {
    const frac = clamp(c.timeLeft / Math.max(0.01, c.timeMax), 0, 1);
    // El reloj rodea el ícono del pedido, no el cuerpo de la clienta.
    const cx = c.x;
    const cy = c.y - 49;
    const r = 13.2;
    ctx.save();
    ctx.lineCap = 'round';
    // halo suave
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // pista
    ctx.strokeStyle = 'rgba(96,42,64,.22)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // marcas de reloj
    ctx.fillStyle = 'rgba(255,250,243,.9)';
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(cx + dx * r, cy + dy * r, 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    let col = frac > 0.5 ? '#63c08c' : frac > 0.25 ? '#f0bb3e' : '#e04f6a';
    if (frac <= 0.25 && Math.floor(game.time * 6) % 2 === 0) col = '#ff96ac';
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, col);
    g.addColorStop(1, frac > 0.5 ? '#8fe0b2' : frac > 0.25 ? '#ffd45c' : '#ff8ca3');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    // punta brillante
    const a = -Math.PI / 2 + Math.PI * 2 * frac;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBubble(c) {
    const bx = c.x - 10;
    const by = c.y - 60;
    ctx.save();
    // sombra
    ctx.fillStyle = 'rgba(96,42,64,.16)';
    ctx.beginPath();
    ctx.ellipse(bx + 10, by + 15, 10.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // colita
    ctx.beginPath();
    ctx.moveTo(bx + 7, by + 16);
    ctx.quadraticCurveTo(bx + 9, by + 22, bx + 11, by + 16);
    ctx.closePath();
    ctx.fillStyle = '#fffaf5';
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,105,140,.55)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // globito
    const g = ctx.createLinearGradient(0, by, 0, by + 18);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#fffaf5');
    g.addColorStop(1, '#ffeaf2');
    roundRectPath(bx, by, 20, 17.5, 8);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,105,140,.55)';
    ctx.lineWidth = 0.65;
    ctx.stroke();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.ellipse(bx + 6.5, by + 4.3, 4.0, 1.7, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // contenido: al llegar, el ícono es el probador
    if (c.state === 'waiting') {
      const room = BL.art.iconSprite('room');
      ctx.drawImage(room, bx + 5, by + 4, 10, 10);
    } else if (c.state === 'inRoom') {
      const type = c.trying || c.pending[0];
      if (type) {
        const dress = BL.art.dressSprite(type);
        ctx.drawImage(dress, bx + 4, by + 2, 12, 14);
      }
    } else if (c.state === 'waitingPay') {
      const icon = BL.art.iconSprite('coin');
      ctx.drawImage(icon, bx + 5, by + 4, 10, 10);
    }
    ctx.restore();
  }

  function drawClient(c) {
    if (c.state === 'done') return;
    // Mientras se prueba el vestido, la cortina está cerrada y la clienta no se ve.
    if (c.state === 'inRoom' && c.tryLeft > 0) return;
    const ticks = c.state === 'waiting' ||
      (c.state === 'inRoom' && c.pending.length > 0 && c.tryLeft <= 0) ||
      c.state === 'waitingPay';
    if (ticks) drawRing(c);

    const sprite = renderClientSprite(c);
    const bob = c.walking ? (Math.floor(game.time * 10) % 2 ? -1 : 0) : 0;
    const x = c.x - 10;
    const y = c.y - 36 + bob;

    // sombra suave
    ctx.fillStyle = 'rgba(96,52,72,.15)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 0.6, 8.2, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.drawImage(sprite, x, y, 20, 36);

    // resaltado de la clienta seleccionada
    if (game.selectedId === c.id) {
      const pulse = Math.floor(game.time * 4) % 2;
      drawCorners(clientBox(c), pulse ? '#ffd45c' : '#fff3b0');
    }
    if (c.state === 'inRoom' || c.state === 'waitingPay' || c.state === 'waiting') drawBubble(c);
  }

  function drawPlayer() {
    const p = game.player;
    const sprite = BL.art.characterSprite(BL.PALETTE_ASSISTANT, { style: 4, assistant: true });
    const bob = p.walking ? (Math.floor(game.time * 10) % 2 ? -1 : 0) : 0;
    const x = p.x - 10;
    const y = p.y - 36 + bob;
    ctx.fillStyle = 'rgba(96,52,72,.17)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 0.6, 8.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sprite, x, y, 20, 36);
    // vestidos en la mano (sin parpadeo)
    p.carry.forEach((type, i) => {
      const dress = BL.art.dressSprite(type);
      const dx = p.carry.length === 1 ? 9 : (i === 0 ? -13 : 9);
      ctx.drawImage(dress, p.x + dx, p.y - 23, 12, 14);
    });
  }

  function drawCabins() {
    ROOM.cabins.forEach((cab, i) => {
      const room = game.rooms[i];
      const c = roomClient(room);
      const trying = !!(c && c.state === 'inRoom' && c.tryLeft > 0);
      const closed = room.state !== 'occupied' || trying;

      if (closed) {
        // cortina cerrada, con pliegues suaves y volumen
        const x = cab.x + 3;
        const y = cab.y + 12;
        const w = cab.w - 6;
        const h = cab.h - 20;
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, '#e979a2');
        g.addColorStop(0.25, '#ffa9c8');
        g.addColorStop(0.5, '#f58bb2');
        g.addColorStop(0.75, '#ffb4d0');
        g.addColorStop(1, '#e979a2');
        roundRectPath(x, y, w, h, 6);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,65,100,.28)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        // pliegues
        for (let sx = x + 3; sx < x + w - 1; sx += 5) {
          ctx.strokeStyle = 'rgba(190,75,115,.28)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(sx, y + 2);
          ctx.quadraticCurveTo(sx - 1, y + h * 0.5, sx, y + h - 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,210,225,.45)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(sx + 1.5, y + 3);
          ctx.quadraticCurveTo(sx + 0.5, y + h * 0.5, sx + 1.5, y + h - 3);
          ctx.stroke();
        }
        // volante inferior
        fillRR(ctx, x - 1, y + h - 7, w + 2, 8, 4, 'rgba(217,82,127,.55)');
        // volados superiores
        for (let sx = x + 1; sx < x + w - 1; sx += 7) {
          ctx.beginPath();
          ctx.arc(sx + 3.5, y - 1.5, 3.5, 0, Math.PI);
          ctx.fillStyle = '#f7a9c7';
          ctx.fill();
        }
        // brillo
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.28, y + h * 0.3, 3.2, h * 0.3, -0.05, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // cortina abierta a los lados
        [0, 1].forEach(side => {
          const x = side === 0 ? cab.x + 3 : cab.x + cab.w - 12;
          const y = cab.y + 12;
          const w = 9;
          const h = cab.h - 20;
          const g = ctx.createLinearGradient(x, 0, x + w, 0);
          g.addColorStop(0, side === 0 ? '#e979a2' : '#ffb4d0');
          g.addColorStop(0.5, '#f58bb2');
          g.addColorStop(1, side === 0 ? '#ffb4d0' : '#e979a2');
          roundRectPath(x, y, w, h, 4.5);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = 'rgba(150,65,100,.25)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
          for (let sx = x + 2; sx < x + w - 1; sx += 3.5) {
            ctx.strokeStyle = 'rgba(190,75,115,.24)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(sx, y + 2);
            ctx.lineTo(sx, y + h - 2);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(255,255,255,.2)';
          ctx.beginPath();
          ctx.ellipse(x + w * 0.35, y + h * 0.3, 1.5, h * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // progreso de la prueba sobre la cortina cerrada
      if (trying) {
        const frac = clamp(1 - c.tryLeft / Math.max(0.01, c.tryTotal), 0, 1);
        const bw = cab.w - 16;
        const bx = cab.x + 8;
        const by = cab.y + cab.h - 24;
        roundRectPath(bx - 1.2, by - 1.2, bw + 2.4, 5.4, 2.7);
        ctx.fillStyle = 'rgba(90,58,74,.55)';
        ctx.fill();
        roundRectPath(bx, by, bw, 3, 1.5);
        ctx.fillStyle = '#fff3d8';
        ctx.fill();
        if (frac > 0) {
          roundRectPath(bx, by, Math.max(2, bw * frac), 3, 1.5);
          const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
          pg.addColorStop(0, '#ffd45c');
          pg.addColorStop(1, '#e8a72c');
          ctx.fillStyle = pg;
          ctx.fill();
        }
      }

      // luz de estado
      const lamp = room.state === 'occupied' ? '#e04f6a' : room.state === 'reserved' ? '#f0bb3e' : '#63c08c';
      ctx.fillStyle = 'rgba(90,58,74,.75)';
      ctx.beginPath();
      ctx.arc(cab.x + cab.w - 6.5, cab.y + 5.2, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(cab.x + cab.w - 6.5, cab.y + 5.2, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.arc(cab.x + cab.w - 7.2, cab.y + 4.5, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // resaltado del probador ya elegido (mientras la clienta camina)
      if (c && c.state === 'toRoom' && room.clientId === c.id) {
        const pulse = Math.floor(game.time * 4) % 2;
        drawCorners(cabinBox(i), pulse ? '#ffd45c' : '#fff3b0');
      }
      if (game.hover && game.hover.type === 'cabin' && game.hover.index === i) {
        drawCorners(cabinBox(i), '#ffffff');
      }
    });
  }

  function drawTrayItems() {
    if (!game) return;
    const t = ROOM.tray;
    game.player.carry.forEach((type, i) => {
      const dress = BL.art.dressSprite(type);
      ctx.drawImage(dress, t.x + 4 + i * 17, t.y + 7, 12, 14);
    });
    const step = computeStep();
    if (step && step.n === 6) {
      const pulse = Math.floor(game.time * 6) % 2;
      const cmd = game.player.cmd;
      if (cmd && cmd.type === 'hang' && cmd.itemIndex != null) {
        drawCorners(trayItemBox(cmd.itemIndex), pulse ? '#ffd45c' : '#fff3b0');
      } else {
        drawCorners(trayBox(), pulse ? '#ffd45c' : '#fff3b0');
      }
    }
    if (game.trayFlash > 0) {
      const pulse = Math.floor(game.time * 8) % 2;
      drawCorners(trayBox(), pulse ? '#ffd45c' : '#ffffff');
    }
    if (game.hover && game.hover.type === 'trayItem') {
      drawCorners(trayItemBox(game.hover.index), '#ffffff');
    }
    if (game.hover && game.hover.type === 'tray') drawCorners(trayBox(), '#ffffff');
  }

  function drawFloorItems() {
    game.floorItems.forEach(it => {
      ctx.fillStyle = 'rgba(96,52,72,.16)';
      ctx.beginPath();
      ctx.ellipse(it.x, it.y, 7, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      const dress = BL.art.dressSprite(it.type);
      ctx.drawImage(dress, it.x - 6, it.y - 14, 12, 14);
      if (game.hover && game.hover.type === 'item' && game.hover.item && game.hover.item.id === it.id) {
        drawCorners({ x: it.x - 9, y: it.y - 15, w: 18, h: 18 }, '#ffffff');
      }
    });
  }

  function drawChargeBar() {
    if (!game.charge) return;
    const r = ROOM.register;
    const w = 48;
    const x = r.x + r.w / 2 - w / 2;
    const y = r.y - 27;
    roundRectPath(x - 1.4, y - 1.4, w + 2.8, 7.8, 3.9);
    ctx.fillStyle = 'rgba(90,58,74,.55)';
    ctx.fill();
    roundRectPath(x, y, w, 5, 2.5);
    ctx.fillStyle = '#fff3d8';
    ctx.fill();
    const frac = clamp(1 - game.charge.left / Math.max(0.01, game.charge.total), 0, 1);
    if (frac > 0) {
      roundRectPath(x, y, Math.max(2.5, w * frac), 5, 2.5);
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#ffe07a');
      g.addColorStop(0.55, '#f0bb3c');
      g.addColorStop(1, '#d99a22');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.ellipse(x + Math.max(2.5, w * frac) * 0.45, y + 1.4, 4.5, 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCorners(box, color) {
    const x = box.x;
    const y = box.y;
    const w = box.w;
    const h = box.h;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(255,214,90,.75)';
    ctx.shadowBlur = 5;
    roundRectPath(x, y, w, h, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 0.6;
    roundRectPath(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2), 7);
    ctx.stroke();
    ctx.restore();
  }

  function drawHover() {
    if (!game.hover) return;
    const h = game.hover;
    if (h.type === 'rack') drawCorners(rackBox(ROOM.racks[h.index]), '#ffffff');
    if (h.type === 'register') drawCorners(registerBox(), '#ffffff');
    if (h.type === 'client' && h.client && h.client.state !== 'done' &&
        !(h.client.state === 'inRoom' && h.client.tryLeft > 0)) {
      drawCorners(clientBox(h.client), '#ffffff');
    }
  }

  const STEP_DIGITS = {
    0: ['111', '101', '101', '101', '111'],
    1: ['010', '110', '010', '010', '111'],
    2: ['111', '001', '111', '100', '111'],
    3: ['111', '001', '111', '001', '111'],
    4: ['101', '101', '111', '001', '001'],
    5: ['111', '100', '111', '001', '111'],
    6: ['111', '100', '111', '101', '111'],
    7: ['111', '001', '010', '010', '010'],
    8: ['111', '101', '111', '101', '111'],
    9: ['111', '101', '111', '001', '111']
  };

  function drawPixelDigit(n, x, y, color) {
    const bits = STEP_DIGITS[n] || STEP_DIGITS[0];
    ctx.fillStyle = color;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (bits[row][col] === '1') ctx.fillRect(x + col, y + row, 1, 1);
      }
    }
  }

  function drawStepBadge(n, cx, bottomY) {
    const cy = bottomY - 6.2;
    const pulse = Math.floor(game.time * 4) % 2;
    ctx.save();
    // sombra suave
    ctx.fillStyle = 'rgba(96,42,64,.22)';
    ctx.beginPath();
    ctx.ellipse(cx + 0.8, cy + 2.0, 6.0, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // colita
    ctx.beginPath();
    ctx.moveTo(cx - 2.4, cy + 4.3);
    ctx.quadraticCurveTo(cx, cy + 8.2, cx + 2.4, cy + 4.3);
    ctx.closePath();
    ctx.fillStyle = pulse ? '#ffd45c' : '#f0bb3e';
    ctx.fill();
    // círculo
    const g = ctx.createLinearGradient(cx, cy - 6, cx, cy + 6);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.45, pulse ? '#ffd45c' : '#f7c94f');
    g.addColorStop(1, '#e3a72c');
    ctx.beginPath();
    ctx.arc(cx, cy, 6.1, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,65,40,.25)';
    ctx.lineWidth = 0.35;
    ctx.stroke();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath();
    ctx.ellipse(cx - 1.9, cy - 2.6, 2.2, 1.1, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // número
    ctx.fillStyle = '#5a2b3f';
    ctx.font = '700 7px Fredoka, Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), cx, cy + 0.35);
    ctx.restore();
  }

  function drawStepMarkers() {
    if (!game || !game.started || game.ending || modalOpen()) return;
    const step = computeStep();
    if (!step || !step.targets.length) return;
    step.targets.forEach(t => {
      if (t.type === 'client') {
        const c = clientById(t.clientId);
        if (!c || c.state === 'done') return;
        drawStepBadge(step.n, c.x, c.y - 64);
      } else if (t.type === 'cabin') {
        const cab = ROOM.cabins[t.index];
        if (!cab) return;
        drawStepBadge(step.n, cab.x + cab.w / 2, cab.y - 8);
      } else if (t.type === 'rack') {
        const rack = ROOM.racks[t.index];
        if (!rack) return;
        drawStepBadge(step.n, rack.x + rack.w / 2, rack.y - 6);
      } else if (t.type === 'register') {
        const r = ROOM.register;
        drawStepBadge(step.n, r.x + r.w / 2, r.y - 30);
      } else if (t.type === 'tray') {
        if (t.index != null) {
          const box = trayItemBox(t.index);
          drawStepBadge(step.n, box.x + box.w / 2, box.y - 1);
        } else {
          const tray = ROOM.tray;
          drawStepBadge(step.n, tray.x + tray.w / 2, tray.y - 4);
        }
      }
    });
  }

  function render() {
    if (!ctx || !game) return;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, ART.w, ART.h);
    ctx.drawImage(BL.art.sceneCanvas(game.levelId), 0, 0, ART.w, ART.h);
    drawCabins();
    drawFloorItems();
    const actors = game.clients
      .filter(c => c.state !== 'done')
      .slice()
      .sort((a, b) => a.y - b.y);
    actors.forEach(drawClient);
    drawPlayer();
    // los que están más adelante van encima de Luna
    actors.filter(c => c.y > game.player.y + 2).forEach(() => {});
    drawTrayItems();
    drawStepMarkers();
    drawChargeBar();
    drawHover();
  }

  /* ============================================================
     Fin de nivel
     ============================================================ */
  function potentialCoins() {
    if (!game) return 0;
    let p = 0;
    const tip = tipLevel();
    game.clients.forEach(c => {
      if (c.state === 'done' || c.state === 'leaving' || c.state === 'angry') return;
      p += c.order.length * BL.COINS_PER_DRESS + tip;
    });
    for (let i = game.spawned; i < game.level.clients; i++) {
      p += (game.level.dresses[i] || 2) * BL.COINS_PER_DRESS + tip;
    }
    return p;
  }

  function checkEnd() {
    if (!game || game.ending || !game.started) return;
    if (game.earned >= game.level.target) { endGame('win'); return; }
    if (game.earned + potentialCoins() < game.level.target) {
      endGame('lose', 'coins');
    }
  }

  function endGame(kind, reason) {
    if (!game || game.ending) return;
    game.ending = kind;
    game.failReason = reason || null;
    game.paused = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    game.delays = [];
    game.charge = null;
    game.selectedId = null;
    const tutor = $('#tutorialPointer');
    if (tutor) tutor.classList.add('hidden');
    render();

    const level = game.level;
    if (kind === 'win') {
      const stars = clamp(3 - game.angry, 1, 3);
      const prev = BL.state.completed[level.id];
      const best = Math.max(stars, prev ? (Number(prev.stars) || 0) : 0);
      BL.state.completed[level.id] = {
        stars: best,
        earned: Math.max(game.earned, prev ? (Number(prev.earned) || 0) : 0),
        date: Date.now()
      };
      if (level.id < BL.LEVELS.length) {
        BL.state.unlocked = Math.min(BL.LEVELS.length, Math.max(BL.state.unlocked, level.id + 1));
      }
      BL.save();
      BL.updateHUD();
      BL.ui.renderHome();
      BL.Sound.play('win');
      openResult(true, stars);
      setTimeout(() => {
        const b = $('.result-backdrop');
        if (b) BL.fx.confetti(b, 90);
      }, 180);
    } else {
      BL.loseLife();
      BL.fx.flashLife();
      BL.fx.shake();
      BL.Sound.play('lose');
      BL.toast('Perdiste 1 vida', 'error');
      BL.save();
      BL.updateHUD();
      BL.ui.renderHome();
      openResult(false, 0, reason);
    }
  }

  function openResult(win, stars, reason) {
    const level = game.level;
    const lives = BL.state.lives;
    const earned = game.earned;
    const allDone = BL.LEVELS.every(l => !!BL.state.completed[l.id]);
    const isLast = level.id >= BL.LEVELS.length;
    let badge, title, sub;
    if (win) {
      badge = stars === 3
        ? BL.art.iconHTML('crown', { scale: 5, color: '#f0bb3e' })
        : BL.art.iconHTML('star', { scale: 5, color: '#f0bb3e' });
      title = allDone ? '¡Boutique completa!' : (stars === 3 ? '¡Perfecto!' : stars === 2 ? '¡Muy bien!' : '¡Nivel completado!');
      sub = allDone
        ? '¡Luna y sus clientas hicieron brillar la boutique entera!'
        : (stars === 3 ? '¡Luna atendió con una sonrisa!' : '¡Cumpliste la meta del nivel!');
    } else {
      badge = BL.art.iconHTML('heart', { scale: 5, color: '#d9a6b6' });
      title = lives <= 0 ? 'Sin vidas' : '¡Casi lo logramos!';
      sub = lives <= 0
        ? 'Te quedaste sin vidas. Podés comprar un corazón o esperar.'
        : 'No llegaste a las ' + level.target + ' monedas. Perdiste 1 vida.';
    }

    const starsHtml = win
      ? `<div class="result-stars">${[1, 2, 3].map(n => `<span class="result-star ${n <= stars ? 'on' : ''}">★</span>`).join('')}</div>`
      : '';

    let actions = '';
    if (win) {
      if (!isLast) {
        actions = `<button class="btn" data-result="next">Siguiente nivel →</button>
          <button class="btn btn-soft" data-result="retry">Repetir</button>
          <button class="btn btn-ghost" data-result="home">Inicio</button>`;
      } else {
        actions = `<button class="btn" data-result="retry">Jugar de nuevo</button>
          <button class="btn btn-ghost" data-result="home">Inicio</button>`;
      }
    } else if (lives <= 0) {
      actions = `<button class="btn" data-result="shop">🛍️ Ir a la tienda</button>
        <button class="btn btn-ghost" data-result="home">Inicio</button>`;
    } else {
      actions = `<button class="btn" data-result="retry">Reintentar</button>
        <button class="btn btn-ghost" data-result="home">Inicio</button>`;
    }

    const note = win
      ? (isLast ? 'Las monedas ya quedaron guardadas en tu alcancía.' : 'El nivel ' + (level.id + 1) + ' ya está desbloqueado.')
      : (lives > 0 ? 'Las vidas se recuperan solas cada 5 minutos.' : 'Las vidas se recuperan solas cada 5 minutos.');
    const livesHtml = `<div class="result-lives">${BL.art.heartHTML(lives > 0)}<span>${lives} de ${BL.MAX_LIVES} vidas</span></div>`;

    const html = `<div class="modal-backdrop result-backdrop">
      <div class="modal result-modal ${win ? '' : 'lose'}" role="dialog" aria-modal="true" aria-label="Resultado del nivel">
        <div class="result-badge">${badge}</div>
        <h2>${title}</h2>
        <p class="result-sub">${sub}</p>
        ${starsHtml}
        ${earned > 0 ? `<div class="reward-pill"><span class="coin-ico"></span>+${earned}</div>` : ''}
        <div class="result-actions">${actions}</div>
        <div class="result-note">${note}</div>
        ${livesHtml}
      </div>
    </div>`;
    BL.ui.openModal(html, { type: 'result', closable: false, resume: false });
  }

  function handleResultAction(action) {
    if (!game) return;
    const levelId = game.level.id;
    if (action === 'next') { startLevel(Math.min(BL.LEVELS.length, levelId + 1)); return; }
    if (action === 'retry') { startLevel(levelId); return; }
    if (action === 'shop') {
      quitGame();
      BL.ui.openShop();
      return;
    }
    if (action === 'home') quitGame();
  }

  /* ============================================================
     Actualización
     ============================================================ */
  function updateSpawn(dt) {
    if (!game || !game.started || game.ending) return;
    if (game.spawned >= game.level.clients) return;
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnClient();
      game.spawnTimer = BL.ARRIVAL;
    }
  }

  function update(dt) {
    if (!game || game.ending) return;
    game.time += dt;
    runDelays();
    if (!game || game.ending) return;
    updateSpawn(dt);
    updatePlayer(dt);
    updateClients(dt);
    updateCharge(dt);
    if (!game || game.ending) return;
    render();
    updateTutorial();
    updateHandsLabel();
    game.checkTimer -= dt;
    if (game.checkTimer <= 0) {
      game.checkTimer = 0.28;
      refreshHint(false);
      updateGoal();
      checkEnd();
    }
  }

  /* ============================================================
     Eventos
     ============================================================ */
  function artPoint(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (ART.w / r.width);
    const y = (e.clientY - r.top) * (ART.h / r.height);
    return { x, y };
  }

  function bindEvents() {
    canvas.addEventListener('click', e => {
      BL.Sound.unlock();
      if (!canInteract()) return;
      BL.Sound.play('click');
      const p = artPoint(e);
      dispatchClick(p.x, p.y);
    });
    canvas.addEventListener('mousemove', e => {
      if (!game) return;
      const p = artPoint(e);
      const hit = hitAt(p.x, p.y);
      game.hover = hit;
      canvas.style.cursor = hit ? 'pointer' : 'default';
    });
    canvas.addEventListener('mouseleave', () => {
      if (!game) return;
      game.hover = null;
      canvas.style.cursor = 'default';
    });
    $('#overlays').addEventListener('click', onOverlayClick);
  }

  function onOverlayClick(e) {
    const start = e.target.closest('[data-intro-start]');
    if (start) {
      if (game && !game.started) {
        BL.Sound.play('click');
        beginPlay();
      }
      return;
    }
    const res = e.target.closest('[data-result]');
    if (res) {
      BL.Sound.play('click');
      handleResultAction(res.dataset.result);
    }
  }

  /* ============================================================
     Arranque
     ============================================================ */
  function initPlay() {
    canvas = $('#scene');
    if (canvas) {
      ctx = canvas.getContext('2d');
      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }
    const goalCoin = $('#goalCoin');
    if (goalCoin) goalCoin.src = BL.art.dataURL(BL.art.iconSprite('coin'), 'coin');
    const tutHand = $('#tutHand');
    if (tutHand) tutHand.innerHTML = BL.art.iconHTML('hand', { scale: 4, color: '#f0b23c' });
    bindEvents();
  }

  BL.play = {
    startLevel,
    quit: quitGame,
    restart: restartGame,
    pause: pauseGame,
    resume: resumeGame,
    isActive: () => !!game && game.active,
    isEnding: () => !!game && !!game.ending,
    _game: () => game,
    _room: ROOM,
    _hitAt: hitAt,
    _clickAt: (x, y) => { dispatchClick(x, y); },
    _scale: S
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlay);
  } else {
    initPlay();
  }
})();
