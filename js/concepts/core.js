/* Conceptos animados: core (interacciones básicas de programación) */
(function () {
  'use strict';
  const K = UCP.conceptKit;
  const { colors, el, makeCanvas, loop, controls, button, seg, slider, toggle, readout, roundRect, text, code, codeBlock, drag, arrow, box, lerp, clamp, ease } = K;
  const cd = (s) => code(K.esc(s));
  const TAU = Math.PI * 2;

  // Etiqueta + controles en una misma fila (p. ej. "Rigidbody A" + seg).
  function group(parent, label) {
    const g = el('div', '');
    g.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';
    g.appendChild(el('span', 'muted small', label));
    parent.appendChild(g);
    return g;
  }
  const show = (node, on) => { node.style.display = on ? '' : 'none'; };

  // Leyenda que fluye en varias líneas si no cabe. items: [{ c, s, m: 'dot' | 'cross' | 'line' | 'box' }]
  function legend(ctx, items, x, y, maxW) {
    ctx.font = K.FONT;
    let cx = x, cy = y;
    items.forEach((it) => {
      const tw = ctx.measureText(it.s).width + 16;
      if (cx + tw > x + maxW && cx > x) { cx = x; cy += 17; }
      ctx.fillStyle = it.c; ctx.strokeStyle = it.c; ctx.lineWidth = 2;
      if (it.m === 'cross') { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10, cy); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.stroke(); }
      else if (it.m === 'line') { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10, cy); ctx.stroke(); }
      else if (it.m === 'box') { ctx.strokeRect(cx + 1, cy - 4, 8, 8); }
      else { ctx.beginPath(); ctx.arc(cx + 5, cy, 4, 0, TAU); ctx.fill(); }
      text(ctx, it.s, cx + 14, cy, it.tc || it.c);
      cx += tw + 10;
    });
    return cy;
  }
  function legendLines(ctx, items, maxW) {
    ctx.font = K.FONT;
    let cx = 0, lines = 1;
    items.forEach((s) => { const tw = ctx.measureText(s).width + 16; if (cx + tw > maxW && cx > 0) { cx = 0; lines++; } cx += tw + 10; });
    return lines;
  }
  function crossMark(ctx, x, y, color, r) {
    r = r || 7;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.stroke();
  }
  function dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function dashed(ctx, x1, y1, x2, y2, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  }
  const fx = (v, n) => (Math.abs(v) < 0.0005 ? 0 : v).toFixed(n === undefined ? 2 : n);

  /* ---------------------------------------------------------
     1. Colisiones y triggers: quién recibe qué mensaje
     --------------------------------------------------------- */

  function mountCollisions(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { world: 'Física', script: 'Métodos del script', rbA: 'Rigidbody A', rbB: 'Rigidbody B', none: 'Ninguno', trigA: 'A: Is Trigger', trigB: 'B: Is Trigger',
        noRb: 'Ningún objeto tiene Rigidbody: dos colliders estáticos nunca generan mensajes.',
        kin: 'Ninguno es trigger y no hay ningún Rigidbody **dinámico**: un Kinematic no recibe colisiones contra estáticos ni contra otros Kinematic.',
        trig: 'Trigger: al menos un collider con Is Trigger **y** al menos un Rigidbody (vale cinemático). No hay choque: se atraviesan.',
        col: 'Colisión: ninguno es trigger y al menos uno tiene un Rigidbody **dinámico** (no cinemático). Hay choque físico.',
        miss2d: 'La física es 2D y el script usa los nombres 3D: Unity **nunca** los llama y no muestra ningún error. Usa los métodos con sufijo 2D.',
        miss3d: 'La física es 3D y el script usa los métodos 2D: nunca se llaman. Usa los nombres sin sufijo.',
        nothing: '✗ No se llama ningún método', fired: '✓ Se llama', notCalled: '✗ No se llama', point: 'punto de impacto', pivot: 'pivote de B' },
      en: { world: 'Physics', script: 'Script methods', rbA: 'Rigidbody A', rbB: 'Rigidbody B', none: 'None', trigA: 'A: Is Trigger', trigB: 'B: Is Trigger',
        noRb: 'Neither object has a Rigidbody: two static colliders never send messages.',
        kin: 'Neither is a trigger and there is no **dynamic** Rigidbody: a Kinematic body gets no collisions against static or other Kinematic colliders.',
        trig: 'Trigger: at least one collider with Is Trigger **and** at least one Rigidbody (kinematic counts). No physical hit: they pass through.',
        col: 'Collision: neither is a trigger and at least one has a **dynamic** (non-kinematic) Rigidbody. They physically collide.',
        miss2d: 'Physics is 2D but the script uses the 3D names: Unity **never** calls them and shows no error. Use the methods with the 2D suffix.',
        miss3d: 'Physics is 3D but the script uses the 2D methods: they are never called. Use the names without the suffix.',
        nothing: '✗ No method is called', fired: '✓ Called', notCalled: '✗ Not called', point: 'impact point', pivot: "B's pivot" }
    }[lang];
    const md = (s) => s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const st = { world: '3d', names: '3d', rbA: 'dynamic', rbB: 'none', trigA: false, trigB: false };
    const ctl = controls(host);
    seg(group(ctl, L.world), [{ v: '3d', l: '3D' }, { v: '2d', l: '2D' }], '3d', (v) => { st.world = v; reset(); });
    seg(group(ctl, L.script), [{ v: '3d', l: 'OnCollisionEnter' }, { v: '2d', l: 'OnCollisionEnter2D' }], '3d', (v) => { st.names = v; reset(); });
    const ctl2 = controls(host);
    const rbOpts = [{ v: 'none', l: L.none }, { v: 'dynamic', l: 'Dynamic' }, { v: 'kinematic', l: 'Kinematic' }];
    seg(group(ctl2, L.rbA), rbOpts, 'dynamic', (v) => { st.rbA = v; reset(); });
    toggle(ctl2, L.trigA, false, (v) => { st.trigA = v; reset(); });
    seg(group(ctl2, L.rbB), rbOpts, 'none', (v) => { st.rbB = v; reset(); });
    toggle(ctl2, L.trigB, false, (v) => { st.trigB = v; reset(); });
    const stage = makeCanvas(host, (w) => (w < 520 ? 230 : 210));
    const out = readout(host);
    const cb = codeBlock(host);

    function rules() {
      const anyRb = st.rbA !== 'none' || st.rbB !== 'none';
      const anyTrig = st.trigA || st.trigB;
      const dyn = st.rbA === 'dynamic' || st.rbB === 'dynamic';
      let kind = null, why = '';
      if (anyTrig) { if (anyRb) { kind = 'trigger'; why = L.trig; } else why = L.noRb; }
      else if (dyn) { kind = 'collision'; why = L.col; }
      else why = anyRb ? L.kin : L.noRb;
      return { kind, why, fires: !!kind && st.names === st.world };
    }
    // Simulación en unidades normalizadas (0..1 del ancho).
    let s;
    function reset() { s = { t: 0, ax: 0.1, va: 0.22, bx: 0.62, vb: 0, contact: null, flash: 0, entered: false }; }
    reset();

    const stop = loop((dt) => {
      const R = rules();
      const { ctx, w, h } = stage;
      const c = colors();
      const pad = 14, span = w - pad * 2;
      const X = (u) => pad + u * span;
      const ground = h - (w < 520 ? 62 : 48);
      const rA = 17, bw = 46, bh = 104;
      // Física
      s.t += dt;
      const blocking = R.kind === 'collision';
      s.ax += s.va * dt; s.bx += s.vb * dt;
      s.vb *= Math.max(0, 1 - 1.2 * dt);
      if (s.bx > 1 - (bw / 2) / span) { s.bx = 1 - (bw / 2) / span; s.vb = 0; }
      const aR = X(s.ax) + rA, bL = X(s.bx) - bw / 2, bRgt = X(s.bx) + bw / 2;
      const overlap = aR >= bL && X(s.ax) - rA <= bRgt;
      if (overlap && !s.entered) {
        s.entered = true; s.flash = 1.4;
        if (blocking) s.contact = { x: bL, y: ground - rA };
        if (blocking && st.rbB === 'dynamic') {
          if (st.rbA === 'dynamic') { s.vb = s.va; s.va = 0; } else s.vb = s.va;
        } else if (blocking) s.va = -0.35 * Math.abs(s.va);
      }
      if (blocking && overlap) {
        if (st.rbB === 'dynamic') s.bx = (aR + bw / 2 - pad) / span;
        else s.ax = (bL - rA - pad) / span;
      }
      s.flash = Math.max(0, s.flash - dt);
      if (s.t > 3.6 || X(s.ax) - rA > w) reset();

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = c.border; ctx.fillRect(pad, ground, span, 2);
      // B (caja alta, pivote en el centro)
      const bcx = X(s.bx), bcy = ground - bh / 2;
      ctx.fillStyle = st.trigB ? c.accentSoft : c.soft;
      ctx.strokeStyle = c.accent; ctx.lineWidth = 2;
      if (st.trigB) ctx.setLineDash([5, 4]);
      roundRect(ctx, bcx - bw / 2, ground - bh, bw, bh, 6); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'B', bcx, ground - bh + 14, c.text, { align: 'center' });
      // A (esfera)
      const acx = X(s.ax), acy = ground - rA;
      ctx.fillStyle = st.trigA ? c.warnSoft : c.warn;
      ctx.strokeStyle = c.warn;
      if (st.trigA) ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(acx, acy, rA, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'A', acx, acy, st.trigA ? c.warn : c.bg, { align: 'center' });
      const tag = (rb, trig) => (rb === 'none' ? '—' : rb === 'dynamic' ? 'Dyn' : 'Kin') + (trig ? ' · Trigger' : '');
      text(ctx, tag(st.rbA, st.trigA), acx, ground + 13, c.muted, { align: 'center' });
      text(ctx, tag(st.rbB, st.trigB), bcx, ground + 13, c.muted, { align: 'center' });
      // Contacto: punto, normal y pivote del otro objeto
      if (s.contact && R.kind === 'collision') {
        const p = s.contact;
        arrow(ctx, p.x, p.y, p.x - 34, p.y, c.ok, 2);
        dot(ctx, p.x, p.y, 5, c.ok);
        crossMark(ctx, bcx, bcy, c.bad, 8);
        dashed(ctx, p.x, p.y, bcx, bcy, c.muted, 1);
      } else crossMark(ctx, bcx, bcy, c.border, 6);
      // Mensaje
      if (s.entered) {
        const nm = st.names === '2d' ? '2D' : '';
        const msg = R.kind === 'trigger' ? 'OnTriggerEnter' + nm : R.kind === 'collision' ? 'OnCollisionEnter' + nm : '';
        const label = msg ? (R.fires ? '✓ ' + msg + '()' : '✗ ' + msg + '()') : L.nothing;
        ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, s.flash + 0.3);
        text(ctx, label, w / 2, 14, R.fires ? c.ok : c.bad, { align: 'center', mono: !!msg });
        ctx.globalAlpha = 1;
      }
      legend(ctx, [
        { c: c.ok, s: 'GetContact(0).point / .normal' },
        { c: c.bad, s: 'collision.transform.position', m: 'cross' }
      ], pad, ground + 32, span);

      // Veredicto
      const U = 40; // px por unidad
      let html = '';
      const sfx = st.world === '2d' ? '2D' : '';
      if (!R.kind) html = '<b>' + L.nothing + '</b><p>' + md(R.why) + '</p>';
      else {
        const m = (R.kind === 'trigger' ? 'OnTriggerEnter' : 'OnCollisionEnter') + sfx;
        html = (R.fires ? '<b>' + L.fired + '</b> ' + cd(m + '()') : '<b>' + L.notCalled + '</b> ' + cd(m.replace('2D', '') + (st.names === '2d' ? '2D' : '') + '()')) +
          '<p>' + md(R.why) + '</p>' + (R.fires ? '' : '<p>⚠️ ' + md(st.world === '2d' ? L.miss2d : L.miss3d) + '</p>');
        if (R.kind === 'collision' && s.contact) {
          const pt = '(' + fx((s.contact.x - pad) / U, 1) + ', ' + fx((ground - s.contact.y) / U, 1) + ')';
          const pv = '(' + fx((bcx - pad) / U, 1) + ', ' + fx((ground - bcy) / U, 1) + ')';
          html += '<p>' + cd('GetContact(0).point') + ' = <b>' + pt + '</b> (' + L.point + ') · ' + cd('collision.transform.position') + ' = <b>' + pv + '</b> (' + L.pivot + ')</p>';
        }
      }
      out(html);
      const two = st.names === '2d';
      const src = two
        ? '// ' + (es ? 'Script en A (física 2D)' : 'Script on A (2D physics)') + '\nvoid OnCollisionEnter2D(Collision2D collision)\n{\n    ContactPoint2D contact = collision.GetContact(0);\n    Vector2 p = contact.point;   // ' + (es ? 'punto de impacto' : 'impact point') + '\n    Vector2 n = contact.normal;\n}\nvoid OnTriggerEnter2D(Collider2D other) { }'
        : '// ' + (es ? 'Script en A (física 3D)' : 'Script on A (3D physics)') + '\nvoid OnCollisionEnter(Collision collision)\n{\n    ContactPoint contact = collision.GetContact(0);\n    Vector3 p = contact.point;   // ' + (es ? 'punto de impacto' : 'impact point') + '\n    Vector3 n = contact.normal;\n}\nvoid OnTriggerEnter(Collider other) { }';
      const mk = {};
      const res = R.fires ? 'ok' : 'bad';
      [1, 2, 3, 4, 5, 6].forEach((i) => { mk[i] = R.kind === 'collision' && s.entered ? res : 'off'; });
      mk[7] = R.kind === 'trigger' && s.entered ? res : 'off';
      cb(src, mk);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     2. Layer Collision Matrix: balas que no chocan con quien dispara
     --------------------------------------------------------- */

  function mountLayerMatrix(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { matrix: 'Layer Collision Matrix', ignore: 'Physics.IgnoreCollision', tag: 'Tag de la bala = "Bullet"', reset: 'Reiniciar contadores',
        tap: 'Toca las casillas de la matriz (como en Project Settings > Physics).', self: 'Impactos en el propio jugador', enemy: 'Impactos en enemigos', calls: 'Llamadas a IgnoreCollision',
        selfOn: '✗ Player × PlayerBullet está activado: cada bala nace dentro del collider del jugador y le golpea al instante.',
        selfOff: '✓ Player × PlayerBullet desactivado: las balas ignoran al jugador sin una sola línea de código.',
        ignoreOn: 'Funciona, pero cuesta una llamada por bala (y por cada pareja de colliders): código repartido y fácil de olvidar.',
        enemyOff: 'PlayerBullet × Enemy está desactivado: las balas atraviesan a los enemigos.',
        groundOff: 'una capa no colisiona con Ground: se cae a través del suelo.',
        tagNote: 'El tag "Bullet" no cambia nada: los tags sirven para identificar objetos en código (`CompareTag`), la física no los mira.',
        falls: 'cae' },
      en: { matrix: 'Layer Collision Matrix', ignore: 'Physics.IgnoreCollision', tag: 'Bullet tag = "Bullet"', reset: 'Reset counters',
        tap: 'Tap the matrix checkboxes (as in Project Settings > Physics).', self: 'Hits on the player itself', enemy: 'Hits on enemies', calls: 'IgnoreCollision calls',
        selfOn: '✗ Player × PlayerBullet is enabled: every bullet spawns inside the player collider and hits it immediately.',
        selfOff: '✓ Player × PlayerBullet disabled: bullets ignore the player without a single line of code.',
        ignoreOn: 'It works, but it costs one call per bullet (and per collider pair): scattered code that is easy to forget.',
        enemyOff: 'PlayerBullet × Enemy is disabled: bullets pass through enemies.',
        groundOff: 'a layer does not collide with Ground: it falls through the floor.',
        tagNote: 'The "Bullet" tag changes nothing: tags identify objects in code (`CompareTag`); physics ignores them.',
        falls: 'falls' }
    }[lang];
    const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
    const LAYERS = ['Player', 'PlayerBullet', 'Enemy', 'Ground'];
    const on = {};
    const key = (a, b) => Math.min(a, b) + '-' + Math.max(a, b);
    for (let i = 0; i < 4; i++) for (let j = i; j < 4; j++) on[key(i, j)] = true;
    const hit = (a, b) => on[key(a, b)];
    let mode = 'matrix', tagged = false, cells = [];
    let sim;
    function resetSim() { sim = { bullets: [], cool: 0.2, selfHits: 0, enemyHits: 0, calls: 0, sparks: [], py: 0, pv: 0, ey: 0, ev: 0, flashE: [0, 0] }; }
    resetSim();
    const ctl = controls(host);
    seg(ctl, [{ v: 'matrix', l: L.matrix }, { v: 'ignore', l: L.ignore }], mode, (v) => { mode = v; resetSim(); });
    toggle(ctl, L.tag, false, (v) => { tagged = v; });
    button(ctl, L.reset, resetSim);
    const stage = makeCanvas(host, (w) => (w < 600 ? 400 : 240), (x, y) => {
      const cell = cells.find((q) => x >= q.x && x <= q.x + q.s && y >= q.y && y <= q.y + q.s);
      if (cell) { on[key(cell.a, cell.b)] = !on[key(cell.a, cell.b)]; }
    });
    const out = readout(host);
    const cb = codeBlock(host);

    const stop = loop((dt) => {
      const { ctx, w, h } = stage;
      const c = colors();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 600;
      // Matriz triangular: filas = capas, columnas en orden inverso (como en Unity).
      const cs = 26, lw = 92, hh = 86;
      const mw = lw + cs * 4;
      const mx = narrow ? Math.max(8, (w - mw) / 2) : 12, my = 8;
      cells = [];
      for (let k = 0; k < 4; k++) {
        const li = 3 - k;
        ctx.save();
        ctx.translate(mx + lw + k * cs + cs / 2, my + hh - 6);
        ctx.rotate(-Math.PI / 2);
        text(ctx, LAYERS[li], 0, 0, c.muted);
        ctx.restore();
      }
      for (let i = 0; i < 4; i++) {
        const y = my + hh + i * cs;
        text(ctx, LAYERS[i], mx + lw - 8, y + cs / 2, c.text, { align: 'right' });
        for (let k = 0; k <= 3 - i; k++) {
          const j = 3 - k;
          const x = mx + lw + k * cs;
          const v = hit(i, j);
          const isKey = key(i, j) === key(0, 1);
          ctx.fillStyle = v ? c.accent : c.bg;
          ctx.strokeStyle = isKey ? c.warn : c.border; ctx.lineWidth = isKey ? 2.5 : 1.5;
          roundRect(ctx, x + 3, y + 3, cs - 6, cs - 6, 4); ctx.fill(); ctx.stroke();
          if (v) text(ctx, '✓', x + cs / 2, y + cs / 2 + 1, c.bg, { align: 'center' });
          cells.push({ x: x + 3, y: y + 3, s: cs - 6, a: i, b: j });
        }
      }
      // Escena
      const sx = narrow ? 8 : mx + mw + 20, sy = narrow ? my + hh + cs * 4 + 16 : 10;
      const sw = w - sx - 8, sh = h - sy - 8;
      ctx.fillStyle = c.soft; roundRect(ctx, sx, sy, sw, sh, 10); ctx.fill();
      ctx.save(); roundRect(ctx, sx, sy, sw, sh, 10); ctx.clip();
      const gy = sy + sh - 34;
      ctx.fillStyle = c.border; ctx.fillRect(sx, gy, sw, 34);
      text(ctx, 'Ground', sx + sw - 8, gy + 17, c.muted, { align: 'right' });
      // Caída por el suelo si la capa no colisiona con Ground
      const fall = (yk, vk, layer) => {
        if (!hit(layer, 3)) { sim[vk] += 600 * dt; sim[yk] += sim[vk] * dt; if (sim[yk] > 400) sim[yk] = 400; }
        else { sim[yk] = 0; sim[vk] = 0; }
      };
      fall('py', 'pv', 0); fall('ey', 'ev', 2);
      const pw = 26, ph = 44, px = sx + 26, py = gy - ph + sim.py;
      const ex = [sx + sw * 0.62, sx + sw * 0.84];
      // Disparo
      sim.cool -= dt;
      if (sim.cool <= 0) {
        sim.cool = 0.75;
        const b = { x: px + pw - 8, y: py + 16, dead: 0 };
        if (mode === 'ignore') sim.calls++;
        if (hit(0, 1) && mode === 'matrix') { b.dead = 0.25; sim.selfHits++; sim.sparks.push({ x: px + pw - 4, y: b.y, t: 0.4, col: 'bad' }); }
        sim.bullets.push(b);
      }
      sim.bullets.forEach((b) => {
        if (b.dead) { b.dead -= dt; if (b.dead <= 0) b.gone = true; return; }
        b.x += 260 * dt;
        ex.forEach((x, i) => {
          const top = gy - 40 + sim.ey;
          if (!b.hitE && hit(1, 2) && Math.abs(b.x - x) < 14 && b.y > top && b.y < top + 40) {
            b.gone = true; sim.enemyHits++; sim.flashE[i] = 0.3; sim.sparks.push({ x: x - 12, y: b.y, t: 0.4, col: 'ok' });
          }
        });
        if (b.x > sx + sw + 10) b.gone = true;
      });
      sim.bullets = sim.bullets.filter((b) => !b.gone);
      // Jugador
      ctx.fillStyle = c.accent; roundRect(ctx, px, py, pw, ph, 6); ctx.fill();
      ctx.fillStyle = c.text; ctx.fillRect(px + pw - 10, py + 13, 16, 6);
      if (sim.py < 20) text(ctx, 'Player', px + pw / 2, py + ph + 12, c.text, { align: 'center' });
      // Enemigos
      ex.forEach((x, i) => {
        sim.flashE[i] = Math.max(0, sim.flashE[i] - dt);
        const top = gy - 40 + sim.ey;
        ctx.fillStyle = sim.flashE[i] > 0 ? c.ok : c.bad;
        roundRect(ctx, x - 12, top, 24, 40, 6); ctx.fill();
        if ((i === 1 || sw > 300) && sim.ey < 20) text(ctx, 'Enemy', x, top - 10, c.muted, { align: 'center' });
      });
      // Balas y chispas
      sim.bullets.forEach((b) => dot(ctx, b.x, b.y, 4, b.dead ? c.bad : c.warn));
      sim.sparks.forEach((p) => {
        p.t -= dt;
        ctx.strokeStyle = c[p.col]; ctx.lineWidth = 2;
        const r = 6 + (0.4 - p.t) * 30;
        for (let k = 0; k < 6; k++) { const a = k * TAU / 6; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.5); ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); ctx.stroke(); }
      });
      sim.sparks = sim.sparks.filter((p) => p.t > 0);
      ctx.restore();
      text(ctx, L.self + ': ' + sim.selfHits, sx + 10, sy + 14, sim.selfHits ? c.bad : c.muted);
      text(ctx, L.enemy + ': ' + sim.enemyHits, sx + 10, sy + 31, c.muted);
      if (mode === 'ignore') text(ctx, L.calls + ': ' + sim.calls, sx + 10, sy + 48, c.warn);

      // Veredicto y código
      let html = L.tap;
      if (mode === 'matrix') html += '<p>' + (hit(0, 1) ? L.selfOn : L.selfOff) + '</p>';
      else html += '<p>✓ ' + cd('Physics.IgnoreCollision') + ' × <b>' + sim.calls + '</b>. ' + L.ignoreOn + '</p>';
      if (!hit(1, 2)) html += '<p>' + L.enemyOff + '</p>';
      if (!hit(0, 3) || !hit(2, 3)) html += '<p>⚠️ ' + (!hit(0, 3) ? 'Player' : 'Enemy') + ' × Ground: ' + L.groundOff + '</p>';
      if (tagged) html += '<p>🏷️ ' + md(L.tagNote) + '</p>';
      out(html);
      const tagLine = tagged ? '\n    bullet.tag = "Bullet";   // ' + (es ? 'no afecta a la física' : 'does not affect physics') : '';
      if (mode === 'matrix') {
        cb('// Project Settings > Physics > Layer Collision Matrix\n// Player × PlayerBullet: ' + (hit(0, 1) ? (es ? 'activado' : 'enabled') : (es ? 'desactivado' : 'disabled')) +
          '\nvoid Shoot()\n{\n    GameObject bullet = Instantiate(bulletPrefab, muzzle.position, muzzle.rotation);' + tagLine + '\n}',
        { 1: hit(0, 1) ? 'bad' : 'ok', 5: tagged ? 'off' : undefined });
      } else {
        cb('void Shoot()\n{\n    GameObject bullet = Instantiate(bulletPrefab, muzzle.position, muzzle.rotation);\n    Physics.IgnoreCollision(bullet.GetComponent<Collider>(), playerCollider);' + tagLine + '\n}',
          { 3: 'hl', 4: tagged ? 'off' : undefined });
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     3. Cámara que sigue: LateUpdate e interpolación del Rigidbody
     --------------------------------------------------------- */

  function mountCameraFollow(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { order: 'Update vs LateUpdate', phys: 'Objetivo con física', cam: 'Cámara en', hz: 'Pantalla', view: 'Lo que ve la cámara', plot: 'Posición del objetivo en pantalla (cada punto = 1 frame)',
        flat: 'línea plana = suave', thisFrame: 'Este frame',
        upd: '✗ Con la cámara en `Update`, el orden respecto al `Update` del objetivo no está garantizado: unos frames la cámara lee la posición nueva y otros la del frame anterior. El objetivo salta en pantalla (jitter).',
        late: '✓ `LateUpdate` se ejecuta después de **todos** los `Update`: la cámara siempre usa la posición final del frame. Línea plana.',
        none: '✗ Interpolate = None: la física se mueve a 50 Hz y la pantalla se refresca a {hz} Hz. Varios frames seguidos muestran la misma posición y luego salta: tirones.',
        interp: '✓ Interpolate: en cada frame Unity dibuja una posición intermedia entre los dos últimos pasos de física. El movimiento es uniforme (va un paso por detrás, unos 20 ms).',
        steps: 'pasos de física (50 Hz)' },
      en: { order: 'Update vs LateUpdate', phys: 'Physics target', cam: 'Camera in', hz: 'Display', view: 'What the camera sees', plot: 'Target position on screen (each dot = 1 frame)',
        flat: 'flat line = smooth', thisFrame: 'This frame',
        upd: '✗ With the camera in `Update`, its order relative to the target\'s `Update` is not guaranteed: some frames the camera reads the new position, others the previous frame\'s. The target jumps on screen (jitter).',
        late: '✓ `LateUpdate` runs after **all** `Update` calls: the camera always uses the final position of the frame. Flat line.',
        none: '✗ Interpolate = None: physics moves at 50 Hz and the display refreshes at {hz} Hz. Several frames in a row show the same position and then it jumps: stutter.',
        interp: '✓ Interpolate: every frame Unity draws a position between the last two physics steps. Motion is even (it lags one step behind, about 20 ms).',
        steps: 'physics steps (50 Hz)' }
    }[lang];
    const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    let tab = 'order', camIn = 'Update', interp = false, hz = 144;
    const ctl = controls(host);
    seg(ctl, [{ v: 'order', l: L.order }, { v: 'phys', l: L.phys }], tab, (v) => { tab = v; sync(); reset(); });
    const cA = controls(host), cB = controls(host);
    seg(group(cA, L.cam), [{ v: 'Update', l: 'Update' }, { v: 'LateUpdate', l: 'LateUpdate' }], camIn, (v) => { camIn = v; reset(); });
    seg(group(cB, 'Rigidbody.interpolation'), [{ v: false, l: 'None' }, { v: true, l: 'Interpolate' }], interp, (v) => { interp = v; reset(); });
    seg(group(cB, L.hz), [{ v: 60, l: '60 Hz' }, { v: 144, l: '144 Hz' }], hz, (v) => { hz = v; reset(); });
    function sync() { show(cA, tab === 'order'); show(cB, tab === 'phys'); }
    sync();
    const stage = makeCanvas(host, 230);
    const out = readout(host);
    const cb = codeBlock(host);
    const V = 300; // px/s
    let s;
    function reset() { s = { t: 0, x: 0, cam: 0, samples: [], order: '', simT: 0, nextFrame: 0, lastStep: 0, prevStep: 0, steps: [] }; }
    reset();

    const stop = loop((dt) => {
      const { ctx, w, h } = stage;
      const c = colors();
      let offset = 0;
      if (tab === 'order') {
        // Un frame real = un frame simulado.
        const fdt = dt || 1 / 60;
        s.t += fdt;
        const camFirst = camIn === 'Update' && Math.random() < 0.5;
        if (camFirst) { s.cam = s.x; s.x += V * fdt; s.order = 'Camera.Update → Player.Update'; }
        else { s.x += V * fdt; s.cam = s.x; s.order = camIn === 'Update' ? 'Player.Update → Camera.Update' : 'Player.Update → Camera.LateUpdate'; }
        offset = s.x - s.cam;
        s.samples.push({ t: s.t, v: offset });
      } else {
        // Física a 50 Hz, render simulado a hz. La cámara se mueve de forma continua (SmoothDamp ideal).
        s.simT += dt;
        const FIX = 0.02;
        while (s.lastStep + FIX <= s.simT) { s.prevStep = s.lastStep; s.lastStep += FIX; s.steps.push(s.lastStep); }
        while (s.nextFrame <= s.simT) {
          const ft = s.nextFrame;
          const lastS = Math.floor(ft / FIX + 1e-9) * FIX;
          const pos = interp ? V * Math.max(0, lastS - FIX + (ft - lastS)) : V * lastS;
          const camX = V * ft - (interp ? V * FIX / 2 : 0);
          s.samples.push({ t: ft, v: pos - camX });
          s.nextFrame += 1 / hz;
        }
        s.t = s.simT;
        const last = s.samples[s.samples.length - 1];
        offset = last ? last.v : 0;
        s.cam = V * s.t;
        s.x = s.cam + offset;
      }
      const WIN = tab === 'order' ? 0.6 : 0.2;
      s.samples = s.samples.filter((p) => p.t > s.t - WIN);
      s.steps = s.steps.filter((t) => t > s.t - WIN);

      ctx.clearRect(0, 0, w, h);
      // Vista de cámara
      const vx = 10, vy = 22, vw = w - 20, vh = 70;
      text(ctx, L.view, vx, 10, c.muted);
      ctx.fillStyle = c.soft; roundRect(ctx, vx, vy, vw, vh, 8); ctx.fill();
      ctx.save(); roundRect(ctx, vx, vy, vw, vh, 8); ctx.clip();
      const cxs = vx + vw / 2;
      const camRef = tab === 'order' ? s.cam : s.cam;
      for (let k = Math.floor((camRef - vw) / 60); k <= Math.ceil((camRef + vw) / 60); k++) {
        const px = cxs + k * 60 - camRef;
        ctx.fillStyle = c.border; ctx.fillRect(px, vy + vh - 26, 4, 26);
      }
      const tx = cxs + (s.x - camRef) * 3; // ×3 para que el temblor se vea
      dot(ctx, tx, vy + vh / 2 - 4, 13, c.accent);
      ctx.restore();
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cxs, vy); ctx.lineTo(cxs, vy + vh); ctx.stroke(); ctx.setLineDash([]);
      // Gráfica
      const gx = 10, gy = vy + vh + 26, gw = w - 20, gh = h - gy - 10;
      text(ctx, w < 480 ? (es ? 'Posición en pantalla por frame' : 'Screen position per frame') : L.plot, gx, gy - 12, c.muted);
      if (w >= 480) text(ctx, L.flat, gx + gw, gy - 12, c.muted, { align: 'right' });
      ctx.fillStyle = c.soft; roundRect(ctx, gx, gy, gw, gh, 8); ctx.fill();
      if (w < 480) text(ctx, L.flat, gx + gw - 8, gy + 12, c.muted, { align: 'right' });
      const range = V * (tab === 'order' ? 1 / 30 : 0.02);
      const center = tab === 'order' ? V / 120 : -V * 0.01;
      const Y = (v) => gy + gh / 2 - (v - center) / range * (gh * 0.45);
      const X = (t) => gx + 6 + (1 - (s.t - t) / WIN) * (gw - 12);
      if (tab === 'phys') s.steps.forEach((t) => { ctx.fillStyle = c.border; ctx.fillRect(X(t), gy + 4, 1.5, gh - 8); });
      ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5; ctx.beginPath();
      s.samples.forEach((p, i) => { if (i) ctx.lineTo(X(p.t), Y(p.v)); else ctx.moveTo(X(p.t), Y(p.v)); });
      ctx.stroke();
      const smooth = tab === 'order' ? camIn === 'LateUpdate' : interp;
      s.samples.forEach((p) => dot(ctx, X(p.t), Y(p.v), 2.5, smooth ? c.ok : c.bad));
      if (tab === 'phys') text(ctx, '| ' + L.steps, gx + 8, gy + gh - 10, c.muted);

      if (tab === 'order') {
        out('<span>' + L.thisFrame + ': ' + cd(s.order) + '</span><p>' + md(camIn === 'Update' ? L.upd : L.late) + '</p>');
        cb('public class CameraFollow : MonoBehaviour\n{\n    public Transform target;\n    public Vector3 offset = new Vector3(0f, 5f, -10f);\n\n    void ' + camIn + '()\n    {\n        transform.position = target.position + offset;\n    }\n}',
          { 5: camIn === 'Update' ? 'bad' : 'ok' });
      } else {
        out('<p>' + md((interp ? L.interp : L.none).replace('{hz}', hz)) + '</p>');
        cb('// Player: ' + (es ? 'se mueve por física (FixedUpdate, 50 Hz)' : 'moved by physics (FixedUpdate, 50 Hz)') +
          '\nvoid FixedUpdate() { rb.linearVelocity = moveDir * speed; }\n\n// Inspector: Rigidbody > Interpolate\nrb.interpolation = RigidbodyInterpolation.' + (interp ? 'Interpolate' : 'None') + ';\n\n// ' + (es ? 'Cámara: en LateUpdate' : 'Camera: in LateUpdate'),
          { 4: interp ? 'ok' : 'bad' });
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     4. Input System: Enable/Disable, callbacks y triggered
     --------------------------------------------------------- */

  function mountInputActions(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { map: 'Mapa Gameplay', off: 'Sin Enable()', on: 'Con Enable()', clear: 'Limpiar', hold: 'Mantén pulsado', holdS: 'Mantén', stick: 'Arrastra el stick',
        disabled: '✗ El mapa está **deshabilitado** (las acciones creadas desde código empiezan así): no llega ningún callback y `ReadValue` devuelve **(0, 0)**.',
        enabled: '✓ Mapa habilitado. Pulsa y suelta el botón: `started` y `performed` llegan en el mismo frame al pulsar, `canceled` al soltar.',
        trig: '`triggered` no es un callback: es una propiedad que solo vale `true` en el frame de la pulsación (último: frame {f}).',
        log: 'Últimos callbacks', frame: 'frame', removed: 'eliminada' },
      en: { map: 'Gameplay map', off: 'No Enable()', on: 'With Enable()', clear: 'Clear', hold: 'Press and hold', holdS: 'Hold', stick: 'Drag the stick',
        disabled: '✗ The map is **disabled** (actions created from code start that way): no callback arrives and `ReadValue` returns **(0, 0)**.',
        enabled: '✓ Map enabled. Press and release the button: `started` and `performed` arrive in the same frame on press, `canceled` on release.',
        trig: '`triggered` is not a callback: it is a property that is only `true` in the frame of the press (last: frame {f}).',
        log: 'Latest callbacks', frame: 'frame', removed: 'removed' }
    }[lang];
    const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    let enabled = false, logical = false, now = 0, frame = 0, lastTrigFrame = null;
    let events = [], trigs = [], held = [], queue = [], active = null;
    const stick = [0, 0];
    const player = { x: 0.5, y: 0.5 };
    const flash = { started: 0, performed: 0, canceled: 0, triggered: 0 };
    const emit = (k) => { events.push({ t: now, k, f: frame }); flash[k] = 0.35; };
    function setEnabled(v) {
      if (!v && logical) { emit('canceled'); logical = false; }
      enabled = v;
    }
    const ctl = controls(host);
    seg(group(ctl, L.map), [{ v: false, l: L.off }, { v: true, l: L.on }], false, setEnabled);
    button(ctl, L.clear, () => { events = []; trigs = []; held = []; lastTrigFrame = null; });
    const stage = makeCanvas(host, (w) => (w < 560 ? 330 : 230));
    const out = readout(host);
    const cb = codeBlock(host);
    let geo = null;
    const inC = (x, y, o, extra) => Math.hypot(x - o.x, y - o.y) <= o.r + (extra || 0);
    function setStick(x, y) {
      const o = geo.stick;
      let dx = (x - o.x) / o.r, dy = -(y - o.y) / o.r;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      stick[0] = dx; stick[1] = dy;
    }
    drag(stage, {
      down(x, y) {
        if (!geo) return;
        if (inC(x, y, geo.btn, 6)) { active = 'btn'; queue.push('down'); }
        else if (inC(x, y, geo.stick, 14)) { active = 'stick'; setStick(x, y); }
      },
      move(x, y) { if (active === 'stick') setStick(x, y); },
      up() {
        if (active === 'btn') queue.push('up');
        if (active === 'stick') { stick[0] = 0; stick[1] = 0; }
        active = null;
      }
    });

    const stop = loop((dt) => {
      now += dt; frame++;
      // El Input System procesa los eventos antes de Update.
      let trig = false;
      queue.forEach((e) => {
        if (e === 'down' && enabled) { emit('started'); emit('performed'); logical = true; trig = true; }
        if (e === 'up' && enabled && logical) { emit('canceled'); logical = false; }
      });
      queue = [];
      if (trig) { trigs.push(now); lastTrigFrame = frame; flash.triggered = 0.35; }
      held.push({ t: now, v: logical });
      Object.keys(flash).forEach((k) => { flash[k] = Math.max(0, flash[k] - dt); });
      const val = enabled ? stick : [0, 0];
      player.x = clamp(player.x + val[0] * dt * 0.6, 0.08, 0.92);
      player.y = clamp(player.y - val[1] * dt * 0.6, 0.1, 0.9);
      const WIN = 5;
      events = events.filter((e) => e.t > now - WIN);
      trigs = trigs.filter((t) => t > now - WIN);
      held = held.filter((p) => p.t > now - WIN);

      const { ctx, w, h } = stage;
      const c = colors();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const areaW = narrow ? w : 330;
      const r = Math.min(40, (areaW - 40) / 7);
      const rowY = 18 + r + 16;
      geo = {
        btn: { x: areaW * 0.17, y: rowY, r: r },
        stick: { x: areaW * 0.5, y: rowY, r: r },
        arena: { x: areaW * 0.69, y: rowY - r, w: areaW * 0.29, h: r * 2 }
      };
      const b = geo.btn, sk = geo.stick, ar = geo.arena;
      text(ctx, 'Fire', b.x, 12, c.muted, { align: 'center', mono: true });
      text(ctx, 'Move', sk.x, 12, c.muted, { align: 'center', mono: true });
      text(ctx, 'player', ar.x + ar.w / 2, 12, c.muted, { align: 'center', mono: true });
      const physDown = active === 'btn';
      ctx.fillStyle = physDown ? (enabled ? c.accent : c.border) : c.soft;
      ctx.strokeStyle = enabled ? c.accent : c.border; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke();
      text(ctx, physDown ? '●' : '○', b.x, b.y, physDown && enabled ? c.bg : c.muted, { align: 'center' });
      text(ctx, narrow ? L.holdS : L.hold, b.x, b.y + b.r + 12, c.muted, { align: 'center' });
      ctx.strokeStyle = c.border; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sk.x, sk.y, sk.r, 0, TAU); ctx.stroke();
      dot(ctx, sk.x + stick[0] * sk.r, sk.y - stick[1] * sk.r, sk.r * 0.42, active === 'stick' ? c.accent : c.muted);
      text(ctx, '(' + fx(val[0]) + ', ' + fx(val[1]) + ')', sk.x, sk.y + sk.r + 12, enabled ? c.text : c.bad, { align: 'center', mono: true });
      ctx.fillStyle = c.soft; roundRect(ctx, ar.x, ar.y, ar.w, ar.h, 8); ctx.fill();
      dot(ctx, ar.x + player.x * ar.w, ar.y + player.y * ar.h, 7, enabled ? c.ok : c.muted);
      text(ctx, enabled ? 'enabled' : 'disabled', ar.x + ar.w / 2, ar.y + ar.h + 12, enabled ? c.ok : c.bad, { align: 'center', mono: true });
      // Línea de tiempo
      const tx = narrow ? 10 : areaW + 10, ty = narrow ? rowY + r + 34 : 10;
      const tw = w - tx - 10, th = h - ty - 8;
      ctx.fillStyle = c.soft; roundRect(ctx, tx, ty, tw, th, 8); ctx.fill();
      const lanes = ['started', 'performed', 'canceled', 'triggered', 'IsPressed()'];
      const lh = (th - 22) / lanes.length, lx = tx + 96;
      const X = (t) => lx + (1 - (now - t) / WIN) * (tx + tw - 10 - lx);
      lanes.forEach((nm, i) => {
        const y = ty + 8 + i * lh + lh / 2;
        const hot = flash[nm] > 0;
        text(ctx, nm, tx + 10, y, hot ? c.accent : c.text, { mono: true });
        ctx.fillStyle = c.border; ctx.fillRect(lx, y, tx + tw - 10 - lx, 1);
        const col = nm === 'canceled' ? c.bad : nm === 'triggered' ? c.warn : c.accent;
        if (i < 3) events.filter((e) => e.k === nm).forEach((e) => { ctx.fillStyle = col; ctx.fillRect(X(e.t) - 1, y - lh * 0.35, 3, lh * 0.7); dot(ctx, X(e.t) + 0.5, y - lh * 0.35, 3.5, col); });
        if (nm === 'triggered') trigs.forEach((t) => { ctx.fillStyle = col; ctx.fillRect(X(t) - 1, y - lh * 0.35, 2.5, lh * 0.7); });
        if (nm === 'IsPressed()') {
          ctx.fillStyle = c.accentSoft;
          held.forEach((p, k) => { if (p.v && k) ctx.fillRect(X(held[k - 1].t), y - lh * 0.25, X(p.t) - X(held[k - 1].t) + 0.5, lh * 0.5); });
        }
      });
      text(ctx, '−5 s', lx, ty + th - 9, c.muted);
      text(ctx, es ? 'ahora' : 'now', tx + tw - 10, ty + th - 9, c.muted, { align: 'right' });

      // Veredicto
      const recent = events.slice(-4).reverse().map((e) => '<span class="tag">' + e.t.toFixed(2) + ' s · ' + L.frame + ' ' + e.f + ' · <b>' + e.k + '</b></span>').join(' ');
      out('<span>' + md(enabled ? L.enabled : L.disabled) + '</span>' +
        '<p>' + cd('Move.ReadValue<Vector2>()') + ' = <b>(' + fx(val[0]) + ', ' + fx(val[1]) + ')</b>' + (lastTrigFrame !== null ? ' · ' + md(L.trig.replace('{f}', lastTrigFrame)) : '') + '</p>' +
        (recent ? '<p>' + L.log + ': ' + recent + '</p>' : ''));
      const onEnableLine = enabled ? 'void OnEnable()  { controls.Gameplay.Enable(); }' : '// void OnEnable() { controls.Gameplay.Enable(); }  ← ' + L.removed;
      cb('PlayerControls controls;\n\nvoid Awake()     { controls = new PlayerControls(); }\n' + onEnableLine +
        '\nvoid OnDisable() { controls.Gameplay.Disable(); }\n\nvoid Start()\n{\n    var fire = controls.Gameplay.Fire;\n' +
        '    fire.started   += ctx => Debug.Log("started");\n    fire.performed += ctx => Debug.Log("performed");\n    fire.canceled  += ctx => Debug.Log("canceled");\n}\n\nvoid Update()\n{\n' +
        '    Vector2 move = controls.Gameplay.Move.ReadValue<Vector2>();\n    if (controls.Gameplay.Fire.triggered) Shoot();\n}',
      { 3: enabled ? 'ok' : 'bad', 9: flash.started ? 'hl' : undefined, 10: flash.performed ? 'hl' : undefined, 11: flash.canceled ? 'hl' : undefined,
        16: enabled ? undefined : 'bad', 17: flash.triggered ? 'hl' : undefined });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     5. CharacterController: Move vs SimpleMove
     --------------------------------------------------------- */

  function mountCharacterController(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { jump: 'Saltar', fps: 'FPS', noGrav: 'sin gravedad: flota', manual: 'gravedad a mano', auto: 'gravedad automática', yIgn: 'Y ignorada: no salta',
        addForce: '✗ error CS1061: `CharacterController` no contiene una definición para `AddForce`. No es un Rigidbody: la física no lo mueve; solo se mueve con `Move`/`SimpleMove` (y no necesita Rigidbody).',
        l1: '✗ `Move(dir * speed)`: `Move` recibe un **desplazamiento** de este frame, no una velocidad. Sin `Time.deltaTime` avanza {v} u/s a {fps} FPS (depende de los FPS) y, sin gravedad, flota sobre el vacío.',
        l2: '✓ `Move(...)` con `Time.deltaTime` y la gravedad sumada por ti: velocidad estable, cae y puede saltar.',
        l3: '✓ `SimpleMove(dir * speed)`: recibe **unidades por segundo**, aplica la gravedad sola e **ignora el eje Y** (por eso no puede saltar).' },
      en: { jump: 'Jump', fps: 'FPS', noGrav: 'no gravity: floats', manual: 'manual gravity', auto: 'automatic gravity', yIgn: 'Y ignored: no jump',
        addForce: '✗ error CS1061: `CharacterController` does not contain a definition for `AddForce`. It is not a Rigidbody: physics does not move it; it only moves with `Move`/`SimpleMove` (and it needs no Rigidbody).',
        l1: '✗ `Move(dir * speed)`: `Move` takes this frame\'s **displacement**, not a velocity. Without `Time.deltaTime` it moves {v} u/s at {fps} FPS (FPS dependent) and, with no gravity, it floats over the gap.',
        l2: '✓ `Move(...)` with `Time.deltaTime` and gravity added by you: steady speed, it falls and can jump.',
        l3: '✓ `SimpleMove(dir * speed)`: takes **units per second**, applies gravity by itself and **ignores the Y axis** (so it cannot jump).' }
    }[lang];
    const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const SPEED = 1.5, G = -9.81, JUMP = 4.6, LEDGE = 5.5, W = 10;
    let fps = 60, acc = 0, msg = 0, jumpFlash = 0;
    const lanes = [0, 1, 2].map((k) => ({ k, x: 0.4, y: 0, vy: 0, grounded: true, trail: [], ign: 0 }));
    const respawn = (l) => { l.x = 0.4; l.y = 0; l.vy = 0; l.grounded = true; l.trail = []; };
    const ctl = controls(host);
    seg(group(ctl, L.fps), [30, 60, 144].map((v) => ({ v, l: String(v) })), fps, (v) => { fps = v; lanes.forEach(respawn); });
    button(ctl, L.jump, () => {
      jumpFlash = 0.5;
      const l2 = lanes[1];
      if (l2.grounded) { l2.vy = JUMP; l2.grounded = false; }
      lanes[2].ign = 1.4;
    }, true);
    button(ctl, 'cc.AddForce(…)', () => { msg = 6; });
    const LH = 98;
    const stage = makeCanvas(host, LH * 3 + 4);
    const out = readout(host);
    const cb = codeBlock(host);

    function ground(l, fdt) {
      l.y += l.vy * fdt;
      if (l.x <= LEDGE && l.y <= 0 && l.vy <= 0) { l.y = 0; l.vy = 0; l.grounded = true; } else l.grounded = false;
    }
    function step(fdt) {
      const a = lanes[0];
      a.x += SPEED; // desplazamiento por frame, sin deltaTime ni gravedad
      a.trail.push(a.x);
      if (a.trail.length > 6) a.trail.shift();
      if (a.x > W + 1) { a.x = 0.4; }
      const b = lanes[1];
      if (b.grounded && b.vy < 0) b.vy = -0.5;
      b.vy += G * fdt;
      b.x += SPEED * fdt;
      ground(b, fdt);
      const s = lanes[2];
      s.vy = (s.grounded ? 0 : s.vy) + G * fdt; // SimpleMove: gravedad automática
      s.x += SPEED * fdt;
      ground(s, fdt);
      [b, s].forEach((l) => { if (l.y < -6 || l.x > W) respawn(l); });
    }

    const stop = loop((dt) => {
      acc += dt;
      const fdt = 1 / fps;
      let n = 0;
      while (acc >= fdt && n < 20) { acc -= fdt; step(fdt); n++; }
      msg = Math.max(0, msg - dt); jumpFlash = Math.max(0, jumpFlash - dt);
      lanes.forEach((l) => { l.ign = Math.max(0, l.ign - dt); });
      const { ctx, w, h } = stage;
      const c = colors();
      ctx.clearRect(0, 0, w, h);
      const ppu = Math.max(24, (w - 24) / W);
      const ox = 12;
      const labels = ['Move(dir * speed)', 'Move((dir * speed + up * vY) * dt)', 'SimpleMove(dir * speed)'];
      const v1 = (SPEED * fps).toFixed(0);
      const status = [
        '≈ ' + v1 + ' u/s · ' + L.noGrav,
        SPEED + ' u/s · ' + L.manual + ' · isGrounded: ' + lanes[1].grounded,
        SPEED + ' u/s · ' + (lanes[2].ign > 0 ? L.yIgn : L.auto)
      ];
      lanes.forEach((l, i) => {
        const ly = 2 + i * LH;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, ly, w, LH - 2); ctx.clip();
        ctx.fillStyle = i === 0 ? c.badSoft : c.soft;
        ctx.fillRect(0, ly, w, LH - 2);
        const gy = ly + LH - 18;
        ctx.fillStyle = c.border;
        ctx.fillRect(0, gy, ox + LEDGE * ppu, 16);
        text(ctx, labels[i], 10, ly + 12, i === 0 ? c.bad : c.text, { mono: true });
        text(ctx, status[i], 10, ly + 29, i === 2 && l.ign > 0 ? c.warn : c.muted);
        const cap = (x, y, alpha, col) => {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = col;
          roundRect(ctx, ox + x * ppu - 7, gy - 30 - y * ppu, 14, 30, 7); ctx.fill();
          ctx.globalAlpha = 1;
        };
        if (i === 0) l.trail.forEach((x, k) => { if (x <= W + 0.4) cap(x, 0, 0.2 + 0.8 * ((k + 1) / l.trail.length), c.bad); });
        else cap(l.x, l.y, 1, i === 1 ? c.accent : c.ok);
        ctx.restore();
      });
      if (jumpFlash > 0) text(ctx, '⤒', w - 16, 2 + LH + 14, c.accent, { align: 'center' });

      out((msg > 0 ? '<p>' + md(L.addForce) + '</p>' : '') +
        '<p>' + md(L.l1.replace('{v}', v1).replace('{fps}', fps)) + '</p><p>' + md(L.l2) + '</p><p>' + md(L.l3) + '</p>');
      cb('CharacterController cc;   // ' + (es ? 'no necesita Rigidbody' : 'needs no Rigidbody') + '\nfloat velocityY;\n\nvoid Update()\n{\n    Vector3 dir = new Vector3(input.x, 0f, input.y);\n' +
        '    // A) Move: ' + (es ? 'desplazamiento de este frame' : 'displacement for this frame') + '\n' +
        '    if (cc.isGrounded && velocityY < 0f) velocityY = -0.5f;\n    if (cc.isGrounded && jump) velocityY = jumpSpeed;\n' +
        '    velocityY += Physics.gravity.y * Time.deltaTime;\n    cc.Move((dir * speed + Vector3.up * velocityY) * Time.deltaTime);\n\n' +
        '    // B) SimpleMove: ' + (es ? 'u/s, gravedad automática, Y ignorada' : 'u/s, automatic gravity, Y ignored') + '\n    cc.SimpleMove(dir * speed);\n}',
      { 8: jumpFlash > 0 ? 'hl' : undefined, 10: 'ok', 13: 'ok' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     6. ScreenPointToRay + Physics.Raycast vs ScreenToWorldPoint
     --------------------------------------------------------- */

  function mountScreenRay(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { ray: 'ScreenPointToRay + Raycast', stwp: 'ScreenToWorldPoint', z: 'z (distancia)', game: 'Game view: toca o arrastra', top: 'Vista superior', miss: 'Physics.Raycast devuelve false: el rayo no toca ningún collider.',
        under: 'Bajo el cursor está', butNot: 'pero ScreenToWorldPoint no lo sabe: no hace ningún raycast.',
        point: 'Devuelve **un solo punto** a {z} u delante de la cámara, en la línea del cursor. No consulta colliders.', zero: 'Con `Input.mousePosition` tal cual (z = 0) obtienes la posición de la cámara.' },
      en: { ray: 'ScreenPointToRay + Raycast', stwp: 'ScreenToWorldPoint', z: 'z (distance)', game: 'Game view: tap or drag', top: 'Top view', miss: 'Physics.Raycast returns false: the ray hits no collider.',
        under: 'Under the cursor is', butNot: 'but ScreenToWorldPoint does not know it: it does no raycast.',
        point: 'It returns **a single point** {z} u in front of the camera, along the cursor line. It does not query colliders.', zero: 'With `Input.mousePosition` as is (z = 0) you get the camera position.' }
    }[lang];
    const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const OBJ = [
      { n: 'Barrel', x: 0.55, z: 2.6, r: 0.38, h: 1.1, col: '#d9773a' },
      { n: 'Crate', x: -1.5, z: 3.4, r: 0.55, h: 1.0, col: '#b08850' },
      { n: 'Enemy', x: 0.9, z: 5.4, r: 0.5, h: 1.9, col: '#d94a64' },
      { n: 'Tree', x: -0.6, z: 7.4, r: 0.65, h: 4.2, col: '#3c9a5c' },
      { n: 'Pillar', x: 2.9, z: 8.2, r: 0.6, h: 3.4, col: '#7d89ab' }
    ];
    const CAM_Y = 1.6, TAN_V = Math.tan(Math.PI / 6), TAN_H = TAN_V * 16 / 9;
    let mode = 'ray', depth = 4, sp = { sx: -0.08, sy: 0.04 }, grow = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'ray', l: L.ray }, { v: 'stwp', l: L.stwp }], mode, (v) => { mode = v; show(zs, v === 'stwp'); grow = 0; });
    const zs = el('div', ''); zs.style.cssText = 'flex:1 1 200px;display:flex';
    ctl.appendChild(zs);
    slider(zs, L.z, 0, 12, 0.5, depth, (v) => { depth = v; }, (v) => v.toFixed(1));
    show(zs, false);
    const stage = makeCanvas(host, (w) => (w < 600 ? Math.round((w - 16) * 9 / 16) + 250 : Math.round((w - 30) / 2 * 9 / 16) + 34));
    const out = readout(host);
    const cb = codeBlock(host);
    let geo = null;
    const pick = (x, y) => {
      if (!geo) return;
      const g = geo.g;
      if (x < g.x || x > g.x + g.w || y < g.y || y > g.y + g.h) return;
      sp = { sx: (x - (g.x + g.w / 2)) / g.f, sy: ((g.y + g.h / 2) - y) / g.f };
      grow = 0;
    };
    drag(stage, { down: pick, move: pick });

    function raycast(d) {
      let best = null;
      const cand = (t, o) => { if (t > 0 && (!best || t < best.t)) best = { t, o }; };
      OBJ.forEach((o) => {
        const a = d.x * d.x + d.z * d.z, b = -2 * (o.x * d.x + o.z * d.z), q = o.x * o.x + o.z * o.z - o.r * o.r;
        const disc = b * b - 4 * a * q;
        if (disc >= 0 && a > 0) { const t = (-b - Math.sqrt(disc)) / (2 * a); const y = CAM_Y + d.y * t; if (y >= 0 && y <= o.h) cand(t, o); }
        if (d.y < 0 && CAM_Y > o.h) { const t = (o.h - CAM_Y) / d.y; const px = d.x * t - o.x, pz = d.z * t - o.z; if (px * px + pz * pz <= o.r * o.r) cand(t, o); }
      });
      if (d.y < 0) cand(-CAM_Y / d.y, { n: 'Ground' });
      return best;
    }

    const stop = loop((dt) => {
      grow = Math.min(1, grow + dt * 2.2);
      const { ctx, w, h } = stage;
      const c = colors();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 600;
      const gw = narrow ? w - 16 : (w - 30) / 2, gh = Math.round(gw * 9 / 16);
      const g = { x: 8, y: 22, w: gw, h: gh, f: (gw / 2) / TAN_H };
      const tv = narrow ? { x: 8, y: g.y + gh + 30, w: gw, h: h - (g.y + gh + 30) - 8 } : { x: g.x + gw + 14, y: 22, w: gw, h: gh };
      geo = { g };
      text(ctx, L.game, g.x, 10, c.muted);
      text(ctx, L.top, tv.x, tv.y - 12, c.muted);
      // Game view en perspectiva
      const hor = g.y + gh / 2, gcx = g.x + gw / 2;
      ctx.save(); roundRect(ctx, g.x, g.y, gw, gh, 8); ctx.clip();
      ctx.fillStyle = c.bg; ctx.fillRect(g.x, g.y, gw, gh / 2);
      ctx.fillStyle = c.soft; ctx.fillRect(g.x, hor, gw, gh / 2);
      for (let zz = 2; zz <= 14; zz += 2) { const yy = hor + g.f * CAM_Y / zz; ctx.fillStyle = c.border; ctx.fillRect(g.x, yy, gw, 1); }
      OBJ.slice().sort((a, b) => b.z - a.z).forEach((o) => {
        const px = gcx + g.f * o.x / o.z, hw = g.f * o.r / o.z;
        const bot = hor + g.f * CAM_Y / o.z, top = hor - g.f * (o.h - CAM_Y) / o.z;
        ctx.fillStyle = o.col; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
        roundRect(ctx, px - hw, top, hw * 2, bot - top, Math.min(6, hw)); ctx.fill(); ctx.stroke();
      });
      const cx = gcx + sp.sx * g.f, cy = hor - sp.sy * g.f;
      ctx.strokeStyle = c.text; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = c.border; ctx.lineWidth = 1; roundRect(ctx, g.x, g.y, gw, gh, 8); ctx.stroke();
      // Rayo
      const len = Math.hypot(sp.sx, sp.sy, 1);
      const d = { x: sp.sx / len, y: sp.sy / len, z: 1 / len };
      const hit = raycast(d);
      // Vista superior
      ctx.fillStyle = c.soft; roundRect(ctx, tv.x, tv.y, tv.w, tv.h, 8); ctx.fill();
      ctx.save(); roundRect(ctx, tv.x, tv.y, tv.w, tv.h, 8); ctx.clip();
      const camP = { x: tv.x + tv.w / 2, y: tv.y + tv.h - 14 };
      const s = Math.min((tv.w / 2 - 8) / 4.2, (tv.h - 24) / 9.4);
      const P = (x, z) => ({ x: camP.x + x * s, y: camP.y - z * s });
      const far = 30;
      ctx.fillStyle = c.accentSoft;
      ctx.beginPath(); ctx.moveTo(camP.x, camP.y); const fl = P(-TAN_H * far, far), fr = P(TAN_H * far, far); ctx.lineTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y); ctx.closePath(); ctx.fill();
      OBJ.forEach((o) => {
        const p = P(o.x, o.z);
        ctx.fillStyle = o.col; ctx.beginPath(); ctx.arc(p.x, p.y, o.r * s, 0, TAU); ctx.fill();
        text(ctx, o.n, p.x + o.r * s + 4, p.y, c.text);
      });
      const dirXZ = Math.hypot(d.x, d.z);
      if (mode === 'ray') {
        const tEnd = hit ? hit.t : 40;
        const e = P(d.x * tEnd * grow, d.z * tEnd * grow);
        ctx.strokeStyle = c.warn; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(camP.x, camP.y); ctx.lineTo(e.x, e.y); ctx.stroke();
        if (hit && grow >= 1) { dot(ctx, e.x, e.y, 5, c.bad); }
      } else {
        const e = P(d.x * 40 / dirXZ, d.z * 40 / dirXZ);
        dashed(ctx, camP.x, camP.y, e.x, e.y, c.muted, 1);
        const a = P(-TAN_H * depth, depth), b = P(TAN_H * depth, depth);
        dashed(ctx, a.x, a.y, b.x, b.y, c.accent, 1.5);
        const p = P(sp.sx * depth, depth);
        dot(ctx, p.x, p.y, 6, c.accent);
      }
      ctx.fillStyle = c.text;
      ctx.beginPath(); ctx.moveTo(camP.x, camP.y - 9); ctx.lineTo(camP.x - 8, camP.y + 6); ctx.lineTo(camP.x + 8, camP.y + 6); ctx.closePath(); ctx.fill();
      text(ctx, 'Camera', camP.x + 12, camP.y, c.muted);
      ctx.restore();

      // Coordenadas de pantalla como en Unity (origen abajo a la izquierda, 1920×1080)
      const mx = Math.round((0.5 + sp.sx * g.f / gw) * 1920), my = Math.round((0.5 + sp.sy * g.f / gh) * 1080);
      const v3 = (x, y, z) => '(' + fx(x, 1) + ', ' + fx(y, 1) + ', ' + fx(z, 1) + ')';
      let html = cd('Input.mousePosition') + ' = <b>(' + mx + ', ' + my + ', 0)</b>';
      if (mode === 'ray') {
        if (hit) {
          const hp = v3(d.x * hit.t, CAM_Y + d.y * hit.t, d.z * hit.t);
          html += '<p>✓ ' + cd('hit.collider.name') + ' = <b>"' + hit.o.n + '"</b> · ' + cd('hit.point') + ' = <b>' + hp + '</b> · ' + cd('hit.distance') + ' = ' + fx(hit.t, 1) + '</p>';
        } else html += '<p>' + L.miss + '</p>';
        cb('void Update()\n{\n    if (Input.GetMouseButtonDown(0))\n    {\n        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);\n        if (Physics.Raycast(ray, out RaycastHit hit))\n            Debug.Log(hit.collider.name + " " + hit.point);\n    }\n}',
          { 4: 'ok', 5: 'ok', 6: hit ? 'ok' : 'off' });
      } else {
        const wp = v3(sp.sx * depth, CAM_Y + sp.sy * depth, depth);
        html += '<p>' + cd('ScreenToWorldPoint(new Vector3(' + mx + ', ' + my + ', ' + depth + '))') + ' = <b>' + wp + '</b></p><p>' + md(L.point.replace('{z}', depth)) +
          (hit ? ' ' + L.under + ' <b>' + hit.o.n + '</b>, ' + L.butNot : '') + (depth === 0 ? '</p><p>⚠️ ' + md(L.zero) : '') + '</p>';
        cb('Vector3 screen = Input.mousePosition;   // z = 0\nscreen.z = ' + depth + 'f;                         // ' + (es ? 'distancia a la cámara' : 'distance from the camera') +
          '\nVector3 p = Camera.main.ScreenToWorldPoint(screen);\n// ' + (es ? 'p es UN punto a esa distancia: no hay raycast' : 'p is ONE point at that distance: no raycast'), { 2: 'hl' });
      }
      out(html);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     7. Rigidbody en Unity 6: linearVelocity, linearDamping, angularDamping
     --------------------------------------------------------- */

  function mountRigidbody6(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { tap: 'Toca la pista para lanzar el disco hacia ese punto.', ver: 'Versión',
        old: '⚠️ En Unity 6 estas líneas muestran un aviso de API obsoleta (CS0618): `velocity` → `linearVelocity`, `drag` → `linearDamping`, `angularDrag` → `angularDamping`. En 2D, `Rigidbody2D.velocity` también pasa a `linearVelocity`.',
        neu: '✓ Nombres de Unity 6. `angularVelocity` no cambia de nombre: el prefijo *linear* distingue la velocidad lineal de la angular.',
        damp: 'Damping alto = frena antes. `linearDamping` frena el desplazamiento; `angularDamping`, el giro.' },
      en: { tap: 'Tap the rink to launch the puck toward that point.', ver: 'Version',
        old: '⚠️ In Unity 6 these lines show an obsolete API warning (CS0618): `velocity` → `linearVelocity`, `drag` → `linearDamping`, `angularDrag` → `angularDamping`. In 2D, `Rigidbody2D.velocity` also becomes `linearVelocity`.',
        neu: '✓ Unity 6 names. `angularVelocity` keeps its name: the *linear* prefix tells linear velocity apart from angular velocity.',
        damp: 'Higher damping = stops sooner. `linearDamping` slows the movement; `angularDamping`, the spin.' }
    }[lang];
    const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
    const U = 40;
    let ver = '6', lin = 0.3, ang = 0.05, last = 0;
    const p = { x: 2, z: 2, vx: 0, vz: 0, w: 0, a: 0 };
    let acc = 0, dims = { w: 8, h: 5 };
    function launchDir(dx, dz) { const m = Math.hypot(dx, dz) || 1; p.vx = dx / m * 8; p.vz = dz / m * 8; last = 2; }
    const ctl = controls(host);
    button(ctl, 'rb.linearVelocity = dir * 8f', () => { const a = Math.random() * TAU; launchDir(Math.cos(a), Math.sin(a)); }, true);
    button(ctl, 'rb.linearVelocity = Vector3.zero', () => { p.vx = 0; p.vz = 0; last = 3; });
    button(ctl, 'rb.angularVelocity = Vector3.up * 15f', () => { p.w = 15; last = 0; });
    const ctl2 = controls(host);
    slider(ctl2, 'linearDamping', 0, 3, 0.05, lin, (v) => { lin = v; last = 4; }, (v) => v.toFixed(2));
    slider(ctl2, 'angularDamping', 0, 3, 0.05, ang, (v) => { ang = v; last = 5; }, (v) => v.toFixed(2));
    const stage = makeCanvas(host, (w) => (w < 520 ? 200 : 230), (x, y) => {
      launchDir((x - 10) / U - p.x, (stage.h - 10 - y) / U - p.z);
    });
    const out = readout(host);
    const ctl3 = controls(host);
    seg(group(ctl3, L.ver), [{ v: '2022', l: 'Unity 2022' }, { v: '6', l: 'Unity 6' }], ver, (v) => { ver = v; });
    const cb = codeBlock(host);
    const R = 0.4;

    const stop = loop((dt) => {
      const { ctx, w, h } = stage;
      const c = colors();
      dims = { w: (w - 20) / U, h: (h - 20) / U };
      acc += dt;
      while (acc >= 0.02) {
        acc -= 0.02;
        const k = Math.max(0, 1 - lin * 0.02);
        p.vx *= k; p.vz *= k;
        p.w *= Math.max(0, 1 - ang * 0.02);
        p.x += p.vx * 0.02; p.z += p.vz * 0.02; p.a += p.w * 0.02;
        if (p.x < R) { p.x = R; p.vx = Math.abs(p.vx) * 0.9; }
        if (p.x > dims.w - R) { p.x = dims.w - R; p.vx = -Math.abs(p.vx) * 0.9; }
        if (p.z < R) { p.z = R; p.vz = Math.abs(p.vz) * 0.9; }
        if (p.z > dims.h - R) { p.z = dims.h - R; p.vz = -Math.abs(p.vz) * 0.9; }
      }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = c.accentSoft; roundRect(ctx, 10, 10, w - 20, h - 20, 14); ctx.fill();
      ctx.strokeStyle = c.border; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = c.bg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2, 12); ctx.lineTo(w / 2, h - 12); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 30, 0, TAU); ctx.stroke();
      const px = 10 + p.x * U, py = h - 10 - p.z * U;
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 0.05) arrow(ctx, px, py, px + p.vx * 9, py - p.vz * 9, c.warn, 2.5);
      dot(ctx, px, py, R * U, c.text);
      ctx.strokeStyle = c.bg; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px - Math.cos(p.a) * R * U * 0.8, py + Math.sin(p.a) * R * U * 0.8); ctx.lineTo(px + Math.cos(p.a) * R * U * 0.8, py - Math.sin(p.a) * R * U * 0.8); ctx.stroke();
      text(ctx, '|v| = ' + sp.toFixed(1) + ' m/s', 20, 24, c.text, { mono: true });
      text(ctx, 'ω = ' + p.w.toFixed(1) + ' rad/s', w - 20, 24, c.text, { mono: true, align: 'right' });

      const old = ver === '2022';
      out(L.tap + '<p>' + cd(old ? 'rb.velocity' : 'rb.linearVelocity') + ' = <b>(' + fx(p.vx, 1) + ', 0.0, ' + fx(p.vz, 1) + ')</b> · ' +
        cd('rb.angularVelocity.y') + ' = <b>' + fx(p.w, 1) + '</b></p><p>' + md(L.damp) + '</p><p>' + md(old ? L.old : L.neu) + '</p>');
      const n = (v) => v.toFixed(2) + 'f;';
      const src = old
        ? 'Rigidbody rb;  Rigidbody2D rb2D;\n\nrb.velocity = dir * 8f;            // → linearVelocity\nrb.velocity = Vector3.zero;        // → linearVelocity\nrb.drag = ' + n(lin) + '                // → linearDamping\nrb.angularDrag = ' + n(ang) + '         // → angularDamping\nrb2D.velocity = Vector2.zero;      // → linearVelocity'
        : 'Rigidbody rb;  Rigidbody2D rb2D;\n\nrb.linearVelocity = dir * 8f;\nrb.linearVelocity = Vector3.zero;\nrb.linearDamping = ' + n(lin) + '\nrb.angularDamping = ' + n(ang) + '\nrb2D.linearVelocity = Vector2.zero;';
      const mk = {};
      [2, 3, 4, 5, 6].forEach((i) => { mk[i] = old ? 'bad' : (i === last ? 'hl' : 'ok'); });
      cb(src, mk);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     8. Quaternions: LookRotation, Slerp, RotateTowards
     --------------------------------------------------------- */

  function mountQuaternions(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { t: 't por frame', dps: 'grados/s', rnd: 'Objetivo aleatorio', drag: 'Arrastra o toca para mover el objetivo.',
        err: '✗ No compila: `transform.rotation` devuelve una **copia** del `Quaternion` (un struct), así que no puedes cambiar uno de sus campos. Además, `y` no son grados: es un componente entre −1 y 1. Y si lo copias a una variable (`var q = transform.rotation; q.y = 45f;`), compila pero no gira nada.',
        euler: '✓ `Quaternion.Euler(0f, 45f, 0f)` crea la rotación a partir de grados. Fíjate: el componente `y` vale 0.38, no 45.',
        look: '`LookRotation(dir)` devuelve una rotación cuyo eje **forward (Z+)** apunta al objetivo. Es instantánea.',
        slerp: '`Slerp` con un `t` fijo avanza esa fracción del giro **restante** en cada frame: frena al final (y depende de los FPS).',
        rt: '`RotateTowards` gira como máximo N grados por llamada: con `grados * Time.deltaTime`, velocidad angular constante.',
        comp: 'Para un giro en Y: y = sin(θ/2), w = cos(θ/2).' },
      en: { t: 't per frame', dps: 'degrees/s', rnd: 'Random target', drag: 'Drag or tap to move the target.',
        err: '✗ It does not compile: `transform.rotation` returns a **copy** of the `Quaternion` (a struct), so you cannot change one of its fields. Also, `y` is not degrees: it is a component between −1 and 1. And if you copy it to a variable (`var q = transform.rotation; q.y = 45f;`), it compiles but nothing rotates.',
        euler: '✓ `Quaternion.Euler(0f, 45f, 0f)` builds the rotation from degrees. Note: the `y` component is 0.38, not 45.',
        look: '`LookRotation(dir)` returns a rotation whose **forward (Z+)** axis points at the target. It is instant.',
        slerp: '`Slerp` with a fixed `t` covers that fraction of the **remaining** turn every frame: it slows down at the end (and depends on FPS).',
        rt: '`RotateTowards` turns at most N degrees per call: with `degrees * Time.deltaTime`, constant angular speed.',
        comp: 'For a turn around Y: y = sin(θ/2), w = cos(θ/2).' }
    }[lang];
    const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const wrap = (a) => { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };
    let mode = 'look', t = 0.06, dps = 120, yaw = 0, tgt = { x: 2.2, z: -1.6 }, msg = '', msgT = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'look', l: 'LookRotation' }, { v: 'slerp', l: 'Slerp' }, { v: 'rt', l: 'RotateTowards' }], mode, (v) => { mode = v; show(sT, v === 'slerp'); show(sD, v === 'rt'); });
    const sT = el('div', ''), sD = el('div', '');
    [sT, sD].forEach((d) => { d.style.cssText = 'flex:1 1 200px;display:flex'; ctl.appendChild(d); });
    slider(sT, L.t, 0.01, 0.3, 0.01, t, (v) => { t = v; }, (v) => v.toFixed(2));
    slider(sD, L.dps, 20, 720, 10, dps, (v) => { dps = v; }, (v) => v + '°/s');
    show(sT, false); show(sD, false);
    button(ctl, L.rnd, () => { const a = Math.random() * TAU, r = 1.4 + Math.random() * 1.2; tgt = { x: Math.sin(a) * r, z: Math.cos(a) * r }; });
    const ctl2 = controls(host);
    button(ctl2, 'transform.rotation.y = 45f;', () => { msg = 'err'; msgT = 8; });
    button(ctl2, 'transform.rotation = Quaternion.Euler(0f, 45f, 0f);', () => {
      yaw = 45; const r = Math.hypot(tgt.x, tgt.z) || 2; tgt = { x: Math.sin(Math.PI / 4) * r, z: Math.cos(Math.PI / 4) * r }; msg = 'euler'; msgT = 8;
    });
    let geo = { cx: 0, cy: 0, s: 50 };
    const stage = makeCanvas(host, (w) => (w < 560 ? 410 : 290));
    const setT = (x, y) => {
      const nx = (x - geo.cx) / geo.s, nz = (geo.cy - y) / geo.s;
      if (Math.hypot(nx, nz) < 0.3 || Math.abs(x - geo.cx) > geo.half || Math.abs(y - geo.cy) > geo.half) return;
      tgt = { x: nx, z: nz };
    };
    drag(stage, { down: setT, move: setT });
    const out = readout(host);
    const cb = codeBlock(host);
    const cb2 = codeBlock(host);

    const stop = loop((dt) => {
      const desired = Math.atan2(tgt.x, tgt.z) * 180 / Math.PI;
      const delta = wrap(desired - yaw);
      if (mode === 'look') yaw = desired;
      else if (mode === 'slerp') yaw = wrap(yaw + delta * t);
      else yaw = wrap(yaw + Math.sign(delta) * Math.min(Math.abs(delta), dps * dt));
      msgT = Math.max(0, msgT - dt);
      const { ctx, w, h } = stage;
      const c = colors();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const sw = narrow ? w - 16 : Math.min(h - 16, w * 0.55);
      const sx = 8, sy = 8;
      const cx = sx + sw / 2, cy = sy + sw / 2;
      geo = { cx, cy, s: sw / 7, half: sw / 2 };
      const S = geo.s;
      ctx.fillStyle = c.soft; roundRect(ctx, sx, sy, sw, sw, 10); ctx.fill();
      ctx.strokeStyle = c.border; ctx.lineWidth = 1;
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath(); ctx.moveTo(cx + k * S, sy + 4); ctx.lineTo(cx + k * S, sy + sw - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 4, cy + k * S); ctx.lineTo(sx + sw - 4, cy + k * S); ctx.stroke();
      }
      text(ctx, es ? 'Z+ mundo' : 'world Z+', cx + 4, sy + 12, c.muted);
      const th = yaw * Math.PI / 180;
      const fwd = { x: Math.sin(th), y: -Math.cos(th) }, right = { x: Math.cos(th), y: Math.sin(th) };
      // Arco del ángulo
      ctx.strokeStyle = c.warn; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + th, th < 0); ctx.stroke();
      // Objetivo
      const tx = cx + tgt.x * S, ty = cy - tgt.z * S;
      dashed(ctx, cx, cy, tx, ty, c.muted, 1);
      crossMark(ctx, tx, ty, c.bad, 10);
      // Torreta
      dot(ctx, cx, cy, 20, c.text);
      arrow(ctx, cx, cy, cx + right.x * 46, cy + right.y * 46, '#e5484d', 2.5);
      arrow(ctx, cx, cy, cx + fwd.x * S * 1.6, cy + fwd.y * S * 1.6, c.accent, 4);
      text(ctx, 'Z+ forward', cx + fwd.x * (S * 1.6 + 14), cy + fwd.y * (S * 1.6 + 14), c.accent, { align: fwd.x > 0.3 ? 'left' : fwd.x < -0.3 ? 'right' : 'center' });
      text(ctx, 'X+', cx + right.x * 58, cy + right.y * 58, '#e5484d', { align: 'center' });
      dot(ctx, cx, cy, 6, c.bg);
      // Panel de componentes
      const half = th / 2;
      const q = { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
      const eul = ((yaw % 360) + 360) % 360;
      const px = narrow ? 8 : sx + sw + 18, py = narrow ? sy + sw + 14 : 14, pw = narrow ? w - 16 : w - px - 8;
      text(ctx, 'transform.eulerAngles.y = ' + eul.toFixed(1) + '°', px, py + 6, c.warn, { mono: true });
      text(ctx, 'transform.rotation (x, y, z, w):', px, py + 30, c.muted, { mono: true });
      const bx = px + 22, bw = pw - 80;
      ['x', 'y', 'z', 'w'].forEach((k, i) => {
        const y = py + 52 + i * 22;
        text(ctx, k, px + 4, y, c.text, { mono: true });
        ctx.fillStyle = c.soft; ctx.fillRect(bx, y - 7, bw, 14);
        ctx.fillStyle = c.border; ctx.fillRect(bx + bw / 2 - 0.5, y - 9, 1, 18);
        const v = q[k];
        ctx.fillStyle = c.accent;
        ctx.fillRect(v >= 0 ? bx + bw / 2 : bx + bw / 2 + v * bw / 2, y - 5, Math.abs(v) * bw / 2, 10);
        text(ctx, fx(v, 3), bx + bw + 8, y, c.text, { mono: true });
      });
      text(ctx, '−1', bx, py + 52 + 4 * 22, c.muted);
      text(ctx, '1', bx + bw, py + 52 + 4 * 22, c.muted, { align: 'right' });

      const info = mode === 'look' ? L.look : mode === 'slerp' ? L.slerp : L.rt;
      out('<span>' + L.drag + '</span><p>' + md(info) + '</p><p>θ = ' + yaw.toFixed(1) + '° → ' + cd('y = sin(θ/2) = ' + fx(q.y, 3)) + ', ' + cd('w = cos(θ/2) = ' + fx(q.w, 3)) + '. ' + L.comp + '</p>' +
        (msgT > 0 ? '<p>' + md(msg === 'err' ? L.err : L.euler) + '</p>' : ''));
      const tf = t.toFixed(2) + 'f';
      cb('Vector3 dir = target.position - transform.position;\nQuaternion look = Quaternion.LookRotation(dir);   // Z+ → target\n\n' +
        '// LookRotation: ' + (es ? 'instantáneo' : 'instant') + '\ntransform.rotation = look;\n' +
        '// Slerp: ' + (es ? 'fracción t del giro restante cada frame' : 'fraction t of the remaining turn each frame') + '\ntransform.rotation = Quaternion.Slerp(transform.rotation, look, ' + tf + ');\n' +
        '// RotateTowards: ' + (es ? 'como máximo N grados por llamada' : 'at most N degrees per call') + '\ntransform.rotation = Quaternion.RotateTowards(\n    transform.rotation, look, ' + dps + 'f * Time.deltaTime);',
      { 1: 'hl', 4: mode === 'look' ? 'ok' : 'off', 6: mode === 'slerp' ? 'ok' : 'off', 8: mode === 'rt' ? 'ok' : 'off', 9: mode === 'rt' ? 'ok' : 'off' });
      cb2('transform.rotation.x = 45f;   // ✗ CS1612: ' + (es ? 'rotation devuelve una copia (struct)' : 'rotation returns a copy (struct)') +
        '\ntransform.rotation = Quaternion.Euler(45f, 0f, 0f);   // ✓', { 0: 'bad', 1: 'ok' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     9. Cinemachine 3: Priority, CinemachineBrain y blends
     --------------------------------------------------------- */

  function mountCinemachine(host, lang) {
    const es = lang === 'es';
    const L = {
      es: { pExp: 'Priority · Exploration', pCom: 'Priority · Combat', aExp: 'Exploration activa', aCom: 'Combat activa', blend: 'Default Blend', combat: 'Entrar / salir de combate',
        map: 'Escena (vista superior)', game: 'Game view (Main Camera)', live: 'Live', none: 'Ninguna CinemachineCamera activa: la Brain deja la cámara donde está.',
        brain: 'La `CinemachineBrain` elige la cámara **activa** con mayor **Priority** (si empatan, la última activada) y hace el blend.',
        main: '✗ error CS0200: Property or indexer \'Camera.main\' cannot be assigned to -- it is read only. Con Cinemachine no cambias la cámara real: subes la Priority (o activas la CinemachineCamera).',
        names: 'Nombres' },
      en: { pExp: 'Priority · Exploration', pCom: 'Priority · Combat', aExp: 'Exploration active', aCom: 'Combat active', blend: 'Default Blend', combat: 'Enter / leave combat',
        map: 'Scene (top view)', game: 'Game view (Main Camera)', live: 'Live', none: 'No active CinemachineCamera: the Brain leaves the camera where it is.',
        brain: 'The `CinemachineBrain` picks the **active** camera with the highest **Priority** (on a tie, the most recently activated) and blends to it.',
        main: '✗ error CS0200: Property or indexer \'Camera.main\' cannot be assigned to -- it is read only. With Cinemachine you do not swap the real camera: raise the Priority (or activate the CinemachineCamera).',
        names: 'Names' }
    }[lang];
    const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const WW = 24, WH = 14;
    const cams = [
      { n: 'Exploration', pri: 10, on: true, stamp: 1, width: 13 },
      { n: 'Combat', pri: 0, on: true, stamp: 0, width: 6 }
    ];
    const BLENDS = { cut: 0, ease: 1, lin: 2 };
    let style = 'ease', stampN = 2, live = cams[0], blend = null, cur = null, now = 0, mainMsg = 0, ver = '3';
    const PROPS = [[3, 3, 'tree'], [6, 10, 'tree'], [11, 2, 'rock'], [14, 11, 'tree'], [20, 3, 'tree'], [21, 10, 'rock'], [9, 7, 'rock'], [17, 7.5, 'tree'], [2, 11, 'rock']];
    const ctl = controls(host);
    const sE = slider(ctl, L.pExp, 0, 20, 1, 10, (v) => { cams[0].pri = v; });
    const sC = slider(ctl, L.pCom, 0, 20, 1, 0, (v) => { cams[1].pri = v; });
    const ctl2 = controls(host);
    toggle(ctl2, L.aExp, true, (v) => { cams[0].on = v; if (v) cams[0].stamp = stampN++; });
    toggle(ctl2, L.aCom, true, (v) => { cams[1].on = v; if (v) cams[1].stamp = stampN++; });
    seg(group(ctl2, L.blend), [{ v: 'cut', l: 'Cut' }, { v: 'ease', l: 'EaseInOut 1 s' }, { v: 'lin', l: 'Linear 2 s' }], style, (v) => { style = v; });
    const ctl3 = controls(host);
    button(ctl3, 'combatCam.Priority = ' + (es ? '20 / 0' : '20 / 0'), () => {
      sC.value = cams[1].pri > cams[0].pri ? 0 : 20; sC.dispatchEvent(new Event('input'));
    }, true);
    button(ctl3, 'Camera.main = combatCam;', () => { mainMsg = 8; });
    const stage = makeCanvas(host, (w) => (w < 600 ? Math.round((w - 16) * WH / WW) + Math.round((w - 16) * 9 / 16) + 52 : Math.round((w - 30) * 0.55 * WH / WW) + 34));
    const out = readout(host);
    const ctl4 = controls(host);
    seg(group(ctl4, L.names), [{ v: '2', l: 'Cinemachine 2.x' }, { v: '3', l: 'Cinemachine 3.x (Unity 6)' }], ver, (v) => { ver = v; });
    const cb = codeBlock(host);

    const playerAt = (t) => ({ x: 11 + Math.cos(t * 0.35) * 7.5, z: 7 + Math.sin(t * 0.7) * 3.6 });
    const ENEMY = { x: 18.5, z: 7.5 };
    function rectOf(cam, pl) {
      const wv = cam.width, hv = wv * 9 / 16;
      const cxv = cam.n === 'Combat' ? (pl.x * 2 + ENEMY.x) / 3 : pl.x, cz = cam.n === 'Combat' ? (pl.z * 2 + ENEMY.z) / 3 : pl.z;
      return { x: clamp(cxv - wv / 2, 0, WW - wv), z: clamp(cz - hv / 2, 0, WH - hv), w: wv, h: hv };
    }
    const lerpR = (a, b, k) => ({ x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

    const stop = loop((dt) => {
      now += dt; mainMsg = Math.max(0, mainMsg - dt);
      const pl = playerAt(now);
      const act = cams.filter((q) => q.on).sort((a, b) => b.pri - a.pri || b.stamp - a.stamp);
      const nl = act[0] || null;
      if (nl !== live) {
        const dur = BLENDS[style];
        if (nl && cur && dur > 0) blend = { from: blend ? { r: cur } : (live ? { cam: live } : { r: cur }), t: 0, dur, style };
        else blend = null;
        live = nl;
      }
      if (live) {
        const target = rectOf(live, pl);
        if (blend) {
          blend.t += dt;
          const k = clamp(blend.t / blend.dur, 0, 1);
          const from = blend.from.cam ? rectOf(blend.from.cam, pl) : blend.from.r;
          cur = lerpR(from, target, blend.style === 'ease' ? ease(k) : k);
          if (k >= 1) blend = null;
        } else cur = target;
      }
      if (!cur) cur = rectOf(cams[0], pl);

      const { ctx, w, h } = stage;
      const c = colors();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 600;
      const mw = narrow ? w - 16 : (w - 30) * 0.55, mh = Math.round(mw * WH / WW);
      const m = { x: 8, y: 22, w: mw, h: mh };
      const gw = narrow ? w - 16 : (w - 30) * 0.45, gh = Math.round(gw * 9 / 16);
      const g = narrow ? { x: 8, y: m.y + mh + 30, w: gw, h: gh } : { x: m.x + mw + 14, y: 22, w: gw, h: gh };
      text(ctx, L.map, m.x, 10, c.muted);
      text(ctx, L.game, g.x, g.y - 12, c.muted);
      // Dibuja el mundo en un rectángulo de pantalla a partir de una ventana del mundo.
      function world(view, area, mini) {
        const sc = area.w / view.w;
        const P = (x, z) => ({ x: area.x + (x - view.x) * sc, y: area.y + area.h - (z - view.z) * sc });
        ctx.save(); roundRect(ctx, area.x, area.y, area.w, area.h, 8); ctx.clip();
        ctx.fillStyle = c.soft; ctx.fillRect(area.x, area.y, area.w, area.h);
        ctx.strokeStyle = c.border; ctx.lineWidth = 1;
        for (let x = 0; x <= WW; x += 2) { const a = P(x, 0), b = P(x, WH); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        for (let z = 0; z <= WH; z += 2) { const a = P(0, z), b = P(WW, z); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        PROPS.forEach((pr) => { const p = P(pr[0], pr[1]); dot(ctx, p.x, p.y, (pr[2] === 'tree' ? 0.6 : 0.4) * sc, pr[2] === 'tree' ? '#3c9a5c' : '#8a8f9c'); });
        const e = P(ENEMY.x, ENEMY.z); dot(ctx, e.x, e.y, Math.max(4, 0.45 * sc), c.bad);
        const p = P(pl.x, pl.z); dot(ctx, p.x, p.y, Math.max(4, 0.4 * sc), c.accent);
        if (mini) {
          cams.forEach((q, i) => {
            const r = rectOf(q, pl), a = P(r.x, r.z + r.h);
            const col = i ? c.warn : c.ok;
            ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = q.on ? 1 : 0.35; ctx.setLineDash([6, 4]);
            ctx.strokeRect(a.x, a.y, r.w * sc, r.h * sc); ctx.setLineDash([]);
            const lab = q.n + ' · ' + q.pri;
            ctx.font = K.FONT;
            const lx = Math.max(area.x + 4, Math.min(a.x + 4, area.x + area.w - ctx.measureText(lab).width - 4));
            const below = a.y + r.h * sc + 10;
            const ly = i ? (below < area.y + area.h - 6 ? below : a.y - 9) : (a.y - 9 > area.y + 6 ? a.y - 9 : a.y + 10);
            text(ctx, lab, lx, ly, col);
            ctx.globalAlpha = 1;
          });
          const a = P(cur.x, cur.z + cur.h);
          ctx.strokeStyle = c.text; ctx.lineWidth = 3; ctx.strokeRect(a.x, a.y, cur.w * sc, cur.h * sc);
        }
        ctx.restore();
      }
      world({ x: 0, z: 0, w: WW, h: WH }, m, true);
      world(cur, g, false);
      ctx.strokeStyle = c.text; ctx.lineWidth = 2; roundRect(ctx, g.x, g.y, g.w, g.h, 8); ctx.stroke();
      if (blend) {
        const k = clamp(blend.t / blend.dur, 0, 1);
        ctx.fillStyle = c.bg; ctx.fillRect(g.x + 8, g.y + g.h - 14, g.w - 16, 6);
        ctx.fillStyle = c.accent; ctx.fillRect(g.x + 8, g.y + g.h - 14, (g.w - 16) * k, 6);
      }
      const liveLab = live ? L.live + ': CM ' + live.n : '—';
      ctx.font = K.MONO;
      ctx.globalAlpha = 0.85; ctx.fillStyle = c.bg; roundRect(ctx, g.x + 4, g.y + 4, ctx.measureText(liveLab).width + 10, 17, 4); ctx.fill(); ctx.globalAlpha = 1;
      text(ctx, liveLab, g.x + 9, g.y + 13, c.text, { mono: true });

      const bl = blend ? ' · Blend ' + (blend.style === 'ease' ? 'EaseInOut' : 'Linear') + ' ' + blend.dur + ' s: <b>' + Math.round(clamp(blend.t / blend.dur, 0, 1) * 100) + '%</b>' : '';
      out((live ? '<b>' + L.live + ': CM ' + live.n + '</b> (Priority ' + live.pri + ')' + bl : '<b>' + L.none + '</b>') + '<p>' + md(L.brain) + '</p>' +
        (mainMsg > 0 ? '<p>' + K.esc(L.main) + '</p>' : ''));
      if (ver === '2') {
        cb('using Cinemachine;                    // Cinemachine 2.x\n\npublic CinemachineVirtualCamera explorationCam;\npublic CinemachineVirtualCamera combatCam;\npublic CinemachineFreeLook orbitCam;\n\nvoid EnterCombat() => combatCam.Priority = 20;\n// Camera.main = ...;  ✗ ' + (es ? 'solo lectura' : 'read-only'),
          { 0: 'hl', 2: 'hl', 3: 'hl', 4: 'hl', 7: 'bad' });
      } else {
        cb('using Unity.Cinemachine;              // Cinemachine 3.x\n\npublic CinemachineCamera explorationCam;\npublic CinemachineCamera combatCam;\npublic CinemachineCamera orbitCam;    // + Orbital Follow\n\nvoid EnterCombat() => combatCam.Priority = 20;\n// Camera.main = ...;  ✗ ' + (es ? 'solo lectura' : 'read-only'),
          { 0: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 6: 'hl', 7: 'bad' });
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     Catálogo
     --------------------------------------------------------- */

  UCP.concepts.push(
    {
      id: 'colisiones-triggers', questions: ['core-02', 'core-17', 'core-19'], domain: 'core', practice: { d: 'core', t: 'Física' }, icon: '🧲', mount: mountCollisions,
      text: {
        es: {
          title: 'Colisiones y triggers: qué mensaje llega',
          summary: 'Que dos colliders se toquen no basta: Unity solo envía `OnTriggerEnter` u `OnCollisionEnter` si se cumplen ciertas reglas sobre **Rigidbody** e **Is Trigger**, y en física 2D solo llama a los métodos con sufijo `2D`. Cambia los Rigidbody, los triggers, la física y los métodos del script, y mira qué mensaje se dispara. En una colisión, compara el punto de contacto con el pivote del otro objeto.',
          points: ['Trigger: al menos un collider con **Is Trigger** + al menos un `Rigidbody` (vale cinemático). La capa no tiene que coincidir.', 'Colisión: ninguno es trigger y al menos uno tiene un `Rigidbody` **no cinemático**.', 'Punto de impacto: `collision.GetContact(0).point` (y `.normal`). `collision.transform.position` es el pivote del otro objeto; `collision.point` no existe.', 'En 2D: `OnCollisionEnter2D(Collision2D)` y `OnTriggerEnter2D(Collider2D)`. Los nombres 3D nunca se llaman y Unity no da error.']
        },
        en: {
          title: 'Collisions and triggers: which message arrives',
          summary: 'Two colliders touching is not enough: Unity only sends `OnTriggerEnter` or `OnCollisionEnter` when certain rules about **Rigidbody** and **Is Trigger** are met, and with 2D physics it only calls the methods with the `2D` suffix. Change the Rigidbodies, the triggers, the physics world and the script methods, and see which message fires. On a collision, compare the contact point with the other object\'s pivot.',
          points: ['Trigger: at least one collider with **Is Trigger** + at least one `Rigidbody` (kinematic counts). Layers do not need to match.', 'Collision: neither is a trigger and at least one has a **non-kinematic** `Rigidbody`.', 'Impact point: `collision.GetContact(0).point` (and `.normal`). `collision.transform.position` is the other object\'s pivot; `collision.point` does not exist.', 'In 2D: `OnCollisionEnter2D(Collision2D)` and `OnTriggerEnter2D(Collider2D)`. The 3D names are never called and Unity shows no error.']
        }
      }
    },
    {
      id: 'layer-collision-matrix', questions: ['core-15'], domain: 'core', practice: { d: 'core', t: 'Raycasts y capas' }, icon: '🚧', mount: mountLayerMatrix,
      text: {
        es: {
          title: 'Layer Collision Matrix: balas que no golpean al jugador',
          summary: 'Las balas nacen dentro del collider del jugador, así que, si sus capas pueden colisionar, chocan con él nada más salir. La **Layer Collision Matrix** (Project Settings > Physics) decide qué parejas de capas interactúan, sin código. Desmarca Player × PlayerBullet y observa las balas; prueba también el tag y `Physics.IgnoreCollision`.',
          points: ['Solución limpia: capas distintas y desactivar la pareja en la matriz. No cuesta nada en tiempo de ejecución.', '`Physics.IgnoreCollision` funciona, pero es una llamada por cada pareja de colliders (cada bala).', 'Los **tags** no afectan a la física: solo sirven para identificar objetos en código.', 'Desactivar una capa contra Ground hace que esos objetos atraviesen el suelo.']
        },
        en: {
          title: 'Layer Collision Matrix: bullets that do not hit the player',
          summary: 'Bullets spawn inside the player\'s collider, so if their layers can collide they hit the player the moment they leave the gun. The **Layer Collision Matrix** (Project Settings > Physics) decides which layer pairs interact, with no code. Untick Player × PlayerBullet and watch the bullets; also try the tag and `Physics.IgnoreCollision`.',
          points: ['Clean fix: separate layers and disable the pair in the matrix. It costs nothing at runtime.', '`Physics.IgnoreCollision` works, but it is one call per collider pair (every bullet).', '**Tags** do not affect physics: they only identify objects in code.', 'Disabling a layer against Ground makes those objects fall through the floor.']
        }
      }
    },
    {
      id: 'camara-seguimiento', questions: ['core-05', 'core-18'], domain: 'core', practice: { d: 'core', t: 'Cámara' }, icon: '🎥', mount: mountCameraFollow,
      text: {
        es: {
          title: 'Cámara que sigue: LateUpdate e Interpolate',
          summary: 'Una cámara que sigue a un objetivo debe moverse **después** de que el objetivo se haya movido en ese frame; si no, unos frames va un paso por detrás y la imagen tiembla. Y si el objetivo se mueve por física (50 Hz) en una pantalla de 144 Hz, sin interpolación su posición avanza a saltos. Cambia el método de la cámara y la interpolación y mira la gráfica: línea plana = movimiento suave.',
          points: ['Cámara que sigue a un objetivo movido en `Update` → código de la cámara en `LateUpdate`.', 'El orden entre los `Update` de distintos scripts no está garantizado.', 'Objetivo con física y pantalla de alta frecuencia → Rigidbody **Interpolate** = `Interpolate`.', 'Is Kinematic, Linear Damping o Collision Detection no arreglan el tirón visual.']
        },
        en: {
          title: 'Follow camera: LateUpdate and Interpolate',
          summary: 'A camera that follows a target must move **after** the target has moved in that frame; otherwise on some frames it is one step behind and the image shakes. And if the target is moved by physics (50 Hz) on a 144 Hz display, without interpolation its position advances in jumps. Change the camera method and the interpolation and watch the graph: flat line = smooth motion.',
          points: ['Camera following a target moved in `Update` → camera code in `LateUpdate`.', 'The order between `Update` calls of different scripts is not guaranteed.', 'Physics target and high refresh rate display → Rigidbody **Interpolate** = `Interpolate`.', 'Is Kinematic, Linear Damping or Collision Detection do not fix the visual stutter.']
        }
      }
    },
    {
      id: 'input-actions', questions: ['core-07', 'core-08'], domain: 'core', practice: { d: 'core', t: 'Input' }, icon: '🎮', mount: mountInputActions,
      text: {
        es: {
          title: 'Input System: Enable, callbacks y triggered',
          summary: 'Las acciones que creas desde código (por ejemplo, con la clase generada) empiezan **deshabilitadas**: hasta que llamas a `Enable()` no reciben input. Pulsa y mantén el botón Fire, suéltalo y arrastra el stick, primero sin `Enable()` y luego con él. Mira qué callbacks llegan y cuándo.',
          points: ['Habilita el mapa en `OnEnable` y deshabilítalo en `OnDisable`. Deshabilitado, `ReadValue` devuelve el valor por defecto: `(0, 0)`.', 'Button con la interacción por defecto: `started` y `performed` al pulsar; `canceled` al **soltar**.', '`triggered` no es un callback: es una propiedad que solo es `true` en el frame en que se ejecutó la acción.', 'Para saber si sigue pulsado: `IsPressed()`.']
        },
        en: {
          title: 'Input System: Enable, callbacks and triggered',
          summary: 'Actions you create from code (for example, with the generated class) start **disabled**: they get no input until you call `Enable()`. Press and hold the Fire button, release it and drag the stick, first without `Enable()` and then with it. See which callbacks arrive and when.',
          points: ['Enable the map in `OnEnable` and disable it in `OnDisable`. While disabled, `ReadValue` returns the default value: `(0, 0)`.', 'Button with the default interaction: `started` and `performed` on press; `canceled` on **release**.', '`triggered` is not a callback: it is a property that is only `true` in the frame the action was performed.', 'To know whether it is still held: `IsPressed()`.']
        }
      }
    },
    {
      id: 'character-controller', questions: ['core-11'], domain: 'core', practice: { d: 'core', t: 'Movimiento' }, icon: '🚶', mount: mountCharacterController,
      text: {
        es: {
          title: 'CharacterController: Move vs SimpleMove',
          summary: 'Los tres personajes usan el mismo `speed = 1.5` y caminan hacia un borde. `Move` recibe el **desplazamiento** de este frame (tú multiplicas por `Time.deltaTime` y sumas la gravedad); `SimpleMove` recibe una **velocidad** en u/s y aplica la gravedad solo. Cambia los FPS, pulsa Saltar y prueba `AddForce`.',
          points: ['`SimpleMove(speed)`: unidades por segundo, gravedad automática, ignora el eje Y (no sirve para saltar).', '`Move(motion)`: desplazamiento; multiplica por `Time.deltaTime` y aplica la gravedad tú.', '`CharacterController` no lo mueve la física: no tiene `AddForce` y no necesita `Rigidbody`.', 'Usa `isGrounded` para reiniciar la velocidad vertical y para saltar.']
        },
        en: {
          title: 'CharacterController: Move vs SimpleMove',
          summary: 'All three characters use the same `speed = 1.5` and walk toward a ledge. `Move` takes this frame\'s **displacement** (you multiply by `Time.deltaTime` and add gravity); `SimpleMove` takes a **velocity** in u/s and applies gravity by itself. Change the FPS, press Jump and try `AddForce`.',
          points: ['`SimpleMove(speed)`: units per second, automatic gravity, ignores the Y axis (useless for jumping).', '`Move(motion)`: a displacement; multiply by `Time.deltaTime` and apply gravity yourself.', 'A `CharacterController` is not moved by physics: it has no `AddForce` and needs no `Rigidbody`.', 'Use `isGrounded` to reset the vertical velocity and to jump.']
        }
      }
    },
    {
      id: 'screen-to-world', questions: ['core-10'], domain: 'core', practice: { d: 'core', t: 'Cámara' }, icon: '🖱️', mount: mountScreenRay,
      text: {
        es: {
          title: 'Qué hay bajo el cursor: ScreenPointToRay + Raycast',
          summary: 'Un clic es un píxel en pantalla, no un punto 3D. `ScreenPointToRay` crea un rayo que sale de la cámara y pasa por ese píxel, y `Physics.Raycast` te dice el primer collider que toca. Toca la Game view y mira el rayo en la vista superior; luego cambia a `ScreenToWorldPoint` y mueve z.',
          points: ['`Camera.main.ScreenPointToRay(Input.mousePosition)` + `Physics.Raycast(ray, out RaycastHit hit)`.', '`hit.collider`, `hit.point` y `hit.distance` describen lo que hay bajo el cursor.', '`ScreenToWorldPoint` devuelve **un punto** a la distancia z que le pases; con z = 0 obtienes la posición de la cámara.', '`WorldToScreenPoint` hace lo contrario (mundo → píxel). Con el Input System nuevo: `Mouse.current.position.ReadValue()`.']
        },
        en: {
          title: 'What is under the cursor: ScreenPointToRay + Raycast',
          summary: 'A click is a pixel on screen, not a 3D point. `ScreenPointToRay` builds a ray that starts at the camera and goes through that pixel, and `Physics.Raycast` tells you the first collider it touches. Tap the Game view and watch the ray in the top view; then switch to `ScreenToWorldPoint` and move z.',
          points: ['`Camera.main.ScreenPointToRay(Input.mousePosition)` + `Physics.Raycast(ray, out RaycastHit hit)`.', '`hit.collider`, `hit.point` and `hit.distance` describe what is under the cursor.', '`ScreenToWorldPoint` returns **one point** at the z distance you pass; with z = 0 you get the camera position.', '`WorldToScreenPoint` does the opposite (world → pixel). With the new Input System: `Mouse.current.position.ReadValue()`.']
        }
      }
    },
    {
      id: 'rigidbody-unity6', questions: ['core-20'], domain: 'core', practice: { d: 'core', t: 'Física' }, icon: '🛷', mount: mountRigidbody6,
      text: {
        es: {
          title: 'Rigidbody en Unity 6: linearVelocity y damping',
          summary: 'En Unity 6 varias propiedades del `Rigidbody` cambiaron de nombre para distinguir lo lineal de lo angular. Lanza el disco, páralo, hazlo girar y cambia el damping; después cambia el código entre Unity 2022 y Unity 6 para ver los nombres antiguos y los nuevos.',
          points: ['`velocity` → `linearVelocity` (también en `Rigidbody2D`).', '`drag` → `linearDamping`; `angularDrag` → `angularDamping`.', 'Los nombres antiguos muestran un aviso de API obsoleta. `angularVelocity` no cambia.', 'Parar en seco: `rb.linearVelocity = Vector3.zero;`.']
        },
        en: {
          title: 'Rigidbody in Unity 6: linearVelocity and damping',
          summary: 'In Unity 6 several `Rigidbody` properties were renamed to tell linear apart from angular. Launch the puck, stop it, spin it and change the damping; then switch the code between Unity 2022 and Unity 6 to see the old and new names.',
          points: ['`velocity` → `linearVelocity` (in `Rigidbody2D` too).', '`drag` → `linearDamping`; `angularDrag` → `angularDamping`.', 'The old names show an obsolete API warning. `angularVelocity` keeps its name.', 'Stop dead: `rb.linearVelocity = Vector3.zero;`.']
        }
      }
    },
    {
      id: 'quaternions', questions: ['core-13', 'core-14'], domain: 'core', practice: { d: 'core', t: 'Rotación' }, icon: '🔄', mount: mountQuaternions,
      text: {
        es: {
          title: 'Quaternions: LookRotation, Slerp y RotateTowards',
          summary: '`transform.rotation` es un `Quaternion`: sus componentes x, y, z, w **no son grados**. Mueve el objetivo y compara los tres modos de girar la torreta; mira cómo cambian los ángulos de Euler frente a los componentes. Prueba también a asignar `rotation.y` directamente.',
          points: ['`Quaternion.LookRotation(dir)` → rotación cuyo eje **forward (Z+)** apunta en esa dirección.', 'Suave: `Quaternion.Slerp` (fracción por frame) o `Quaternion.RotateTowards` (grados máximos por llamada).', '`transform.rotation.x = 45f;` → error CS1612: `rotation` devuelve una **copia** (struct).', 'Con grados: `Quaternion.Euler(45f, 0f, 0f)` o `transform.eulerAngles`.']
        },
        en: {
          title: 'Quaternions: LookRotation, Slerp and RotateTowards',
          summary: '`transform.rotation` is a `Quaternion`: its x, y, z, w components are **not degrees**. Move the target and compare the three ways of turning the turret; watch how the Euler angles change compared with the components. Also try assigning `rotation.y` directly.',
          points: ['`Quaternion.LookRotation(dir)` → a rotation whose **forward (Z+)** axis points in that direction.', 'Smooth: `Quaternion.Slerp` (fraction per frame) or `Quaternion.RotateTowards` (maximum degrees per call).', '`transform.rotation.x = 45f;` → error CS1612: `rotation` returns a **copy** (struct).', 'With degrees: `Quaternion.Euler(45f, 0f, 0f)` or `transform.eulerAngles`.']
        }
      }
    },
    {
      id: 'cinemachine', questions: ['core-16', 'core-21'], domain: 'core', practice: { d: 'core', t: 'Cámara' }, icon: '📹', mount: mountCinemachine,
      text: {
        es: {
          title: 'Cinemachine 3: Priority, Brain y blends',
          summary: 'Con Cinemachine solo hay una cámara real (con `CinemachineBrain`) y varias `CinemachineCamera` que proponen encuadres. La Brain sigue a la cámara activa con mayor **Priority** y hace una transición (blend) cuando cambia. Sube la prioridad de Combat, desactiva cámaras y cambia el Default Blend.',
          points: ['Cambiar de cámara: sube la **Priority** de la otra `CinemachineCamera` (o actívala).', 'La `CinemachineBrain` va en la cámara real y aplica el **Default Blend** (o Custom Blends).', '`Camera.main` es de solo lectura; las cámaras virtuales no usan `depth`.', 'Cinemachine 3: `CinemachineCamera` sustituye a `CinemachineVirtualCamera` y a `CinemachineFreeLook` (con Orbital Follow); namespace `Unity.Cinemachine`.']
        },
        en: {
          title: 'Cinemachine 3: Priority, Brain and blends',
          summary: 'With Cinemachine there is a single real camera (with a `CinemachineBrain`) and several `CinemachineCamera`s that propose shots. The Brain follows the active camera with the highest **Priority** and blends when it changes. Raise Combat\'s priority, deactivate cameras and change the Default Blend.',
          points: ['Switch cameras: raise the **Priority** of the other `CinemachineCamera` (or activate it).', 'The `CinemachineBrain` sits on the real camera and applies the **Default Blend** (or Custom Blends).', '`Camera.main` is read-only; virtual cameras do not use `depth`.', 'Cinemachine 3: `CinemachineCamera` replaces `CinemachineVirtualCamera` and `CinemachineFreeLook` (with Orbital Follow); namespace `Unity.Cinemachine`.']
        }
      }
    }
  );
})();
