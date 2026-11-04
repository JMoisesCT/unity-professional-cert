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
        'Guardar el `Animator` en un campo en `Awake` y usar esa referencia en `Update`.',
        'Cambiar `GetComponent<Animator>()` por `FindObjectOfType<Animator>()`.',
        'Mover el código a `FixedUpdate`.',
        'Usar `GetComponentInChildren<Animator>()`.'
      ],
      answer: [0],
      explanation: 'Buscar componentes tiene un coste. Guardar la referencia una vez (en `Awake` o asignándola por `[SerializeField]`) lo elimina del bucle. `FindObjectOfType` es mucho más lento y además podría devolver otro objeto. Bonus: usa `Animator.StringToHash` para el parámetro.'
    },
    {
      id: 'prf-02',
      topic: 'Scripts eficientes',
      q: 'El Profiler muestra **GC Alloc** en cada frame por este código. ¿Cuál es la mejor solución?',
      code: 'void Update()\n{\n    scoreText.text = "Score: " + score;\n}',
      options: [
        'Actualizar el texto solo cuando cambia la puntuación.',
        'Usar `"Score: " + score.ToString()` para evitar el boxing del entero.',
        'Llamar a `System.GC.Collect()` cada pocos frames para liberar la basura.',
        'Mover la línea a `LateUpdate`, que no genera asignaciones.'
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
        'Activar Development Build: así el Profiler muestra todas las funciones.'
      ],
      answer: [0],
      explanation: '`ProfilerMarker` (Unity.Profiling) añade una muestra con nombre propio a la jerarquía del Profiler, con muy poco overhead (y se elimina en builds de release). `Time.time` no cambia dentro de un frame, así que no sirve para medir.'
    },
    {
      id: 'prf-04',
      topic: 'Profiler',
      q: '¿Cuál es la principal desventaja de **Deep Profile**?',
      options: [
        'Añade un overhead enorme que distorsiona los tiempos medidos.',
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
        'Haciendo una build con **Development Build** y **Autoconnect Profiler**, y conectando el Profiler al dispositivo (por USB o red).',
        'Perfilando en el Editor con la plataforma cambiada a Android: el resultado es el mismo.',
        'Instalando el Profiler en el móvil desde la Play Store.',
        'Activando Deep Profile en una build de release.'
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
        '**Occlusion Culling**, con los datos de oclusión precalculados (bake).',
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
        'Convertir los sprites a modelos 3D.',
        'Desactivar los mipmaps.',
        'Usar un Canvas por sprite.'
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
        'Juntar todos los Canvas del juego en uno solo para reducir los draw calls de la UI.',
        'Actualizar el temporizador en `FixedUpdate` para que el Canvas se reconstruya menos.',
        'Cambiar el Canvas a World Space para que no dependa de la resolución de pantalla.'
      ],
      answer: [0],
      explanation: 'Cuando un elemento cambia, Unity reconstruye la geometría de todo su Canvas. Separar lo dinámico de lo estático limita esa reconstrucción. También ayuda desactivar **Raycast Target** en los elementos que no son interactivos.'
    },
    {
      id: 'prf-12',
      topic: 'Scripts eficientes',
      q: 'Llamas a `Physics.OverlapSphere` en cada frame para detectar enemigos cercanos y genera basura. ¿Qué alternativa usas?',
      options: [
        '`Physics.OverlapSphereNonAlloc` con un array `Collider[]` creado una sola vez.',
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
        'Porque `.tag` está obsoleto desde Unity 2020 y da un warning.',
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
        'Solo en builds para Android, no en el Editor (aunque la plataforma activa sea Android).',
        'En el Editor y en Android.',
        'En todas las plataformas móviles.',
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
        'Mantener una tasa de frames alta y estable, igual a la frecuencia del visor (72/90/120 Hz).',
        'Añadir sacudidas de cámara y *head bob* para dar realismo.',
        'Usar UI en Screen Space - Overlay.'
      ],
      answer: [0, 1],
      explanation: 'El mareo aparece cuando el movimiento que se ve no coincide con el que siente el cuerpo, o cuando hay caídas de FPS. Teletransporte, snap turn, viñetas al moverse y FPS estables lo reducen. Las sacudidas de cámara lo empeoran, y la UI en Overlay ni siquiera se ve correctamente en VR.'
    },
    {
      id: 'prf-20',
      topic: 'XR',
      q: '¿Cuál es la forma recomendada de mostrar un menú en una aplicación VR?',
      options: [
        'Un Canvas en **World Space**, a una distancia cómoda.',
        'Un Canvas en Screen Space - Overlay, que se dibuja encima de todo en ambos ojos.',
        'Un Canvas en Screen Space - Camera, pegado a pocos centímetros de los ojos.',
        'Mostrar el menú solo en el monitor del PC (mirror) y navegarlo con el teclado.'
      ],
      answer: [0],
      explanation: 'En XR no hay "pantalla" plana: la UI debe existir en el mundo, a una distancia y tamaño legibles, sin seguir la cabeza de forma rígida. El XR Interaction Toolkit usa un `TrackedDeviceGraphicRaycaster` para interactuar con un Canvas en World Space.'
    },
    {
      id: 'prf-21',
      topic: 'XR',
      q: '¿Qué modo de renderizado estéreo reduce el coste de CPU dibujando ambos ojos en una sola pasada con instancing?',
      options: ['Multi Pass', 'Single Pass Instanced', 'Deferred Shading', 'Forward+'],
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
    }
  ]
});
