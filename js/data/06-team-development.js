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
        'Nada: Unity regenera los `.meta` con los mismos GUIDs a partir del nombre.',
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
        'Asset Serialization Mode = **Force Text**, que guarda los assets como YAML.',
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
        'Unity Accelerator (servidor de caché)',
        'Asset Database v2 (importador de assets)',
        'Unity Build Automation (Cloud Build)'
      ],
      answer: [0],
      explanation: 'UnityYAMLMerge entiende la estructura de los archivos de Unity y puede fusionar cambios que una herramienta de texto genérica marcaría como conflicto. Se configura como merge tool en Git o en Unity Version Control.'
    },
    {
      id: 'team-06',
      topic: 'Control de versiones',
      q: 'Dos desarrolladores tienen conflictos constantes porque editan la misma escena grande. ¿Qué estrategia los reduce más?',
      options: [
        'Dividir la escena en **prefabs** y escenas aditivas que se editen por separado.',
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
        'Porque necesita dejar pasar tiempo y frames usando `yield`.',
        'Porque `[Test]` no permite usar `Assert.Less` con valores float.',
        'Porque `[UnityTest]` se ejecuta en un hilo aparte y es más rápido.',
        'Porque los tests con `[Test]` no pueden crear GameObjects nuevos.'
      ],
      answer: [0],
      explanation: '`[UnityTest]` se ejecuta como una corrutina: puedes usar `yield return null` (un frame), `WaitForSeconds`, `WaitForFixedUpdate`, etc. Un `[Test]` normal se ejecuta de forma síncrona en una sola llamada. Para la física, este test debe ejecutarse en Play Mode.'
    },
    {
      id: 'team-09',
      topic: 'Testing',
      q: 'Creaste una carpeta de tests con su Assembly Definition, pero los tests no encuentran las clases de tu juego (error de compilación). ¿Cuál es la causa más probable?',
      options: [
        'El juego se compila en `Assembly-CSharp`, que un asmdef no puede referenciar: dale su propio asmdef.',
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
        'Compilan más rápido y obligan a declarar las dependencias entre módulos.',
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
        'Poner un breakpoint y **adjuntar el depurador** del IDE al Editor (Attach to Unity).',
        'Añadir `Debug.Break()` en esa línea y revisar las variables en la ventana Console.',
        'Abrir el Frame Debugger y avanzar paso a paso hasta esa línea del script.',
        'Activar Deep Profile y consultar el valor de cada variable en la ventana del Profiler.'
      ],
      answer: [0],
      explanation: 'Los IDE compatibles pueden adjuntarse al proceso del Editor o de una Development Build (con Script Debugging). En modo Release, Unity optimiza el código y puede que no se detenga en los breakpoints. Para depurar, cambia a Debug desde el icono de la barra de estado.'
    },
    {
      id: 'team-12',
      topic: 'Depuración',
      q: '¿Qué ocurre con las llamadas a `Debug.Log` en una build de release (sin Development Build)?',
      options: [
        'Se siguen ejecutando y cuestan; para quitarlas, usa un wrapper con `[Conditional]`.',
        'El compilador las elimina automáticamente al desactivar Development Build en el Build Profile.',
        'Se ejecutan, pero Unity descarta los argumentos sin evaluarlos, así que no tienen ningún coste.',
        'Solo se ejecutan si hay un depurador conectado; en caso contrario se ignoran.'
      ],
      answer: [0],
      explanation: 'Unity no elimina `Debug.Log` de las builds. Un wrapper con `[System.Diagnostics.Conditional("ENABLE_LOGS")]` hace que el compilador elimine la llamada (y sus argumentos) si no defines ese símbolo. `Debug.unityLogger.logEnabled = false` desactiva la salida del log, pero las llamadas (y la construcción de sus strings) se siguen ejecutando.'
    },
    {
      id: 'team-13',
      topic: 'Estructura de código',
      q: 'Tienes un `PlayerController` de 2000 líneas que gestiona input, movimiento, vida, sonido y UI. ¿Qué principio aplicarías para refactorizarlo?',
      options: [
        'Dividirlo en componentes de **responsabilidad única** (`PlayerMovement`, `PlayerHealth`...).',
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
        'Daña a cualquier `IDamageable` sin conocer su tipo concreto.',
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
      code: 'void OnEnable()\n{\n    GameEvents.OnScoreChanged += UpdateUI; // static event\n}\n\nvoid UpdateUI(int score)\n{\n    scoreText.text = score.ToString();\n}',
      options: [
        'Desuscribirse en `OnDisable` con `GameEvents.OnScoreChanged -= UpdateUI;`.',
        'Suscribirse en `Start` en lugar de en `OnEnable`.',
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
      options: ['`[SerializeField] private float speed;`', '`public float speed;`', '`[HideInInspector] [SerializeField] float speed;`', '`[NonSerialized] private float speed;`'],
      answer: [0],
      explanation: '`[SerializeField]` hace que Unity serialice y muestre un campo privado, así mantienes la encapsulación. `public` lo expone a todo el código. `[HideInInspector]` lo oculta del Inspector aunque el campo esté serializado, y `[NonSerialized]` evita que se serialice.'
    },
    {
      id: 'team-17',
      topic: 'Estructura de código',
      q: 'Tu script siempre necesita un `Rigidbody` en el mismo GameObject. ¿Cómo garantizas que esté presente?',
      options: [
        'Con el atributo `[RequireComponent(typeof(Rigidbody))]` en la clase.',
        'Llamando a `AddComponent<Rigidbody>()` en cada `Update`.',
        'Con un comentario en el código que avise de la dependencia.',
        'Con el atributo `[ExecuteAlways]` en la clase.'
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
        'Usar un **namespace** propio, como `MiEstudio.Gameplay`.',
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
    },
    {
      id: 'team-23',
      topic: 'Estructura de código',
      q: 'En Unity 6 quieres esperar 2 segundos dentro de un método `async` de un MonoBehaviour, sin corrutinas y respetando el ciclo de vida de Unity. ¿Qué usas?',
      code: 'async void Start()\n{\n    // wait 2 seconds\n    ???\n    SpawnBoss();\n}',
      options: [
        '`await Awaitable.WaitForSecondsAsync(2f);`',
        '`await Task.Delay(TimeSpan.FromSeconds(2));`',
        '`yield return new WaitForSeconds(2f);`',
        '`Thread.Sleep(TimeSpan.FromSeconds(2));`'
      ],
      answer: [0],
      explanation: '`Awaitable` (Unity 2023.1+ / Unity 6) se integra con el player loop: respeta `Time.timeScale` y vuelve al hilo principal. Además, puedes pasarle `destroyCancellationToken` como segundo argumento para que se cancele si el objeto se destruye. `Task.Delay` no sabe nada de Unity (sigue aunque salgas de Play Mode y no funciona bien en WebGL), `yield return` solo vale en corrutinas y `Thread.Sleep` congela el juego.'
    },
    {
      id: 'team-24',
      topic: 'Ciclo de vida',
      q: 'En la escena, el GameObject está **activo**, pero el componente `Probe` está **desactivado** (casilla desmarcada en el Inspector). ¿Qué se imprime al cargar la escena?',
      code: 'public class Probe : MonoBehaviour\n{\n    void Awake()     { Debug.Log("Awake"); }\n    void OnEnable()  { Debug.Log("OnEnable"); }\n    void Start()     { Debug.Log("Start"); }\n    void OnDisable() { Debug.Log("OnDisable"); }\n}',
      options: [
        'Solo `Awake`; el resto espera a que se active el componente.',
        '`Awake` y `OnEnable`; solo `Start` espera a que se active el componente.',
        'Nada: un componente desactivado no recibe ningún mensaje de Unity.',
        '`Awake`, `OnEnable` y `Start`, porque el GameObject está activo.'
      ],
      answer: [0],
      explanation: '`Awake` se llama al cargar la escena siempre que el **GameObject** esté activo, aunque el componente esté desactivado. `OnEnable` y `Start` dependen del componente: cuando otro script haga `probe.enabled = true`, se llamará a `OnEnable` en ese momento y a `Start` justo antes del primer `Update` del script. `OnDisable` no aparece porque el componente nunca llegó a activarse. Si el GameObject estuviera inactivo, ni siquiera se llamaría a `Awake`.'
    },
    {
      id: 'team-25',
      topic: 'Ciclo de vida',
      q: 'Tu `InputManager` inicializa en `Awake` unos datos que otros scripts leen en **su** `Awake`. Necesitas que el `Awake` de `InputManager` se ejecute siempre antes. ¿Qué **dos** opciones lo garantizan? (Elige 2)',
      options: [
        'Añadir el atributo `[DefaultExecutionOrder(-100)]` a la clase `InputManager`.',
        'Darle un valor negativo en **Project Settings > Script Execution Order**.',
        'Colocar el GameObject de `InputManager` el primero de la Hierarchy.',
        'Mover la inicialización a `OnEnable`, que se llama antes que cualquier `Awake`.',
        'Marcar la clase con `[ExecuteAlways]` para que se inicialice antes que las demás.'
      ],
      answer: [0, 1],
      explanation: 'El Script Execution Order (en Project Settings o con `[DefaultExecutionOrder]`) define en qué orden reciben los scripts `Awake`, `OnEnable`, `Update`, etc.: los valores más bajos (negativos) se ejecutan antes que el grupo *Default Time*. El orden de la Hierarchy no está garantizado. `OnEnable` se llama justo después del `Awake` del **mismo** objeto, no antes de todos los `Awake`, y `[ExecuteAlways]` solo hace que el script también se ejecute en Edit Mode.'
    },
    {
      id: 'team-26',
      topic: 'Ciclo de vida',
      q: 'Quieres hacer una captura de pantalla con `ReadPixels` cuando la cámara y la UI ya se han renderizado en el frame actual. ¿Qué línea va en `???`?',
      code: 'IEnumerator CaptureScreen()\n{\n    ???\n    var tex = new Texture2D(Screen.width, Screen.height, TextureFormat.RGB24, false);\n    tex.ReadPixels(new Rect(0, 0, Screen.width, Screen.height), 0, 0);\n    tex.Apply();\n}',
      options: [
        '`yield return new WaitForEndOfFrame();`',
        '`yield return null;`',
        '`yield return new WaitForFixedUpdate();`',
        '`yield return new WaitForSeconds(0.1f);`'
      ],
      answer: [0],
      explanation: '`WaitForEndOfFrame` reanuda la corrutina al final del frame, cuando todas las cámaras y la UI ya se han renderizado y justo antes de mostrar la imagen: es el momento de leer la pantalla. `yield return null` y `WaitForSeconds` reanudan después de `Update`, antes de renderizar. `WaitForFixedUpdate` reanuda tras el paso de física, que es el momento adecuado para aplicar fuerzas, no para leer píxeles.'
    },
    {
      id: 'team-27',
      topic: 'Depuración',
      q: 'Llamas a este código en `Start` para comprobar hacia dónde mira un enemigo. En la ventana Game no ves nada, y en la vista Scene la línea apenas aparece un instante. ¿Qué **dos** hechos lo explican? (Elige 2)',
      code: 'void Start()\n{\n    Debug.DrawRay(transform.position, transform.forward * 10f, Color.red);\n}',
      options: [
        'Sin el parámetro `duration` (0 por defecto), la línea solo dura un frame.',
        'Las líneas de `Debug.DrawRay` se ven en Scene; en Game, solo si activas Gizmos.',
        '`Debug.DrawRay` solo dibuja si se llama desde `OnDrawGizmos`.',
        'El rayo tiene que impactar en un Collider para que se dibuje la línea.',
        '`Debug.Draw*` solo funciona en una Development Build, no en el Editor.'
      ],
      answer: [0, 1],
      explanation: 'Con `duration` = 0, la línea se dibuja durante un solo frame, y como `Start` se ejecuta una vez, apenas se ve. Usa `Debug.DrawRay(origen, dir, color, 5f)` o llámalo en `Update`. Además, `Debug.DrawLine` y `Debug.DrawRay` se dibujan en la vista Scene, y en la ventana Game solo si el botón **Gizmos** está activado. `OnDrawGizmos` es para la API `Gizmos` (`Gizmos.DrawRay`), y `Debug.DrawRay` no hace ningún raycast, así que no necesita colliders. Estas líneas son una ayuda del Editor: no se ven en las builds.'
    },
    {
      id: 'team-28',
      topic: 'Depuración',
      q: 'Con la configuración por defecto de la Console, un compañero llama a `TakeDamage(-5)` mientras juega en el Editor. ¿Qué **dos** cosas ocurren? (Elige 2)',
      code: 'int health = 100;\n\npublic void TakeDamage(int amount)\n{\n    Debug.Assert(amount >= 0, "Negative damage");\n    health -= amount;\n}',
      options: [
        'Aparece en la Console un mensaje de error de tipo assert con el texto indicado.',
        'El método sigue ejecutándose y `health` pasa a valer 105.',
        'Se lanza una excepción y `health` se queda en 100.',
        'El Editor entra en pausa automáticamente, como con `Debug.Break()`.',
        'No pasa nada: `Debug.Assert` solo se evalúa en las builds de release.'
      ],
      answer: [0, 1],
      explanation: '`Debug.Assert` registra un mensaje de tipo `LogType.Assert` (se muestra como error) cuando la condición es falsa, pero **no** lanza ninguna excepción ni detiene el método, así que `health` queda en 105. Tampoco pausa el Editor: eso lo hace `Debug.Break()`, o la opción *Error Pause* de la Console si la activas. Y es al revés de lo que dice la última opción: los asserts se comprueban en el Editor y en las Development Builds (símbolo `UNITY_ASSERTIONS`), y se eliminan de las builds de release.'
    },
    {
      id: 'team-29',
      topic: 'Testing',
      q: '`CalculateDamage` debe devolver `attack - armor`. ¿Qué línea completa el test siguiendo la convención de NUnit, para que el mensaje de fallo muestre bien el valor esperado y el real?',
      code: '[Test]\npublic void CalculateDamage_ArmorReducesDamage()\n{\n    var calc = new DamageCalculator();\n    int result = calc.CalculateDamage(attack: 50, armor: 20);\n    ???\n}',
      options: [
        '`Assert.AreEqual(30, result);`',
        '`Assert.AreEqual(result, 30);`',
        '`Assert.Equals(30, result);`',
        '`Assert.IsTrue(result.Equals("30"));`'
      ],
      answer: [0],
      explanation: 'La firma es `Assert.AreEqual(expected, actual)`: primero el valor esperado y después el real. Con los argumentos al revés el test pasa o falla igual, pero si `result` valiera 25, el mensaje diría *Expected: 25 But was: 30* y confundiría a quien lo lea. `Assert.Equals` es el `Equals` heredado de `object` y NUnit lo bloquea: lanza `InvalidOperationException`. `result.Equals("30")` compara un `int` con un `string`, así que siempre es `false`.'
    },
    {
      id: 'team-30',
      topic: 'Testing',
      q: '`Load` registra `Debug.LogError("Save not found")` cuando el archivo no existe, que es justo lo que quieres comprobar. Sin embargo, el test falla. ¿Qué línea, colocada **antes** de llamar a `Load`, hace que pase y además verifique ese error?',
      code: '[Test]\npublic void Load_MissingFile_LogsError()\n{\n    var loader = new SaveLoader();\n    loader.Load("missing.json");\n}',
      options: [
        '`LogAssert.Expect(LogType.Error, "Save not found");`',
        '`LogAssert.ignoreFailingMessages = false;`',
        '`Assert.Throws<Exception>(() => loader.Load("missing.json"));`',
        '`LogAssert.NoUnexpectedReceived();`'
      ],
      answer: [0],
      explanation: 'Unity Test Framework hace fallar cualquier test que registre un error, un assert o una excepción **no esperados**. `LogAssert.Expect` declara ese mensaje como esperado: el test pasa si aparece y falla si no aparece. `ignoreFailingMessages = false` es el valor por defecto (con `true` el test pasaría, pero sin comprobar nada). `NoUnexpectedReceived` solo comprueba que no haya mensajes inesperados hasta ese punto, y `Assert.Throws` falla porque `Load` no lanza ninguna excepción.'
    },
    {
      id: 'team-31',
      topic: 'Testing',
      q: 'Tu equipo empieza a usar Unity Test Framework. ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      options: [
        'Un `[UnityTest]` devuelve `IEnumerator`; con `yield return null` espera un frame.',
        'Los tests de Play Mode se pueden ejecutar en el Editor o en una build en el dispositivo.',
        'Un `[Test]` de Edit Mode puede esperar un segundo con `yield return new WaitForSeconds(1f)`.',
        'Un método con `[SetUp]` se ejecuta una sola vez antes de todos los tests de la clase.',
        'La asmdef de los tests de Edit Mode debe incluir todas las plataformas, no solo Editor.'
      ],
      answer: [0, 1],
      explanation: '`[UnityTest]` se ejecuta como una corrutina, así que puede usar `yield` para dejar pasar frames. Los tests de Play Mode pueden ejecutarse en el Editor o compilarse en una build del reproductor (por ejemplo, para Android) desde el Test Runner. Un `[Test]` es un método `void` síncrono y no puede usar `yield`. `[SetUp]` se ejecuta antes de **cada** test (para una sola vez existe `[OneTimeSetUp]`), y la asmdef de los tests de Edit Mode debe tener **solo** la plataforma Editor.'
    },
    {
      id: 'team-32',
      topic: 'Estructura de código',
      q: '`Door` llama a `doorOpened.Raise()` cuando se abre. ¿Cuál es la principal ventaja de este diseño frente a que `Door` tenga una referencia directa a `DoorUI`?',
      code: '[CreateAssetMenu]\npublic class VoidEventChannel : ScriptableObject\n{\n    public event Action OnRaised;\n    public void Raise() => OnRaised?.Invoke();\n}\n\npublic class DoorUI : MonoBehaviour\n{\n    [SerializeField] VoidEventChannel doorOpened;\n\n    void OnEnable()  => doorOpened.OnRaised += Show;\n    void OnDisable() => doorOpened.OnRaised -= Show;\n    void Show() { /* show the "Door open" message */ }\n}',
      options: [
        '`Door` y `DoorUI` no se referencian entre sí: solo comparten el asset del canal de eventos.',
        'Las suscripciones al evento se guardan en el asset y persisten entre sesiones.',
        '`OnRaised` se invoca en otro hilo, así que la UI nunca bloquea el juego.',
        'Como el canal es un asset, ya no hace falta desuscribirse en `OnDisable`.'
      ],
      answer: [0],
      explanation: 'El ScriptableObject actúa como canal de eventos: el emisor y los oyentes solo dependen del asset, así que puedes probar, reutilizar o sustituir cada parte por separado, incluso si están en escenas o prefabs distintos. Los suscriptores de un `event` no se serializan, `Invoke` se ejecuta de forma síncrona en el mismo hilo, y precisamente porque el asset vive más que la escena hay que desuscribirse en `OnDisable` para no dejar referencias a objetos destruidos.'
    },
    {
      id: 'team-33',
      topic: 'Control de versiones',
      q: 'Instalaste Git LFS (`git lfs install`) en el repositorio, pero los nuevos `.psd` se siguen guardando enteros en el historial normal de Git. ¿Qué falta?',
      options: [
        'Registrar el patrón con `git lfs track "*.psd"` y versionar `.gitattributes`.',
        'Añadir `*.psd` al `.gitignore` para que Git delegue esos archivos en el almacenamiento LFS.',
        'Cambiar Asset Serialization a Force Binary para que LFS reconozca los PSD.',
        'Ejecutar `git gc --aggressive` para que Git mueva los PSD al almacenamiento LFS.'
      ],
      answer: [0],
      explanation: '`git lfs install` solo configura los hooks de LFS. Para que un tipo de archivo vaya a LFS hay que registrarlo con `git lfs track`, que escribe la regla en `.gitattributes`. Ese archivo debe versionarse para que todo el equipo use las mismas reglas. Los archivos que ya estaban en el historial no cambian (habría que migrarlos con `git lfs migrate`). `.gitignore` saca los archivos de Git por completo, y la serialización de assets no afecta a los PSD.'
    }
  ]
});
