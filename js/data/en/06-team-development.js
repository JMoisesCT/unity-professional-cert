UCP.addTranslation('en', {
  domain: {
    id: 'team',
    title: 'Working in professional software development teams',
    description: 'Version control, testing and debugging, and modular, readable and reusable script structure.',
    objectives: [
      'Recognize the concepts and impact of version control using technologies such as Git (and Unity Version Control).',
      'Demonstrate knowledge of developer testing and its impact on the development process: Unity Test Framework, Profiler and traditional debugging techniques.',
      'Recognize techniques for structuring scripts in a modular, readable and reusable way.'
    ],
    tips: [
      'Put **Assets**, **Packages** and **ProjectSettings** under version control (with all `.meta` files). Do not version **Library**, **Temp**, **Obj**, **Logs**, **UserSettings** or build folders.',
      '`.meta` files store the GUID of each asset: if they are lost, references in scenes and prefabs break.',
      'Settings for team work: **Asset Serialization = Force Text** and **Version Control = Visible Meta Files**. For large binaries, use **Git LFS**. To resolve conflicts in scenes and prefabs, use **UnityYAMLMerge** (Smart Merge).',
      'Tests: **Edit Mode** for pure, fast logic (`[Test]`). **Play Mode** when you need frames, physics or coroutines (`[UnityTest]`, which returns `IEnumerator`). Tests require **Assembly Definitions**.',
      'Lifecycle order: `Awake` → `OnEnable` → `Start` → `FixedUpdate` → `Update` → `LateUpdate` → ... → `OnDisable` → `OnDestroy`.',
      'Initialize your own references in `Awake` and use references to other objects in `Start`.',
      'Design: single responsibility (small components), interfaces (`IDamageable`), events for decoupling, `[SerializeField] private` instead of public fields, `[RequireComponent]` and namespaces.',
      'Whenever you subscribe to an event in `OnEnable`, unsubscribe in `OnDisable`.'
    ]
  },
  questions: {
    'team-01': {
      topic: 'Version control',
      q: 'Which **three** folders of a Unity project **must** be under version control? (Choose 3)',
      options: ['Assets', 'Packages', 'ProjectSettings', 'Library', 'Temp', 'Logs'],
      explanation: '`Assets` (with its `.meta` files), `Packages` (`manifest.json` and `packages-lock.json`) and `ProjectSettings` define the project. `Library`, `Temp` and `Logs` are caches that Unity regenerates, and they are also huge: they belong in `.gitignore`.'
    },
    'team-02': {
      topic: 'Version control',
      q: 'A teammate committed new assets but **not** their `.meta` files. What is most likely to happen when you pull?',
      options: [
        'References in scenes and prefabs break, because Unity generates new GUIDs.',
        'Nothing: Unity regenerates the `.meta` files with the same GUIDs.',
        'Unity does not import those assets until someone commits the `.meta` files.',
        'The assets import correctly and only lose their compression settings.'
      ],
      explanation: 'Each `.meta` file contains the asset GUID and its import settings. Scenes and prefabs reference assets by GUID, not by path. If each developer generates their own GUID, the references no longer match.'
    },
    'team-03': {
      topic: 'Version control',
      q: 'Which Editor setting makes it easier to diff and merge scenes and prefabs in Git?',
      options: [
        'Asset Serialization Mode = **Force Text**, which saves assets as YAML.',
        'Asset Serialization Mode = **Force Binary**, which is smaller and merges better.',
        'Version Control Mode = **Hidden Meta Files**, so that Git ignores the metadata.',
        'Enabling **Enter Play Mode Options** to avoid reloading the domain.'
      ],
      explanation: 'With Force Text, scenes, prefabs and ScriptableObjects are saved as readable YAML, so Git can show differences and perform merges. In binary format, any conflict forces you to keep one of the two versions.'
    },
    'team-04': {
      topic: 'Version control',
      q: 'The Git repository is growing enormously because of PSD, WAV and FBX files that are modified often. What is the most appropriate solution?',
      options: ['Git LFS (Large File Storage)', 'Commit the files compressed as ZIP', 'Add them to `.gitignore` and share them by email', 'Run `git gc` every day'],
      explanation: 'Git LFS stores large binaries outside the normal history and keeps only a lightweight pointer in the repository. This way, cloning does not mean downloading every version of every binary. LFS also supports file locking (`git lfs lock`).'
    },
    'team-05': {
      topic: 'Version control',
      q: 'Which tool included with Unity helps resolve merge conflicts in YAML-formatted scenes and prefabs?',
      options: [
        'UnityYAMLMerge (Smart Merge)',
        'Unity Accelerator (cache server)',
        'Asset Database v2 (asset importer)',
        'Unity Build Automation (Cloud Build)'
      ],
      explanation: 'UnityYAMLMerge understands the structure of Unity files and can merge changes that a generic text tool would flag as conflicts. You configure it as the merge tool in Git or in Unity Version Control.'
    },
    'team-06': {
      topic: 'Version control',
      q: 'Two developers have constant conflicts because they edit the same large scene. Which strategy reduces conflicts the most?',
      options: [
        'Split the scene into **prefabs** and additive scenes that are edited separately.',
        'Change asset serialization to Force Binary so that Git does not detect conflicts.',
        'Have both work on the same branch and pull before every commit.',
        'Exclude the scene from version control and share it some other way.'
      ],
      explanation: 'Conflicts happen when two people modify the same file. Prefabs (including nested prefabs) and additive scenes split the content into smaller files. File locking in LFS or Unity Version Control also helps.'
    },
    'team-07': {
      topic: 'Testing',
      q: 'You want to verify that a pure function `CalculateDamage(attack, armor)` returns the correct value, quickly and without entering Play Mode. Which type of test should you use?',
      options: [
        'An **Edit Mode** test with `[Test]`.',
        'A Play Mode test with `[UnityTest]`.',
        'A manual test in Play Mode.',
        'A test using the Profiler.'
      ],
      explanation: 'Edit Mode tests run in the Editor without entering Play Mode, so they are very fast. They are ideal for pure logic that does not depend on frames, physics or the MonoBehaviour lifecycle.'
    },
    'team-08': {
      topic: 'Testing',
      q: 'Why does this test use `[UnityTest]` instead of `[Test]`?',
      options: [
        'Because it needs to let time and frames pass using `yield`.',
        'Because `[Test]` does not allow `Assert.Less` with float values.',
        'Because `[UnityTest]` runs on a separate thread and is faster.',
        'Because tests with `[Test]` cannot create new GameObjects in the scene.'
      ],
      explanation: '`[UnityTest]` runs as a coroutine: you can use `yield return null` (one frame), `WaitForSeconds`, `WaitForFixedUpdate`, etc. A regular `[Test]` runs synchronously in a single call. Because it relies on physics, this test must run in Play Mode.'
    },
    'team-09': {
      topic: 'Testing',
      q: 'You created a tests folder with its own Assembly Definition, but the tests cannot find your game classes (compilation error). What is the most likely cause?',
      options: [
        'The game compiles into `Assembly-CSharp`, which an asmdef cannot reference: give the game its own asmdef.',
        'Tests must be inside a folder named `Editor`, or the test assembly cannot compile.',
        'Game classes must be `public static` so that the test assembly can see them.',
        'You must add `using NUnit.Framework;` to every game class.'
      ],
      explanation: 'Scripts without an asmdef are compiled into the predefined `Assembly-CSharp` assembly, which cannot be referenced from an asmdef. The usual setup is `MyGame.asmdef` and `MyGame.Tests.asmdef`, with the second one referencing the first.'
    },
    'team-10': {
      topic: 'Code structure',
      q: 'What is a main advantage of using **Assembly Definitions** in a large project?',
      options: [
        'They compile faster and force you to declare dependencies between modules.',
        'They make code run faster at runtime thanks to the Burst compiler.',
        'They reduce build size because each assembly is compressed separately in the build.',
        'They allow each project folder to use a different version of C#.'
      ],
      explanation: 'Without asmdefs, any change recompiles all of `Assembly-CSharp`. With asmdefs, code is split into assemblies with declared dependencies, which also prevents circular references and improves the architecture.'
    },
    'team-11': {
      topic: 'Debugging',
      q: 'You want to stop execution at a specific line and inspect variables from Visual Studio or Rider while playing in the Editor. What should you do?',
      options: [
        'Set a breakpoint and **attach the IDE debugger** to the Editor (Attach to Unity).',
        'Add `Debug.Break()` on that line and check the variables in the Console window.',
        'Open the Frame Debugger and step through until you reach that line of the script.',
        'Enable Deep Profile and look up the variable values in the Profiler.'
      ],
      explanation: 'Supported IDEs can attach to the Editor process or to a Development Build (with Script Debugging). In Release mode, Unity optimizes the code and might not stop at breakpoints. To debug, switch to Debug mode from the icon in the status bar.'
    },
    'team-12': {
      topic: 'Debugging',
      q: 'What happens to `Debug.Log` calls in a release build (without Development Build)?',
      options: [
        'They still run and have a cost; to strip them, use a wrapper with `[Conditional]`.',
        'The compiler removes them automatically when Development Build is disabled in the Build Profile.',
        'They run, but Unity discards the arguments without evaluating them, so they have no cost at all.',
        'They only run if a debugger is attached; otherwise they are ignored.'
      ],
      explanation: 'Unity does not strip `Debug.Log` from builds. A wrapper with `[System.Diagnostics.Conditional("ENABLE_LOGS")]` makes the compiler remove the call (and its arguments) if you do not define that symbol. `Debug.unityLogger.logEnabled = false` turns off log output, but the calls (and the string building for their arguments) still run.'
    },
    'team-13': {
      topic: 'Code structure',
      q: 'You have a 2000-line `PlayerController` that handles input, movement, health, sound and UI. Which principle would you apply to refactor it?',
      options: [
        'Split it into **single-responsibility** components (`PlayerMovement`, `PlayerHealth`...).',
        'Convert it into a `static` class so that it can be accessed from any script.',
        'Move it into a ScriptableObject so that it does not depend on any GameObject in the scene.',
        'Split it into several `partial` classes of the same `PlayerController` to divide the file.'
      ],
      explanation: 'Unity\'s component-based approach fits the single responsibility principle: small, testable and reusable pieces (for example, `Health` can also be used for enemies). It also makes parallel work easier and reduces merge conflicts.'
    },
    'team-14': {
      topic: 'Code structure',
      q: 'What is the advantage of this design?',
      options: [
        'It damages any `IDamageable` without knowing its concrete type.',
        'It makes `OnTriggerEnter` run before the other physics callbacks.',
        'It avoids having to add colliders to the objects that take damage.',
        'None: `TryGetComponent` does not work with interfaces, so it does not compile.'
      ],
      explanation: 'Programming against interfaces decouples systems and makes it easy to add new types without touching the projectile (open/closed principle). `GetComponent` and `TryGetComponent` work with interfaces, and `TryGetComponent` does not allocate garbage when the component does not exist.'
    },
    'team-15': {
      topic: 'Code structure',
      q: 'After changing scenes, a `MissingReferenceException` appears inside `UpdateUI`. What is missing?',
      options: [
        'Unsubscribing in `OnDisable` with `GameEvents.OnScoreChanged -= UpdateUI;`.',
        'Subscribing in `Start` instead of in `OnEnable`.',
        'Checking in `UpdateUI` whether `GameEvents` is `null` before using it.',
        'Marking `scoreText` as `static` so that it survives the scene change.'
      ],
      explanation: 'A `static` event survives scene changes. If you do not unsubscribe, it keeps pointing to the method of a destroyed component, and when it fires it accesses that component\'s `scoreText`, which no longer exists. It also prevents the GC from freeing the C# object. The `OnEnable`/`OnDisable` pair is the standard pattern.'
    },
    'team-16': {
      topic: 'Code structure',
      q: 'You want a field to appear in the Inspector, but other classes must **not** be able to modify it. How do you declare it?',
      options: ['`[SerializeField] private float speed;`', '`public float speed;`', '`[HideInInspector] [SerializeField] float speed;`', '`[NonSerialized] private float speed;`'],
      explanation: '`[SerializeField]` makes Unity serialize and display a private field, so you keep encapsulation. `public` exposes it to all code. `[HideInInspector]` hides it from the Inspector even though the field is serialized, and `[NonSerialized]` prevents it from being serialized.'
    },
    'team-17': {
      topic: 'Code structure',
      q: 'Your script always needs a `Rigidbody` on the same GameObject. How do you guarantee that it is present?',
      options: [
        'With the `[RequireComponent(typeof(Rigidbody))]` attribute on the class.',
        'By calling `AddComponent<Rigidbody>()` in every `Update`.',
        'With a code comment that warns about the dependency.',
        'With the `[ExecuteAlways]` attribute on the class.'
      ],
      explanation: '`RequireComponent` automatically adds the component when the script is added and prevents it from being removed while the script is present. It documents the dependency and prevents setup errors.'
    },
    'team-18': {
      topic: 'Lifecycle',
      q: '`GameManager.Instance` is assigned in the `Awake` of `GameManager`. Another script accesses `GameManager.Instance` in **its own** `Awake` and sometimes gets `null`. What is the recommended solution?',
      options: [
        'Access `GameManager.Instance` in `Start` instead of `Awake`.',
        'Manually call the GameManager\'s `Awake` before using `Instance`.',
        'Move the `Instance` assignment to the GameManager\'s `Start`.',
        'Access `GameManager.Instance` from `OnValidate`.'
      ],
      explanation: 'The order of `Awake` calls across different objects is not guaranteed (unless you use Script Execution Order). The convention is: initialize your own state in `Awake` and use other objects in `Start`. Another option is to adjust the Script Execution Order or use `[DefaultExecutionOrder]`.'
    },
    'team-19': {
      topic: 'Lifecycle',
      q: 'What is the correct order of the first calls of an active MonoBehaviour when the scene loads?',
      options: [
        '`Awake` → `OnEnable` → `Start` → `FixedUpdate` → `Update` → `LateUpdate`',
        '`OnEnable` → `Awake` → `Start` → `Update` → `FixedUpdate` → `LateUpdate`',
        '`Start` → `Awake` → `OnEnable` → `Update` → `LateUpdate` → `FixedUpdate`',
        '`Awake` → `Start` → `OnEnable` → `Update` → `FixedUpdate` → `LateUpdate`'
      ],
      explanation: '`Awake` and `OnEnable` are called when the object is created or activated. `Start` is called before the first frame in which the script is updated. In each frame, physics (`FixedUpdate`, which can run 0 or more times) comes before `Update`, and `LateUpdate` comes last.'
    },
    'team-20': {
      topic: 'Version control',
      q: 'Which workflow is the most common for integrating features in a team that uses code review?',
      options: [
        'Feature branches and **pull requests** with review before merging into main.',
        'Everyone commits directly to main and reviews the history every Friday.',
        'One branch per developer that is merged into main once at the end of the project.',
        'Work without branches and resolve conflicts with `git push --force`.'
      ],
      explanation: 'Feature branches isolate work in progress, and pull requests make it possible to review code, run automated tests (CI) and keep the main branch stable.'
    },
    'team-21': {
      topic: 'Code structure',
      q: 'Your `Timer` class clashes with another `Timer` class from an Asset Store asset and the project does not compile. What is the best practice?',
      options: [
        'Use your own **namespace**, such as `MyStudio.Gameplay`.',
        'Mark your class as `internal` so it does not clash with the asset class.',
        'Move your script to the `Plugins` folder so that it compiles first.',
        'Make your class `partial` so that it merges with the asset class.'
      ],
      explanation: 'Namespaces prevent name collisions and organize code by module. This is standard practice in teams and in reusable code.'
    },
    'team-22': {
      topic: 'Version control',
      q: 'Your team includes artists who work with many large binary files and do not want to use the command line. What advantage does **Unity Version Control** (formerly Plastic SCM) offer?',
      options: [
        'It supports **file locking** (*exclusive checkout*) and offers a simple workflow for artists (Gluon).',
        'It automatically merges binary files such as PSD or FBX when two people edit them at the same time.',
        'It stores binaries in the Library folder, so they do not take up space on the server.',
        'It removes the need to version `.meta` files, because it manages GUIDs on its own.'
      ],
      explanation: 'Unity Version Control is designed for asset-heavy projects: Editor integration, file locking and a mode for artists (Gluon) that works only with the files they need. Binary files such as PSD cannot be merged, which is why they are locked.'
    },
    'team-23': {
      topic: 'Code structure',
      q: 'In Unity 6 you want to wait 2 seconds inside an `async` method of a MonoBehaviour, without coroutines and respecting the Unity lifecycle. What do you use?',
      options: [
        '`await Awaitable.WaitForSecondsAsync(2f);`',
        '`await Task.Delay(TimeSpan.FromSeconds(2));`',
        '`yield return new WaitForSeconds(2f);`',
        '`Thread.Sleep(TimeSpan.FromSeconds(2));`'
      ],
      explanation: '`Awaitable` (Unity 2023.1+ / Unity 6) is integrated with the player loop: it respects `Time.timeScale` and resumes on the main thread. You can also pass `destroyCancellationToken` as the second argument so it is cancelled if the object is destroyed. `Task.Delay` knows nothing about Unity (it keeps running after you exit Play Mode and does not work well on WebGL), `yield return` only works in coroutines and `Thread.Sleep` freezes the game.'
    },
    'team-24': {
      topic: 'Lifecycle',
      q: 'In the scene, the GameObject is **active**, but the `Probe` component is **disabled** (checkbox cleared in the Inspector). What is printed when the scene loads?',
      options: [
        'Only `Awake`; the rest waits until the component is enabled.',
        '`Awake` and `OnEnable`; only `Start` waits until the component is enabled.',
        'Nothing: a disabled component does not receive any Unity messages.',
        '`Awake`, `OnEnable` and `Start`, because the GameObject is active.'
      ],
      explanation: '`Awake` is called when the scene loads as long as the **GameObject** is active, even if the component is disabled. `OnEnable` and `Start` depend on the component: when another script sets `probe.enabled = true`, `OnEnable` is called at that moment and `Start` just before the script\'s first `Update`. `OnDisable` does not appear because the component was never enabled. If the GameObject were inactive, not even `Awake` would be called.'
    },
    'team-25': {
      topic: 'Lifecycle',
      q: 'Your `InputManager` initializes data in `Awake` that other scripts read in **their own** `Awake`. You need the `Awake` of `InputManager` to always run first. Which **two** options guarantee this? (Choose 2)',
      options: [
        'Add the `[DefaultExecutionOrder(-100)]` attribute to the `InputManager` class.',
        'Give it a negative value in **Project Settings > Script Execution Order**.',
        'Place the `InputManager` GameObject at the top of the Hierarchy.',
        'Move the initialization to `OnEnable`, which is called before any `Awake`.',
        'Mark the class with `[ExecuteAlways]` so that it initializes before the others.'
      ],
      explanation: 'Script Execution Order (in Project Settings or with `[DefaultExecutionOrder]`) defines the order in which scripts receive `Awake`, `OnEnable`, `Update`, etc.: lower (negative) values run before the *Default Time* group. Hierarchy order is not guaranteed. `OnEnable` is called right after the `Awake` of the **same** object, not before every `Awake`, and `[ExecuteAlways]` only makes the script also run in Edit Mode.'
    },
    'team-26': {
      topic: 'Lifecycle',
      q: 'You want to take a screenshot with `ReadPixels` once the camera and the UI have been rendered in the current frame. Which line goes in `???`?',
      options: [
        '`yield return new WaitForEndOfFrame();`',
        '`yield return null;`',
        '`yield return new WaitForFixedUpdate();`',
        '`yield return new WaitForSeconds(0.1f);`'
      ],
      explanation: '`WaitForEndOfFrame` resumes the coroutine at the end of the frame, after all cameras and the UI have been rendered and just before the frame is displayed: that is when you can read the screen. `yield return null` and `WaitForSeconds` resume after `Update`, before rendering. `WaitForFixedUpdate` resumes after the physics step, which is the right moment to apply forces, not to read pixels.'
    },
    'team-27': {
      topic: 'Debugging',
      q: 'You call this code in `Start` to check which way an enemy is facing. You see nothing in the Game view, and in the Scene view the line only flashes for an instant. Which **two** facts explain this? (Choose 2)',
      options: [
        'Without the `duration` parameter (0 by default), the line lasts only one frame.',
        '`Debug.DrawRay` lines show in the Scene view; in Game, only if Gizmos is enabled.',
        '`Debug.DrawRay` only draws when called from `OnDrawGizmos`.',
        'The ray has to hit a Collider for the line to be drawn.',
        '`Debug.Draw*` calls only work in a Development Build, not in the Editor.'
      ],
      explanation: 'With `duration` = 0, the line is drawn for a single frame, and since `Start` runs once, you barely see it. Use `Debug.DrawRay(origin, dir, color, 5f)` or call it in `Update`. Also, `Debug.DrawLine` and `Debug.DrawRay` are drawn in the Scene view, and in the Game view only if the **Gizmos** button is enabled. `OnDrawGizmos` is for the `Gizmos` API (`Gizmos.DrawRay`), and `Debug.DrawRay` does not perform a raycast, so it needs no colliders. These lines are an Editor aid: they do not show in builds.'
    },
    'team-28': {
      topic: 'Debugging',
      q: 'With the default Console settings, a teammate calls `TakeDamage(-5)` while playing in the Editor. Which **two** things happen? (Choose 2)',
      options: [
        'An assert-type error message with the given text appears in the Console.',
        'The method keeps running and `health` becomes 105.',
        'An exception is thrown and `health` stays at 100.',
        'The Editor pauses automatically, as with `Debug.Break()`.',
        'Nothing: `Debug.Assert` is only evaluated in release builds.'
      ],
      explanation: '`Debug.Assert` logs a `LogType.Assert` message (shown as an error) when the condition is false, but it does **not** throw an exception or stop the method, so `health` ends up at 105. It does not pause the Editor either: that is what `Debug.Break()` does, or the Console\'s *Error Pause* option if you enable it. And the last option has it backwards: asserts are checked in the Editor and in Development Builds (the `UNITY_ASSERTIONS` symbol), and they are stripped from release builds.'
    },
    'team-29': {
      topic: 'Testing',
      q: '`CalculateDamage` should return `attack - armor`. Which line completes the test following the NUnit convention, so that the failure message shows the expected and actual values correctly?',
      options: [
        '`Assert.AreEqual(30, result);`',
        '`Assert.AreEqual(result, 30);`',
        '`Assert.Equals(30, result);`',
        '`Assert.IsTrue(result.Equals("30"));`'
      ],
      explanation: 'The signature is `Assert.AreEqual(expected, actual)`: the expected value first, then the actual one. With the arguments swapped the test passes or fails the same way, but if `result` were 25, the message would say *Expected: 25 But was: 30* and mislead whoever reads it. `Assert.Equals` is the `Equals` inherited from `object`, and NUnit blocks it: it throws `InvalidOperationException`. `result.Equals("30")` compares an `int` with a `string`, so it is always `false`.'
    },
    'team-30': {
      topic: 'Testing',
      q: '`Load` logs `Debug.LogError("Save not found")` when the file does not exist, which is exactly what you want to check. However, the test fails. Which line, placed **before** the call to `Load`, makes it pass and also verifies that error?',
      options: [
        '`LogAssert.Expect(LogType.Error, "Save not found");`',
        '`LogAssert.ignoreFailingMessages = false;`',
        '`Assert.Throws<Exception>(() => loader.Load("missing.json"));`',
        '`LogAssert.NoUnexpectedReceived();`'
      ],
      explanation: 'Unity Test Framework fails any test that logs an **unexpected** error, assert or exception. `LogAssert.Expect` declares that message as expected: the test passes if it appears and fails if it does not. `ignoreFailingMessages = false` is the default value (with `true` the test would pass, but without checking anything). `NoUnexpectedReceived` only checks that there are no unexpected messages up to that point, and `Assert.Throws` fails because `Load` does not throw any exception.'
    },
    'team-31': {
      topic: 'Testing',
      q: 'Your team is starting to use Unity Test Framework. Which **two** statements are correct? (Choose 2)',
      options: [
        'A `[UnityTest]` returns `IEnumerator`; with `yield return null` it waits one frame.',
        'Play Mode tests can run in the Editor or in a player build on the device.',
        'An Edit Mode `[Test]` can wait one second with `yield return new WaitForSeconds(1f)`.',
        'A method marked `[SetUp]` runs only once before all the tests in the class.',
        'The asmdef for Edit Mode tests must include all platforms, not just Editor.'
      ],
      explanation: '`[UnityTest]` runs as a coroutine, so it can use `yield` to let frames pass. Play Mode tests can run in the Editor or be built into a player (for example, for Android) from the Test Runner. A `[Test]` is a synchronous `void` method and cannot use `yield`. `[SetUp]` runs before **each** test (for a single run there is `[OneTimeSetUp]`), and the Edit Mode test asmdef must include **only** the Editor platform.'
    },
    'team-32': {
      topic: 'Code structure',
      q: '`Door` calls `doorOpened.Raise()` when it opens. What is the main advantage of this design over giving `Door` a direct reference to `DoorUI`?',
      options: [
        '`Door` and `DoorUI` do not reference each other: they only share the event channel asset.',
        'The event subscriptions are saved in the asset and persist between sessions.',
        '`OnRaised` is invoked on another thread, so the UI never blocks the game.',
        'Because the channel is an asset, you no longer need to unsubscribe in `OnDisable`.'
      ],
      explanation: 'The ScriptableObject acts as an event channel: the sender and the listeners depend only on the asset, so you can test, reuse or replace each part separately, even if they live in different scenes or prefabs. Subscribers to an `event` are not serialized, `Invoke` runs synchronously on the same thread, and precisely because the asset outlives the scene, you must unsubscribe in `OnDisable` so you do not leave references to destroyed objects.'
    },
    'team-33': {
      topic: 'Version control',
      q: 'You installed Git LFS (`git lfs install`) in the repository, but new `.psd` files are still stored in full in the regular Git history. What is missing?',
      options: [
        'Register the pattern with `git lfs track "*.psd"` and commit `.gitattributes`.',
        'Add `*.psd` to `.gitignore` so that Git hands those files over to LFS storage.',
        'Switch Asset Serialization to Force Binary so that LFS recognizes PSD files.',
        'Run `git gc --aggressive` so that Git moves the existing PSD files to LFS storage.'
      ],
      explanation: '`git lfs install` only sets up the LFS hooks. For a file type to go to LFS, you must register it with `git lfs track`, which writes the rule to `.gitattributes`. That file must be committed so the whole team uses the same rules. Files already in the history do not change (you would have to migrate them with `git lfs migrate`). `.gitignore` removes files from Git entirely, and asset serialization has no effect on PSD files.'
    }
  }
});
