UCP.addDomain({
  id: 'scene',
  order: 4,
  title: 'Escena y entorno',
  titleEn: 'Programming for scene and environment design',
  description: 'Audio, instanciación, destrucción y gestión de GameObjects, y pathfinding con el sistema de navegación de Unity.',
  objectives: [
    'Determinar los scripts adecuados para implementar assets de audio.',
    'Identificar métodos para instanciar, destruir y gestionar GameObjects (pooling, Addressables).',
    'Determinar los scripts para el pathfinding con el sistema de navegación (NavMesh) de Unity.'
  ],
  tips: [
    '`PlayOneShot` permite solapar sonidos en un mismo `AudioSource`; `Play` reinicia el clip asignado.',
    'Si destruyes el objeto que tiene el `AudioSource`, el sonido se corta. Usa `AudioSource.PlayClipAtPoint` o un pool de fuentes de audio.',
    '`Destroy` no es inmediato: el objeto se destruye al final del frame actual. Y el `==` de Unity está sobrecargado, así que **no uses `?.` ni `??`** con objetos de Unity.',
    'Conoce `UnityEngine.Pool.ObjectPool<T>`: `Get()`, `Release(obj)` y los callbacks `createFunc`, `actionOnGet`, `actionOnRelease` y `actionOnDestroy`.',
    'Para saber si un agente llegó: `!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance`.',
    'Obstáculos que se mueven o se abren y cierran: `NavMeshObstacle` con **Carve**. Saltos entre zonas: `NavMeshLink`. NavMesh en runtime: `NavMeshSurface.BuildNavMesh()`.',
    'Para teletransportar un agente usa `agent.Warp(pos)`, no `transform.position`.',
    'Desactivar el GameObject **detiene** sus corrutinas; desactivar solo el componente (`enabled = false`) **no** las detiene.'
  ],
  questions: [
    {
      id: 'scn-01',
      topic: 'Audio',
      q: 'Un arma dispara muy rápido. Con `audioSource.Play()`, cada disparo corta el sonido del anterior. ¿Qué deberías usar?',
      options: [
        '`audioSource.PlayOneShot(shotClip)`',
        '`audioSource.PlayDelayed(0.1f)`',
        '`audioSource.loop = true`',
        'Un `AudioListener` por disparo'
      ],
      answer: [0],
      explanation: '`PlayOneShot` reproduce el clip sin interrumpir lo que ya suena en esa fuente, así que los disparos se solapan. `Play` reinicia el `clip` asignado. Solo debe haber **un** `AudioListener` activo en la escena (normalmente en la cámara).'
    },
    {
      id: 'scn-02',
      topic: 'Audio',
      q: 'El sonido de una cascada se oye con el mismo volumen en toda la escena. Quieres que dependa de la distancia. ¿Qué ajustas en su `AudioSource`?',
      options: [
        '**Spatial Blend** en 1 (3D).',
        '**Priority** en 0, para que tenga preferencia sobre los demás sonidos.',
        '**Doppler Level** alto, para que cambie según la velocidad del jugador.',
        'Añadir un `AudioListener` a la cascada para que mida la distancia.'
      ],
      answer: [0],
      explanation: 'Con Spatial Blend en 0 el sonido es 2D (se oye igual en todas partes). En 1 es totalmente 3D: se atenúa con la distancia al `AudioListener` según el rolloff, y se panea según la dirección.'
    },
    {
      id: 'scn-03',
      topic: 'Audio',
      q: 'La explosión no se oye nunca. ¿Por qué, y cómo lo solucionas?',
      code: 'void OnCollisionEnter(Collision c)\n{\n    audioSource.PlayOneShot(explosionClip);\n    Destroy(gameObject);\n}',
      options: [
        'El `AudioSource` se destruye con el objeto; usa `AudioSource.PlayClipAtPoint`.',
        '`PlayOneShot` no se puede llamar desde métodos de física como `OnCollisionEnter`.',
        'Hay que llamar a `Destroy` antes que a `PlayOneShot` para liberar el canal de audio.',
        'El clip debe tener Load Type en Streaming para reproducirse al instante.'
      ],
      answer: [0],
      explanation: 'Al destruir el GameObject se destruye su `AudioSource` y el sonido se corta. `PlayClipAtPoint` crea un objeto temporal con su propia fuente, que se destruye al terminar el clip. En proyectos grandes es más eficiente un pool de AudioSources.'
    },
    {
      id: 'scn-04',
      topic: 'Ciclo de vida de objetos',
      q: '¿Qué imprime este código, ejecutado dentro del mismo frame?',
      code: 'Destroy(enemy);\nDebug.Log(enemy == null);',
      options: [
        '`True`: `Destroy` libera el objeto inmediatamente.',
        '`False`: se destruye al final del frame.',
        'Lanza `MissingReferenceException` al acceder a `enemy`.',
        '`True`, porque el `==` sobrecargado detecta que está marcado para destruirse.'
      ],
      answer: [1],
      explanation: '`Destroy` marca el objeto para destruirlo después del bucle de Update del frame actual (y antes de renderizar). Hasta entonces sigue existiendo. `DestroyImmediate` es inmediato, pero solo se recomienda en código de Editor.'
    },
    {
      id: 'scn-05',
      topic: 'Ciclo de vida de objetos',
      q: '¿Por qué **no** se recomienda usar `target?.TakeDamage()` o `target ?? fallback` cuando `target` deriva de `UnityEngine.Object`?',
      options: [
        'No usan el `==` sobrecargado de Unity, así que un objeto destruido pasaría la comprobación.',
        'Esos operadores no existen en la versión de C# que usa Unity.',
        'Son mucho más lentos que un `if (target != null)` cuando se compila con IL2CPP.',
        'Provocan boxing del objeto y generan basura en cada llamada.'
      ],
      answer: [0],
      explanation: 'Unity sobrecarga `==` para que un objeto destruido (cuyo objeto nativo ya no existe) se compare como `null`. Los operadores `?.` y `??` comprueban la referencia de C# directamente y no usan esa sobrecarga. Usa `if (target != null)` o `if (target)`.'
    },
    {
      id: 'scn-06',
      topic: 'Object pooling',
      q: 'Usas este pool para las balas. Cuando una bala impacta, ¿qué deberías llamar en lugar de `Destroy`?',
      code: 'pool = new ObjectPool<Bullet>(\n    createFunc: () => Instantiate(prefab),\n    actionOnGet: b => b.gameObject.SetActive(true),\n    actionOnRelease: b => b.gameObject.SetActive(false),\n    actionOnDestroy: b => Destroy(b.gameObject),\n    collectionCheck: true,\n    defaultCapacity: 20,\n    maxSize: 100);',
      options: ['`pool.Get()`', '`pool.Release(bullet)`', '`pool.Clear()`', 'Solo `bullet.gameObject.SetActive(false)`'],
      answer: [1],
      explanation: '`Release` devuelve el objeto al pool y ejecuta `actionOnRelease` (aquí lo desactiva). Si el pool ya tiene `maxSize` objetos, se llama a `actionOnDestroy`. Con `collectionCheck: true`, liberar dos veces el mismo objeto lanza una excepción. Desactivarlo sin más no lo devuelve al pool.'
    },
    {
      id: 'scn-07',
      topic: 'Object pooling',
      q: '¿Cuáles son las **dos** principales ventajas del object pooling para objetos que se crean y destruyen con frecuencia? (Elige 2)',
      options: [
        'Reduce los picos del Garbage Collector y las asignaciones de memoria.',
        'Evita el coste repetido de `Instantiate` y `Destroy`.',
        'Reduce automáticamente el número de draw calls.',
        'Libera la memoria de los objetos que no se usan.'
      ],
      answer: [0, 1],
      explanation: 'Reutilizar objetos evita instanciar y destruir constantemente, que es costoso y genera basura. A cambio, el pool **mantiene** los objetos en memoria. No influye en los draw calls.'
    },
    {
      id: 'scn-08',
      topic: 'Instanciación',
      q: 'Quieres instanciar un prefab como hijo de un contenedor, en una posición y rotación concretas del mundo. ¿Qué sobrecarga usas?',
      options: [
        '`Instantiate(prefab, position, rotation, parent)`',
        '`Instantiate(prefab, parent)` y luego nada más.',
        '`Instantiate(prefab).transform.parent = position;`',
        '`new GameObject(prefab, parent)`'
      ],
      answer: [0],
      explanation: 'La sobrecarga con posición, rotación y padre coloca el objeto en esas coordenadas del mundo y lo hace hijo de `parent` en un solo paso, lo que es más eficiente que cambiar el padre después. `Instantiate(prefab, parent)` usa la posición del prefab relativa al padre.'
    },
    {
      id: 'scn-09',
      topic: 'Navegación',
      q: '¿Cuál es la forma más fiable de saber si un `NavMeshAgent` ha llegado a su destino?',
      options: [
        '`agent.velocity.sqrMagnitude < 0.01f`',
        '`Vector3.Distance(transform.position, agent.destination) == 0f`',
        '`!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance`',
        '`agent.isStopped && !agent.hasPath`'
      ],
      answer: [2],
      explanation: 'El path se calcula de forma asíncrona: mientras `pathPending` es true, `remainingDistance` no es fiable. Comparar posiciones exactas de floats casi nunca funciona, y `isStopped` indica si lo has detenido tú, no si llegó.'
    },
    {
      id: 'scn-10',
      topic: 'Navegación',
      q: 'Una puerta se abre y se cierra durante el juego. Cuando está cerrada, los agentes deben buscar otro camino. ¿Qué usas?',
      options: [
        'Volver a hacer el bake de la NavMesh cada vez que cambia la puerta.',
        'Un `NavMeshObstacle` en la puerta con **Carve** activado.',
        'Solo un `BoxCollider` en la puerta.',
        'Un `NavMeshLink` en la puerta.'
      ],
      answer: [1],
      explanation: 'Con Carve, el obstáculo "recorta" un agujero en la NavMesh mientras está activo y los agentes recalculan su ruta. Sin Carve, los agentes solo lo esquivan localmente, sin cambiar de ruta. Los colliders no afectan a la NavMesh en runtime.'
    },
    {
      id: 'scn-11',
      topic: 'Navegación',
      q: 'Los enemigos deben poder saltar entre dos plataformas separadas por un hueco. ¿Qué componente conecta esas dos zonas de la NavMesh?',
      options: ['`NavMeshObstacle`', '`NavMeshLink` (o un Off-Mesh Link)', '`NavMeshModifier` con área Not Walkable', 'Un `Rigidbody` en el agente'],
      answer: [1],
      explanation: 'Un NavMesh Link crea una conexión transitable entre dos puntos que no están unidos en la malla, como un hueco, un salto o una escalera. Puedes detectar cuándo el agente lo cruza con `agent.isOnOffMeshLink` para animar el salto.'
    },
    {
      id: 'scn-12',
      topic: 'Navegación',
      q: 'El nivel se genera de forma procedural en tiempo de ejecución. ¿Cómo obtienes una NavMesh para él?',
      options: [
        'No es posible: la NavMesh solo se puede generar en el Editor antes de la build.',
        'Con `NavMeshSurface.BuildNavMesh()` (paquete AI Navigation).',
        'Llamando a `NavMesh.CalculatePath` en cada agente para que genere la malla.',
        'Activando Carve en los `NavMeshObstacle` de todo el nivel generado.'
      ],
      answer: [1],
      explanation: '`NavMeshSurface` permite hacer el bake en runtime (y `UpdateNavMesh` para actualizarlo de forma asíncrona). `CalculatePath` calcula una ruta sobre una NavMesh que ya existe, pero no la crea.'
    },
    {
      id: 'scn-13',
      topic: 'Navegación',
      q: 'Quieres que un enemigo aparezca en un punto aleatorio y asegurarte de que está sobre la NavMesh. ¿Qué API usas?',
      options: [
        '`NavMesh.SamplePosition(randomPoint, out NavMeshHit hit, maxDistance, NavMesh.AllAreas)`',
        '`Physics.Raycast(randomPoint, Vector3.down)`',
        '`agent.SetDestination(randomPoint)`',
        '`NavMesh.Raycast(randomPoint, randomPoint, out hit, 0)`'
      ],
      answer: [0],
      explanation: '`SamplePosition` busca el punto más cercano de la NavMesh dentro de un radio y devuelve `true` si lo encuentra (en `hit.position`). Un raycast físico solo detecta colliders, no la NavMesh.'
    },
    {
      id: 'scn-14',
      topic: 'Navegación',
      q: 'Los agentes deben evitar un pantano si hay otro camino, pero cruzarlo si es la única opción. ¿Cómo lo configuras?',
      options: [
        'Marcar el pantano como Not Walkable.',
        'Crear un **área** de navegación "Pantano" con un **coste** mayor y asignarla al pantano.',
        'Poner un `NavMeshObstacle` con Carve en el pantano.',
        'Bajar la `speed` del agente cuando pisa el pantano.'
      ],
      answer: [1],
      explanation: 'El pathfinding (A*) minimiza el coste total del camino. Un área con más coste hace que el agente prefiera otras rutas sin que quede prohibida. Not Walkable y Carve la bloquearían por completo. Con `agent.SetAreaCost` puedes cambiar el coste por agente.'
    },
    {
      id: 'scn-15',
      topic: 'Navegación',
      q: 'Al teletransportar un enemigo con `NavMeshAgent` usando `transform.position = spawnPoint`, se comporta de forma extraña o vuelve atrás. ¿Qué deberías usar?',
      options: ['`agent.Warp(spawnPoint)`', '`agent.Move(spawnPoint)`', '`agent.destination = spawnPoint`', '`rigidbody.MovePosition(spawnPoint)`'],
      answer: [0],
      explanation: 'El agente sincroniza su posición interna con la NavMesh. `Warp` lo coloca en la nueva posición y actualiza su estado. `Move` aplica un desplazamiento relativo, y `destination` lo haría caminar hasta allí.'
    },
    {
      id: 'scn-16',
      topic: 'Ciclo de vida de objetos',
      q: 'Un spawner usa `StartCoroutine(SpawnWaves())` en `Start`. Tras desactivar el GameObject (`SetActive(false)`) y volver a activarlo, las oleadas no continúan. ¿Por qué?',
      options: [
        'Al desactivar el GameObject, sus corrutinas se detienen y no se reanudan solas. Reinícialas en `OnEnable`.',
        'Las corrutinas solo duran 60 segundos.',
        '`WaitForSeconds` no funciona en objetos reactivados.',
        'Hay que usar `InvokeRepeating`, porque las corrutinas no se pueden pausar.'
      ],
      answer: [0],
      explanation: 'Las corrutinas pertenecen al MonoBehaviour que las inició y se detienen cuando se desactiva o destruye su GameObject. `Start` solo se ejecuta una vez, así que al reactivarlo nadie las vuelve a lanzar. Ojo: poner `enabled = false` en el componente **no** detiene las corrutinas.'
    },
    {
      id: 'scn-17',
      topic: 'Gestión de assets',
      q: 'Cargas prefabs con `Addressables.LoadAssetAsync<GameObject>(key)`. Tras varias horas de juego, la memoria no deja de crecer. ¿Qué falta?',
      options: [
        'Liberar con `Addressables.Release(handle)` cuando ya no se necesitan (o `ReleaseInstance` si usaste `InstantiateAsync`).',
        'Llamar a `Resources.UnloadUnusedAssets()` en cada frame.',
        'Llamar a `GC.Collect()` después de cada carga.',
        'Nada: Addressables libera la memoria automáticamente al cambiar de escena.'
      ],
      answer: [0],
      explanation: 'Addressables usa recuento de referencias: cada carga incrementa el contador, y el asset (y su bundle) no se descarga hasta que se libera tantas veces como se cargó. Olvidar `Release` es la causa más común de fugas con Addressables.'
    },
    {
      id: 'scn-18',
      topic: 'Gestión de assets',
      q: '¿Por qué se desaconseja usar la carpeta `Resources` para grandes cantidades de assets?',
      options: [
        'Todo su contenido se incluye en la build y aumenta el tiempo de arranque y la memoria.',
        '`Resources.Load` solo funciona en el Editor y falla en las builds.',
        'Los assets de `Resources` no se pueden cargar de forma asíncrona.',
        'Unity no comprime las texturas que están dentro de `Resources`.'
      ],
      answer: [0],
      explanation: 'Unity incluye todos los assets de `Resources` en la build y construye un índice al arrancar. Además, es difícil gestionar la memoria con precisión. Las alternativas recomendadas son las referencias directas y Addressables.'
    },
    {
      id: 'scn-19',
      topic: 'Audio',
      q: 'Al sumergirse en el agua, todo el audio debe pasar de forma gradual a sonar filtrado (low-pass), y volver al salir. ¿Cuál es el enfoque más adecuado?',
      options: [
        'Crear dos **snapshots** en el AudioMixer (Normal y Bajo el agua) y llamar a `underwaterSnapshot.TransitionTo(0.5f)`.',
        'Cambiar el volumen de cada `AudioSource` en `Update`.',
        'Reemplazar todos los clips por versiones filtradas.',
        'Añadir un `AudioLowPassFilter` a cada `AudioSource` en tiempo real.'
      ],
      answer: [0],
      explanation: 'Los snapshots guardan el estado de todos los parámetros del mixer (incluidos los efectos de los grupos) y `TransitionTo` interpola entre ellos durante el tiempo indicado, sin tocar cada fuente por separado.'
    },
    {
      id: 'scn-20',
      topic: 'Ciclo de vida de objetos',
      q: 'En Unity 6, `FindObjectOfType<T>()` está obsoleto. Necesitas **cualquier** instancia de `GameManager` y no te importa cuál. ¿Qué alternativa es la más rápida?',
      options: [
        '`FindAnyObjectByType<GameManager>()`',
        '`FindFirstObjectByType<GameManager>()`',
        '`FindObjectsByType<GameManager>(FindObjectsSortMode.InstanceID)[0]`',
        '`GameObject.Find("GameManager")`'
      ],
      answer: [0],
      explanation: '`FindAnyObjectByType` devuelve cualquier instancia sin garantizar el orden, así que es la más rápida. `FindFirstObjectByType` garantiza la misma instancia que devolvía `FindObjectOfType`, pero es más lenta. Ordenar todas las instancias o buscar por nombre es aún peor. Lo ideal sigue siendo guardar la referencia y no buscarla en cada frame.'
    },
    {
      id: 'scn-21',
      topic: 'Corrutinas y async',
      q: 'Al recibir daño, el parpadeo debería detenerse, pero sigue para siempre. ¿Por qué?',
      code: 'void OnEnable() => StartCoroutine(Blink());\n\nvoid OnHit()\n{\n    StopCoroutine(Blink());\n}\n\nIEnumerator Blink()\n{\n    while (true)\n    {\n        rend.enabled = !rend.enabled;\n        yield return new WaitForSeconds(0.2f);\n    }\n}',
      options: [
        '`Blink()` crea un `IEnumerator` nuevo cada vez: hay que guardar el `Coroutine` que devuelve `StartCoroutine` y pasarlo a `StopCoroutine`.',
        '`StopCoroutine` solo funciona con corrutinas iniciadas desde `Start`.',
        'Un bucle `while (true)` dentro de una corrutina no se puede detener.',
        '`StopCoroutine` solo surte efecto en el siguiente `WaitForSeconds` múltiplo de 1 segundo.'
      ],
      answer: [0],
      explanation: 'Cada llamada a `Blink()` devuelve un iterador distinto, así que `StopCoroutine(Blink())` intenta parar uno que nunca se inició. Guarda la referencia: `blinkRoutine = StartCoroutine(Blink());` y luego `StopCoroutine(blinkRoutine);` (también vale guardar el `IEnumerator`). `StopAllCoroutines()` las para todas las del componente.'
    },
    {
      id: 'scn-22',
      topic: 'Corrutinas y async',
      q: '¿Qué **dos** afirmaciones sobre el momento en que se reanuda una corrutina son correctas? (Elige 2)',
      options: [
        '`yield return null` la reanuda en el siguiente frame, después de que se hayan llamado todos los `Update`.',
        '`yield return new WaitForFixedUpdate()` la reanuda después de los `FixedUpdate` del siguiente paso de física.',
        '`yield return null` la reanuda en el mismo frame, justo antes de `LateUpdate`.',
        '`yield return new WaitForEndOfFrame()` la reanuda antes de renderizar el frame.',
        '`yield return new WaitForSeconds(0)` la reanuda inmediatamente, en la misma línea.'
      ],
      answer: [0, 1],
      explanation: '`yield return null` espera al siguiente frame y continúa tras todos los `Update` (antes de `LateUpdate`). `WaitForFixedUpdate` continúa tras los `FixedUpdate` del siguiente paso de física, útil para aplicar fuerzas desde una corrutina. `WaitForEndOfFrame` se ejecuta **después** de renderizar (por ejemplo, para capturar la pantalla), y ningún `yield` continúa en el mismo instante.'
    },
    {
      id: 'scn-23',
      topic: 'Corrutinas y async',
      q: 'Al destruir al enemigo, la consola se llena de `MissingReferenceException`: el método sigue ejecutándose. ¿Cómo lo arreglas?',
      code: 'async Awaitable Patrol()\n{\n    while (true)\n    {\n        transform.position += transform.forward * speed * Time.deltaTime;\n        await Awaitable.NextFrameAsync();\n    }\n}',
      options: [
        'Pasar `destroyCancellationToken` a la espera: `await Awaitable.NextFrameAsync(destroyCancellationToken);`.',
        'Cambiar `Awaitable` por `async void`, que se detiene al destruir el objeto.',
        'Llamar a `StopAllCoroutines()` en `OnDestroy`.',
        'Usar `await Task.Yield()`, que está ligado al ciclo de vida del MonoBehaviour.'
      ],
      answer: [0],
      explanation: 'A diferencia de las corrutinas, los métodos `async` **no** están ligados al MonoBehaviour: siguen vivos después de destruirlo. `destroyCancellationToken` se cancela al destruir el componente, y la espera lanza `OperationCanceledException`, que termina el método. `StopAllCoroutines` no afecta a `Awaitable`, y `async void` o `Task.Yield` tampoco conocen el ciclo de vida del objeto.'
    },
    {
      id: 'scn-24',
      topic: 'Corrutinas y async',
      q: 'Quieres calcular una ruta costosa fuera del hilo principal y, al terminar, mover al personaje. ¿Qué secuencia es correcta con `Awaitable`?',
      options: [
        '`await Awaitable.BackgroundThreadAsync();` → calcular → `await Awaitable.MainThreadAsync();` → asignar `transform.position`.',
        '`await Awaitable.BackgroundThreadAsync();` → calcular → asignar `transform.position` directamente.',
        '`await Awaitable.MainThreadAsync();` → calcular → `await Awaitable.BackgroundThreadAsync();` → asignar `transform.position`.',
        '`StartCoroutine` con `yield return new WaitForBackgroundThread()` → calcular y asignar `transform.position`.'
      ],
      answer: [0],
      explanation: '`BackgroundThreadAsync` continúa el método en un hilo del pool, ideal para cálculos puros. La mayoría de la API de Unity (`transform`, componentes, `GameObject`) solo se puede usar desde el hilo principal, así que antes de tocarla hay que volver con `MainThreadAsync`. `WaitForBackgroundThread` no existe: las corrutinas siempre se ejecutan en el hilo principal.'
    },
    {
      id: 'scn-25',
      topic: 'Instanciación',
      q: 'El prefab de un arma tiene posición `(0, 1, 0)`. La instancias con `Instantiate(weaponPrefab, hand)`. ¿Dónde aparece?',
      options: [
        'Como hijo de `hand`, con posición **local** `(0, 1, 0)`: un metro por encima de la mano, según su rotación y escala.',
        'Como hijo de `hand`, en la posición del **mundo** `(0, 1, 0)`.',
        'En la posición del mundo `(0, 1, 0)` y sin padre: el segundo parámetro solo indica la escena.',
        'Exactamente en la posición de `hand`, porque la posición del prefab se ignora.'
      ],
      answer: [0],
      explanation: '`Instantiate(original, parent)` usa `instantiateInWorldSpace = false` por defecto: la posición, rotación y escala del prefab se interpretan como **locales** respecto al padre. Con `Instantiate(weaponPrefab, hand, true)` se conserva la posición del mundo `(0, 1, 0)`. Si necesitas una posición concreta, usa la sobrecarga con `position`, `rotation` y `parent`.'
    },
    {
      id: 'scn-26',
      topic: 'Instanciación',
      q: 'El campo `enemyPrefab` está declarado como `public Enemy enemyPrefab;` (un componente del prefab). ¿Qué devuelve `Instantiate(enemyPrefab)`?',
      options: [
        'El componente `Enemy` del clon: se clona el GameObject completo y no hace falta `GetComponent`.',
        'Una copia del componente `Enemy` sin GameObject.',
        'El `GameObject` del clon, que hay que convertir con `as Enemy`.',
        'Un error: `Instantiate` solo acepta `GameObject`.'
      ],
      answer: [0],
      explanation: '`Instantiate<T>(T original)` es genérico: si le pasas un componente, clona todo su GameObject (con hijos y demás componentes) y devuelve el componente equivalente del clon. Declarar el campo con el tipo del componente evita un `GetComponent` y asegura en el Inspector que el prefab tiene ese script.'
    }
  ]
});
