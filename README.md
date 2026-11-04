# Unity Programmer Prep

Página web para practicar y preparar la certificación **Unity Certified Professional: Programmer**.

Funciona en laptop y en el celular (diseño responsive, tema claro/oscuro), está en **español e inglés** (botón **ES / EN** en la cabecera) y es 100 % estática: sin dependencias ni build, lista para **GitHub Pages**.

> Las preguntas son **originales**, escritas a partir de los objetivos públicos del examen. No son preguntas oficiales de Unity ni de su material de preparación.

## Qué incluye

- **122 preguntas** con explicación, repartidas en los 6 temas del examen:
  1. Interacciones principales (física, input, cámara)
  2. Pipeline de arte (materiales, iluminación, animación, partículas)
  3. Sistemas de aplicación (UI, menús, ajustes, progresión, persistencia)
  4. Escena y entorno (audio, instanciación y pooling, NavMesh)
  5. Rendimiento y plataformas (Profiler, batching, móviles, IL2CPP, XR)
  6. Desarrollo en equipo (Git, testing, depuración, arquitectura)
- **Modo práctica** por tema o por subtema, con feedback inmediato. Hay preguntas de una sola respuesta, de varias y con fragmentos de código C#.
- **Simulacro** con tiempo, preguntas equilibradas entre temas, marcado para revisar, mapa de preguntas y resultado por tema. Si recargas la página, puedes retomarlo.
- **Repaso de errores**: cada pregunta fallada se guarda hasta que la respondas bien.
- **Guía**: estrategia para el examen, plan de 6 semanas, chuleta de "si ves X, piensa en Y", ciclo de vida de MonoBehaviour y vocabulario en inglés.
- **Bilingüe:** toda la interfaz, las preguntas, las explicaciones y los tips están en español e inglés. Puedes cambiar de idioma en cualquier momento, incluso a mitad de una pregunta o de un simulacro, sin perder tu respuesta. El idioma elegido se recuerda.
- El progreso se guarda en el navegador (`localStorage`), así que cada dispositivo tiene el suyo. El progreso es el mismo en los dos idiomas.
- Atajos de teclado en laptop: `A`–`E` o `1`–`5` para elegir, `Enter` para comprobar o avanzar, `←`/`→` y `M` en el simulacro.

## Publicar en GitHub Pages

1. En GitHub, ve a **Settings → Pages**.
2. En **Build and deployment**, elige **Source: Deploy from a branch**.
3. Selecciona la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
4. En uno o dos minutos la web estará en `https://<tu-usuario>.github.io/unity-professional-cert/`.

## Probar en local

Abre `index.html` directamente en el navegador, o levanta un servidor estático:

```bash
python3 -m http.server 8000
```

Y entra en `http://localhost:8000`.

## Añadir más preguntas

Las preguntas en español están en `js/data/` (un archivo por tema) y sus traducciones al inglés en `js/data/en/`. Cada pregunta tiene este formato:

```js
{
  id: 'core-20',                 // único en todo el banco
  topic: 'Física',               // subtema (genera los filtros por subtema)
  q: 'Enunciado con `código` y **negrita**',
  code: 'void Update() { }',     // opcional: bloque de código C#
  options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
  answer: [1],                   // índices correctos; más de uno = selección múltiple
  explanation: 'Por qué es la correcta y por qué las demás no.'
}
```

El orden de las opciones se mezcla al mostrarlas, así que la posición de la respuesta correcta en el archivo no importa.

Para la versión en inglés, añade la misma pregunta (con el mismo `id`) en el archivo correspondiente de `js/data/en/`. El `code` y el `answer` se toman del archivo en español, y las opciones deben estar **en el mismo orden**:

```js
'core-20': {
  topic: 'Physics',
  q: 'Question text with `code`',
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  explanation: 'Why it is correct.'
}
```

Si una pregunta no tiene traducción, se muestra en español.

## Estructura

```
index.html          Página única (navegación por hash)
css/styles.css      Estilos responsive y temas claro/oscuro
js/core.js          Registro del banco de preguntas y traducciones
js/data/*.js        Preguntas, objetivos y tips de cada tema (español)
js/data/en/*.js     Traducción al inglés de cada tema
js/i18n.js          Textos de la interfaz y de la guía (es / en)
js/app.js           Lógica: práctica, simulacro, repaso, guía e idioma
```
