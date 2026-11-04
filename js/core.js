/*
 * Registro global del banco de preguntas.
 *
 * - Cada archivo en js/data/ llama a UCP.addDomain({...}) con un dominio del temario (en español).
 * - Cada archivo en js/data/en/ llama a UCP.addTranslation('en', {...}) con la traducción de un dominio.
 *
 * Formato de una pregunta:
 * {
 *   id: 'core-01',            // único en todo el banco
 *   topic: 'Física',          // subtema dentro del dominio
 *   q: 'Enunciado...',        // admite `código` y **negrita**
 *   code: 'void Update() {}', // opcional, bloque de código C# (no se traduce)
 *   options: ['A', 'B', ...],
 *   answer: [1],              // índices correctos (más de uno = selección múltiple)
 *   explanation: '...'        // por qué la respuesta es correcta / las otras no
 * }
 *
 * Formato de una traducción:
 * UCP.addTranslation('en', {
 *   domain: { id: 'core', title, description, objectives: [...], tips: [...] },
 *   questions: {
 *     'core-01': { topic, q, options: [...mismo orden...], explanation }
 *   }
 * });
 */
window.UCP = {
  domains: [],
  translations: {},
  addDomain(domain) {
    this.domains.push(domain);
  },
  addTranslation(lang, data) {
    const t = this.translations[lang] || (this.translations[lang] = { domains: {}, questions: {} });
    if (data.domain) t.domains[data.domain.id] = data.domain;
    Object.assign(t.questions, data.questions || {});
  }
};
