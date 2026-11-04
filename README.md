# Unity Programmer Prep

Página web para practicar y preparar la certificación **Unity Certified Professional: Programmer**.

Funciona en laptop y en el celular (diseño responsive, tema claro/oscuro) y es 100 % estática: sin dependencias ni build, lista para **GitHub Pages**.

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
- El progreso se guarda en el navegador (`localStorage`), así que cada dispositivo tiene el suyo.
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

Las preguntas están en `js/data/`, un archivo por tema. Cada pregunta tiene este formato:

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

## Estructura

```
index.html          Página única (navegación por hash)
css/styles.css      Estilos responsive y temas claro/oscuro
js/core.js          Registro del banco de preguntas
js/data/*.js        Preguntas, objetivos y tips de cada tema
js/app.js           Lógica: práctica, simulacro, repaso y guía
```
