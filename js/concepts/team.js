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

  /* =========================================================
     5. Ramas por funcionalidad y pull requests
     ========================================================= */

  function mountBranches(host, lang) {
    const L = {
      es: { pr: 'Ramas + pull request', direct: 'Todos en main', bug: 'El próximo commit rompe un test', nb: '🌿 Nueva rama', commit: '● Commit', open: 'Abrir PR', ci: '▶ Ejecutar CI', approve: '👍 Aprobar', merge: 'Merge',
        mainOk: 'main ✓ build OK', mainBad: 'main ✗ build roto', team: 'equipo', review: 'Revisión', none: '—', run: 'ejecutando…', pass: '✓ tests OK', fail: '✗ tests fallan', ok: '✓ aprobado', blocked: 'bloqueado', allowed: 'permitido',
        m: { start: 'Crea una rama para tu funcionalidad.', onlyPr: 'En «Todos en main» no hay ramas ni PR: cada commit va directo a main.', open: 'Ya tienes una rama abierta: haz commits o abre el PR.',
          nb: 'Rama creada: trabajas aislado, main no se toca.', noBr: 'Primero crea una rama.', cBr: 'Commit en la rama. main sigue estable.', cBug: 'Commit con un bug en la rama: main sigue verde porque aún no se ha fusionado.',
          noC: 'Haz al menos un commit antes de abrir el PR.', opened: 'PR abierto: ahora toca revisión de código y CI.', noPr: 'Abre primero el pull request.', ciRun: 'CI ejecutando los tests…',
          appr: 'Un compañero revisó el código y lo aprobó.', needCi: '✗ Merge bloqueado: el CI tiene que pasar (protección de rama).', needRev: '✗ Merge bloqueado: falta la aprobación de la revisión.',
          merged: '✓ Merge en main: revisado y con tests en verde. main sigue estable.', dOk: 'Commit directo en main.', dBad: '✗ Commit directo con un bug: main se rompe para <b>todo el equipo</b> hasta que alguien lo arregle.', dFix: 'Commit que arregla main.' } },
      en: { pr: 'Branches + pull request', direct: 'Everyone on main', bug: 'Next commit breaks a test', nb: '🌿 New branch', commit: '● Commit', open: 'Open PR', ci: '▶ Run CI', approve: '👍 Approve', merge: 'Merge',
        mainOk: 'main ✓ build OK', mainBad: 'main ✗ build broken', team: 'team', review: 'Review', none: '—', run: 'running…', pass: '✓ tests pass', fail: '✗ tests fail', ok: '✓ approved', blocked: 'blocked', allowed: 'allowed',
        m: { start: 'Create a branch for your feature.', onlyPr: 'In “Everyone on main” there are no branches or PRs: every commit goes straight to main.', open: 'You already have an open branch: commit or open the PR.',
          nb: 'Branch created: you work in isolation and main is untouched.', noBr: 'Create a branch first.', cBr: 'Commit on the branch. main stays stable.', cBug: 'Buggy commit on the branch: main stays green because it has not been merged yet.',
          noC: 'Make at least one commit before opening the PR.', opened: 'PR opened: now code review and CI.', noPr: 'Open the pull request first.', ciRun: 'CI running the tests…',
          appr: 'A teammate reviewed the code and approved it.', needCi: '✗ Merge blocked: CI must pass (branch protection).', needRev: '✗ Merge blocked: review approval missing.',
          merged: '✓ Merged into main: reviewed and with green tests. main stays stable.', dOk: 'Direct commit on main.', dBad: '✗ Direct commit with a bug: main breaks for <b>the whole team</b> until someone fixes it.', dFix: 'Commit that fixes main.' } }
    }[lang];
    const NAMES = ['feature/jump', 'feature/inventory', 'feature/boss-ai'];
    let mode = 'pr', bug = false, seq = 0, nodes = [], br = null, brN = 0, msg = '', mainBroken = false, ciT = 0, now = 0;
    const add = (lane, bad, extra) => { const n = Object.assign({ s: seq++, lane, bad, born: now, b: br ? brN : -1 }, extra || {}); nodes.push(n); return n; };
    function reset() { seq = 0; nodes = []; br = null; mainBroken = false; for (let i = 0; i < 3; i++) add(0, false); msg = mode === 'pr' ? L.m.start : ''; }
    const lastMain = () => nodes.filter((n) => n.lane === 0).slice(-1)[0];

    const ctl = controls(host);
    seg(ctl, [{ v: 'pr', l: L.pr }, { v: 'direct', l: L.direct }], mode, (v) => { mode = v; reset(); });
    toggle(ctl, L.bug, false, (v) => { bug = v; });
    const ctl2 = controls(host);
    button(ctl2, L.nb, () => {
      if (mode !== 'pr') { msg = L.m.onlyPr; return; }
      if (br && !br.merged) { msg = L.m.open; return; }
      brN++; br = { name: NAMES[(brN - 1) % NAMES.length], base: lastMain().s, commits: 0, broken: false, pr: false, ci: 'none', approved: false, merged: false, id: brN };
      msg = L.m.nb;
    }, true);
    button(ctl2, L.commit, () => {
      if (mode === 'direct') { add(0, bug); mainBroken = bug; msg = bug ? L.m.dBad : (msg === L.m.dBad ? L.m.dFix : L.m.dOk); return; }
      if (!br || br.merged) { msg = L.m.noBr; return; }
      add(1, bug); br.commits++; br.broken = bug; br.ci = 'none'; msg = bug ? L.m.cBug : L.m.cBr;
    });
    const need = (fn) => () => { if (mode !== 'pr') { msg = L.m.onlyPr; return; } if (!br || br.merged) { msg = L.m.noBr; return; } fn(); };
    button(ctl2, L.open, need(() => { if (!br.commits) { msg = L.m.noC; return; } br.pr = true; msg = L.m.opened; }));
    button(ctl2, L.ci, need(() => { if (!br.pr) { msg = L.m.noPr; return; } br.ci = 'run'; ciT = 0; msg = L.m.ciRun; }));
    button(ctl2, L.approve, need(() => { if (!br.pr) { msg = L.m.noPr; return; } br.approved = true; msg = L.m.appr; }));
    button(ctl2, L.merge, need(() => {
      if (!br.pr) { msg = L.m.noPr; return; }
      if (br.ci !== 'pass') { msg = L.m.needCi; return; }
      if (!br.approved) { msg = L.m.needRev; return; }
      const lf = nodes.filter((n) => n.b === br.id).slice(-1)[0];
      add(0, false, { merge: lf.s }); br.merged = true; msg = L.m.merged;
    }));
    const stage = makeCanvas(host, 214);
    const out = readout(host);
    reset();

    const stop = loop((dt) => {
      now += dt;
      if (br && br.ci === 'run') { ciT += dt; if (ciT > 1.5) { br.ci = br.broken ? 'fail' : 'pass'; msg = br.broken ? L.fail : L.pass; } }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const VIS = w < NARROW ? 8 : 11, first = Math.max(0, seq - VIS), sp = Math.min(60, (w - 50) / VIS);
      const X = (s) => 24 + (s - first) * sp;
      const yM = 56, yF = 112;
      const byS = {};
      nodes.forEach((n) => { byS[n.s] = n; });
      const vis = (s) => s >= first - 1;
      // aristas
      const mains = nodes.filter((n) => n.lane === 0);
      for (let i = 1; i < mains.length; i++) if (vis(mains[i].s)) line(ctx, X(Math.max(first - 0.4, mains[i - 1].s)), yM, X(mains[i].s), yM, c.border, 3);
      const brs = {};
      nodes.filter((n) => n.lane === 1).forEach((n) => { (brs[n.b] = brs[n.b] || []).push(n); });
      Object.keys(brs).forEach((k) => {
        const list = brs[k];
        const base = nodes.filter((n) => n.lane === 0 && n.s < list[0].s).slice(-1)[0];
        let px = X(base.s), py = yM;
        list.forEach((n) => { if (vis(n.s)) line(ctx, Math.max(px, 0), py, X(n.s), yF, c.accent, 2); px = X(n.s); py = yF; });
      });
      if (br && !br.merged && !br.commits) {
        line(ctx, X(br.base), yM, X(br.base) + sp, yF, c.accent, 2, [4, 4]);
      }
      mains.filter((n) => n.merge !== undefined && vis(n.s)).forEach((n) => line(ctx, X(byS[n.merge].s), yF, X(n.s), yM, c.ok, 2));
      // nodos
      nodes.forEach((n) => {
        if (!vis(n.s) || X(n.s) < 8) return;
        const k = clamp((now - n.born) / 0.3, 0, 1);
        const col = n.bad ? c.bad : n.merge !== undefined ? c.ok : n.lane ? c.accent : c.muted;
        dot(ctx, X(n.s), n.lane ? yF : yM, (n.merge !== undefined ? 9 : 7) * ease(k), col);
      });
      tx(ctx, 'main', 6, yM - 18, c.muted);
      // estado de main y equipo
      const mb = mode === 'direct' && mainBroken;
      pill(ctx, w - 10, 16, mb ? L.mainBad : L.mainOk, mb ? c.bad : c.okSoft, mb ? '#fff' : c.ok, 'right');
      if (mode === 'direct') {
        tx(ctx, L.team + ':', 24, yF, c.muted);
        ctx.font = K.FONT;
        const tw = ctx.measureText(L.team + ':').width;
        for (let i = 0; i < 5; i++) { dot(ctx, 24 + tw + 16 + i * 22, yF, 8, mb ? c.bad : c.ok); tx(ctx, mb ? '✗' : '✓', 24 + tw + 16 + i * 22, yF, '#fff', { align: 'center' }); }
      }
      if (br && (!br.merged || now - nodes[nodes.length - 1].born < 3)) {
        const fn = nodes.filter((n) => n.b === br.id)[0];
        const bx = fn ? X(fn.s) : X(br.base) + sp;
        if (bx > 0) tx(ctx, br.name, Math.min(bx, w - 130), yF + 20, c.accent, { mono: true }, 126);
      }
      // panel del PR
      if (mode === 'pr' && br && br.pr) {
        const y = 168;
        ctx.fillStyle = c.soft; roundRect(ctx, 8, y - 18, w - 16, 54, 8); ctx.fill();
        tx(ctx, 'PR #' + (11 + br.id) + ' ' + br.name + ' → main' + (br.merged ? ' · merged' : ''), 16, y - 6, c.text, { mono: true }, w - 32);
        const ciLab = br.ci === 'run' ? '⏳ ' + L.run : br.ci === 'pass' ? L.pass : br.ci === 'fail' ? L.fail : 'CI ' + L.none;
        const ciCol = br.ci === 'pass' ? c.ok : br.ci === 'fail' ? c.bad : br.ci === 'run' ? c.warn : c.muted;
        let x = 16;
        x += pill(ctx, x, y + 18, ciLab, ciCol === c.muted ? c.bg : ciCol, ciCol === c.muted ? c.muted : '#fff') + 6;
        x += pill(ctx, x, y + 18, br.approved ? L.ok : L.review + ' ' + L.none, br.approved ? c.ok : c.bg, br.approved ? '#fff' : c.muted) + 6;
        const can = br.ci === 'pass' && br.approved;
        if (x + 120 < w) pill(ctx, x, y + 18, 'merge: ' + (br.merged ? '✓' : can ? L.allowed : L.blocked), can || br.merged ? c.okSoft : c.badSoft, can || br.merged ? c.ok : c.bad);
        if (br.ci === 'run') { ctx.fillStyle = c.warn; ctx.fillRect(8, y + 34, (w - 16) * clamp(ciT / 1.5, 0, 1), 3); }
      }
      out(msg || L.m.dOk);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     6. Tests de Edit Mode y Play Mode
     ========================================================= */

  function mountTests(host, lang) {
    const L = {
      es: { run: '▶ Ejecutar tests', noY: '[Test] sin yield', editT: 'Edit Mode · [Test]', play: 'Play Mode · [UnityTest]', playT: 'Play Mode · [Test]', entering: 'Entrando en Play Mode…', noPlay: 'sin entrar en Play Mode', frames: 'frames', resume: 'yield', assert: 'Assert',
        m: { test: '✗ Con <code>[Test]</code> todo ocurre en una sola llamada síncrona: no pasa ningún frame ni paso de física, así que la bola sigue en y = 0 y <code>Assert.Less</code> falla.',
          null: '⚠️ <code>yield return null</code> espera <b>un frame</b>, pero en ese frame puede que la física no haya hecho ningún paso (FixedUpdate se ejecuta 0..n veces): el test es inestable. Ejecútalo varias veces.',
          fixed: '✓ <code>WaitForFixedUpdate</code> reanuda tras un paso de física: la bola ya bajó un poco y el test pasa.',
          secs: '✓ <code>WaitForSeconds(1f)</code> deja pasar 1 s de juego (unos 60 frames y 50 pasos de física): la bola cae unos 5 m y el test pasa.' },
        edit: 'El test de Edit Mode de <code>CalculateDamage</code> pasa al instante: es lógica pura, sin frames ni física.' },
      en: { run: '▶ Run tests', noY: '[Test] without yield', editT: 'Edit Mode · [Test]', play: 'Play Mode · [UnityTest]', playT: 'Play Mode · [Test]', entering: 'Entering Play Mode…', noPlay: 'without entering Play Mode', frames: 'frames', resume: 'yield', assert: 'Assert',
        m: { test: '✗ With <code>[Test]</code> everything happens in a single synchronous call: no frame or physics step passes, so the ball is still at y = 0 and <code>Assert.Less</code> fails.',
          null: '⚠️ <code>yield return null</code> waits <b>one frame</b>, but physics may not have stepped in that frame (FixedUpdate runs 0..n times): the test is flaky. Run it a few times.',
          fixed: '✓ <code>WaitForFixedUpdate</code> resumes after a physics step: the ball has dropped a little and the test passes.',
          secs: '✓ <code>WaitForSeconds(1f)</code> lets 1 s of game time pass (about 60 frames and 50 physics steps): the ball falls about 5 m and the test passes.' },
        edit: 'The Edit Mode test of <code>CalculateDamage</code> passes instantly: it is pure logic, no frames or physics.' }
    }[lang];
    const OPTS = [{ v: 'test', l: L.noY }, { v: 'null', l: 'yield return null' }, { v: 'fixed', l: 'WaitForFixedUpdate' }, { v: 'secs', l: 'WaitForSeconds(1f)' }];
    const WAIT = { test: 0, null: 1 / 60, fixed: 0.02, secs: 1 };
    const TS = 0.9, SPAN = 1.2;
    let opt = 'secs', t = 0, flaky = false;
    const ctl = controls(host);
    seg(ctl, OPTS, opt, (v) => { opt = v; t = 0; flaky = Math.random() < 0.5; });
    button(ctl, L.run, () => { t = 0; flaky = Math.random() < 0.5; }, true);
    const stage = makeCanvas(host, (w) => (w < NARROW ? 360 : 190));
    const out = readout(host);
    const cb = codeBlock(host);
    const steps = () => (opt === 'test' ? 0 : opt === 'null' ? (flaky ? 0 : 1) : opt === 'fixed' ? 1 : 50);
    const yAt = (n) => -9.81 * 0.0004 * n * (n + 1) / 2;

    const stop = loop((dt) => {
      t += dt;
      if (t > TS + SPAN + 3) t = 0;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = w < NARROW;
      const P1 = nar ? { x: 8, y: 8, w: w - 16, h: 110 } : { x: 8, y: 8, w: (w - 24) * 0.42, h: h - 16 };
      const P2 = nar ? { x: 8, y: 128, w: w - 16, h: h - 136 } : { x: P1.x + P1.w + 8, y: 8, w: w - P1.w - 24, h: h - 16 };
      [P1, P2].forEach((p) => { ctx.fillStyle = c.soft; roundRect(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill(); });
      // Edit Mode
      const eDone = t > 0.15;
      tx(ctx, L.editT, P1.x + 10, P1.y + 14, c.text, {}, P1.w - 50);
      tx(ctx, eDone ? '✓' : '⏳', P1.x + P1.w - 12, P1.y + 14, eDone ? c.ok : c.warn, { align: 'right' });
      tx(ctx, 'CalculateDamage(10, 3)', P1.x + 10, P1.y + 42, c.text, { mono: true }, P1.w - 20);
      if (eDone) {
        tx(ctx, '→ 7   AreEqual(7) ✓', P1.x + 10, P1.y + 64, c.ok, { mono: true }, P1.w - 20);
        tx(ctx, '0.001 s · ' + L.noPlay, P1.x + 10, P1.y + 88, c.muted, {}, P1.w - 20);
      }
      // Play Mode
      tx(ctx, opt === 'test' ? L.playT : L.play, P2.x + 10, P2.y + 14, c.text, {}, P2.w - 50);
      const tt = t - TS;
      const waitEnd = WAIT[opt];
      const n = steps();
      const done = tt > Math.max(waitEnd, 0.05);
      const yEnd = yAt(n);
      const pass = yEnd < 0;
      tx(ctx, done ? (pass ? '✓' : '✗') : '⏳', P2.x + P2.w - 12, P2.y + 14, done ? (pass ? c.ok : c.bad) : c.warn, { align: 'right' });
      if (tt < 0) {
        tx(ctx, L.entering, P2.x + 10, P2.y + 44, c.muted);
        ctx.fillStyle = c.border; ctx.fillRect(P2.x + 10, P2.y + 58, P2.w - 20, 5);
        ctx.fillStyle = c.accent; ctx.fillRect(P2.x + 10, P2.y + 58, (P2.w - 20) * clamp(t / TS, 0, 1), 5);
      } else {
        // escena: bola que cae
        const gx = P2.x + 34, gTop = P2.y + 36, gBot = P2.y + P2.h - 58;
        const tSim = Math.min(tt, waitEnd);
        const ns = opt === 'secs' ? Math.floor(tSim / 0.02) : done ? n : 0;
        const y = yAt(ns);
        line(ctx, P2.x + 10, gBot + 10, P2.x + 60, gBot + 10, c.border, 2);
        const by = gTop + clamp(-y / 5, 0, 1) * (gBot - gTop);
        dot(ctx, gx, by, 9, c.accent);
        tx(ctx, 'y = ' + y.toFixed(4), P2.x + 66, gTop + 4, c.text, { mono: true }, P2.w - 76);
        if (done) tx(ctx, 'Assert.Less(y, 0) ' + (pass ? '✓' : '✗'), P2.x + 66, gTop + 26, pass ? c.ok : c.bad, { mono: true }, P2.w - 76);
        // línea de tiempo con frames
        const tx0 = P2.x + 12, tx1 = P2.x + P2.w - 12, ty = P2.y + P2.h - 30;
        const TX = (s) => tx0 + (s / SPAN) * (tx1 - tx0);
        line(ctx, tx0, ty, tx1, ty, c.border, 1);
        for (let k = 0; k * (1 / 60) <= SPAN; k++) { const fx = TX(k / 60); line(ctx, fx, ty - 4, fx, ty + 4, k / 60 <= Math.min(tt, waitEnd) ? c.accent : c.border, 1); }
        const rx = TX(waitEnd);
        line(ctx, rx, ty - 12, rx, ty + 8, opt === 'test' ? c.bad : c.ok, 2);
        tx(ctx, (opt === 'test' ? L.assert : L.resume + ' → ' + L.assert), Math.min(rx + 4, tx1 - 80), ty - 14, opt === 'test' ? c.bad : c.ok, {}, 120);
        tx(ctx, L.frames + ' (1.2 s)', tx1, ty + 16, c.muted, { align: 'right' });
        const ph = TX(clamp(tt, 0, SPAN));
        line(ctx, ph, ty - 8, ph, ty + 8, c.text, 2);
      }
      out(L.edit + (tt > 0 && done ? '<p>' + L.m[opt] + (opt === 'null' ? ' (' + (flaky ? '0' : '1') + ' FixedUpdate)' : '') + '</p>' : ''));
      const yl = { test: '    // (sin yield: no pasa ningún frame)', null: '    yield return null;', fixed: '    yield return new WaitForFixedUpdate();', secs: '    yield return new WaitForSeconds(1f);' }[opt];
      let src = '// Edit Mode: sin Play Mode, instantáneo\n[Test]\npublic void Damage_ArmorReducesIt()\n{\n    Assert.AreEqual(7, Combat.CalculateDamage(10, 3));\n}\n\n// Play Mode: deja pasar frames con yield\n' +
        (opt === 'test' ? '[Test]\npublic void Ball_FallsWithGravity()' : '[UnityTest]\npublic IEnumerator Ball_FallsWithGravity()') +
        '\n{\n    var ball = new GameObject("Ball").AddComponent<Rigidbody>();\n    float y0 = ball.position.y;\n' + yl + '\n    Assert.Less(ball.position.y, y0);\n}';
      if (lang === 'en') src = src.replace('sin Play Mode, instantáneo', 'no Play Mode, instant').replace('deja pasar frames con yield', 'let frames pass with yield').replace('(sin yield: no pasa ningún frame)', '(no yield: no frame passes)');
      const marks = { 1: 'hl', 4: eDone ? 'ok' : 'hl', 8: opt === 'test' ? 'bad' : 'hl', 13: tt > 0 && !done ? 'hl' : opt === 'test' ? 'bad' : '' };
      if (done && tt > 0) marks[14] = pass ? 'ok' : 'bad';
      cb(src, marks);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     7. Assembly Definitions: compilación y dependencias
     ========================================================= */

  function mountAsmdef(host, lang) {
    const L = {
      es: { single: 'Todo en Assembly-CSharp', asm: 'Con asmdefs', cyc: 'MyGame referencia a MyGame.Tests', eGame: '✎ Enemy.cs', eTest: '✎ EnemyTests.cs', eEd: '✎ LevelTool.cs',
        sub: { acs: 'juego + plugins (sin asmdef)', acse: 'scripts en carpetas Editor', tests: 'asmdef · tests', third: 'asmdef · 300 scripts', game: 'asmdef · 120 scripts', editor: 'asmdef · herramientas' },
        recompile: 'Recompilación', err: 'error', cyclic: '✗ Referencia circular detectada: Unity no compila ensamblados con dependencias cíclicas.',
        tErr: '✗ <code>error CS0246: The type or namespace name \'Enemy\' could not be found</code>. El código del juego está en <b>Assembly-CSharp</b> y un asmdef <b>no puede referenciarlo</b>. Solución: crea <code>MyGame.asmdef</code> y haz que <code>MyGame.Tests</code> lo referencie.',
        singleMsg: 'Sin asmdefs, tocar un script recompila <b>todo</b> Assembly-CSharp (también los 300 scripts de plugins) y lo que depende de él.',
        asmOk: 'Solo se recompila el ensamblado editado y los que dependen de él; <code>ThirdParty</code> no se toca.', vs: 'misma edición' },
      en: { single: 'Everything in Assembly-CSharp', asm: 'With asmdefs', cyc: 'MyGame references MyGame.Tests', eGame: '✎ Enemy.cs', eTest: '✎ EnemyTests.cs', eEd: '✎ LevelTool.cs',
        sub: { acs: 'game + plugins (no asmdef)', acse: 'scripts in Editor folders', tests: 'asmdef · tests', third: 'asmdef · 300 scripts', game: 'asmdef · 120 scripts', editor: 'asmdef · tools' },
        recompile: 'Recompile', err: 'error', cyclic: '✗ Cyclic reference detected: Unity does not compile assemblies with circular dependencies.',
        tErr: '✗ <code>error CS0246: The type or namespace name \'Enemy\' could not be found</code>. The game code is in <b>Assembly-CSharp</b> and an asmdef <b>cannot reference it</b>. Fix: create <code>MyGame.asmdef</code> and make <code>MyGame.Tests</code> reference it.',
        singleMsg: 'Without asmdefs, touching one script recompiles <b>all</b> of Assembly-CSharp (including 300 plugin scripts) and whatever depends on it.',
        asmOk: 'Only the edited assembly and the ones that depend on it recompile; <code>ThirdParty</code> is not touched.', vs: 'same edit' }
    }[lang];
    const DEF = {
      single: [{ id: 'acs', n: 'Assembly-CSharp', d: 7.0, deps: [] }, { id: 'acse', n: 'Assembly-CSharp-Editor', d: 0.6, deps: ['acs'] }, { id: 'tests', n: 'MyGame.Tests', d: 0.6, deps: ['acs'], bad: true }],
      asm: [{ id: 'third', n: 'ThirdParty', d: 4.4, deps: [] }, { id: 'game', n: 'MyGame', d: 2.0, deps: ['third'] }, { id: 'tests', n: 'MyGame.Tests', d: 0.6, deps: ['game'] }, { id: 'editor', n: 'MyGame.Editor', d: 0.4, deps: ['game'] }]
    };
    const FILE = { game: { single: 'acs', asm: 'game' }, tests: { single: 'tests', asm: 'tests' }, editor: { single: 'acse', asm: 'editor' } };
    const SPEED = 2.6;
    let mode = 'single', cyc = false, file = 'game', queue = [], qi = 0, qt = 0, elapsed = 0, state = {};
    function nodesOf(m) { const ns = DEF[m].map((x) => Object.assign({}, x, { deps: x.deps.slice() })); if (m === 'asm' && cyc) ns.find((x) => x.id === 'game').deps.push('tests'); return ns; }
    function affected(m, f) {
      const ns = nodesOf(m), start = FILE[f][m], res = [start];
      for (let i = 0; i < res.length; i++) ns.forEach((x) => { if (x.deps.indexOf(res[i]) >= 0 && res.indexOf(x.id) < 0) res.push(x.id); });
      return res;
    }
    const total = (m, f) => affected(m, f).reduce((s, id) => s + DEF[m].find((x) => x.id === id).d, 0);
    function edit(f) { file = f; queue = affected(mode, f); qi = 0; qt = 0; elapsed = 0; state = {}; }
    const ctl = controls(host);
    seg(ctl, [{ v: 'single', l: L.single }, { v: 'asm', l: L.asm }], mode, (v) => { mode = v; edit(file); });
    toggle(ctl, L.cyc, false, (v) => { cyc = v; edit(file); });
    const ctl2 = controls(host);
    button(ctl2, L.eGame, () => edit('game'), true);
    button(ctl2, L.eTest, () => edit('tests'));
    button(ctl2, L.eEd, () => edit('editor'));
    const stage = makeCanvas(host, (w) => (w < NARROW ? 262 : 214));
    const out = readout(host);
    edit('game');

    function layout(w) {
      const nar = w < NARROW, half = (w - 30) / 2;
      if (mode === 'single') return nar
        ? { acs: { x: 10, y: 10, w: w - 20, h: 50 }, tests: { x: 10, y: 120, w: half, h: 50 }, acse: { x: 20 + half, y: 120, w: half, h: 50 } }
        : { acs: { x: 14, y: 52, w: w * 0.4, h: 56 }, tests: { x: w * 0.56, y: 14, w: w * 0.4, h: 50 }, acse: { x: w * 0.56, y: 100, w: w * 0.4, h: 50 } };
      return nar
        ? { third: { x: 10, y: 8, w: w - 20, h: 44 }, game: { x: 10, y: 70, w: w - 20, h: 44 }, tests: { x: 10, y: 132, w: half, h: 44 }, editor: { x: 20 + half, y: 132, w: half, h: 44 } }
        : { third: { x: 12, y: 58, w: w * 0.24, h: 50 }, game: { x: w * 0.36, y: 58, w: w * 0.24, h: 50 }, tests: { x: w * 0.72, y: 14, w: w * 0.26, h: 50 }, editor: { x: w * 0.72, y: 102, w: w * 0.26, h: 50 } };
    }
    function edgePt(r, x2, y2) {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = x2 - cx, dy = y2 - cy;
      const s = Math.min(dx ? (r.w / 2) / Math.abs(dx) : 1e9, dy ? (r.h / 2) / Math.abs(dy) : 1e9);
      return [cx + dx * s, cy + dy * s];
    }

    const stop = loop((dt) => {
      const ns = nodesOf(mode);
      const cyclic = mode === 'asm' && cyc;
      if (!cyclic && qi < queue.length) {
        const cur = ns.find((x) => x.id === queue[qi]);
        qt += dt * SPEED; elapsed += dt * SPEED;
        state[cur.id] = { p: clamp(qt / cur.d, 0, 1) };
        if (qt >= cur.d) { state[cur.id] = { p: 1, err: !!cur.bad }; qi++; qt = 0; }
      }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const lay = layout(w);
      ns.forEach((x) => x.deps.forEach((d) => {
        const a = lay[x.id], b = lay[d];
        const bc = [b.x + b.w / 2, b.y + b.h / 2], ac = [a.x + a.w / 2, a.y + a.h / 2];
        const p1 = edgePt(a, bc[0], bc[1]), p2 = edgePt(b, ac[0], ac[1]);
        const bad = x.bad || (cyclic && (x.id === 'game' && d === 'tests' || x.id === 'tests' && d === 'game'));
        if (bad) { line(ctx, p1[0], p1[1], p2[0], p2[1], c.bad, 2, [5, 4]); tx(ctx, '✗', (p1[0] + p2[0]) / 2 + 6, (p1[1] + p2[1]) / 2, c.bad); }
        else arrow(ctx, p1[0], p1[1], p2[0], p2[1], c.muted, 1.5);
      }));
      ns.forEach((x) => {
        const r = lay[x.id], st = state[x.id];
        const inQ = queue.indexOf(x.id) >= 0;
        const fill = cyclic ? c.badSoft : st && st.err ? c.bad : st && st.p >= 1 ? c.okSoft : st ? c.warnSoft : c.soft;
        ctx.fillStyle = fill; roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
        ctx.strokeStyle = inQ ? c.accent : c.border; ctx.lineWidth = inQ ? 2 : 1; ctx.stroke();
        const fg = st && st.err ? '#fff' : c.text;
        tx(ctx, x.n, r.x + 8, r.y + 16, fg, { mono: true }, r.w - 16);
        tx(ctx, st && st.err ? '✗ ' + L.err : L.sub[x.id] + ' · ' + x.d.toFixed(1) + ' s', r.x + 8, r.y + 34, st && st.err ? '#fff' : c.muted, {}, r.w - 16);
        if (st && st.p < 1) { ctx.fillStyle = c.warn; ctx.fillRect(r.x + 4, r.y + r.h - 6, (r.w - 8) * st.p, 3); }
      });
      // barra de tiempo
      const y = h - 26, other = mode === 'single' ? 'asm' : 'single';
      const T = total(mode, file), Tmax = 9;
      tx(ctx, L.recompile + ': ' + (cyclic ? '—' : elapsed.toFixed(1) + ' s'), 12, y - 8, c.text);
      const oLab = w < NARROW ? (mode === 'single' ? 'asmdefs' : 'Assembly-CSharp') : (mode === 'single' ? L.asm : L.single);
      tx(ctx, '┆ ' + oLab + ': ' + total(other, file).toFixed(1) + ' s', w - 12, y - 8, c.muted, { align: 'right' }, w / 2 - 10);
      ctx.fillStyle = c.soft; roundRect(ctx, 12, y + 2, w - 24, 10, 5); ctx.fill();
      ctx.fillStyle = mode === 'single' ? c.bad : c.ok; roundRect(ctx, 12, y + 2, Math.max(4, (w - 24) * Math.min(elapsed, T) / Tmax), 10, 5); ctx.fill();
      const ox = 12 + (w - 24) * total(other, file) / Tmax; line(ctx, ox, y - 1, ox, y + 15, c.muted, 1.5, [3, 3]);
      const testsErr = state.tests && state.tests.err;
      out(cyclic ? L.cyclic : testsErr ? L.tErr : mode === 'single' ? L.singleMsg : L.asmOk);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     8. Depuración: breakpoints y Debug.Log en builds
     ========================================================= */

  function mountDebugging(host, lang) {
    const L = {
      es: { tBp: 'Breakpoints', tLog: 'Debug.Log en builds', attach: 'Attach to Unity (IDE)', step: 'Step Over (F10)', cont: 'Continuar (F5)',
        game: 'Juego (Play Mode)', paused: '⏸ pausado en el depurador', watch: 'Variables (Watch)', notBreak: 'solo con la ejecución detenida', frame: 'frame', status: 'Barra de estado',
        m: { off: 'El depurador no está adjuntado: el breakpoint no hace nada. Activa «Attach to Unity».', rel: '⚠️ <b>Code Optimization: Release</b>. Unity compila el código optimizado y el depurador puede saltarse el breakpoint o no mostrar variables. Cambia a <b>Debug</b> desde el icono de la barra de estado (pide recompilar).',
          run: 'Depurador adjuntado en modo Debug: espera a que se llame a <code>TakeHit</code>…', pause: '✓ Ejecución detenida en el breakpoint: el juego se congela y ves las variables. Usa Step Over o Continuar.' },
        lm: { plain: '✗ En una build de release, <code>Debug.Log</code> <b>se sigue ejecutando</b>: construye el string (basura), captura la traza y escribe en el log, cada frame.',
          off: '⚠️ <code>Debug.unityLogger.logEnabled = false</code> corta la <b>salida</b>, pero la llamada se sigue haciendo y el string de los argumentos se sigue construyendo.',
          cond: '✓ Sin el símbolo <code>ENABLE_LOGS</code>, el compilador <b>elimina la llamada y sus argumentos</b> gracias a <code>[Conditional]</code>: coste cero.',
          sym: 'Con <code>ENABLE_LOGS</code> definido (p. ej. en builds de desarrollo, en Scripting Define Symbols), los logs vuelven a funcionar con todo su coste.' },
        cpu: 'CPU por frame', gc: 'basura por frame', removed: 'llamada eliminada al compilar', st: ['Update()', 'string +', 'Debug.Log()', 'Player.log'] },
      en: { tBp: 'Breakpoints', tLog: 'Debug.Log in builds', attach: 'Attach to Unity (IDE)', step: 'Step Over (F10)', cont: 'Continue (F5)',
        game: 'Game (Play Mode)', paused: '⏸ paused in the debugger', watch: 'Variables (Watch)', notBreak: 'only while execution is stopped', frame: 'frame', status: 'Status bar',
        m: { off: 'The debugger is not attached: the breakpoint does nothing. Turn on “Attach to Unity”.', rel: '⚠️ <b>Code Optimization: Release</b>. Unity compiles optimized code and the debugger may skip the breakpoint or not show variables. Switch to <b>Debug</b> from the status bar icon (it recompiles).',
          run: 'Debugger attached in Debug mode: wait for <code>TakeHit</code> to be called…', pause: '✓ Execution stopped at the breakpoint: the game freezes and you can see the variables. Use Step Over or Continue.' },
        lm: { plain: '✗ In a release build, <code>Debug.Log</code> <b>still runs</b>: it builds the string (garbage), captures the stack trace and writes to the log, every frame.',
          off: '⚠️ <code>Debug.unityLogger.logEnabled = false</code> stops the <b>output</b>, but the call still happens and the argument string is still built.',
          cond: '✓ Without the <code>ENABLE_LOGS</code> symbol, the compiler <b>removes the call and its arguments</b> thanks to <code>[Conditional]</code>: zero cost.',
          sym: 'With <code>ENABLE_LOGS</code> defined (e.g. for development builds, in Scripting Define Symbols), logging works again with its full cost.' },
        cpu: 'CPU per frame', gc: 'garbage per frame', removed: 'call removed at compile time', st: ['Update()', 'string +', 'Debug.Log()', 'Player.log'] }
    }[lang];
    let tab = 'bp', opt = 'release', attached = true, paused = false, lineNo = -1, flash = 0, gt = 0, frames = 0, health = 50, final = null, nextHit = 1.2;
    let lmode = 'plain', pk = [], pkAcc = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: 'bp', l: L.tBp }, { v: 'log', l: L.tLog }], tab, (v) => { tab = v; sync(); });
    const c1 = row(host), c2 = row(host);
    seg(c1, [{ v: 'release', l: 'Release' }, { v: 'debug', l: 'Debug' }], opt, (v) => { opt = v; resume(); });
    toggle(c1, L.attach, true, (v) => { attached = v; resume(); });
    button(c1, L.step, () => { if (!paused) return; stepLine(); });
    button(c1, L.cont, () => { if (!paused) return; while (paused) stepLine(); }, true);
    seg(c2, [{ v: 'plain', l: 'Debug.Log' }, { v: 'off', l: 'logEnabled = false' }, { v: 'cond', l: '[Conditional]' }, { v: 'sym', l: '[Conditional] + ENABLE_LOGS' }], lmode, (v) => { lmode = v; pk = []; });
    const hfn = (w) => (tab === 'bp' ? (w < NARROW ? 236 : 170) : 170);
    const stage = makeCanvas(host, hfn);
    const out = readout(host);
    const cb = codeBlock(host);
    function sync() { c1.show(tab === 'bp'); c2.show(tab === 'log'); refit(stage, hfn); }
    sync();
    function resume() { paused = false; lineNo = -1; }
    function stepLine() {
      if (lineNo === 3) { final = 7; lineNo = 4; }
      else if (lineNo === 4) { health -= 7; lineNo = 5; }
      else { if (health <= 0) health = 50; paused = false; lineNo = -1; }
    }
    function hit() {
      final = null;
      if (attached && opt === 'debug') { paused = true; lineNo = 3; }
      else { health -= 7; if (health <= 0) health = 50; flash = 0.8; }
    }

    function drawBp(c, ctx, w, h) {
      const nar = w < NARROW;
      const G = nar ? { x: 8, y: 8, w: w - 16, h: 74 } : { x: 8, y: 8, w: w * 0.42, h: h - 50 };
      const W = nar ? { x: 8, y: 90, w: w - 16, h: 104 } : { x: G.x + G.w + 8, y: 8, w: w - G.w - 24, h: h - 50 };
      [G, W].forEach((p) => { ctx.fillStyle = c.soft; roundRect(ctx, p.x, p.y, p.w, p.h, 8); ctx.fill(); });
      tx(ctx, L.game + ' · ' + L.frame + ' ' + frames, G.x + 10, G.y + 14, c.text, {}, G.w - 20);
      const px = G.x + 14 + ((gt * 40) % Math.max(20, G.w - 170));
      box(ctx, px, G.y + G.h - 34, 22, 22, '', paused ? c.muted : c.accent, '#fff', { r: 5 });
      ctx.fillStyle = c.border; ctx.fillRect(G.x + G.w - 110, G.y + G.h - 26, 96, 8);
      ctx.fillStyle = c.ok; ctx.fillRect(G.x + G.w - 110, G.y + G.h - 26, 96 * health / 50, 8);
      tx(ctx, 'HP ' + health, G.x + G.w - 114, G.y + G.h - 22, c.text, { align: 'right' });
      if (paused) tx(ctx, L.paused, G.x + 10, G.y + 34, c.warn, {}, G.w - 20);
      tx(ctx, L.watch, W.x + 10, W.y + 14, c.text, {}, W.w - 20);
      if (paused) {
        const vars = [['damage', '10'], ['armor', '3'], ['final', final === null ? '?' : String(final)], ['health', String(health)]];
        vars.forEach((v, i) => {
          const col = i % 2, rw = nar ? (W.w - 20) / 2 : W.w - 20;
          const x = W.x + 10 + (nar ? col * rw : 0), y = W.y + 36 + (nar ? Math.floor(i / 2) * 22 : i * 20);
          tx(ctx, v[0] + ' = ' + v[1], x, y, c.text, { mono: true }, rw - 6);
        });
      } else tx(ctx, '(' + L.notBreak + ')', W.x + 10, W.y + 40, c.muted, {}, W.w - 20);
      // barra de estado
      const y = h - 18;
      ctx.fillStyle = c.soft; ctx.fillRect(0, y - 14, w, 32);
      const pw = pill(ctx, 8, y, (opt === 'debug' ? '🐞 Debug' : '⚡ Release'), opt === 'debug' ? c.ok : c.warn, '#fff');
      pill(ctx, 16 + pw, y, attached ? 'IDE: attached' : 'IDE: —', attached ? c.accentSoft : c.bg, attached ? c.accent : c.muted);
    }

    function drawLog(c, ctx, w, h) {
      const nar = w < NARROW, n = 4, gap = nar ? 6 : 10, bw = (w - 16 - gap * (n - 1)) / n, y = 18;
      const labs = nar ? ['Update', 'string', 'Log()', 'output'] : L.st;
      const active = (i) => (lmode === 'cond' ? i === 0 : lmode === 'off' ? i <= 2 : true);
      for (let i = 0; i < n; i++) {
        const x = 8 + i * (bw + gap), on = active(i);
        box(ctx, x, y, bw, 36, '', on ? c.accentSoft : c.soft, c.text, { r: 8, stroke: on ? c.accent : c.border });
        tx(ctx, labs[i], x + bw / 2, y + 18, on ? c.text : c.muted, { align: 'center', mono: !nar }, bw - 6);
        if (i && !on) tx(ctx, '✗', x + bw - 8, y + 6, c.bad, { align: 'right' });
      }
      if (lmode === 'cond') tx(ctx, L.removed, w / 2, y + 52, c.ok, { align: 'center' }, w - 16);
      pk.forEach((p) => {
        const stopAt = lmode === 'off' ? 2 : 3;
        const pos = Math.min(p, stopAt);
        const x = 8 + pos * (bw + gap) + bw / 2;
        ctx.globalAlpha = p > stopAt ? clamp(1 - (p - stopAt), 0, 1) : 1;
        dot(ctx, x, y + 52, 5, p > stopAt && lmode === 'off' ? c.bad : c.warn);
        ctx.globalAlpha = 1;
      });
      const COST = { plain: [0.35, 0.6], off: [0.03, 0.2], cond: [0, 0], sym: [0.35, 0.6] }[lmode];
      const by = 92;
      [[L.cpu, COST[0], 0.4, '≈ ' + COST[0].toFixed(2) + ' ms'], [L.gc, COST[1], 0.7, '≈ ' + COST[1].toFixed(1) + ' KB']].forEach((r, i) => {
        const yy = by + i * 34;
        tx(ctx, r[0], 10, yy, c.muted, {}, w / 2);
        tx(ctx, r[3], w - 10, yy, c.text, { align: 'right' });
        ctx.fillStyle = c.soft; roundRect(ctx, 10, yy + 10, w - 20, 10, 5); ctx.fill();
        if (r[1] > 0) { ctx.fillStyle = r[1] / r[2] > 0.5 ? c.bad : c.warn; roundRect(ctx, 10, yy + 10, (w - 20) * r[1] / r[2], 10, 5); ctx.fill(); }
      });
    }

    const stop = loop((dt) => {
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'bp') {
        if (!paused) { gt += dt; frames += Math.round(dt * 60); nextHit -= dt; if (nextHit <= 0) { nextHit = 2.4; hit(); } }
        flash = Math.max(0, flash - dt);
        drawBp(c, ctx, w, h);
        out(!attached ? L.m.off : opt === 'release' ? L.m.rel : paused ? L.m.pause : L.m.run);
        const src = 'void TakeHit(int damage)\n{\n    int armor = stats.armor;\n    int final = damage - armor;    // ● breakpoint\n    health -= final;\n    if (health <= 0) Die();\n}';
        const marks = { 3: attached ? (opt === 'debug' ? 'bad' : 'off') : 'off' };
        if (paused) marks[lineNo] = 'hl';
        else if (flash > 0) [2, 3, 4, 5].forEach((i) => { if (flash > 0.8 - (i - 1) * 0.15) marks[i] = 'hl'; });
        cb(src, marks);
      } else {
        pkAcc += dt;
        if (pkAcc > 0.5) { pkAcc = 0; if (lmode !== 'cond') pk.push(0); }
        pk = pk.map((p) => p + dt * 2.2).filter((p) => p < 4.2);
        drawLog(c, ctx, w, h);
        out(L.lm[lmode]);
        const call = lmode === 'plain' || lmode === 'off' ? '    Debug.Log("Enemy " + name + " at " + transform.position);' : '    Log.Info("Enemy " + name + " at " + transform.position);';
        let src = (lmode === 'off' ? 'void Awake() { Debug.unityLogger.logEnabled = false; }\n\n' : '') +
          (lmode === 'cond' || lmode === 'sym' ? (lmode === 'sym' ? '#define ENABLE_LOGS   // o en Player > Scripting Define Symbols\n' : '') + 'public static class Log\n{\n    [System.Diagnostics.Conditional("ENABLE_LOGS")]\n    public static void Info(string msg) => Debug.Log(msg);\n}\n\n' : '') +
          'void Update()\n{\n' + call + '\n}';
        if (lang === 'en') src = src.replace('o en Player', 'or in Player');
        const lines = src.split('\n'), marks = {};
        lines.forEach((s, i) => {
          if (s.indexOf('Enemy ') >= 0) marks[i] = lmode === 'cond' ? 'off' : 'bad';
          if (s.indexOf('Conditional') >= 0) marks[i] = 'ok';
          if (s.indexOf('logEnabled') >= 0) marks[i] = 'hl';
          if (s.indexOf('#define') >= 0) marks[i] = 'hl';
        });
        cb(src, marks);
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     9. Componentes con responsabilidad única y RequireComponent
     ========================================================= */

  function mountComponents(host, lang) {
    const L = {
      es: { tSrp: 'Responsabilidad única', tReq: 'RequireComponent', mono: 'PlayerController (2000 líneas)', comp: 'Componentes pequeños', reuse: 'Reutilizar Health en Enemy',
        lines: 'líneas', same: '✗ Mismo archivo → conflicto de merge', diff: '✓ Archivos distintos → sin conflicto', copy: '✗ copiar y pegar la vida', reused: '♻ mismo componente',
        m: { mono: 'Un solo script hace input, movimiento, vida, sonido y UI: Ana (movimiento) y Ben (vida) editan el <b>mismo archivo</b>, y el enemigo no puede reutilizar la vida sin arrastrar todo lo demás.',
          comp: 'Cada componente tiene <b>una sola responsabilidad</b>: Ana y Ben tocan archivos distintos, cada pieza se puede testear sola y <code>Health</code> sirve también para el enemigo.' },
        attr: 'Atributo [RequireComponent]', add: 'Add Component: Jump', rem: 'Quitar Rigidbody', play: '▶ Play (saltar)', reset: '↺ Reiniciar', auto: 'añadido automáticamente',
        r: { start: 'Añade el script <code>Jump</code> al GameObject.', added: '✓ Al añadir <code>Jump</code>, Unity añadió el <b>Rigidbody</b> automáticamente.', addedNo: 'Se añadió <code>Jump</code>, pero nada garantiza que haya un Rigidbody.', has: 'Jump ya está.',
          blocked: '✗ Unity no deja quitarlo: «Can\'t remove Rigidbody because Jump (Script) depends on it».', removed: 'Rigidbody eliminado. Nada lo impide sin el atributo…', noRb: 'No hay Rigidbody que quitar.',
          noJump: 'Primero añade Jump.', ok: '✓ Salta: el Rigidbody está ahí.', err: '✗ <b>MissingComponentException</b> en el Editor (<b>NullReferenceException</b> en una build): no hay Rigidbody y <code>rb</code> es null.' } },
      en: { tSrp: 'Single responsibility', tReq: 'RequireComponent', mono: 'PlayerController (2000 lines)', comp: 'Small components', reuse: 'Reuse Health on Enemy',
        lines: 'lines', same: '✗ Same file → merge conflict', diff: '✓ Different files → no conflict', copy: '✗ copy-paste the health code', reused: '♻ same component',
        m: { mono: 'One script does input, movement, health, audio and UI: Ana (movement) and Ben (health) edit the <b>same file</b>, and the enemy cannot reuse health without dragging everything else along.',
          comp: 'Each component has <b>a single responsibility</b>: Ana and Ben touch different files, each piece can be tested on its own and <code>Health</code> works for the enemy too.' },
        attr: '[RequireComponent] attribute', add: 'Add Component: Jump', rem: 'Remove Rigidbody', play: '▶ Play (jump)', reset: '↺ Reset', auto: 'added automatically',
        r: { start: 'Add the <code>Jump</code> script to the GameObject.', added: '✓ When you added <code>Jump</code>, Unity added the <b>Rigidbody</b> automatically.', addedNo: '<code>Jump</code> was added, but nothing guarantees there is a Rigidbody.', has: 'Jump is already there.',
          blocked: '✗ Unity will not remove it: “Can\'t remove Rigidbody because Jump (Script) depends on it”.', removed: 'Rigidbody removed. Without the attribute nothing prevents it…', noRb: 'There is no Rigidbody to remove.',
          noJump: 'Add Jump first.', ok: '✓ It jumps: the Rigidbody is there.', err: '✗ <b>MissingComponentException</b> in the Editor (<b>NullReferenceException</b> in a build): there is no Rigidbody and <code>rb</code> is null.' } }
    }[lang];
    const PARTS = [['Input', 'PlayerInput.cs', 150, '#8b5cf6'], ['Movement', 'PlayerMovement.cs', 320, '#3b82f6'], ['Health', 'Health.cs', 120, '#e5484d'], ['Audio', 'PlayerAudio.cs', 90, '#d97706'], ['UI', 'HealthBarUI.cs', 80, '#059669']];
    let tab = 'srp', mode = 'mono', reuse = false, rt = 0, t = 0, st = 0;
    let attr = true, comps = [], msg = L.r.start, jumpT = -1, errT = -1, dlgT = -1;
    const ctl = controls(host);
    seg(ctl, [{ v: 'srp', l: L.tSrp }, { v: 'req', l: L.tReq }], tab, (v) => { tab = v; sync(); });
    const c1 = row(host), c2 = row(host);
    seg(c1, [{ v: 'mono', l: L.mono }, { v: 'comp', l: L.comp }], mode, (v) => { mode = v; st = 0; });
    toggle(c1, L.reuse, false, (v) => { reuse = v; rt = 0; });
    toggle(c2, L.attr, attr, (v) => { attr = v; resetReq(); });
    const has = (n) => comps.some((x) => x.n === n);
    button(c2, L.add, () => {
      if (has('Jump')) { msg = L.r.has; return; }
      comps.push({ n: 'Jump (Script)', key: 'Jump', born: t });
      comps[comps.length - 1].n = 'Jump (Script)';
      if (attr && !has('Rigidbody')) { comps.push({ n: 'Rigidbody', auto: true, born: t + 0.25 }); msg = L.r.added; } else msg = attr ? L.r.added : L.r.addedNo;
    }, true);
    button(c2, L.rem, () => {
      if (!has('Rigidbody')) { msg = L.r.noRb; return; }
      if (attr && hasJump()) { msg = L.r.blocked; dlgT = t; return; }
      comps = comps.filter((x) => x.n !== 'Rigidbody'); msg = L.r.removed;
    });
    button(c2, L.play, () => {
      if (!hasJump()) { msg = L.r.noJump; return; }
      if (!has('Rigidbody')) { msg = L.r.err; errT = t; return; }
      msg = L.r.ok; jumpT = t;
    });
    button(c2, L.reset, () => resetReq());
    function hasJump() { return comps.some((x) => x.key === 'Jump'); }
    function resetReq() { comps = []; msg = L.r.start; jumpT = errT = dlgT = -1; }
    const hfn = (w) => (w < NARROW ? (tab === 'srp' ? 360 : 300) : (tab === 'srp' ? 236 : 210));
    const stage = makeCanvas(host, hfn);
    const out = readout(host);
    const cb = codeBlock(host);
    function sync() { c1.show(tab === 'srp'); c2.show(tab === 'req'); refit(stage, hfn); }
    sync();

    function drawSrp(c, ctx, w, h) {
      const nar = w < NARROW;
      const A = nar ? { x: 8, y: 8, w: w - 16, h: 228 } : { x: 8, y: 8, w: w * 0.6, h: h - 16 };
      const B = nar ? { x: 8, y: 244, w: w - 16, h: h - 252 } : { x: A.w + 16, y: 8, w: w - A.w - 24, h: h - 16 };
      [A, B].forEach((p) => { ctx.fillStyle = c.soft; roundRect(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill(); });
      tx(ctx, 'Player', A.x + 10, A.y + 14, c.muted);
      tx(ctx, 'Enemy', B.x + 10, B.y + 14, c.muted);
      const rows = [];
      if (mode === 'mono') {
        const fx = A.x + 10, fy = A.y + 26, fw = A.w - 90;
        box(ctx, fx, fy, fw, 24, '', c.bg, c.text, { r: 6, stroke: c.border });
        tx(ctx, 'PlayerController.cs · 2000 ' + L.lines, fx + 8, fy + 12, c.text, { mono: true }, fw - 16);
        PARTS.forEach((p, i) => { const y = fy + 28 + i * 28; box(ctx, fx, y, fw, 26, '', p[3], '#fff', { r: 0 }); tx(ctx, p[0], fx + 8, y + 13, '#fff', {}, fw - 16); rows.push([fx + fw, y + 13]); });
      } else {
        PARTS.forEach((p, i) => {
          const y = A.y + 26 + i * 34, fw = A.w - 90;
          box(ctx, A.x + 10, y, fw, 28, '', p[3], '#fff', { r: 6 });
          tx(ctx, p[1] + ' · ' + p[2], A.x + 18, y + 14, '#fff', { mono: !nar }, fw - 16);
          rows.push([A.x + 10 + fw, y + 14]);
        });
      }
      // Ana y Ben
      const k = clamp(st / 0.8, 0, 1);
      [[1, 'Ana', c.accent], [2, 'Ben', c.warn]].forEach((d) => {
        const r = rows[d[0]];
        arrow(ctx, r[0] + 60 - 50 * ease(k), r[1], r[0] + 4, r[1], d[2], 2);
        tx(ctx, '✎ ' + d[1], r[0] + 64 - 50 * ease(k) + 12, r[1], d[2]);
      });
      if (st > 1.2) tx(ctx, mode === 'mono' ? L.same : L.diff, A.x + 10, A.y + A.h - 12, mode === 'mono' ? c.bad : c.ok, {}, A.w - 20);
      // Enemy
      box(ctx, B.x + 10, B.y + 26, B.w - 20, 26, 'EnemyAI', c.bg, c.text, { r: 6, stroke: c.border, mono: true });
      if (reuse) {
        if (mode === 'comp') {
          const q = ease(clamp(rt / 0.8, 0, 1)), src = rows[2];
          const x = lerp(src[0] - (A.w - 90), B.x + 10, q), y = lerp(src[1] - 14, B.y + 58, q);
          box(ctx, x, y, B.w - 20, 28, 'Health.cs', PARTS[2][3], '#fff', { r: 6, mono: true });
          if (q >= 1) tx(ctx, L.reused, B.x + 10, B.y + 102, c.ok, {}, B.w - 20);
        } else tx(ctx, L.copy, B.x + 10, B.y + 70, c.bad, {}, B.w - 20);
      }
      out(L.m[mode]);
      cb('// ' + (mode === 'mono' ? 'PlayerController.cs' : 'Health.cs') + '\n' + (mode === 'mono'
        ? 'public class PlayerController : MonoBehaviour\n{\n    void Update() { ReadInput(); Move(); UpdateHealthBar(); PlayFootsteps(); }\n    public void TakeDamage(int amount) { /* vida + sonido + UI */ }\n    // ... 2000 líneas\n}'
        : 'public class Health : MonoBehaviour\n{\n    [SerializeField] int max = 100;\n    public int Current { get; private set; }\n    public event System.Action<int> Changed;\n    public void TakeDamage(int amount) { Current -= amount; Changed?.Invoke(Current); }\n}').replace('vida + sonido + UI', lang === 'en' ? 'health + audio + UI' : 'vida + sonido + UI').replace('2000 líneas', lang === 'en' ? '2000 lines' : '2000 líneas'),
      mode === 'mono' ? { 3: 'bad', 4: 'bad' } : { 6: 'ok' });
    }

    function drawReq(c, ctx, w, h) {
      const nar = w < NARROW;
      const I = nar ? { x: 8, y: 8, w: w - 16, h: 150 } : { x: 8, y: 8, w: w * 0.55, h: h - 16 };
      const S = nar ? { x: 8, y: 166, w: w - 16, h: h - 174 } : { x: I.w + 16, y: 8, w: w - I.w - 24, h: h - 16 };
      [I, S].forEach((p) => { ctx.fillStyle = c.soft; roundRect(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill(); });
      tx(ctx, 'Inspector · Player', I.x + 10, I.y + 14, c.muted, {}, I.w - 20);
      const list = [{ n: 'Transform', born: -9 }].concat(comps);
      list.forEach((cp, i) => {
        const k = ease(clamp((t - cp.born) / 0.35, 0, 1));
        if (k <= 0) return;
        const y = I.y + 28 + i * 30;
        ctx.globalAlpha = k;
        box(ctx, I.x + 10 + (1 - k) * 30, y, I.w - 20, 26, '', cp.auto && t - cp.born < 1.6 ? c.okSoft : c.bg, c.text, { r: 6, stroke: c.border });
        tx(ctx, cp.n, I.x + 20 + (1 - k) * 30, y + 13, c.text, { mono: true }, I.w - 40);
        if (cp.auto) tx(ctx, L.auto, I.x + I.w - 18, y + 13, c.ok, { align: 'right' }, (I.w - 20) / 2);
        ctx.globalAlpha = 1;
      });
      if (dlgT >= 0 && t - dlgT < 2.5) {
        const y = I.y + I.h - 38;
        box(ctx, I.x + 10, y, I.w - 20, 30, '', c.bad, '#fff', { r: 6 });
        tx(ctx, "Can't remove Rigidbody: Jump depends on it", I.x + 18, y + 15, '#fff', {}, I.w - 36);
      }
      // escena
      const gy = S.y + S.h - 22;
      line(ctx, S.x + 10, gy, S.x + S.w - 10, gy, c.border, 2);
      const jt = jumpT >= 0 ? t - jumpT : 9;
      const jy = jt < 0.8 ? Math.sin(jt / 0.8 * Math.PI) * Math.min(60, S.h - 60) : 0;
      const err = errT >= 0 && t - errT < 1.5;
      box(ctx, S.x + S.w / 2 - 14, gy - 28 - jy, 28, 28, '', err ? c.bad : c.accent, '#fff', { r: 6 });
      if (err) tx(ctx, '✗ Exception', S.x + S.w / 2, S.y + 16, c.bad, { align: 'center' });
    }

    const stop = loop((dt) => {
      t += dt; rt += dt; st += dt;
      if (st > 5) st = 0;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      if (tab === 'srp') drawSrp(c, ctx, w, h);
      else {
        drawReq(c, ctx, w, h);
        out(msg);
        cb((attr ? '[RequireComponent(typeof(Rigidbody))]\n' : '') + 'public class Jump : MonoBehaviour\n{\n    Rigidbody rb;\n    void Awake() => rb = GetComponent<Rigidbody>();\n    public void DoJump() => rb.AddForce(Vector3.up * 5f, ForceMode.Impulse);\n}',
          attr ? { 0: 'ok' } : { 4: has('Rigidbody') ? '' : 'bad', 5: has('Rigidbody') ? '' : 'bad' });
      }
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     10. Interfaces: IDamageable
     ========================================================= */

  function mountInterfaces(host, lang) {
    const L = {
      es: { iface: 'Interfaz IDamageable', chain: 'Cadena de tipos', crate: 'Añadir un tipo nuevo: Crate', none: 'sin IDamageable',
        m: { iface: 'El proyectil solo pregunta «¿implementas <code>IDamageable</code>?» y llama a <code>TakeDamage</code>, sin conocer el tipo concreto.', chain: 'El proyectil conoce cada clase: una comprobación por tipo.' },
        wall: 'Wall no implementa <code>IDamageable</code>: <code>TryGetComponent</code> devuelve false (sin generar basura) y no pasa nada.',
        crI: '✓ <code>Crate</code> implementa <code>IDamageable</code> y recibe daño <b>sin tocar el proyectil</b> (principio abierto/cerrado).',
        crC: '✗ <code>Crate</code> no recibe daño: hay que <b>editar el proyectil</b> y añadir otro <code>else if</code> por cada tipo nuevo.' },
      en: { iface: 'IDamageable interface', chain: 'Type-check chain', crate: 'Add a new type: Crate', none: 'no IDamageable',
        m: { iface: 'The projectile only asks “do you implement <code>IDamageable</code>?” and calls <code>TakeDamage</code>, without knowing the concrete type.', chain: 'The projectile knows every class: one check per type.' },
        wall: 'Wall does not implement <code>IDamageable</code>: <code>TryGetComponent</code> returns false (without allocating garbage) and nothing happens.',
        crI: '✓ <code>Crate</code> implements <code>IDamageable</code> and takes damage <b>without touching the projectile</b> (open/closed principle).',
        crC: '✗ <code>Crate</code> takes no damage: you must <b>edit the projectile</b> and add another <code>else if</code> for every new type.' }
    }[lang];
    let mode = 'iface', crate = false, tgt = 0, p = 0, last = null;
    const T = () => [{ n: 'Enemy', dmg: true, chain: 1 }, { n: 'Barrel', dmg: true, chain: 2 }, { n: 'Door', dmg: true, chain: 3 }, { n: 'Wall', dmg: false }].concat(crate ? [{ n: 'Crate', dmg: true }] : []);
    let hp = { Enemy: 30, Barrel: 30, Door: 30, Wall: 30, Crate: 30 }, flash = {};
    const ctl = controls(host);
    seg(ctl, [{ v: 'iface', l: L.iface }, { v: 'chain', l: L.chain }], mode, (v) => { mode = v; });
    toggle(ctl, L.crate, false, (v) => { crate = v; if (v) { tgt = 4; p = 0; } else if (tgt > 3) tgt = 0; });
    const stage = makeCanvas(host, 170);
    const out = readout(host);
    const cb = codeBlock(host);

    const stop = loop((dt) => {
      const ts = T();
      p += dt * 1.3;
      if (p >= 1) {
        p = 0;
        const o = ts[tgt % ts.length];
        const takes = o.dmg && (mode === 'iface' || o.chain);
        last = { o, takes };
        if (takes) { hp[o.n] -= 10; if (hp[o.n] <= 0) hp[o.n] = 30; flash[o.n] = 0.4; }
        tgt = (tgt + 1) % ts.length;
      }
      Object.keys(flash).forEach((k) => { flash[k] = Math.max(0, flash[k] - dt); });
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const n = ts.length, cw = (w - 16) / n, nar = w < NARROW;
      if (nar) tx(ctx, '✓ = IDamageable', 10, 98, c.accent);
      ts.forEach((o, i) => {
        const x = 8 + i * cw + 4, bw = cw - 8;
        const fl = flash[o.n] > 0;
        box(ctx, x, 14, bw, 40, o.n, fl ? c.bad : o.dmg ? c.accentSoft : c.soft, fl ? '#fff' : c.text, { r: 8, stroke: o.dmg ? c.accent : c.border });
        if (o.dmg) {
          ctx.fillStyle = c.border; ctx.fillRect(x + 6, 60, bw - 12, 5);
          ctx.fillStyle = c.ok; ctx.fillRect(x + 6, 60, (bw - 12) * hp[o.n] / 30, 5);
          tx(ctx, nar ? '✓' : 'IDamageable', x + bw / 2, 78, c.accent, { align: 'center' }, bw - 4);
        } else tx(ctx, nar ? '—' : L.none, x + bw / 2, 78, c.muted, { align: 'center' }, bw - 4);
        if (o.n === 'Crate' && mode === 'chain') tx(ctx, '✗', x + bw - 8, 22, c.bad, { align: 'right' });
      });
      // proyectil
      const ti = tgt % n, tx0 = w / 2, ty0 = h - 22, tx1 = 8 + ti * cw + cw / 2, ty1 = 58;
      box(ctx, tx0 - 16, ty0 - 8, 32, 16, '', c.muted, '#fff', { r: 4 });
      const q = ease(p);
      dot(ctx, lerp(tx0, tx1, q), lerp(ty0 - 8, ty1, q), 5, c.warn);
      let msg = L.m[mode];
      if (last) {
        if (last.o.n === 'Wall') msg += '<p>' + L.wall + '</p>';
        else if (last.o.n === 'Crate') msg += '<p>' + (mode === 'iface' ? L.crI : L.crC) + '</p>';
        else msg += '<p>→ ' + code(last.o.n + '.TakeDamage(10)') + '</p>';
      }
      out(msg);
      const src = mode === 'iface'
        ? 'public interface IDamageable { void TakeDamage(int amount); }\n' + (crate ? 'public class Crate : MonoBehaviour, IDamageable { ... }\n' : '') +
          '\nvoid OnTriggerEnter(Collider other)\n{\n    if (other.TryGetComponent(out IDamageable target))\n        target.TakeDamage(10);\n}'
        : 'void OnTriggerEnter(Collider other)\n{\n    if (other.TryGetComponent(out Enemy e)) e.TakeDamage(10);\n    else if (other.TryGetComponent(out Barrel b)) b.TakeDamage(10);\n    else if (other.TryGetComponent(out Door d)) d.TakeDamage(10);\n' +
          (crate ? (lang === 'es' ? '    // ✗ Crate: hay que editar este archivo\n' : '    // ✗ Crate: you must edit this file\n') : '') + '}';
      const marks = {};
      if (mode === 'iface') { const off = crate ? 1 : 0; marks[4 + off] = 'hl'; if (last && last.takes) marks[5 + off] = 'ok'; if (crate) marks[1] = 'ok'; }
      else { if (last && last.o.chain) marks[1 + last.o.chain] = 'ok'; if (crate) marks[5] = 'bad'; }
      cb(src, marks);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     11. Acceso y serialización de campos
     ========================================================= */

  function mountAccess(host, lang) {
    const L = {
      es: { rows: ['¿Se ve en el Inspector?', '¿Se guarda con la escena/prefab?', '¿Otras clases pueden cambiarlo?'], rowsS: ['¿Inspector?', '¿Se guarda?', '¿Otras clases?'], errS: 'CS0122: inaccesible', goal: 'objetivo', now: 'este', ph: ['1 · El diseñador pone Speed = 8 en el Inspector', '2 · Guardar y recargar la escena', '3 · Enemy.cs: player.speed = 99;'],
        hidden: '(no aparece en el Inspector)', err: 'error CS0122: \'Player.speed\' es inaccesible por su nivel de protección', set: 'compila: cualquiera puede cambiarlo',
        m: { pub: '<code>public</code> se ve y se guarda, pero <b>cualquier clase</b> puede modificarlo: rompe la encapsulación.', priv: '<code>private</code> sin atributo: ni se ve ni se serializa.',
          sf: '✓ <code>[SerializeField] private</code>: Unity lo serializa y lo muestra, pero el código de otras clases no puede tocarlo. Es justo lo que buscas.',
          hide: '<code>[HideInInspector] public</code>: se serializa pero se oculta en el Inspector, y sigue siendo público.', nsp: '<code>[NonSerialized] public</code>: no se guarda ni se muestra, pero es público.', nspr: '<code>[NonSerialized] private</code>: no se guarda ni se muestra (igual que private).' } },
      en: { rows: ['Shown in the Inspector?', 'Saved with the scene/prefab?', 'Can other classes change it?'], rowsS: ['Inspector?', 'Saved?', 'Other classes?'], errS: 'CS0122: inaccessible', goal: 'goal', now: 'this', ph: ['1 · The designer sets Speed = 8 in the Inspector', '2 · Save and reload the scene', '3 · Enemy.cs: player.speed = 99;'],
        hidden: '(not shown in the Inspector)', err: 'error CS0122: \'Player.speed\' is inaccessible due to its protection level', set: 'compiles: anyone can change it',
        m: { pub: '<code>public</code> is shown and saved, but <b>any class</b> can modify it: it breaks encapsulation.', priv: '<code>private</code> with no attribute: neither shown nor serialized.',
          sf: '✓ <code>[SerializeField] private</code>: Unity serializes and shows it, but other classes’ code cannot touch it. Exactly what you want.',
          hide: '<code>[HideInInspector] public</code>: serialized but hidden in the Inspector, and still public.', nsp: '<code>[NonSerialized] public</code>: not saved or shown, but public.', nspr: '<code>[NonSerialized] private</code>: not saved or shown (same as private).' } }
    }[lang];
    const D = [
      { v: 'pub', l: 'public float speed;', s: [1, 1, 1] }, { v: 'priv', l: 'private float speed;', s: [0, 0, 0] },
      { v: 'sf', l: '[SerializeField] private float speed;', s: [1, 1, 0] }, { v: 'hide', l: '[HideInInspector] public float speed;', s: [0, 1, 1] },
      { v: 'nsp', l: '[NonSerialized] public float speed;', s: [0, 0, 1] }, { v: 'nspr', l: '[NonSerialized] private float speed;', s: [0, 0, 0] }
    ];
    const GOAL = [1, 1, 0];
    let sel = 'pub', t = 0;
    const ctl = controls(host);
    seg(ctl, D.map((d) => ({ v: d.v, l: d.l.replace(' float speed;', '') })), sel, (v) => { sel = v; t = 0; });
    const stage = makeCanvas(host, (w) => (w < NARROW ? 300 : 196));
    const out = readout(host);
    const cb = codeBlock(host);

    const stop = loop((dt) => {
      t += dt;
      if (t > 8) t = 0;
      const d = D.find((x) => x.v === sel);
      const [shown, saved, open] = d.s;
      const phase = t < 2.4 ? 0 : t < 4.8 ? 1 : 2;
      // valor actual
      let val = 5;
      if (shown && t > 1) val = 8;
      if (phase >= 1 && t > 3.6 && !saved) val = 5;
      if (phase === 2 && t > 6 && open) val = 99;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = w < NARROW;
      const I = nar ? { x: 8, y: 8, w: w - 16, h: 92 } : { x: 8, y: 8, w: w * 0.42, h: 106 };
      const G = nar ? { x: 8, y: 108, w: w - 16, h: 100 } : { x: I.w + 16, y: 8, w: w - I.w - 24, h: 106 };
      const E = nar ? { x: 8, y: 216, w: w - 16, h: h - 224 } : { x: 8, y: 122, w: w - 16, h: h - 130 };
      [I, G, E].forEach((p) => { ctx.fillStyle = c.soft; roundRect(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill(); });
      tx(ctx, 'Inspector · Player (Script)', I.x + 10, I.y + 14, c.muted, {}, I.w - 20);
      if (shown) {
        tx(ctx, 'Speed', I.x + 10, I.y + 46, c.text);
        const fx = I.x + 70, fw = Math.min(110, I.w - 80);
        box(ctx, fx, I.y + 34, fw, 24, String(val), phase === 0 && t > 1 && t < 1.8 ? c.accentSoft : c.bg, c.text, { r: 5, stroke: c.border, mono: true });
      } else tx(ctx, L.hidden, I.x + 10, I.y + 46, c.muted, {}, I.w - 20);
      tx(ctx, 'speed = ' + val + (phase === 2 && open && t > 6 ? '  (runtime)' : ''), I.x + 10, I.y + I.h - 14, c.muted, { mono: true }, I.w - 20);
      // cuadrícula
      const cx1 = G.x + G.w - 96, cx2 = G.x + G.w - 40;
      tx(ctx, L.now, cx1, G.y + 12, c.muted, { align: 'center' });
      tx(ctx, L.goal, cx2, G.y + 12, c.muted, { align: 'center' });
      (nar ? L.rowsS : L.rows).forEach((r, i) => {
        const y = G.y + 34 + i * 26;
        tx(ctx, r, G.x + 10, y, c.text, {}, cx1 - G.x - 40);
        const v = d.s[i], match = v === GOAL[i];
        box(ctx, cx1 - 14, y - 10, 28, 20, v ? '✓' : '✗', match ? c.ok : c.bad, '#fff', { r: 5 });
        box(ctx, cx2 - 14, y - 10, 28, 20, GOAL[i] ? '✓' : '✗', c.bg, c.muted, { r: 5, stroke: c.border });
      });
      // fases
      tx(ctx, L.ph[phase], E.x + 10, E.y + 16, c.text, {}, E.w - 20);
      if (phase === 1) {
        const ok = saved;
        tx(ctx, ok ? '💾 speed = ' + val + ' ✓' : '💾 speed → 5 (' + (lang === 'es' ? 'se pierde' : 'lost') + ')', E.x + 10, E.y + 42, t > 3.6 ? (ok ? c.ok : c.bad) : c.muted, { mono: true }, E.w - 20);
      }
      if (phase === 2) {
        const q = ease(clamp((t - 4.8) / 1.2, 0, 1));
        const ax = E.x + 20, ex = E.x + E.w * 0.6;
        if (t <= 6) dot(ctx, lerp(ax, ex, q), E.y + 42, 6, open ? c.warn : c.bad);
        else tx(ctx, open ? '✓ ' + L.set : '✗ ' + (nar ? L.errS : L.err), E.x + 10, E.y + 42, open ? c.warn : c.bad, { mono: !open }, E.w - 20);
      }
      out(L.m[sel]);
      cb('public class Player : MonoBehaviour\n{\n    ' + d.l + '\n}\n\npublic class Enemy : MonoBehaviour\n{\n    void Slow(Player player) { player.speed = 99; }\n}', { 2: sel === 'sf' ? 'ok' : 'hl', 7: open ? 'hl' : 'bad' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     12. Namespaces y colisiones de nombres
     ========================================================= */

  function mountNamespaces(host, lang) {
    const L = {
      es: { mine: 'Mi Timer', glob: 'sin namespace', ns: 'namespace MyGame.Core', asset: 'El asset usa namespace ThirdParty.Tools', use: 'Spawner.cs usa:', yours: 'tuyo', theirs: 'asset',
        m: { dup: '✗ <code>error CS0101: The namespace \'&lt;global namespace&gt;\' already contains a definition for \'Timer\'</code>. Las dos clases viven en el namespace global y chocan.',
          okG: '✓ Compila, pero solo porque el asset sí usa namespace. Tu <code>Timer</code> global sigue expuesto a chocar con el próximo asset.',
          shadow: '⚠️ Compila, pero <code>Timer</code> se resuelve al <b>Timer global del asset</b>: los tipos del namespace global ganan a las directivas <code>using</code>. Llamar a tus métodos daría <code>CS1061</code>. Usa el nombre completo o pon el código en tu namespace.',
          ok: '✓ Sin ambigüedad: <code>Timer</code> es <code>MyGame.Core.Timer</code>, el tuyo.',
          nons: '✗ <code>error CS0246</code>: el namespace <code>ThirdParty.Tools</code> no existe, porque este asset no usa namespace (su Timer está en el global).',
          amb: '✗ <code>error CS0104: \'Timer\' is an ambiguous reference between \'MyGame.Core.Timer\' and \'ThirdParty.Tools.Timer\'</code>. Usa el nombre completo o un alias.' } },
      en: { mine: 'My Timer', glob: 'no namespace', ns: 'namespace MyGame.Core', asset: 'The asset uses namespace ThirdParty.Tools', use: 'Spawner.cs uses:', yours: 'yours', theirs: 'asset',
        m: { dup: '✗ <code>error CS0101: The namespace \'&lt;global namespace&gt;\' already contains a definition for \'Timer\'</code>. Both classes live in the global namespace and clash.',
          okG: '✓ It compiles, but only because the asset does use a namespace. Your global <code>Timer</code> can still clash with the next asset.',
          shadow: '⚠️ It compiles, but <code>Timer</code> resolves to the <b>asset’s global Timer</b>: types in the global namespace win over <code>using</code> directives. Calling your methods would give <code>CS1061</code>. Use the fully qualified name or put the code in your namespace.',
          ok: '✓ No ambiguity: <code>Timer</code> is <code>MyGame.Core.Timer</code>, yours.',
          nons: '✗ <code>error CS0246</code>: the namespace <code>ThirdParty.Tools</code> does not exist, because this asset uses no namespace (its Timer is global).',
          amb: '✗ <code>error CS0104: \'Timer\' is an ambiguous reference between \'MyGame.Core.Timer\' and \'ThirdParty.Tools.Timer\'</code>. Use the fully qualified name or an alias.' } }
    }[lang];
    let mineNs = false, assetNs = false, use = 'using', t = 0;
    const ctl = controls(host);
    seg(ctl, [{ v: false, l: L.mine + ': ' + L.glob }, { v: true, l: L.ns }], mineNs, (v) => { mineNs = v; t = 0; ctl2.style.opacity = v ? '' : '.45'; });
    toggle(ctl, L.asset, false, (v) => { assetNs = v; t = 0; });
    const ctl2 = controls(host);
    ctl2.appendChild(el('span', 'muted small', L.use));
    ctl2.style.opacity = '.45';
    seg(ctl2, [{ v: 'using', l: 'using MyGame.Core;' }, { v: 'fq', l: 'MyGame.Core.Timer' }, { v: 'both', l: 'using MyGame.Core; using ThirdParty.Tools;' }], use, (v) => { use = v; t = 0; });
    const stage = makeCanvas(host, (w) => (w < NARROW ? 330 : 220));
    const out = readout(host);
    const cb = codeBlock(host);

    function result() {
      if (!mineNs && !assetNs) return { k: 'dup', to: null };
      if (!mineNs) return { k: 'okG', to: 'mineG' };
      if (use === 'fq') return { k: 'ok', to: 'mineN' };
      if (!assetNs) return use === 'both' ? { k: 'nons', to: null } : { k: 'shadow', to: 'assetG' };
      return use === 'both' ? { k: 'amb', to: null } : { k: 'ok', to: 'mineN' };
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const nar = w < NARROW;
      const r = result();
      // árbol de namespaces
      const items = [{ d: 0, n: '(global)', ns: true }];
      if (!mineNs) items.push({ d: 1, n: 'Timer', who: 'yours', id: 'mineG' });
      if (!assetNs) items.push({ d: 1, n: 'Timer', who: 'theirs', id: 'assetG' });
      items.push({ d: 1, n: 'MyGame', ns: true }, { d: 2, n: 'Core', ns: true });
      if (mineNs) items.push({ d: 3, n: 'Timer', who: 'yours', id: 'mineN' });
      items.push({ d: 3, n: 'GameClock' }, { d: 2, n: 'UI', ns: true }, { d: 3, n: 'HealthBar' }, { d: 1, n: 'ThirdParty', ns: true }, { d: 2, n: 'Tools', ns: true });
      if (assetNs) items.push({ d: 3, n: 'Timer', who: 'theirs', id: 'assetN' });
      items.push({ d: 3, n: 'Tween' });
      const TW = nar ? w - 16 : w * 0.5;
      const rowH = Math.min(17, (nar ? 200 : h - 16) / items.length);
      const pos = {};
      items.forEach((it, i) => {
        const x = 14 + it.d * 18, y = 14 + i * rowH;
        if (it.d) line(ctx, x - 12, y, x - 4, y, c.border, 1);
        const clash = r.k === 'dup' && it.n === 'Timer';
        const amb = r.k === 'amb' && it.n === 'Timer';
        const col = clash || amb ? c.bad : it.ns ? c.muted : it.who ? (it.who === 'yours' ? c.accent : c.warn) : c.text;
        tx(ctx, (it.ns ? '{ } ' : '') + it.n, x, y, col, { mono: true });
        if (it.who) { ctx.font = K.MONO; const nw = ctx.measureText(it.n).width; pill(ctx, x + nw + 8, y, it.who === 'yours' ? L.yours : L.theirs, it.who === 'yours' ? c.accentSoft : c.warnSoft, it.who === 'yours' ? c.accent : c.warn); pos[it.id] = [x + nw + 60, y]; }
      });
      // Spawner
      const S = nar ? { x: 8, y: h - 104, w: w - 16, h: 96 } : { x: TW + 16, y: 30, w: w - TW - 24, h: 110 };
      ctx.fillStyle = c.soft; roundRect(ctx, S.x, S.y, S.w, S.h, 10); ctx.fill();
      tx(ctx, 'Spawner.cs', S.x + 10, S.y + 14, c.muted);
      const decl = !mineNs ? 'Timer timer;' : use === 'fq' ? 'MyGame.Core.Timer timer;' : 'Timer timer;';
      tx(ctx, decl, S.x + 10, S.y + 40, c.text, { mono: true }, S.w - 20);
      const res = r.k === 'dup' ? '✗ CS0101' : r.k === 'amb' ? '✗ CS0104' : r.k === 'nons' ? '✗ CS0246' : r.k === 'shadow' ? '⚠️ → Timer (asset)' : '✓ → Timer (' + L.yours + ')';
      const rc = r.k === 'dup' || r.k === 'amb' || r.k === 'nons' ? c.bad : r.k === 'shadow' ? c.warn : c.ok;
      tx(ctx, res, S.x + 10, S.y + 66, rc, { mono: true }, S.w - 20);
      if (r.to && pos[r.to]) {
        const q = ease(clamp(t / 0.9, 0, 1));
        const sx = nar ? S.x + S.w / 2 : S.x, sy = nar ? S.y : S.y + 40;
        const e = pos[r.to];
        line(ctx, sx, sy, lerp(sx, e[0], q), lerp(sy, e[1], q), rc, 2, [5, 4]);
        if (q >= 1) dot(ctx, e[0], e[1], 4, rc);
      }
      out(L.m[r.k]);
      const timer = mineNs ? 'namespace MyGame.Core\n{\n    public class Timer { public void StartCountdown(float s) { } }\n}' : 'public class Timer { public void StartCountdown(float s) { } }';
      const usings = !mineNs ? '' : use === 'using' ? 'using MyGame.Core;\n' : use === 'both' ? 'using MyGame.Core;\nusing ThirdParty.Tools;\n' : '';
      const src = '// Timer.cs\n' + timer + '\n\n// Spawner.cs\n' + usings + 'public class Spawner : MonoBehaviour\n{\n    ' + decl + '\n}';
      const lines = src.split('\n'), marks = {};
      lines.forEach((s, i) => { if (s.indexOf('Timer timer') >= 0) marks[i] = r.k === 'ok' || r.k === 'okG' ? 'ok' : r.k === 'shadow' ? 'hl' : 'bad'; if (s.indexOf('namespace MyGame') >= 0) marks[i] = 'ok'; if (r.k === 'nons') { if (s.indexOf('using ThirdParty') >= 0) marks[i] = 'bad'; else if (s.indexOf('Timer timer') >= 0) marks[i] = 'off'; } });
      cb(src, marks);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* =========================================================
     13. Esperar en Unity 6: Awaitable vs Task.Delay vs corrutina vs Thread.Sleep
     ========================================================= */

  function mountAwaitable(host, lang) {
    const L = {
      es: { start: '▶ Esperar 2 s', destroy: 'Destroy(gameObject)', ts: 'Time.timeScale = 0', exit: '■ Salir de Play Mode', frame: 'frame', waiting: 'esperando', boss: '👹 SpawnBoss()', destroyed: 'GameObject destruido', destroyedS: 'destruido', frozenS: '❄ congelado', paused: 'timeScale = 0', edit: 'Edit Mode', frozen: '❄ hilo principal congelado',
        log: { start: 'Empieza la espera de 2 s.', cancel: '✓ Cancelada: OperationCanceledException (destroyCancellationToken). SpawnBoss no se ejecuta.', coStop: '✓ La corrutina se detiene con su GameObject. SpawnBoss no se ejecuta.',
          ghost: '✗ Task.Delay no sabe nada del objeto: 2 s después SpawnBoss() se ejecuta sobre un objeto destruido → MissingReferenceException.', exitT: '✗ Task.Delay sigue corriendo fuera de Play Mode: SpawnBoss() se ejecuta en el Editor.',
          boss: '✓ Pasaron los 2 s: SpawnBoss().', ignore: '⚠️ Task.Delay usa tiempo real: ignora Time.timeScale.', respect: 'La espera se congela: respeta Time.timeScale.', sleepTs: 'Thread.Sleep usa tiempo real: timeScale no le afecta (y el juego sigue congelado).', sleep: '✗ Thread.Sleep bloquea el hilo principal: el juego no pinta frames ni procesa nada durante 2 s.' },
        notes: { aw: '<code>Awaitable</code> se integra con el player loop: respeta <code>timeScale</code>, vuelve al hilo principal y se cancela con <code>destroyCancellationToken</code>.', task: '<code>Task.Delay</code> no conoce Unity: tiempo real, sigue tras destruir el objeto o salir de Play Mode y da problemas en WebGL.',
          co: 'La corrutina funciona, pero <code>yield return</code> solo vale en un método <code>IEnumerator</code> lanzado con <code>StartCoroutine</code>: en un método <code>async</code> no compila.', sleep: '<code>Thread.Sleep</code> congela el hilo principal: nunca lo uses para esperar en un juego.' } },
      en: { start: '▶ Wait 2 s', destroy: 'Destroy(gameObject)', ts: 'Time.timeScale = 0', exit: '■ Exit Play Mode', frame: 'frame', waiting: 'waiting', boss: '👹 SpawnBoss()', destroyed: 'GameObject destroyed', destroyedS: 'destroyed', frozenS: '❄ frozen', paused: 'timeScale = 0', edit: 'Edit Mode', frozen: '❄ main thread frozen',
        log: { start: 'The 2 s wait starts.', cancel: '✓ Cancelled: OperationCanceledException (destroyCancellationToken). SpawnBoss does not run.', coStop: '✓ The coroutine stops with its GameObject. SpawnBoss does not run.',
          ghost: '✗ Task.Delay knows nothing about the object: 2 s later SpawnBoss() runs on a destroyed object → MissingReferenceException.', exitT: '✗ Task.Delay keeps running outside Play Mode: SpawnBoss() runs in the Editor.',
          boss: '✓ 2 s passed: SpawnBoss().', ignore: '⚠️ Task.Delay uses real time: it ignores Time.timeScale.', respect: 'The wait freezes: it respects Time.timeScale.', sleepTs: 'Thread.Sleep uses real time: timeScale does not affect it (and the game stays frozen).', sleep: '✗ Thread.Sleep blocks the main thread: the game renders no frames and processes nothing for 2 s.' },
        notes: { aw: '<code>Awaitable</code> is integrated with the player loop: it respects <code>timeScale</code>, resumes on the main thread and is cancelled by <code>destroyCancellationToken</code>.', task: '<code>Task.Delay</code> knows nothing about Unity: real time, it keeps going after the object is destroyed or Play Mode ends, and it misbehaves in WebGL.',
          co: 'The coroutine works, but <code>yield return</code> is only valid in an <code>IEnumerator</code> method started with <code>StartCoroutine</code>: in an <code>async</code> method it does not compile.', sleep: '<code>Thread.Sleep</code> freezes the main thread: never use it to wait in a game.' } }
    }[lang];
    const M = [{ v: 'aw', l: 'Awaitable' }, { v: 'task', l: 'Task.Delay' }, { v: 'co', l: 'Coroutine' }, { v: 'sleep', l: 'Thread.Sleep' }];
    let m = 'aw', waiting = false, prog = 0, alive = true, play = true, scale = 1, frames = 0, ang = 0, logs = [], frozen = 0, done = null;
    function reset() { waiting = false; prog = 0; alive = true; play = true; frozen = 0; done = null; logs = []; }
    function log(s) { logs.push(s); if (logs.length > 3) logs.shift(); }
    const ctl = controls(host);
    seg(ctl, M, m, (v) => { m = v; reset(); });
    const ctl2 = controls(host);
    button(ctl2, L.start, () => { reset(); waiting = true; log(L.log.start); if (m === 'sleep') { frozen = 2; log(L.log.sleep); } }, true);
    button(ctl2, L.destroy, () => {
      if (frozen > 0 || !alive || !play) return;
      alive = false;
      if (!waiting) return;
      if (m === 'aw') { waiting = false; done = 'cancel'; log(L.log.cancel); }
      else if (m === 'co') { waiting = false; done = 'cancel'; log(L.log.coStop); }
    });
    toggle(ctl2, L.ts, false, (v) => { scale = v ? 0 : 1; if (v && waiting) log(m === 'task' ? L.log.ignore : m === 'sleep' ? L.log.sleepTs : L.log.respect); });
    button(ctl2, L.exit, () => {
      if (frozen > 0 || !play) return;
      play = false; alive = false;
      if (!waiting) return;
      if (m === 'task') return;
      waiting = false; done = 'cancel'; log(m === 'aw' ? L.log.cancel : L.log.coStop);
    });
    const stage = makeCanvas(host, 150);
    const out = readout(host);
    const cb = codeBlock(host);

    const stop = loop((dt) => {
      if (frozen > 0) {
        frozen -= dt;
        prog = clamp(1 - frozen / 2, 0, 1);
        if (frozen <= 0) { waiting = false; done = 'boss'; log(L.log.boss); }
      } else {
        if (play) { frames++; ang += dt * 3 * scale; }
        if (waiting) {
          const rate = m === 'task' ? 1 : (play ? scale : 0);
          prog += dt * rate / 2;
          if (prog >= 1) {
            prog = 1; waiting = false;
            if (m === 'task' && !play) { done = 'bad'; log(L.log.exitT); }
            else if (m === 'task' && !alive) { done = 'bad'; log(L.log.ghost); }
            else { done = 'boss'; log(L.log.boss); }
          }
        }
      }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      // vista de juego
      const gw = Math.min(150, w * 0.38);
      ctx.fillStyle = c.soft; roundRect(ctx, 8, 8, gw, h - 16, 10); ctx.fill();
      tx(ctx, play ? L.frame + ' ' + frames : L.edit, 16, 22, play ? c.text : c.muted, {}, gw - 16);
      if (alive) {
        ctx.save(); ctx.translate(8 + gw / 2, h / 2 + 8); ctx.rotate(ang);
        ctx.fillStyle = frozen > 0 ? c.muted : c.accent; ctx.fillRect(-16, -16, 32, 32); ctx.restore();
      } else tx(ctx, '💥', 8 + gw / 2, h / 2 + 8, c.bad, { align: 'center' });
      if (frozen > 0) tx(ctx, '❄', 8 + gw - 12, 22, c.accent, { align: 'right' });
      // estado de la espera
      const x0 = gw + 24, x1 = w - 12, bw = x1 - x0;
      tx(ctx, M.find((x) => x.v === m).l, x0, 22, c.text, { mono: true }, bw);
      ctx.fillStyle = c.soft; roundRect(ctx, x0, 36, bw, 16, 8); ctx.fill();
      const col = done === 'cancel' ? c.muted : done === 'bad' ? c.bad : done === 'boss' ? c.ok : c.warn;
      ctx.fillStyle = col; roundRect(ctx, x0, 36, Math.max(prog > 0 ? 8 : 0, bw * prog), 16, 8); ctx.fill();
      tx(ctx, (prog * 2).toFixed(1) + ' / 2.0 s', x0, 66, c.muted);
      const tags = [];
      const sm = w < NARROW;
      if (frozen > 0) tags.push([sm ? L.frozenS : L.frozen, c.bad]);
      if (!alive) tags.push([sm ? L.destroyedS : L.destroyed, c.bad]);
      if (scale === 0) tags.push([L.paused, c.warn]);
      if (!play) tags.push([L.edit, c.muted]);
      let ty = 90, tx2 = x0;
      tags.forEach((tg) => { ctx.font = K.FONT; const tw = ctx.measureText(tg[0]).width + 14; if (tx2 + tw > x1) { tx2 = x0; ty += 24; } pill(ctx, tx2, ty, tg[0], tg[1], '#fff'); tx2 += tw + 6; });
      if (done === 'boss' || done === 'bad') tx(ctx, L.boss + (done === 'bad' ? ' ✗' : ' ✓'), x0, h - 14, done === 'bad' ? c.bad : c.ok, {}, bw);
      out((logs.length ? logs.map((s) => '<div>' + s + '</div>').join('') : '') + '<p class="muted">' + L.notes[m] + '</p>');
      const src = {
        aw: 'async void Start()\n{\n    await Awaitable.WaitForSecondsAsync(2f, destroyCancellationToken);\n    SpawnBoss();\n}',
        task: 'async void Start()\n{\n    await Task.Delay(2000);   // System.Threading.Tasks\n    SpawnBoss();\n}',
        co: 'IEnumerator Start()          // corrutina, no async\n{\n    yield return new WaitForSeconds(2f);\n    SpawnBoss();\n}',
        sleep: 'void Start()\n{\n    Thread.Sleep(2000);       // bloquea el hilo principal\n    SpawnBoss();\n}'
      }[m];
      cb(lang === 'en' ? src.replace('corrutina, no async', 'coroutine, not async').replace('bloquea el hilo principal', 'blocks the main thread') : src,
        { 2: waiting || frozen > 0 ? 'hl' : m === 'aw' ? 'ok' : m === 'co' ? '' : 'bad', 3: done === 'boss' ? 'ok' : done === 'bad' ? 'bad' : done === 'cancel' ? 'off' : '' });
    });
    return () => { stop(); stage.destroy(); };
  }

  UCP.concepts.push(
    {
      id: 'feature-branches', questions: ['team-20'], domain: 'team', practice: { d: 'team', t: 'Control de versiones' }, icon: '🌿', mount: mountBranches,
      text: {
        es: {
          title: 'Ramas por funcionalidad y pull requests',
          summary: 'Cada funcionalidad se desarrolla en su **rama**, y entra en `main` mediante un **pull request** con revisión de código y tests automáticos (CI). Así `main` siempre funciona. Crea una rama, haz commits (también uno con bug), abre el PR, ejecuta el CI, aprueba y fusiona. Después compáralo con «Todos en main».',
          points: ['Ramas por funcionalidad: el trabajo en curso queda aislado.', 'Pull request: revisión de código + CI antes del merge.', 'Protección de rama: no se fusiona sin CI en verde y aprobación.', 'Commits directos en main: un error rompe la build de todo el equipo.', 'Fusionar una vez al final del proyecto o usar `push --force` genera conflictos enormes y pérdida de trabajo.']
        },
        en: {
          title: 'Feature branches and pull requests',
          summary: 'Each feature is built on its own **branch** and reaches `main` through a **pull request** with code review and automated tests (CI). That way `main` always works. Create a branch, commit (including a buggy commit), open the PR, run CI, approve and merge. Then compare it with “Everyone on main”.',
          points: ['Feature branches: work in progress stays isolated.', 'Pull request: code review + CI before merging.', 'Branch protection: no merge without green CI and an approval.', 'Committing straight to main: one mistake breaks the build for the whole team.', 'Merging once at the end of the project or using `push --force` causes huge conflicts and lost work.']
        }
      }
    },
    {
      id: 'tests-edit-play', questions: ['team-07', 'team-08'], domain: 'team', practice: { d: 'team', t: 'Testing' }, icon: '✅', mount: mountTests,
      text: {
        es: {
          title: 'Tests de Edit Mode y Play Mode',
          summary: 'Con el **Unity Test Framework**, la lógica pura como `CalculateDamage` se prueba en **Edit Mode** con `[Test]`: es instantáneo y no entra en Play Mode. Si necesitas frames, física o tiempo, usa **Play Mode** con `[UnityTest]`, que devuelve `IEnumerator` y hace `yield`. Prueba cada forma de esperar y mira si la bola llega a caer.',
          points: ['Edit Mode + `[Test]`: lógica pura, rápido, sin Play Mode.', 'Play Mode + `[UnityTest]`: corrutina que deja pasar frames con `yield`.', '`yield return null` = un frame; `WaitForFixedUpdate` = un paso de física; `WaitForSeconds` = tiempo de juego.', 'Un `[Test]` es síncrono: no pasa ningún frame, así que la física no avanza.']
        },
        en: {
          title: 'Edit Mode and Play Mode tests',
          summary: 'With the **Unity Test Framework**, pure logic such as `CalculateDamage` is tested in **Edit Mode** with `[Test]`: it is instant and does not enter Play Mode. When you need frames, physics or time, use **Play Mode** with `[UnityTest]`, which returns `IEnumerator` and `yield`s. Try each way of waiting and see whether the ball actually falls.',
          points: ['Edit Mode + `[Test]`: pure logic, fast, no Play Mode.', 'Play Mode + `[UnityTest]`: a coroutine that lets frames pass with `yield`.', '`yield return null` = one frame; `WaitForFixedUpdate` = one physics step; `WaitForSeconds` = game time.', 'A `[Test]` is synchronous: no frame passes, so physics does not advance.']
        }
      }
    },
    {
      id: 'asmdef', questions: ['team-09', 'team-10'], domain: 'team', practice: { d: 'team', t: 'Estructura de código' }, icon: '📚', mount: mountAsmdef,
      text: {
        es: {
          title: 'Assembly Definitions',
          summary: 'Sin asmdefs, todos tus scripts (y los de plugins) se compilan en **Assembly-CSharp**, así que cualquier cambio lo recompila todo. Con **Assembly Definitions** el código se reparte en ensamblados con dependencias declaradas. Edita distintos archivos en cada modo y compara el tiempo; fíjate también en qué pasa con los tests.',
          points: ['Solo se recompila el ensamblado cambiado y los que dependen de él.', 'Las dependencias se declaran: Unity rechaza las referencias circulares.', 'Un asmdef **no puede** referenciar `Assembly-CSharp`: mueve el juego a `MyGame.asmdef`.', '`MyGame.Tests.asmdef` referencia a `MyGame` (y a los ensamblados de test).', 'No aceleran el código en runtime ni reducen la build.']
        },
        en: {
          title: 'Assembly Definitions',
          summary: 'Without asmdefs, all your scripts (and plugin scripts) compile into **Assembly-CSharp**, so any change recompiles everything. With **Assembly Definitions** the code is split into assemblies with declared dependencies. Edit different files in each mode and compare the time; also watch what happens to the tests.',
          points: ['Only the changed assembly and the ones that depend on it recompile.', 'Dependencies are declared: Unity rejects circular references.', 'An asmdef **cannot** reference `Assembly-CSharp`: move the game into `MyGame.asmdef`.', '`MyGame.Tests.asmdef` references `MyGame` (and the test assemblies).', 'They do not make runtime code faster or the build smaller.']
        }
      }
    },
    {
      id: 'depuracion', questions: ['team-11', 'team-12'], domain: 'team', practice: { d: 'team', t: 'Depuración' }, icon: '🐞', mount: mountDebugging,
      text: {
        es: {
          title: 'Depuración: breakpoints y Debug.Log',
          summary: 'Para detenerte en una línea e inspeccionar variables, pon un **breakpoint** y adjunta el depurador del IDE al Editor (**Attach to Unity**) con Code Optimization en **Debug**. Y ojo: en una build de release, `Debug.Log` **se sigue ejecutando**. Prueba ambas pestañas y cambia cada opción.',
          points: ['Breakpoint + Attach to Unity (Visual Studio, Rider o VS Code).', 'En **Release** el código se optimiza y los breakpoints pueden no detenerse: cambia a **Debug** en la barra de estado.', 'En builds: Development Build + Script Debugging.', '`Debug.Log` no se elimina de las builds; `logEnabled = false` solo corta la salida.', 'Wrapper con `[System.Diagnostics.Conditional("ENABLE_LOGS")]`: el compilador quita la llamada y sus argumentos.']
        },
        en: {
          title: 'Debugging: breakpoints and Debug.Log',
          summary: 'To stop at a line and inspect variables, set a **breakpoint** and attach the IDE debugger to the Editor (**Attach to Unity**) with Code Optimization set to **Debug**. And note: in a release build, `Debug.Log` **still runs**. Try both tabs and change each option.',
          points: ['Breakpoint + Attach to Unity (Visual Studio, Rider or VS Code).', 'In **Release** code is optimized and breakpoints may not stop: switch to **Debug** from the status bar.', 'For builds: Development Build + Script Debugging.', '`Debug.Log` is not stripped from builds; `logEnabled = false` only stops the output.', 'Wrapper with `[System.Diagnostics.Conditional("ENABLE_LOGS")]`: the compiler removes the call and its arguments.']
        }
      }
    },
    {
      id: 'componentes-srp', questions: ['team-13', 'team-17'], domain: 'team', practice: { d: 'team', t: 'Estructura de código' }, icon: '🧱', mount: mountComponents,
      text: {
        es: {
          title: 'Componentes pequeños y RequireComponent',
          summary: 'Un `PlayerController` de 2000 líneas que lo hace todo es difícil de mantener, de testear y de compartir. Divídelo en componentes con **responsabilidad única**. Y cuando un script necesita otro componente, decláralo con `[RequireComponent]`. Compara monolito y componentes, y en la segunda pestaña añade y quita componentes.',
          points: ['Un componente = una responsabilidad (`PlayerMovement`, `Health`, `PlayerAudio`...).', 'Piezas reutilizables (`Health` en el enemigo) y menos conflictos de merge.', '`static`, ScriptableObject o `partial` no resuelven el problema de diseño.', '`[RequireComponent(typeof(Rigidbody))]` añade el Rigidbody al agregar el script e impide quitarlo.', 'Sin él: `MissingComponentException` / `NullReferenceException` en runtime.']
        },
        en: {
          title: 'Small components and RequireComponent',
          summary: 'A 2000-line `PlayerController` that does everything is hard to maintain, test and share. Split it into components with a **single responsibility**. And when a script needs another component, declare it with `[RequireComponent]`. Compare monolith and components, and in the second tab add and remove components.',
          points: ['One component = one responsibility (`PlayerMovement`, `Health`, `PlayerAudio`...).', 'Reusable pieces (`Health` on the enemy) and fewer merge conflicts.', '`static`, a ScriptableObject or `partial` classes do not fix the design problem.', '`[RequireComponent(typeof(Rigidbody))]` adds the Rigidbody when you add the script and prevents removing it.', 'Without it: `MissingComponentException` / `NullReferenceException` at runtime.']
        }
      }
    },
    {
      id: 'interfaces', questions: ['team-14'], domain: 'team', practice: { d: 'team', t: 'Estructura de código' }, icon: '🔌', mount: mountInterfaces,
      text: {
        es: {
          title: 'Interfaces: IDamageable',
          summary: 'El proyectil no necesita saber si golpea a un enemigo, un barril o una puerta: le basta con que el objeto implemente `IDamageable`. Compara la interfaz con una cadena de comprobaciones por tipo y añade un tipo nuevo (Crate) para ver cuál de las dos versiones hay que modificar.',
          points: ['Programa contra interfaces: desacopla sistemas.', 'Tipos nuevos sin tocar el proyectil (principio abierto/cerrado).', '`GetComponent` y `TryGetComponent` funcionan con interfaces.', '`TryGetComponent` no genera basura si el componente no existe.']
        },
        en: {
          title: 'Interfaces: IDamageable',
          summary: 'The projectile does not need to know whether it hits an enemy, a barrel or a door: it only needs the object to implement `IDamageable`. Compare the interface with a chain of type checks and add a new type (Crate) to see which version has to change.',
          points: ['Program against interfaces: it decouples systems.', 'New types without touching the projectile (open/closed principle).', '`GetComponent` and `TryGetComponent` work with interfaces.', '`TryGetComponent` allocates no garbage when the component is missing.']
        }
      }
    },
    {
      id: 'acceso-serializacion', questions: ['team-16'], domain: 'team', practice: { d: 'team', t: 'Estructura de código' }, icon: '🔒', mount: mountAccess,
      text: {
        es: {
          title: 'Campos: Inspector, serialización y acceso',
          summary: 'Que un campo se vea en el Inspector, que se guarde con la escena y que otras clases puedan cambiarlo son tres cosas distintas. Elige cada declaración y mira las tres comprobaciones y la animación: el diseñador lo edita, se recarga la escena y otra clase intenta escribirlo.',
          points: ['`[SerializeField] private`: visible y serializado, pero encapsulado.', '`public`: visible y serializado, pero cualquier clase lo modifica.', '`[HideInInspector]`: se serializa pero no se muestra.', '`[NonSerialized]`: ni se guarda ni se muestra.']
        },
        en: {
          title: 'Fields: Inspector, serialization and access',
          summary: 'Whether a field shows in the Inspector, whether it is saved with the scene and whether other classes can change it are three different things. Pick each declaration and watch the three checks and the animation: the designer edits it, the scene reloads and another class tries to write it.',
          points: ['`[SerializeField] private`: shown and serialized, but encapsulated.', '`public`: shown and serialized, but any class can modify it.', '`[HideInInspector]`: serialized but not shown.', '`[NonSerialized]`: neither saved nor shown.']
        }
      }
    },
    {
      id: 'namespaces', questions: ['team-21'], domain: 'team', practice: { d: 'team', t: 'Estructura de código' }, icon: '📛', mount: mountNamespaces,
      text: {
        es: {
          title: 'Namespaces: evitar colisiones de nombres',
          summary: 'Tu clase `Timer` y la de un asset de la Asset Store no pueden convivir en el namespace global. Mete tu código en un **namespace** propio y refiérete a él con `using` o con el nombre completo. Cambia las opciones y mira cómo se resuelve `Timer` en el árbol.',
          points: ['Namespace propio para tu código (`MyGame.Core`, `MyGame.UI`...).', 'Sin namespaces: `CS0101`, tipo definido dos veces.', 'Con dos `using` que traen el mismo nombre: `CS0104`, referencia ambigua → nombre completo o alias.', '`internal`, `partial` o la carpeta `Plugins` no resuelven el choque.']
        },
        en: {
          title: 'Namespaces: avoiding name clashes',
          summary: 'Your `Timer` class and an Asset Store asset’s `Timer` cannot both live in the global namespace. Put your code in its own **namespace** and refer to it with `using` or the fully qualified name. Change the options and watch how `Timer` resolves in the tree.',
          points: ['Your own namespace for your code (`MyGame.Core`, `MyGame.UI`...).', 'No namespaces: `CS0101`, type defined twice.', 'Two `using` directives bringing the same name: `CS0104`, ambiguous reference → fully qualified name or alias.', '`internal`, `partial` or the `Plugins` folder do not fix the clash.']
        }
      }
    },
    {
      id: 'awaitable', questions: ['team-23'], domain: 'team', practice: { d: 'team', t: 'Estructura de código' }, icon: '⌛', mount: mountAwaitable,
      text: {
        es: {
          title: 'Esperar en Unity 6: Awaitable',
          summary: 'Hay muchas formas de «esperar 2 segundos», pero no todas respetan el ciclo de vida de Unity. Elige un método, pulsa Esperar y, durante la espera, destruye el objeto, pon `Time.timeScale = 0` o sal de Play Mode. Observa quién se cancela, quién se pausa y quién se cuelga.',
          points: ['`await Awaitable.WaitForSecondsAsync(2f, destroyCancellationToken)`: respeta `timeScale`, vuelve al hilo principal y se cancela al destruir el objeto.', '`Task.Delay`: tiempo real, sigue tras destruir el objeto o salir de Play Mode y falla en WebGL.', '`yield return` solo funciona en corrutinas (`IEnumerator`).', '`Thread.Sleep` congela el hilo principal.']
        },
        en: {
          title: 'Waiting in Unity 6: Awaitable',
          summary: 'There are many ways to “wait 2 seconds”, but not all of them respect Unity’s lifecycle. Pick a method, press Wait and, while waiting, destroy the object, set `Time.timeScale = 0` or exit Play Mode. See which one cancels, which one pauses and which one hangs.',
          points: ['`await Awaitable.WaitForSecondsAsync(2f, destroyCancellationToken)`: respects `timeScale`, resumes on the main thread and is cancelled when the object is destroyed.', '`Task.Delay`: real time, keeps going after the object is destroyed or Play Mode ends, and fails in WebGL.', '`yield return` only works in coroutines (`IEnumerator`).', '`Thread.Sleep` freezes the main thread.']
        }
      }
    }
  );
})();
