UCP.addDomain({
  id: 'perf',
  order: 5,
  title: 'Rendimiento y plataformas',
  titleEn: 'Optimizing for performance and platforms',
  description: 'Diagnóstico con el Profiler y otras herramientas, optimizaciones por plataforma o hardware, y buenas prácticas para XR.',
  objectives: [
    'Evaluar errores y problemas de rendimiento con herramientas como el Unity Profiler, el Frame Debugger y el Memory Profiler.',
    'Identificar optimizaciones según los requisitos de cada plataforma de build o configuración de hardware.',
    'Conocer las convenciones de UI y las optimizaciones habituales en plataformas XR.'
  ],
  tips: [
    'Primero **mide**, después optimiza: Profiler (CPU, GPU, Memory, Rendering), Frame Debugger (draw calls) y Memory Profiler (snapshots).',
    'Para profilear en un dispositivo real: **Development Build** + **Autoconnect Profiler**. Deep Profile añade mucho overhead; usa `ProfilerMarker` para medir secciones concretas.',
    'En `Update`, evita `GetComponent`, `Find`, concatenar strings, LINQ y crear arrays: guarda en caché y reutiliza. La columna **GC Alloc** del Profiler te dice quién genera basura.',
    'Usa las versiones `NonAlloc` de la física, `CompareTag` en lugar de `tag ==`, y separa la UI dinámica de la estática en distintos Canvas.',
    'Draw calls: Static Batching (objetos que no se mueven), GPU Instancing (muchas copias de la misma malla y material), SRP Batcher (URP/HDRP) y Sprite Atlas (2D).',
    'GPU y escena: Occlusion Culling, LOD Group y compresión de texturas (ASTC en móviles modernos).',
    'IL2CPP es obligatorio en iOS. Si algo solo se usa por reflexión, el *code stripping* puede eliminarlo: protégelo con `link.xml` o `[Preserve]`.',
    'XR: mantén los FPS estables a la frecuencia del visor, usa UI en **World Space**, teletransporte y snap turn para evitar mareos, y **Single Pass Instanced** para el renderizado estéreo.'
  ],
  questions: [
    {
      id: 'prf-01',
      topic: 'Scripts eficientes',
      q: 'El Profiler muestra que `GetComponent` aparece en cada frame en cientos de enemigos. ¿Cuál es la mejora correcta?',
      code: 'void Update()\n{\n    GetComponent<Animator>().SetFloat("Speed", speed);\n}',
      options: [
        'Guardar el `Animator` en un campo en `Awake` y usarlo en `Update`.',
        'Cambiar `GetComponent<Animator>()` por `FindFirstObjectByType<Animator>()`.',
        'Mover el código a `FixedUpdate` para que se ejecute a ritmo fijo.',
        'Usar `GetComponentInChildren<Animator>()`.'
      ],
      answer: [0],
      explanation: 'Buscar componentes tiene un coste. Guardar la referencia una vez (en `Awake` o asignándola por `[SerializeField]`) lo elimina del bucle. `FindFirstObjectByType` (el reemplazo de `FindObjectOfType` en Unity 6) es mucho más lento y además podría devolver otro objeto. Bonus: usa `Animator.StringToHash` para el parámetro.'
    },
    {
      id: 'prf-02',
      topic: 'Scripts eficientes',
      q: 'El Profiler muestra **GC Alloc** en cada frame por este código. ¿Cuál es la mejor solución?',
      code: 'void Update()\n{\n    scoreText.text = "Score: " + score;\n}',
      options: [
        'Actualizar el texto solo en el frame en que cambia la puntuación.',
        'Usar `"Score: " + score.ToString()` para evitar el boxing del entero.',
        'Llamar a `System.GC.Collect()` cada pocos frames para liberar la basura.',
        'Mover la línea a `LateUpdate`, que no genera asignaciones de memoria.'
      ],
      answer: [0],
      explanation: 'Concatenar strings crea un string nuevo (basura) cada vez. Hacerlo solo cuando el valor cambia reduce las asignaciones prácticamente a cero. Con TextMeshPro también existe `SetText("Score: {0}", score)`, que evita la asignación. Forzar el GC en cada frame es mucho peor.'
    },
    {
      id: 'prf-03',
      topic: 'Profiler',
      q: 'Quieres ver en el Profiler cuánto tarda tu función de generación de nivel, **sin** activar Deep Profile. ¿Qué haces?',
      options: [
        'Usar un `ProfilerMarker` (o `Profiler.BeginSample` / `EndSample`).',
        'Llamar a `Debug.Log(Time.time)` al principio y al final de la función.',
        'Abrir el Frame Debugger y buscar la función en la lista de eventos.',
        'Activar Development Build para ver todas las funciones.'
      ],
      answer: [0],
      explanation: '`ProfilerMarker` (Unity.Profiling) añade una muestra con nombre propio a la jerarquía del Profiler, con muy poco overhead (y se elimina en builds de release). `Time.time` no cambia dentro de un frame, así que no sirve para medir.'
    },
    {
      id: 'prf-04',
      topic: 'Profiler',
      q: '¿Cuál es la principal desventaja de **Deep Profile**?',
      options: [
        'Añade un overhead enorme que distorsiona los tiempos, sobre todo en funciones pequeñas.',
        'No muestra las llamadas a métodos de tus propios scripts.',
        'Solo funciona en builds de release, no en el Editor.',
        'Desactiva el módulo de memoria del Profiler mientras está activo.'
      ],
      answer: [0],
      explanation: 'Deep Profile registra cada llamada a métodos de C#, lo que da mucho detalle pero ralentiza el juego y exagera el coste de las funciones pequeñas que se llaman mucho. Úsalo con criterio, y prefiere marcadores propios.'
    },
    {
      id: 'prf-05',
      topic: 'Profiler',
      q: 'El juego va lento solo en un móvil Android concreto. ¿Cómo lo perfilas en ese dispositivo?',
      options: [
        'Con una **Development Build** y **Autoconnect Profiler**, conectada al Profiler por USB o red.',
        'Perfilando en el Editor con la plataforma cambiada a Android: el resultado es el mismo.',
        'Instalando la app Unity Profiler desde la Play Store y abriéndola junto al juego.',
        'Activando Deep Profile en una build de release para ver todas las llamadas.'
      ],
      answer: [0],
      explanation: 'El Editor tiene un rendimiento muy distinto al de un dispositivo real (CPU, GPU, memoria, térmica). Una Development Build puede enviar datos al Profiler del Editor. Profilear siempre en el hardware de destino es una práctica clave del examen.'
    },
    {
      id: 'prf-06',
      topic: 'Renderizado',
      q: 'Quieres ver uno a uno los draw calls de un frame y averiguar por qué dos objetos no se están agrupando en un batch. ¿Qué herramienta usas?',
      options: ['Frame Debugger', 'Memory Profiler', 'Console', 'Physics Debugger'],
      answer: [0],
      explanation: 'El Frame Debugger (Window > Analysis) detiene un frame y muestra cada evento de renderizado, con el motivo por el que un draw call no se agrupó con el anterior (otro material, otras keywords, etc.).'
    },
    {
      id: 'prf-07',
      topic: 'Renderizado',
      q: 'En el Built-in Render Pipeline tienes miles de rocas idénticas (misma malla y material) que se generan en runtime en posiciones distintas. ¿Qué reduce más los draw calls?',
      options: [
        'Activar **Enable GPU Instancing** en el material.',
        'Marcar las rocas como Batching Static después de generarlas.',
        'Darle a cada roca su propia instancia de material.',
        'Desactivar las sombras.'
      ],
      answer: [0],
      explanation: 'GPU Instancing dibuja muchas copias de la misma malla y material en un solo draw call, con distintas transformaciones. El static batching se configura antes de la build, para objetos que no se mueven. Darle a cada roca un material distinto rompería cualquier batching. En URP/HDRP, el SRP Batcher tiene prioridad sobre el instancing para los shaders compatibles.'
    },
    {
      id: 'prf-08',
      topic: 'Renderizado',
      q: 'Una ciudad tiene muchos edificios ocultos detrás de otros, y aun así la GPU los procesa. Ya tienes frustum culling. ¿Qué técnica añades?',
      options: [
        '**Occlusion Culling**, con los datos de oclusión precalculados (bake) en el Editor.',
        'Static Batching de todos los edificios para reducir los draw calls.',
        'Reducir el Far Clip Plane de la cámara hasta que dejen de dibujarse.',
        'Un LOD Group en cada edificio, con un nivel Culled al final.'
      ],
      answer: [0],
      explanation: 'El frustum culling (automático) descarta lo que queda fuera del campo de visión, pero no lo que está tapado por otros objetos. El Occlusion Culling usa datos precalculados para no renderizar lo que no se ve detrás de los occluders.'
    },
    {
      id: 'prf-09',
      topic: 'Renderizado',
      q: 'Los árboles con muchos polígonos se siguen dibujando con todo detalle aunque estén muy lejos. ¿Qué componente usarías?',
      options: ['`LODGroup`', '`OcclusionArea`', '`ReflectionProbe`', '`SortingGroup`'],
      answer: [0],
      explanation: 'Un `LODGroup` cambia entre versiones de la malla con menos detalle según el tamaño que ocupa el objeto en pantalla, e incluso puede ocultarlo (culled) a gran distancia.'
    },
    {
      id: 'prf-10',
      topic: 'Renderizado',
      q: 'En un juego 2D con muchos sprites distintos, el número de draw calls es muy alto. ¿Qué es lo primero que deberías probar?',
      options: [
        'Agrupar los sprites en un **Sprite Atlas**.',
        'Convertir los sprites en Quads 3D para usar GPU Instancing.',
        'Desactivar los mipmaps.',
        'Usar un Canvas distinto para cada sprite.'
      ],
      answer: [0],
      explanation: 'Los sprites con texturas distintas no se pueden agrupar en un mismo batch. Un Sprite Atlas los empaqueta en una sola textura, así que los que comparten material y atlas pueden dibujarse juntos.'
    },
    {
      id: 'prf-11',
      topic: 'UI',
      q: 'Un temporizador que cambia en cada frame está en el mismo Canvas que cientos de elementos estáticos del HUD, y el Profiler muestra `Canvas.BuildBatch` alto. ¿Qué haces?',
      options: [
        'Mover los elementos que cambian a menudo a un **Canvas propio**.',
        'Juntar todos los Canvas del juego en uno solo.',
        'Actualizar el temporizador en `FixedUpdate` para reconstruir menos el Canvas.',
        'Cambiar el Canvas a World Space para no depender de la resolución.'
      ],
      answer: [0],
      explanation: 'Cuando un elemento cambia, Unity reconstruye la geometría de todo su Canvas. Separar lo dinámico de lo estático limita esa reconstrucción. También ayuda desactivar **Raycast Target** en los elementos que no son interactivos.'
    },
    {
      id: 'prf-12',
      topic: 'Scripts eficientes',
      q: 'Llamas a `Physics.OverlapSphere` en cada frame para detectar enemigos cercanos y genera basura. ¿Qué alternativa usas?',
      options: [
        '`Physics.OverlapSphereNonAlloc` con un `Collider[]` reutilizado.',
        '`Physics.SphereCastAll`',
        '`GameObject.FindGameObjectsWithTag("Enemy")` y comparar distancias.',
        'Crear un nuevo array en cada frame y vaciarlo después.'
      ],
      answer: [0],
      explanation: 'Las versiones `NonAlloc` escriben los resultados en un buffer que tú creas una vez y devuelven cuántos hay, sin generar basura. `SphereCastAll` y `FindGameObjectsWithTag` crean arrays nuevos en cada llamada.'
    },
    {
      id: 'prf-13',
      topic: 'Scripts eficientes',
      q: '¿Por qué se recomienda `other.CompareTag("Enemy")` en lugar de `other.tag == "Enemy"`?',
      options: [
        'Porque leer `.tag` crea un string nuevo y genera basura.',
        'Porque `.tag` está obsoleto desde Unity 2020.',
        'Porque `CompareTag` también tiene en cuenta los tags de los objetos hijos.',
        'Porque `==` compara las referencias de los strings, no su contenido.'
      ],
      answer: [0],
      explanation: 'Leer `gameObject.tag` copia el string desde el motor nativo y genera basura. `CompareTag` hace la comparación sin asignaciones y, además, avisa si el tag no existe.'
    },
    {
      id: 'prf-14',
      topic: 'Plataformas',
      q: '¿Cuándo se ejecuta el código dentro de este bloque?',
      code: '#if UNITY_ANDROID && !UNITY_EDITOR\n    Handheld.Vibrate();\n#endif',
      options: [
        'Solo en builds de Android, nunca en el Editor.',
        'En el Editor (con Android activo) y en builds de Android.',
        'En todas las plataformas móviles, Android e iOS incluidos.',
        'Solo si el dispositivo Android tiene motor de vibración.'
      ],
      answer: [0],
      explanation: 'Los símbolos de compilación por plataforma (`UNITY_ANDROID`, `UNITY_IOS`, `UNITY_STANDALONE`, `UNITY_EDITOR`...) eliminan el código en tiempo de compilación. En el Editor con Android activo, `UNITY_ANDROID` y `UNITY_EDITOR` son ambos verdaderos, así que la condición es falsa.'
    },
    {
      id: 'prf-15',
      topic: 'Plataformas',
      q: 'En una build IL2CPP, una clase que solo se crea por **reflexión** falla porque "no existe". En el Editor funciona bien. ¿Cuál es la causa y la solución?',
      options: [
        'El **managed code stripping** eliminó la clase; protégela con `link.xml` o `[Preserve]`.',
        'IL2CPP no admite reflexión, así que hay que reescribir el código sin ella.',
        'Hay que cambiar el scripting backend a Mono solo para el ensamblado de esa clase.',
        'Falta marcar la clase con `[Serializable]` para que IL2CPP la incluya en la build.'
      ],
      answer: [0],
      explanation: 'El linker de Unity hace un análisis estático y elimina el código que no parece usarse para reducir el tamaño de la build. No puede ver las referencias por reflexión. `link.xml`, `[Preserve]` o bajar el nivel de Managed Stripping lo evitan.'
    },
    {
      id: 'prf-16',
      topic: 'Plataformas',
      q: '¿Qué scripting backend es **obligatorio** para publicar en iOS?',
      options: ['Mono', 'IL2CPP', '.NET Native', 'Burst'],
      answer: [1],
      explanation: 'iOS no permite compilar código en tiempo de ejecución (JIT), así que Unity convierte el IL a C++ con IL2CPP (compilación AOT). En Android, IL2CPP es necesario para ARM64, que es un requisito de Google Play. Burst es un compilador para jobs, no un scripting backend.'
    },
    {
      id: 'prf-17',
      topic: 'Plataformas',
      q: '¿Qué formato de compresión de texturas se recomienda para la mayoría de dispositivos Android e iOS modernos?',
      options: ['DXT / BCn', 'ASTC', 'RGBA32 sin compresión', 'PVRTC'],
      answer: [1],
      explanation: 'ASTC es compatible con las GPU móviles modernas y permite elegir el tamaño de bloque para equilibrar calidad y tamaño. DXT/BC es para escritorio y consolas, PVRTC es para iPhones antiguos, y RGBA32 sin comprimir ocupa muchísima memoria.'
    },
    {
      id: 'prf-18',
      topic: 'Plataformas',
      q: 'En móviles el juego siempre va a 30 FPS, aunque el dispositivo puede dar más. ¿Qué cambias?',
      options: [
        '`Application.targetFrameRate = 60;`',
        '`Time.fixedDeltaTime = 1f / 60f;`',
        '`QualitySettings.vSyncCount = 0;` y nada más.',
        '`Time.timeScale = 2f;`'
      ],
      answer: [0],
      explanation: 'En móviles, la tasa por defecto (con `targetFrameRate = -1`) suele limitarse a 30 FPS para ahorrar batería. Hay que pedir 60 explícitamente (y valorar su impacto en batería y temperatura). En móviles, `vSyncCount` se ignora y `fixedDeltaTime` solo afecta a la física.'
    },
    {
      id: 'prf-19',
      topic: 'XR',
      q: '¿Qué **dos** medidas reducen el mareo (*motion sickness*) en una aplicación de VR? (Elige 2)',
      options: [
        'Ofrecer locomoción por **teletransporte** y giro por pasos (*snap turn*).',
        'Mantener los FPS estables a la frecuencia del visor (72/90/120 Hz).',
        'Añadir sacudidas de cámara y *head bob* al caminar para dar más realismo.',
        'Usar UI en Screen Space - Overlay para que siempre esté visible.'
      ],
      answer: [0, 1],
      explanation: 'El mareo aparece cuando el movimiento que se ve no coincide con el que siente el cuerpo, o cuando hay caídas de FPS. Teletransporte, snap turn, viñetas al moverse y FPS estables lo reducen. Las sacudidas de cámara lo empeoran, y la UI en Overlay ni siquiera se ve correctamente en VR.'
    },
    {
      id: 'prf-20',
      topic: 'XR',
      q: '¿Cuál es la forma recomendada de mostrar un menú en una aplicación VR?',
      options: [
        'Un Canvas en **World Space**, a una distancia y con un tamaño cómodos para leer.',
        'Un Canvas en Screen Space - Overlay, encima de todo en ambos ojos.',
        'Un Canvas en Screen Space - Camera, a pocos centímetros de los ojos.',
        'Mostrar el menú solo en el monitor del PC (mirror).'
      ],
      answer: [0],
      explanation: 'En XR no hay "pantalla" plana: la UI debe existir en el mundo, a una distancia y tamaño legibles, sin seguir la cabeza de forma rígida. El XR Interaction Toolkit usa un `TrackedDeviceGraphicRaycaster` para interactuar con un Canvas en World Space.'
    },
    {
      id: 'prf-21',
      topic: 'XR',
      q: '¿Qué modo de renderizado estéreo reduce el coste de CPU dibujando ambos ojos en una sola pasada con instancing?',
      options: ['Multi Pass', 'Single Pass Instanced', 'Deferred Shading', 'Forward+ Rendering Path'],
      answer: [1],
      explanation: 'Con Single Pass Instanced cada draw call dibuja los dos ojos a la vez (sobre un texture array), lo que reduce aproximadamente a la mitad el trabajo de la CPU respecto a Multi Pass. Los shaders personalizados tienen que soportarlo con las macros de estéreo.'
    },
    {
      id: 'prf-22',
      topic: 'Profiler',
      q: 'Sospechas que hay texturas que no se liberan al cambiar de escena. ¿Qué herramienta te permite comparar el estado de la memoria antes y después?',
      options: [
        'El paquete **Memory Profiler**, comparando snapshots.',
        'El Frame Debugger, revisando las texturas de cada draw call.',
        'El módulo CPU del Profiler en modo Deep Profile.',
        'La ventana Console con un `Debug.Log` en `OnDestroy`.'
      ],
      answer: [0],
      explanation: 'El Memory Profiler captura snapshots con todos los objetos en memoria (managed y nativos), quién los referencia y cuánto ocupan. Comparando dos snapshots ves qué assets siguen vivos después de cambiar de escena.'
    },
    {
      id: 'prf-23',
      topic: 'Renderizado',
      q: 'En un proyecto URP de Unity 6 con miles de objetos estáticos y dinámicos, ¿qué función nueva reduce automáticamente el coste de CPU de dibujarlos usando la API `BatchRendererGroup`?',
      options: [
        '**GPU Resident Drawer**',
        '**Occlusion Culling** clásico',
        '**Static Batching** en runtime',
        '**Dynamic Batching**'
      ],
      answer: [0],
      explanation: 'El GPU Resident Drawer (Unity 6) mantiene los datos de los objetos en la GPU y los dibuja con `BatchRendererGroup` e instancing, sin cambiar los GameObjects. Se activa en el URP Asset y requiere, entre otras cosas, el rendering path **Forward+**. Se complementa con **GPU Occlusion Culling**, también nuevo en Unity 6.'
    },
    {
      id: 'prf-24',
      topic: 'Plataformas',
      q: 'En Unity 6 quieres tener una build "Demo" y otra "Completa" para Android, con distintas escenas y distintos scripting defines, y cambiar entre ellas fácilmente. ¿Qué usas?',
      options: [
        'Dos **Build Profiles** (File > Build Profiles)',
        'Dos copias del proyecto',
        'Un `#if DEMO` y editar Player Settings a mano antes de cada build',
        'Dos Quality Levels distintos'
      ],
      answer: [0],
      explanation: 'Unity 6 sustituye la ventana Build Settings por **Build Profiles**: cada perfil guarda la plataforma, la lista de escenas, los scripting defines y overrides de Player Settings, y se puede versionar como un asset. Así cambias de configuración sin tocar ajustes a mano.'
    },
    {
      id: 'prf-25',
      topic: 'UI',
      q: 'En un HUD de móvil, los contadores y las barras de vida están dentro de varios Horizontal/Vertical Layout Group anidados, en el mismo Canvas que el resto del HUD. El Profiler muestra picos en `Canvas.SendWillRenderCanvases` y `Canvas.BuildBatch` cada vez que se actualizan. ¿Qué **dos** cambios reducen ese coste? (Elige 2)',
      options: [
        'Mover los elementos que cambian a un **Canvas anidado** propio.',
        'Quitar los Layout Groups anidados de los elementos que se actualizan.',
        'Desactivar **Raycast Target** en todas las imágenes del HUD, incluidas las decorativas.',
        'Juntar todo el HUD en un único Canvas.',
        'Cambiar el Canvas a Screen Space - Camera para que lo dibuje la cámara principal.'
      ],
      answer: [0, 1],
      explanation: 'Cuando un elemento de UI cambia, Unity reconstruye la geometría (batch) de todo su Canvas; un **Canvas anidado** limita esa reconstrucción a los elementos que contiene. Además, cuando cambia el tamaño de un hijo de un Layout Group (por ejemplo, un texto más largo), hay que recalcular el layout en `SendWillRenderCanvases`, y los Layout Groups anidados multiplican ese trabajo; en elementos dinámicos es mejor fijar las posiciones o calcularlas por código. Desactivar **Raycast Target** es buena práctica, pero reduce el coste de los raycasts de input, no el de las reconstrucciones. Juntarlo todo en un Canvas empeora el problema, y cambiar el render mode no evita los rebuilds.'
    },
    {
      id: 'prf-26',
      topic: 'UI',
      q: 'Tu menú de pausa tiene cientos de elementos y se abre y se cierra a menudo. Cada vez que aparece, el Profiler muestra un pico de reconstrucción del Canvas y de llamadas a `OnEnable` en toda la jerarquía. ¿Cuál es la mejor alternativa a este código?',
      code: 'public void ShowPause(bool show)\n{\n    pauseMenuRoot.SetActive(show);\n}',
      options: [
        'Desactivar solo el componente `Canvas` del menú, no su GameObject.',
        'Destruir el menú al cerrarlo y volver a instanciar el prefab al abrirlo.',
        'Llamar a `Canvas.ForceUpdateCanvases()` justo después del `SetActive`.',
        'Poner el `alpha` de su `CanvasGroup` a 0, que además hace que el menú deje de bloquear los clics.'
      ],
      answer: [0],
      explanation: 'Al desactivar el componente (`canvas.enabled = false`), el menú deja de dibujarse pero conserva su geometría, y sus hijos no reciben `OnDisable`/`OnEnable`, así que al volver a mostrarlo no hay una reconstrucción completa. Desactivar el GameObject descarta esa geometría y dispara los callbacks de toda la jerarquía. Instanciar y destruir es todavía más caro (y genera basura), `ForceUpdateCanvases` fuerza justo la reconstrucción que quieres evitar, y el `alpha` de un `CanvasGroup` no cambia los clics: el menú sigue activo en la jerarquía y bloquea los clics mientras `blocksRaycasts` siga activado.'
    },
    {
      id: 'prf-27',
      topic: 'Scripts eficientes',
      q: 'Este `Update` se ejecuta en cada frame. ¿Qué **dos** líneas generan asignaciones de memoria (GC Alloc) cada vez que se ejecutan? (Elige 2)',
      code: 'void Update()\n{\n    Vector3 offset = new Vector3(0f, 1f, 0f);\n    transform.position += velocity * Time.deltaTime;\n\n    int total = 0;\n    foreach (Enemy e in enemies) total += e.Hp;   // enemies is a List<Enemy>\n\n    var alive = enemies.Where(e => e.Hp > 0).ToList();\n    hpLabel.text = "HP: " + total;\n}',
      options: [
        '`Vector3 offset = new Vector3(0f, 1f, 0f);`',
        '`transform.position += velocity * Time.deltaTime;`',
        '`foreach (Enemy e in enemies) total += e.Hp;`',
        '`var alive = enemies.Where(e => e.Hp > 0).ToList();`',
        '`hpLabel.text = "HP: " + total;`'
      ],
      answer: [3, 4],
      explanation: '`Where(...).ToList()` crea un iterador y una lista nueva en cada llamada (LINQ casi siempre asigna memoria), y la concatenación `"HP: " + total` crea un string nuevo en cada frame. En cambio, `new Vector3(...)` no asigna en el heap porque `Vector3` es un `struct`, las operaciones con vectores tampoco, y `foreach` sobre un `List<T>` usa un enumerador de tipo `struct`, así que no genera basura. La solución es reutilizar una lista rellenándola con un bucle y actualizar el texto solo cuando cambie (o usar `SetText` de TextMeshPro).'
    },
    {
      id: 'prf-28',
      topic: 'Scripts eficientes',
      q: 'Doscientos spawners ejecutan esta corrutina, y el Profiler muestra pequeñas asignaciones de **GC Alloc** constantes que acaban provocando tirones por el recolector de basura. ¿Cuál es la mejor solución?',
      code: 'IEnumerator SpawnLoop()\n{\n    while (true)\n    {\n        SpawnEnemy();\n        yield return new WaitForSeconds(0.5f);\n    }\n}',
      options: [
        'Crear el `WaitForSeconds` una vez en un campo y devolver siempre esa misma instancia.',
        'Usar `new WaitForSecondsRealtime(0.5f)`, que no depende de `Time.timeScale`.',
        'Usar `yield return 0.5f;`, que Unity interpreta como una espera en segundos.',
        'Llamar a `System.GC.Collect()` en cada vuelta del bucle.'
      ],
      answer: [0],
      explanation: '`WaitForSeconds` es una clase, así que cada `new` crea un objeto en el heap. Como solo guarda la duración, puedes crearlo una vez (por ejemplo, en un campo `readonly`) y devolver la misma instancia en cada `yield`. `WaitForSecondsRealtime` también es una clase y asigna igual. `yield return 0.5f` no espera medio segundo: hace *boxing* del float (asigna memoria) y solo espera un frame. Forzar el GC en cada vuelta es mucho más caro que la basura que intenta limpiar.'
    },
    {
      id: 'prf-29',
      topic: 'Scripts eficientes',
      q: 'Este script está en 500 enemigos, y el Profiler marca su `Update` como lo más caro del frame. ¿Cuál es el problema principal?',
      code: 'void Update()\n{\n    GameObject player = GameObject.Find("Player");\n    float dist = Vector3.Distance(transform.position, player.transform.position);\n    if (dist < 10f)\n        GetComponent<Renderer>().material.color = Color.red;\n}',
      options: [
        '`GameObject.Find` recorre la escena en cada frame; guarda el jugador en `Start`.',
        '`Vector3.Distance` usa una raíz cuadrada; cambiarlo por `sqrMagnitude` lo resuelve.',
        '`.material` crea un material nuevo en cada frame; hay que usar `sharedMaterial`.',
        'Leer la posición de otro objeto en `Update` es lento; debe hacerse en `LateUpdate`.'
      ],
      answer: [0],
      explanation: '`GameObject.Find` busca por nombre entre todos los objetos activos, y hacerlo 500 veces por frame es lo que domina el coste. Guarda la referencia una vez (en `Start`, con `[SerializeField]` o mediante un manager) y cachea también el `Renderer`. `sqrMagnitude` es una micro-optimización válida, pero no resuelve el problema principal. `.material` no crea un material en cada frame: lo instancia la primera vez y después devuelve esa copia. `LateUpdate` cuesta lo mismo que `Update`.'
    },
    {
      id: 'prf-30',
      topic: 'Scripts eficientes',
      q: 'Al final de cada combate generas un informe con cientos de golpes, y el Profiler muestra un pico de varios MB de **GC Alloc** en esta función. ¿Qué cambio lo reduce más?',
      code: 'string BuildReport(List<Hit> hits)\n{\n    string report = "";\n    foreach (Hit h in hits)\n        report += h.attacker + " -> " + h.damage + "\\n";\n    return report;\n}',
      options: [
        'Usar un `StringBuilder` reutilizado (con `Clear()`) y `ToString()` al final.',
        'Usar `string.Format` en el bucle, que escribe sobre el mismo string sin copiarlo.',
        'Cambiar el `foreach` por un `for`, porque `foreach` asigna un enumerador por vuelta.',
        'Usar interpolación (`$"{h.attacker} -> {h.damage}"`), que el compilador hace constante.'
      ],
      answer: [0],
      explanation: 'Los strings son inmutables: cada `+=` copia todo el informe acumulado en un string nuevo, así que la basura crece de forma cuadrática con el número de golpes. Un `StringBuilder` añade el texto en un buffer interno y solo crea el string final en `ToString()`; si lo guardas en un campo y llamas a `Clear()`, también reutilizas el buffer. `string.Format` y la interpolación siguen creando un string nuevo en cada vuelta, y `foreach` sobre un `List<T>` no asigna memoria.'
    },
    {
      id: 'prf-31',
      topic: 'Profiler',
      q: 'Tu juego móvil baja a 20 FPS en un nivel. Al profilear en el dispositivo, ves que el hilo principal pasa gran parte de cada frame en `Gfx.WaitForPresentOnGfxThread`. ¿Qué indica y qué haces primero?',
      options: [
        'Probablemente está limitado por la GPU: revisa overdraw, shaders y resolución de render.',
        'Los scripts son lentos: activa Deep Profile para encontrar el método culpable.',
        'Es la espera del VSync: pon `QualitySettings.vSyncCount = 0` para eliminarla.',
        'Hay demasiada basura: el recolector pausa el hilo en cada frame.'
      ],
      answer: [0],
      explanation: '`Gfx.WaitForPresentOnGfxThread` indica que el hilo principal ya está listo para el siguiente frame, pero el hilo de render sigue esperando a que la GPU termine de presentar el anterior: la señal típica de un juego **GPU bound** (puedes confirmarlo en la vista Timeline, viendo que el hilo de render está en `Gfx.PresentFrame` y no enviando draw calls). Optimizar scripts no ayudará; revisa overdraw, coste de los shaders, post-procesado, sombras o resolución de render. En móviles, `vSyncCount` se ignora (el sistema siempre sincroniza con la pantalla), así que ponerlo a 0 no cambia nada, y las pausas del recolector aparecen como `GC.Collect`, no como esta espera.'
    },
    {
      id: 'prf-32',
      topic: 'Profiler',
      q: 'Tu juego tiene tirones cada pocos segundos y sospechas del recolector de basura. ¿Qué **dos** pasos te ayudan a encontrar qué código genera la basura? (Elige 2)',
      options: [
        'En CPU Usage (vista Hierarchy), ordenar por la columna **GC Alloc**.',
        'Activar **Call Stacks** para `GC.Alloc` y ver la pila de cada asignación.',
        'Abrir el Frame Debugger y buscar los eventos de GC.',
        'Revisar el módulo **Rendering** del Profiler, que muestra la memoria por script.',
        'Usar el módulo **GPU Usage**, que reparte el tiempo de cada frame por script.'
      ],
      answer: [0, 1],
      explanation: 'La columna **GC Alloc** del módulo CPU Usage muestra cuántos bytes asigna cada muestra en ese frame, así que ordenar por ella te lleva directamente a los métodos que generan basura. Con **Call Stacks** activado para `GC.Alloc`, el Profiler guarda la pila de llamadas de cada asignación y ves qué código la provoca sin el overhead de Deep Profile. El Frame Debugger solo muestra eventos de renderizado, el módulo Rendering muestra estadísticas de draw calls y batches, y GPU Usage mide el trabajo de la GPU, no el de tus scripts.'
    },
    {
      id: 'prf-33',
      topic: 'Renderizado',
      q: 'En un proyecto URP, cambias el color de 300 unidades según su equipo con este código. El Frame Debugger muestra que esas unidades ya no entran en el **SRP Batcher**. ¿Cuál es la mejor solución?',
      code: 'void Start()\n{\n    var block = new MaterialPropertyBlock();\n    block.SetColor("_BaseColor", teamColor);\n    GetComponent<Renderer>().SetPropertyBlock(block);\n}',
      options: [
        'Usar un material por equipo con el mismo shader, sin ningún `MaterialPropertyBlock`.',
        'Crear el `MaterialPropertyBlock` una sola vez en un campo `static` y reutilizarlo.',
        'Activar Dynamic Batching en el URP Asset para agrupar los objetos con bloque.',
        'Usar la propiedad `_Color` en lugar de `_BaseColor`, que el SRP Batcher no admite.'
      ],
      answer: [0],
      explanation: 'Los Renderers que usan un `MaterialPropertyBlock` no son compatibles con el SRP Batcher. El SRP Batcher no necesita que los objetos compartan material: agrupa los que usan la **misma variante de shader**, aunque cada material tenga sus propios valores. Por eso, un material por equipo mantiene el batching. Reutilizar el bloque evita basura pero no recupera la compatibilidad, Dynamic Batching solo sirve para mallas muy pequeñas y no resuelve esto, y el nombre de la propiedad no influye (`_BaseColor` es el color del shader Lit de URP).'
    },
    {
      id: 'prf-34',
      topic: 'Plataformas',
      q: 'Tu juego va a 60 FPS estables en un móvil durante los primeros minutos, pero después baja poco a poco a 40 FPS sin que cambie la escena. En el Editor no pasa. ¿Cuál es la causa más probable?',
      options: [
        'El dispositivo se calienta y reduce la frecuencia de su CPU y GPU (*thermal throttling*).',
        'IL2CPP recompila el código a los pocos minutos y deja de estar optimizado.',
        'La memoria se llena de basura y hay que llamar a `GC.Collect()` cada minuto.',
        'Las texturas se descomprimen poco a poco en memoria y saturan la GPU.'
      ],
      answer: [0],
      explanation: 'Los móviles bajan la frecuencia de la CPU y la GPU cuando se calientan, para proteger el hardware, así que un juego que va justo a 60 FPS acaba cayendo. Por eso hay que profilear en el dispositivo durante sesiones largas, dejar margen en el presupuesto de cada frame (o fijar `Application.targetFrameRate = 30`) y, si hace falta, usar el paquete **Adaptive Performance** para reaccionar a la temperatura. IL2CPP compila AOT durante la build, no en runtime, y forzar el GC no resuelve un problema térmico.'
    }
  ]
});
