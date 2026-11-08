/* Conceptos animados: art (programación para el pipeline de arte) */
(function () {
  'use strict';
  const K = UCP.conceptKit;
  const { colors, el, makeCanvas, loop, controls, button, seg, slider, toggle, readout, roundRect, text, code, codeBlock, drag, arrow, box, lerp, clamp, ease } = K;
  const TAU = Math.PI * 2;
  const cd = (s) => code(K.esc(s));

  /* ---------------------------------------------------------
     Utilidades privadas
     --------------------------------------------------------- */

  function rgb(c) {
    c = String(c).replace('#', '').trim();
    if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
    const n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hex(a) { return '#' + a.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); t = clamp(t, 0, 1); return hex(x.map((v, i) => v + (y[i] - v) * t)); }
  function mul(a, b) { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => (v * y[i]) / 255)); }
  function rgba(a, al) { return 'rgba(' + rgb(a).join(',') + ',' + al + ')'; }
  function show(e, on) { e.style.display = on ? '' : 'none'; }
  function setSlider(input, v, fmt) { input.value = v; const b = input.parentNode.querySelector('b'); if (b) b.textContent = fmt ? fmt(v) : v; }
  function num(v, d, lang) { const s = v.toFixed(d); return lang === 'es' ? s.replace('.', ',') : s; }

  // Suelo con marcas que se desplazan (off crece → el suelo se mueve hacia atrás).
  function ground(ctx, x0, x1, y, off, c) {
    ctx.strokeStyle = c.border; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
    const step = 26;
    for (let s = x0 - (((off % step) + step) % step) + step; s < x1; s += step) {
      ctx.beginPath(); ctx.moveTo(s, y + 3); ctx.lineTo(s - 6, y + 10); ctx.stroke();
    }
  }

  // Poses de un personaje de palitos. Ángulos desde la vertical (positivo = hacia delante).
  const PK = ['lean', 'tL', 'kL', 'tR', 'kR', 'aL', 'eL', 'aR', 'eR'];
  function gait(kind, ph) {
    const w = TAU * ph;
    if (kind === 'idle') {
      const b = Math.sin(w) * 0.03;
      return { lean: 0.03 + b, tL: 0.1, kL: 0.06, tR: -0.1, kR: 0.06, aL: 0.08 + b, eL: 0.2, aR: -0.06 - b, eR: 0.2 };
    }
    const run = kind === 'run';
    const A = run ? 0.68 : 0.42, Kn = run ? 1.7 : 0.95, Ar = run ? 0.95 : 0.4;
    const leg = (q) => ({ t: A * Math.sin(q), k: 0.08 + Kn * Math.pow(Math.max(0, Math.cos(q)), 1.2) });
    const l = leg(w), r = leg(w + Math.PI);
    return { lean: run ? 0.22 : 0.06, tL: l.t, kL: l.k, tR: r.t, kR: r.k, aL: -Ar * Math.sin(w), eL: run ? 1.5 : 0.35, aR: Ar * Math.sin(w), eR: run ? 1.5 : 0.35 };
  }
  function blendPoses(list) {
    const o = {};
    PK.forEach((k) => { o[k] = list.reduce((s, it) => s + it[0][k] * it[1], 0); });
    return o;
  }

  // Dibuja el personaje con los pies en gy (salvo que se pase opts.hipY). col: color o función(parte) → color.
  function figure(ctx, x, gy, s, p, col) {
    const cf = typeof col === 'function' ? col : () => col;
    const T = 22 * s, S = 22 * s, B = 30 * s, U = 16 * s, F = 15 * s, R = 7 * s;
    const leg = (t, k) => { const kx = Math.sin(t) * T, ky = Math.cos(t) * T; return { kx, ky, fx: kx + Math.sin(t - k) * S, fy: ky + Math.cos(t - k) * S }; };
    const l = leg(p.tL, p.kL), r = leg(p.tR, p.kR);
    const hx = x, hy = gy - Math.max(l.fy, r.fy);
    const ux = Math.sin(p.lean), uy = -Math.cos(p.lean);
    const sx = hx + ux * (B - 2 * s), sy = hy + uy * (B - 2 * s);
    const arm = (a, e) => { const ex = sx + Math.sin(a) * U, ey = sy + Math.cos(a) * U; return { ex, ey, hx: ex + Math.sin(a + e) * F, hy: ey + Math.cos(a + e) * F }; };
    const al = arm(p.aL, p.eL), ar = arm(p.aR, p.eR);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4.5 * s;
    const ga = ctx.globalAlpha;
    const poly = (pts, c, a) => {
      ctx.globalAlpha = ga * a; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.stroke(); ctx.globalAlpha = ga;
    };
    poly([hx, hy, hx + r.kx, hy + r.ky, hx + r.fx, hy + r.fy], cf('legR'), 0.5);
    poly([sx, sy, ar.ex, ar.ey, ar.hx, ar.hy], cf('armR'), 0.5);
    poly([hx, hy, hx + ux * B, hy + uy * B], cf('torso'), 1);
    ctx.fillStyle = cf('head');
    ctx.beginPath(); ctx.arc(hx + ux * (B + R + 2 * s), hy + uy * (B + R + 2 * s), R, 0, TAU); ctx.fill();
    poly([hx, hy, hx + l.kx, hy + l.ky, hx + l.fx, hy + l.fy], cf('legL'), 1);
    poly([sx, sy, al.ex, al.ey, al.hx, al.hy], cf('armL'), 1);
    return { hip: [hx, hy], footL: [hx + l.fx, hy + l.fy], footR: [hx + r.fx, hy + r.fy], hand: [al.hx, al.hy], fore: Math.atan2(al.hy - al.ey, al.hx - al.ex) };
  }

  /* ---------------------------------------------------------
     1. Propiedades de shader: _BaseColor, _Color y la keyword _EMISSION
     --------------------------------------------------------- */

  function mountShaderProps(host, lang) {
    const L = {
      es: { std: 'Built-in Standard', urp: 'URP Lit', set: 'SetColor(…, rojo)', emis: 'SetColor("_EmissionColor", cian)', kw: 'EnableKeyword("_EMISSION")',
        editor: 'Editor', build: 'Build', strip: 'Build (variante eliminada)', reset: 'Reiniciar', props: 'Propiedades del shader', kws: 'Keywords', none: 'ninguna',
        notFound: 'no existe → se ignora', main: '← .color', variant: 'variante _EMISSION eliminada', pick: 'Elige un nombre de propiedad y pulsa SetColor.',
        ok: (n, sh) => '✓ ' + cd(n) + ' existe en <b>' + sh + '</b>: el color base cambia.',
        okMain: (m) => '✓ ' + cd('material.color') + ' usa la propiedad de color principal de este shader: ' + cd(m) + '.',
        bad: (n, sh) => '✗ ' + cd(n) + ' no existe en <b>' + sh + '</b>: ' + cd('SetColor') + ' no hace nada y <b>no da ningún error</b>.',
        eNone: 'Emisión: aún no has asignado ' + cd('_EmissionColor') + '.',
        eNoKw: '✗ No brilla: ' + cd('_EmissionColor') + ' está asignado, pero falta ' + cd('EnableKeyword("_EMISSION")') + ', así que no se usa la variante del shader con emisión.',
        eStrip: '✗ No brilla en la build: ningún material de la build usaba ' + cd('_EMISSION') + ' y esa variante del shader se eliminó al compilar (stripping). Actívala en algún material incluido o añádela a un Shader Variant Collection.',
        eOk: '✓ Brilla: keyword ' + cd('_EMISSION') + ' activa + ' + cd('_EmissionColor') + ' brillante.', eBuild: ' La variante está en la build porque algún material la usa.',
        mainComment: '// material.color → propiedad [MainColor] del shader' },
      en: { std: 'Built-in Standard', urp: 'URP Lit', set: 'SetColor(…, red)', emis: 'SetColor("_EmissionColor", cyan)', kw: 'EnableKeyword("_EMISSION")',
        editor: 'Editor', build: 'Build', strip: 'Build (variant stripped)', reset: 'Reset', props: 'Shader properties', kws: 'Keywords', none: 'none',
        notFound: 'not found → ignored', main: '← .color', variant: '_EMISSION variant stripped', pick: 'Pick a property name and press SetColor.',
        ok: (n, sh) => '✓ ' + cd(n) + ' exists in <b>' + sh + '</b>: the base color changes.',
        okMain: (m) => '✓ ' + cd('material.color') + ' uses this shader’s main color property: ' + cd(m) + '.',
        bad: (n, sh) => '✗ ' + cd(n) + ' does not exist in <b>' + sh + '</b>: ' + cd('SetColor') + ' does nothing and <b>raises no error</b>.',
        eNone: 'Emission: you have not set ' + cd('_EmissionColor') + ' yet.',
        eNoKw: '✗ No glow: ' + cd('_EmissionColor') + ' is set, but ' + cd('EnableKeyword("_EMISSION")') + ' is missing, so the shader variant with emission is not used.',
        eStrip: '✗ No glow in the build: no material in the build used ' + cd('_EMISSION') + ', so that shader variant was stripped at build time. Enable it on an included material or add it to a Shader Variant Collection.',
        eOk: '✓ It glows: keyword ' + cd('_EMISSION') + ' enabled + a bright ' + cd('_EmissionColor') + '.', eBuild: ' The variant is in the build because some material uses it.',
        mainComment: '// material.color → the shader’s [MainColor] property' }
    }[lang];
    const SH = {
      std: { name: 'Standard', main: '_Color', props: [['_Color', 'Color'], ['_MainTex', '2D'], ['_Metallic', 'Range'], ['_Glossiness', 'Range'], ['_EmissionColor', 'Color']] },
      urp: { name: 'Universal Render Pipeline/Lit', short: 'URP/Lit', main: '_BaseColor', props: [['_BaseColor', 'Color'], ['_BaseMap', '2D'], ['_Metallic', 'Range'], ['_Smoothness', 'Range'], ['_EmissionColor', 'Color']] }
    };
    const NAMES = ['_Color', '_BaseColor', '_MainColor', '_Albedo', 'material.color'];
    const GRAY = '#b8bec9', RED = '#e5484d';
    let shader = 'urp', name = '_Color', base = GRAY, shown = GRAY, emis = false, kw = false, mode = 'editor', scan = null, last = null, glow = 0, t = 0;

    function finish() {
      scan.done = true;
      if (scan.found >= 0) { if (scan.isEmis) emis = true; else base = RED; }
      if (!scan.isEmis) last = { nm: scan.nm, target: scan.target, ok: scan.found >= 0 };
    }
    function doSet(nm, isEmis) {
      const sh = SH[shader];
      if (scan && !scan.done) finish();
      const target = nm === 'material.color' ? sh.main : nm;
      scan = { nm, target, isEmis, found: sh.props.findIndex((p) => p[0] === target), t: 0, done: false, hold: 0 };
    }
    const c1 = controls(host);
    seg(c1, [{ v: 'std', l: L.std }, { v: 'urp', l: L.urp }], shader, (v) => { shader = v; base = GRAY; last = null; scan = null; });
    const c2 = controls(host);
    seg(c2, NAMES.map((n) => ({ v: n, l: n })), name, (v) => { name = v; });
    button(c2, L.set, () => doSet(name, false), true);
    const c3 = controls(host);
    button(c3, L.emis, () => doSet('_EmissionColor', true));
    toggle(c3, L.kw, kw, (v) => { kw = v; });
    seg(c3, [{ v: 'editor', l: L.editor }, { v: 'build', l: L.build }, { v: 'strip', l: L.strip }], mode, (v) => { mode = v; });
    button(c3, L.reset, () => { base = GRAY; emis = false; last = null; scan = null; });
    const stage = makeCanvas(host, (w) => (w < 520 ? 322 : 214));
    const out = readout(host);
    const cb = codeBlock(host);

    const stop = loop((dt) => {
      t += dt;
      const sh = SH[shader];
      if (scan && !scan.done) {
        scan.t += dt * 7;
        const end = scan.found >= 0 ? scan.found : sh.props.length;
        if (scan.t >= end) {
          scan.t = end; finish();
        }
      } else if (scan) { scan.hold += dt; if (scan.hold > 2.2) scan = null; }
      const glowing = emis && kw && mode !== 'strip';
      glow = lerp(glow, glowing ? 1 : 0, Math.min(1, dt * 6));
      shown = mix(shown, base, Math.min(1, dt * 8));

      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 520;
      const sx = narrow ? w / 2 : Math.min(130, w * 0.18), sy = narrow ? 48 : h / 2 - 12, r = narrow ? 36 : 56;
      // Esfera
      if (glow > 0.01) {
        const g = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 1.6);
        g.addColorStop(0, 'rgba(34,211,238,' + (0.8 * glow * (0.85 + 0.15 * Math.sin(t * 4))) + ')');
        g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r * 1.6, 0, TAU); ctx.fill();
      }
      const body = mix(shown, '#ffffff', 0.25 * glow);
      const g2 = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.08, sx, sy, r);
      g2.addColorStop(0, mix(body, '#ffffff', 0.6)); g2.addColorStop(0.55, body); g2.addColorStop(1, mix(body, '#000000', 0.5 - 0.3 * glow));
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      const capY = sy + r + (narrow ? 14 : 22);
      text(ctx, sh.short || sh.name, sx, capY, c.text, { align: 'center', mono: true });
      text(ctx, mode === 'editor' ? L.editor : mode === 'build' ? L.build : L.build + ': ' + L.variant, sx, capY + 16, mode === 'strip' ? c.bad : c.muted, { align: 'center' });

      // Lista de propiedades (como el Inspector)
      const lx = narrow ? 12 : Math.max(sx * 2 + 30, w * 0.38), ly = narrow ? 134 : 14;
      const lw = narrow ? w - 24 : Math.min(w - lx - 12, 440), rh = 22;
      ctx.fillStyle = c.soft; roundRect(ctx, lx, ly, lw, rh * 8 + 8, 8); ctx.fill();
      text(ctx, L.props + ' · ' + (sh.short || sh.name), lx + 10, ly + 13, c.muted);
      sh.props.forEach((p, i) => {
        const y = ly + 8 + rh * (i + 1);
        let fill = null, col = c.text;
        if (scan) {
          const cur = Math.floor(scan.t);
          if (!scan.done && i === cur) fill = c.accentSoft;
          else if (scan.done && i === scan.found) { fill = c.ok; col = '#fff'; }
          else if (i < cur) col = c.muted;
        }
        if (fill) { ctx.fillStyle = fill; roundRect(ctx, lx + 4, y, lw - 8, rh - 2, 5); ctx.fill(); }
        if (scan && !scan.done && i === Math.floor(scan.t)) { ctx.strokeStyle = c.accent; ctx.lineWidth = 2; roundRect(ctx, lx + 4, y, lw - 8, rh - 2, 5); ctx.stroke(); }
        text(ctx, p[0], lx + 10, y + rh / 2 - 1, col, { mono: true });
        text(ctx, p[1], lx + Math.min(150, lw * 0.52), y + rh / 2 - 1, fill === c.ok ? '#fff' : c.muted);
        if (p[0] === sh.main) text(ctx, L.main, lx + lw - 10, y + rh / 2 - 1, fill === c.ok ? '#fff' : c.accent, { align: 'right', mono: true });
      });
      const ry = ly + 8 + rh * 6;
      if (scan && scan.done && scan.found < 0) {
        ctx.fillStyle = c.badSoft; roundRect(ctx, lx + 4, ry, lw - 8, rh - 2, 5); ctx.fill();
        text(ctx, '✗ ' + scan.target + ': ' + L.notFound, lx + 10, ry + rh / 2 - 1, c.bad);
      } else if (scan && !scan.done) {
        text(ctx, 'SetColor("' + scan.target + '") …', lx + 10, ry + rh / 2 - 1, c.accent, { mono: true });
      }
      text(ctx, L.kws + ': ', lx + 10, ry + rh + rh / 2 - 1, c.muted);
      text(ctx, kw ? '_EMISSION' : L.none, lx + 10 + ctx.measureText(L.kws + ': ').width, ry + rh + rh / 2 - 1, kw ? c.ok : c.muted, { mono: kw });

      const sName = SH[shader].name;
      let l1 = L.pick;
      if (last) l1 = last.ok ? (last.nm === 'material.color' ? L.okMain(last.target) : L.ok(last.nm, sName)) : L.bad(last.nm, sName);
      let l2;
      if (!emis) l2 = L.eNone;
      else if (!kw) l2 = L.eNoKw;
      else if (mode === 'strip') l2 = L.eStrip;
      else l2 = L.eOk + (mode === 'build' ? L.eBuild : '');
      out('<span>' + l1 + '</span><p>' + l2 + '</p>');
      const isMain = name === 'material.color';
      cb([
        isMain ? L.mainComment : 'static readonly int Id = Shader.PropertyToID("' + name + '");',
        isMain ? 'mat.color = Color.red;' : 'mat.SetColor(Id, Color.red);',
        'mat.EnableKeyword("_EMISSION");',
        'mat.SetColor("_EmissionColor", Color.cyan * 3f);'
      ].join('\n'), { 1: last && last.nm === name ? (last.ok ? 'ok' : 'bad') : 'hl', 2: kw ? 'ok' : 'off', 3: emis ? (glowing ? 'ok' : 'bad') : 'off' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     2. Animation Events y Root Motion (OnAnimatorMove)
     --------------------------------------------------------- */

  function mountEventsRoot(host, lang) {
    const L = {
      es: { tabE: 'Animation Events', tabR: 'Root Motion', speed: 'animator.speed', same: 'Script en el GameObject del Animator', ev: 'Animation Event', timer: 'Corrutina cada 0,5 s', timerS: 'Corrutina 0,5 s', cRecv: '// En un componente del GameObject que tiene el Animator', cFrag: '// alternativa frágil',
        clip: 'Clip Walk (1 s)', off: 'Apply Root Motion OFF', on: 'Apply Root Motion ON', wall: 'pared', inPlace: 'en el sitio', noGrav: 'sin gravedad', stuck: 'choca',
        evOk: '✓ El Animation Event ' + cd('Footstep()') + ' está en 0.25 y 0.75 del clip: suena justo en el contacto del pie, a cualquier velocidad.',
        evBad: '✗ Consola: ' + cd("'Footstep' AnimationEvent has no receiver!") + ' El método debe estar en un componente del GameObject que tiene el ' + cd('Animator') + '.',
        tSync: 'Corrutina: ahora mismo coincide… por casualidad. Cambia la velocidad.',
        tOff: (ms) => '✗ Corrutina: el último sonido sonó a <b>' + ms + ' ms</b> del contacto del pie. Un temporizador no sabe nada de la animación.',
        rOff: '✗ Apply Root Motion desactivado: el desplazamiento del clip se descarta y el personaje anima en el sitio (los pies patinan).',
        rOn: 'Apply Root Motion: Unity aplica él solo el desplazamiento del clip. Solo trae el avance de la animación: en el escalón sigue recto (nadie añade gravedad) y tú no puedes intervenir.',
        rMove: '✓ ' + cd('OnAnimatorMove') + ': Unity deja de aplicar el root motion y te lo pasa. Tomas ' + cd('animator.deltaPosition') + ', le sumas gravedad y llamas a ' + cd('CharacterController.Move') + ': cae por el escalón y se detiene en la pared.',
        rIk: '✗ ' + cd('OnAnimatorIK') + ' sirve para cinemática inversa (manos, pies, mirada). No toma el control del root motion: se comporta igual que Apply Root Motion.',
        cOff: '// El desplazamiento del clip se descarta', cOn: '// Sin OnAnimatorMove: Unity aplica el movimiento del clip',
        cMove: '// respeta paredes y suelo', cIk: '// IK: no controla el root motion' },
      en: { tabE: 'Animation Events', tabR: 'Root Motion', speed: 'animator.speed', same: 'Script on the Animator’s GameObject', ev: 'Animation Event', timer: 'Coroutine every 0.5 s', timerS: 'Coroutine 0.5 s', cRecv: '// On a component of the GameObject that has the Animator', cFrag: '// fragile alternative',
        clip: 'Walk clip (1 s)', off: 'Apply Root Motion OFF', on: 'Apply Root Motion ON', wall: 'wall', inPlace: 'in place', noGrav: 'no gravity', stuck: 'blocked',
        evOk: '✓ The Animation Event ' + cd('Footstep()') + ' sits at 0.25 and 0.75 of the clip: it plays exactly on foot contact, at any speed.',
        evBad: '✗ Console: ' + cd("'Footstep' AnimationEvent has no receiver!") + ' The method must live on a component of the GameObject that has the ' + cd('Animator') + '.',
        tSync: 'Coroutine: it matches right now… by luck. Change the speed.',
        tOff: (ms) => '✗ Coroutine: the last sound played <b>' + ms + ' ms</b> away from the foot contact. A timer knows nothing about the animation.',
        rOff: '✗ Apply Root Motion off: the clip’s movement is thrown away and the character animates in place (feet slide).',
        rOn: 'Apply Root Motion: Unity applies the clip’s movement by itself. It only carries the animation’s forward motion: at the step it keeps going straight (nobody adds gravity) and you cannot step in.',
        rMove: '✓ ' + cd('OnAnimatorMove') + ': Unity stops applying root motion and hands it to you. You take ' + cd('animator.deltaPosition') + ', add gravity and call ' + cd('CharacterController.Move') + ': it drops down the step and stops at the wall.',
        rIk: '✗ ' + cd('OnAnimatorIK') + ' is for inverse kinematics (hands, feet, look-at). It does not take over root motion: it behaves like plain Apply Root Motion.',
        cOff: '// The clip’s movement is discarded', cOn: '// No OnAnimatorMove: Unity applies the clip’s motion',
        cMove: '// respects walls and ground', cIk: '// IK: does not control root motion' }
    }[lang];
    let tab = 'events', speed = 1, same = true, ph = 0, acc = 0.25, rings = [], marks = [], lampE = 0, lampT = 0, lastErr = 0;
    let rmode = 'move', px = 0, py = 0, vy = 0, rph = 0, stuck = 0, fade = 0, needReset = true;
    const top = controls(host);
    seg(top, [{ v: 'events', l: L.tabE }, { v: 'root', l: L.tabR }], tab, (v) => { tab = v; show(pe, v === 'events'); show(pr, v === 'root'); });
    const pe = controls(host);
    slider(pe, L.speed, 0.5, 2, 0.1, speed, (v) => { speed = v; }, (v) => v.toFixed(1) + '×');
    toggle(pe, L.same, same, (v) => { same = v; });
    const pr = controls(host);
    seg(pr, [{ v: 'off', l: L.off }, { v: 'on', l: L.on }, { v: 'move', l: 'OnAnimatorMove' }, { v: 'ik', l: 'OnAnimatorIK' }], rmode, (v) => { rmode = v; needReset = true; });
    show(pr, false);
    const stage = makeCanvas(host, 210);
    const out = readout(host);
    const cb = codeBlock(host);

    function drawEvents(c, ctx, w, dt) {
      const prev = ph;
      ph = (ph + (dt * speed) / 1) % 1;
      const crossed = (e) => (prev < ph ? prev < e && ph >= e : prev < e || ph >= e);
      const fx = Math.min(w * 0.28, 150), gy = 122, s = 1;
      const f = figure(ctx, fx, gy, s, gait('walk', ph), c.text);
      [[0.25, f.footL], [0.75, f.footR]].forEach((e) => {
        if (crossed(e[0])) { rings.push({ x: e[1][0], y: gy, age: 0, ok: same }); lampE = 1; }
      });
      acc += dt;
      if (acc >= 0.5) {
        acc -= 0.5; lampT = 1;
        marks.push({ p: ph, age: 0 }); if (marks.length > 8) marks.shift();
        const d = Math.min(...[0.25, 0.75].map((e) => Math.min(Math.abs(ph - e), 1 - Math.abs(ph - e))));
        lastErr = (d * 1000) / speed;
      }
      ground(ctx, 10, Math.min(w * 0.5, 290), gy, (ph + Math.floor(t)) * 72, c);
      rings = rings.filter((r) => (r.age += dt) < 0.7);
      rings.forEach((r) => {
        ctx.globalAlpha = 1 - r.age / 0.7;
        ctx.strokeStyle = r.ok ? c.ok : c.bad; ctx.lineWidth = 2.5;
        if (r.ok) { ctx.beginPath(); ctx.ellipse(r.x, r.y, 6 + r.age * 40, 3 + r.age * 14, 0, 0, TAU); ctx.stroke(); }
        else text(ctx, '✗', r.x, r.y - 14 - r.age * 10, c.bad, { align: 'center' });
        ctx.globalAlpha = 1;
      });
      // Lámparas: evento y corrutina
      lampE = Math.max(0, lampE - dt * 3); lampT = Math.max(0, lampT - dt * 3);
      const lx = Math.max(fx + 70, w * 0.52), lamp = (y, v, col, label, okLamp) => {
        ctx.fillStyle = c.soft; ctx.beginPath(); ctx.arc(lx, y, 10, 0, TAU); ctx.fill();
        if (v > 0) { ctx.globalAlpha = v; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx, y, 10, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(lx, y, 10 + (1 - v) * 12, 0, TAU); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; }
        text(ctx, label, lx + 18, y, okLamp ? c.text : c.muted);
      };
      const nar = w < 480, tl = nar ? L.timerS : L.timer;
      lamp(42, same ? lampE : 0, c.ok, (nar ? '' : '🔊 ') + L.ev, same);
      lamp(86, lampT, c.warn, (nar ? '' : '🔊 ') + tl, true);
      // Línea de tiempo del clip
      const x0 = 14, x1 = w - 14, ty = 166;
      text(ctx, L.clip, x0, 200, c.muted);
      ctx.fillStyle = c.soft; roundRect(ctx, x0, ty - 6, x1 - x0, 12, 6); ctx.fill();
      [0.25, 0.75].forEach((e) => {
        const x = lerp(x0, x1, e);
        ctx.fillStyle = same ? c.ok : c.bad;
        ctx.beginPath(); ctx.moveTo(x, ty - 12); ctx.lineTo(x + 6, ty - 6); ctx.lineTo(x, ty); ctx.lineTo(x - 6, ty - 6); ctx.closePath(); ctx.fill();
        text(ctx, 'Footstep', x, 146, same ? c.ok : c.bad, { align: 'center' });
      });
      marks.forEach((m) => {
        m.age += dt;
        ctx.globalAlpha = Math.max(0.15, 1 - m.age / 4);
        ctx.fillStyle = c.warn; ctx.beginPath(); ctx.arc(lerp(x0, x1, m.p), ty + 16, 4, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      });
      text(ctx, '● ' + tl, x1, 200, c.warn, { align: 'right' });
      ctx.strokeStyle = c.text; ctx.lineWidth = 2;
      const px2 = lerp(x0, x1, ph);
      ctx.beginPath(); ctx.moveTo(px2, ty - 10); ctx.lineTo(px2, ty + 10); ctx.stroke();
      out('<span>' + (same ? L.evOk : L.evBad) + '</span><p>' + (lastErr < 40 ? L.tSync : L.tOff(Math.round(lastErr))) + '</p>');
      cb([L.cRecv,
        'public void Footstep() => source.PlayOneShot(stepClip);',
        '',
        'IEnumerator StepTimer() {   ' + L.cFrag,
        '    while (true) { source.PlayOneShot(stepClip); yield return new WaitForSeconds(0.5f); }',
        '}'].join('\n'), { 1: same ? 'ok' : 'bad', 3: lastErr < 40 ? 'off' : 'bad', 4: lastErr < 40 ? 'off' : 'bad', 5: 'off' });
    }

    function drawRoot(c, ctx, w, dt) {
      const sw = Math.min(w - 24, 560), x0 = (w - sw) / 2, gy = 150, drop = 28, s = 0.9;
      const ledge = x0 + sw * 0.42, wallX = x0 + sw * 0.8, v = 72 * s, start = x0 + 26;
      if (needReset) { px = start; py = gy; vy = 0; stuck = 0; fade = 0; needReset = false; }
      rph = (rph + dt) % 1;
      let moving = true;
      if (rmode === 'off') { px = start; py = gy; }
      else if (rmode === 'on' || rmode === 'ik') {
        px += v * dt; py = gy;
        if (px > wallX - 34) { fade += dt; if (fade > 0.6) needReset = true; }
      } else {
        let nx = px + v * dt;
        if (nx > wallX - 12) { nx = wallX - 12; stuck += dt; moving = false; }
        px = nx; vy += 900 * dt; py += vy * dt;
        const floor = px < ledge ? gy : gy + drop;
        if (py >= floor) { py = floor; vy = 0; }
        if (stuck > 1.6) needReset = true;
      }
      // Escenario
      ctx.strokeStyle = c.border; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(ledge, gy); ctx.lineTo(ledge, gy + drop); ctx.lineTo(x0 + sw, gy + drop); ctx.stroke();
      ctx.fillStyle = c.soft; ctx.fillRect(ledge, gy + 2, x0 + sw - ledge, drop - 2);
      ctx.fillStyle = c.muted; ctx.fillRect(wallX, 40, 12, gy + drop - 40);
      text(ctx, L.wall, wallX + 6, 30, c.muted, { align: 'center' });
      ctx.globalAlpha = 1 - clamp(fade / 0.6, 0, 1);
      figure(ctx, px, py, s, gait('walk', rph), rmode === 'move' ? c.ok : rmode === 'off' ? c.text : c.accent);
      ctx.globalAlpha = 1;
      if (rmode === 'off') text(ctx, L.inPlace, px, gy + 16, c.bad, { align: 'center' });
      if ((rmode === 'on' || rmode === 'ik') && px > ledge) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = c.bad; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px, gy + drop); ctx.stroke(); ctx.setLineDash([]);
        text(ctx, L.noGrav, px + 8, gy + 14, c.bad);
      }
      if (rmode === 'move' && !moving) text(ctx, L.stuck, wallX - 40, 52, c.ok, { align: 'center' });
      const dp = rmode === 'off' ? 0.024 : (v / 50) * (1 / 60);
      text(ctx, 'deltaPosition ≈ ' + dp.toFixed(3) + ' m/frame', x0, 14, c.muted, { mono: true });
      out({ off: L.rOff, on: L.rOn, move: L.rMove, ik: L.rIk }[rmode]);
      const src = {
        off: ['animator.applyRootMotion = false;', L.cOff],
        on: ['animator.applyRootMotion = true;', L.cOn],
        move: ['void OnAnimatorMove()', '{', '    Vector3 delta = animator.deltaPosition;',
          '    if (controller.isGrounded) velocityY = -1f;',
          '    velocityY += Physics.gravity.y * Time.deltaTime;',
          '    delta.y = velocityY * Time.deltaTime;',
          '    controller.Move(delta);   ' + L.cMove, '    transform.rotation *= animator.deltaRotation;', '}'],
        ik: ['void OnAnimatorIK(int layerIndex)   ' + L.cIk, '{', '    animator.SetLookAtWeight(1f);', '    animator.SetLookAtPosition(target.position);', '}']
      }[rmode];
      cb(src.join('\n'), rmode === 'move' ? { 0: 'ok', 2: 'hl', 6: 'ok' } : rmode === 'ik' ? { 0: 'bad' } : { 0: rmode === 'off' ? 'bad' : 'hl' });
    }

    let t = 0;
    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'events') drawEvents(c, ctx, w, dt); else drawRoot(c, ctx, w, dt);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     3. Blend Tree 1D (Idle / Walk / Run)
     --------------------------------------------------------- */

  function mountBlendTree(host, lang) {
    const L = {
      es: { tree: 'Blend Tree 1D', states: '3 estados + triggers', speed: 'Speed', auto: 'Acelerar / frenar', pop: '¡salto!', slip: 'los pies patinan',
        tree1: (s, wt) => 'Speed = <b>' + s + '</b> → ' + wt,
        treeOk: '✓ Mezcla continua: el peso se reparte entre los dos umbrales vecinos y los clips van sincronizados, así que el paso encaja con la velocidad.',
        st1: (s, n) => 'Speed = <b>' + s + '</b> → estado <b>' + n + '</b> (100 %)',
        stBad: (n, v) => '✗ El clip ' + n + ' está pensado para ' + v + ' m/s: a esta velocidad los pies patinan, y al cruzar un umbral salta de golpe a otro clip.',
        stOk: 'Ahora encaja, pero en cuanto cambies la velocidad saltará de un clip a otro (y necesitas transiciones en ambos sentidos).',
        c2: '// + transiciones Idle ↔ Walk ↔ Run en ambos sentidos' },
      en: { tree: '1D Blend Tree', states: '3 states + triggers', speed: 'Speed', auto: 'Speed up / slow down', pop: 'pop!', slip: 'feet slide',
        tree1: (s, wt) => 'Speed = <b>' + s + '</b> → ' + wt,
        treeOk: '✓ Continuous blend: the weight is split between the two neighbouring thresholds and the clips stay in sync, so the stride matches the speed.',
        st1: (s, n) => 'Speed = <b>' + s + '</b> → state <b>' + n + '</b> (100 %)',
        stBad: (n, v) => '✗ The ' + n + ' clip is made for ' + v + ' m/s: at this speed the feet slide, and crossing a threshold pops straight into another clip.',
        stOk: 'It fits right now, but as soon as the speed changes it will pop between clips (and you need transitions both ways).',
        c2: '// + Idle ↔ Walk ↔ Run transitions in both directions' }
    }[lang];
    const CL = [{ n: 'Idle', th: 0, dur: 2, k: 'idle' }, { n: 'Walk', th: 2, dur: 1, k: 'walk' }, { n: 'Run', th: 6, dur: 0.55, k: 'run' }];
    let mode = 'tree', speed = 0, auto = false, autoT = 0, ph = 0, off = 0, state = 0, pop = 0;
    const fmt = (v) => v.toFixed(1);
    const ctl = controls(host);
    seg(ctl, [{ v: 'tree', l: L.tree }, { v: 'states', l: L.states }], mode, (v) => { mode = v; });
    const sl = slider(ctl, L.speed, 0, 6, 0.1, speed, (v) => { speed = v; auto = false; }, fmt);
    button(ctl, L.auto, () => { auto = !auto; autoT = Math.acos(clamp(1 - speed / 3, -1, 1)) / 0.8; }, true);
    const stage = makeCanvas(host, (w) => (w < 560 ? 300 : 212));
    const out = readout(host);
    const cb = codeBlock(host);
    const weights = (s) => (s <= 2 ? [1 - s / 2, s / 2, 0] : [0, 1 - (s - 2) / 4, (s - 2) / 4]);

    const stop = loop((dt) => {
      if (auto) { autoT += dt; speed = 3 - 3 * Math.cos(autoT * 0.8); setSlider(sl, Math.round(speed * 10) / 10, fmt); }
      const ns = speed < 1 ? 0 : speed < 4 ? 1 : 2;
      if (ns !== state) { state = ns; if (mode === 'states') pop = 0.4; }
      pop = Math.max(0, pop - dt);
      const wt = mode === 'tree' ? weights(speed) : CL.map((_, i) => (i === state ? 1 : 0));
      const dur = wt.reduce((s, x, i) => s + x * CL[i].dur, 0);
      ph = (ph + dt / dur) % 1;
      off += speed * 36 * dt;
      const pose = blendPoses(CL.map((cl, i) => [gait(cl.k, ph), wt[i]]));

      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      // Personaje
      const fx0 = 0, fw = narrow ? w : w * 0.45, fyb = narrow ? h - 22 : h - 30;
      ground(ctx, fx0 + 12, fx0 + fw - 12, fyb, off, c);
      const s = narrow ? 1 : 1.15;
      figure(ctx, fx0 + fw / 2, fyb, s, pose, mode === 'tree' ? c.accent : c.text);
      if (pop > 0) {
        ctx.globalAlpha = pop / 0.4;
        text(ctx, L.pop, fx0 + fw / 2 + 40, fyb - 100 * s, c.bad, { align: 'center' });
        ctx.globalAlpha = 1;
      }
      const clipV = CL[state].th;
      const slipping = mode === 'states' && Math.abs(clipV - speed) > 0.6;
      if (slipping) text(ctx, '⚠ ' + L.slip, fx0 + fw / 2, fyb + 15, c.bad, { align: 'center' });
      // Diagrama de umbrales y pesos
      const dx = narrow ? 14 : w * 0.47, dw = narrow ? w - 28 : w * 0.53 - 16, dy = narrow ? 6 : 18;
      const lx0 = dx + 8, lx1 = dx + dw - 8, ly = dy + 34;
      const X = (v) => lerp(lx0, lx1, v / 6);
      if (mode === 'states') {
        [[0, 1], [1, 4], [4, 6]].forEach((r, i) => { ctx.fillStyle = i === state ? c.accentSoft : c.soft; ctx.fillRect(X(r[0]), ly - 7, X(r[1]) - X(r[0]), 14); });
        [1, 4].forEach((b) => { ctx.fillStyle = c.bad; ctx.fillRect(X(b) - 1, ly - 11, 2, 22); });
      } else {
        ctx.fillStyle = c.soft; roundRect(ctx, lx0, ly - 4, lx1 - lx0, 8, 4); ctx.fill();
      }
      CL.forEach((cl, i) => {
        const x = X(cl.th);
        ctx.fillStyle = c.text;
        ctx.beginPath(); ctx.moveTo(x, ly - 9); ctx.lineTo(x + 5, ly - 4); ctx.lineTo(x, ly + 1); ctx.lineTo(x - 5, ly - 4); ctx.closePath(); ctx.fill();
        text(ctx, cl.n + ' ' + cl.th, x, dy + 14, c.text, { align: i === 0 ? 'left' : i === 2 ? 'right' : 'center', mono: true });
      });
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(X(speed), ly + 1, 7, 0, TAU); ctx.fill();
      const lab = 'Speed ' + speed.toFixed(1);
      text(ctx, lab, clamp(X(speed), lx0 + 34, lx1 - 34), ly + 20, c.accent, { align: 'center', mono: true });
      CL.forEach((cl, i) => {
        const y = ly + 42 + i * 22, bx = dx + 46, bw = dw - 46 - 44;
        text(ctx, cl.n, dx + 4, y, c.text);
        ctx.fillStyle = c.soft; roundRect(ctx, bx, y - 7, bw, 14, 7); ctx.fill();
        if (wt[i] > 0.001) { ctx.fillStyle = mode === 'tree' ? c.accent : c.warn; roundRect(ctx, bx, y - 7, Math.max(8, bw * wt[i]), 14, 7); ctx.fill(); }
        text(ctx, Math.round(wt[i] * 100) + ' %', dx + dw - 4, y, c.text, { align: 'right', mono: true });
      });
      const sTxt = num(speed, 1, lang);
      if (mode === 'tree') {
        const parts = CL.map((cl, i) => (wt[i] > 0.005 ? cl.n + ' ' + Math.round(wt[i] * 100) + ' %' : null)).filter(Boolean).join(' + ');
        out('<span>' + L.tree1(sTxt, parts) + '</span><p>' + L.treeOk + '</p>');
        cb(['static readonly int SpeedId = Animator.StringToHash("Speed");', '',
          'void Update() {', '    animator.SetFloat(SpeedId, speed, 0.1f, Time.deltaTime);', '}',
          '// Blend Tree 1D: Idle (0) · Walk (2) · Run (6)'].join('\n'), { 3: 'ok' });
      } else {
        out('<span>' + L.st1(sTxt, CL[state].n) + '</span><p>' + (slipping ? L.stBad(CL[state].n, CL[state].th) : L.stOk) + '</p>');
        cb(['if (speed > 4f) animator.SetTrigger("Run");', 'else if (speed > 1f) animator.SetTrigger("Walk");', 'else animator.SetTrigger("Idle");', L.c2].join('\n'),
          { [2 - state]: 'bad' });
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     4. Animator Layers + Avatar Mask (correr y disparar)
     --------------------------------------------------------- */

  function mountLayers(host, lang) {
    const L = {
      es: { mask: 'Avatar Mask: UpperBody', weight: 'Weight de la layer Shoot', shoot: 'Disparando', base: 'Base Layer · Run', none: 'Mask: ninguna (todo el cuerpo)', maskOn: 'Mask: UpperBody',
        idle: 'La layer Shoot está en su estado vacío: no afecta a ningún hueso. Marca “Disparando”.',
        ok: '✓ Piernas → Base Layer (correr). Brazos y torso → layer Shoot. Las dos máquinas de estado funcionan a la vez.',
        noMask: '✗ Sin Avatar Mask, una layer Override controla <b>todo</b> el cuerpo: las piernas copian la pose de disparo y dejan de correr (patinan).',
        add: 'Additive suma la diferencia del clip de disparo sobre la pose base: los brazos suben, pero siguen balanceándose al correr. Para apuntar firme, Override.',
        partial: (w) => 'Weight ' + w + ': la pose de disparo se mezcla a medias con la de correr; el brazo no llega a apuntar.',
        cMask: (m, b) => '// Layer "Shoot": Mask = ' + m + ', Blending = ' + b },
      en: { mask: 'Avatar Mask: UpperBody', weight: 'Shoot layer weight', shoot: 'Shooting', base: 'Base Layer · Run', none: 'Mask: none (whole body)', maskOn: 'Mask: UpperBody',
        idle: 'The Shoot layer is in its empty state: it affects no bones. Tick “Shooting”.',
        ok: '✓ Legs → Base Layer (run). Arms and torso → Shoot layer. Both state machines run at the same time.',
        noMask: '✗ Without an Avatar Mask, an Override layer drives the <b>whole</b> body: the legs copy the shooting pose and stop running (they slide).',
        add: 'Additive adds the shooting clip’s difference on top of the base pose: the arms go up but keep swinging with the run. To aim steadily, use Override.',
        partial: (w) => 'Weight ' + w + ': the shooting pose is only half blended with the run; the arm never fully aims.',
        cMask: (m, b) => '// "Shoot" layer: Mask = ' + m + ', Blending = ' + b }
    }[lang];
    const UPPER = ['lean', 'aL', 'eL', 'aR', 'eR'];
    const SHOOT = { lean: 0.04, tL: 0.12, kL: 0.04, tR: -0.12, kR: 0.04, aL: 1.5, eL: 0.05, aR: 1.25, eR: 0.4 };
    const REF = { lean: 0.03, tL: 0.1, kL: 0.05, tR: -0.1, kR: 0.05, aL: 0.05, eL: 0.2, aR: -0.05, eR: 0.2 };
    let mask = true, weight = 1, blending = 'Override', shooting = true, sa = 0, ph = 0, off = 0, kick = 0, shotT = 0;
    const ctl = controls(host);
    toggle(ctl, L.mask, mask, (v) => { mask = v; });
    toggle(ctl, L.shoot, shooting, (v) => { shooting = v; });
    seg(ctl, [{ v: 'Override', l: 'Override' }, { v: 'Additive', l: 'Additive' }], blending, (v) => { blending = v; });
    slider(ctl, L.weight, 0, 1, 0.05, weight, (v) => { weight = v; }, (v) => v.toFixed(2));
    const stage = makeCanvas(host, (w) => (w < 560 ? 272 : 206));
    const out = readout(host);
    const cb = codeBlock(host);

    const stop = loop((dt) => {
      ph = (ph + dt / 0.62) % 1;
      off += 200 * dt;
      sa = clamp(sa + (shooting ? dt : -dt) * 5, 0, 1);
      if (shooting) { shotT += dt; if (shotT > 0.45) { shotT = 0; kick = 1; } }
      kick = Math.max(0, kick - dt * 5);
      const base = gait('run', ph);
      const shoot = Object.assign({}, SHOOT, { aL: SHOOT.aL - 0.18 * kick, lean: SHOOT.lean - 0.06 * kick });
      const wU = weight * sa, wLow = mask ? 0 : weight * sa;
      const pose = {};
      PK.forEach((k) => {
        const wk = UPPER.indexOf(k) >= 0 ? wU : wLow;
        pose[k] = blending === 'Override' ? lerp(base[k], shoot[k], wk) : base[k] + wk * (shoot[k] - REF[k]);
      });
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const fx = narrow ? w / 2 : w * 0.25, gy = narrow ? 146 : h - 28, s = narrow ? 1 : 1.15;
      ground(ctx, 12, narrow ? w - 12 : w * 0.5 - 12, gy, off, c);
      const colU = mix(c.accent, c.warn, wU), colL = mix(c.accent, c.warn, wLow);
      const f = figure(ctx, fx, gy, s, pose, (part) => (part.indexOf('leg') === 0 ? colL : colU));
      if (wU > 0.3) {
        const a = f.fore, gl = 16 * s;
        ctx.strokeStyle = c.text; ctx.lineWidth = 4 * s; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(f.hand[0], f.hand[1]); ctx.lineTo(f.hand[0] + Math.cos(a) * gl, f.hand[1] + Math.sin(a) * gl); ctx.stroke();
        ctx.lineCap = 'round';
        if (kick > 0.6) { ctx.fillStyle = c.warn; ctx.beginPath(); ctx.arc(f.hand[0] + Math.cos(a) * (gl + 6), f.hand[1] + Math.sin(a) * (gl + 6), 5 * s, 0, TAU); ctx.fill(); }
      }
      // Panel de layers
      const px = narrow ? 12 : w * 0.52, pw = narrow ? w - 24 : w * 0.48 - 14, py = narrow ? 168 : 30;
      const row = (y, hh, col, title, sub, act) => {
        ctx.fillStyle = c.soft; roundRect(ctx, px, y, pw, hh, 8); ctx.fill();
        ctx.fillStyle = col; roundRect(ctx, px + 8, y + 10, 12, 12, 3); ctx.fill();
        text(ctx, title, px + 28, y + 16, act ? c.text : c.muted);
        if (sub) text(ctx, sub, px + 28, y + 34, c.muted);
      };
      row(py, 32, c.accent, L.base, null, true);
      row(py + 40, 50, c.warn, 'Shoot · w ' + weight.toFixed(2) + ' · ' + blending, mask ? L.maskOn : L.none, sa > 0.05);
      const lines = [];
      if (sa < 0.05) lines.push(L.idle);
      else {
        if (!mask && blending === 'Override' && weight > 0.5) lines.push(L.noMask);
        else if (blending === 'Additive') lines.push(L.add);
        else if (weight < 0.95) lines.push(L.partial(num(weight, 2, lang)));
        else lines.push(L.ok);
      }
      out(lines.join(''));
      cb(['int shoot = animator.GetLayerIndex("Shoot");', 'animator.SetLayerWeight(shoot, ' + weight.toFixed(2) + 'f);', L.cMask(mask ? 'UpperBody' : 'None', blending)].join('\n'),
        { 2: mask && blending === 'Override' ? 'ok' : 'bad' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     5. Iluminación baked: lightmaps, Light Probes, Reflection Probes
     --------------------------------------------------------- */

  function mountBaked(host, lang) {
    const L = {
      es: { lm: 'Lightmaps', lp: 'Light Probes', rp: 'Reflection Probes', gi: 'Contribute GI (Static)', uv0: 'Sin UV1 (UV0 solapadas)', uv1: 'Generate Lightmap UVs → UV1', bake: 'Generate Lighting',
        probes: 'Light Probe Group', rprobe: 'Reflection Probe', smooth: 'Smoothness', out: 'fuera del bake', overlap: 'UVs solapadas', baking: 'Generando…', drag: 'Arrastra al personaje.',
        lmNo: '✗ Sin Contribute GI la malla no entra en el bake: no recibe lightmap y tampoco proyecta sombra baked sobre el suelo.',
        lmOver: '✗ Sin UV1, el bake usa las UV0, donde varias caras ocupan el mismo espacio: comparten texels y aparecen manchas y luz de una cara en otra.',
        lmOk: '✓ Contribute GI + UV1 sin solapes (Generate Lightmap UVs): cada cara tiene sus propios texels en el lightmap.',
        lpNo: '✗ Sin Light Probes, el personaje dinámico solo recibe la luz ambiental: se ve plano y no recoge el rebote rojo de la pared ni el azul del suelo.',
        lpOk: '✓ El personaje interpola las sondas más cercanas: se tiñe de rojo junto a la pared y de azul cerca del suelo. Los lightmaps solo sirven para objetos estáticos.',
        rpNo: '✗ Sin Reflection Probe, el metal refleja el <b>skybox</b> (cielo y sol), no la habitación.',
        rpOk: '✓ El Reflection Probe capturó un cubemap de la habitación y el metal refleja paredes, ventana y suelo.',
        rpLp: ' Los Light Probes no cambian el reflejo: solo aportan luz difusa.', rpSm: ' Bajar el Smoothness difumina el reflejo, pero no lo corrige: solo deja de parecer metal pulido.' },
      en: { lm: 'Lightmaps', lp: 'Light Probes', rp: 'Reflection Probes', gi: 'Contribute GI (Static)', uv0: 'No UV1 (overlapping UV0)', uv1: 'Generate Lightmap UVs → UV1', bake: 'Generate Lighting',
        probes: 'Light Probe Group', rprobe: 'Reflection Probe', smooth: 'Smoothness', out: 'not in the bake', overlap: 'overlapping UVs', baking: 'Baking…', drag: 'Drag the character.',
        lmNo: '✗ Without Contribute GI the mesh is left out of the bake: it gets no lightmap and casts no baked shadow on the floor.',
        lmOver: '✗ Without UV1 the bake uses UV0, where several faces share the same space: they share texels, so you get blotches and one face’s light on another.',
        lmOk: '✓ Contribute GI + non-overlapping UV1 (Generate Lightmap UVs): every face has its own texels in the lightmap.',
        lpNo: '✗ Without Light Probes the dynamic character only gets ambient light: it looks flat and misses the red bounce from the wall and the blue from the floor.',
        lpOk: '✓ The character interpolates the nearest probes: it turns red near the wall and blue near the floor. Lightmaps only work on static objects.',
        rpNo: '✗ Without a Reflection Probe the metal reflects the <b>skybox</b> (sky and sun), not the room.',
        rpOk: '✓ The Reflection Probe captured a cubemap of the room, and the metal now reflects the walls, window and floor.',
        rpLp: ' Light Probes do not change the reflection: they only provide diffuse light.', rpSm: ' Lowering Smoothness blurs the reflection but does not fix it: it just stops looking like polished metal.' }
    }[lang];
    let tab = 'lm', isStatic = true, uv1 = false, bake = 0, probes = false, rprobe = false, lpRefl = false, smooth = 0.9, cap = 0, cx = 0.2, dir = 1, hold = 0;
    const rebake = () => { bake = 0; };
    const top = controls(host);
    seg(top, [{ v: 'lm', l: L.lm }, { v: 'lp', l: L.lp }, { v: 'rp', l: L.rp }], tab, (v) => { tab = v; show(p1, v === 'lm'); show(p2, v === 'lp'); show(p3, v === 'rp'); });
    const p1 = controls(host);
    toggle(p1, L.gi, isStatic, (v) => { isStatic = v; rebake(); });
    seg(p1, [{ v: false, l: L.uv0 }, { v: true, l: L.uv1 }], uv1, (v) => { uv1 = v; rebake(); });
    button(p1, L.bake, rebake, true);
    const p2 = controls(host);
    toggle(p2, L.probes, probes, (v) => { probes = v; });
    const p3 = controls(host);
    toggle(p3, L.rprobe, rprobe, (v) => { rprobe = v; });
    toggle(p3, L.probes, lpRefl, (v) => { lpRefl = v; });
    slider(p3, L.smooth, 0, 1, 0.05, smooth, (v) => { smooth = v; }, (v) => v.toFixed(2));
    show(p2, false); show(p3, false);
    const stage = makeCanvas(host, (w) => (w < 560 ? 300 : 236));
    const out = readout(host);
    let room = { x: 0, w: 1 };
    drag(stage, {
      down: (x) => { if (tab === 'lp') { cx = clamp((x - room.x) / room.w, 0.1, 0.9); hold = 2.5; } },
      move: (x) => { if (tab === 'lp') { cx = clamp((x - room.x) / room.w, 0.1, 0.9); hold = 2.5; } }
    });

    // --- Lightmaps ---
    const N = 6;
    const FACE = { top: (u) => 0.95 - 0.12 * u, front: (u, v) => 0.42 + 0.33 * v, right: (u, v) => 0.22 + 0.12 * v };
    const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
    function faceVal(f, i, j) {
      const u = (i + 0.5) / N, v = (j + 0.5) / N;
      if (!isStatic) return 0.55;
      if (!uv1) {
        let a = (FACE.top(u, v) + FACE.front(u, v) + FACE.right(u, v)) / 3;
        const hh = hash(i, j);
        if (hh < 0.24) a *= 0.35; else if (hh > 0.88) a = Math.min(1, a + 0.35);
        return a;
      }
      return FACE[f](u, v);
    }
    const shade = (alb, v) => (v > 0.85 ? mix(alb, '#fff4d6', (v - 0.85) * 2.5) : mix('#0e1116', alb, v / 0.85));
    function quad(ctx, o, U, V, u0, v0, u1, v1) {
      ctx.beginPath();
      ctx.moveTo(o[0] + U[0] * u0 + V[0] * v0, o[1] + U[1] * u0 + V[1] * v0);
      ctx.lineTo(o[0] + U[0] * u1 + V[0] * v0, o[1] + U[1] * u1 + V[1] * v0);
      ctx.lineTo(o[0] + U[0] * u1 + V[0] * v1, o[1] + U[1] * u1 + V[1] * v1);
      ctx.lineTo(o[0] + U[0] * u0 + V[0] * v1, o[1] + U[1] * u0 + V[1] * v1);
      ctx.closePath();
    }
    function drawLightmaps(c, ctx, w, h, dt) {
      bake = Math.min(1, bake + dt / 1.3);
      const narrow = w < 560;
      const ps = narrow ? 96 : Math.min(170, h - 56), pX = narrow ? 14 : 18, pY = 30;
      // Panel de UVs (el propio lightmap)
      const title = !isStatic ? 'Lightmap · ' + L.out : uv1 ? 'Lightmap · UV1' : 'UV0 · ' + L.overlap;
      text(ctx, title, pX, 14, !isStatic ? c.muted : uv1 ? c.ok : c.bad);
      ctx.fillStyle = c.soft; ctx.fillRect(pX, pY, ps, ps);
      ctx.strokeStyle = c.border; ctx.lineWidth = 1; ctx.strokeRect(pX + 0.5, pY + 0.5, ps, ps);
      const total = N * N * 3;
      const revealed = (k) => k / total < bake;
      if (!isStatic) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = c.muted; ctx.strokeRect(pX + 8, pY + 8, ps - 16, ps - 16); ctx.setLineDash([]);
        text(ctx, '—', pX + ps / 2, pY + ps / 2, c.muted, { align: 'center' });
      } else {
        const charts = uv1 ? { top: [0.05, 0.05], front: [0.53, 0.05], right: [0.05, 0.53] } : { top: [0.1, 0.1], front: [0.1, 0.1], right: [0.1, 0.1] };
        const cs = uv1 ? 0.42 : 0.8;
        Object.keys(charts).forEach((f, fi) => {
          const o = charts[f];
          for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
            if (!revealed(fi * N * N + i * N + j)) continue;
            ctx.fillStyle = shade('#7aa2e3', faceVal(f, i, j));
            const x = pX + (o[0] + (i / N) * cs) * ps, y = pY + (o[1] + (1 - (j + 1) / N) * cs) * ps;
            ctx.fillRect(x, y, (cs / N) * ps + 0.5, (cs / N) * ps + 0.5);
          }
          ctx.strokeStyle = uv1 ? c.ok : [c.bad, c.warn, c.accent][fi]; ctx.lineWidth = 1.5;
          const sh = uv1 ? 0 : fi * 3;
          ctx.strokeRect(pX + o[0] * ps + sh, pY + o[1] * ps + sh, cs * ps, cs * ps);
        });
      }
      // Escena: suelo + cubo
      const sx = narrow ? 0 : pX + ps + 20, sw = w - sx, sy = narrow ? pY + ps + 8 : 0, sh = h - sy;
      const a = Math.min(sw * 0.24, sh * 0.4);
      const F0 = [sx + sw * 0.42 - a / 2, sy + sh * 0.74];
      const ex = [a, 0], ey = [0, -a], ez = [a * 0.55, -a * 0.38];
      const fo = [sx + 10, F0[1] + a * 0.32], fU = [sw - 20 - ez[0] * 2.4, 0], fV = [ez[0] * 2.4, ez[1] * 2.4];
      const C = [F0[0] + a * 0.5 + ez[0] * 0.5, F0[1] + ez[1] * 0.5];
      const FU = 14, FV = 6;
      for (let i = 0; i < FU; i++) for (let j = 0; j < FV; j++) {
        const u = (i + 0.5) / FU, v = (j + 0.5) / FV;
        const P = [fo[0] + fU[0] * u + fV[0] * v, fo[1] + fU[1] * u + fV[1] * v];
        let val = 0.86;
        if (isStatic && bake > 0.5) {
          const dxs = (P[0] - (C[0] + a * 0.62)) / (a * 0.95), dys = (P[1] - (C[1] - a * 0.08)) / (a * 0.42);
          val -= 0.5 * clamp(1.3 - Math.hypot(dxs, dys), 0, 1);
        }
        ctx.fillStyle = shade('#cbb894', val);
        quad(ctx, fo, fU, fV, i / FU, j / FV, (i + 1) / FU + 0.002, (j + 1) / FV + 0.002); ctx.fill();
      }
      const faces = [['right', [F0[0] + a, F0[1]], ez, ey], ['top', [F0[0], F0[1] - a], ex, ez], ['front', F0, ex, ey]];
      faces.forEach((fc, fi) => {
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const k = (['top', 'front', 'right'].indexOf(fc[0])) * N * N + i * N + j;
          ctx.fillStyle = isStatic && !revealed(k) ? c.soft : shade('#7aa2e3', faceVal(fc[0], i, j));
          quad(ctx, fc[1], fc[2], fc[3], i / N, j / N, (i + 1) / N + 0.01, (j + 1) / N + 0.01); ctx.fill();
        }
      });
      if (bake < 1 && isStatic) text(ctx, L.baking + ' ' + Math.round(bake * 100) + ' %', sx + sw - 12, sy + 14, c.muted, { align: 'right' });
      out(!isStatic ? L.lmNo : uv1 ? L.lmOk : L.lmOver);
    }

    // --- Light Probes ---
    function lightAt(nx, ny) {
      const wv = 0.3 + 0.5 * nx, red = Math.max(0, 1 - nx / 0.45), blue = Math.max(0, (ny - 0.4) / 0.6);
      return [70 + 110 * wv + 200 * red - 40 * blue, 70 + 110 * wv - 30 * red - 10 * blue, 80 + 100 * wv + 200 * blue - 40 * red].map((v) => clamp(v, 0, 255));
    }
    const PX = [0.12, 0.31, 0.5, 0.69, 0.88], PY = [0.45, 0.85];
    function probeAt(nx, ny) {
      nx = clamp(nx, PX[0], PX[4]); ny = clamp(ny, PY[0], PY[1]);
      let i = 0; while (i < 3 && nx > PX[i + 1]) i++;
      const fx = (nx - PX[i]) / (PX[i + 1] - PX[i]), fy = (ny - PY[0]) / (PY[1] - PY[0]);
      const q = (a, b) => lightAt(PX[a], PY[b]);
      const l = (p0, p1, t) => p0.map((v, k) => v + (p1[k] - v) * t);
      return l(l(q(i, 0), q(i + 1, 0), fx), l(q(i, 1), q(i + 1, 1), fx), fy);
    }
    function roomFrame(w, h) {
      const rw = Math.min(w - 24, 640), rx = (w - rw) / 2;
      room = { x: rx, w: rw };
      return { rx, ry: 10, rw, rh: h - 20 };
    }
    function drawProbes(c, ctx, w, h, dt) {
      if (hold > 0) hold -= dt;
      else { cx += dir * dt * 0.12; if (cx > 0.86) { cx = 0.86; dir = -1; } if (cx < 0.14) { cx = 0.14; dir = 1; } }
      const { rx, ry, rw, rh } = roomFrame(w, h);
      ctx.fillStyle = '#3a3f4b'; ctx.fillRect(rx, ry, rw, rh);
      const gl = ctx.createLinearGradient(rx, 0, rx + rw * 0.45, 0);
      gl.addColorStop(0, 'rgba(224,72,74,.45)'); gl.addColorStop(1, 'rgba(224,72,74,0)');
      ctx.fillStyle = gl; ctx.fillRect(rx, ry, rw, rh);
      const gb = ctx.createLinearGradient(0, ry + rh, 0, ry + rh * 0.45);
      gb.addColorStop(0, 'rgba(59,130,246,.45)'); gb.addColorStop(1, 'rgba(59,130,246,0)');
      ctx.fillStyle = gb; ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = '#e0484a'; ctx.fillRect(rx, ry, 14, rh);
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(rx, ry + rh - 14, rw, 14);
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(rx + rw - 70, ry + 12, 50, 34);
      text(ctx, 'Baked', rx + 22, ry + 14, '#e8ecf4');
      const P = (nx, ny) => [rx + nx * rw, ry + ny * rh];
      const charY = 0.62, cp = P(cx, charY);
      if (probes) {
        let i = 0; while (i < 3 && clamp(cx, PX[0], PX[4]) > PX[i + 1]) i++;
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1;
        [[i, 0], [i + 1, 0], [i, 1], [i + 1, 1]].forEach((ij) => { const q = P(PX[ij[0]], PY[ij[1]]); ctx.beginPath(); ctx.moveTo(cp[0], cp[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); });
        PX.forEach((x) => PY.forEach((y) => {
          const q = P(x, y);
          ctx.fillStyle = hex(lightAt(x, y)); ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 1; ctx.stroke();
        }));
      }
      const amb = '#7d8597';
      const colL = probes ? hex(probeAt(cx - 0.04, charY)) : amb, colR = probes ? hex(probeAt(cx + 0.04, charY)) : amb;
      const bw = 26, bh = Math.min(70, rh * 0.36), by = ry + rh - 14 - bh;
      const g = ctx.createLinearGradient(cp[0] - bw / 2, 0, cp[0] + bw / 2, 0);
      g.addColorStop(0, colL); g.addColorStop(1, colR);
      ctx.fillStyle = g; roundRect(ctx, cp[0] - bw / 2, by, bw, bh, 12); ctx.fill();
      ctx.beginPath(); ctx.arc(cp[0], by - 12, 10, 0, TAU); ctx.fill();
      text(ctx, L.drag, rx + rw - 80, ry + 28, '#e8ecf4', { align: 'right' });
      out(probes ? L.lpOk : L.lpNo);
    }

    // --- Reflection Probes ---
    function drawRefl(c, ctx, w, h, dt) {
      cap = rprobe ? Math.min(1, cap + dt / 1.2) : Math.max(0, cap - dt * 3);
      const { rx, ry, rw, rh } = roomFrame(w, h);
      ctx.fillStyle = '#5b5f6b'; ctx.fillRect(rx, ry, rw, rh * 0.18);
      ctx.fillStyle = '#c8742c'; ctx.fillRect(rx, ry + rh * 0.18, rw, rh * 0.6);
      ctx.fillStyle = '#7a4e33'; ctx.fillRect(rx, ry + rh * 0.78, rw, rh * 0.22);
      const wx = rx + rw * 0.12, wy = ry + rh * 0.26, ww = rw * 0.22, wh = rh * 0.3;
      const sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#3d8bfd'); sky.addColorStop(1, '#cfe6ff');
      ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = '#efe6d8'; ctx.lineWidth = 3; ctx.strokeRect(wx, wy, ww, wh);
      text(ctx, 'Skybox', wx + ww / 2, wy + wh + 12, '#fff', { align: 'center' });
      ctx.fillStyle = '#3b2a1e'; ctx.fillRect(rx + rw * 0.72, ry + rh * 0.4, rw * 0.12, rh * 0.38);
      if (lpRefl) PX.forEach((x) => [0.45, 0.72].forEach((y) => { ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(rx + x * rw, ry + y * rh, 4, 0, TAU); ctx.fill(); }));
      if (rprobe) {
        ctx.setLineDash([5, 4]); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.5; ctx.strokeRect(rx + 6, ry + 6, rw - 12, rh - 12); ctx.setLineDash([]);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i / 6 < cap ? ['#5b5f6b', '#c8742c', '#c8742c', '#9fd0ff', '#c8742c', '#7a4e33'][i] : 'rgba(255,255,255,.15)';
          ctx.fillRect(rx + 14 + i * 15, ry + 14, 12, 12);
        }
        text(ctx, 'cubemap', rx + 14 + 92, ry + 20, '#fff');
      }
      const r = Math.min(rh * 0.24, rw * 0.15, 54), scx = rx + rw * 0.5, scy = ry + rh * 0.78 - r * 0.6;
      ctx.save();
      ctx.beginPath(); ctx.arc(scx, scy, r, 0, TAU); ctx.clip();
      const X0 = scx - r, Y0 = scy - r, D = 2 * r;
      const gs = ctx.createLinearGradient(0, Y0, 0, Y0 + D);
      gs.addColorStop(0, '#3d8bfd'); gs.addColorStop(0.47, '#d6ecff'); gs.addColorStop(0.53, '#8a7a63'); gs.addColorStop(1, '#4d4236');
      ctx.fillStyle = gs; ctx.fillRect(X0, Y0, D, D);
      ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(scx - 0.4 * r, scy - 0.5 * r, 0.13 * r, 0, TAU); ctx.fill();
      const m = ease(cap);
      if (m > 0) {
        ctx.globalAlpha = m;
        ctx.fillStyle = '#5b5f6b'; ctx.fillRect(X0, Y0, D, D * 0.3);
        ctx.fillStyle = '#c8742c'; ctx.fillRect(X0, Y0 + D * 0.3, D, D * 0.4);
        ctx.fillStyle = '#9fd0ff'; ctx.fillRect(scx - 0.6 * r, Y0 + D * 0.36, 0.4 * r, D * 0.2);
        ctx.fillStyle = '#3b2a1e'; ctx.fillRect(scx + 0.35 * r, Y0 + D * 0.42, 0.25 * r, D * 0.28);
        ctx.fillStyle = '#7a4e33'; ctx.fillRect(X0, Y0 + D * 0.7, D, D * 0.3);
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = (1 - smooth) * 0.9; ctx.fillStyle = '#9aa1ab'; ctx.fillRect(X0, Y0, D, D); ctx.globalAlpha = 1;
      const gr = ctx.createRadialGradient(scx - r * 0.2, scy - r * 0.2, r * 0.2, scx, scy, r);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = gr; ctx.fillRect(X0, Y0, D, D);
      ctx.globalAlpha = 0.4 + 0.5 * smooth; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(scx - 0.35 * r, scy - 0.4 * r, 0.16 * r, 0.1 * r, -0.6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      out((rprobe ? L.rpOk : L.rpNo) + (lpRefl ? L.rpLp : '') + (smooth < 0.4 ? L.rpSm : ''));
    }

    const stop = loop((dt) => {
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'lm') drawLightmaps(c, ctx, w, h, dt);
      else if (tab === 'lp') drawProbes(c, ctx, w, h, dt);
      else drawRefl(c, ctx, w, h, dt);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     6. ParticleSystem: Emit, Stop, Clear y módulos como structs
     --------------------------------------------------------- */

  function mountParticles(host, lang) {
    const L = {
      es: { stopE: 'Stop(StopEmitting)', stopC: 'Stop(StopEmittingAndClear)', destroy: 'Destroy(gameObject)', reset: 'Nuevo objeto', destroyed: 'GameObject destruido',
        wrong: 'ps.main.startColor = …', right: 'var main = ps.main; …',
        m: { start: 'El fuego está en Play: emite de forma continua (rateOverTime).', play: '▶ ' + cd('Play()') + ': empieza a emitir de forma continua. No recibe una cantidad (no existe ' + cd('Play(30)') + ').',
          emit: '✓ ' + cd('Emit(30)') + ': exactamente 30 partículas al instante, aunque el sistema no esté reproduciéndose.',
          stopE: '✓ ' + cd('Stop(true, ParticleSystemStopBehavior.StopEmitting)') + ': deja de emitir y las partículas vivas terminan su vida con naturalidad.',
          stopC: '✗ ' + cd('StopEmittingAndClear') + ': deja de emitir y borra las vivas al instante (corte brusco).',
          clear: '✗ ' + cd('Clear()') + ': borra las vivas al instante, pero no detiene el sistema: si estaba en Play, sigue emitiendo.',
          destroy: '✗ ' + cd('Destroy(ps.gameObject)') + ': desaparece todo el objeto de golpe, con sus partículas.',
          dead: '✗ ' + cd('MissingReferenceException') + ': el ParticleSystem se ha destruido.', reset: 'Nuevo ParticleSystem, parado.' },
        cBad: '✗ Error CS1612: no se puede modificar el valor devuelto de ' + cd('ParticleSystem.main') + ' porque no es una variable. No compila, así que el color no cambia.',
        cOk: '✓ Compila. Los módulos son structs que apuntan al sistema nativo: al modificar la copia local cambia el sistema, sin reasignar (' + cd('ps.main') + ' es de solo lectura). Solo las partículas nuevas nacen rojas: es el color inicial.',
        c1: '   // error CS1612', c2: '               // struct: interfaz al sistema', c3: '      // se aplica ya, sin reasignar' },
      en: { stopE: 'Stop(StopEmitting)', stopC: 'Stop(StopEmittingAndClear)', destroy: 'Destroy(gameObject)', reset: 'New object', destroyed: 'GameObject destroyed',
        wrong: 'ps.main.startColor = …', right: 'var main = ps.main; …',
        m: { start: 'The fire is playing: it emits continuously (rateOverTime).', play: '▶ ' + cd('Play()') + ': starts emitting continuously. It takes no count (there is no ' + cd('Play(30)') + ').',
          emit: '✓ ' + cd('Emit(30)') + ': exactly 30 particles right now, even if the system is not playing.',
          stopE: '✓ ' + cd('Stop(true, ParticleSystemStopBehavior.StopEmitting)') + ': stops emitting and the live particles finish their life naturally.',
          stopC: '✗ ' + cd('StopEmittingAndClear') + ': stops emitting and removes the live ones instantly (an abrupt cut).',
          clear: '✗ ' + cd('Clear()') + ': removes the live ones instantly but does not stop the system: if it was playing, it keeps emitting.',
          destroy: '✗ ' + cd('Destroy(ps.gameObject)') + ': the whole object vanishes at once, with its particles.',
          dead: '✗ ' + cd('MissingReferenceException') + ': the ParticleSystem has been destroyed.', reset: 'New ParticleSystem, stopped.' },
        cBad: '✗ Error CS1612: cannot modify the return value of ' + cd('ParticleSystem.main') + ' because it is not a variable. It does not compile, so the color does not change.',
        cOk: '✓ It compiles. Modules are structs that point to the native system: changing the local copy changes the system, no reassignment needed (' + cd('ps.main') + ' is read-only). Only new particles are born red: it is the start color.',
        c1: '   // error CS1612', c2: '               // struct: interface to the system', c3: '      // applied now, no reassignment' }
    }[lang];
    let parts = [], emitting = true, alive = true, acc = 0, fixed = false, msg = L.m.start, pops = [], flash = 0;
    const startCol = () => (fixed ? '#ff3b30' : '#ffffff');
    function spawn(spark) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * (spark ? 2.4 : 0.5);
      const sp = spark ? 90 + Math.random() * 120 : 45 + Math.random() * 55;
      parts.push({ x: (Math.random() - 0.5) * (spark ? 6 : 18), y: 0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, age: 0, life: spark ? 0.7 + Math.random() * 0.6 : 1 + Math.random() * 0.7, spark, col: startCol() });
    }
    const act = (fn, m) => () => { if (!alive) { msg = L.m.dead; return; } fn(); msg = m; };
    const c1 = controls(host);
    button(c1, 'Play()', act(() => { emitting = true; }, L.m.play));
    button(c1, 'Emit(30)', act(() => { for (let i = 0; i < 30; i++) spawn(true); pops.push({ age: 0 }); }, L.m.emit), true);
    button(c1, L.stopE, act(() => { emitting = false; }, L.m.stopE));
    button(c1, L.stopC, act(() => { emitting = false; parts = []; flash = 0.3; }, L.m.stopC));
    button(c1, 'Clear()', act(() => { parts = []; flash = 0.3; }, L.m.clear));
    button(c1, L.destroy, act(() => { alive = false; emitting = false; parts = []; flash = 0.3; }, L.m.destroy));
    button(c1, L.reset, () => { alive = true; emitting = false; parts = []; msg = L.m.reset; });
    const c2 = controls(host);
    seg(c2, [{ v: false, l: L.wrong }, { v: true, l: L.right }], fixed, (v) => { fixed = v; });
    const stage = makeCanvas(host, 210);
    const out = readout(host);
    const cb = codeBlock(host);
    const grad = (f) => (f < 0.35 ? mix('#fff1a8', '#ffb13b', f / 0.35) : mix('#ffb13b', '#d9381e', (f - 0.35) / 0.65));

    const stop = loop((dt) => {
      if (emitting && alive) { acc += dt * 32; while (acc >= 1) { acc -= 1; spawn(false); } }
      parts = parts.filter((p) => {
        p.age += dt;
        p.vx *= 1 - dt * 0.6;
        p.vy += (p.spark ? 170 : -25) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        return p.age < p.life;
      });
      flash = Math.max(0, flash - dt);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#141821'; roundRect(ctx, 0, 0, w, h, 8); ctx.fill();
      if (flash > 0) { ctx.fillStyle = 'rgba(248,113,113,' + flash + ')'; roundRect(ctx, 0, 0, w, h, 8); ctx.fill(); }
      const ex = w / 2, ey = h - 34;
      if (alive) {
        ctx.fillStyle = '#6b4226'; roundRect(ctx, ex - 34, ey + 4, 68, 10, 5); ctx.fill();
        ctx.save(); ctx.translate(ex, ey + 9); ctx.rotate(0.25); ctx.fillStyle = '#80502e'; roundRect(ctx, -30, -5, 60, 10, 5); ctx.fill(); ctx.restore();
      } else {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#9aa4b8'; ctx.strokeRect(ex - 40, ey - 6, 80, 22); ctx.setLineDash([]);
        text(ctx, L.destroyed, ex, ey - 18, '#f87171', { align: 'center' });
      }
      parts.forEach((p) => {
        const f = p.age / p.life;
        ctx.globalAlpha = Math.max(0, 1 - f * f);
        ctx.fillStyle = mul(p.spark ? mix('#ffffff', '#ffd54a', f) : grad(f), p.col);
        ctx.beginPath(); ctx.arc(ex + p.x, ey + p.y, p.spark ? 3 : 6 * (1 - f * 0.6), 0, TAU); ctx.fill();
      });
      ctx.globalAlpha = 1;
      pops = pops.filter((p) => (p.age += dt) < 1);
      pops.forEach((p) => { ctx.globalAlpha = 1 - p.age; text(ctx, '+30', ex + 44, ey - 40 - p.age * 30, '#fde68a', { align: 'center' }); ctx.globalAlpha = 1; });
      text(ctx, 'particleCount: ' + parts.length, 12, 16, '#e8ecf4', { mono: true });
      text(ctx, 'isEmitting: ' + (emitting && alive), 12, 34, emitting && alive ? '#34d399' : '#9aa4b8', { mono: true });
      text(ctx, 'startColor', w - 12, 16, '#e8ecf4', { align: 'right' });
      ctx.fillStyle = startCol(); roundRect(ctx, w - 30, 28, 18, 12, 3); ctx.fill();
      out('<span>' + msg + '</span><p>' + (fixed ? L.cOk : L.cBad) + '</p>');
      const head = 'ParticleSystem ps = GetComponent<ParticleSystem>();';
      if (fixed) cb([head, 'var main = ps.main;' + L.c2, 'main.startColor = Color.red;' + L.c3].join('\n'), { 1: 'ok', 2: 'ok' });
      else cb([head, 'ps.main.startColor = Color.red;' + L.c1].join('\n'), { 1: 'bad' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     7. Texturas: formato, mipmaps, Read/Write y memoria
     --------------------------------------------------------- */

  function mountTextures(host, lang) {
    const L = {
      es: { size: 'Tamaño', mips: 'Generate Mip Maps', rw: 'Read/Write Enabled', s3d: 'Objeto 3D (distancias)', sui: 'UI a tamaño fijo', gpu: 'GPU', cpu: 'CPU (R/W)', q: 'Calidad',
        inUse: 'en uso', unused: 'nunca se usan', alias: 'sin mips: aliasing a distancia', levels: 'niveles', dec: 'descomprimido a RGBA32',
        sup: '✓ soportado', nosup: '✗ no soportado', low: 'baja', mid: 'media', high: 'alta', max: 'sin pérdida',
        mem: (g, cpu) => 'GPU: <b>' + g + ' MB</b> · CPU: <b>' + cpu + ' MB</b>',
        unsup: (f, p, x) => '✗ La mayoría de GPUs de ' + p + ' no soportan ' + f + ': Unity la descomprime a RGBA32 al cargarla → <b>×' + x + '</b> de memoria y más tiempo de carga.',
        astc: '✓ ASTC: el recomendado para Android e iOS modernos. Eliges el tamaño de bloque: 4x4 = 8 bpp (más calidad) … 8x8 = 2 bpp (más pequeño).',
        pvr: 'PVRTC: solo para iPhones antiguos sin ASTC; menos calidad.', dxt: '✓ DXT/BC: el formato de escritorio y consolas.', etc: 'ETC2: válido en móviles, pero ASTC da más calidad por bit y permite elegir el bloque.',
        raw: 'RGBA32 sin compresión: 32 bpp, muchísima memoria.',
        uiMip: '✗ UI a tamaño fijo: solo se usa el mip 0; los demás son el +33 % desperdiciado. Desactiva <b>Generate Mip Maps</b>.', uiOk: '✓ UI sin mipmaps: nada desperdiciado.',
        d3Mip: 'Objeto 3D: según la distancia se usa un mip u otro (menos aliasing y ancho de banda). Aquí el +33 % sí compensa.', d3No: '⚠ Objeto 3D sin mipmaps: se usa siempre el mip 0, con aliasing a distancia.',
        rwOn: 'Read/Write activado: se conserva una copia en la CPU para ' + cd('GetPixels') + '/' + cd('SetPixels') + ' → el doble de memoria. Solo si lo necesitas.' },
      en: { size: 'Size', mips: 'Generate Mip Maps', rw: 'Read/Write Enabled', s3d: '3D object (distances)', sui: 'UI at fixed size', gpu: 'GPU', cpu: 'CPU (R/W)', q: 'Quality',
        inUse: 'in use', unused: 'never used', alias: 'no mips: aliasing at distance', levels: 'levels', dec: 'decompressed to RGBA32',
        sup: '✓ supported', nosup: '✗ not supported', low: 'low', mid: 'medium', high: 'high', max: 'lossless',
        mem: (g, cpu) => 'GPU: <b>' + g + ' MB</b> · CPU: <b>' + cpu + ' MB</b>',
        unsup: (f, p, x) => '✗ Most ' + p + ' GPUs do not support ' + f + ': Unity decompresses it to RGBA32 on load → <b>×' + x + '</b> memory and slower loading.',
        astc: '✓ ASTC: the recommended format for modern Android and iOS. You pick the block size: 4x4 = 8 bpp (higher quality) … 8x8 = 2 bpp (smaller).',
        pvr: 'PVRTC: only for old iPhones without ASTC; lower quality.', dxt: '✓ DXT/BC: the desktop and console format.', etc: 'ETC2: fine on mobile, but ASTC gives more quality per bit and lets you pick the block.',
        raw: 'Uncompressed RGBA32: 32 bpp, a lot of memory.',
        uiMip: '✗ UI at fixed size: only mip 0 is ever used; the rest is the wasted +33 %. Disable <b>Generate Mip Maps</b>.', uiOk: '✓ UI without mipmaps: nothing wasted.',
        d3Mip: '3D object: a different mip is used depending on distance (less aliasing and bandwidth). Here the +33 % pays off.', d3No: '⚠ 3D object without mipmaps: mip 0 is always used, with aliasing at a distance.',
        rwOn: 'Read/Write on: a copy stays in CPU memory for ' + cd('GetPixels') + '/' + cd('SetPixels') + ' → twice the memory. Only if you need it.' }
    }[lang];
    const FMT = [
      { id: 'RGBA32', bpp: 32, q: 1, sup: { android: 1, ios: 1, pc: 1 } },
      { id: 'ASTC 4x4', bpp: 8, q: 0.92, sup: { android: 1, ios: 1, pc: 0 } },
      { id: 'ASTC 6x6', bpp: 3.56, q: 0.8, sup: { android: 1, ios: 1, pc: 0 } },
      { id: 'ASTC 8x8', bpp: 2, q: 0.66, sup: { android: 1, ios: 1, pc: 0 } },
      { id: 'DXT5/BC3', bpp: 8, q: 0.82, sup: { android: 0, ios: 0, pc: 1 } },
      { id: 'ETC2 RGBA8', bpp: 8, q: 0.78, sup: { android: 1, ios: 1, pc: 0 } },
      { id: 'PVRTC 4bpp', bpp: 4, q: 0.5, sup: { android: 0, ios: 1, pc: 0 } }
    ];
    const PLAT = { android: 'Android', ios: 'iOS', pc: 'PC' };
    const SIZES = [256, 512, 1024, 2048, 4096];
    let plat = 'android', fi = 2, si = 3, mips = true, rw = false, scen = 'ui', t = 0;
    const c1 = controls(host);
    seg(c1, Object.keys(PLAT).map((k) => ({ v: k, l: PLAT[k] })), plat, (v) => { plat = v; });
    const c2 = controls(host);
    seg(c2, FMT.map((f, i) => ({ v: i, l: f.id })), fi, (v) => { fi = v; });
    const c3 = controls(host);
    slider(c3, L.size, 0, 4, 1, si, (v) => { si = v; }, (v) => SIZES[v] + ' px');
    toggle(c3, L.mips, mips, (v) => { mips = v; });
    toggle(c3, L.rw, rw, (v) => { rw = v; });
    seg(c3, [{ v: 'ui', l: L.sui }, { v: '3d', l: L.s3d }], scen, (v) => { scen = v; });
    const stage = makeCanvas(host, (w) => (w < 620 ? 290 : 208));
    const out = readout(host);
    const MB = (b) => b / 1048576;
    const fmtMB = (v) => num(v, v < 10 ? 2 : 1, lang);

    const stop = loop((dt) => {
      t += dt;
      const f = FMT[fi], size = SIZES[si], ok = !!f.sup[plat];
      const bpp = ok ? f.bpp : 32;
      const gpu = MB((size * size * bpp) / 8) * (mips ? 4 / 3 : 1), cpu = rw ? gpu : 0;
      const ref = MB(size * size * 4) * (4 / 3);
      const levels = Math.log2(size) + 1;
      const used = scen === 'ui' || !mips ? 0 : Math.round(2 + 2 * Math.sin(t * 0.7));
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 620;
      // Pirámide de mipmaps
      const rx = 14, ry = 8, rw2 = narrow ? w - 28 : w * 0.5 - 20, rh = narrow ? 128 : h - 16;
      const P = Math.min(rh - 40, rw2 * 0.42), baseY = ry + rh - 20;
      let x = rx;
      for (let i = 0; i < (mips ? levels : 1); i++) {
        const s = P / Math.pow(2, i);
        if (s < 2) break;
        const y = baseY - s;
        const cells = 4;
        for (let a = 0; a < cells; a++) for (let b = 0; b < cells; b++) {
          ctx.fillStyle = (a + b) % 2 ? '#c0844a' : '#8b5a2b';
          ctx.fillRect(x + (a * s) / cells, y + (b * s) / cells, s / cells + 0.4, s / cells + 0.4);
        }
        const isUsed = i === used, waste = scen === 'ui' && i > 0;
        if (waste) {
          ctx.fillStyle = rgba(c.bg, 0.6); ctx.fillRect(x, y, s, s);
          ctx.strokeStyle = c.bad; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y); ctx.lineTo(x, y + s); ctx.stroke();
        }
        if (isUsed) { ctx.strokeStyle = c.ok; ctx.lineWidth = 3; ctx.strokeRect(x - 1.5, y - 1.5, s + 3, s + 3); }
        if (s >= 30) text(ctx, 'mip ' + i, x + s / 2, baseY + 11, isUsed ? c.ok : c.muted, { align: 'center' });
        x += s + 6;
      }
      text(ctx, 'mip 0 = ' + size + '×' + size + (mips ? ' · ' + levels + ' ' + L.levels : ''), rx, ry + 6, c.text);
      if (mips && scen === 'ui') text(ctx, '+33 % · ' + L.unused, rx + P + 6, baseY - P / 2 - 12, c.bad);
      else if (mips) text(ctx, 'mip ' + used + ' · ' + L.inUse, rx + P + 6, baseY - P / 2 - 12, c.ok);
      else if (scen === '3d') L.alias.split(': ').forEach((ln, k) => text(ctx, (k ? '' : '⚠ ') + ln + (k ? '' : ':'), rx + P + 8, baseY - P / 2 - 8 + k * 16, c.warn));
      // Barras de memoria
      const bx = narrow ? 14 : w * 0.5 + 6, bw = narrow ? w - 28 : w * 0.5 - 20, by = narrow ? ry + rh + 12 : 18;
      const bar = (y, label, val, col) => {
        text(ctx, label, bx, y, c.text);
        const x0 = bx + 74, x1 = bx + bw - 72;
        ctx.fillStyle = c.soft; roundRect(ctx, x0, y - 8, x1 - x0, 16, 8); ctx.fill();
        if (val > 0) { ctx.fillStyle = col; roundRect(ctx, x0, y - 8, Math.max(6, (x1 - x0) * clamp(val / ref, 0, 1)), 16, 8); ctx.fill(); }
        text(ctx, fmtMB(val) + ' MB', bx + bw, y, c.text, { align: 'right', mono: true });
      };
      text(ctx, f.id + ' · ' + PLAT[plat] + ' · ' + (ok ? num(f.bpp, f.bpp % 1 ? 2 : 0, lang) + ' bpp' : '32 bpp (' + L.dec + ')'), bx, by, ok ? c.text : c.bad);
      bar(by + 28, L.gpu, gpu, ok ? c.accent : c.bad);
      bar(by + 56, L.cpu, cpu, c.warn);
      const qy = by + 84, qx0 = bx + 74, qx1 = bx + bw - 72;
      text(ctx, L.q, bx, qy, c.text);
      ctx.fillStyle = c.soft; roundRect(ctx, qx0, qy - 5, qx1 - qx0, 10, 5); ctx.fill();
      ctx.fillStyle = c.ok; roundRect(ctx, qx0, qy - 5, (qx1 - qx0) * f.q, 10, 5); ctx.fill();
      text(ctx, f.q === 1 ? L.max : f.q > 0.85 ? L.high : f.q > 0.6 ? L.mid : L.low, bx + bw, qy, c.muted, { align: 'right' });
      text(ctx, ok ? L.sup : L.nosup, bx, qy + 26, ok ? c.ok : c.bad);
      // Veredicto
      let fmtMsg;
      if (!ok) fmtMsg = L.unsup(f.id, PLAT[plat], num(32 / f.bpp, 32 / f.bpp % 1 ? 1 : 0, lang));
      else if (f.id.indexOf('ASTC') === 0) fmtMsg = L.astc;
      else if (f.id.indexOf('PVRTC') === 0) fmtMsg = L.pvr;
      else if (f.id.indexOf('DXT') === 0) fmtMsg = L.dxt;
      else if (f.id.indexOf('ETC2') === 0) fmtMsg = L.etc;
      else fmtMsg = L.raw;
      const mipMsg = scen === 'ui' ? (mips ? L.uiMip : L.uiOk) : (mips ? L.d3Mip : L.d3No);
      out('<span>' + L.mem(fmtMB(gpu), fmtMB(cpu)) + '</span><p>' + fmtMsg + '</p><p>' + mipMsg + '</p>' + (rw ? '<p>' + L.rwOn + '</p>' : ''));
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     8. URP Volumes: Local, Global y Blend Distance
     --------------------------------------------------------- */

  function mountVolumes(host, lang) {
    const L = {
      es: { local: 'Local', global: 'Global', blend: 'Blend Distance', col: 'BoxCollider en el Volume', pp: 'Post Processing en la cámara', auto: 'Ruta automática',
        box: 'Local Volume', noCol: 'sin collider', gl: 'Global Volume: toda la escena', game: 'Game view', ppOff: 'Post Processing desactivado', drag: 'arrastra al jugador',
        w: (wt, vi) => 'weight = <b>' + wt + '</b> → Vignette.intensity = 0,6 × ' + wt + ' = <b>' + vi + '</b>',
        inside: '✓ Dentro del collider: weight 1, Vignette completa.', fade: '✓ En la franja de Blend Distance: el efecto entra poco a poco.', outside: 'Fuera de la zona: weight 0, sin Vignette.',
        noC: '✗ Un Volume Local sin collider no tiene zona de influencia: no afecta a nada.', glob: '✗ Global: afecta en todas partes, esté donde esté el jugador. La prioridad solo decide entre volúmenes solapados.',
        noPP: '✗ La cámara no tiene Post Processing activado: ningún Volume se aplica.' },
      en: { local: 'Local', global: 'Global', blend: 'Blend Distance', col: 'BoxCollider on the Volume', pp: 'Post Processing on the camera', auto: 'Automatic path',
        box: 'Local Volume', noCol: 'no collider', gl: 'Global Volume: the whole scene', game: 'Game view', ppOff: 'Post Processing disabled', drag: 'drag the player',
        w: (wt, vi) => 'weight = <b>' + wt + '</b> → Vignette.intensity = 0.6 × ' + wt + ' = <b>' + vi + '</b>',
        inside: '✓ Inside the collider: weight 1, full Vignette.', fade: '✓ In the Blend Distance band: the effect fades in gradually.', outside: 'Outside the zone: weight 0, no Vignette.',
        noC: '✗ A Local Volume without a collider has no area of influence: it affects nothing.', glob: '✗ Global: it applies everywhere, wherever the player is. Priority only decides between overlapping volumes.',
        noPP: '✗ The camera does not have Post Processing enabled: no Volume is applied.' }
    }[lang];
    const W = 12, H = 8, BX = { x: 7.5, y: 4, hw: 2, hh: 1.5 };
    let mode = 'local', blend = 1.5, hasCol = true, pp = true, auto = true, t = 0, pos = [2, 4], trail = [];
    const ctl = controls(host);
    seg(ctl, [{ v: 'local', l: L.local }, { v: 'global', l: L.global }], mode, (v) => { mode = v; });
    slider(ctl, L.blend, 0, 3, 0.1, blend, (v) => { blend = v; }, (v) => v.toFixed(1) + ' m');
    const ctl2 = controls(host);
    toggle(ctl2, L.col, hasCol, (v) => { hasCol = v; });
    toggle(ctl2, L.pp, pp, (v) => { pp = v; });
    const autoT = toggle(ctl2, L.auto, auto, (v) => { auto = v; });
    const stage = makeCanvas(host, (w) => (w < 620 ? 344 : 250));
    const out = readout(host);
    const cb = codeBlock(host);
    let geo = { ox: 0, oy: 0, ppu: 20 };
    const toWorld = (x, y) => [clamp((x - geo.ox) / geo.ppu, 0.3, W - 0.3), clamp((y - geo.oy) / geo.ppu, 0.3, H - 0.3)];
    const inMap = (x, y) => x >= geo.ox && y >= geo.oy && x <= geo.ox + W * geo.ppu && y <= geo.oy + H * geo.ppu;
    let dragging = false;
    drag(stage, {
      down: (x, y) => { if (inMap(x, y)) { dragging = true; auto = false; autoT.checked = false; pos = toWorld(x, y); } },
      move: (x, y) => { if (dragging) pos = toWorld(x, y); },
      up: () => { dragging = false; }
    });

    const stop = loop((dt) => {
      if (auto) { t += dt; pos = [6 + 4.8 * Math.sin(t * 0.45), 4 + 2.2 * Math.sin(t * 0.9 + 0.6)]; }
      trail.push(pos.slice()); if (trail.length > 60) trail.shift();
      const dx = Math.max(Math.abs(pos[0] - BX.x) - BX.hw, 0), dy = Math.max(Math.abs(pos[1] - BX.y) - BX.hh, 0), d = Math.hypot(dx, dy);
      let wt;
      if (mode === 'global') wt = 1;
      else if (!hasCol) wt = 0;
      else if (d === 0) wt = 1;
      else wt = blend > 0 ? clamp(1 - d / blend, 0, 1) : 0;
      const vig = pp ? 0.6 * wt : 0;

      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 620;
      const mx = 12, my = 12, mw = narrow ? w - 24 : w * 0.6 - 18, mh = narrow ? 190 : h - 24;
      const ppu = Math.min(mw / W, mh / H);
      geo = { ox: mx + (mw - W * ppu) / 2, oy: my + (mh - H * ppu) / 2, ppu };
      const X = (v) => geo.ox + v * ppu, Y = (v) => geo.oy + v * ppu;
      ctx.fillStyle = mode === 'global' ? c.accentSoft : c.soft; roundRect(ctx, X(0), Y(0), W * ppu, H * ppu, 8); ctx.fill();
      ctx.strokeStyle = c.border; ctx.lineWidth = 1;
      for (let i = 1; i < W; i++) { ctx.beginPath(); ctx.moveTo(X(i), Y(0)); ctx.lineTo(X(i), Y(H)); ctx.stroke(); }
      for (let j = 1; j < H; j++) { ctx.beginPath(); ctx.moveTo(X(0), Y(j)); ctx.lineTo(X(W), Y(j)); ctx.stroke(); }
      if (mode === 'global') text(ctx, L.gl, X(W / 2), Y(0) + 14, c.accent, { align: 'center' });
      const bx0 = X(BX.x - BX.hw), by0 = Y(BX.y - BX.hh), bw = BX.hw * 2 * ppu, bh = BX.hh * 2 * ppu;
      if (mode === 'local') {
        if (hasCol && blend > 0) {
          ctx.setLineDash([5, 4]); ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
          roundRect(ctx, bx0 - blend * ppu, by0 - blend * ppu, bw + 2 * blend * ppu, bh + 2 * blend * ppu, blend * ppu); ctx.stroke(); ctx.setLineDash([]);
          text(ctx, L.blend, bx0 + bw / 2, Math.max(Y(0) + 10, by0 - blend * ppu - 8), c.accent, { align: 'center' });
        }
        ctx.fillStyle = hasCol ? rgba(c.accent, 0.22) : 'transparent'; ctx.fillRect(bx0, by0, bw, bh);
        if (!hasCol) ctx.setLineDash([4, 4]);
        ctx.strokeStyle = hasCol ? c.accent : c.bad; ctx.lineWidth = 2; ctx.strokeRect(bx0, by0, bw, bh); ctx.setLineDash([]);
        text(ctx, L.box, bx0 + bw / 2, by0 + bh / 2 - 8, hasCol ? c.accent : c.bad, { align: 'center' });
        text(ctx, hasCol ? 'BoxCollider' : L.noCol, bx0 + bw / 2, by0 + bh / 2 + 8, hasCol ? c.muted : c.bad, { align: 'center' });
      }
      trail.forEach((p, i) => { ctx.globalAlpha = i / trail.length * 0.5; ctx.fillStyle = c.muted; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 2, 0, TAU); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.warn; ctx.beginPath(); ctx.arc(X(pos[0]), Y(pos[1]), 8, 0, TAU); ctx.fill();
      text(ctx, '🎥', X(pos[0]), Y(pos[1]) + 1, '#fff', { align: 'center' });
      if (!auto) text(ctx, L.drag, X(W) - 6, Y(H) - 10, c.muted, { align: 'right' });
      // Vista de cámara
      const px = narrow ? 12 : w * 0.6 + 6, pw = narrow ? w - 24 : w - px - 12;
      const py = narrow ? my + mh + 26 : 34, ph = narrow ? h - py - 10 : Math.min(pw * 0.66, h - 50);
      text(ctx, L.game + ' · Vignette ' + vig.toFixed(2), px, py - 12, c.text);
      ctx.save();
      roundRect(ctx, px, py, pw, ph, 8); ctx.clip();
      const sky = ctx.createLinearGradient(0, py, 0, py + ph); sky.addColorStop(0, '#7cc0ff'); sky.addColorStop(1, '#dff1ff');
      ctx.fillStyle = sky; ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#3f8f5a'; ctx.beginPath(); ctx.ellipse(px + pw * 0.3, py + ph, pw * 0.5, ph * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2f6d45'; ctx.beginPath(); ctx.ellipse(px + pw * 0.8, py + ph, pw * 0.45, ph * 0.35, 0, 0, TAU); ctx.fill();
      if (vig > 0.001) {
        const R = Math.hypot(pw, ph) / 2;
        const g = ctx.createRadialGradient(px + pw / 2, py + ph / 2, R * 0.25, px + pw / 2, py + ph / 2, R);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + Math.min(1, vig * 1.5) + ')');
        ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
      }
      ctx.restore();
      if (!pp) text(ctx, L.ppOff, px + pw / 2, py + ph / 2, '#b91c1c', { align: 'center' });
      let verdict;
      if (!pp) verdict = L.noPP;
      else if (mode === 'global') verdict = L.glob;
      else if (!hasCol) verdict = L.noC;
      else verdict = wt >= 1 ? L.inside : wt > 0 ? L.fade : L.outside;
      out('<span>' + L.w(num(wt, 2, lang), num(vig, 2, lang)) + '</span><p>' + verdict + '</p>');
      cb([lang === 'es' ? '// Volume (Mode: Local) + BoxCollider en el mismo GameObject' : '// Volume (Mode: Local) + BoxCollider on the same GameObject',
        'volume.isGlobal = ' + (mode === 'global') + ';', 'volume.blendDistance = ' + blend.toFixed(1) + 'f;',
        lang === 'es' ? '// Cámara: Rendering ▸ Post Processing' : '// Camera: Rendering ▸ Post Processing',
        'camera.GetUniversalAdditionalCameraData().renderPostProcessing = ' + pp + ';'].join('\n'),
      { 0: mode === 'local' ? (hasCol ? 'ok' : 'bad') : 'off', 1: mode === 'local' ? 'ok' : 'bad', 4: pp ? 'ok' : 'bad' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     9. URP Render Graph: RecordRenderGraph, culling y recursos
     --------------------------------------------------------- */

  function mountRenderGraph(host, lang) {
    const L = {
      es: { rg: 'Render Graph (por defecto)', compat: 'Compatibility Mode', cull: 'Debug: AllowPassCulling(false)', mine: 'tuyo', frame: 'Frame final', outline: 'con contorno', noOutline: 'sin contorno',
        legend: '■ escribe  ○ lee  ▮ vida del recurso', culled: 'culled', alloc: 'no se asigna',
        ok: '✓ Tu pass declara lo que lee (' + cd('Depth') + ') y lo que escribe (' + cd('Color') + ') y el grafo lo ejecuta en su sitio.',
        cullOn: ' El pass Debug escribe una textura que nadie lee: el compilador lo descarta (culling) y ni siquiera reserva su memoria.',
        cullOff: ' Con ' + cd('AllowPassCulling(false)') + ' el pass Debug se ejecuta aunque nadie use su resultado.',
        execRG: '⚠ Consola: el pass no implementa ' + cd('RecordRenderGraph') + ' y no tendrá ningún efecto (solo funcionaría en Compatibility Mode). ✗ No se dibuja el contorno.',
        execC: '✓ Funciona, pero solo en Compatibility Mode (API antigua, obsoleta). Sin grafo no hay culling ni gestión de vida de recursos: el pass Debug se ejecuta para nada.',
        rgC: '✗ En Compatibility Mode, URP no llama a ' + cd('RecordRenderGraph') + ' sino a ' + cd('Execute') + ': el contorno no aparece.',
        onri: '✗ ' + cd('OnRenderImage') + ' es del Built-in Render Pipeline (un MonoBehaviour en la cámara): URP nunca lo llama, en ningún modo.',
        cRead: '// lee', cWrite: '// escribe', cOnri: '// MonoBehaviour en la cámara: solo Built-in', cOld: '// API antigua (obsoleta en Unity 6)' },
      en: { rg: 'Render Graph (default)', compat: 'Compatibility Mode', cull: 'Debug: AllowPassCulling(false)', mine: 'yours', frame: 'Final frame', outline: 'with outline', noOutline: 'no outline',
        legend: '■ writes  ○ reads  ▮ resource lifetime', culled: 'culled', alloc: 'not allocated',
        ok: '✓ Your pass declares what it reads (' + cd('Depth') + ') and writes (' + cd('Color') + '), and the graph runs it in place.',
        cullOn: ' The Debug pass writes a texture nobody reads: the compiler culls it and does not even allocate its memory.',
        cullOff: ' With ' + cd('AllowPassCulling(false)') + ' the Debug pass runs even though nobody uses its result.',
        execRG: '⚠ Console: the pass does not implement ' + cd('RecordRenderGraph') + ' and will have no effect (it would only work in Compatibility Mode). ✗ No outline is drawn.',
        execC: '✓ It works, but only in Compatibility Mode (the old, obsolete API). Without a graph there is no culling or resource lifetime management: the Debug pass runs for nothing.',
        rgC: '✗ In Compatibility Mode URP does not call ' + cd('RecordRenderGraph') + ' but ' + cd('Execute') + ': the outline does not appear.',
        onri: '✗ ' + cd('OnRenderImage') + ' belongs to the Built-in Render Pipeline (a MonoBehaviour on the camera): URP never calls it, in any mode.',
        cRead: '// reads', cWrite: '// writes', cOnri: '// MonoBehaviour on the camera: Built-in only', cOld: '// old API (obsolete in Unity 6)' }
    }[lang];
    const RES = ['Color', 'Depth', 'DebugTex', 'PostFX', 'Backbuffer'];
    const PASSES = [
      { id: 'Opaques', w: ['Color', 'Depth'] },
      { id: 'Skybox', r: ['Depth'], w: ['Color'] },
      { id: 'Transparents', r: ['Depth'], w: ['Color'] },
      { id: 'Outline', mine: true, r: ['Depth'], w: ['Color'] },
      { id: 'Debug', mine: true, debug: true, w: ['DebugTex'] },
      { id: 'Post-processing', r: ['Color'], w: ['PostFX'] },
      { id: 'Final blit', r: ['PostFX'], w: ['Backbuffer'] }
    ];
    let api = 'rg', compat = false, noCull = false, t = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'rg', l: 'RecordRenderGraph' }, { v: 'exec', l: 'Execute / Configure' }, { v: 'onri', l: 'OnRenderImage' }], api, (v) => { api = v; });
    const ctl2 = controls(host);
    seg(ctl2, [{ v: false, l: L.rg }, { v: true, l: L.compat }], compat, (v) => { compat = v; });
    toggle(ctl2, L.cull, noCull, (v) => { noCull = v; });
    const stage = makeCanvas(host, (w) => (w < 640 ? 402 : 262));
    const out = readout(host);
    const cb = codeBlock(host);
    function stateOf(p) {
      if (!p.mine) return 'run';
      if (api === 'onri') return 'never';
      const impl = (api === 'rg' && !compat) || (api === 'exec' && compat);
      if (!impl) return 'skip';
      if (p.debug && !compat && !noCull) return 'culled';
      return 'run';
    }

    const stop = loop((dt) => {
      t += dt;
      const st = PASSES.map(stateOf);
      const runIdx = st.map((s, i) => (s === 'run' ? i : -1)).filter((i) => i >= 0);
      const cur = runIdx[Math.floor(((t % 2.8) / 2.8) * runIdx.length)];
      const outlineOn = st[3] === 'run';
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 640;
      const tx = 12, ty = narrow ? 82 : 42, rh = 28, pwid = narrow ? 124 : 170;
      const colX0 = tx + pwid + 12, colW = narrow ? (w - 12 - colX0) / RES.length : Math.min(76, (w * 0.62 - colX0) / RES.length);
      const CX = (k) => colX0 + colW * (k + 0.5), RY = (i) => ty + rh * i + rh / 2;
      RES.forEach((r, k) => {
        if (!narrow) { text(ctx, r, CX(k), 22, c.muted, { align: 'center', mono: true }); return; }
        ctx.save(); ctx.translate(CX(k), ty - 6); ctx.rotate(-Math.PI / 2);
        text(ctx, r, 0, 0, c.muted, { mono: true }); ctx.restore();
      });
      // Vida de cada recurso entre su primer y último uso (en passes que se ejecutan)
      RES.forEach((r, k) => {
        const uses = runIdx.filter((i) => (PASSES[i].r || []).concat(PASSES[i].w || []).indexOf(r) >= 0);
        if (!uses.length) { text(ctx, '—', CX(k), RY(4), c.muted, { align: 'center' }); return; }
        const y0 = RY(uses[0]), y1 = RY(uses[uses.length - 1]);
        ctx.fillStyle = r === 'Backbuffer' ? c.border : c.accentSoft; roundRect(ctx, CX(k) - 5, y0 - 9, 10, y1 - y0 + 18, 5); ctx.fill();
      });
      PASSES.forEach((p, i) => {
        const s = st[i], y = ty + rh * i + 3, isCur = i === cur;
        let fill = c.soft, col = c.text;
        if (isCur) { fill = c.accent; col = '#fff'; }
        else if (s === 'skip' || s === 'never') { fill = c.badSoft; col = c.bad; }
        else if (s === 'culled') { fill = 'transparent'; col = c.muted; }
        ctx.fillStyle = fill; roundRect(ctx, tx, y, pwid, rh - 6, 6); ctx.fill();
        if (s === 'culled') { ctx.setLineDash([4, 3]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.2; roundRect(ctx, tx, y, pwid, rh - 6, 6); ctx.stroke(); ctx.setLineDash([]); }
        else if (p.mine && s === 'run' && !isCur) { ctx.strokeStyle = c.ok; ctx.lineWidth = 1.5; roundRect(ctx, tx, y, pwid, rh - 6, 6); ctx.stroke(); }
        const icon = s === 'culled' ? '✂ ' : s === 'skip' ? '⚠ ' : s === 'never' ? '✗ ' : '';
        const label = icon + p.id + (p.mine ? ' (' + L.mine + ')' : '');
        text(ctx, label, tx + 8, y + (rh - 6) / 2, col);
        if (s === 'culled') {
          const lw = ctx.measureText(label).width;
          ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx + 8, y + (rh - 6) / 2); ctx.lineTo(tx + 8 + lw, y + (rh - 6) / 2); ctx.stroke();
        }
        if (s !== 'run') return;
        (p.w || []).forEach((r) => { const k = RES.indexOf(r); ctx.fillStyle = c.warn; ctx.fillRect(CX(k) - 5, RY(i) - 5, 10, 10); });
        (p.r || []).forEach((r) => { const k = RES.indexOf(r); ctx.strokeStyle = c.ok; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(CX(k), RY(i), 5, 0, TAU); ctx.stroke(); });
      });
      if (st[4] === 'culled' && !narrow) text(ctx, L.alloc, CX(2), RY(5) + 2, c.muted, { align: 'center' });
      const legY = ty + rh * PASSES.length + 10;
      text(ctx, L.legend, tx, legY, c.muted);
      // Vista previa del frame
      const pvx = narrow ? tx : colX0 + colW * RES.length + 20, pvw = narrow ? w - 24 : w - pvx - 12;
      const pvy = narrow ? legY + 30 : ty, pvh = narrow ? h - pvy - 8 : Math.min(rh * 7 - 26, pvw * 0.8);
      text(ctx, L.frame + ' · ' + (outlineOn ? L.outline : L.noOutline), pvx, pvy - 12, outlineOn ? c.ok : c.bad);
      ctx.fillStyle = '#151922'; roundRect(ctx, pvx, pvy, pvw, pvh, 8); ctx.fill();
      ctx.fillStyle = '#2a3142'; ctx.fillRect(pvx, pvy + pvh * 0.78, pvw, pvh * 0.22);
      const fcx = pvx + pvw / 2, fsz = Math.min(pvh * 0.28, 40);
      const shape = () => { ctx.beginPath(); roundRect(ctx, fcx - fsz * 0.45, pvy + pvh * 0.78 - fsz * 1.5, fsz * 0.9, fsz * 1.5, fsz * 0.3); };
      if (outlineOn) {
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; shape(); ctx.stroke();
        ctx.beginPath(); ctx.arc(fcx, pvy + pvh * 0.78 - fsz * 1.5 - fsz * 0.35, fsz * 0.35, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = '#6b7280'; shape(); ctx.fill();
      ctx.beginPath(); ctx.arc(fcx, pvy + pvh * 0.78 - fsz * 1.5 - fsz * 0.35, fsz * 0.35, 0, TAU); ctx.fill();
      let msg;
      if (api === 'onri') msg = L.onri;
      else if (api === 'rg') msg = compat ? L.rgC : L.ok + (noCull ? L.cullOff : L.cullOn);
      else msg = compat ? L.execC : L.execRG;
      out(msg);
      let src, marks;
      if (api === 'rg') {
        src = ['public override void RecordRenderGraph(RenderGraph renderGraph, ContextContainer frameData)', '{',
          '    var res = frameData.Get<UniversalResourceData>();',
          '    using var builder = renderGraph.AddRasterRenderPass<PassData>("Outline", out var data);',
          '    data.material = outlineMaterial;',
          '    builder.UseTexture(res.cameraDepthTexture);              ' + L.cRead,
          '    builder.SetRenderAttachment(res.activeColorTexture, 0);  ' + L.cWrite,
          '    builder.SetRenderFunc((PassData d, RasterGraphContext ctx) =>',
          '        ctx.cmd.DrawProcedural(Matrix4x4.identity, d.material, 0, MeshTopology.Triangles, 3));', '}'];
        marks = compat ? { 0: 'bad' } : { 0: 'ok', 3: 'hl', 5: 'hl', 6: 'hl', 7: 'hl' };
      } else if (api === 'exec') {
        src = [L.cOld, 'public override void Configure(CommandBuffer cmd, RenderTextureDescriptor desc) { }',
          'public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)', '{',
          '    CommandBuffer cmd = CommandBufferPool.Get("Outline");', '    // ... dibujar el contorno',
          '    context.ExecuteCommandBuffer(cmd);', '    CommandBufferPool.Release(cmd);', '}'];
        if (lang === 'en') src[5] = '    // ... draw the outline';
        marks = compat ? { 1: 'ok', 2: 'ok' } : { 1: 'bad', 2: 'bad' };
      } else {
        src = [L.cOnri, 'void OnRenderImage(RenderTexture src, RenderTexture dst)', '{', '    Graphics.Blit(src, dst, outlineMaterial);', '}'];
        marks = { 1: 'bad' };
      }
      cb(src.join('\n'), marks);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     Catálogo
     --------------------------------------------------------- */

  UCP.concepts.push(
    {
      id: 'propiedades-shader', questions: ['art-02', 'art-19'], domain: 'art', practice: { d: 'art', t: 'Materiales' }, icon: '🖌️', mount: mountShaderProps,
      text: {
        es: {
          title: 'Propiedades de shader: _BaseColor, _Color y _EMISSION',
          summary: 'Cada shader define sus propias propiedades: URP Lit usa `_BaseColor` y el Standard del Built-in usa `_Color`. Si pasas un nombre que no existe, `SetColor` no hace nada y no avisa. La emisión, además, necesita la keyword `_EMISSION` para usar la variante del shader que la incluye. Cambia de shader, prueba cada nombre y activa la emisión en el Editor y en la build.',
          points: ['URP Lit: `_BaseColor` y `_BaseMap`; Built-in Standard: `_Color` y `_MainTex`.', 'Un nombre que no existe en el shader se ignora en silencio: sin error ni aviso.', '`material.color` usa la propiedad marcada con `[MainColor]` (o `_Color` por defecto).', 'Emisión por script: `mat.EnableKeyword("_EMISSION")` + `_EmissionColor`. Si ningún material de la build usa la keyword, la variante puede eliminarse.', 'Cachea los IDs con `Shader.PropertyToID`. `Material.Apply()` no existe.']
        },
        en: {
          title: 'Shader properties: _BaseColor, _Color and _EMISSION',
          summary: 'Each shader defines its own properties: URP Lit uses `_BaseColor`, while the Built-in Standard shader uses `_Color`. If you pass a name that does not exist, `SetColor` silently does nothing. Emission also needs the `_EMISSION` keyword so the shader variant that includes it is used. Switch shaders, try each name and enable emission in the Editor and in a build.',
          points: ['URP Lit: `_BaseColor` and `_BaseMap`; Built-in Standard: `_Color` and `_MainTex`.', 'A name the shader does not have is silently ignored: no error, no warning.', '`material.color` uses the property tagged `[MainColor]` (or `_Color` by default).', 'Emission from script: `mat.EnableKeyword("_EMISSION")` + `_EmissionColor`. If no material in the build uses the keyword, the variant can be stripped.', 'Cache IDs with `Shader.PropertyToID`. `Material.Apply()` does not exist.']
        }
      }
    },
    {
      id: 'eventos-root-motion', questions: ['art-07', 'art-10'], domain: 'art', practice: { d: 'art', t: 'Animación 3D' }, icon: '👣', mount: mountEventsRoot,
      text: {
        es: {
          title: 'Animation Events y Root Motion',
          summary: 'Un **Animation Event** llama a un método por su nombre en un frame concreto del clip, así que el sonido del paso queda pegado al contacto del pie aunque cambie la velocidad; un temporizador no sabe nada de la animación. En la pestaña Root Motion compara dejar que Unity aplique el movimiento del clip con tomarlo tú en `OnAnimatorMove`. Cambia `animator.speed` y prueba cada modo.',
          points: ['El evento llama a un método de un componente del **mismo GameObject** que el `Animator`.', 'Con eventos, el sonido sigue sincronizado a cualquier velocidad; una corrutina cada 0,5 s se desfasa.', '`OnAnimatorMove`: Unity deja de aplicar el root motion y lo aplicas tú con `animator.deltaPosition` y `deltaRotation` (por ejemplo, con `CharacterController.Move`).', 'Con `OnAnimatorMove` implementado, el Inspector muestra Apply Root Motion como “Handled by Script”.', '`OnAnimatorIK` es para cinemática inversa, no para el root motion.']
        },
        en: {
          title: 'Animation Events and Root Motion',
          summary: 'An **Animation Event** calls a method by name on a specific frame of the clip, so the footstep sound stays glued to the foot contact even when the speed changes; a timer knows nothing about the animation. In the Root Motion tab, compare letting Unity apply the clip’s motion with taking it yourself in `OnAnimatorMove`. Change `animator.speed` and try each mode.',
          points: ['The event calls a method on a component of the **same GameObject** as the `Animator`.', 'With events the sound stays in sync at any speed; a coroutine every 0.5 s drifts.', '`OnAnimatorMove`: Unity stops applying root motion and you apply it with `animator.deltaPosition` and `deltaRotation` (e.g. through `CharacterController.Move`).', 'With `OnAnimatorMove` implemented, the Inspector shows Apply Root Motion as “Handled by Script”.', '`OnAnimatorIK` is for inverse kinematics, not root motion.']
        }
      }
    },
    {
      id: 'blend-tree', questions: ['art-08'], domain: 'art', practice: { d: 'art', t: 'Animación 3D' }, icon: '🏃', mount: mountBlendTree,
      text: {
        es: {
          title: 'Blend Tree 1D: Idle, Walk y Run',
          summary: 'Un **Blend Tree 1D** mezcla varios clips según un parámetro float. Con umbrales Idle 0, Walk 2 y Run 6, un `Speed` de 4 da 50 % Walk + 50 % Run: la transición es continua y el paso encaja con la velocidad. Mueve el slider (o pulsa Acelerar) y compáralo con tres estados separados con triggers.',
          points: ['Locomoción según la velocidad: Blend Tree 1D + `animator.SetFloat("Speed", v)`.', 'El peso se reparte entre los dos umbrales vecinos y siempre suma 1.', 'Los clips se sincronizan por tiempo normalizado: los pies no se descoordinan.', 'Estados + transiciones con triggers: saltos bruscos y muchas transiciones que mantener.', 'Movimiento en 8 direcciones (X/Y): **Blend Tree 2D**.']
        },
        en: {
          title: '1D Blend Tree: Idle, Walk and Run',
          summary: 'A **1D Blend Tree** blends several clips from one float parameter. With thresholds Idle 0, Walk 2 and Run 6, a `Speed` of 4 gives 50 % Walk + 50 % Run: the change is continuous and the stride matches the speed. Move the slider (or press Speed up) and compare it with three separate states driven by triggers.',
          points: ['Speed-based locomotion: 1D Blend Tree + `animator.SetFloat("Speed", v)`.', 'The weight is split between the two neighbouring thresholds and always adds up to 1.', 'Clips are synced by normalized time, so the feet stay coordinated.', 'States + trigger transitions: abrupt pops and many transitions to maintain.', '8-direction movement (X/Y): a **2D Blend Tree**.']
        }
      }
    },
    {
      id: 'animator-layers', questions: ['art-09'], domain: 'art', practice: { d: 'art', t: 'Animación 3D' }, icon: '🦴', mount: mountLayers,
      text: {
        es: {
          title: 'Animator Layers y Avatar Mask',
          summary: 'Las **layers** del Animator ejecutan varias máquinas de estado a la vez. La Base Layer corre con todo el cuerpo y la layer Shoot, con una **Avatar Mask** del tronco superior, weight 1 y blending Override, controla solo brazos y torso. Quita la máscara, baja el weight o cambia a Additive y mira de qué color se pintan los huesos.',
          points: ['Correr y disparar: una layer extra con Avatar Mask del tronco superior.', 'Override sustituye la pose de las layers de abajo; Additive le suma la diferencia del clip.', 'Sin máscara, una layer Override con weight 1 controla todo el cuerpo (las piernas dejan de correr).', '`animator.SetLayerWeight(index, w)` activa o desactiva la layer por código.', 'No hacen falta dos `Animator` ni un clip combinado “CorrerYDisparar”.']
        },
        en: {
          title: 'Animator Layers and Avatar Masks',
          summary: 'Animator **layers** run several state machines at once. The Base Layer runs with the whole body, and the Shoot layer, with an upper-body **Avatar Mask**, weight 1 and Override blending, drives only the arms and torso. Remove the mask, lower the weight or switch to Additive and watch the bone colors.',
          points: ['Run and shoot: an extra layer with an upper-body Avatar Mask.', 'Override replaces the pose of the layers below; Additive adds the clip’s difference on top.', 'Without a mask, an Override layer at weight 1 drives the whole body (the legs stop running).', '`animator.SetLayerWeight(index, w)` turns the layer on or off from code.', 'No need for two `Animator` components or a combined “RunAndShoot” clip.']
        }
      }
    },
    {
      id: 'iluminacion-baked', questions: ['art-11', 'art-12', 'art-13'], domain: 'art', practice: { d: 'art', t: 'Iluminación' }, icon: '💡', mount: mountBaked,
      text: {
        es: {
          title: 'Iluminación baked: lightmaps, Light Probes y Reflection Probes',
          summary: 'Los **lightmaps** solo se aplican a mallas marcadas como Contribute GI y con UVs de lightmap sin solapes. Los objetos dinámicos reciben la luz baked a través de **Light Probes**, y los reflejos de los metales vienen de **Reflection Probes**. Recorre las tres pestañas y activa cada opción.',
          points: ['Lightmap correcto: **Contribute GI** (Static) + UVs de lightmap (Generate Lightmap UVs → UV1).', 'UVs solapadas: varias caras comparten texels → manchas y artefactos.', 'Personaje dinámico en una escena baked: **Light Probe Group** (luz difusa e indirecta interpolada).', 'Metal que refleja el skybox: un **Reflection Probe** que capture la habitación.', 'Light Probes = luz difusa; Reflection Probes = reflejos. Un shader Unlit ignora la iluminación.']
        },
        en: {
          title: 'Baked lighting: lightmaps, Light Probes and Reflection Probes',
          summary: '**Lightmaps** only apply to meshes marked Contribute GI that have non-overlapping lightmap UVs. Dynamic objects receive baked light through **Light Probes**, and metallic reflections come from **Reflection Probes**. Go through the three tabs and toggle each option.',
          points: ['Proper lightmaps: **Contribute GI** (Static) + lightmap UVs (Generate Lightmap UVs → UV1).', 'Overlapping UVs: several faces share texels → blotches and artifacts.', 'Dynamic character in a baked scene: a **Light Probe Group** (interpolated diffuse and indirect light).', 'Metal reflecting the skybox: a **Reflection Probe** that captures the room.', 'Light Probes = diffuse light; Reflection Probes = reflections. An Unlit shader ignores lighting.']
        }
      }
    },
    {
      id: 'particulas', questions: ['art-14', 'art-15', 'art-16'], domain: 'art', practice: { d: 'art', t: 'Partículas' }, icon: '✨', mount: mountParticles,
      text: {
        es: {
          title: 'ParticleSystem: Emit, Stop y módulos',
          summary: '`Emit(30)` crea 30 partículas al instante aunque el sistema no se esté reproduciendo. Para apagar un fuego con naturalidad, `Stop` con `StopEmitting` deja que las partículas vivas terminen; `StopEmittingAndClear` y `Clear` las borran de golpe. Y los módulos (`main`, `emission`…) son structs: guárdalos en una variable antes de modificarlos. Pulsa cada botón y cambia el código.',
          points: ['Ráfaga puntual: `ps.Emit(30)` (no existe `Play(30)`; `rateOverTime` emite de forma continua).', '`Stop(true, ParticleSystemStopBehavior.StopEmitting)`: las vivas terminan su vida.', '`StopEmittingAndClear` y `Clear()` las eliminan al instante; `Destroy` elimina el objeto entero.', '`ps.main.startSpeed = 10f;` → error CS1612. Usa `var main = ps.main; main.startSpeed = 10f;`.', 'No hace falta reasignar el módulo: `ps.main` es de solo lectura.']
        },
        en: {
          title: 'ParticleSystem: Emit, Stop and modules',
          summary: '`Emit(30)` creates 30 particles instantly, even if the system is not playing. To put a fire out naturally, `Stop` with `StopEmitting` lets the live particles finish; `StopEmittingAndClear` and `Clear` wipe them at once. And modules (`main`, `emission`…) are structs: store them in a variable before changing them. Press each button and switch the code.',
          points: ['One-off burst: `ps.Emit(30)` (there is no `Play(30)`; `rateOverTime` emits continuously).', '`Stop(true, ParticleSystemStopBehavior.StopEmitting)`: live particles finish their life.', '`StopEmittingAndClear` and `Clear()` remove them instantly; `Destroy` removes the whole object.', '`ps.main.startSpeed = 10f;` → error CS1612. Use `var main = ps.main; main.startSpeed = 10f;`.', 'No need to reassign the module: `ps.main` is read-only.']
        }
      }
    },
    {
      id: 'texturas-memoria', questions: ['art-17', 'art-18', 'prf-17'], domain: 'art', practice: { d: 'art', t: 'Texturas' }, icon: '🖼️', mount: mountTextures,
      text: {
        es: {
          title: 'Texturas: formato, mipmaps y Read/Write',
          summary: 'La memoria de una textura depende de su tamaño, del formato (bits por píxel), de si tiene mipmaps (+33 %) y de si guarda una copia en la CPU (Read/Write). En móviles, **ASTC** es el formato recomendado y su tamaño de bloque te deja elegir entre calidad y tamaño; un formato que la GPU no soporta se descomprime a RGBA32. Cambia plataforma, formato y opciones y mira las barras.',
          points: ['Android e iOS modernos: **ASTC** (4x4 = 8 bpp … 8x8 = 2 bpp). DXT/BC: escritorio y consolas. PVRTC: iPhones antiguos.', 'Formato no soportado por la GPU → se descomprime a RGBA32 (32 bpp): mucha más memoria y carga más lenta.', 'Mipmaps: +33 % de memoria; solo sirven si la textura se ve a distintas distancias.', 'UI a tamaño fijo: desactiva **Generate Mip Maps**.', '**Read/Write Enabled** mantiene una copia en la CPU (para `GetPixels`/`SetPixels`): más memoria, actívalo solo si lo necesitas.']
        },
        en: {
          title: 'Textures: format, mipmaps and Read/Write',
          summary: 'A texture’s memory depends on its size, its format (bits per pixel), whether it has mipmaps (+33 %) and whether it keeps a CPU copy (Read/Write). On mobile, **ASTC** is the recommended format and its block size lets you trade quality for size; a format the GPU does not support gets decompressed to RGBA32. Change the platform, format and options and watch the bars.',
          points: ['Modern Android and iOS: **ASTC** (4x4 = 8 bpp … 8x8 = 2 bpp). DXT/BC: desktop and consoles. PVRTC: old iPhones.', 'Format the GPU does not support → decompressed to RGBA32 (32 bpp): much more memory and slower loading.', 'Mipmaps: +33 % memory; only useful when the texture is seen at different distances.', 'UI at a fixed size: disable **Generate Mip Maps**.', '**Read/Write Enabled** keeps a CPU copy (for `GetPixels`/`SetPixels`): more memory, enable it only when needed.']
        }
      }
    },
    {
      id: 'volumes', questions: ['art-20'], domain: 'art', practice: { d: 'art', t: 'Iluminación' }, icon: '🌫️', mount: mountVolumes,
      text: {
        es: {
          title: 'URP Volumes: Global, Local y Blend Distance',
          summary: 'Un **Volume Local** solo influye dentro de su collider, más una franja de **Blend Distance** donde el efecto entra poco a poco; uno **Global** afecta a toda la escena. La cámara, con Post Processing activado, mezcla los overrides según el peso. Mira el weight y la Vignette mientras el jugador cruza la zona, o arrástralo tú.',
          points: ['Efecto solo en una zona: Volume en modo **Local** + un collider en el mismo GameObject.', '**Blend Distance**: el peso pasa de 0 a 1 al acercarse al collider.', 'Global: afecta en todas partes; la prioridad solo decide entre volúmenes que se solapan.', 'La cámara necesita **Post Processing** activado; la posición evaluada es la de la cámara o la de su **Volume Trigger**.', 'Post-process Layer y Post-process Volume son del antiguo Post Processing Stack v2 (Built-in).']
        },
        en: {
          title: 'URP Volumes: Global, Local and Blend Distance',
          summary: 'A **Local Volume** only has influence inside its collider, plus a **Blend Distance** band where the effect fades in; a **Global** one affects the whole scene. The camera, with Post Processing enabled, blends the overrides by weight. Watch the weight and the Vignette while the player crosses the zone, or drag it yourself.',
          points: ['Effect in one zone only: a **Local** Volume + a collider on the same GameObject.', '**Blend Distance**: the weight goes from 0 to 1 as you approach the collider.', 'Global: applies everywhere; priority only decides between overlapping volumes.', 'The camera needs **Post Processing** enabled; the position evaluated is the camera’s or its **Volume Trigger**’s.', 'Post-process Layer and Post-process Volume belong to the old Post Processing Stack v2 (Built-in).']
        }
      }
    },
    {
      id: 'render-graph', questions: ['art-21'], domain: 'art', practice: { d: 'art', t: 'Materiales' }, icon: '🕸️', mount: mountRenderGraph,
      text: {
        es: {
          title: 'URP Render Graph: RecordRenderGraph',
          summary: 'En Unity 6, URP construye cada frame como un **grafo** de passes: cada pass declara qué texturas lee y cuáles escribe, y el compilador del grafo descarta los passes cuyo resultado nadie usa y gestiona la vida de los recursos. Tu `ScriptableRenderPass` debe implementar `RecordRenderGraph`. Cambia la API y el modo y mira si tu pass Outline llega a ejecutarse.',
          points: ['Render Graph (por defecto en Unity 6): implementa `RecordRenderGraph(RenderGraph, ContextContainer)`.', 'Declara recursos con `AddRasterRenderPass`, `UseTexture` (leer) y `SetRenderAttachment` (escribir); el trabajo va en `SetRenderFunc`.', 'Un pass cuyo resultado nadie lee se descarta (culling), salvo con `AllowPassCulling(false)`.', '`Execute` y `Configure` son la API antigua: solo funcionan en Compatibility Mode.', '`OnRenderImage` es del Built-in Render Pipeline: URP no lo llama.']
        },
        en: {
          title: 'URP Render Graph: RecordRenderGraph',
          summary: 'In Unity 6, URP builds every frame as a **graph** of passes: each pass declares which textures it reads and writes, and the graph compiler culls passes whose output nobody uses and manages resource lifetimes. Your `ScriptableRenderPass` must implement `RecordRenderGraph`. Change the API and the mode and see whether your Outline pass actually runs.',
          points: ['Render Graph (the Unity 6 default): implement `RecordRenderGraph(RenderGraph, ContextContainer)`.', 'Declare resources with `AddRasterRenderPass`, `UseTexture` (read) and `SetRenderAttachment` (write); the work goes in `SetRenderFunc`.', 'A pass whose output nobody reads is culled, unless you call `AllowPassCulling(false)`.', '`Execute` and `Configure` are the old API: they only work in Compatibility Mode.', '`OnRenderImage` belongs to the Built-in Render Pipeline: URP never calls it.']
        }
      }
    }
  );
})();
