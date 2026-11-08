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
  const LANG_KEY = 'ucpp-lang';

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
     Idioma (español / inglés)
     ========================================================= */

  const I18N = window.UCP_I18N;
  const LANGS = ['es', 'en'];

  function detectLang() {
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* noop */ }
    if (LANGS.includes(saved)) return saved;
    const nav = (navigator.language || 'es').toLowerCase();
    return nav.startsWith('en') ? 'en' : 'es';
  }

  let lang = detectLang();

  // Texto de la interfaz. Las entradas pueden ser strings o funciones con parámetros.
  function t(key) {
    const args = Array.prototype.slice.call(arguments, 1);
    const v = I18N[lang][key] !== undefined ? I18N[lang][key] : I18N.es[key];
    return typeof v === 'function' ? v.apply(null, args) : (v === undefined ? key : v);
  }

  // Pregunta en el idioma actual (con respaldo al español si falta la traducción).
  function LQ(q) {
    const tr = lang !== 'es' && UCP.translations[lang] && UCP.translations[lang].questions[q.id];
    if (!tr) return q;
    return {
      topic: tr.topic || q.topic,
      q: tr.q || q.q,
      options: tr.options && tr.options.length === q.options.length ? tr.options : q.options,
      explanation: tr.explanation || q.explanation
    };
  }

  // Dominio en el idioma actual.
  function LD(d) {
    const tr = lang !== 'es' && UCP.translations[lang] && UCP.translations[lang].domains[d.id];
    if (lang === 'es' || !tr) {
      return { title: d.title, subtitle: d.titleEn, description: d.description, objectives: d.objectives, tips: d.tips };
    }
    return {
      title: tr.title || d.titleEn,
      subtitle: null,
      description: tr.description || d.description,
      objectives: tr.objectives || d.objectives,
      tips: tr.tips || d.tips
    };
  }

  const CONCEPTS = UCP.concepts || [];

  // Concepto en el idioma actual.
  function LC(cc) {
    return cc.text[lang] || cc.text.es;
  }

  function applyStaticTexts() {
    document.documentElement.lang = t('htmlLang');
    document.title = t('docTitle');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
      if (el.tagName === 'BUTTON') el.setAttribute('title', t(el.dataset.i18nAria));
    });
    document.querySelectorAll('#langToggle [data-lang]').forEach((el) => {
      el.classList.toggle('on', el.dataset.lang === lang);
    });
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* noop */ }
    applyStaticTexts();
    refresh();
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
      const tok = m[0];
      let cls = null;
      if (m[1]) cls = 'c';
      else if (m[2]) cls = 's';
      else if (m[3]) cls = 'p';
      else if (m[4]) cls = 'a';
      else if (m[5]) cls = 'n';
      else if (KEYWORDS.has(tok)) cls = 'k';
      else if (/^[A-Z]/.test(tok)) cls = code[last] === '(' ? 'f' : 't';
      out += cls ? '<span class="tok-' + cls + '">' + esc(tok) + '</span>' : esc(tok);
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
      return new Date(ts).toLocaleString(t('locale'), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return new Date(ts).toISOString().slice(0, 16).replace('T', ' '); }
  }

  function setNav(name) {
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
  }

  // Función que vuelve a pintar la vista actual (se usa al cambiar de idioma).
  let refresh = () => route();

  let cleanupView = null;

  function render(html, navName, keepScroll) {
    stopTimer();
    if (cleanupView) { try { cleanupView(); } catch (e) { /* noop */ } cleanupView = null; }
    keyHandler = null;
    refresh = () => route();
    const y = window.scrollY;
    app.innerHTML = html;
    setNav(navName);
    window.scrollTo(0, keepScroll ? y : 0);
    // Animación de entrada solo al cambiar de vista o de pregunta, no al repintar la misma.
    if (!keepScroll) {
      app.classList.remove('view-enter');
      void app.offsetWidth;
      app.classList.add('view-enter');
    }
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
    const lq = LQ(q);
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
        '<span class="opt-text">' + fmt(lq.options[orig]) + '</span>' +
        (mark ? '<span class="opt-mark" aria-hidden="true">' + mark + '</span>' : '') +
        '</button>';
    }).join('');

    let feedback = '';
    if (revealed && opts.showFeedback !== false) {
      const answered = item.selected.length > 0;
      const title = correctNow ? t('correct') : (answered ? t('incorrect') : t('unanswered'));
      feedback = '<div class="feedback ' + (correctNow ? 'ok' : 'bad') + '" role="status">' +
        '<div class="fb-title">' + title + '</div>' +
        '<p>' + fmt(lq.explanation) + '</p></div>';
    }

    return '<div class="qmeta">' +
        '<span class="tag">' + d.order + '. ' + esc(LD(d).title) + '</span>' +
        '<span class="tag tag-soft">' + esc(lq.topic) + '</span>' +
      '</div>' +
      '<div class="qtext">' + fmt(lq.q) + '</div>' +
      (q.code ? '<pre class="code"><code>' + highlight(q.code) + '</code></pre>' : '') +
      (multi ? '<div class="hint">' + t('selectN', q.answer.length) + '</div>' : '') +
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
      const ld = LD(d);
      return '<a class="card domain-card" href="#/tema/' + d.id + '">' +
        '<div class="domain-num">' + d.order + '</div>' +
        '<div class="domain-body">' +
          '<h3>' + esc(ld.title) + '</h3>' +
          (ld.subtitle ? '<div class="domain-en">' + esc(ld.subtitle) + '</div>' : '<div class="domain-en"></div>') +
          '<div class="bar ' + pctClass(s.accuracy) + '"><span style="width:' + s.coverage + '%"></span></div>' +
          '<div class="domain-meta"><span>' + t('answeredOf', s.seen, s.total) + '</span>' +
          '<span>' + (s.accuracy === null ? t('notStarted') : t('pctCorrect', s.accuracy)) + '</span></div>' +
        '</div></a>';
    }).join('');

    render(
      '<section class="card hero">' +
        '<h1>' + t('heroTitle') + '</h1>' +
        '<p>' + t('heroText', QUESTIONS.length, DOMAINS.length) + '</p>' +
        '<div class="stats">' +
          '<div class="stat"><b>' + all.coverage + '%</b><span>' + t('statCoverage') + '</span></div>' +
          '<div class="stat"><b>' + (all.accuracy === null ? '—' : all.accuracy + '%') + '</b><span>' + t('statAccuracy') + '</span></div>' +
          '<div class="stat"><b>' + (last ? last.score + '%' : '—') + '</b><span>' + t('statLastExam') + '</span></div>' +
        '</div>' +
      '</section>' +

      '<nav class="quick" aria-label="' + esc(t('quickAria')) + '">' +
        '<a href="#/practica?d=all&m=new"><span class="qicon">🎯</span><b>' + t('quickPractice') + '</b><span>' + t('quickPracticeSub', all.total - all.seen) + '</span></a>' +
        '<a href="#/examen"><span class="qicon">⏱️</span><b>' + t('quickExam') + '</b><span>' + t('quickExamSub') + '</span></a>' +
        '<a href="#/practica?d=mistakes"><span class="qicon">🔁</span><b>' + t('quickMistakes') + '</b><span>' + t('quickMistakesSub', store.mistakes.length) + '</span></a>' +
        '<a href="#/tips"><span class="qicon">📘</span><b>' + t('quickGuide') + '</b><span>' + t('quickGuideSub') + '</span></a>' +
      '</nav>' +

      '<a class="card concepts-banner" href="#/conceptos"><span class="qicon">🧪</span><span><b>' + t('conceptsBanner', CONCEPTS.length) + '</b><span>' + t('conceptsBannerSub') + '</span></span><span class="arrow" aria-hidden="true">→</span></a>' +

      '<div class="section-title"><h2>' + t('domainsTitle') + '</h2><span class="muted small">' + t('domainsHint') + '</span></div>' +
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
    const ld = LD(d);
    const s = domainStats(d.questions);
    const wrong = d.questions.filter((q) => store.mistakes.includes(q.id)).length;

    // El subtema canónico (español) va en la URL; la etiqueta se muestra traducida.
    const topics = {};
    const topicLabel = {};
    d.questions.forEach((q) => {
      topics[q.topic] = (topics[q.topic] || 0) + 1;
      if (!topicLabel[q.topic]) topicLabel[q.topic] = LQ(q).topic;
    });
    const chips = Object.keys(topics).map((tp) =>
      '<a class="chip" href="#/practica?d=' + d.id + '&t=' + encodeURIComponent(tp) + '">' + esc(topicLabel[tp]) + ' <small>' + topics[tp] + '</small></a>'
    ).join('');

    render(
      '<a class="back" href="#/">' + t('backHome') + '</a>' +
      '<section class="card">' +
        '<span class="tag">' + t('domainN', d.order) + '</span>' +
        '<h1 style="margin-top:10px">' + esc(ld.title) + '</h1>' +
        (ld.subtitle ? '<p class="muted small">' + esc(ld.subtitle) + '</p>' : '') +
        '<p>' + esc(ld.description) + '</p>' +
        '<div class="stats">' +
          '<div class="stat"><b>' + s.total + '</b><span>' + t('statQuestions') + '</span></div>' +
          '<div class="stat"><b>' + s.coverage + '%</b><span>' + t('statCovered') + '</span></div>' +
          '<div class="stat"><b>' + (s.accuracy === null ? '—' : s.accuracy + '%') + '</b><span>' + t('statAccuracy') + '</span></div>' +
        '</div>' +
        '<div class="btn-row" style="margin-top:14px">' +
          '<a class="btn btn-primary" href="#/practica?d=' + d.id + '">' + t('practiceAll') + '</a>' +
          '<a class="btn" href="#/practica?d=' + d.id + '&m=new">' + t('onlyNew', s.total - s.seen) + '</a>' +
          '<a class="btn" href="#/practica?d=' + d.id + '&m=wrong">' + t('onlyWrong', wrong) + '</a>' +
        '</div>' +
      '</section>' +

      '<div class="section-title"><h2>' + t('bySubtopic') + '</h2></div>' +
      '<div class="chips">' + chips + '</div>' +

      (CONCEPTS.some((cc) => cc.domain === d.id)
        ? '<div class="section-title"><h2>' + t('conceptsOfDomain') + '</h2></div><div class="chips">' +
          CONCEPTS.filter((cc) => cc.domain === d.id).map((cc) => '<a class="chip" href="#/concepto/' + cc.id + '">' + cc.icon + ' ' + esc(LC(cc).title) + '</a>').join('') + '</div>'
        : '') +

      '<div class="section-title"><h2>' + t('keyTips') + '</h2></div>' +
      '<ul class="tips-list">' + ld.tips.map((tip) => '<li>' + fmt(tip) + '</li>').join('') + '</ul>' +

      '<div class="section-title"><h2>' + t('objectives') + '</h2></div>' +
      '<section class="card"><ul class="list">' + ld.objectives.map((o) => '<li>' + fmt(o) + '</li>').join('') + '</ul></section>',
      'home'
    );
  }

  /* =========================================================
     Modo práctica (feedback inmediato)
     ========================================================= */

  let practice = null;

  function practiceTitle(p) {
    let title;
    if (p.scope === 'mistakes') title = t('mistakesTitle');
    else if (DOMAIN[p.scope]) title = LD(DOMAIN[p.scope]).title;
    else title = t('allDomains');
    if (p.topic) {
      const sample = (DOMAIN[p.scope] ? DOMAIN[p.scope].questions : QUESTIONS).find((q) => q.topic === p.topic);
      title += ' · ' + (sample ? LQ(sample).topic : p.topic);
    }
    if (p.mode === 'new') title += t('suffixNew');
    if (p.mode === 'wrong') title += t('suffixWrong');
    return title;
  }

  function startPractice(params) {
    const scope = params.get('d') || 'all';
    const mode = params.get('m') || 'all';
    const topic = params.get('t');

    let pool;
    let backHref = '#/';
    if (scope === 'mistakes') {
      pool = store.mistakes.map((id) => Q[id]).filter(Boolean);
      backHref = '#/repaso';
    } else if (DOMAIN[scope]) {
      pool = DOMAIN[scope].questions;
      backHref = '#/tema/' + scope;
    } else {
      pool = QUESTIONS;
    }

    if (topic) pool = pool.filter((q) => q.topic === topic);
    if (mode === 'new') pool = pool.filter((q) => !store.stats[q.id]);
    if (mode === 'wrong') pool = pool.filter((q) => store.mistakes.includes(q.id));

    if (!pool.length) {
      const msg = scope === 'mistakes' || mode === 'wrong' ? t('emptyMistakes') : t('emptyDone');
      render('<a class="back" href="' + backHref + '">' + t('back') + '</a><section class="card empty">' + msg +
        '<div class="btn-row" style="max-width:420px;margin:12px auto 0"><a class="btn btn-primary" href="#/examen">' + t('doExam') + '</a><a class="btn" href="#/">' + t('home') + '</a></div></section>', 'home');
      return;
    }

    practice = {
      scope,
      mode,
      topic,
      backHref,
      items: shuffle(pool.map((q) => q.id)).map(makeItem),
      idx: 0,
      revealed: false,
      ok: 0,
      bad: 0
    };
    renderPractice();
  }

  function renderPractice(keepScroll) {
    const p = practice;
    const item = p.items[p.idx];
    const total = p.items.length;
    const isLast = p.idx === total - 1;
    const pct = Math.round(((p.idx + (p.revealed ? 1 : 0)) / total) * 100);

    let primary;
    if (!p.revealed) {
      primary = '<button class="btn btn-primary" id="checkBtn"' + (readyToCheck(item) ? '' : ' disabled') + '>' + t('check') + '</button>';
    } else {
      primary = '<button class="btn btn-primary" id="nextBtn">' + (isLast ? t('seeResult') : t('next')) + '</button>';
    }

    render(
      '<a class="back" href="' + p.backHref + '">← ' + esc(practiceTitle(p)) + '</a>' +
      '<div class="qbar"><span>' + t('questionOf', p.idx + 1, total) + '</span>' +
        '<span class="score"><span class="ok-c">✓ ' + p.ok + '</span> &nbsp; <span class="bad-c">✗ ' + p.bad + '</span></span></div>' +
      '<div class="bar" style="margin-bottom:14px"><span style="width:' + pct + '%"></span></div>' +
      '<article class="card" id="qcard">' + questionHTML(item, { revealed: p.revealed }) + '</article>' +
      '<div class="actions">' +
        (p.revealed ? '' : '<button class="btn btn-ghost" id="skipBtn">' + t('skip') + '</button>') +
        primary +
      '</div>' +
      '<p class="kbd-hint">' + t('kbdPractice') + '</p>',
      'home',
      keepScroll
    );
    refresh = () => renderPractice(true);

    const onSelect = () => {
      const cb = document.getElementById('checkBtn');
      if (cb) cb.disabled = !readyToCheck(item);
    };
    bindOptions(item, !p.revealed, onSelect);

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
      if (!p.revealed) keySelect(e, item, onSelect);
    };
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
    renderPractice(true);
    const fb = app.querySelector('.feedback');
    if (fb && fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function nextPractice() {
    const p = practice;
    if (p.idx >= p.items.length - 1) return renderPracticeSummary();
    p.idx++;
    p.revealed = false;
    renderPractice();
  }

  function renderPracticeSummary(keepScroll) {
    const p = practice;
    const answered = p.ok + p.bad;
    const score = answered ? Math.round((p.ok / answered) * 100) : 0;
    const wrongItems = p.items.filter((it) => it.correct === false);

    render(
      '<a class="back" href="' + p.backHref + '">' + t('back') + '</a>' +
      '<section class="card center">' +
        '<h1>' + t('sessionDone') + '</h1>' +
        '<div class="score-ring" style="--p:' + score + ';--c:var(--' + (pctClass(score) || 'accent') + ')"><b>' + score + '%</b></div>' +
        '<p><span style="color:var(--ok);font-weight:700">' + t('nCorrect', p.ok) + '</span> · <span style="color:var(--bad);font-weight:700">' + t('nWrong', p.bad) + '</span></p>' +
        '<p class="muted small">' + esc(practiceTitle(p)) + '</p>' +
        '<div class="btn-row" style="max-width:520px;margin:0 auto">' +
          (wrongItems.length ? '<a class="btn btn-primary" href="#/practica?d=mistakes">' + t('reviewMistakes') + '</a>' : '') +
          '<a class="btn" href="' + p.backHref + '">' + t('backToDomain') + '</a>' +
          '<a class="btn" href="#/examen">' + t('doExam') + '</a>' +
        '</div>' +
      '</section>' +
      (wrongItems.length
        ? '<div class="section-title"><h2>' + t('missedQuestions') + '</h2></div>' + wrongItems.map((it) => reviewDetails(it, false)).join('')
        : ''),
      'home',
      keepScroll
    );
    refresh = () => renderPracticeSummary(true);
  }

  // Actualiza las opciones en su sitio (sin repintar la vista) para que las transiciones se vean.
  function syncOptions(item) {
    app.querySelectorAll('.opt').forEach((btn) => {
      const sel = item.selected.includes(Number(btn.dataset.opt));
      btn.classList.toggle('selected', sel);
      btn.setAttribute('aria-checked', sel);
    });
  }

  function bindOptions(item, enabled, onChange) {
    if (!enabled) return;
    app.querySelectorAll('.opt').forEach((btn) => {
      btn.onclick = () => {
        toggleSelection(item, Number(btn.dataset.opt));
        syncOptions(item);
        onChange();
      };
    });
  }

  function keySelect(e, item, onChange) {
    let i = -1;
    const k = e.key.toUpperCase();
    if (/^[1-8]$/.test(k)) i = Number(k) - 1;
    else if (k.length === 1 && LETTERS.indexOf(k) !== -1) i = LETTERS.indexOf(k);
    if (i < 0 || i >= item.order.length) return;
    e.preventDefault();
    toggleSelection(item, item.order[i]);
    syncOptions(item);
    onChange();
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
          '<h1>' + t('inProgressTitle') + '</h1>' +
          '<p class="muted">' + t('inProgressInfo', answered, exam.items.length) +
          (remaining !== null ? t('remaining', fmtTime(remaining)) : '') + '.</p>' +
          '<div class="btn-row"><button class="btn btn-primary" id="resumeBtn">' + t('resume') + '</button>' +
          '<button class="btn btn-danger" id="discardBtn">' + t('discard') + '</button></div>' +
        '</section>',
        'exam'
      );
      document.getElementById('resumeBtn').onclick = () => {
        if (exam.endAt && Date.now() >= exam.endAt) return finishExam(true);
        renderExam();
      };
      document.getElementById('discardBtn').onclick = () => {
        if (!confirm(t('confirmDiscard'))) return;
        exam = null; saveExam(); viewExamSetup();
      };
      return;
    }

    const counts = [20, 40, 60, QUESTIONS.length];
    const countHTML = counts.map((n, i) =>
      '<input type="radio" name="count" id="c' + n + '" value="' + n + '"' + (i === 1 ? ' checked' : '') + '>' +
      '<label for="c' + n + '">' + (n === QUESTIONS.length ? t('allN', n) : n) + '</label>'
    ).join('');

    const timeModes = [
      { v: '90', l: t('timeNormal') },
      { v: '60', l: t('timeHard') },
      { v: '0', l: t('timeNone') }
    ];
    const timeHTML = timeModes.map((m, i) =>
      '<input type="radio" name="time" id="t' + m.v + '" value="' + m.v + '"' + (i === 0 ? ' checked' : '') + '>' +
      '<label for="t' + m.v + '">' + m.l + '</label>'
    ).join('');

    const domainHTML = DOMAINS.map((d) =>
      '<label class="check"><input type="checkbox" name="dom" value="' + d.id + '" checked>' +
      '<span><b>' + d.order + '.</b> ' + esc(LD(d).title) + ' <span class="muted small">(' + d.questions.length + ')</span></span></label>'
    ).join('');

    const history = store.exams.slice(-3).reverse();

    render(
      '<section class="card">' +
        '<h1>' + t('examTitle') + '</h1>' +
        '<p class="muted">' + t('examIntro') + '</p>' +
        '<div class="setup-group"><span class="label">' + t('numQuestions') + '</span><div class="seg">' + countHTML + '</div></div>' +
        '<div class="setup-group"><span class="label">' + t('time') + '</span><div class="seg">' + timeHTML + '</div></div>' +
        '<div class="setup-group"><span class="label">' + t('domainsIncluded') + '</span><div class="checks">' + domainHTML + '</div></div>' +
        '<button class="btn btn-primary btn-block" id="startExam">' + t('start') + '</button>' +
        '<p class="muted small" style="margin:10px 0 0">' + t('balancedNote') + '</p>' +
      '</section>' +
      (history.length
        ? '<div class="section-title"><h2>' + t('lastExams') + '</h2><a href="#/repaso" class="small">' + t('seeHistory') + '</a></div>' +
          '<section class="card">' + history.map((h) =>
            '<div class="breakdown-row"><div class="row-head"><span>' + fmtDate(h.date) + ' · ' + t('nQuestions', h.total) + '</span><b>' + h.score + '%</b></div>' +
            '<div class="bar ' + pctClass(h.score) + '"><span style="width:' + h.score + '%"></span></div></div>'
          ).join('') + '</section>'
        : ''),
      'exam'
    );

    document.getElementById('startExam').onclick = () => {
      const count = Number(app.querySelector('input[name="count"]:checked').value);
      const perQ = Number(app.querySelector('input[name="time"]:checked').value);
      const doms = Array.from(app.querySelectorAll('input[name="dom"]:checked')).map((i) => i.value);
      if (!doms.length) { alert(t('pickDomain')); return; }
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

  function renderExam(keepScroll) {
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
      return '<button type="button" class="' + cls.trim() + '" data-go="' + i + '" aria-label="' + esc(t('qAria', i + 1)) + '">' + (i + 1) + '</button>';
    }).join('');

    render(
      '<div class="exam-top">' +
        '<span id="examBar">' + t('examBar', ex.idx + 1, total, answered) + '</span>' +
        (ex.endAt ? '<span class="timer" id="timer">--:--</span>' : '<span class="muted small">' + t('noLimit') + '</span>') +
      '</div>' +
      '<article class="card">' + questionHTML(item, { revealed: false }) + '</article>' +
      '<div class="actions">' +
        '<button class="btn" id="prevBtn"' + (ex.idx === 0 ? ' disabled' : '') + ' aria-label="' + esc(t('prev')) + '">←</button>' +
        '<button class="btn' + (item.flagged ? ' is-on' : '') + '" id="flagBtn">' + (item.flagged ? t('flagged') : t('flag')) + '</button>' +
        (isLast
          ? '<button class="btn btn-primary" id="finishBtn">' + t('finish') + '</button>'
          : '<button class="btn btn-primary" id="nextBtn">' + t('next') + '</button>') +
      '</div>' +
      '<section class="card" style="margin-top:8px">' +
        '<div class="section-title" style="margin:0 0 10px"><h3 style="margin:0">' + t('questionMap') + '</h3>' +
        '<button class="btn btn-ghost small" id="finishBtn2" style="min-height:34px;padding:6px 12px">' + t('finishExam') + '</button></div>' +
        '<div class="palette">' + palette + '</div>' +
        '<div class="legend"><span><i style="background:var(--accent-soft)"></i>' + t('legendAnswered') + '</span><span><i style="background:var(--warn)"></i>' + t('legendFlagged') + '</span><span><i style="border:1.5px solid var(--accent)"></i>' + t('legendCurrent') + '</span></div>' +
      '</section>' +
      '<p class="kbd-hint">' + t('kbdExam') + '</p>',
      'exam',
      keepScroll
    );
    refresh = () => renderExam(true);

    const rerender = () => { saveExam(); renderExam(true); };
    const onSelect = () => {
      saveExam();
      const n = ex.items.filter((it) => it.selected.length).length;
      const bar = document.getElementById('examBar');
      if (bar) bar.innerHTML = t('examBar', ex.idx + 1, total, n);
      const cell = app.querySelector('.palette [data-go="' + ex.idx + '"]');
      if (cell) cell.classList.toggle('answered', item.selected.length > 0);
    };
    bindOptions(item, true, onSelect);

    const go = (i) => { ex.idx = Math.max(0, Math.min(total - 1, i)); saveExam(); renderExam(); };
    document.getElementById('prevBtn').onclick = () => go(ex.idx - 1);
    const next = document.getElementById('nextBtn');
    if (next) next.onclick = () => go(ex.idx + 1);
    document.getElementById('flagBtn').onclick = () => { item.flagged = !item.flagged; rerender(); };
    const f1 = document.getElementById('finishBtn');
    if (f1) f1.onclick = confirmFinish;
    document.getElementById('finishBtn2').onclick = confirmFinish;
    app.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(Number(b.dataset.go)); });

    keyHandler = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); if (!isLast) go(ex.idx + 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(ex.idx - 1); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (isLast) confirmFinish(); else go(ex.idx + 1); return; }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); item.flagged = !item.flagged; rerender(); return; }
      keySelect(e, item, onSelect);
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
    if (confirm(t('confirmFinish', pending, flagged))) finishExam(false);
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
      return '<div class="breakdown-row"><div class="row-head"><span>' + d.order + '. ' + esc(LD(d).title) + '</span><b>' + pd.right + '/' + pd.total + ' · ' + p + '%</b></div>' +
        '<div class="bar ' + pctClass(p) + '"><span style="width:' + p + '%"></span></div></div>';
    }).join('');

    const weakest = DOMAINS.filter((d) => r.perDomain[d.id])
      .map((d) => ({ d, p: r.perDomain[d.id].right / r.perDomain[d.id].total }))
      .sort((a, b) => a.p - b.p)[0];

    let verdict;
    if (r.score >= 85) verdict = t('verdictHigh');
    else if (r.score >= 70) verdict = t('verdictMid');
    else verdict = t('verdictLow');

    render(
      '<section class="card center">' +
        '<h1>' + t('resultTitle') + '</h1>' +
        (r.timeUp ? '<p class="hint">' + t('timeUp') + '</p>' : '') +
        '<div class="score-ring" style="--p:' + r.score + ';--c:var(--' + (pctClass(r.score) || 'accent') + ')"><b>' + r.score + '%</b></div>' +
        '<p>' + t('resultLine', r.right, r.total, fmtTime(r.seconds)) + '</p>' +
        '<p class="muted">' + verdict + '</p>' +
        (weakest && weakest.p < 1 ? '<p class="small">' + t('weakDomain') + ' <a href="#/tema/' + weakest.d.id + '">' + esc(LD(weakest.d).title) + '</a></p>' : '') +
        '<div class="btn-row" style="max-width:520px;margin:0 auto">' +
          '<a class="btn btn-primary" href="#/examen">' + t('newExam') + '</a>' +
          '<a class="btn" href="#/practica?d=mistakes">' + t('reviewMistakes') + '</a>' +
        '</div>' +
      '</section>' +
      '<div class="section-title"><h2>' + t('byDomain') + '</h2></div>' +
      '<section class="card">' + domRows + '</section>' +
      '<div class="section-title"><h2>' + t('review') + '</h2>' +
        '<label class="small"><input type="checkbox" id="onlyWrong"> ' + t('onlyIncorrect') + '</label></div>' +
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
      '<span class="sum-text">' + (withNumber ? '<b>' + n + '.</b> ' : '') + esc(plain(LQ(q).q)) + '</span></summary>' +
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
          '<div class="breakdown-row"><div class="row-head"><span>' + x.d.order + '. ' + esc(LD(x.d).title) + '</span>' +
          '<a href="#/practica?d=' + x.d.id + '&m=wrong">' + t('toReview', x.ids.length) + '</a></div></div>'
        ).join('')
      : '<p class="muted" style="margin:0">' + t('noMistakes') + '</p>';

    const hist = store.exams.slice().reverse();
    const histHTML = hist.length
      ? '<div class="table-wrap"><table class="history"><thead><tr><th>' + t('thDate') + '</th><th>' + t('thQuestions') + '</th><th>' + t('thCorrect') + '</th><th>' + t('thScore') + '</th><th>' + t('thTime') + '</th></tr></thead><tbody>' +
        hist.map((h) => '<tr><td>' + fmtDate(h.date) + '</td><td>' + h.total + '</td><td>' + h.right + '</td><td><b style="color:var(--' + pctClass(h.score) + ')">' + h.score + '%</b></td><td>' + fmtTime(h.seconds) + '</td></tr>').join('') +
        '</tbody></table></div>'
      : '<p class="muted" style="margin:0">' + t('noExams') + '</p>';

    const avg = hist.length ? Math.round(hist.slice(0, 5).reduce((s, h) => s + h.score, 0) / Math.min(5, hist.length)) : null;

    render(
      '<section class="card">' +
        '<h1>' + t('reviewTitle') + '</h1>' +
        '<p class="muted">' + t('reviewIntro') + '</p>' +
        '<div class="stats">' +
          '<div class="stat"><b>' + store.mistakes.length + '</b><span>' + t('statMistakes') + '</span></div>' +
          '<div class="stat"><b>' + store.exams.length + '</b><span>' + t('statExams') + '</span></div>' +
          '<div class="stat"><b>' + (avg === null ? '—' : avg + '%') + '</b><span>' + t('statAvg') + '</span></div>' +
        '</div>' +
        '<div class="btn-row" style="margin-top:14px">' +
          '<a class="btn btn-primary" href="#/practica?d=mistakes">' + t('reviewAll') + '</a>' +
          (store.lastExam ? '<a class="btn" href="#/resultado">' + t('seeLastResult') + '</a>' : '') +
        '</div>' +
      '</section>' +
      '<div class="section-title"><h2>' + t('mistakesByDomain') + '</h2></div>' +
      '<section class="card">' + mistakesHTML + '</section>' +
      '<div class="section-title"><h2>' + t('history') + '</h2></div>' +
      '<section class="card">' + histHTML + '</section>' +
      '<div class="section-title"><h2>' + t('data') + '</h2></div>' +
      '<section class="card"><p class="muted small">' + t('resetInfo') + '</p>' +
        '<button class="btn btn-danger" id="resetBtn">' + t('reset') + '</button></section>',
      'review'
    );

    document.getElementById('resetBtn').onclick = () => {
      if (!confirm(t('confirmReset'))) return;
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
    const g = t('guide');
    const domainList = '<ul class="list" style="margin-top:8px">' + DOMAINS.map((d) => {
      const ld = LD(d);
      return '<li><a href="#/tema/' + d.id + '"><b>' + esc(ld.title) + '</b></a>' +
        (ld.subtitle ? ' <span class="muted small">— ' + esc(ld.subtitle) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';

    const table = (head, rows, format) =>
      '<section class="card table-wrap"><table class="cheat"><thead><tr><th>' + head[0] + '</th><th>' + head[1] + '</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td>' + format(r[0]) + '</td><td>' + format(r[1]) + '</td></tr>').join('') +
      '</tbody></table></section>';

    render(
      '<section class="card">' +
        '<h1>' + g.title + '</h1>' +
        '<p class="muted">' + g.intro + '</p>' +
      '</section>' +

      '<div class="section-title"><h2>' + g.aboutTitle + '</h2></div>' +
      '<section class="card"><ul class="list">' + g.about(DOMAINS.length, domainList).map((li) => '<li>' + li + '</li>').join('') + '</ul></section>' +

      '<div class="section-title"><h2>' + g.unity6Title + '</h2></div>' +
      '<p class="muted">' + g.unity6Intro + '</p>' +
      table(g.unity6Head, g.unity6, fmt) +

      '<div class="section-title"><h2>' + g.strategyTitle + '</h2></div>' +
      '<ul class="tips-list">' + g.strategy.map((li) => '<li>' + li + '</li>').join('') + '</ul>' +

      '<div class="section-title"><h2>' + g.planTitle + '</h2></div>' +
      '<section class="card"><ol class="list">' + g.plan.map((li) => '<li>' + li + '</li>').join('') + '</ol>' +
        '<p class="muted small" style="margin:0">' + g.planGoal + '</p></section>' +

      '<div class="section-title"><h2>' + g.lifecycleTitle + '</h2></div>' +
      '<section class="card">' +
        '<p class="small muted">' + g.lcInit + '</p>' +
        '<div class="flow"><code>Awake</code><span class="arrow">→</span><code>OnEnable</code><span class="arrow">→</span><code>Start</code></div>' +
        '<p class="small muted" style="margin-top:12px">' + g.lcFrame + '</p>' +
        '<div class="flow"><code>FixedUpdate</code><span class="arrow">→</span><code>OnTrigger/OnCollision</code><span class="arrow">→</span><code>Update</code><span class="arrow">→</span><code>yield null / WaitForSeconds</code><span class="arrow">→</span><code>LateUpdate</code><span class="arrow">→</span><code>Render</code></div>' +
        '<p class="small muted" style="margin-top:12px">' + g.lcEnd + '</p>' +
        '<div class="flow"><code>OnDisable</code><span class="arrow">→</span><code>OnDestroy</code></div>' +
        '<p class="small" style="margin:12px 0 0">' + g.lcNote + '</p>' +
      '</section>' +

      '<div class="section-title"><h2>' + g.cheatTitle + '</h2></div>' +
      table(g.cheatHead, g.cheat, fmt) +

      (g.glossaryTitle
        ? '<div class="section-title"><h2>' + g.glossaryTitle + '</h2></div>' + table(g.glossaryHead, g.glossary, esc)
        : '') +

      '<div class="section-title"><h2>' + g.resourcesTitle + '</h2></div>' +
      '<section class="card"><ul class="list">' +
        g.resources.map((r) => '<li><a href="' + r[0] + '" target="_blank" rel="noopener">' + r[1] + '</a>' + r[2] + '</li>').join('') +
      '</ul></section>',
      'tips'
    );
  }

  /* =========================================================
     Conceptos animados
     ========================================================= */

  function viewConcepts() {
    const groups = DOMAINS.map((d) => ({ d, list: CONCEPTS.filter((cc) => cc.domain === d.id) })).filter((g) => g.list.length);
    render(
      '<section class="card">' +
        '<h1>' + t('conceptsTitle') + '</h1>' +
        '<p class="muted" style="margin:0">' + t('conceptsIntro') + '</p>' +
      '</section>' +
      groups.map((g) =>
        '<div class="section-title"><h2>' + g.d.order + '. ' + esc(LD(g.d).title) + '</h2></div>' +
        '<div class="grid grid-2">' + g.list.map((cc) => {
          const lc = LC(cc);
          return '<a class="card concept-card" href="#/concepto/' + cc.id + '"><span class="concept-icon" aria-hidden="true">' + cc.icon + '</span>' +
            '<span><h3>' + esc(lc.title) + '</h3><span class="muted small">' + esc(plain(lc.summary).split('. ')[0]) + '.</span></span></a>';
        }).join('') + '</div>'
      ).join(''),
      'concepts'
    );
  }

  function viewConcept(id) {
    const idx = CONCEPTS.findIndex((cc) => cc.id === id);
    if (idx === -1) return viewNotFound();
    const cc = CONCEPTS[idx];
    const lc = LC(cc);
    const d = DOMAIN[cc.domain];
    const prev = CONCEPTS[(idx - 1 + CONCEPTS.length) % CONCEPTS.length];
    const next = CONCEPTS[(idx + 1) % CONCEPTS.length];
    const practiceHref = '#/practica?d=' + cc.practice.d + (cc.practice.t ? '&t=' + encodeURIComponent(cc.practice.t) : '');

    render(
      '<a class="back" href="#/conceptos">' + t('backConcepts') + '</a>' +
      '<section class="card">' +
        '<div class="qmeta"><span class="tag">' + d.order + '. ' + esc(LD(d).title) + '</span><span class="tag tag-soft">' + t('interactive') + '</span></div>' +
        '<h1>' + cc.icon + ' ' + esc(lc.title) + '</h1>' +
        '<p>' + fmt(lc.summary) + '</p>' +
        '<div class="demo" id="demo"></div>' +
      '</section>' +
      '<div class="section-title"><h2>' + t('keyPoints') + '</h2></div>' +
      '<ul class="tips-list">' + lc.points.map((pt) => '<li>' + fmt(pt) + '</li>').join('') + '</ul>' +
      '<div class="btn-row" style="margin-top:16px">' +
        '<a class="btn btn-primary" href="' + practiceHref + '">' + t('practiceThis') + '</a>' +
        '<a class="btn" href="#/concepto/' + prev.id + '">← ' + esc(LC(prev).title) + '</a>' +
        '<a class="btn" href="#/concepto/' + next.id + '">' + esc(LC(next).title) + ' →</a>' +
      '</div>',
      'concepts'
    );
    try {
      cleanupView = cc.mount(document.getElementById('demo'), lang);
    } catch (e) {
      document.getElementById('demo').innerHTML = '<p class="muted">' + esc(String(e)) + '</p>';
    }
  }

  function viewNotFound() {
    render('<section class="card empty"><div class="big">🧭</div><h2>' + t('notFound') + '</h2><p><a href="#/">' + t('backToHome') + '</a></p></section>', 'home');
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
      case 'conceptos': return viewConcepts();
      case 'concepto': return viewConcept(parts[1]);
      default: return viewNotFound();
    }
  }

  window.addEventListener('hashchange', route);

  /* =========================================================
     Tema claro / oscuro e idioma
     ========================================================= */

  document.getElementById('themeToggle').addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ucpp-theme', next); } catch (e) { /* noop */ }
  });

  document.getElementById('langToggle').addEventListener('click', () => {
    setLang(lang === 'es' ? 'en' : 'es');
  });

  applyStaticTexts();
  route();
})();
