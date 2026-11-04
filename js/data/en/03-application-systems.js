UCP.addTranslation('en', {
  domain: {
    id: 'systems',
    title: 'Developing application systems',
    description: 'Menus and interface flow, UI navigation, application settings, customization, player progression and data persistence.',
    objectives: [
      'Interpret scripts for interface flow: menus, UI navigation and application settings.',
      'Program user-controlled customization options.',
      'Implement user progression (experience, levels, achievements).',
      'Create and manage UI elements (uGUI and UI Toolkit).',
      'Implement data persistence (PlayerPrefs, JSON, files).'
    ],
    tips: [
      '`PlayerPrefs` only stores `int`, `float` and `string`. Use it for settings, not for save games or sensitive data.',
      '`JsonUtility` serializes **public** or `[SerializeField]` fields of `[Serializable]` classes. It does **not** serialize properties, dictionaries or top-level generic types.',
      'Store save files in `Application.persistentDataPath`. `dataPath` and `streamingAssetsPath` can be read-only in a build.',
      'Pausing with `Time.timeScale = 0`: `Update` keeps running, `FixedUpdate` stops running and `WaitForSeconds` freezes. For the pause UI, use **unscaled** time.',
      'With `allowSceneActivation = false`, `AsyncOperation.progress` stops at **0.9**.',
      'Lambdas inside a `for` loop: copy the index to a local variable before capturing it.',
      'AudioMixer volume: convert the slider value with `Mathf.Log10(value) * 20`, and remember to **expose** the parameter.',
      'Gamepad navigation: when opening a menu, select the first button with `EventSystem.current.SetSelectedGameObject(...)`.'
    ]
  },
  questions: {
    'sys-01': {
      topic: 'Persistence',
      q: 'Which data type can **NOT** be saved directly with `PlayerPrefs`?',
      options: ['`int`', '`float`', '`string`', '`bool`'],
      explanation: '`PlayerPrefs` only has `SetInt/GetInt`, `SetFloat/GetFloat` and `SetString/GetString`. A bool is usually stored as an int (0/1). In addition, PlayerPrefs is not secure (on Windows it is stored in the registry) and is not suitable for complex data.'
    },
    'sys-02': {
      topic: 'Persistence',
      q: 'Which data will appear in the generated JSON?',
      options: [
        '`level`, `inventory` and `Health`.',
        'Only `level`.',
        '`level` and `Health`.',
        'Nothing: `JsonUtility` throws an exception because of the dictionary.'
      ],
      explanation: '`JsonUtility` follows the same rules as the Unity serializer: it does not serialize `Dictionary` (it is ignored without an error) or properties. For the dictionary, you can use two lists, a list of serializable pairs, or a library such as Newtonsoft Json.'
    },
    'sys-03': {
      topic: 'Persistence',
      q: 'Which path should you use to store the save file on all platforms (including mobile)?',
      options: [
        '`Application.dataPath`',
        '`Application.streamingAssetsPath`',
        '`Application.persistentDataPath`',
        '`Application.temporaryCachePath`'
      ],
      explanation: '`persistentDataPath` points to a writable folder that is kept between sessions and updates. `dataPath` and `streamingAssetsPath` can be read-only (on Android, StreamingAssets is inside the APK), and the operating system can clear `temporaryCachePath`.'
    },
    'sys-04': {
      topic: 'Pause and time',
      q: 'You pause the game with `Time.timeScale = 0f`. Which **two** statements are correct? (Choose 2)',
      options: [
        '`Update` is still called every frame.',
        '`FixedUpdate` stops running.',
        'Coroutines using `WaitForSeconds` keep advancing normally.',
        '`Time.unscaledDeltaTime` also becomes 0.'
      ],
      explanation: 'With a timeScale of 0, `Time.deltaTime` is 0 but `Update` keeps running (which is why you can read input for the pause menu). Physics (`FixedUpdate`) stops. `WaitForSeconds` uses scaled time and freezes; `WaitForSecondsRealtime` and `unscaledDeltaTime` are not affected.'
    },
    'sys-05': {
      topic: 'Pause and time',
      q: 'The pause menu has animations driven by an `Animator`, but they do not move when `Time.timeScale = 0`. What is the most direct solution?',
      options: [
        'Set the Animator **Update Mode** to `Unscaled Time`.',
        'Set `Time.timeScale = 0.0001f` instead of 0.',
        'Call `animator.Update(Time.deltaTime)` manually.',
        'Move the animations to `FixedUpdate`.'
      ],
      explanation: 'With Update Mode set to `Unscaled Time`, the Animator advances using real time and ignores timeScale. Calling `animator.Update(Time.deltaTime)` does not work because `deltaTime` is 0. For UI coroutines or tweens, use `unscaledDeltaTime` or `WaitForSecondsRealtime`.'
    },
    'sys-06': {
      topic: 'Scenes',
      q: 'This loading screen never finishes. Why?',
      options: [
        'With `allowSceneActivation = false`, `progress` stays at 0.9.',
        '`LoadSceneAsync` cannot be awaited inside a coroutine with `yield return null`.',
        '`yield return op;` is missing before the loop to start loading.',
        'The scene must be loaded in Additive mode for `progress` to reach 1.'
      ],
      explanation: 'Loading reaches 0.9 and then waits for the scene to be activated (the last 10% is activation). The correct condition is `while (op.progress < 0.9f)`, and to display the percentage you can use `Mathf.Clamp01(op.progress / 0.9f)`.'
    },
    'sys-07': {
      topic: 'Scenes',
      q: 'When you return to the main menu, which has its own `GameManager` in the scene, you end up with **two** GameManagers. How do you fix it?',
      options: [
        'In `Awake`, if another `Instance` already exists, destroy this object and `return`.',
        'Move the `Awake` code to `Start` so that it runs after the scene loads.',
        'Call `DontDestroyOnLoad` in `OnDestroy` instead of in `Awake`.',
        'Assign `Instance = this` in `OnEnable` instead of in `Awake`.'
      ],
      explanation: 'This is the persistent Singleton pattern: the first instance survives with `DontDestroyOnLoad` and any later ones destroy themselves in `Awake`. Moving the code to `Start` or `OnEnable` does not prevent the duplicate: the second object still exists and also overwrites `Instance`.'
    },
    'sys-08': {
      topic: 'UI',
      q: 'With this code, every button loads the same level (index `buttons.Length`, which does not exist). Why?',
      options: [
        'The lambda captures the variable `i`, not its value; it must be copied to a local variable.',
        '`AddListener` does not accept lambdas with parameters, so it ignores the value of `i`.',
        'The listeners accumulate; `RemoveAllListeners` must be called before the loop.',
        'All the buttons share the same `onClick` because they are instances of the same prefab.'
      ],
      explanation: 'In C#, a `for` loop variable is a single variable for the whole loop, so all the lambdas share it. Copying it to a local variable inside the loop body creates a new variable on each iteration. (With `foreach`, since C# 5 each iteration has its own variable.)'
    },
    'sys-09': {
      topic: 'UI',
      q: 'The UI must look proportional on phones and monitors with different resolutions. Which **Canvas Scaler** setting is most commonly used?',
      options: ['Constant Pixel Size', 'Scale With Screen Size (with a Reference Resolution)', 'Constant Physical Size', 'Change the Canvas to World Space'],
      explanation: '**Scale With Screen Size** scales the UI relative to a reference resolution, and **Match** lets you choose whether it adapts to the width, the height or a blend of both. Combine it with properly configured anchors.'
    },
    'sys-10': {
      topic: 'UI',
      q: 'A pause button must always stay in the top-right corner, at any resolution or aspect ratio. What do you configure on its `RectTransform`?',
      options: [
        'The **anchors** (and pivot) set to the top-right corner.',
        'Its pixel position, calculated in `Update`.',
        'A `LayoutGroup` on the Canvas.',
        'The Canvas set to Screen Space - Camera.'
      ],
      explanation: 'Anchors define which point of the parent the element is positioned relative to. Anchored to the top right, it keeps the same distance from that corner even when the screen size changes.'
    },
    'sys-11': {
      topic: 'UI',
      q: 'In a new scene, you create a Canvas with buttons from code, but the buttons do not respond to clicks or taps. Which component is almost always missing?',
      options: ['An `EventSystem` (with its Input Module)', 'A `Rigidbody2D` on each button', 'An `AudioListener`', 'A `CanvasRenderer` on the Canvas'],
      explanation: 'The `EventSystem` and its Input Module (`StandaloneInputModule` or `InputSystemUIInputModule`) receive input and send it to the UI through the Canvas `GraphicRaycaster`. When you create a Canvas from the menu, Unity adds the EventSystem automatically, but not when you do it from code.'
    },
    'sys-12': {
      topic: 'UI',
      q: 'You want to hide a panel with a fade and, while it is invisible, have it **not block clicks** to what is behind it. What do you use?',
      options: [
        'A `CanvasGroup`, animating `alpha` and disabling `blocksRaycasts`.',
        '`gameObject.SetActive(false)` when the fade starts, so it stops blocking clicks.',
        'Animate the alpha of the panel `Image` color down to 0.',
        'Move the panel to another Canvas with a lower `sortingOrder` during the fade.'
      ],
      explanation: '`CanvasGroup` controls the transparency and interaction of a whole group of elements. Lowering the alpha of an `Image` makes it invisible, but it still blocks raycasts. `SetActive(false)` hides it instantly, without a fade.'
    },
    'sys-13': {
      topic: 'Settings',
      q: 'A volume slider ranges from 0.0001 to 1. Which expression converts its value to decibels for `AudioMixer.SetFloat`?',
      options: [
        '`sliderValue * 80f - 80f`',
        '`Mathf.Log10(sliderValue) * 20f`',
        '`sliderValue`',
        '`Mathf.Pow(10f, sliderValue)`'
      ],
      explanation: 'The AudioMixer works in decibels (normally from -80 dB to 0 dB), and the ear perceives volume logarithmically. `Log10(v) * 20` converts 1 to 0 dB and 0.0001 to -80 dB. The minimum is 0.0001 because `Log10(0)` is negative infinity.'
    },
    'sys-14': {
      topic: 'Settings',
      q: '`mixer.SetFloat("MusicVolume", -10f)` returns `false` and the volume does not change. What is the most likely cause?',
      options: [
        'The parameter is not **exposed** (Expose to script) or the name does not match.',
        'You must call `mixer.Apply()` after `SetFloat` to apply the change.',
        'The AudioMixer only accepts values between 0 and 1, not negative decibels.',
        '`SetFloat` only works if the AudioMixer is assigned to an `AudioListener`.'
      ],
      explanation: 'To control a mixer property from code, right-click it > **Expose to script** and rename it in the Exposed Parameters list. `SetFloat` returns `false` if it cannot find the parameter.'
    },
    'sys-15': {
      topic: 'UI',
      q: 'When the pause menu is opened while playing with a gamepad, no button appears selected and navigation does not work. What should you do when opening the menu?',
      options: [
        '`EventSystem.current.SetSelectedGameObject(firstButton);`',
        '`firstButton.onClick.Invoke();`',
        '`Cursor.lockState = CursorLockMode.None;`',
        'Enable **Raycast Target** on all the buttons.'
      ],
      explanation: 'Gamepad or keyboard navigation needs a selected element as a starting point. Assigning it when the menu opens (and configuring the **Navigation** of the Selectables) lets the player move with the stick. `Invoke` would click the button.'
    },
    'sys-16': {
      topic: 'Settings',
      q: 'In the options menu, you want a "Graphics Quality" selector that switches between the Low, Medium and High presets defined in Project Settings. Which API do you use?',
      options: [
        '`Screen.SetResolution`',
        '`QualitySettings.SetQualityLevel(index, true)`',
        '`Application.targetFrameRate`',
        '`GraphicsSettings.defaultRenderPipeline = null`'
      ],
      explanation: '`QualitySettings.SetQualityLevel` applies one of the levels from Project Settings > Quality. The second parameter (`applyExpensiveChanges`) also applies expensive changes, such as anti-aliasing. Save the choice in `PlayerPrefs` so it is remembered.'
    },
    'sys-17': {
      topic: 'Progression',
      q: 'You have 100 weapon types with fixed data (damage, icon, price) used by many objects and systems. What is the most appropriate approach in Unity?',
      options: [
        'One `ScriptableObject` per weapon type, referenced by the objects that use it.',
        'One prefab per weapon with the data copied into each instance.',
        'A giant `switch` in the player script.',
        'Store them in `PlayerPrefs` at startup.'
      ],
      explanation: 'ScriptableObjects are data assets: every reference points to the same instance (without duplicating memory) and designers can edit them in the Inspector. Note: in a build, changes made at runtime are **not saved** between sessions, so they cannot be used as a save system.'
    },
    'sys-18': {
      topic: 'Progression',
      q: 'The UI must update when the player levels up, but the progression system **must not know about** the UI. Which design is most appropriate?',
      options: [
        'The UI subscribes to `OnLevelUp` in `OnEnable` and unsubscribes in `OnDisable`.',
        '`PlayerProgression` finds the UI text with `GameObject.Find` and updates it.',
        'The UI checks the level in every `Update`.',
        'Make all the UI variables public.'
      ],
      explanation: 'With events, the sender does not know who is listening (loose coupling). Unsubscribing in `OnDisable` prevents calls to destroyed objects and memory leaks. Checking in every `Update` wastes CPU, and `Find` is slow and fragile.'
    },
    'sys-19': {
      topic: 'UI',
      q: 'In **UI Toolkit**, how do you get a button defined in UXML with `name="play-button"` and add a listener to it?',
      options: [
        '`var btn = uiDocument.rootVisualElement.Q<Button>("play-button"); btn.clicked += OnPlay;`',
        '`var btn = GameObject.Find("play-button").GetComponent<Button>(); btn.onClick.AddListener(OnPlay);`',
        '`var btn = uiDocument.GetComponent<Button>(); btn.clicked += OnPlay;`',
        '`var btn = Resources.Load<Button>("play-button");`'
      ],
      explanation: 'In UI Toolkit, elements are `VisualElement` objects, not GameObjects. You find them with the `Q<T>(name)` query from the `rootVisualElement` of the `UIDocument`, and the UI Toolkit `Button` (`UnityEngine.UIElements.Button`) exposes the `clicked` event. `onClick.AddListener` belongs to uGUI.'
    },
    'sys-20': {
      topic: 'Persistence',
      q: 'You save the game to a file. Which code writes it correctly using `JsonUtility`?',
      options: [
        '`File.WriteAllText(Path.Combine(Application.persistentDataPath, "save.json"), JsonUtility.ToJson(data));`',
        '`PlayerPrefs.SetString(Application.dataPath, JsonUtility.ToJson(data));`',
        '`File.WriteAllText("C:/save.json", data.ToString());`',
        '`JsonUtility.Save(data, "save.json");`'
      ],
      explanation: 'The typical flow is to serialize with `JsonUtility.ToJson` and write with `System.IO.File` to `persistentDataPath` (using `Path.Combine` so it works on all platforms). To load: `File.Exists`, `File.ReadAllText` and `JsonUtility.FromJson<T>`. `JsonUtility.Save` does not exist.'
    }
  }
});
