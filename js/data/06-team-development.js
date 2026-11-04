UCP.addDomain({
  id: 'team',
  order: 6,
  title: 'Desarrollo en equipo',
  titleEn: 'Working in professional software development teams',
  description: 'Control de versiones, testing y depuración, y estructura de scripts modular, legible y reutilizable.',
  objectives: [
    'Reconocer los conceptos y el impacto del control de versiones con tecnologías como Git (y Unity Version Control).',
    'Demostrar conocimiento del testing de desarrollador y su impacto en el proceso: Unity Test Framework, Profiler y técnicas de depuración tradicionales.',
    'Reconocer técnicas para estructurar scripts de forma modular, legible y reutilizable.'
  ],
  tips: [
    'Se versionan **Assets**, **Packages** y **ProjectSettings** (con todos los `.meta`). No se versionan **Library**, **Temp**, **Obj**, **Logs**, **UserSettings** ni las carpetas de builds.',
    'Los `.meta` guardan el GUID de cada asset: si se pierden, se rompen las referencias en escenas y prefabs.',
    'Configuración para trabajar en equipo: **Asset Serialization = Force Text** y **Version Control = Visible Meta Files**. Para binarios grandes, **Git LFS**. Para resolver conflictos en escenas y prefabs, **UnityYAMLMerge** (Smart Merge).',
    'Tests: **Edit Mode** para lógica pura y rápida (`[Test]`). **Play Mode** cuando necesitas frames, física o corrutinas (`[UnityTest]`, que devuelve `IEnumerator`). Los tests necesitan **Assembly Definitions**.',
    'Orden del ciclo de vida: `Awake` → `OnEnable` → `Start` → `FixedUpdate` → `Update` → `LateUpdate` → ... → `OnDisable` → `OnDestroy`.',
    'Inicializa tus propias referencias en `Awake` y usa las de otros objetos en `Start`.',
    'Diseño: responsabilidad única (componentes pequeños), interfaces (`IDamageable`), eventos para desacoplar, `[SerializeField] private` en lugar de campos públicos, `[RequireComponent]` y namespaces.',
    'Siempre que te suscribas a un evento en `OnEnable`, desuscríbete en `OnDisable`.'
  ],
  questions: [
    {
      id: 'team-01',
      topic: 'Control de versiones',
      q: '¿Qué **tres** carpetas de un proyecto de Unity **deben** estar bajo control de versiones? (Elige 3)',
      options: ['Assets', 'Packages', 'ProjectSettings', 'Library', 'Temp', 'Logs'],
      answer: [0, 1, 2],
      explanation: '`Assets` (con sus `.meta`), `Packages` (`manifest.json` y `packages-lock.json`) y `ProjectSettings` definen el proyecto. `Library`, `Temp` y `Logs` son cachés que Unity regenera, y además son enormes: van en el `.gitignore`.'
    },
    {
      id: 'team-02',
      topic: 'Control de versiones',
      q: 'Un compañero subió nuevos assets pero **no** sus archivos `.meta`. ¿Qué ocurrirá probablemente al hacer pull?',
      options: [
        'Se rompen las referencias en escenas y prefabs, porque Unity genera GUIDs nuevos.',
        'Nada: Unity regenera los `.meta` con los mismos GUIDs a partir del nombre del archivo.',
        'Unity no importa esos assets hasta que alguien suba los `.meta`.',
        'Los assets se importan bien y solo pierden su configuración de compresión.'
      ],
      answer: [0],
      explanation: 'Cada `.meta` contiene el GUID del asset y su configuración de importación. Las escenas y los prefabs hacen referencia a los assets por GUID, no por ruta. Si cada desarrollador genera su propio GUID, las referencias dejan de coincidir.'
    },
    {
      id: 'team-03',
      topic: 'Control de versiones',
      q: '¿Qué configuración del Editor facilita hacer diff y merge de escenas y prefabs en Git?',
      options: [
        'Asset Serialization Mode = **Force Text**.',
        'Asset Serialization Mode = **Force Binary**, que ocupa menos y se fusiona mejor.',
        'Version Control Mode = **Hidden Meta Files**, para que Git ignore los metadatos.',
        'Activar **Enter Play Mode Options** para no recargar el dominio.'
      ],
      answer: [0],
      explanation: 'Con Force Text, escenas, prefabs y ScriptableObjects se guardan en YAML legible, así que Git puede mostrar diferencias y hacer merges. En binario, cualquier conflicto obliga a quedarse con una de las dos versiones.'
    },
    {
      id: 'team-04',
      topic: 'Control de versiones',
      q: 'El repositorio Git crece muchísimo por archivos PSD, WAV y FBX que se modifican a menudo. ¿Qué solución es la más adecuada?',
      options: ['Git LFS (Large File Storage)', 'Subir los archivos comprimidos en ZIP', 'Añadirlos al `.gitignore` y compartirlos por email', 'Hacer `git gc` cada día'],
      answer: [0],
      explanation: 'Git LFS guarda los binarios grandes fuera del historial normal y deja en el repositorio solo un puntero ligero. Así, clonar no implica descargar todas las versiones de cada binario. Además, LFS permite bloquear archivos (`git lfs lock`).'
    },
    {
      id: 'team-05',
      topic: 'Control de versiones',
      q: '¿Qué herramienta incluida con Unity ayuda a resolver conflictos de merge en escenas y prefabs con formato YAML?',
      options: [
        'UnityYAMLMerge (Smart Merge)',
        'Unity Accelerator',
        'Asset Database v2',
        'Unity Build Automation'
      ],
      answer: [0],
      explanation: 'UnityYAMLMerge entiende la estructura de los archivos de Unity y puede fusionar cambios que una herramienta de texto genérica marcaría como conflicto. Se configura como merge tool en Git o en Unity Version Control.'
    },
    {
      id: 'team-06',
      topic: 'Control de versiones',
      q: 'Dos desarrolladores tienen conflictos constantes porque editan la misma escena grande. ¿Qué estrategia los reduce más?',
      options: [
        'Dividir el contenido en **prefabs** y escenas aditivas para que cada uno edite archivos distintos.',
        'Cambiar la serialización de assets a Force Binary para que Git no detecte conflictos.',
        'Trabajar los dos en la misma rama y hacer pull antes de cada commit.',
        'Excluir la escena del control de versiones y compartirla por otra vía.'
      ],
      answer: [0],
      explanation: 'Los conflictos aparecen cuando dos personas modifican el mismo archivo. Los prefabs (incluidos los anidados) y las escenas aditivas reparten el contenido en archivos más pequeños. También ayuda bloquear archivos (*file locking*) en LFS o Unity Version Control.'
    },
    {
      id: 'team-07',
      topic: 'Testing',
      q: 'Quieres comprobar que una función pura `CalculateDamage(attack, armor)` devuelve el valor correcto, de forma rápida y sin entrar en Play Mode. ¿Qué tipo de test usas?',
      options: [
        'Un test de **Edit Mode** con `[Test]`.',
        'Un test de Play Mode con `[UnityTest]`.',
        'Un test manual en Play Mode.',
        'Un test con el Profiler.'
      ],
      answer: [0],
      explanation: 'Los tests de Edit Mode se ejecutan en el Editor sin entrar en Play Mode, así que son muy rápidos. Son ideales para lógica pura que no depende de frames, física ni del ciclo de vida de MonoBehaviour.'
    },
    {
      id: 'team-08',
      topic: 'Testing',
      q: '¿Por qué este test usa `[UnityTest]` en lugar de `[Test]`?',
      code: '[UnityTest]\npublic IEnumerator Rigidbody_FallsWithGravity()\n{\n    var go = new GameObject();\n    go.AddComponent<Rigidbody>();\n    float startY = go.transform.position.y;\n\n    yield return new WaitForSeconds(1f);\n\n    Assert.Less(go.transform.position.y, startY);\n}',
      options: [
        'Porque necesita dejar pasar tiempo y frames con `yield`.',
        'Porque `[Test]` no permite usar `Assert.Less` con valores float.',
        'Porque `[UnityTest]` se ejecuta en un hilo aparte y es más rápido.',
        'Porque los tests con `[Test]` no pueden crear GameObjects.'
      ],
      answer: [0],
      explanation: '`[UnityTest]` se ejecuta como una corrutina: puedes usar `yield return null` (un frame), `WaitForSeconds`, `WaitForFixedUpdate`, etc. Un `[Test]` normal se ejecuta de forma síncrona en una sola llamada. Para la física, este test debe ejecutarse en Play Mode.'
    },
    {
      id: 'team-09',
      topic: 'Testing',
      q: 'Creaste una carpeta de tests con su Assembly Definition, pero los tests no encuentran las clases de tu juego (error de compilación). ¿Cuál es la causa más probable?',
      options: [
        'El código del juego está en `Assembly-CSharp`, y un asmdef no puede referenciarlo.',
        'Los tests deben estar dentro de una carpeta llamada `Editor` para poder compilar.',
        'Las clases del juego deben ser `public static` para que los tests puedan verlas.',
        'Hay que añadir `using NUnit.Framework;` en cada clase del juego.'
      ],
      answer: [0],
      explanation: 'Los scripts sin asmdef se compilan en el ensamblado predefinido `Assembly-CSharp`, que no se puede referenciar desde un asmdef. Lo habitual es tener `MiJuego.asmdef` y `MiJuego.Tests.asmdef`, con el segundo referenciando al primero.'
    },
    {
      id: 'team-10',
      topic: 'Estructura de código',
      q: '¿Cuál es una ventaja principal de usar **Assembly Definitions** en un proyecto grande?',
      options: [
        'Reducen el tiempo de compilación y obligan a declarar las dependencias entre módulos.',
        'Hacen que el código se ejecute más rápido en runtime gracias al compilador Burst.',
        'Reducen el tamaño de la build porque comprimen cada ensamblado por separado.',
        'Permiten que cada carpeta del proyecto use una versión distinta de C#.'
      ],
      answer: [0],
      explanation: 'Sin asmdef, cualquier cambio recompila todo `Assembly-CSharp`. Con asmdefs, el código se divide en ensamblados con dependencias declaradas, lo que también evita referencias circulares y mejora la arquitectura.'
    },
    {
      id: 'team-11',
      topic: 'Depuración',
      q: 'Quieres detener la ejecución en una línea concreta e inspeccionar variables desde Visual Studio o Rider mientras juegas en el Editor. ¿Qué haces?',
      options: [
        'Poner un breakpoint y **adjuntar el depurador** del IDE al Editor de Unity (Attach to Unity).',
        'Añadir `Debug.Break()` en esa línea y revisar las variables en la ventana Console.',
        'Abrir el Frame Debugger y avanzar paso a paso hasta esa línea del script.',
        'Activar Deep Profile y consultar los valores de las variables en el Profiler.'
      ],
      answer: [0],
      explanation: 'Los IDE compatibles pueden adjuntarse al proceso del Editor o de una Development Build (con Script Debugging). En modo Release, Unity optimiza el código y puede que no se detenga en los breakpoints. Para depurar, cambia a Debug desde el icono de la barra de estado.'
    },
    {
      id: 'team-12',
      topic: 'Depuración',
      q: '¿Qué ocurre con las llamadas a `Debug.Log` en una build de release (sin Development Build)?',
      options: [
        'Se siguen ejecutando y tienen coste; para eliminarlas hay que usar, por ejemplo, un wrapper con `[Conditional]`.',
        'El compilador las elimina automáticamente al desactivar Development Build en las Build Settings.',
        'Se ejecutan, pero Unity descarta los argumentos sin evaluarlos, así que no tienen ningún coste.',
        'Solo se ejecutan si hay un depurador conectado; en caso contrario se ignoran.'
      ],
      answer: [0],
      explanation: 'Unity no elimina `Debug.Log` de las builds. Un wrapper con `[System.Diagnostics.Conditional("ENABLE_LOGS")]` hace que el compilador elimine la llamada (y sus argumentos) si no defines ese símbolo. También puedes desactivar el logger con `Debug.unityLogger.logEnabled = false`.'
    },
    {
      id: 'team-13',
      topic: 'Estructura de código',
      q: 'Tienes un `PlayerController` de 2000 líneas que gestiona input, movimiento, vida, sonido y UI. ¿Qué principio aplicarías para refactorizarlo?',
      options: [
        'Dividirlo en componentes con una **responsabilidad única** (`PlayerMovement`, `PlayerHealth`, `PlayerAudio`...).',
        'Convertirlo en una clase `static` para poder acceder a él desde cualquier script.',
        'Moverlo a un ScriptableObject para que no dependa de ningún GameObject de la escena.',
        'Separarlo en varias clases `partial` del mismo `PlayerController` para dividir el archivo.'
      ],
      answer: [0],
      explanation: 'El enfoque por componentes de Unity encaja con el principio de responsabilidad única: piezas pequeñas, testeables y reutilizables (por ejemplo, `Health` también sirve para los enemigos). Facilita además el trabajo en paralelo y reduce los conflictos de merge.'
    },
    {
      id: 'team-14',
      topic: 'Estructura de código',
      q: '¿Qué ventaja tiene este diseño?',
      code: 'public interface IDamageable { void TakeDamage(int amount); }\n\nvoid OnTriggerEnter(Collider other)\n{\n    if (other.TryGetComponent(out IDamageable target))\n        target.TakeDamage(10);\n}',
      options: [
        'Puede dañar a cualquier objeto que implemente `IDamageable`, sin conocer su tipo.',
        'Hace que `OnTriggerEnter` se ejecute antes que el resto de callbacks de física.',
        'Evita tener que añadir colliders a los objetos que reciben daño.',
        'Ninguna: `TryGetComponent` no funciona con interfaces, así que no compila.'
      ],
      answer: [0],
      explanation: 'Programar contra interfaces desacopla los sistemas y facilita añadir nuevos tipos sin tocar el proyectil (principio abierto/cerrado). `GetComponent` y `TryGetComponent` funcionan con interfaces, y `TryGetComponent` no genera basura cuando el componente no existe.'
    },
    {
      id: 'team-15',
      topic: 'Estructura de código',
      q: 'Tras cambiar de escena aparece `MissingReferenceException` dentro de `UpdateUI`. ¿Qué falta?',
      code: 'void OnEnable()\n{\n    GameEvents.OnScoreChanged += UpdateUI; // evento static\n}\n\nvoid UpdateUI(int score)\n{\n    scoreText.text = score.ToString();\n}',
      options: [
        'Desuscribirse en `OnDisable` con `GameEvents.OnScoreChanged -= UpdateUI;`.',
        'Suscribirse en `Start` en lugar de `OnEnable`, que se llama antes de que la escena esté lista.',
        'Comprobar en `UpdateUI` si `GameEvents` es `null` antes de usarlo.',
        'Marcar `scoreText` como `static` para que sobreviva al cambio de escena.'
      ],
      answer: [0],
      explanation: 'Un evento `static` sobrevive a los cambios de escena. Si no te desuscribes, sigue apuntando al método de un componente destruido, y al dispararse accede a su `scoreText`, que ya no existe. Además, evita que el GC libere el objeto C#. El par `OnEnable`/`OnDisable` es el patrón estándar.'
    },
    {
      id: 'team-16',
      topic: 'Estructura de código',
      q: 'Quieres que un campo aparezca en el Inspector, pero que otras clases **no** puedan modificarlo. ¿Cómo lo declaras?',
      options: ['`[SerializeField] private float speed;`', '`public float speed;`', '`[HideInInspector] public float speed;`', '`[NonSerialized] private float speed;`'],
      answer: [0],
      explanation: '`[SerializeField]` hace que Unity serialice y muestre un campo privado, así mantienes la encapsulación. `public` lo expone a todo el código. `[HideInInspector]` lo oculta y `[NonSerialized]` evita que se serialice.'
    },
    {
      id: 'team-17',
      topic: 'Estructura de código',
      q: 'Tu script siempre necesita un `Rigidbody` en el mismo GameObject. ¿Cómo garantizas que esté presente?',
      options: [
        'Añadiendo el atributo `[RequireComponent(typeof(Rigidbody))]` a la clase.',
        'Llamando a `AddComponent<Rigidbody>()` en cada `Update`.',
        'Con un comentario en el código.',
        'Con el atributo `[ExecuteAlways]`.'
      ],
      answer: [0],
      explanation: '`RequireComponent` añade automáticamente el componente al agregar el script y evita que se elimine mientras el script esté presente. Documenta la dependencia y evita errores de configuración.'
    },
    {
      id: 'team-18',
      topic: 'Ciclo de vida',
      q: '`GameManager.Instance` se asigna en el `Awake` de `GameManager`. Otro script accede a `GameManager.Instance` en **su** `Awake` y a veces obtiene `null`. ¿Cuál es la solución recomendada?',
      options: [
        'Acceder a `GameManager.Instance` en `Start` en lugar de en `Awake`.',
        'Llamar manualmente al `Awake` del GameManager antes de usar `Instance`.',
        'Mover la asignación de `Instance` al `Start` del GameManager.',
        'Acceder a `GameManager.Instance` desde `OnValidate`.'
      ],
      answer: [0],
      explanation: 'El orden de `Awake` entre objetos distintos no está garantizado (salvo que uses Script Execution Order). La convención es: en `Awake` inicializa lo tuyo y en `Start` usa lo de otros. Otra opción es ajustar el Script Execution Order o usar `[DefaultExecutionOrder]`.'
    },
    {
      id: 'team-19',
      topic: 'Ciclo de vida',
      q: '¿Cuál es el orden correcto de las primeras llamadas de un MonoBehaviour activo al cargar la escena?',
      options: [
        '`Awake` → `OnEnable` → `Start` → `FixedUpdate` → `Update` → `LateUpdate`',
        '`OnEnable` → `Awake` → `Start` → `Update` → `FixedUpdate` → `LateUpdate`',
        '`Start` → `Awake` → `OnEnable` → `Update` → `LateUpdate` → `FixedUpdate`',
        '`Awake` → `Start` → `OnEnable` → `Update` → `FixedUpdate` → `LateUpdate`'
      ],
      answer: [0],
      explanation: '`Awake` y `OnEnable` se llaman al crear o activar el objeto. `Start` se llama antes del primer frame en que el script se actualiza. En cada frame, la física (`FixedUpdate`, que puede ejecutarse 0 o más veces) va antes de `Update`, y `LateUpdate` va al final.'
    },
    {
      id: 'team-20',
      topic: 'Control de versiones',
      q: '¿Qué flujo de trabajo es el más habitual para integrar funcionalidades en un equipo con revisión de código?',
      options: [
        'Ramas por funcionalidad y **pull requests** con revisión antes de fusionar en main.',
        'Que todos hagan commit directamente en main y revisen el historial cada viernes.',
        'Una rama por desarrollador que se fusiona en main una vez al final del proyecto.',
        'Trabajar sin ramas y resolver los conflictos con `git push --force`.'
      ],
      answer: [0],
      explanation: 'Las ramas por funcionalidad aíslan el trabajo en curso, y los pull requests permiten revisar el código, ejecutar tests automáticos (CI) y mantener estable la rama principal.'
    },
    {
      id: 'team-21',
      topic: 'Estructura de código',
      q: 'Tu clase `Timer` choca con otra clase `Timer` de un asset de la Asset Store y el proyecto no compila. ¿Cuál es la mejor práctica?',
      options: [
        'Meter tu código en un **namespace** propio.',
        'Marcar tu clase como `internal` para que no choque con la del asset.',
        'Mover tu script a la carpeta `Plugins` para que se compile antes.',
        'Hacer tu clase `partial` para que se combine con la del asset.'
      ],
      answer: [0],
      explanation: 'Los namespaces evitan colisiones de nombres y organizan el código por módulos. Es una práctica estándar en equipos y en código reutilizable.'
    },
    {
      id: 'team-22',
      topic: 'Control de versiones',
      q: 'En tu equipo hay artistas que trabajan con muchos binarios grandes y no quieren usar la línea de comandos. ¿Qué ventaja ofrece **Unity Version Control** (antes Plastic SCM)?',
      options: [
        'Permite **bloquear archivos** (*exclusive checkout*) y ofrece un flujo sencillo para artistas (Gluon).',
        'Fusiona automáticamente archivos binarios como PSD o FBX cuando dos personas los editan a la vez.',
        'Guarda los binarios en la carpeta Library, así no ocupan espacio en el servidor.',
        'Evita tener que versionar los archivos `.meta`, porque gestiona los GUIDs por su cuenta.'
      ],
      answer: [0],
      explanation: 'Unity Version Control está pensado para proyectos con muchos assets: integración en el Editor, bloqueo de archivos y un modo para artistas (Gluon) que solo trabaja con los archivos que necesitan. Los binarios como PSD no se pueden fusionar, por eso se bloquean.'
    }
  ]
});
