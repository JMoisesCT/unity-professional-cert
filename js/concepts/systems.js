/* Conceptos animados: systems (Programar sistemas de aplicación) */
(function () {
  'use strict';
  const K = UCP.conceptKit;
  const { colors, el, makeCanvas, loop, controls, button, seg, slider, toggle, readout, roundRect, text, code, codeBlock, arrow, box, lerp, clamp, ease, esc } = K;

  /* ---------------------------------------------------------
     Utilidades privadas
     --------------------------------------------------------- */

  function tw(ctx, s, mono) { ctx.font = mono ? K.MONO : K.FONT; return ctx.measureText(s).width; }
  // Recorta el texto con "…" si no cabe en max píxeles.
  function fit(ctx, s, max, mono) {
    if (tw(ctx, s, mono) <= max) return s;
    while (s.length > 1 && tw(ctx, s + '…', mono) > max) s = s.slice(0, -1);
    return s + '…';
  }
  // Caja con texto centrado que nunca se sale de la caja.
  function node(ctx, x, y, w, h, label, fill, color, opts) {
    opts = opts || {};
    box(ctx, x, y, w, h, '', fill, color, opts);
    if (label) text(ctx, fit(ctx, label, w - 10, opts.mono), x + w / 2, y + h / 2, color, { align: 'center', mono: opts.mono });
  }
  function dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function line(ctx, x1, y1, x2, y2, color, w, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 1;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (dash) ctx.setLineDash([]);
  }
  // Zona con título (escenas, carpetas, paneles).
  function zone(ctx, x, y, w, h, title, c, opts) {
    opts = opts || {};
    ctx.fillStyle = opts.fill || c.soft;
    roundRect(ctx, x, y, w, h, 10); ctx.fill();
    if (opts.stroke) {
      ctx.strokeStyle = opts.stroke; ctx.lineWidth = 1.5;
      if (opts.dash) ctx.setLineDash(opts.dash);
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (title) text(ctx, fit(ctx, title, w - 16), x + 8, y + 13, opts.titleColor || c.muted);
  }
  // Chip con ancho ajustado al texto. Devuelve el ancho.
  function chip(ctx, cx, cy, label, fill, color, mono) {
    const wd = tw(ctx, label, mono) + 14;
    box(ctx, cx - wd / 2, cy - 11, wd, 22, label, fill, color, { mono, r: 6 });
    return wd;
  }
  const mix2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  // Pestañas: una fila con seg y un contenedor por pestaña (se muestran/ocultan).
  function tabs(host, items, value, onChange) {
    const bar = controls(host);
    const panes = {};
    items.forEach((it) => { panes[it.v] = el('div'); host.appendChild(panes[it.v]); });
    const apply = (v) => Object.keys(panes).forEach((k) => { panes[k].style.display = k === v ? '' : 'none'; });
    seg(bar, items, value, (v) => { apply(v); onChange(v); });
    apply(value);
    return panes;
  }
  const ok = (s) => '<b style="color:var(--ok)">✓</b> ' + s;
  const bad = (s) => '<b style="color:var(--bad)">✗</b> ' + s;
  const warn = (s) => '<b style="color:var(--warn)">⚠</b> ' + s;

  /* ---------------------------------------------------------
     1. JsonUtility y PlayerPrefs: qué se puede guardar
     --------------------------------------------------------- */

  function mountJson(host, lang) {
    const L = {
      es: { gate: 'JsonUtility.ToJson', hint: 'Activa o desactiva campos de la clase SaveData:', prop: 'propiedad',
        ignored: 'Ignorados <b>sin error ni aviso</b>:', none: 'Todos los campos activos se serializan.',
        why: { dict: '<code>Dictionary</code> no es serializable para Unity', prop: 'las propiedades no se serializan (solo campos)', priv: 'campo privado sin <code>[SerializeField]</code>' },
        cmt: { dict: '// ✗ Dictionary', prop: '// ✗ propiedad', priv: '// ✗ private' },
        store: 'PlayerPrefs', where: 'Windows: registro (HKCU\\Software\\…)', key: 'clave', val: 'valor', type: 'tipo',
        saved: 'Guardado como', compile: 'No compila: <code>PlayerPrefs</code> no tiene <code>SetBool</code> (error CS0117).',
        fix: 'Guarda el bool como int: <code>SetInt(key, value ? 1 : 0)</code> y léelo con <code>GetInt(key) == 1</code>.',
        only: 'Solo existen <code>SetInt</code>, <code>SetFloat</code> y <code>SetString</code> (y sus <code>Get</code>).',
        insecure: 'No es seguro (el jugador puede editarlo) ni sirve para datos complejos: úsalo para ajustes.',
        noBool: 'CS0117: SetBool no existe', tap: 'Elige qué guardar:' },
      en: { gate: 'JsonUtility.ToJson', hint: 'Toggle the fields of the SaveData class:', prop: 'property',
        ignored: 'Ignored <b>with no error or warning</b>:', none: 'Every enabled field is serialized.',
        why: { dict: '<code>Dictionary</code> is not serializable by Unity', prop: 'properties are not serialized (fields only)', priv: 'private field without <code>[SerializeField]</code>' },
        cmt: { dict: '// ✗ Dictionary', prop: '// ✗ property', priv: '// ✗ private' },
        store: 'PlayerPrefs', where: 'Windows: registry (HKCU\\Software\\…)', key: 'key', val: 'value', type: 'type',
        saved: 'Stored as', compile: 'Does not compile: <code>PlayerPrefs</code> has no <code>SetBool</code> (error CS0117).',
        fix: 'Store the bool as an int: <code>SetInt(key, value ? 1 : 0)</code> and read it with <code>GetInt(key) == 1</code>.',
        only: 'Only <code>SetInt</code>, <code>SetFloat</code> and <code>SetString</code> exist (plus their <code>Get</code>).',
        insecure: 'It is not secure (players can edit it) and not meant for complex data: use it for settings.',
        noBool: 'CS0117: no SetBool', tap: 'Choose what to save:' }
    }[lang];

    const FIELDS = [
      { id: 'level', t: 'int', decl: 'public int level = 3;', raw: '"level":3', ok: true },
      { id: 'tutorialDone', t: 'bool', decl: 'public bool tutorialDone = true;', raw: '"tutorialDone":true', ok: true },
      { id: 'items', t: 'List<string>', decl: 'public List<string> items;', raw: '"items":["sword","potion"]', ok: true },
      { id: 'inventory', t: 'Dictionary', decl: 'public Dictionary<string, int> inventory;', ok: false, why: 'dict' },
      { id: 'Volume', t: L.prop, decl: 'public float Volume { get; set; }', ok: false, why: 'prop' },
      { id: 'playerName', t: '[SerializeField]', decl: '[SerializeField] private string playerName;', raw: '"playerName":"Ana"', ok: true },
      { id: 'secret', t: 'private', decl: 'private int secret;', ok: false, why: 'priv' }
    ];
    const on = FIELDS.map(() => true);
    let tab = 'json', t = 0;

    const panes = tabs(host, [{ v: 'json', l: 'JsonUtility' }, { v: 'prefs', l: 'PlayerPrefs' }], tab, (v) => { tab = v; t = 0; });
    panes.json.appendChild(el('p', 'muted small', L.hint));
    const grid = el('div', 'bit-grid');
    panes.json.appendChild(grid);
    const tiles = FIELDS.map((f, i) => {
      const b = el('button', 'bit on', '<small>' + esc(f.t) + '</small>' + f.id);
      b.type = 'button';
      b.addEventListener('click', () => { on[i] = !on[i]; b.classList.toggle('on', on[i]); t = 0; });
      grid.appendChild(b);
      return b;
    });
    void tiles;

    const OPS = [
      { v: 'int', l: 'int', call: 'PlayerPrefs.SetInt("level", 3);', short: 'SetInt("level", 3)', key: 'level', val: '3', type: 'int', read: 'int level = PlayerPrefs.GetInt("level", 1);' },
      { v: 'float', l: 'float', call: 'PlayerPrefs.SetFloat("volume", 0.8f);', short: 'SetFloat("volume", 0.8f)', key: 'volume', val: '0.8', type: 'float', read: 'float vol = PlayerPrefs.GetFloat("volume", 1f);' },
      { v: 'string', l: 'string', call: 'PlayerPrefs.SetString("name", "Ana");', short: 'SetString("name", "Ana")', key: 'name', val: '"Ana"', type: 'string', read: 'string n = PlayerPrefs.GetString("name", "");' },
      { v: 'bool', l: 'bool: SetBool?', call: 'PlayerPrefs.SetBool("music", true);', short: 'SetBool("music", true)', fail: true },
      { v: 'bool01', l: 'bool → SetInt 0/1', call: 'PlayerPrefs.SetInt("music", musicOn ? 1 : 0);', short: 'SetInt("music", 1)', key: 'music', val: '1', type: 'int', read: 'bool musicOn = PlayerPrefs.GetInt("music", 1) == 1;' }
    ];
    let op = OPS[3];
    const stored = [];
    const pc = controls(panes.prefs);
    pc.appendChild(el('span', 'muted small', L.tap));
    seg(pc, OPS.map((o) => ({ v: o.v, l: o.l })), op.v, (v) => { op = OPS.find((o) => o.v === v); t = 0; });

    const stage = makeCanvas(host, (w) => (tab === 'json' ? (w < 560 ? 296 : 240) : (w < 560 ? 250 : 170)));
    const out = readout(host);
    const cb = codeBlock(host);

    function drawJson(ctx, w, h, c) {
      const fl = FIELDS.filter((f, i) => on[i]);
      const okList = fl.filter((f) => f.ok);
      const narrow = w < 560;
      let chipW, chipPos, gatePt, jsonX, jsonW, jsonTop;
      if (!narrow) {
        chipW = Math.min(180, w * 0.3);
        chipPos = (k) => [12, 14 + k * 28];
        const gx = 12 + chipW + 40;
        gatePt = (k) => [gx, 25 + k * 28];
        ctx.fillStyle = c.accentSoft; roundRect(ctx, gx - 7, 8, 14, h - 40, 7); ctx.fill();
        text(ctx, L.gate, Math.max(gx, 80), h - 14, c.accent, { align: 'center', mono: true });
        jsonX = gx + 34; jsonW = w - jsonX - 12; jsonTop = 14;
      } else {
        chipW = (w - 36) / 2;
        chipPos = (k) => [12 + (k % 2) * (chipW + 12), 10 + Math.floor(k / 2) * 28];
        const gy = 128;
        gatePt = (k) => [chipPos(k)[0] + chipW / 2, gy + 10];
        box(ctx, 12, gy, w - 24, 20, L.gate, c.accentSoft, c.accent, { mono: true, r: 6 });
        jsonX = 12; jsonW = w - 24; jsonTop = gy + 32;
      }
      // Caja JSON
      const n = okList.length;
      ctx.fillStyle = c.bg; ctx.strokeStyle = c.border; ctx.lineWidth = 1;
      roundRect(ctx, jsonX, jsonTop, jsonW, (n + 2) * 20 + 8, 8); ctx.fill(); ctx.stroke();
      const lineY = (j) => jsonTop + 14 + j * 20;
      text(ctx, '{', jsonX + 10, lineY(0), c.text, { mono: true });
      text(ctx, '}', jsonX + 10, lineY(n + 1), c.text, { mono: true });
      // Chips de la clase y paquetes
      fl.forEach((f, k) => {
        const [x, y] = chipPos(k);
        box(ctx, x, y, chipW, 22, '', c.soft, c.text, { r: 6, stroke: c.border, lw: 1 });
        text(ctx, fit(ctx, f.id, chipW - 12, true), x + 8, y + 11, c.text, { mono: true });
        const start = 0.2 + k * 0.3;
        const p1 = clamp((t - start) / 0.8, 0, 1);
        const from = [x + chipW / 2, y + 11];
        if (narrow) from[1] = y + 22;
        const g = gatePt(k);
        if (t < start) return;
        if (p1 < 1) { chip(ctx, ...mix2(from, g, ease(p1)), f.id, c.accent, '#fff', true); return; }
        const q = (t - start - 0.8) / 0.7;
        if (f.ok) {
          const j = okList.indexOf(f) + 1;
          const dest = [jsonX + 14 + (tw(ctx, f.id, true) + 14) / 2, lineY(j)];
          if (q < 1) chip(ctx, ...mix2(g, dest, ease(clamp(q, 0, 1))), f.id, c.ok, '#fff', true);
          else {
            const s = f.raw.replace(':', ': ') + (j < n ? ',' : '');
            text(ctx, fit(ctx, '  ' + s, jsonW - 16, true), jsonX + 10, lineY(j), c.ok, { mono: true });
          }
        } else if (q < 1) {
          ctx.globalAlpha = 1 - clamp(q, 0, 1);
          const sh = Math.sin(q * 40) * 4 * (1 - q);
          chip(ctx, g[0] + sh, g[1], '✗ ' + f.id, c.bad, '#fff', true);
          ctx.globalAlpha = 1;
        }
      });
      const T = Math.max(4.5, fl.length * 0.3 + 4.2);
      if (t > T) t = 0;
      const json = '{' + okList.map((f) => f.raw).join(',') + '}';
      const ign = fl.filter((f) => !f.ok);
      out(code('JsonUtility.ToJson(data)') + ' → ' + code(esc(json)) +
        '<p>' + (ign.length ? L.ignored + ' ' + ign.map((f) => '<b>' + f.id + '</b> (' + L.why[f.why] + ')').join(' · ') : L.none) + '</p>');
      cb(['[System.Serializable]', 'public class SaveData', '{']
        .concat(fl.map((f) => '    ' + f.decl + (f.ok ? '' : '  ' + L.cmt[f.why])))
        .concat(['}', '', 'string json = JsonUtility.ToJson(data);']).join('\n'),
      fl.reduce((m, f, k) => { m[3 + k] = f.ok ? 'ok' : 'bad'; return m; }, {}));
    }

    function drawPrefs(ctx, w, h, c) {
      const narrow = w < 560;
      const src = narrow ? [w / 2, 26] : [Math.min(150, w * 0.22), h / 2];
      const tx = narrow ? 12 : w * 0.46, ty = narrow ? 88 : 14, tW = narrow ? w - 24 : w * 0.54 - 12;
      chip(ctx, src[0], src[1], op.short, c.soft, c.text, true);
      // Tabla del almacén
      ctx.fillStyle = c.soft; roundRect(ctx, tx, ty, tW, h - ty - 10, 10); ctx.fill();
      text(ctx, L.store, tx + 10, ty + 14, c.text);
      text(ctx, fit(ctx, L.where, tW - 100), tx + tW - 10, ty + 14, c.muted, { align: 'right' });
      const cols = [tx + 10, tx + tW * 0.42, tx + tW * 0.74];
      [L.key, L.val, L.type].forEach((s, i) => text(ctx, s, cols[i], ty + 38, c.muted));
      line(ctx, tx + 8, ty + 48, tx + tW - 8, ty + 48, c.border, 1);
      const rowY = (i) => ty + 64 + i * 22;
      const p = clamp(t / 0.9, 0, 1);
      const idx = op.fail ? -1 : stored.findIndex((r) => r.key === op.key);
      const target = op.fail ? null : (idx >= 0 ? idx : stored.length);
      if (!op.fail && p >= 1 && idx < 0) stored.push({ key: op.key, val: op.val, type: op.type });
      if (!op.fail && p >= 1 && idx >= 0) stored[idx].val = op.val;
      stored.forEach((r, i) => {
        const fresh = r.key === op.key && t < 1.6 && !op.fail;
        if (fresh) { ctx.fillStyle = c.okSoft; ctx.fillRect(tx + 6, rowY(i) - 10, tW - 12, 20); }
        text(ctx, r.key, cols[0], rowY(i), c.text, { mono: true });
        text(ctx, r.val, cols[1], rowY(i), c.text, { mono: true });
        text(ctx, r.type, cols[2], rowY(i), c.muted, { mono: true });
      });
      if (op.fail) {
        const wallX = narrow ? w / 2 : (src[0] + tx) / 2 + 30, wallY = narrow ? 50 : src[1];
        const q = clamp(t / 0.6, 0, 1);
        const pos = narrow ? [wallX, lerp(src[1] + 12, wallY, q)] : [lerp(src[0] + 60, wallX, q), wallY];
        if (narrow) line(ctx, w / 2 - 70, 52, w / 2 + 70, 52, c.bad, 3);
        else line(ctx, wallX + 8, wallY - 30, wallX + 8, wallY + 30, c.bad, 3);
        if (t < 1.6) dot(ctx, pos[0] + (q >= 1 ? Math.sin(t * 40) * 2 : 0), pos[1], 6, c.bad);
        text(ctx, L.noBool, narrow ? w / 2 : wallX + 8, narrow ? 60 + 0 : wallY + 44, c.bad, { align: 'center', base: narrow ? 'top' : 'middle' });
      } else if (p < 1) {
        const tgt = narrow ? [tx + 40, rowY(target)] : [tx + 30, rowY(target)];
        const from = narrow ? [src[0], src[1] + 12] : [src[0] + tw(ctx, op.short, true) / 2 + 8, src[1]];
        const pt = mix2(from, tgt, ease(p));
        dot(ctx, pt[0], pt[1], 6, c.accent);
      }
      out((op.fail ? bad(L.compile) + '<p>' + L.fix + '</p>' : ok(code(esc(op.call)) + ' → ' + L.saved + ' <b>' + op.type + '</b>')) +
        '<p>' + L.only + ' ' + L.insecure + '</p>');
      cb(op.fail ? op.call + '  // ✗ CS0117' : op.call + '\n' + op.read, op.fail ? { 0: 'bad' } : { 0: 'ok' });
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w } = stage;
      const want = tab === 'json' ? (w < 560 ? 296 : 240) : (w < 560 ? 250 : 170);
      if (stage.h !== want) resizeStage(stage, want);
      ctx.clearRect(0, 0, w, stage.h);
      if (tab === 'json') drawJson(ctx, w, stage.h, c); else drawPrefs(ctx, w, stage.h, c);
    });
    return () => { stop(); stage.destroy(); };
  }

  // Cambia la altura de un stage sin esperar al ResizeObserver (las pestañas cambian el alto deseado).
  function resizeStage(stage, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    stage.h = h;
    stage.cv.width = Math.round(stage.w * dpr);
    stage.cv.height = Math.round(h * dpr);
    stage.cv.style.height = h + 'px';
    stage.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------------------------------------------------
     2. Rutas de guardado: persistentDataPath y el flujo ToJson → File
     --------------------------------------------------------- */

  function mountSavePaths(host, lang) {
    const L = {
      es: { save: 'Guardar', load: 'Cargar', update: 'Actualizar la app', clean: 'Limpieza del SO', reset: 'Reiniciar',
        legend: '✍️ escribible · ⬆️ sobrevive a actualizaciones · 🧹 el SO puede borrarla',
        saved: 'Archivo escrito en', loaded: 'Partida cargada: <code>level = 3</code>.',
        missing: '<code>File.Exists</code> devuelve <code>false</code>: no hay partida guardada (se empieza de cero).',
        ro: { android: 'solo lectura: está dentro del APK', ios: 'solo lectura: está dentro del bundle de la app', webgl: 'es una URL del servidor: no se puede escribir', win: '' },
        winData: 'puede ser de solo lectura (p. ej. en Program Files) y se reemplaza al actualizar',
        cache: 'se escribe, pero el SO puede vaciar la caché cuando necesita espacio',
        hard: 'ruta fija: no existe fuera de Windows y en <code>C:\\</code> suele faltar permiso',
        compile: 'No compila: <code>JsonUtility.Save</code> no existe (CS0117). JsonUtility solo convierte a/desde texto.',
        tostr: '<code>data.ToString()</code> escribe <code>"SaveData"</code> (el nombre del tipo), no los datos.',
        parse: '<code>FromJson</code> lanza <code>ArgumentException</code>: el archivo no contiene JSON.',
        wiped: 'Archivo borrado por', upd: 'la actualización (se reemplaza la carpeta de instalación)', os: 'el sistema operativo (limpieza de caché)',
        example: 'Ruta de ejemplo', file: 'archivo', pathLbl: 'Ruta' },
      en: { save: 'Save', load: 'Load', update: 'Update the app', clean: 'OS cleanup', reset: 'Reset',
        legend: '✍️ writable · ⬆️ survives updates · 🧹 the OS may delete it',
        saved: 'File written to', loaded: 'Game loaded: <code>level = 3</code>.',
        missing: '<code>File.Exists</code> returns <code>false</code>: there is no save (a new game starts).',
        ro: { android: 'read-only: it is inside the APK', ios: 'read-only: it is inside the app bundle', webgl: 'it is a server URL: cannot be written', win: '' },
        winData: 'may be read-only (e.g. in Program Files) and is replaced on update',
        cache: 'it is written, but the OS may empty the cache when it needs space',
        hard: 'hard-coded path: it does not exist outside Windows and <code>C:\\</code> usually lacks permission',
        compile: 'Does not compile: <code>JsonUtility.Save</code> does not exist (CS0117). JsonUtility only converts to/from text.',
        tostr: '<code>data.ToString()</code> writes <code>"SaveData"</code> (the type name), not the data.',
        parse: '<code>FromJson</code> throws <code>ArgumentException</code>: the file does not contain JSON.',
        wiped: 'File deleted by', upd: 'the update (the install folder is replaced)', os: 'the operating system (cache cleanup)',
        example: 'Example path', file: 'file', pathLbl: 'Path' }
    }[lang];

    const PATHS = ['dataPath', 'streamingAssetsPath', 'persistentDataPath', 'temporaryCachePath', 'C:/save.json'];
    const SAMPLE = {
      win: ['C:/Games/MyGame/MyGame_Data', 'C:/Games/MyGame/MyGame_Data/StreamingAssets', 'C:/Users/<user>/AppData/LocalLow/<company>/<product>', 'C:/Users/<user>/AppData/Local/Temp/<company>/<product>', 'C:/save.json'],
      android: ['/data/app/<package>/base.apk', 'jar:file:///data/app/<package>/base.apk!/assets', '/storage/emulated/0/Android/data/<package>/files', '/storage/emulated/0/Android/data/<package>/cache', 'C:/save.json'],
      ios: ['/var/containers/Bundle/Application/<guid>/MyGame.app/Data', '/var/containers/Bundle/Application/<guid>/MyGame.app/Data/Raw', '/var/mobile/Containers/Data/Application/<guid>/Documents', '/var/mobile/Containers/Data/Application/<guid>/Library/Caches', 'C:/save.json'],
      webgl: ['https://example.com/mygame', 'https://example.com/mygame/StreamingAssets', '/idbfs/<hash> (IndexedDB)', '/tmp', 'C:/save.json']
    };
    // Propiedades: 1 = sí, 0 = no, 0.5 = depende, null = no aplica
    function props(i, plat) {
      if (i === 2) return [1, 1, 0];
      if (i === 3) return [1, 0.5, 1];
      if (i === 4) return [plat === 'win' ? 0.5 : 0, null, null];
      return plat === 'win' ? [0.5, 0, 0] : [0, null, null];
    }
    let plat = 'android', pathI = 2, variant = 'ok';
    let files = PATHS.map(() => null);   // contenido del archivo o null
    let anim = null, msg = '', msgKind = 'ok', flash = -1, flashT = 0;

    const ctl = controls(host);
    seg(ctl, [{ v: 'win', l: 'Windows' }, { v: 'android', l: 'Android' }, { v: 'ios', l: 'iOS' }, { v: 'webgl', l: 'WebGL' }], plat, (v) => { plat = v; files = PATHS.map(() => null); anim = null; msg = ''; });
    const ctl2 = controls(host);
    seg(ctl2, PATHS.map((p, i) => ({ v: String(i), l: i === 4 ? '"C:/save.json"' : p })), String(pathI), (v) => { pathI = Number(v); anim = null; msg = ''; });
    const ctl3 = controls(host);
    seg(ctl3, [{ v: 'ok', l: 'ToJson + File.WriteAllText' }, { v: 'save', l: 'JsonUtility.Save' }, { v: 'str', l: 'data.ToString()' }], variant, (v) => { variant = v; anim = null; msg = ''; });
    const ctl4 = controls(host);
    button(ctl4, L.save, () => { anim = { kind: 'save', t: 0 }; msg = ''; }, true);
    button(ctl4, L.load, () => { anim = { kind: 'load', t: 0 }; msg = ''; });
    button(ctl4, L.update, () => wipe([0, 1], L.upd));
    button(ctl4, L.clean, () => wipe([3], L.os));
    const stage = makeCanvas(host, 222);
    const out = readout(host);
    const cb = codeBlock(host);

    function wipe(list, who) {
      const had = list.filter((i) => files[i]);
      list.forEach((i) => { files[i] = null; });
      if (had.length) { msg = bad(L.wiped + ' ' + who + ': <code>' + had.map((i) => PATHS[i]).join(', ') + '</code>'); msgKind = 'bad'; flash = had[0]; flashT = 1; }
      else { msg = ''; }
    }
    function finishSave() {
      if (variant === 'save') { msg = bad(L.compile); return; }
      const pr = props(pathI, plat);
      const content = variant === 'str' ? '"SaveData"' : '{"level":3}';
      if (pathI === 4) { msg = (plat === 'win' ? warn : bad)(L.hard); return; }
      if (pr[0] === 0) { msg = bad('<code>' + PATHS[pathI] + '</code>: ' + L.ro[plat] + ' (UnauthorizedAccessException / IOException)'); return; }
      files[pathI] = content;
      let m = L.saved + ' <code>' + PATHS[pathI] + '</code>';
      if (pathI === 0 || pathI === 1) m = warn(m + ', ' + L.winData);
      else if (pathI === 3) m = warn(m + ', ' + L.cache);
      else m = ok(m);
      if (variant === 'str') m += '<p>' + warn(L.tostr) + '</p>';
      msg = m;
    }
    function finishLoad() {
      const f = files[pathI];
      if (!f) { msg = warn(L.missing); return; }
      msg = f === '"SaveData"' ? bad(L.parse) : ok(L.loaded);
    }

    const stop = loop((dt) => {
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      flashT = Math.max(0, flashT - dt);
      // Nodos superiores
      const aW = Math.min(130, w * 0.36), bx = 12 + aW + 26, bW = Math.min(200, w - bx - 12);
      const A = [12, 10], B = [bx, 10];
      const json = variant === 'str' ? '"SaveData"' : '{"level":3}';
      node(ctx, A[0], A[1], aW, 30, w < 400 ? 'data' : 'SaveData data', c.accentSoft, c.text, { mono: true });
      node(ctx, B[0], B[1], bW, 30, (w < 400 ? '' : 'string ') + json, c.soft, c.text, { mono: true, stroke: c.border, lw: 1 });
      arrow(ctx, A[0] + aW + 4, 25, B[0] - 4, 25, c.border, 1.5);
      // Tabla de rutas
      const top = 62, rh = 30;
      const colX = w < 400 ? [w - 76, w - 49, w - 22] : [w - 96, w - 62, w - 28];
      ['✍️', '⬆️', '🧹'].forEach((s, i) => text(ctx, s, colX[i], top - 8, c.text, { align: 'center' }));
      PATHS.forEach((p, i) => {
        const y = top + i * rh;
        const sel = i === pathI;
        ctx.fillStyle = sel ? c.accentSoft : (i % 2 ? c.bg : c.soft);
        if (flash === i && flashT > 0) ctx.fillStyle = c.badSoft;
        roundRect(ctx, 8, y, w - 16, rh - 4, 6); ctx.fill();
        text(ctx, fit(ctx, i === 4 ? '"C:/save.json"' : p, colX[0] - 46), 32, y + 13, sel ? c.accent : c.text);
        props(i, plat).forEach((v, k) => {
          const s = v === null ? '—' : v === 1 ? '✓' : v === 0 ? '✗' : '~';
          const col = v === null ? c.muted : v === 1 ? (k === 2 ? c.bad : c.ok) : v === 0 ? (k === 2 ? c.ok : c.bad) : c.warn;
          text(ctx, s, colX[k], y + 13, col, { align: 'center' });
        });
        if (files[i]) text(ctx, '📄', 20, y + 13, c.text, { align: 'center' });
      });
      // Animación del paquete
      const rowPt = [20, top + pathI * rh + 13];
      const aPt = [A[0] + aW / 2, 40], bPt = [B[0] + bW / 2, 40];
      let marks = {};
      if (anim) {
        anim.t += dt;
        const p = anim.t;
        let pt = null, col = c.accent;
        if (anim.kind === 'save') {
          if (variant === 'save') { pt = aPt; col = c.bad; marks = { 3: 'bad' }; if (p > 0.6) { finishSave(); anim = null; } }
          else if (p < 0.8) { pt = mix2(aPt, bPt, ease(p / 0.8)); marks = { 2: 'hl' }; }
          else if (p < 1.6) { pt = mix2(bPt, rowPt, ease((p - 0.8) / 0.8)); marks = { 3: 'hl' }; }
          else { finishSave(); anim = null; }
        } else {
          const has = !!files[pathI];
          if (p < 0.5) { pt = rowPt; marks = { 5: 'hl' }; }
          else if (!has) { finishLoad(); anim = null; }
          else if (p < 1.2) { pt = mix2(rowPt, bPt, ease((p - 0.5) / 0.7)); marks = { 6: 'hl' }; }
          else if (p < 1.9) { pt = mix2(bPt, aPt, ease((p - 1.2) / 0.7)); marks = { 6: 'hl' }; }
          else { finishLoad(); anim = null; }
        }
        if (pt) dot(ctx, pt[0], pt[1], 6, col);
      }
      const pathExpr = pathI === 4 ? '"C:/save.json"' : 'Path.Combine(Application.' + PATHS[pathI] + ', "save.json")';
      const src = [
        'string path = ' + pathExpr + ';',
        '// Guardar / Save',
        variant === 'str' ? 'string json = data.ToString();   // "SaveData"' : variant === 'save' ? '// (no hay ToJson)' : 'string json = JsonUtility.ToJson(data);',
        variant === 'save' ? 'JsonUtility.Save(data, "save.json");   // ✗ CS0117' : 'File.WriteAllText(path, json);',
        '// Cargar / Load',
        'if (File.Exists(path))',
        '    data = JsonUtility.FromJson<SaveData>(File.ReadAllText(path));'
      ];
      if (variant === 'save' && !anim) marks[3] = 'bad';
      if (variant === 'save') marks[2] = 'off';
      cb(src.join('\n'), marks);
      out((msg || '<span class="muted">' + L.save + ' / ' + L.load + '…</span>') +
        '<p class="small muted">' + L.example + ' (' + plat + '): <code>' + esc(SAMPLE[plat][pathI]) + '</code><br>' + L.legend + '</p>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     3. Carga asíncrona: progress se detiene en 0.9
     --------------------------------------------------------- */

  function mountAsyncLoad(host, lang) {
    const L = {
      es: { cond: 'Condición del bucle', restart: 'Cargar de nuevo', raw: 'op.progress', shown: 'Barra: Clamp01(progress / 0.9)',
        loading: 'carga', activation: 'activación', frames: 'Frames esperando en el bucle', stuck: 'El bucle no termina nunca: con <code>allowSceneActivation = false</code>, <code>progress</code> se queda en <b>0.9</b> y <code>isDone</code> sigue en <code>false</code>.',
        exits: 'El bucle termina en 0.9 → <code>allowSceneActivation = true</code> → se completa el último 10 % (activación).', done: 'Level2 activa', wait: 'Cargando…', level: 'Level2' },
      en: { cond: 'Loop condition', restart: 'Load again', raw: 'op.progress', shown: 'Bar: Clamp01(progress / 0.9)',
        loading: 'loading', activation: 'activation', frames: 'Frames waiting in the loop', stuck: 'The loop never ends: with <code>allowSceneActivation = false</code>, <code>progress</code> stays at <b>0.9</b> and <code>isDone</code> stays <code>false</code>.',
        exits: 'The loop ends at 0.9 → <code>allowSceneActivation = true</code> → the last 10 % (activation) completes.', done: 'Level2 active', wait: 'Loading…', level: 'Level2' }
    }[lang];
    const CONDS = [
      { v: 'p1', l: 'op.progress < 1f', expr: 'op.progress < 1f', hang: true },
      { v: 'done', l: '!op.isDone', expr: '!op.isDone', hang: true },
      { v: 'p09', l: 'op.progress < 0.9f', expr: 'op.progress < 0.9f', hang: false }
    ];
    let cond = CONDS[0], t = 0, progress = 0, phase = 'loading', waitFrames = 0, actT = 0;
    const ctl = controls(host);
    ctl.appendChild(el('span', 'muted small', L.cond + ':'));
    seg(ctl, CONDS.map((c) => ({ v: c.v, l: esc(c.l) })), cond.v, (v) => { cond = CONDS.find((c) => c.v === v); reset(); });
    button(ctl, L.restart, reset, true);
    const stage = makeCanvas(host, 190);
    const out = readout(host);
    const cb = codeBlock(host);
    function reset() { t = 0; progress = 0; phase = 'loading'; waitFrames = 0; actT = 0; }

    const stop = loop((dt) => {
      t += dt;
      if (phase === 'loading') {
        // La carga avanza a saltos hasta 0.9 y ahí se detiene.
        progress = Math.min(0.9, progress + dt * (0.15 + 0.35 * Math.abs(Math.sin(t * 2.3))));
        if (progress >= 0.9) phase = cond.hang ? 'stuck' : 'activating';
      } else if (phase === 'stuck') {
        waitFrames++;
      } else if (phase === 'activating') {
        actT += dt;
        progress = Math.min(1, 0.9 + actT * 0.2);
        if (progress >= 1) phase = 'done';
      }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      // Pantalla de carga (o la escena ya activa)
      const sx = 12, sy = 10, sw = w - 24, sh = 70;
      if (phase === 'done') {
        ctx.fillStyle = c.okSoft; roundRect(ctx, sx, sy, sw, sh, 10); ctx.fill();
        text(ctx, '✓ ' + L.done, w / 2, sy + sh / 2, c.ok, { align: 'center' });
      } else {
        ctx.fillStyle = c.soft; roundRect(ctx, sx, sy, sw, sh, 10); ctx.fill();
        const shown = clamp(progress / 0.9, 0, 1);
        text(ctx, L.wait + ' ' + Math.round(shown * 100) + ' %', w / 2, sy + 22, c.text, { align: 'center' });
        ctx.fillStyle = c.bg; roundRect(ctx, sx + 20, sy + 40, sw - 40, 14, 7); ctx.fill();
        ctx.fillStyle = c.accent; roundRect(ctx, sx + 20, sy + 40, Math.max(14, (sw - 40) * shown), 14, 7); ctx.fill();
        if (phase === 'stuck') {
          const spin = t * 6;
          ctx.strokeStyle = c.bad; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(sx + sw - 22, sy + 22, 8, spin, spin + 4.5); ctx.stroke();
        }
      }
      // Eje de op.progress con las dos zonas
      const ax = 20, aw = w - 40, ay = 112;
      const X = (v) => ax + v * aw;
      text(ctx, L.raw + ' = ' + progress.toFixed(2), ax, ay - 14, c.text, { mono: true });
      ctx.fillStyle = c.accentSoft; ctx.fillRect(X(0), ay, X(0.9) - X(0), 12);
      ctx.fillStyle = c.warnSoft; ctx.fillRect(X(0.9), ay, X(1) - X(0.9), 12);
      ctx.fillStyle = c.accent; ctx.fillRect(X(0), ay, X(Math.min(progress, 0.9)) - X(0), 12);
      if (progress > 0.9) { ctx.fillStyle = c.warn; ctx.fillRect(X(0.9), ay, X(progress) - X(0.9), 12); }
      line(ctx, X(0.9), ay - 4, X(0.9), ay + 18, c.text, 2);
      text(ctx, '0.9', X(0.9), ay + 28, c.text, { align: 'center', mono: true });
      text(ctx, '0', X(0), ay + 28, c.muted, { align: 'center', mono: true });
      text(ctx, '1', X(1), ay + 28, c.muted, { align: 'center', mono: true });
      text(ctx, L.loading, X(0.45), ay + 28, c.accent, { align: 'center' });
      text(ctx, L.activation, X(1), ay + 46, c.warn, { align: 'right' });
      text(ctx, 'isDone = ' + (phase === 'done'), ax, h - 12, phase === 'done' ? c.ok : c.muted, { mono: true });
      if (phase === 'stuck') text(ctx, L.frames + ': ' + waitFrames, w - 20, h - 12, c.bad, { align: 'right' });

      const src = [
        'IEnumerator Load()',
        '{',
        '    var op = SceneManager.LoadSceneAsync("Level2");',
        '    op.allowSceneActivation = false;',
        '    while (' + cond.expr + ')',
        '    {',
        '        bar.value = Mathf.Clamp01(op.progress / 0.9f);',
        '        yield return null;',
        '    }',
        '    op.allowSceneActivation = true;',
        '}'
      ].join('\n');
      let marks;
      if (phase === 'loading') marks = { 4: 'hl', 6: 'hl', 7: 'hl' };
      else if (phase === 'stuck') marks = { 4: 'bad', 7: 'bad' };
      else marks = { 4: 'ok', 9: 'ok' };
      cb(src, marks);
      out(phase === 'stuck' ? bad(L.stuck) : phase === 'loading' ? '<span class="muted">' + L.wait + '</span> ' + code('op.progress = ' + progress.toFixed(2)) : ok(L.exits));
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     4. Singleton persistente con DontDestroyOnLoad
     --------------------------------------------------------- */

  function mountSingleton(host, lang) {
    const L = {
      es: { modes: ['Sin comprobación', 'Comprobar + Destroy', 'Moverlo a Start'], game: 'Cargar Game', menu: 'Cargar Menu', reset: 'Reiniciar',
        ddol: 'DontDestroyOnLoad', scene: 'Escena', count: 'GameManager vivos', dup: 'duplicado', more: 'más',
        two: 'Hay más de un GameManager: el de la escena Menu se crea cada vez que vuelves y también pasa a DontDestroyOnLoad.',
        over: '<code>Instance</code> ahora apunta al nuevo (score 0): el estado del primero se pierde.',
        startNote: 'En <code>Start</code> pasa lo mismo, solo que un poco más tarde: el duplicado existe igual y sobrescribe <code>Instance</code>.',
        one: 'Solo hay uno: el recién llegado detecta otra <code>Instance</code> en su <code>Awake</code>, se destruye y sale con <code>return</code>.',
        hint: 'Carga Game y vuelve a Menu varias veces.' },
      en: { modes: ['No check', 'Check + Destroy', 'Move it to Start'], game: 'Load Game', menu: 'Load Menu', reset: 'Reset',
        ddol: 'DontDestroyOnLoad', scene: 'Scene', count: 'Live GameManagers', dup: 'duplicate', more: 'more',
        two: 'There is more than one GameManager: the one in the Menu scene is created every time you return and also moves to DontDestroyOnLoad.',
        over: '<code>Instance</code> now points to the new one (score 0): the first one\'s state is lost.',
        startNote: 'In <code>Start</code> the same happens, just a bit later: the duplicate still exists and overwrites <code>Instance</code>.',
        one: 'Only one: the newcomer sees another <code>Instance</code> in its <code>Awake</code>, destroys itself and exits with <code>return</code>.',
        hint: 'Load Game and go back to Menu several times.' }
    }[lang];
    const MODES = ['none', 'check', 'start'];
    let mode = 'none', scene = 'Menu', objs = [], gmN = 0, instance = null, events = [], now = 0, hlKind = null, hlT = 0, overwritten = false;

    const ctl = controls(host);
    seg(ctl, MODES.map((m, i) => ({ v: m, l: L.modes[i] })), mode, (v) => { mode = v; reset(); });
    const ctl2 = controls(host);
    button(ctl2, L.game, () => load('Game'), true);
    button(ctl2, L.menu, () => load('Menu'), true);
    button(ctl2, L.reset, reset);
    const stage = makeCanvas(host, (w) => (w < 520 ? 400 : 240));
    const out = readout(host);
    const cb = codeBlock(host);

    function add(kind, label) {
      const o = { kind, label, loc: 'scene', a: 0, x: null, y: null, dying: false, score: 0, n: kind === 'gm' ? ++gmN : 0, tag: '', tagT: 0 };
      objs.push(o);
      return o;
    }
    function load(name) {
      objs.forEach((o) => { if (o.loc === 'scene') o.dying = true; });
      scene = name;
      if (name === 'Menu') {
        const gm = add('gm');
        add('obj', 'MenuUI');
        events.push({ at: now + (mode === 'start' ? 1.0 : 0.5), gm });
      } else { add('obj', 'Player'); add('obj', 'Enemy'); add('obj', 'HUD'); }
    }
    function run(ev) {
      const gm = ev.gm;
      if (gm.dying) return;
      gm.tag = mode === 'start' ? 'Start()' : 'Awake()'; gm.tagT = 1.2;
      if (mode === 'check' && instance && !instance.dying && instance !== gm) {
        gm.dying = true; hlKind = 'destroy';
      } else {
        if (instance && instance !== gm && !instance.dying) overwritten = true;
        instance = gm; gm.loc = 'ddol'; hlKind = 'assign';
      }
      hlT = 1.2;
    }
    function reset() { objs = []; gmN = 0; instance = null; events = []; overwritten = false; hlKind = null; load('Menu'); }
    reset();

    const stop = loop((dt) => {
      now += dt;
      events = events.filter((e) => { if (e.at <= now) { run(e); return false; } return true; });
      hlT = Math.max(0, hlT - dt);
      if (instance && scene === 'Game' && !instance.dying) instance.score += dt * 40;
      objs.forEach((o) => { o.a = o.dying ? o.a - dt * 2.2 : Math.min(1, o.a + dt * 3); o.tagT = Math.max(0, o.tagT - dt); });
      objs = objs.filter((o) => !(o.dying && o.a <= 0));

      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 520;
      const zD = narrow ? [10, 10, w - 20, 190] : [10, 10, w * 0.46 - 15, h - 20];
      const zS = narrow ? [10, 210, w - 20, h - 220] : [w * 0.46 + 5, 10, w * 0.54 - 15, h - 20];
      zone(ctx, ...zD, '📌 ' + L.ddol, c, { stroke: c.accent, dash: [5, 4], fill: c.bg, titleColor: c.accent });
      zone(ctx, ...zS, '🎬 ' + L.scene + ': ' + scene, c);
      const place = (z, list) => {
        const cap = Math.max(1, Math.floor((z[3] - 30) / 32));
        // Si no caben, se ocultan los más antiguos (la Instance más reciente siempre se ve).
        const hiddenN = list.length > cap ? list.length - cap + 1 : 0;
        list.forEach((o, k) => {
          const row = hiddenN ? Math.max(1, k - hiddenN + 1) : k;
          const tx = z[0] + 10, ty = z[1] + 26 + row * 32;
          if (o.x === null) { o.x = tx; o.y = ty; }
          o.x = lerp(o.x, tx, Math.min(1, dt * 7)); o.y = lerp(o.y, ty, Math.min(1, dt * 7));
        });
        if (hiddenN) text(ctx, '… +' + hiddenN + ' ' + L.more, z[0] + 20, z[1] + 26 + 13, c.warn);
        return hiddenN;
      };
      const inD = objs.filter((o) => o.loc === 'ddol'), inS = objs.filter((o) => o.loc === 'scene');
      const shownD = place(zD, inD); place(zS, inS);
      objs.forEach((o) => {
        if (o.loc === 'ddol' && inD.indexOf(o) < shownD) return;
        const z = o.loc === 'ddol' ? zD : zS;
        const bw = z[2] - 20;
        ctx.globalAlpha = clamp(o.a, 0, 1);
        if (o.kind === 'gm') {
          const isI = o === instance;
          const fill = o.dying ? c.bad : isI ? c.accent : (o.loc === 'ddol' ? c.warn : c.accentSoft);
          const col = o.dying || isI || o.loc === 'ddol' ? '#fff' : c.text;
          box(ctx, o.x, o.y, bw, 26, '', fill, col, { r: 6 });
          const lbl = (bw < 330 ? 'GM #' : 'GameManager #') + o.n + ' · score ' + Math.floor(o.score);
          text(ctx, fit(ctx, lbl, bw - (isI ? 86 : o.loc === 'ddol' ? 90 : 16)), o.x + 8, o.y + 13, col);
          if (isI) text(ctx, '★ Instance', o.x + bw - 8, o.y + 13, '#fff', { align: 'right' });
          else if (o.loc === 'ddol' && !o.dying) text(ctx, L.dup, o.x + bw - 8, o.y + 13, '#fff', { align: 'right' });
          if (o.tagT > 0) {
            ctx.globalAlpha = clamp(o.tagT, 0, 1);
            const tg = o.dying ? 'Destroy()' : o.tag;
            const tw0 = chip(ctx, 0, -100, tg, c.bg, c.text, true);
            chip(ctx, o.x + bw - tw0 / 2 - 4, o.y - 4, tg, o.dying ? c.bad : c.ok, '#fff', true);
          }
        } else {
          box(ctx, o.x, o.y, bw, 26, o.label, c.bg, c.text, { r: 6, stroke: c.border, lw: 1 });
        }
        ctx.globalAlpha = 1;
      });

      const alive = objs.filter((o) => o.kind === 'gm' && !o.dying).length;
      let src, marks = {};
      if (mode === 'check') {
        src = ['void Awake()', '{', '    if (Instance != null && Instance != this)', '    {', '        Destroy(gameObject);', '        return;', '    }', '    Instance = this;', '    DontDestroyOnLoad(gameObject);', '}'];
        if (hlT > 0) marks = hlKind === 'destroy' ? { 2: 'hl', 4: 'ok', 5: 'ok' } : { 2: 'hl', 7: 'hl', 8: 'hl' };
      } else {
        src = [(mode === 'start' ? 'void Start()' : 'void Awake()'), '{', '    Instance = this;', '    DontDestroyOnLoad(gameObject);', '}'];
        if (hlT > 0) marks = { 2: overwritten ? 'bad' : 'hl', 3: 'hl' };
      }
      cb(src.join('\n'), marks);
      let msg = L.count + ': <b>' + alive + '</b> ';
      if (alive > 1) msg = bad(msg) + '<p>' + L.two + ' ' + (overwritten ? L.over : '') + '</p>' + (mode === 'start' ? '<p>' + L.startNote + '</p>' : '');
      else if (mode === 'check' && gmN > 1) msg = ok(msg) + '<p>' + L.one + '</p>';
      else msg = msg + '<p class="muted">' + L.hint + '</p>';
      out(msg);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     5. Closures en un for: la lambda captura la variable
     --------------------------------------------------------- */

  function mountClosure(host, lang) {
    const L = {
      es: { bug: 'Captura i (bug)', fix: 'Copia local: int index = i', run: 'Ejecutar el bucle', btn: 'Botón', click: 'Clic',
        none: 'Ese botón aún no tiene listener.', end: 'fin del bucle',
        okR: (n) => '<code>LoadLevel(' + n + ')</code> → se carga <b>Level ' + n + '</b>.',
        badR: (n) => '<code>LoadLevel(' + n + ')</code> → <b>Level ' + n + '</b> no existe (IndexOutOfRangeException).',
        why: 'Las tres lambdas apuntan a la <b>misma</b> variable <code>i</code>, que al terminar el bucle vale 3. Se lee su valor <b>al hacer clic</b>, no al crear la lambda.',
        whyFix: '<code>int index = i;</code> se declara dentro del cuerpo: cada iteración crea una variable <b>nueva</b>, y cada lambda captura la suya.',
        hint: 'Espera a que termine el bucle y haz clic en un botón.' },
      en: { bug: 'Capture i (bug)', fix: 'Local copy: int index = i', run: 'Run the loop', btn: 'Button', click: 'Click',
        none: 'That button has no listener yet.', end: 'loop ends',
        okR: (n) => '<code>LoadLevel(' + n + ')</code> → <b>Level ' + n + '</b> loads.',
        badR: (n) => '<code>LoadLevel(' + n + ')</code> → <b>Level ' + n + '</b> does not exist (IndexOutOfRangeException).',
        why: 'All three lambdas point to the <b>same</b> variable <code>i</code>, which is 3 when the loop ends. Its value is read <b>on click</b>, not when the lambda is created.',
        whyFix: '<code>int index = i;</code> is declared inside the body: each iteration creates a <b>new</b> variable and each lambda captures its own.',
        hint: 'Wait for the loop to finish and click a button.' }
    }[lang];
    let fix = false, steps, si, st, iVal, idx, lis, result, flash;
    const ctl = controls(host);
    seg(ctl, [{ v: 'bug', l: L.bug }, { v: 'fix', l: L.fix }], 'bug', (v) => { fix = v === 'fix'; reset(); });
    button(ctl, L.run, reset);
    const ctl2 = controls(host);
    [0, 1, 2].forEach((b) => button(ctl2, L.click + ': ' + L.btn + ' ' + b, () => press(b), true));
    const stage = makeCanvas(host, 240);
    const out = readout(host);
    const cb = codeBlock(host);

    function reset() {
      steps = [];
      for (let k = 0; k < 3; k++) {
        steps.push({ ty: 'cond', k });
        if (fix) steps.push({ ty: 'copy', k });
        steps.push({ ty: 'add', k }, { ty: 'inc', k });
      }
      steps.push({ ty: 'cond', k: 3 }, { ty: 'end' });
      si = 0; st = 0; iVal = 0; idx = []; lis = []; result = null; flash = { b: -1, t: 0 };
    }
    function apply(s) {
      if (s.ty === 'copy') idx.push(iVal);
      if (s.ty === 'add') lis.push(fix ? idx.length - 1 : 'i');
      if (s.ty === 'inc') iVal++;
    }
    function press(b) {
      flash = { b, t: 0.8 };
      if (b >= lis.length) { result = { none: true }; return; }
      const v = fix ? idx[lis[b]] : iVal;
      result = { v, ok: v < 3 };
    }
    reset();

    const stop = loop((dt) => {
      if (si < steps.length - 1) {
        st += dt;
        if (st > 0.7) { st = 0; apply(steps[si]); si++; }
      }
      flash.t = Math.max(0, flash.t - dt);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const bw = Math.min(160, (w - 48) / 3);
      const gap = (w - 3 * bw) / 4;
      const bx = (b) => gap + b * (bw + gap);
      const iBox = [w / 2 - 50, 172, 100, 40];
      [0, 1, 2].forEach((b) => {
        const fl = flash.b === b && flash.t > 0;
        const fill = fl ? (result && result.ok ? c.ok : c.bad) : c.accentSoft;
        node(ctx, bx(b), 12, bw, 32, L.btn + ' ' + b, fill, fl ? '#fff' : c.text);
        if (b < lis.length) {
          text(ctx, fix ? 'λ → index' : 'λ → i', bx(b) + bw / 2, 56, c.accent, { align: 'center', mono: true });
          const to = fix ? [bx(b) + bw / 2, 100] : [iBox[0] + iBox[2] / 2 + (b - 1) * 26, iBox[1]];
          arrow(ctx, bx(b) + bw / 2, 66, to[0], to[1] - 2, c.accent, 1.5);
        }
        if (fix && b < idx.length) {
          node(ctx, bx(b) + bw / 2 - 34, 100, 68, 36, String(idx[b]), c.okSoft, c.text, { mono: true, stroke: c.ok, lw: 1.5 });
          text(ctx, 'index', bx(b) + bw / 2, 146, c.ok, { align: 'center', mono: true });
        }
      });
      const done = si >= steps.length - 1;
      node(ctx, ...iBox, String(iVal), done && !fix ? c.badSoft : c.soft, c.text, { mono: true, stroke: done && !fix ? c.bad : c.border, lw: 1.5 });
      text(ctx, 'int i', iBox[0] - 8, iBox[1] + 20, c.muted, { align: 'right', mono: true });
      if (done) text(ctx, 'i < 3 → false: ' + L.end, w / 2, iBox[1] + iBox[3] + 14, c.muted, { align: 'center', mono: true });

      const s = steps[Math.min(si, steps.length - 1)];
      const src = fix
        ? ['for (int i = 0; i < 3; i++)', '{', '    int index = i;', '    buttons[i].onClick.AddListener(() => LoadLevel(index));', '}', '', 'void LoadLevel(int n) => SceneManager.LoadScene(levels[n]);']
        : ['for (int i = 0; i < 3; i++)', '{', '    buttons[i].onClick.AddListener(() => LoadLevel(i));', '}', '', 'void LoadLevel(int n) => SceneManager.LoadScene(levels[n]);'];
      const marks = {};
      if (!done) marks[s.ty === 'copy' ? 2 : s.ty === 'add' ? (fix ? 3 : 2) : 0] = 'hl';
      if (flash.t > 0 && result && !result.none) marks[src.length - 1] = result.ok ? 'ok' : 'bad';
      cb(src.join('\n'), marks);
      let msg = result ? (result.none ? warn(L.none) : result.ok ? ok(L.okR(result.v)) : bad(L.badR(result.v))) : '<span class="muted">' + L.hint + '</span>';
      msg += '<p>' + (fix ? L.whyFix : L.why) + '</p>';
      out(msg);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     6. Canvas Scaler y anchors
     --------------------------------------------------------- */

  function mountCanvasScaler(host, lang) {
    const L = {
      es: { res: ['Móvil vertical', 'Móvil horizontal', 'Tablet', 'Full HD', 'Monitor 4K'], match: 'Match (ancho ↔ alto)', center: 'Anchor: centro', tr: 'Anchor: arriba-derecha',
        play: 'Jugar', title: 'MI JUEGO', out: 'El botón de pausa se sale de la pantalla (se recorta).', drift: 'El botón se separa de la esquina: está anclado al centro y su distancia a la esquina cambia con la relación de aspecto.',
        corner: 'El botón queda en la esquina, siempre a 40 unidades (× Scale Factor) del borde.', tiny: 'Constant Pixel Size: los elementos miden lo mismo en píxeles, así que en pantallas grandes se ven diminutos.',
        scaled: 'Scale With Screen Size: la UI se escala respecto a 1920×1080; con Match eliges si manda el ancho, el alto o una mezcla.', size: 'Altura del botón', ofH: 'de la altura', units: 'unidades' },
      en: { res: ['Phone portrait', 'Phone landscape', 'Tablet', 'Full HD', '4K monitor'], match: 'Match (width ↔ height)', center: 'Anchor: center', tr: 'Anchor: top-right',
        play: 'Play', title: 'MY GAME', out: 'The pause button goes off-screen (it gets clipped).', drift: 'The button drifts away from the corner: it is anchored to the center, so its distance to the corner changes with the aspect ratio.',
        corner: 'The button stays in the corner, always 40 units (× Scale Factor) from the edge.', tiny: 'Constant Pixel Size: elements keep the same size in pixels, so they look tiny on large screens.',
        scaled: 'Scale With Screen Size: the UI scales relative to 1920×1080; Match picks whether width, height or a blend drives it.', size: 'Button height', ofH: 'of the height', units: 'units' }
    }[lang];
    const RES = [[1080, 2400], [2400, 1080], [2048, 1536], [1920, 1080], [3840, 2160]];
    let ri = 1, mode = 'scale', match = 0.5, anchor = 'center', disp = null;
    const ctl = controls(host);
    seg(ctl, RES.map((r, i) => ({ v: String(i), l: L.res[i] })), String(ri), (v) => { ri = Number(v); });
    const ctl2 = controls(host);
    seg(ctl2, [{ v: 'const', l: 'Constant Pixel Size' }, { v: 'scale', l: 'Scale With Screen Size' }], mode, (v) => { mode = v; });
    seg(ctl2, [{ v: 'center', l: L.center }, { v: 'tr', l: L.tr }], anchor, (v) => { anchor = v; });
    slider(ctl2, L.match, 0, 1, 0.05, match, (v) => { match = v; }, (v) => v.toFixed(2));
    const wantH = (w) => Math.round(26 + Math.min((w - 40) * RES[ri][1] / RES[ri][0], w < 560 ? 290 : 250) + 22);
    const stage = makeCanvas(host, wantH);
    const out = readout(host);
    const cb = codeBlock(host);

    function flower(ctx, x, y, col) {
      ctx.fillStyle = col;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * 2, y + dy * 2);
        ctx.lineTo(x + dx * 11, y + dy * 5);
        ctx.lineTo(x + dx * 5, y + dy * 11);
        ctx.closePath(); ctx.fill();
      });
    }

    const stop = loop((dt) => {
      const c = colors();
      if (stage.h !== wantH(stage.w)) resizeStage(stage, wantH(stage.w));
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const [W, H] = RES[ri];
      if (!disp) disp = [W, H];
      disp[0] = lerp(disp[0], W, Math.min(1, dt * 8)); disp[1] = lerp(disp[1], H, Math.min(1, dt * 8));
      const DW = disp[0], DH = disp[1];
      const s = mode === 'const' ? 1 : Math.pow(2, lerp(Math.log2(DW / 1920), Math.log2(DH / 1080), match));
      const k = Math.min((w - 40) / DW, (h - 48) / DH);
      const fw = DW * k, fh = DH * k, fx = (w - fw) / 2, fy = 26;
      text(ctx, fit(ctx, W + '×' + H + ' px · Scale Factor ' + s.toFixed(2), w - 16), w / 2, 12, c.muted, { align: 'center' });
      // Marco de la pantalla
      ctx.fillStyle = c.text; roundRect(ctx, fx - 5, fy - 5, fw + 10, fh + 10, 10); ctx.fill();
      ctx.fillStyle = c.soft; ctx.fillRect(fx, fy, fw, fh);
      // Botón de pausa en píxeles de pantalla
      const bs = 120 * s;
      let bx, by;
      if (anchor === 'tr') { bx = DW - 40 * s - bs; by = 40 * s; }
      else { bx = DW / 2 + 860 * s - bs / 2; by = DH / 2 - 440 * s - bs / 2; }
      ctx.save();
      ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
      // Título (anclado arriba-centro) y botón Jugar (centro)
      const tW = 600 * s * k, tH = 90 * s * k;
      box(ctx, fx + fw / 2 - tW / 2, fy + 50 * s * k, tW, tH, '', c.accentSoft, c.text, { r: 6 });
      if (tW > 70) text(ctx, L.title, fx + fw / 2, fy + 50 * s * k + tH / 2, c.accent, { align: 'center' });
      const pW = 400 * s * k, pH = 120 * s * k;
      box(ctx, fx + fw / 2 - pW / 2, fy + fh / 2 - pH / 2, pW, pH, '', c.accent, '#fff', { r: 6 });
      if (pW > 50) text(ctx, L.play, fx + fw / 2, fy + fh / 2, '#fff', { align: 'center' });
      const px = fx + bx * k, py = fy + by * k, pS = bs * k;
      ctx.fillStyle = c.warn; roundRect(ctx, px, py, pS, pS, Math.max(2, pS * 0.2)); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(px + pS * 0.3, py + pS * 0.25, pS * 0.14, pS * 0.5);
      ctx.fillRect(px + pS * 0.56, py + pS * 0.25, pS * 0.14, pS * 0.5);
      ctx.restore();
      const offscreen = bx < -0.5 || by < -0.5 || bx + bs > DW + 0.5 || by + bs > DH + 0.5;
      if (offscreen) {
        ctx.strokeStyle = c.bad; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.strokeRect(px, py, pS, pS); ctx.setLineDash([]);
      }
      // Anchor (flor) y distancia
      const ax = anchor === 'tr' ? fx + fw : fx + fw / 2, ay = anchor === 'tr' ? fy : fy + fh / 2;
      const pivot = anchor === 'tr' ? [px + pS, py] : [px + pS / 2, py + pS / 2];
      line(ctx, ax, ay, pivot[0], pivot[1], c.text, 1.5, [3, 3]);
      flower(ctx, ax, ay, c.text);

      const gapR = DW - (bx + bs), gapT = by;
      const expected = 40 * s;
      const drift = Math.abs(gapR - expected) > expected * 0.25 + 4 || Math.abs(gapT - expected) > expected * 0.25 + 4;
      const sF = mode === 'const' ? 1 : Math.pow(2, lerp(Math.log2(W / 1920), Math.log2(H / 1080), match));
      let msg = offscreen ? bad(L.out) : (anchor === 'center' && drift ? warn(L.drift) : ok(L.corner));
      msg += '<p>' + (mode === 'const' ? L.tiny : L.scaled) + ' ' + L.size + ': <b>' + Math.round(bs) + ' px</b> (' + Math.round(bs / DH * 100) + ' % ' + L.ofH + ') · Canvas: <b>' + Math.round(W / sF) + '×' + Math.round(H / sF) + '</b> ' + L.units + '.</p>';
      out(msg);
      const a = anchor === 'tr';
      cb([
        'scaler.uiScaleMode = CanvasScaler.ScaleMode.' + (mode === 'const' ? 'ConstantPixelSize;' : 'ScaleWithScreenSize;'),
        'scaler.referenceResolution = new Vector2(1920, 1080);',
        'scaler.matchWidthOrHeight = ' + match.toFixed(2) + 'f;',
        'pause.anchorMin = pause.anchorMax = new Vector2(' + (a ? '1f, 1f' : '0.5f, 0.5f') + ');',
        'pause.pivot = new Vector2(' + (a ? '1f, 1f' : '0.5f, 0.5f') + ');',
        'pause.anchoredPosition = new Vector2(' + (a ? '-40f, -40f' : '860f, 440f') + ');'
      ].join('\n'), mode === 'const' ? { 0: 'hl', 1: 'off', 2: 'off', 3: a ? 'ok' : 'bad' } : { 0: 'ok', 3: a ? 'ok' : 'bad' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     7. EventSystem: del input al onClick (puntero y mando)
     --------------------------------------------------------- */

  function mountEventSystem(host, lang) {
    const L = {
      es: { pointer: '🖱 Ratón / táctil', pad: '🎮 Mando', es: 'EventSystem en la escena', clickBtn: 'Clic en Reanudar', open: 'Abrir menú de pausa',
        onOpen: 'Al abrir:', nothing: 'Nada', btns: ['Reanudar', 'Opciones', 'Salir'], pause: 'Pausa', closed: '(menú cerrado)', sel: 'Selected', none: 'ninguno',
        noES: 'No hay EventSystem: nadie lee el input ni lo envía a la UI, así que el clic no hace nada. Al crear el Canvas por código Unity no lo añade; crea uno con su Input Module.',
        noESpad: 'Sin EventSystem no hay navegación (y <code>EventSystem.current</code> es <code>null</code>).',
        clicked: (b) => 'El <code>GraphicRaycaster</code> encontró <b>' + b + '</b> y se ejecutó su <code>onClick</code>.',
        noSel: 'Nada seleccionado: el EventSystem no sabe desde dónde navegar, así que el stick no hace nada.',
        moved: (b) => 'La selección se movió a <b>' + b + '</b> siguiendo la <b>Navigation</b> de los botones.',
        submit: (b) => 'Submit sobre el seleccionado: se ejecuta el <code>onClick</code> de <b>' + b + '</b>.',
        invoked: '<code>onClick.Invoke()</code> <b>hace clic</b> en el botón: el menú se cerró y el juego se reanudó.',
        nre: '<code>EventSystem.current</code> es <code>null</code> → NullReferenceException.',
        selOk: 'El primer botón queda seleccionado: ya puedes navegar con el stick.', tryPad: 'Abre el menú y usa ▲ ▼ y Ⓐ.', tryPtr: 'Haz clic en un botón del menú.' },
      en: { pointer: '🖱 Mouse / touch', pad: '🎮 Gamepad', es: 'EventSystem in the scene', clickBtn: 'Click Resume', open: 'Open pause menu',
        onOpen: 'On open:', nothing: 'Nothing', btns: ['Resume', 'Options', 'Quit'], pause: 'Pause', closed: '(menu closed)', sel: 'Selected', none: 'none',
        noES: 'No EventSystem: nothing reads the input and sends it to the UI, so the click does nothing. When you create the Canvas from code Unity does not add one; create it with its Input Module.',
        noESpad: 'Without an EventSystem there is no navigation (and <code>EventSystem.current</code> is <code>null</code>).',
        clicked: (b) => 'The <code>GraphicRaycaster</code> found <b>' + b + '</b> and its <code>onClick</code> ran.',
        noSel: 'Nothing selected: the EventSystem does not know where to navigate from, so the stick does nothing.',
        moved: (b) => 'Selection moved to <b>' + b + '</b> following the buttons\' <b>Navigation</b>.',
        submit: (b) => 'Submit on the selected one: <b>' + b + '</b>\'s <code>onClick</code> runs.',
        invoked: '<code>onClick.Invoke()</code> <b>clicks</b> the button: the menu closed and the game resumed.',
        nre: '<code>EventSystem.current</code> is <code>null</code> → NullReferenceException.',
        selOk: 'The first button is selected: now you can navigate with the stick.', tryPad: 'Open the menu and use ▲ ▼ and Ⓐ.', tryPtr: 'Click a button in the menu.' }
    }[lang];
    let mode = 'pointer', hasES = true, onOpen = 'none', menuOpen = false, sel = -1, pk = null, msg = '', flash = -1, flashT = 0;
    const panes = tabs(host, [{ v: 'pointer', l: L.pointer }, { v: 'pad', l: L.pad }], mode, (v) => { mode = v; pk = null; msg = ''; menuOpen = false; sel = -1; });
    const common = controls(host);
    toggle(common, L.es, hasES, (v) => { hasES = v; pk = null; msg = ''; });
    const pc = controls(panes.pointer);
    button(pc, L.clickBtn, () => send('click', 0), true);
    const gc = controls(panes.pad);
    gc.appendChild(el('span', 'muted small', L.onOpen));
    seg(gc, [{ v: 'none', l: L.nothing }, { v: 'select', l: 'SetSelectedGameObject(first)' }, { v: 'invoke', l: 'first.onClick.Invoke()' }], onOpen, (v) => { onOpen = v; menuOpen = false; sel = -1; msg = ''; });
    const gc2 = controls(panes.pad);
    button(gc2, L.open, openMenu, true);
    button(gc2, '▲', () => send('up'));
    button(gc2, '▼', () => send('down'));
    button(gc2, 'Ⓐ Submit', () => send('submit'));
    let geo = { menu: [] };
    const stage = makeCanvas(host, (w) => (w < 600 ? 230 : 240), (x, y) => {
      if (mode !== 'pointer') return;
      geo.menu.forEach((r, i) => { if (x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]) send('click', i); });
    });
    const out = readout(host);
    const cb = codeBlock(host);

    function openMenu() {
      pk = null; menuOpen = true; sel = -1;
      if (onOpen === 'select') { if (hasES) { sel = 0; msg = ok(L.selOk); } else msg = bad(L.nre); }
      else if (onOpen === 'invoke') { flash = 0; flashT = 0.9; menuOpen = false; msg = bad(L.invoked); }
      else msg = '';
    }
    function send(kind, target) {
      if (mode === 'pad' && !menuOpen) { msg = '<span class="muted">' + L.tryPad + '</span>'; return; }
      pk = { kind, target: target || 0, t: 0 };
      msg = '';
    }
    function finish() {
      const k = pk.kind;
      if (!hasES) { msg = bad(mode === 'pointer' ? L.noES : L.noESpad); return; }
      if (mode === 'pointer') { flash = pk.target; flashT = 0.8; msg = ok(L.clicked(L.btns[pk.target])); return; }
      if (sel < 0) { msg = bad(L.noSel); return; }
      if (k === 'submit') { flash = sel; flashT = 0.8; msg = ok(L.submit(L.btns[sel])); return; }
      sel = clamp(sel + (k === 'down' ? 1 : -1), 0, 2);
      msg = ok(L.moved(L.btns[sel]));
    }

    const stop = loop((dt) => {
      flashT = Math.max(0, flashT - dt);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 600;
      const labels = mode === 'pointer'
        ? ['🖱 Input', 'EventSystem', 'GraphicRaycaster', 'Button.onClick']
        : ['🎮 Input', 'EventSystem', L.sel + ': ' + (sel < 0 ? L.none : L.btns[sel]), pk && pk.kind === 'submit' ? 'onClick' : 'Navigation'];
      const nodes = labels.map((s, i) => narrow
        ? [10, 12 + i * 52, w * 0.5 - 18, 34]
        : [12 + i * (w / 4), 12, w / 4 - 24, 36]);
      // Paquete en movimiento
      let stopAt = 3;
      if (!hasES) stopAt = 1; else if (mode === 'pad' && sel < 0) stopAt = 2;
      let reached = -1;
      if (pk) {
        pk.t += dt;
        reached = Math.min(stopAt, Math.floor(pk.t / 0.35));
        if (pk.t > (stopAt + 1) * 0.35 + 0.2 && !pk.done) { pk.done = true; finish(); }
      }
      nodes.forEach((r, i) => {
        const missing = i === 1 && !hasES;
        const failed = pk && pk.done && i === stopAt && stopAt < 3;
        const lit = pk && i <= reached && !failed;
        const fill = missing ? c.bg : failed ? c.badSoft : lit ? c.accent : (i === 2 && mode === 'pad' && sel < 0 ? c.warnSoft : c.soft);
        node(ctx, r[0], r[1], r[2], r[3], missing ? '✗ EventSystem' : labels[i], fill, missing ? c.bad : lit ? '#fff' : c.text, { stroke: missing ? c.bad : null, lw: 1.5 });
        if (missing) { ctx.strokeStyle = c.bad; ctx.setLineDash([4, 3]); roundRect(ctx, r[0], r[1], r[2], r[3], 8); ctx.stroke(); ctx.setLineDash([]); }
        if (i < 3) {
          const n = nodes[i + 1];
          if (narrow) arrow(ctx, r[0] + r[2] / 2, r[1] + r[3] + 2, n[0] + n[2] / 2, n[1] - 2, c.border, 1.5);
          else arrow(ctx, r[0] + r[2] + 3, r[1] + r[3] / 2, n[0] - 3, n[1] + n[3] / 2, c.border, 1.5);
        }
      });
      if (pk && !pk.done) {
        const i = Math.min(stopAt, Math.floor(pk.t / 0.35)), f = (pk.t % 0.35) / 0.35;
        const a = nodes[i], b = nodes[Math.min(stopAt, i + 1)];
        const pa = [a[0] + a[2] / 2, a[1] + a[3] / 2], pb = [b[0] + b[2] / 2, b[1] + b[3] / 2];
        const p = i >= stopAt ? pa : mix2(pa, pb, ease(f));
        dot(ctx, p[0], p[1], 7, c.warn);
      }
      // Menú
      const m = narrow ? [w * 0.5 + 4, 12, w * 0.5 - 14, h - 24] : [w / 2 - 130, 66, 260, h - 76];
      zone(ctx, ...m, L.pause, c, { fill: c.soft });
      geo.menu = [];
      const open = mode === 'pointer' || menuOpen;
      if (!open) text(ctx, L.closed, m[0] + m[2] / 2, m[1] + m[3] / 2, c.muted, { align: 'center' });
      else L.btns.forEach((b, i) => {
        const bh = narrow ? 34 : 36, gapB = narrow ? 14 : 10;
        const r = [m[0] + 12, m[1] + 30 + i * (bh + gapB), m[2] - 24, bh];
        geo.menu.push(r);
        const fl = flash === i && flashT > 0;
        node(ctx, r[0], r[1], r[2], r[3], b, fl ? c.ok : i === sel ? c.accentSoft : c.bg, fl ? '#fff' : c.text, { stroke: i === sel ? c.accent : c.border, lw: i === sel ? 3 : 1 });
      });
      if (mode === 'pointer') {
        cb(['var canvas = new GameObject("Canvas", typeof(Canvas),', '    typeof(CanvasScaler), typeof(GraphicRaycaster));', 'CreateButtons(canvas.transform);',
          (hasES ? '' : '// ') + 'new GameObject("EventSystem", typeof(EventSystem),', (hasES ? '' : '// ') + '    typeof(InputSystemUIInputModule));'].join('\n'),
        hasES ? { 3: 'ok', 4: 'ok' } : { 3: 'off', 4: 'off' });
      } else {
        const l3 = onOpen === 'select' ? '    EventSystem.current.SetSelectedGameObject(firstButton);' : onOpen === 'invoke' ? '    firstButton.onClick.Invoke();' : '    // (no se selecciona nada / nothing selected)';
        cb(['void OpenPauseMenu()', '{', '    pausePanel.SetActive(true);', l3, '}'].join('\n'), { 3: onOpen === 'select' ? 'ok' : 'bad' });
      }
      out(msg || '<span class="muted">' + (mode === 'pointer' ? L.tryPtr : L.tryPad) + '</span>');
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     8. CanvasGroup: fundido sin bloquear clics
     --------------------------------------------------------- */

  function mountCanvasGroup(host, lang) {
    const L = {
      es: { modes: ['Image.color.a → 0', 'SetActive(false)', 'CanvasGroup'], toggle: 'Ocultar / mostrar panel', click: 'Clic en «Jugar» (detrás)',
        play: 'Jugar', options: 'Opciones', close: 'Cerrar', ray: 'raycast del clic', panel: 'Panel', bgBtn: 'Botón Jugar',
        blocked: 'Bloqueado por el panel: aunque no se vea, su <code>Image</code> sigue recibiendo el raycast.',
        clicked: 'El clic llega a <b>Jugar</b>: el panel ya no bloquea.',
        children: 'Solo cambia la <code>Image</code>: los hijos (texto, botón) siguen visibles.',
        instant: '<code>SetActive(false)</code> lo oculta de golpe: no hay fundido posible.',
        group: '<code>CanvasGroup</code> afecta a todo el grupo: <code>alpha</code> para el fundido, <code>blocksRaycasts = false</code> deja pasar los clics e <code>interactable = false</code> desactiva sus botones.',
        state: 'Estado', blocks: 'bloquea raycasts', yes: 'sí', no: 'no', active: 'activo',
        c1: '// invisible… pero sigue recibiendo raycasts', c2: '// desaparece de golpe, sin fundido', c3: '// deja pasar los clics' },
      en: { modes: ['Image.color.a → 0', 'SetActive(false)', 'CanvasGroup'], toggle: 'Hide / show panel', click: 'Click "Play" (behind)',
        play: 'Play', options: 'Options', close: 'Close', ray: 'click raycast', panel: 'Panel', bgBtn: 'Play button',
        blocked: 'Blocked by the panel: even though you cannot see it, its <code>Image</code> still receives the raycast.',
        clicked: 'The click reaches <b>Play</b>: the panel no longer blocks.',
        children: 'Only the <code>Image</code> changes: the children (text, button) stay visible.',
        instant: '<code>SetActive(false)</code> hides it at once: no fade is possible.',
        group: '<code>CanvasGroup</code> affects the whole group: <code>alpha</code> for the fade, <code>blocksRaycasts = false</code> lets clicks through and <code>interactable = false</code> disables its buttons.',
        state: 'State', blocks: 'blocks raycasts', yes: 'yes', no: 'no', active: 'active',
        c1: '// invisible… but still receives raycasts', c2: '// disappears at once, no fade', c3: '// lets clicks through' }
    }[lang];
    const MODES = ['image', 'active', 'group'];
    let mode = 'group', hidden, a, active, blocks, clickT, blockedHit;
    function reset() { hidden = false; a = 1; active = true; blocks = true; clickT = -1; blockedHit = false; }
    reset();
    const ctl = controls(host);
    seg(ctl, MODES.map((m, i) => ({ v: m, l: L.modes[i] })), mode, (v) => { mode = v; reset(); });
    const ctl2 = controls(host);
    button(ctl2, L.toggle, () => {
      hidden = !hidden;
      if (mode === 'active') { active = !hidden; a = hidden ? 0 : 1; }
      if (mode === 'group') blocks = !hidden;
    }, true);
    button(ctl2, L.click, doClick);
    const stage = makeCanvas(host, (w) => (w < 560 ? 320 : 220), () => doClick());
    const out = readout(host);
    const cb = codeBlock(host);
    function doClick() { clickT = 0; blockedHit = active && (mode !== 'group' || blocks); }

    const stop = loop((dt) => {
      if (mode !== 'active') a = clamp(a + (hidden ? -dt : dt) / 0.8, 0, 1);
      if (clickT >= 0) { clickT += dt; if (clickT > 1.8) clickT = -1; }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const F = narrow ? [10, 10, w - 20, 180] : [10, 10, w * 0.62 - 15, h - 20];
      const S = narrow ? [10, 200, w - 20, h - 210] : [w * 0.62 + 5, 10, w * 0.38 - 15, h - 20];
      // Vista frontal: fondo con botón Jugar
      zone(ctx, ...F, '', c);
      const bb = [F[0] + F[2] / 2 - 60, F[1] + F[3] - 58, 120, 34];
      const hitBg = clickT >= 0 && clickT > 0.35 && !blockedHit && clickT < 1.2;
      node(ctx, ...bb, L.play, hitBg ? c.ok : c.accent, '#fff');
      // Panel
      const P = [F[0] + F[2] * 0.14, F[1] + 14, F[2] * 0.72, F[3] - 34];
      if (active) {
        const imgA = mode === 'image' ? a : (mode === 'group' ? a : 1);
        const kidsA = mode === 'image' ? 1 : imgA;
        ctx.globalAlpha = imgA;
        ctx.fillStyle = c.bg; roundRect(ctx, ...P, 10); ctx.fill();
        ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = kidsA;
        text(ctx, L.options, P[0] + P[2] / 2, P[1] + 20, c.text, { align: 'center' });
        node(ctx, P[0] + P[2] / 2 - 45, P[1] + 40, 90, 28, L.close, c.soft, c.text, { stroke: c.border, lw: 1 });
        ctx.globalAlpha = 1;
        if (imgA < 0.05) { ctx.strokeStyle = c.muted; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; roundRect(ctx, ...P, 10); ctx.stroke(); ctx.setLineDash([]); }
      }
      // Clic: onda en el centro del botón
      if (clickT >= 0) {
        const cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2;
        const r = 6 + clickT * 30;
        ctx.globalAlpha = clamp(1.4 - clickT, 0, 1);
        ctx.strokeStyle = blockedHit ? c.bad : c.ok; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        if (blockedHit && clickT > 0.3) text(ctx, '✗', cx, bb[1] - 12, c.bad, { align: 'center' });
      }
      // Vista lateral del raycast
      zone(ctx, ...S, L.ray, c, { fill: c.bg, stroke: c.border });
      const yTop = S[1] + 30, yP = S[1] + S[3] * (narrow ? 0.5 : 0.45), yB = S[1] + S[3] * (narrow ? 0.84 : 0.8);
      const lx = S[0] + 12, rx = S[0] + S[2] - 12, mx = S[0] + S[2] * 0.68;
      if (active) {
        line(ctx, mx - 40, yP, rx, yP, blockedHit || (mode !== 'group' || blocks) ? c.accent : c.muted, 3, mode === 'group' && !blocks ? [5, 4] : null);
        text(ctx, fit(ctx, L.panel + (mode === 'group' && !narrow ? ' (CanvasGroup)' : ''), mx - 48 - lx), lx, yP, c.text);
      }
      line(ctx, mx - 40, yB, rx, yB, c.accent, 3);
      text(ctx, fit(ctx, L.bgBtn, mx - 48 - lx), lx, yB, c.text);
      text(ctx, '👆', mx, yTop - 6, c.text, { align: 'center' });
      if (clickT >= 0) {
        const end = blockedHit ? yP : yB;
        const yy = lerp(yTop + 4, end, clamp(clickT / 0.35, 0, 1));
        arrow(ctx, mx, yTop + 4, mx, yy, blockedHit ? c.bad : c.ok, 2.5);
      }

      const st = L.state + ': alpha <b>' + a.toFixed(2) + '</b> · ' + L.active + ' <b>' + active + '</b> · ' + L.blocks + ' <b>' + ((active && (mode !== 'group' || blocks)) ? L.yes : L.no) + '</b>';
      let msg = st;
      if (clickT >= 0) msg += '<p>' + (blockedHit ? bad(L.blocked) : ok(L.clicked)) + '</p>';
      msg += '<p class="small">' + (mode === 'image' ? L.children : mode === 'active' ? L.instant : L.group) + '</p>';
      out(msg);
      const src = mode === 'image'
        ? ['var col = panelImage.color;', 'col.a = Mathf.MoveTowards(col.a, 0f, Time.unscaledDeltaTime / fade);', 'panelImage.color = col;   ' + L.c1]
        : mode === 'active' ? ['panel.SetActive(false);   ' + L.c2]
          : ['group.blocksRaycasts = false;   ' + L.c3, 'group.interactable = false;', 'while (group.alpha > 0f)', '{', '    group.alpha -= Time.unscaledDeltaTime / fade;', '    yield return null;', '}'];
      cb(src.join('\n'), mode === 'image' ? { 2: 'bad' } : mode === 'active' ? { 0: 'hl' } : { 0: 'ok', 1: 'ok', 4: hidden && a > 0 ? 'hl' : undefined });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     9. AudioMixer: decibelios y parámetros expuestos
     --------------------------------------------------------- */

  function mountMixer(host, lang) {
    const L = {
      es: { tabs: ['Slider → dB', 'SetFloat'], vol: 'Slider de volumen', zero: 'Probar v = 0', perc: 'Sonoridad percibida ≈', gain: 'Señal',
        exposed: 'Parámetro expuesto (Expose to script)', list: 'Exposed Parameters', group: 'Grupo Music', name: 'Nombre:',
        logOk: 'Escala logarítmica, como el oído: 1 → 0 dB, 0.5 → −6 dB, 0.0001 → −80 dB.',
        lin: 'Lineal: la mitad del slider ya es −40 dB y casi no se oye; todo el volumen útil queda en el último tramo.',
        raw: 'Sin convertir: el mixer recibe 0…1 dB, así que el volumen está casi al máximo en todo el recorrido.',
        pow: '<code>Pow(10, v)</code> da +1…+10 dB: amplifica por encima de 0 dB y puede saturar.',
        inf: '<code>Mathf.Log10(0)</code> = −∞: por eso el mínimo del slider es 0.0001 (= −80 dB).',
        notExp: 'El parámetro no está expuesto: en el AudioMixer, clic derecho en el Volume del grupo → <b>Expose … to script</b>, y renómbralo en Exposed Parameters.',
        typo: 'El nombre no coincide (distingue mayúsculas y espacios): <code>SetFloat</code> no lo encuentra.',
        okSet: 'Encontró el parámetro expuesto y el fader del grupo cambió.' },
      en: { tabs: ['Slider → dB', 'SetFloat'], vol: 'Volume slider', zero: 'Try v = 0', perc: 'Perceived loudness ≈', gain: 'Signal',
        exposed: 'Parameter exposed (Expose to script)', list: 'Exposed Parameters', group: 'Music group', name: 'Name:',
        logOk: 'Logarithmic scale, like the ear: 1 → 0 dB, 0.5 → −6 dB, 0.0001 → −80 dB.',
        lin: 'Linear: half the slider is already −40 dB and almost silent; all the useful range is squeezed at the end.',
        raw: 'Not converted: the mixer gets 0…1 dB, so the volume is near maximum across the whole range.',
        pow: '<code>Pow(10, v)</code> gives +1…+10 dB: it boosts above 0 dB and can clip.',
        inf: '<code>Mathf.Log10(0)</code> = −∞: that is why the slider minimum is 0.0001 (= −80 dB).',
        notExp: 'The parameter is not exposed: in the AudioMixer, right-click the group\'s Volume → <b>Expose … to script</b>, and rename it in Exposed Parameters.',
        typo: 'The name does not match (case and spaces matter): <code>SetFloat</code> cannot find it.',
        okSet: 'It found the exposed parameter and the group fader moved.' }
    }[lang];
    const F = {
      log: { l: 'Mathf.Log10(v) * 20f', f: (v) => (v <= 0 ? -Infinity : Math.log10(v) * 20) },
      lin: { l: 'v * 80f - 80f', f: (v) => v * 80 - 80 },
      raw: { l: 'v', f: (v) => v },
      pow: { l: 'Mathf.Pow(10f, v)', f: (v) => Math.pow(10, v) }
    };
    let tab = 'db', fk = 'lin', v = 0.5, zero = false, t = 0;
    let exposed = false, pname = 'MusicVolume', fader = 0, call = null, ret = null, why = '';
    const panes = tabs(host, [{ v: 'db', l: L.tabs[0] }, { v: 'set', l: L.tabs[1] }], tab, (x) => { tab = x; });
    const c1 = controls(panes.db);
    seg(c1, Object.keys(F).map((k) => ({ v: k, l: F[k].l })), fk, (x) => { fk = x; });
    const c1b = controls(panes.db);
    const sl = slider(c1b, L.vol, 0.0001, 1, 0.0001, v, (x) => { v = x; zero = false; }, (x) => x.toFixed(4));
    void sl;
    button(c1b, L.zero, () => { zero = true; });
    const c2 = controls(panes.set);
    toggle(c2, L.exposed, exposed, (x) => { exposed = x; ret = null; });
    c2.appendChild(el('span', 'muted small', L.name));
    seg(c2, [{ v: 'MusicVolume', l: '"MusicVolume"' }, { v: 'musicVolume', l: '"musicVolume"' }, { v: 'Music Volume', l: '"Music Volume"' }], pname, (x) => { pname = x; ret = null; });
    const c2b = controls(panes.set);
    button(c2b, 'SetFloat(…, -10f)', () => { call = { t: 0, db: -10 }; ret = null; }, true);
    button(c2b, 'SetFloat(…, 0f)', () => { call = { t: 0, db: 0 }; ret = null; });
    const H = (w) => (tab === 'db' ? (w < 560 ? 270 : 220) : 210);
    const stage = makeCanvas(host, H);
    const out = readout(host);
    const cb = codeBlock(host);
    const perceived = (db) => (db === -Infinity ? 0 : Math.pow(2, db / 10));

    function drawDb(ctx, w, h, c) {
      const narrow = w < 560;
      const G = narrow ? [46, 14, w - 60, 150] : [46, 14, w * 0.6 - 56, h - 44];
      const yOf = (db) => G[1] + (12 - clamp(db, -80, 12)) / 92 * G[3];
      const xOf = (x) => G[0] + x * G[2];
      [0, -20, -40, -60, -80].forEach((d) => {
        line(ctx, G[0], yOf(d), G[0] + G[2], yOf(d), c.border, 1);
        text(ctx, d + ' dB', G[0] - 6, yOf(d), c.muted, { align: 'right' });
      });
      [0, 0.5, 1].forEach((x) => text(ctx, String(x), xOf(x), G[1] + G[3] + 12, c.muted, { align: 'center' }));
      const curve = (fn, col, lw, alpha) => {
        ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        for (let i = 0; i <= 120; i++) { const x = Math.max(0.0001, i / 120); const X = xOf(x), Y = yOf(fn(x)); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
        ctx.stroke(); ctx.globalAlpha = 1;
      };
      if (fk !== 'log') curve(F.log.f, c.ok, 2, 0.35);
      const col = fk === 'log' ? c.ok : c.bad;
      curve(F[fk].f, col, 3, 1);
      const vv = zero ? 0 : v;
      const db = F[fk].f(vv);
      const mx = xOf(vv), my = db === -Infinity ? G[1] + G[3] : yOf(db);
      line(ctx, mx, G[1], mx, G[1] + G[3], c.muted, 1, [3, 3]);
      dot(ctx, mx, my, 6, db === -Infinity ? c.bad : col);
      const lbl = db === -Infinity ? '−∞ dB' : (db > 0 ? '+' : '') + db.toFixed(1) + ' dB';
      const lx0 = clamp(mx + 10, G[0] + 4, G[0] + G[2] - 74), ly0 = clamp(my - 14, G[1] + 8, G[1] + G[3] - 8);
      ctx.fillStyle = c.bg; ctx.fillRect(lx0 - 3, ly0 - 9, tw(ctx, lbl, true) + 6, 18);
      text(ctx, lbl, lx0, ly0, db === -Infinity ? c.bad : c.text, { mono: true });
      // Sonoridad percibida y onda
      const P = narrow ? [12, G[1] + G[3] + 28, w - 24, h - (G[1] + G[3] + 36)] : [w * 0.6 + 4, 14, w * 0.4 - 16, h - 28];
      const pr = perceived(db);
      text(ctx, L.perc + ' ' + Math.round(pr * 100) + ' %', P[0], P[1] + 8, pr > 1.01 ? c.warn : c.text);
      ctx.fillStyle = c.soft; roundRect(ctx, P[0], P[1] + 20, P[2], 14, 7); ctx.fill();
      ctx.fillStyle = pr > 1.01 ? c.warn : c.accent; roundRect(ctx, P[0], P[1] + 20, Math.max(8, P[2] * Math.min(1, pr)), 14, 7); ctx.fill();
      const gain = db === -Infinity ? 0 : Math.pow(10, db / 20);
      const wy = P[1] + 44 + (P[3] - 44) / 2, amp = Math.min((P[3] - 50) / 2, 40) * Math.min(1.3, gain);
      if (P[3] > 60) {
        text(ctx, L.gain, P[0], P[1] + 50, c.muted);
        ctx.strokeStyle = gain > 1.01 ? c.warn : c.accent; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 80; i++) { const x = P[0] + (i / 80) * P[2]; const y = wy + Math.sin(i / 80 * Math.PI * 6 + t * 8) * amp; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
      }
      let msg = code(F[fk].l.replace('v', zero ? '0' : v.toFixed(4)) + ' = ' + lbl);
      msg += '<p>' + (zero && fk === 'log' ? bad(L.inf) : fk === 'log' ? ok(L.logOk) : bad(L[fk])) + '</p>';
      out(msg);
      cb(['public void SetMusicVolume(float v)   // slider 0.0001 … 1', '{', '    mixer.SetFloat("MusicVolume", ' + F[fk].l + ');', '}'].join('\n'), { 2: fk === 'log' ? 'ok' : 'bad' });
    }

    function drawSet(ctx, w, h, c) {
      const callTxt = 'mixer.SetFloat("' + pname + '", ' + (call ? call.db : -10) + 'f)';
      const cx = w / 2;
      const narrow = w < 560;
      chip(ctx, cx, 22, narrow ? callTxt.replace('mixer.', '') : callTxt, c.soft, c.text, true);
      const LB = [narrow ? 12 : w * 0.16, 56, narrow ? w * 0.6 - 18 : Math.min(260, w * 0.4), 130];
      const FD = [narrow ? w * 0.6 + 4 : w * 0.62, 56, narrow ? w * 0.4 - 16 : 138, 140];
      zone(ctx, ...LB, L.list, c);
      const params = (exposed ? ['MusicVolume'] : []).concat(['SFXVolume']);
      const match = exposed && pname === 'MusicVolume';
      params.forEach((p, i) => {
        const y = LB[1] + 30 + i * 28;
        const hit = call && call.t > 0.6 && p === 'MusicVolume' && match;
        node(ctx, LB[0] + 8, y, LB[2] - 16, 24, p, hit ? c.ok : c.bg, hit ? '#fff' : c.text, { mono: true, stroke: c.border, lw: 1 });
      });
      // Fader
      zone(ctx, ...FD, narrow ? 'Music' : L.group, c);
      const ty = FD[1] + 30, tb = FD[1] + FD[3] - 12;
      const yOf = (db) => ty + (20 - db) / 100 * (tb - ty);
      const tx = FD[0] + 30;
      line(ctx, tx, ty, tx, tb, c.border, 4);
      [20, 0, -20, -40, -80].forEach((d) => text(ctx, (d > 0 ? '+' : '') + d, tx + 16, yOf(d), c.muted, { mono: true }));
      box(ctx, tx - 12, yOf(fader) - 6, 24, 12, '', c.accent, '#fff', { r: 3 });
      if (call) {
        call.t += 1 / 60;
        const from = [cx, 34], toL = [LB[0] + LB[2] / 2, LB[1] + 30], toF = [tx, yOf(call.db)];
        let p = null;
        if (call.t < 0.6) p = mix2(from, toL, ease(call.t / 0.6));
        else if (match && call.t < 1.2) p = mix2(toL, toF, ease((call.t - 0.6) / 0.6));
        else if (!match && call.t < 1.2) p = [toL[0] + Math.sin(call.t * 40) * 4, toL[1]];
        if (p) dot(ctx, p[0], p[1], 6, match ? c.accent : c.bad);
        if (match && call.t >= 1.2) fader = lerp(fader, call.db, 0.15);
        if (call.t >= 1.2 && ret === null) {
          ret = match;
          why = match ? ok(L.okSet) : bad(!exposed ? L.notExp : L.typo);
        }
      }
      out((ret === null ? code(callTxt) : code(callTxt) + ' → <b style="color:var(--' + (ret ? 'ok' : 'bad') + ')">' + ret + '</b><p>' + why + '</p>'));
      cb(['bool found = mixer.SetFloat("' + pname + '", dB);', 'if (!found) Debug.LogWarning("Exposed parameter not found");'].join('\n'), ret === null ? {} : { 0: ret ? 'ok' : 'bad' });
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w } = stage;
      const want = H(w);
      if (stage.h !== want) resizeStage(stage, want);
      ctx.clearRect(0, 0, w, stage.h);
      if (tab === 'db') drawDb(ctx, w, stage.h, c); else drawSet(ctx, w, stage.h, c);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     10. QualitySettings: presets Low / Medium / High
     --------------------------------------------------------- */

  function mountQuality(host, lang) {
    const L = {
      es: { api: 'El selector llama a:', exp: 'applyExpensiveChanges', save: 'Guardar con PlayerPrefs', reopen: 'Cerrar y reabrir el juego',
        shadows: 'Sombras', tex: 'Texturas', none: 'no', hard: 'duras', soft: 'suaves', full: 'completa', half: '½', quarter: '¼',
        applied: 'Aplicado el nivel', aaKept: 'El antialiasing <b>no cambió</b>: con <code>applyExpensiveChanges = false</code> no se aplican los cambios costosos.',
        res: '<code>Screen.SetResolution</code> solo cambia la resolución / pantalla completa: sombras, AA y texturas siguen igual.',
        fps: '<code>Application.targetFrameRate</code> solo limita los FPS: no cambia el preset de calidad.',
        restored: 'Al abrir, se leyó <code>PlayerPrefs.GetInt("quality")</code> y se aplicó', lost: 'No se guardó la elección: al abrir se usa el nivel por defecto del proyecto',
        preview: 'vista simplificada', jag: 'off (dientes de sierra)' },
      en: { api: 'The dropdown calls:', exp: 'applyExpensiveChanges', save: 'Save with PlayerPrefs', reopen: 'Close and reopen the game',
        shadows: 'Shadows', tex: 'Textures', none: 'off', hard: 'hard', soft: 'soft', full: 'full', half: '½', quarter: '¼',
        applied: 'Applied level', aaKept: 'Anti-aliasing <b>did not change</b>: with <code>applyExpensiveChanges = false</code> expensive changes are not applied.',
        res: '<code>Screen.SetResolution</code> only changes resolution / fullscreen: shadows, AA and textures stay the same.',
        fps: '<code>Application.targetFrameRate</code> only caps the FPS: it does not change the quality preset.',
        restored: 'On startup, <code>PlayerPrefs.GetInt("quality")</code> was read and applied', lost: 'The choice was not saved: on startup the project\'s default level is used',
        preview: 'simplified preview', jag: 'off (jaggies)' }
    }[lang];
    const NAMES = ['Low', 'Medium', 'High'];
    const PRE = [{ sh: 'none', aa: false, tex: 8 }, { sh: 'hard', aa: false, tex: 16 }, { sh: 'soft', aa: true, tex: 64 }];
    let api = 'quality', expensive = true, saveIt = true, level = 2, saved = null, msg = '', t = 0;
    let cur = { sh: 'soft', aa: true, tex: 64 };
    const ctl = controls(host);
    const presetSeg = seg(ctl, NAMES.map((n, i) => ({ v: String(i), l: n })), String(level), (v) => choose(Number(v)));
    toggle(ctl, L.exp, expensive, (x) => { expensive = x; });
    const ctl2 = controls(host);
    ctl2.appendChild(el('span', 'muted small', L.api));
    seg(ctl2, [{ v: 'quality', l: 'QualitySettings.SetQualityLevel' }, { v: 'res', l: 'Screen.SetResolution' }, { v: 'fps', l: 'Application.targetFrameRate' }], api, (x) => { api = x; msg = ''; });
    const ctl3 = controls(host);
    toggle(ctl3, L.save, saveIt, (x) => { saveIt = x; });
    button(ctl3, L.reopen, reopen);
    const stage = makeCanvas(host, (w) => (w < 560 ? 210 : 260));
    const out = readout(host);
    const cb = codeBlock(host);
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');
    const texCache = {};

    function setSeg(g, i) { Array.from(g.children).forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-pressed', String(k === i)); }); }
    function apply(i, exp) {
      const p = PRE[i];
      cur.sh = p.sh; cur.tex = p.tex;
      if (exp) cur.aa = p.aa;
      level = i;
    }
    function choose(i) {
      if (api !== 'quality') { msg = warn(L[api]); return; }
      const before = cur.aa;
      apply(i, expensive);
      if (saveIt) saved = i;
      msg = ok(L.applied + ' <b>' + NAMES[i] + '</b>.') + (!expensive && before !== PRE[i].aa ? '<p>' + warn(L.aaKept) + '</p>' : '');
    }
    function reopen() {
      const i = saved === null ? 2 : saved;
      cur = { sh: 'soft', aa: true, tex: 64 };
      apply(i, true);
      setSeg(presetSeg, i);
      msg = saved === null ? warn(L.lost + ' (<b>High</b>).') : ok(L.restored + ' <b>' + NAMES[i] + '</b>.');
    }
    function tex(n) {
      if (texCache[n]) return texCache[n];
      const base = document.createElement('canvas'); base.width = base.height = 64;
      const b = base.getContext('2d');
      b.fillStyle = '#e9dcc4'; b.fillRect(0, 0, 64, 64);
      for (let r = 0; r < 8; r++) for (let k = -1; k < 4; k++) {
        b.fillStyle = (r + k) % 3 ? '#b4532a' : '#9c4422';
        b.fillRect(k * 16 + (r % 2 ? 8 : 0) + 1, r * 8 + 1, 14, 6);
      }
      const cv = document.createElement('canvas'); cv.width = cv.height = n;
      const x = cv.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(base, 0, 0, n, n);
      texCache[n] = cv;
      return cv;
    }
    function scene(g, W, H, q) {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#8fbde8'); sky.addColorStop(1, '#d8eaf8');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      const gy = H * 0.66;
      g.fillStyle = '#6f9255'; g.fillRect(0, gy, W, H - gy);
      const S = Math.min(W * 0.26, H * 0.42), cx = W * 0.55, cy = gy - S * 0.42;
      if (q.sh !== 'none') {
        const ex = cx + S * 0.35, ey = gy + S * 0.06, rx = S * 0.75, ry = S * 0.14;
        if (q.sh === 'soft') {
          const gr = g.createRadialGradient(ex, ey, 0, ex, ey, rx);
          gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.save(); g.translate(ex, ey); g.scale(1, ry / rx); g.translate(-ex, -ey);
          g.fillStyle = gr; g.beginPath(); g.arc(ex, ey, rx, 0, Math.PI * 2); g.fill(); g.restore();
        } else {
          g.fillStyle = 'rgba(0,0,0,.42)'; g.beginPath(); g.ellipse(ex, ey, rx * 0.8, ry, 0, 0, Math.PI * 2); g.fill();
        }
      }
      // Postes finos (se nota mucho el aliasing en las diagonales)
      g.strokeStyle = '#4b3a2a'; g.lineWidth = Math.max(1, W / 200);
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(W * (0.06 + k * 0.07), gy + 4); g.lineTo(W * (0.16 + k * 0.07), H * 0.12); g.stroke(); }
      g.save(); g.translate(cx, cy); g.rotate(0.35 * Math.sin(t * 0.7));
      g.imageSmoothingEnabled = true;
      g.drawImage(tex(q.tex), -S / 2, -S / 2, S, S);
      g.strokeStyle = '#3d2a1a'; g.lineWidth = Math.max(1, S / 30); g.strokeRect(-S / 2, -S / 2, S, S);
      g.restore();
    }

    const stop = loop((dt) => {
      t += dt;
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const PW = w - 24, PH = h - 46;
      const r = cur.aa ? 1 : 1 / 3;
      off.width = Math.max(1, Math.round(PW * r)); off.height = Math.max(1, Math.round(PH * r));
      scene(octx, off.width, off.height, cur);
      ctx.save();
      roundRect(ctx, 12, 10, PW, PH, 8); ctx.clip();
      ctx.imageSmoothingEnabled = cur.aa;
      ctx.drawImage(off, 12, 10, PW, PH);
      ctx.restore();
      ctx.imageSmoothingEnabled = true;
      const thR = { none: L.none, hard: L.hard, soft: L.soft }[cur.sh];
      const tx = cur.tex === 64 ? L.full : cur.tex === 16 ? L.half : L.quarter;
      text(ctx, fit(ctx, NAMES[level] + ' · ' + L.shadows + ': ' + thR + ' · ' + L.tex + ': ' + tx, w - 24), 12, h - 28, c.text);
      text(ctx, 'AA: ' + (cur.aa ? 'MSAA 4x' : L.jag), 12, h - 11, cur.aa ? c.ok : c.warn);
      text(ctx, L.preview, w - 18, 22, '#2b3a4a', { align: 'right' });
      out((msg || code('QualitySettings.GetQualityLevel() = ' + level) + ' (' + NAMES[level] + ')'));
      const call = api === 'quality' ? 'QualitySettings.SetQualityLevel(index, ' + expensive + ');'
        : api === 'res' ? 'Screen.SetResolution(1280, 720, FullScreenMode.FullScreenWindow);' : 'Application.targetFrameRate = 30;';
      cb(['public void OnQualityChanged(int index)   // Low, Medium, High', '{', '    ' + call, (saveIt ? '    ' : '    // ') + 'PlayerPrefs.SetInt("quality", index);', '}', '',
        'void Start() =>', '    QualitySettings.SetQualityLevel(PlayerPrefs.GetInt("quality", 2), true);'].join('\n'),
      { 2: api === 'quality' ? (expensive ? 'ok' : 'hl') : 'bad', 3: saveIt ? 'ok' : 'off' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     11. ScriptableObjects: datos compartidos (no son un sistema de guardado)
     --------------------------------------------------------- */

  function mountScriptableObjects(host, lang) {
    const L = {
      es: { copy: 'Datos copiados en cada prefab', so: 'Referencias a un ScriptableObject', dmg: 'Daño de Sword (en runtime)', reopen: 'Cerrar y reabrir',
        copies: '100 copias de los datos', soMem: '3 assets + 100 referencias', mem: 'Memoria de datos (aprox.)',
        one: (n) => 'Cada instancia tiene su propia copia: solo cambió <b>1</b> de las ' + n + ' espadas; las demás siguen igual.',
        all: (n) => 'Las ' + n + ' espadas apuntan al <b>mismo</b> asset <code>Sword.asset</code>: al cambiar su daño, todas lo ven al instante.',
        build: 'En una build, los cambios hechos en runtime a un ScriptableObject <b>no se guardan</b>: al reabrir vuelve al valor con el que se compiló. No es un sistema de guardado (usa JSON o PlayerPrefs).',
        editor: 'En el Editor, el cambio <b>sí queda guardado en el asset</b> (incluso los hechos en Play Mode). Cuidado: no es lo que pasará en la build.',
        reset: 'Al reabrir, las instancias de la escena vuelven a los valores del prefab.', hint: 'Mueve el slider de daño.', each: 'cada instancia guarda su copia' },
      en: { copy: 'Data copied in each prefab', so: 'References to a ScriptableObject', dmg: 'Sword damage (at runtime)', reopen: 'Close and reopen',
        copies: '100 copies of the data', soMem: '3 assets + 100 references', mem: 'Data memory (approx.)',
        one: (n) => 'Each instance has its own copy: only <b>1</b> of the ' + n + ' swords changed; the others stay the same.',
        all: (n) => 'All ' + n + ' swords point to the <b>same</b> <code>Sword.asset</code>: change its damage and they all see it instantly.',
        build: 'In a build, runtime changes to a ScriptableObject are <b>not saved</b>: when reopened it goes back to the value it was built with. It is not a save system (use JSON or PlayerPrefs).',
        editor: 'In the Editor the change <b>is saved in the asset</b> (even changes made in Play Mode). Careful: that is not what happens in a build.',
        reset: 'On reopen, the scene instances go back to the prefab values.', hint: 'Move the damage slider.', each: 'each instance stores its own copy' }
    }[lang];
    const TYPES = ['Sword', 'Bow', 'Axe'], ORIG = [10, 8, 14], PRICE = [100, 80, 140];
    const count = [34, 33, 33];
    let mode = 'so', env = 'build', soDmg = ORIG.slice(), assetDmg = ORIG.slice(), copies, flash, msg = '', mute = false;
    function resetCopies() { copies = Array.from({ length: 100 }, (_, i) => ORIG[i % 3]); flash = new Array(100).fill(0); }
    resetCopies();
    const ctl = controls(host);
    seg(ctl, [{ v: 'copy', l: L.copy }, { v: 'so', l: L.so }], mode, (v) => { mode = v; soDmg = ORIG.slice(); assetDmg = ORIG.slice(); resetCopies(); msg = ''; setSlider(10); });
    const ctl2 = controls(host);
    const sl = slider(ctl2, L.dmg, 5, 50, 1, 10, (v) => {
      if (mute) return;
      msg = '';
      if (mode === 'so') {
        soDmg[0] = v; if (env === 'editor') assetDmg[0] = v;
        for (let i = 0; i < 100; i += 3) flash[i] = 0.8;
      } else { copies[0] = v; flash[0] = 0.8; }
    });
    seg(ctl2, [{ v: 'editor', l: 'Editor' }, { v: 'build', l: 'Build' }], env, (v) => { env = v; if (v === 'editor') assetDmg = soDmg.slice(); });
    button(ctl2, L.reopen, () => {
      if (mode === 'so') {
        soDmg = env === 'editor' ? assetDmg.slice() : ORIG.slice();
        msg = env === 'editor' ? warn(L.editor) : bad(L.build);
      } else { resetCopies(); msg = L.reset; }
      setSlider(mode === 'so' ? soDmg[0] : copies[0]);
      for (let i = 0; i < 100; i += 3) flash[i] = 0.8;
    }, true);
    function setSlider(v) { mute = true; sl.value = v; sl.dispatchEvent(new Event('input')); mute = false; }
    const stage = makeCanvas(host, (w) => (w < 560 ? Math.min(30, Math.floor((w - 24) / 10)) * 10 + 150 : 300));
    const out = readout(host);
    const cb = codeBlock(host);

    const stop = loop((dt) => {
      for (let i = 0; i < 100; i++) flash[i] = Math.max(0, flash[i] - dt);
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const cell = narrow ? Math.min(30, Math.floor((w - 24) / 10)) : 22;
      const gx = narrow ? Math.floor((w - cell * 10) / 2) : 12, gy = 10;
      const tcol = [c.accent, c.warn, c.ok];
      // Tarjetas de los assets (o la pila de copias)
      const cards = TYPES.map((n, k) => narrow
        ? [12 + k * ((w - 24 - 16) / 3 + 8), gy + cell * 10 + 12, (w - 24 - 16) / 3, 46]
        : [gx + cell * 10 + 60, 14 + k * 62, Math.min(230, w - (gx + cell * 10 + 60) - 12), 50]);
      const cellC = (i) => [gx + (i % 10) * cell + cell / 2, gy + Math.floor(i / 10) * cell + cell / 2];
      if (mode === 'so') {
        for (let i = 0; i < 100; i++) {
          const k = i % 3, cd = cards[k];
          const [x, y] = cellC(i);
          ctx.globalAlpha = flash[i] > 0 ? 0.7 : (k === 0 ? 0.22 : 0.08);
          line(ctx, x, y, narrow ? cd[0] + cd[2] / 2 : cd[0], narrow ? cd[1] : cd[1] + cd[3] / 2, tcol[k], 1);
        }
        ctx.globalAlpha = 1;
        cards.forEach((cd, k) => {
          ctx.fillStyle = c.soft; roundRect(ctx, ...cd, 8); ctx.fill();
          ctx.fillStyle = tcol[k]; ctx.fillRect(cd[0], cd[1] + 6, 4, cd[3] - 12);
          text(ctx, fit(ctx, TYPES[k] + (narrow ? '' : '.asset'), cd[2] - 16), cd[0] + 10, cd[1] + 15, c.text);
          text(ctx, fit(ctx, 'dmg ' + soDmg[k] + (narrow ? '' : ' · $' + PRICE[k]), cd[2] - 16), cd[0] + 10, cd[1] + 33, c.muted, { mono: true });
        });
      } else {
        const zx = narrow ? 12 : cards[0][0], zy = narrow ? cards[0][1] : 14, zw = narrow ? w - 24 : cards[0][2], zh = narrow ? 46 : 174;
        ctx.fillStyle = c.badSoft; roundRect(ctx, zx, zy, zw, zh, 8); ctx.fill();
        const n = 100, rows = narrow ? 2 : 10, per = Math.ceil(n / rows);
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / per), q = i % per;
          ctx.fillStyle = tcol[i % 3];
          ctx.fillRect(zx + 8 + q * ((zw - 16) / per), zy + 22 + r * (narrow ? 10 : 14), Math.max(1, (zw - 16) / per - 1.5), narrow ? 6 : 9);
        }
        text(ctx, fit(ctx, 'WeaponData × 100' + (narrow ? '' : ' (' + L.each + ')'), zw - 16), zx + 8, zy + 11, c.bad);
      }
      for (let i = 0; i < 100; i++) {
        const k = i % 3;
        const x = gx + (i % 10) * cell, y = gy + Math.floor(i / 10) * cell;
        ctx.fillStyle = tcol[k]; ctx.globalAlpha = 0.85;
        roundRect(ctx, x + 1, y + 1, cell - 2, cell - 2, 4); ctx.fill(); ctx.globalAlpha = 1;
        if (flash[i] > 0) { ctx.strokeStyle = c.text; ctx.lineWidth = 2; roundRect(ctx, x + 1, y + 1, cell - 2, cell - 2, 4); ctx.stroke(); }
        const d = mode === 'so' ? soDmg[k] : copies[i];
        text(ctx, String(d), x + cell / 2, y + cell / 2, '#fff', { align: 'center' });
      }
      // Barras de memoria
      const by = h - 26, bw = w - 24;
      if (!narrow) text(ctx, L.mem, 12, by - 14, c.muted);
      ctx.fillStyle = c.soft; roundRect(ctx, 12, by, bw, 14, 7); ctx.fill();
      const units = mode === 'so' ? 3 + 100 * 0.1 : 100;
      ctx.fillStyle = mode === 'so' ? c.ok : c.bad; roundRect(ctx, 12, by, Math.max(14, bw * units / 100), 14, 7); ctx.fill();
      text(ctx, mode === 'so' ? L.soMem : L.copies, narrow ? 12 : w - 14, by - 14, mode === 'so' ? c.ok : c.bad, { align: narrow ? 'left' : 'right' });
      const changedCopies = copies.filter((d, i) => i % 3 === 0 && d !== ORIG[0]).length;
      out((msg ? msg : mode === 'so' ? (soDmg[0] !== ORIG[0] ? ok(L.all(count[0])) : '<span class="muted">' + L.hint + '</span>') : (changedCopies ? warn(L.one(count[0])) : '<span class="muted">' + L.hint + '</span>')));
      cb(mode === 'so'
        ? ['[CreateAssetMenu(menuName = "Game/Weapon")]', 'public class WeaponData : ScriptableObject', '{', '    public int damage;', '    public Sprite icon;', '    public int price;', '}', '', 'public class Weapon : MonoBehaviour', '{', '    [SerializeField] WeaponData data;   // referencia al asset', '}'].join('\n')
        : ['public class Weapon : MonoBehaviour', '{', '    public int damage = 10;   // copia en cada instancia', '    public Sprite icon;', '    public int price = 100;', '}'].join('\n'),
      mode === 'so' ? { 10: 'ok' } : { 2: 'bad', 4: 'bad' });
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     12. Eventos: suscribirse en OnEnable y desuscribirse en OnDisable
     --------------------------------------------------------- */

  function mountEvents(host, lang) {
    const L = {
      es: { design: ['Evento (+= / -=)', 'Polling en Update', 'GameObject.Find'], unsub: 'Desuscribirse en OnDisable (-=)', up: 'Subir de nivel', load: 'Cargar otra escena', reset: 'Reiniciar',
        destroyed: 'destruido', checks: 'Comprobaciones', changes: 'cambios reales', knows: 'conoce la UI ✗',
        exc: 'El evento <code>static</code> sobrevive al cambio de escena y aún apunta a <code>UpdateUI</code> del HUD destruido: al acceder a <code>levelText</code> salta <b>MissingReferenceException</b> y los suscriptores siguientes ya no se llaman.',
        leak: 'Además, el delegado mantiene vivo el objeto C# del HUD destruido: el GC no puede liberarlo.',
        fine: 'Cada listener se desuscribe en <code>OnDisable</code>; el nuevo HUD se suscribe en su <code>OnEnable</code>. El emisor no sabe quién escucha (bajo acoplamiento).',
        ok: 'Todos los suscriptores recibieron el nivel.', poll: 'Cada listener pregunta el nivel en cada frame: miles de comprobaciones para unos pocos cambios.',
        find: 'El sistema de progresión busca la UI por nombre: queda acoplado a ella, y <code>Find</code> recorre la jerarquía (lento y frágil si cambias el nombre).',
        hint: 'Sube de nivel, carga otra escena y vuelve a subir de nivel.', list: 'Lista de invocación' },
      en: { design: ['Event (+= / -=)', 'Polling in Update', 'GameObject.Find'], unsub: 'Unsubscribe in OnDisable (-=)', up: 'Level up', load: 'Load another scene', reset: 'Reset',
        destroyed: 'destroyed', checks: 'Checks', changes: 'real changes', knows: 'knows the UI ✗',
        exc: 'The <code>static</code> event survives the scene change and still points to the destroyed HUD\'s <code>UpdateUI</code>: accessing <code>levelText</code> throws <b>MissingReferenceException</b> and the following subscribers are not called.',
        leak: 'The delegate also keeps the destroyed HUD\'s C# object alive: the GC cannot free it.',
        fine: 'Each listener unsubscribes in <code>OnDisable</code>; the new HUD subscribes in its <code>OnEnable</code>. The emitter does not know who listens (low coupling).',
        ok: 'Every subscriber received the level.', poll: 'Each listener asks for the level every frame: thousands of checks for a few changes.',
        find: 'The progression system looks up the UI by name: it becomes coupled to it, and <code>Find</code> walks the hierarchy (slow, and fragile if you rename it).',
        hint: 'Level up, load another scene and level up again.', list: 'Invocation list' }
    }[lang];
    let design = 'event', unsub = false, level, lis, subs, hudN, pulse, msg, checks, changes, lastSeen, pollAcc;
    function reset() {
      level = 1; hudN = 1; pulse = null; msg = ''; checks = 0; changes = 0; lastSeen = 1; pollAcc = 0;
      lis = [{ id: 'hud1', label: 'HUD #1', alive: true, lv: 1, hud: true }, { id: 'snd', label: 'Sound', alive: true }, { id: 'ach', label: 'Achievements', alive: true }];
      subs = lis.map((l) => l);
    }
    reset();
    const ctl = controls(host);
    seg(ctl, ['event', 'poll', 'find'].map((v, i) => ({ v, l: L.design[i] })), design, (v) => { design = v; reset(); });
    toggle(ctl, L.unsub, unsub, (v) => { unsub = v; reset(); });
    const ctl2 = controls(host);
    button(ctl2, L.up, levelUp, true);
    button(ctl2, L.load, loadScene);
    button(ctl2, L.reset, reset);
    const stage = makeCanvas(host, 220);
    const out = readout(host);
    const cb = codeBlock(host);

    function levelUp() {
      level++;
      const seq = design === 'event' ? subs.slice() : design === 'find' ? lis.filter((l) => l.hud && l.alive) : [];
      pulse = { t: 0, seq, idx: 0, err: false };
      msg = '';
      if (design === 'find') msg = warn(L.find);
    }
    function loadScene() {
      const old = lis.find((l) => l.hud && l.alive);
      if (old) old.alive = false;
      if (unsub || design !== 'event') subs = subs.filter((s) => s !== old);
      hudN++;
      const nu = { id: 'hud' + hudN, label: 'HUD #' + hudN, alive: true, lv: level, hud: true };
      lis.push(nu);
      if (design === 'event') subs.push(nu);
      lis = lis.filter((l) => l.alive || subs.indexOf(l) >= 0);
      pulse = null; msg = '';
    }

    const stop = loop((dt) => {
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const ew = narrow ? w * 0.42 : Math.min(230, w * 0.3), lw = narrow ? w * 0.42 : Math.min(220, w * 0.3);
      const E = [10, h / 2 - 44, ew, 88];
      const lx = w - lw - 10;
      const rowsN = Math.max(3, lis.length);
      const rh = Math.min(48, (h - 20) / rowsN);
      const R = (k) => [lx, 10 + k * rh, lw, rh - 10];
      zone(ctx, ...E, '', c, { fill: c.accentSoft });
      const evTxt = design === 'event' ? (narrow ? 'OnLevelUp' : 'static event Action<int>') : design === 'find' ? L.knows : 'Level { get; }';
      if (narrow) { text(ctx, 'Progression', E[0] + 8, E[1] + 14, c.text); text(ctx, 'System', E[0] + 8, E[1] + 30, c.text); }
      else text(ctx, 'ProgressionSystem', E[0] + 8, E[1] + 16, c.text);
      text(ctx, 'Lv ' + level, E[0] + 8, E[1] + (narrow ? 52 : 38), c.accent, { mono: true });
      text(ctx, fit(ctx, evTxt, ew - 16, design !== 'find'), E[0] + 8, E[1] + (narrow ? 72 : 62), design === 'find' ? c.bad : c.muted, { mono: design !== 'find' });
      const from = [E[0] + E[2], E[1] + E[3] / 2];
      lis.forEach((l, k) => {
        const r = R(k);
        const sub = subs.indexOf(l) >= 0 && design === 'event';
        const to = [r[0], r[1] + r[3] / 2];
        if (sub) line(ctx, from[0], from[1], to[0] - 2, to[1], l.alive ? c.accent : c.bad, 1.5, l.alive ? null : [4, 3]);
        if (design === 'find' && l.hud && l.alive) arrow(ctx, from[0], from[1], to[0] - 2, to[1], c.bad, 1.5);
        const err = pulse && pulse.err && pulse.seq[pulse.errAt] === l;
        const got = pulse && !l.hud && pulse.done && pulse.seq.indexOf(l) >= 0 && pulse.seq.indexOf(l) < (pulse.err ? pulse.errAt : 99);
        const fill = !l.alive ? (err ? c.bad : c.bg) : got ? c.okSoft : c.soft;
        box(ctx, r[0], r[1], r[2], r[3], '', fill, c.text, { stroke: l.alive ? c.border : c.bad, lw: 1.5 });
        if (!l.alive) { ctx.setLineDash([]); }
        const lbl = l.alive ? (l.hud ? l.label + ' · Lv ' + l.lv : l.label) : '💀 ' + l.label + ' (' + L.destroyed + ')';
        text(ctx, fit(ctx, lbl, r[2] - 12), r[0] + 8, r[1] + r[3] / 2, err ? '#fff' : l.alive ? c.text : c.bad);
      });
      // Pulsos del evento
      if (pulse && design !== 'poll') {
        pulse.t += dt;
        const step = 0.4;
        while (!pulse.done && pulse.t >= step) {
          pulse.t -= step;
          const l = pulse.seq[pulse.idx];
          if (!l) { pulse.done = true; break; }
          if (!l.alive) { pulse.err = true; pulse.errAt = pulse.idx; pulse.done = true; msg = bad(L.exc) + '<p>' + L.leak + '</p>'; break; }
          if (l.hud) l.lv = level;
          pulse.idx++;
          if (pulse.idx >= pulse.seq.length) { pulse.done = true; if (design === 'event') msg = ok(L.ok) + '<p>' + (unsub ? L.fine : '') + '</p>'; }
        }
        if (!pulse.done) {
          const l = pulse.seq[pulse.idx];
          const r = R(lis.indexOf(l));
          const p = mix2(from, [r[0], r[1] + r[3] / 2], ease(pulse.t / 0.4));
          dot(ctx, p[0], p[1], 6, c.warn);
        }
      }
      if (design === 'poll') {
        pollAcc += dt;
        checks += Math.round(dt * 60) * lis.filter((l) => l.alive).length;
        const hud = lis.find((l) => l.hud && l.alive);
        if (hud && hud.lv !== level) { hud.lv = level; changes++; }
        lis.forEach((l, k) => {
          if (!l.alive) return;
          const r = R(k);
          for (let j = 0; j < 3; j++) {
            const f = ((pollAcc * 2 + j / 3 + k * 0.17) % 1);
            const p = mix2([r[0], r[1] + r[3] / 2], from, f);
            dot(ctx, p[0], p[1], 2.5, c.muted);
          }
        });
        msg = warn(L.poll) + ' ' + L.checks + ': <b>' + checks + '</b> · ' + L.changes + ': <b>' + changes + '</b>';
      }
      const listTxt = design === 'event' ? '<p class="small muted">' + L.list + ': ' + (subs.length ? subs.map((s) => code(s.label.replace(' ', '') + '.' + (s.hud ? 'UpdateUI' : 'OnLevelUp')) + (s.alive ? '' : ' 💀')).join(' → ') : '—') + '</p>' : '';
      out((msg || '<span class="muted">' + L.hint + '</span>') + listTxt);
      let src, marks = {};
      if (design === 'event') {
        src = ['// ProgressionSystem.cs', 'public static event Action<int> OnLevelUp;', 'void LevelUp() { level++; OnLevelUp?.Invoke(level); }', '', '// HUD.cs',
          'void OnEnable()  => ProgressionSystem.OnLevelUp += UpdateUI;',
          unsub ? 'void OnDisable() => ProgressionSystem.OnLevelUp -= UpdateUI;' : '// (sin OnDisable / no OnDisable)',
          'void UpdateUI(int lv) => levelText.text = "Lv " + lv;'];
        marks = { 6: unsub ? 'ok' : 'bad' };
        if (pulse && pulse.err) marks[7] = 'bad';
      } else if (design === 'poll') {
        src = ['// HUD.cs', 'void Update()', '{', '    if (progression.Level != shown)', '    {', '        shown = progression.Level;', '        levelText.text = "Lv " + shown;', '    }', '}'];
        marks = { 3: 'hl' };
      } else {
        src = ['// ProgressionSystem.cs', 'void LevelUp()', '{', '    level++;', '    GameObject.Find("LevelText").GetComponent<TMP_Text>().text = "Lv " + level;', '}'];
        marks = { 4: 'bad' };
      }
      cb(src.join('\n'), marks);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     13. UI Toolkit: Q<Button>(name) y clicked
     --------------------------------------------------------- */

  function mountUIToolkit(host, lang) {
    const L = {
      es: { run: 'Ejecutar la consulta', click: 'Clic en Play', found: 'Encontrado', nul: 'null', title: 'Mi juego',
        okQ: '<code>Q&lt;Button&gt;("play-button")</code> recorre el árbol de <code>VisualElement</code> desde <code>rootVisualElement</code> y devuelve el primero con ese <b>tipo</b> y <b>name</b>.',
        typeQ: 'Hay un elemento llamado "play-button", pero es un <code>Button</code>, no un <code>Label</code>: devuelve <code>null</code>.',
        findQ: 'Los elementos de UXML <b>no son GameObjects</b>: <code>GameObject.Find</code> no los ve y devuelve <code>null</code> (NullReferenceException). <code>onClick.AddListener</code> es de uGUI.',
        fired: '<code>clicked</code> se disparó: se ejecutó <code>OnPlay()</code>.', nre: 'NullReferenceException: <code>btn</code> es <code>null</code>.', noL: 'El botón no tiene listener todavía.',
        ugui: 'uGUI (comparación)', ugui1: 'PlayButton: GameObject + Button', hint: 'Ejecuta la consulta y luego haz clic en Play.' },
      en: { run: 'Run the query', click: 'Click Play', found: 'Found', nul: 'null', title: 'My Game',
        okQ: '<code>Q&lt;Button&gt;("play-button")</code> walks the <code>VisualElement</code> tree from <code>rootVisualElement</code> and returns the first one with that <b>type</b> and <b>name</b>.',
        typeQ: 'There is an element named "play-button", but it is a <code>Button</code>, not a <code>Label</code>: it returns <code>null</code>.',
        findQ: 'UXML elements <b>are not GameObjects</b>: <code>GameObject.Find</code> cannot see them and returns <code>null</code> (NullReferenceException). <code>onClick.AddListener</code> belongs to uGUI.',
        fired: '<code>clicked</code> fired: <code>OnPlay()</code> ran.', nre: 'NullReferenceException: <code>btn</code> is <code>null</code>.', noL: 'The button has no listener yet.',
        ugui: 'uGUI (comparison)', ugui1: 'PlayButton: GameObject + Button', hint: 'Run the query, then click Play.' }
    }[lang];
    const ROWS = [
      { d: 0, s: 'GameObject "UI" · UIDocument', go: true },
      { d: 1, s: 'rootVisualElement', ty: 'VisualElement' },
      { d: 2, s: 'VisualElement #menu', ty: 'VisualElement', name: 'menu', ux: 1 },
      { d: 3, s: 'Label #title', ty: 'Label', name: 'title', ux: 2 },
      { d: 3, s: 'Button #play-button', ty: 'Button', name: 'play-button', ux: 3 },
      { d: 3, s: 'Button #options-button', ty: 'Button', name: 'options-button', ux: 4 }
    ];
    const QS = [
      { v: 'q', l: 'root.Q<Button>("play-button")', ty: 'Button', name: 'play-button' },
      { v: 'lbl', l: 'root.Q<Label>("play-button")', ty: 'Label', name: 'play-button' },
      { v: 'find', l: 'GameObject.Find("play-button")', find: true }
    ];
    let q = QS[0], run, result, listener, fire, msg;
    function reset() { run = { t: 0 }; result = undefined; listener = false; fire = 0; msg = ''; }
    reset();
    const ctl = controls(host);
    seg(ctl, QS.map((x) => ({ v: x.v, l: esc(x.l) })), q.v, (v) => { q = QS.find((x) => x.v === v); reset(); });
    const ctl2 = controls(host);
    button(ctl2, L.run, reset);
    button(ctl2, L.click, () => {
      if (result === undefined) { msg = warn(L.noL); return; }
      if (result === null) { msg = bad(L.nre); return; }
      fire = 1; msg = ok(L.fired);
    }, true);
    const stage = makeCanvas(host, (w) => (w < 560 ? 420 : 280));
    const out = readout(host);
    const cbX = codeBlock(host);
    const cb = codeBlock(host);
    const visits = () => (q.find ? [0] : [1, 2, 3, 4, 5].slice(0, q.ty === 'Button' ? 4 : 5));

    const stop = loop((dt) => {
      fire = Math.max(0, fire - dt);
      const vs = visits();
      let cur = -1;
      if (run) {
        run.t += dt;
        const k = Math.floor(run.t / 0.45);
        if (k < vs.length) cur = vs[k];
        else if (result === undefined) {
          result = q.find ? null : (q.ty === 'Button' ? 4 : null);
          if (result === null && run.t < 9) msg = bad(q.find ? L.findQ : L.typeQ);
          else msg = ok(L.okQ);
        }
        if (result === 4 && run.t > vs.length * 0.45 + 0.6) listener = true;
      }
      const c = colors();
      const { ctx, w, h } = stage;
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560;
      const T = [10, 10, narrow ? w - 20 : w * 0.58 - 15, 176];
      zone(ctx, ...T, '', c, { fill: c.bg, stroke: c.border });
      ROWS.forEach((r, i) => {
        const y = T[1] + 10 + i * 26, x = T[0] + 10 + r.d * 16;
        const isCur = i === cur, isRes = result === i;
        const matches = !r.go && r.name === q.name && r.ty === q.ty;
        const fill = isRes ? (fire > 0 ? c.ok : c.okSoft) : isCur ? (matches ? c.okSoft : c.accentSoft) : null;
        if (fill) { ctx.fillStyle = fill; roundRect(ctx, x - 6, y, T[2] - (x - T[0]) - 4, 22, 6); ctx.fill(); }
        if (r.d) line(ctx, x - 10, y + 11, x - 4, y + 11, c.border, 1);
        text(ctx, fit(ctx, r.s, T[2] - (x - T[0]) - 16, true), x, y + 11, isRes && fire > 0 ? '#fff' : r.go ? c.warn : c.text, { mono: true });
        if (isCur && !matches) text(ctx, '✗', T[0] + T[2] - 14, y + 11, c.bad, { align: 'center' });
        if (i === 4 && listener) {
          const lbl = 'clicked += OnPlay';
          const lw0 = tw(ctx, lbl, true) + 14;
          if (!narrow || T[2] > 330) chip(ctx, T[0] + T[2] - lw0 / 2 - 8, y + 11, lbl, c.accent, '#fff', true);
          else text(ctx, '⚡', T[0] + T[2] - 14, y + 11, c.accent, { align: 'center' });
        }
      });
      // Vista previa del menú
      const P = narrow ? [10, T[1] + T[3] + 10, w - 20, 132] : [w * 0.58 + 5, 10, w * 0.42 - 15, 176];
      zone(ctx, ...P, '', c);
      text(ctx, L.title, P[0] + P[2] / 2, P[1] + 22, c.text, { align: 'center' });
      const bw = Math.min(160, P[2] - 40);
      node(ctx, P[0] + P[2] / 2 - bw / 2, P[1] + 40, bw, 28, 'Play', fire > 0 ? c.ok : c.accent, '#fff');
      node(ctx, P[0] + P[2] / 2 - bw / 2, P[1] + 76, bw, 28, 'Options', c.bg, c.text, { stroke: c.border, lw: 1 });
      if (fire > 0) text(ctx, 'OnPlay()', P[0] + P[2] / 2, P[1] + P[3] - 4, c.ok, { align: 'center', base: 'bottom', mono: true });
      // Comparación con uGUI
      const U = [10, P[1] + P[3] + 10, w - 20, h - (P[1] + P[3] + 20)];
      zone(ctx, ...U, L.ugui, c, { fill: c.bg, stroke: c.border, dash: [4, 3] });
      text(ctx, fit(ctx, (narrow ? '' : 'Canvas › ') + L.ugui1, U[2] - 20), U[0] + 10, U[1] + 34, c.text);
      text(ctx, fit(ctx, (narrow ? '' : 'button.') + 'onClick.AddListener(OnPlay);', U[2] - 20, true), U[0] + 10, U[1] + 56, c.muted, { mono: true });

      out((msg || '<span class="muted">' + L.hint + '</span>') + (result !== undefined ? '<p>' + code('btn') + ' = <b>' + (result === null ? 'null' : 'Button #play-button') + '</b></p>' : ''));
      const uxCur = cur >= 0 && ROWS[cur].ux !== undefined ? ROWS[cur].ux : (cur === 1 ? 0 : -1);
      const ux = ['<ui:UXML xmlns:ui="UnityEngine.UIElements">', '  <ui:VisualElement name="menu">', '    <ui:Label name="title" text="My Game" />', '    <ui:Button name="play-button" text="Play" />', '    <ui:Button name="options-button" text="Options" />', '  </ui:VisualElement>', '</ui:UXML>'];
      const um = {};
      if (uxCur >= 0) um[uxCur] = 'hl';
      if (result === 4) um[3] = 'ok';
      if (q.find) Object.keys(ux).forEach((k) => { um[k] = 'off'; });
      cbX(ux.join('\n'), um);
      const src = q.find
        ? ['var btn = GameObject.Find("play-button").GetComponent<Button>();', 'btn.onClick.AddListener(OnPlay);   // uGUI']
        : ['var root = GetComponent<UIDocument>().rootVisualElement;', 'var btn = ' + q.l + ';', 'btn.clicked += OnPlay;'];
      const m = {};
      if (result === null) m[q.find ? 0 : 1] = 'bad';
      else if (result === 4) { m[1] = 'ok'; if (listener) m[2] = 'ok'; }
      else if (cur >= 0) m[q.find ? 0 : 1] = 'hl';
      cb(src.join('\n'), m);
    });
    return () => { stop(); stage.destroy(); };
  }

  /* ---------------------------------------------------------
     Catálogo
     --------------------------------------------------------- */

  const P = (t) => ({ d: 'systems', t });
  UCP.concepts.push(
    {
      id: 'serializacion-json', questions: ['sys-01', 'sys-02'], domain: 'systems', practice: P('Persistencia'), icon: '📄', mount: mountJson,
      text: {
        es: { title: 'JsonUtility y PlayerPrefs: qué se puede guardar',
          summary: '`JsonUtility` sigue las reglas del serializador de Unity: solo guarda **campos** públicos o con `[SerializeField]` de clases `[Serializable]`, y lo demás lo ignora **sin dar error**. `PlayerPrefs` solo guarda `int`, `float` y `string`. Activa y desactiva campos y mira cuáles llegan al JSON; en la otra pestaña intenta guardar un `bool`.',
          points: ['`Dictionary` y las propiedades `{ get; set; }` no se serializan (y no avisa).', 'Campos privados: solo con `[SerializeField]`.', '`PlayerPrefs`: `SetInt`, `SetFloat`, `SetString`. **No** existe `SetBool`: usa `SetInt(key, b ? 1 : 0)`.', 'PlayerPrefs no es seguro (en Windows va al registro): úsalo para ajustes, no para partidas.'] },
        en: { title: 'JsonUtility and PlayerPrefs: what can be saved',
          summary: '`JsonUtility` follows Unity\'s serializer rules: it only saves public **fields** (or `[SerializeField]` ones) of `[Serializable]` classes, and silently ignores everything else, **with no error**. `PlayerPrefs` only stores `int`, `float` and `string`. Toggle fields and see which ones reach the JSON; in the other tab, try saving a `bool`.',
          points: ['`Dictionary` and `{ get; set; }` properties are not serialized (and you get no warning).', 'Private fields: only with `[SerializeField]`.', '`PlayerPrefs`: `SetInt`, `SetFloat`, `SetString`. There is **no** `SetBool`: use `SetInt(key, b ? 1 : 0)`.', 'PlayerPrefs is not secure (on Windows it lives in the registry): use it for settings, not save games.'] }
      }
    },
    {
      id: 'rutas-guardado', questions: ['sys-03', 'sys-20'], domain: 'systems', practice: P('Persistencia'), icon: '💾', mount: mountSavePaths,
      text: {
        es: { title: 'Dónde guardar la partida: persistentDataPath',
          summary: 'Para guardar una partida se convierte el objeto a texto con `JsonUtility.ToJson` y se escribe con `File.WriteAllText` en `Application.persistentDataPath`, la única carpeta escribible que se conserva en todas las plataformas. Cambia de plataforma y de ruta, guarda, actualiza la app o limpia la caché, y vuelve a cargar.',
          points: ['`persistentDataPath`: escribible y sobrevive a sesiones y actualizaciones.', '`dataPath` / `streamingAssetsPath`: pueden ser de solo lectura (en Android, dentro del APK).', '`temporaryCachePath`: el sistema operativo puede vaciarla.', 'Guardar: `File.WriteAllText(Path.Combine(persistentDataPath, "save.json"), JsonUtility.ToJson(data))`. Cargar: `File.Exists` → `ReadAllText` → `FromJson<T>`.', '`JsonUtility.Save` no existe.'] },
        en: { title: 'Where to save the game: persistentDataPath',
          summary: 'To save a game you turn the object into text with `JsonUtility.ToJson` and write it with `File.WriteAllText` to `Application.persistentDataPath`, the only writable folder that is kept on every platform. Change the platform and the path, save, update the app or clean the cache, then load again.',
          points: ['`persistentDataPath`: writable and survives sessions and updates.', '`dataPath` / `streamingAssetsPath`: may be read-only (on Android, inside the APK).', '`temporaryCachePath`: the operating system may empty it.', 'Save: `File.WriteAllText(Path.Combine(persistentDataPath, "save.json"), JsonUtility.ToJson(data))`. Load: `File.Exists` → `ReadAllText` → `FromJson<T>`.', '`JsonUtility.Save` does not exist.'] }
      }
    },
    {
      id: 'carga-asincrona', questions: ['sys-06'], domain: 'systems', practice: P('Escenas'), icon: '⏳', mount: mountAsyncLoad,
      text: {
        es: { title: 'LoadSceneAsync: por qué progress se queda en 0.9',
          summary: 'Con `allowSceneActivation = false`, la escena se carga hasta `progress = 0.9` y ahí espera: el último 10 % es la **activación**, que solo ocurre cuando pones `allowSceneActivation = true`. Prueba las tres condiciones del bucle y mira cuál se queda colgada.',
          points: ['`while (op.progress < 1f)` y `while (!op.isDone)` nunca terminan con la activación desactivada.', 'Condición correcta: `while (op.progress < 0.9f)`.', 'Porcentaje para la barra: `Mathf.Clamp01(op.progress / 0.9f)`.', 'Después, `op.allowSceneActivation = true` completa la carga.'] },
        en: { title: 'LoadSceneAsync: why progress stops at 0.9',
          summary: 'With `allowSceneActivation = false`, the scene loads up to `progress = 0.9` and waits there: the last 10 % is the **activation**, which only happens when you set `allowSceneActivation = true`. Try the three loop conditions and see which one hangs.',
          points: ['`while (op.progress < 1f)` and `while (!op.isDone)` never end while activation is disabled.', 'Correct condition: `while (op.progress < 0.9f)`.', 'Percentage for the bar: `Mathf.Clamp01(op.progress / 0.9f)`.', 'Then `op.allowSceneActivation = true` finishes the load.'] }
      }
    },
    {
      id: 'singleton', questions: ['sys-07'], domain: 'systems', practice: P('Escenas'), icon: '👑', mount: mountSingleton,
      text: {
        es: { title: 'Singleton persistente: evitar el GameManager duplicado',
          summary: 'El primer GameManager sobrevive a los cambios de escena con `DontDestroyOnLoad`. Pero si la escena Menu tiene su propio GameManager, cada vez que vuelves se crea otro. Carga Game y vuelve a Menu con cada versión del código y cuenta cuántos quedan.',
          points: ['En `Awake`: `if (Instance != null && Instance != this) { Destroy(gameObject); return; }`.', 'La primera instancia se queda: `Instance = this; DontDestroyOnLoad(gameObject);`.', 'Moverlo a `Start` u `OnEnable` no lo arregla: el duplicado existe igual y sobrescribe `Instance`.', 'Sin la comprobación, el estado (score…) del primero queda huérfano.'] },
        en: { title: 'Persistent singleton: avoiding the duplicate GameManager',
          summary: 'The first GameManager survives scene changes thanks to `DontDestroyOnLoad`. But if the Menu scene has its own GameManager, every time you return another one is created. Load Game and go back to Menu with each version of the code and count how many are left.',
          points: ['In `Awake`: `if (Instance != null && Instance != this) { Destroy(gameObject); return; }`.', 'The first instance stays: `Instance = this; DontDestroyOnLoad(gameObject);`.', 'Moving it to `Start` or `OnEnable` does not fix it: the duplicate still exists and overwrites `Instance`.', 'Without the check, the first one\'s state (score…) is orphaned.'] }
      }
    },
    {
      id: 'closures', questions: ['sys-08'], domain: 'systems', practice: P('UI'), icon: '🔗', mount: mountClosure,
      text: {
        es: { title: 'Lambdas en un for: capturan la variable, no el valor',
          summary: 'Una lambda no copia el valor de `i`: guarda una referencia a la **variable**, y la variable de un `for` es una sola para todo el bucle. Cuando haces clic, el bucle ya terminó e `i` vale 3. Mira cómo se ejecuta el bucle paso a paso y haz clic en los botones con y sin la copia local.',
          points: ['Las tres lambdas leen la misma `i`, que termina valiendo `buttons.Length`.', 'Arreglo: `int index = i;` dentro del cuerpo y capturar `index`.', 'Cada iteración crea una variable `index` nueva.', 'Con `foreach`, desde C# 5 cada iteración tiene su propia variable.'] },
        en: { title: 'Lambdas in a for loop: they capture the variable, not the value',
          summary: 'A lambda does not copy the value of `i`: it keeps a reference to the **variable**, and a `for` loop has a single variable for the whole loop. When you click, the loop has finished and `i` is 3. Watch the loop run step by step and click the buttons with and without the local copy.',
          points: ['All three lambdas read the same `i`, which ends up as `buttons.Length`.', 'Fix: `int index = i;` inside the body and capture `index`.', 'Each iteration creates a new `index` variable.', 'With `foreach`, since C# 5 each iteration gets its own variable.'] }
      }
    },
    {
      id: 'canvas-scaler-anchors', questions: ['sys-09', 'sys-10'], domain: 'systems', practice: P('UI'), icon: '📐', mount: mountCanvasScaler,
      text: {
        es: { title: 'Canvas Scaler y anchors: UI para cualquier pantalla',
          summary: '**Scale With Screen Size** escala la UI respecto a una resolución de referencia, y los **anchors** deciden respecto a qué punto del padre se coloca cada elemento. Cambia de pantalla, de modo del Canvas Scaler y de anchor, y mira qué pasa con el botón de pausa.',
          points: ['Lo habitual: Scale With Screen Size + Reference Resolution (p. ej. 1920×1080).', '**Match** decide si manda el ancho, el alto o una mezcla.', 'Constant Pixel Size: mismo tamaño en píxeles, diminuto en 4K.', 'Botón en una esquina: anchors (y pivot) en esa esquina; mantiene la distancia al borde.'] },
        en: { title: 'Canvas Scaler and anchors: UI for any screen',
          summary: '**Scale With Screen Size** scales the UI relative to a reference resolution, and **anchors** decide which point of the parent each element is positioned from. Change the screen, the Canvas Scaler mode and the anchor, and watch the pause button.',
          points: ['The usual setup: Scale With Screen Size + Reference Resolution (e.g. 1920×1080).', '**Match** decides whether width, height or a blend drives the scale.', 'Constant Pixel Size: same size in pixels, tiny on 4K.', 'Button in a corner: anchors (and pivot) in that corner; it keeps its distance to the edge.'] }
      }
    },
    {
      id: 'eventsystem', questions: ['sys-11', 'sys-15'], domain: 'systems', practice: P('UI'), icon: '🖲️', mount: mountEventSystem,
      text: {
        es: { title: 'EventSystem: del input al onClick',
          summary: 'Los botones no leen el input por sí solos: el `EventSystem` con su Input Module recibe el clic o el mando y lo envía a la UI (con el puntero, a través del `GraphicRaycaster` del Canvas). Quita el EventSystem y haz clic; luego cambia a mando y abre el menú con y sin elemento seleccionado.',
          points: ['Canvas creado por código: Unity **no** añade el EventSystem; sin él, nada responde.', 'Input Module: `StandaloneInputModule` (Input Manager) o `InputSystemUIInputModule` (Input System).', 'Mando/teclado: necesitan un seleccionado inicial: `EventSystem.current.SetSelectedGameObject(firstButton)`.', 'La **Navigation** de los Selectables decide a dónde se mueve la selección; `onClick.Invoke()` haría clic.'] },
        en: { title: 'EventSystem: from input to onClick',
          summary: 'Buttons do not read input on their own: the `EventSystem` and its Input Module receive the click or gamepad input and send it to the UI (for pointers, through the Canvas\' `GraphicRaycaster`). Remove the EventSystem and click; then switch to gamepad and open the menu with and without a selected element.',
          points: ['Canvas created from code: Unity does **not** add the EventSystem; without it nothing responds.', 'Input Module: `StandaloneInputModule` (Input Manager) or `InputSystemUIInputModule` (Input System).', 'Gamepad/keyboard need an initial selection: `EventSystem.current.SetSelectedGameObject(firstButton)`.', 'The Selectables\' **Navigation** decides where the selection moves; `onClick.Invoke()` would click it.'] }
      }
    },
    {
      id: 'canvas-group', questions: ['sys-12'], domain: 'systems', practice: P('UI'), icon: '👻', mount: mountCanvasGroup,
      text: {
        es: { title: 'CanvasGroup: fundido sin bloquear los clics',
          summary: 'Un panel invisible puede seguir tapando lo que hay detrás: lo que decide si bloquea es el **raycast**, no el color. Oculta el panel de tres formas distintas y haz clic en el botón Jugar que queda detrás.',
          points: ['`Image.color.a = 0`: invisible, pero sigue bloqueando raycasts (y sus hijos se siguen viendo).', '`SetActive(false)`: deja pasar los clics, pero desaparece de golpe, sin fundido.', '`CanvasGroup`: anima `alpha` y pon `blocksRaycasts = false` (e `interactable = false`).', 'CanvasGroup afecta a todo el grupo de hijos a la vez.'] },
        en: { title: 'CanvasGroup: fade without blocking clicks',
          summary: 'An invisible panel can still cover what is behind it: what decides whether it blocks is the **raycast**, not the color. Hide the panel in three different ways and click the Play button behind it.',
          points: ['`Image.color.a = 0`: invisible, but it still blocks raycasts (and its children stay visible).', '`SetActive(false)`: lets clicks through, but disappears at once, with no fade.', '`CanvasGroup`: animate `alpha` and set `blocksRaycasts = false` (and `interactable = false`).', 'CanvasGroup affects all the children of the group at once.'] }
      }
    },
    {
      id: 'audio-mixer-db', questions: ['sys-13', 'sys-14'], domain: 'systems', practice: P('Ajustes'), icon: '🎚️', mount: mountMixer,
      text: {
        es: { title: 'AudioMixer: slider a decibelios y parámetros expuestos',
          summary: 'El AudioMixer trabaja en **decibelios** (de −80 a 0 dB) y el oído percibe el volumen de forma logarítmica, así que el valor del slider se convierte con `Mathf.Log10(v) * 20f`. Compara las fórmulas moviendo el slider; en la otra pestaña, llama a `SetFloat` con el parámetro expuesto o sin exponer.',
          points: ['`Log10(v) * 20`: 1 → 0 dB, 0.5 → −6 dB, 0.0001 → −80 dB.', 'Mínimo del slider 0.0001, porque `Log10(0)` = −∞.', 'Para usarlo desde código: clic derecho en la propiedad → **Expose to script**, y renombrarla.', '`SetFloat` devuelve `false` si el parámetro no está expuesto o el nombre no coincide.'] },
        en: { title: 'AudioMixer: slider to decibels and exposed parameters',
          summary: 'The AudioMixer works in **decibels** (−80 to 0 dB) and the ear perceives volume logarithmically, so the slider value is converted with `Mathf.Log10(v) * 20f`. Compare the formulas by moving the slider; in the other tab, call `SetFloat` with the parameter exposed or not.',
          points: ['`Log10(v) * 20`: 1 → 0 dB, 0.5 → −6 dB, 0.0001 → −80 dB.', 'Slider minimum 0.0001, because `Log10(0)` = −∞.', 'To use it from code: right-click the property → **Expose to script**, and rename it.', '`SetFloat` returns `false` if the parameter is not exposed or the name does not match.'] }
      }
    },
    {
      id: 'quality-settings', questions: ['sys-16'], domain: 'systems', practice: P('Ajustes'), icon: '⚙️', mount: mountQuality,
      text: {
        es: { title: 'QualitySettings: presets de calidad gráfica',
          summary: 'Los niveles Low, Medium y High se definen en **Project Settings > Quality**, y `QualitySettings.SetQualityLevel(index, true)` aplica uno en tiempo de ejecución. Cambia de preset y observa sombras, dientes de sierra y texturas; prueba también con `applyExpensiveChanges = false` y reabre el juego con y sin guardar la elección.',
          points: ['API: `QualitySettings.SetQualityLevel(index, applyExpensiveChanges)`.', 'Con `false` no se aplican los cambios costosos, como el antialiasing.', '`Screen.SetResolution` y `targetFrameRate` no cambian el preset.', 'Guarda el índice con `PlayerPrefs.SetInt` y aplícalo al arrancar.'] },
        en: { title: 'QualitySettings: graphics quality presets',
          summary: 'The Low, Medium and High levels are defined in **Project Settings > Quality**, and `QualitySettings.SetQualityLevel(index, true)` applies one at runtime. Switch presets and watch shadows, jaggies and textures; also try `applyExpensiveChanges = false`, and reopen the game with and without saving the choice.',
          points: ['API: `QualitySettings.SetQualityLevel(index, applyExpensiveChanges)`.', 'With `false`, expensive changes such as anti-aliasing are not applied.', '`Screen.SetResolution` and `targetFrameRate` do not change the preset.', 'Save the index with `PlayerPrefs.SetInt` and apply it on startup.'] }
      }
    },
    {
      id: 'scriptable-objects', questions: ['sys-17'], domain: 'systems', practice: P('Progresión'), icon: '📦', mount: mountScriptableObjects,
      text: {
        es: { title: 'ScriptableObjects: datos compartidos por referencia',
          summary: 'Un `ScriptableObject` es un asset de datos: todas las armas de un tipo apuntan a la **misma** instancia, en lugar de llevar cada una su copia. Compara la memoria de los dos enfoques, cambia el daño y reabre el juego en el Editor y en una build.',
          points: ['Datos fijos compartidos (daño, icono, precio): un SO por tipo, referenciado.', 'Sin duplicar memoria y editable por diseñadores en el Inspector.', 'Cambiar el SO afecta a todos los que lo referencian.', 'En una build, los cambios en runtime **no se guardan**: no es un sistema de guardado.'] },
        en: { title: 'ScriptableObjects: data shared by reference',
          summary: 'A `ScriptableObject` is a data asset: every weapon of a type points to the **same** instance instead of carrying its own copy. Compare the memory of both approaches, change the damage, and reopen the game in the Editor and in a build.',
          points: ['Fixed shared data (damage, icon, price): one SO per type, referenced.', 'No duplicated memory, and designers can edit it in the Inspector.', 'Changing the SO affects everyone that references it.', 'In a build, runtime changes are **not saved**: it is not a save system.'] }
      }
    },
    {
      id: 'eventos-suscripcion', questions: ['sys-18', 'team-15'], domain: 'systems', practice: P('Progresión'), icon: '📣', mount: mountEvents,
      text: {
        es: { title: 'Eventos: suscribirse en OnEnable, desuscribirse en OnDisable',
          summary: 'Con un evento, el sistema de progresión avisa sin saber quién escucha (bajo acoplamiento). Pero un evento `static` sobrevive a los cambios de escena: si no te desuscribes, sigue apuntando a objetos destruidos. Sube de nivel, carga otra escena y vuelve a subir, con y sin `-=` en `OnDisable`.',
          points: ['Patrón: `OnEnable` → `+=`, `OnDisable` → `-=`.', 'Sin `-=`: `MissingReferenceException` al acceder a componentes destruidos.', 'El delegado mantiene vivo el objeto C#: fuga de memoria.', 'Alternativas peores: comprobar en cada `Update` (CPU) o `GameObject.Find` (lento, frágil y acoplado).'] },
        en: { title: 'Events: subscribe in OnEnable, unsubscribe in OnDisable',
          summary: 'With an event, the progression system notifies without knowing who listens (low coupling). But a `static` event survives scene changes: if you do not unsubscribe, it keeps pointing to destroyed objects. Level up, load another scene and level up again, with and without `-=` in `OnDisable`.',
          points: ['Pattern: `OnEnable` → `+=`, `OnDisable` → `-=`.', 'Without `-=`: `MissingReferenceException` when accessing destroyed components.', 'The delegate keeps the C# object alive: a memory leak.', 'Worse alternatives: checking every `Update` (CPU) or `GameObject.Find` (slow, fragile and coupled).'] }
      }
    },
    {
      id: 'ui-toolkit', questions: ['sys-19'], domain: 'systems', practice: P('UI'), icon: '🧩', mount: mountUIToolkit,
      text: {
        es: { title: 'UI Toolkit: Q<Button>() y el evento clicked',
          summary: 'En UI Toolkit la interfaz es un árbol de `VisualElement` creado desde UXML, no GameObjects. Un `UIDocument` lo expone en `rootVisualElement`, y `Q<T>(name)` busca dentro por tipo y nombre. Ejecuta cada consulta, mira cómo recorre el árbol y luego haz clic en Play.',
          points: ['`root.Q<Button>("play-button")` busca por tipo **y** `name`.', 'El `Button` de UI Toolkit expone el evento `clicked`: `btn.clicked += OnPlay;`.', '`GameObject.Find` no encuentra elementos de UXML.', '`onClick.AddListener` es de uGUI (`UnityEngine.UI.Button`).'] },
        en: { title: 'UI Toolkit: Q<Button>() and the clicked event',
          summary: 'In UI Toolkit the interface is a tree of `VisualElement`s built from UXML, not GameObjects. A `UIDocument` exposes it as `rootVisualElement`, and `Q<T>(name)` searches it by type and name. Run each query, watch it walk the tree, then click Play.',
          points: ['`root.Q<Button>("play-button")` matches by type **and** `name`.', 'The UI Toolkit `Button` exposes the `clicked` event: `btn.clicked += OnPlay;`.', '`GameObject.Find` cannot find UXML elements.', '`onClick.AddListener` belongs to uGUI (`UnityEngine.UI.Button`).'] }
      }
    }
  );
})();
