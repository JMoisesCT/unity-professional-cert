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
        'Cache the `Animator` in a field in `Awake` and use that reference in `Update`.',
        'Replace `GetComponent<Animator>()` with `FindObjectOfType<Animator>()`.',
        'Move the code to `FixedUpdate`.',
        'Use `GetComponentInChildren<Animator>()`.'
      ],
      explanation: 'Looking up components has a cost. Storing the reference once (in `Awake` or by assigning it through `[SerializeField]`) removes it from the loop. `FindObjectOfType` is much slower and could also return a different object. Bonus: use `Animator.StringToHash` for the parameter.'
    },
    'prf-02': {
      topic: 'Efficient scripting',
      q: 'The Profiler shows **GC Alloc** every frame caused by this code. What is the best solution?',
      options: [
        'Update the text only when the score changes.',
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
        'Enable Development Build so the Profiler shows every function.'
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
        'Make a build with **Development Build** and **Autoconnect Profiler**, and connect the Profiler to the device (over USB or the network).',
        'Profile in the Editor with the platform switched to Android: the result is the same.',
        'Install the Profiler on the phone from the Play Store.',
        'Enable Deep Profile in a release build.'
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
        'Static Batching for all buildings to reduce draw calls.',
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
        'Convert the sprites to 3D models.',
        'Disable mipmaps.',
        'Use one Canvas per sprite.'
      ],
      explanation: 'Sprites with different textures cannot be grouped into the same batch. A Sprite Atlas packs them into a single texture, so the sprites that share a material and an atlas can be drawn together.'
    },
    'prf-11': {
      topic: 'UI',
      q: 'A timer that changes every frame is on the same Canvas as hundreds of static HUD elements, and the Profiler shows high `Canvas.BuildBatch`. What do you do?',
      options: [
        'Move the frequently changing elements to their **own Canvas**.',
        'Merge all the Canvases in the game into one to reduce UI draw calls.',
        'Update the timer in `FixedUpdate` so the Canvas is rebuilt less often.',
        'Switch the Canvas to World Space so it does not depend on screen resolution.'
      ],
      explanation: 'When an element changes, Unity rebuilds the geometry of its entire Canvas. Separating dynamic from static content limits that rebuild. Disabling **Raycast Target** on non-interactive elements also helps.'
    },
    'prf-12': {
      topic: 'Efficient scripting',
      q: 'You call `Physics.OverlapSphere` every frame to detect nearby enemies, and it generates garbage. Which alternative do you use?',
      options: [
        '`Physics.OverlapSphereNonAlloc` with a `Collider[]` array created only once.',
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
        'Because `.tag` has been obsolete since Unity 2020 and raises a warning.',
        'Because `CompareTag` also takes the tags of child objects into account.',
        'Because `==` compares the string references, not their contents.'
      ],
      explanation: 'Reading `gameObject.tag` copies the string from the native engine and generates garbage. `CompareTag` performs the comparison without allocations and also warns you if the tag does not exist.'
    },
    'prf-14': {
      topic: 'Platforms',
      q: 'When does the code inside this block run?',
      options: [
        'Only in Android builds, not in the Editor (even if Android is the active platform).',
        'In the Editor and on Android.',
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
        'Keep a high, stable frame rate that matches the headset refresh rate (72/90/120 Hz).',
        'Add camera shake and *head bob* for realism.',
        'Use Screen Space - Overlay UI.'
      ],
      explanation: 'Motion sickness occurs when the motion you see does not match what your body feels, or when FPS drops. Teleportation, snap turn, vignettes while moving and stable FPS reduce it. Camera shake makes it worse, and Overlay UI does not even display correctly in VR.'
    },
    'prf-20': {
      topic: 'XR',
      q: 'What is the recommended way to display a menu in a VR application?',
      options: [
        'A **World Space** Canvas, at a comfortable distance.',
        'A Screen Space - Overlay Canvas, drawn on top of everything in both eyes.',
        'A Screen Space - Camera Canvas, placed a few centimeters from the eyes.',
        'Show the menu only on the PC monitor (mirror) and navigate it with the keyboard.'
      ],
      explanation: 'In XR there is no flat "screen": the UI must exist in the world, at a readable distance and size, without rigidly following the head. The XR Interaction Toolkit uses a `TrackedDeviceGraphicRaycaster` to interact with a World Space Canvas.'
    },
    'prf-21': {
      topic: 'XR',
      q: 'Which stereo rendering mode reduces CPU cost by drawing both eyes in a single pass using instancing?',
      options: ['Multi Pass', 'Single Pass Instanced', 'Deferred Shading', 'Forward+'],
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
    }
  }
});
