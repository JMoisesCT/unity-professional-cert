/* Conceptos animados: perf (optimización de rendimiento y plataformas) */
(function () {
  'use strict';
  const K = UCP.conceptKit;
  const { colors, el, makeCanvas, loop, controls, button, seg, slider, toggle, readout, roundRect, text, code, codeBlock, drag, arrow, box, lerp, clamp, ease } = K;

  /* ---------------------------------------------------------
     Utilidades privadas
     --------------------------------------------------------- */

  const narrow = (w) => w < 560;
  const hue = (i) => 'hsl(' + Math.round((i * 137.508) % 360) + ' 62% 52%)';
  const nf = (lang) => (v, d) => { const s = Number(v).toFixed(d === undefined ? 1 : d); return lang === 'es' ? s.replace('.', ',') : s; };
  const big = (lang) => (v) => Math.round(v).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');

  function panel(ctx, x, y, w, h, fill, stroke, dash) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, 10); ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
      if (dash) ctx.setLineDash([5, 4]);
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function meter(ctx, x, y, w, h, f, color, c) {
    ctx.fillStyle = c.border;
    roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    f = clamp(f, 0, 1);
    if (f > 0.002) { ctx.fillStyle = color; roundRect(ctx, x, y, Math.max(h, w * f), h, h / 2); ctx.fill(); }
  }

  // Recorta un texto para que quepa en maxW (con «…»).
  function fit(ctx, s, maxW, mono) {
    ctx.font = mono ? K.MONO : K.FONT;
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  function push(arr, v) { arr.push(v); arr.shift(); }

  // Texto con `código` y **negrita** para el readout.
  const md = (s) => K.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

  // Gráfica de tiempo de frame con la línea de presupuesto de 60 FPS.
  function frameGraph(ctx, s, x, y, w, h, c, color, max, label, budget) {
    panel(ctx, x, y, w, h, c.soft);
    const gx = x + 8, gw = w - 16, gy = y + 24, gh = h - 32;
    text(ctx, fit(ctx, label, w - 80), x + 8, y + 12, c.muted);
    text(ctx, budget, x + w - 8, y + 12, c.muted, { align: 'right' });
    const yb = gy + gh - (16.7 / max) * gh;
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(gx, yb); ctx.lineTo(gx + gw, yb); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    s.forEach((v, k) => {
      const px = gx + (k / (s.length - 1)) * gw;
      const py = gy + gh - Math.min(1, v / max) * gh;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.stroke();
  }

  // Reemplaza un grupo de botones segmentados (para opciones que cambian según la pestaña).
  function swapSeg(holder, opts, value, onChange) {
    holder.innerHTML = '';
    seg(holder, opts, value, onChange);
  }

  /* ---------------------------------------------------------
     1. Cachear referencias: GetComponent, Find*, StringToHash
     --------------------------------------------------------- */

  function mountCache(host, lang) {
    const L = {
      es: {
        tabs: [{ v: 'get', l: 'GetComponent' }, { v: 'find', l: 'Buscar el GameManager' }, { v: 'hash', l: 'Parámetro del Animator' }],
        cachedAwake: 'Cacheado en Awake', cached: 'Referencia guardada',
        enemies: '300 enemigos ejecutan Update()', frame: 'Tiempo de frame', scripts: 'Scripts',
        cnt: { get: 'GetComponent/s', find: 'búsquedas en escena/s', hash: 'hashes de string/s' },
        scan: 'Revisando objeto', sorting: 'Ordenando por InstanceID…', returns: 'Devuelve', alloc: 'new GameManager[] → basura',
        other: '¡el de otro enemigo!', noscan: 'Sin búsquedas: usa el campo', once: 'Awake: 1 vez', every: '×300 cada frame',
        lookComps: 'Busca entre sus', lookComps2: 'componentes…', field: 'animator', hashBox: 'hash()', table: 'Parámetros', staticOnce: 'static: 1 vez al cargar la clase',
        whose: '// ¿de quién?', illus: 'cifras ilustrativas',
        v: {
          gc: '✗ 300 llamadas a `GetComponent` por frame. Guarda la referencia en `Awake` (o asígnala con `[SerializeField]`).',
          ffo: '✗ Aún peor: recorre **toda la escena** y devuelve el primer Animator que encuentra… que puede ser el de otro enemigo.',
          cached: '✓ Una sola búsqueda en `Awake`; en `Update` solo se lee el campo.',
          first: '✗ Revisa todos los objetos y además garantiza el orden (el mismo que el obsoleto `FindObjectOfType`): es la más lenta de las dos.',
          any: '≈ La búsqueda más rápida: devuelve **cualquier** instancia, sin ordenar. Pero en `Update` sigue siendo una búsqueda ×300 cada frame: hazla una vez y guárdala.',
          objs: '✗ Crea un array nuevo (basura) con todas las instancias y lo ordena solo para quedarse con una.',
          name: '✗ Compara el nombre de cada GameObject activo: lento y frágil (se rompe si renombras el objeto).',
          cachedGM: '✓ Lo ideal: buscar una vez (con `FindAnyObjectByType`) y guardar la referencia.',
          str: '≈ Funciona y compila, pero cada llamada calcula el hash del string "Speed": 300 hashes por frame.',
          id: '✓ El hash se calcula una sola vez (`static readonly`) y el Animator recibe directamente el `int`. Igual con `Shader.PropertyToID`.'
        }
      },
      en: {
        tabs: [{ v: 'get', l: 'GetComponent' }, { v: 'find', l: 'Find the GameManager' }, { v: 'hash', l: 'Animator parameter' }],
        cachedAwake: 'Cached in Awake', cached: 'Cached reference',
        enemies: '300 enemies run Update()', frame: 'Frame time', scripts: 'Scripts',
        cnt: { get: 'GetComponent/s', find: 'scene searches/s', hash: 'string hashes/s' },
        scan: 'Checking object', sorting: 'Sorting by InstanceID…', returns: 'Returns', alloc: 'new GameManager[] → garbage',
        other: 'another enemy’s!', noscan: 'No searches: uses the field', once: 'Awake: once', every: '×300 every frame',
        lookComps: 'Searches its', lookComps2: 'components…', field: 'animator', hashBox: 'hash()', table: 'Parameters', staticOnce: 'static: once when the class loads',
        whose: '// whose?', illus: 'illustrative numbers',
        v: {
          gc: '✗ 300 `GetComponent` calls per frame. Store the reference in `Awake` (or assign it with `[SerializeField]`).',
          ffo: '✗ Even worse: it walks the **whole scene** and returns the first Animator it finds… which may belong to another enemy.',
          cached: '✓ A single lookup in `Awake`; `Update` just reads the field.',
          first: '✗ Checks every object and also guarantees the order (the same one as the obsolete `FindObjectOfType`): the slower of the two.',
          any: '≈ The fastest search: it returns **any** instance, unsorted. But in `Update` it is still a search ×300 every frame: do it once and keep it.',
          objs: '✗ Builds a new array (garbage) with every instance and sorts it just to keep one.',
          name: '✗ Compares the name of every active GameObject: slow and fragile (it breaks if you rename the object).',
          cachedGM: '✓ Ideal: search once (with `FindAnyObjectByType`) and keep the reference.',
          str: '≈ It works and compiles, but every call hashes the string "Speed": 300 hashes per frame.',
          id: '✓ The hash is computed once (`static readonly`) and the Animator gets the `int` directly. Same idea as `Shader.PropertyToID`.'
        }
      }
    }[lang];
    const F = nf(lang), B = big(lang);
    const VARS = {
      get: [{ v: 'gc', l: 'GetComponent', per: 0.004 }, { v: 'ffo', l: 'FindFirstObjectByType<Animator>', per: 0.04 }, { v: 'cached', l: L.cachedAwake, per: 0.0002 }],
      find: [{ v: 'first', l: 'FindFirstObjectByType', per: 0.035 }, { v: 'any', l: 'FindAnyObjectByType', per: 0.02 }, { v: 'objs', l: 'FindObjectsByType(…)[0]', per: 0.045 },
        { v: 'name', l: 'GameObject.Find', per: 0.05 }, { v: 'cachedGM', l: L.cached, per: 0.0002 }],
      hash: [{ v: 'str', l: 'SetFloat("Speed", v)', per: 0.0012 }, { v: 'id', l: 'SetFloat(SpeedId, v)', per: 0.0004 }]
    };
    const upd = (e) => 'void Update()\n{\n    var gm = ' + e + ';\n    gm.Report(this);\n}';
    const CODE = {
      gc: ['void Update()\n{\n    GetComponent<Animator>().SetFloat("Speed", speed);\n}', { 2: 'bad' }],
      ffo: ['void Update()\n{\n    var a = FindFirstObjectByType<Animator>();\n    a.SetFloat("Speed", speed); ' + L.whose + '\n}', { 2: 'bad', 3: 'bad' }],
      cached: ['Animator animator;\n\nvoid Awake()\n{\n    animator = GetComponent<Animator>();\n}\n\nvoid Update()\n{\n    animator.SetFloat("Speed", speed);\n}', { 4: 'ok', 9: 'ok' }],
      first: [upd('FindFirstObjectByType<GameManager>()'), { 2: 'bad' }],
      any: [upd('FindAnyObjectByType<GameManager>()'), { 2: 'hl' }],
      objs: ['void Update()\n{\n    var gm = FindObjectsByType<GameManager>(\n        FindObjectsSortMode.InstanceID)[0];\n    gm.Report(this);\n}', { 2: 'bad', 3: 'bad' }],
      name: ['void Update()\n{\n    var gm = GameObject.Find("GameManager")\n        .GetComponent<GameManager>();\n    gm.Report(this);\n}', { 2: 'bad', 3: 'bad' }],
      cachedGM: ['GameManager gm;\n\nvoid Awake()\n{\n    gm = FindAnyObjectByType<GameManager>();\n}\n\nvoid Update()\n{\n    gm.Report(this);\n}', { 4: 'ok', 9: 'ok' }],
      str: ['void Update()\n{\n    animator.SetFloat("Speed", speed);\n}', { 2: 'hl' }],
      id: ['static readonly int SpeedId =\n    Animator.StringToHash("Speed");\n\nvoid Update()\n{\n    animator.SetFloat(SpeedId, speed);\n}', { 0: 'ok', 1: 'ok', 5: 'ok' }]
    };

    let tab = 'get';
    let cur = VARS.get[0];
    let t = 0, gcAcc = 0;
    const samples = new Array(90).fill(6);

    const ctl = controls(host);
    seg(ctl, L.tabs, tab, (v) => { tab = v; cur = VARS[v][0]; t = 0; swapSeg(varHold, opts(), cur.v, pick); });
    const ctl2 = controls(host);
    const varHold = el('div');
    ctl2.appendChild(varHold);
    const opts = () => VARS[tab].map((o) => ({ v: o.v, l: K.esc(o.l) }));
    const pick = (v) => { cur = VARS[tab].find((o) => o.v === v); t = 0; };
    swapSeg(varHold, opts(), cur.v, pick);
    const stage = makeCanvas(host, (w) => (narrow(w) ? 360 : 250));
    const out = readout(host);
    const cb = codeBlock(host);

    // Escena con 40 objetos: el cursor revisa uno a uno.
    function drawScan(ctx, x, y, w, h, c, mode) {
      const N = 40, cols = 10, rows = 4;
      const ffo = mode === 'ffo';
      const targets = ffo ? [2, 7, 13, 18, 25, 33] : [9, 31];
      const winner = ffo ? 2 : (mode === 'any' || mode === 'name') ? 9 : 31;
      const full = mode === 'first' || mode === 'objs' || ffo;
      const step = mode === 'name' ? 0.08 : 0.04;
      const scanN = full ? N : winner + 1;
      const sortT = full ? 0.7 : 0;
      const cycle = scanN * step + sortT + 1.1;
      const tt = t % cycle;
      const cached = mode === 'cachedGM';
      const scanned = cached ? -1 : Math.min(scanN, Math.floor(tt / step));
      const sorting = full && tt >= scanN * step && tt < scanN * step + sortT;
      const done = cached || tt >= scanN * step + sortT;
      const gap = 3, bw = (w - gap * (cols - 1)) / cols, bh = Math.min(32, (h - 22 - gap * (rows - 1)) / rows);
      for (let i = 0; i < N; i++) {
        const bx = x + (i % cols) * (bw + gap), by = y + Math.floor(i / cols) * (bh + gap);
        const isT = targets.indexOf(i) >= 0;
        let fill = i < scanned ? c.accentSoft : c.bg, col = c.muted;
        if (isT) { fill = c.warnSoft; col = c.text; }
        if (done && i === winner) { fill = ffo ? c.bad : c.ok; col = '#fff'; }
        box(ctx, bx, by, bw, bh, isT ? (ffo ? (i === 25 ? '★' : 'A') : 'GM') : '', fill, col, { r: 4, stroke: !done && i === scanned ? c.accent : null, lw: 2 });
      }
      const sy = y + rows * (bh + gap) + 8;
      let msg;
      if (cached) msg = L.noscan;
      else if (sorting) msg = mode === 'objs' ? L.alloc : L.sorting;
      else if (!done) msg = L.scan + ' ' + (scanned + 1) + '/' + N;
      else msg = L.returns + ' #' + winner + (ffo ? ' — ' + L.other : '');
      text(ctx, fit(ctx, msg, w), x, sy, done ? (ffo ? c.bad : c.ok) : (sorting && mode === 'objs' ? c.bad : c.text));
    }

    function drawComps(ctx, x, y, w, h, c, mode) {
      const names = ['Transform', 'Rigidbody', 'Collider', 'EnemyAI', 'Animator'];
      const rh = Math.min(24, (h - 8) / 5 - 4);
      const bw = Math.min(150, w * 0.52), bx = x + w - bw;
      const curI = mode === 'gc' ? Math.floor((t * 6) % 8) : -1;
      names.forEach((n, i) => {
        const by = y + i * (rh + 4);
        const found = i === 4 && (mode === 'cached' || curI >= 4);
        box(ctx, bx, by, bw, rh, n, found ? c.ok : (i === curI ? c.accentSoft : c.bg), found ? '#fff' : c.text, { r: 5, stroke: i === curI ? c.accent : null, lw: 2 });
      });
      const ly = y + 2 * (rh + 4) + rh / 2;
      if (mode === 'gc') {
        text(ctx, L.lookComps, x, ly - 16, c.text);
        text(ctx, L.lookComps2, x, ly, c.text);
        text(ctx, L.every, x, ly + 18, c.bad);
      } else {
        const fw = Math.min(90, bx - x - 26);
        box(ctx, x, ly - 12, fw, 24, L.field, c.accent, '#fff', { r: 5, mono: true });
        arrow(ctx, x + fw + 2, ly, bx - 4, y + 4 * (rh + 4) + rh / 2, c.ok, 2);
        text(ctx, L.once, x, ly + 26, c.ok);
      }
    }

    function drawHash(ctx, x, y, w, h, c, mode) {
      const rowY = y + 4, bh = 28;
      const isStr = mode === 'str';
      const labels = isStr ? ['"Speed"', L.hashBox, 'int'] : ['SpeedId', 'int'];
      const cols = labels.length, gap = 18, bw = Math.min(110, (w - gap * (cols - 1)) / cols);
      const xs = labels.map((s, i) => x + i * (bw + gap));
      labels.forEach((s, i) => box(ctx, xs[i], rowY, bw, bh, fit(ctx, s, bw - 6, true), i === 1 && isStr ? c.warnSoft : c.bg, c.text, { mono: true, r: 6, stroke: c.border }));
      for (let i = 0; i < cols - 1; i++) arrow(ctx, xs[i] + bw + 2, rowY + bh / 2, xs[i + 1] - 2, rowY + bh / 2, c.muted, 1.5);
      // Tabla de parámetros del Animator (por hash)
      const ty = rowY + bh + 26, tw = Math.min(180, w), tx = x + w - tw, cw = tw / 3;
      const lx = xs[cols - 1] + bw / 2;
      arrow(ctx, lx, rowY + bh + 2, Math.min(lx, tx + cw / 2), ty - 2, c.muted, 1.5);
      ['Speed', 'Jump', 'Hit'].forEach((p, i) => box(ctx, tx + i * cw, ty, cw - 4, 24, p, i === 0 ? c.ok : c.bg, i === 0 ? '#fff' : c.muted, { r: 5, stroke: c.border }));
      text(ctx, L.table, tx, ty + 38, c.muted);
      // Paquete que viaja por la tubería en cada llamada
      const k = (t * (isStr ? 1.4 : 2.2)) % 1;
      const px = lerp(xs[0] + bw / 2, lx, ease(k));
      ctx.fillStyle = isStr && px > xs[1] && px < xs[1] + bw ? c.warn : c.accent;
      ctx.beginPath(); ctx.arc(px, rowY - 0 + bh + 10, 5, 0, Math.PI * 2); ctx.fill();
      const my = ty + 62;
      text(ctx, fit(ctx, isStr ? L.every : L.staticOnce, w), x, my, isStr ? c.warn : c.ok);
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = narrow(w);
      const scripts = 300 * cur.per;
      let frame = 5 + scripts + Math.random() * 0.5;
      if (cur.v === 'objs') { gcAcc += dt; if (gcAcc > 1.4) { gcAcc = 0; frame += 10; } }
      push(samples, frame);
      const fps = Math.min(60, 1000 / frame);
      let d, e, g;
      if (nar) { d = [8, 8, w - 16, 156]; e = [8, 172, w - 16, 76]; g = [8, 256, w - 16, h - 264]; }
      else { const hw = w / 2; d = [8, 8, hw - 12, h - 16]; e = [hw + 4, 8, hw - 12, 84]; g = [hw + 4, 100, hw - 12, h - 108]; }
      // Detalle de una llamada
      panel(ctx, d[0], d[1], d[2], d[3], c.soft);
      text(ctx, fit(ctx, cur.l, d[2] - 20, true), d[0] + 10, d[1] + 14, c.text, { mono: true });
      const ix = d[0] + 10, iy = d[1] + 30, iw = d[2] - 20, ih = d[3] - 40;
      if (tab === 'get' && cur.v !== 'ffo') drawComps(ctx, ix, iy, iw, ih, c, cur.v);
      else if (tab === 'hash') drawHash(ctx, ix, iy, iw, ih, c, cur.v);
      else drawScan(ctx, ix, iy, iw, ih, c, cur.v);
      // 300 enemigos: una onda indica qué Update se está ejecutando
      panel(ctx, e[0], e[1], e[2], e[3], c.soft);
      text(ctx, fit(ctx, L.enemies, e[2] - 20), e[0] + 10, e[1] + 12, c.muted);
      const cols = 30, rows = 10, cw = (e[2] - 20) / cols, chh = (e[3] - 28) / rows;
      const sweep = (t * 260) % 300;
      const hot = cur.per > 0.003 ? c.bad : cur.per > 0.001 ? c.warn : c.ok;
      for (let i = 0; i < 300; i++) {
        const back = (sweep - i + 300) % 300;
        ctx.fillStyle = back < 40 ? hot : c.border;
        ctx.globalAlpha = back < 40 ? 1 - back / 50 : 1;
        ctx.fillRect(e[0] + 10 + (i % cols) * cw, e[1] + 22 + Math.floor(i / cols) * chh, Math.max(2, cw - 2), Math.max(2, chh - 2));
      }
      ctx.globalAlpha = 1;
      frameGraph(ctx, samples, g[0], g[1], g[2], g[3], c, hot, 33, L.frame, F(16.7) + ' ms');
      const calls = /cached/.test(cur.v) ? 0 : 300 * fps;
      const src = CODE[cur.v];
      cb(src[0], src[1]);
      out('<b>' + L.scripts + ': ' + F(scripts, 1) + ' ms</b> · frame ' + F(frame, 1) + ' ms (' + Math.round(fps) + ' FPS) · ' + L.cnt[tab] + ': <b>' + B(calls) + '</b> <span class="muted small">(' + L.illus + ')</span>' +
        '<p>' + md(L.v[cur.v]) + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     2. GC Alloc: basura por frame y picos del Garbage Collector
     --------------------------------------------------------- */

  function mountGC(host, lang) {
    const L = {
      es: {
        tabs: [{ v: 'text', l: 'Texto de la UI' }, { v: 'tag', l: 'Tags' }, { v: 'phys', l: 'Physics.Overlap' }],
        onChange: 'Solo si cambia', heap: 'Heap gestionado', live: 'datos vivos', garbage: 'basura', frame: 'Tiempo de frame', gcSpike: 'GC!',
        perFrame: 'por frame', ctx: { text: '1 texto de puntuación', tag: '20 contactos por frame', phys: '10 enemigos buscan cada frame' }, collects: 'recolecciones',
        v: {
          concat: '✗ Cada frame se crea un string nuevo, aunque la puntuación no cambie. Cuando el heap se llena, el GC lo limpia de golpe: pico en el tiempo de frame.',
          tostr: '✗ `ToString()` no lo arregla: sigue creando dos strings por frame (el número y el resultado). Moverlo a `LateUpdate` tampoco.',
          change: '✓ Solo asigna cuando la puntuación cambia: casi 0 B por frame.',
          settext: '✓ `SetText("Score: {0}", score)` de TextMeshPro formatea el número en su propio buffer: 0 B.',
          collect: '✗ El heap se queda vacío, pero pagas una recolección completa en **cada** frame: el tiempo de frame sube siempre.',
          tag: '✗ Leer `.tag` copia el string desde el motor nativo: basura en cada comparación.',
          cmp: '✓ `CompareTag` compara sin crear strings (y avisa si el tag no existe).',
          overlap: '✗ `OverlapSphere` devuelve un `Collider[]` nuevo en cada llamada.',
          cast: '✗ `SphereCastAll` también crea un array nuevo (`RaycastHit[]`) en cada llamada.',
          newarr: '✗ Usas la versión NonAlloc, pero creas el buffer en cada frame: la basura sigue ahí.',
          nonalloc: '✓ El buffer se crea una vez; `OverlapSphereNonAlloc` escribe en él y devuelve cuántos hay: 0 B.'
        },
        cmt: '// scoreText es un TMP_Text'
      },
      en: {
        tabs: [{ v: 'text', l: 'UI text' }, { v: 'tag', l: 'Tags' }, { v: 'phys', l: 'Physics.Overlap' }],
        onChange: 'Only when it changes', heap: 'Managed heap', live: 'live data', garbage: 'garbage', frame: 'Frame time', gcSpike: 'GC!',
        perFrame: 'per frame', ctx: { text: '1 score label', tag: '20 contacts per frame', phys: '10 enemies search every frame' }, collects: 'collections',
        v: {
          concat: '✗ A new string is created every frame, even if the score did not change. When the heap fills up, the GC cleans it all at once: a frame-time spike.',
          tostr: '✗ `ToString()` does not fix it: it still creates two strings per frame (the number and the result). Moving it to `LateUpdate` does not help either.',
          change: '✓ It only allocates when the score changes: almost 0 B per frame.',
          settext: '✓ TextMeshPro’s `SetText("Score: {0}", score)` formats the number into its own buffer: 0 B.',
          collect: '✗ The heap stays empty, but you pay a full collection on **every** frame: frame time is always higher.',
          tag: '✗ Reading `.tag` copies the string from the native engine: garbage on every comparison.',
          cmp: '✓ `CompareTag` compares without creating strings (and warns if the tag does not exist).',
          overlap: '✗ `OverlapSphere` returns a new `Collider[]` on every call.',
          cast: '✗ `SphereCastAll` also creates a new array (`RaycastHit[]`) on every call.',
          newarr: '✗ You use the NonAlloc version, but create the buffer every frame: the garbage is still there.',
          nonalloc: '✓ The buffer is created once; `OverlapSphereNonAlloc` writes into it and returns the count: 0 B.'
        },
        cmt: '// scoreText is a TMP_Text'
      }
    }[lang];
    const F = nf(lang);
    const VARS = {
      text: [{ v: 'concat', l: '"Score: " + score', b: 68 }, { v: 'tostr', l: 'score.ToString()', b: 68 }, { v: 'change', l: L.onChange, b: 0 },
        { v: 'settext', l: 'TMP SetText', b: 0 }, { v: 'collect', l: 'GC.Collect()', b: 68 }],
      tag: [{ v: 'tag', l: 'other.tag == "Enemy"', b: 680 }, { v: 'cmp', l: 'CompareTag("Enemy")', b: 0 }],
      phys: [{ v: 'overlap', l: 'OverlapSphere', b: 720 }, { v: 'cast', l: 'SphereCastAll', b: 2900 }, { v: 'newarr', l: 'new Collider[16]', b: 1520 }, { v: 'nonalloc', l: 'NonAlloc + buffer', b: 0 }]
    };
    const U = 'void Update()\n{\n';
    const CODE = {
      concat: [U + '    scoreText.text = "Score: " + score;\n}', { 2: 'bad' }],
      tostr: [U + '    scoreText.text = "Score: " + score.ToString();\n}', { 2: 'bad' }],
      change: ['int shown = -1;\n\n' + U + '    if (score == shown) return;\n    shown = score;\n    scoreText.text = "Score: " + score;\n}', { 4: 'ok', 5: 'ok' }],
      settext: [U + '    ' + L.cmt + '\n    scoreText.SetText("Score: {0}", score);\n}', { 3: 'ok' }],
      collect: [U + '    scoreText.text = "Score: " + score;\n    System.GC.Collect();\n}', { 3: 'bad' }],
      tag: ['void OnTriggerStay(Collider other)\n{\n    if (other.tag == "Enemy")\n        TakeDamage();\n}', { 2: 'bad' }],
      cmp: ['void OnTriggerStay(Collider other)\n{\n    if (other.CompareTag("Enemy"))\n        TakeDamage();\n}', { 2: 'ok' }],
      overlap: [U + '    Collider[] hits = Physics.OverlapSphere(\n        transform.position, 5f);\n    foreach (var h in hits) Alert(h);\n}', { 2: 'bad', 3: 'bad' }],
      cast: [U + '    RaycastHit[] hits = Physics.SphereCastAll(\n        transform.position, 1f, dir, 5f);\n    foreach (var h in hits) Alert(h.collider);\n}', { 2: 'bad', 3: 'bad' }],
      newarr: [U + '    var buffer = new Collider[16];\n    int n = Physics.OverlapSphereNonAlloc(\n        transform.position, 5f, buffer);\n}', { 2: 'bad' }],
      nonalloc: ['readonly Collider[] buffer = new Collider[16];\n\n' + U + '    int n = Physics.OverlapSphereNonAlloc(\n        transform.position, 5f, buffer);\n    for (int i = 0; i < n; i++) Alert(buffer[i]);\n}', { 0: 'ok', 4: 'ok', 5: 'ok' }]
    };

    const CAP = 32768, CELLS = 96, LIVE = 18;
    let tab = 'text', cur = VARS.text[0];
    let used = 0, acc = 0, frameNo = 0, score = 0, shown = -1, flash = 0, gcs = 0;
    let parts = [];
    const samples = new Array(90).fill(6);

    const ctl = controls(host);
    seg(ctl, L.tabs, tab, (v) => { tab = v; pick(VARS[v][0].v); swapSeg(varHold, opts(), cur.v, pick); });
    const ctl2 = controls(host);
    const varHold = el('div');
    ctl2.appendChild(varHold);
    const opts = () => VARS[tab].map((o) => ({ v: o.v, l: K.esc(o.l) }));
    function pick(v) { cur = VARS[tab].find((o) => o.v === v); used = 0; gcs = 0; parts = []; }
    swapSeg(varHold, opts(), cur.v, pick);
    const stage = makeCanvas(host, (w) => (narrow(w) ? 280 : 210));
    const out = readout(host);
    const cb = codeBlock(host);

    function simFrame() {
      frameNo++;
      if (frameNo % 90 === 0) score += 10;
      let bytes = cur.b;
      if (cur.v === 'change') { bytes = score !== shown ? 68 : 0; shown = score; }
      let cost = 6 + Math.random() * 0.6;
      used += bytes;
      if (cur.v === 'collect') { used = 0; cost += 7; gcs++; }
      else if (used >= CAP) { used = 0; cost += 16; flash = 0.5; gcs++; }
      if (bytes && frameNo % 3 === 0) parts.push({ k: 0, cell: Math.min(CELLS - 1, LIVE + Math.floor((used / CAP) * (CELLS - LIVE))) });
      push(samples, cost);
    }

    const stop = loop((dt) => {
      acc += dt;
      while (acc >= 1 / 60) { acc -= 1 / 60; simFrame(); }
      flash = Math.max(0, flash - dt);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = narrow(w);
      const hp = nar ? [8, 8, w - 16, 150] : [8, 8, w * 0.56 - 12, h - 16];
      const gp = nar ? [8, 166, w - 16, h - 174] : [w * 0.56 + 4, 8, w * 0.44 - 12, h - 16];
      panel(ctx, hp[0], hp[1], hp[2], hp[3], flash > 0 ? c.badSoft : c.soft);
      text(ctx, L.heap, hp[0] + 10, hp[1] + 14, c.text);
      text(ctx, fit(ctx, L.ctx[tab], hp[2] / 2 - 10), hp[0] + hp[2] - 10, hp[1] + 14, c.muted, { align: 'right' });
      // Fuente de las asignaciones
      const sx = hp[0] + 10, sy = hp[1] + 30, sw = Math.min(110, hp[2] * 0.3), sh = 26;
      box(ctx, sx, sy, sw, sh, 'Update()', c.bg, c.text, { mono: true, r: 6, stroke: c.border });
      // Celdas del heap
      const gx = sx + sw + 16, gw = hp[0] + hp[2] - 10 - gx, cols = 16, rows = CELLS / cols;
      const cw = gw / cols, chh = Math.min(16, (hp[3] - 70) / rows);
      const filled = LIVE + Math.floor((used / CAP) * (CELLS - LIVE));
      for (let i = 0; i < CELLS; i++) {
        const cx = gx + (i % cols) * cw, cy = sy + Math.floor(i / cols) * chh;
        ctx.fillStyle = i < LIVE ? c.accent : i < filled ? c.warn : c.bg;
        ctx.fillRect(cx, cy, cw - 2, chh - 2);
      }
      parts = parts.filter((p) => {
        p.k += dt * 2.2;
        const tx = gx + (p.cell % cols) * cw + cw / 2, ty = sy + Math.floor(p.cell / cols) * chh + chh / 2;
        const px = lerp(sx + sw, tx, ease(Math.min(1, p.k))), py = lerp(sy + sh / 2, ty, ease(Math.min(1, p.k))) - Math.sin(Math.min(1, p.k) * Math.PI) * 14;
        ctx.fillStyle = c.warn; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
        return p.k < 1;
      });
      // Leyenda y "GC Alloc" como en la columna del Profiler
      const ly = sy + rows * chh + 14;
      ctx.fillStyle = c.accent; ctx.fillRect(gx, ly - 5, 10, 10); text(ctx, L.live, gx + 14, ly, c.muted);
      const gx2 = gx + 22 + ctx.measureText(L.live).width;
      ctx.fillStyle = c.warn; ctx.fillRect(gx2, ly - 5, 10, 10); text(ctx, L.garbage, gx2 + 14, ly, c.muted);
      text(ctx, 'GC Alloc', sx, sy + sh + 18, c.muted);
      const shownB = cur.v === 'change' ? 0 : cur.b;
      text(ctx, shownB ? (shownB >= 1000 ? F(shownB / 1024, 1) + ' KB' : shownB + ' B') : '0 B', sx, sy + sh + 36, shownB ? c.bad : c.ok, { mono: true });
      if (flash > 0 || cur.v === 'collect') text(ctx, L.gcSpike, sx, sy + sh + 56, c.bad);
      frameGraph(ctx, samples, gp[0], gp[1], gp[2], gp[3], c, cur.b && cur.v !== 'change' ? c.bad : c.ok, 30, L.frame, F(16.7) + ' ms');
      const src = CODE[cur.v];
      cb(src[0], src[1]);
      const perSec = (cur.v === 'change' ? 0.7 : cur.b * 60) / 1024;
      out('<b>GC Alloc: ' + (cur.v === 'change' ? '≈0 B' : cur.b + ' B') + '</b> ' + L.perFrame + ' · ' + F(perSec, 1) + ' KB/s · GC.Collect: <b>' + gcs + '</b> ' + L.collects +
        '<p>' + md(L.v[cur.v]) + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     3. CPU Profiler: ProfilerMarker, Deep Profile y perfilar en el dispositivo
     --------------------------------------------------------- */

  function mountProfiler(host, lang) {
    const L = {
      es: {
        targets: [{ v: 'editor', l: 'Editor' }, { v: 'editorAnd', l: 'Editor (plataforma Android)' }, { v: 'dev', l: 'Android: Development Build' }, { v: 'release', l: 'Android: build de release' }],
        marker: 'ProfilerMarker "GenerateLevel"', deep: 'Deep Profile', timelog: 'Debug.Log(Time.time)',
        legend: [['Scripts', 'accent'], ['GenerateLevel', 'warn'], ['Render', 'ok'], ['EditorLoop', 'muted']],
        name: 'Jerarquía (frame con pico)', calls: 'llamadas', nodata: 'Sin datos: el Profiler no puede conectarse', nodata2: 'a una build de release',
        thermal: 'térmica', frame: 'Frame',
        r: {
          editor: 'Perfilando en el Editor: incluye el coste del propio Editor (**EditorLoop**) y usa la CPU/GPU de tu PC.',
          editorAnd: 'Mismos tiempos que en el Editor: cambiar la plataforma activa **no** cambia el hardware; sigue siendo tu PC.',
          dev: '✓ Datos reales del móvil (Development Build + Autoconnect Profiler, por USB o red): sin EditorLoop, CPU más lenta y la temperatura va reduciendo el rendimiento.',
          release: '✗ Una build de release no envía datos al Profiler. Activa **Development Build** y **Autoconnect Profiler**.'
        },
        noMarker: 'Sin marcador solo ves `LevelBuilder.Update()`: no sabes cuánto de ese tiempo es la generación.',
        withMarker: '✓ Aparece la muestra **GenerateLevel** con su tiempo exacto y casi sin overhead (equivale a `Profiler.BeginSample`/`EndSample`).',
        deepOn: '⚠ Deep Profile registra **cada** llamada de C#: muchísimo detalle, pero el frame se vuelve mucho más lento y las funciones pequeñas que se llaman miles de veces parecen más caras de lo que son.',
        deepDev: ' En el dispositivo requiere activar Deep Profiling Support en la build.',
        timeLog: '✗ `Debug.Log(Time.time)` imprime {t} y {t}: `Time.time` es el instante de inicio del frame y no cambia dentro de él, así que no mide nada.'
      },
      en: {
        targets: [{ v: 'editor', l: 'Editor' }, { v: 'editorAnd', l: 'Editor (Android platform)' }, { v: 'dev', l: 'Android: Development Build' }, { v: 'release', l: 'Android: release build' }],
        marker: 'ProfilerMarker "GenerateLevel"', deep: 'Deep Profile', timelog: 'Debug.Log(Time.time)',
        legend: [['Scripts', 'accent'], ['GenerateLevel', 'warn'], ['Render', 'ok'], ['EditorLoop', 'muted']],
        name: 'Hierarchy (spike frame)', calls: 'calls', nodata: 'No data: the Profiler cannot connect', nodata2: 'to a release build',
        thermal: 'thermal', frame: 'Frame',
        r: {
          editor: 'Profiling in the Editor: it includes the Editor’s own cost (**EditorLoop**) and uses your PC’s CPU/GPU.',
          editorAnd: 'Same timings as the Editor: switching the active platform does **not** change the hardware; it is still your PC.',
          dev: '✓ Real phone data (Development Build + Autoconnect Profiler, over USB or network): no EditorLoop, a slower CPU, and heat gradually lowers performance.',
          release: '✗ A release build does not send data to the Profiler. Enable **Development Build** and **Autoconnect Profiler**.'
        },
        noMarker: 'Without a marker you only see `LevelBuilder.Update()`: you cannot tell how much of it is level generation.',
        withMarker: '✓ The **GenerateLevel** sample appears with its exact time and almost no overhead (equivalent to `Profiler.BeginSample`/`EndSample`).',
        deepOn: '⚠ Deep Profile records **every** C# call: lots of detail, but the frame becomes much slower and small functions called thousands of times look more expensive than they are.',
        deepDev: ' On a device it requires enabling Deep Profiling Support in the build.',
        timeLog: '✗ `Debug.Log(Time.time)` prints {t} and {t}: `Time.time` is the frame’s start time and does not change within it, so it measures nothing.'
      }
    }[lang];
    const F = nf(lang);
    let target = 'editor', marker = false, deep = false, timelog = false;
    let acc = 0, n = 0, t = 0, scale = 40;
    const frames = [];
    let sel = null;

    const ctl = controls(host);
    seg(ctl, L.targets, target, (v) => { target = v; frames.length = 0; t = 0; sel = null; });
    const ctl2 = controls(host);
    toggle(ctl2, L.marker, marker, (v) => { marker = v; });
    toggle(ctl2, L.deep, deep, (v) => { deep = v; });
    toggle(ctl2, L.timelog, timelog, (v) => { timelog = v; });
    const stage = makeCanvas(host, 330);
    const out = readout(host);
    const cb = codeBlock(host);

    function makeFrame() {
      n++;
      const dev = target === 'dev';
      const thermal = dev ? 1 + 0.3 * (1 - Math.exp(-t / 12)) : 1;
      const k = (dev ? 2.6 : 1) * thermal;
      const j = () => 0.85 + Math.random() * 0.3;
      const f = {
        scripts: 1.4 * k * (deep ? 2.5 : 1) * j(),
        gen: n % 36 === 0 ? 8 * k * (deep ? 3.4 : 1) * j() : 0,
        render: (dev ? 7.5 : 3) * thermal * j(),
        editor: dev ? 0 : 4.5 * (deep ? 1.6 : 1) * j(),
        other: (dev ? 1.6 : 0.8) * j()
      };
      f.total = f.scripts + f.gen + f.render + f.editor + f.other;
      f.time = t;
      return f;
    }

    function rows(f) {
      const r = [{ n: 'PlayerLoop', d: 0, ms: f.total - f.editor, c: 1 }, { n: 'Update.ScriptRunBehaviourUpdate', d: 1, ms: f.scripts + f.gen, c: 1 },
        { n: 'LevelBuilder.Update()', d: 2, ms: f.gen + 0.05, c: 1 }];
      let d = 3;
      if (marker) r.push({ n: 'GenerateLevel', d: d++, ms: f.gen, c: 1, hl: true });
      if (deep) {
        r.push({ n: 'LevelBuilder.GenerateLevel()', d: d++, ms: f.gen, c: 1, hl: !marker });
        r.push({ n: 'Noise.Perlin()', d, ms: f.gen * 0.45, c: 4000 }, { n: 'LevelBuilder.PlaceTile()', d, ms: f.gen * 0.35, c: 4000 }, { n: 'Vector3.op_Addition()', d, ms: f.gen * 0.12, c: 12000 });
      }
      r.push({ n: 'PostLateUpdate.FinishFrameRendering', d: 1, ms: f.render, c: 1 });
      if (f.editor) r.push({ n: 'EditorLoop', d: 0, ms: f.editor, c: 1 });
      return r;
    }

    const stop = loop((dt) => {
      t += dt;
      acc += dt;
      while (acc >= 1 / 24) {
        acc -= 1 / 24;
        if (target !== 'release') { const f = makeFrame(); frames.push(f); if (frames.length > 72) frames.shift(); if (f.gen) sel = f; }
      }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      // Leyenda
      let lx = 10, ly = 12;
      L.legend.forEach((it) => {
        ctx.font = K.FONT;
        const lw = ctx.measureText(it[0]).width + 26;
        if (lx + lw > w - 8) { lx = 10; ly += 18; }
        ctx.fillStyle = c[it[1]]; ctx.fillRect(lx, ly - 5, 10, 10);
        text(ctx, it[0], lx + 14, ly, c.muted);
        lx += lw;
      });
      const cy = ly + 14, ch = 104, cx = 10, cw = w - 20;
      panel(ctx, cx - 2, cy, cw + 4, ch, c.soft);
      if (target === 'release') {
        text(ctx, L.nodata, w / 2, cy + ch / 2 - 9, c.bad, { align: 'center' });
        text(ctx, L.nodata2, w / 2, cy + ch / 2 + 9, c.bad, { align: 'center' });
      } else {
        const mx = frames.reduce((m, f) => Math.max(m, f.total), 0);
        scale = lerp(scale, Math.max(40, mx * 1.1), 0.05);
        const bw = cw / 72;
        const yb = cy + ch - 4 - (16.7 / scale) * (ch - 8);
        frames.forEach((f, i) => {
          const x = cx + i * bw;
          let y = cy + ch - 4;
          [['other', c.border], ['editor', c.muted], ['render', c.ok], ['scripts', c.accent], ['gen', marker || deep ? c.warn : c.accent]].forEach((p) => {
            const hh = (f[p[0]] / scale) * (ch - 8);
            ctx.fillStyle = p[1]; ctx.fillRect(x, y - hh, Math.max(1, bw - 1), hh);
            y -= hh;
          });
          if (f === sel) { ctx.strokeStyle = c.text; ctx.lineWidth = 1.5; ctx.strokeRect(x - 1, y - 2, bw + 1, cy + ch - 2 - y); }
        });
        ctx.strokeStyle = c.text; ctx.globalAlpha = 0.5; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, yb); ctx.lineTo(cx + cw, yb); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        text(ctx, F(16.7) + ' ms', cx + cw - 4, yb - 8, c.muted, { align: 'right' });
      }
      // Jerarquía del frame seleccionado
      const hy = cy + ch + 10;
      text(ctx, L.name, 10, hy + 6, c.muted);
      text(ctx, 'ms', w - 58, hy + 6, c.muted, { align: 'right' });
      text(ctx, L.calls, w - 8, hy + 6, c.muted, { align: 'right' });
      if (sel && target !== 'release') {
        const rs = rows(sel);
        const rh = Math.min(18, (h - hy - 20) / rs.length);
        rs.forEach((r, i) => {
          const y = hy + 22 + i * rh;
          if (r.hl) { ctx.fillStyle = c.warnSoft; ctx.fillRect(6, y - rh / 2, w - 12, rh); }
          const nx = 10 + r.d * 10;
          text(ctx, fit(ctx, r.n, w - 116 - nx, true), nx, y, r.hl ? c.text : c.muted, { mono: true });
          text(ctx, F(r.ms, 2), w - 58, y, c.text, { align: 'right', mono: true });
          text(ctx, r.c > 1 ? String(r.c) : '1', w - 8, y, c.muted, { align: 'right', mono: true });
        });
      }
      // Código
      const lines = [['using Unity.Profiling;'], [''], ['static readonly ProfilerMarker s_Gen =', 'm'], ['    new ProfilerMarker("GenerateLevel");', 'm'], [''],
        ['void GenerateLevel()'], ['{']];
      if (timelog) lines.push(['    Debug.Log(Time.time);', 't']);
      lines.push(['    using (s_Gen.Auto()) // Begin/EndSample', 'm'], ['    {', 'm'], ['        PlaceTiles(4000);'], ['    }', 'm']);
      if (timelog) lines.push(['    Debug.Log(Time.time);', 't']);
      lines.push(['}']);
      const marks = {};
      lines.forEach((l, i) => { if (l[1] === 'm') marks[i] = marker ? 'ok' : 'off'; if (l[1] === 't') marks[i] = 'bad'; });
      cb(lines.map((l) => l[0]).join('\n'), marks);
      let msg = '<b>' + L.frame + ': ' + (sel && target !== 'release' ? F(frames[frames.length - 1].total, 1) + ' ms' : '—') + '</b>' +
        (target === 'dev' ? ' · ' + L.thermal + ' 🌡 +' + Math.round(30 * (1 - Math.exp(-t / 12))) + '%' : '') + '<p>' + md(L.r[target]) + '</p>';
      if (target !== 'release') {
        msg += '<p>' + md(marker ? L.withMarker : L.noMarker) + '</p>';
        if (deep) msg += '<p>' + md(L.deepOn + (target === 'dev' ? L.deepDev : '')) + '</p>';
      }
      if (timelog) msg += '<p>' + md(L.timeLog.replace(/\{t\}/g, F((sel ? sel.time : t) + 3, 3))) + '</p>';
      out(msg);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     4. Memory Profiler: comparar snapshots
     --------------------------------------------------------- */

  function mountMemory(host, lang) {
    const L = {
      es: {
        steps: ['Jugando en Level1', 'Capturando snapshot A', 'Cargando la escena Menu…', 'Capturando snapshot B', 'Comparando A ↔ B'],
        pause: 'Pausa', next: 'Siguiente paso', fix: 'Arreglo: Clear() + UnloadUnusedAssets()',
        scene: 'Escena', native: 'Memoria nativa (texturas)', managed: 'Memoria gestionada', snap: 'Snapshot', diff: 'Diferencias (siguen vivas en B)',
        refBy: '← s_Cache (static List)', fresh: 'nueva, esperada', clean: '✓ Ninguna textura de Level1 sigue en memoria', wait: 'Captura A y B para comparar…',
        r: ['Level1 ha cargado sus texturas. Algunas se guardan en una caché estática.', 'El **Memory Profiler** captura todo lo que hay en memoria: objetos nativos y gestionados, tamaños y quién los referencia.',
          'Al cambiar de escena se descargan los assets que ya nadie referencia…', 'Segunda captura, ya en el menú.'],
        leak: '✗ {n} texturas ({mb} MB) siguen vivas en B: las referencia `TextureCache.s_Cache`, una `static List<Texture2D>` que nunca se vacía.',
        ok: '✓ Tras vaciar la caché y llamar a `Resources.UnloadUnusedAssets()`, el diff solo muestra lo nuevo del menú.'
      },
      en: {
        steps: ['Playing Level1', 'Capturing snapshot A', 'Loading the Menu scene…', 'Capturing snapshot B', 'Comparing A ↔ B'],
        pause: 'Pause', next: 'Next step', fix: 'Fix: Clear() + UnloadUnusedAssets()',
        scene: 'Scene', native: 'Native memory (textures)', managed: 'Managed memory', snap: 'Snapshot', diff: 'Differences (still alive in B)',
        refBy: '← s_Cache (static List)', fresh: 'new, expected', clean: '✓ No Level1 texture is still in memory', wait: 'Capture A and B to compare…',
        r: ['Level1 has loaded its textures. Some are stored in a static cache.', 'The **Memory Profiler** captures everything in memory: native and managed objects, sizes and who references them.',
          'Changing scenes unloads the assets that nobody references any more…', 'Second capture, now in the menu.'],
        leak: '✗ {n} textures ({mb} MB) are still alive in B: they are referenced by `TextureCache.s_Cache`, a `static List<Texture2D>` that is never cleared.',
        ok: '✓ After clearing the cache and calling `Resources.UnloadUnusedAssets()`, the diff only shows the new menu assets.'
      }
    }[lang];
    const F = nf(lang);
    const TEX = [{ n: 'Rock', mb: 8, keep: true, h: 30 }, { n: 'Grass', mb: 8, h: 120 }, { n: 'Boss', mb: 16, keep: true, h: 0 }, { n: 'Sky', mb: 12, keep: true, h: 205 },
      { n: 'Water', mb: 4, h: 185 }, { n: 'Tree', mb: 4, h: 95 }];
    const MENU = { n: 'MenuUI', mb: 4, h: 270 };
    const DUR = [2, 1.3, 2.2, 1.3, 4.5];
    let step = 0, st = 0, paused = false, fix = false, flash = 0;
    let snapA = null, snapB = null;

    const ctl = controls(host);
    toggle(ctl, L.pause, false, (v) => { paused = v; });
    button(ctl, L.next, () => advance());
    toggle(ctl, L.fix, false, (v) => { fix = v; step = 0; st = 0; snapA = snapB = null; });
    const stage = makeCanvas(host, (w) => (narrow(w) ? 350 : 300));
    const out = readout(host);
    const cb = codeBlock(host);

    const total = (list) => list.reduce((s, x) => s + x.mb, 0);
    function alive() {
      if (step < 2) return TEX.map((x) => ({ t: x, a: 1 }));
      const p = step === 2 ? clamp(st / DUR[2], 0, 1) : 1;
      const list = TEX.map((x) => ({ t: x, a: x.keep && !fix ? 1 : 1 - p })).filter((x) => x.a > 0.01);
      list.push({ t: MENU, a: p });
      return list;
    }
    function advance() {
      st = 0;
      step = (step + 1) % 5;
      if (step === 0) { snapA = snapB = null; }
      if (step === 1) { snapA = total(TEX); flash = 0.4; }
      if (step === 3) { snapB = total(alive().map((x) => x.t)); flash = 0.4; }
    }

    const stop = loop((dt) => {
      if (!paused) { st += dt; if (st >= DUR[step]) advance(); }
      flash = Math.max(0, flash - dt);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = narrow(w);
      const list = alive();
      const inMenu = step >= 3 || (step === 2 && st > DUR[2] / 2);
      // Escena + snapshots
      const sw = nar ? w - 16 : w * 0.46;
      panel(ctx, 8, 8, sw, 46, c.soft);
      text(ctx, L.scene + ': ' + (inMenu ? 'Menu' : 'Level1'), 18, 22, c.text);
      text(ctx, fit(ctx, L.steps[step], sw - 20), 18, 40, step === 1 || step === 3 ? c.accent : c.muted);
      meter(ctx, 18 + sw - 80, 18, 60, 6, st / DUR[step], c.accent, c);
      const cardsX = nar ? 8 : sw + 16, cardsY = nar ? 60 : 8, cardW = nar ? (w - 24) / 2 : (w - sw - 32) / 2;
      [['A', snapA], ['B', snapB]].forEach((s, i) => {
        const x = cardsX + i * (cardW + 8);
        panel(ctx, x, cardsY, cardW, 46, s[1] !== null ? c.accentSoft : c.soft, s[1] !== null ? c.accent : c.border, s[1] === null);
        text(ctx, L.snap + ' ' + s[0], x + 10, cardsY + 15, c.text);
        text(ctx, s[1] !== null ? F(s[1], 0) + ' MB' : '—', x + 10, cardsY + 33, c.muted, { mono: true });
      });
      // Memoria nativa
      const by = nar ? 124 : 74, bx = 8, bw = w - 16, scaleMB = 60;
      text(ctx, L.native, bx, by, c.muted);
      text(ctx, F(list.reduce((s, x) => s + x.t.mb * x.a, 0), 0) + ' MB', bx + bw, by, c.text, { align: 'right', mono: true });
      ctx.fillStyle = c.soft; ctx.fillRect(bx, by + 10, bw, 26);
      let x = bx;
      const segPos = {};
      list.forEach((it) => {
        const sw2 = (it.t.mb / scaleMB) * bw * it.a;
        ctx.globalAlpha = 0.35 + 0.65 * it.a;
        ctx.fillStyle = 'hsl(' + it.t.h + ' 60% 50%)';
        ctx.fillRect(x, by + 10, Math.max(0, sw2 - 2), 26);
        ctx.globalAlpha = 1;
        if (sw2 > 34) text(ctx, fit(ctx, it.t.n, sw2 - 6), x + 4, by + 23, '#fff');
        if (step === 4 && it.t.keep && !fix) { ctx.strokeStyle = c.bad; ctx.lineWidth = 2.5; ctx.strokeRect(x, by + 10, sw2 - 2, 26); }
        segPos[it.t.n] = x + sw2 / 2;
        x += sw2;
      });
      // Memoria gestionada: la caché estática apunta a las texturas
      const my = by + 54;
      text(ctx, L.managed, bx, my, c.muted);
      text(ctx, (step >= 2 && fix ? '0,9' : '1,2').replace(',', lang === 'es' ? ',' : '.') + ' MB', bx + bw, my, c.text, { align: 'right', mono: true });
      const cacheOn = !(fix && step >= 2);
      const cw = Math.min(200, bw * 0.6);
      box(ctx, bx, my + 10, cw, 24, 'static List<Texture2D>', cacheOn ? (step === 4 ? c.bad : c.warnSoft) : c.soft, cacheOn && step === 4 ? '#fff' : (cacheOn ? c.text : c.muted), { mono: true, r: 5, stroke: c.border });
      if (cacheOn) {
        TEX.filter((t2) => t2.keep).forEach((t2) => {
          if (segPos[t2.n] === undefined) return;
          ctx.strokeStyle = step === 4 ? c.bad : c.warn; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(bx + cw / 2, my + 10); ctx.lineTo(segPos[t2.n], by + 37); ctx.stroke(); ctx.setLineDash([]);
        });
      }
      // Diff
      const dy = my + 46, dh = h - dy - 8;
      panel(ctx, 8, dy, w - 16, dh, c.soft);
      text(ctx, L.diff, 18, dy + 14, c.text);
      if (step < 4) text(ctx, L.wait, 18, dy + 38, c.muted);
      else {
        const rows = [];
        if (!fix) TEX.filter((t2) => t2.keep).forEach((t2) => rows.push([t2.n + ' · ' + t2.mb + ' MB', L.refBy, c.bad]));
        else rows.push([L.clean, '', c.ok]);
        rows.push(['+ MenuUI · 4 MB', L.fresh, c.muted]);
        const rh = Math.min(20, (dh - 30) / rows.length);
        rows.forEach((r, i) => {
          const ry = dy + 34 + i * rh;
          const right = nar ? '' : r[1];
          text(ctx, fit(ctx, 'Texture2D ' + r[0], (w - 40) * (right ? 0.5 : 1)), 18, ry, r[2], { mono: r[0] !== L.clean });
          if (right) text(ctx, right, w - 18, ry, c.muted, { align: 'right', mono: true });
        });
        if (nar && !fix) text(ctx, fit(ctx, L.refBy, w - 36, true), 18, dy + 34 + rows.length * rh, c.muted, { mono: true });
      }
      if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fillRect(0, 0, w, h); }
      cb('public static class TextureCache\n{\n    public static readonly List<Texture2D> s_Cache =\n        new List<Texture2D>();\n}\n\n// Level1 → Menu\nTextureCache.s_Cache.Clear();\nResources.UnloadUnusedAssets();',
        fix ? { 7: 'ok', 8: 'ok' } : { 2: 'bad', 7: 'off', 8: 'off' });
      const kept = TEX.filter((t2) => t2.keep);
      out('<b>' + (step + 1) + '/5 · ' + L.steps[step] + '</b><p>' +
        (step < 4 ? md(L.r[step]) : fix ? md(L.ok) : md(L.leak.replace('{n}', kept.length).replace('{mb}', total(kept)))) + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     5. Frame Debugger y Sprite Atlas
     --------------------------------------------------------- */

  const SPRITE_KINDS = [{ c: '#f5b301', s: 0, n: 'coin' }, { c: '#22b8cf', s: 1, n: 'gem' }, { c: '#e64980', s: 2, n: 'heart' },
    { c: '#7950f2', s: 3, n: 'potion' }, { c: '#40c057', s: 4, n: 'leaf' }, { c: '#fd7e14', s: 5, n: 'star' }];

  function drawShape(ctx, s, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (s === 0) ctx.arc(x, y, r, 0, Math.PI * 2);
    else if (s === 2) { roundRect(ctx, x - r, y - r, 2 * r, 2 * r, 3); }
    else {
      const n = s === 1 ? 4 : s === 3 ? 3 : s === 4 ? 6 : 10;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const rr = s === 5 && i % 2 ? r * 0.45 : r;
        if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  function mountFrameDebugger(host, lang) {
    const L = {
      es: { atlas: 'Sprite Atlas', auto: 'Reproducir', ev: 'Evento', scene: 'Escena 2D (24 sprites)', list: 'Frame Debugger', draw: 'Draw', sprites: 'sprites',
        first: 'primer draw call', tex: 'textura distinta', mat: 'material distinto', why: '¿Por qué no se agrupó con el anterior?',
        sum: 'Draw calls del frame', atlasL: 'Atlas', glow: 'material Glow' },
      en: { atlas: 'Sprite Atlas', auto: 'Play', ev: 'Event', scene: '2D scene (24 sprites)', list: 'Frame Debugger', draw: 'Draw', sprites: 'sprites',
        first: 'first draw call', tex: 'different texture', mat: 'different material', why: 'Why was it not batched with the previous one?',
        sum: 'Draw calls in the frame', atlasL: 'Atlas', glow: 'Glow material' }
    }[lang];
    const ORDER = [0, 1, 1, 2, 0, 3, 4, 4, 5, 2, 0, 1, 3, 3, 5, 4, 2, 0, 1, 5, 5, 3, 4, 2];
    const GLOW = { 7: true, 16: true };
    let atlas = false, auto = true, cur = 0, acc = 0, t = 0;
    let evs = events();
    function events() {
      const ev = [];
      ORDER.forEach((k, i) => {
        const tex = atlas ? 'atlas' : k, mat = GLOW[i] ? 'glow' : 'sprite';
        const last = ev[ev.length - 1];
        if (last && last.tex === tex && last.mat === mat) last.end = i;
        else ev.push({ start: i, end: i, tex, mat, reason: !last ? 'first' : last.mat !== mat ? 'mat' : 'tex' });
      });
      return ev;
    }
    const ctl = controls(host);
    toggle(ctl, L.atlas, false, (v) => { atlas = v; evs = events(); cur = 0; acc = 0; input.max = evs.length; setSlider(); });
    const autoT = toggle(ctl, L.auto, true, (v) => { auto = v; });
    const input = slider(ctl, L.ev, 1, evs.length, 1, 1, (v) => { cur = v - 1; auto = false; autoT.checked = false; });
    const valEl = input.parentNode.querySelector('b');
    function setSlider() { input.value = cur + 1; valEl.textContent = (cur + 1) + '/' + evs.length; }
    setSlider();
    const stage = makeCanvas(host, (w) => (narrow(w) ? 360 : 250));
    const out = readout(host);

    const stop = loop((dt) => {
      t += dt;
      if (auto) {
        acc += dt;
        const hold = cur === evs.length - 1 ? 1.8 : 0.55;
        if (acc > hold) { acc = 0; cur = (cur + 1) % evs.length; setSlider(); }
      }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = narrow(w);
      const sp = nar ? [8, 8, w - 16, 170] : [8, 8, w * 0.55 - 12, h - 16];
      const lp = nar ? [8, 186, w - 16, h - 194] : [w * 0.55 + 4, 8, w * 0.45 - 12, h - 16];
      const e = evs[cur];
      // Escena
      panel(ctx, sp[0], sp[1], sp[2], sp[3], c.soft);
      text(ctx, L.scene, sp[0] + 10, sp[1] + 14, c.muted);
      const cols = 8, rows = 3, gx = sp[0] + 14, gy = sp[1] + 34, cw = (sp[2] - 28) / cols, ch = (sp[3] - 46) / rows;
      const r = Math.min(cw, ch) * 0.3;
      ORDER.forEach((k, i) => {
        const x = gx + (i % cols) * cw + cw / 2 + ((i * 7) % 5 - 2) * 2, y = gy + Math.floor(i / cols) * ch + ch / 2 + ((i * 3) % 5 - 2) * 2;
        if (i > e.end) {
          ctx.strokeStyle = c.border; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          return;
        }
        if (GLOW[i]) { ctx.shadowColor = SPRITE_KINDS[k].c; ctx.shadowBlur = 12; }
        drawShape(ctx, SPRITE_KINDS[k].s, x, y, r, SPRITE_KINDS[k].c);
        ctx.shadowBlur = 0;
        if (i >= e.start) {
          ctx.strokeStyle = c.text; ctx.lineWidth = 2;
          ctx.strokeRect(x - r - 4, y - r - 4, 2 * r + 8, 2 * r + 8);
        }
      });
      if (atlas) {
        const aw = 54, ax = sp[0] + sp[2] - aw - 8, ay = sp[1] + 6;
        ctx.fillStyle = c.bg; ctx.fillRect(ax, ay, aw, 22);
        SPRITE_KINDS.forEach((k, i) => drawShape(ctx, k.s, ax + 5 + i * 8.7, ay + 11, 3.5, k.c));
        text(ctx, L.atlasL, ax - 4, ay + 11, c.accent, { align: 'right' });
      }
      // Lista de eventos del Frame Debugger
      panel(ctx, lp[0], lp[1], lp[2], lp[3], c.soft);
      text(ctx, L.list, lp[0] + 10, lp[1] + 14, c.text);
      text(ctx, L.sum + ': ' + evs.length, lp[0] + lp[2] - 10, lp[1] + 14, atlas ? c.ok : c.bad, { align: 'right' });
      const rh = 34, maxRows = Math.max(1, Math.floor((lp[3] - 30) / rh));
      const first = clamp(cur - Math.floor(maxRows / 2), 0, Math.max(0, evs.length - maxRows));
      for (let i = first; i < Math.min(evs.length, first + maxRows); i++) {
        const ev = evs[i], y = lp[1] + 28 + (i - first) * rh;
        if (i === cur) { ctx.fillStyle = c.accentSoft; roundRect(ctx, lp[0] + 6, y, lp[2] - 12, rh - 4, 6); ctx.fill(); }
        const n = ev.end - ev.start + 1;
        const texName = ev.tex === 'atlas' ? 'atlas' : SPRITE_KINDS[ev.tex].n;
        text(ctx, fit(ctx, '#' + (i + 1) + ' ' + L.draw + ' (' + n + ') · ' + texName + (ev.mat === 'glow' ? ' · Glow' : ''), lp[2] - 24, true), lp[0] + 12, y + 9, i <= cur ? c.text : c.muted, { mono: true });
        text(ctx, fit(ctx, '↳ ' + L[ev.reason], lp[2] - 24), lp[0] + 12, y + 23, ev.reason === 'first' ? c.muted : ev.reason === 'mat' ? c.warn : c.bad);
      }
      const n = e.end - e.start + 1;
      out('<b>' + L.ev + ' ' + (cur + 1) + '/' + evs.length + '</b>: ' + n + ' ' + L.sprites + ' · ' + (e.tex === 'atlas' ? 'atlas' : SPRITE_KINDS[e.tex].n) + (e.mat === 'glow' ? ' · ' + L.glow : '') +
        '<p>' + L.why + ' <b>' + L[e.reason] + '</b></p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     6. GPU Instancing, SRP Batcher y GPU Resident Drawer
     --------------------------------------------------------- */

  function mountInstancing(host, lang) {
    const L = {
      es: {
        modes: [{ v: 'none', l: 'Built-in' }, { v: 'inst', l: 'Built-in + GPU Instancing' }, { v: 'static', l: 'Static batching' }, { v: 'srp', l: 'URP: SRP Batcher' }, { v: 'grd', l: 'URP: GPU Resident Drawer' }],
        unique: 'Un material distinto por roca', fwd: 'Forward+ (URP)', rocks: '3000 rocas creadas en runtime (cada punto ≈ 12)',
        dc: 'Draw calls', cpu: 'CPU de render', batches: 'lotes', staticNo: 'No aplica: las rocas se crean en runtime', staticNo2: 'y el static batching se prepara en la build',
        v: {
          none: '✗ Un draw call por roca: la CPU pasa el frame preparando 3000 llamadas.',
          inst: '✓ Misma malla + mismo material con **Enable GPU Instancing**: miles de rocas en unos pocos draw calls, cada una con su transformación.',
          instU: '✗ Con un material por roca el instancing ya no puede agrupar nada: vuelves a 3000 draw calls.',
          static: '✗ El static batching es para objetos marcados **Static** en el Editor, que no se mueven, y se combina al hacer la build. Marcarlos después de generarlos no sirve.',
          srp: '≈ El SRP Batcher no reduce el número de draw calls, pero abarata cada uno: los datos de los materiales ya están en la GPU y apenas cambia el estado entre llamadas.',
          srpU: '≈ El SRP Batcher agrupa por shader, así que los materiales distintos siguen siendo compatibles, pero cada uno ocupa memoria y hay que subirlo a la GPU.',
          grd: '✓ El **GPU Resident Drawer** (Unity 6) dibuja con `BatchRendererGroup` e instancing automáticamente, sin tocar los GameObjects.',
          grdU: '≈ Sin un material compartido no puede instanciar: queda en el coste del SRP Batcher.',
          grdOff: '✗ El GPU Resident Drawer requiere el rendering path **Forward+**: con Forward no se activa.'
        }
      },
      en: {
        modes: [{ v: 'none', l: 'Built-in' }, { v: 'inst', l: 'Built-in + GPU Instancing' }, { v: 'static', l: 'Static batching' }, { v: 'srp', l: 'URP: SRP Batcher' }, { v: 'grd', l: 'URP: GPU Resident Drawer' }],
        unique: 'A different material per rock', fwd: 'Forward+ (URP)', rocks: '3000 rocks spawned at runtime (each dot ≈ 12)',
        dc: 'Draw calls', cpu: 'Render CPU', batches: 'batches', staticNo: 'Not applicable: the rocks are spawned at runtime', staticNo2: 'and static batching is prepared at build time',
        v: {
          none: '✗ One draw call per rock: the CPU spends the frame preparing 3000 calls.',
          inst: '✓ Same mesh + same material with **Enable GPU Instancing**: thousands of rocks in a few draw calls, each with its own transform.',
          instU: '✗ With one material per rock, instancing cannot group anything: you are back to 3000 draw calls.',
          static: '✗ Static batching is for objects marked **Static** in the Editor that never move, combined at build time. Marking them after spawning does not work.',
          srp: '≈ The SRP Batcher does not reduce the number of draw calls, but makes each one cheaper: material data already lives on the GPU and state barely changes between calls.',
          srpU: '≈ The SRP Batcher groups by shader, so different materials stay compatible, but each one uses memory and must be uploaded to the GPU.',
          grd: '✓ The **GPU Resident Drawer** (Unity 6) draws with `BatchRendererGroup` and instancing automatically, without changing the GameObjects.',
          grdU: '≈ Without a shared material it cannot instance: it falls back to the SRP Batcher cost.',
          grdOff: '✗ The GPU Resident Drawer requires the **Forward+** rendering path: with Forward it does not kick in.'
        }
      }
    }[lang];
    const F = nf(lang), B = big(lang);
    let mode = 'none', unique = false, fwd = true, t = 0;
    const ctl = controls(host);
    seg(ctl, L.modes, mode, (v) => { mode = v; t = 0; });
    const ctl2 = controls(host);
    toggle(ctl2, L.unique, false, (v) => { unique = v; t = 0; });
    toggle(ctl2, L.fwd, true, (v) => { fwd = v; t = 0; });
    const stage = makeCanvas(host, (w) => (narrow(w) ? 330 : 230));
    const out = readout(host);
    const cb = codeBlock(host);

    function stats() {
      if (mode === 'inst' && !unique) return { dc: 6, cpu: 0.5, key: 'inst', srp: false };
      if (mode === 'inst') return { dc: 3000, cpu: 18, key: 'instU', srp: false };
      if (mode === 'srp' || (mode === 'grd' && (unique || !fwd))) {
        const key = mode === 'grd' ? (!fwd ? 'grdOff' : 'grdU') : unique ? 'srpU' : 'srp';
        return { dc: 3000, cpu: unique ? 5.5 : 4.5, key, srp: true };
      }
      if (mode === 'grd') return { dc: 2, cpu: 0.4, key: 'grd', srp: false };
      return { dc: 3000, cpu: 18, key: mode === 'static' ? 'static' : 'none', srp: false };
    }

    const stop = loop((dt) => {
      t += dt;
      const s = stats();
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = narrow(w);
      const fp = nar ? [8, 8, w - 16, 190] : [8, 8, w * 0.6 - 12, h - 16];
      const sp = nar ? [8, 206, w - 16, h - 214] : [w * 0.6 + 4, 8, w * 0.4 - 12, h - 16];
      panel(ctx, fp[0], fp[1], fp[2], fp[3], c.soft);
      text(ctx, fit(ctx, L.rocks, fp[2] - 20), fp[0] + 10, fp[1] + 14, c.muted);
      const cell = 13, cols = Math.floor((fp[2] - 20) / cell), rows = Math.floor((fp[3] - 34) / cell), M = cols * rows;
      const dur = clamp(0.3 + s.cpu * 0.14, 0.4, 2.8), cycle = dur + 0.9;
      const drawn = Math.floor(M * clamp((t % cycle) / dur, 0, 1));
      for (let i = 0; i < M; i++) {
        const x = fp[0] + 10 + (i % cols) * cell + cell / 2, y = fp[1] + 28 + Math.floor(i / cols) * cell + cell / 2;
        const g = s.dc >= M ? i : Math.floor((i * s.dc) / M);
        ctx.fillStyle = i < drawn ? (s.srp && !unique ? c.accent : hue(g + (unique ? i : 0))) : c.border;
        ctx.globalAlpha = mode === 'static' ? 0.35 : 1;
        ctx.beginPath(); ctx.ellipse(x, y, cell * 0.38, cell * 0.3, (i % 5) * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (s.srp) { ctx.strokeStyle = c.accent; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeRect(fp[0] + 6, fp[1] + 24, cols * cell + 8, rows * cell + 8); ctx.setLineDash([]); }
      if (mode === 'static') {
        const bw = Math.min(fp[2] - 20, 320);
        box(ctx, fp[0] + (fp[2] - bw) / 2, fp[1] + fp[3] / 2 - 22, bw, 44, '', c.bg, c.text, { stroke: c.bad });
        text(ctx, fit(ctx, L.staticNo, bw - 16), fp[0] + fp[2] / 2, fp[1] + fp[3] / 2 - 9, c.bad, { align: 'center' });
        text(ctx, fit(ctx, L.staticNo2, bw - 16), fp[0] + fp[2] / 2, fp[1] + fp[3] / 2 + 9, c.muted, { align: 'center' });
      }
      // Estadísticas
      panel(ctx, sp[0], sp[1], sp[2], sp[3], c.soft);
      const done = Math.min(s.dc, Math.ceil((drawn / M) * s.dc));
      const rowsS = [[L.dc, B(done) + ' / ' + B(s.dc), Math.log10(s.dc + 1) / Math.log10(3001), s.dc > 100 ? c.bad : c.ok],
        [L.cpu, F(s.cpu, 1) + ' ms', s.cpu / 18, s.cpu > 8 ? c.bad : s.cpu > 2 ? c.warn : c.ok]];
      const gap = nar ? 42 : 52;
      rowsS.forEach((r, i) => {
        const y = sp[1] + 18 + i * gap;
        text(ctx, r[0], sp[0] + 10, y, c.muted);
        text(ctx, r[1], sp[0] + sp[2] - 10, y, c.text, { align: 'right', mono: true });
        meter(ctx, sp[0] + 10, y + 12, sp[2] - 20, 10, r[2], r[3], c);
      });
      const tag = s.srp ? 'SRP Batch ×1' : s.dc <= 6 ? (mode === 'grd' ? 'BatchRendererGroup' : 'Instanced') : '';
      if (tag) text(ctx, tag, sp[0] + 10, sp[1] + 18 + 2 * gap, s.srp ? c.accent : c.ok, { mono: true });
      // Código relevante
      const lines = ['var rock = Instantiate(rockPrefab, pos, rot);'];
      const marks = {};
      if (unique) { lines.push('rock.GetComponent<Renderer>().material.color ='); lines.push('    Random.ColorHSV(); // material nuevo'.replace('material nuevo', lang === 'es' ? 'material nuevo' : 'new material')); marks[1] = 'bad'; marks[2] = 'bad'; }
      if (mode === 'inst') { lines.push('// en el material:'.replace('en el material', lang === 'es' ? 'en el material' : 'on the material')); lines.push('rockMaterial.enableInstancing = true;'); marks[lines.length - 1] = unique ? 'off' : 'ok'; }
      if (mode === 'static') { lines.push('// Static ✗ (Batching Static: solo en el Editor)'.replace('solo en el Editor', lang === 'es' ? 'solo en el Editor' : 'Editor only')); marks[lines.length - 1] = 'bad'; }
      if (mode === 'srp' || mode === 'grd') { lines.push('// URP Asset > SRP Batcher: ✓'); marks[lines.length - 1] = 'ok'; }
      if (mode === 'grd') {
        lines.push('// URP Asset > GPU Resident Drawer: Instanced Drawing');
        lines.push('// Renderer > Rendering Path: ' + (fwd ? 'Forward+' : 'Forward'));
        marks[lines.length - 2] = 'ok'; marks[lines.length - 1] = fwd ? 'ok' : 'bad';
      }
      cb(lines.join('\n'), marks);
      out('<b>' + L.dc + ': ' + B(s.dc) + '</b> · ' + L.cpu + ': <b>' + F(s.cpu, 1) + ' ms</b><p>' + md(L.v[s.key]) + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     7. Frustum culling, Occlusion Culling y LODGroup
     --------------------------------------------------------- */

  function segHitsRect(x1, y1, x2, y2, r) {
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy], q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; }
      else {
        const tt = q[i] / p[i];
        if (p[i] < 0) { if (tt > t1) return false; if (tt > t0) t0 = tt; }
        else { if (tt < t0) return false; if (tt < t1) t1 = tt; }
      }
    }
    return t0 < t1 && t0 < 0.999;
  }

  function mountCulling(host, lang) {
    const L = {
      es: {
        tabs: [{ v: 'cull', l: 'Culling (ciudad)' }, { v: 'lod', l: 'LODGroup (árboles)' }],
        angle: 'Dirección de la cámara', far: 'Far clip', occ: 'Occlusion Culling (bake)', rot: 'Girar sola', dist: 'Distancia de la cámara', auto: 'Alejarse sola', lod: 'LODGroup',
        rendered: 'dibujado', culled: 'fuera del frustum', occl: 'oculto (no se dibuja)', wasted: 'dibujado sin verse', occluder: 'occluder',
        drag: 'Arrastra para mover la cámara', tris: 'Triángulos', culledL: 'Culled',
        cullMsg: 'Dibujados: <b>{r}</b> de {n} · fuera del frustum: {f} · tapados: {o}',
        occOn: '✓ Con **Occlusion Culling** (datos precalculados) los edificios tapados por los grandes (occluders) dejan de dibujarse.',
        occOff: '✗ Solo hay frustum culling: descarta lo que queda fuera del campo de visión, pero los {o} edificios tapados se dibujan igualmente (en naranja).',
        farMsg: ' Bajar el **Far Clip** no es la solución: corta también edificios visibles a lo lejos.',
        lodOn: '✓ El `LODGroup` elige la malla según el **tamaño en pantalla**: cerca LOD0, lejos LOD1/LOD2 y, muy pequeño, Culled.',
        lodOff: '✗ Sin LODGroup cada árbol se dibuja con todos sus triángulos aunque ocupe unos pocos píxeles.'
      },
      en: {
        tabs: [{ v: 'cull', l: 'Culling (city)' }, { v: 'lod', l: 'LODGroup (trees)' }],
        angle: 'Camera direction', far: 'Far clip', occ: 'Occlusion Culling (baked)', rot: 'Auto-rotate', dist: 'Camera distance', auto: 'Move away', lod: 'LODGroup',
        rendered: 'rendered', culled: 'outside the frustum', occl: 'occluded (not drawn)', wasted: 'drawn but unseen', occluder: 'occluder',
        drag: 'Drag to move the camera', tris: 'Triangles', culledL: 'Culled',
        cullMsg: 'Rendered: <b>{r}</b> of {n} · outside the frustum: {f} · hidden: {o}',
        occOn: '✓ With **Occlusion Culling** (baked data), buildings hidden behind the big ones (occluders) stop being drawn.',
        occOff: '✗ Only frustum culling: it discards what is outside the field of view, but the {o} hidden buildings are drawn anyway (in orange).',
        farMsg: ' Lowering the **Far Clip** is not the fix: it also cuts visible buildings in the distance.',
        lodOn: '✓ The `LODGroup` picks the mesh by **screen size**: close LOD0, farther LOD1/LOD2 and, when tiny, Culled.',
        lodOff: '✗ Without a LODGroup every tree is drawn with all its triangles even if it covers a few pixels.'
      }
    }[lang];
    const B = big(lang);
    // Ciudad determinista
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const BIG = { '2,1': 1, '1,2': 1, '4,2': 1, '3,3': 1 };
    const city = [];
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 6; gx++) {
      const isBig = !!BIG[gx + ',' + gy];
      const s = isBig ? 0.86 : 0.4 + rnd() * 0.3;
      city.push({ x: (gx + (1 - s) / 2) / 6, y: (gy + (1 - s) / 2) / 6.2, w: s / 6, h: s / 6.2, big: isBig });
    }
    let tab = 'cull', angle = -90, far = 100, occ = false, rot = true, dist = 30, autoD = true, lodOn = true, t = 0;
    const cam = { x: 0.5, y: 0.93 };
    let shownD = dist;

    const ctl = controls(host);
    seg(ctl, L.tabs, tab, (v) => { tab = v; c1.style.display = v === 'cull' ? '' : 'none'; c2.style.display = v === 'lod' ? '' : 'none'; });
    const c1 = controls(host), c2 = controls(host);
    const angIn = slider(c1, L.angle, -180, 0, 1, angle, (v) => { angle = v; rot = false; rotT.checked = false; }, (v) => v + '°');
    slider(c1, L.far, 30, 100, 1, far, (v) => { far = v; }, (v) => v + '%');
    toggle(c1, L.occ, false, (v) => { occ = v; });
    const rotT = toggle(c1, L.rot, true, (v) => { rot = v; });
    slider(c2, L.dist, 8, 300, 1, dist, (v) => { dist = v; autoD = false; autoT.checked = false; }, (v) => v + ' m');
    const autoT = toggle(c2, L.auto, true, (v) => { autoD = v; });
    toggle(c2, L.lod, true, (v) => { lodOn = v; });
    c2.style.display = 'none';
    const stage = makeCanvas(host, (w) => (narrow(w) ? 320 : 300));
    const out = readout(host);
    void angIn;
    drag(stage, {
      down: (x, y) => move(x, y), move: (x, y) => move(x, y)
    });
    function move(x, y) {
      if (tab !== 'cull') return;
      cam.x = clamp((x - 8) / (stage.w - 16), 0.02, 0.98);
      cam.y = clamp((y - 8) / (stage.h - 40), 0.02, 0.98);
    }

    function drawCull(ctx, w, h, c) {
      const mx = 8, my = 8, mw = w - 16, mh = h - 40;
      ctx.fillStyle = c.soft; ctx.fillRect(mx, my, mw, mh);
      if (rot) angle = Math.round(-90 + Math.sin(t * 0.35) * 70);
      const a = (angle * Math.PI) / 180, fov = Math.PI / 3;
      const cx = mx + cam.x * mw, cy = my + cam.y * mh;
      const farPx = (far / 100) * Math.hypot(mw, mh) * 0.8;
      // Frustum
      ctx.fillStyle = c.accentSoft; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, farPx, a - fov / 2, a + fov / 2); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
      const R = city.map((b) => ({ x: mx + b.x * mw, y: my + b.y * mh, w: b.w * mw, h: b.h * mh, big: b.big }));
      let nr = 0, nf2 = 0, no = 0;
      R.forEach((r) => {
        const pts = [[r.x + r.w / 2, r.y + r.h / 2], [r.x + r.w * 0.1, r.y + r.h * 0.1], [r.x + r.w * 0.9, r.y + r.h * 0.1], [r.x + r.w * 0.1, r.y + r.h * 0.9], [r.x + r.w * 0.9, r.y + r.h * 0.9]];
        let inF = false, vis = false;
        pts.forEach((p) => {
          const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy);
          let da = Math.atan2(dy, dx) - a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          if (Math.abs(da) > fov / 2 || d > farPx) return;
          inF = true;
          if (!R.some((o) => o !== r && o.big && segHitsRect(cx, cy, p[0], p[1], o))) vis = true;
        });
        const status = !inF ? 'f' : vis ? 'v' : 'o';
        if (status === 'f') nf2++; else if (status === 'o') no++;
        if (status === 'v' || (status === 'o' && !occ)) nr++;
        let fill = c.bg, stroke = c.border, dash = false;
        if (status === 'v') fill = c.ok;
        else if (status === 'o') { if (occ) { fill = c.badSoft; stroke = c.bad; dash = true; } else fill = c.warn; }
        ctx.fillStyle = fill; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = r.big ? c.text : stroke; ctx.lineWidth = r.big ? 2.5 : 1; if (dash) ctx.setLineDash([3, 3]);
        ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([]);
      });
      ctx.restore();
      // Cámara
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
      arrow(ctx, cx, cy, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, c.accent, 2);
      // Leyenda
      const items = [[c.ok, L.rendered], [occ ? c.badSoft : c.warn, occ ? L.occl : L.wasted], [c.bg, L.culled]];
      let lx = 10, ly = h - 22;
      if (narrow(w)) items.length = 2;
      items.forEach((it) => {
        ctx.font = K.FONT;
        const lw = ctx.measureText(it[1]).width + 30;
        ctx.fillStyle = it[0]; ctx.fillRect(lx, ly - 6, 12, 12); ctx.strokeStyle = c.border; ctx.strokeRect(lx, ly - 6, 12, 12);
        text(ctx, it[1], lx + 16, ly, c.muted);
        lx += lw;
      });
      return { nr, nf: nf2, no };
    }

    const TRIS = [12000, 3000, 300, 0];
    function drawLod(ctx, w, h, c) {
      if (autoD) dist = 8 + (Math.sin(t * 0.3 - Math.PI / 2) + 1) / 2 * 150;
      shownD = lerp(shownD, dist, 0.15);
      const hor = 54, base = h - 70;
      ctx.fillStyle = c.soft; ctx.fillRect(8, hor, w - 16, base - hor + 6);
      ctx.strokeStyle = c.border; ctx.beginPath(); ctx.moveTo(8, hor); ctx.lineTo(w - 8, hor); ctx.stroke();
      const mult = [1, 1.6, 2.5, 4, 6.5];
      let tris = 0;
      const pcts = [];
      mult.forEach((m, i) => {
        const d = shownD * m;
        const pct = Math.min(100, 1000 / d);
        pcts.push(pct);
        const lod = !lodOn ? 0 : pct >= 50 ? 0 : pct >= 20 ? 1 : pct >= 4 ? 2 : 3;
        tris += TRIS[lod];
        const x = 8 + (w - 16) * (0.1 + i * 0.2);
        const by = hor + (base - hor) * Math.min(1, 14 / d) + 4;
        const H = Math.max(2, (base - hor + 30) * pct / 100 * 0.95);
        const sway = Math.sin(t * 1.5 + i) * H * 0.03;
        const col = ['#2f9e44', '#37b24d', '#69db7c'][Math.min(lod, 2)];
        if (lod < 3) {
          ctx.fillStyle = '#8d5a2b'; ctx.fillRect(x - H * 0.05, by - H * 0.25, H * 0.1, H * 0.25);
          const layers = lod === 0 ? 3 : lod === 1 ? 2 : 1;
          for (let k = 0; k < layers; k++) {
            const ty = by - H * 0.2 - k * H * 0.25, tw = H * (0.4 - k * 0.08);
            ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - tw + sway * k, ty); ctx.lineTo(x + tw + sway * k, ty);
            ctx.lineTo(x + sway * (k + 1), ty - (layers === 1 ? H * 0.78 : H * 0.42)); ctx.closePath(); ctx.fill();
            if (lod === 0 && H > 30) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke(); }
          }
          if (lod === 2) { ctx.strokeStyle = c.muted; ctx.setLineDash([2, 2]); ctx.strokeRect(x - H * 0.42, by - H, H * 0.84, H); ctx.setLineDash([]); }
        } else { ctx.strokeStyle = c.muted; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(x, by - 4, 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        text(ctx, lod === 3 ? '✕' : 'LOD' + lod, x, 16, lod === 0 ? c.text : lod === 3 ? c.muted : c.accent, { align: 'center', mono: true });
        text(ctx, Math.round(pct) + '%', x, 34, c.muted, { align: 'center' });
      });
      // Barra del LODGroup (como en el Inspector)
      const bx = 8, bw = w - 16, by2 = h - 50;
      const segs = [[100, 50, 'LOD0', '#2f9e44'], [50, 20, 'LOD1', '#37b24d'], [20, 4, 'LOD2', '#69db7c'], [4, 0, L.culledL, c.border]];
      segs.forEach((s) => {
        const x1 = bx + bw * (1 - s[0] / 100), x2 = bx + bw * (1 - s[1] / 100);
        ctx.fillStyle = s[3]; ctx.globalAlpha = lodOn ? 1 : 0.3; ctx.fillRect(x1, by2, x2 - x1 - 1, 20); ctx.globalAlpha = 1;
        if (x2 - x1 > 34) text(ctx, s[2], x1 + 4, by2 + 10, s[3] === c.border ? c.muted : '#fff');
      });
      pcts.forEach((p, i) => {
        const x = bx + bw * (1 - p / 100);
        ctx.fillStyle = i === 0 ? c.text : c.muted;
        ctx.beginPath(); ctx.moveTo(x, by2 - 1); ctx.lineTo(x - 5, by2 - 9); ctx.lineTo(x + 5, by2 - 9); ctx.closePath(); ctx.fill();
      });
      text(ctx, L.tris + ': ' + B(tris) + (lodOn ? '' : ' (LOD0 ×5)'), bx, h - 14, lodOn ? c.ok : c.bad);
      text(ctx, Math.round(shownD) + ' m', bx + bw, h - 14, c.muted, { align: 'right' });
      return tris;
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'cull') {
        const r = drawCull(ctx, w, h, c);
        if (rot) { angIn.value = angle; angIn.parentNode.querySelector('b').textContent = angle + '°'; }
        out(L.cullMsg.replace('{r}', r.nr).replace('{n}', city.length).replace('{f}', r.nf).replace('{o}', r.no) +
          '<p>' + md(occ ? L.occOn : L.occOff.replace('{o}', r.no)) + (far < 100 ? md(L.farMsg) : '') + '</p><p class="muted small">' + L.drag + '</p>');
      } else {
        const tr = drawLod(ctx, w, h, c);
        out(L.tris + ': <b>' + B(tr) + '</b><p>' + md(lodOn ? L.lodOn : L.lodOff) + '</p>');
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     Registro
     --------------------------------------------------------- */

  UCP.concepts.push(
    {
      id: 'cache-referencias', questions: ['prf-01', 'scn-20', 'art-04'], domain: 'perf', icon: '📌', mount: mountCache,
      text: {
        es: {
          title: 'Cachear referencias: GetComponent, Find y StringToHash',
          summary: 'Buscar algo (un componente, un objeto de la escena o el hash de un string) tiene un coste, y en `Update` lo pagas cada frame por cada objeto. Lo eficiente es buscarlo **una vez** y guardarlo. Elige una pestaña, prueba cada variante con 300 enemigos y mira el tiempo de scripts y el contador de búsquedas por segundo.',
          points: [
            'Guarda `GetComponent<Animator>()` en un campo en `Awake` (o con `[SerializeField]`); no lo llames en `Update`.',
            '`FindObjectOfType` está obsoleto en Unity 6: `FindAnyObjectByType` (cualquier instancia, la más rápida) o `FindFirstObjectByType` (orden garantizado, más lenta).',
            '`FindObjectsByType(...)[0]` y `GameObject.Find("nombre")` son todavía peores; lo ideal es no buscar cada frame.',
            '`static readonly int SpeedId = Animator.StringToHash("Speed")` evita calcular el hash en cada `SetFloat` (igual que `Shader.PropertyToID`).'
          ]
        },
        en: {
          title: 'Caching references: GetComponent, Find and StringToHash',
          summary: 'Looking something up (a component, a scene object or a string hash) has a cost, and in `Update` you pay it every frame for every object. The efficient approach is to look it up **once** and keep it. Pick a tab, try each variant with 300 enemies and watch the script time and the searches-per-second counter.',
          points: [
            'Store `GetComponent<Animator>()` in a field in `Awake` (or via `[SerializeField]`); do not call it in `Update`.',
            '`FindObjectOfType` is obsolete in Unity 6: `FindAnyObjectByType` (any instance, fastest) or `FindFirstObjectByType` (guaranteed order, slower).',
            '`FindObjectsByType(...)[0]` and `GameObject.Find("name")` are even worse; ideally, do not search every frame.',
            '`static readonly int SpeedId = Animator.StringToHash("Speed")` avoids hashing on every `SetFloat` call (same as `Shader.PropertyToID`).'
          ]
        }
      }
    }
,
    {
      id: 'gc-alloc', questions: ['prf-02', 'prf-12', 'prf-13'], domain: 'perf', icon: '🗑️', mount: mountGC,
      text: {
        es: {
          title: 'GC Alloc: basura en cada frame',
          summary: 'Cada `new`, cada string concatenado y cada array que devuelve una API es memoria del **heap gestionado**. Cuando se llena, el Garbage Collector la limpia y aparece un pico en el tiempo de frame. Elige una pestaña, compara las variantes y mira la columna **GC Alloc** (como en el Profiler) y la gráfica.',
          points: [
            'Texto de UI: actualízalo **solo cuando cambie** el valor (o usa `SetText("Score: {0}", score)` de TextMeshPro).',
            '`other.CompareTag("Enemy")` en lugar de `other.tag == "Enemy"`: leer `.tag` crea un string nuevo.',
            '`Physics.OverlapSphereNonAlloc(pos, r, buffer)` con un `Collider[]` creado **una vez**; `OverlapSphere` y `SphereCastAll` crean arrays nuevos.',
            'Forzar `System.GC.Collect()` a menudo es mucho peor: pagas la recolección una y otra vez.'
          ]
        },
        en: {
          title: 'GC Alloc: garbage every frame',
          summary: 'Every `new`, every concatenated string and every array an API returns is **managed heap** memory. When it fills up, the Garbage Collector cleans it and a frame-time spike appears. Pick a tab, compare the variants and watch the **GC Alloc** column (as in the Profiler) and the graph.',
          points: [
            'UI text: update it **only when the value changes** (or use TextMeshPro’s `SetText("Score: {0}", score)`).',
            '`other.CompareTag("Enemy")` instead of `other.tag == "Enemy"`: reading `.tag` creates a new string.',
            '`Physics.OverlapSphereNonAlloc(pos, r, buffer)` with a `Collider[]` created **once**; `OverlapSphere` and `SphereCastAll` create new arrays.',
            'Forcing `System.GC.Collect()` often is much worse: you pay for the collection again and again.'
          ]
        }
      }
    },
    {
      id: 'profiler', questions: ['prf-03', 'prf-04', 'prf-05'], domain: 'perf', icon: '📊', mount: mountProfiler,
      text: {
        es: {
          title: 'CPU Profiler: marcadores, Deep Profile y dispositivo',
          summary: 'Cada 1,5 s el juego genera un trozo de nivel y aparece un pico. Sin más, el Profiler solo te dice que `LevelBuilder.Update()` es lento. Activa el **ProfilerMarker**, prueba **Deep Profile** y cambia dónde perfilas: el Editor no se comporta como el móvil.',
          points: [
            '`ProfilerMarker` (o `Profiler.BeginSample`/`EndSample`) añade una muestra con nombre propio, casi sin overhead.',
            '**Deep Profile** registra cada llamada de C#: añade un overhead enorme y distorsiona los tiempos, sobre todo de funciones pequeñas muy llamadas.',
            'Perfila en el dispositivo real: **Development Build** + **Autoconnect Profiler**, por USB o red.',
            'Cambiar la plataforma del Editor a Android no cambia el hardware; y `Time.time` no cambia dentro de un frame, así que no sirve para medir.'
          ]
        },
        en: {
          title: 'CPU Profiler: markers, Deep Profile and devices',
          summary: 'Every 1.5 s the game generates a chunk of level and a spike appears. On its own, the Profiler only tells you that `LevelBuilder.Update()` is slow. Enable the **ProfilerMarker**, try **Deep Profile** and change where you profile: the Editor does not behave like the phone.',
          points: [
            '`ProfilerMarker` (or `Profiler.BeginSample`/`EndSample`) adds a sample with its own name, with almost no overhead.',
            '**Deep Profile** records every C# call: it adds huge overhead and distorts timings, especially for small, frequently called functions.',
            'Profile on the real device: **Development Build** + **Autoconnect Profiler**, over USB or network.',
            'Switching the Editor platform to Android does not change the hardware; and `Time.time` does not change within a frame, so it cannot measure anything.'
          ]
        }
      }
    }
,
    {
      id: 'memory-profiler', questions: ['prf-22'], domain: 'perf', icon: '🧠', mount: mountMemory,
      text: {
        es: {
          title: 'Memory Profiler: comparar snapshots',
          summary: 'Para saber si algo no se libera al cambiar de escena, captura un **snapshot** de la memoria antes y otro después, y compáralos. La demo lo hace sola: snapshot A en Level1, carga el menú, snapshot B y diff. Activa el arreglo y mira cómo el diff queda limpio.',
          points: [
            'El **Memory Profiler** es un paquete (Window > Analysis > Memory Profiler) que captura snapshots y los compara.',
            'Muestra memoria **nativa** (texturas, mallas…) y **gestionada**, cuánto ocupa cada objeto y **quién lo referencia**.',
            'Una referencia olvidada (p. ej. una `static List<Texture2D>`) mantiene vivo el asset aunque cambies de escena.',
            'El Frame Debugger, Deep Profile o un `Debug.Log` en `OnDestroy` no te dicen qué sigue en memoria.'
          ]
        },
        en: {
          title: 'Memory Profiler: comparing snapshots',
          summary: 'To find out whether something is not released when you change scenes, capture a memory **snapshot** before and another after, and compare them. The demo does it on its own: snapshot A in Level1, load the menu, snapshot B and diff. Enable the fix and watch the diff come out clean.',
          points: [
            'The **Memory Profiler** is a package (Window > Analysis > Memory Profiler) that captures snapshots and compares them.',
            'It shows **native** memory (textures, meshes…) and **managed** memory, how much each object uses and **who references it**.',
            'A forgotten reference (e.g. a `static List<Texture2D>`) keeps the asset alive even after a scene change.',
            'The Frame Debugger, Deep Profile or a `Debug.Log` in `OnDestroy` do not tell you what is still in memory.'
          ]
        }
      }
    },
    {
      id: 'frame-debugger', questions: ['prf-06', 'prf-10'], domain: 'perf', icon: '🎞️', mount: mountFrameDebugger,
      text: {
        es: {
          title: 'Frame Debugger y Sprite Atlas',
          summary: 'El **Frame Debugger** congela un frame y te deja recorrer sus draw calls uno a uno, con el motivo por el que cada uno no se agrupó con el anterior. Mira cómo se construye la escena 2D y luego activa **Sprite Atlas**: los sprites pasan a compartir textura y los draw calls se desploman.',
          points: [
            'Ver draw calls uno a uno y por qué no se agrupan: **Frame Debugger** (Window > Analysis).',
            'Sprites con texturas distintas no pueden ir en el mismo batch.',
            'Un **Sprite Atlas** empaqueta muchos sprites en una textura: los que comparten material y atlas se dibujan juntos.',
            'Un material distinto (aquí, Glow) sigue rompiendo el batch aunque uses atlas.'
          ]
        },
        en: {
          title: 'Frame Debugger and Sprite Atlas',
          summary: 'The **Frame Debugger** freezes a frame and lets you step through its draw calls one by one, with the reason each one was not batched with the previous one. Watch the 2D scene build up, then enable **Sprite Atlas**: the sprites now share a texture and the draw calls collapse.',
          points: [
            'Seeing draw calls one by one and why they are not batched: **Frame Debugger** (Window > Analysis).',
            'Sprites with different textures cannot go in the same batch.',
            'A **Sprite Atlas** packs many sprites into one texture: those sharing material and atlas are drawn together.',
            'A different material (here, Glow) still breaks the batch even with an atlas.'
          ]
        }
      }
    },
    {
      id: 'instancing-srp', questions: ['prf-07', 'prf-23'], domain: 'perf', icon: '🌲', mount: mountInstancing,
      text: {
        es: {
          title: 'GPU Instancing, SRP Batcher y GPU Resident Drawer',
          summary: 'Miles de rocas idénticas creadas en runtime. Cada color es un draw call: mira cuántos hacen falta y cuánto tarda la CPU en enviarlos con cada técnica. Prueba también a darle a cada roca su propio material, o a quitar Forward+.',
          points: [
            'Built-in, misma malla y material: **Enable GPU Instancing** en el material → pocos draw calls.',
            'Static batching: solo objetos marcados Static antes de la build que no se mueven; no sirve para objetos generados en runtime.',
            'URP: el **SRP Batcher** abarata cada draw call; el **GPU Resident Drawer** (Unity 6) usa `BatchRendererGroup` + instancing y requiere **Forward+**.',
            'Un material distinto por objeto rompe el instancing.'
          ]
        },
        en: {
          title: 'GPU Instancing, SRP Batcher and GPU Resident Drawer',
          summary: 'Thousands of identical rocks spawned at runtime. Each color is one draw call: see how many are needed and how long the CPU takes to submit them with each technique. Also try giving every rock its own material, or turning off Forward+.',
          points: [
            'Built-in, same mesh and material: **Enable GPU Instancing** on the material → few draw calls.',
            'Static batching: only objects marked Static before the build that never move; it does not help runtime-spawned objects.',
            'URP: the **SRP Batcher** makes each draw call cheaper; the **GPU Resident Drawer** (Unity 6) uses `BatchRendererGroup` + instancing and requires **Forward+**.',
            'A different material per object breaks instancing.'
          ]
        }
      }
    },
    {
      id: 'culling-lod', questions: ['prf-08', 'prf-09'], domain: 'perf', icon: '🏙️', mount: mountCulling,
      text: {
        es: {
          title: 'Frustum culling, Occlusion Culling y LOD',
          summary: 'El frustum culling ya descarta lo que queda fuera de la cámara, pero no lo que está **tapado**. En la ciudad, activa **Occlusion Culling** y mira los edificios naranjas (dibujados sin verse). En la pestaña de árboles, aléjate y observa cómo el `LODGroup` cambia de malla según el tamaño en pantalla.',
          points: [
            'Frustum culling: automático, descarta lo que está fuera del campo de visión.',
            '**Occlusion Culling**: con datos precalculados (bake), no dibuja lo que queda detrás de los occluders.',
            '`LODGroup`: LOD0 → LOD1 → LOD2 → Culled según el % de pantalla que ocupa el objeto.',
            'Reducir el Far Clip Plane o el static batching no resuelven la oclusión.'
          ]
        },
        en: {
          title: 'Frustum culling, Occlusion Culling and LOD',
          summary: 'Frustum culling already discards what is outside the camera, but not what is **hidden** behind other objects. In the city, enable **Occlusion Culling** and watch the orange buildings (drawn but unseen). In the trees tab, move away and see how the `LODGroup` switches meshes by screen size.',
          points: [
            'Frustum culling: automatic, it discards what is outside the field of view.',
            '**Occlusion Culling**: with baked data, it skips what is behind the occluders.',
            '`LODGroup`: LOD0 → LOD1 → LOD2 → Culled based on the % of the screen the object covers.',
            'Lowering the Far Clip Plane or static batching do not solve occlusion.'
          ]
        }
      }
    }
  );
})();
