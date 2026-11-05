// Uso: node tools/validate.js [domainId] [--list]
// Valida el banco de preguntas (ids, respuestas, traducciones) y mide el sesgo de longitud
// de las opciones en ES y EN. Con 4 opciones, lo esperable por azar es ~25 % en cada columna.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const only = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const list = process.argv.includes('--list');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + '/js/core.js', 'utf8'), ctx);
for (const d of ['js/data', 'js/data/en'])
  for (const f of fs.readdirSync(root + '/' + d).filter((f) => f.endsWith('.js')).sort())
    try { vm.runInContext(fs.readFileSync(root + '/' + d + '/' + f, 'utf8'), ctx, { filename: d + '/' + f }); }
    catch (e) { console.log('ERROR DE SINTAXIS en ' + d + '/' + f + ': ' + e.message); process.exitCode = 1; }

const U = ctx.UCP, en = (U.translations.en || { questions: {} }).questions;
const problems = [], ids = new Set();
const len = (s) => String(s).replace(/[`*]/g, '').length;

// "longest": las correctas son todas más largas que la distractora más larga (o empatan con ella).
// "shortest": las correctas son todas más cortas que la distractora más corta (o empatan).
function bias(q, options) {
  const L = options.map(len);
  const right = q.answer.map((i) => L[i]);
  const wrong = L.filter((_, i) => !q.answer.includes(i));
  return { longest: Math.min(...right) >= Math.max(...wrong), shortest: Math.max(...right) <= Math.min(...wrong) };
}

const rows = {};
let total = 0;
for (const d of U.domains) {
  const r = rows[d.id] = { n: 0, multi: 0, code: 0, esLong: 0, enLong: 0, esShort: 0, enShort: 0, flagged: [] };
  for (const q of d.questions) {
    total++;
    if (ids.has(q.id)) problems.push('id duplicado ' + q.id); ids.add(q.id);
    if (!Array.isArray(q.answer) || !q.answer.length || q.answer.some((a) => a < 0 || a >= q.options.length || !Number.isInteger(a)))
      problems.push('answer inválido ' + q.id);
    if (new Set(q.answer).size !== q.answer.length) problems.push('answer repetido ' + q.id);
    if (q.answer.length === q.options.length) problems.push('todas las opciones son correctas ' + q.id);
    for (const k of ['topic', 'q', 'explanation']) if (!q[k]) problems.push('falta ' + k + ' en ' + q.id);
    if (q.answer.length > 1 && !/Elige \d/.test(q.q)) problems.push('multi sin "(Elige N)" ' + q.id);
    const t = en[q.id];
    if (!t) problems.push('sin traducción EN ' + q.id);
    else {
      if (!t.options || t.options.length !== q.options.length) problems.push('nº de opciones EN distinto ' + q.id);
      for (const k of ['topic', 'q', 'explanation']) if (!t[k]) problems.push('falta ' + k + ' EN en ' + q.id);
      if (q.answer.length > 1 && !/Choose \d/.test(t.q)) problems.push('multi sin "(Choose N)" EN ' + q.id);
    }
    if (only && d.id !== only) continue;
    r.n++; if (q.answer.length > 1) r.multi++; if (q.code) r.code++;
    const be = bias(q, q.options), bn = t && t.options ? bias(q, t.options) : { longest: false, shortest: false };
    if (be.longest) r.esLong++; if (bn.longest) r.enLong++;
    if (be.shortest) r.esShort++; if (bn.shortest) r.enShort++;
    if (be.longest || bn.longest) r.flagged.push(q.id + (be.longest ? ' ES' : '') + (bn.longest ? ' EN' : ''));
  }
}
for (const id of Object.keys(en)) if (!ids.has(id)) problems.push('traducción EN sin pregunta ES ' + id);

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0) + '%';
console.log('Total preguntas:', total);
for (const [id, r] of Object.entries(rows)) {
  if (only && id !== only) continue;
  console.log(id.padEnd(5), 'n=' + r.n, 'multi=' + r.multi, 'code=' + r.code,
    '| correcta más larga ES ' + pct(r.esLong, r.n) + ' EN ' + pct(r.enLong, r.n),
    '| correcta más corta ES ' + pct(r.esShort, r.n) + ' EN ' + pct(r.enShort, r.n));
  if (list && r.flagged.length) console.log('   marcadas (más larga):', r.flagged.join(', '));
}
if (problems.length) { console.log('PROBLEMAS:\n - ' + problems.join('\n - ')); process.exitCode = 1; }
else console.log('Integridad OK');
