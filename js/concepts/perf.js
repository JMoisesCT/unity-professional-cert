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
      text(ctx, 'ms', w - 70, hy + 6, c.muted, { align: 'right' });
      text(ctx, L.calls, w - 10, hy + 6, c.muted, { align: 'right' });
      if (sel && target !== 'release') {
        const rs = rows(sel);
        const rh = Math.min(18, (h - hy - 20) / rs.length);
        rs.forEach((r, i) => {
          const y = hy + 22 + i * rh;
          if (r.hl) { ctx.fillStyle = c.warnSoft; ctx.fillRect(6, y - rh / 2, w - 12, rh); }
          const nx = 10 + r.d * 10;
          text(ctx, fit(ctx, r.n, w - 92 - nx, true), nx, y, r.hl ? c.text : c.muted, { mono: true });
          text(ctx, F(r.ms, 2), w - 70, y, c.text, { align: 'right', mono: true });
          text(ctx, r.c > 1 ? String(r.c) : '1', w - 10, y, c.muted, { align: 'right', mono: true });
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
  );
})();
