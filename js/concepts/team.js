/* Conceptos animados: team (desarrollo en equipo) */
(function () {
  'use strict';
  const K = UCP.conceptKit;
  const { colors, el, makeCanvas, loop, controls, button, seg, toggle, readout, roundRect, text, code, codeBlock, arrow, box, lerp, clamp, ease } = K;

  /* ---------- utilidades privadas ---------- */

  const NARROW = 560;
  const V = (kind, s) => '<b style="color:var(--' + kind + ')">' + s + '</b>';

  // Recorta un texto para que quepa en maxW píxeles.
  function fit(ctx, s, maxW, mono) {
    ctx.font = mono ? K.MONO : K.FONT;
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  function tx(ctx, s, x, y, color, opts, maxW) {
    opts = opts || {};
    if (maxW) s = fit(ctx, s, maxW, opts.mono);
    text(ctx, s, x, y, color, opts);
  }
  // Etiqueta redondeada con ancho automático. Devuelve el ancho.
  function pill(ctx, x, y, s, fill, fg, align, mono) {
    ctx.font = mono ? K.MONO : K.FONT;
    const w = ctx.measureText(s).width + 14;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    box(ctx, x0, y - 10, w, 20, s, fill, fg, { r: 10, mono });
    return w;
  }
  function dot(ctx, x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, color, wdt, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = wdt || 2;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (dash) ctx.setLineDash([]);
  }
  // codeBlock que se puede ocultar (para las pestañas).
  function codeBox(host) {
    const set = codeBlock(host);
    const pre = host.lastElementChild;
    set.show = (v) => { pre.style.display = v ? '' : 'none'; };
    return set;
  }
  // Recalcula el alto del canvas (cuando cambia de pestaña y la altura depende de ella).
  function refit(st, hfn) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    st.w = Math.max(240, st.cv.parentNode.clientWidth);
    st.h = hfn(st.w);
    st.cv.width = Math.round(st.w * dpr); st.cv.height = Math.round(st.h * dpr);
    st.cv.style.height = st.h + 'px';
    st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function row(host) { const c = controls(host); c.show = (v) => { c.style.display = v ? '' : 'none'; }; return c; }
  const fmtMB = (mb) => (mb >= 1000 ? (mb / 1000).toFixed(1) + ' GB' : mb >= 1 ? Math.round(mb) + ' MB' : Math.max(1, Math.round(mb * 1000)) + ' KB');

  /* =========================================================
     1. Awake vs Start: orden entre objetos
     ========================================================= */

  function mountAwakeStart(host, lang) {
    const L = {
      es: { reload: '🔄 Recargar escena', awake: 'Leer en Awake', start: 'Leer en Start', exec: '[DefaultExecutionOrder(-100)] en GameManager',
        g: ['carga de escena (por objeto: Awake → OnEnable)', 'antes del primer frame', 'frame 1 y siguientes'], gs: ['carga de escena', 'antes del 1er frame', 'cada frame'],
        nul: '✗ null', okv: '✓ ok', order: 'Orden de Awake en esta carga',
        bad: '✗ <b>NullReferenceException</b> en <code>UIController.Awake</code>: esta vez su Awake se ejecutó <b>antes</b> que el de GameManager, así que <code>Instance</code> aún era null.',
        luck: '⚠️ Ha funcionado por suerte: GameManager se despertó primero. El orden de <code>Awake</code> entre objetos distintos <b>no está garantizado</b>. Recarga la escena varias veces.',
        forced: '✓ Con <code>[DefaultExecutionOrder(-100)]</code> (o Script Execution Order) GameManager se ejecuta siempre antes que los demás.',
        startMsg: '✓ <code>Start</code> se llama cuando <b>todos</b> los Awake/OnEnable de la escena ya terminaron: <code>Instance</code> siempre está asignado.',
        wait: 'Ejecutando la carga de la escena…' },
      en: { reload: '🔄 Reload scene', awake: 'Read in Awake', start: 'Read in Start', exec: '[DefaultExecutionOrder(-100)] on GameManager',
        g: ['scene load (per object: Awake → OnEnable)', 'before the first frame', 'frame 1 and every frame after'], gs: ['scene load', 'before 1st frame', 'every frame'],
        nul: '✗ null', okv: '✓ ok', order: 'Awake order in this load',
        bad: '✗ <b>NullReferenceException</b> in <code>UIController.Awake</code>: this time its Awake ran <b>before</b> GameManager’s, so <code>Instance</code> was still null.',
        luck: '⚠️ It worked by luck: GameManager woke up first. The <code>Awake</code> order between different objects is <b>not guaranteed</b>. Reload the scene a few times.',
        forced: '✓ With <code>[DefaultExecutionOrder(-100)]</code> (or Script Execution Order) GameManager always runs before the others.',
        startMsg: '✓ <code>Start</code> is called once <b>every</b> Awake/OnEnable in the scene has finished: <code>Instance</code> is always set.',
        wait: 'Running the scene load…' }
    }[lang];
    const OBJ = ['GameManager', 'UIController', 'Enemy'], SHORT = [['Game', 'Manager'], ['UI', 'Controller'], ['Enemy', '']];
    const PH = ['Awake', 'OnEnable', 'Start', 'FixedUpdate', 'Update', 'LateUpdate'];
    const GROUPS = [[0, 1], [2], [3, 4, 5]];
    const STEP = 0.36, HOLD = 2.6;
    let readIn = 'awake', forced = false, order = [1, 0, 2], steps = [], t = 0;

    function build() {
      steps = [];
      order.forEach((o) => { steps.push([0, o]); steps.push([1, o]); });
      order.forEach((o) => steps.push([2, o]));
      [3, 4, 5].forEach((p) => order.forEach((o) => steps.push([p, o])));
      t = 0;
    }
    function shuffle() {
      order = [0, 1, 2];
      for (let i = 2; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const k = order[i]; order[i] = order[j]; order[j] = k; }
      if (forced) order = [0].concat(order.filter((o) => o !== 0));
      build();
    }
    const idxOf = (p, o) => steps.findIndex((s) => s[0] === p && s[1] === o);

    const ctl = controls(host);
    button(ctl, L.reload, shuffle, true);
    seg(ctl, [{ v: 'awake', l: L.awake }, { v: 'start', l: L.start }], readIn, (v) => { readIn = v; build(); });
    toggle(ctl, L.exec, false, (v) => { forced = v; if (v) order = [0].concat(order.filter((o) => o !== 0)); build(); });
    const stage = makeCanvas(host, (w) => (w < NARROW ? 268 : 262));
    const out = readout(host);
    const cb = codeBlock(host);
    build();

    const stop = loop((dt) => {
      t += dt;
      if (t > steps.length * STEP + HOLD) t = 0;
      const cur = Math.floor(t / STEP);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = w < NARROW;
      const lw = nar ? 76 : 120, x0 = 10 + lw, cw = (w - 10 - x0) / 3;
      OBJ.forEach((n, o) => {
        const cx = x0 + o * cw + cw / 2, col = o === 1 ? c.accent : c.text;
        if (!nar) tx(ctx, n, cx, 16, col, { align: 'center', mono: true }, cw - 2);
        else { tx(ctx, SHORT[o][0], cx, 10, col, { align: 'center' }); tx(ctx, SHORT[o][1], cx, 24, col, { align: 'center' }); }
      });
      const readPhase = readIn === 'awake' ? 0 : 2;
      const readIdx = idxOf(readPhase, 1), gmIdx = idxOf(0, 0);
      const fails = readIn === 'awake' && gmIdx > readIdx;
      let y = nar ? 38 : 32;
      GROUPS.forEach((g, gi) => {
        tx(ctx, (nar ? L.gs : L.g)[gi], 10, y + 7, c.muted, {}, w - 20);
        y += 16;
        g.forEach((p) => {
          tx(ctx, PH[p], 10, y + 12, c.text, { mono: !nar }, lw - 4);
          for (let o = 0; o < 3; o++) {
            const idx = idxOf(p, o);
            const done = idx < cur, now = idx === cur;
            const isRead = p === readPhase && o === 1;
            let fill = c.soft, fg = c.muted, label = '';
            if (done || now) { fill = now ? c.accent : c.accentSoft; fg = now ? '#fff' : c.text; label = '#' + (idx + 1); }
            if (isRead && done) { fill = fails ? c.bad : c.ok; fg = '#fff'; label = fails ? L.nul : L.okv; }
            box(ctx, x0 + o * cw + 3, y, cw - 6, 24, label, fill, fg, { r: 6, stroke: isRead ? (fails ? c.bad : c.ok) : null });
          }
          y += 28;
        });
      });
      const readDone = cur > readIdx;
      const ord = order.map((o) => OBJ[o]).join(' → ');
      let msg = L.wait;
      if (readDone) msg = readIn === 'start' ? L.startMsg : fails ? L.bad : forced ? L.forced : L.luck;
      out(L.order + ': <b>' + ord + '</b><p>' + msg + '</p>');
      const src = '[DefaultExecutionOrder(-100)]\npublic class GameManager : MonoBehaviour\n{\n    public static GameManager Instance { get; private set; }\n    void Awake() { Instance = this; }      // inicializa lo tuyo\n}\n\npublic class UIController : MonoBehaviour\n{\n    void Awake() { score = GameManager.Instance.Score; }\n    void Start() { score = GameManager.Instance.Score; } // usa lo de otros\n}';
      const marks = { 0: forced ? 'ok' : 'off' };
      marks[9] = readIn === 'awake' ? (readDone ? (fails ? 'bad' : 'hl') : 'hl') : 'off';
      marks[10] = readIn === 'start' ? (readDone ? 'ok' : 'hl') : 'off';
      cb(lang === 'en' ? src.replace('inicializa lo tuyo', 'initialize yourself').replace('usa lo de otros', 'use others') : src, marks);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     2. Git en Unity: qué versionar y los .meta (GUID)
     ========================================================= */

  function mountGitUnity(host, lang) {
    const L = {
      es: { tTree: 'Qué versionar', tMeta: 'GUIDs y .meta', all: 'git add . (todo)', rec: '.gitignore recomendado', withMeta: 'Ana sube también Sword.fbx.meta', again: '↻ Repetir',
        on: 'versionado', off: 'ignorado', repo: 'Tamaño del repositorio', clone: 'cada clon descarga', tap: 'Toca una carpeta para incluirla o ignorarla.',
        miss: '✗ Falta versionar <b>{f}</b>: definen el proyecto y tus compañeros no podrán abrirlo igual.',
        junk: '⚠️ Sobran <b>{f}</b>: son cachés y archivos locales que Unity regenera.', lib: ' Solo <code>Library/</code> pesa 6.4 GB.',
        good: '✓ Correcto: <code>Assets</code> (con sus <code>.meta</code>), <code>Packages</code> y <code>ProjectSettings</code> definen el proyecto. Lo demás se regenera y va en el <code>.gitignore</code>.',
        desc: ['+ todos sus .meta', 'manifest + packages-lock', 'ajustes del proyecto', 'caché de importación', 'temporal', 'logs del Editor', 'preferencias locales', 'archivos del IDE'],
        ana: 'Ana (PC 1)', origin: 'Repositorio', ben: 'Ben (PC 2)', noMeta: 'Sword.fbx.meta (no subido)', newG: ' (nuevo)', missing: '✗ Missing', found: '✓ Sword',
        p: ['Ana importa Sword.fbx: Unity crea Sword.fbx.meta con un GUID aleatorio y la escena guarda ese GUID.', 'Ana hace commit y push…', 'Ben hace pull…', 'Unity de Ben importa los cambios…'],
        okM: '✓ El <code>.meta</code> viajó con el asset: Ben tiene el mismo GUID (a3f9…), así que la referencia de <code>Level.unity</code> se resuelve.',
        badM: '✗ Sin el <code>.meta</code>, Unity de Ben <b>sí</b> importa Sword.fbx, pero genera un <code>.meta</code> nuevo con <b>otro GUID</b> (7c21…, no se deriva del nombre). La escena busca a3f9… → <b>Missing</b>. También se pierden los ajustes de importación.' },
      en: { tTree: 'What to version', tMeta: 'GUIDs and .meta', all: 'git add . (everything)', rec: 'Recommended .gitignore', withMeta: 'Ana also commits Sword.fbx.meta', again: '↻ Replay',
        on: 'tracked', off: 'ignored', repo: 'Repository size', clone: 'every clone downloads', tap: 'Tap a folder to track or ignore it.',
        miss: '✗ You must track <b>{f}</b>: they define the project and your teammates cannot open it the same way.',
        junk: '⚠️ Not needed: <b>{f}</b>. They are caches and local files Unity regenerates.', lib: ' <code>Library/</code> alone is 6.4 GB.',
        good: '✓ Correct: <code>Assets</code> (with its <code>.meta</code> files), <code>Packages</code> and <code>ProjectSettings</code> define the project. Everything else is regenerated and goes in <code>.gitignore</code>.',
        desc: ['+ all its .meta files', 'manifest + packages-lock', 'project settings', 'import cache', 'temporary', 'Editor logs', 'local preferences', 'IDE files'],
        ana: 'Ana (PC 1)', origin: 'Repository', ben: 'Ben (PC 2)', noMeta: 'Sword.fbx.meta (not pushed)', newG: ' (new)', missing: '✗ Missing', found: '✓ Sword',
        p: ['Ana imports Sword.fbx: Unity creates Sword.fbx.meta with a random GUID and the scene stores that GUID.', 'Ana commits and pushes…', 'Ben pulls…', 'Ben’s Unity imports the changes…'],
        okM: '✓ The <code>.meta</code> travelled with the asset: Ben has the same GUID (a3f9…), so the reference in <code>Level.unity</code> resolves.',
        badM: '✗ Without the <code>.meta</code>, Ben’s Unity <b>does</b> import Sword.fbx, but it generates a new <code>.meta</code> with <b>a different GUID</b> (7c21…, it is not derived from the name). The scene looks for a3f9… → <b>Missing</b>. The import settings are lost too.' }
    }[lang];
    const F = [['Assets/', 850, 1], ['Packages/', 0.02, 1], ['ProjectSettings/', 0.4, 1], ['Library/', 6400, 0], ['Temp/', 300, 0], ['Logs/', 4, 0], ['UserSettings/', 0.05, 0], ['obj/', 40, 0]]
      .map((a, i) => ({ n: a[0], mb: a[1], req: !!a[2], d: L.desc[i] }));
    let tab = 'tree', inc = F.map(() => true), withMeta = false, t = 0, shown = 0;
    const ROW = 26, TOP = 10;

    const ctl = controls(host);
    seg(ctl, [{ v: 'tree', l: L.tTree }, { v: 'meta', l: L.tMeta }], tab, (v) => { tab = v; t = 0; sync(); });
    const c1 = row(host), c2 = row(host);
    button(c1, L.all, () => { inc = F.map(() => true); });
    button(c1, L.rec, () => { inc = F.map((f) => f.req); }, true);
    toggle(c2, L.withMeta, withMeta, (v) => { withMeta = v; t = 0; });
    button(c2, L.again, () => { t = 0; });
    const hfn = (w) => (tab === 'tree' ? TOP + F.length * ROW + 56 : w < 640 ? 318 : 120);
    const stage = makeCanvas(host, hfn, (x, y) => {
      if (tab !== 'tree') return;
      const i = Math.floor((y - TOP) / ROW);
      if (i >= 0 && i < F.length) inc[i] = !inc[i];
    });
    const out = readout(host);
    const cb = codeBox(host);
    function sync() { c1.show(tab === 'tree'); c2.show(tab === 'meta'); cb.show(tab === 'tree'); refit(stage, hfn); stage.cv.style.cursor = tab === 'tree' ? 'pointer' : 'default'; }
    sync();

    function drawTree(c, ctx, w) {
      const nar = w < NARROW;
      F.forEach((f, i) => {
        const y = TOP + i * ROW + ROW / 2, on = inc[i];
        const wrong = on !== f.req;
        if (i % 2 === 0) { ctx.fillStyle = c.soft; ctx.fillRect(6, y - ROW / 2, w - 12, ROW); }
        box(ctx, 12, y - 8, 16, 16, on ? '✓' : '', on ? c.ok : c.bg, '#fff', { r: 4, stroke: on ? c.ok : c.border });
        tx(ctx, f.n, 36, y, f.req ? c.text : c.muted, { mono: !nar });
        if (!nar) tx(ctx, f.d, 175, y, c.muted, {}, w - 175 - 190);
        const pf = wrong ? (f.req ? c.bad : c.warn) : (on ? c.okSoft : c.soft), pc = wrong ? '#fff' : (on ? c.ok : c.muted);
        if (nar) { pill(ctx, w - 12, y, fmtMB(f.mb), pf, pc, 'right'); return; }
        const pw = pill(ctx, w - 12, y, on ? L.on : L.off, pf, pc, 'right');
        tx(ctx, fmtMB(f.mb), w - 20 - pw, y, f.mb > 100 ? c.text : c.muted, { align: 'right' });
      });
      const total = F.reduce((s, f, i) => s + (inc[i] ? f.mb : 0), 0);
      const y = TOP + F.length * ROW + 14;
      tx(ctx, L.repo + ': ' + fmtMB(shown), 12, y, c.text);
      if (!nar) tx(ctx, L.clone + ' ' + fmtMB(shown), w - 12, y, c.muted, { align: 'right' });
      ctx.fillStyle = c.soft; roundRect(ctx, 12, y + 12, w - 24, 14, 7); ctx.fill();
      ctx.fillStyle = inc[3] ? c.bad : total > 900 ? c.warn : c.ok;
      roundRect(ctx, 12, y + 12, Math.max(6, (w - 24) * shown / 7640), 14, 7); ctx.fill();
      return total;
    }

    function drawMeta(c, ctx, w, h) {
      const st = w < 640;
      const B = (i) => (st ? { x: 10, y: 8 + i * 106, w: w - 20, h: 82 } : { x: 10 + i * (w - 20) / 3 + (i ? 6 : 0), y: 10, w: (w - 20) / 3 - 6, h: 100 });
      const titles = [L.ana, L.origin, L.ben];
      const phase = t < 1.2 ? 0 : t < 3 ? 1 : t < 4.2 ? 2 : 3;
      for (let i = 0; i < 3; i++) {
        const b = B(i);
        ctx.fillStyle = c.soft; roundRect(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
        tx(ctx, titles[i], b.x + 10, b.y + 13, c.muted, {}, b.w - 20);
      }
      const lines = [[], [], []];
      const metaA = 'Sword.fbx.meta · guid a3f9…';
      lines[0] = [['Sword.fbx', c.text], [metaA, c.text], ['Level.unity → a3f9…', c.text]];
      if (t > 2.4) lines[1] = [['Sword.fbx', c.text], withMeta ? [metaA, c.text] : [L.noMeta, c.bad], ['Level.unity → a3f9…', c.text]];
      if (t > 4.2) {
        const metaB = withMeta ? [metaA, c.text] : t > 5 ? ['Sword.fbx.meta · guid 7c21…', c.bad] : ['…', c.muted];
        const ref = t > 5.8 ? (withMeta ? ['Level.unity → a3f9… ' + L.found, c.ok] : ['Level.unity → a3f9… ' + L.missing, c.bad]) : ['Level.unity → a3f9…', c.text];
        lines[2] = [['Sword.fbx', c.text], metaB, ref];
      }
      lines.forEach((ls, i) => {
        const b = B(i);
        ls.forEach((l, k) => tx(ctx, l[0], b.x + 10, b.y + 36 + k * (st ? 17 : 24), l[1], { mono: true }, b.w - 20));
      });
      // Paquetes en tránsito
      const travel = (i, j, p) => {
        const a = B(i), b = B(j);
        const ax = st ? a.x + a.w / 2 : a.x + a.w, ay = st ? a.y + a.h : a.y + a.h / 2;
        const bx = st ? b.x + b.w / 2 : b.x, by = st ? b.y : b.y + b.h / 2;
        line(ctx, ax, ay, bx, by, c.border, 2, [4, 4]);
        const n = withMeta ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const q = clamp(p * 1.3 - k * 0.15, 0, 1);
          if (q > 0 && q < 1) box(ctx, lerp(ax, bx, ease(q)) - 7, lerp(ay, by, ease(q)) - 7, 14, 14, '', k === 2 ? c.warn : c.accent, '#fff', { r: 3 });
        }
      };
      if (phase === 1) travel(0, 1, clamp((t - 1.2) / 1.2, 0, 1));
      if (phase === 2) travel(1, 2, clamp((t - 3) / 1.2, 0, 1));
      return phase;
    }

    const stop = loop((dt) => {
      t += dt;
      if (tab === 'meta' && t > 10) t = 0;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'tree') {
        const total = F.reduce((s, f, i) => s + (inc[i] ? f.mb : 0), 0);
        shown = lerp(shown, total, clamp(dt * 6, 0, 1));
        if (Math.abs(shown - total) < 0.01) shown = total;
        drawTree(c, ctx, w);
        const miss = F.filter((f, i) => f.req && !inc[i]).map((f) => f.n), junk = F.filter((f, i) => !f.req && inc[i]).map((f) => f.n);
        let msg = '';
        if (miss.length) msg += '<p>' + L.miss.replace('{f}', miss.join(', ')) + '</p>';
        if (junk.length) msg += '<p>' + L.junk.replace('{f}', junk.join(', ')) + (inc[3] ? L.lib : '') + '</p>';
        if (!msg) msg = '<p>' + L.good + '</p>';
        out('<span class="muted">' + L.tap + '</span>' + msg);
        const ign = F.filter((f, i) => !inc[i]);
        const src = ['# .gitignore'].concat(ign.length ? ign.map((f) => '/' + f.n) : ['# (vacío)']).join('\n');
        const marks = {};
        ign.forEach((f, k) => { marks[k + 1] = f.req ? 'bad' : 'ok'; });
        cb(src, marks);
      } else {
        const ph = drawMeta(c, ctx, w, h);
        out(t > 5.8 ? (withMeta ? L.okM : L.badM) : L.p[ph]);
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     3. Merge de escenas: serialización, UnityYAMLMerge, prefabs
     ========================================================= */

  function mountMerge(host, lang) {
    const L = {
      es: { bin: 'Binary', txt: 'Force Text (YAML)', plain: 'Merge de texto', yaml: 'UnityYAMLMerge', one: 'Una escena grande', split: 'Prefabs + escenas aditivas', lock: 'Bloqueo de archivos', again: '↻ Repetir',
        wait: '🔒 espera a Ana', base: 'base',
        r: { bin: '✗ Conflicto binario: hay que elegir la versión de Ana o la de Ben', plain: '✗ Conflicto de texto en el YAML', yaml: '✓ Smart Merge fusiona los dos cambios', split: '✓ Archivos distintos: sin conflicto', lock: '✓ Sin conflicto: Ben esperó su turno' },
        m: { bin: 'En binario Git solo ve que «los archivos binarios difieren»: no hay diff ni merge posible. UnityYAMLMerge tampoco puede ayudar. Uno de los dos pierde su cambio.',
          plain: 'Con <b>Force Text</b> la escena es YAML legible y hay diff, pero un merge de texto genérico trabaja por líneas: los dos añadieron objetos en el mismo sitio y aparecen marcas <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> que hay que resolver a mano.',
          yaml: '<b>UnityYAMLMerge</b> (incluido con Unity) entiende la estructura de escenas y prefabs: sabe que Door y Lamp son objetos distintos y fusiona ambos. Se configura como merge tool en Git o Unity Version Control.',
          split: 'Ana edita <code>Door.prefab</code> y Ben edita <code>Lighting.unity</code> (escena aditiva): cada uno toca un archivo distinto, así que no hay nada que fusionar. Es la estrategia que más conflictos evita.',
          lock: 'Con <b>file locking</b> (Git LFS o Unity Version Control) Ben no puede editar <code>Level.unity</code> mientras Ana la tiene bloqueada: no hay conflicto, pero trabajan en serie.' } },
      en: { bin: 'Binary', txt: 'Force Text (YAML)', plain: 'Text merge', yaml: 'UnityYAMLMerge', one: 'One big scene', split: 'Prefabs + additive scenes', lock: 'File locking', again: '↻ Replay',
        wait: '🔒 waits for Ana', base: 'base',
        r: { bin: '✗ Binary conflict: pick Ana’s version or Ben’s', plain: '✗ Text conflict in the YAML', yaml: '✓ Smart Merge combines both changes', split: '✓ Different files: no conflict', lock: '✓ No conflict: Ben waited his turn' },
        m: { bin: 'In binary, Git only sees “binary files differ”: no diff and no merge. UnityYAMLMerge cannot help either. One of them loses their change.',
          plain: 'With <b>Force Text</b> the scene is readable YAML and you get diffs, but a generic text merge works line by line: both added objects in the same place, so <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> markers appear and must be resolved by hand.',
          yaml: '<b>UnityYAMLMerge</b> (shipped with Unity) understands the structure of scenes and prefabs: it knows Door and Lamp are different objects and merges both. Set it as the merge tool in Git or Unity Version Control.',
          split: 'Ana edits <code>Door.prefab</code> and Ben edits <code>Lighting.unity</code> (an additive scene): each touches a different file, so there is nothing to merge. This is the strategy that avoids the most conflicts.',
          lock: 'With <b>file locking</b> (Git LFS or Unity Version Control) Ben cannot edit <code>Level.unity</code> while Ana holds the lock: no conflict, but they work one after the other.' } }
    }[lang];
    let ser = 'bin', tool = 'plain', split = false, lock = false, t = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'bin', l: L.bin }, { v: 'text', l: L.txt }], ser, (v) => { ser = v; t = 0; });
    seg(ctl, [{ v: 'plain', l: L.plain }, { v: 'yaml', l: L.yaml }], tool, (v) => { tool = v; t = 0; });
    const ctl2 = controls(host);
    seg(ctl2, [{ v: false, l: L.one }, { v: true, l: L.split }], split, (v) => { split = v; t = 0; });
    toggle(ctl2, L.lock, false, (v) => { lock = v; t = 0; });
    button(ctl2, L.again, () => { t = 0; });
    const stage = makeCanvas(host, 180);
    const out = readout(host);
    const cb = codeBlock(host);
    const outcome = () => (split ? 'split' : lock ? 'lock' : ser === 'bin' ? 'bin' : tool === 'yaml' ? 'yaml' : 'plain');

    const YAML = {
      bin: ['// Level.unity guardada en binario', '// 0000: 00 00 00 00 8c 3a 01 00 11 00 00 00', '// 0010: 4f 9e 00 00 1a 7f 00 00 03 00 00 00', '// git: "binary files differ" → ¿Ana o Ben?'],
      plain: ['--- !u!1 &1001', 'GameObject:', '  m_Name: Door', '--- !u!1 &2001', 'GameObject:', '  m_Name: Lamp', 'SceneRoots:', '  m_Roots:', '  - {fileID: 400}', '<<<<<<< HEAD (Ana)', '  - {fileID: 1002}', '=======', '  - {fileID: 2002}', '>>>>>>> ben'],
      yaml: ['--- !u!1 &1001', 'GameObject:', '  m_Name: Door', '--- !u!1 &2001', 'GameObject:', '  m_Name: Lamp', 'SceneRoots:', '  m_Roots:', '  - {fileID: 400}', '  - {fileID: 1002}', '  - {fileID: 2002}'],
      split: ['# Door.prefab (Ana)', '--- !u!1 &1001', 'GameObject:', '  m_Name: Door', '# Lighting.unity (Ben)', '--- !u!1 &2001', 'GameObject:', '  m_Name: Lamp']
    };

    const stop = loop((dt) => {
      t += dt;
      if (t > 9) t = 0;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const o = outcome();
      const X = (f) => 14 + f * (w - 28);
      const yA = 34, yM = 78, yB = 122;
      const fA = split ? 'Door.prefab' : 'Level.unity', fB = split ? 'Lighting.unity' : 'Level.unity';
      const nar = w < NARROW;
      const res = t > 3.6;
      const col = o === 'bin' || o === 'plain' ? c.bad : c.ok;
      // main
      line(ctx, X(0.06), yM, X(o === 'lock' ? 0.94 : 0.8), yM, c.border, 3);
      dot(ctx, X(0.06), yM, 7, c.muted);
      tx(ctx, L.base, X(0.06), yM + 18, c.muted, { align: 'center' });
      const pa = clamp((t - 0.6) / 0.6, 0, 1);
      if (o === 'lock') {
        // Ana commit → main, después Ben encima
        line(ctx, X(0.06), yM, X(0.36), yA, c.accent, 2);
        if (pa > 0) { dot(ctx, X(0.36), yA, 7 * ease(pa), c.accent); pill(ctx, X(0.36), yA - 18, (nar ? '+Door' : 'Ana: + Door') + ' · ' + fA, c.accentSoft, c.accent, 'center'); }
        if (t > 1.6) { line(ctx, X(0.36), yA, X(0.5), yM, c.accent, 2); dot(ctx, X(0.5), yM, 6, c.accent); }
        line(ctx, X(0.1), yB, X(0.5), yB, c.warn, 2, [5, 5]);
        tx(ctx, L.wait, X(0.12), yB + 18, c.warn, {}, X(0.5) - X(0.12));
        if (t > 2.2) { line(ctx, X(0.5), yM, X(0.66), yB, c.ok, 2); dot(ctx, X(0.66), yB, 7, c.ok); pill(ctx, X(0.66), yB + 18, (nar ? '+Lamp' : 'Ben: + Lamp'), c.okSoft, c.ok, 'center'); }
        if (t > 3) { line(ctx, X(0.66), yB, X(0.8), yM, c.ok, 2); dot(ctx, X(0.8), yM, 8, c.ok); }
      } else {
        line(ctx, X(0.06), yM, X(0.42), yA, c.accent, 2);
        line(ctx, X(0.06), yM, X(0.42), yB, c.warn, 2);
        if (pa > 0) { dot(ctx, X(0.42), yA, 7 * ease(pa), c.accent); pill(ctx, X(0.42), yA - 18, (nar ? '+Door' : 'Ana: + Door') + ' · ' + fA, c.accentSoft, c.accent, 'center'); }
        const pb = clamp((t - 1.3) / 0.6, 0, 1);
        if (pb > 0) { dot(ctx, X(0.42), yB, 7 * ease(pb), c.warn); pill(ctx, X(0.42), yB + 18, (nar ? '+Lamp' : 'Ben: + Lamp') + ' · ' + fB, c.warnSoft, c.warn, 'center'); }
        const pm = clamp((t - 2.2) / 1.2, 0, 1);
        if (pm > 0) {
          line(ctx, X(0.42), yA, lerp(X(0.42), X(0.8), pm), lerp(yA, yM, pm), c.accent, 2);
          line(ctx, X(0.42), yB, lerp(X(0.42), X(0.8), pm), lerp(yB, yM, pm), c.warn, 2);
        }
        if (res) { dot(ctx, X(0.8), yM, 9, col); tx(ctx, col === c.ok ? '✓' : '✗', X(0.8), yM, '#fff', { align: 'center' }); }
      }
      if (res) tx(ctx, L.r[o], w / 2, 162, col, { align: 'center' }, w - 16);
      out(res ? L.m[o] : '…');
      const key = o === 'lock' ? 'yaml' : o;
      let lines = YAML[key];
      if (lang === 'en') lines = lines.map((s) => s.replace('guardada en binario', 'saved as binary').replace('¿Ana o Ben?', 'Ana or Ben?'));
      const marks = {};
      lines.forEach((s, i) => {
        if (o === 'plain' && i >= 9) marks[i] = 'bad';
        if ((o === 'yaml' || o === 'lock') && (i === 9 || i === 10)) marks[i] = 'ok';
        if (o === 'bin') marks[i] = i === 3 ? 'bad' : 'off';
        if (o === 'split' && s[0] === '#') marks[i] = 'hl';
      });
      cb(res ? lines.join('\n') : lines.slice(0, 3).join('\n'), res ? marks : {});
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     4. Binarios grandes: Git LFS y bloqueo de archivos
     ========================================================= */

  function mountBinaries(host, lang) {
    const L = {
      es: { tLfs: 'Git LFS', tLock: 'Bloqueo (locking)', again: '↻ Repetir', commit: 'commit', hist: 'historial .git', lfsS: 'almacén LFS (servidor)',
        s: { git: 'Git normal', zip: 'Subir en ZIP', gc: 'git gc diario', ignore: '.gitignore + email', lfs: 'Git LFS' },
        m: { git: '✗ Cada versión completa de cada PSD/WAV/FBX queda para siempre en el historial: cada <code>git clone</code> descarga todas.',
          zip: '✗ Un ZIP de un binario apenas comprime y se sigue guardando entero en cada commit. Además ya no puedes ver ni importar el archivo directamente.',
          gc: '✗ <code>git gc</code> compacta objetos, pero los binarios casi no se pueden comprimir por diferencias y nunca borra versiones del historial.',
          ignore: '✗ El repositorio no crece, pero esos archivos dejan de estar versionados: sin historial y con copias por email desincronizadas.',
          lfs: '✓ El repositorio solo guarda <b>punteros</b> de ~130 bytes; los binarios van al almacén LFS y cada clon descarga solo las versiones que necesita.' },
        clone: 'git clone descarga', none: 'archivos sin versionar',
        lk: { off: 'Sin bloqueo', on: 'Con bloqueo (exclusive checkout)' }, edit: 'edita Hero.psd', locked: '🔒 bloqueado por Ana', lost: 'trabajo perdido',
        lm: { off: '✗ Los dos editaron Hero.psd a la vez. Un PSD es binario: no se puede fusionar, así que al subir Ben hay que elegir una versión y el trabajo de Ana se pierde.',
          on: '✓ Ana bloquea Hero.psd (<b>exclusive checkout</b>). Ben ve «bloqueado por Ana», espera y edita después sobre la versión de Ana: no se pierde nada.' } },
      en: { tLfs: 'Git LFS', tLock: 'Locking', again: '↻ Replay', commit: 'commit', hist: '.git history', lfsS: 'LFS storage (server)',
        s: { git: 'Plain Git', zip: 'Commit as ZIP', gc: 'Daily git gc', ignore: '.gitignore + email', lfs: 'Git LFS' },
        m: { git: '✗ Every full version of every PSD/WAV/FBX stays in the history forever: every <code>git clone</code> downloads all of them.',
          zip: '✗ Zipping a binary barely compresses it and it is still stored whole in every commit. And you can no longer view or import the file directly.',
          gc: '✗ <code>git gc</code> packs objects, but binaries barely delta-compress and it never removes versions from the history.',
          ignore: '✗ The repository stops growing, but those files are no longer versioned: no history and out-of-sync copies by email.',
          lfs: '✓ The repository only stores ~130-byte <b>pointers</b>; the binaries go to LFS storage and each clone downloads only the versions it needs.' },
        clone: 'git clone downloads', none: 'unversioned files',
        lk: { off: 'No locking', on: 'Locking (exclusive checkout)' }, edit: 'edits Hero.psd', locked: '🔒 locked by Ana', lost: 'work lost',
        lm: { off: '✗ Both edited Hero.psd at the same time. A PSD is binary: it cannot be merged, so when Ben pushes someone must pick one version and Ana’s work is lost.',
          on: '✓ Ana locks Hero.psd (<b>exclusive checkout</b>). Ben sees “locked by Ana”, waits and then edits on top of Ana’s version: nothing is lost.' } }
    }[lang];
    const PER = 200; // MB por commit (PSD 120 + WAV 45 + FBX 35)
    const FACT = { git: 0.97, zip: 0.88, gc: 0.92, ignore: 0, lfs: 0.0004 };
    let tab = 'lfs', strat = 'git', n = 0, acc = 0, lockOn = false, t = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'lfs', l: L.tLfs }, { v: 'lock', l: L.tLock }], tab, (v) => { tab = v; t = 0; n = 0; acc = 0; sync(); });
    const c1 = row(host), c2 = row(host);
    seg(c1, Object.keys(L.s).map((k) => ({ v: k, l: L.s[k] })), strat, (v) => { strat = v; n = 0; acc = 0; });
    seg(c2, [{ v: false, l: L.lk.off }, { v: true, l: L.lk.on }], lockOn, (v) => { lockOn = v; t = 0; });
    button(c2, L.again, () => { t = 0; });
    const hfn = () => (tab === 'lfs' ? 200 : 156);
    const stage = makeCanvas(host, hfn);
    const out = readout(host);
    const cb = codeBlock(host);
    function sync() { c1.show(tab === 'lfs'); c2.show(tab === 'lock'); refit(stage, hfn); }
    sync();

    function drawLfs(c, ctx, w, h) {
      const x0 = 46, x1 = w - 12, y0 = h - 24, y1 = 30;
      const MAX = 12 * PER;
      const Y = (mb) => y0 - (mb / MAX) * (y0 - y1);
      line(ctx, x0, y1 - 6, x0, y0, c.border, 1);
      line(ctx, x0, y0, x1, y0, c.border, 1);
      tx(ctx, '2.4 GB', x0 - 4, y1, c.muted, { align: 'right' });
      tx(ctx, '0', x0 - 4, y0, c.muted, { align: 'right' });
      tx(ctx, L.hist, x0 + 6, 12, c.text);
      if (strat === 'lfs') { ctx.font = K.FONT; const hw = ctx.measureText(L.hist).width; ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.strokeRect(x0 + 18 + hw, 6, 12, 12); ctx.setLineDash([]); tx(ctx, L.lfsS, x0 + 36 + hw, 12, c.muted, {}, x1 - x0 - 40 - hw); }
      const bw = Math.min(28, (x1 - x0) / 12 - 6);
      for (let k = 1; k <= n; k++) {
        const x = x0 + 6 + (k - 1) * ((x1 - x0 - 6) / 12);
        if (strat === 'lfs') {
          ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.strokeRect(x, Y(k * PER), bw, y0 - Y(k * PER)); ctx.setLineDash([]);
        }
        const v = k * PER * FACT[strat];
        const top = Math.min(Y(v), y0 - (strat === 'ignore' ? 0 : 2));
        ctx.fillStyle = strat === 'lfs' ? c.ok : v > 1000 ? c.bad : c.accent;
        ctx.fillRect(x, top, bw, y0 - top);
      }
      tx(ctx, n + ' ' + L.commit + (n === 1 ? '' : 's'), x1, y0 + 12, c.muted, { align: 'right' });
    }

    function drawLock(c, ctx, w, h) {
      const x0 = 56, x1 = w - 12, T = 7;
      const X = (s) => x0 + (s / T) * (x1 - x0);
      const yA = 40, yB = 100;
      tx(ctx, 'Ana', 10, yA, c.text); tx(ctx, 'Ben', 10, yB, c.text);
      line(ctx, x0, yA, x1, yA, c.border, 1); line(ctx, x0, yB, x1, yB, c.border, 1);
      const bar = (y, a, b, color, label, fg) => {
        const e = Math.min(b, t);
        if (e <= a) return;
        box(ctx, X(a), y - 11, X(e) - X(a), 22, '', color, '#fff', { r: 6 });
        if (label && X(e) - X(a) > 40) tx(ctx, label, X(a) + 6, y, fg || '#fff', {}, X(e) - X(a) - 10);
      };
      if (!lockOn) {
        const lost = t > 4.8;
        bar(yA, 0.2, 3, lost ? c.bad : c.accent, L.edit);
        if (lost) tx(ctx, '✗ ' + L.lost, X(0.2), yA - 20, c.bad, {}, x1 - X(0.2));
        if (t > 3) tx(ctx, '⬆', X(3) + 8, yA, c.accent);
        bar(yB, 0.6, 4.6, c.warn, L.edit);
        if (t > 4.6) { dot(ctx, X(4.6) + 12, yB, 10, c.bad); tx(ctx, '✗', X(4.6) + 12, yB, '#fff', { align: 'center' }); }
      } else {
        bar(yA, 0.2, 2.6, c.accent, '🔒 ' + L.edit);
        if (t > 2.6) tx(ctx, '🔓', X(2.6) + 4, yA, c.text);
        if (t > 0.6) {
          const e = Math.min(2.6, t);
          line(ctx, X(0.6), yB, X(e), yB, c.warn, 3, [5, 4]);
          tx(ctx, L.locked, X(0.6), yB - 20, c.warn, {}, x1 - X(0.6));
        }
        bar(yB, 2.6, 5.2, c.ok, '🔒 ' + L.edit);
        if (t > 5.2) { dot(ctx, X(5.2) + 12, yB, 10, c.ok); tx(ctx, '✓', X(5.2) + 12, yB, '#fff', { align: 'center' }); }
      }
      // cabezal
      const px = X(Math.min(t, T));
      line(ctx, px, 18, px, 124, c.text, 1);
      for (let s = 0; s <= T; s++) tx(ctx, s + 's', X(s), 140, c.muted, { align: 'center' });
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'lfs') {
        acc += dt;
        if (acc > (n >= 12 ? 2.5 : 0.8)) { acc = 0; n = n >= 12 ? 0 : n + 1; }
        drawLfs(c, ctx, w, h);
        const hist = n * PER * FACT[strat];
        const clone = strat === 'lfs' ? hist + (n ? PER : 0) : hist;
        out('<b>' + L.s[strat] + '</b> · ' + L.hist + ': <b>' + fmtMB(hist) + '</b>' + (strat === 'lfs' ? ' · ' + L.lfsS + ': ' + fmtMB(n * PER) : '') +
          ' · ' + (strat === 'ignore' ? V('bad', L.none) : L.clone + ': <b>' + fmtMB(clone) + '</b>') + '<p>' + L.m[strat] + '</p>');
        const src = strat === 'lfs'
          ? '# .gitattributes\n*.psd filter=lfs diff=lfs merge=lfs -text\n*.wav filter=lfs diff=lfs merge=lfs -text\n*.fbx filter=lfs diff=lfs merge=lfs -text\n\n# Lo que guarda Git en lugar de Hero.psd (puntero):\nversion https://git-lfs.github.com/spec/v1\noid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393\nsize 125829120'
          : '# Cada commit guarda los binarios completos:\ngit add Art/Hero.psd Audio/Theme.wav Models/Boss.fbx\ngit commit -m "Retoques"   # +200 MB al historial';
        cb(lang === 'en' ? src.replace('Lo que guarda Git en lugar de Hero.psd (puntero):', 'What Git stores instead of Hero.psd (pointer):').replace('Cada commit guarda los binarios completos:', 'Every commit stores the full binaries:').replace('Retoques', 'Tweaks').replace('al historial', 'to history') : src,
          strat === 'lfs' ? { 1: 'ok', 2: 'ok', 3: 'ok' } : { 2: 'bad' });
      } else {
        if (t > 9) t = 0;
        drawLock(c, ctx, w, h);
        out(t > (lockOn ? 5.2 : 4.6) ? L.lm[lockOn ? 'on' : 'off'] : '…');
        const src = lockOn
          ? '# Git LFS\ngit lfs lock Art/Hero.psd     # Ben: "Locked by Ana"\ngit lfs unlock Art/Hero.psd\n\n# Unity Version Control (Gluon, sin línea de comandos):\n# Checkout (bloqueo exclusivo) → editar → Checkin\n# Workspace parcial: solo los archivos que necesitas'
          : '# Ana y Ben editan Hero.psd a la vez\n# Ben: git pull → CONFLICT (binary): Art/Hero.psd\ngit checkout --theirs Art/Hero.psd   # o --ours: uno pierde';
        cb(lang === 'en' ? src.replace('sin línea de comandos', 'no command line').replace('bloqueo exclusivo', 'exclusive lock').replace('editar', 'edit').replace('Workspace parcial: solo los archivos que necesitas', 'Partial workspace: only the files you need').replace('editan Hero.psd a la vez', 'edit Hero.psd at the same time').replace('o --ours: uno pierde', 'or --ours: someone loses') : src,
          lockOn ? { 1: 'ok', 5: 'ok' } : { 1: 'bad', 2: 'bad' });
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  UCP.concepts.push(
    {
      id: 'awake-start', questions: ['team-18', 'team-19'], domain: 'team', practice: { d: 'team', t: 'Ciclo de vida' }, icon: '🌅', mount: mountAwakeStart,
      text: {
        es: {
          title: 'Awake vs Start: orden entre objetos',
          summary: 'Al cargar la escena, Unity llama a `Awake` y `OnEnable` de cada objeto, después a todos los `Start` y, ya en cada frame, `FixedUpdate` → `Update` → `LateUpdate`. Pero el orden de `Awake` **entre objetos distintos** no está garantizado. Recarga la escena leyendo `GameManager.Instance` en Awake y en Start, y prueba a forzar el orden.',
          points: ['Orden: `Awake` → `OnEnable` → `Start` → `FixedUpdate` (0..n por frame) → `Update` → `LateUpdate`.', 'Convención: en `Awake` inicializa lo tuyo; en `Start` usa lo de otros.', '`Start` se ejecuta cuando todos los `Awake` de la escena han terminado.', 'Para forzar el orden: `[DefaultExecutionOrder]` o Project Settings > Script Execution Order.', 'No llames a `Awake` a mano ni muevas la asignación de `Instance` a `Start`.']
        },
        en: {
          title: 'Awake vs Start: order across objects',
          summary: 'When a scene loads, Unity calls `Awake` and `OnEnable` on each object, then every `Start`, and then each frame `FixedUpdate` → `Update` → `LateUpdate`. But the `Awake` order **between different objects** is not guaranteed. Reload the scene reading `GameManager.Instance` in Awake and in Start, and try forcing the order.',
          points: ['Order: `Awake` → `OnEnable` → `Start` → `FixedUpdate` (0..n per frame) → `Update` → `LateUpdate`.', 'Convention: initialize yourself in `Awake`; use other objects in `Start`.', '`Start` runs once every `Awake` in the scene has finished.', 'To force the order: `[DefaultExecutionOrder]` or Project Settings > Script Execution Order.', 'Do not call `Awake` by hand or move the `Instance` assignment to `Start`.']
        }
      }
    },
    {
      id: 'git-unity', questions: ['team-01', 'team-02'], domain: 'team', practice: { d: 'team', t: 'Control de versiones' }, icon: '🗃️', mount: mountGitUnity,
      text: {
        es: {
          title: 'Git en Unity: qué versionar y los .meta',
          summary: 'Solo tres carpetas definen un proyecto de Unity: `Assets` (con sus `.meta`), `Packages` y `ProjectSettings`. El resto son cachés enormes que Unity regenera. Además, cada `.meta` guarda el **GUID** del asset, y las escenas lo referencian por GUID, no por ruta. Marca carpetas en la primera pestaña y, en la segunda, sube o no el `.meta`.',
          points: ['Versiona: `Assets`, `Packages` (`manifest.json`, `packages-lock.json`) y `ProjectSettings`.', 'Ignora: `Library`, `Temp`, `Logs`, `obj`, `UserSettings` y las carpetas de builds.', 'El GUID del `.meta` es aleatorio: si falta, cada PC genera uno distinto y las referencias quedan **Missing**.', 'Sube siempre el asset y su `.meta` juntos (Version Control: Visible Meta Files).']
        },
        en: {
          title: 'Git in Unity: what to version and .meta files',
          summary: 'Only three folders define a Unity project: `Assets` (with its `.meta` files), `Packages` and `ProjectSettings`. The rest are huge caches Unity regenerates. Also, each `.meta` holds the asset’s **GUID**, and scenes reference assets by GUID, not by path. Toggle folders in the first tab and, in the second, commit the `.meta` or not.',
          points: ['Track: `Assets`, `Packages` (`manifest.json`, `packages-lock.json`) and `ProjectSettings`.', 'Ignore: `Library`, `Temp`, `Logs`, `obj`, `UserSettings` and build folders.', 'The `.meta` GUID is random: if it is missing, each PC generates a different one and references become **Missing**.', 'Always commit an asset together with its `.meta` (Version Control: Visible Meta Files).']
        }
      }
    },
    {
      id: 'merge-escenas', questions: ['team-03', 'team-05', 'team-06'], domain: 'team', practice: { d: 'team', t: 'Control de versiones' }, icon: '🔀', mount: mountMerge,
      text: {
        es: {
          title: 'Merge de escenas y prefabs',
          summary: 'Ana añade una puerta y Ben una lámpara en la misma escena, a la vez. Que el merge salga bien depende de cómo se guarda la escena (**Binary** o **Force Text**), de la herramienta de merge y de cómo repartes el contenido. Cambia cada opción y mira el resultado del merge y el YAML.',
          points: ['**Force Text**: escenas, prefabs y ScriptableObjects en YAML, con diff y merge.', 'En binario, un conflicto obliga a quedarse con una de las dos versiones.', '**UnityYAMLMerge** (Smart Merge) entiende el YAML de Unity: configúralo como merge tool.', 'Lo que más reduce conflictos: dividir en **prefabs** (anidados) y **escenas aditivas**.', 'El bloqueo de archivos (LFS o Unity Version Control) también evita conflictos.']
        },
        en: {
          title: 'Merging scenes and prefabs',
          summary: 'Ana adds a door and Ben a lamp to the same scene at the same time. Whether the merge works depends on how the scene is saved (**Binary** or **Force Text**), the merge tool and how you split the content. Change each option and look at the merge result and the YAML.',
          points: ['**Force Text**: scenes, prefabs and ScriptableObjects as YAML, with diff and merge.', 'In binary, a conflict forces you to keep one of the two versions.', '**UnityYAMLMerge** (Smart Merge) understands Unity’s YAML: set it as your merge tool.', 'What reduces conflicts most: splitting into (nested) **prefabs** and **additive scenes**.', 'File locking (LFS or Unity Version Control) also prevents conflicts.']
        }
      }
    },
    {
      id: 'binarios-lfs', questions: ['team-04', 'team-22'], domain: 'team', practice: { d: 'team', t: 'Control de versiones' }, icon: '🐘', mount: mountBinaries,
      text: {
        es: {
          title: 'Binarios grandes: Git LFS y bloqueo',
          summary: 'Git guarda cada versión completa de cada archivo, y los PSD, WAV o FBX casi no se comprimen: el repositorio no para de crecer. **Git LFS** deja en Git solo un puntero. Y como los binarios no se pueden fusionar, se **bloquean**. Compara las estrategias en la primera pestaña y edita un PSD entre dos en la segunda.',
          points: ['Git LFS: punteros en el repositorio, binarios en el almacén LFS; el clon solo baja lo necesario.', 'Configúralo con `.gitattributes` (`git lfs track "*.psd"`); bloqueo con `git lfs lock`.', 'ZIP, `git gc` o el `.gitignore` no resuelven el problema.', '**Unity Version Control** (antes Plastic SCM): bloqueo de archivos (*exclusive checkout*), integración en el Editor y **Gluon** para artistas (workspace parcial, sin línea de comandos).']
        },
        en: {
          title: 'Large binaries: Git LFS and locking',
          summary: 'Git stores every full version of every file, and PSD, WAV or FBX files barely compress: the repository keeps growing. **Git LFS** leaves only a pointer in Git. And since binaries cannot be merged, you **lock** them. Compare the strategies in the first tab and edit a PSD with two people in the second.',
          points: ['Git LFS: pointers in the repository, binaries in LFS storage; a clone only downloads what it needs.', 'Set it up with `.gitattributes` (`git lfs track "*.psd"`); lock with `git lfs lock`.', 'ZIP files, `git gc` or `.gitignore` do not solve the problem.', '**Unity Version Control** (formerly Plastic SCM): file locking (*exclusive checkout*), Editor integration and **Gluon** for artists (partial workspace, no command line).']
        }
      }
    }
  );

  /* @@PART2@@ */
})();
