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
        'Move the `Awake` code to `Start`, which runs later.',
        'Call `DontDestroyOnLoad` in `OnDestroy` instead of in `Awake`.',
        'Assign `Instance = this` in `OnEnable` instead of in `Awake`.'
      ],
      explanation: 'This is the persistent Singleton pattern: the first instance survives with `DontDestroyOnLoad` and any later ones destroy themselves in `Awake`. Moving the code to `Start` or `OnEnable` does not prevent the duplicate: the second object still exists and also overwrites `Instance`.'
    },
    'sys-08': {
      topic: 'UI',
      q: 'With this code, every button loads the same level (index `buttons.Length`, which does not exist). Why?',
      options: [
        'The lambda captures the variable `i`, not its value; copy it to a local first.',
        '`AddListener` does not accept lambdas with parameters, so it ignores the value of `i`.',
        'The listeners accumulate; call `RemoveAllListeners` before the loop.',
        'All the buttons share the same `onClick` because they are instances of the same prefab.'
      ],
      explanation: 'In C#, a `for` loop variable is a single variable for the whole loop, so all the lambdas share it. Copying it to a local variable inside the loop body creates a new variable on each iteration. (With `foreach`, since C# 5 each iteration has its own variable.)'
    },
    'sys-09': {
      topic: 'UI',
      q: 'The UI must look proportional on phones and monitors with different resolutions. Which **Canvas Scaler** setting is most commonly used?',
      options: ['Constant Pixel Size', 'Scale With Screen Size', 'Constant Physical Size', 'Change the Canvas to World Space'],
      explanation: '**Scale With Screen Size** scales the UI relative to a reference resolution (**Reference Resolution**), and **Match** lets you choose whether it adapts to the width, the height or a blend of both. Combine it with properly configured anchors.'
    },
    'sys-10': {
      topic: 'UI',
      q: 'A pause button must always stay in the top-right corner, at any resolution or aspect ratio. What do you configure on its `RectTransform`?',
      options: [
        'The **anchors** (and pivot) set to the top-right corner.',
        'Its pixel position, recalculated every `Update` from `Screen.width`.',
        'A `ContentSizeFitter` on the button set to Preferred Size.',
        'The Canvas set to Screen Space - Camera mode.'
      ],
      explanation: 'Anchors define which point of the parent the element is positioned relative to. Anchored to the top right, it keeps the same distance from that corner even when the screen size changes. Recalculating the position in `Update` is fragile and wasteful, `ContentSizeFitter` only adjusts the size, and the Render Mode does not change anchoring.'
    },
    'sys-11': {
      topic: 'UI',
      q: 'In a new scene, you create a Canvas with buttons from code, but the buttons do not respond to clicks or taps. Which component is almost always missing?',
      options: ['An `EventSystem` (with its Input Module)', 'A `BoxCollider2D` on each button to detect the click', 'An `AudioListener` on the main camera', 'A `CanvasRenderer` on the Canvas itself'],
      explanation: 'The `EventSystem` and its Input Module (`StandaloneInputModule` or `InputSystemUIInputModule`) receive input and send it to the UI through the Canvas `GraphicRaycaster`. When you create a Canvas from the menu, Unity adds the EventSystem automatically, but not when you do it from code. UI does not use colliders: the `GraphicRaycaster` raycasts against the graphics.'
    },
    'sys-12': {
      topic: 'UI',
      q: 'You want to hide a panel with a fade and, while it is invisible, have it **not block clicks** to what is behind it. What do you use?',
      options: [
        'A `CanvasGroup`, animating `alpha` and disabling `blocksRaycasts`.',
        '`gameObject.SetActive(false)` when the fade starts, so it stops blocking clicks.',
        'Animate the alpha of the panel `Image` color down to 0, so it stops receiving clicks.',
        'Move the panel to another Canvas with a lower `sortingOrder` during the fade.'
      ],
      explanation: '`CanvasGroup` controls the transparency and interaction of a whole group of elements. Lowering the alpha of an `Image` makes it invisible, but it still blocks raycasts. `SetActive(false)` hides it instantly, without a fade.'
    },
    'sys-13': {
      topic: 'Settings',
      q: 'A volume slider ranges from 0.0001 to 1. Which expression converts its value to decibels for `AudioMixer.SetFloat`?',
      options: [
        '`Mathf.Lerp(-80f, 0f, sliderValue)`',
        '`Mathf.Log10(sliderValue) * 20f`',
        '`sliderValue`',
        '`Mathf.Pow(10f, sliderValue / 20f)`'
      ],
      explanation: 'The AudioMixer works in decibels (normally from -80 dB to 0 dB), and the ear perceives volume logarithmically. `Log10(v) * 20` converts 1 to 0 dB and 0.0001 to -80 dB. The minimum is 0.0001 because `Log10(0)` is negative infinity. `Lerp` is a linear mapping (the volume barely changes over the upper half of the slider), and `Pow(10, x / 20)` is the inverse conversion, from dB to a linear value.'
    },
    'sys-14': {
      topic: 'Settings',
      q: '`mixer.SetFloat("MusicVolume", -10f)` returns `false` and the volume does not change. What is the most likely cause?',
      options: [
        'The parameter is not **exposed** (Expose to script), or its name does not match.',
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
        '`firstButton.GetComponent<Button>().onClick.Invoke();`',
        '`Cursor.lockState = CursorLockMode.None; Cursor.visible = true;`',
        'Enable **Raycast Target** on the `Image` of every button in the menu.'
      ],
      explanation: 'Gamepad or keyboard navigation needs a selected element as a starting point. Assigning it when the menu opens (and configuring the **Navigation** of the Selectables) lets the player move with the stick. `onClick.Invoke()` would click the button, the cursor only affects the mouse, and **Raycast Target** only matters for clicks and taps.'
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
        'One `ScriptableObject` per weapon type, referenced wherever it is used.',
        'One prefab per weapon with the data copied into each instance.',
        'A static class with a `switch` that returns the data for each weapon.',
        'Write them to `PlayerPrefs` at startup and read them with `GetString`.'
      ],
      explanation: 'ScriptableObjects are data assets: every reference points to the same instance (without duplicating memory) and designers can edit them in the Inspector. Note: in a build, changes made at runtime are **not saved** between sessions, so they cannot be used as a save system.'
    },
    'sys-18': {
      topic: 'Progression',
      q: 'The UI must update when the player levels up, but the progression system **must not know about** the UI. Which design is most appropriate?',
      options: [
        'The UI subscribes to `OnLevelUp` in `OnEnable`, unsubscribes in `OnDisable`.',
        '`PlayerProgression` finds the UI text with `GameObject.Find` and updates it.',
        'The UI checks the level in every `Update` and redraws if it changed.',
        '`PlayerProgression` gets the UI via `[SerializeField]` and calls its method.'
      ],
      explanation: 'With events, the sender does not know who is listening (loose coupling). Unsubscribing in `OnDisable` prevents calls to destroyed objects and memory leaks. Checking in every `Update` wastes CPU, `Find` is slow and fragile, and passing the UI in through `[SerializeField]` makes progression depend on it.'
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
        '`File.WriteAllText(path, JsonUtility.ToJson(data));`',
        '`PlayerPrefs.SetString(path, JsonUtility.ToJson(data));`',
        '`File.WriteAllText(path, data.ToString());`',
        '`JsonUtility.Save(data, path);`'
      ],
      explanation: 'The typical flow is to serialize with `JsonUtility.ToJson` and write with `System.IO.File` to `persistentDataPath` (using `Path.Combine` so it works on all platforms). To load: `File.Exists`, `File.ReadAllText` and `JsonUtility.FromJson<T>`. `PlayerPrefs.SetString` does not write a file (it only uses `path` as a key), `data.ToString()` returns the class name, and `JsonUtility.Save` does not exist.'
    },
    'sys-21': {
      topic: 'Scenes',
      q: 'Your game always keeps a `Core` scene loaded (the active one) and loads levels additively. The enemies this code creates appear in `Core` and are not unloaded with the level. Which line do you add in place of the comment?',
      options: [
        '`SceneManager.SetActiveScene(SceneManager.GetSceneByName("Level1"));`',
        '`SceneManager.MoveGameObjectToScene(enemyPrefab, SceneManager.GetSceneByName("Level1"));`',
        '`DontDestroyOnLoad(enemyPrefab);`',
        '`yield return new WaitForEndOfFrame();`'
      ],
      explanation: 'Objects created with `Instantiate` (or `new GameObject`) go into the **active scene**, and additive loading does not change which scene that is. With `SetActiveScene`, `Level1` becomes the target scene (and the one that provides the lighting settings), so the enemies will be unloaded with it. `MoveGameObjectToScene` moves objects that are already in a scene, not a prefab; waiting a frame does not change the active scene, and `DontDestroyOnLoad` would do exactly the opposite.'
    },
    'sys-22': {
      topic: 'Scenes',
      q: 'A `MusicManager` must survive scene changes and pick the right track every time a scene loads. Which **two** statements are correct? (Choose 2)',
      options: [
        '`DontDestroyOnLoad` only works on root GameObjects; on a child it has no effect.',
        '`SceneManager.sceneLoaded` fires for every loaded scene, with its `Scene` and `LoadSceneMode`.',
        'Objects marked with `DontDestroyOnLoad` are moved into the new active scene when it loads.',
        '`sceneLoaded` is a static event, but Unity unsubscribes it when the object is destroyed.',
        '`OnLevelWasLoaded` is the recommended Unity 6 callback for reacting to a scene load.'
      ],
      explanation: '`DontDestroyOnLoad` only preserves root objects (on a child, Unity logs a warning and does not preserve it) and moves them into a special scene called **DontDestroyOnLoad**, not into the active scene. `sceneLoaded` is a static `SceneManager` event that receives the `Scene` and the `LoadSceneMode`; Unity does not unsubscribe it for you, so do it in `OnDisable` or `OnDestroy` to avoid calls to destroyed objects. `OnLevelWasLoaded` is obsolete: use `sceneLoaded`.'
    },
    'sys-23': {
      topic: 'Pause and time',
      q: 'When the game is paused, the "Press Start to continue" text should blink, but it changes only once and then stays still. Which change fixes it?',
      options: [
        'Change the wait to `WaitForSecondsRealtime(0.5f)`, which counts real time.',
        'Call `StartCoroutine` before setting `Time.timeScale = 0f`.',
        'Wait with `yield return new WaitForFixedUpdate();` in the loop.',
        'Also set `Time.fixedDeltaTime = 0f` when pausing.'
      ],
      explanation: '`WaitForSeconds` counts **scaled** time: with `timeScale = 0` it never finishes, so the loop gets stuck on the first wait. `WaitForSecondsRealtime` uses real time and keeps advancing during the pause. Starting the coroutine before pausing changes nothing (the wait is still scaled), `WaitForFixedUpdate` does not advance either because `FixedUpdate` stops, and `fixedDeltaTime` does not affect coroutines.'
    },
    'sys-24': {
      topic: 'Pause and time',
      q: 'In the pause menu (`Time.timeScale = 0`), you want an icon to keep spinning and the game sounds to stop, but not the UI clicks. Which **two** actions achieve this? (Choose 2)',
      options: [
        'Spin the icon in `Update`, multiplying the speed by `Time.unscaledDeltaTime`.',
        'Set `AudioListener.pause = true` and `ignoreListenerPause = true` on the UI `AudioSource`.',
        'Rely on `Time.timeScale = 0`, which already pauses every `AudioSource` in the scene automatically.',
        'Spin the icon in `Update`, multiplying `Time.deltaTime` by `1f / Time.timeScale` to offset the pause.',
        'Spin the icon in `FixedUpdate`, which keeps running at its fixed rate even when `timeScale` is 0.'
      ],
      explanation: '`unscaledDeltaTime` does not depend on `timeScale`, so the rotation continues during the pause. `AudioListener.pause` pauses all audio, and `AudioSource` components with `ignoreListenerPause = true` (such as the UI ones) keep playing. `timeScale` does **not** affect audio playback; dividing by a `timeScale` of 0 gives an invalid result (0 × infinity); and `FixedUpdate` stops running with a timeScale of 0.'
    },
    'sys-25': {
      topic: 'Progression',
      q: 'The player is level 1 with 0 XP and completes a quest worth 1050 XP. What values do `level` and `xp` end up with?',
      options: [
        '`level` 5 and `xp` 50.',
        '`level` 2 and `xp` 950.',
        '`level` 1 and `xp` 1050.',
        '`level` 2 and `xp` 850.'
      ],
      explanation: 'The `if` only checks once, so even though 1050 XP is enough for several levels, the player only gains one: it subtracts 100 (the cost of level 1), leaving 950 XP at level 2. With `while` instead of `if`, the player would reach level 5 with 50 XP (100 + 200 + 300 + 400 = 1000). 850 would be the result if `level` were incremented before subtracting, and staying at level 1 would require the condition to be false.'
    },
    'sys-26': {
      topic: 'Progression',
      q: 'Review this experience system. Which **two** statements are correct? (Choose 2)',
      options: [
        'If nobody has subscribed, `OnXpChanged(xp)` throws a `NullReferenceException`.',
        'Using `OnXpChanged?.Invoke(xp);` avoids the error when nobody has subscribed.',
        'Because it is an `event`, other classes can subscribe to it and also invoke it directly.',
        'An event with no subscribers is silently ignored, just like an empty `UnityEvent`.',
        'To subscribe from another script, the event must be marked with `[SerializeField]`.'
      ],
      explanation: 'A C# event with no subscribers is `null`, so invoking it directly throws a `NullReferenceException`; the `?.` operator only invokes it if someone is subscribed. The `event` keyword limits what other classes can do: they can only use `+=` and `-=`, and only the declaring class can invoke it. Unlike `UnityEvent`, an `Action` is not serialized and does not need `[SerializeField]` to be subscribed to from code.'
    },
    'sys-27': {
      topic: 'Settings',
      q: 'With this settings code, the first time someone opens the game the music starts muted. Which change is most appropriate?',
      options: [
        'Read it with `PlayerPrefs.GetFloat("music", 1f)` so there is a default value.',
        'Call `PlayerPrefs.Save()` at the beginning of `Start`.',
        'Store the volume with `SetString` and convert it with `float.Parse` on read.',
        'Read it with `GetInt`: `GetFloat` rounds values between 0 and 1 down to 0.'
      ],
      explanation: 'If the key does not exist, `GetFloat` returns the default value, which is `0f` unless you specify another one. The `GetFloat(key, defaultValue)` overload (or checking first with `HasKey`) handles the first launch. `Save()` writes pending changes to disk (Unity also does this when the application quits normally), but it does not create values. `PlayerPrefs` stores `float` values without any problem, so there is no need to go through `string` or `int`.'
    },
    'sys-28': {
      topic: 'Settings',
      q: 'A resolution dropdown is filled from `Screen.resolutions`. Which line completes `OnResolutionSelected` to apply the chosen resolution **without changing** the current screen mode?',
      options: [
        '`Screen.SetResolution(r.width, r.height, Screen.fullScreenMode);`',
        '`Screen.SetResolution(r.width, r.height, FullScreenMode.Windowed);`',
        '`Screen.currentResolution = r;`',
        '`Camera.main.pixelRect = new Rect(0, 0, r.width, r.height);`'
      ],
      explanation: '`Screen.SetResolution` changes the resolution and takes the screen mode (`FullScreenMode`); passing `Screen.fullScreenMode` keeps the current mode (windowed, fullscreen, etc.). Forcing `FullScreenMode.Windowed` would take the player out of fullscreen. `Screen.currentResolution` is read-only, and `pixelRect` only changes the area of the screen the camera renders to.'
    },
    'sys-29': {
      topic: 'UI',
      q: 'The menu panel is shown and hidden with `SetActive`. After closing and reopening it twice, a click on **Play** calls `StartGame` three times. Why?',
      options: [
        'Each lambda is a separate delegate, so `RemoveListener` cannot find the added one.',
        '`RemoveListener` only removes persistent listeners, the ones added in the Inspector.',
        '`OnDisable` is not called when the GameObject is deactivated with `SetActive(false)`.',
        'Listeners added from code are serialized and restored when the object is reactivated.'
      ],
      explanation: 'Two lambdas, even with the same body, are compiled into different methods, so their delegates are not equal and `RemoveListener` cannot find the one that was added and removes nothing: each `OnEnable` adds one more. Fix: pass the method directly (`AddListener(StartGame)` and `RemoveListener(StartGame)`) or store the lambda in a `UnityAction` field (two delegates for the same method on the same object do compare equal). `RemoveListener` works on listeners added from code (not on persistent Inspector listeners), `OnDisable` is called on `SetActive(false)`, and runtime listeners are not serialized.'
    },
    'sys-30': {
      topic: 'Persistence',
      q: 'Which fields will appear in the JSON generated by `JsonUtility.ToJson(data)`?',
      options: [
        '`coins`, `level` and `items`, with the `id` and `amount` of each object.',
        'Only `coins` and `level`; `items` is skipped and `deaths` has no `[SerializeField]`.',
        '`coins` and `items`; private fields like `level` are never serialized.',
        '`coins`, `level`, `deaths` and `items`, because the class is `[Serializable]`.'
      ],
      explanation: '`JsonUtility` follows the rules of the Unity serializer: it saves public fields and private fields with `[SerializeField]` (which is why `level` appears) and ignores private fields without the attribute (`deaths`). `items` is a list of `InventoryItem`, which has no `[System.Serializable]`, so the whole field is skipped without an error; adding the attribute to `InventoryItem` fixes it. `SaveData` being serializable does not make the classes it contains serializable.'
    }
  }
});
