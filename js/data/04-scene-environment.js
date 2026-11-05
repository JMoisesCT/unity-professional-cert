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
        '`audioSource.PlayDelayed(0.1f)` en cada disparo',
        '`audioSource.loop = true` mientras se dispara',
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
        '**Spatial Blend** en 1 (3D), con su curva de rolloff.',
        '**Priority** en 0, para que tenga preferencia.',
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
        '`False`: se destruye más tarde, al final del frame.',
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
        'No usan el `==` sobrecargado, así que no detectan objetos destruidos.',
        'Esos operadores no existen en la versión de C# que usa Unity y no compilan.',
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
        'Reduce automáticamente los draw calls, porque las instancias comparten material.',
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
        '`agent.velocity.sqrMagnitude < 0.01f` durante varios frames seguidos',
        '`Vector3.Distance(transform.position, agent.destination) == 0f`',
        '`!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance`',
        '`agent.remainingDistance <= agent.stoppingDistance`, sin comprobar nada más'
      ],
      answer: [2],
      explanation: 'El path se calcula de forma asíncrona: mientras `pathPending` es true, `remainingDistance` no es fiable, así que compararla sin más puede dar un falso "llegó". Comparar posiciones exactas de floats casi nunca funciona, y una velocidad casi nula también se da cuando el agente está bloqueado o esperando una ruta.'
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
        'Activando Carve en todos los `NavMeshObstacle` del nivel.'
      ],
      answer: [1],
      explanation: '`NavMeshSurface` permite hacer el bake en runtime (y `UpdateNavMesh` para actualizarlo de forma asíncrona). `CalculatePath` calcula una ruta sobre una NavMesh que ya existe, pero no la crea.'
    },
    {
      id: 'scn-13',
      topic: 'Navegación',
      q: 'Quieres que un enemigo aparezca en un punto aleatorio y asegurarte de que está sobre la NavMesh. ¿Qué API usas?',
      options: [
        '`NavMesh.SamplePosition(randomPoint, out hit, maxDistance, NavMesh.AllAreas)`',
        '`Physics.Raycast(randomPoint + Vector3.up * 10f, Vector3.down, out RaycastHit hit)`',
        '`agent.SetDestination(randomPoint)`',
        '`NavMesh.Raycast(randomPoint, randomPoint, out NavMeshHit hit, NavMesh.AllAreas)`'
      ],
      answer: [0],
      explanation: '`SamplePosition` busca el punto más cercano de la NavMesh dentro de un radio y devuelve `true` si lo encuentra (en `hit.position`). Un raycast físico solo detecta colliders, no la NavMesh. `NavMesh.Raycast` traza una línea sobre la NavMesh entre dos puntos para ver si hay obstáculos, pero no busca el punto más cercano.'
    },
    {
      id: 'scn-14',
      topic: 'Navegación',
      q: 'Los agentes deben evitar un pantano si hay otro camino, pero cruzarlo si es la única opción. ¿Cómo lo configuras?',
      options: [
        'Marcar el pantano como Not Walkable con un `NavMeshModifier`.',
        'Crear un **área** "Pantano" con más **coste** y asignarla al pantano.',
        'Poner un `NavMeshObstacle` con Carve en el pantano.',
        'Bajar la `speed` del agente mientras pisa el pantano, desde un trigger.'
      ],
      answer: [1],
      explanation: 'El pathfinding (A*) minimiza el coste total del camino. Un área con más coste hace que el agente prefiera otras rutas sin que quede prohibida. Not Walkable y Carve la bloquearían por completo, y cambiar la `speed` no altera la ruta elegida. Con `agent.SetAreaCost` puedes cambiar el coste por agente.'
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
        'Sus corrutinas se detuvieron y `Start` no vuelve a ejecutarse: lánzalas en `OnEnable`.',
        'Las corrutinas tienen un límite de tiempo y Unity las cancela al superarlo.',
        'La corrutina sigue activa, pero `WaitForSeconds` deja de contar tras reactivar el objeto.',
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
        'Llamar a `Addressables.Release(handle)` al dejar de usarlos.',
        'Llamar a `Resources.UnloadUnusedAssets()` en cada frame.',
        'Llamar a `GC.Collect()` después de cada carga para liberar los bundles.',
        'Nada: Addressables libera la memoria automáticamente al cambiar de escena.'
      ],
      answer: [0],
      explanation: 'Addressables usa recuento de referencias: cada carga incrementa el contador, y el asset (y su bundle) no se descarga hasta que se libera tantas veces como se cargó. Olvidar `Release` es la causa más común de fugas con Addressables. Si instanciaste con `Addressables.InstantiateAsync`, libera con `Addressables.ReleaseInstance`.'
    },
    {
      id: 'scn-18',
      topic: 'Gestión de assets',
      q: '¿Por qué se desaconseja usar la carpeta `Resources` para grandes cantidades de assets?',
      options: [
        'Todo su contenido va a la build y se indexa al arrancar.',
        '`Resources.Load` solo funciona en el Editor y falla en las builds.',
        'Los assets de `Resources` no se pueden cargar de forma asíncrona.',
        'Unity no comprime las texturas de `Resources`.'
      ],
      answer: [0],
      explanation: 'Unity incluye todos los assets de `Resources` en la build y construye un índice al arrancar. Ese índice crece con cada asset, y además es difícil gestionar la memoria con precisión. `Resources.LoadAsync` sí existe y funciona en builds. Las alternativas recomendadas son las referencias directas y Addressables.'
    },
    {
      id: 'scn-19',
      topic: 'Audio',
      q: 'Al sumergirse en el agua, todo el audio debe pasar de forma gradual a sonar filtrado (low-pass), y volver al salir. ¿Cuál es el enfoque más adecuado?',
      options: [
        'Crear dos **snapshots** en el mixer y llamar a `TransitionTo(0.5f)`.',
        'Cambiar el volumen de cada `AudioSource` en `Update`.',
        'Reemplazar todos los clips por versiones filtradas al entrar en el agua.',
        'Añadir un `AudioLowPassFilter` a cada `AudioSource` y animar su `cutoffFrequency` desde un script.'
      ],
      answer: [0],
      explanation: 'Los snapshots guardan el estado de todos los parámetros del mixer (incluidos los efectos de los grupos) y `TransitionTo` interpola entre ellos durante el tiempo indicado, sin tocar cada fuente por separado. Un `AudioLowPassFilter` por fuente funcionaría, pero obliga a gestionar cada `AudioSource` (y las que se creen después) desde código.'
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
      topic: 'Instanciación',
      q: 'El campo `enemyPrefab` es de tipo `Enemy` (un componente del prefab), no `GameObject`. ¿Qué ocurre al ejecutar `Spawn`?',
      code: '[SerializeField] private Enemy enemyPrefab;\n\nvoid Spawn()\n{\n    var e = Instantiate(enemyPrefab, spawnPoint.position, Quaternion.identity);\n    e.SetTarget(player);\n}',
      options: [
        'Se clona todo el GameObject del prefab y `e` es su componente `Enemy`.',
        'No compila: `Instantiate` siempre devuelve un `GameObject` y no tiene `SetTarget`.',
        'Se crea un GameObject vacío que solo tiene una copia del componente `Enemy`.',
        'Compila, pero `e` es un `Object` y hay que convertirlo con `as Enemy`.'
      ],
      answer: [0],
      explanation: '`Instantiate<T>(T original)` es genérico y devuelve el mismo tipo que recibe. Si el original es un componente, Unity clona su GameObject completo (con hijos y demás componentes) y devuelve el componente equivalente en la copia. Así te ahorras un `GetComponent<Enemy>()` después de instanciar.'
    },
    {
      id: 'scn-22',
      topic: 'Instanciación',
      q: 'El prefab tiene su raíz en la posición (0, 1, 0). `slot` está en (10, 0, 0) del mundo, sin rotación ni escala. ¿Dónde aparecen `a` y `b` en coordenadas de mundo?',
      code: 'var a = Instantiate(prefab, slot);\nvar b = Instantiate(prefab, slot, true);',
      options: [
        '`a` en (0, 1, 0) y `b` en (10, 1, 0): `true` aplica la posición relativa al padre.',
        '`a` en (10, 1, 0) y `b` en (0, 1, 0), aunque los dos son hijos de `slot`.',
        'Los dos en (10, 1, 0): el tercer parámetro solo decide si se conserva la rotación.',
        'Los dos en (0, 1, 0): el padre no influye en la posición inicial.'
      ],
      answer: [1],
      explanation: 'El tercer parámetro es `instantiateInWorldSpace`. Con `Instantiate(prefab, parent)` (equivale a `false`), la posición del prefab se toma como **local** respecto al padre: (10, 0, 0) + (0, 1, 0) = (10, 1, 0). Con `true`, la posición del prefab se mantiene en el **mundo**: (0, 1, 0), aunque el objeto queda como hijo de `slot`. Afecta a posición, rotación y escala, no solo a la rotación.'
    },
    {
      id: 'scn-23',
      topic: 'Instanciación',
      q: 'En Unity 6 creas una multitud con `InstantiateAsync`. `npcPrefab` es de tipo `Npc` (un componente). ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      code: 'IEnumerator SpawnCrowd()\n{\n    var op = InstantiateAsync(npcPrefab, 50, spawnRoot);\n    yield return op;\n\n    foreach (Npc npc in op.Result)\n        npc.Init();\n}',
      options: [
        '`yield return op` no compila: a `InstantiateAsync` solo se le puede esperar con `await`.',
        '`op.Result` es un array `Npc[]` con los 50 clones.',
        'Los clones se crean desactivados y tienes que llamar a `SetActive(true)` en cada uno.',
        'Solo acepta prefabs cargados con Addressables; con una referencia directa falla.',
        'Parte del trabajo va fuera del hilo principal y la integración se reparte entre frames.'
      ],
      answer: [1, 4],
      explanation: '`InstantiateAsync` devuelve un `AsyncInstantiateOperation<T>`, que deriva de `AsyncOperation`, así que puedes hacer `yield return` en una corrutina. Su `Result` es un array de `T` con tantos elementos como indique `count`. La preparación de las copias se hace en segundo plano, y la integración en la escena (con las llamadas a `Awake`) ocurre en el hilo principal con un presupuesto de tiempo por frame. Funciona con cualquier `Object`, no solo con Addressables.'
    },
    {
      id: 'scn-24',
      topic: 'Object pooling',
      q: 'Tras pasar unos minutos, los enemigos que salen del pool mueren al primer golpe. ¿Cuál es la causa?',
      code: '// Spawner\npool = new ObjectPool<Enemy>(\n    createFunc: () => Instantiate(enemyPrefab),\n    actionOnGet: e => e.gameObject.SetActive(true),\n    actionOnRelease: e => e.gameObject.SetActive(false),\n    actionOnDestroy: e => Destroy(e.gameObject));\n\n// Enemy.cs\nvoid Start() => health = maxHealth;\n\npublic void TakeDamage(int dmg)\n{\n    health -= dmg;\n    if (health <= 0) pool.Release(this);\n}',
      options: [
        '`SetActive(false)` en `actionOnRelease` destruye el componente y Unity lo recrea sin valores.',
        '`Start` no se repite al reutilizarlo; reinicia la vida en `OnEnable` o en `actionOnGet`.',
        '`Get` copia el estado del último objeto liberado en el nuevo, incluida su vida.',
        'Falta `collectionCheck: true`, sin el cual `Get` devuelve objetos que siguen en uso.'
      ],
      answer: [1],
      explanation: 'Un objeto reutilizado no se vuelve a crear, así que `Awake` y `Start` no se repiten: el enemigo vuelve con la vida que tenía al liberarse (0 o menos). Reinicia el estado cada vez que sale del pool, en `actionOnGet` o en `OnEnable` (que se llama al reactivarlo). Desactivar no destruye componentes, y `collectionCheck` solo detecta liberar dos veces el mismo objeto.'
    },
    {
      id: 'scn-25',
      topic: 'Object pooling',
      q: 'Creas un `ObjectPool<T>` con `collectionCheck: true`, `defaultCapacity: 10` y `maxSize: 10`. ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      options: [
        'En el Editor, llamar dos veces a `Release` con el mismo objeto lanza una excepción.',
        '`Get` lanza una excepción si ya hay 10 objetos fuera del pool.',
        '`defaultCapacity: 10` crea 10 instancias por adelantado, llamando a `createFunc` al construir el pool.',
        'Si liberas un objeto con 10 ya guardados, se llama a `actionOnDestroy` con él.',
        '`collectionCheck` se comprueba también en las builds, sin ningún coste extra.'
      ],
      answer: [0, 3],
      explanation: '`collectionCheck` detecta que liberas un objeto que ya está en el pool, pero solo en el Editor (no en las builds). `maxSize` limita cuántos objetos **inactivos** guarda el pool: si se supera, el objeto liberado no se guarda y se pasa a `actionOnDestroy`. `Get` nunca falla por `maxSize`: si no hay objetos libres, llama a `createFunc`. `defaultCapacity` solo reserva espacio en la colección interna; no crea instancias (para precalentar el pool, haz `Get` y `Release` al cargar).'
    },
    {
      id: 'scn-26',
      topic: 'Gestión de assets',
      q: 'Tras llamar a `Clear`, los enemigos desaparecen, pero el prefab y su bundle siguen en memoria. ¿Qué corriges?',
      code: 'public AssetReferenceGameObject enemyRef;\nreadonly List<GameObject> spawned = new();\n\nasync void Spawn()\n{\n    var handle = enemyRef.InstantiateAsync(spawnPoint.position, Quaternion.identity);\n    spawned.Add(await handle.Task);\n}\n\nvoid Clear()\n{\n    foreach (var go in spawned) Destroy(go);\n    spawned.Clear();\n}',
      options: [
        'Llamar antes a `enemyRef.LoadAssetAsync()` para cuadrar el recuento.',
        'Cambiar `Destroy(go)` por `DestroyImmediate(go, true)` para que también se descargue el asset.',
        'Sustituir `Destroy(go)` por `Addressables.ReleaseInstance(go)` en el bucle de `Clear`.',
        'Llamar a `Resources.UnloadUnusedAssets()` tras el bucle para que Addressables suelte el bundle.'
      ],
      answer: [2],
      explanation: 'Cada `InstantiateAsync` de Addressables suma una referencia al asset. `Destroy` elimina el GameObject, pero Addressables no se entera y el recuento nunca baja, así que el prefab y su bundle siguen cargados. `ReleaseInstance` destruye la instancia **y** libera su referencia. Cargar el asset otra vez sumaría otra referencia, `UnloadUnusedAssets` no descarga lo que Addressables sigue reteniendo, y `DestroyImmediate(go, true)` sirve para destruir assets en el Editor, no para esto.'
    },
    {
      id: 'scn-27',
      topic: 'Ciclo de vida de objetos',
      q: 'Desde el `Update` de otro script ejecutas `Destroy(crate.gameObject)` sobre una caja activa y luego escribes un log. ¿En qué orden aparecen los mensajes?',
      code: 'public class Crate : MonoBehaviour\n{\n    void OnDisable() => Debug.Log("OnDisable");\n    void OnDestroy() => Debug.Log("OnDestroy");\n}\n\n// In another script, inside Update():\nDestroy(crate.gameObject);\nDebug.Log("After Destroy");',
      options: [
        '`OnDisable` → `OnDestroy` → `After Destroy`, porque `Destroy` es síncrono.',
        '`After Destroy` → `OnDisable` → `OnDestroy`',
        '`After Destroy` → `OnDestroy`',
        '`OnDestroy` → `OnDisable` → `After Destroy`'
      ],
      answer: [1],
      explanation: '`Destroy` no es inmediato: marca el objeto y lo destruye después del bucle de Update del frame actual, así que primero se imprime `After Destroy`. Al destruir un objeto activo, Unity llama a `OnDisable` y después a `OnDestroy`. Solo `DestroyImmediate` llamaría a esos métodos antes de la línea siguiente, y se reserva para código de Editor.'
    },
    {
      id: 'scn-28',
      topic: 'Audio',
      q: 'Este `AudioSource` reproduce la música del nivel y también los sonidos de recoger monedas. ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      code: 'void Start()\n{\n    source.clip = music;\n    source.loop = true;\n    source.Play();\n}\n\nvoid OnCoinCollected()\n{\n    source.PlayOneShot(coinClip, 0.5f);\n}',
      options: [
        'La moneda suena encima de la música, sin interrumpirla ni reiniciarla.',
        '`PlayOneShot` asigna `coinClip` a `source.clip` y corta la música.',
        'Como `loop` es `true`, la moneda también se repite en bucle hasta llamar a `Stop()`.',
        'La moneda se oye siempre en 3D, porque `PlayOneShot` fuerza `spatialBlend = 1`.',
        '`0.5f` escala el volumen de la moneda respecto al `volume` de la fuente.'
      ],
      answer: [0, 4],
      explanation: '`PlayOneShot` reproduce un clip extra en la misma fuente sin tocar `clip` ni cortar lo que ya suena, y su segundo parámetro (`volumeScale`) se multiplica por `source.volume`. Los one-shots no hacen bucle y usan la misma configuración espacial de la fuente (`spatialBlend`, rolloff, mixer). Si en lugar de eso hicieras `source.clip = coinClip; source.Play();`, la música se cortaría.'
    },
    {
      id: 'scn-29',
      topic: 'Navegación',
      q: 'Un enemigo con `NavMeshAgent` queda aturdido unos segundos. Al terminar el aturdimiento no vuelve a moverse, aunque `SetDestination` devuelve `true`. ¿Por qué?',
      code: 'public void Stun(float seconds) => StartCoroutine(StunRoutine(seconds));\n\nIEnumerator StunRoutine(float seconds)\n{\n    agent.isStopped = true;\n    yield return new WaitForSeconds(seconds);\n    agent.SetDestination(player.position);\n}',
      options: [
        '`SetDestination` no funciona dentro de corrutinas; hay que llamarlo desde `Update`.',
        '`WaitForSeconds` no termina nunca mientras el agente está detenido.',
        '`isStopped` sigue en `true`; `SetDestination` no lo cambia. Pon `agent.isStopped = false`.',
        'Con `isStopped`, el agente se separa de la NavMesh y necesita `agent.Warp` para volver.'
      ],
      answer: [2],
      explanation: '`isStopped = true` detiene el movimiento del agente por su ruta, y sigue así hasta que lo pongas a `false`. `SetDestination` calcula la nueva ruta, pero no reanuda el agente. Las corrutinas pueden llamar a cualquier API del hilo principal, `WaitForSeconds` depende de `Time.timeScale` (no del agente), y el agente sigue sobre la NavMesh mientras está detenido.'
    },
    {
      id: 'scn-30',
      topic: 'Gestión de assets',
      q: 'Tu juego tendrá 200 skins que se descargarán de un CDN. No deben ir dentro de la build y solo debe cargarse la que elija el jugador. ¿Qué enfoque usas?',
      options: [
        'Un `GameObject[]` con las 200 skins asignadas en el Inspector.',
        'Ponerlas en `Resources` y cargarlas con `Resources.LoadAsync` para no bloquear.',
        'Un campo `AssetReferenceGameObject` en grupos remotos de Addressables.',
        'Ponerlas en `Resources` y llamar a `Resources.UnloadAsset` sobre cada prefab.'
      ],
      answer: [2],
      explanation: 'Un `AssetReference` guarda solo la referencia, no el asset: no se carga hasta que llamas a `LoadAssetAsync` o `InstantiateAsync`, y con grupos remotos los bundles se descargan del CDN. Un array de referencias directas carga las 200 skins junto con la escena. `Resources` siempre va dentro de la build y, además, `Resources.UnloadAsset` no puede descargar GameObjects ni prefabs.'
    }
  ]
});
