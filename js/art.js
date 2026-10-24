/* ============================================================
   BOUTIQUE LUNA — arte 3D caricaturesco (canvas lógico 400×225)
   ============================================================ */

(function () {
  const BL = window.BL;
  const ART = BL.ART;
  const S = ART.scale;
  const ROOM = BL.ROOM;

  const spriteCache = {};
  const urlCache = {};
  const sceneCache = {};

  /* ============================================================
     Utilidades de dibujo
     ============================================================ */
  function make(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * S));
    c.height = Math.max(1, Math.round(h * S));
    const ctx = c.getContext('2d');
    ctx.scale(S, S);
    ctx.imageSmoothingEnabled = true;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    return c;
  }

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function lg(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(s => g.addColorStop(s[0], s[1]));
    return g;
  }

  function rg(ctx, cx, cy, r0, r1, stops) {
    const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    stops.forEach(s => g.addColorStop(s[0], s[1]));
    return g;
  }

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r == null ? 4 : r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function fillRR(ctx, x, y, w, h, r, fill) {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function strokeRR(ctx, x, y, w, h, r, stroke, lw) {
    rr(ctx, x, y, w, h, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw == null ? 0.8 : lw;
    ctx.stroke();
  }

  function ellipse(ctx, cx, cy, rx, ry, fill, stroke, lw) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw == null ? 0.7 : lw; ctx.stroke(); }
  }

  function softShadow(ctx, cx, cy, rx, ry, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, Math.max(0.1, ry / rx));
    const g = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
    g.addColorStop(0, 'rgba(84,38,60,' + (alpha == null ? 0.22 : alpha) + ')');
    g.addColorStop(0.6, 'rgba(84,38,60,' + (alpha == null ? 0.12 : alpha * 0.55) + ')');
    g.addColorStop(1, 'rgba(84,38,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function gloss(ctx, x, y, w, h, r, alpha) {
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha == null ? 0.35 : alpha) + ')';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.34, y + h * 0.22, w * 0.32, h * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function heartPath(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.92);
    ctx.bezierCurveTo(cx - s * 1.15, cy + s * 0.05, cx - s * 0.92, cy - s * 0.82, cx - s * 0.34, cy - s * 0.82);
    ctx.bezierCurveTo(cx - s * 0.08, cy - s * 0.82, cx, cy - s * 0.56, cx, cy - s * 0.44);
    ctx.bezierCurveTo(cx, cy - s * 0.56, cx + s * 0.08, cy - s * 0.82, cx + s * 0.34, cy - s * 0.82);
    ctx.bezierCurveTo(cx + s * 0.92, cy - s * 0.82, cx + s * 1.15, cy + s * 0.05, cx, cy + s * 0.92);
    ctx.closePath();
  }

  function starPath(ctx, cx, cy, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 ? inner : outer;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function bowShape(ctx, x, y, color, dark, size) {
    const s = size || 1;
    ctx.save();
    ctx.translate(x, y);
    // lazo izquierdo
    ellipse(ctx, -2.2 * s, 0, 2.2 * s, 1.35 * s, color, 'rgba(80,36,56,.28)', 0.35);
    // lazo derecho
    ellipse(ctx, 2.2 * s, 0, 2.2 * s, 1.35 * s, color, 'rgba(80,36,56,.28)', 0.35);
    // brillo
    ellipse(ctx, -2.8 * s, -0.5 * s, 0.7 * s, 0.45 * s, 'rgba(255,255,255,.5)');
    ellipse(ctx, 1.6 * s, -0.5 * s, 0.7 * s, 0.45 * s, 'rgba(255,255,255,.4)');
    // nudo
    ellipse(ctx, 0, 0, 0.95 * s, 0.9 * s, dark || color);
    ctx.restore();
  }

  /* ============================================================
     Personajes
     ============================================================ */
  const INK = '#3d2833';
  const MOUTH = '#a3546e';
  const BLUSH = 'rgba(255,125,165,.55)';

  function skinGradient(ctx, p, y0, y1) {
    return lg(ctx, 0, y0, 0, y1, [
      [0, p.skin],
      [0.68, p.skin],
      [1, p.shade || p.skin]
    ]);
  }

  function hairGradient(ctx, p, y0, y1) {
    return lg(ctx, 0, y0, 0, y1, [
      [0, p.hair],
      [0.72, p.hair],
      [1, p.hairShade || p.hair]
    ]);
  }

  function drawEye(ctx, x, y, rx, ry, emo) {
    if (emo === 'angry') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(x < 10 ? 0.22 : -0.22);
      ellipse(ctx, 0, 0, rx * 1.05, ry * 0.65, INK);
      ellipse(ctx, -0.25, -0.25, rx * 0.32, ry * 0.22, 'rgba(255,255,255,.8)');
      ctx.restore();
      return;
    }
    if (emo === 'sad') {
      ellipse(ctx, x, y + 0.3, rx * 0.9, ry * 0.9, INK);
      ellipse(ctx, x - 0.3, y - 0.1, rx * 0.3, ry * 0.24, 'rgba(255,255,255,.75)');
      return;
    }
    ellipse(ctx, x, y, rx, ry, INK);
    ellipse(ctx, x - 0.32, y - 0.48, rx * 0.34, ry * 0.32, '#fff');
    ellipse(ctx, x + 0.34, y + 0.35, rx * 0.2, ry * 0.18, 'rgba(255,255,255,.45)');
  }

  function drawMouth(ctx, emo) {
    ctx.save();
    ctx.strokeStyle = MOUTH;
    ctx.lineWidth = 0.55;
    ctx.lineCap = 'round';
    if (emo === 'angry') {
      ctx.beginPath();
      ctx.moveTo(8.7, 12.1);
      ctx.quadraticCurveTo(10, 11.4, 11.3, 12.1);
      ctx.stroke();
    } else if (emo === 'sad') {
      ctx.beginPath();
      ctx.moveTo(8.9, 12.2);
      ctx.quadraticCurveTo(10, 11.4, 11.1, 12.2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(8.6, 11.5);
      ctx.quadraticCurveTo(10, 13.2, 11.4, 11.5);
      ctx.stroke();
      ellipse(ctx, 10, 12.4, 0.45, 0.22, 'rgba(255,130,160,.45)');
    }
    ctx.restore();
  }

  function headBase(ctx, p, emo) {
    // orejas
    ellipse(ctx, 3.9, 9.4, 1.35, 1.55, skinGradient(ctx, p, 8, 11), 'rgba(90,45,60,.18)', 0.3);
    ellipse(ctx, 16.1, 9.4, 1.35, 1.55, skinGradient(ctx, p, 8, 11), 'rgba(90,45,60,.18)', 0.3);
    // cabeza
    ellipse(ctx, 10, 9.1, 6.05, 5.75, skinGradient(ctx, p, 3, 15), 'rgba(90,45,60,.2)', 0.35);
    // sombra del mentón
    ellipse(ctx, 10, 13.2, 3.6, 1.15, p.shade || p.skin);
    // cuello
    fillRR(ctx, 8.7, 13.7, 2.6, 2.1, 0.8, p.shade || p.skin);
    // ojos
    drawEye(ctx, 7.35, 9.15, 1.0, 1.5, emo);
    drawEye(ctx, 12.65, 9.15, 1.0, 1.5, emo);
    // cejas
    ctx.strokeStyle = p.hairShade || p.hair;
    ctx.lineWidth = 0.5;
    ctx.lineCap = 'round';
    if (emo === 'angry') {
      ctx.beginPath(); ctx.moveTo(5.9, 7.1); ctx.lineTo(8.4, 7.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14.1, 7.1); ctx.lineTo(11.6, 7.6); ctx.stroke();
    } else if (emo === 'sad') {
      ctx.beginPath(); ctx.moveTo(5.9, 7.5); ctx.quadraticCurveTo(7.1, 7.0, 8.3, 7.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14.1, 7.5); ctx.quadraticCurveTo(12.9, 7.0, 11.7, 7.4); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(6.1, 7.35); ctx.quadraticCurveTo(7.2, 6.95, 8.35, 7.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(13.9, 7.35); ctx.quadraticCurveTo(12.8, 6.95, 11.65, 7.25); ctx.stroke();
    }
    // naricita
    ellipse(ctx, 10, 10.55, 0.3, 0.22, 'rgba(170,95,115,.35)');
    // mejillas
    ellipse(ctx, 5.55, 11.15, 1.25, 0.72, BLUSH);
    ellipse(ctx, 14.45, 11.15, 1.25, 0.72, BLUSH);
    // boca
    drawMouth(ctx, emo);
    // brillo de la piel
    ellipse(ctx, 6.4, 5.8, 1.0, 0.42, 'rgba(255,255,255,.25)');
  }

  function hairBack(ctx, p, style) {
    const g = hairGradient(ctx, p, 2, 24);
    const edge = 'rgba(70,34,50,.22)';
    if (style === 1) {
      // melena bob
      ctx.beginPath();
      ctx.moveTo(3.4, 7.5);
      ctx.quadraticCurveTo(2.4, 15.5, 4.2, 19.5);
      ctx.quadraticCurveTo(10, 21.2, 15.8, 19.5);
      ctx.quadraticCurveTo(17.6, 15.5, 16.6, 7.5);
      ctx.quadraticCurveTo(10, 2.2, 3.4, 7.5);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 0.4; ctx.stroke();
    } else if (style === 2) {
      // rodete bajo detrás
      ellipse(ctx, 10, 3.0, 3.4, 2.8, g, edge, 0.35);
      ellipse(ctx, 8.9, 2.2, 1.5, 0.7, 'rgba(255,255,255,.16)');
    } else if (style === 3) {
      // coleta lateral
      ctx.beginPath();
      ctx.moveTo(12, 6.5);
      ctx.quadraticCurveTo(18.8, 7.2, 18.2, 14.5);
      ctx.quadraticCurveTo(17.8, 20.2, 15.2, 21.2);
      ctx.quadraticCurveTo(16.4, 14.6, 13.6, 10.2);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 0.4; ctx.stroke();
      ellipse(ctx, 16.9, 8.7, 1.0, 1.0, p.bow || p.hair);
    } else if (style === 4) {
      // rodete alto de Luna
      ellipse(ctx, 10, 2.4, 3.7, 3.0, g, edge, 0.35);
      ellipse(ctx, 8.7, 1.4, 1.7, 0.8, 'rgba(255,255,255,.2)');
    } else {
      // melena larga
      ctx.beginPath();
      ctx.moveTo(3.2, 7.0);
      ctx.quadraticCurveTo(1.6, 16.5, 3.4, 24.0);
      ctx.quadraticCurveTo(10, 26.0, 16.6, 24.0);
      ctx.quadraticCurveTo(18.4, 16.5, 16.8, 7.0);
      ctx.quadraticCurveTo(10, 1.5, 3.2, 7.0);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 0.4; ctx.stroke();
      ellipse(ctx, 5.2, 12.0, 1.2, 5.0, 'rgba(255,255,255,.10)');
    }
  }

  function hairFront(ctx, p, style) {
    const g = hairGradient(ctx, p, 2, 11);
    const edge = 'rgba(70,34,50,.22)';
    ctx.beginPath();
    ctx.moveTo(3.7, 8.1);
    ctx.quadraticCurveTo(3.3, 3.2, 10, 2.9);
    ctx.quadraticCurveTo(16.7, 3.2, 16.3, 8.1);
    ctx.quadraticCurveTo(15.2, 6.6, 14.1, 7.35);
    ctx.quadraticCurveTo(13.0, 5.5, 11.8, 7.15);
    ctx.quadraticCurveTo(10.7, 5.2, 9.6, 7.1);
    ctx.quadraticCurveTo(8.4, 5.4, 7.2, 7.3);
    ctx.quadraticCurveTo(6.2, 6.6, 5.2, 8.0);
    ctx.quadraticCurveTo(4.4, 7.0, 3.7, 8.1);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 0.35; ctx.stroke();

    // laterales
    const side = style === 1 ? 5.2 : style === 0 ? 7.0 : 4.2;
    fillRR(ctx, 3.25, 7.0, 1.75, side, 0.8, g);
    fillRR(ctx, 15.0, 7.0, 1.75, side, 0.8, g);
    // brillo
    ctx.strokeStyle = 'rgba(255,255,255,.24)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(6.0, 4.6);
    ctx.quadraticCurveTo(8.3, 3.4, 10.8, 3.8);
    ctx.stroke();

    if (style === 2) {
      // flequillo con rodete
      ellipse(ctx, 10, 2.9, 3.0, 2.1, g, edge, 0.3);
    } else if (style === 3) {
      // coleta: moño lateral
      bowShape(ctx, 16.0, 7.3, p.bow || p.hair, p.dressDark || p.hairShade, 0.62);
    } else if (style === 4) {
      // rodete alto
      ellipse(ctx, 10, 2.2, 3.2, 2.5, g, edge, 0.3);
      ellipse(ctx, 8.7, 1.4, 1.4, 0.7, 'rgba(255,255,255,.2)');
    } else if (style === 1) {
      bowShape(ctx, 4.4, 6.6, p.bow || p.hair, p.dressDark || p.hairShade, 0.6);
    }
  }

  function legsAndShoes(ctx, p) {
    // piernas
    fillRR(ctx, 6.9, 27.6, 2.15, 5.3, 1.05, skinGradient(ctx, p, 27, 33));
    fillRR(ctx, 10.95, 27.6, 2.15, 5.3, 1.05, skinGradient(ctx, p, 27, 33));
    // zapatos
    const shoeG = lg(ctx, 0, 32, 0, 35.5, [[0, p.shoe], [1, p.dressDark || p.shoe]]);
    fillRR(ctx, 6.2, 32.2, 3.7, 2.9, 1.3, shoeG);
    fillRR(ctx, 10.1, 32.2, 3.7, 2.9, 1.3, shoeG);
    ellipse(ctx, 7.4, 32.8, 1.0, 0.4, 'rgba(255,255,255,.28)');
    ellipse(ctx, 11.3, 32.8, 1.0, 0.4, 'rgba(255,255,255,.28)');
    // suela
    fillRR(ctx, 6.2, 34.4, 3.7, 0.7, 0.35, 'rgba(90,40,60,.35)');
    fillRR(ctx, 10.1, 34.4, 3.7, 0.7, 0.35, 'rgba(90,40,60,.35)');
  }

  function armsAndDress(ctx, p, assistant) {
    // brazos
    const armG = skinGradient(ctx, p, 16, 24);
    ctx.save();
    ctx.strokeStyle = armG;
    ctx.lineWidth = 1.65;
    ctx.beginPath();
    ctx.moveTo(5.5, 17.5);
    ctx.quadraticCurveTo(3.9, 20.2, 3.9, 23.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14.5, 17.5);
    ctx.quadraticCurveTo(16.1, 20.2, 16.1, 23.0);
    ctx.stroke();
    ctx.restore();
    ellipse(ctx, 3.9, 23.2, 1.0, 1.0, p.skin, 'rgba(90,45,60,.18)', 0.25);
    ellipse(ctx, 16.1, 23.2, 1.0, 1.0, p.skin, 'rgba(90,45,60,.18)', 0.25);

    // falda
    const skirtG = lg(ctx, 0, 19, 0, 30, [
      [0, p.dressLight || p.dress],
      [0.35, p.dress],
      [1, p.dressDark]
    ]);
    ctx.beginPath();
    ctx.moveTo(7.1, 19.2);
    ctx.lineTo(12.9, 19.2);
    ctx.quadraticCurveTo(14.8, 23.8, 16.3, 29.2);
    ctx.quadraticCurveTo(10, 30.8, 3.7, 29.2);
    ctx.quadraticCurveTo(5.2, 23.8, 7.1, 19.2);
    ctx.closePath();
    ctx.fillStyle = skirtG;
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,40,60,.18)';
    ctx.lineWidth = 0.4;
    ctx.stroke();
    // pliegues
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(8.2, 21.0);
    ctx.quadraticCurveTo(8.0, 25.0, 7.2, 28.6);
    ctx.moveTo(10.0, 21.0);
    ctx.quadraticCurveTo(10.0, 25.0, 10.0, 29.0);
    ctx.moveTo(11.8, 21.0);
    ctx.quadraticCurveTo(12.0, 25.0, 12.8, 28.6);
    ctx.stroke();
    // ruedo
    ctx.strokeStyle = p.dressDark;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(4.4, 29.2);
    ctx.quadraticCurveTo(10, 30.4, 15.6, 29.2);
    ctx.stroke();

    // corpiño
    const bodiceG = lg(ctx, 0, 15, 0, 21, [
      [0, p.dressLight || p.dress],
      [1, p.dress]
    ]);
    ctx.beginPath();
    ctx.moveTo(6.8, 15.3);
    ctx.quadraticCurveTo(10, 16.4, 13.2, 15.3);
    ctx.lineTo(12.7, 20.1);
    ctx.quadraticCurveTo(10, 21.0, 7.3, 20.1);
    ctx.closePath();
    ctx.fillStyle = bodiceG;
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,40,60,.18)';
    ctx.lineWidth = 0.35;
    ctx.stroke();
    // escote
    ctx.beginPath();
    ctx.moveTo(7.8, 15.8);
    ctx.quadraticCurveTo(10, 18.0, 12.2, 15.8);
    ctx.strokeStyle = p.ribbon || 'rgba(255,255,255,.7)';
    ctx.lineWidth = 0.55;
    ctx.stroke();

    // mangas
    ellipse(ctx, 5.6, 16.8, 1.8, 1.35, p.dress, 'rgba(90,40,60,.18)', 0.25);
    ellipse(ctx, 14.4, 16.8, 1.8, 1.35, p.dress, 'rgba(90,40,60,.18)', 0.25);
    // cintura
    fillRR(ctx, 7.0, 19.1, 6.0, 1.05, 0.5, p.ribbon || p.dressLight || '#fff');
    bowShape(ctx, 10, 19.6, p.bow || p.dressDark, p.dressDark, 0.48);

    // botones / brillo
    ellipse(ctx, 8.0, 17.2, 0.28, 0.28, 'rgba(255,255,255,.55)');
    ellipse(ctx, 11.8, 24.2, 0.4, 0.28, 'rgba(255,255,255,.22)');

    if (assistant) {
      // delantal de Luna
      const apronG = lg(ctx, 0, 18, 0, 29, [[0, '#fffaf7'], [1, '#ffeaf2']]);
      ctx.beginPath();
      ctx.moveTo(7.2, 19.6);
      ctx.lineTo(12.8, 19.6);
      ctx.quadraticCurveTo(13.5, 24.0, 12.2, 27.6);
      ctx.quadraticCurveTo(10, 28.4, 7.8, 27.6);
      ctx.quadraticCurveTo(6.5, 24.0, 7.2, 19.6);
      ctx.closePath();
      ctx.fillStyle = apronG;
      ctx.fill();
      ctx.strokeStyle = 'rgba(210,140,165,.45)';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      // tiras
      ctx.strokeStyle = '#fffaf7';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(7.2, 19.7); ctx.lineTo(6.2, 16.8);
      ctx.moveTo(12.8, 19.7); ctx.lineTo(13.8, 16.8);
      ctx.stroke();
      // corazón
      heartPath(ctx, 10, 23.4, 1.15);
      ctx.fillStyle = '#ff8fb2';
      ctx.fill();
      // bolsillo
      fillRR(ctx, 9.0, 25.2, 2.0, 1.25, 0.35, 'rgba(255,210,225,.9)');
    }
  }

  function characterSprite(p, opts) {
    const o = opts || {};
    const style = o.style == null ? 0 : o.style;
    const emo = o.emotion || 'happy';
    const key = 'ch|' + (p.name || 'luna') + '|' + style + '|' + emo + '|' + (o.assistant ? 1 : 0);
    if (spriteCache[key]) return spriteCache[key];
    const c = make(20, 36);
    const ctx = c.getContext('2d');
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    hairBack(ctx, p, style);
    legsAndShoes(ctx, p);
    armsAndDress(ctx, p, o.assistant);
    headBase(ctx, p, emo);
    hairFront(ctx, p, style);
    if (o.assistant) {
      bowShape(ctx, 10, 2.4, p.bow, p.dressDark, 0.78);
    }
    spriteCache[key] = c;
    return c;
  }

  /* ============================================================
     Vestidos e íconos
     ============================================================ */
  function dressSprite(type, opts) {
    const o = opts || {};
    const key = 'd|' + type + (o.hanger ? '|h' : '');
    if (spriteCache[key]) return spriteCache[key];
    const t = BL.DRESSES[type] || BL.DRESSES.dots;
    const c = make(12, 14);
    const ctx = c.getContext('2d');
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // tirantes
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(4.1, 1.0); ctx.lineTo(4.1, 2.8);
    ctx.moveTo(7.9, 1.0); ctx.lineTo(7.9, 2.8);
    ctx.stroke();

    // falda
    const skirtG = lg(ctx, 0, 5, 0, 13.5, [
      [0, t.light],
      [0.32, t.color],
      [1, t.dark]
    ]);
    ctx.beginPath();
    ctx.moveTo(3.5, 5.0);
    ctx.lineTo(8.5, 5.0);
    ctx.quadraticCurveTo(9.6, 8.4, 11.2, 12.9);
    ctx.quadraticCurveTo(6.0, 14.0, 0.8, 12.9);
    ctx.quadraticCurveTo(2.4, 8.4, 3.5, 5.0);
    ctx.closePath();
    ctx.fillStyle = skirtG;
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,36,56,.2)';
    ctx.lineWidth = 0.35;
    ctx.stroke();

    // corpiño
    const bodiceG = lg(ctx, 0, 2, 0, 6, [[0, t.light], [1, t.color]]);
    ctx.beginPath();
    ctx.moveTo(3.2, 2.7);
    ctx.quadraticCurveTo(6, 3.6, 8.8, 2.7);
    ctx.lineTo(8.5, 5.2);
    ctx.quadraticCurveTo(6, 6.0, 3.5, 5.2);
    ctx.closePath();
    ctx.fillStyle = bodiceG;
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,36,56,.18)';
    ctx.lineWidth = 0.3;
    ctx.stroke();

    // escote
    ctx.strokeStyle = t.ribbon;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(4.0, 3.1);
    ctx.quadraticCurveTo(6, 4.7, 8.0, 3.1);
    ctx.stroke();

    // cintura
    fillRR(ctx, 3.3, 4.9, 5.4, 0.85, 0.4, t.ribbon);
    bowShape(ctx, 6, 5.3, t.ribbon, t.dark, 0.38);

    // brillo
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.ellipse(4.4, 8.0, 0.7, 2.2, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // patrón
    if (type === 'floral') {
      const flower = (x, y) => {
        ctx.fillStyle = t.pattern;
        [[0, -0.55], [0.55, 0], [0, 0.55], [-0.55, 0]].forEach(([dx, dy]) => {
          ellipse(ctx, x + dx, y + dy, 0.38, 0.38, t.pattern);
        });
        ellipse(ctx, x, y, 0.28, 0.28, '#ffe39a');
      };
      flower(2.8, 8.2);
      flower(7.8, 9.4);
      flower(5.3, 11.2);
      flower(9.4, 11.6);
    } else {
      [[2.5, 7.8], [5.2, 8.9], [8.2, 7.5], [4.0, 11.2], [7.5, 11.8], [9.6, 9.9]].forEach(([x, y]) => {
        ellipse(ctx, x, y, 0.42, 0.42, t.pattern);
      });
    }

    // ruedo
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(1.2, 12.9);
    ctx.quadraticCurveTo(6, 13.8, 10.8, 12.9);
    ctx.stroke();

    if (o.hanger) {
      ctx.strokeStyle = '#d9a566';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(6, 0.8, 0.8, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1.4, 2.4); ctx.lineTo(10.6, 2.4);
      ctx.stroke();
    }

    spriteCache[key] = c;
    return c;
  }

  function iconSprite(name, color) {
    const key = 'i|' + name + '|' + (color || '');
    if (spriteCache[key]) return spriteCache[key];
    const c = make(10, 10);
    const ctx = c.getContext('2d');
    const col = color || '#d95b87';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (name === 'hanger') {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.arc(5, 2.25, 1.15, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, 3.35);
      ctx.lineTo(1.5, 6.3);
      ctx.quadraticCurveTo(0.75, 6.9, 1.55, 7.35);
      ctx.lineTo(8.45, 7.35);
      ctx.quadraticCurveTo(9.25, 6.9, 8.5, 6.3);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(2.2, 6.8); ctx.lineTo(5, 4.4); ctx.lineTo(7.8, 6.8);
      ctx.stroke();
    } else if (name === 'coin') {
      ellipse(ctx, 5, 5, 4.25, 4.25, rg(ctx, 3.4, 3.2, 0.3, 5.5, [
        [0, '#fff4b8'], [0.35, '#ffd45c'], [0.78, '#f3b73c'], [1, '#cf8e1e']
      ]), 'rgba(150,95,20,.45)', 0.55);
      ellipse(ctx, 5, 5, 3.0, 3.0, 'rgba(255,244,184,.28)', 'rgba(255,244,184,.55)', 0.35);
      starPath(ctx, 5, 5, 1.65, 0.72);
      ctx.fillStyle = '#fff1ad';
      ctx.fill();
      ellipse(ctx, 3.7, 3.4, 0.9, 0.45, 'rgba(255,255,255,.65)');
    } else if (name === 'heart') {
      heartPath(ctx, 5, 4.6, 3.55);
      ctx.fillStyle = rg(ctx, 3.5, 3, 0.2, 5.5, [
        [0, '#ffc0d8'], [0.45, col], [1, 'rgba(170,55,95,.95)']
      ]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(130,40,75,.25)';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      ellipse(ctx, 3.4, 3.2, 0.8, 0.42, 'rgba(255,255,255,.55)');
    } else if (name === 'hand') {
      fillRR(ctx, 3.2, 4.2, 4.2, 4.2, 1.6, col);
      fillRR(ctx, 2.4, 3.2, 1.35, 4.1, 0.65, col);
      fillRR(ctx, 4.0, 1.7, 1.35, 4.4, 0.65, col);
      fillRR(ctx, 5.6, 1.9, 1.35, 4.2, 0.65, col);
      fillRR(ctx, 7.1, 3.2, 1.3, 3.9, 0.65, col);
      ellipse(ctx, 4.0, 7.8, 1.7, 0.9, col);
      ellipse(ctx, 3.8, 4.1, 0.5, 0.8, 'rgba(255,255,255,.22)');
    } else if (name === 'clock') {
      ellipse(ctx, 5, 5, 4.1, 4.1, 'rgba(255,250,245,.95)', col, 0.9);
      ellipse(ctx, 5, 5, 3.2, 3.2, 'rgba(255,255,255,.45)');
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(5, 2.7); ctx.lineTo(5, 5.2); ctx.lineTo(7.1, 6.4);
      ctx.stroke();
      ellipse(ctx, 5, 1.3, 0.6, 0.35, col);
    } else if (name === 'star') {
      starPath(ctx, 5, 5.1, 4.4, 1.9);
      ctx.fillStyle = rg(ctx, 4.2, 3.8, 0.3, 5.5, [
        [0, '#fff3b0'], [0.45, '#ffd45c'], [1, col]
      ]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,95,20,.25)';
      ctx.lineWidth = 0.3;
      ctx.stroke();
      ellipse(ctx, 3.6, 3.4, 0.7, 0.4, 'rgba(255,255,255,.55)');
    } else if (name === 'crown') {
      ctx.beginPath();
      ctx.moveTo(1.2, 7.8);
      ctx.lineTo(1.2, 2.2);
      ctx.lineTo(3.4, 4.5);
      ctx.lineTo(5, 1.3);
      ctx.lineTo(6.6, 4.5);
      ctx.lineTo(8.8, 2.2);
      ctx.lineTo(8.8, 7.8);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, 1, 0, 8, [[0, '#fff1a6'], [0.5, '#ffd45c'], [1, col]]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,95,20,.35)';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      ellipse(ctx, 5, 6.3, 0.55, 0.55, '#e04f6a');
      ellipse(ctx, 2.5, 6.8, 0.35, 0.35, '#7ac9a4');
      ellipse(ctx, 7.5, 6.8, 0.35, 0.35, '#7ac9a4');
    } else if (name === 'arrow') {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(5, 8.8);
      ctx.lineTo(5, 1.6);
      ctx.moveTo(1.8, 4.6);
      ctx.lineTo(5, 1.3);
      ctx.lineTo(8.2, 4.6);
      ctx.stroke();
    } else if (name === 'room' || name === 'curtain') {
      // probador: arco con cortina
      fillRR(ctx, 1.3, 1.5, 7.4, 7.7, 2.7, lg(ctx, 0, 1, 0, 9, [
        [0, '#fff8f2'], [1, '#ffe6ee']
      ]));
      strokeRR(ctx, 1.3, 1.5, 7.4, 7.7, 2.7, 'rgba(150,65,100,.5)', 0.55);
      // varilla
      fillRR(ctx, 1.0, 1.4, 8.0, 0.9, 0.45, lg(ctx, 0, 1, 0, 2.4, [
        [0, '#ffe7a3'], [1, '#d99a3c']
      ]));
      // cortinas
      const cg = lg(ctx, 0, 2, 0, 8.6, [[0, '#ff9fc0'], [0.55, '#f27ba6'], [1, '#d9527f']]);
      fillRR(ctx, 2.0, 2.4, 2.25, 6.3, 0.9, cg);
      fillRR(ctx, 5.75, 2.4, 2.25, 6.3, 0.9, cg);
      // pliegues
      ctx.strokeStyle = 'rgba(255,190,215,.65)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(2.8, 2.7); ctx.lineTo(2.8, 8.4);
      ctx.moveTo(3.7, 2.7); ctx.lineTo(3.7, 8.4);
      ctx.moveTo(6.3, 2.7); ctx.lineTo(6.3, 8.4);
      ctx.moveTo(7.2, 2.7); ctx.lineTo(7.2, 8.4);
      ctx.stroke();
      // hueco central
      fillRR(ctx, 4.55, 3.1, 0.9, 5.2, 0.4, 'rgba(255,248,242,.9)');
      // corazón
      heartPath(ctx, 5, 5.1, 0.85);
      ctx.fillStyle = '#e76d99';
      ctx.fill();
    }
    spriteCache[key] = c;
    return c;
  }

  /* ============================================================
     Salón
     ============================================================ */
  function drawWall(ctx, accent) {
    const wallG = lg(ctx, 0, 0, 0, ROOM.wallH, [
      [0, '#ffeef5'],
      [0.5, '#ffdeea'],
      [1, '#ffd1e1']
    ]);
    px(ctx, 0, 0, ART.w, ROOM.wallH, wallG);

    // luz ambiental
    ctx.fillStyle = rg(ctx, 200, 12, 10, 245, [
      [0, 'rgba(255,255,255,.55)'],
      [0.55, 'rgba(255,255,255,.15)'],
      [1, 'rgba(255,255,255,0)']
    ]);
    ctx.fillRect(0, 0, ART.w, ROOM.wallH);

    // paneles verticales suaves
    for (let x = 0; x < ART.w; x += 50) {
      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 8);
      ctx.lineTo(x + 0.5, ROOM.wallH - 13);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(196,112,145,.10)';
      ctx.beginPath();
      ctx.moveTo(x + 1.5, 8);
      ctx.lineTo(x + 1.5, ROOM.wallH - 13);
      ctx.stroke();
    }

    // cornisa
    fillRR(ctx, 0, 0, ART.w, 6.5, 0, lg(ctx, 0, 0, 0, 6.5, [
      [0, '#fff8fb'], [0.5, '#ffd9e7'], [1, '#f3b7cd']
    ]));
    px(ctx, 0, 5.8, ART.w, 1.1, 'rgba(180,95,130,.25)');

    // zócalo
    fillRR(ctx, 0, ROOM.wallH - 13, ART.w, 13, 0, lg(ctx, 0, ROOM.wallH - 13, 0, ROOM.wallH, [
      [0, '#fff7fb'], [1, '#f4d7e4']
    ]));
    px(ctx, 0, ROOM.wallH - 13, ART.w, 1.2, 'rgba(255,255,255,.8)');
    px(ctx, 0, ROOM.wallH - 4, ART.w, 2, 'rgba(190,120,150,.18)');

    // guirnalda
    ctx.strokeStyle = 'rgba(186,105,135,.55)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(18, 14);
    ctx.quadraticCurveTo(200, 28, 382, 14);
    ctx.stroke();
    const flags = ['#ff9fbe', '#ffd47f', '#a9e3c8', '#b7c9f2', '#e0b6f2'];
    for (let i = 0; i < 18; i++) {
      const x = 26 + i * 20;
      const sag = Math.sin((i / 17) * Math.PI) * 6;
      const y = 15 + sag;
      const col = flags[i % flags.length];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 7.5, y);
      ctx.quadraticCurveTo(x + 4.5, y + 5.2, x + 3.8, y + 6.5);
      ctx.quadraticCurveTo(x + 2.8, y + 5.2, x, y);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,55,80,.12)';
      ctx.lineWidth = 0.3;
      ctx.stroke();
      ellipse(ctx, x + 2.6, y + 1.2, 0.7, 0.35, 'rgba(255,255,255,.35)');
    }

    // cuadro con corazón
    const fx = 236, fy = 67, fw = 34, fh = 27;
    fillRR(ctx, fx - 1, fy - 1, fw + 2, fh + 2, 4, lg(ctx, 0, fy, 0, fy + fh, [
      [0, '#ffe8b3'], [0.5, '#e9b56a'], [1, '#c98f4e']
    ]));
    fillRR(ctx, fx + 2, fy + 2, fw - 4, fh - 4, 2.5, lg(ctx, 0, fy, 0, fy + fh, [
      [0, '#fffdf8'], [1, '#fff1f6']
    ]));
    heartPath(ctx, fx + fw / 2, fy + fh / 2 - 1, 6.4);
    ctx.fillStyle = lg(ctx, 0, fy + 6, 0, fy + 20, [[0, '#ffb6cf'], [1, accent]]);
    ctx.fill();
    ellipse(ctx, fx + 13, fy + 10, 2.2, 1.0, 'rgba(255,255,255,.45)');
    // gancho
    ctx.strokeStyle = 'rgba(160,100,120,.35)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(fx + fw / 2, fy - 1);
    ctx.lineTo(fx + fw / 2, fy - 4);
    ctx.stroke();
  }

  function drawFloor(ctx, accent) {
    const y0 = ROOM.wallH;
    px(ctx, 0, y0, ART.w, ART.h - y0, lg(ctx, 0, y0, 0, ART.h, [
      [0, '#faf1f5'], [0.55, '#f0e3e9'], [1, '#e3d1db']
    ]));

    // tablas con perspectiva suave
    for (let y = y0; y < ART.h; y += 10) {
      const k = (y - y0) / (ART.h - y0);
      px(ctx, 0, y, ART.w, 10, k < 0.5 ? 'rgba(255,255,255,.16)' : 'rgba(150,95,120,.035)');
      ctx.strokeStyle = 'rgba(150,100,125,.12)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(ART.w, y + 0.5);
      ctx.stroke();
      const seam = (Math.floor((y - y0) / 10) % 2) ? 24 : 0;
      for (let x = seam; x < ART.w; x += 48) {
        ctx.strokeStyle = 'rgba(150,100,125,.10)';
        ctx.beginPath();
        ctx.moveTo(x + 0.5, y);
        ctx.lineTo(x + 0.5, y + 10);
        ctx.stroke();
      }
    }

    // brillo del piso
    ctx.fillStyle = rg(ctx, 175, 190, 10, 160, [
      [0, 'rgba(255,255,255,.24)'],
      [1, 'rgba(255,255,255,0)']
    ]);
    ctx.fillRect(0, y0, ART.w, ART.h - y0);

    // alfombra
    ellipse(ctx, 158, 212, 98, 20.5, 'rgba(120,60,85,.16)');
    ellipse(ctx, 158, 210.5, 96, 19.5, lg(ctx, 0, 191, 0, 230, [
      [0, '#ffd7e7'], [0.55, '#ffc0d8'], [1, '#f3a6c5']
    ]));
    ellipse(ctx, 158, 210, 91, 16.5, lg(ctx, 0, 193, 0, 227, [
      [0, '#fff4f8'], [0.65, '#ffe5ef'], [1, '#ffd1e2']
    ]));
    ellipse(ctx, 158, 210, 68, 11, 'rgba(255,190,214,.55)');
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(158, 210, 80, 13.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // reflejos verticales
    [[88, 40], [318, 34], [200, 60]].forEach(([x, w]) => {
      ctx.fillStyle = lg(ctx, x, y0, x, ART.h, [
        [0, 'rgba(255,255,255,.18)'],
        [1, 'rgba(255,255,255,0)']
      ]);
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y0);
      ctx.lineTo(x + w / 2, y0);
      ctx.lineTo(x + w * 0.9, ART.h);
      ctx.lineTo(x - w * 0.9, ART.h);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawDoor(ctx) {
    const d = ROOM.door;
    softShadow(ctx, d.x + d.w / 2, ROOM.wallH - 2, d.w * 0.7, 7, 0.22);
    // marco
    fillRR(ctx, d.x, d.y - 3, d.w, d.h + 3, d.w / 2, lg(ctx, 0, d.y, 0, d.y + d.h, [
      [0, '#ffd7e6'], [0.55, '#f7b4cf'], [1, '#e78fb4']
    ]));
    strokeRR(ctx, d.x, d.y - 3, d.w, d.h + 3, d.w / 2, 'rgba(150,65,100,.35)', 0.7);
    // hueco
    fillRR(ctx, d.x + 4, d.y + 2, d.w - 8, d.h - 3, (d.w - 8) / 2, lg(ctx, 0, d.y, 0, d.y + d.h, [
      [0, '#f4fdff'], [0.5, '#dff5fa'], [1, '#c9e9f2']
    ]));
    // brillos del vidrio
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath();
    ctx.ellipse(d.x + 15, d.y + 26, 3.2, 13, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath();
    ctx.ellipse(d.x + 24, d.y + 38, 7, 2.2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // travesaño
    ctx.strokeStyle = 'rgba(150,195,205,.45)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(d.x + 5, d.y + 36);
    ctx.lineTo(d.x + d.w - 5, d.y + 36);
    ctx.stroke();
    // picaporte
    ellipse(ctx, d.x + d.w - 10, d.y + 34, 1.3, 1.3, '#ffd977', 'rgba(150,95,20,.4)', 0.35);
    ellipse(ctx, d.x + d.w - 10.3, d.y + 33.5, 0.45, 0.45, 'rgba(255,255,255,.7)');
    // toldo
    ctx.beginPath();
    ctx.moveTo(d.x - 4, d.y - 9);
    ctx.quadraticCurveTo(d.x + d.w / 2, d.y - 16, d.x + d.w + 4, d.y - 9);
    ctx.lineTo(d.x + d.w + 1, d.y - 4);
    ctx.quadraticCurveTo(d.x + d.w / 2, d.y - 10, d.x - 1, d.y - 4);
    ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, d.y - 16, 0, d.y - 4, [[0, '#ffb0cc'], [1, '#e8759f']]);
    ctx.fill();
    for (let x = d.x - 1; x < d.x + d.w + 2; x += 8) {
      ellipse(ctx, x + 4, d.y - 5.5, 4, 2.2, 'rgba(255,255,255,.22)');
    }
    // felpudo
    fillRR(ctx, d.x - 3, ROOM.wallH - 5, d.w + 6, 5, 2.5, lg(ctx, 0, ROOM.wallH - 5, 0, ROOM.wallH, [
      [0, '#ffe4ef'], [1, '#f2b8cf']
    ]));
    // campanita
    ellipse(ctx, d.x + d.w / 2, d.y - 12, 2.0, 1.6, '#ffd977', 'rgba(150,95,20,.35)', 0.3);
    ellipse(ctx, d.x + d.w / 2 - 0.5, d.y - 12.5, 0.6, 0.45, 'rgba(255,255,255,.7)');
    // cartel abierto
    fillRR(ctx, d.x + 7, d.y - 24, 30, 7.5, 3, '#fffaf7');
    strokeRR(ctx, d.x + 7, d.y - 24, 30, 7.5, 3, 'rgba(180,100,130,.35)', 0.35);
    ellipse(ctx, d.x + 12, d.y - 20.2, 1.4, 1.4, '#7ac9a4');
    fillRR(ctx, d.x + 16, d.y - 21.2, 15, 2.2, 1.1, 'rgba(217,79,127,.55)');
    fillRR(ctx, d.x + 16, d.y - 18.3, 10, 1.7, 0.85, 'rgba(217,79,127,.28)');
  }

  function drawRacks(ctx) {
    ROOM.racks.forEach((r, i) => {
      const t = BL.DRESSES[r.type];
      softShadow(ctx, r.x + r.w / 2, r.y + r.h - 1, r.w * 0.58, 6.5, 0.20);
      const wood = lg(ctx, 0, r.y + 8, 0, r.y + r.h, [
        [0, '#f0c48d'], [0.5, '#d9a566'], [1, '#b57c45']
      ]);
      // patas
      fillRR(ctx, r.x + 4, r.y + 16, 2.8, r.h - 18, 1.3, wood);
      fillRR(ctx, r.x + r.w - 6.8, r.y + 16, 2.8, r.h - 18, 1.3, wood);
      fillRR(ctx, r.x + 1.5, r.y + r.h - 4, 7.5, 2.8, 1.3, wood);
      fillRR(ctx, r.x + r.w - 9, r.y + r.h - 4, 7.5, 2.8, 1.3, wood);
      // barra
      fillRR(ctx, r.x + 2, r.y + 10, r.w - 4, 2.6, 1.2, lg(ctx, 0, r.y + 10, 0, r.y + 13, [
        [0, '#ffe0b0'], [1, '#c98f55']
      ]));
      // remates
      ellipse(ctx, r.x + 3.4, r.y + 8.2, 1.7, 1.7, wood);
      ellipse(ctx, r.x + r.w - 3.4, r.y + 8.2, 1.7, 1.7, wood);
      // cartel
      fillRR(ctx, r.x + r.w / 2 - 8, r.y - 4, 16, 9, 4, '#fffaf7');
      strokeRR(ctx, r.x + r.w / 2 - 8, r.y - 4, 16, 9, 4, 'rgba(160,90,120,.3)', 0.35);
      ellipse(ctx, r.x + r.w / 2 - 3.2, r.y + 0.5, 1.8, 1.8, t.swatch);
      fillRR(ctx, r.x + r.w / 2, r.y - 1.1, 5.5, 2.0, 1.0, t.light);
      fillRR(ctx, r.x + r.w / 2, r.y + 1.4, 4.0, 1.4, 0.7, t.pattern);

      // vestidos colgados
      const dress = dressSprite(r.type);
      [8, 23, 38].forEach((off, k) => {
        const dx = r.x + off;
        const dy = r.y + 13 + (k === 1 ? 1 : 0);
        ctx.strokeStyle = '#c99a62';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(dx + 6, r.y + 11);
        ctx.lineTo(dx + 6, dy);
        ctx.stroke();
        ellipse(ctx, dx + 6, r.y + 11, 0.7, 0.7, '#e3b077');
        ctx.drawImage(dress, dx, dy, 12, 14);
      });
      // brillo del perchero
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath();
      ctx.ellipse(r.x + 10, r.y + 26, 0.8, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      if (i === 0) {
        fillRR(ctx, r.x - 3, ROOM.wallH - 10, 4.5, 7, 1.4, '#e7c7a0');
      }
    });
  }

  function drawMirror(ctx) {
    const m = ROOM.mirror;
    softShadow(ctx, m.x + m.w / 2, m.y + m.h + 1, m.w * 0.55, 5, 0.18);
    // patas
    fillRR(ctx, m.x + 7, m.y + m.h - 2, 3, 5, 1.2, '#d9a566');
    fillRR(ctx, m.x + m.w - 10, m.y + m.h - 2, 3, 5, 1.2, '#d9a566');
    // marco
    fillRR(ctx, m.x, m.y, m.w, m.h, m.w / 2, lg(ctx, 0, m.y, 0, m.y + m.h, [
      [0, '#ffe1a6'], [0.45, '#e8b56f'], [1, '#c98f4e']
    ]));
    strokeRR(ctx, m.x, m.y, m.w, m.h, m.w / 2, 'rgba(150,95,40,.28)', 0.6);
    // vidrio
    fillRR(ctx, m.x + 3, m.y + 3, m.w - 6, m.h - 7, (m.w - 6) / 2, lg(ctx, 0, m.y, 0, m.y + m.h, [
      [0, '#f4feff'], [0.55, '#dcf4f7'], [1, '#c5e7ee']
    ]));
    // brillos
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.ellipse(m.x + 14, m.y + 24, 3, 17, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.ellipse(m.x + 24, m.y + 42, 8, 2.2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // copete
    ellipse(ctx, m.x + m.w / 2, m.y - 3, 2.4, 2.4, '#e8b56f', 'rgba(150,95,40,.25)', 0.3);
    ellipse(ctx, m.x + m.w / 2, m.y - 3.6, 0.8, 0.8, '#ffe6a8');
  }

  function drawCabinsStatic(ctx) {
    ROOM.cabins.forEach((c, i) => {
      softShadow(ctx, c.x + c.w / 2, ROOM.wallH - 2, c.w * 0.62, 7, 0.20);
      // cuerpo
      fillRR(ctx, c.x, c.y, c.w, c.h, 10, lg(ctx, 0, c.y, 0, c.y + c.h, [
        [0, '#ffd0e0'], [0.5, '#f7a9c7'], [1, '#e98ab0']
      ]));
      strokeRR(ctx, c.x, c.y, c.w, c.h, 10, 'rgba(150,65,100,.3)', 0.65);
      // interior
      fillRR(ctx, c.x + 3, c.y + 11, c.w - 6, c.h - 17, 7, lg(ctx, 0, c.y, 0, c.y + c.h, [
        [0, '#fff8ec'], [1, '#ffe8d4']
      ]));
      // espejo interior
      fillRR(ctx, c.x + 9, c.y + 19, c.w - 18, c.h - 33, 8, lg(ctx, 0, c.y + 19, 0, c.y + c.h, [
        [0, '#f5feff'], [1, '#d7eff4']
      ]));
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.beginPath();
      ctx.ellipse(c.x + 16, c.y + 32, 2.2, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // banquito
      fillRR(ctx, c.x + 8, c.y + c.h - 16, c.w - 16, 3.4, 1.6, lg(ctx, 0, c.y + c.h - 16, 0, c.y + c.h, [
        [0, '#ffd6e4'], [1, '#e9b7ce']
      ]));
      fillRR(ctx, c.x + 10, c.y + c.h - 12.6, 2.3, 5, 1.1, '#c98faa');
      fillRR(ctx, c.x + c.w - 12.3, c.y + c.h - 12.6, 2.3, 5, 1.1, '#c98faa');
      // varilla
      fillRR(ctx, c.x + 2, c.y + 7, c.w - 4, 2.2, 1.1, lg(ctx, 0, c.y + 7, 0, c.y + 9.2, [
        [0, '#ffe2a6'], [1, '#c98f55']
      ]));
      // barrales
      fillRR(ctx, c.x - 1, c.y + 5, 2.6, c.h - 8, 1.3, '#e2ab70');
      fillRR(ctx, c.x + c.w - 1.6, c.y + 5, 2.6, c.h - 8, 1.3, '#e2ab70');
      // copete festoneado
      fillRR(ctx, c.x - 1, c.y - 1, c.w + 2, 9, 5, lg(ctx, 0, c.y - 1, 0, c.y + 8, [
        [0, '#ff9fbe'], [1, '#f27ba6']
      ]));
      for (let x = c.x + 1; x < c.x + c.w - 1; x += 6) {
        ellipse(ctx, x + 3, c.y + 8.2, 3.4, 2.0, '#f27ba6');
      }
      // placa del número
      fillRR(ctx, c.x + c.w / 2 - 5, c.y + 2, 10, 6.5, 3, '#fffaf7');
      strokeRR(ctx, c.x + c.w / 2 - 5, c.y + 2, 10, 6.5, 3, 'rgba(160,90,120,.3)', 0.3);
      ctx.fillStyle = '#c94d7c';
      ctx.font = '700 5.5px Fredoka, Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), c.x + c.w / 2, c.y + 5.5);
      // perchero interior
      ctx.strokeStyle = 'rgba(190,140,90,.55)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(c.x + 7, c.y + 24);
      ctx.lineTo(c.x + c.w - 7, c.y + 24);
      ctx.stroke();
      // base de la lámpara (la luz es dinámica)
      fillRR(ctx, c.x + c.w / 2 - 2.5, c.y + 2.5, 5, 2.4, 1.2, 'rgba(90,40,60,.35)');
    });
  }

  function drawRegister(ctx) {
    const r = ROOM.register;
    softShadow(ctx, r.x + r.w / 2, r.y + r.h + 1, r.w * 0.6, 7, 0.20);
    // mostrador
    fillRR(ctx, r.x, r.y, r.w, r.h, 9, lg(ctx, 0, r.y, 0, r.y + r.h, [
      [0, '#ffe8cf'], [0.55, '#ffd9b6'], [1, '#eeb98a']
    ]));
    strokeRR(ctx, r.x, r.y, r.w, r.h, 9, 'rgba(150,95,55,.28)', 0.6);
    // tapa brillante
    fillRR(ctx, r.x + 1.5, r.y + 1.5, r.w - 3, 6.5, 5, lg(ctx, 0, r.y, 0, r.y + 8, [
      [0, '#fff8ec'], [1, '#f3c9a0']
    ]));
    gloss(ctx, r.x + 4, r.y + 2, r.w - 8, 5, 3, 0.4);
    // panel
    fillRR(ctx, r.x + 7, r.y + 11, r.w - 14, 8, 4, lg(ctx, 0, r.y + 11, 0, r.y + 19, [
      [0, '#ffd6e3'], [1, '#f7b7ce']
    ]));
    heartPath(ctx, r.x + r.w / 2, r.y + 14.6, 1.8);
    ctx.fillStyle = '#e76d99';
    ctx.fill();
    // cajón
    fillRR(ctx, r.x + 8, r.y + 20.5, r.w - 16, 3.5, 1.7, '#e8b789');
    fillRR(ctx, r.x + r.w / 2 - 4, r.y + 21.5, 8, 1.2, 0.6, '#c98f55');

    // máquina registradora
    const mx = r.x + 34, my = r.y - 15;
    fillRR(ctx, mx, my, 30, 14.5, 4, lg(ctx, 0, my, 0, my + 14.5, [
      [0, '#77727f'], [1, '#4d4a55']
    ]));
    strokeRR(ctx, mx, my, 30, 14.5, 4, 'rgba(40,30,45,.35)', 0.5);
    // pantalla
    fillRR(ctx, mx + 2.5, my + 2.5, 18, 7, 2, lg(ctx, 0, my + 2, 0, my + 9, [
      [0, '#d8f5ea'], [1, '#8fd6b8']
    ]));
    fillRR(ctx, mx + 4, my + 4, 3, 3, 1, '#4ea781');
    fillRR(ctx, mx + 8, my + 4, 9, 1.2, 0.6, 'rgba(78,167,129,.65)');
    fillRR(ctx, mx + 8, my + 6, 6, 1.0, 0.5, 'rgba(78,167,129,.4)');
    // teclado
    fillRR(ctx, mx + 21.5, my + 2.5, 6.5, 8, 1.6, '#6b6675');
    for (let k = 0; k < 3; k++) fillRR(ctx, mx + 22.5, my + 3.5 + k * 2.2, 4.5, 1.0, 0.5, '#b7b1c0');
    fillRR(ctx, mx + 2.5, my + 10.5, 18, 2.2, 1.1, '#6b6675');
    ellipse(ctx, mx + 4.5, my + 11.6, 0.8, 0.8, '#ffd45c');
    // recibo
    fillRR(ctx, mx - 3.5, my + 9, 3.5, 8.5, 1, '#fffaf2');
    ctx.strokeStyle = 'rgba(180,150,130,.45)';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(mx - 2.5, my + 11); ctx.lineTo(mx - 1.0, my + 11);
    ctx.moveTo(mx - 2.5, my + 13); ctx.lineTo(mx - 1.0, my + 13);
    ctx.stroke();
    // campana
    ellipse(ctx, r.x + r.w - 9, r.y - 4.5, 3.2, 2.6, lg(ctx, 0, r.y - 7, 0, r.y - 2, [
      [0, '#ffe9a8'], [1, '#e8a93d']
    ]), 'rgba(150,95,20,.3)', 0.3);
    ellipse(ctx, r.x + r.w - 9.5, r.y - 5.3, 0.9, 0.5, 'rgba(255,255,255,.7)');
    // planta
    fillRR(ctx, r.x + 5, r.y - 6, 7, 6, 2.5, '#e9b7ce');
    ctx.strokeStyle = '#5fa87f';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(r.x + 8.5, r.y - 6);
    ctx.quadraticCurveTo(r.x + 7.5, r.y - 11, r.x + 6.5, r.y - 12);
    ctx.moveTo(r.x + 8.5, r.y - 7);
    ctx.quadraticCurveTo(r.x + 10, r.y - 12, r.x + 11.5, r.y - 12.5);
    ctx.stroke();
    ellipse(ctx, r.x + 6.3, r.y - 12.2, 1.1, 0.7, '#7bc79a');
    ellipse(ctx, r.x + 11.7, r.y - 12.7, 1.1, 0.7, '#7bc79a');
    // monedas
    ellipse(ctx, r.x + r.w - 21, r.y - 2.5, 1.8, 1.2, '#ffd45c');
    ellipse(ctx, r.x + r.w - 18, r.y - 1.8, 1.3, 1.0, '#f3b73c');
  }

  function drawShelf(ctx) {
    const s = ROOM.shelf;
    const B = s.y + s.h - 2;
    softShadow(ctx, s.x + s.w / 2, B + 2, s.w * 0.55, 4, 0.14);
    fillRR(ctx, s.x, B, s.w, 2.6, 1.2, lg(ctx, 0, B, 0, B + 2.6, [
      [0, '#f0c48d'], [1, '#c98f55']
    ]));
    fillRR(ctx, s.x, B + 2.2, s.w, 1.1, 0.5, 'rgba(150,95,55,.35)');
    // planta
    fillRR(ctx, s.x + 6, B - 8, 4.5, 8, 1.8, '#e9b7ce');
    ctx.strokeStyle = '#5fa87f';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(s.x + 8.2, B - 8);
    ctx.quadraticCurveTo(s.x + 7, B - 13, s.x + 6, B - 14);
    ctx.moveTo(s.x + 8.2, B - 9);
    ctx.quadraticCurveTo(s.x + 10, B - 14, s.x + 11.5, B - 14);
    ctx.stroke();
    ellipse(ctx, s.x + 5.9, B - 14.2, 1.2, 0.7, '#7bc79a');
    ellipse(ctx, s.x + 11.6, B - 14.2, 1.2, 0.7, '#7bc79a');
    // perfumes
    fillRR(ctx, s.x + 18, B - 5.5, 5, 5.5, 1.8, lg(ctx, 0, B - 6, 0, B, [
      [0, '#ffe4ee'], [1, '#f3a9c4']
    ]));
    fillRR(ctx, s.x + 19.5, B - 7.5, 2, 2.4, 0.8, '#f7b9d2');
    fillRR(ctx, s.x + 27, B - 4.5, 4.5, 4.5, 1.6, '#b7d9f2');
    fillRR(ctx, s.x + 28, B - 6.5, 2.5, 2.2, 0.8, '#8fbde2');
    // cajas
    fillRR(ctx, s.x + 38, B - 6.5, 12, 6.5, 1.6, '#ffe8d4');
    fillRR(ctx, s.x + 38, B - 7.5, 12, 2.2, 1.1, '#f3c9a0');
    fillRR(ctx, s.x + 41, B - 4.2, 6, 2.0, 0.8, '#f3a9c4');
    // libritos
    fillRR(ctx, s.x + 56, B - 8, 3.2, 8, 0.8, '#d8c7f2');
    fillRR(ctx, s.x + 60, B - 6, 3.2, 6, 0.8, '#ffe08a');
    fillRR(ctx, s.x + 64, B - 5, 2.6, 5, 0.7, '#a9e3c8');
  }

  function drawLamps(ctx) {
    ROOM.lamps.forEach(x => {
      ctx.strokeStyle = 'rgba(170,120,145,.6)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 21);
      ctx.stroke();
      // halo
      ctx.fillStyle = rg(ctx, x, 30, 2, 24, [
        [0, 'rgba(255,238,170,.45)'],
        [0.55, 'rgba(255,220,140,.14)'],
        [1, 'rgba(255,220,140,0)']
      ]);
      ctx.fillRect(x - 26, 6, 52, 50);
      // pantalla
      ctx.beginPath();
      ctx.moveTo(x - 6, 23);
      ctx.quadraticCurveTo(x, 17, x + 6, 23);
      ctx.lineTo(x + 4, 27);
      ctx.quadraticCurveTo(x, 30, x - 4, 27);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, 18, 0, 30, [[0, '#ffc2d8'], [0.55, '#f39dbd'], [1, '#e17da4']]);
      ctx.fill();
      ellipse(ctx, x - 1.5, 21.5, 1.5, 0.6, 'rgba(255,255,255,.45)');
      ellipse(ctx, x, 29, 2.0, 1.5, '#fff3b0');
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.beginPath();
      ctx.moveTo(x - 8, 30);
      ctx.lineTo(x + 8, 30);
      ctx.lineTo(x + 13, 38);
      ctx.lineTo(x - 13, 38);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawPlant(ctx, x, y) {
    softShadow(ctx, x + 5, y + 16, 7, 2.5, 0.16);
    fillRR(ctx, x, y + 8, 10, 8, 3, lg(ctx, 0, y + 8, 0, y + 16, [
      [0, '#f2b57d'], [1, '#d98a55']
    ]));
    fillRR(ctx, x + 1, y + 15.5, 8, 1.2, 0.6, 'rgba(150,80,45,.35)');
    ctx.strokeStyle = '#4f9c7b';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 8);
    ctx.quadraticCurveTo(x + 4, y + 3, x + 2.5, y + 1);
    ctx.moveTo(x + 5.5, y + 8);
    ctx.quadraticCurveTo(x + 7.5, y + 3, x + 9, y + 1.5);
    ctx.stroke();
    ellipse(ctx, x + 2.2, y + 1.2, 1.8, 1.0, '#7bc79a');
    ellipse(ctx, x + 9.2, y + 1.6, 1.8, 1.0, '#7bc79a');
    ellipse(ctx, x + 6.0, y + 0.4, 1.5, 1.0, '#8fd6a9');
  }

  function drawTray(ctx) {
    const t = ROOM.tray;
    softShadow(ctx, t.x + t.w / 2, t.y + t.h, t.w * 0.58, 4.5, 0.18);
    fillRR(ctx, t.x, t.y, t.w, t.h, 7, lg(ctx, 0, t.y, 0, t.y + t.h, [
      [0, '#f0c48d'], [0.5, '#d9a566'], [1, '#b57c45']
    ]));
    fillRR(ctx, t.x + 1.8, t.y + 1.8, t.w - 3.6, t.h - 3.6, 5.5, lg(ctx, 0, t.y, 0, t.y + t.h, [
      [0, '#fff4e3'], [1, '#f3d8b8']
    ]));
    // ranuras
    fillRR(ctx, t.x + 4, t.y + 6, 13, 14, 3, 'rgba(220,185,145,.55)');
    fillRR(ctx, t.x + 21, t.y + 6, 13, 14, 3, 'rgba(220,185,145,.55)');
    ctx.strokeStyle = 'rgba(180,140,95,.45)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(t.x + 5, t.y + 7);
    ctx.lineTo(t.x + 16, t.y + 7);
    ctx.moveTo(t.x + 22, t.y + 7);
    ctx.lineTo(t.x + 33, t.y + 7);
    ctx.stroke();
    const hand = iconSprite('hand', '#b07b4e');
    ctx.drawImage(hand, t.x + 30, t.y - 7, 10, 10);
  }

  function sceneCanvas(levelId) {
    const key = levelId || 0;
    if (sceneCache[key]) return sceneCache[key];
    const accent = (BL.LEVELS[(levelId || 1) - 1] || BL.LEVELS[0]).accent;
    const c = make(ART.w, ART.h);
    const ctx = c.getContext('2d');
    drawWall(ctx, accent);
    drawFloor(ctx, accent);
    drawLamps(ctx);
    drawShelf(ctx);
    drawDoor(ctx);
    drawMirror(ctx);
    drawRacks(ctx);
    drawCabinsStatic(ctx);
    drawRegister(ctx);
    drawPlant(ctx, 4, 198);
    drawPlant(ctx, 380, 206);
    drawTray(ctx);
    sceneCache[key] = c;
    return c;
  }

  /* ============================================================
     HTML helpers
     ============================================================ */
  function dataURL(canvas, key) {
    if (key && urlCache[key]) return urlCache[key];
    const url = canvas.toDataURL('image/png');
    if (key) urlCache[key] = url;
    return url;
  }

  function dressHTML(type, opts) {
    const o = opts || {};
    const c = dressSprite(type, o);
    const url = dataURL(c, 'dress|' + type + '|' + (o.hanger ? 1 : 0));
    const cls = 'pixel ' + (o.cls || '');
    return `<img class="${cls}" src="${url}" alt="" draggable="false" style="width:${(o.scale || 3) * 12}px;height:${(o.scale || 3) * 14}px">`;
  }

  function charHTML(p, opts) {
    const o = opts || {};
    const c = characterSprite(p, o);
    const url = dataURL(c, 'char|' + (p.name || 'luna') + '|' + (o.style || 0) + '|' + (o.emotion || 'happy') + '|' + (o.assistant ? 1 : 0));
    const scale = o.scale || 3;
    return `<img class="pixel ${o.cls || ''}" src="${url}" alt="" draggable="false" style="width:${scale * 20}px;height:${scale * 36}px">`;
  }

  function iconHTML(name, opts) {
    const o = opts || {};
    const c = iconSprite(name, o.color);
    const url = dataURL(c, 'icon|' + name + '|' + (o.color || ''));
    const scale = o.scale || 2;
    return `<img class="pixel ${o.cls || ''}" src="${url}" alt="" draggable="false" style="width:${scale * 10}px;height:${scale * 10}px">`;
  }

  BL.art = {
    ART,
    make,
    px,
    characterSprite,
    dressSprite,
    iconSprite,
    sceneCanvas,
    dataURL,
    dressHTML,
    charHTML,
    iconHTML,
    heartHTML(filled, cls) {
      const c = iconSprite('heart', filled ? '#ff6f9f' : '#f0d7e1');
      const url = dataURL(c, 'heart|' + (filled ? 1 : 0));
      return `<img class="pixel heart ${filled ? 'full' : 'empty'} ${cls || ''}" src="${url}" alt="" style="width:27px;height:24px">`;
    },
    starHTML(filled) {
      return `<span class="${filled ? 'star-on' : 'star-off'}">★</span>`;
    },
    coinHTML(scale) {
      const c = iconSprite('coin');
      const url = dataURL(c, 'coin');
      const s = scale || 2;
      return `<img class="pixel coin-img" src="${url}" alt="" style="width:${s * 10}px;height:${s * 10}px">`;
    }
  };
})();
