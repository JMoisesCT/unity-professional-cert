/*
 * Registro global del banco de preguntas.
 * Cada archivo en js/data/ llama a UCP.addDomain({...}) con un dominio del temario.
 *
 * Formato de una pregunta:
 * {
 *   id: 'core-01',            // único en todo el banco
 *   topic: 'Física',          // subtema dentro del dominio
 *   q: 'Enunciado...',        // admite `código` y **negrita**
 *   code: 'void Update() {}', // opcional, bloque de código C#
 *   options: ['A', 'B', ...],
 *   answer: [1],              // índices correctos (más de uno = selección múltiple)
 *   explanation: '...'        // por qué la respuesta es correcta / las otras no
 * }
 */
window.UCP = {
  domains: [],
  addDomain(domain) {
    this.domains.push(domain);
  }
};
