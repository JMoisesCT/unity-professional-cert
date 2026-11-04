(function () {
  'use strict';

  /* =========================================================
     Datos
     ========================================================= */

  const DOMAINS = UCP.domains.slice().sort((a, b) => a.order - b.order);
  const QUESTIONS = [];
  const Q = {};
  const DOMAIN = {};
  DOMAINS.forEach((d) => {
    DOMAIN[d.id] = d;
    d.questions.forEach((q) => {
      q.domain = d.id;
      QUESTIONS.push(q);
      Q[q.id] = q;
    });
  });

  const LETTERS = 'ABCDEFGH';
  const app = document.getElementById('app');

  /* =========================================================
     Persistencia (localStorage, con tolerancia a fallos)
     ========================================================= */

  const STORE_KEY = 'ucpp-progress-v1';
  const EXAM_KEY = 'ucpp-exam-v1';

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function writeJSON(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* almacenamiento no disponible: la app sigue funcionando */ }
  }

  const store = Object.assign({ stats: {}, mistakes: [], exams: [], lastExam: null }, readJSON(STORE_KEY) || {});
  // Limpia ids que ya no existan en el banco.
  store.mistakes = store.mistakes.filter((id) => Q[id]);

  function saveStore() { writeJSON(STORE_KEY, store); }

  function record(qid, correct) {
    const s = store.stats[qid] || { seen: 0, correct: 0 };
    s.seen += 1;
    if (correct) s.correct += 1;
    s.last = correct;
    store.stats[qid] = s;
    const i = store.mistakes.indexOf(qid);
    if (correct && i !== -1) store.mistakes.splice(i, 1);
    if (!correct && i === -1) store.mistakes.push(qid);
  }

  function domainStats(list) {
    let seen = 0, right = 0;
    list.forEach((q) => {
      const s = store.stats[q.id];
      if (s) { seen++; if (s.last) right++; }
    });
    return {
      total: list.length,
      seen,
      right,
      coverage: list.length ? Math.round((seen / list.length) * 100) : 0,
      accuracy: seen ? Math.round((right / seen) * 100) : null
    };
  }

  /* =========================================================
     Utilidades
     ========================================================= */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Formato mínimo: `código` y **negrita**.
  function fmt(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function plain(s) {
    return String(s).replace(/`/g, '').replace(/\*\*/g, '');
  }

  const KEYWORDS = new Set(('abstract as async await base bool break case catch class const continue default delegate do double else enum event false finally float for foreach get if in int interface internal is long namespace new null out override params private protected public readonly ref return sealed set static string struct switch this throw true try typeof using var virtual void while yield').split(' '));

  // Resaltado de sintaxis C# muy ligero (sin dependencias).
  function highlight(code) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)')|(^[ \t]*#\w+[^\n]*)|(\[[A-Z][\w.]*(?:\([^\]\n]*\))?\])|\b(\d+(?:\.\d+)?f?)\b|\b([A-Za-z_]\w*)\b/gm;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      last = re.lastIndex;
      const t = m[0];
      let cls = null;
      if (m[1]) cls = 'c';
      else if (m[2]) cls = 's';
      else if (m[3]) cls = 'p';
      else if (m[4]) cls = 'a';
      else if (m[5]) cls = 'n';
      else if (KEYWORDS.has(t)) cls = 'k';
      else if (/^[A-Z]/.test(t)) cls = code[last] === '(' ? 'f' : 't';
      out += cls ? '<span class="tok-' + cls + '">' + esc(t) + '</span>' : esc(t);
    }
    out += esc(code.slice(last));
    return out;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    const s = new Set(a);
    return b.every((x) => s.has(x));
  }

  function makeItem(qid) {
    const q = Q[qid];
    return { id: qid, order: shuffle(q.options.map((_, i) => i)), selected: [] };
  }

  function pctClass(p) {
    if (p === null || p === undefined) return '';
    if (p >= 80) return 'ok';
    if (p >= 60) return 'warn';
    return 'bad';
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0');
    return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
  }

  function fmtDate(ts) {
    try {
      return new Date(ts).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return new Date(ts).toISOString().slice(0, 16).replace('T', ' '); }
  }

  function setNav(name) {
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
  }

  function render(html, navName) {
    stopTimer();
    keyHandler = null;
    app.innerHTML = html;
    setNav(navName);
    window.scrollTo(0, 0);
  }

  let keyHandler = null;
  document.addEventListener('keydown', (e) => {
    if (!keyHandler || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    keyHandler(e);
  });

  /* =========================================================
     Bloque de pregunta (compartido por práctica, simulacro y repaso)
     ========================================================= */

  function questionHTML(item, opts) {
    const q = Q[item.id];
    const d = DOMAIN[q.domain];
    const multi = q.answer.length > 1;
    const revealed = !!opts.revealed;
    const correctNow = revealed && sameSet(item.selected, q.answer);

    const options = item.order.map((orig, i) => {
      const sel = item.selected.includes(orig);
      const isAns = q.answer.includes(orig);
      let cls = 'opt' + (multi ? ' multi' : '');
      let mark = '';
      if (revealed) {
        if (isAns) { cls += ' correct'; mark = '✓'; if (!sel) cls += ' missed'; }
        else if (sel) { cls += ' wrong'; mark = '✗'; }
      } else if (sel) {
        cls += ' selected';
      }
      return '<button type="button" class="' + cls + '" data-opt="' + orig + '" role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="' + sel + '"' + (revealed ? ' disabled' : '') + '>' +
        '<span class="opt-key">' + LETTERS[i] + '</span>' +
        '<span class="opt-text">' + fmt(q.options[orig]) + '</span>' +
        (mark ? '<span class="opt-mark" aria-hidden="true">' + mark + '</span>' : '') +
        '</button>';
    }).join('');

    let feedback = '';
    if (revealed && opts.showFeedback !== false) {
      const answered = item.selected.length > 0;
      const title = correctNow ? '¡Correcto!' : (answered ? 'Incorrecto' : 'Sin responder');
      feedback = '<div class="feedback ' + (correctNow ? 'ok' : 'bad') + '" role="status">' +
        '<div class="fb-title">' + title + '</div>' +
        '<p>' + fmt(q.explanation) + '</p></div>';
    }

    return '<div class="qmeta">' +
        '<span class="tag">' + d.order + '. ' + esc(d.title) + '</span>' +
        '<span class="tag tag-soft">' + esc(q.topic) + '</span>' +
      '</div>' +
      '<div class="qtext">' + fmt(q.q) + '</div>' +
      (q.code ? '<pre class="code"><code>' + highlight(q.code) + '</code></pre>' : '') +
      (multi ? '<div class="hint">Selecciona ' + q.answer.length + ' respuestas</div>' : '') +
      '<div class="options" role="' + (multi ? 'group' : 'radiogroup') + '">' + options + '</div>' +
      feedback;
  }

  function toggleSelection(item, orig) {
    const q = Q[item.id];
    const multi = q.answer.length > 1;
    if (!multi) { item.selected = [orig]; return; }
    const i = item.selected.indexOf(orig);
    if (i !== -1) item.selected.splice(i, 1);
    else if (item.selected.length < q.answer.length) item.selected.push(orig);
    else { item.selected.shift(); item.selected.push(orig); }
  }

  function readyToCheck(item) {
    return item.selected.length === Q[item.id].answer.length;
  }

  /* =========================================================
     Inicio
     ========================================================= */

  function viewHome() {
    const all = domainStats(QUESTIONS);
    const last = store.exams[store.exams.length - 1];

    const domainCards = DOMAINS.map((d) => {
      const s = domainStats(d.questions);
      return '<a class="card domain-card" href="#/tema/' + d.id + '">' +
        '<div class="domain-num">' + d.order + '</div>' +
        '<div class="domain-body">' +
          '<h3>' + esc(d.title) + '</h3>' +
          '<div class="domain-en">' + esc(d.titleEn) + '</div>' +
          '<div class="bar ' + pctClass(s.accuracy) + '"><span style="width:' + s.coverage + '%"></span></div>' +
          '<div class="domain-meta"><span>' + s.seen + ' / ' + s.total + ' respondidas</span>' +
          '<span>' + (s.accuracy === null ? 'Sin empezar' : s.accuracy + '% aciertos') + '</span></div>' +
        '</div></a>';
    }).join('');

    render(
      '<section class="card hero">' +
        '<h1>Prepárate para Unity Certified Professional: Programmer</h1>' +
        '<p>' + QUESTIONS.length + ' preguntas originales en ' + DOMAINS.length + ' temas del temario oficial, con explicaciones, tips y simulacros con tiempo.</p>' +
        '<div class="stats">' +
          '<div class="stat"><b>' + all.coverage + '%</b><span>Banco cubierto</span></div>' +
          '<div class="stat"><b>' + (all.accuracy === null ? '—' : all.accuracy + '%') + '</b><span>Aciertos</span></div>' +
          '<div class="stat"><b>' + (last ? last.score + '%' : '—') + '</b><span>Último simulacro</span></div>' +
        '</div>' +
      '</section>' +

      '<nav class="quick" aria-label="Accesos rápidos">' +
        '<a href="#/practica?d=all&m=new"><span class="qicon">🎯</span><b>Práctica rápida</b><span>' + (all.total - all.seen) + ' sin responder</span></a>' +
        '<a href="#/examen"><span class="qicon">⏱️</span><b>Simulacro</b><span>Examen con tiempo</span></a>' +
        '<a href="#/practica?d=mistakes"><span class="qicon">🔁</span><b>Repasar errores</b><span>' + store.mistakes.length + ' pendientes</span></a>' +
        '<a href="#/tips"><span class="qicon">📘</span><b>Guía y tips</b><span>Estrategia y chuleta</span></a>' +
      '</nav>' +

      '<div class="section-title"><h2>Temas del examen</h2><span class="muted small">Toca un tema para practicar</span></div>' +
      '<div class="grid grid-2">' + domainCards + '</div>',
      'home'
    );
  }

  /* =========================================================
     Página de tema
     ========================================================= */

  function viewDomain(id) {
    const d = DOMAIN[id];
    if (!d) return viewNotFound();
    const s = domainStats(d.questions);
    const wrong = d.questions.filter((q) => store.mistakes.includes(q.id)).length;

    const topics = {};
    d.questions.forEach((q) => { topics[q.topic] = (topics[q.topic] || 0) + 1; });
    const chips = Object.keys(topics).map((t) =>
      '<a class="chip" href="#/practica?d=' + d.id + '&t=' + encodeURIComponent(t) + '">' + esc(t) + ' <small>' + topics[t] + '</small></a>'
    ).join('');

    render(
      '<a class="back" href="#/">← Inicio</a>' +
      '<section class="card">' +
        '<span class="tag">Tema ' + d.order + '</span>' +
        '<h1 style="margin-top:10px">' + esc(d.title) + '</h1>' +
        '<p class="muted small">' + esc(d.titleEn) + '</p>' +
        '<p>' + esc(d.description) + '</p>' +
        '<div class="stats">' +
          '<div class="stat"><b>' + s.total + '</b><span>Preguntas</span></div>' +
          '<div class="stat"><b>' + s.coverage + '%</b><span>Cubierto</span></div>' +
          '<div class="stat"><b>' + (s.accuracy === null ? '—' : s.accuracy + '%') + '</b><span>Aciertos</span></div>' +
        '</div>' +
        '<div class="btn-row" style="margin-top:14px">' +
          '<a class="btn btn-primary" href="#/practica?d=' + d.id + '">Practicar todo el tema</a>' +
          '<a class="btn" href="#/practica?d=' + d.id + '&m=new">Solo nuevas (' + (s.total - s.seen) + ')</a>' +
          '<a class="btn" href="#/practica?d=' + d.id + '&m=wrong">Solo falladas (' + wrong + ')</a>' +
        '</div>' +
      '</section>' +

      '<div class="section-title"><h2>Practicar por subtema</h2></div>' +
      '<div class="chips">' + chips + '</div>' +

      '<div class="section-title"><h2>Tips clave</h2></div>' +
      '<ul class="tips-list">' + d.tips.map((t) => '<li>' + fmt(t) + '</li>').join('') + '</ul>' +

      '<div class="section-title"><h2>Objetivos del temario</h2></div>' +
      '<section class="card"><ul class="list">' + d.objectives.map((o) => '<li>' + fmt(o) + '</li>').join('') + '</ul></section>',
      'home'
    );
  }

  /* =========================================================
     Modo práctica (feedback inmediato)
     ========================================================= */

  let practice = null;

  function startPractice(params) {
    const scope = params.get('d') || 'all';
    const mode = params.get('m') || 'all';
    const topic = params.get('t');

    let pool;
    let title;
    let backHref = '#/';
    if (scope === 'mistakes') {
      pool = store.mistakes.map((id) => Q[id]).filter(Boolean);
      title = 'Repaso de errores';
      backHref = '#/repaso';
    } else if (DOMAIN[scope]) {
      pool = DOMAIN[scope].questions;
      title = DOMAIN[scope].title;
      backHref = '#/tema/' + scope;
    } else {
      pool = QUESTIONS;
      title = 'Todos los temas';
    }

    if (topic) { pool = pool.filter((q) => q.topic === topic); title += ' · ' + topic; }
    if (mode === 'new') { pool = pool.filter((q) => !store.stats[q.id]); title += ' · nuevas'; }
    if (mode === 'wrong') { pool = pool.filter((q) => store.mistakes.includes(q.id)); title += ' · falladas'; }

    if (!pool.length) {
      const msg = scope === 'mistakes' || mode === 'wrong'
        ? '<div class="big">🎉</div><h2>No tienes errores pendientes</h2><p>Las preguntas que falles aparecerán aquí hasta que las respondas bien.</p>'
        : '<div class="big">✅</div><h2>No quedan preguntas en esta selección</h2><p>Ya respondiste todas. Prueba a practicar el tema completo o haz un simulacro.</p>';
      render('<a class="back" href="' + backHref + '">← Volver</a><section class="card empty">' + msg +
        '<div class="btn-row" style="max-width:420px;margin:12px auto 0"><a class="btn btn-primary" href="#/examen">Hacer un simulacro</a><a class="btn" href="#/">Inicio</a></div></section>', 'home');
      return;
    }

    practice = {
      title,
      backHref,
      items: shuffle(pool.map((q) => q.id)).map(makeItem),
      idx: 0,
      revealed: false,
      ok: 0,
      bad: 0
    };
    renderPractice();
  }

  function renderPractice() {
    const p = practice;
    const item = p.items[p.idx];
    const total = p.items.length;
    const isLast = p.idx === total - 1;
    const pct = Math.round(((p.idx + (p.revealed ? 1 : 0)) / total) * 100);

    let primary;
    if (!p.revealed) {
      primary = '<button class="btn btn-primary" id="checkBtn"' + (readyToCheck(item) ? '' : ' disabled') + '>Comprobar</button>';
    } else {
      primary = '<button class="btn btn-primary" id="nextBtn">' + (isLast ? 'Ver resultado' : 'Siguiente →') + '</button>';
    }

    render(
      '<a class="back" href="' + p.backHref + '">← ' + esc(p.title) + '</a>' +
      '<div class="qbar"><span>Pregunta <b>' + (p.idx + 1) + '</b> de ' + total + '</span>' +
        '<span class="score"><span class="ok-c">✓ ' + p.ok + '</span> &nbsp; <span class="bad-c">✗ ' + p.bad + '</span></span></div>' +
      '<div class="bar" style="margin-bottom:14px"><span style="width:' + pct + '%"></span></div>' +
      '<article class="card" id="qcard">' + questionHTML(item, { revealed: p.revealed }) + '</article>' +
      '<div class="actions">' +
        (p.revealed ? '' : '<button class="btn btn-ghost" id="skipBtn">Saltar</button>') +
        primary +
      '</div>' +
      '<p class="kbd-hint">Atajos: A–E o 1–5 para elegir · Enter para comprobar / continuar</p>',
      'home'
    );

    bindOptions(item, !p.revealed, renderPractice);

    const check = document.getElementById('checkBtn');
    if (check) check.onclick = checkPractice;
    const next = document.getElementById('nextBtn');
    if (next) next.onclick = nextPractice;
    const skip = document.getElementById('skipBtn');
    if (skip) skip.onclick = () => {
      // Mueve la pregunta al final de la cola.
      p.items.push(p.items.splice(p.idx, 1)[0]);
      item.selected = [];
      renderPractice();
    };

    keyHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!p.revealed && readyToCheck(item)) checkPractice();
        else if (p.revealed) nextPractice();
        return;
      }
      if (!p.revealed) keySelect(e, item, renderPractice);
    };

    if (p.revealed) {
      const fb = app.querySelector('.feedback');
      if (fb && fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function checkPractice() {
    const p = practice;
    const item = p.items[p.idx];
    if (!readyToCheck(item)) return;
    const correct = sameSet(item.selected, Q[item.id].answer);
    item.correct = correct;
    if (correct) p.ok++; else p.bad++;
    record(item.id, correct);
    saveStore();
    p.revealed = true;
    renderPractice();
    // renderPractice hace scroll al inicio; luego se desplaza a la explicación.
  }

  function nextPractice() {
    const p = practice;
    if (p.idx >= p.items.length - 1) return renderPracticeSummary();
    p.idx++;
    p.revealed = false;
    renderPractice();
  }

  function renderPracticeSummary() {
    const p = practice;
    const answered = p.ok + p.bad;
    const score = answered ? Math.round((p.ok / answered) * 100) : 0;
    const wrongItems = p.items.filter((it) => it.correct === false);

    render(
      '<a class="back" href="' + p.backHref + '">← Volver</a>' +
      '<section class="card center">' +
        '<h1>Sesión terminada</h1>' +
        '<div class="score-ring" style="--p:' + score + ';--c:var(--' + (pctClass(score) || 'accent') + ')"><b>' + score + '%</b></div>' +
        '<p><span class="ok-c" style="color:var(--ok);font-weight:700">' + p.ok + ' correctas</span> · <span style="color:var(--bad);font-weight:700">' + p.bad + ' incorrectas</span></p>' +
        '<p class="muted small">' + esc(p.title) + '</p>' +
        '<div class="btn-row" style="max-width:520px;margin:0 auto">' +
          (wrongItems.length ? '<a class="btn btn-primary" href="#/practica?d=mistakes">Repasar errores</a>' : '') +
          '<a class="btn" href="' + p.backHref + '">Volver al tema</a>' +
          '<a class="btn" href="#/examen">Hacer un simulacro</a>' +
        '</div>' +
      '</section>' +
      (wrongItems.length
        ? '<div class="section-title"><h2>Preguntas falladas</h2></div>' + wrongItems.map((it) => reviewDetails(it, false)).join('')
        : ''),
      'home'
    );
  }

  function bindOptions(item, enabled, rerender) {
    if (!enabled) return;
    app.querySelectorAll('.opt').forEach((btn) => {
      btn.onclick = () => {
        toggleSelection(item, Number(btn.dataset.opt));
        rerenderKeepingScroll(rerender);
      };
    });
  }

  function rerenderKeepingScroll(fn) {
    const y = window.scrollY;
    fn();
    window.scrollTo(0, y);
  }

  function keySelect(e, item, rerender) {
    let i = -1;
    const k = e.key.toUpperCase();
    if (/^[1-8]$/.test(k)) i = Number(k) - 1;
    else if (LETTERS.indexOf(k) !== -1 && k.length === 1) i = LETTERS.indexOf(k);
    if (i < 0 || i >= item.order.length) return;
    e.preventDefault();
    toggleSelection(item, item.order[i]);
    rerenderKeepingScroll(rerender);
  }

  /* =========================================================
     Simulacro
     ========================================================= */

  let exam = readJSON(EXAM_KEY);
  if (exam && (!exam.items || exam.items.some((it) => !Q[it.id]))) { exam = null; writeJSON(EXAM_KEY, null); }
  let timerId = null;

  function saveExam() { writeJSON(EXAM_KEY, exam); }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function viewExamSetup() {
    if (exam && !exam.finished) {
      const answered = exam.items.filter((it) => it.selected.length).length;
      const remaining = exam.endAt ? Math.max(0, (exam.endAt - Date.now()) / 1000) : null;
      render(
        '<section class="card">' +
          '<h1>Tienes un simulacro en curso</h1>' +
          '<p class="muted">' + answered + ' de ' + exam.items.length + ' preguntas respondidas' +
          (remaining !== null ? ' · ' + fmtTime(remaining) + ' restantes' : '') + '.</p>' +
          '<div class="btn-row"><button class="btn btn-primary" id="resumeBtn">Continuar</button>' +
          '<button class="btn btn-danger" id="discardBtn">Descartar y empezar otro</button></div>' +
        '</section>',
        'exam'
      );
      document.getElementById('resumeBtn').onclick = () => {
        if (exam.endAt && Date.now() >= exam.endAt) return finishExam(true);
        renderExam();
      };
      document.getElementById('discardBtn').onclick = () => {
        if (!confirm('¿Descartar el simulacro en curso? No se guardará el resultado.')) return;
        exam = null; saveExam(); viewExamSetup();
      };
      return;
    }

    const counts = [20, 40, 60, QUESTIONS.length];
    const countHTML = counts.map((n, i) =>
      '<input type="radio" name="count" id="c' + n + '" value="' + n + '"' + (i === 1 ? ' checked' : '') + '>' +
      '<label for="c' + n + '">' + (n === QUESTIONS.length ? 'Todas (' + n + ')' : n) + '</label>'
    ).join('');

    const timeModes = [
      { v: '90', l: 'Normal · 1,5 min/pregunta' },
      { v: '60', l: 'Exigente · 1 min/pregunta' },
      { v: '0', l: 'Sin límite' }
    ];
    const timeHTML = timeModes.map((t, i) =>
      '<input type="radio" name="time" id="t' + t.v + '" value="' + t.v + '"' + (i === 0 ? ' checked' : '') + '>' +
      '<label for="t' + t.v + '">' + t.l + '</label>'
    ).join('');

    const domainHTML = DOMAINS.map((d) =>
      '<label class="check"><input type="checkbox" name="dom" value="' + d.id + '" checked>' +
      '<span><b>' + d.order + '.</b> ' + esc(d.title) + ' <span class="muted small">(' + d.questions.length + ')</span></span></label>'
    ).join('');

    const history = store.exams.slice(-3).reverse();

    render(
      '<section class="card">' +
        '<h1>Simulacro de examen</h1>' +
        '<p class="muted">Preguntas mezcladas de todos los temas, sin ver la respuesta hasta el final, como en el examen real. Puedes marcar preguntas para revisarlas y moverte libremente entre ellas.</p>' +
        '<div class="setup-group"><span class="label">Número de preguntas</span><div class="seg">' + countHTML + '</div></div>' +
        '<div class="setup-group"><span class="label">Tiempo</span><div class="seg">' + timeHTML + '</div></div>' +
        '<div class="setup-group"><span class="label">Temas incluidos</span><div class="checks">' + domainHTML + '</div></div>' +
        '<button class="btn btn-primary btn-block" id="startExam">Empezar simulacro</button>' +
        '<p class="muted small" style="margin:10px 0 0">Las preguntas se reparten de forma equilibrada entre los temas elegidos.</p>' +
      '</section>' +
      (history.length
        ? '<div class="section-title"><h2>Últimos simulacros</h2><a href="#/repaso" class="small">Ver historial</a></div>' +
          '<section class="card">' + history.map((h) =>
            '<div class="breakdown-row"><div class="row-head"><span>' + fmtDate(h.date) + ' · ' + h.total + ' preguntas</span><b>' + h.score + '%</b></div>' +
            '<div class="bar ' + pctClass(h.score) + '"><span style="width:' + h.score + '%"></span></div></div>'
          ).join('') + '</section>'
        : ''),
      'exam'
    );

    document.getElementById('startExam').onclick = () => {
      const count = Number(app.querySelector('input[name="count"]:checked').value);
      const perQ = Number(app.querySelector('input[name="time"]:checked').value);
      const doms = Array.from(app.querySelectorAll('input[name="dom"]:checked')).map((i) => i.value);
      if (!doms.length) { alert('Elige al menos un tema.'); return; }
      createExam(count, perQ, doms);
      renderExam();
    };
  }

  function createExam(count, secondsPerQuestion, domainIds) {
    // Reparto equilibrado: round-robin entre los temas elegidos.
    const buckets = domainIds.map((id) => shuffle(DOMAIN[id].questions.map((q) => q.id)));
    const picked = [];
    const max = buckets.reduce((s, b) => s + b.length, 0);
    const target = Math.min(count, max);
    let i = 0;
    while (picked.length < target) {
      const b = buckets[i % buckets.length];
      if (b.length) picked.push(b.pop());
      i++;
    }
    const items = shuffle(picked).map(makeItem);
    items.forEach((it) => { it.flagged = false; });
    exam = {
      items,
      idx: 0,
      startedAt: Date.now(),
      endAt: secondsPerQuestion ? Date.now() + items.length * secondsPerQuestion * 1000 : null,
      finished: false
    };
    saveExam();
  }

  function renderExam() {
    const ex = exam;
    const item = ex.items[ex.idx];
    const total = ex.items.length;
    const answered = ex.items.filter((it) => it.selected.length).length;
    const isLast = ex.idx === total - 1;

    const palette = ex.items.map((it, i) => {
      let cls = '';
      if (it.selected.length) cls += ' answered';
      if (it.flagged) cls += ' flagged';
      if (i === ex.idx) cls += ' current';
      return '<button type="button" class="' + cls.trim() + '" data-go="' + i + '" aria-label="Pregunta ' + (i + 1) + '">' + (i + 1) + '</button>';
    }).join('');

    render(
      '<div class="exam-top">' +
        '<span>Pregunta <b>' + (ex.idx + 1) + '</b>/' + total + ' · ' + answered + ' respondidas</span>' +
        (ex.endAt ? '<span class="timer" id="timer">--:--</span>' : '<span class="muted small">Sin límite</span>') +
      '</div>' +
      '<article class="card">' + questionHTML(item, { revealed: false }) + '</article>' +
      '<div class="actions">' +
        '<button class="btn" id="prevBtn"' + (ex.idx === 0 ? ' disabled' : '') + ' aria-label="Anterior">←</button>' +
        '<button class="btn' + (item.flagged ? ' is-on' : '') + '" id="flagBtn">' + (item.flagged ? '⚑ Marcada' : '⚐ Marcar') + '</button>' +
        (isLast
          ? '<button class="btn btn-primary" id="finishBtn">Terminar</button>'
          : '<button class="btn btn-primary" id="nextBtn">Siguiente →</button>') +
      '</div>' +
      '<section class="card" style="margin-top:8px">' +
        '<div class="section-title" style="margin:0 0 10px"><h3 style="margin:0">Mapa de preguntas</h3>' +
        '<button class="btn btn-ghost small" id="finishBtn2" style="min-height:34px;padding:6px 12px">Terminar examen</button></div>' +
        '<div class="palette">' + palette + '</div>' +
        '<div class="legend"><span><i style="background:var(--accent-soft)"></i>Respondida</span><span><i style="background:var(--warn)"></i>Marcada</span><span><i style="border:1.5px solid var(--accent)"></i>Actual</span></div>' +
      '</section>' +
      '<p class="kbd-hint">Atajos: A–E o 1–5 para elegir · ← → para moverte · M para marcar</p>',
      'exam'
    );

    const rerender = () => { saveExam(); renderExam(); };
    bindOptions(item, true, rerender);

    const go = (i) => { ex.idx = Math.max(0, Math.min(total - 1, i)); saveExam(); renderExam(); };
    document.getElementById('prevBtn').onclick = () => go(ex.idx - 1);
    const next = document.getElementById('nextBtn');
    if (next) next.onclick = () => go(ex.idx + 1);
    document.getElementById('flagBtn').onclick = () => { item.flagged = !item.flagged; rerenderKeepingScroll(rerender); };
    const fin = () => confirmFinish();
    const f1 = document.getElementById('finishBtn');
    if (f1) f1.onclick = fin;
    document.getElementById('finishBtn2').onclick = fin;
    app.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(Number(b.dataset.go)); });

    keyHandler = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); if (!isLast) go(ex.idx + 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(ex.idx - 1); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (isLast) confirmFinish(); else go(ex.idx + 1); return; }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); item.flagged = !item.flagged; rerenderKeepingScroll(rerender); return; }
      keySelect(e, item, rerender);
    };

    if (ex.endAt) {
      const tick = () => {
        const left = (ex.endAt - Date.now()) / 1000;
        const el = document.getElementById('timer');
        if (el) {
          el.textContent = fmtTime(left);
          el.classList.toggle('low', left < 120);
        }
        if (left <= 0) { stopTimer(); finishExam(true); }
      };
      tick();
      timerId = setInterval(tick, 1000);
    }
  }

  function confirmFinish() {
    const pending = exam.items.filter((it) => !it.selected.length).length;
    const flagged = exam.items.filter((it) => it.flagged).length;
    let msg = '¿Terminar el simulacro y ver el resultado?';
    if (pending) msg += '\n\nTienes ' + pending + ' pregunta(s) sin responder.';
    if (flagged) msg += '\nTienes ' + flagged + ' pregunta(s) marcada(s) para revisar.';
    if (confirm(msg)) finishExam(false);
  }

  function finishExam(timeUp) {
    stopTimer();
    const ex = exam;
    let right = 0;
    const perDomain = {};
    ex.items.forEach((it) => {
      const q = Q[it.id];
      const ok = it.selected.length > 0 && sameSet(it.selected, q.answer);
      it.correct = ok;
      if (ok) right++;
      const pd = perDomain[q.domain] || (perDomain[q.domain] = { right: 0, total: 0 });
      pd.total++;
      if (ok) pd.right++;
      record(it.id, ok);
    });
    const score = Math.round((right / ex.items.length) * 100);
    const result = {
      date: Date.now(),
      total: ex.items.length,
      right,
      score,
      seconds: Math.round((Date.now() - ex.startedAt) / 1000),
      timeUp: !!timeUp,
      perDomain,
      items: ex.items.map((it) => ({ id: it.id, order: it.order, selected: it.selected, correct: it.correct }))
    };
    store.exams.push({ date: result.date, total: result.total, right, score, seconds: result.seconds, perDomain });
    if (store.exams.length > 50) store.exams.splice(0, store.exams.length - 50);
    store.lastExam = result;
    saveStore();
    exam = null;
    saveExam();
    if (location.hash !== '#/resultado') location.hash = '#/resultado';
    else viewResult();
  }

  function viewResult() {
    const r = store.lastExam;
    if (!r) { location.hash = '#/examen'; return; }

    const domRows = DOMAINS.filter((d) => r.perDomain[d.id]).map((d) => {
      const pd = r.perDomain[d.id];
      const p = Math.round((pd.right / pd.total) * 100);
      return '<div class="breakdown-row"><div class="row-head"><span>' + d.order + '. ' + esc(d.title) + '</span><b>' + pd.right + '/' + pd.total + ' · ' + p + '%</b></div>' +
        '<div class="bar ' + pctClass(p) + '"><span style="width:' + p + '%"></span></div></div>';
    }).join('');

    const weakest = DOMAINS.filter((d) => r.perDomain[d.id])
      .map((d) => ({ d, p: r.perDomain[d.id].right / r.perDomain[d.id].total }))
      .sort((a, b) => a.p - b.p)[0];

    let verdict;
    if (r.score >= 85) verdict = '¡Excelente! Vas muy bien encaminado. Mantén este nivel en varios simulacros seguidos.';
    else if (r.score >= 70) verdict = 'Buen resultado. Refuerza los temas más flojos y repasa las explicaciones de los fallos.';
    else verdict = 'Aún hay margen de mejora. Practica por temas, lee los tips y vuelve a intentarlo.';

    render(
      '<section class="card center">' +
        '<h1>Resultado del simulacro</h1>' +
        (r.timeUp ? '<p class="hint">Se acabó el tiempo</p>' : '') +
        '<div class="score-ring" style="--p:' + r.score + ';--c:var(--' + (pctClass(r.score) || 'accent') + ')"><b>' + r.score + '%</b></div>' +
        '<p><b>' + r.right + '</b> de ' + r.total + ' correctas · ' + fmtTime(r.seconds) + '</p>' +
        '<p class="muted">' + verdict + '</p>' +
        (weakest && weakest.p < 1 ? '<p class="small">Tema a reforzar: <a href="#/tema/' + weakest.d.id + '">' + esc(weakest.d.title) + '</a></p>' : '') +
        '<div class="btn-row" style="max-width:520px;margin:0 auto">' +
          '<a class="btn btn-primary" href="#/examen">Nuevo simulacro</a>' +
          '<a class="btn" href="#/practica?d=mistakes">Repasar errores</a>' +
        '</div>' +
      '</section>' +
      '<div class="section-title"><h2>Por tema</h2></div>' +
      '<section class="card">' + domRows + '</section>' +
      '<div class="section-title"><h2>Revisión</h2>' +
        '<label class="small"><input type="checkbox" id="onlyWrong"> Solo incorrectas</label></div>' +
      '<div id="reviewList">' + r.items.map((it, i) => reviewDetails(it, true, i + 1)).join('') + '</div>',
      'exam'
    );

    document.getElementById('onlyWrong').onchange = (e) => {
      app.querySelectorAll('#reviewList .review-item').forEach((el) => {
        el.hidden = e.target.checked && el.dataset.ok === '1';
      });
    };
  }

  function reviewDetails(item, withNumber, n) {
    const q = Q[item.id];
    const ok = item.correct === true;
    return '<details class="review-item" data-ok="' + (ok ? 1 : 0) + '">' +
      '<summary><span class="res ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '✗') + '</span>' +
      '<span class="sum-text">' + (withNumber ? '<b>' + n + '.</b> ' : '') + esc(plain(q.q)) + '</span></summary>' +
      '<div class="review-body">' + questionHTML(item, { revealed: true }) + '</div>' +
      '</details>';
  }

  /* =========================================================
     Repaso e historial
     ========================================================= */

  function viewReview() {
    const byDomain = DOMAINS.map((d) => {
      const ids = store.mistakes.filter((id) => Q[id].domain === d.id);
      return { d, ids };
    }).filter((x) => x.ids.length);

    const mistakesHTML = byDomain.length
      ? byDomain.map((x) =>
          '<div class="breakdown-row"><div class="row-head"><span>' + x.d.order + '. ' + esc(x.d.title) + '</span>' +
          '<a href="#/practica?d=' + x.d.id + '&m=wrong">' + x.ids.length + ' por repasar →</a></div></div>'
        ).join('')
      : '<p class="muted" style="margin:0">No tienes errores pendientes. ¡Bien!</p>';

    const hist = store.exams.slice().reverse();
    const histHTML = hist.length
      ? '<div class="table-wrap"><table class="history"><thead><tr><th>Fecha</th><th>Preguntas</th><th>Aciertos</th><th>Nota</th><th>Tiempo</th></tr></thead><tbody>' +
        hist.map((h) => '<tr><td>' + fmtDate(h.date) + '</td><td>' + h.total + '</td><td>' + h.right + '</td><td><b style="color:var(--' + pctClass(h.score) + ')">' + h.score + '%</b></td><td>' + fmtTime(h.seconds) + '</td></tr>').join('') +
        '</tbody></table></div>'
      : '<p class="muted" style="margin:0">Todavía no has hecho ningún simulacro.</p>';

    const avg = hist.length ? Math.round(hist.slice(0, 5).reduce((s, h) => s + h.score, 0) / Math.min(5, hist.length)) : null;

    render(
      '<section class="card">' +
        '<h1>Repaso</h1>' +
        '<p class="muted">Cada pregunta que fallas se guarda aquí hasta que la respondas bien. El progreso se guarda en este navegador.</p>' +
        '<div class="stats">' +
          '<div class="stat"><b>' + store.mistakes.length + '</b><span>Errores pendientes</span></div>' +
          '<div class="stat"><b>' + store.exams.length + '</b><span>Simulacros</span></div>' +
          '<div class="stat"><b>' + (avg === null ? '—' : avg + '%') + '</b><span>Media (últ. 5)</span></div>' +
        '</div>' +
        '<div class="btn-row" style="margin-top:14px">' +
          '<a class="btn btn-primary" href="#/practica?d=mistakes"' + (store.mistakes.length ? '' : ' aria-disabled="true"') + '>Repasar todos los errores</a>' +
          (store.lastExam ? '<a class="btn" href="#/resultado">Ver último resultado</a>' : '') +
        '</div>' +
      '</section>' +
      '<div class="section-title"><h2>Errores por tema</h2></div>' +
      '<section class="card">' + mistakesHTML + '</section>' +
      '<div class="section-title"><h2>Historial de simulacros</h2></div>' +
      '<section class="card">' + histHTML + '</section>' +
      '<div class="section-title"><h2>Datos</h2></div>' +
      '<section class="card"><p class="muted small">Borra todo tu progreso, errores e historial de este dispositivo.</p>' +
        '<button class="btn btn-danger" id="resetBtn">Reiniciar progreso</button></section>',
      'review'
    );

    document.getElementById('resetBtn').onclick = () => {
      if (!confirm('¿Seguro que quieres borrar todo tu progreso? Esta acción no se puede deshacer.')) return;
      store.stats = {}; store.mistakes = []; store.exams = []; store.lastExam = null;
      saveStore();
      exam = null; saveExam();
      viewReview();
    };
  }

  /* =========================================================
     Guía, estrategia y chuleta
     ========================================================= */

  function viewTips() {
    const domainList = DOMAINS.map((d) =>
      '<li><a href="#/tema/' + d.id + '"><b>' + esc(d.title) + '</b></a> <span class="muted small">— ' + esc(d.titleEn) + '</span></li>'
    ).join('');

    const cheat = [
      ['Fuerzas, velocidad o física continua', '`FixedUpdate`'],
      ['Seguimiento de cámara', '`LateUpdate`'],
      ['Leer input de un frame (`GetKeyDown`, `WasPressedThisFrame`)', '`Update`'],
      ['Objeto rápido que atraviesa paredes', 'Collision Detection **Continuous**'],
      ['Trigger que no se dispara', '¿Hay `Rigidbody`? ¿Is Trigger? ¿Layer Collision Matrix?'],
      ['Cambiar el color de un solo objeto', '`.material` (instancia) o `MaterialPropertyBlock`'],
      ['Objetos dinámicos en una escena baked', '**Light Probes**'],
      ['Reflejos correctos del entorno', '**Reflection Probes**'],
      ['Animación que reacciona tarde', 'Desactivar **Has Exit Time**'],
      ['Pausa', '`Time.timeScale = 0` + UI con tiempo *unscaled*'],
      ['Guardar ajustes simples', '`PlayerPrefs`'],
      ['Guardar partida', '`JsonUtility` + `File` en `persistentDataPath`'],
      ['Datos de diseño compartidos', '`ScriptableObject`'],
      ['Muchos objetos que se crean y destruyen', 'Object pooling (`ObjectPool<T>`)'],
      ['Sonido al destruir un objeto', '`AudioSource.PlayClipAtPoint`'],
      ['Puerta que bloquea agentes', '`NavMeshObstacle` + **Carve**'],
      ['Agente que salta un hueco', '`NavMeshLink`'],
      ['NavMesh de un nivel procedural', '`NavMeshSurface.BuildNavMesh()`'],
      ['Basura (GC) en cada frame', 'Caché, versiones `NonAlloc`, `CompareTag`, evitar strings'],
      ['Muchos draw calls (2D)', '**Sprite Atlas**'],
      ['Muchas copias de la misma malla', '**GPU Instancing** / SRP Batcher'],
      ['Clase usada por reflexión que falta en IL2CPP', '`link.xml` / `[Preserve]`'],
      ['Mareo en VR', 'Teletransporte, snap turn, FPS estables'],
      ['Referencias rotas tras un pull', 'Faltan archivos `.meta`'],
      ['Test que necesita frames o física', '`[UnityTest]` + `IEnumerator` (Play Mode)']
    ];

    const glossary = [
      ['Choose two / Select all that apply', 'Elige dos / Selecciona todas las correctas'],
      ['Most efficient / best approach', 'Lo más eficiente / el mejor enfoque'],
      ['Which statement is NOT true', '¿Qué afirmación NO es correcta?'],
      ['Garbage collection (GC) spike', 'Pico del recolector de basura'],
      ['Draw call / batching', 'Llamada de dibujo / agrupación'],
      ['Baked lighting / lightmap', 'Iluminación precalculada / mapa de luz'],
      ['Pathfinding / NavMesh agent', 'Búsqueda de rutas / agente de navegación'],
      ['Merge conflict / branch', 'Conflicto de fusión / rama']
    ];

    render(
      '<section class="card">' +
        '<h1>Guía de estudio</h1>' +
        '<p class="muted">Estrategia, plan de estudio y una chuleta con los patrones que más se repiten.</p>' +
      '</section>' +

      '<div class="section-title"><h2>Sobre el examen</h2></div>' +
      '<section class="card"><ul class="list">' +
        '<li>La certificación <b>Unity Certified Professional: Programmer</b> evalúa a programadores con experiencia práctica en Unity. Cubre <b>' + DOMAINS.length + ' áreas</b>:<ul class="list" style="margin-top:8px">' + domainList + '</ul></li>' +
        '<li>Las preguntas son de opción múltiple: algunas tienen <b>una</b> respuesta y otras piden <b>varias</b> ("choose two", "select all that apply").</li>' +
        '<li>Muchas preguntas muestran <b>fragmentos de código C#</b>: debes predecir qué hacen, encontrar el error o elegir la línea que falta.</li>' +
        '<li>El examen está en <b>inglés</b>: aprende el nombre en inglés de cada concepto y de cada API (aquí se mantienen en inglés a propósito).</li>' +
        '<li>Unity actualiza a veces el formato (duración, número de preguntas, nota mínima, versión de Unity). <b>Revisa la Exam Guide oficial</b> antes de reservar fecha.</li>' +
      '</ul></section>' +

      '<div class="section-title"><h2>Estrategia el día del examen</h2></div>' +
      '<ul class="tips-list">' +
        '<li>Lee el <b>final de la pregunta primero</b>: ¿pide lo correcto, lo incorrecto (NOT), lo más eficiente o el mejor enfoque?</li>' +
        '<li>Descarta lo imposible: APIs que no existen, métodos en el lugar equivocado del ciclo de vida, o soluciones que funcionan pero son claramente ineficientes.</li>' +
        '<li>En el código, revisa <b>dónde</b> se ejecuta (<code>Update</code> / <code>FixedUpdate</code> / <code>Awake</code>), <b>qué tipo</b> devuelve (struct vs. clase) y si hay <b>asignaciones</b> por frame.</li>' +
        '<li>Si dudas, responde, <b>marca</b> la pregunta y sigue. No te quedes atascado: vuelve al final con el tiempo que te sobre.</li>' +
        '<li>No dejes preguntas sin responder.</li>' +
        '<li>Cuando dos respuestas parecen correctas, elige la que sigue las <b>buenas prácticas recomendadas por Unity</b> (caché de referencias, pooling, eventos, <code>[SerializeField] private</code>).</li>' +
      '</ul>' +

      '<div class="section-title"><h2>Plan de estudio sugerido (6 semanas)</h2></div>' +
      '<section class="card"><ol class="list">' +
        '<li><b>Semana 1:</b> Interacciones principales (física, input, cámara). Haz un mini proyecto con Rigidbody, raycasts y el Input System.</li>' +
        '<li><b>Semana 2:</b> Pipeline de arte. Practica Animator (blend trees, layers, eventos), materiales por código y partículas.</li>' +
        '<li><b>Semana 3:</b> Sistemas de aplicación. Menú principal, pausa, opciones con AudioMixer y guardado en JSON.</li>' +
        '<li><b>Semana 4:</b> Escena y entorno. Object pooling, audio 3D y NavMesh (obstacles, links, áreas).</li>' +
        '<li><b>Semana 5:</b> Rendimiento y plataformas. Perfila tu proyecto, reduce el GC Alloc, prueba en móvil y repasa XR.</li>' +
        '<li><b>Semana 6:</b> Desarrollo en equipo y simulacros. Git + LFS, Unity Test Framework y <b>un simulacro completo cada 2 días</b>, repasando los errores.</li>' +
      '</ol><p class="muted small" style="margin:0">Meta orientativa: superar el <b>80–85 %</b> de forma constante en los simulacros antes de presentarte.</p></section>' +

      '<div class="section-title"><h2>Ciclo de vida de MonoBehaviour</h2></div>' +
      '<section class="card">' +
        '<p class="small muted">Inicialización</p>' +
        '<div class="flow"><code>Awake</code><span class="arrow">→</span><code>OnEnable</code><span class="arrow">→</span><code>Start</code></div>' +
        '<p class="small muted" style="margin-top:12px">Cada frame</p>' +
        '<div class="flow"><code>FixedUpdate</code><span class="arrow">→</span><code>OnTrigger/OnCollision</code><span class="arrow">→</span><code>Update</code><span class="arrow">→</span><code>yield null / WaitForSeconds</code><span class="arrow">→</span><code>LateUpdate</code><span class="arrow">→</span><code>Render</code></div>' +
        '<p class="small muted" style="margin-top:12px">Desactivación y destrucción</p>' +
        '<div class="flow"><code>OnDisable</code><span class="arrow">→</span><code>OnDestroy</code></div>' +
        '<p class="small" style="margin:12px 0 0"><code>FixedUpdate</code> puede ejecutarse 0, 1 o varias veces por frame (por defecto cada 0,02 s).</p>' +
      '</section>' +

      '<div class="section-title"><h2>Chuleta: si ves… piensa en…</h2></div>' +
      '<section class="card table-wrap"><table class="cheat"><thead><tr><th>Situación</th><th>Respuesta típica</th></tr></thead><tbody>' +
        cheat.map((r) => '<tr><td>' + fmt(r[0]) + '</td><td>' + fmt(r[1]) + '</td></tr>').join('') +
      '</tbody></table></section>' +

      '<div class="section-title"><h2>Vocabulario en inglés del examen</h2></div>' +
      '<section class="card table-wrap"><table class="cheat"><thead><tr><th>Inglés</th><th>Español</th></tr></thead><tbody>' +
        glossary.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>').join('') +
      '</tbody></table></section>' +

      '<div class="section-title"><h2>Recursos oficiales</h2></div>' +
      '<section class="card"><ul class="list">' +
        '<li><a href="https://unity.com/products/unity-certifications" target="_blank" rel="noopener">Unity Certifications</a>: información del examen y Exam Guide.</li>' +
        '<li><a href="https://learn.unity.com/" target="_blank" rel="noopener">Unity Learn</a>: rutas y cursos de preparación.</li>' +
        '<li><a href="https://docs.unity3d.com/Manual/index.html" target="_blank" rel="noopener">Unity Manual</a> y <a href="https://docs.unity3d.com/ScriptReference/index.html" target="_blank" rel="noopener">Scripting API</a>: la fuente más fiable para resolver dudas.</li>' +
        '<li><a href="https://docs.unity3d.com/Manual/ExecutionOrder.html" target="_blank" rel="noopener">Orden de ejecución de las funciones de eventos</a>.</li>' +
      '</ul></section>',
      'tips'
    );
  }

  function viewNotFound() {
    render('<section class="card empty"><div class="big">🧭</div><h2>Página no encontrada</h2><p><a href="#/">Volver al inicio</a></p></section>', 'home');
  }

  /* =========================================================
     Router (hash)
     ========================================================= */

  function route() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(query || '');

    switch (parts[0] || '') {
      case '': return viewHome();
      case 'tema': return viewDomain(parts[1]);
      case 'practica': return startPractice(params);
      case 'examen': return viewExamSetup();
      case 'resultado': return viewResult();
      case 'repaso': return viewReview();
      case 'tips': return viewTips();
      default: return viewNotFound();
    }
  }

  window.addEventListener('hashchange', route);

  /* =========================================================
     Tema claro / oscuro
     ========================================================= */

  document.getElementById('themeToggle').addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ucpp-theme', next); } catch (e) { /* noop */ }
  });

  route();
})();
