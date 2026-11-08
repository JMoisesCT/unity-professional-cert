/* Conceptos animados: scene (programación de escenas y entornos) */
(function () {
  'use strict';
  const K = UCP.conceptKit;
  const { colors, el, makeCanvas, loop, controls, button, seg, slider, toggle, readout, roundRect, text, code, codeBlock, drag, arrow, box, lerp, clamp, ease } = K;

  /* ---------------------------------------------------------
     Utilidades privadas
     --------------------------------------------------------- */

  // Recorta un texto con "…" para que quepa en maxW píxeles.
  function fit(ctx, s, maxW, mono) {
    ctx.font = mono ? K.MONO : K.FONT;
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  function tw(ctx, s, mono) { ctx.font = mono ? K.MONO : K.FONT; return ctx.measureText(s).width; }
  // Elige la primera etiqueta (de larga a corta) que cabe.
  function pick(ctx, labels, maxW, mono) {
    for (let i = 0; i < labels.length; i++) if (tw(ctx, labels[i], mono) <= maxW) return labels[i];
    return fit(ctx, labels[labels.length - 1], maxW, mono);
  }
  function panel(ctx, c, x, y, w, h, title) {
    ctx.fillStyle = c.soft; roundRect(ctx, x, y, w, h, 8); ctx.fill();
    if (title) text(ctx, fit(ctx, title, w - 16), x + 8, y + 13, c.muted);
  }
  // Mini jerarquía de Unity: rows = [{ name, depth, tag, color, alpha }]
  function hierarchy(ctx, c, x, y, w, h, title, rows) {
    panel(ctx, c, x, y, w, h, title);
    rows.forEach((r, i) => {
      const ry = y + 34 + i * 20;
      ctx.globalAlpha = r.alpha === undefined ? 1 : r.alpha;
      const ix = x + 10 + (r.depth || 0) * 14;
      const nm = (r.depth ? '└ ' : '') + r.name;
      const tagW = r.tag ? Math.min(tw(ctx, r.tag), w * 0.45) : 0;
      text(ctx, fit(ctx, nm, x + w - ix - tagW - 16), ix, ry, r.color || c.text);
      if (r.tag) text(ctx, fit(ctx, r.tag, w * 0.45), x + w - 8, ry, c.muted, { align: 'right' });
      ctx.globalAlpha = 1;
    });
  }
  function dashed(ctx, on) { ctx.setLineDash(on ? [5, 4] : []); }
  function circle(ctx, x, y, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function ring(ctx, x, y, r, stroke, lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }

  // Pestañas: una barra seg + una fila de controles por pestaña (se muestran/ocultan).
  function tabbed(host, opts, onChange) {
    const bar = controls(host);
    const panes = {};
    opts.forEach((o) => { panes[o.v] = controls(host); });
    const show = (v) => Object.keys(panes).forEach((k) => { panes[k].style.display = k === v ? '' : 'none'; });
    seg(bar, opts, opts[0].v, (v) => { show(v); onChange(v); });
    show(opts[0].v);
    return panes;
  }

  // A* sobre una rejilla (8 vecinos, sin cortar esquinas). Devuelve [{x,y}] o null.
  function gridPath(cols, rows, ok, s, g) {
    const key = (x, y) => y * cols + x;
    const gs = new Map([[key(s.x, s.y), 0]]);
    const from = new Map();
    const open = [{ x: s.x, y: s.y, f: 0 }];
    const closed = new Set();
    while (open.length) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      const k = key(cur.x, cur.y);
      if (closed.has(k)) continue;
      closed.add(k);
      if (cur.x === g.x && cur.y === g.y) {
        const p = [{ x: cur.x, y: cur.y }];
        let kk = k;
        while (from.has(kk)) { kk = from.get(kk); p.unshift({ x: kk % cols, y: Math.floor(kk / cols) }); }
        return p;
      }
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = cur.x + dx, ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || !ok(nx, ny)) continue;
        if (dx && dy && (!ok(cur.x + dx, cur.y) || !ok(cur.x, cur.y + dy))) continue;
        const ng = gs.get(k) + (dx && dy ? Math.SQRT2 : 1);
        const nk = key(nx, ny);
        if (!gs.has(nk) || ng < gs.get(nk)) {
          gs.set(nk, ng); from.set(nk, k);
          open.push({ x: nx, y: ny, f: ng + Math.hypot(g.x - nx, g.y - ny) });
        }
      }
    }
    return null;
  }
  // Punto a distancia d a lo largo de un camino de celdas.
  function along(path, d) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= len) return { x: a.x + (b.x - a.x) * d / len, y: a.y + (b.y - a.y) * d / len, done: false };
      d -= len;
    }
    const e = path[path.length - 1];
    return { x: e.x, y: e.y, done: true };
  }
  function gridGeo(w, h, cols, rows) {
    const cell = Math.floor(Math.min((w - 8) / cols, (h - 8) / rows));
    return { cell, ox: Math.floor((w - cell * cols) / 2), oy: Math.floor((h - cell * rows) / 2) };
  }
  // Agente de NavMesh dibujado como círculo con "ojos".
  function agentDot(ctx, x, y, r, fill) {
    circle(ctx, x, y, r, fill);
    circle(ctx, x - r * 0.35, y - r * 0.15, r * 0.18, '#fff');
    circle(ctx, x + r * 0.35, y - r * 0.15, r * 0.18, '#fff');
  }
  const WATER = (a) => 'rgba(56,189,248,' + a + ')';

  /* ---------------------------------------------------------
     1. AudioSource: Play vs PlayOneShot, y destruir la fuente
     --------------------------------------------------------- */

  function mountAudioSource(host, lang) {
    const L = {
      es: {
        tabA: 'Play vs PlayOneShot', tabB: 'Destruir el objeto', fire: 'Disparar', auto: 'Disparo automático', explode: 'Explotar barril',
        shots: 'disparos', now: 'ahora', voice: 'voz', source: 'AudioSource (un solo clip)', cut: 'cortado',
        scene: 'Escena', hier: 'Hierarchy', boom: 'boom.wav · 1,6 s', played: 'sonado', cutMsg: '✂ cortado a los 0,02 s (de 1,6 s)',
        vPlay: (n) => '✗ ' + code('Play()') + ' reinicia el ' + code('clip') + ' de la fuente: cada disparo <b>corta</b> al anterior. Disparos cortados: <b>' + n + '</b>.',
        vOne: (k) => '✓ ' + code('PlayOneShot(shotClip)') + ' no interrumpe lo que ya suena en la fuente: <b>' + k + '</b> disparo(s) sonando a la vez.',
        listener: 'Solo debe haber <b>un</b> ' + code('AudioListener') + ' activo (normalmente en la cámara).',
        idle: 'El barril va a explotar…',
        vDestroy: '✗ El ' + code('AudioSource') + ' es un componente del barril: al destruir el GameObject, el sonido se corta en el mismo frame.',
        vPoint: (on) => '✓ ' + code('PlayClipAtPoint') + ' crea un objeto temporal <b>One shot audio</b> con su propia fuente' + (on ? ', que sigue sonando aunque el barril ya no exista.' : ' y lo destruye al terminar el clip.'),
        pool: 'En proyectos grandes, un <b>pool</b> de AudioSources evita crear un objeto por cada sonido.',
        cPlay: '// reinicia el clip', cOne: '// se solapan', cDie: '// la fuente muere con él', cOk: '// el objeto temporal sigue'
      },
      en: {
        tabA: 'Play vs PlayOneShot', tabB: 'Destroying the object', fire: 'Fire', auto: 'Auto fire', explode: 'Explode barrel',
        shots: 'shots', now: 'now', voice: 'voice', source: 'AudioSource (one clip)', cut: 'cut',
        scene: 'Scene', hier: 'Hierarchy', boom: 'boom.wav · 1.6 s', played: 'played', cutMsg: '✂ cut off at 0.02 s (of 1.6 s)',
        vPlay: (n) => '✗ ' + code('Play()') + ' restarts the source\'s ' + code('clip') + ': every shot <b>cuts off</b> the previous one. Shots cut off: <b>' + n + '</b>.',
        vOne: (k) => '✓ ' + code('PlayOneShot(shotClip)') + ' does not interrupt what the source is already playing: <b>' + k + '</b> shot(s) sounding at once.',
        listener: 'There should be only <b>one</b> active ' + code('AudioListener') + ' (usually on the camera).',
        idle: 'The barrel is about to explode…',
        vDestroy: '✗ The ' + code('AudioSource') + ' is a component of the barrel: destroying the GameObject cuts the sound in that same frame.',
        vPoint: (on) => '✓ ' + code('PlayClipAtPoint') + ' creates a temporary <b>One shot audio</b> object with its own source' + (on ? ', which keeps playing even though the barrel is gone.' : ' and destroys it when the clip ends.'),
        pool: 'In large projects, a <b>pool</b> of AudioSources avoids creating an object for every sound.',
        cPlay: '// restarts the clip', cOne: '// they overlap', cDie: '// the source dies with it', cOk: '// the temp object lives on'
      }
    }[lang];
    const CLIP = 0.9, WIN = 2.4, RATE = 0.24, BOOM = 1.6, CYCLE = 1 + BOOM + 0.9;
    let tab = 'a', mode = 'play', auto = true, kill = 'destroy';
    let t = 0, acc = 0, voices = [], cuts = 0, cyc = 0;
    const panes = tabbed(host, [{ v: 'a', l: L.tabA }, { v: 'b', l: L.tabB }], (v) => { tab = v; });
    seg(panes.a, [{ v: 'play', l: 'Play()' }, { v: 'one', l: 'PlayOneShot(clip)' }], mode, (v) => { mode = v; voices = []; cuts = 0; });
    button(panes.a, L.fire, fire, true);
    toggle(panes.a, L.auto, auto, (v) => { auto = v; });
    seg(panes.b, [{ v: 'destroy', l: 'Play() + Destroy' }, { v: 'point', l: 'PlayClipAtPoint' }], kill, (v) => { kill = v; cyc = 0; });
    button(panes.b, L.explode, () => { cyc = 0.999; }, true);
    const stage = makeCanvas(host, (w) => (w < 520 ? 300 : 240));
    const src = codeBlock(host);
    const out = readout(host);

    function fire() {
      if (mode === 'play') {
        voices.forEach((v) => { if (v.cut === null && t < v.t0 + CLIP) { v.cut = t; cuts++; } });
        voices.push({ t0: t, cut: null, lane: 0 });
      } else {
        const ends = [0, 1, 2, 3].map((l) => Math.max.apply(null, [-1].concat(voices.filter((v) => v.lane === l).map((v) => v.t0 + CLIP))));
        let lane = ends.findIndex((e) => e <= t);
        if (lane < 0) lane = ends.indexOf(Math.min.apply(null, ends));
        voices.push({ t0: t, cut: null, lane });
      }
    }

    function drawShots(ctx, c, w, h) {
      const lanes = mode === 'play' ? 1 : 4;
      const top = 30, lh = (h - top - 8) / lanes, lx = 10, lw = w - 20;
      const X = (tt) => lx + lw - ((t - tt) / WIN) * lw;
      text(ctx, '▼ ' + L.shots, lx, 12, c.warn);
      text(ctx, L.now, lx + lw, 12, c.muted, { align: 'right' });
      voices.forEach((v) => { if (X(v.t0) > lx) { ctx.fillStyle = c.warn; ctx.fillRect(X(v.t0) - 1, 20, 2, 7); } });
      for (let l = 0; l < lanes; l++) {
        const ly = top + l * lh;
        ctx.fillStyle = c.soft; roundRect(ctx, lx, ly + 2, lw, lh - 4, 6); ctx.fill();
        text(ctx, mode === 'play' ? L.source : L.voice + ' ' + (l + 1), lx + 8, ly + 13, c.muted);
        ctx.save(); roundRect(ctx, lx, ly + 2, lw, lh - 4, 6); ctx.clip();
        const mid = ly + lh / 2 + 4, amp = (lh - 22) / 2;
        const cutList = voices.filter((v) => v.cut !== null);
        const lastCut = cutList[cutList.length - 1];
        voices.filter((v) => v.lane === l).forEach((v) => {
          const end = Math.min(v.cut === null ? Infinity : v.cut, v.t0 + CLIP, t);
          const xa = Math.max(lx, X(v.t0)), xb = X(end);
          const live = v.cut === null && t < v.t0 + CLIP;
          ctx.strokeStyle = live ? c.accent : c.muted; ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let px = xa; px <= xb; px += 2) {
            const tau = t - ((lx + lw - px) / lw) * WIN - v.t0;
            const a = Math.exp(-tau * 3.2) * (0.35 + 0.65 * Math.abs(Math.sin(tau * 90))) * amp;
            ctx.moveTo(px, mid - a); ctx.lineTo(px, mid + a);
          }
          ctx.stroke();
          if (v.cut !== null && X(v.cut) > lx) {
            ctx.fillStyle = c.bad; ctx.fillRect(X(v.cut) - 1, mid - amp, 2.5, amp * 2);
            if (lanes === 1 && v === lastCut && t - v.cut < 0.6) text(ctx, '✂ ' + L.cut, X(v.cut) - 4, ly + 13, c.bad, { align: 'right' });
          }
        });
        ctx.restore();
      }
    }

    function drawBoom(ctx, c, w, h) {
      const e = cyc - 1;
      const narrow = w < 520;
      const sc = narrow ? { x: 8, y: 6, w: w - 16, h: 120 } : { x: 8, y: 8, w: w * 0.55 - 12, h: 150 };
      const hr = narrow ? { x: 8, y: 132, w: w - 16, h: 92 } : { x: w * 0.55 + 4, y: 8, w: w * 0.45 - 12, h: 150 };
      const sb = narrow ? { x: 8, y: 236, w: w - 16 } : { x: 8, y: 174, w: w - 16 };
      // Escena
      panel(ctx, c, sc.x, sc.y, sc.w, sc.h, L.scene);
      const gy = sc.y + sc.h - 22;
      ctx.fillStyle = c.border; ctx.fillRect(sc.x + 8, gy, sc.w - 16, 3);
      // Cámara con AudioListener
      const cx = sc.x + 30;
      ctx.fillStyle = c.text; roundRect(ctx, cx - 14, gy - 34, 22, 16, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 8, gy - 26); ctx.lineTo(cx + 16, gy - 32); ctx.lineTo(cx + 16, gy - 20); ctx.closePath(); ctx.fill();
      text(ctx, 'Listener', cx, gy + 12, c.muted, { align: 'center' });
      const bx = sc.x + sc.w * 0.66;
      if (e < 0) {
        ctx.fillStyle = '#b45309'; roundRect(ctx, bx - 14, gy - 38, 28, 38, 5); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(bx - 14, gy - 28, 28, 3); ctx.fillRect(bx - 14, gy - 12, 28, 3);
        text(ctx, 'Barrel', bx, gy + 12, c.muted, { align: 'center' });
      } else {
        if (e < 0.6) {
          const r = 10 + e * 70;
          ctx.globalAlpha = 1 - e / 0.6;
          circle(ctx, bx, gy - 18, r, c.warn); circle(ctx, bx, gy - 18, r * 0.55, c.bad);
          ctx.globalAlpha = 1;
        }
        const sounding = kill === 'point' ? e < BOOM : e < 0.02;
        if (kill === 'point' && e < BOOM) {
          circle(ctx, bx, gy - 18, 6, c.ok);
          text(ctx, 'One shot audio', bx, gy + 12, c.ok, { align: 'center' });
        }
        if (sounding || (kill === 'destroy' && e < 0.25)) {
          for (let k = 0; k < 3; k++) {
            const ph = ((t * 1.6 + k / 3) % 1);
            ctx.globalAlpha = kill === 'destroy' ? Math.max(0, 1 - e * 4) * (1 - ph) : 1 - ph;
            ring(ctx, bx, gy - 18, 8 + ph * 40, c.ok, 2);
          }
          ctx.globalAlpha = 1;
        }
      }
      // Jerarquía
      const rows = [{ name: 'Main Camera', tag: 'AudioListener' }];
      if (e < 0) rows.push({ name: 'Barrel', tag: 'AudioSource' });
      else if (kill === 'destroy' && e < 0.8) rows.push({ name: 'Barrel', tag: 'Destroy()', color: c.bad, alpha: 1 - e / 0.8 });
      if (kill === 'point' && e >= 0 && e < BOOM) rows.push({ name: 'One shot audio', tag: 'AudioSource', color: c.ok });
      hierarchy(ctx, c, hr.x, hr.y, hr.w, hr.h, L.hier, rows);
      // Barra de reproducción del clip
      text(ctx, L.boom, sb.x, sb.y + 6, c.muted);
      const bw = sb.w, by = sb.y + 16;
      ctx.fillStyle = c.soft; roundRect(ctx, sb.x, by, bw, 14, 7); ctx.fill();
      const played = e < 0 ? 0 : (kill === 'point' ? Math.min(e, BOOM) : Math.min(e, 0.02));
      ctx.fillStyle = kill === 'point' ? c.ok : c.accent;
      roundRect(ctx, sb.x, by, Math.max(played > 0 ? 6 : 0, bw * played / BOOM), 14, 7); ctx.fill();
      if (kill === 'destroy' && e > 0.02) {
        ctx.fillStyle = c.bad; ctx.fillRect(sb.x + 6, by - 3, 2.5, 20);
        text(ctx, fit(ctx, L.cutMsg, bw - 14), sb.x + 14, by + 30, c.bad);
      } else if (e >= 0) {
        text(ctx, L.played + ': ' + played.toFixed(1).replace('.', lang === 'es' ? ',' : '.') + ' s', sb.x, by + 30, c.muted);
      }
    }

    const stop = loop((dt) => {
      t += dt;
      if (tab === 'a' && auto) { acc += dt; while (acc >= RATE) { acc -= RATE; fire(); } }
      voices = voices.filter((v) => v.t0 + CLIP > t - WIN);
      cyc += dt; if (cyc > CYCLE) cyc = 0;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'a') {
        drawShots(ctx, c, w, h);
        const live = voices.filter((v) => v.cut === null && t >= v.t0 && t < v.t0 + CLIP).length;
        src('void Fire() {\n    audioSource.Play();               ' + L.cPlay + '\n    audioSource.PlayOneShot(shotClip); ' + L.cOne + '\n}',
          mode === 'play' ? { 1: 'bad', 2: 'off' } : { 1: 'off', 2: 'ok' });
        out((mode === 'play' ? L.vPlay(cuts) : L.vOne(live)) + '<p>' + L.listener + '</p>');
      } else {
        drawBoom(ctx, c, w, h);
        const e = cyc - 1;
        src(kill === 'destroy'
          ? 'void Explode() {\n    audioSource.Play();\n    Destroy(gameObject); ' + L.cDie + '\n}'
          : 'void Explode() {\n    AudioSource.PlayClipAtPoint(boomClip, transform.position);\n    Destroy(gameObject); ' + L.cOk + '\n}',
        kill === 'destroy' ? { 1: 'hl', 2: 'bad' } : { 1: 'ok', 2: 'hl' });
        out(e < 0 ? L.idle + (kill === 'point' ? '<p>' + L.pool + '</p>' : '')
          : (kill === 'destroy' ? L.vDestroy : L.vPoint(e < BOOM) + '<p>' + L.pool + '</p>'));
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     2. Spatial Blend: 2D vs 3D, rolloff y paneo
     --------------------------------------------------------- */

  function mountSpatialBlend(host, lang) {
    const L = {
      es: { blend: 'Spatial Blend', max: 'Max Distance', auto: 'Paseo automático', fall: 'Cascada', vol: 'volumen', dist: 'distancia', drag: 'Arrastra al jugador (AudioListener) por el mapa.',
        left: 'izquierda', right: 'derecha', center: 'centro', pan: 'paneo',
        v0: 'Con <b>0 (2D)</b> el volumen no depende de la distancia ni de la dirección: se oye igual en toda la escena.',
        v1: '✓ Con <b>1 (3D)</b> el sonido se atenúa con la distancia al ' + code('AudioListener') + ' (rolloff logarítmico entre Min y Max Distance) y se panea según la dirección.',
        vm: 'Los valores intermedios mezclan la parte 2D (constante) y la 3D (con distancia).' },
      en: { blend: 'Spatial Blend', max: 'Max Distance', auto: 'Auto walk', fall: 'Waterfall', vol: 'volume', dist: 'distance', drag: 'Drag the player (AudioListener) around the map.',
        left: 'left', right: 'right', center: 'center', pan: 'pan',
        v0: 'At <b>0 (2D)</b> the volume does not depend on distance or direction: it sounds the same everywhere in the scene.',
        v1: '✓ At <b>1 (3D)</b> the sound fades with distance to the ' + code('AudioListener') + ' (logarithmic rolloff between Min and Max Distance) and is panned by direction.',
        vm: 'Values in between mix the 2D part (constant) and the 3D part (distance-based).' }
    }[lang];
    const WW = 24, WH = 14, SRC = { x: 6, y: 7 }, MIN = 1.5, GX = 26;
    let blend = 0, maxD = 14, auto = true, t = 0;
    const lis = { x: 17, y: 7 };
    const ctl = controls(host);
    slider(ctl, L.blend, 0, 1, 0.05, blend, (v) => { blend = v; }, (v) => v.toFixed(2) + (v === 0 ? ' (2D)' : v === 1 ? ' (3D)' : ''));
    slider(ctl, L.max, 6, 22, 1, maxD, (v) => { maxD = v; });
    const autoIn = toggle(ctl, L.auto, auto, (v) => { auto = v; });
    const stage = makeCanvas(host, (w) => (w < 560 ? Math.round((w - 16) * WH / WW) + 196 : 280));
    const src = codeBlock(host);
    const out = readout(host);
    let geo = { x: 8, y: 8, s: 10 };
    const toWorld = (px, py) => ({ x: clamp((px - geo.x) / geo.s, 0.3, WW - 0.3), y: clamp((py - geo.y) / geo.s, 0.3, WH - 0.3) });
    function grab(px, py) {
      if (px > geo.x + WW * geo.s + 6 || py > geo.y + WH * geo.s + 6) return;
      const p = toWorld(px, py); lis.x = p.x; lis.y = p.y;
      if (auto) { auto = false; autoIn.checked = false; }
    }
    drag(stage, { down: grab, move: grab });
    const v3 = (d) => MIN / clamp(d, MIN, maxD);
    const volAt = (d) => (1 - blend) + blend * v3(d);

    const stop = loop((dt) => {
      t += dt;
      if (auto) { lis.x = 13 + 9 * Math.cos(t * 0.33); lis.y = 7 + 4.6 * Math.sin(t * 0.66); }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const s = narrow ? (w - 16) / WW : Math.min((w * 0.56 - 16) / WW, (h - 16) / WH);
      geo = { x: 8, y: 8, s };
      const mw = WW * s, mh = WH * s;
      const gr = narrow ? { x: 8, y: mh + 18, w: w - 16, h: h - mh - 26 } : { x: mw + 24, y: 8, w: w - mw - 32, h: h - 16 };
      const P = (p) => [geo.x + p.x * s, geo.y + p.y * s];
      // Mapa con "mapa de calor" del volumen
      ctx.save();
      roundRect(ctx, geo.x, geo.y, mw, mh, 8); ctx.clip();
      ctx.fillStyle = c.soft; ctx.fillRect(geo.x, geo.y, mw, mh);
      const [sx, sy] = P(SRC);
      const R = (WW + WH) * s;
      const gd = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
      for (let i = 0; i <= 20; i++) gd.addColorStop(i / 20, WATER((0.4 * volAt((i / 20) * (WW + WH))).toFixed(3)));
      ctx.fillStyle = gd; ctx.fillRect(geo.x, geo.y, mw, mh);
      dashed(ctx, true);
      ring(ctx, sx, sy, MIN * s, c.muted, 1.5);
      ring(ctx, sx, sy, maxD * s, blend > 0 ? c.accent : c.muted, 1.5);
      dashed(ctx, false);
      text(ctx, 'Max', sx + maxD * s * 0.707 + 4, sy - maxD * s * 0.707, blend > 0 ? c.accent : c.muted);
      ctx.restore();
      // Cascada
      ctx.fillStyle = WATER(0.9); roundRect(ctx, sx - 9, sy - 16, 18, 32, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const yy = sy - 14 + ((t * 30 + k * 10) % 28); ctx.beginPath(); ctx.moveTo(sx - 5 + k * 5, yy); ctx.lineTo(sx - 5 + k * 5, yy + 5); ctx.stroke(); }
      text(ctx, L.fall, sx, sy + 26, c.text, { align: 'center' });
      // Ondas de sonido
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.5 + k / 3) % 1;
        const r = 12 + ph * Math.min(maxD, 18) * s;
        ctx.globalAlpha = (1 - ph) * (0.25 + 0.6 * volAt(r / s));
        ring(ctx, sx, sy, r, WATER(1), 1.5);
      }
      ctx.globalAlpha = 1;
      // Jugador / AudioListener (mira hacia arriba)
      const [lx, ly] = P(lis);
      const d = Math.hypot(lis.x - SRC.x, lis.y - SRC.y);
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1; dashed(ctx, true);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lx, ly); ctx.stroke(); dashed(ctx, false);
      const pan3 = d > 0.01 ? (SRC.x - lis.x) / d : 0;
      const pan = blend * pan3;
      const vol = volAt(d);
      const gL = vol * Math.min(1, 1 - pan), gR = vol * Math.min(1, 1 + pan);
      circle(ctx, lx - 11, ly, 4, c.accent); circle(ctx, lx + 11, ly, 4, c.accent);
      circle(ctx, lx, ly, 9, c.accent);
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(lx - 5, ly - 7); ctx.lineTo(lx, ly - 15); ctx.lineTo(lx + 5, ly - 7); ctx.fill();
      text(ctx, 'd = ' + d.toFixed(1), lx, ly + 20, c.text, { align: 'center', mono: true });
      // Gráfica volumen / distancia
      panel(ctx, c, gr.x, gr.y, gr.w, gr.h, '');
      const meterH = 44;
      const ax = gr.x + 12, aw = gr.w - 24, ay = gr.y + 22, ah = gr.h - meterH - 58;
      const GXp = (dd) => ax + (dd / GX) * aw, GYp = (v) => ay + ah - v * ah;
      text(ctx, L.vol, ax, gr.y + 11, c.muted);
      text(ctx, L.dist + ' →', ax + aw, ay + ah + 25, c.muted, { align: 'right' });
      ctx.strokeStyle = c.border; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + ah); ctx.lineTo(ax + aw, ay + ah); ctx.stroke();
      dashed(ctx, true);
      [[MIN, 'Min'], [maxD, 'Max']].forEach((m) => {
        ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(GXp(m[0]), ay); ctx.lineTo(GXp(m[0]), ay + ah); ctx.stroke();
        text(ctx, m[1], GXp(m[0]), ay + ah + 10, c.muted, { align: 'center' });
      });
      dashed(ctx, false);
      const curve = (fn, color, lw) => {
        ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
        for (let i = 0; i <= 80; i++) { const dd = (i / 80) * GX; const X = GXp(dd), Y = GYp(fn(dd)); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
        ctx.stroke();
      };
      curve(() => 1, c.border, 1.5);
      curve(v3, c.border, 1.5);
      text(ctx, '2D', ax + aw, GYp(1) - 8, c.muted, { align: 'right' });
      text(ctx, '3D', ax + aw, GYp(v3(GX)) - 8, c.muted, { align: 'right' });
      curve(volAt, c.accent, 3);
      const dx = GXp(Math.min(d, GX)), dy = GYp(vol);
      ring(ctx, dx, dy, 7 + Math.sin(t * 6) * 1.5, c.accent, 2);
      circle(ctx, dx, dy, 4, c.accent);
      // Medidores L/R
      const my = gr.y + gr.h - meterH;
      [['L', gL], ['R', gR]].forEach((m, i) => {
        const yy = my + i * 20;
        text(ctx, m[0], ax, yy + 6, c.text);
        ctx.fillStyle = c.bg; roundRect(ctx, ax + 16, yy, aw - 60, 12, 6); ctx.fill();
        ctx.fillStyle = c.ok; roundRect(ctx, ax + 16, yy, Math.max(4, (aw - 60) * m[1]), 12, 6); ctx.fill();
        text(ctx, Math.round(m[1] * 100) + '%', ax + aw, yy + 6, c.text, { align: 'right', mono: true });
      });
      const side = Math.abs(pan) < 0.15 ? L.center : (pan > 0 ? L.right : L.left);
      src('waterfall.spatialBlend = ' + blend.toFixed(2) + 'f;   // 0 = 2D, 1 = 3D\nwaterfall.rolloffMode = AudioRolloffMode.Logarithmic;\nwaterfall.minDistance = 1.5f;\nwaterfall.maxDistance = ' + maxD + 'f;',
        { 0: blend === 1 ? 'ok' : 'hl' });
      out(L.drag + '<p>' + code('spatialBlend = ' + blend.toFixed(2)) + ' · d = <b>' + d.toFixed(1) + '</b> · ' + L.vol + ' <b>' + Math.round(vol * 100) + '%</b> · ' + L.pan + ': <b>' + side + '</b></p><p>' +
        (blend === 0 ? L.v0 : blend === 1 ? L.v1 : L.vm) + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     3. Destroy al final del frame y el "falso null"
     --------------------------------------------------------- */

  function mountDestroyNull(host, lang) {
    const L = {
      es: {
        tabA: 'Destroy en el frame', tabB: '«Falso null»: ?. y ??', replay: 'Repetir', destroy: 'Destroy(target)', reset: 'Reiniciar',
        upd: ['Update', 'Upd'], late: ['LateUpdate', 'Late'], kill: ['Destrucción', 'Destr.', 'D'], rend: ['Render', 'Rend'],
        scene: 'Escena', console: 'Console', frame: 'Frame',
        vA: '<b>False</b> en el frame N: ' + code('Destroy') + ' solo <b>marca</b> el objeto; se destruye al final del frame, después del bucle de Update y antes de renderizar. En el frame siguiente, ' + code('enemy == null') + ' ya es <b>True</b>.',
        vI: code('DestroyImmediate') + ' destruye en el acto (por eso imprime <b>True</b>), pero se recomienda solo en código de <b>Editor</b>.',
        wrap: 'C# (gestionado)', native: 'Nativo (C++)', vari: 'target', gone: 'destruido', fb: 'fallback',
        alive: 'Antes de destruir, las cuatro comprobaciones se comportan igual. Pulsa ' + code('Destroy(target)') + '.',
        dead: 'El objeto nativo ya no existe, pero el objeto C# sigue vivo mientras alguien lo referencie. Unity sobrecarga ' + code('==') + ' (y la conversión a bool) para que se compare como <b>null</b>.',
        ex: {
          eq: '✓ ' + code('target == null') + ' usa la sobrecarga de Unity: devuelve <b>true</b>.',
          bool: '✓ ' + code('if (target)') + ' también usa la comprobación de Unity: es <b>false</b>.',
          cond: '✗ ' + code('?.') + ' solo mira la referencia C# (no es null) y llama a ' + code('TakeDamage') + ' sobre un objeto destruido → <b>MissingReferenceException</b> en cuanto toca el objeto nativo.',
          coal: '✗ ' + code('??') + ' solo mira la referencia C#: devuelve el objeto <b>destruido</b> en lugar de ' + code('fallback') + '.'
        },
        cmt: ['// usa el == de Unity', '// también', '// ✗ no usa la sobrecarga', '// ✗ devuelve el destruido']
      },
      en: {
        tabA: 'Destroy within the frame', tabB: '“Fake null”: ?. and ??', replay: 'Replay', destroy: 'Destroy(target)', reset: 'Reset',
        upd: ['Update', 'Upd'], late: ['LateUpdate', 'Late'], kill: ['Destruction', 'Destr.', 'D'], rend: ['Render', 'Rend'],
        scene: 'Scene', console: 'Console', frame: 'Frame',
        vA: '<b>False</b> in frame N: ' + code('Destroy') + ' only <b>marks</b> the object; it is destroyed at the end of the frame, after the Update loop and before rendering. In the next frame, ' + code('enemy == null') + ' is <b>True</b>.',
        vI: code('DestroyImmediate') + ' destroys right away (so it prints <b>True</b>), but it is only recommended in <b>Editor</b> code.',
        wrap: 'C# (managed)', native: 'Native (C++)', vari: 'target', gone: 'destroyed', fb: 'fallback',
        alive: 'Before destroying, all four checks behave the same. Press ' + code('Destroy(target)') + '.',
        dead: 'The native object is gone, but the C# object lives on while something references it. Unity overloads ' + code('==') + ' (and the bool conversion) so it compares as <b>null</b>.',
        ex: {
          eq: '✓ ' + code('target == null') + ' uses Unity\'s overload: it returns <b>true</b>.',
          bool: '✓ ' + code('if (target)') + ' also uses Unity\'s check: it is <b>false</b>.',
          cond: '✗ ' + code('?.') + ' only checks the C# reference (not null) and calls ' + code('TakeDamage') + ' on a destroyed object → <b>MissingReferenceException</b> as soon as it touches the native object.',
          coal: '✗ ' + code('??') + ' only checks the C# reference: it returns the <b>destroyed</b> object instead of ' + code('fallback') + '.'
        },
        cmt: ['// uses Unity\'s ==', '// so does this', '// ✗ skips the overload', '// ✗ returns the destroyed one']
      }
    }[lang];
    const FR = 2.4, CYCLE = FR * 2 + 1.2;
    let tab = 'a', imm = false, tau = 0;
    let destroyed = false, dAt = -9, sel = 'cond', t = 0;
    const panes = tabbed(host, [{ v: 'a', l: L.tabA }, { v: 'b', l: L.tabB }], (v) => { tab = v; });
    seg(panes.a, [{ v: false, l: 'Destroy(enemy)' }, { v: true, l: 'DestroyImmediate(enemy)' }], false, (v) => { imm = v; tau = 0; });
    button(panes.a, L.replay, () => { tau = 0; }, true);
    seg(panes.b, [{ v: 'eq', l: '==' }, { v: 'bool', l: 'if (target)' }, { v: 'cond', l: '?.' }, { v: 'coal', l: '??' }], sel, (v) => { sel = v; });
    button(panes.b, L.destroy, () => { if (!destroyed) { destroyed = true; dAt = t; } }, true);
    button(panes.b, L.reset, () => { destroyed = false; });
    const stage = makeCanvas(host, (w) => (w < 520 ? 250 : 220));
    const src = codeBlock(host);
    const out = readout(host);
    // Fracciones de cada fase dentro del frame
    const SEGS = [['upd', 0.4], ['late', 0.18], ['kill', 0.18], ['rend', 0.24]];
    const EV = { call: 0.12, log: 0.28, kill: 0.6, log2: 0.2 };

    function drawFrames(ctx, c, w, h) {
      const f = tau / FR; // 0..2 (+ pausa)
      const cur = Math.min(2, f);
      const bx = 8, bw = w - 16;
      [0, 1].forEach((row) => {
        const y = 8 + row * 52;
        text(ctx, L.frame + (row ? ' N+1' : ' N'), bx, y + 6, cur >= row && cur < row + 1 ? c.accent : c.muted);
        let x = bx;
        SEGS.forEach((sg) => {
          const sw = bw * sg[1];
          const killSeg = sg[0] === 'kill';
          ctx.fillStyle = killSeg ? (row === 0 && !imm ? c.badSoft : c.soft) : c.soft;
          roundRect(ctx, x + 1, y + 16, sw - 2, 26, 5); ctx.fill();
          text(ctx, pick(ctx, L[sg[0]], sw - 8), x + sw / 2, y + 29, killSeg && row === 0 && !imm ? c.bad : c.text, { align: 'center' });
          x += sw;
        });
        if (cur >= row && cur <= row + 1 && f < 2) {
          const px = bx + bw * (cur - row);
          ctx.fillStyle = c.accent; ctx.fillRect(px - 1.5, y + 12, 3, 34);
        }
      });
      const p0 = f, p1 = f - 1;
      const gone = imm ? p0 >= EV.call : p0 >= EV.kill;
      const logs = [];
      if (p0 >= EV.log) logs.push(['[' + L.frame + ' N]   ', imm ? 'True' : 'False', imm ? c.ok : c.bad]);
      if (p1 >= EV.log2) logs.push(['[' + L.frame + ' N+1] ', 'True', c.ok]);
      const yb = 118, hb = h - yb - 8;
      const narrow = w < 520;
      const sw = narrow ? Math.min(96, w * 0.3) : 150;
      panel(ctx, c, 8, yb, sw, hb, L.scene);
      const ex = 8 + sw / 2, ey = yb + hb / 2 + 8;
      const k = imm ? p0 - EV.call : p0 - EV.kill;
      if (!gone || k < 0.15) {
        const sc = gone ? 1 - k / 0.15 : 1;
        ctx.globalAlpha = Math.max(0, sc);
        ctx.fillStyle = '#ef4444'; roundRect(ctx, ex - 16 * sc, ey - 16 * sc, 32 * sc, 32 * sc, 6); ctx.fill();
        circle(ctx, ex - 6 * sc, ey - 3 * sc, 3.5 * sc, '#fff'); circle(ctx, ex + 6 * sc, ey - 3 * sc, 3.5 * sc, '#fff');
        ctx.globalAlpha = 1;
        if (!gone && p0 >= EV.call && p0 < 2) text(ctx, 'Destroy…', ex, ey + 28, c.bad, { align: 'center' });
      } else text(ctx, '—', ex, ey, c.muted, { align: 'center' });
      const cx = 16 + sw, cw = w - cx - 8;
      panel(ctx, c, cx, yb, cw, hb, L.console);
      logs.forEach((lg, i) => {
        const y = yb + 34 + i * 22;
        const pre = fit(ctx, lg[0], cw - 60, true);
        text(ctx, pre, cx + 8, y, c.text, { mono: true });
        text(ctx, lg[1], cx + 8 + tw(ctx, pre, true), y, lg[2], { mono: true });
      });
      // Línea activa del código
      let line = -1;
      if (p0 >= 0 && p0 < EV.call + 0.08) line = 2;
      else if (p0 < EV.log + 0.1) line = 3;
      else if (p0 >= 1 && p1 < EV.log2 + 0.2) line = 6;
      const m = {}; if (line >= 0) m[line] = 'hl';
      if (p0 >= EV.log && line === 3) m[3] = imm ? 'ok' : 'bad';
      src('// Frame N\nvoid Update() {\n    ' + (imm ? 'DestroyImmediate(enemy);' : 'Destroy(enemy);') + '\n    Debug.Log(enemy == null);   // ' + (imm ? 'True' : 'False') + '\n}\n// Frame N+1\nDebug.Log(enemy == null);       // True', m);
      out(imm ? L.vI : L.vA);
    }

    function drawFake(ctx, c, w, h) {
      const narrow = w < 520;
      const bw = narrow ? (w - 40) / 3 : Math.min(190, (w - 80) / 3);
      const gap = narrow ? 12 : (w - 16 - bw * 3) / 2;
      const y0 = 30, bh = 46;
      const xs = [8, 8 + bw + gap, 8 + 2 * (bw + gap)];
      // Variable, wrapper C#, objeto nativo
      box(ctx, xs[0], y0, bw, bh, '', c.soft, c.text, { stroke: c.border });
      text(ctx, pick(ctx, ['Enemy target', 'target'], bw - 12, true), xs[0] + bw / 2, y0 + bh / 2, c.text, { align: 'center', mono: true });
      box(ctx, xs[1], y0, bw, bh, '', c.accentSoft, c.text, { stroke: c.accent });
      text(ctx, pick(ctx, [L.wrap, 'C#'], bw - 12), xs[1] + bw / 2, y0 + bh / 2, c.text, { align: 'center' });
      const dead = destroyed && t - dAt > 0.3;
      if (dead) { dashed(ctx, true); ctx.strokeStyle = c.bad; ctx.lineWidth = 1.5; roundRect(ctx, xs[2], y0, bw, bh, 8); ctx.stroke(); dashed(ctx, false); }
      else box(ctx, xs[2], y0, bw, bh, '', c.okSoft, c.text, { stroke: c.ok });
      text(ctx, dead ? pick(ctx, ['✗ ' + L.gone, '✗'], bw - 12) : pick(ctx, [L.native, 'C++'], bw - 12), xs[2] + bw / 2, y0 + bh / 2, dead ? c.bad : c.text, { align: 'center' });
      if (dead) text(ctx, pick(ctx, [L.native, 'C++'], bw), xs[2] + bw / 2, y0 + bh + 10, c.muted, { align: 'center' });
      arrow(ctx, xs[0] + bw, y0 + bh / 2, xs[1] - 2, y0 + bh / 2, c.text, 2);
      if (dead) { dashed(ctx, true); ctx.strokeStyle = c.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xs[1] + bw, y0 + bh / 2); ctx.lineTo(xs[2], y0 + bh / 2); ctx.stroke(); dashed(ctx, false); }
      else arrow(ctx, xs[1] + bw, y0 + bh / 2, xs[2] - 2, y0 + bh / 2, c.ok, 2);
      // Sonda: recorre el camino que hace la comprobación
      const stopAtWrapper = sel === 'coal';
      const pts = [[xs[0] + bw / 2, y0 + bh / 2], [xs[1] + bw / 2, y0 + bh / 2]];
      if (!stopAtWrapper) pts.push([xs[2] + bw / 2, y0 + bh / 2]);
      const ph = (t % 1.8) / 1.8;
      const segN = pts.length - 1, sp = Math.min(1, ph * 1.4) * segN;
      const si = Math.min(segN - 1, Math.floor(sp)), sf = sp - si;
      const px = lerp(pts[si][0], pts[si + 1][0], sf), py = y0 - 13;
      const boom = sel === 'cond' && dead && sp >= segN;
      circle(ctx, px, py, 5, boom ? c.bad : c.warn);
      if (boom) text(ctx, fit(ctx, 'MissingReferenceException', px - 16), px - 10, py, c.bad, { align: 'right' });
      // Filas de comprobaciones
      const rows = [
        ['eq', 'target == null', dead ? 'true ✓' : 'false', dead ? c.ok : c.text],
        ['bool', 'if (target)', dead ? 'false ✓' : 'true', dead ? c.ok : c.text],
        ['cond', 'target?.TakeDamage()', dead ? 'Exception ✗' : 'OK', dead ? c.bad : c.text],
        ['coal', 'target ?? fallback', dead ? 'target ✗' : 'target', dead ? c.bad : c.text]
      ];
      const ry0 = y0 + bh + 26, rh = Math.min(30, (h - ry0 - 6) / 4);
      rows.forEach((r, i) => {
        const y = ry0 + i * rh;
        const on = r[0] === sel;
        ctx.fillStyle = on ? c.accentSoft : c.soft; roundRect(ctx, 8, y, w - 16, rh - 4, 6); ctx.fill();
        if (on) { ctx.fillStyle = c.accent; ctx.fillRect(8, y, 3, rh - 4); }
        const resW = tw(ctx, r[2], true) + 12;
        text(ctx, fit(ctx, r[1], w - 40 - resW, true), 18, y + (rh - 4) / 2, c.text, { mono: true });
        text(ctx, r[2], w - 16, y + (rh - 4) / 2, r[3], { mono: true, align: 'right' });
      });
      const idx = { eq: 1, bool: 2, cond: 3, coal: 4 }[sel];
      const m = { 0: destroyed ? 'hl' : 'off' }; m[idx] = dead ? ((sel === 'eq' || sel === 'bool') ? 'ok' : 'bad') : 'hl';
      src('Destroy(target);\nif (target != null) target.TakeDamage(10); ' + L.cmt[0] + '\nif (target) target.TakeDamage(10);         ' + L.cmt[1] + '\ntarget?.TakeDamage(10);                    ' + L.cmt[2] + '\nvar t = target ?? fallback;                ' + L.cmt[3], m);
      out(dead ? L.dead + '<p>' + L.ex[sel] + '</p>' : L.alive);
    }

    const stop = loop((dt) => {
      t += dt;
      tau += dt; if (tau > CYCLE) tau = 0;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'a') drawFrames(ctx, c, w, h); else drawFake(ctx, c, w, h);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     4. Instantiate con padre: qué sobrecarga usar
     --------------------------------------------------------- */

  function mountInstantiateParent(host, lang) {
    const L = {
      es: { move: 'Mover el contenedor', again: 'Instanciar otra vez', hier: 'Hierarchy', prefab: 'prefab (2, 1)', spawn: 'spawnPoint',
        child: 'hijo de Enemies', root: 'en la raíz', atSpawn: 'en spawnPoint', notSpawn: 'fuera de spawnPoint', local: 'local', world: 'mundo',
        why: {
          a: 'Usa la posición guardada en el prefab (2, 1) en coordenadas del <b>mundo</b> y lo deja en la <b>raíz</b> de la escena.',
          b: 'Lo hace hijo, pero interpreta la posición del prefab (2, 1) como <b>local</b> al padre: acaba girado y desplazado con el contenedor.',
          c: 'Con ' + code('worldPositionStays = true') + ' conserva la posición del prefab en el mundo (2, 1) y lo hace hijo, pero no lo pone en el spawnPoint.',
          d: '✓ Posición y rotación exactas del <b>mundo</b> y, en el mismo paso, hijo de ' + code('parent') + '. Es lo que pide la pregunta.',
          e: 'Funciona, pero en <b>dos pasos</b>: primero se crea en la raíz y luego ' + code('SetParent') + ' recalcula la transformación y mueve el objeto en la jerarquía (trabajo extra). Mejor pasar el padre a ' + code('Instantiate') + '.'
        },
        movedHint: 'Al mover el contenedor, sus hijos lo siguen; los objetos de la raíz no.' },
      en: { move: 'Move the container', again: 'Instantiate again', hier: 'Hierarchy', prefab: 'prefab (2, 1)', spawn: 'spawnPoint',
        child: 'child of Enemies', root: 'at the root', atSpawn: 'at spawnPoint', notSpawn: 'not at spawnPoint', local: 'local', world: 'world',
        why: {
          a: 'Uses the position saved in the prefab (2, 1) in <b>world</b> space and leaves it at the scene <b>root</b>.',
          b: 'Makes it a child, but treats the prefab position (2, 1) as <b>local</b> to the parent: it ends up rotated and offset with the container.',
          c: 'With ' + code('worldPositionStays = true') + ' it keeps the prefab\'s world position (2, 1) and becomes a child, but it is not at the spawnPoint.',
          d: '✓ Exact <b>world</b> position and rotation and, in the same step, a child of ' + code('parent') + '. This is what the question asks for.',
          e: 'It works, but in <b>two steps</b>: it is created at the root and then ' + code('SetParent') + ' recalculates the transform and moves the object in the hierarchy (extra work). Better to pass the parent to ' + code('Instantiate') + '.'
        },
        movedHint: 'When you move the container, its children follow; root objects do not.' }
    }[lang];
    const XMIN = -1, XMAX = 9, YMIN = -1, YMAX = 6;
    const PRE = { x: 2, y: 1, r: 0 }, SPAWN = { x: 2, y: 4.2, r: -20 };
    const POSES = [{ x: 5.2, y: 1.2, r: 25 }, { x: 4.6, y: 2, r: -15 }, { x: 5.6, y: 0.8, r: 45 }];
    const OPTS = [
      { v: 'a', l: '(prefab)' }, { v: 'b', l: '(prefab, parent)' }, { v: 'c', l: '(prefab, parent, true)' },
      { v: 'd', l: '(prefab, pos, rot, parent)' }, { v: 'e', l: '+ SetParent' }
    ];
    let mode = 'd', poseI = 0, poseT = 1, from = POSES[0], inst = null, t = 0;
    const rad = (a) => a * Math.PI / 180;
    const parent = () => { const a = from, b = POSES[poseI], k = ease(poseT); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), r: lerp(a.r, b.r, k) }; };
    const toWorld = (p, l) => { const cs = Math.cos(rad(p.r)), sn = Math.sin(rad(p.r)); return { x: p.x + l.x * cs - l.y * sn, y: p.y + l.x * sn + l.y * cs, r: p.r + l.r }; };
    const toLocal = (p, wv) => { const cs = Math.cos(rad(-p.r)), sn = Math.sin(rad(-p.r)); const dx = wv.x - p.x, dy = wv.y - p.y; return { x: dx * cs - dy * sn, y: dx * sn + dy * cs, r: wv.r - p.r }; };
    function spawn() {
      const p = parent();
      let o;
      if (mode === 'a') o = { child: false, world: Object.assign({}, PRE) };
      else if (mode === 'b') o = { child: true, local: Object.assign({}, PRE) };
      else if (mode === 'c') o = { child: true, local: toLocal(p, PRE) };
      else o = { child: true, local: toLocal(p, SPAWN) };
      const wv = o.child ? toWorld(p, o.local) : o.world;
      o.atSpawn = Math.hypot(wv.x - SPAWN.x, wv.y - SPAWN.y) < 0.05 && Math.abs(wv.r - SPAWN.r) < 0.5;
      o.t0 = t; o.steps = mode === 'e' ? 2 : 1;
      inst = o;
    }
    const ctl = controls(host);
    seg(ctl, OPTS.map((o) => ({ v: o.v, l: 'Instantiate' + (o.v === 'e' ? '(pos, rot) ' : '') + o.l })), mode, (v) => { mode = v; spawn(); });
    const ctl2 = controls(host);
    button(ctl2, L.again, spawn, true);
    button(ctl2, L.move, () => { from = parent(); poseI = (poseI + 1) % POSES.length; poseT = 0; });
    const stage = makeCanvas(host, (w) => (w < 560 ? Math.round((w - 16) * 0.7) + 128 : 300));
    const src = codeBlock(host);
    const out = readout(host);
    spawn();

    function token(ctx, x, y, r, sz, fill, stroke, dash) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-rad(r));
      ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.7, sz * 0.7); ctx.lineTo(-sz * 0.4, 0); ctx.lineTo(-sz * 0.7, -sz * 0.7); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { dashed(ctx, dash); ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); dashed(ctx, false); }
      ctx.restore();
    }
    const f1 = (v) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);
    const fmt = (p) => '(' + f1(p.x) + ', ' + f1(p.y) + ')';

    const stop = loop((dt) => {
      t += dt;
      poseT = Math.min(1, poseT + dt * 1.6);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const gw = narrow ? w - 16 : w * 0.6 - 12;
      const gh = narrow ? h - 128 : h - 16;
      const cell = Math.min(gw / (XMAX - XMIN), gh / (YMAX - YMIN));
      const gx = 8, gy = 8;
      const SX = (x) => gx + (x - XMIN) * cell, SY = (y) => gy + (YMAX - y) * cell;
      // Rejilla
      ctx.fillStyle = c.soft; roundRect(ctx, gx, gy, (XMAX - XMIN) * cell, (YMAX - YMIN) * cell, 6); ctx.fill();
      ctx.strokeStyle = c.border; ctx.lineWidth = 1;
      for (let x = XMIN; x <= XMAX; x++) { ctx.beginPath(); ctx.moveTo(SX(x), SY(YMIN)); ctx.lineTo(SX(x), SY(YMAX)); ctx.stroke(); }
      for (let y = YMIN; y <= YMAX; y++) { ctx.beginPath(); ctx.moveTo(SX(XMIN), SY(y)); ctx.lineTo(SX(XMAX), SY(y)); ctx.stroke(); }
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(SX(0), SY(YMIN)); ctx.lineTo(SX(0), SY(YMAX)); ctx.moveTo(SX(XMIN), SY(0)); ctx.lineTo(SX(XMAX), SY(0)); ctx.stroke();
      text(ctx, '0', SX(0) - 4, SY(0) + 9, c.muted, { align: 'right' });
      // Prefab (posición guardada) y spawnPoint
      const sz = Math.max(9, cell * 0.32);
      token(ctx, SX(PRE.x), SY(PRE.y), PRE.r, sz, null, c.muted, true);
      text(ctx, L.prefab, SX(PRE.x), SY(PRE.y) + sz + 9, c.muted, { align: 'center' });
      ctx.strokeStyle = c.ok; ctx.lineWidth = 2;
      ring(ctx, SX(SPAWN.x), SY(SPAWN.y), sz + 5, c.ok, 2);
      token(ctx, SX(SPAWN.x), SY(SPAWN.y), SPAWN.r, sz, null, c.ok, true);
      text(ctx, L.spawn, SX(SPAWN.x), SY(SPAWN.y) - sz - 14, c.ok, { align: 'center' });
      // Contenedor padre con sus ejes locales
      const p = parent();
      ctx.save(); ctx.translate(SX(p.x), SY(p.y)); ctx.rotate(-rad(p.r));
      ctx.fillStyle = c.accentSoft; ctx.strokeStyle = c.accent; ctx.lineWidth = 2;
      roundRect(ctx, -cell * 0.35, -cell * 0.35, cell * 0.7, cell * 0.7, 4); ctx.fill(); ctx.stroke();
      ctx.restore();
      const ex = toWorld(p, { x: 1.4, y: 0, r: 0 }), ey = toWorld(p, { x: 0, y: 1.4, r: 0 });
      arrow(ctx, SX(p.x), SY(p.y), SX(ex.x), SY(ex.y), '#ef4444', 2);
      arrow(ctx, SX(p.x), SY(p.y), SX(ey.x), SY(ey.y), '#22c55e', 2);
      text(ctx, 'Enemies', SX(p.x), SY(p.y) + cell * 0.35 + 11, c.accent, { align: 'center' });
      // Instancia
      const wv = inst.child ? toWorld(p, inst.local) : inst.world;
      const k = clamp((t - inst.t0) / 0.35, 0, 1);
      const isOk = mode === 'd' || mode === 'e';
      token(ctx, SX(wv.x), SY(wv.y), wv.r, sz * (0.3 + 0.7 * ease(k)), isOk ? c.ok : c.bad, null);
      if (inst.child) { dashed(ctx, true); ctx.strokeStyle = c.accent; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(SX(p.x), SY(p.y)); ctx.lineTo(SX(wv.x), SY(wv.y)); ctx.stroke(); dashed(ctx, false); }
      text(ctx, 'Clone', SX(wv.x) + sz + 6, SY(wv.y) + sz + 4, isOk ? c.ok : c.bad);
      // Jerarquía
      const gridR = gx + (XMAX - XMIN) * cell + 12;
      const hr = narrow ? { x: 8, y: h - 112, w: w - 16, h: 104 } : { x: gridR, y: 8, w: w - gridR - 8, h: 120 };
      const rows = [{ name: 'Main Camera' }, { name: 'Enemies', tag: 'parent', color: c.accent }];
      const nm = 'Enemy(Clone)';
      if (inst.child) rows.push({ name: nm, depth: 1, color: isOk ? c.ok : c.bad });
      else rows.push({ name: nm, color: c.bad });
      if (mode === 'e' && t - inst.t0 < 0.6) { rows.pop(); rows.splice(1, 0, { name: nm, color: c.warn, tag: 'SetParent…' }); }
      hierarchy(ctx, c, hr.x, hr.y, hr.w, hr.h, L.hier, rows);
      if (!narrow) {
        const iy = hr.y + hr.h + 12;
        panel(ctx, c, hr.x, iy, hr.w, h - iy - 8, '');
        const lp = inst.child ? inst.local : wv;
        const lines = [
          [L.world + ' ' + fmt(wv), c.text], [L.local + ' ' + fmt(lp), c.muted],
          [(inst.child ? '✓ ' + L.child : '✗ ' + L.root), inst.child ? c.ok : c.bad],
          [(inst.atSpawn ? '✓ ' + L.atSpawn : '✗ ' + L.notSpawn), inst.atSpawn ? c.ok : c.bad]
        ];
        lines.forEach((ln, i) => text(ctx, fit(ctx, ln[0], hr.w - 16, i < 2), hr.x + 8, iy + 16 + i * 22, ln[1], { mono: i < 2 }));
      }
      const calls = {
        a: 'Enemy e = Instantiate(prefab);',
        b: 'Enemy e = Instantiate(prefab, enemies);',
        c: 'Enemy e = Instantiate(prefab, enemies, true);',
        d: 'Enemy e = Instantiate(prefab,\n    spawn.position, spawn.rotation, enemies);',
        e: 'Enemy e = Instantiate(prefab,\n    spawn.position, spawn.rotation);\ne.transform.SetParent(enemies); // 2º paso'
      };
      const body = calls[mode].replace('2º paso', lang === 'es' ? '2.º paso' : '2nd step');
      const nLines = body.split('\n').length;
      const marks = {}; for (let i = 0; i < nLines; i++) marks[i] = mode === 'd' ? 'ok' : (mode === 'e' ? 'hl' : 'bad');
      src(body, marks);
      const lp = inst.child ? inst.local : wv;
      out(L.why[mode] + '<p>' + L.world + ' <b>' + fmt(wv) + '</b> · ' + L.local + ' ' + fmt(lp) + ' · ' +
        (inst.child ? '✓ ' + L.child : '✗ ' + L.root) + ' · ' + (inst.atSpawn ? '✓ ' + L.atSpawn : '✗ ' + L.notSpawn) + '</p>' +
        (poseT < 1 || poseI ? '<p>' + L.movedHint + '</p>' : ''));
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     5. NavMeshLink (saltos) y bake en runtime
     --------------------------------------------------------- */

  function mountNavLinksBake(host, lang) {
    const L = {
      es: { tabA: 'NavMeshLink', tabB: 'Bake en runtime', link: 'NavMeshLink entre plataformas', gen: 'Generar nivel', calc: 'CalculatePath', build: 'BuildNavMesh()',
        partial: '✗ Sin conexión entre las dos zonas de la NavMesh: la ruta es <b>parcial</b> (' + code('PathPartial') + ') y el agente se queda en el borde.',
        complete: '✓ El ' + code('NavMeshLink') + ' une las dos zonas: ruta completa (' + code('PathComplete') + ').',
        onLink: '🦘 Cruzando el enlace: ' + code('agent.isOnOffMeshLink') + ' = <b>true</b> → reproduce aquí la animación de salto.',
        offLink: code('agent.isOnOffMeshLink') + ' = false',
        noMesh: 'Nivel nuevo generado en runtime: <b>no tiene NavMesh</b>. El agente no puede moverse.',
        calcFail: '✗ ' + code('CalculatePath') + ' devuelve <b>false</b>: calcula rutas sobre una NavMesh que <b>ya existe</b>, no la crea.',
        calcOk: '✓ ' + code('CalculatePath') + ' devuelve true: ahora sí hay NavMesh.',
        baking: 'Horneando la NavMesh con ' + code('NavMeshSurface.BuildNavMesh()') + '…',
        baked: '✓ NavMesh generada en runtime: el agente ya puede ir al destino. Para cambios parciales, ' + code('UpdateNavMesh') + ' la actualiza de forma asíncrona.',
        pkg: 'Paquete <b>AI Navigation</b> (com.unity.ai.navigation).', goal: 'meta' },
      en: { tabA: 'NavMeshLink', tabB: 'Runtime bake', link: 'NavMeshLink between platforms', gen: 'Generate level', calc: 'CalculatePath', build: 'BuildNavMesh()',
        partial: '✗ No connection between the two NavMesh regions: the path is <b>partial</b> (' + code('PathPartial') + ') and the agent stops at the edge.',
        complete: '✓ The ' + code('NavMeshLink') + ' connects both regions: complete path (' + code('PathComplete') + ').',
        onLink: '🦘 Crossing the link: ' + code('agent.isOnOffMeshLink') + ' = <b>true</b> → play the jump animation here.',
        offLink: code('agent.isOnOffMeshLink') + ' = false',
        noMesh: 'New level generated at runtime: <b>it has no NavMesh</b>. The agent cannot move.',
        calcFail: '✗ ' + code('CalculatePath') + ' returns <b>false</b>: it computes paths on a NavMesh that <b>already exists</b>, it does not create one.',
        calcOk: '✓ ' + code('CalculatePath') + ' returns true: now there is a NavMesh.',
        baking: 'Baking the NavMesh with ' + code('NavMeshSurface.BuildNavMesh()') + '…',
        baked: '✓ NavMesh built at runtime: the agent can now reach the goal. For partial changes, ' + code('UpdateNavMesh') + ' updates it asynchronously.',
        pkg: '<b>AI Navigation</b> package (com.unity.ai.navigation).', goal: 'goal' }
    }[lang];
    let tab = 'a', link = false, t = 0;
    // Pestaña A: vista lateral
    const A = { x: 1, phase: 'walk1', k: 0, wait: 0 };
    const LX0 = 7.7, LX1 = 11.3, GOALX = 18.5, SPD = 3.5;
    const resetA = () => { A.x = 1; A.phase = 'walk1'; A.k = 0; A.wait = 0; };
    // Pestaña B: rejilla procedural
    const COLS = 16, ROWS = 10;
    let genT = 0, walls, appear, start, goal, bake = 0, baking = false, path = null, pd = 0, calc = null, lastAct = 'gen';
    function generate() {
      for (let tries = 0; tries < 50; tries++) {
        walls = new Set(); appear = new Map();
        [3 + Math.floor(Math.random() * 2), 7 + Math.floor(Math.random() * 2), 11 + Math.floor(Math.random() * 2)].forEach((x) => {
          const gap = 1 + Math.floor(Math.random() * (ROWS - 3));
          for (let y = 0; y < ROWS; y++) if (y < gap || y > gap + 1) walls.add(y * COLS + x);
        });
        for (let b = 0; b < 5; b++) { const x = Math.floor(Math.random() * COLS), y = Math.floor(Math.random() * ROWS); walls.add(y * COLS + x); }
        start = { x: 1, y: 1 + Math.floor(Math.random() * (ROWS - 2)) };
        goal = { x: COLS - 2, y: 1 + Math.floor(Math.random() * (ROWS - 2)) };
        walls.delete(start.y * COLS + start.x); walls.delete(goal.y * COLS + goal.x);
        if (gridPath(COLS, ROWS, (x, y) => !walls.has(y * COLS + x), start, goal)) break;
      }
      walls.forEach((k) => appear.set(k, Math.random() * 0.5));
      genT = t; bake = 0; baking = false; path = null; pd = 0; calc = null; lastAct = 'gen';
    }
    generate();
    const panes = tabbed(host, [{ v: 'a', l: L.tabA }, { v: 'b', l: L.tabB }], (v) => { tab = v; });
    toggle(panes.a, L.link, link, (v) => { link = v; resetA(); });
    button(panes.b, L.gen, generate);
    button(panes.b, L.calc, () => { calc = { ok: bake >= 1, t }; lastAct = 'calc'; });
    button(panes.b, 'NavMeshSurface.BuildNavMesh()', () => { if (bake < 1) { baking = true; bake = 0; } lastAct = 'build'; }, true);
    let geo = gridGeo(300, 200, COLS, ROWS);
    const stage = makeCanvas(host, (w) => Math.round(Math.min(w, 560) / COLS * ROWS) + 12);
    const src = codeBlock(host);
    const out = readout(host);

    function drawLink(ctx, c, w, h, dt) {
      // Simulación
      if (A.phase === 'walk1') { A.x += SPD * dt; if (A.x >= LX0) { A.x = LX0; A.phase = link ? 'jump' : 'stuck'; A.k = 0; A.wait = 0; } }
      else if (A.phase === 'jump') { A.k += dt / 0.8; if (A.k >= 1) { A.phase = 'walk2'; A.x = LX1; } }
      else if (A.phase === 'walk2') { A.x += SPD * dt; if (A.x >= GOALX) { A.x = GOALX; A.phase = 'done'; A.wait = 0; } }
      else { A.wait += dt; if (A.wait > (A.phase === 'stuck' ? 2.2 : 1.2)) resetA(); }
      const s = Math.min((w - 16) / 20, (h - 50) / 6);
      const ox = (w - 20 * s) / 2, base = Math.min(h - 10, 34 + 5.6 * s);
      const X = (x) => ox + x * s, Y = (y) => base - y * s;
      // Plataformas
      ctx.fillStyle = c.border;
      roundRect(ctx, X(0), Y(2), 8 * s, h - Y(2) + 8, 4); ctx.fill();
      roundRect(ctx, X(11), Y(3), 9 * s, h - Y(3) + 8, 4); ctx.fill();
      // NavMesh horneada (azul) sobre cada plataforma
      ctx.fillStyle = c.accentSoft; ctx.strokeStyle = c.accent; ctx.lineWidth = 1;
      roundRect(ctx, X(0.3), Y(2) - 6, 7.4 * s, 6, 3); ctx.fill(); ctx.stroke();
      roundRect(ctx, X(11.3), Y(3) - 6, 8.4 * s, 6, 3); ctx.fill(); ctx.stroke();
      text(ctx, 'NavMesh', X(0.4), Y(2) + 12, c.accent);
      text(ctx, 'NavMesh', X(11.4), Y(3) + 12, c.accent);
      // Enlace
      const p0 = [X(LX0), Y(2) - 4], p1 = [X(LX1), Y(3) - 4];
      const apex = Math.min(p0[1], p1[1]) - 2.2 * s;
      const jp = (k) => [lerp(p0[0], p1[0], k), (1 - k) * (1 - k) * p0[1] + 2 * (1 - k) * k * apex + k * k * p1[1]];
      if (link) {
        dashed(ctx, true); ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 20; i++) { const q = jp(i / 20); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
        ctx.stroke(); dashed(ctx, false);
        circle(ctx, p0[0], p0[1], 5, c.accent); circle(ctx, p1[0], p1[1], 5, c.accent);
        text(ctx, 'NavMeshLink', (p0[0] + p1[0]) / 2, apex - 12, c.accent, { align: 'center' });
      } else {
        text(ctx, '?', (p0[0] + p1[0]) / 2, Y(3.2), c.muted, { align: 'center' });
      }
      // Meta
      const gx = X(GOALX + 0.6), gyT = Y(3);
      ctx.strokeStyle = c.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gyT); ctx.lineTo(gx, gyT - 30); ctx.stroke();
      ctx.fillStyle = c.ok; ctx.beginPath(); ctx.moveTo(gx, gyT - 30); ctx.lineTo(gx + 16, gyT - 24); ctx.lineTo(gx, gyT - 18); ctx.fill();
      // Ruta planificada
      ctx.strokeStyle = link ? c.ok : c.warn; ctx.lineWidth = 2; dashed(ctx, true);
      ctx.beginPath(); ctx.moveTo(X(1), Y(2) - 14); ctx.lineTo(X(LX0), Y(2) - 14); ctx.stroke();
      if (link) { ctx.beginPath(); ctx.moveTo(X(LX1), Y(3) - 14); ctx.lineTo(X(GOALX), Y(3) - 14); ctx.stroke(); }
      dashed(ctx, false);
      // Agente
      const r = Math.max(7, s * 0.4);
      let ax = X(A.x), ay = Y(A.x > 9 ? 3 : 2) - r - 2;
      if (A.phase === 'jump') { const q = jp(ease(A.k)); ax = q[0]; ay = q[1] - r; }
      agentDot(ctx, ax, ay, r, A.phase === 'jump' ? c.warn : c.accent);
      if (A.phase === 'stuck') text(ctx, '?', ax, ay - r - 10, c.bad, { align: 'center' });
      const onLink = A.phase === 'jump';
      src('void Update() {\n    if (agent.isOnOffMeshLink)\n        animator.SetBool("Jump", true);\n}', onLink ? { 1: 'ok', 2: 'ok' } : (link ? {} : { 1: 'off', 2: 'off' }));
      out((link ? L.complete : L.partial) + '<p>' + (onLink ? L.onLink : L.offLink) + '</p>');
    }

    function drawBake(ctx, c, w, h, dt) {
      if (baking) { bake = Math.min(1, bake + dt / 1.1); if (bake >= 1) { baking = false; path = gridPath(COLS, ROWS, (x, y) => !walls.has(y * COLS + x), start, goal); pd = 0; } }
      if (path) pd += dt * 4;
      geo = gridGeo(w, h, COLS, ROWS);
      const { cell, ox, oy } = geo;
      const cx = (x) => ox + x * cell, cy = (y) => oy + y * cell;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const k = y * COLS + x;
        ctx.fillStyle = c.soft; ctx.fillRect(cx(x) + 1, cy(y) + 1, cell - 2, cell - 2);
        if (walls.has(k)) {
          const a = clamp((t - genT - appear.get(k)) / 0.25, 0, 1);
          const sz = (cell - 2) * ease(a);
          ctx.fillStyle = c.text; ctx.fillRect(cx(x) + cell / 2 - sz / 2, cy(y) + cell / 2 - sz / 2, sz, sz);
        } else if (x < bake * COLS) {
          ctx.fillStyle = c.accentSoft; ctx.fillRect(cx(x) + 1, cy(y) + 1, cell - 2, cell - 2);
        }
      }
      if (baking) { ctx.fillStyle = c.accent; ctx.fillRect(cx(bake * COLS) - 1.5, oy, 3, cell * ROWS); }
      ctx.strokeStyle = c.ok; ctx.lineWidth = 3;
      ctx.strokeRect(cx(goal.x) + 3, cy(goal.y) + 3, cell - 6, cell - 6);
      let pos = { x: start.x, y: start.y };
      if (path) {
        ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
        path.forEach((q, i) => { const X = cx(q.x) + cell / 2, Y = cy(q.y) + cell / 2; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.stroke();
        pos = along(path, pd);
      }
      const ax = cx(pos.x) + cell / 2, ay = cy(pos.y) + cell / 2;
      agentDot(ctx, ax, ay, cell * 0.36, c.accent);
      if (calc && t - calc.t < 1.6 && !calc.ok) {
        ctx.strokeStyle = c.bad; ctx.lineWidth = 3; const r = cell * 0.5;
        ctx.beginPath(); ctx.moveTo(ax - r, ay - r); ctx.lineTo(ax + r, ay + r); ctx.moveTo(ax + r, ay - r); ctx.lineTo(ax - r, ay + r); ctx.stroke();
      }
      if (bake === 0 && !baking) text(ctx, '?', ax, ay - cell * 0.75, c.bad, { align: 'center' });
      const m = {};
      if (lastAct === 'gen') m[0] = 'hl';
      if (lastAct === 'calc') m[1] = calc && calc.ok ? 'ok' : 'bad';
      if (lastAct === 'build') { m[2] = bake >= 1 ? 'ok' : 'hl'; if (bake >= 1) m[3] = 'ok'; }
      src('levelGenerator.Generate();\nagent.CalculatePath(goal, path); // ' + (lang === 'es' ? 'necesita NavMesh' : 'needs a NavMesh') +
        '\nsurface.BuildNavMesh();          // AI Navigation\nagent.SetDestination(goal);', m);
      let msg;
      if (baking) msg = L.baking;
      else if (lastAct === 'calc' && calc) msg = calc.ok ? L.calcOk : L.calcFail;
      else if (bake >= 1) msg = L.baked;
      else msg = L.noMesh;
      out(msg + '<p>' + L.pkg + '</p>');
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'a') drawLink(ctx, c, w, h, dt); else drawBake(ctx, c, w, h, dt);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     6. NavMesh.SamplePosition y agent.Warp
     --------------------------------------------------------- */

  function mountNavSampleWarp(host, lang) {
    const L = {
      es: { tabA: 'SamplePosition', tabB: 'Teletransportar (Warp)', rnd: 'Punto aleatorio', maxD: 'maxDistance', tap: 'Toca el mapa (también muros y agua) para pedir un punto de aparición.',
        found: (d) => '✓ ' + code('SamplePosition') + ' devuelve <b>true</b>: el punto más cercano de la NavMesh está a ' + d + ' → ' + code('hit.position') + '.',
        on: '✓ El punto ya está sobre la NavMesh: ' + code('hit.position') + ' es el mismo punto.',
        miss: '✗ Devuelve <b>false</b>: no hay NavMesh dentro de ' + code('maxDistance') + '. Prueba otro punto o sube el radio.',
        ray: (what, ok) => (ok ? '' : '✗ ') + 'El raycast golpea el collider <b>' + what + '</b>' + (ok ? ': aquí coincide con la NavMesh, pero por casualidad.' : ': el enemigo aparecería ahí, fuera de la NavMesh. Un raycast físico solo ve colliders.'),
        rayNone: '✗ El raycast no golpea nada (agujero sin collider).',
        floor: 'Suelo', wall: 'Muro', water: 'Agua', hole: 'Agujero',
        tp: 'transform.position = spawn', warp: 'agent.Warp(spawn)', move: 'agent.Move(Vector3.right)', dest: 'agent.destination = spawn', reset: 'Reiniciar',
        internal: 'posición interna', why: {
          idle: 'Elige cómo llevar al enemigo al punto <b>spawn</b>.',
          tp: '✗ Mueves el Transform, pero la <b>posición interna</b> del agente sigue en el sitio anterior: el agente la vuelve a imponer y el enemigo «vuelve atrás».',
          warp: '✓ ' + code('Warp') + ' coloca al agente en la nueva posición y actualiza su estado interno (y su NavMesh) en un solo paso.',
          move: code('Move') + ' aplica un <b>desplazamiento relativo</b> (como un paso), no un teletransporte.',
          dest: code('destination') + ' hace que el agente <b>camine</b> hasta allí por la NavMesh: no es un teletransporte.'
        } },
      en: { tabA: 'SamplePosition', tabB: 'Teleporting (Warp)', rnd: 'Random point', maxD: 'maxDistance', tap: 'Tap the map (walls and water too) to ask for a spawn point.',
        found: (d) => '✓ ' + code('SamplePosition') + ' returns <b>true</b>: the nearest NavMesh point is ' + d + ' away → ' + code('hit.position') + '.',
        on: '✓ The point is already on the NavMesh: ' + code('hit.position') + ' is the same point.',
        miss: '✗ It returns <b>false</b>: there is no NavMesh within ' + code('maxDistance') + '. Try another point or increase the radius.',
        ray: (what, ok) => (ok ? '' : '✗ ') + 'The raycast hits the <b>' + what + '</b> collider' + (ok ? ': here it matches the NavMesh, but only by luck.' : ': the enemy would spawn there, off the NavMesh. A physics raycast only sees colliders.'),
        rayNone: '✗ The raycast hits nothing (a hole with no collider).',
        floor: 'Floor', wall: 'Wall', water: 'Water', hole: 'Hole',
        tp: 'transform.position = spawn', warp: 'agent.Warp(spawn)', move: 'agent.Move(Vector3.right)', dest: 'agent.destination = spawn', reset: 'Reset',
        internal: 'internal position', why: {
          idle: 'Choose how to bring the enemy to the <b>spawn</b> point.',
          tp: '✗ You move the Transform, but the agent\'s <b>internal position</b> is still at the old spot: the agent imposes it again and the enemy “goes back”.',
          warp: '✓ ' + code('Warp') + ' places the agent at the new position and updates its internal state (and its NavMesh) in one step.',
          move: code('Move') + ' applies a <b>relative offset</b> (like a step), not a teleport.',
          dest: code('destination') + ' makes the agent <b>walk</b> there along the NavMesh: it is not a teleport.'
        } }
    }[lang];
    const COLS = 16, ROWS = 10;
    const MAP = [
      '................',
      '.####......~~~..',
      '.#.........~~~~.',
      '.#..oo.....~~~..',
      '....oo..####....',
      '...........#....',
      '..~~~......#....',
      '.~~~~~.....#..o.',
      '..~~~...........',
      '................'
    ];
    const type = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS ? 'o' : MAP[y][x]);
    let tab = 'a', maxD = 1.5, t = 0, tries = [];
    // --- Pestaña B
    const WALL = (x, y) => x === 8 && y >= 2;
    const A0 = { x: 2.5, y: 7.5 }, S = { x: 13.5, y: 7.5 };
    let tf, sim, wpath, wpd, act, actT, moveFrom, moveTo;
    function resetB() { tf = Object.assign({}, A0); sim = Object.assign({}, A0); wpath = null; wpd = 0; act = 'idle'; actT = 0; }
    resetB();
    const panes = tabbed(host, [{ v: 'a', l: L.tabA }, { v: 'b', l: L.tabB }], (v) => { tab = v; });
    slider(panes.a, L.maxD, 0.25, 4, 0.25, maxD, (v) => { maxD = v; }, (v) => v.toFixed(2));
    button(panes.a, L.rnd, () => { autoOn = false; sample(Math.random() * COLS, Math.random() * ROWS); }, true);
    let method = 'nav', autoT = 1.2, autoOn = true;
    seg(panes.a, [{ v: 'nav', l: 'NavMesh.SamplePosition' }, { v: 'ray', l: 'Physics.Raycast' }], 'nav', (v) => { method = v; tries = []; });
    button(panes.b, L.tp, () => { tf = Object.assign({}, S); wpath = null; act = 'tp'; actT = 0; });
    button(panes.b, L.warp, () => { tf = Object.assign({}, S); sim = Object.assign({}, S); wpath = null; act = 'warp'; actT = 0; }, true);
    button(panes.b, L.move, () => {
      let nx = sim.x;
      for (let k = 0; k < 4; k++) { const tx = nx + 0.5; if (WALL(Math.floor(tx + 0.3), Math.floor(sim.y)) || tx > COLS - 0.5) break; nx = tx; }
      moveFrom = Object.assign({}, sim); moveTo = { x: nx, y: sim.y }; wpath = null; act = 'move'; actT = 0;
    });
    button(panes.b, L.dest, () => {
      const s0 = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
      wpath = gridPath(COLS, ROWS, (x, y) => !WALL(x, y), s0, { x: Math.floor(S.x), y: Math.floor(S.y) });
      if (wpath) { wpath = wpath.map((q) => ({ x: q.x + 0.5, y: q.y + 0.5 })); wpath[0] = Object.assign({}, sim); }
      wpd = 0; act = 'dest'; actT = 0;
    });
    button(panes.b, L.reset, resetB);
    let geo = gridGeo(300, 200, COLS, ROWS);
    const stage = makeCanvas(host, (w) => Math.round(Math.min(w, 560) / COLS * ROWS) + 12, (px, py) => {
      if (tab !== 'a') return;
      autoOn = false;
      sample((px - geo.ox) / geo.cell, (py - geo.oy) / geo.cell);
    });
    const src = codeBlock(host);
    const out = readout(host);

    function sample(x, y) {
      x = clamp(x, 0.05, COLS - 0.05); y = clamp(y, 0.05, ROWS - 0.05);
      const p = { x, y };
      let best = null, bd = Infinity;
      for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
        if (MAP[cy][cx] !== '.') continue;
        const qx = clamp(x, cx, cx + 1), qy = clamp(y, cy, cy + 1);
        const d = Math.hypot(qx - x, qy - y);
        if (d < bd) { bd = d; best = { x: qx, y: qy }; }
      }
      const ty = type(Math.floor(x), Math.floor(y));
      tries.push({ p, hit: bd <= maxD, hp: best, d: bd, r: maxD, t0: t, ty });
      if (tries.length > 6) tries.shift();
    }

    function drawSample(ctx, c, w, h, dt) {
      if (autoOn) { autoT -= dt; if (autoT <= 0) { autoT = 2.6; sample(Math.random() * COLS, Math.random() * ROWS); } }
      geo = gridGeo(w, h, COLS, ROWS);
      const { cell, ox, oy } = geo;
      const X = (x) => ox + x * cell, Y = (y) => oy + y * cell;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const k = MAP[y][x];
        ctx.fillStyle = k === '.' ? c.accentSoft : k === '#' ? c.text : k === '~' ? WATER(0.55) : c.bg;
        ctx.fillRect(X(x), Y(y), cell, cell);
        if (k === 'o') { ctx.strokeStyle = c.border; ctx.lineWidth = 1; ctx.strokeRect(X(x) + 0.5, Y(y) + 0.5, cell - 1, cell - 1); }
      }
      text(ctx, 'NavMesh', X(0.15), Y(0.5), c.accent);
      text(ctx, fit(ctx, L.wall, cell * 3), X(2.1), Y(1.5), c.bg);
      text(ctx, fit(ctx, L.water, cell * 3), X(11.15), Y(1.5), c.text);
      text(ctx, fit(ctx, L.water, cell * 3), X(2.15), Y(7.5), c.text);
      text(ctx, fit(ctx, L.hole, cell * 2 - 4), X(5), Y(4), c.muted, { align: 'center' });
      tries.forEach((tr, i) => {
        const last = i === tries.length - 1;
        const k = clamp((t - tr.t0) / 0.4, 0, 1);
        ctx.globalAlpha = last ? 1 : 0.45;
        const px = X(tr.p.x), py = Y(tr.p.y);
        if (method === 'nav') {
          if (last) { dashed(ctx, true); ring(ctx, px, py, tr.r * cell * ease(k), c.warn, 2); dashed(ctx, false); }
          circle(ctx, px, py, 3.5, c.warn);
          if (k >= 1 || !last) {
            if (tr.hit) {
              if (tr.d > 0.01) arrow(ctx, px, py, X(tr.hp.x), Y(tr.hp.y), c.ok, 2);
              agentDot(ctx, X(tr.hp.x), Y(tr.hp.y), cell * 0.3, c.ok);
            } else {
              ctx.strokeStyle = c.bad; ctx.lineWidth = 3; const r = 6;
              ctx.beginPath(); ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r); ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r); ctx.stroke();
            }
          }
        } else {
          ring(ctx, px, py, 8 * (1 - k) + 3, c.warn, 2);
          if (tr.ty === 'o') { ctx.strokeStyle = c.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 6, py - 6); ctx.lineTo(px + 6, py + 6); ctx.moveTo(px + 6, py - 6); ctx.lineTo(px - 6, py + 6); ctx.stroke(); }
          else agentDot(ctx, px, py, cell * 0.3, tr.ty === '.' ? c.ok : c.bad);
        }
        ctx.globalAlpha = 1;
      });
      const nm = { '.': L.floor, '#': L.wall, '~': L.water, o: L.hole };
      if (method === 'nav') {
        src('Vector3 p = RandomPointInLevel();\nif (NavMesh.SamplePosition(p, out NavMeshHit hit, ' + maxD + 'f, NavMesh.AllAreas))\n    Instantiate(enemy, hit.position, Quaternion.identity);', { 1: 'ok', 2: 'ok' });
      } else {
        src('Vector3 p = RandomPointInLevel();\nif (Physics.Raycast(p + Vector3.up * 10f, Vector3.down, out RaycastHit hit))\n    Instantiate(enemy, hit.point, Quaternion.identity); // ' + (lang === 'es' ? '¿en la NavMesh?' : 'on the NavMesh?'), { 1: 'bad', 2: 'bad' });
      }
      const tr = tries[tries.length - 1];
      let msg = L.tap;
      if (tr && t - tr.t0 >= 0.4) {
        if (method === 'nav') msg = tr.hit ? (tr.d < 0.01 ? L.on : L.found(tr.d.toFixed(2))) : L.miss;
        else msg = tr.ty === 'o' ? L.rayNone : L.ray(nm[tr.ty], tr.ty === '.');
        msg += '<p>' + L.tap + '</p>';
      }
      out(msg);
    }

    function drawWarp(ctx, c, w, h, dt) {
      actT += dt;
      if (act === 'tp' && actT > 0.6) { tf.x = lerp(tf.x, sim.x, Math.min(1, dt * 5)); tf.y = lerp(tf.y, sim.y, Math.min(1, dt * 5)); }
      if (act === 'move') { const k = ease(clamp(actT / 0.25, 0, 1)); sim = { x: lerp(moveFrom.x, moveTo.x, k), y: moveFrom.y }; tf = Object.assign({}, sim); }
      if (act === 'dest' && wpath) { wpd += dt * 4.5; const q = along(wpath, wpd); sim = { x: q.x, y: q.y }; tf = Object.assign({}, sim); }
      geo = gridGeo(w, h, COLS, ROWS);
      const { cell, ox, oy } = geo;
      const X = (x) => ox + x * cell, Y = (y) => oy + y * cell;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = WALL(x, y) ? c.text : c.accentSoft;
        ctx.fillRect(X(x) + 0.5, Y(y) + 0.5, cell - 1, cell - 1);
      }
      if (act === 'dest' && wpath) {
        ctx.strokeStyle = c.accent; ctx.lineWidth = 2; dashed(ctx, true); ctx.beginPath();
        wpath.forEach((q, i) => { if (i) ctx.lineTo(X(q.x), Y(q.y)); else ctx.moveTo(X(q.x), Y(q.y)); });
        ctx.stroke(); dashed(ctx, false);
      }
      ring(ctx, X(S.x), Y(S.y), cell * 0.55, c.ok, 2.5);
      text(ctx, 'spawn', X(S.x), Y(S.y) - cell * 0.95, c.ok, { align: 'center' });
      text(ctx, 'A', X(A0.x), Y(A0.y) + cell * 0.95, c.muted, { align: 'center' });
      const apart = Math.hypot(tf.x - sim.x, tf.y - sim.y) > 0.05;
      if (apart) {
        dashed(ctx, true); ring(ctx, X(sim.x), Y(sim.y), cell * 0.42, c.warn, 2); dashed(ctx, false);
        text(ctx, fit(ctx, L.internal, cell * 5), X(sim.x), Y(sim.y) - cell * 0.75, c.warn, { align: 'center' });
        arrow(ctx, X(tf.x), Y(tf.y), X(sim.x), Y(sim.y), c.warn, 1.5);
      }
      agentDot(ctx, X(tf.x), Y(tf.y), cell * 0.34, act === 'tp' ? c.bad : (act === 'warp' ? c.ok : c.accent));
      const lines = ['transform.position = spawn.position;', 'agent.Warp(spawn.position);', 'agent.Move(Vector3.right);', 'agent.destination = spawn.position;'];
      const idx = { tp: 0, warp: 1, move: 2, dest: 3 }[act];
      const m = {}; if (idx !== undefined) m[idx] = act === 'tp' ? 'bad' : act === 'warp' ? 'ok' : 'hl';
      src(lines.join('\n'), m);
      out(L.why[act]);
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'a') drawSample(ctx, c, w, h, dt); else drawWarp(ctx, c, w, h, dt);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     7. Corrutinas: SetActive(false) vs enabled = false
     --------------------------------------------------------- */

  function mountCoroutines(host, lang) {
    const L = {
      es: { where: 'StartCoroutine en', reset: 'Reiniciar', events: 'Eventos', co: 'SpawnWaves()', go: 'GameObject', active: 'activo', inactive: 'inactivo',
        upd: 'Update', runs: 'se ejecuta', stopped: 'parado', cos: 'Corrutinas', waves: 'Oleadas',
        v: {
          stuck: '✗ Las oleadas <b>no continúan</b>: ' + code('SetActive(false)') + ' detuvo la corrutina y, al reactivar, ' + code('Start') + ' no se vuelve a ejecutar. Lánzala en ' + code('OnEnable') + '.',
          restarted: '✓ Al reactivar el GameObject se llama a ' + code('OnEnable') + ', que vuelve a lanzar la corrutina.',
          disabled: '✓ ' + code('enabled = false') + ' detiene ' + code('Update') + ', pero <b>no</b> detiene las corrutinas: las oleadas siguen saliendo.',
          dup: '⚠️ Hay <b>varias</b> corrutinas a la vez: ' + code('OnEnable') + ' se llamó otra vez sin parar la anterior. Usa ' + code('StopAllCoroutines()') + ' en ' + code('OnDisable') + ' o guarda la ' + code('Coroutine') + '.',
          off: 'GameObject inactivo: ni ' + code('Update') + ' ni las corrutinas se ejecutan.',
          run: 'La corrutina está en marcha: una oleada cada segundo (' + code('yield return new WaitForSeconds(1f)') + ').'
        } },
      en: { where: 'StartCoroutine in', reset: 'Reset', events: 'Events', co: 'SpawnWaves()', go: 'GameObject', active: 'active', inactive: 'inactive',
        upd: 'Update', runs: 'running', stopped: 'stopped', cos: 'Coroutines', waves: 'Waves',
        v: {
          stuck: '✗ The waves <b>do not resume</b>: ' + code('SetActive(false)') + ' stopped the coroutine and, when reactivated, ' + code('Start') + ' does not run again. Start it in ' + code('OnEnable') + '.',
          restarted: '✓ Reactivating the GameObject calls ' + code('OnEnable') + ', which starts the coroutine again.',
          disabled: '✓ ' + code('enabled = false') + ' stops ' + code('Update') + ', but it does <b>not</b> stop coroutines: waves keep spawning.',
          dup: '⚠️ <b>Several</b> coroutines are running: ' + code('OnEnable') + ' was called again without stopping the previous one. Use ' + code('StopAllCoroutines()') + ' in ' + code('OnDisable') + ' or keep the ' + code('Coroutine') + '.',
          off: 'Inactive GameObject: neither ' + code('Update') + ' nor coroutines run.',
          run: 'The coroutine is running: one wave per second (' + code('yield return new WaitForSeconds(1f)') + ').'
        } }
    }[lang];
    const WIN = 8;
    let where = 'start', t, active, enabled, cos, events, upd, waves, nextId, wasRestarted;
    const running = () => active && enabled;
    function ev(name, kind) { events.push({ t, name, kind }); }
    function startCo() { cos.push({ id: nextId++, t0: t, t1: null, waves: [t], next: t + 1 }); waves++; }
    function reset() {
      t = 0; active = true; enabled = true; cos = []; events = []; upd = [{ t0: 0, t1: null }]; waves = 0; nextId = 1; wasRestarted = false;
      ev('OnEnable', 'cb'); if (where === 'enable') startCo();
      ev('Start', 'cb'); if (where === 'start') startCo();
    }
    function change(fn, label) {
      const before = running();
      ev(label, 'act');
      fn();
      const now = running();
      if (before && !now) { ev('OnDisable', 'cb'); upd[upd.length - 1].t1 = t; }
      if (!before && now) { upd.push({ t0: t, t1: null }); ev('OnEnable', 'cb'); if (where === 'enable') { startCo(); wasRestarted = true; } }
    }
    reset();
    const ctl = controls(host);
    seg(ctl, [{ v: 'start', l: L.where + ' Start' }, { v: 'enable', l: L.where + ' OnEnable' }], where, (v) => { where = v; reset(); });
    button(ctl, L.reset, reset);
    const ctl2 = controls(host);
    button(ctl2, 'SetActive(false)', () => { if (active) change(() => { active = false; cos.forEach((co) => { if (co.t1 === null) co.t1 = t; }); }, 'SetActive(false)'); }, true);
    button(ctl2, 'SetActive(true)', () => { if (!active) { wasRestarted = false; change(() => { active = true; }, 'SetActive(true)'); } }, true);
    button(ctl2, 'enabled = false', () => { if (enabled) change(() => { enabled = false; }, 'enabled = false'); });
    button(ctl2, 'enabled = true', () => { if (!enabled) change(() => { enabled = true; }, 'enabled = true'); });
    const stage = makeCanvas(host, (w) => (w < 520 ? 300 : 250));
    const src = codeBlock(host);
    const out = readout(host);

    function chips(ctx, c, items, x0, y0, maxW) {
      let x = x0, y = y0;
      items.forEach((it) => {
        const wd = tw(ctx, it[0]) + 18;
        if (x + wd > x0 + maxW) { x = x0; y += 26; }
        box(ctx, x, y, wd, 22, it[0], it[1], it[2], { r: 11 });
        x += wd + 6;
      });
      return y + 22;
    }

    const stop = loop((dt) => {
      t += dt;
      cos.forEach((co) => { if (co.t1 === null) while (t >= co.next) { co.waves.push(co.next); waves++; co.next += 1; } });
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const live = cos.filter((co) => co.t1 === null).length;
      const yTop = chips(ctx, c, [
        [L.go + ': ' + (active ? L.active : L.inactive), active ? c.ok : c.bad, '#fff'],
        ['enabled = ' + enabled, enabled ? c.ok : c.warn, '#fff'],
        [L.upd + ': ' + (running() ? L.runs : L.stopped), running() ? c.accent : c.soft, running() ? '#fff' : c.muted],
        [L.cos + ': ' + live, live ? (live > 1 ? c.warn : c.accent) : c.bad, '#fff'],
        [L.waves + ': ' + waves, c.soft, c.text]
      ], 8, 8, w - 16) + 10;
      const x0 = 10, W = w - 20;
      const X = (tt) => x0 + ((tt - (t - WIN * 0.9)) / WIN) * W;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, W, h); ctx.clip();
      // Eventos (en 3 filas para no solaparse)
      text(ctx, L.events, x0, yTop + 6, c.muted);
      const rowsUsed = [];
      events.forEach((e) => {
        if (X(e.t) < x0 - 160) return;
        let row = 0;
        while (rowsUsed[row] !== undefined && rowsUsed[row] > X(e.t) - 4) row++;
        row = Math.min(row, 2);
        const lx = X(e.t);
        const color = e.kind === 'act' ? c.text : c.accent;
        ctx.fillStyle = color; ctx.fillRect(lx - 1, yTop + 14 + row * 15, 2, 12);
        text(ctx, e.name, lx + 4, yTop + 20 + row * 15, color, { mono: true });
        rowsUsed[row] = lx + tw(ctx, e.name, true) + 8;
      });
      let y = yTop + 66;
      // Update
      text(ctx, 'Update()', x0, y, c.muted, { mono: true });
      upd.forEach((u) => {
        const a = Math.max(x0, X(u.t0)), b = X(u.t1 === null ? t : u.t1);
        ctx.fillStyle = c.accent;
        for (let px = a; px < b; px += 5) ctx.fillRect(px, y + 10, 2, 12);
      });
      y += 36;
      // Corrutinas (las dos más recientes)
      cos.slice(-2).forEach((co) => {
        text(ctx, L.co + ' #' + co.id, x0, y, c.muted, { mono: true });
        const a = Math.max(x0, X(co.t0)), b = X(co.t1 === null ? t : co.t1);
        ctx.fillStyle = co.t1 === null ? c.okSoft : c.soft; roundRect(ctx, a, y + 9, Math.max(2, b - a), 14, 7); ctx.fill();
        co.waves.forEach((wt) => { if (X(wt) > x0 - 10) { circle(ctx, X(wt), y + 16, 5, c.ok); } });
        if (co.t1 !== null && X(co.t1) > x0) {
          ctx.strokeStyle = c.bad; ctx.lineWidth = 3; const cx = X(co.t1), cy = y + 16;
          ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5); ctx.stroke();
        }
        y += 36;
      });
      ctx.restore();
      ctx.strokeStyle = c.border; ctx.lineWidth = 1; dashed(ctx, true);
      ctx.beginPath(); ctx.moveTo(X(t), yTop + 10); ctx.lineTo(X(t), h - 4); ctx.stroke(); dashed(ctx, false);
      // Veredicto
      let v;
      if (!active) v = L.v.off;
      else if (live > 1) v = L.v.dup;
      else if (live === 0) v = L.v.stuck;
      else if (!enabled) v = L.v.disabled;
      else if (wasRestarted) v = L.v.restarted;
      else v = L.v.run;
      const m = where === 'start' ? { 0: 'hl', 1: 'off' } : { 0: 'off', 1: 'hl' };
      if (live) { m[4] = 'ok'; m[5] = 'ok'; }
      src('void Start()    { StartCoroutine(SpawnWaves()); }\nvoid OnEnable() { StartCoroutine(SpawnWaves()); }\nIEnumerator SpawnWaves() {\n    while (true) {\n        SpawnWave();\n        yield return new WaitForSeconds(1f);\n    }\n}', m);
      out(v);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     8. Addressables (recuento de referencias) y Resources
     --------------------------------------------------------- */

  function mountAddressables(host, lang) {
    const L = {
      es: { tRef: 'Recuento de referencias', tLeak: 'Horas sin Release', tRes: 'Carpeta Resources', mem: 'Memoria', loaded: 'cargado', unloaded: 'descargado', handles: 'Handles', insts: 'Instancias',
        none: 'ninguno', noRel: 'Sin Release', withRel: 'Con Release(handle)', reset: 'Reiniciar', limit: 'límite del dispositivo', crash: '¡Sin memoria! La app se cierra.',
        played: 'Tiempo jugado', rooms: 'salas cargadas', resMode: 'Resources/', dirMode: 'Referencias / Addressables', build: 'Hacer build', project: 'Proyecto', used: 'usado en el juego',
        buildBox: 'Build', size: 'Tamaño de build', start: 'Arranque', index: 'índice de Resources', noIndex: 'sin índice de Resources', illus: '(valores ilustrativos)',
        nothing: '⚠️ No queda ningún handle que liberar (liberar de más es un error).',
        vRef: (r) => 'refCount = <b>' + r + '</b>. ' + (r > 0 ? 'El asset y su bundle siguen en memoria hasta que el contador vuelva a 0.' : '✓ Contador a 0: Addressables descarga el asset y su bundle.'),
        vRule: 'Cada ' + code('LoadAssetAsync') + ' necesita su ' + code('Release(handle)') + '; cada ' + code('InstantiateAsync') + ', su ' + code('ReleaseInstance') + '.',
        vLeak: '✗ Cada sala carga sus assets con ' + code('LoadAssetAsync') + ' y nadie llama a ' + code('Release') + ': el recuento nunca llega a 0 y la memoria no deja de crecer.',
        vNoLeak: '✓ Al salir de cada sala se llama a ' + code('Addressables.Release(handle)') + ': su recuento baja a 0, se descarga y la memoria se mantiene estable.',
        vRes: '✗ Todo lo que hay en ' + code('Resources/') + ' entra en la build, se use o no, y Unity construye un índice al arrancar: más tamaño, más tiempo de arranque y una memoria difícil de controlar.',
        vDir: '✓ Con referencias directas o Addressables solo entra en la build lo que se usa (o se descarga bajo demanda), sin índice de Resources al arrancar.' },
      en: { tRef: 'Reference counting', tLeak: 'Hours without Release', tRes: 'Resources folder', mem: 'Memory', loaded: 'loaded', unloaded: 'unloaded', handles: 'Handles', insts: 'Instances',
        none: 'none', noRel: 'No Release', withRel: 'With Release(handle)', reset: 'Reset', limit: 'device limit', crash: 'Out of memory! The app is killed.',
        played: 'Time played', rooms: 'rooms loaded', resMode: 'Resources/', dirMode: 'References / Addressables', build: 'Make build', project: 'Project', used: 'used by the game',
        buildBox: 'Build', size: 'Build size', start: 'Startup', index: 'Resources index', noIndex: 'no Resources index', illus: '(illustrative values)',
        nothing: '⚠️ There is no handle left to release (releasing too many times is an error).',
        vRef: (r) => 'refCount = <b>' + r + '</b>. ' + (r > 0 ? 'The asset and its bundle stay in memory until the count is back to 0.' : '✓ Count at 0: Addressables unloads the asset and its bundle.'),
        vRule: 'Every ' + code('LoadAssetAsync') + ' needs its ' + code('Release(handle)') + '; every ' + code('InstantiateAsync') + ', its ' + code('ReleaseInstance') + '.',
        vLeak: '✗ Each room loads its assets with ' + code('LoadAssetAsync') + ' and nobody calls ' + code('Release') + ': the count never reaches 0 and memory keeps growing.',
        vNoLeak: '✓ Leaving each room calls ' + code('Addressables.Release(handle)') + ': its count drops to 0, it is unloaded and memory stays flat.',
        vRes: '✗ Everything in ' + code('Resources/') + ' goes into the build, used or not, and Unity builds an index at startup: bigger build, slower startup and memory that is hard to control.',
        vDir: '✓ With direct references or Addressables only what is used goes into the build (or is downloaded on demand), with no Resources index at startup.' }
    }[lang];
    let tab = 'ref', t = 0;
    // --- Recuento
    let handles = [{ id: 1, t0: -9 }], insts = [], hid = 2, iid = 1, warnT = -9, memShow = 0, lastAct = -1;
    // --- Fuga
    let rel = false, sim;
    const resetSim = () => { sim = { mins: 0, room: 0, acc: 0, loaded: [], visited: [], samples: [], sAcc: 0, crash: 0 }; };
    resetSim();
    // --- Resources
    let resMode = 'res', bt = 0;
    const N = 24, USED = [1, 4, 9, 14, 18, 22];
    const panes = tabbed(host, [{ v: 'ref', l: L.tRef }, { v: 'leak', l: L.tLeak }, { v: 'res', l: L.tRes }], (v) => { tab = v; bt = 0; });
    button(panes.ref, 'LoadAssetAsync', () => { handles.push({ id: hid++, t0: t }); lastAct = 0; }, true);
    button(panes.ref, 'Release(handle)', () => { if (handles.length) handles.pop(); else warnT = t; lastAct = 1; });
    button(panes.ref, 'InstantiateAsync', () => { insts.push({ id: iid++, t0: t }); lastAct = 2; }, true);
    button(panes.ref, 'ReleaseInstance', () => { if (insts.length) insts.pop(); else warnT = t; lastAct = 3; });
    seg(panes.leak, [{ v: false, l: L.noRel }, { v: true, l: L.withRel }], rel, (v) => { rel = v; resetSim(); });
    button(panes.leak, L.reset, resetSim);
    seg(panes.res, [{ v: 'res', l: L.resMode }, { v: 'dir', l: L.dirMode }], resMode, (v) => { resMode = v; bt = 0; });
    button(panes.res, L.build, () => { bt = 0; }, true);
    const stage = makeCanvas(host, (w) => (w < 560 ? 336 : 240));
    const src = codeBlock(host);
    const out = readout(host);

    function bar(ctx, c, x, y, w, frac, color, label, value) {
      text(ctx, fit(ctx, label, w - tw(ctx, value) - 12), x, y, c.muted);
      text(ctx, value, x + w, y, c.text, { align: 'right' });
      ctx.fillStyle = c.soft; roundRect(ctx, x, y + 9, w, 12, 6); ctx.fill();
      ctx.fillStyle = color; roundRect(ctx, x, y + 9, Math.max(frac > 0 ? 6 : 0, w * clamp(frac, 0, 1)), 12, 6); ctx.fill();
    }

    function drawRef(ctx, c, w, h) {
      const ref = handles.length + insts.length;
      const target = ref > 0 ? 20 + insts.length * 2 : 0;
      memShow = lerp(memShow, target, 0.12);
      const narrow = w < 560;
      const bb = narrow ? { x: 8, y: 8, w: w - 16, h: 78 } : { x: 8, y: 8, w: w * 0.36, h: h - 70 };
      // Bundle con el asset
      if (ref > 0) { ctx.fillStyle = c.accentSoft; roundRect(ctx, bb.x, bb.y, bb.w, bb.h, 10); ctx.fill(); }
      ctx.strokeStyle = ref > 0 ? c.accent : c.border; ctx.lineWidth = 2; dashed(ctx, ref === 0);
      roundRect(ctx, bb.x, bb.y, bb.w, bb.h, 10); ctx.stroke(); dashed(ctx, false);
      text(ctx, fit(ctx, 'enemies.bundle · ' + (ref > 0 ? L.loaded : L.unloaded), bb.w - 16), bb.x + 10, bb.y + 14, ref > 0 ? c.accent : c.muted);
      const ax = bb.x + 12, ay = bb.y + 28, aw = Math.min(150, bb.w - 70), ah = Math.min(40, bb.h - 36);
      ctx.globalAlpha = ref > 0 ? 1 : 0.4;
      box(ctx, ax, ay, aw, ah, fit(ctx, 'Goblin.prefab', aw - 10), ref > 0 ? c.accent : c.soft, ref > 0 ? '#fff' : c.muted);
      ctx.globalAlpha = 1;
      const bx = ax + aw + 26, by = ay + ah / 2;
      circle(ctx, bx, by, 17, ref > 0 ? c.warn : c.soft);
      text(ctx, String(ref), bx, by, ref > 0 ? '#fff' : c.muted, { align: 'center' });
      text(ctx, 'ref', bx + 22, by, c.muted);
      // Handles e instancias
      const rx = narrow ? 8 : bb.x + bb.w + 16, rw = narrow ? w - 16 : w - rx - 8;
      const ry = narrow ? bb.y + bb.h + 10 : 8;
      const chipRow = (y, label, list, prefix, color) => {
        text(ctx, label, rx, y + 8, c.muted);
        if (!list.length) { text(ctx, '— ' + L.none, rx, y + 30, c.muted); return; }
        let x = rx;
        const max = Math.max(1, Math.floor(rw / 54));
        list.slice(0, max).forEach((it, i) => {
          const loading = t - it.t0 < 0.45;
          const lbl = (i === max - 1 && list.length > max) ? '+' + (list.length - max + 1) : prefix + it.id + (loading ? '…' : ' ✓');
          box(ctx, x, y + 18, 48, 24, lbl, loading ? c.soft : color, loading ? c.muted : '#fff', { r: 6, mono: true });
          if (loading) { ctx.fillStyle = color; ctx.fillRect(x + 4, y + 38, 40 * (t - it.t0) / 0.45, 2); }
          x += 54;
        });
      };
      chipRow(ry, L.handles + ' (LoadAssetAsync)', handles, 'h', c.accent);
      chipRow(ry + 52, L.insts + ' (InstantiateAsync)', insts, 'g', c.ok);
      // Memoria
      const my = h - 34;
      bar(ctx, c, 8, my, w - 16, memShow / 40, memShow > 1 ? c.warn : c.ok, L.mem + ' (bundle + asset + ' + L.insts.toLowerCase() + ')', memShow.toFixed(0) + ' MB');
      const m = {}; if (lastAct >= 0) m[lastAct] = lastAct % 2 ? 'ok' : 'hl';
      src('var handle = Addressables.LoadAssetAsync<GameObject>("Goblin");\nAddressables.Release(handle);\nvar op = Addressables.InstantiateAsync("Goblin");\nAddressables.ReleaseInstance(op.Result);', m);
      out((t - warnT < 2 ? L.nothing + '<p>' : '') + L.vRef(ref) + (t - warnT < 2 ? '</p>' : '') + '<p>' + L.vRule + '</p>');
    }

    function drawLeak(ctx, c, w, h, dt) {
      const LIMIT = 2048, BASE = 300, ROOM = 70;
      if (sim.crash > 0) { sim.crash -= dt; if (sim.crash <= 0) resetSim(); }
      else {
        sim.mins += dt * 15; sim.acc += dt;
        if (sim.acc >= 0.7) {
          sim.acc = 0; sim.room++;
          if (rel && sim.loaded.length) sim.loaded = [];
          sim.loaded.push(sim.room); sim.visited.push(sim.room);
          if (sim.visited.length > 40) sim.visited.shift();
        }
      }
      const mem = BASE + sim.loaded.length * ROOM;
      sim.sAcc += dt;
      if (sim.sAcc > 0.1) { sim.sAcc = 0; sim.samples.push(mem); if (sim.samples.length > 160) sim.samples.shift(); }
      if (mem > LIMIT && sim.crash <= 0) sim.crash = 1.6;
      const gx = 8, gy = 24, gw = w - 16, gh = h - 92;
      text(ctx, L.played + ': ' + Math.floor(sim.mins / 60) + ' h ' + Math.floor(sim.mins % 60) + ' min', gx, 10, c.text);
      text(ctx, L.mem + ': ' + mem + ' MB', gx + gw, 10, mem > LIMIT * 0.8 ? c.bad : c.text, { align: 'right' });
      panel(ctx, c, gx, gy, gw, gh, '');
      const MAXY = LIMIT * 1.15;
      const Yp = (v) => gy + gh - 6 - (v / MAXY) * (gh - 12);
      ctx.strokeStyle = c.bad; ctx.lineWidth = 1.5; dashed(ctx, true);
      ctx.beginPath(); ctx.moveTo(gx, Yp(LIMIT)); ctx.lineTo(gx + gw, Yp(LIMIT)); ctx.stroke(); dashed(ctx, false);
      text(ctx, L.limit + ' (2 GB)', gx + gw - 6, Yp(LIMIT) - 9, c.bad, { align: 'right' });
      ctx.strokeStyle = rel ? c.ok : c.warn; ctx.lineWidth = 2.5; ctx.beginPath();
      sim.samples.forEach((v, i) => { const x = gx + 6 + (i / 159) * (gw - 12); if (i) ctx.lineTo(x, Yp(v)); else ctx.moveTo(x, Yp(v)); });
      ctx.stroke();
      if (sim.crash > 0) { ctx.fillStyle = c.badSoft; roundRect(ctx, gx, gy, gw, gh, 8); ctx.fill(); text(ctx, '💥 ' + L.crash, gx + gw / 2, gy + gh / 2, c.bad, { align: 'center' }); }
      // Salas recientes
      const ty = h - 56;
      text(ctx, L.rooms + ': ' + sim.loaded.length, gx, ty, c.muted);
      const n = Math.max(1, Math.floor(gw / 44));
      sim.visited.slice(-n).forEach((r, i) => {
        const on = sim.loaded.indexOf(r) >= 0;
        const x = gx + i * 44;
        if (on) box(ctx, x, ty + 10, 40, 30, 'R' + r, c.warn, '#fff', { r: 6, mono: true });
        else { ctx.strokeStyle = c.border; ctx.lineWidth = 1.5; dashed(ctx, true); roundRect(ctx, x, ty + 10, 40, 30, 6); ctx.stroke(); dashed(ctx, false); text(ctx, 'R' + r, x + 20, ty + 25, c.muted, { align: 'center', mono: true }); }
      });
      src('void EnterRoom(string key) {\n    roomHandle = Addressables.LoadAssetAsync<GameObject>(key);\n}\nvoid ExitRoom() {\n    Addressables.Release(roomHandle);\n}', rel ? { 1: 'hl', 4: 'ok' } : { 1: 'hl', 4: 'off' });
      out(rel ? L.vNoLeak : L.vLeak);
    }

    function drawRes(ctx, c, w, h, dt) {
      bt += dt;
      const narrow = w < 560;
      const inc = (i) => resMode === 'res' || USED.indexOf(i) >= 0;
      const list = []; for (let i = 0; i < N; i++) if (inc(i)) list.push(i);
      const pw = narrow ? w - 16 : w * 0.46;
      const cols = 8, ts = Math.min(22, Math.floor((pw - 16 - (cols - 1) * 4) / cols));
      const rowsN = N / cols;
      const ph = rowsN * (ts + 4) + 30;
      const pr = { x: 8, y: 8, w: pw, h: ph };
      const br = narrow ? { x: 8, y: pr.y + ph + 10, w: w - 16, h: ph } : { x: w - pw - 8, y: 8, w: pw, h: ph };
      panel(ctx, c, pr.x, pr.y, pr.w, pr.h, L.project + ' · Assets/Resources/');
      panel(ctx, c, br.x, br.y, br.w, br.h, L.buildBox);
      const cell = (r, i) => ({ x: r.x + 8 + (i % cols) * (ts + 4), y: r.y + 24 + Math.floor(i / cols) * (ts + 4) });
      for (let i = 0; i < N; i++) {
        const p = cell(pr, i);
        const used = USED.indexOf(i) >= 0;
        ctx.fillStyle = used ? c.accent : c.warn; ctx.globalAlpha = used ? 1 : 0.4; roundRect(ctx, p.x, p.y, ts, ts, 4); ctx.fill(); ctx.globalAlpha = 1;
      }
      // Tiles que viajan a la build
      const BUILD = 1.4;
      list.forEach((i, k) => {
        const start = (k / list.length) * BUILD * 0.8;
        const f = clamp((bt - start) / 0.35, 0, 1);
        if (f <= 0) return;
        const a = cell(pr, i), b = cell(br, k);
        const x = lerp(a.x, b.x, ease(f)), y = lerp(a.y, b.y, ease(f));
        ctx.fillStyle = USED.indexOf(i) >= 0 ? c.accent : c.warn; roundRect(ctx, x, y, ts, ts, 4); ctx.fill();
      });
      // Leyenda y barras
      const ly = br.y + br.h + 12;
      ctx.fillStyle = c.accent; roundRect(ctx, 8, ly - 5, 10, 10, 2); ctx.fill();
      text(ctx, L.used, 22, ly, c.muted);
      const lw2 = tw(ctx, L.used) + 36;
      ctx.fillStyle = c.warn; roundRect(ctx, 8 + lw2, ly - 5, 10, 10, 2); ctx.fill();
      text(ctx, fit(ctx, lang === 'es' ? 'sin usar' : 'unused', w - lw2 - 30), 22 + lw2, ly, c.muted);
      const by = ly + 16;
      const done = clamp(bt / BUILD, 0, 1);
      const bw = narrow ? w - 16 : (w - 32) / 2;
      bar(ctx, c, 8, by, bw, done * list.length / N, resMode === 'res' ? c.warn : c.ok, L.size, Math.round(done * list.length) + '/' + N + ' assets');
      const sf = clamp((bt - BUILD) / 1.4, 0, 1);
      const sx = narrow ? 8 : 24 + bw, sy = narrow ? by + 34 : by;
      bar(ctx, c, sx, sy, bw, resMode === 'res' ? sf : 0, c.warn, L.start + ': ' + (resMode === 'res' ? L.index : L.noIndex), resMode === 'res' ? Math.round(sf * N) + '/' + N : '—');
      src(resMode === 'res'
        ? 'GameObject boss = Resources.Load<GameObject>("Enemies/Boss");'
        : '[SerializeField] GameObject bossPrefab;   // ' + (lang === 'es' ? 'referencia directa' : 'direct reference') + '\nvar h = Addressables.LoadAssetAsync<GameObject>("Boss");',
      resMode === 'res' ? { 0: 'bad' } : { 0: 'ok', 1: 'ok' });
      out((resMode === 'res' ? L.vRes : L.vDir) + ' <span class="muted small">' + L.illus + '</span>');
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'ref') drawRef(ctx, c, w, h);
      else if (tab === 'leak') drawLeak(ctx, c, w, h, dt);
      else drawRes(ctx, c, w, h, dt);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     9. AudioMixer snapshots: TransitionTo
     --------------------------------------------------------- */

  function mountMixerSnapshots(host, lang) {
    const L = {
      es: { snap: 'Snapshots + TransitionTo', manual: 'Cada AudioSource a mano', trans: 'Tiempo de transición', dive: 'Sumergirse / salir', auto: 'Automático',
        water: 'Agua', sources: 'AudioSources de la escena', viaMixer: 'todas pasan por el grupo SFX del mixer', newer: 'creada después: sin filtro', touched: 'fuentes modificadas',
        trans2: (p) => code('TransitionTo') + ' interpolando: <b>' + p + '%</b>',
        vSnap: '✓ Un solo ' + code('TransitionTo') + ' interpola <b>todos</b> los parámetros del mixer (volumen y efectos de los grupos, como el Lowpass) durante el tiempo indicado. No tocas ninguna fuente.',
        vMan: (n) => '✗ Recorres y cambias cada fuente: <b>' + n + '</b> cambios hasta ahora, el cambio es brusco (tendrías que interpolarlo tú) y las fuentes creadas después se quedan sin filtro.' },
      en: { snap: 'Snapshots + TransitionTo', manual: 'Every AudioSource by hand', trans: 'Transition time', dive: 'Dive / surface', auto: 'Automatic',
        water: 'Water', sources: 'AudioSources in the scene', viaMixer: 'all routed through the mixer SFX group', newer: 'created later: unfiltered', touched: 'sources changed',
        trans2: (p) => code('TransitionTo') + ' interpolating: <b>' + p + '%</b>',
        vSnap: '✓ A single ' + code('TransitionTo') + ' interpolates <b>all</b> mixer parameters (volume and group effects such as the Lowpass) over the given time. You touch no source at all.',
        vMan: (n) => '✗ You loop over and change every source: <b>' + n + '</b> changes so far, the change is abrupt (you would have to interpolate it yourself) and sources created later stay unfiltered.' }
    }[lang];
    const NS = 24, BANDS = 20, FMIN = 40, FMAX = 20000;
    let approach = 'snap', trans = 0.5, auto = true, under = false, b = 0, timer = 0, touched = 0, t = 0, diver = 0;
    const lv = new Array(BANDS).fill(0);
    function setUnder(v) {
      if (v === under) return;
      under = v;
      if (approach === 'manual') { b = under ? 1 : 0; touched += NS - 1; }
    }
    const ctl = controls(host);
    seg(ctl, [{ v: 'snap', l: L.snap }, { v: 'manual', l: L.manual }], approach, (v) => { approach = v; touched = 0; b = under ? 1 : 0; });
    button(ctl, L.dive, () => { timer = 0; setUnder(!under); }, true);
    toggle(ctl, L.auto, auto, (v) => { auto = v; });
    slider(ctl, L.trans, 0, 2, 0.1, trans, (v) => { trans = v; }, (v) => v.toFixed(1) + ' s');
    const stage = makeCanvas(host, (w) => (w < 560 ? 400 : 260));
    const src = codeBlock(host);
    const out = readout(host);
    const fx = (i) => FMIN * Math.pow(FMAX / FMIN, i / (BANDS - 1));
    const hz = (f) => (f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1) + ' kHz' : Math.round(f) + ' Hz');

    const stop = loop((dt) => {
      t += dt;
      if (auto) { timer += dt; if (timer > 3.4) { timer = 0; setUnder(!under); } }
      diver = clamp(diver + (under ? dt : -dt) * 2.2, 0, 1);
      if (approach === 'snap') {
        const target = under ? 1 : 0;
        if (trans <= 0) b = target; else b = target > b ? Math.min(target, b + dt / trans) : Math.max(target, b - dt / trans);
      }
      const cutoff = lerp(22000, 800, b), volDb = lerp(0, -4, b), gain = Math.pow(10, volDb / 20);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const sc = narrow ? { x: 8, y: 8, w: w - 16, h: 110 } : { x: 8, y: 8, w: w * 0.34, h: h - 16 };
      const sp = narrow ? { x: 8, y: 128, w: w - 16, h: h - 128 - 64 } : { x: sc.w + 20, y: 8, w: w - sc.w - 28, h: h - 16 - 64 };
      const sr = { x: sp.x, y: sp.y + sp.h + 8, w: sp.w };
      // Escena: superficie del agua y buceador
      ctx.save(); roundRect(ctx, sc.x, sc.y, sc.w, sc.h, 8); ctx.clip();
      ctx.fillStyle = c.soft; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
      const surf = sc.y + sc.h * 0.42;
      ctx.fillStyle = WATER(0.45); ctx.beginPath(); ctx.moveTo(sc.x, sc.y + sc.h);
      for (let x = 0; x <= sc.w; x += 6) ctx.lineTo(sc.x + x, surf + Math.sin(x * 0.06 + t * 2.5) * 3);
      ctx.lineTo(sc.x + sc.w, sc.y + sc.h); ctx.closePath(); ctx.fill();
      text(ctx, L.water, sc.x + 8, sc.y + sc.h - 12, c.text);
      const dx = sc.x + sc.w / 2, dy = lerp(surf - 22, sc.y + sc.h * 0.78, ease(diver));
      if (diver > 0.5) for (let k = 0; k < 4; k++) { const ph = (t * 0.8 + k / 4) % 1; ring(ctx, dx + 8 + Math.sin(ph * 9 + k) * 4, dy - 10 - ph * (dy - surf - 6), 2.5, 'rgba(255,255,255,.8)', 1.2); }
      agentDot(ctx, dx, dy, 11, c.accent);
      ctx.restore();
      // Snapshots
      const chipW = Math.min(110, (sp.w - 40) / 2);
      box(ctx, sp.x, sp.y, chipW, 24, 'Normal', b < 0.5 ? c.accent : c.soft, b < 0.5 ? '#fff' : c.muted, { r: 12 });
      box(ctx, sp.x + sp.w - chipW, sp.y, chipW, 24, fit(ctx, 'Underwater', chipW - 8), b >= 0.5 ? c.accent : c.soft, b >= 0.5 ? '#fff' : c.muted, { r: 12 });
      const lx0 = sp.x + chipW + 8, lx1 = sp.x + sp.w - chipW - 8;
      ctx.fillStyle = c.border; ctx.fillRect(lx0, sp.y + 11, lx1 - lx0, 2);
      circle(ctx, lerp(lx0, lx1, b), sp.y + 12, 6, c.warn);
      // Espectro
      const ax = sp.x, ay = sp.y + 36, aw = sp.w, ah = sp.h - 54;
      ctx.fillStyle = c.soft; roundRect(ctx, ax, ay, aw, ah, 6); ctx.fill();
      const bw = aw / BANDS;
      for (let i = 0; i < BANDS; i++) {
        const f = fx(i);
        const base = (0.55 + 0.3 * Math.sin(t * (1.7 + i * 0.41) + i * 1.9) + 0.12 * Math.sin(t * 7.3 + i)) * (1 - i / (BANDS * 2.4));
        const g = 1 / Math.sqrt(1 + Math.pow(f / cutoff, 4));
        lv[i] = lerp(lv[i], clamp(base * g * gain, 0, 1), 0.25);
        const bh = lv[i] * (ah - 8);
        ctx.fillStyle = g < 0.5 ? c.muted : c.ok;
        ctx.fillRect(ax + i * bw + 2, ay + ah - 4 - bh, bw - 4, bh);
      }
      const cxp = ax + (Math.log(cutoff / FMIN) / Math.log(FMAX / FMIN)) * aw;
      ctx.strokeStyle = c.warn; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(clamp(cxp, ax + 1, ax + aw - 1), ay); ctx.lineTo(clamp(cxp, ax + 1, ax + aw - 1), ay + ah); ctx.stroke();
      const lbl = 'Lowpass ' + hz(cutoff);
      text(ctx, lbl, clamp(cxp - 4, ax + tw(ctx, lbl) + 4, ax + aw - 4), ay + 12, c.warn, { align: 'right' });
      text(ctx, '40 Hz', ax, ay + ah + 9, c.muted);
      text(ctx, '20 kHz', ax + aw, ay + ah + 9, c.muted, { align: 'right' });
      text(ctx, volDb.toFixed(1) + ' dB', ax + aw / 2, ay + ah + 9, c.text, { align: 'center' });
      // Fuentes
      text(ctx, fit(ctx, L.sources + ' (' + NS + ') · ' + (approach === 'snap' ? L.viaMixer : L.touched + ': ' + touched), sr.w), sr.x, sr.y + 6, c.muted);
      const dot = Math.min(10, (sr.w - 4) / NS - 2);
      for (let i = 0; i < NS; i++) {
        const isNew = i === NS - 1;
        const filtered = approach === 'snap' ? b > 0.5 : (b > 0.5 && !isNew);
        circle(ctx, sr.x + dot / 2 + i * (dot + 2), sr.y + 24, dot / 2, filtered ? c.accent : (isNew && approach === 'manual' && b > 0.5 ? c.bad : c.border));
      }
      if (approach === 'manual' && b > 0.5) text(ctx, fit(ctx, '↑ ' + L.newer, sr.w), sr.x + sr.w, sr.y + 42, c.bad, { align: 'right' });
      const tt = trans.toFixed(1) + 'f';
      if (approach === 'snap') {
        src('public AudioMixerSnapshot normal, underwater;\nvoid OnTriggerEnter(Collider other) {\n    if (other.CompareTag("Water")) underwater.TransitionTo(' + tt + ');\n}\nvoid OnTriggerExit(Collider other) {\n    if (other.CompareTag("Water")) normal.TransitionTo(' + tt + ');\n}', under ? { 2: 'ok' } : { 5: 'ok' });
      } else {
        src('void OnTriggerEnter(Collider other) {\n    foreach (var s in FindObjectsByType<AudioSource>(FindObjectsSortMode.None))\n        s.GetComponent<AudioLowPassFilter>().cutoffFrequency = 800f;\n}', { 1: 'bad', 2: 'bad' });
      }
      const moving = approach === 'snap' && b > 0 && b < 1;
      out('Cutoff <b>' + hz(cutoff) + '</b> · ' + (lang === 'es' ? 'volumen' : 'volume') + ' <b>' + volDb.toFixed(1) + ' dB</b>' + (moving ? ' · ' + L.trans2(Math.round((under ? b : 1 - b) * 100)) : '') +
        '<p>' + (approach === 'snap' ? L.vSnap : L.vMan(touched)) + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     Catálogo
     --------------------------------------------------------- */

  UCP.concepts.push(
    {
      id: 'audio-source', questions: ['scn-01', 'scn-03'], domain: 'scene', icon: '🔊', mount: mountAudioSource,
      text: {
        es: {
          title: 'AudioSource: Play vs PlayOneShot y destruir la fuente',
          summary: 'Un `AudioSource` reproduce **un** clip asignado: `Play()` lo reinicia, así que un arma rápida corta su propio sonido. `PlayOneShot(clip)` superpone el sonido sin interrumpir lo que ya suena. Y si destruyes el objeto que lleva la fuente, el sonido muere con él. Dispara en los dos modos y luego haz explotar el barril.',
          points: ['Sonidos que se solapan (disparos, pasos): `PlayOneShot(clip)`.', '`Play()` reinicia el `clip` de la fuente y corta lo anterior.', 'Destruir el GameObject destruye su `AudioSource`: usa `AudioSource.PlayClipAtPoint(clip, pos)`, que crea un objeto temporal.', 'En proyectos grandes: un **pool** de AudioSources.', 'Solo **un** `AudioListener` activo (normalmente en la cámara).']
        },
        en: {
          title: 'AudioSource: Play vs PlayOneShot and destroying the source',
          summary: 'An `AudioSource` plays **one** assigned clip: `Play()` restarts it, so a fast weapon cuts off its own sound. `PlayOneShot(clip)` layers the sound without interrupting what is already playing. And if you destroy the object that holds the source, the sound dies with it. Fire in both modes, then blow up the barrel.',
          points: ['Overlapping sounds (shots, footsteps): `PlayOneShot(clip)`.', '`Play()` restarts the source\'s `clip` and cuts what was playing.', 'Destroying the GameObject destroys its `AudioSource`: use `AudioSource.PlayClipAtPoint(clip, pos)`, which creates a temporary object.', 'In large projects: a **pool** of AudioSources.', 'Only **one** active `AudioListener` (usually on the camera).']
        }
      }
    },
    {
      id: 'spatial-blend', questions: ['scn-02'], domain: 'scene', icon: '🎧', mount: mountSpatialBlend,
      text: {
        es: {
          title: 'Spatial Blend: sonido 2D vs 3D',
          summary: 'Con **Spatial Blend** en 0 el sonido es 2D: se oye igual en toda la escena. En 1 es 3D: se atenúa con la distancia al `AudioListener` según el rolloff y se panea a izquierda o derecha según la dirección. Mueve el slider y arrastra al jugador cerca y lejos de la cascada.',
          points: ['Sonido que depende de la distancia: **Spatial Blend = 1 (3D)**.', '0 = 2D: mismo volumen y sin paneo en cualquier punto.', 'Por debajo de **Min Distance** suena al máximo; el rolloff logarítmico atenúa hasta **Max Distance**.', 'El paneo depende de hacia dónde está la fuente respecto al listener.']
        },
        en: {
          title: 'Spatial Blend: 2D vs 3D sound',
          summary: 'With **Spatial Blend** at 0 the sound is 2D: it sounds the same everywhere in the scene. At 1 it is 3D: it fades with distance to the `AudioListener` following the rolloff, and pans left or right by direction. Move the slider and drag the player close to and far from the waterfall.',
          points: ['Distance-dependent sound: **Spatial Blend = 1 (3D)**.', '0 = 2D: same volume and no panning anywhere.', 'Inside **Min Distance** it plays at full volume; the logarithmic rolloff fades it out towards **Max Distance**.', 'Panning depends on where the source is relative to the listener.']
        }
      }
    },
    {
      id: 'destroy-null', questions: ['scn-04', 'scn-05'], domain: 'scene', icon: '🪦', mount: mountDestroyNull,
      text: {
        es: {
          title: 'Destroy, == null y el «falso null»',
          summary: '`Destroy` no borra el objeto en el acto: lo marca y Unity lo destruye al final del frame, después del bucle de Update y antes de renderizar. Después, el objeto C# sigue existiendo aunque el nativo ya no: Unity sobrecarga `==` para que se compare como null, pero `?.` y `??` no usan esa sobrecarga. Mira la línea de tiempo y luego prueba cada comprobación tras destruir.',
          points: ['`Destroy(obj); Debug.Log(obj == null);` en el mismo frame → **False**.', 'En el frame siguiente, `obj == null` → **True**.', '`DestroyImmediate` es inmediato, pero solo para código de Editor.', '`?.` y `??` miran la referencia C#: un objeto destruido «pasa» la comprobación.', 'Usa `if (target != null)` o `if (target)`.']
        },
        en: {
          title: 'Destroy, == null and the “fake null”',
          summary: '`Destroy` does not delete the object right away: it marks it and Unity destroys it at the end of the frame, after the Update loop and before rendering. Afterwards, the C# object still exists even though the native one is gone: Unity overloads `==` so it compares as null, but `?.` and `??` do not use that overload. Watch the timeline, then try each check after destroying.',
          points: ['`Destroy(obj); Debug.Log(obj == null);` in the same frame → **False**.', 'In the next frame, `obj == null` → **True**.', '`DestroyImmediate` is immediate, but only meant for Editor code.', '`?.` and `??` check the C# reference: a destroyed object “passes” the check.', 'Use `if (target != null)` or `if (target)`.']
        }
      }
    },
    {
      id: 'instantiate-parent', questions: ['scn-08'], domain: 'scene', icon: '🧬', mount: mountInstantiateParent,
      text: {
        es: {
          title: 'Instantiate con padre: qué sobrecarga usar',
          summary: 'El prefab guarda la posición (2, 1) y el contenedor `Enemies` está desplazado y girado. Cada sobrecarga de `Instantiate` interpreta las coordenadas de forma distinta. Elige una y mira dónde aparece el clon y dónde queda en la jerarquía; luego mueve el contenedor para ver quién es hijo.',
          points: ['Posición y rotación del mundo + hijo en un paso: `Instantiate(prefab, position, rotation, parent)`.', '`Instantiate(prefab, parent)`: la posición del prefab pasa a ser **local** al padre.', '`Instantiate(prefab, parent, true)`: conserva la posición del prefab en el mundo.', 'Cambiar el padre después (`SetParent`) es un paso extra con más trabajo.']
        },
        en: {
          title: 'Instantiate with a parent: which overload',
          summary: 'The prefab stores position (2, 1) and the `Enemies` container is offset and rotated. Each `Instantiate` overload reads the coordinates differently. Pick one and see where the clone appears and where it sits in the hierarchy; then move the container to see who is a child.',
          points: ['World position and rotation + child in one step: `Instantiate(prefab, position, rotation, parent)`.', '`Instantiate(prefab, parent)`: the prefab position becomes **local** to the parent.', '`Instantiate(prefab, parent, true)`: keeps the prefab\'s world position.', 'Setting the parent afterwards (`SetParent`) is an extra step with extra work.']
        }
      }
    },
    {
      id: 'navmesh-links-bake', questions: ['scn-11', 'scn-12'], domain: 'scene', icon: '🌉', mount: mountNavLinksBake,
      text: {
        es: {
          title: 'NavMeshLink y bake de la NavMesh en runtime',
          summary: 'Dos zonas de la NavMesh separadas por un hueco no están conectadas: el agente solo obtiene una ruta parcial. Un `NavMeshLink` las une y el agente lo cruza (puedes detectarlo con `agent.isOnOffMeshLink`). Y si el nivel se genera en runtime, no hay NavMesh hasta que la horneas con `NavMeshSurface.BuildNavMesh()`. Activa el enlace y, en la otra pestaña, genera un nivel y prueba los botones.',
          points: ['Saltos, huecos, escaleras: `NavMeshLink` (u Off-Mesh Link).', '`agent.isOnOffMeshLink` → reproduce la animación de salto.', 'Nivel procedural: `NavMeshSurface.BuildNavMesh()` (paquete **AI Navigation**).', '`UpdateNavMesh` actualiza la malla de forma asíncrona.', '`CalculatePath` calcula una ruta sobre una NavMesh existente; no la crea.']
        },
        en: {
          title: 'NavMeshLink and runtime NavMesh baking',
          summary: 'Two NavMesh regions separated by a gap are not connected: the agent only gets a partial path. A `NavMeshLink` connects them and the agent crosses it (you can detect it with `agent.isOnOffMeshLink`). And if the level is generated at runtime, there is no NavMesh until you bake it with `NavMeshSurface.BuildNavMesh()`. Enable the link and, in the other tab, generate a level and try the buttons.',
          points: ['Jumps, gaps, ladders: `NavMeshLink` (or an Off-Mesh Link).', '`agent.isOnOffMeshLink` → play the jump animation.', 'Procedural level: `NavMeshSurface.BuildNavMesh()` (**AI Navigation** package).', '`UpdateNavMesh` updates the mesh asynchronously.', '`CalculatePath` computes a path on an existing NavMesh; it does not create one.']
        }
      }
    },
    {
      id: 'navmesh-sample-warp', questions: ['scn-13', 'scn-15'], domain: 'scene', icon: '📍', mount: mountNavSampleWarp,
      text: {
        es: {
          title: 'NavMesh.SamplePosition y agent.Warp',
          summary: '`NavMesh.SamplePosition` busca el punto de la NavMesh más cercano dentro de un radio y devuelve `true` con él en `hit.position`; un raycast físico solo ve colliders. Toca el mapa (también muros, agua y agujeros) y compara. En la otra pestaña, teletransporta un agente de cuatro maneras y mira cuál funciona.',
          points: ['Punto de aparición sobre la NavMesh: `NavMesh.SamplePosition(p, out hit, maxDistance, NavMesh.AllAreas)`.', 'Devuelve `false` si no hay NavMesh dentro de `maxDistance`.', 'Teletransportar un agente: `agent.Warp(pos)`; cambiar `transform.position` lo desincroniza.', '`agent.Move` es un desplazamiento relativo y `destination` lo hace caminar.']
        },
        en: {
          title: 'NavMesh.SamplePosition and agent.Warp',
          summary: '`NavMesh.SamplePosition` looks for the nearest NavMesh point within a radius and returns `true` with it in `hit.position`; a physics raycast only sees colliders. Tap the map (walls, water and holes too) and compare. In the other tab, teleport an agent in four ways and see which one works.',
          points: ['Spawn point on the NavMesh: `NavMesh.SamplePosition(p, out hit, maxDistance, NavMesh.AllAreas)`.', 'It returns `false` if there is no NavMesh within `maxDistance`.', 'Teleporting an agent: `agent.Warp(pos)`; setting `transform.position` desyncs it.', '`agent.Move` is a relative offset and `destination` makes it walk.']
        }
      }
    },
    {
      id: 'corrutinas', questions: ['scn-16'], domain: 'scene', icon: '🌀', mount: mountCoroutines,
      text: {
        es: {
          title: 'Corrutinas: SetActive(false) vs enabled = false',
          summary: 'Una corrutina pertenece al MonoBehaviour que la lanzó. Desactivar el GameObject la **detiene** y no se reanuda sola; como `Start` solo se ejecuta una vez, si la lanzaste ahí las oleadas no vuelven. Desactivar solo el componente detiene `Update`, pero **no** las corrutinas. Prueba los botones con la corrutina lanzada en `Start` y en `OnEnable`.',
          points: ['`SetActive(false)` (o destruir el objeto) detiene sus corrutinas.', '`Start` se ejecuta una sola vez: al reactivar, nadie relanza la corrutina.', 'Relánzala en `OnEnable` (y párala en `OnDisable` si hace falta).', '`enabled = false` detiene `Update`, pero no las corrutinas.']
        },
        en: {
          title: 'Coroutines: SetActive(false) vs enabled = false',
          summary: 'A coroutine belongs to the MonoBehaviour that started it. Deactivating the GameObject **stops** it and it does not resume on its own; since `Start` only runs once, if you started it there the waves never come back. Disabling only the component stops `Update`, but **not** coroutines. Try the buttons with the coroutine started in `Start` and in `OnEnable`.',
          points: ['`SetActive(false)` (or destroying the object) stops its coroutines.', '`Start` runs only once: on reactivation nobody restarts the coroutine.', 'Restart it in `OnEnable` (and stop it in `OnDisable` if needed).', '`enabled = false` stops `Update`, but not coroutines.']
        }
      }
    },
    {
      id: 'addressables', questions: ['scn-17', 'scn-18'], domain: 'scene', icon: '🗂️', mount: mountAddressables,
      text: {
        es: {
          title: 'Addressables: recuento de referencias y Resources',
          summary: 'Addressables cuenta referencias: cada `LoadAssetAsync` o `InstantiateAsync` suma 1 y el asset (y su bundle) solo se descarga cuando el contador vuelve a 0. Si nunca llamas a `Release`, la memoria crece sin parar. Pulsa los botones, mira la partida de horas sin `Release` y compara con la carpeta `Resources`, que mete todo en la build.',
          points: ['`Addressables.Release(handle)` por cada `LoadAssetAsync`.', '`ReleaseInstance` por cada `InstantiateAsync`.', 'Olvidar `Release` es la fuga más común con Addressables.', '`Resources/`: todo entra en la build y se indexa al arrancar (tamaño, arranque, memoria).', 'Alternativas: referencias directas y Addressables.']
        },
        en: {
          title: 'Addressables: reference counting and Resources',
          summary: 'Addressables counts references: every `LoadAssetAsync` or `InstantiateAsync` adds 1, and the asset (and its bundle) is only unloaded when the count is back to 0. If you never call `Release`, memory keeps growing. Press the buttons, watch the hours-long session without `Release` and compare with the `Resources` folder, which puts everything into the build.',
          points: ['`Addressables.Release(handle)` for every `LoadAssetAsync`.', '`ReleaseInstance` for every `InstantiateAsync`.', 'Forgetting `Release` is the most common Addressables leak.', '`Resources/`: everything goes into the build and is indexed at startup (size, startup time, memory).', 'Alternatives: direct references and Addressables.']
        }
      }
    },
    {
      id: 'mixer-snapshots', questions: ['scn-19'], domain: 'scene', icon: '🌊', mount: mountMixerSnapshots,
      text: {
        es: {
          title: 'AudioMixer: snapshots y TransitionTo',
          summary: 'Un snapshot guarda el estado de todos los parámetros del AudioMixer, incluidos los efectos de los grupos (como un Lowpass). `underwaterSnapshot.TransitionTo(0.5f)` interpola desde el estado actual durante ese tiempo, sin tocar ninguna fuente. Sumérgete, cambia el tiempo de transición y compara con modificar cada AudioSource a mano.',
          points: ['Dos snapshots (Normal y Bajo el agua) en el mismo AudioMixer.', '`snapshot.TransitionTo(segundos)` interpola de forma gradual.', 'Las fuentes se enrutan a un grupo del mixer: cambias el mixer, no cada fuente.', 'Recorrer cada `AudioSource` es brusco, costoso y olvida las fuentes nuevas.']
        },
        en: {
          title: 'AudioMixer: snapshots and TransitionTo',
          summary: 'A snapshot stores the state of every AudioMixer parameter, including group effects (such as a Lowpass). `underwaterSnapshot.TransitionTo(0.5f)` interpolates from the current state over that time, without touching any source. Dive in, change the transition time and compare with changing every AudioSource by hand.',
          points: ['Two snapshots (Normal and Underwater) in the same AudioMixer.', '`snapshot.TransitionTo(seconds)` interpolates gradually.', 'Sources are routed to a mixer group: you change the mixer, not each source.', 'Looping over every `AudioSource` is abrupt, costly and misses new sources.']
        }
      }
    }
  );
})();
