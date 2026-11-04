/*
 * Zona de conceptos: explicaciones con demos animadas e interactivas (canvas 2D, sin dependencias).
 *
 * Cada concepto:
 * {
 *   id, domain, practice: { d, t },          // enlace a la práctica relacionada (dominio y subtema canónico)
 *   text: { es: { title, summary, points[] }, en: { ... } },
 *   mount(host, lang) -> destroy()           // monta la demo dentro de host y devuelve una función de limpieza
 * }
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     Utilidades para las demos
     --------------------------------------------------------- */

  function colors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    return {
      bg: g('--bg-elev'), soft: g('--bg-soft'), border: g('--border'), text: g('--text'), muted: g('--text-soft'),
      accent: g('--accent'), accentSoft: g('--accent-soft'), ok: g('--ok'), okSoft: g('--ok-soft'),
      bad: g('--bad'), badSoft: g('--bad-soft'), warn: g('--warn'), warnSoft: g('--warn-soft')
    };
  }

  const FONT = '600 12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const MONO = '600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // Canvas que se adapta al ancho del contenedor y a la densidad de píxeles.
  function makeCanvas(host, heightFn, onPointer) {
    const wrap = el('div', 'demo-stage');
    const cv = el('canvas', 'demo-canvas');
    wrap.appendChild(cv);
    host.appendChild(wrap);
    const st = { cv, ctx: cv.getContext('2d'), w: 300, h: 200 };
    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      st.w = Math.max(240, wrap.clientWidth);
      st.h = typeof heightFn === 'function' ? heightFn(st.w) : heightFn;
      cv.width = Math.round(st.w * dpr);
      cv.height = Math.round(st.h * dpr);
      cv.style.height = st.h + 'px';
      st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(wrap); }
    else window.addEventListener('resize', resize);
    if (onPointer) {
      cv.style.cursor = 'pointer';
      cv.addEventListener('click', (e) => {
        const r = cv.getBoundingClientRect();
        onPointer(e.clientX - r.left, e.clientY - r.top);
      });
    }
    st.destroy = () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', resize); };
    return st;
  }

  function loop(fn) {
    let alive = true;
    let last = performance.now();
    let id = requestAnimationFrame(function f(now) {
      if (!alive) return;
      // El timestamp de rAF puede ser anterior a performance.now() en el primer frame: nunca usar dt negativo.
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      fn(dt);
      id = requestAnimationFrame(f);
    });
    return () => { alive = false; cancelAnimationFrame(id); };
  }

  function controls(host) {
    const c = el('div', 'demo-controls');
    host.appendChild(c);
    return c;
  }

  function button(parent, label, onClick, primary) {
    const b = el('button', 'btn demo-btn' + (primary ? ' btn-primary' : ''), label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    parent.appendChild(b);
    return b;
  }

  function seg(parent, options, value, onChange) {
    const g = el('div', 'seg-btns');
    g.setAttribute('role', 'group');
    const btns = options.map((o) => {
      const b = el('button', o.v === value ? 'on' : '', o.l);
      b.type = 'button';
      b.setAttribute('aria-pressed', o.v === value);
      b.addEventListener('click', () => {
        btns.forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('on');
        b.setAttribute('aria-pressed', 'true');
        onChange(o.v);
      });
      g.appendChild(b);
      return b;
    });
    parent.appendChild(g);
    return g;
  }

  function slider(parent, label, min, max, step, value, onInput, format) {
    const w = el('label', 'demo-slider');
    const top = el('span', 'demo-slider-top');
    const name = el('span', '', label);
    const val = el('b', '', format ? format(value) : value);
    top.appendChild(name);
    top.appendChild(val);
    const input = el('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step; input.value = value;
    input.addEventListener('input', () => {
      const v = Number(input.value);
      val.textContent = format ? format(v) : v;
      onInput(v);
    });
    w.appendChild(top);
    w.appendChild(input);
    parent.appendChild(w);
    return input;
  }

  function readout(host) {
    const r = el('div', 'demo-readout');
    r.setAttribute('aria-live', 'polite');
    host.appendChild(r);
    let lastHTML = '';
    return (html) => { if (html !== lastHTML) { r.innerHTML = html; lastHTML = html; } };
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(ctx, s, x, y, color, opts) {
    opts = opts || {};
    ctx.font = opts.mono ? MONO : FONT;
    ctx.fillStyle = color;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.base || 'middle';
    ctx.fillText(s, x, y);
  }

  function code(s) { return '<code>' + s + '</code>'; }

  /* ---------------------------------------------------------
     1. Ciclo de vida y bucle de frames (FixedUpdate vs Update)
     --------------------------------------------------------- */

  function mountLifecycle(host, lang) {
    const L = {
      es: { fps: 'FPS del juego', key: 'Pulsar tecla (GetKeyDown)', frames: 'Frames (Update)', fixed: 'FixedUpdate (cada 0,02 s)',
        frame: 'Frame', calls: 'Orden en este frame', times: 'vez/veces',
        lost: '⚠️ En ese frame FixedUpdate <b>no se ejecutó</b>: si lees <code>GetKeyDown</code> en FixedUpdate, el salto se pierde.',
        caught: 'En ese frame FixedUpdate se ejecutó {n} vez/veces, así que esta vez se detectó… pero no está garantizado. Lee el input en <code>Update</code>.',
        slow: 'Cámara lenta ×0,2' },
      en: { fps: 'Game FPS', key: 'Press key (GetKeyDown)', frames: 'Frames (Update)', fixed: 'FixedUpdate (every 0.02 s)',
        frame: 'Frame', calls: 'Order in this frame', times: 'time(s)',
        lost: '⚠️ FixedUpdate <b>did not run</b> in that frame: if you read <code>GetKeyDown</code> in FixedUpdate, the jump is lost.',
        caught: 'FixedUpdate ran {n} time(s) in that frame, so it was detected this time… but that is not guaranteed. Read input in <code>Update</code>.',
        slow: 'Slow motion ×0.2' }
    }[lang];

    const FIXED = 0.02;
    const WINDOW = 0.3;
    let fps = 72;
    let t = 0;
    let keyFrame = -1;

    const ctl = controls(host);
    slider(ctl, L.fps, 15, 144, 1, fps, (v) => { fps = v; keyFrame = -1; });
    button(ctl, L.key, () => { keyFrame = Math.floor(t * fps); }, true);
    const stage = makeCanvas(host, 170);
    const out = readout(host);

    // Frame k ejecuta los pasos fijos j con j*FIXED en (T(k-1), T(k)].
    function fixedCount(k) {
      const T = k / fps, Tp = (k - 1) / fps;
      if (k === 0) return 1;
      return Math.floor(T / FIXED + 1e-9) - Math.floor(Tp / FIXED + 1e-9);
    }

    const stop = loop((dt) => {
      t += dt * 0.2;
      if (t > WINDOW) { t = 0; keyFrame = -1; }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const pad = 12, x0 = pad, x1 = w - pad;
      const X = (time) => x0 + (time / WINDOW) * (x1 - x0);
      const frameDt = 1 / fps;
      const nFrames = Math.ceil(WINDOW * fps);
      const cur = Math.floor(t * fps);

      text(ctx, L.frames, x0, 14, c.muted);
      text(ctx, L.fixed, x0, 92, c.muted);
      text(ctx, L.slow, x1, 14, c.muted, { align: 'right' });

      for (let k = 0; k < nFrames; k++) {
        const a = X(k * frameDt), b = X(Math.min(WINDOW, (k + 1) * frameDt));
        const isCur = k === cur;
        ctx.fillStyle = isCur ? c.accent : (k % 2 ? c.soft : c.accentSoft);
        ctx.fillRect(a, 28, Math.max(1, b - a - 1), 36);
        if (k === keyFrame) {
          ctx.fillStyle = c.warn;
          ctx.fillRect(a, 24, Math.max(2, b - a - 1), 4);
          text(ctx, '⌨', (a + b) / 2, 76, c.warn, { align: 'center' });
        }
        // Líneas desde cada paso fijo hasta el frame que lo ejecuta.
        const T = k / fps;
        const n = fixedCount(k);
        for (let i = 0; i < n; i++) {
          const j = Math.floor(T / FIXED + 1e-9) - i;
          const fx = X(j * FIXED);
          if (fx > x1) continue;
          ctx.strokeStyle = isCur ? c.accent : c.border;
          ctx.lineWidth = isCur ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(fx, 108);
          ctx.lineTo(a + 1, 64);
          ctx.stroke();
        }
      }
      for (let j = 0; j * FIXED <= WINDOW; j++) {
        const fx = X(j * FIXED);
        ctx.fillStyle = j * FIXED <= t ? c.ok : c.muted;
        ctx.beginPath();
        ctx.arc(fx, 112, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cabezal de reproducción
      const px = X(t);
      ctx.strokeStyle = c.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 22); ctx.lineTo(px, 124); ctx.stroke();

      const n = fixedCount(cur);
      const seq = (n ? 'FixedUpdate ×' + n + ' → ' : '') + 'Update → LateUpdate → Render';
      text(ctx, L.frame + ' ' + cur + ': ' + seq, x0, 146, c.text, { mono: true });

      let msg = '';
      if (keyFrame >= 0) {
        const kn = fixedCount(keyFrame);
        msg = kn === 0 ? L.lost : L.caught.replace('{n}', kn);
      }
      out('<span>' + L.frame + ' ' + cur + ' · FixedUpdate: <b>' + n + '</b> ' + L.times + ' · 1 frame = ' + (frameDt * 1000).toFixed(1) + ' ms</span>' + (msg ? '<p>' + msg + '</p>' : ''));
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     2. Time.deltaTime: movimiento independiente de los FPS
     --------------------------------------------------------- */

  function mountDeltaTime(host, lang) {
    const L = {
      es: { without: 'Sin deltaTime', with: 'Con Time.deltaTime', reset: 'Reiniciar', speed: 'velocidad real', laps: 'vueltas' },
      en: { without: 'Without deltaTime', with: 'With Time.deltaTime', reset: 'Reset', speed: 'actual speed', laps: 'laps' }
    }[lang];
    let useDt = false;
    const lanes = [{ fps: 30, x: 0, acc: 0, laps: 0 }, { fps: 144, x: 0, acc: 0, laps: 0 }];
    const ctl = controls(host);
    seg(ctl, [{ v: false, l: L.without }, { v: true, l: L.with }], false, (v) => { useDt = v; reset(); });
    button(ctl, L.reset, reset);
    const stage = makeCanvas(host, 150);
    const out = readout(host);
    const LEN = 10, PER_FRAME = 0.02, PER_SEC = 1.5;
    function reset() { lanes.forEach((l) => { l.x = 0; l.acc = 0; l.laps = 0; }); }

    const stop = loop((dt) => {
      lanes.forEach((l) => {
        l.acc += dt;
        const fdt = 1 / l.fps;
        while (l.acc >= fdt) {
          l.acc -= fdt;
          l.x += useDt ? PER_SEC * fdt : PER_FRAME;
          if (l.x >= LEN) { l.x -= LEN; l.laps++; }
        }
      });
      const c = colors();
      const { ctx, w } = stage;
      ctx.clearRect(0, 0, w, stage.h);
      const x0 = 70, x1 = w - 20;
      lanes.forEach((l, i) => {
        const y = 40 + i * 60;
        text(ctx, l.fps + ' FPS', 12, y, c.text);
        ctx.fillStyle = c.soft;
        roundRect(ctx, x0, y - 14, x1 - x0, 28, 8); ctx.fill();
        const px = x0 + (l.x / LEN) * (x1 - x0 - 24);
        ctx.fillStyle = i ? c.accent : c.warn;
        roundRect(ctx, px, y - 11, 24, 22, 5); ctx.fill();
      });
      const sp = (l) => (useDt ? PER_SEC : PER_FRAME * l.fps).toFixed(2);
      out(code(useDt ? 'transform.Translate(Vector3.right * speed * Time.deltaTime);' : 'transform.Translate(Vector3.right * speed);') +
        '<p>30 FPS → ' + L.speed + ' <b>' + sp(lanes[0]) + '</b> u/s (' + lanes[0].laps + ' ' + L.laps + ') · 144 FPS → <b>' + sp(lanes[1]) + '</b> u/s (' + lanes[1].laps + ' ' + L.laps + ')</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     3. Tunneling: detección de colisiones Discrete vs Continuous
     --------------------------------------------------------- */

  function mountTunneling(host, lang) {
    const L = {
      es: { speed: 'Velocidad de la bala', hit: '✓ OnCollisionEnter: colisión detectada', miss: '✗ La bala atravesó la pared (tunneling)',
        step: 'Distancia por paso de física', wall: 'grosor de pared + bala' },
      en: { speed: 'Bullet speed', hit: '✓ OnCollisionEnter: collision detected', miss: '✗ The bullet passed through the wall (tunneling)',
        step: 'Distance per physics step', wall: 'wall + bullet thickness' }
    }[lang];
    let mode = 'discrete';
    let speed = 20;
    const R = 0.012, WALL_X = 0.72, WALL_W = 0.012, STEP = 0.02;
    let pos = 0.05, prev = [], state = 'moving', wait = 0, acc = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'discrete', l: 'Discrete' }, { v: 'continuous', l: 'Continuous' }], mode, (v) => { mode = v; reset(); });
    slider(ctl, L.speed, 2, 60, 1, speed, (v) => { speed = v; reset(); }, (v) => v + ' u/s');
    const stage = makeCanvas(host, 130);
    const out = readout(host);
    function reset() { pos = 0.05; prev = []; state = 'moving'; wait = 0; acc = 0; }

    const stop = loop((dt) => {
      if (state === 'moving') {
        acc += dt * (10 / speed) / 3; // cámara lenta: cada disparo dura unos 3 s
        while (acc >= STEP && state === 'moving') {
          acc -= STEP;
          const next = pos + speed * STEP / 10; // 10 u = ancho de la escena
          prev.push(pos);
          if (mode === 'continuous' && pos + R <= WALL_X && next + R >= WALL_X) {
            pos = WALL_X - R; state = 'hit';
          } else {
            pos = next;
            if (Math.abs(pos - (WALL_X + WALL_W / 2)) <= R + WALL_W / 2) state = 'hit';
            else if (pos > 1.05) state = 'miss';
          }
        }
      } else {
        wait += dt;
        if (wait > 1.6) reset();
      }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const X = (v) => 10 + v * (w - 20);
      const y = 60;
      ctx.fillStyle = state === 'hit' ? c.ok : c.text;
      ctx.fillRect(X(WALL_X), 18, Math.max(3, WALL_W * (w - 20)), 84);
      prev.forEach((p, i) => {
        ctx.globalAlpha = 0.15 + 0.5 * (i / prev.length);
        ctx.fillStyle = c.accent;
        ctx.beginPath(); ctx.arc(X(p), y, R * (w - 20), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (mode === 'continuous' && prev.length) {
        ctx.strokeStyle = c.accent; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(X(prev[0]), y); ctx.lineTo(X(Math.min(pos, 1.02)), y); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (pos <= 1.05) {
        ctx.fillStyle = state === 'miss' ? c.bad : c.accent;
        ctx.beginPath(); ctx.arc(X(pos), y, R * (w - 20) + 1, 0, Math.PI * 2); ctx.fill();
      }
      if (state !== 'moving') {
        text(ctx, state === 'hit' ? L.hit : L.miss, w / 2, 118, state === 'hit' ? c.ok : c.bad, { align: 'center' });
      }
      const stepDist = (speed * STEP).toFixed(2), thick = ((WALL_W + 2 * R) * 10).toFixed(2);
      out(L.step + ': <b>' + stepDist + ' u</b> · ' + L.wall + ': <b>' + thick + ' u</b>' +
        (mode === 'discrete' && speed * STEP > (WALL_W + 2 * R) * 10 ? ' → ⚠️ ' + (lang === 'es' ? 'puede saltarse la pared' : 'it can skip the wall') : ''));
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     4. ForceMode: velocidad resultante según el modo y la masa
     --------------------------------------------------------- */

  function mountForceMode(host, lang) {
    const L = {
      es: { mass: 'Masa del Rigidbody', time: 'tiempo (s)', vel: 'velocidad', applied: 'AddForce(10) durante 1 s en FixedUpdate', once: 'AddForce(10) una sola vez' },
      en: { mass: 'Rigidbody mass', time: 'time (s)', vel: 'velocity', applied: 'AddForce(10) for 1 s in FixedUpdate', once: 'AddForce(10) once' }
    }[lang];
    const MODES = [
      { id: 'Force', cont: true, mass: true },
      { id: 'Acceleration', cont: true, mass: false },
      { id: 'Impulse', cont: false, mass: true },
      { id: 'VelocityChange', cont: false, mass: false }
    ];
    let sel = 'Impulse', mass = 2, p = 0;
    const F = 10;
    const ctl = controls(host);
    seg(ctl, MODES.map((m) => ({ v: m.id, l: m.id })), sel, (v) => { sel = v; p = 0; });
    slider(ctl, L.mass, 0.5, 5, 0.5, mass, (v) => { mass = v; p = 0; }, (v) => v + ' kg');
    const stage = makeCanvas(host, (w) => (w < 500 ? 190 : 220));
    const out = readout(host);
    const vAt = (m, t) => {
      const k = m.mass ? F / mass : F;
      if (m.cont) return k * Math.min(t, 1);
      return t >= 0 ? k : 0;
    };
    const palette = (c) => ({ Force: c.accent, Acceleration: c.warn, Impulse: c.ok, VelocityChange: c.bad });

    const stop = loop((dt) => {
      p += dt;
      if (p > 3) p = 0;
      const c = colors();
      const col = palette(c);
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const x0 = 40, x1 = w - 14, y0 = h - 28, y1 = 14;
      const vmax = Math.max(...MODES.map((m) => vAt(m, 2))) * 1.15;
      const X = (t) => x0 + (t / 2) * (x1 - x0);
      const Y = (v) => y0 - (v / vmax) * (y0 - y1);
      ctx.strokeStyle = c.border; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
      for (let s = 0; s <= 2; s += 0.5) text(ctx, String(s), X(s), y0 + 12, c.muted, { align: 'center' });
      text(ctx, L.time, x1, y0 + 12, c.muted, { align: 'right' });
      text(ctx, L.vel, x0 + 4, y1, c.muted);
      const tEnd = Math.min(2, p);
      MODES.forEach((m) => {
        const active = m.id === sel;
        ctx.strokeStyle = col[m.id];
        ctx.globalAlpha = active ? 1 : 0.25;
        ctx.lineWidth = active ? 3 : 2;
        ctx.beginPath();
        const lim = active ? tEnd : 2;
        for (let i = 0; i <= 100; i++) {
          const tt = (i / 100) * lim;
          const vx = X(tt), vy = Y(vAt(m, tt));
          if (i === 0) ctx.moveTo(vx, Y(0));
          ctx.lineTo(vx, vy);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (active) text(ctx, m.id + ': ' + vAt(m, 2).toFixed(1) + ' m/s', X(1.05), Y(vAt(m, 2)) - 10, col[m.id]);
      });
      const m = MODES.find((x) => x.id === sel);
      const formula = m.mass ? 'Δv = F / m = ' + F + ' / ' + mass + ' = ' + (F / mass).toFixed(1) : 'Δv = ' + F + (lang === 'es' ? ' (ignora la masa)' : ' (ignores mass)');
      out('<b>ForceMode.' + m.id + '</b> · ' + (m.cont ? L.applied : L.once) + '<p>' + code(formula + ' m/s') + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     5. LayerMask: bits, desplazamientos y raycast
     --------------------------------------------------------- */

  function mountLayerMask(host, lang) {
    const L = {
      es: { all: 'Todo (~0)', notPlayer: '~(1 << Player)', enemyGround: 'Enemy | Ground', none: 'Nada (0)', hit: 'El raycast golpea', nohit: 'El raycast no golpea nada', mask: 'Máscara' },
      en: { all: 'All (~0)', notPlayer: '~(1 << Player)', enemyGround: 'Enemy | Ground', none: 'Nothing (0)', hit: 'The raycast hits', nohit: 'The raycast hits nothing', mask: 'Mask' }
    }[lang];
    const NAMES = ['Default', 'TransparentFX', 'Ignore Raycast', '—', 'Water', 'UI', '—', '—', 'Player', 'Enemy', 'Ground', 'Pickup'];
    const BITS = NAMES.length;
    const FULL = (1 << BITS) - 1;
    const OBJECTS = [
      { layer: 8, x: 0.1, label: 'Player' },
      { layer: 11, x: 0.32, label: 'Pickup' },
      { layer: 4, x: 0.52, label: 'Water' },
      { layer: 9, x: 0.72, label: 'Enemy' },
      { layer: 10, x: 0.93, label: 'Ground' }
    ];
    let mask = FULL & ~(1 << 2);
    let ray = 0;

    const bitsWrap = el('div', 'bit-grid');
    host.appendChild(bitsWrap);
    const bitBtns = NAMES.map((n, i) => {
      const b = el('button', 'bit', '<small>' + i + '</small>' + n);
      b.type = 'button';
      b.addEventListener('click', () => { mask ^= (1 << i); ray = 0; sync(); });
      bitsWrap.appendChild(b);
      return b;
    });
    const ctl = controls(host);
    button(ctl, L.all, () => { mask = FULL; ray = 0; sync(); });
    button(ctl, L.notPlayer, () => { mask = FULL & ~(1 << 8); ray = 0; sync(); });
    button(ctl, L.enemyGround, () => { mask = (1 << 9) | (1 << 10); ray = 0; sync(); });
    button(ctl, L.none, () => { mask = 0; ray = 0; sync(); });
    const stage = makeCanvas(host, 120);
    const out = readout(host);

    function expr() {
      if (mask === FULL) return '~0';
      if (mask === 0) return '0';
      const on = [], off = [];
      for (let i = 0; i < BITS; i++) (mask & (1 << i) ? on : off).push(i);
      const nm = (i) => (NAMES[i] === '—' ? i : NAMES[i].replace(' ', ''));
      if (off.length === 1) return '~(1 << ' + nm(off[0]) + ')';
      if (off.length <= 2) return '~(' + off.map((i) => '(1 << ' + nm(i) + ')').join(' | ') + ')';
      return on.map((i) => '(1 << ' + nm(i) + ')').join(' | ');
    }
    function sync() { bitBtns.forEach((b, i) => b.classList.toggle('on', !!(mask & (1 << i)))); }
    sync();

    const stop = loop((dt) => {
      ray = Math.min(1, ray + dt * 0.8);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const X = (v) => 16 + v * (w - 32);
      const y = 52;
      // El rayo sale desde dentro del collider del Player: si Player está en la máscara, se golpea a sí mismo.
      const origin = 0.1;
      const hitObj = OBJECTS.filter((o) => o.x >= origin && (mask & (1 << o.layer))).sort((a, b) => a.x - b.x)[0];
      const end = hitObj ? hitObj.x : 1;
      const cur = origin + (end - origin) * ray;
      OBJECTS.forEach((o) => {
        const inMask = !!(mask & (1 << o.layer));
        const isHit = hitObj === o && ray >= 1;
        ctx.fillStyle = isHit ? c.bad : (inMask ? c.accent : c.soft);
        ctx.strokeStyle = c.border;
        roundRect(ctx, X(o.x) - 14, y - 22, 28, 44, 6); ctx.fill(); ctx.stroke();
        text(ctx, o.label, X(o.x), y + 36, inMask ? c.text : c.muted, { align: 'center' });
        text(ctx, String(o.layer), X(o.x), y, inMask || isHit ? '#fff' : c.muted, { align: 'center' });
      });
      ctx.strokeStyle = c.warn; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(X(origin), y); ctx.lineTo(X(cur), y); ctx.stroke();
      const bin = (mask >>> 0).toString(2).padStart(BITS, '0');
      out(L.mask + ': ' + code('int mask = ' + expr() + ';') + ' = <b>' + (mask === FULL ? -1 : mask) + '</b> ' + code(bin) +
        '<p>' + (hitObj ? L.hit + ' <b>' + hitObj.label + '</b> (layer ' + hitObj.layer + ')' : L.nohit) + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     6. Object pooling vs Instantiate/Destroy
     --------------------------------------------------------- */

  function mountPooling(host, lang) {
    const L = {
      es: { rate: 'Disparos por segundo', naive: 'Instantiate / Destroy', pool: 'ObjectPool<T>', inst: 'Instantiate', destroy: 'Destroy', gets: 'Get/Release', created: 'creados', garbage: 'basura', frame: 'tiempo de frame', spike: 'GC spike' },
      en: { rate: 'Shots per second', naive: 'Instantiate / Destroy', pool: 'ObjectPool<T>', inst: 'Instantiate', destroy: 'Destroy', gets: 'Get/Release', created: 'created', garbage: 'garbage', frame: 'frame time', spike: 'GC spike' }
    }[lang];
    let rate = 10;
    const sides = [makeSide(false), makeSide(true)];
    function makeSide(pooled) {
      return { pooled, bullets: [], free: 0, created: 0, inst: 0, destroyed: 0, gets: 0, garbage: 0, flash: 0, samples: new Array(90).fill(6), acc: 0 };
    }
    const ctl = controls(host);
    slider(ctl, L.rate, 2, 30, 1, rate, (v) => { rate = v; });
    const stage = makeCanvas(host, (w) => (w < 560 ? 300 : 200));
    const out = readout(host);

    const stop = loop((dt) => {
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const vertical = w < 560;
      sides.forEach((s, i) => {
        let cost = 6 + Math.random() * 0.6;
        s.acc += dt;
        while (s.acc >= 1 / rate) {
          s.acc -= 1 / rate;
          if (s.pooled) {
            if (s.free > 0) s.free--; else { s.created++; cost += 1.2; }
            s.gets++;
          } else {
            s.inst++; s.garbage += 1; cost += 1.2;
          }
          s.bullets.push(0);
        }
        s.bullets = s.bullets.map((b) => b + dt * 0.9).filter((b) => {
          if (b < 1) return true;
          if (s.pooled) s.free++; else { s.destroyed++; s.garbage += 1; }
          return false;
        });
        if (!s.pooled && s.garbage >= 60) { s.garbage = 0; s.flash = 0.4; cost += 28; }
        s.flash = Math.max(0, s.flash - dt);
        s.samples.push(cost); s.samples.shift();

        const bx = vertical ? 10 : 10 + i * (w / 2), by = vertical ? 10 + i * (h / 2) : 10;
        const bw = vertical ? w - 20 : w / 2 - 20, bh = vertical ? h / 2 - 20 : h - 20;
        ctx.fillStyle = s.flash > 0 ? c.badSoft : c.soft;
        roundRect(ctx, bx, by, bw, bh, 10); ctx.fill();
        text(ctx, s.pooled ? L.pool : L.naive, bx + 10, by + 14, c.text, { mono: true });
        // Balas
        const laneY = by + 42;
        s.bullets.forEach((b) => {
          ctx.fillStyle = s.pooled ? c.ok : c.accent;
          ctx.beginPath(); ctx.arc(bx + 20 + b * (bw - 40), laneY, 5, 0, Math.PI * 2); ctx.fill();
        });
        // Pool de objetos inactivos o medidor de basura
        if (s.pooled) {
          for (let k = 0; k < Math.min(s.free, 24); k++) {
            ctx.fillStyle = c.border;
            ctx.fillRect(bx + 10 + k * 10, laneY + 18, 7, 7);
          }
        } else {
          ctx.fillStyle = c.border; ctx.fillRect(bx + 10, laneY + 18, bw - 20, 7);
          ctx.fillStyle = c.warn; ctx.fillRect(bx + 10, laneY + 18, (bw - 20) * (s.garbage / 60), 7);
          text(ctx, L.garbage, bx + bw - 10, laneY + 34, c.muted, { align: 'right' });
          if (s.flash > 0) text(ctx, L.spike + '!', bx + bw - 10, by + 14, c.bad, { align: 'right' });
        }
        // Gráfica de tiempo de frame
        const gy = by + bh - 10, gh = bh - 90;
        ctx.strokeStyle = s.pooled ? c.ok : c.accent; ctx.lineWidth = 1.5;
        ctx.beginPath();
        s.samples.forEach((v, k) => {
          const x = bx + 10 + (k / (s.samples.length - 1)) * (bw - 20);
          const y = gy - Math.min(1, v / 40) * gh;
          if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        });
        ctx.stroke();
        text(ctx, L.frame, bx + 10, gy - gh - 4, c.muted);
      });
      const a = sides[0], b = sides[1];
      out('<b>' + L.naive + '</b>: ' + L.inst + ' ' + a.inst + ' · ' + L.destroy + ' ' + a.destroyed +
        '<br><b>' + L.pool + '</b>: ' + L.gets + ' ' + b.gets + ' · ' + L.created + ' ' + b.created);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     7. Animator: Has Exit Time y triggers
     --------------------------------------------------------- */

  function mountExitTime(host, lang) {
    const L = {
      es: { on: 'Has Exit Time: ON', off: 'Has Exit Time: OFF', trigger: 'SetTrigger("Attack")', pending: 'Trigger activo (esperando transición)', delay: 'Retraso desde SetTrigger', idle: 'Idle (en bucle)', attack: 'Attack', exit: 'Exit Time 0.9' },
      en: { on: 'Has Exit Time: ON', off: 'Has Exit Time: OFF', trigger: 'SetTrigger("Attack")', pending: 'Trigger set (waiting for transition)', delay: 'Delay since SetTrigger', idle: 'Idle (looping)', attack: 'Attack', exit: 'Exit Time 0.9' }
    }[lang];
    const IDLE = 1.5, ATTACK = 0.8, EXIT = 0.9;
    let exitTime = true, state = 'idle', tIdle = 0, tAtk = 0, trig = false, trigAt = 0, now = 0, lastDelay = null;
    const ctl = controls(host);
    seg(ctl, [{ v: true, l: L.on }, { v: false, l: L.off }], true, (v) => { exitTime = v; });
    button(ctl, L.trigger, () => { trig = true; trigAt = now; }, true);
    const stage = makeCanvas(host, 160);
    const out = readout(host);

    const stop = loop((dt) => {
      now += dt;
      if (state === 'idle') {
        const prevN = (tIdle % IDLE) / IDLE;
        tIdle += dt;
        const n = (tIdle % IDLE) / IDLE;
        const crossed = (prevN < EXIT && n >= EXIT) || (n < prevN && prevN < EXIT);
        if (trig && (!exitTime || crossed)) {
          trig = false; state = 'attack'; tAtk = 0; lastDelay = now - trigAt;
        }
      } else {
        tAtk += dt;
        if (tAtk >= ATTACK) { state = 'idle'; tIdle = 0; }
      }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const bw = Math.min(150, w * 0.35);
      const drawState = (x, label, active, progress) => {
        ctx.fillStyle = active ? c.accent : c.soft;
        roundRect(ctx, x, 20, bw, 46, 10); ctx.fill();
        text(ctx, label, x + bw / 2, 36, active ? '#fff' : c.text, { align: 'center' });
        ctx.fillStyle = active ? 'rgba(255,255,255,.35)' : c.border;
        ctx.fillRect(x + 10, 52, bw - 20, 5);
        ctx.fillStyle = active ? '#fff' : c.muted;
        ctx.fillRect(x + 10, 52, (bw - 20) * progress, 5);
      };
      const xA = 14, xB = w - bw - 14;
      drawState(xA, L.idle, state === 'idle', (tIdle % IDLE) / IDLE);
      drawState(xB, L.attack, state === 'attack', state === 'attack' ? tAtk / ATTACK : 0);
      if (exitTime) {
        ctx.fillStyle = c.warn;
        ctx.fillRect(xA + 10 + (bw - 20) * EXIT - 1, 48, 2, 13);
        text(ctx, L.exit, xA + 10 + (bw - 20) * EXIT, 76, c.warn, { align: 'center' });
      }
      ctx.strokeStyle = trig ? c.warn : c.border; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xA + bw + 6, 43); ctx.lineTo(xB - 10, 43); ctx.stroke();
      ctx.fillStyle = trig ? c.warn : c.border;
      ctx.beginPath(); ctx.moveTo(xB - 4, 43); ctx.lineTo(xB - 12, 38); ctx.lineTo(xB - 12, 48); ctx.fill();
      // Indicador del trigger
      ctx.fillStyle = trig ? c.warn : c.soft;
      ctx.beginPath(); ctx.arc(24, 118, 8, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'Attack (trigger)' + (trig ? ' — ' + L.pending : ''), 40, 118, trig ? c.warn : c.muted);
      out(L.delay + ': <b>' + (lastDelay === null ? '—' : Math.round(lastDelay * 1000) + ' ms') + '</b>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     8. NavMesh: pathfinding, obstáculos con Carve y costes de área
     --------------------------------------------------------- */

  function mountNavMesh(host, lang) {
    const L = {
      es: { doorOpen: 'Puerta abierta', doorClosed: 'Puerta cerrada (Carve)', swamp: 'Pantano', cost1: 'coste 1', cost5: 'coste 5', blocked: 'Not Walkable', tap: 'Toca una celda para mover el destino.', len: 'Longitud', cost: 'coste total', none: 'No hay ruta (SetDestination no encuentra camino completo)' },
      en: { doorOpen: 'Door open', doorClosed: 'Door closed (Carve)', swamp: 'Swamp', cost1: 'cost 1', cost5: 'cost 5', blocked: 'Not Walkable', tap: 'Tap a cell to move the destination.', len: 'Length', cost: 'total cost', none: 'No path (SetDestination cannot find a complete path)' }
    }[lang];
    const COLS = 16, ROWS = 10;
    let doorOpen = true, swampCost = 5;
    let start = { x: 1, y: 5 }, goal = { x: 14, y: 5 };
    const wall = (x, y) => x === 7 && !(y === 0) && !(y === 4 || y === 5);
    const door = (x, y) => x === 7 && (y === 4 || y === 5);
    const swamp = (x, y) => x >= 10 && x <= 12 && y >= 2 && y <= 8;
    function cellCost(x, y) {
      if (wall(x, y)) return Infinity;
      if (door(x, y) && !doorOpen) return Infinity;
      if (swamp(x, y)) return swampCost;
      return 1;
    }
    function astar() {
      const key = (x, y) => y * COLS + x;
      const g = new Map([[key(start.x, start.y), 0]]);
      const from = new Map();
      const open = [{ x: start.x, y: start.y, f: 0 }];
      const hfn = (x, y) => Math.hypot(goal.x - x, goal.y - y);
      const closed = new Set();
      while (open.length) {
        open.sort((a, b) => a.f - b.f);
        const cur = open.shift();
        const k = key(cur.x, cur.y);
        if (closed.has(k)) continue;
        closed.add(k);
        if (cur.x === goal.x && cur.y === goal.y) {
          const path = [{ x: cur.x, y: cur.y }];
          let kk = k;
          while (from.has(kk)) { kk = from.get(kk); path.unshift({ x: kk % COLS, y: Math.floor(kk / COLS) }); }
          return { path, cost: g.get(k) };
        }
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) continue;
          const nx = cur.x + dx, ny = cur.y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const cc = cellCost(nx, ny);
          if (cc === Infinity) continue;
          if (dx && dy && (cellCost(cur.x + dx, cur.y) === Infinity || cellCost(cur.x, cur.y + dy) === Infinity)) continue;
          const ng = g.get(k) + cc * (dx && dy ? Math.SQRT2 : 1);
          const nk = key(nx, ny);
          if (!g.has(nk) || ng < g.get(nk)) {
            g.set(nk, ng); from.set(nk, k);
            open.push({ x: nx, y: ny, f: ng + hfn(nx, ny) });
          }
        }
      }
      return null;
    }
    let result = astar(), agentT = 0;
    function replan() {
      // El agente replanifica desde su posición actual (celda más cercana).
      if (result && result.path.length) {
        const i = Math.max(0, Math.min(result.path.length - 1, Math.floor(agentT)));
        start = result.path[i];
      }
      result = astar();
      agentT = 0;
    }
    const ctl = controls(host);
    seg(ctl, [{ v: true, l: L.doorOpen }, { v: false, l: L.doorClosed }], true, (v) => { doorOpen = v; replan(); });
    seg(ctl, [{ v: 1, l: L.swamp + ' · ' + L.cost1 }, { v: 5, l: L.cost5 }, { v: Infinity, l: L.blocked }], 5, (v) => { swampCost = v; replan(); });
    let geo = { cell: 20, ox: 0, oy: 0 };
    const stage = makeCanvas(host, (w) => Math.round(Math.min(w, 720) / COLS * ROWS) + 4, (px, py) => {
      const x = Math.floor((px - geo.ox) / geo.cell), y = Math.floor((py - geo.oy) / geo.cell);
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || cellCost(x, y) === Infinity) return;
      goal = { x, y };
      replan();
    });
    const out = readout(host);

    const stop = loop((dt) => {
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const cell = Math.floor(Math.min(w / COLS, (h - 4) / ROWS));
      geo = { cell, ox: Math.floor((w - cell * COLS) / 2), oy: 2 };
      const cx = (x) => geo.ox + x * cell, cy = (y) => geo.oy + y * cell;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        let fill = c.soft;
        if (swamp(x, y)) fill = swampCost === Infinity ? c.border : c.warnSoft;
        if (wall(x, y)) fill = c.text;
        if (door(x, y)) fill = doorOpen ? c.okSoft : c.bad;
        ctx.fillStyle = fill;
        ctx.fillRect(cx(x) + 1, cy(y) + 1, cell - 2, cell - 2);
      }
      if (result) {
        ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.beginPath();
        result.path.forEach((p, i) => { const X = cx(p.x) + cell / 2, Y = cy(p.y) + cell / 2; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.stroke();
        agentT = Math.min(result.path.length - 1, agentT + dt * 4);
        const i = Math.floor(agentT), f = agentT - i;
        const a = result.path[i], b = result.path[Math.min(i + 1, result.path.length - 1)];
        const ax = cx(a.x + (b.x - a.x) * f) + cell / 2, ay = cy(a.y + (b.y - a.y) * f) + cell / 2;
        ctx.fillStyle = c.accent;
        ctx.beginPath(); ctx.arc(ax, ay, cell * 0.35, 0, Math.PI * 2); ctx.fill();
        if (agentT >= result.path.length - 1) { start = { x: goal.x, y: goal.y }; }
      } else {
        ctx.fillStyle = c.accent;
        ctx.beginPath(); ctx.arc(cx(start.x) + cell / 2, cy(start.y) + cell / 2, cell * 0.35, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = c.ok; ctx.lineWidth = 3;
      ctx.strokeRect(cx(goal.x) + 3, cy(goal.y) + 3, cell - 6, cell - 6);
      out(L.tap + '<p>' + (result
        ? L.len + ': <b>' + (result.path.length - 1) + '</b> · ' + L.cost + ': <b>' + result.cost.toFixed(1) + '</b>'
        : '⚠️ ' + L.none) + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     9. material vs sharedMaterial vs MaterialPropertyBlock
     --------------------------------------------------------- */

  function mountMaterials(host, lang) {
    const L = {
      es: { tap: 'Toca un enemigo para seleccionarlo.', mat: '.material = rojo', shared: '.sharedMaterial = azul', mpb: 'PropertyBlock = verde', reset: 'Reiniciar', inMem: 'Materiales en memoria', assetChanged: '⚠️ El asset compartido cambió (en el Editor el cambio queda guardado).', batch: 'Con property block: el objeto deja de ser compatible con el SRP Batcher.' },
      en: { tap: 'Tap an enemy to select it.', mat: '.material = red', shared: '.sharedMaterial = blue', mpb: 'PropertyBlock = green', reset: 'Reset', inMem: 'Materials in memory', assetChanged: '⚠️ The shared asset changed (in the Editor the change is saved).', batch: 'With a property block: the object is no longer SRP Batcher compatible.' }
    }[lang];
    const N = 5;
    let shared, enemies, selected, sharedChanged;
    function reset() {
      shared = '#9aa4b8';
      enemies = Array.from({ length: N }, () => ({ instance: null, block: null, shown: '#9aa4b8' }));
      selected = 2; sharedChanged = false;
    }
    reset();
    const ctl = controls(host);
    button(ctl, L.mat, () => { enemies[selected].instance = '#ef4444'; });
    button(ctl, L.shared, () => { shared = '#3d6bff'; sharedChanged = true; });
    button(ctl, L.mpb, () => { enemies[selected].block = '#16a34a'; });
    button(ctl, L.reset, reset);
    let geo = { gap: 60, x0: 30 };
    const stage = makeCanvas(host, 150, (px) => {
      const i = Math.round((px - geo.x0) / geo.gap);
      if (i >= 0 && i < N) selected = i;
    });
    const out = readout(host);
    const mix = (a, b, t) => {
      const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      const ch = (s) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
      const ca = ch(pa), cb = ch(pb);
      return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('');
    };

    const stop = loop((dt) => {
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      geo = { gap: (w - 60) / (N - 1), x0: 30 };
      enemies.forEach((e, i) => {
        const target = e.block || e.instance || shared;
        e.shown = mix(e.shown, target, Math.min(1, dt * 8));
        const x = geo.x0 + i * geo.gap, y = 56;
        if (i === selected) {
          ctx.strokeStyle = c.warn; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = e.shown;
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
        const tag = e.instance ? 'Instance' : 'Shared';
        text(ctx, tag, x, 96, e.instance ? c.bad : c.muted, { align: 'center' });
        if (e.block) text(ctx, 'MPB', x, 112, c.ok, { align: 'center' });
      });
      const inst = enemies.filter((e) => e.instance).length;
      const blocks = enemies.filter((e) => e.block).length;
      out(L.tap + '<p>' + L.inMem + ': <b>' + (1 + inst) + '</b> (1 shared + ' + inst + ' instance)</p>' +
        (sharedChanged ? '<p>' + L.assetChanged + '</p>' : '') + (blocks ? '<p>' + L.batch + '</p>' : ''));
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     10. Time.timeScale: qué se detiene al pausar
     --------------------------------------------------------- */

  function mountTimeScale(host, lang) {
    const L = {
      es: { ts: 'Time.timeScale', scaled: 'Update + deltaTime', unscaled: 'Update + unscaledDeltaTime', physics: 'FixedUpdate (física)', wfs: 'WaitForSeconds(1)', wfsr: 'WaitForSecondsRealtime(1)', updates: 'Llamadas a Update', fixedCalls: 'Llamadas a FixedUpdate' },
      en: { ts: 'Time.timeScale', scaled: 'Update + deltaTime', unscaled: 'Update + unscaledDeltaTime', physics: 'FixedUpdate (physics)', wfs: 'WaitForSeconds(1)', wfsr: 'WaitForSecondsRealtime(1)', updates: 'Update calls', fixedCalls: 'FixedUpdate calls' }
    }[lang];
    let ts = 1;
    const s = { a: 0, b: 0, ballY: 0, ballV: 0, fixedAcc: 0, wfs: 0, wfsAcc: 0, wfsr: 0, wfsrAcc: 0, updates: 0, fixed: 0 };
    const ctl = controls(host);
    const sl = slider(ctl, L.ts, 0, 2, 0.1, ts, (v) => { ts = v; }, (v) => v.toFixed(1));
    const quick = el('div', 'seg-btns');
    [0, 0.5, 1, 2].forEach((v) => {
      const b = el('button', '', String(v));
      b.type = 'button';
      b.addEventListener('click', () => { ts = v; sl.value = v; sl.dispatchEvent(new Event('input')); });
      quick.appendChild(b);
    });
    ctl.appendChild(quick);
    const stage = makeCanvas(host, 220);
    const out = readout(host);

    const stop = loop((dt) => {
      const sdt = dt * ts;
      s.updates++;
      s.a = (s.a + sdt * 0.4) % 1;
      s.b = (s.b + dt * 0.4) % 1;
      s.fixedAcc += sdt;
      while (s.fixedAcc >= 0.02) {
        s.fixedAcc -= 0.02; s.fixed++;
        s.ballV += 9.8 * 0.02; s.ballY += s.ballV * 0.02;
        if (s.ballY >= 1) { s.ballY = 1; s.ballV = -Math.abs(s.ballV) * 0.92; if (Math.abs(s.ballV) < 1.2) s.ballV = -4.2; }
      }
      s.wfsAcc += sdt; if (s.wfsAcc >= 1) { s.wfsAcc -= 1; s.wfs++; }
      s.wfsrAcc += dt; if (s.wfsrAcc >= 1) { s.wfsrAcc -= 1; s.wfsr++; }

      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const lx = 12, tx = Math.min(210, w * 0.45), tw = w - tx - 14;
      const row = (y, label) => text(ctx, label, lx, y, c.text, { mono: true });
      const track = (y, v, color) => {
        ctx.fillStyle = c.soft; roundRect(ctx, tx, y - 9, tw, 18, 9); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(tx + 9 + v * (tw - 18), y, 7, 0, Math.PI * 2); ctx.fill();
      };
      row(22, L.scaled); track(22, s.a, ts === 0 ? c.muted : c.accent);
      row(56, L.unscaled); track(56, s.b, c.ok);
      row(96, L.physics);
      ctx.fillStyle = c.soft; roundRect(ctx, tx, 76, tw, 44, 8); ctx.fill();
      ctx.fillStyle = ts === 0 ? c.muted : c.warn;
      ctx.beginPath(); ctx.arc(tx + tw / 2, 82 + s.ballY * 30, 6, 0, Math.PI * 2); ctx.fill();
      row(146, L.wfs); text(ctx, '⏱ ' + s.wfs, tx, 146, ts === 0 ? c.muted : c.accent, { mono: true });
      row(176, L.wfsr); text(ctx, '⏱ ' + s.wfsr, tx, 176, c.ok, { mono: true });
      text(ctx, 'Time.deltaTime = ' + (sdt).toFixed(4), lx, 206, c.muted, { mono: true });
      out(L.updates + ': <b>' + s.updates + '</b> · ' + L.fixedCalls + ': <b>' + s.fixed + '</b>' +
        (ts === 0 ? '<p>' + (lang === 'es'
          ? 'Con <code>timeScale = 0</code>: Update sigue corriendo, FixedUpdate y <code>WaitForSeconds</code> se congelan, lo <i>unscaled</i> continúa.'
          : 'With <code>timeScale = 0</code>: Update keeps running, FixedUpdate and <code>WaitForSeconds</code> freeze, <i>unscaled</i> keeps going.') + '</p>' : ''));
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     11. Matriz de colisiones: OnCollision vs OnTrigger
     --------------------------------------------------------- */

  function mountCollisionMatrix(host, lang) {
    const TYPES = [
      { short: 'S', rb: false, kin: false, trig: false, es: 'Collider estático', en: 'Static collider' },
      { short: 'RB', rb: true, kin: false, trig: false, es: 'Rigidbody', en: 'Rigidbody' },
      { short: 'K', rb: true, kin: true, trig: false, es: 'Rigidbody cinemático', en: 'Kinematic Rigidbody' },
      { short: 'S·T', rb: false, kin: false, trig: true, es: 'Trigger estático', en: 'Static trigger' },
      { short: 'RB·T', rb: true, kin: false, trig: true, es: 'Rigidbody + trigger', en: 'Rigidbody + trigger' },
      { short: 'K·T', rb: true, kin: true, trig: true, es: 'Cinemático + trigger', en: 'Kinematic + trigger' }
    ];
    const L = {
      es: { tap: 'Toca una celda de la matriz para elegir la pareja A × B.', none: 'Ningún mensaje',
        noRb: 'Ninguno de los dos tiene <code>Rigidbody</code>: la física no comprueba esta pareja.',
        kinKin: 'Ningún <code>Rigidbody</code> es dinámico y no hay trigger: un cinemático no choca con estáticos ni con otros cinemáticos.',
        trig: 'Hay un trigger y al menos un <code>Rigidbody</code> (aunque sea cinemático): <b>ambos</b> reciben <code>OnTriggerEnter</code>, <code>Stay</code> y <code>Exit</code>. No hay respuesta física: se atraviesan.',
        coll: 'Hay un <code>Rigidbody</code> dinámico y ningún trigger: <b>ambos</b> reciben <code>OnCollisionEnter</code>, <code>Stay</code> y <code>Exit</code> y la física los separa.',
        legend: 'S = estático · RB = Rigidbody · K = cinemático · ·T = Is Trigger' },
      en: { tap: 'Tap a cell in the matrix to pick the A × B pair.', none: 'No message',
        noRb: 'Neither has a <code>Rigidbody</code>: physics does not check this pair.',
        kinKin: 'No <code>Rigidbody</code> is dynamic and there is no trigger: a kinematic body does not collide with static or other kinematic colliders.',
        trig: 'There is a trigger and at least one <code>Rigidbody</code> (even a kinematic one): <b>both</b> get <code>OnTriggerEnter</code>, <code>Stay</code> and <code>Exit</code>. No physical response: they pass through.',
        coll: 'There is a dynamic <code>Rigidbody</code> and no trigger: <b>both</b> get <code>OnCollisionEnter</code>, <code>Stay</code> and <code>Exit</code> and physics pushes them apart.',
        legend: 'S = static · RB = Rigidbody · K = kinematic · ·T = Is Trigger' }
    }[lang];
    const result = (a, b) => {
      if (!a.rb && !b.rb) return 'noRb';
      if (a.trig || b.trig) return 'trig';
      if ((a.rb && !a.kin) || (b.rb && !b.kin)) return 'coll';
      return 'kinKin';
    };
    let ia = 1, ib = 0;
    let sim = null;
    const ROW_H = 26, TOP = 124;
    let layout = null;

    const stage = makeCanvas(host, () => TOP + 26 + TYPES.length * ROW_H + 8, (x, y) => {
      if (!layout || y < layout.y0) return;
      const r = Math.floor((y - layout.y0) / ROW_H), col = Math.floor((x - layout.x0) / layout.cw);
      if (r >= 0 && r < TYPES.length && col >= 0 && col < TYPES.length) { ia = r; ib = col; restart(); }
    });
    const out = readout(host);

    function restart() {
      const A = TYPES[ia], B = TYPES[ib];
      // Se mueve A, salvo que A no tenga Rigidbody y B sí (un collider estático no debería moverse).
      const aMoves = A.rb || !B.rb;
      sim = { t: 0, aMoves, xa: 0.18, xb: 0.82, va: aMoves ? 0.32 : 0, vb: aMoves ? 0 : -0.32, inside: false, done: false, bubbles: [] };
    }
    restart();

    const SIZE = 0.09;
    const stop = loop((dt) => {
      const A = TYPES[ia], B = TYPES[ib];
      const res = result(A, B);
      const s = sim;
      s.t += dt;
      s.xa += s.va * dt; s.xb += s.vb * dt;
      const overlap = Math.abs(s.xa - s.xb) < SIZE;
      const msg = (name) => { s.bubbles.push({ name, life: 1.6, x: (s.xa + s.xb) / 2 }); };
      if (overlap && !s.inside) {
        s.inside = true;
        if (res === 'coll') {
          msg('OnCollisionEnter');
          const mover = s.aMoves ? A : B;
          const moverDynamic = mover.rb && !mover.kin;
          if (moverDynamic) {
            // El objeto dinámico rebota.
            if (s.aMoves) { s.va = -0.18; s.xa = s.xb - SIZE; } else { s.vb = 0.18; s.xb = s.xa + SIZE; }
          } else {
            // El cinemático sigue su camino y empuja al dinámico.
            if (s.aMoves) s.vb = s.va; else s.va = s.vb;
          }
        } else if (res === 'trig') msg('OnTriggerEnter');
      } else if (!overlap && s.inside && Math.abs(s.xa - s.xb) > SIZE + 0.01) {
        s.inside = false;
        if (res === 'trig') msg('OnTriggerExit');
        if (res === 'coll') msg('OnCollisionExit');
      }
      s.bubbles.forEach((b) => { b.life -= dt; });
      s.bubbles = s.bubbles.filter((b) => b.life > 0);
      if (s.t > 4.2) restart();

      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      // Escena
      const sw = Math.min(w - 24, 520), sx = (w - sw) / 2;
      const X = (v) => sx + v * sw;
      ctx.strokeStyle = c.border; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(10, 92); ctx.lineTo(w - 10, 92); ctx.stroke();
      const drawBody = (T, x, label) => {
        const px = X(x), size = SIZE * sw;
        const fill = !T.rb ? c.soft : (T.kin ? c.warnSoft : c.accentSoft);
        const stroke = !T.rb ? c.muted : (T.kin ? c.warn : c.accent);
        ctx.fillStyle = fill;
        roundRect(ctx, px - size / 2, 92 - size, size, size, 6);
        ctx.globalAlpha = T.trig ? 0.55 : 1; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = stroke; ctx.lineWidth = 2;
        if (T.trig) ctx.setLineDash([4, 3]);
        ctx.stroke(); ctx.setLineDash([]);
        text(ctx, label, px, 92 - size / 2, c.text, { align: 'center' });
      };
      text(ctx, 'A: ' + A[lang], 10, 106, c.muted);
      text(ctx, 'B: ' + B[lang], w - 10, 106, c.muted, { align: 'right' });
      drawBody(A, s.xa, 'A');
      drawBody(B, s.xb, 'B');
      s.bubbles.forEach((b, i) => {
        ctx.globalAlpha = Math.min(1, b.life);
        const isColl = b.name.indexOf('Collision') >= 0;
        text(ctx, b.name + '()', X(b.x), 12 + (i % 2) * 14, isColl ? c.accent : c.ok, { align: 'center', mono: true });
        ctx.globalAlpha = 1;
      });
      if (res === 'noRb' || res === 'kinKin') {
        if (s.inside) text(ctx, '— ' + L.none + ' —', w / 2, 24, c.muted, { align: 'center' });
      }

      // Matriz
      const labelW = Math.min(150, Math.max(46, w * 0.3));
      const cw = (w - labelW - 12) / TYPES.length;
      const y0 = TOP + 26;
      layout = { x0: labelW, y0, cw };
      text(ctx, 'A \\ B', 8, TOP + 12, c.muted, { mono: true });
      TYPES.forEach((T, j) => text(ctx, T.short, labelW + cw * j + cw / 2, TOP + 12, j === ib ? c.text : c.muted, { align: 'center', mono: true }));
      TYPES.forEach((Ta, i) => {
        const y = y0 + i * ROW_H;
        text(ctx, w < 480 ? Ta.short : Ta[lang], 8, y + ROW_H / 2, i === ia ? c.text : c.muted, { mono: w < 480 });
        TYPES.forEach((Tb, j) => {
          const r = result(Ta, Tb);
          const x = labelW + cw * j;
          ctx.fillStyle = r === 'coll' ? c.accentSoft : r === 'trig' ? c.okSoft : c.soft;
          roundRect(ctx, x + 2, y + 2, cw - 4, ROW_H - 4, 5); ctx.fill();
          const sym = r === 'coll' ? 'C' : r === 'trig' ? 'T' : '·';
          text(ctx, sym, x + cw / 2, y + ROW_H / 2, r === 'coll' ? c.accent : r === 'trig' ? c.ok : c.muted, { align: 'center', mono: true });
          if (i === ia && j === ib) {
            ctx.strokeStyle = c.text; ctx.lineWidth = 2;
            roundRect(ctx, x + 1, y + 1, cw - 2, ROW_H - 2, 6); ctx.stroke();
          }
        });
      });

      out('<b>A</b>: ' + A[lang] + ' · <b>B</b>: ' + B[lang] + '<p>' + L[res] + '</p><p class="muted small">' + L.tap + ' ' + L.legend + ' · C = OnCollision · T = OnTrigger</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     12. Corrutinas: cuándo se reanuda cada yield
     --------------------------------------------------------- */

  function mountCoroutines(host, lang) {
    const L = {
      es: { fps: 'FPS del juego', active: 'Activo', disabled: 'enabled = false', inactive: 'SetActive(false)', restart: 'StartCoroutine() otra vez',
        frame: 'frame', stopped: 'detenida',
        msgActive: 'Cada columna es un frame. <code>yield return null</code> se reanuda en cada frame (después de <code>Update</code>); <code>WaitForFixedUpdate</code>, después de cada paso de física (0, 1 o varios por frame).',
        msgDisabled: 'Con <code>enabled = false</code> deja de llamarse <code>Update</code>, pero <b>las corrutinas siguen corriendo</b>: pertenecen al MonoBehaviour, no a su estado <i>enabled</i>.',
        msgInactive: 'Al desactivar el GameObject (o destruirlo) <b>todas sus corrutinas se detienen</b>, y al reactivarlo <b>no se reanudan</b>: hay que volver a llamar a <code>StartCoroutine</code>.',
        msgPaused: 'Con <code>timeScale = 0</code>: <code>WaitForSeconds</code> y la física se congelan; <code>yield return null</code> y <code>WaitForSecondsRealtime</code> siguen.' },
      en: { fps: 'Game FPS', active: 'Active', disabled: 'enabled = false', inactive: 'SetActive(false)', restart: 'StartCoroutine() again',
        frame: 'frame', stopped: 'stopped',
        msgActive: 'Each column is a frame. <code>yield return null</code> resumes every frame (after <code>Update</code>); <code>WaitForFixedUpdate</code> resumes after each physics step (0, 1 or several per frame).',
        msgDisabled: 'With <code>enabled = false</code>, <code>Update</code> stops being called, but <b>coroutines keep running</b>: they belong to the MonoBehaviour, not to its <i>enabled</i> state.',
        msgInactive: 'Deactivating (or destroying) the GameObject <b>stops all its coroutines</b>, and re-activating it <b>does not resume them</b>: you must call <code>StartCoroutine</code> again.',
        msgPaused: 'With <code>timeScale = 0</code>: <code>WaitForSeconds</code> and physics freeze; <code>yield return null</code> and <code>WaitForSecondsRealtime</code> keep going.' }
    }[lang];
    const ROWS = [
      { key: 'update', label: 'Update()' },
      { key: 'nul', label: 'yield return null' },
      { key: 'wfs', label: 'WaitForSeconds(0.25f)' },
      { key: 'wfsr', label: 'WaitForSecondsRealtime(0.25f)' },
      { key: 'fixed', label: 'WaitForFixedUpdate()' }
    ];
    let fps = 30, ts = 1, objState = 'active', running = true;
    const st = { frame: 0, acc: 0, fixedAcc: 0, wfs: 0, wfsr: 0, hist: [] };
    const ctl = controls(host);
    slider(ctl, L.fps, 15, 144, 1, fps, (v) => { fps = v; });
    seg(ctl, [{ v: 1, l: 'timeScale 1' }, { v: 0.5, l: '0.5' }, { v: 0, l: '0' }], 1, (v) => { ts = v; });
    const ctl2 = controls(host);
    seg(ctl2, [{ v: 'active', l: L.active }, { v: 'disabled', l: L.disabled }, { v: 'inactive', l: L.inactive }], 'active', (v) => {
      objState = v;
      if (v === 'inactive') running = false;
    });
    button(ctl2, L.restart, () => { if (objState !== 'inactive') { running = true; st.wfs = 0; st.wfsr = 0; } }, true);
    const stage = makeCanvas(host, (w) => (w < 520 ? 30 + ROWS.length * 40 : 40 + ROWS.length * 30));
    const out = readout(host);
    const VISUAL = 0.16; // segundos reales de pantalla por frame simulado (cámara lenta)

    function step() {
      const realDt = 1 / fps, scaledDt = realDt * ts;
      const col = { frame: st.frame, update: false, nul: false, wfs: false, wfsr: false, fixed: 0, off: false };
      st.fixedAcc += scaledDt;
      let n = 0;
      while (st.fixedAcc >= 0.02 - 1e-9) { st.fixedAcc -= 0.02; n++; }
      if (objState === 'inactive') {
        col.off = true;
      } else {
        col.update = objState === 'active';
        if (running) {
          col.fixed = n;
          col.nul = true;
          st.wfs += scaledDt; st.wfsr += realDt;
          if (st.wfs >= 0.25 - 1e-9) { col.wfs = true; st.wfs = 0; }
          if (st.wfsr >= 0.25 - 1e-9) { col.wfsr = true; st.wfsr = 0; }
        }
      }
      st.hist.push(col);
      if (st.hist.length > 80) st.hist.shift();
      st.frame++;
    }

    const stop = loop((dt) => {
      st.acc += dt;
      while (st.acc >= VISUAL) { st.acc -= VISUAL; step(); }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 520;
      const RH = narrow ? 40 : 30, DY = narrow ? 26 : 12;
      const labelW = narrow ? 8 : Math.min(230, w * 0.48);
      const CW = 18;
      const nCols = Math.max(4, Math.floor((w - labelW - 8) / CW));
      const cols = st.hist.slice(-nCols);
      const y0 = narrow ? 20 : 30;
      text(ctx, L.frame + ' →', narrow ? w - 8 : labelW, 10, c.muted, { align: narrow ? 'right' : 'left' });
      cols.forEach((col, k) => {
        const x = labelW + k * CW;
        const isLast = k === cols.length - 1;
        if (isLast) { ctx.fillStyle = c.accentSoft; ctx.fillRect(x, y0 - 4, CW - 2, ROWS.length * RH); }
        if (col.off) { ctx.fillStyle = c.badSoft; ctx.fillRect(x, y0 - 4, CW - 2, ROWS.length * RH); }
        ROWS.forEach((r, i) => {
          const y = y0 + i * RH + DY;
          const v = col[r.key];
          if (r.key === 'fixed') {
            for (let m = 0; m < v; m++) {
              ctx.fillStyle = c.warn;
              ctx.fillRect(x + 3, y - 8 + m * 6, CW - 8, 4);
            }
            if (!v) { ctx.fillStyle = c.border; ctx.fillRect(x + 6, y, CW - 14, 1); }
          } else {
            ctx.fillStyle = v ? (r.key === 'update' ? c.accent : r.key === 'wfs' ? c.warn : c.ok) : c.border;
            ctx.beginPath(); ctx.arc(x + CW / 2 - 1, y, v ? 5 : 1.5, 0, Math.PI * 2); ctx.fill();
          }
        });
      });
      ROWS.forEach((r, i) => {
        const isStopped = r.key !== 'update' && (!running || objState === 'inactive');
        const ly = narrow ? y0 + i * RH + 6 : y0 + i * RH + DY;
        text(ctx, r.label, 8, ly, isStopped ? c.muted : c.text, { mono: true });
        if (isStopped && !narrow) text(ctx, '(' + L.stopped + ')', labelW - 6, ly, c.bad, { align: 'right' });
      });
      let msg = L.msgActive;
      if (objState === 'inactive' || !running) msg = L.msgInactive;
      else if (objState === 'disabled') msg = L.msgDisabled;
      else if (ts === 0) msg = L.msgPaused;
      out(msg);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     13. Batching: draw calls y SetPass calls
     --------------------------------------------------------- */

  function mountBatching(host, lang) {
    const L = {
      es: { none: 'Sin batching', stat: 'Static batching', inst: 'GPU Instancing', srp: 'SRP Batcher', mats1: '1 material', mats3: '3 materiales', mesh1: '1 malla', mesh2: '2 mallas',
        draws: 'Draw calls', setpass: 'SetPass calls', frame: 'Coste de CPU del frame (simulado)',
        nNone: 'Cada objeto es un draw call y cada cambio de material, un SetPass.',
        nStat: 'Los objetos marcados <b>Static</b> se combinan por material en mallas grandes al hacer el build. Ya <b>no se pueden mover</b> y ocupan más memoria.',
        nInst: 'Un draw call por cada pareja <b>misma malla + mismo material</b> (con <i>Enable GPU Instancing</i> en el material). Ideal para muchas copias: árboles, hierba, balas.',
        nSrp: 'Sigue habiendo un draw call por objeto, pero <b>muy baratos</b>: los datos del material viven en la GPU y solo cambia el estado cuando cambia el <b>shader (variante)</b>, no el material. En URP tiene prioridad sobre GPU Instancing.' },
      en: { none: 'No batching', stat: 'Static batching', inst: 'GPU Instancing', srp: 'SRP Batcher', mats1: '1 material', mats3: '3 materials', mesh1: '1 mesh', mesh2: '2 meshes',
        draws: 'Draw calls', setpass: 'SetPass calls', frame: 'Frame CPU cost (simulated)',
        nNone: 'Every object is a draw call and every material change is a SetPass.',
        nStat: 'Objects marked <b>Static</b> are combined per material into big meshes at build time. They <b>can no longer move</b> and use more memory.',
        nInst: 'One draw call per <b>same mesh + same material</b> pair (with <i>Enable GPU Instancing</i> on the material). Great for many copies: trees, grass, bullets.',
        nSrp: 'There is still one draw call per object, but they are <b>very cheap</b>: material data lives on the GPU and state only changes when the <b>shader (variant)</b> changes, not the material. In URP it takes priority over GPU Instancing.' }
    }[lang];
    const N = 24, COLS = 8;
    let tech = 'none', M = 3, MESHES = 2;
    let batches = [], drawIdx = 0, timer = 0, frameCost = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'none', l: L.none }, { v: 'static', l: L.stat }, { v: 'instancing', l: L.inst }, { v: 'srp', l: L.srp }], tech, (v) => { tech = v; rebuild(); });
    const ctl2 = controls(host);
    seg(ctl2, [{ v: 1, l: L.mats1 }, { v: 3, l: L.mats3 }], M, (v) => { M = v; rebuild(); });
    seg(ctl2, [{ v: 1, l: L.mesh1 }, { v: 2, l: L.mesh2 }], MESHES, (v) => { MESHES = v; rebuild(); });
    const stage = makeCanvas(host, (w) => Math.round(10 + 3 * (Math.min(w - 20, 520) / 8) * 0.82 + 62));
    const out = readout(host);

    const objs = [];
    for (let i = 0; i < N; i++) objs.push({ i, matSeed: (i * 7 + Math.floor(i / COLS)) % 3, meshSeed: Math.floor(i / 2) % 2 });
    const mat = (o) => o.matSeed % M;
    const mesh = (o) => o.meshSeed % MESHES;

    function rebuild() {
      const sorted = objs.slice().sort((a, b) => mat(a) - mat(b) || mesh(a) - mesh(b) || a.i - b.i);
      const groups = new Map();
      if (tech === 'none' || tech === 'srp') {
        batches = sorted.map((o) => ({ objs: [o], mat: mat(o) }));
      } else {
        sorted.forEach((o) => {
          const k = tech === 'static' ? String(mat(o)) : mat(o) + '-' + mesh(o);
          if (!groups.has(k)) groups.set(k, { objs: [], mat: mat(o) });
          groups.get(k).objs.push(o);
        });
        batches = Array.from(groups.values());
      }
      let prev = -1;
      batches.forEach((b, idx) => {
        b.pass = tech === 'srp' ? idx === 0 : b.mat !== prev;
        prev = b.mat;
      });
      drawIdx = 0; timer = 0;
      // Coste simulado: los SetPass son caros; en SRP Batcher cada draw call es barato.
      const perDraw = tech === 'srp' ? 0.15 : 0.5, perPass = 1.6;
      frameCost = batches.length * perDraw + batches.filter((b) => b.pass).length * perPass;
    }
    rebuild();

    const stop = loop((dt) => {
      timer += dt;
      const STEP = tech === 'srp' ? 0.05 : 0.14;
      const cur = batches[drawIdx];
      const need = STEP + (cur && cur.pass ? 0.3 : 0);
      if (drawIdx < batches.length && timer >= need) { timer = 0; drawIdx++; }
      else if (drawIdx >= batches.length && timer > 1.2) { drawIdx = 0; timer = 0; }

      const c = colors();
      const pal = [c.accent, c.ok, c.warn];
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const rows = N / COLS;
      const gw = Math.min(w - 20, 520), cell = gw / COLS;
      const gx = (w - gw) / 2, gy = 10;
      const drawn = new Set();
      batches.slice(0, drawIdx).forEach((b) => b.objs.forEach((o) => drawn.add(o.i)));
      const active = batches[Math.min(drawIdx, batches.length - 1)];
      const activeSet = drawIdx < batches.length ? new Set(active.objs.map((o) => o.i)) : new Set();
      objs.forEach((o) => {
        const cx = gx + (o.i % COLS) * cell + cell / 2;
        const cy = gy + Math.floor(o.i / COLS) * cell * 0.82 + cell * 0.41;
        const r = cell * 0.3;
        const col = pal[mat(o)];
        const isDrawn = drawn.has(o.i);
        ctx.fillStyle = isDrawn ? col : c.soft;
        ctx.strokeStyle = activeSet.has(o.i) ? c.text : (isDrawn ? col : c.border);
        ctx.lineWidth = activeSet.has(o.i) ? 2.5 : 1;
        if (mesh(o) === 0) { roundRect(ctx, cx - r, cy - r, r * 2, r * 2, 4); }
        else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); }
        ctx.fill(); ctx.stroke();
      });
      if (tech === 'static') text(ctx, '🔒 static', gx + gw, gy + rows * cell * 0.82 + 8, c.muted, { align: 'right' });
      // Barra de coste del frame
      const by = h - 34;
      text(ctx, L.frame, 10, by - 8, c.muted);
      const maxCost = N * 0.5 + 3 * 1.6;
      ctx.fillStyle = c.soft; roundRect(ctx, 10, by, w - 20, 12, 6); ctx.fill();
      const prog = batches.length ? drawIdx / batches.length : 0;
      ctx.fillStyle = frameCost > maxCost * 0.6 ? c.bad : frameCost > maxCost * 0.25 ? c.warn : c.ok;
      roundRect(ctx, 10, by, Math.max(6, (w - 20) * (frameCost / maxCost) * prog), 12, 6); ctx.fill();
      ctx.strokeStyle = c.border; ctx.lineWidth = 1;
      ctx.strokeRect(10 + (w - 20) * (frameCost / maxCost), by - 2, 0.5, 16);

      const passes = batches.filter((b) => b.pass).length;
      const note = { none: L.nNone, static: L.nStat, instancing: L.nInst, srp: L.nSrp }[tech];
      out(L.draws + ': <b>' + batches.length + '</b> · ' + L.setpass + ': <b>' + passes + '</b>' + '<p>' + note + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     14. Modos de luz: Realtime, Mixed y Baked
     --------------------------------------------------------- */

  function mountLightModes(host, lang) {
    const L = {
      es: { color: 'Cambiar color en runtime', bake: 'Generate Lighting (rebake)', probes: 'Light Probes', on: 'Sí', off: 'No',
        stat: 'Caja (Static)', dyn: 'Personaje (dinámico)', stale: 'El lightmap tiene el color antiguo: hay que volver a hornear.',
        realtime: '<b>Realtime</b>: todo se calcula cada frame. Luz y sombras reaccionan al instante a cambios, pero es lo más caro y no hay luz rebotada (GI) horneada.',
        mixed: '<b>Mixed (Baked Indirect)</b>: luz directa y sombras en tiempo real; la luz <b>indirecta</b> (rebote) se hornea. Si cambias el color, la directa cambia, pero el rebote horneado no.',
        baked: '<b>Baked</b>: la luz se hornea en lightmaps para los objetos <b>Static</b>. Muy barato, pero no cambia en runtime y los objetos dinámicos ni reciben luz directa ni proyectan sombra: necesitan <b>Light Probes</b> para no verse apagados.' },
      en: { color: 'Change color at runtime', bake: 'Generate Lighting (rebake)', probes: 'Light Probes', on: 'On', off: 'Off',
        stat: 'Crate (Static)', dyn: 'Character (dynamic)', stale: 'The lightmap still has the old color: you need to bake again.',
        realtime: '<b>Realtime</b>: everything is computed every frame. Light and shadows react instantly to changes, but it is the most expensive and there is no baked bounced light (GI).',
        mixed: '<b>Mixed (Baked Indirect)</b>: direct light and shadows in real time; <b>indirect</b> (bounced) light is baked. If you change the color, the direct light changes, but the baked bounce does not.',
        baked: '<b>Baked</b>: lighting is baked into lightmaps for <b>Static</b> objects. Very cheap, but it does not change at runtime and dynamic objects get no direct light and cast no shadow: they need <b>Light Probes</b> to not look unlit.' }
    }[lang];
    const PALETTE = [[255, 210, 122], [255, 107, 107], [107, 182, 255]];
    let mode = 'mixed', probes = true, ci = 0, bakedCi = 0, t = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'realtime', l: 'Realtime' }, { v: 'mixed', l: 'Mixed' }, { v: 'baked', l: 'Baked' }], mode, (v) => { mode = v; bakedCi = ci; });
    button(ctl, L.color, () => { ci = (ci + 1) % PALETTE.length; }, true);
    button(ctl, L.bake, () => { bakedCi = ci; });
    const ctl2 = controls(host);
    seg(ctl2, [{ v: true, l: L.probes + ': ' + L.on }, { v: false, l: L.probes + ': ' + L.off }], probes, (v) => { probes = v; });
    const stage = makeCanvas(host, 210);
    const out = readout(host);
    const rgba = (c3, a) => 'rgba(' + c3[0] + ',' + c3[1] + ',' + c3[2] + ',' + a + ')';

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const floorY = h - 34;
      const lx = w * 0.22, ly = 28;
      const live = PALETTE[ci], baked = PALETTE[bakedCi];
      const directLive = mode !== 'baked';
      // Suelo y fondo
      ctx.fillStyle = c.soft; ctx.fillRect(0, 0, w, floorY);
      ctx.fillStyle = c.border; ctx.fillRect(0, floorY, w, h - floorY);
      // Luz directa (en tiempo real) o lightmap (horneado) sobre el suelo
      const glow = (col, a, r) => {
        const g = ctx.createRadialGradient(lx, floorY, 4, lx, floorY, r);
        g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.fillRect(0, floorY - 60, w, 60 + h - floorY);
      };
      if (directLive) {
        const g = ctx.createLinearGradient(0, ly, 0, floorY);
        g.addColorStop(0, rgba(live, 0.35)); g.addColorStop(1, rgba(live, 0.05));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - w * 0.2, floorY); ctx.lineTo(lx + w * 0.45, floorY); ctx.closePath(); ctx.fill();
        glow(live, 0.55, w * 0.75);
      }
      if (mode !== 'realtime') glow(baked, mode === 'baked' ? 0.55 : 0.25, w * 0.9);
      // Caja estática
      const bx = w * 0.5, bw = Math.min(70, w * 0.14), bh = 56;
      const boxCol = mode === 'baked' ? baked : live;
      // Sombra de la caja: horneada (suave) o en tiempo real (nítida)
      const proj = (x, y) => lx + (x - lx) * (floorY - ly) / (y - ly);
      const sx1 = bx + bw, sx2 = Math.min(w, proj(bx + bw, floorY - bh));
      if (mode === 'baked') {
        const g = ctx.createLinearGradient(sx1, 0, sx2, 0);
        g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(sx1, floorY - 4, sx2 - sx1, 10);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sx1, floorY - 2, sx2 - sx1, 6);
      }
      ctx.fillStyle = rgba(boxCol, 0.9);
      ctx.fillRect(bx, floorY - bh, bw, bh);
      ctx.strokeStyle = c.text; ctx.lineWidth = 1; ctx.strokeRect(bx, floorY - bh, bw, bh);
      text(ctx, L.stat, bx + bw / 2, floorY + 14, c.text, { align: 'center' });
      // Personaje dinámico
      const pLeft = 64, pRight = Math.max(pLeft + 20, bx - 66);
      const px = pLeft + (Math.sin(t * 0.6) * 0.5 + 0.5) * (pRight - pLeft), pr = 14, py = floorY - pr;
      let ballCol, ballAlpha, ballShadow = false;
      if (mode === 'realtime') { ballCol = live; ballAlpha = 0.95; ballShadow = true; }
      else if (mode === 'mixed') { ballCol = live; ballAlpha = 0.95; ballShadow = true; }
      else { ballCol = probes ? baked : [70, 70, 80]; ballAlpha = probes ? 0.75 : 0.9; }
      if (ballShadow) {
        const s1 = proj(px - pr, py), s2 = proj(px + pr, py);
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.beginPath(); ctx.ellipse((s1 + s2) / 2, floorY, Math.abs(s2 - s1) / 2 + 4, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = rgba(ballCol, ballAlpha);
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.text; ctx.stroke();
      if (mode === 'mixed' && !probes) {
        // Sin probes, el lado en sombra no recibe el rebote horneado.
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath(); ctx.arc(px, py, pr, -Math.PI / 2, Math.PI / 2); ctx.fill();
      }
      text(ctx, L.dyn, px, py - pr - 10, c.text, { align: 'center' });
      if (probes && mode !== 'realtime') {
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = rgba(baked, 0.9);
          ctx.beginPath(); ctx.arc(w * 0.08 + k * w * 0.12, floorY - 46, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Bombilla
      ctx.fillStyle = rgba(live, 1);
      ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.text; ctx.stroke();
      text(ctx, 'Light (' + mode + ')', lx + 16, ly, c.text, { mono: true });

      const stale = mode !== 'realtime' && bakedCi !== ci;
      out(L[mode] + (stale ? '<p>⚠️ ' + L.stale + '</p>' : ''));
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     15. Rotaciones: Lerp vs Slerp vs RotateTowards
     --------------------------------------------------------- */

  function mountRotation(host, lang) {
    const L = {
      es: { target: 'Ángulo objetivo', speed: 'velocidad', arrived: 'llegó', never: 'nunca llega exacto',
        note: 'Con ángulos grandes, <code>Lerp</code> con <i>t</i> lineal no gira a velocidad constante (acelera en el centro); <code>Slerp</code> sí. <code>RotateTowards</code> gira a grados/segundo fijos y llega exactamente. El patrón <code>Slerp(actual, objetivo, k * deltaTime)</code> suaviza, pero se frena al final y nunca llega del todo.' },
      en: { target: 'Target angle', speed: 'speed', arrived: 'arrived', never: 'never quite arrives',
        note: 'For large angles, <code>Lerp</code> with a linear <i>t</i> does not rotate at a constant speed (it speeds up in the middle); <code>Slerp</code> does. <code>RotateTowards</code> turns at a fixed degrees per second and arrives exactly. The <code>Slerp(current, target, k * deltaTime)</code> pattern smooths, but slows down at the end and never quite arrives.' }
    }[lang];
    const ROWS = [
      { id: 'lerp', label: 'Lerp(from, to, t)' },
      { id: 'slerp', label: 'Slerp(from, to, t)' },
      { id: 'towards', label: 'RotateTowards(…, 120*dt)' },
      { id: 'smooth', label: 'Slerp(cur, to, 4*dt)' }
    ];
    let target = 170, t = 0;
    const st = { lerp: 0, slerp: 0, towards: 0, smooth: 0 };
    const spd = { lerp: 0, slerp: 0, towards: 0, smooth: 0 };
    const ctl = controls(host);
    seg(ctl, [{ v: 60, l: '60°' }, { v: 120, l: '120°' }, { v: 170, l: '170°' }], target, (v) => { target = v; reset(); });
    const stage = makeCanvas(host, 20 + ROWS.length * 56);
    const out = readout(host);
    function reset() { t = 0; Object.keys(st).forEach((k) => { st[k] = 0; spd[k] = 0; }); }
    const DUR = 1.5;
    function nlerpAngle(a1, u) {
      // Ángulo (grados) de normalize(lerp(q0, q1, u)) para rotaciones en un solo eje, q0 = identidad.
      const h = (a1 * Math.PI / 180) / 2;
      const qx = (1 - u) + u * Math.cos(h), qy = u * Math.sin(h);
      return 2 * Math.atan2(qy, qx) * 180 / Math.PI;
    }

    const stop = loop((dt) => {
      t += dt;
      if (t > DUR + 1.6) reset();
      const u = Math.min(1, t / DUR);
      const prev = Object.assign({}, st);
      st.lerp = nlerpAngle(target, u);
      st.slerp = target * u;
      st.towards = Math.min(target, st.towards + 120 * dt);
      st.smooth = st.smooth + (target - st.smooth) * Math.min(1, 4 * dt);
      if (dt > 0) Object.keys(st).forEach((k) => { spd[k] = spd[k] * 0.7 + ((st[k] - prev[k]) / dt) * 0.3; });

      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const pal = { lerp: c.warn, slerp: c.accent, towards: c.ok, smooth: c.bad };
      ROWS.forEach((r, i) => {
        const cy = 34 + i * 56, cx = 30, R = 22;
        ctx.strokeStyle = c.border; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        // Objetivo
        const ta = -target * Math.PI / 180;
        ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ta) * R, cy + Math.sin(ta) * R); ctx.stroke();
        ctx.setLineDash([]);
        // Flecha actual
        const a = -st[r.id] * Math.PI / 180;
        ctx.strokeStyle = pal[r.id]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
        ctx.fillStyle = pal[r.id];
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 3.5, 0, Math.PI * 2); ctx.fill();
        // Etiqueta y barra de velocidad angular
        const tx = 64;
        text(ctx, r.label, tx, cy - 10, c.text, { mono: true });
        const narrow = w < 480;
        const bwMax = narrow ? w - tx - 12 : Math.max(60, w - tx - 160);
        const v = Math.abs(spd[r.id]);
        ctx.fillStyle = c.soft; roundRect(ctx, tx, cy + 2, bwMax, 8, 4); ctx.fill();
        ctx.fillStyle = pal[r.id]; roundRect(ctx, tx, cy + 2, Math.max(2, bwMax * Math.min(1, v / 300)), 8, 4); ctx.fill();
        const done = Math.abs(target - st[r.id]) < 0.05;
        const status = done ? '✓ ' + L.arrived : (r.id === 'smooth' && u >= 1 ? L.never : Math.round(v) + '°/s');
        if (narrow) text(ctx, Math.round(st[r.id]) + '° · ' + status, tx, cy + 21, done ? c.ok : c.muted);
        else text(ctx, Math.round(st[r.id]) + '° · ' + status, tx + bwMax + 8, cy + 6, done ? c.ok : c.muted);
      });
      out(L.note);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     16. Orden de ejecución entre objetos: Awake, OnEnable, Start
     --------------------------------------------------------- */

  function mountExecOrder(host, lang) {
    const L = {
      es: { readIn: 'Player lee GameManager.Instance en', order: 'Unity carga primero', deo: '[DefaultExecutionOrder(-100)] en GameManager', yes: 'Sí', no: 'No', play: '▶ Repetir',
        p1: 'Awake + OnEnable (todos los objetos)', p2: 'Start (todos)', p3: 'Primer frame',
        nre: '✗ NullReferenceException: Player leyó <code>GameManager.Instance</code> antes de que el Awake de GameManager lo asignara.',
        ok: '✓ Funciona: cuando Player lee la instancia, GameManager ya ejecutó su Awake.',
        luck: '⚠️ Funciona, pero <b>por suerte</b>: el orden entre objetos no está garantizado. Lee en <code>Start</code> o fija el orden con <code>[DefaultExecutionOrder]</code>.',
        rule: 'Regla: <b>Awake</b> para inicializarte a ti mismo; <b>Start</b> para usar a otros (todos los Awake de la escena ya se ejecutaron).' },
      en: { readIn: 'Player reads GameManager.Instance in', order: 'Unity loads first', deo: '[DefaultExecutionOrder(-100)] on GameManager', yes: 'Yes', no: 'No', play: '▶ Replay',
        p1: 'Awake + OnEnable (all objects)', p2: 'Start (all)', p3: 'First frame',
        nre: '✗ NullReferenceException: Player read <code>GameManager.Instance</code> before GameManager\'s Awake assigned it.',
        ok: '✓ It works: when Player reads the instance, GameManager has already run its Awake.',
        luck: '⚠️ It works, but <b>by luck</b>: the order between objects is not guaranteed. Read it in <code>Start</code> or set the order with <code>[DefaultExecutionOrder]</code>.',
        rule: 'Rule: <b>Awake</b> to initialize yourself; <b>Start</b> to use others (every Awake in the scene has already run).' }
    }[lang];
    let readIn = 'Awake', first = 'Player', deo = false, t = 0;
    const ctl = controls(host);
    const lab = (s) => { const e = el('span', 'muted small', s); ctl.appendChild(e); };
    lab(L.readIn);
    seg(ctl, [{ v: 'Awake', l: 'Awake' }, { v: 'Start', l: 'Start' }], readIn, (v) => { readIn = v; t = 0; });
    const ctl2 = controls(host);
    const lab2 = el('span', 'muted small', L.order); ctl2.appendChild(lab2);
    seg(ctl2, [{ v: 'GameManager', l: 'GameManager' }, { v: 'Player', l: 'Player' }], first, (v) => { first = v; t = 0; });
    const ctl3 = controls(host);
    const lab3 = el('span', 'muted small', '<code>' + L.deo + '</code>'); ctl3.appendChild(lab3);
    seg(ctl3, [{ v: false, l: L.no }, { v: true, l: L.yes }], deo, (v) => { deo = v; t = 0; });
    button(ctl3, L.play, () => { t = 0; }, true);
    const ROW = 24, HEAD = 30;
    const stage = makeCanvas(host, HEAD + 8 * ROW + 3 * 18 + 10);
    const out = readout(host);

    function sequence() {
      const objs = deo || first === 'GameManager' ? ['GameManager', 'Player'] : ['Player', 'GameManager'];
      const ev = [];
      objs.forEach((o) => { ev.push({ o, m: 'Awake', phase: 0 }); ev.push({ o, m: 'OnEnable', phase: 0 }); });
      objs.forEach((o) => ev.push({ o, m: 'Start', phase: 1 }));
      objs.forEach((o) => ev.push({ o, m: 'Update', phase: 2 }));
      let managerReady = false, crashed = false;
      ev.forEach((e) => {
        if (e.o === 'GameManager' && e.m === 'Awake') { managerReady = true; e.note = 'Instance = this'; }
        if (e.o === 'Player' && e.m === readIn) {
          e.read = true;
          if (!managerReady) { e.err = true; crashed = true; e.note = 'NullReferenceException'; }
          else e.note = 'Instance ✓';
        }
      });
      return { ev, crashed };
    }

    const stop = loop((dt) => {
      t += dt;
      const { ev, crashed } = sequence();
      const shown = Math.min(ev.length, Math.floor(t / 0.55));
      if (t > ev.length * 0.55 + 2.5) t = 0;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const colW = (w - 20) / 2;
      text(ctx, 'GameManager', 10 + colW / 2, 14, c.text, { align: 'center', mono: true });
      text(ctx, 'Player', 10 + colW * 1.5, 14, c.text, { align: 'center', mono: true });
      let y = HEAD, phase = -1;
      ev.forEach((e, i) => {
        if (e.phase !== phase) {
          phase = e.phase;
          text(ctx, [L.p1, L.p2, L.p3][phase], 10, y + 8, c.muted);
          ctx.strokeStyle = c.border; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(10, y + 16); ctx.lineTo(w - 10, y + 16); ctx.stroke();
          y += 18;
        }
        if (i < shown) {
          const x = e.o === 'GameManager' ? 10 : 10 + colW;
          ctx.fillStyle = e.err ? c.badSoft : (e.read ? c.okSoft : (i === shown - 1 ? c.accentSoft : c.soft));
          roundRect(ctx, x + 4, y + 2, colW - 8, ROW - 4, 6); ctx.fill();
          if (e.err) { ctx.strokeStyle = c.bad; ctx.lineWidth = 1.5; ctx.stroke(); }
          text(ctx, (i + 1) + '. ' + e.m + '()', x + 12, y + ROW / 2, e.err ? c.bad : c.text, { mono: true });
          if (e.note && w >= 400) text(ctx, e.note, x + colW - 12, y + ROW / 2, e.err ? c.bad : c.muted, { align: 'right' });
        }
        y += ROW;
      });
      let verdict;
      if (shown < ev.length) verdict = '…';
      else if (crashed) verdict = L.nre;
      else if (readIn === 'Awake' && !deo) verdict = L.luck;
      else verdict = L.ok;
      out('<p>' + verdict + '</p><p class="muted small">' + L.rule + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     Catálogo
     --------------------------------------------------------- */

  UCP.concepts = [
    {
      id: 'ciclo-de-vida', domain: 'team', practice: { d: 'team', t: 'Ciclo de vida' }, icon: '🔁', mount: mountLifecycle,
      text: {
        es: {
          title: 'Bucle de frames: Update vs FixedUpdate',
          summary: 'Unity dibuja un frame tras otro a la velocidad que puede (FPS variables), pero la física avanza en pasos fijos de 0,02 s. Por eso, en un frame, `FixedUpdate` puede ejecutarse 0, 1 o varias veces. Cambia los FPS y pulsa la tecla para ver por qué el input de un solo frame se pierde si lo lees en `FixedUpdate`.',
          points: ['Orden de inicio: `Awake` → `OnEnable` → `Start`.', 'En cada frame: `FixedUpdate` (0..n veces) → `Update` → `LateUpdate` → render.', 'A FPS altos hay frames **sin** `FixedUpdate`; a FPS bajos hay frames con **varios**.', 'Input de un frame (`GetKeyDown`, `WasPressedThisFrame`) en `Update`; fuerzas en `FixedUpdate`.']
        },
        en: {
          title: 'Frame loop: Update vs FixedUpdate',
          summary: 'Unity renders frames as fast as it can (variable FPS), but physics advances in fixed 0.02 s steps. So in a given frame, `FixedUpdate` can run 0, 1 or several times. Change the FPS and press the key to see why one-frame input is lost if you read it in `FixedUpdate`.',
          points: ['Startup order: `Awake` → `OnEnable` → `Start`.', 'Every frame: `FixedUpdate` (0..n times) → `Update` → `LateUpdate` → render.', 'At high FPS some frames have **no** `FixedUpdate`; at low FPS some frames have **several**.', 'One-frame input (`GetKeyDown`, `WasPressedThisFrame`) goes in `Update`; forces go in `FixedUpdate`.']
        }
      }
    },
    {
      id: 'orden-ejecucion', domain: 'team', practice: { d: 'team', t: 'Ciclo de vida' }, icon: '🧩', mount: mountExecOrder,
      text: {
        es: {
          title: 'Orden entre objetos: Awake, OnEnable y Start',
          summary: 'Al cargar una escena, Unity llama a `Awake` y `OnEnable` de **todos** los objetos y después a `Start` de todos. Lo que **no** está garantizado es el orden entre objetos distintos. Haz que Player lea `GameManager.Instance` en `Awake`, cambia qué objeto carga primero y mira cuándo explota.',
          points: ['Todos los `Awake` (y `OnEnable`) de la escena se ejecutan antes que cualquier `Start`.', 'El orden entre objetos no está garantizado: no dependas de otro objeto en `Awake`.', '`[DefaultExecutionOrder(-100)]` o Project Settings → Script Execution Order fijan el orden.', 'GameObject inactivo: no recibe `Awake` hasta que se activa. Componente desactivado: recibe `Awake`, pero no `Start`.']
        },
        en: {
          title: 'Order between objects: Awake, OnEnable and Start',
          summary: 'When a scene loads, Unity calls `Awake` and `OnEnable` on **every** object and then `Start` on all of them. What is **not** guaranteed is the order between different objects. Make Player read `GameManager.Instance` in `Awake`, change which object loads first and see when it breaks.',
          points: ['Every `Awake` (and `OnEnable`) in the scene runs before any `Start`.', 'The order between objects is not guaranteed: do not depend on another object in `Awake`.', '`[DefaultExecutionOrder(-100)]` or Project Settings → Script Execution Order set the order.', 'Inactive GameObject: no `Awake` until it is activated. Disabled component: gets `Awake`, but not `Start`.']
        }
      }
    },
    {
      id: 'delta-time', domain: 'core', practice: { d: 'core', t: 'Movimiento' }, icon: '⏩', mount: mountDeltaTime,
      text: {
        es: {
          title: 'Time.deltaTime: movimiento independiente de los FPS',
          summary: 'Si mueves algo una cantidad fija por frame, se mueve más rápido cuantos más FPS haya. Multiplicar por `Time.deltaTime` (segundos desde el frame anterior) convierte la velocidad en unidades por segundo. Compara los dos carriles con y sin deltaTime.',
          points: ['Sin deltaTime: velocidad real = valor × FPS.', 'Con deltaTime: misma velocidad en cualquier equipo.', 'En `FixedUpdate`, `Time.deltaTime` devuelve `fixedDeltaTime` automáticamente.', 'Limitar los FPS no es la solución: el problema es la unidad de la velocidad.']
        },
        en: {
          title: 'Time.deltaTime: FPS-independent movement',
          summary: 'If you move something a fixed amount per frame, it moves faster the higher the FPS. Multiplying by `Time.deltaTime` (seconds since the previous frame) turns speed into units per second. Compare both lanes with and without deltaTime.',
          points: ['Without deltaTime: actual speed = value × FPS.', 'With deltaTime: the same speed on any machine.', 'Inside `FixedUpdate`, `Time.deltaTime` returns `fixedDeltaTime` automatically.', 'Capping FPS is not the fix: the problem is the unit of the speed.']
        }
      }
    },
    {
      id: 'rotaciones', domain: 'core', practice: { d: 'core', t: 'Rotación' }, icon: '🧭', mount: mountRotation,
      text: {
        es: {
          title: 'Rotaciones: Lerp, Slerp y RotateTowards',
          summary: 'Las cuatro flechas giran del mismo ángulo inicial al mismo objetivo, cada una con una función distinta. Fíjate en la barra de velocidad: con 170° la diferencia entre `Lerp` y `Slerp` es evidente, y el patrón de suavizado se frena al final.',
          points: ['`Slerp`: interpolación esférica, velocidad angular constante con t lineal.', '`Lerp`: más barato; con ángulos grandes, la velocidad no es constante.', '`RotateTowards(cur, to, grados * Time.deltaTime)`: velocidad fija y llegada exacta (torretas).', 'Nunca edites `rotation.x/y/z/w`: es un `Quaternion`, no grados. Usa `Quaternion.Euler`.']
        },
        en: {
          title: 'Rotations: Lerp, Slerp and RotateTowards',
          summary: 'The four arrows rotate from the same starting angle to the same target, each with a different function. Watch the speed bar: at 170° the difference between `Lerp` and `Slerp` is obvious, and the smoothing pattern slows down at the end.',
          points: ['`Slerp`: spherical interpolation, constant angular speed with a linear t.', '`Lerp`: cheaper; with large angles, the speed is not constant.', '`RotateTowards(cur, to, degrees * Time.deltaTime)`: fixed speed and exact arrival (turrets).', 'Never edit `rotation.x/y/z/w`: it is a `Quaternion`, not degrees. Use `Quaternion.Euler`.']
        }
      }
    },
    {
      id: 'tunneling', domain: 'core', practice: { d: 'core', t: 'Física' }, icon: '💥', mount: mountTunneling,
      text: {
        es: {
          title: 'Tunneling: Discrete vs Continuous',
          summary: 'Con detección **Discrete**, la física solo comprueba la posición en cada paso. Si un objeto rápido avanza más que el grosor de la pared en un paso, puede estar antes de la pared en un paso y después en el siguiente, sin tocarla nunca. **Continuous** comprueba el recorrido entre pasos. Sube la velocidad y compara.',
          points: ['Problema: objetos rápidos y paredes finas.', 'Solución: Collision Detection `Continuous`, `Continuous Dynamic` o `Continuous Speculative`.', 'Alternativa: un raycast entre la posición anterior y la actual.', 'Continuous cuesta más CPU: úsalo solo en objetos que lo necesiten.']
        },
        en: {
          title: 'Tunneling: Discrete vs Continuous',
          summary: 'With **Discrete** detection, physics only checks the position at each step. If a fast object moves more than the wall thickness in one step, it can be before the wall on one step and past it on the next, never touching it. **Continuous** checks the path between steps. Increase the speed and compare.',
          points: ['Problem: fast objects and thin walls.', 'Fix: Collision Detection `Continuous`, `Continuous Dynamic` or `Continuous Speculative`.', 'Alternative: a raycast between the previous and current position.', 'Continuous costs more CPU: use it only on objects that need it.']
        }
      }
    },
    {
      id: 'force-mode', domain: 'core', practice: { d: 'core', t: 'Física' }, icon: '🚀', mount: mountForceMode,
      text: {
        es: {
          title: 'ForceMode: Force, Acceleration, Impulse, VelocityChange',
          summary: 'Los cuatro modos de `AddForce` se diferencian en dos cosas: si son **continuos** (pensados para aplicarse en cada `FixedUpdate`) o **instantáneos**, y si **tienen en cuenta la masa**. Cambia la masa y observa qué curvas cambian.',
          points: ['`Force`: continuo, usa la masa (empujar un coche).', '`Acceleration`: continuo, ignora la masa.', '`Impulse`: instantáneo, usa la masa (salto, explosión).', '`VelocityChange`: instantáneo, ignora la masa.']
        },
        en: {
          title: 'ForceMode: Force, Acceleration, Impulse, VelocityChange',
          summary: 'The four `AddForce` modes differ in two ways: whether they are **continuous** (meant to be applied every `FixedUpdate`) or **instantaneous**, and whether they **take mass into account**. Change the mass and see which curves change.',
          points: ['`Force`: continuous, uses mass (pushing a car).', '`Acceleration`: continuous, ignores mass.', '`Impulse`: instantaneous, uses mass (jump, explosion).', '`VelocityChange`: instantaneous, ignores mass.']
        }
      }
    },
    {
      id: 'colisiones', domain: 'core', practice: { d: 'core', t: 'Física' }, icon: '🧱', mount: mountCollisionMatrix,
      text: {
        es: {
          title: 'Matriz de colisiones: OnCollision vs OnTrigger',
          summary: '¿Qué mensaje recibe cada pareja de objetos? Depende de tres cosas: si tienen `Rigidbody`, si es **cinemático** y si el collider es **Is Trigger**. Toca cualquier celda de la matriz y mira la pareja en acción.',
          points: ['Sin ningún `Rigidbody`, no hay mensajes de ningún tipo.', '`OnTrigger*`: basta con un trigger y un `Rigidbody` (vale uno cinemático).', '`OnCollision*`: hace falta al menos un `Rigidbody` **dinámico** y ningún trigger.', 'Cinemático contra estático o cinemático: nada. Mueve los cinemáticos con `MovePosition`.']
        },
        en: {
          title: 'Collision matrix: OnCollision vs OnTrigger',
          summary: 'Which message does each pair of objects get? It depends on three things: whether they have a `Rigidbody`, whether it is **kinematic** and whether the collider is **Is Trigger**. Tap any cell in the matrix and watch that pair in action.',
          points: ['Without any `Rigidbody`, there are no messages at all.', '`OnTrigger*`: one trigger and one `Rigidbody` are enough (a kinematic one works).', '`OnCollision*`: needs at least one **dynamic** `Rigidbody` and no trigger.', 'Kinematic vs static or kinematic: nothing. Move kinematic bodies with `MovePosition`.']
        }
      }
    },
    {
      id: 'layer-mask', domain: 'core', practice: { d: 'core', t: 'Raycasts y capas' }, icon: '🎯', mount: mountLayerMask,
      text: {
        es: {
          title: 'LayerMask: máscaras de bits y raycasts',
          summary: 'Una `LayerMask` es un entero donde cada bit representa una capa. `1 << n` activa solo la capa `n`, `|` combina capas y `~` invierte la máscara. Activa y desactiva capas y mira qué objeto golpea el raycast.',
          points: ['`1 << LayerMask.NameToLayer("Enemy")` → solo Enemy.', '`~(1 << player)` → todo menos Player (el raycast no se golpea a sí mismo).', '`LayerMask.GetMask("Enemy", "Ground")` es una forma legible de combinar.', 'Ojo: pasar el **índice** de la capa (8) en lugar de la máscara (`1 << 8`) es un error clásico.']
        },
        en: {
          title: 'LayerMask: bit masks and raycasts',
          summary: 'A `LayerMask` is an integer where each bit represents a layer. `1 << n` enables only layer `n`, `|` combines layers and `~` inverts the mask. Toggle layers and see which object the raycast hits.',
          points: ['`1 << LayerMask.NameToLayer("Enemy")` → Enemy only.', '`~(1 << player)` → everything except Player (the raycast does not hit itself).', '`LayerMask.GetMask("Enemy", "Ground")` is a readable way to combine.', 'Watch out: passing the layer **index** (8) instead of the mask (`1 << 8`) is a classic bug.']
        }
      }
    },
    {
      id: 'object-pooling', domain: 'scene', practice: { d: 'scene', t: 'Object pooling' }, icon: '♻️', mount: mountPooling,
      text: {
        es: {
          title: 'Object pooling vs Instantiate/Destroy',
          summary: 'Crear y destruir objetos constantemente cuesta CPU y genera basura que, tarde o temprano, el Garbage Collector limpia de golpe (un pico en el tiempo de frame). Un pool reutiliza objetos desactivados. Sube los disparos por segundo y compara las gráficas.',
          points: ['`ObjectPool<T>`: `Get()` saca un objeto y `Release(obj)` lo devuelve.', 'Callbacks: `createFunc`, `actionOnGet`, `actionOnRelease`, `actionOnDestroy`.', 'Ventajas: menos `Instantiate`/`Destroy` y menos picos de GC.', 'Coste: los objetos inactivos siguen ocupando memoria.']
        },
        en: {
          title: 'Object pooling vs Instantiate/Destroy',
          summary: 'Creating and destroying objects constantly costs CPU and generates garbage that the Garbage Collector eventually cleans up all at once (a frame-time spike). A pool reuses deactivated objects. Increase the shots per second and compare the graphs.',
          points: ['`ObjectPool<T>`: `Get()` takes an object and `Release(obj)` returns it.', 'Callbacks: `createFunc`, `actionOnGet`, `actionOnRelease`, `actionOnDestroy`.', 'Benefits: fewer `Instantiate`/`Destroy` calls and fewer GC spikes.', 'Cost: inactive objects still use memory.']
        }
      }
    },
    {
      id: 'corrutinas', domain: 'scene', practice: { d: 'scene', t: 'Corrutinas y async' }, icon: '🧵', mount: mountCoroutines,
      text: {
        es: {
          title: 'Corrutinas: cuándo se reanuda cada yield',
          summary: 'Cada columna es un frame y cada fila, una corrutina esperando con un `yield` distinto. Cambia los FPS y el `timeScale`, y prueba `enabled = false` frente a `SetActive(false)`: es una de las diferencias que más se preguntan.',
          points: ['`yield return null`: el siguiente frame, después de `Update`.', '`WaitForSeconds` usa tiempo escalado; `WaitForSecondsRealtime`, no.', '`enabled = false` **no** detiene las corrutinas; desactivar o destruir el GameObject **sí**, y no se reanudan.', '`StopCoroutine` necesita la referencia `Coroutine` que devolvió `StartCoroutine`.']
        },
        en: {
          title: 'Coroutines: when each yield resumes',
          summary: 'Each column is a frame and each row is a coroutine waiting on a different `yield`. Change the FPS and the `timeScale`, and try `enabled = false` versus `SetActive(false)`: it is one of the most asked differences.',
          points: ['`yield return null`: the next frame, after `Update`.', '`WaitForSeconds` uses scaled time; `WaitForSecondsRealtime` does not.', '`enabled = false` does **not** stop coroutines; deactivating or destroying the GameObject **does**, and they do not resume.', '`StopCoroutine` needs the `Coroutine` reference returned by `StartCoroutine`.']
        }
      }
    },
    {
      id: 'exit-time', domain: 'art', practice: { d: 'art', t: 'Animación 3D' }, icon: '🎬', mount: mountExitTime,
      text: {
        es: {
          title: 'Animator: Has Exit Time y triggers',
          summary: 'Con **Has Exit Time** activado, una transición solo puede ocurrir cuando la animación actual llega a su Exit Time, aunque la condición ya se cumpla. Mientras tanto, el trigger se queda activo esperando. Pulsa `SetTrigger` con la opción activada y desactivada y compara el retraso.',
          points: ['Acciones inmediatas (atacar, saltar): desactiva Has Exit Time.', 'Un trigger sigue activo hasta que una transición lo consume.', 'Si nadie lo consume, puede dispararse más tarde: usa `ResetTrigger`.', 'Guarda los IDs con `Animator.StringToHash`.']
        },
        en: {
          title: 'Animator: Has Exit Time and triggers',
          summary: 'With **Has Exit Time** enabled, a transition can only happen when the current animation reaches its Exit Time, even if the condition is already met. Meanwhile, the trigger stays set, waiting. Press `SetTrigger` with the option on and off and compare the delay.',
          points: ['Immediate actions (attack, jump): disable Has Exit Time.', 'A trigger stays set until a transition consumes it.', 'If nothing consumes it, it can fire later: use `ResetTrigger`.', 'Cache IDs with `Animator.StringToHash`.']
        }
      }
    },
    {
      id: 'navmesh', domain: 'scene', practice: { d: 'scene', t: 'Navegación' }, icon: '🧭', mount: mountNavMesh,
      text: {
        es: {
          title: 'NavMesh: rutas, Carve y costes de área',
          summary: 'El agente busca la ruta de **menor coste** (A*), no necesariamente la más corta. Cierra la puerta (un `NavMeshObstacle` con **Carve** recorta la malla) o cambia el coste del pantano y mira cómo el agente recalcula la ruta. Toca el mapa para mover el destino.',
          points: ['Obstáculo que bloquea rutas: `NavMeshObstacle` + **Carve**.', 'Evitar una zona sin prohibirla: área con **coste** mayor.', 'Not Walkable: el área queda fuera de la malla.', 'Llegada: `!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance`.']
        },
        en: {
          title: 'NavMesh: paths, Carve and area costs',
          summary: 'The agent looks for the **lowest-cost** path (A*), not necessarily the shortest. Close the door (a `NavMeshObstacle` with **Carve** cuts the mesh) or change the swamp cost and see how the agent recalculates its path. Tap the map to move the destination.',
          points: ['Obstacle that blocks paths: `NavMeshObstacle` + **Carve**.', 'Avoid an area without forbidding it: an area with a higher **cost**.', 'Not Walkable: the area is left out of the mesh.', 'Arrival: `!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance`.']
        }
      }
    },
    {
      id: 'materiales', domain: 'art', practice: { d: 'art', t: 'Materiales' }, icon: '🎨', mount: mountMaterials,
      text: {
        es: {
          title: 'material vs sharedMaterial vs MaterialPropertyBlock',
          summary: 'Cinco enemigos comparten un material. Selecciona uno y prueba cada opción: `.material` crea una **instancia** solo para ese renderer, `.sharedMaterial` cambia el **asset** para todos y un `MaterialPropertyBlock` cambia el valor solo en ese renderer **sin** crear materiales nuevos.',
          points: ['`.material`: copia por objeto (memoria, rompe el batching; destrúyela al terminar).', '`.sharedMaterial`: afecta a todos y, en el Editor, modifica el asset.', '`MaterialPropertyBlock`: valores por renderer sin instancias.', 'En URP, los property blocks hacen el objeto incompatible con el SRP Batcher.']
        },
        en: {
          title: 'material vs sharedMaterial vs MaterialPropertyBlock',
          summary: 'Five enemies share one material. Select one and try each option: `.material` creates an **instance** just for that renderer, `.sharedMaterial` changes the **asset** for everyone and a `MaterialPropertyBlock` changes the value only on that renderer **without** creating new materials.',
          points: ['`.material`: a copy per object (memory, breaks batching; destroy it when done).', '`.sharedMaterial`: affects everyone and, in the Editor, modifies the asset.', '`MaterialPropertyBlock`: per-renderer values without instances.', 'In URP, property blocks make the object incompatible with the SRP Batcher.']
        }
      }
    },
    {
      id: 'iluminacion', domain: 'art', practice: { d: 'art', t: 'Iluminación' }, icon: '💡', mount: mountLightModes,
      text: {
        es: {
          title: 'Modos de luz: Realtime, Mixed y Baked',
          summary: 'Una luz, una caja **Static** y un personaje que se mueve. Cambia el modo de la luz, cambia su color en runtime y quita las Light Probes: verás qué se actualiza al momento, qué se queda horneado y por qué los objetos dinámicos se ven apagados con luz Baked.',
          points: ['Realtime: todo dinámico, lo más caro, sin GI horneada.', 'Mixed (Baked Indirect): directa y sombras en tiempo real, rebote horneado.', 'Baked: solo afecta a objetos **Static** vía lightmaps; cambiarla en runtime no hace nada.', 'Objetos dinámicos en escenas horneadas: **Light Probes** (y Reflection Probes para reflejos).']
        },
        en: {
          title: 'Light modes: Realtime, Mixed and Baked',
          summary: 'One light, a **Static** crate and a moving character. Change the light mode, change its color at runtime and turn off the Light Probes: you will see what updates instantly, what stays baked and why dynamic objects look unlit with a Baked light.',
          points: ['Realtime: everything dynamic, the most expensive, no baked GI.', 'Mixed (Baked Indirect): direct light and shadows in real time, bounce baked.', 'Baked: only affects **Static** objects via lightmaps; changing it at runtime does nothing.', 'Dynamic objects in baked scenes: **Light Probes** (and Reflection Probes for reflections).']
        }
      }
    },
    {
      id: 'batching', domain: 'perf', practice: { d: 'perf', t: 'Renderizado' }, icon: '📦', mount: mountBatching,
      text: {
        es: {
          title: 'Batching: draw calls y SetPass calls',
          summary: 'La CPU tiene que pedirle a la GPU que dibuje cada cosa (draw call) y cambiar de material o shader (SetPass) es lo más caro. Mira cómo se "pinta" el frame con cada técnica y cómo cambian los contadores al usar más materiales o mallas.',
          points: ['Static batching: combina por material; los objetos no se pueden mover.', 'GPU Instancing: misma malla + mismo material, muchas copias en un draw call.', 'SRP Batcher (URP/HDRP): agrupa por variante de shader; draw calls baratos.', 'Compruébalo con el **Frame Debugger** y las estadísticas (Stats) del Game view.']
        },
        en: {
          title: 'Batching: draw calls and SetPass calls',
          summary: 'The CPU has to ask the GPU to draw each thing (draw call), and switching material or shader (SetPass) is the expensive part. Watch how the frame gets "painted" with each technique and how the counters change with more materials or meshes.',
          points: ['Static batching: combines per material; objects cannot move.', 'GPU Instancing: same mesh + same material, many copies in one draw call.', 'SRP Batcher (URP/HDRP): groups by shader variant; cheap draw calls.', 'Check it with the **Frame Debugger** and the Game view Stats.']
        }
      }
    },
    {
      id: 'time-scale', domain: 'systems', practice: { d: 'systems', t: 'Pausa y tiempo' }, icon: '⏸️', mount: mountTimeScale,
      text: {
        es: {
          title: 'Time.timeScale: qué se detiene al pausar',
          summary: 'Poner `Time.timeScale = 0` no detiene el juego entero: `Update` se sigue llamando, pero `Time.deltaTime` vale 0, la física se detiene y `WaitForSeconds` se congela. Lo que usa tiempo unscaled sigue funcionando. Mueve el slider y observa cada fila.',
          points: ['`Update`: se sigue llamando (por eso puedes leer el input del menú de pausa).', '`FixedUpdate`: deja de ejecutarse con timeScale 0.', '`WaitForSeconds` se congela; `WaitForSecondsRealtime` sigue.', 'UI animada en pausa: `unscaledDeltaTime` o Animator en **Unscaled Time**.']
        },
        en: {
          title: 'Time.timeScale: what stops when you pause',
          summary: 'Setting `Time.timeScale = 0` does not stop the whole game: `Update` is still called, but `Time.deltaTime` is 0, physics stops and `WaitForSeconds` freezes. Anything using unscaled time keeps working. Move the slider and watch each row.',
          points: ['`Update`: still called (that is why you can read pause-menu input).', '`FixedUpdate`: stops running with timeScale 0.', '`WaitForSeconds` freezes; `WaitForSecondsRealtime` keeps going.', 'Animated UI while paused: `unscaledDeltaTime` or an Animator on **Unscaled Time**.']
        }
      }
    }
  ];
})();
