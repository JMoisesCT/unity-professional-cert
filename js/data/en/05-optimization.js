UCP.addTranslation('en', {
  domain: {
    id: 'perf',
    title: 'Optimizing for performance and platforms',
    description: 'Diagnosis with the Profiler and other tools, platform- or hardware-specific optimizations, and best practices for XR.',
    objectives: [
      'Evaluate errors and performance issues using tools such as the Unity Profiler, the Frame Debugger and the Memory Profiler.',
      'Identify optimizations based on the requirements of each build platform or hardware configuration.',
      'Know the UI conventions and common optimizations on XR platforms.'
    ],
    tips: [
      'First **measure**, then optimize: Profiler (CPU, GPU, Memory, Rendering), Frame Debugger (draw calls) and Memory Profiler (snapshots).',
      'To profile on a real device: **Development Build** + **Autoconnect Profiler**. Deep Profile adds a lot of overhead; use `ProfilerMarker` to measure specific sections.',
      'In `Update`, avoid `GetComponent`, `Find`, string concatenation, LINQ and creating arrays: cache and reuse instead. The Profiler\'s **GC Alloc** column tells you who is generating garbage.',
      'Use the `NonAlloc` versions of physics queries, `CompareTag` instead of `tag ==`, and split dynamic UI from static UI into separate Canvases.',
      'Draw calls: Static Batching (objects that do not move), GPU Instancing (many copies of the same mesh and material), SRP Batcher (URP/HDRP) and Sprite Atlas (2D).',
      'GPU and scene: Occlusion Culling, LOD Group and texture compression (ASTC on modern mobile devices).',
      'IL2CPP is mandatory on iOS. If something is only used through reflection, *code stripping* may remove it: protect it with `link.xml` or `[Preserve]`.',
      'XR: keep FPS stable at the headset refresh rate, use **World Space** UI, teleportation and snap turn to prevent motion sickness, and **Single Pass Instanced** for stereo rendering.'
    ]
  },
  questions: {
    'prf-01': {
      topic: 'Efficient scripting',
      q: 'The Profiler shows `GetComponent` being called every frame on hundreds of enemies. What is the correct improvement?',
      options: [
        'Cache the `Animator` in a field in `Awake` and use it in `Update`.',
        'Replace `GetComponent<Animator>()` with `FindFirstObjectByType<Animator>()`.',
        'Move the code to `FixedUpdate` so it runs at a fixed rate.',
        'Use `GetComponentInChildren<Animator>()`.'
      ],
      explanation: 'Looking up components has a cost. Storing the reference once (in `Awake` or by assigning it through `[SerializeField]`) removes it from the loop. `FindFirstObjectByType` (the Unity 6 replacement for `FindObjectOfType`) is much slower and could also return a different object. Bonus: use `Animator.StringToHash` for the parameter.'
    },
    'prf-02': {
      topic: 'Efficient scripting',
      q: 'The Profiler shows **GC Alloc** every frame caused by this code. What is the best solution?',
      options: [
        'Update the text only on the frame where the score changes.',
        'Use `"Score: " + score.ToString()` to avoid boxing the integer.',
        'Call `System.GC.Collect()` every few frames to free the garbage.',
        'Move the line to `LateUpdate`, which does not allocate.'
      ],
      explanation: 'Concatenating strings creates a new string (garbage) every time. Doing it only when the value changes reduces allocations to practically zero. TextMeshPro also offers `SetText("Score: {0}", score)`, which avoids the allocation. Forcing the GC every frame is much worse.'
    },
    'prf-03': {
      topic: 'Profiler',
      q: 'You want to see in the Profiler how long your level generation function takes, **without** enabling Deep Profile. What do you do?',
      options: [
        'Use a `ProfilerMarker` (or `Profiler.BeginSample` / `EndSample`).',
        'Call `Debug.Log(Time.time)` at the start and end of the function.',
        'Open the Frame Debugger and look for the function in the event list.',
        'Enable Development Build to see every function.'
      ],
      explanation: '`ProfilerMarker` (Unity.Profiling) adds a custom-named sample to the Profiler hierarchy with very little overhead (and it is stripped from release builds). `Time.time` does not change within a frame, so it cannot be used for measuring.'
    },
    'prf-04': {
      topic: 'Profiler',
      q: 'What is the main drawback of **Deep Profile**?',
      options: [
        'It adds huge overhead that distorts the measured timings.',
        'It does not show method calls from your own scripts.',
        'It only works in release builds, not in the Editor.',
        'It disables the Profiler memory module while it is active.'
      ],
      explanation: 'Deep Profile records every C# method call, which gives a lot of detail but slows the game down and exaggerates the cost of small functions that are called often. Use it judiciously, and prefer your own markers.'
    },
    'prf-05': {
      topic: 'Profiler',
      q: 'The game runs slowly only on one specific Android phone. How do you profile it on that device?',
      options: [
        'A **Development Build** with **Autoconnect Profiler**, connected over USB or network.',
        'Profile in the Editor with the platform switched to Android: the result is the same.',
        'Install the Unity Profiler app from the Play Store and run it next to the game.',
        'Enable Deep Profile in a release build to see every method call.'
      ],
      explanation: 'The Editor performs very differently from a real device (CPU, GPU, memory, thermals). A Development Build can send data to the Editor Profiler. Always profiling on the target hardware is a key practice for the exam.'
    },
    'prf-06': {
      topic: 'Rendering',
      q: 'You want to step through the draw calls of a frame one by one and find out why two objects are not being batched together. Which tool do you use?',
      options: ['Frame Debugger', 'Memory Profiler', 'Console', 'Physics Debugger'],
      explanation: 'The Frame Debugger (Window > Analysis) pauses on a frame and shows each rendering event, including the reason a draw call was not batched with the previous one (different material, different keywords, etc.).'
    },
    'prf-07': {
      topic: 'Rendering',
      q: 'In the Built-in Render Pipeline you have thousands of identical rocks (same mesh and material) spawned at runtime in different positions. What reduces draw calls the most?',
      options: [
        'Turn on **Enable GPU Instancing** in the material.',
        'Mark the rocks as Batching Static after spawning them.',
        'Give each rock its own material instance.',
        'Disable shadows.'
      ],
      explanation: 'GPU Instancing draws many copies of the same mesh and material in a single draw call, with different transforms. Static batching is set up before the build, for objects that do not move. Giving each rock a different material would break any batching. In URP/HDRP, the SRP Batcher takes priority over instancing for compatible shaders.'
    },
    'prf-08': {
      topic: 'Rendering',
      q: 'A city has many buildings hidden behind others, yet the GPU still processes them. You already have frustum culling. Which technique do you add?',
      options: [
        '**Occlusion Culling**, with the occlusion data precomputed (baked).',
        'Static Batching on all the buildings to reduce the number of draw calls.',
        'Reduce the camera Far Clip Plane until they stop being drawn.',
        'A LOD Group on each building, with a Culled level at the end.'
      ],
      explanation: 'Frustum culling (automatic) discards what is outside the field of view, but not what is hidden behind other objects. Occlusion Culling uses precomputed data to avoid rendering what cannot be seen behind the occluders.'
    },
    'prf-09': {
      topic: 'Rendering',
      q: 'High-poly trees are still drawn at full detail even when they are very far away. Which component would you use?',
      options: ['`LODGroup`', '`OcclusionArea`', '`ReflectionProbe`', '`SortingGroup`'],
      explanation: 'A `LODGroup` switches between lower-detail versions of the mesh based on how much of the screen the object occupies, and can even hide it (culled) at long distances.'
    },
    'prf-10': {
      topic: 'Rendering',
      q: 'In a 2D game with many different sprites, the number of draw calls is very high. What is the first thing you should try?',
      options: [
        'Group the sprites into a **Sprite Atlas**.',
        'Turn the sprites into 3D Quads so they use GPU Instancing.',
        'Disable mipmaps.',
        'Use a separate Canvas for each sprite.'
      ],
      explanation: 'Sprites with different textures cannot be grouped into the same batch. A Sprite Atlas packs them into a single texture, so the sprites that share a material and an atlas can be drawn together.'
    },
    'prf-11': {
      topic: 'UI',
      q: 'A timer that changes every frame is on the same Canvas as hundreds of static HUD elements, and the Profiler shows high `Canvas.BuildBatch`. What do you do?',
      options: [
        'Move the frequently changing elements to their **own Canvas**.',
        'Merge every Canvas in the game into a single one.',
        'Update the timer in `FixedUpdate` so the Canvas rebuilds less often.',
        'Switch the Canvas to World Space so it ignores screen resolution.'
      ],
      explanation: 'When an element changes, Unity rebuilds the geometry of its entire Canvas. Separating dynamic from static content limits that rebuild. Disabling **Raycast Target** on non-interactive elements also helps.'
    },
    'prf-12': {
      topic: 'Efficient scripting',
      q: 'You call `Physics.OverlapSphere` every frame to detect nearby enemies, and it generates garbage. Which alternative do you use?',
      options: [
        '`Physics.OverlapSphereNonAlloc` with a reused `Collider[]` buffer.',
        '`Physics.SphereCastAll`',
        '`GameObject.FindGameObjectsWithTag("Enemy")` and compare distances.',
        'Create a new array every frame and clear it afterwards.'
      ],
      explanation: 'The `NonAlloc` versions write the results into a buffer that you create once and return how many there are, without generating garbage. `SphereCastAll` and `FindGameObjectsWithTag` create new arrays on every call.'
    },
    'prf-13': {
      topic: 'Efficient scripting',
      q: 'Why is `other.CompareTag("Enemy")` recommended instead of `other.tag == "Enemy"`?',
      options: [
        'Because reading `.tag` creates a new string and generates garbage.',
        'Because `.tag` has been obsolete since Unity 2020.',
        'Because `CompareTag` also takes the tags of child objects into account.',
        'Because `==` compares the string references, not their contents.'
      ],
      explanation: 'Reading `gameObject.tag` copies the string from the native engine and generates garbage. `CompareTag` performs the comparison without allocations and also warns you if the tag does not exist.'
    },
    'prf-14': {
      topic: 'Platforms',
      q: 'When does the code inside this block run?',
      options: [
        'Only in Android builds, never in the Editor.',
        'In the Editor (with Android active) and in Android builds.',
        'On all mobile platforms.',
        'Only if the Android device has a vibration motor.'
      ],
      explanation: 'Platform compilation symbols (`UNITY_ANDROID`, `UNITY_IOS`, `UNITY_STANDALONE`, `UNITY_EDITOR`...) remove code at compile time. In the Editor with Android active, `UNITY_ANDROID` and `UNITY_EDITOR` are both true, so the condition is false.'
    },
    'prf-15': {
      topic: 'Platforms',
      q: 'In an IL2CPP build, a class that is only created through **reflection** fails because it "does not exist". It works fine in the Editor. What is the cause and the solution?',
      options: [
        '**Managed code stripping** removed the class; protect it with `link.xml` or `[Preserve]`.',
        'IL2CPP does not support reflection, so the code must be rewritten without it.',
        'The scripting backend must be switched to Mono only for that class\'s assembly.',
        'The class must be marked with `[Serializable]` so that IL2CPP includes it in the build.'
      ],
      explanation: 'The Unity linker performs static analysis and removes code that does not appear to be used, to reduce build size. It cannot see references made through reflection. `link.xml`, `[Preserve]` or lowering the Managed Stripping Level prevents this.'
    },
    'prf-16': {
      topic: 'Platforms',
      q: 'Which scripting backend is **mandatory** for publishing to iOS?',
      options: ['Mono', 'IL2CPP', '.NET Native', 'Burst'],
      explanation: 'iOS does not allow code to be compiled at runtime (JIT), so Unity converts the IL to C++ with IL2CPP (AOT compilation). On Android, IL2CPP is required for ARM64, which is a Google Play requirement. Burst is a compiler for jobs, not a scripting backend.'
    },
    'prf-17': {
      topic: 'Platforms',
      q: 'Which texture compression format is recommended for most modern Android and iOS devices?',
      options: ['DXT / BCn', 'ASTC', 'Uncompressed RGBA32', 'PVRTC'],
      explanation: 'ASTC is supported by modern mobile GPUs and lets you choose the block size to balance quality and size. DXT/BC is for desktop and consoles, PVRTC is for older iPhones, and uncompressed RGBA32 uses a huge amount of memory.'
    },
    'prf-18': {
      topic: 'Platforms',
      q: 'On mobile, the game always runs at 30 FPS, even though the device can deliver more. What do you change?',
      options: [
        '`Application.targetFrameRate = 60;`',
        '`Time.fixedDeltaTime = 1f / 60f;`',
        '`QualitySettings.vSyncCount = 0;` and nothing else.',
        '`Time.timeScale = 2f;`'
      ],
      explanation: 'On mobile, the default rate (with `targetFrameRate = -1`) is usually capped at 30 FPS to save battery. You have to request 60 explicitly (and consider its impact on battery and temperature). On mobile, `vSyncCount` is ignored, and `fixedDeltaTime` only affects physics.'
    },
    'prf-19': {
      topic: 'XR',
      q: 'Which **two** measures reduce *motion sickness* in a VR application? (Choose 2)',
      options: [
        'Offer **teleportation** locomotion and stepped turning (*snap turn*).',
        'Keep FPS stable at the headset refresh rate (72/90/120 Hz).',
        'Add camera shake and *head bob* while walking for extra realism.',
        'Use Screen Space - Overlay UI so it is always visible.'
      ],
      explanation: 'Motion sickness occurs when the motion you see does not match what your body feels, or when FPS drops. Teleportation, snap turn, vignettes while moving and stable FPS reduce it. Camera shake makes it worse, and Overlay UI does not even display correctly in VR.'
    },
    'prf-20': {
      topic: 'XR',
      q: 'What is the recommended way to display a menu in a VR application?',
      options: [
        'A **World Space** Canvas at a comfortable reading distance.',
        'A Screen Space - Overlay Canvas drawn over both eyes.',
        'A Screen Space - Camera Canvas a few centimeters from the eyes.',
        'Show the menu only on the PC monitor (mirror).'
      ],
      explanation: 'In XR there is no flat "screen": the UI must exist in the world, at a readable distance and size, without rigidly following the head. The XR Interaction Toolkit uses a `TrackedDeviceGraphicRaycaster` to interact with a World Space Canvas.'
    },
    'prf-21': {
      topic: 'XR',
      q: 'Which stereo rendering mode reduces CPU cost by drawing both eyes in a single pass using instancing?',
      options: ['Multi Pass', 'Single Pass Instanced', 'Deferred Shading', 'Forward+ Rendering Path'],
      explanation: 'With Single Pass Instanced, each draw call renders both eyes at once (into a texture array), which roughly halves the CPU work compared to Multi Pass. Custom shaders must support it using the stereo macros.'
    },
    'prf-22': {
      topic: 'Profiler',
      q: 'You suspect that some textures are not released when changing scenes. Which tool lets you compare the memory state before and after?',
      options: [
        'The **Memory Profiler** package, comparing snapshots.',
        'The Frame Debugger, reviewing the textures of each draw call.',
        'The Profiler CPU module in Deep Profile mode.',
        'The Console window with a `Debug.Log` in `OnDestroy`.'
      ],
      explanation: 'The Memory Profiler captures snapshots with every object in memory (managed and native), what references them and how much space they take. By comparing two snapshots you can see which assets are still alive after changing scenes.'
    },
    'prf-23': {
      topic: 'Rendering',
      q: 'In a Unity 6 URP project with thousands of static and dynamic objects, which new feature automatically reduces the CPU cost of drawing them using the `BatchRendererGroup` API?',
      options: [
        '**GPU Resident Drawer**',
        'Classic **Occlusion Culling**',
        'Runtime **Static Batching**',
        '**Dynamic Batching**'
      ],
      explanation: 'The GPU Resident Drawer (Unity 6) keeps object data on the GPU and draws it with `BatchRendererGroup` and instancing, without changing your GameObjects. You enable it in the URP Asset and it requires, among other things, the **Forward+** rendering path. It pairs with **GPU Occlusion Culling**, also new in Unity 6.'
    },
    'prf-24': {
      topic: 'Platforms',
      q: 'In Unity 6 you want a "Demo" build and a "Full" build for Android, with different scenes and different scripting defines, and to switch between them easily. What do you use?',
      options: [
        'Two **Build Profiles** (File > Build Profiles)',
        'Two copies of the project',
        'An `#if DEMO` and editing Player Settings by hand before each build',
        'Two different Quality Levels'
      ],
      explanation: 'Unity 6 replaces the Build Settings window with **Build Profiles**: each profile stores the platform, the scene list, scripting defines and Player Settings overrides, and it can be versioned as an asset. You switch configuration without changing settings by hand.'
    },
    'prf-25': {
      topic: 'UI',
      q: 'In a mobile HUD, the counters and health bars sit inside several nested Horizontal/Vertical Layout Groups, on the same Canvas as the rest of the HUD. The Profiler shows spikes in `Canvas.SendWillRenderCanvases` and `Canvas.BuildBatch` every time they update. Which **two** changes reduce that cost? (Choose 2)',
      options: [
        'Move the changing elements to their own **nested Canvas**.',
        'Remove the nested Layout Groups from the elements that update.',
        'Disable **Raycast Target** on every image in the HUD, including the decorative ones.',
        'Merge the whole HUD into a single Canvas.',
        'Switch the Canvas to Screen Space - Camera so the main camera draws it.'
      ],
      explanation: 'When a UI element changes, Unity rebuilds the geometry (batch) of its entire Canvas; a **nested Canvas** limits that rebuild to the elements it contains. Also, when the size of a Layout Group child changes (for example, a longer text), the layout has to be recalculated in `SendWillRenderCanvases`, and nested Layout Groups multiply that work; for dynamic elements it is better to fix their positions or compute them in code. Disabling **Raycast Target** is good practice, but it reduces the cost of input raycasts, not of rebuilds. Merging everything into one Canvas makes the problem worse, and changing the render mode does not avoid rebuilds.'
    },
    'prf-26': {
      topic: 'UI',
      q: 'Your pause menu has hundreds of elements and is opened and closed often. Every time it appears, the Profiler shows a spike of Canvas rebuilding and `OnEnable` calls across the whole hierarchy. What is the best alternative to this code?',
      options: [
        'Disable the menu\'s `Canvas` component instead of its GameObject.',
        'Destroy the menu when closing it and instantiate the prefab again when opening it.',
        'Call `Canvas.ForceUpdateCanvases()` right after the `SetActive` call.',
        'Set its `CanvasGroup` `alpha` to 0 and leave the menu active all the time.'
      ],
      explanation: 'When you disable the component (`canvas.enabled = false`), the menu stops being drawn but keeps its geometry, and its children do not receive `OnDisable`/`OnEnable`, so showing it again does not trigger a full rebuild. Deactivating the GameObject discards that geometry and fires the callbacks of the whole hierarchy. Instantiating and destroying is even more expensive (and generates garbage), `ForceUpdateCanvases` forces exactly the rebuild you want to avoid, and a `CanvasGroup` with `alpha` 0 keeps the menu active in the hierarchy and, unless you also turn off `blocksRaycasts`, it still blocks clicks.'
    },
    'prf-27': {
      topic: 'Efficient scripting',
      q: 'This `Update` runs every frame. Which **two** lines allocate memory (GC Alloc) every time they run? (Choose 2)',
      options: [
        '`Vector3 offset = new Vector3(0f, 1f, 0f);`',
        '`transform.position += velocity * Time.deltaTime;`',
        '`foreach (Enemy e in enemies) total += e.Hp;`',
        '`var alive = enemies.Where(e => e.Hp > 0).ToList();`',
        '`hpLabel.text = "HP: " + total;`'
      ],
      explanation: '`Where(...).ToList()` creates an iterator and a new list on every call (LINQ almost always allocates), and the concatenation `"HP: " + total` creates a new string every frame. On the other hand, `new Vector3(...)` does not allocate on the heap because `Vector3` is a `struct`, vector math does not either, and `foreach` over a `List<T>` uses a `struct` enumerator, so it generates no garbage. The fix is to reuse a list filled with a loop and to update the text only when it changes (or use TextMeshPro\'s `SetText`).'
    },
    'prf-28': {
      topic: 'Efficient scripting',
      q: 'Two hundred spawners run this coroutine, and the Profiler shows constant small **GC Alloc** allocations that end up causing garbage collector hitches. What is the best solution?',
      options: [
        'Create the `WaitForSeconds` once in a field and always return that instance.',
        'Use `new WaitForSecondsRealtime(0.5f)`, which does not depend on `Time.timeScale`.',
        'Use `yield return 0.5f;`, which Unity interprets as a wait in seconds.',
        'Call `System.GC.Collect()` on every loop iteration.'
      ],
      explanation: '`WaitForSeconds` is a class, so every `new` creates an object on the heap. Since it only stores the duration, you can create it once (for example, in a `readonly` field) and return the same instance on every `yield`. `WaitForSecondsRealtime` is also a class and allocates just the same. `yield return 0.5f` does not wait half a second: it *boxes* the float (allocating memory) and only waits one frame. Forcing the GC on every iteration is far more expensive than the garbage it tries to clean up.'
    },
    'prf-29': {
      topic: 'Efficient scripting',
      q: 'This script is on 500 enemies, and the Profiler flags its `Update` as the most expensive thing in the frame. What is the main problem?',
      options: [
        '`GameObject.Find` searches the scene every frame; cache the player in `Start`.',
        '`Vector3.Distance` uses a square root; switching to `sqrMagnitude` solves it.',
        '`.material` creates a new material every frame; you must use `sharedMaterial`.',
        'Reading another object\'s position in `Update` is slow; it belongs in `LateUpdate`.'
      ],
      explanation: '`GameObject.Find` searches by name through every active object, and doing it 500 times per frame is what dominates the cost. Store the reference once (in `Start`, through `[SerializeField]` or via a manager) and cache the `Renderer` too. `sqrMagnitude` is a valid micro-optimization, but it does not fix the main problem. `.material` does not create a material every frame: it instantiates one the first time and then returns that copy. `LateUpdate` costs the same as `Update`.'
    },
    'prf-30': {
      topic: 'Efficient scripting',
      q: 'At the end of each battle you build a report with hundreds of hits, and the Profiler shows a spike of several MB of **GC Alloc** in this function. Which change reduces it the most?',
      options: [
        'Use a reused `StringBuilder` (with `Clear()`) and call `ToString()` at the end.',
        'Use `string.Format` in the loop, which writes over the same string without copying it.',
        'Replace the `foreach` with a `for`, because `foreach` allocates an enumerator per pass.',
        'Use interpolation (`$"{h.attacker} -> {h.damage}"`), which the compiler makes constant.'
      ],
      explanation: 'Strings are immutable: every `+=` copies the whole accumulated report into a new string, so the garbage grows quadratically with the number of hits. A `StringBuilder` appends text into an internal buffer and only creates the final string in `ToString()`; if you keep it in a field and call `Clear()`, you also reuse the buffer. `string.Format` and interpolation still create a new string on every iteration, and `foreach` over a `List<T>` does not allocate.'
    },
    'prf-31': {
      topic: 'Profiler',
      q: 'Your mobile game drops to 20 FPS in one level. Profiling on the device, you see that the main thread spends much of each frame in `Gfx.WaitForPresentOnGfxThread`. What does it mean and what do you do first?',
      options: [
        'The game is GPU bound: review overdraw, shaders and render resolution.',
        'The scripts are slow: enable Deep Profile to find the method blocking the thread.',
        'It is the VSync wait: set `QualitySettings.vSyncCount = 0` to remove that time.',
        'There is too much garbage: the GC pauses the thread every frame.'
      ],
      explanation: '`Gfx.WaitForPresentOnGfxThread` means the main thread is ready for the next frame, but the render thread is still waiting for the GPU to finish presenting the previous one: the typical sign of a **GPU bound** game. Optimizing scripts will not help; review overdraw, shader cost, post-processing, shadows or render resolution. Waiting for VSync or `targetFrameRate` shows up as `WaitForTargetFPS`, and garbage collector pauses show up as `GC.Collect`.'
    },
    'prf-32': {
      topic: 'Profiler',
      q: 'Your game hitches every few seconds and you suspect the garbage collector. Which **two** steps help you find which code generates the garbage? (Choose 2)',
      options: [
        'In CPU Usage (Hierarchy view), sort by the **GC Alloc** column.',
        'Enable **Call Stacks** for `GC.Alloc` and inspect each allocation\'s call stack.',
        'Open the Frame Debugger and look for GC events.',
        'Check the Profiler **Rendering** module, which shows memory per script.',
        'Use the **GPU Usage** module, which splits each frame\'s time per script.'
      ],
      explanation: 'The **GC Alloc** column of the CPU Usage module shows how many bytes each sample allocates in that frame, so sorting by it takes you straight to the methods that generate garbage. With **Call Stacks** enabled for `GC.Alloc`, the Profiler records the call stack of each allocation and you can see which code causes it without the overhead of Deep Profile. The Frame Debugger only shows rendering events, the Rendering module shows draw call and batch statistics, and GPU Usage measures GPU work, not your scripts.'
    },
    'prf-33': {
      topic: 'Rendering',
      q: 'In a URP project, you change the color of 300 units based on their team with this code. The Frame Debugger shows that those units no longer go through the **SRP Batcher**. What is the best solution?',
      options: [
        'Use one material per team with the same shader, without `MaterialPropertyBlock`.',
        'Create the `MaterialPropertyBlock` only once in a `static` field and reuse it.',
        'Enable Dynamic Batching in the URP Asset to group the objects that use a block.',
        'Use the `_Color` property instead of `_BaseColor`, which the SRP Batcher rejects.'
      ],
      explanation: 'Renderers that use a `MaterialPropertyBlock` are not compatible with the SRP Batcher. The SRP Batcher does not need objects to share a material: it batches the ones that use the **same shader variant**, even if each material has its own values. That is why one material per team keeps the batching. Reusing the block avoids garbage but does not restore compatibility, Dynamic Batching only helps with very small meshes and does not solve this, and the property name makes no difference (`_BaseColor` is the color of the URP Lit shader).'
    },
    'prf-34': {
      topic: 'Platforms',
      q: 'Your game runs at a stable 60 FPS on a phone for the first few minutes, but then slowly drops to 40 FPS without the scene changing. It does not happen in the Editor. What is the most likely cause?',
      options: [
        'The device heats up and lowers its CPU/GPU clock speed (*thermal throttling*).',
        'IL2CPP recompiles the code after a few minutes and it stops being optimized.',
        'Memory fills up with garbage and you must call `GC.Collect()` every minute.',
        'Textures are slowly decompressed in memory and end up saturating the GPU.'
      ],
      explanation: 'Phones lower their CPU and GPU clock speeds when they heat up, to protect the hardware, so a game that barely reaches 60 FPS ends up dropping. That is why you should profile on the device during long sessions, leave headroom in each frame budget (or set `Application.targetFrameRate = 30`) and, if needed, use the **Adaptive Performance** package to react to temperature. IL2CPP compiles AOT during the build, not at runtime, and forcing the GC does not fix a thermal problem.'
    }
  }
});
