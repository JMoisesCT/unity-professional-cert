UCP.addDomain({
  id: 'systems',
  order: 3,
  title: 'Sistemas de aplicación',
  titleEn: 'Developing application systems',
  description: 'Menús y flujo de interfaz, navegación de UI, ajustes de la aplicación, personalización, progresión del jugador y persistencia de datos.',
  objectives: [
    'Interpretar scripts del flujo de la interfaz: menús, navegación de UI y ajustes de la aplicación.',
    'Programar opciones de personalización controladas por el usuario.',
    'Implementar la progresión del usuario (experiencia, niveles, logros).',
    'Crear y gestionar elementos de UI (uGUI y UI Toolkit).',
    'Implementar la persistencia de datos (PlayerPrefs, JSON, archivos).'
  ],
  tips: [
    '`PlayerPrefs` solo guarda `int`, `float` y `string`. Úsalo para ajustes, no para partidas ni datos sensibles.',
    '`JsonUtility` serializa campos **públicos** o con `[SerializeField]` de clases `[Serializable]`. **No** serializa propiedades, diccionarios ni tipos genéricos de primer nivel.',
    'Guarda las partidas en `Application.persistentDataPath`. `dataPath` y `streamingAssetsPath` pueden ser de solo lectura en la build.',
    'Pausa con `Time.timeScale = 0`: `Update` sigue ejecutándose, `FixedUpdate` deja de ejecutarse y `WaitForSeconds` se congela. Para la UI de pausa usa tiempo **unscaled**.',
    'Con `allowSceneActivation = false`, `AsyncOperation.progress` se detiene en **0.9**.',
    'Lambdas dentro de un `for`: copia el índice a una variable local antes de capturarlo.',
    'Volumen del AudioMixer: convierte el valor del slider con `Mathf.Log10(valor) * 20`, y recuerda **exponer** el parámetro.',
    'Navegación con mando: al abrir un menú, selecciona el primer botón con `EventSystem.current.SetSelectedGameObject(...)`.'
  ],
  questions: [
    {
      id: 'sys-01',
      topic: 'Persistencia',
      q: '¿Qué tipo de dato **NO** puede guardarse directamente con `PlayerPrefs`?',
      options: ['`int`', '`float`', '`string`', '`bool`'],
      answer: [3],
      explanation: '`PlayerPrefs` solo tiene `SetInt/GetInt`, `SetFloat/GetFloat` y `SetString/GetString`. Un bool se suele guardar como int (0/1). Además, PlayerPrefs no es seguro (en Windows se guarda en el registro) y no sirve para datos complejos.'
    },
    {
      id: 'sys-02',
      topic: 'Persistencia',
      q: '¿Qué datos aparecerán en el JSON generado?',
      code: '[System.Serializable]\npublic class SaveData\n{\n    public int level;\n    public Dictionary<string, int> inventory = new();\n    public float Health { get; set; }\n}\n\nstring json = JsonUtility.ToJson(data);',
      options: [
        '`level`, `inventory` y `Health`.',
        'Solo `level`.',
        '`level` y `Health`.',
        'Nada: `JsonUtility` lanza una excepción por el diccionario.'
      ],
      answer: [1],
      explanation: '`JsonUtility` usa las mismas reglas que el serializador de Unity: no serializa `Dictionary` (se ignora sin error) ni propiedades. Para el diccionario puedes usar dos listas o una lista de pares serializables, o una librería como Newtonsoft Json.'
    },
    {
      id: 'sys-03',
      topic: 'Persistencia',
      q: '¿Qué ruta deberías usar para guardar el archivo de partida en todas las plataformas (incluidos móviles)?',
      options: [
        '`Application.dataPath`',
        '`Application.streamingAssetsPath`',
        '`Application.persistentDataPath`',
        '`Application.temporaryCachePath`'
      ],
      answer: [2],
      explanation: '`persistentDataPath` apunta a una carpeta con permisos de escritura que se conserva entre sesiones y actualizaciones. `dataPath` y `streamingAssetsPath` pueden ser de solo lectura (en Android, StreamingAssets está dentro del APK), y el sistema operativo puede vaciar `temporaryCachePath`.'
    },
    {
      id: 'sys-04',
      topic: 'Pausa y tiempo',
      q: 'Pausas el juego con `Time.timeScale = 0f`. ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      options: [
        '`Update` se sigue llamando en cada frame.',
        '`FixedUpdate` deja de ejecutarse.',
        'Las corrutinas con `WaitForSeconds` siguen avanzando con normalidad.',
        '`Time.unscaledDeltaTime` también pasa a ser 0.'
      ],
      answer: [0, 1],
      explanation: 'Con timeScale 0, `Time.deltaTime` vale 0 pero `Update` se sigue ejecutando (por eso puedes leer el input del menú de pausa). La física (`FixedUpdate`) se detiene. `WaitForSeconds` usa tiempo escalado y se congela; `WaitForSecondsRealtime` y `unscaledDeltaTime` no se ven afectados.'
    },
    {
      id: 'sys-05',
      topic: 'Pausa y tiempo',
      q: 'El menú de pausa tiene animaciones hechas con un `Animator`, pero no se mueven cuando `Time.timeScale = 0`. ¿Cuál es la solución más directa?',
      options: [
        'Poner el **Update Mode** del Animator en `Unscaled Time`.',
        'Poner `Time.timeScale = 0.0001f` en lugar de 0.',
        'Llamar a mano a `animator.Update(Time.deltaTime)`.',
        'Mover las animaciones a `FixedUpdate`.'
      ],
      answer: [0],
      explanation: 'Con Update Mode en `Unscaled Time`, el Animator avanza con el tiempo real e ignora timeScale. Llamar a `animator.Update(Time.deltaTime)` no sirve porque `deltaTime` vale 0. En corrutinas o tweens de UI usa `unscaledDeltaTime` o `WaitForSecondsRealtime`.'
    },
    {
      id: 'sys-06',
      topic: 'Escenas',
      q: 'Esta pantalla de carga nunca termina. ¿Por qué?',
      code: 'IEnumerator Load()\n{\n    AsyncOperation op = SceneManager.LoadSceneAsync("Level2");\n    op.allowSceneActivation = false;\n\n    while (op.progress < 1f)\n        yield return null;\n\n    op.allowSceneActivation = true;\n}',
      options: [
        'Con `allowSceneActivation = false`, `progress` se queda en 0.9.',
        '`LoadSceneAsync` no se puede esperar dentro de una corrutina con `yield return null`.',
        'Falta `yield return op;` antes del bucle para iniciar la carga.',
        'La escena debe cargarse en modo Additive para que `progress` llegue a 1.'
      ],
      answer: [0],
      explanation: 'La carga llega hasta 0.9 y espera a que se active la escena (el último 10 % es la activación). La condición correcta es `while (op.progress < 0.9f)`, y para mostrar el porcentaje puedes usar `Mathf.Clamp01(op.progress / 0.9f)`.'
    },
    {
      id: 'sys-07',
      topic: 'Escenas',
      q: 'Al volver al menú principal, que tiene su propio `GameManager` en la escena, acabas con **dos** GameManager. ¿Cómo lo arreglas?',
      code: 'public class GameManager : MonoBehaviour\n{\n    public static GameManager Instance;\n\n    void Awake()\n    {\n        Instance = this;\n        DontDestroyOnLoad(gameObject);\n    }\n}',
      options: [
        'En `Awake`, si ya existe otra `Instance`, destruir este objeto y salir con `return`.',
        'Mover el código de `Awake` a `Start`, que se ejecuta más tarde.',
        'Llamar a `DontDestroyOnLoad` en `OnDestroy` en lugar de en `Awake`.',
        'Asignar `Instance = this` en `OnEnable` en lugar de en `Awake`.'
      ],
      answer: [0],
      explanation: 'Es el patrón Singleton con persistencia: la primera instancia sobrevive con `DontDestroyOnLoad` y las siguientes se destruyen en su `Awake`. Mover el código a `Start` u `OnEnable` no evita el duplicado: el segundo objeto sigue existiendo y además sobrescribe `Instance`.'
    },
    {
      id: 'sys-08',
      topic: 'UI',
      q: 'Con este código, todos los botones cargan el mismo nivel (el índice `buttons.Length`, que no existe). ¿Por qué?',
      code: 'for (int i = 0; i < buttons.Length; i++)\n{\n    buttons[i].onClick.AddListener(() => SelectLevel(i));\n}',
      options: [
        'La lambda captura la variable `i` (no su valor); cópiala a una variable local.',
        '`AddListener` no acepta lambdas con parámetros, así que ignora el valor de `i`.',
        'Los listeners se acumulan; hay que llamar a `RemoveAllListeners` antes del bucle.',
        'Todos los botones comparten el mismo `onClick` porque son instancias del mismo prefab.'
      ],
      answer: [0],
      explanation: 'En C#, la variable de un `for` es una sola para todo el bucle, así que todas las lambdas comparten la misma. Copiarla a una variable local dentro del cuerpo crea una variable nueva en cada iteración. (Con `foreach`, desde C# 5 cada iteración tiene su propia variable.)'
    },
    {
      id: 'sys-09',
      topic: 'UI',
      q: 'La UI debe verse proporcionada en móviles y monitores de distintas resoluciones. ¿Qué configuración del **Canvas Scaler** es la más habitual?',
      options: ['Constant Pixel Size', 'Scale With Screen Size', 'Constant Physical Size', 'Cambiar el Canvas a World Space'],
      answer: [1],
      explanation: '**Scale With Screen Size** escala la UI respecto a una resolución de referencia (**Reference Resolution**), y con **Match** eliges si se adapta al ancho, al alto o a una mezcla. Combínalo con anchors bien configurados.'
    },
    {
      id: 'sys-10',
      topic: 'UI',
      q: 'Un botón de pausa debe quedarse siempre en la esquina superior derecha, con cualquier resolución o relación de aspecto. ¿Qué configuras en su `RectTransform`?',
      options: [
        'Los **anchors** (y el pivot) en la esquina superior derecha.',
        'Su posición en píxeles, recalculada en cada `Update` según `Screen.width`.',
        'Un `ContentSizeFitter` en el botón con ajuste Preferred Size.',
        'El Render Mode del Canvas en Screen Space - Camera.'
      ],
      answer: [0],
      explanation: 'Los anchors definen respecto a qué punto del padre se posiciona el elemento. Anclado arriba a la derecha, mantiene la misma distancia a esa esquina aunque cambie el tamaño de la pantalla. Recalcular la posición en `Update` es frágil y costoso, `ContentSizeFitter` solo ajusta el tamaño y el Render Mode no cambia el anclaje.'
    },
    {
      id: 'sys-11',
      topic: 'UI',
      q: 'En una escena nueva creas un Canvas con botones desde código, pero los botones no responden a clics ni toques. ¿Qué componente falta casi siempre?',
      options: ['Un `EventSystem` (con su Input Module) en la escena', 'Un `BoxCollider2D` en cada botón para detectar el clic', 'Un `AudioListener` en la cámara principal', 'Un `CanvasRenderer` en el propio Canvas'],
      answer: [0],
      explanation: 'El `EventSystem` y su Input Module (`StandaloneInputModule` o `InputSystemUIInputModule`) reciben el input y lo envían a la UI a través del `GraphicRaycaster` del Canvas. Cuando creas un Canvas desde el menú, Unity añade el EventSystem automáticamente, pero no cuando lo haces por código. La UI no usa colliders: el raycast lo hace el `GraphicRaycaster` sobre los gráficos.'
    },
    {
      id: 'sys-12',
      topic: 'UI',
      q: 'Quieres ocultar un panel con un fundido y que, mientras esté invisible, **no bloquee los clics** a lo que hay detrás. ¿Qué usas?',
      options: [
        'Un `CanvasGroup`, animando `alpha` y desactivando `blocksRaycasts`.',
        '`gameObject.SetActive(false)` al empezar el fundido, para que deje de bloquear clics.',
        'Animar hasta 0 el alfa del color del `Image` del panel, para que deje de recibir clics.',
        'Mover el panel a otro Canvas con un `sortingOrder` más bajo durante el fundido.'
      ],
      answer: [0],
      explanation: '`CanvasGroup` controla la transparencia y la interacción de todo un grupo de elementos. Bajar el alfa de una `Image` la hace invisible, pero sigue bloqueando raycasts. `SetActive(false)` lo oculta de golpe, sin fundido.'
    },
    {
      id: 'sys-13',
      topic: 'Ajustes',
      q: 'Un slider de volumen va de 0.0001 a 1. ¿Qué expresión convierte su valor en decibelios para `AudioMixer.SetFloat`?',
      code: 'public void SetMusicVolume(float sliderValue)\n{\n    mixer.SetFloat("MusicVolume", /* ? */);\n}',
      options: [
        '`Mathf.Lerp(-80f, 0f, sliderValue)`',
        '`Mathf.Log10(sliderValue) * 20f`',
        '`sliderValue`',
        '`Mathf.Pow(10f, sliderValue / 20f)`'
      ],
      answer: [1],
      explanation: 'El AudioMixer trabaja en decibelios (de -80 dB a 0 dB normalmente), y el oído percibe el volumen de forma logarítmica. `Log10(v) * 20` convierte 1 en 0 dB y 0.0001 en -80 dB. El mínimo es 0.0001 porque `Log10(0)` es -infinito. `Lerp` hace un mapeo lineal (el volumen apenas cambia en la mitad alta del slider) y `Pow(10, x / 20)` es la conversión inversa, de dB a valor lineal.'
    },
    {
      id: 'sys-14',
      topic: 'Ajustes',
      q: '`mixer.SetFloat("MusicVolume", -10f)` devuelve `false` y el volumen no cambia. ¿Cuál es la causa más probable?',
      options: [
        'El parámetro no está **expuesto** (Expose to script) o el nombre no coincide.',
        'Hay que llamar a `mixer.Apply()` después de `SetFloat`.',
        'El AudioMixer solo acepta valores entre 0 y 1, no decibelios negativos.',
        '`SetFloat` solo funciona si el AudioMixer está asignado a un `AudioListener`.'
      ],
      answer: [0],
      explanation: 'Para controlar una propiedad del mixer desde código, hay que hacer clic derecho sobre ella > **Expose to script** y renombrarla en la lista Exposed Parameters. `SetFloat` devuelve `false` si no encuentra el parámetro.'
    },
    {
      id: 'sys-15',
      topic: 'UI',
      q: 'Al abrir el menú de pausa jugando con mando, ningún botón aparece seleccionado y no se puede navegar. ¿Qué deberías hacer al abrir el menú?',
      options: [
        '`EventSystem.current.SetSelectedGameObject(firstButton);`',
        '`firstButton.GetComponent<Button>().onClick.Invoke();`',
        '`Cursor.lockState = CursorLockMode.None; Cursor.visible = true;`',
        'Activar **Raycast Target** en el `Image` de todos los botones del menú.'
      ],
      answer: [0],
      explanation: 'La navegación con mando o teclado necesita un elemento seleccionado como punto de partida. Asignarlo al abrir el menú (y configurar la **Navigation** de los Selectables) permite moverse con el stick. `onClick.Invoke()` haría clic en el botón, el cursor solo afecta al ratón y **Raycast Target** solo influye en los clics y toques.'
    },
    {
      id: 'sys-16',
      topic: 'Ajustes',
      q: 'En el menú de opciones quieres un selector de "Calidad gráfica" que cambie entre los presets Low, Medium y High definidos en Project Settings. ¿Qué API usas?',
      options: [
        '`Screen.SetResolution`',
        '`QualitySettings.SetQualityLevel(index, true)`',
        '`Application.targetFrameRate`',
        '`GraphicsSettings.defaultRenderPipeline = null`'
      ],
      answer: [1],
      explanation: '`QualitySettings.SetQualityLevel` aplica uno de los niveles de Project Settings > Quality. El segundo parámetro (`applyExpensiveChanges`) aplica también los cambios costosos, como el antialiasing. Guarda la elección en `PlayerPrefs` para recordarla.'
    },
    {
      id: 'sys-17',
      topic: 'Progresión',
      q: 'Tienes 100 tipos de armas con datos fijos (daño, icono, precio) que usan muchos objetos y sistemas. ¿Cuál es el enfoque más adecuado en Unity?',
      options: [
        'Un `ScriptableObject` por tipo de arma, referenciado donde se use.',
        'Un prefab por arma con los datos copiados en cada instancia.',
        'Una clase estática con un `switch` que devuelve los datos.',
        'Escribirlos en `PlayerPrefs` al iniciar y leerlos con `GetString`.'
      ],
      answer: [0],
      explanation: 'Los ScriptableObjects son assets de datos: todas las referencias apuntan a la misma instancia (sin duplicar memoria) y los diseñadores pueden editarlos en el Inspector. Ojo: en una build, los cambios que hagas en runtime **no se guardan** entre sesiones; no sirven como sistema de guardado.'
    },
    {
      id: 'sys-18',
      topic: 'Progresión',
      q: 'La UI debe actualizarse al subir de nivel, pero el sistema de progresión **no debe conocer** la UI. ¿Qué diseño es más adecuado?',
      code: 'public class PlayerProgression : MonoBehaviour\n{\n    public event Action<int> OnLevelUp;\n    // ...\n}',
      options: [
        'La UI se suscribe a `OnLevelUp` en `OnEnable` y se desuscribe en `OnDisable`.',
        '`PlayerProgression` busca el texto de la UI con `GameObject.Find` y lo actualiza.',
        'La UI comprueba el nivel en cada `Update` y solo se redibuja si cambió.',
        '`PlayerProgression` recibe la UI por `[SerializeField]` y llama a su método.'
      ],
      answer: [0],
      explanation: 'Con eventos, el emisor no sabe quién lo escucha (bajo acoplamiento). Desuscribirse en `OnDisable` evita llamadas a objetos destruidos y fugas de memoria. Comprobarlo en cada `Update` desperdicia CPU, `Find` es lento y frágil, y pasarle la UI por `[SerializeField]` hace que la progresión dependa de ella.'
    },
    {
      id: 'sys-19',
      topic: 'UI',
      q: 'En **UI Toolkit**, ¿cómo obtienes un botón definido en UXML con `name="play-button"` y le añades un listener?',
      options: [
        '`var btn = uiDocument.rootVisualElement.Q<Button>("play-button"); btn.clicked += OnPlay;`',
        '`var btn = GameObject.Find("play-button").GetComponent<Button>(); btn.onClick.AddListener(OnPlay);`',
        '`var btn = uiDocument.GetComponent<Button>(); btn.clicked += OnPlay;`',
        '`var btn = Resources.Load<Button>("play-button");`'
      ],
      answer: [0],
      explanation: 'En UI Toolkit los elementos son `VisualElement`, no GameObjects. Se buscan con la query `Q<T>(name)` desde `rootVisualElement` del `UIDocument`, y el `Button` de UI Toolkit (`UnityEngine.UIElements.Button`) expone el evento `clicked`. `onClick.AddListener` pertenece a uGUI.'
    },
    {
      id: 'sys-20',
      topic: 'Persistencia',
      q: 'Guardas la partida en un archivo. ¿Qué código lo escribe correctamente usando `JsonUtility`?',
      code: 'string path = Path.Combine(Application.persistentDataPath, "save.json");',
      options: [
        '`File.WriteAllText(path, JsonUtility.ToJson(data));`',
        '`PlayerPrefs.SetString(path, JsonUtility.ToJson(data));`',
        '`File.WriteAllText(path, data.ToString());`',
        '`JsonUtility.Save(data, path);`'
      ],
      answer: [0],
      explanation: 'El flujo típico es serializar con `JsonUtility.ToJson` y escribir con `System.IO.File` en `persistentDataPath` (usando `Path.Combine` para que funcione en todas las plataformas). Para cargar: `File.Exists`, `File.ReadAllText` y `JsonUtility.FromJson<T>`. `PlayerPrefs.SetString` no escribe un archivo (usa `path` solo como clave), `data.ToString()` devuelve el nombre de la clase y `JsonUtility.Save` no existe.'
    },
    {
      id: 'sys-21',
      topic: 'Escenas',
      q: 'Tu juego mantiene siempre cargada una escena `Core` (la activa) y carga los niveles en modo aditivo. Los enemigos que crea este código aparecen en `Core` y no se descargan con el nivel. ¿Qué línea añades en lugar del comentario?',
      code: 'IEnumerator LoadLevel()\n{\n    yield return SceneManager.LoadSceneAsync("Level1", LoadSceneMode.Additive);\n    // ?\n    Instantiate(enemyPrefab, spawnPoint, Quaternion.identity);\n}',
      options: [
        '`SceneManager.SetActiveScene(SceneManager.GetSceneByName("Level1"));`',
        '`SceneManager.MoveGameObjectToScene(enemyPrefab, SceneManager.GetSceneByName("Level1"));`',
        '`DontDestroyOnLoad(enemyPrefab);`',
        '`yield return new WaitForEndOfFrame();`'
      ],
      answer: [0],
      explanation: 'Los objetos creados con `Instantiate` (o `new GameObject`) van a la **escena activa**, y una carga aditiva no cambia cuál es. Con `SetActiveScene`, `Level1` pasa a ser la escena destino (y la que aporta los ajustes de iluminación), así que los enemigos se descargarán con ella. `MoveGameObjectToScene` sirve para mover objetos que ya están en una escena, no un prefab; esperar un frame no cambia la escena activa, y `DontDestroyOnLoad` haría justo lo contrario.'
    },
    {
      id: 'sys-22',
      topic: 'Escenas',
      q: 'Un `MusicManager` debe sobrevivir a los cambios de escena y elegir la pista adecuada cada vez que se carga una. ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      options: [
        '`DontDestroyOnLoad` solo funciona sobre GameObjects raíz; en un hijo no tiene efecto.',
        '`SceneManager.sceneLoaded` avisa de cada escena cargada, con su `Scene` y su `LoadSceneMode`.',
        'Los objetos con `DontDestroyOnLoad` se mueven a la nueva escena activa cuando esta se carga.',
        '`sceneLoaded` es un evento estático, pero Unity lo desuscribe solo al destruir el objeto.',
        '`OnLevelWasLoaded` es el callback recomendado en Unity 6 para reaccionar a la carga.'
      ],
      answer: [0, 1],
      explanation: '`DontDestroyOnLoad` solo conserva objetos raíz (en un hijo, Unity muestra un aviso y no lo conserva) y los mueve a una escena especial llamada **DontDestroyOnLoad**, no a la escena activa. `sceneLoaded` es un evento estático de `SceneManager` que recibe la `Scene` y el `LoadSceneMode`; Unity no lo desuscribe por ti, así que hazlo en `OnDisable` u `OnDestroy` para evitar llamadas a objetos destruidos. `OnLevelWasLoaded` está obsoleto: usa `sceneLoaded`.'
    },
    {
      id: 'sys-23',
      topic: 'Pausa y tiempo',
      q: 'Al pausar, el texto "Pulsa Start para continuar" debería parpadear, pero cambia una sola vez y se queda fijo. ¿Qué cambio lo arregla?',
      code: 'public void Pause()\n{\n    Time.timeScale = 0f;\n    pausePanel.SetActive(true);\n    StartCoroutine(BlinkHint());\n}\n\nIEnumerator BlinkHint()\n{\n    while (true)\n    {\n        hint.enabled = !hint.enabled;\n        yield return new WaitForSeconds(0.5f);\n    }\n}',
      options: [
        'Cambiar la espera por `WaitForSecondsRealtime(0.5f)`, que cuenta tiempo real.',
        'Llamar a `StartCoroutine` antes de poner `Time.timeScale = 0f`.',
        'Esperar con `yield return new WaitForFixedUpdate();` en el bucle.',
        'Poner también `Time.fixedDeltaTime = 0f` al pausar.'
      ],
      answer: [0],
      explanation: '`WaitForSeconds` cuenta tiempo **escalado**: con `timeScale = 0` nunca termina, así que el bucle se queda en la primera espera. `WaitForSecondsRealtime` usa tiempo real y sigue avanzando durante la pausa. Arrancar la corrutina antes de pausar no cambia nada (la espera sigue siendo escalada), `WaitForFixedUpdate` tampoco avanza porque `FixedUpdate` se detiene, y `fixedDeltaTime` no afecta a las corrutinas.'
    },
    {
      id: 'sys-24',
      topic: 'Pausa y tiempo',
      q: 'En el menú de pausa (`Time.timeScale = 0`) quieres que un icono siga girando y que se detengan los sonidos del juego, pero no los clics de la UI. ¿Qué **dos** acciones lo consiguen? (Elige 2)',
      options: [
        'Girar el icono en `Update` multiplicando la velocidad por `Time.unscaledDeltaTime`.',
        'Poner `AudioListener.pause = true` y `ignoreListenerPause = true` en el `AudioSource` de la UI.',
        'Confiar en `Time.timeScale = 0`, que ya pausa automáticamente todos los `AudioSource` de la escena.',
        'Girar el icono en `Update` multiplicando `Time.deltaTime` por `1f / Time.timeScale` para compensar la pausa.',
        'Girar el icono en `FixedUpdate`, que sigue ejecutándose a su ritmo fijo aunque `timeScale` sea 0.'
      ],
      answer: [0, 1],
      explanation: '`unscaledDeltaTime` no depende de `timeScale`, así que la rotación sigue durante la pausa. `AudioListener.pause` pausa todo el audio, y los `AudioSource` con `ignoreListenerPause = true` (como los de la UI) siguen sonando. `timeScale` **no** afecta a la reproducción de audio; dividir entre `timeScale` con valor 0 da un resultado no válido (0 × infinito); y `FixedUpdate` deja de ejecutarse con timeScale 0.'
    },
    {
      id: 'sys-25',
      topic: 'Progresión',
      q: 'El jugador está en nivel 1 con 0 XP y completa una misión que da 1050 XP. ¿Qué valores quedan en `level` y `xp`?',
      code: 'int level = 1;\nint xp = 0;\n\nint XpToNext() => 100 * level;\n\npublic void AddXp(int amount)\n{\n    xp += amount;\n    if (xp >= XpToNext())\n    {\n        xp -= XpToNext();\n        level++;\n    }\n}',
      options: [
        '`level` 5 y `xp` 50.',
        '`level` 2 y `xp` 950.',
        '`level` 1 y `xp` 1050.',
        '`level` 2 y `xp` 850.'
      ],
      answer: [1],
      explanation: 'El `if` solo comprueba una vez, así que aunque 1050 XP alcanzan para varios niveles, solo sube uno: resta 100 (el coste del nivel 1) y quedan 950 XP en nivel 2. Con `while` en lugar de `if` subiría hasta el nivel 5 con 50 XP (100 + 200 + 300 + 400 = 1000). 850 sería el resultado si `level` se incrementara antes de restar, y para quedarse en nivel 1 la condición tendría que ser falsa.'
    },
    {
      id: 'sys-26',
      topic: 'Progresión',
      q: 'Revisa este sistema de experiencia. ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      code: 'public class PlayerXp : MonoBehaviour\n{\n    public event Action<int> OnXpChanged;\n    int xp;\n\n    public void AddXp(int amount)\n    {\n        xp += amount;\n        OnXpChanged(xp);\n    }\n}',
      options: [
        'Si nadie se ha suscrito, `OnXpChanged(xp)` lanza una `NullReferenceException`.',
        'Usar `OnXpChanged?.Invoke(xp);` evita el error si no hay suscriptores.',
        'Por ser `event`, otras clases pueden suscribirse y también invocarlo directamente.',
        'Un evento sin suscriptores se ignora en silencio, igual que un `UnityEvent` vacío.',
        'Para suscribirse desde otro script, hay que marcar el evento con `[SerializeField]`.'
      ],
      answer: [0, 1],
      explanation: 'Un evento de C# sin suscriptores vale `null`, así que invocarlo directamente lanza `NullReferenceException`; el operador `?.` solo lo invoca si hay alguien suscrito. La palabra `event` limita lo que pueden hacer otras clases: solo pueden usar `+=` y `-=`, y solo la clase que lo declara puede invocarlo. A diferencia de `UnityEvent`, un `Action` no se serializa ni necesita `[SerializeField]` para suscribirse por código.'
    },
    {
      id: 'sys-27',
      topic: 'Ajustes',
      q: 'Con este código de ajustes, la primera vez que alguien abre el juego la música empieza en silencio. ¿Qué cambio es el más adecuado?',
      code: 'void Start()\n{\n    musicSlider.value = PlayerPrefs.GetFloat("music");\n    fullscreenToggle.isOn = PlayerPrefs.GetInt("fullscreen") == 1;\n}\n\npublic void SaveSettings()\n{\n    PlayerPrefs.SetFloat("music", musicSlider.value);\n    PlayerPrefs.SetInt("fullscreen", fullscreenToggle.isOn ? 1 : 0);\n    PlayerPrefs.Save();\n}',
      options: [
        'Leer con `PlayerPrefs.GetFloat("music", 1f)` para tener un valor por defecto.',
        'Llamar a `PlayerPrefs.Save()` al principio de `Start`.',
        'Guardar el volumen con `SetString` y convertirlo con `float.Parse` al leerlo.',
        'Leerlo con `GetInt`, porque `GetFloat` redondea a 0 los valores entre 0 y 1.'
      ],
      answer: [0],
      explanation: 'Si la clave no existe, `GetFloat` devuelve el valor por defecto, que es `0f` si no indicas otro. La sobrecarga `GetFloat(key, defaultValue)` (o comprobar antes con `HasKey`) resuelve el primer arranque. `Save()` escribe en disco los cambios pendientes (Unity también lo hace al cerrar la aplicación con normalidad), pero no crea valores. `PlayerPrefs` guarda `float` sin problemas, así que no hace falta pasar por `string` ni por `int`.'
    },
    {
      id: 'sys-28',
      topic: 'Ajustes',
      q: 'Un desplegable de resolución se rellena con `Screen.resolutions`. ¿Qué línea completa `OnResolutionSelected` para aplicar la resolución elegida **sin cambiar** el modo de pantalla actual?',
      code: 'Resolution[] resolutions;\n\nvoid Start()\n{\n    resolutions = Screen.resolutions;\n    // fill the dropdown with the resolutions...\n}\n\npublic void OnResolutionSelected(int index)\n{\n    Resolution r = resolutions[index];\n    // ?\n}',
      options: [
        '`Screen.SetResolution(r.width, r.height, Screen.fullScreenMode);`',
        '`Screen.SetResolution(r.width, r.height, FullScreenMode.Windowed);`',
        '`Screen.currentResolution = r;`',
        '`Camera.main.pixelRect = new Rect(0, 0, r.width, r.height);`'
      ],
      answer: [0],
      explanation: '`Screen.SetResolution` cambia la resolución y recibe el modo de pantalla (`FullScreenMode`); pasarle `Screen.fullScreenMode` conserva el modo actual (ventana, pantalla completa, etc.). Forzar `FullScreenMode.Windowed` sacaría al jugador de la pantalla completa. `Screen.currentResolution` es de solo lectura, y `pixelRect` solo cambia la zona de la pantalla en la que dibuja la cámara.'
    },
    {
      id: 'sys-29',
      topic: 'UI',
      q: 'El panel del menú se activa y desactiva con `SetActive`. Después de cerrarlo y volver a abrirlo dos veces, un clic en **Jugar** llama a `StartGame` tres veces. ¿Por qué?',
      code: 'void OnEnable()\n{\n    playButton.onClick.AddListener(() => StartGame());\n}\n\nvoid OnDisable()\n{\n    playButton.onClick.RemoveListener(() => StartGame());\n}',
      options: [
        'Cada lambda es un delegado distinto: `RemoveListener` no encuentra el añadido.',
        '`RemoveListener` solo quita listeners persistentes, los añadidos desde el Inspector.',
        '`OnDisable` no se llama cuando el GameObject se desactiva con `SetActive(false)`.',
        'Los listeners añadidos por código se serializan y se recuperan al reactivar el objeto.'
      ],
      answer: [0],
      explanation: 'Dos lambdas, aunque tengan el mismo cuerpo, se compilan como métodos distintos, así que sus delegados no son iguales y `RemoveListener` no encuentra el que se añadió y no quita nada: en cada `OnEnable` se acumula uno más. Solución: pasa el método directamente (`AddListener(StartGame)` y `RemoveListener(StartGame)`) o guarda la lambda en un campo `UnityAction` (dos delegados del mismo método sobre el mismo objeto sí se consideran iguales). `RemoveListener` actúa sobre los listeners añadidos por código (no sobre los persistentes del Inspector), `OnDisable` sí se llama con `SetActive(false)` y los listeners de runtime no se serializan.'
    },
    {
      id: 'sys-30',
      topic: 'Persistencia',
      q: '¿Qué campos aparecerán en el JSON que genera `JsonUtility.ToJson(data)`?',
      code: 'public class InventoryItem\n{\n    public string id;\n    public int amount;\n}\n\n[System.Serializable]\npublic class SaveData\n{\n    public int coins;\n    [SerializeField] private int level;\n    private int deaths;\n    public List<InventoryItem> items = new();\n}',
      options: [
        '`coins`, `level` e `items`, con el `id` y el `amount` de cada objeto.',
        'Solo `coins` y `level`; `items` se omite y `deaths` no tiene `[SerializeField]`.',
        '`coins` e `items`; los campos privados como `level` nunca se guardan.',
        '`coins`, `level`, `deaths` e `items`, porque la clase es `[Serializable]`.'
      ],
      answer: [1],
      explanation: '`JsonUtility` sigue las reglas del serializador de Unity: guarda los campos públicos y los privados con `[SerializeField]` (por eso `level` sí aparece) e ignora los privados sin atributo (`deaths`). `items` es una lista de `InventoryItem`, que no tiene `[System.Serializable]`, así que el campo entero se omite sin error; añadir el atributo a `InventoryItem` lo arregla. Que `SaveData` sea serializable no hace serializables las clases que contiene.'
    }
  ]
});
