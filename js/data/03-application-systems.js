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
        'Llamar a `animator.Update(Time.deltaTime)` manualmente.',
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
        'Mover el código de `Awake` a `Start` para que se ejecute después de cargar la escena.',
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
        'La lambda captura la variable `i`, no su valor; hay que copiarla a una variable local.',
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
      options: ['Constant Pixel Size', 'Scale With Screen Size (con una Reference Resolution)', 'Constant Physical Size', 'Cambiar el Canvas a World Space'],
      answer: [1],
      explanation: '**Scale With Screen Size** escala la UI respecto a una resolución de referencia, y con **Match** eliges si se adapta al ancho, al alto o a una mezcla. Combínalo con anchors bien configurados.'
    },
    {
      id: 'sys-10',
      topic: 'UI',
      q: 'Un botón de pausa debe quedarse siempre en la esquina superior derecha, con cualquier resolución o relación de aspecto. ¿Qué configuras en su `RectTransform`?',
      options: [
        'Los **anchors** (y el pivot) en la esquina superior derecha.',
        'Su posición en píxeles calculada en `Update`.',
        'Un `LayoutGroup` en el Canvas.',
        'El Canvas en Screen Space - Camera.'
      ],
      answer: [0],
      explanation: 'Los anchors definen respecto a qué punto del padre se posiciona el elemento. Anclado arriba a la derecha, mantiene la misma distancia a esa esquina aunque cambie el tamaño de la pantalla.'
    },
    {
      id: 'sys-11',
      topic: 'UI',
      q: 'En una escena nueva creas un Canvas con botones desde código, pero los botones no responden a clics ni toques. ¿Qué componente falta casi siempre?',
      options: ['Un `EventSystem` (con su Input Module)', 'Un `Rigidbody2D` en cada botón', 'Un `AudioListener`', 'Un `CanvasRenderer` en el Canvas'],
      answer: [0],
      explanation: 'El `EventSystem` y su Input Module (`StandaloneInputModule` o `InputSystemUIInputModule`) reciben el input y lo envían a la UI a través del `GraphicRaycaster` del Canvas. Cuando creas un Canvas desde el menú, Unity añade el EventSystem automáticamente, pero no cuando lo haces por código.'
    },
    {
      id: 'sys-12',
      topic: 'UI',
      q: 'Quieres ocultar un panel con un fundido y que, mientras esté invisible, **no bloquee los clics** a lo que hay detrás. ¿Qué usas?',
      options: [
        'Un `CanvasGroup`, animando `alpha` y desactivando `blocksRaycasts`.',
        '`gameObject.SetActive(false)` al empezar el fundido, para que deje de bloquear clics.',
        'Animar hasta 0 el alfa del color del `Image` del panel.',
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
        '`sliderValue * 80f - 80f`',
        '`Mathf.Log10(sliderValue) * 20f`',
        '`sliderValue`',
        '`Mathf.Pow(10f, sliderValue)`'
      ],
      answer: [1],
      explanation: 'El AudioMixer trabaja en decibelios (de -80 dB a 0 dB normalmente), y el oído percibe el volumen de forma logarítmica. `Log10(v) * 20` convierte 1 en 0 dB y 0.0001 en -80 dB. El mínimo es 0.0001 porque `Log10(0)` es -infinito.'
    },
    {
      id: 'sys-14',
      topic: 'Ajustes',
      q: '`mixer.SetFloat("MusicVolume", -10f)` devuelve `false` y el volumen no cambia. ¿Cuál es la causa más probable?',
      options: [
        'El parámetro no está **expuesto** (Expose to script) o el nombre no coincide.',
        'Hay que llamar a `mixer.Apply()` después de `SetFloat` para aplicar el cambio.',
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
        '`firstButton.onClick.Invoke();`',
        '`Cursor.lockState = CursorLockMode.None;`',
        'Activar **Raycast Target** en todos los botones.'
      ],
      answer: [0],
      explanation: 'La navegación con mando o teclado necesita un elemento seleccionado como punto de partida. Asignarlo al abrir el menú (y configurar la **Navigation** de los Selectables) permite moverse con el stick. `Invoke` haría clic en el botón.'
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
        'Un `ScriptableObject` por tipo de arma, referenciado desde los objetos que lo usan.',
        'Un prefab por arma con los datos copiados en cada instancia.',
        'Un `switch` gigante en el script del jugador.',
        'Guardarlos en `PlayerPrefs` al iniciar.'
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
        'La UI comprueba el nivel en cada `Update`.',
        'Hacer públicas todas las variables de la UI.'
      ],
      answer: [0],
      explanation: 'Con eventos, el emisor no sabe quién lo escucha (bajo acoplamiento). Desuscribirse en `OnDisable` evita llamadas a objetos destruidos y fugas de memoria. Comprobarlo en cada `Update` desperdicia CPU y `Find` es lento y frágil.'
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
      options: [
        '`File.WriteAllText(Path.Combine(Application.persistentDataPath, "save.json"), JsonUtility.ToJson(data));`',
        '`PlayerPrefs.SetString(Application.dataPath, JsonUtility.ToJson(data));`',
        '`File.WriteAllText("C:/save.json", data.ToString());`',
        '`JsonUtility.Save(data, "save.json");`'
      ],
      answer: [0],
      explanation: 'El flujo típico es serializar con `JsonUtility.ToJson` y escribir con `System.IO.File` en `persistentDataPath` (usando `Path.Combine` para que funcione en todas las plataformas). Para cargar: `File.Exists`, `File.ReadAllText` y `JsonUtility.FromJson<T>`. `JsonUtility.Save` no existe.'
    },
    {
      id: 'sys-21',
      topic: 'Escenas',
      q: 'Cargas el nivel `Dungeon` en modo **Additive** sobre la escena `Core` (que tiene el `GameManager`). Los enemigos que instancias después aparecen en `Core` y la iluminación ambiental sigue siendo la de `Core`. ¿Qué te falta?',
      options: [
        'Llamar a `SceneManager.SetActiveScene(SceneManager.GetSceneByName("Dungeon"))` cuando termine la carga.',
        'Cargar `Dungeon` en modo `LoadSceneMode.Single`.',
        'Llamar a `DontDestroyOnLoad` sobre cada enemigo.',
        'Poner `allowSceneActivation = true` antes de llamar a `LoadSceneAsync`.'
      ],
      answer: [0],
      explanation: 'Con varias escenas cargadas, solo una es la **escena activa**: es donde `Instantiate` coloca los objetos nuevos y la que aporta los ajustes de iluminación (skybox, luz ambiental). Al cargar en Additive, la activa sigue siendo la original hasta que llamas a `SetActiveScene` (cuando la carga ha terminado). El modo `Single` descargaría `Core`, y `DontDestroyOnLoad` los movería a una escena especial, no a `Dungeon`.'
    },
    {
      id: 'sys-22',
      topic: 'Escenas',
      q: '¿Qué **dos** afirmaciones sobre la carga y descarga de escenas son correctas? (Elige 2)',
      options: [
        '`LoadSceneMode.Single` descarga todas las escenas cargadas (salvo los objetos marcados con `DontDestroyOnLoad`).',
        '`SceneManager.UnloadSceneAsync` no libera por sí sola los assets que usaba la escena; para eso existe `Resources.UnloadUnusedAssets`.',
        'Las escenas cargadas en Additive se descargan solas al cargar otra escena en Additive.',
        'Los objetos marcados con `DontDestroyOnLoad` se destruyen al cargar una escena en modo Single.',
        'Solo se pueden cargar en Additive las escenas incluidas en Addressables.'
      ],
      answer: [0, 1],
      explanation: '`Single` sustituye todo lo cargado, excepto lo que vive en la escena especial `DontDestroyOnLoad`. `UnloadSceneAsync` descarga los objetos de la escena, pero los assets (texturas, mallas…) pueden seguir en memoria hasta llamar a `Resources.UnloadUnusedAssets`. Las escenas Additive no se descargan solas al cargar otra Additive, y cualquier escena de la lista de Build Profiles se puede cargar en Additive.'
    },
    {
      id: 'sys-23',
      topic: 'Localización',
      q: 'Usas el paquete **Localization**. En el menú de opciones, el jugador elige un idioma de un desplegable. ¿Cómo cambias el idioma en tiempo de ejecución?',
      options: [
        '`LocalizationSettings.SelectedLocale = LocalizationSettings.AvailableLocales.Locales[index];`',
        '`Application.systemLanguage = SystemLanguage.Spanish;`',
        '`CultureInfo.CurrentCulture = new CultureInfo("es");`',
        '`SceneManager.LoadScene` de la misma escena para que se recarguen las String Tables.'
      ],
      answer: [0],
      explanation: 'El idioma activo es `LocalizationSettings.SelectedLocale`. Al cambiarlo, el sistema carga las tablas del nuevo `Locale` y los componentes `LocalizeStringEvent` (y los `LocalizedString` suscritos a `StringChanged`) se actualizan solos, sin recargar la escena. `Application.systemLanguage` es de solo lectura e indica el idioma del dispositivo, y cambiar la `CultureInfo` de .NET no afecta a las tablas.'
    },
    {
      id: 'sys-24',
      topic: 'Localización',
      q: 'Una entrada de la String Table es `Tienes {coins} monedas`. En pantalla aparece literalmente `{coins}` en lugar del número. ¿Qué falta?',
      options: [
        'Marcar la entrada como **Smart** (Smart String) y proporcionar la variable `coins` (por ejemplo, como variable local del `LocalizedString`).',
        'Usar `string.Format` sobre el texto del `TextMeshProUGUI` en cada frame.',
        'Escribir la variable como `{0}`, porque el paquete no admite nombres.',
        'Crear una entrada distinta para cada cantidad de monedas.'
      ],
      answer: [0],
      explanation: 'Los marcadores con nombre los resuelve **Smart Strings** (basado en SmartFormat), que solo se aplica a las entradas marcadas como Smart. Los valores se pasan como argumentos o, mejor, como variables locales/persistentes del `LocalizedString`, que refrescan el texto cuando cambian. Smart Strings también permite plurales (`{coins:plural:moneda|monedas}`), así que no hace falta una entrada por cantidad.'
    },
    {
      id: 'sys-25',
      topic: 'Progresión',
      q: 'Guardas el nivel y el oro del jugador modificando un `ScriptableObject` en tiempo de ejecución. En el Editor parece que se guarda entre sesiones, pero en la build el progreso se pierde al cerrar el juego. ¿Por qué?',
      options: [
        'En una build, los cambios en un ScriptableObject solo viven en memoria; en el Editor se modificaba el propio asset. Hay que guardar el progreso en un archivo (por ejemplo, JSON en `persistentDataPath`).',
        'Los ScriptableObject solo se guardan si están en la carpeta `Resources`.',
        'Hay que llamar a `ScriptableObject.Save()` antes de salir.',
        'Hay que marcar el ScriptableObject con `DontDestroyOnLoad`.'
      ],
      answer: [0],
      explanation: 'Un ScriptableObject es un asset: en el Editor, cambiarlo en Play Mode modifica el archivo del proyecto (por eso "persiste" y, de paso, ensucia el control de versiones). En una build, los assets son de solo lectura: los cambios desaparecen al cerrar. Úsalos para datos de configuración o estado en memoria, y guarda el progreso con tu propio sistema de guardado. `ScriptableObject.Save()` no existe.'
    },
    {
      id: 'sys-26',
      topic: 'Ajustes',
      q: 'El desplegable de resolución se rellena con `Screen.resolutions`. ¿Qué línea aplica la resolución elegida?',
      code: 'Resolution[] resolutions;\n\nvoid Start() => resolutions = Screen.resolutions;\n\npublic void OnResolutionChanged(int index)\n{\n    Resolution r = resolutions[index];\n    // ???\n}',
      options: [
        '`Screen.SetResolution(r.width, r.height, Screen.fullScreenMode);`',
        '`Screen.currentResolution = r;`',
        '`QualitySettings.SetQualityLevel(index);`',
        '`Camera.main.pixelRect = new Rect(0, 0, r.width, r.height);`'
      ],
      answer: [0],
      explanation: '`Screen.SetResolution` cambia la resolución (y el modo de pantalla completa) y se aplica al terminar el frame. `Screen.currentResolution` es de solo lectura (y en modo ventana indica la resolución del escritorio). `SetQualityLevel` cambia el preset de calidad, no la resolución, y `pixelRect` solo cambia la zona de la pantalla en la que dibuja una cámara.'
    }
  ]
});
