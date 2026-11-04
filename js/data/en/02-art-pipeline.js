UCP.addTranslation('en', {
  domain: {
    id: 'art',
    title: 'Working in the art pipeline',
    description: 'Lighting, materials, shaders and textures; 2D and 3D animation; particle systems, all from a programmer\'s point of view.',
    objectives: [
      'Understand lighting, materials, shaders and textures, and how to manipulate them from scripts.',
      'Program 2D and 3D animation (Animator, parameters, transitions, layers, root motion, events).',
      'Control particle systems from code.'
    ],
    tips: [
      '`renderer.material` **creates an instance** of the material (it only affects that object, costs memory and breaks batching). `renderer.sharedMaterial` modifies the shared asset (it affects every object using it, and in the Editor the change **is saved**).',
      'To vary properties per object without creating material instances, use `MaterialPropertyBlock` (in URP, keep in mind that this makes the object incompatible with the SRP Batcher).',
      'Common property names: Built-in Standard uses `_Color` and `_MainTex`; URP Lit uses `_BaseColor` and `_BaseMap`. Emission requires the `_EMISSION` keyword.',
      'Cache IDs: `Animator.StringToHash("Speed")` and `Shader.PropertyToID("_BaseColor")` in `static readonly int` fields.',
      'If an Animator transition is "slow" to react, check **Has Exit Time**. If a trigger "fires by itself" later, remember that it stays set until a transition consumes it (`ResetTrigger`).',
      'Baked lighting + dynamic objects = **Light Probes**. Correct reflections on metals = **Reflection Probes**.',
      '`ParticleSystem` modules (`main`, `emission`, `shape`...) are structs: store them in a variable (`var main = ps.main;`) and modify that variable. There is no need to assign it back.'
    ]
  },
  questions: {
    'art-01': {
      topic: 'Materials',
      q: 'There are 50 enemies that share the same material. This code runs on **one** of them. What happens?',
      options: [
        'All 50 enemies turn red.',
        'Only that enemy turns red; Unity creates an instance (copy) of the material for its renderer.',
        'Only that enemy turns red, with no extra memory cost at all.',
        'It throws an exception because the material is shared.'
      ],
      explanation: 'When you access `.material`, Unity duplicates the material the first time and assigns it only to that renderer. It is convenient, but each instance uses memory, breaks batching and should be destroyed (`Destroy`) when you no longer need it. `.sharedMaterial` would modify the asset and affect all 50.'
    },
    'art-02': {
      topic: 'Materials',
      q: 'In URP, with the **Universal Render Pipeline/Lit** shader, which property name would you use with `SetColor` to change the base color?',
      options: ['`_Color`', '`_BaseColor`', '`_MainColor`', '`_Albedo`'],
      explanation: 'URP Lit uses `_BaseColor` (and `_BaseMap` for the texture). `_Color` is the name used by the Standard shader of the Built-in Render Pipeline. URP marks `_BaseColor` as `[MainColor]`, so `material.color` also works, but for the exam you should know the actual name.'
    },
    'art-03': {
      topic: 'Materials',
      q: 'You want each of 500 trees that share the same material to have a different tint, **without creating 500 material instances**. What would you use?',
      options: [
        '`renderer.material.color` on each tree.',
        'A `MaterialPropertyBlock` applied with `renderer.SetPropertyBlock`.',
        '`renderer.sharedMaterial.color` on each tree.',
        'Create 500 materials in the project.'
      ],
      explanation: '`MaterialPropertyBlock` stores property values per renderer without duplicating the material. `sharedMaterial` would change the color of all of them, and `.material` would create 500 instances. In URP, keep in mind that objects with a property block are no longer compatible with the SRP Batcher.'
    },
    'art-04': {
      topic: '3D animation',
      q: 'Why is this approach preferable to calling `animator.SetFloat("Speed", ...)`?',
      options: [
        'Because `SetFloat` with a string is obsolete and does not compile.',
        'Because it avoids hashing the string on every call, which is more efficient.',
        'Because it allows using parameters that do not exist in the Animator Controller.',
        'Because it automatically synchronizes the parameter over the network.'
      ],
      explanation: 'Internally, the Animator identifies parameters by an integer hash. With the overload that takes a string, the hash is computed every time. Storing it in a `static readonly int` is the recommended practice (the same applies to `Shader.PropertyToID`).'
    },
    'art-05': {
      topic: '3D animation',
      q: 'When you call `SetTrigger("Attack")`, the attack animation is slow to start because it waits for the Idle cycle to finish. What should you change on the Idle → Attack transition?',
      options: [
        'Disable **Has Exit Time** on that transition.',
        'Increase the **Exit Time** to 1 so that the transition starts sooner.',
        'Change the parameter from a trigger to a bool so it is evaluated sooner.',
        'Enable **Apply Root Motion** so the animation starts immediately.'
      ],
      explanation: 'With **Has Exit Time** enabled, the transition can only occur when the specified normalized time is reached, even if the condition is already met. For actions that need an immediate response (attacking, jumping), disable it and rely only on the parameter condition.'
    },
    'art-06': {
      topic: '3D animation',
      q: 'You call `SetTrigger("Jump")` while the character is in a state that has no transition using that trigger. Seconds later, when returning to Idle, the character jumps by itself. Why?',
      options: [
        'It is an Animator bug: triggers are cached until the controller is reset.',
        'A trigger stays set until a transition consumes it.',
        'Triggers are automatically reactivated every time the default state is entered.',
        'The `Jump` parameter should be a float so that it returns to 0 automatically.'
      ],
      explanation: 'A trigger is a bool that is automatically set to `false` **when a transition consumes it**. If no transition consumes it, it stays set and will be used as soon as there is a transition that uses it. `ResetTrigger` clears it.'
    },
    'art-07': {
      topic: '3D animation',
      q: 'You want to play a footstep sound exactly when the foot touches the ground in the walk animation. What is the most appropriate approach?',
      options: [
        'An **Animation Event** on the clip that calls a method of a script on the same GameObject as the `Animator`.',
        'A coroutine that plays the sound every 0.5 seconds.',
        'Checking `animator.GetCurrentAnimatorStateInfo(0).normalizedTime` in `FixedUpdate`.',
        'A trigger collider on each foot.'
      ],
      explanation: 'Animation Events call a method (by name) on the components of the GameObject that has the `Animator`, exactly at the specified frame of the clip. This keeps the sound synchronized even if the animation speed changes.'
    },
    'art-08': {
      topic: '3D animation',
      q: 'You need a smooth transition between Idle, Walk and Run based on the character\'s speed. What is the most appropriate solution?',
      options: [
        'Three states with transitions controlled by triggers.',
        'A **1D Blend Tree** controlled by a float parameter `Speed`.',
        'Three different Animator Controllers that are swapped from code.',
        'One Avatar Mask for each animation.'
      ],
      explanation: 'A Blend Tree blends several clips based on one or more parameters. For speed-based locomotion, a 1D Blend Tree driven by `Speed` gives a continuous blend without having to manage transitions. For 8-directional movement, 2D Blend Trees are used.'
    },
    'art-09': {
      topic: '3D animation',
      q: 'The character must be able to shoot (arms and torso) while running (legs). How do you solve this in the Animator?',
      options: [
        'By creating a "RunAndShoot" state with a combined animation.',
        'By adding a **layer** with an upper-body **Avatar Mask**, with weight 1 and Override blending.',
        'By using two `Animator` components on the same GameObject.',
        'By enabling Root Motion only on the torso.'
      ],
      explanation: 'Animator layers let you run several state machines at the same time. The Avatar Mask limits which bones each layer affects, so the legs follow the base layer (running) and the torso follows the shooting layer.'
    },
    'art-10': {
      topic: '3D animation',
      q: 'With **Apply Root Motion** enabled, you want to control yourself how the animation movement is applied (for example, passing it to a `CharacterController`). Which method do you implement?',
      options: ['`OnAnimatorIK`', '`OnAnimatorMove`', '`LateUpdate`', '`OnStateExit`'],
      explanation: 'If a script on the GameObject implements `OnAnimatorMove`, Unity stops applying root motion automatically and lets you do it yourself, using `animator.deltaPosition` and `animator.deltaRotation`. `OnAnimatorIK` is used for inverse kinematics.'
    },
    'art-11': {
      topic: 'Lighting',
      q: 'The scene uses **baked** lighting. The (dynamic) character looks flat and does not receive the indirect light from the environment. What do you add?',
      options: [
        'A Reflection Probe that follows the character at all times.',
        'A **Light Probe Group** in the areas where it moves.',
        'Mark the character as Contribute GI so that it receives lightmaps.',
        'Switch the Directional Light to Realtime mode only for the character.'
      ],
      explanation: 'Lightmaps are only applied to static objects. Light Probes store lighting (including indirect lighting) at points in space, and dynamic objects interpolate it. Marking an object that moves as Static makes no sense.'
    },
    'art-12': {
      topic: 'Lighting',
      q: 'A metallic object inside a room reflects the skybox instead of the walls. What fixes this?',
      options: [
        'A Light Probe Group.',
        'A **Reflection Probe** that covers the room.',
        'Lowering the Smoothness to 0.',
        'Switching the light to Realtime mode.'
      ],
      explanation: 'Without Reflection Probes, reflective materials use the skybox as their environment. A Reflection Probe captures a cubemap of the nearby surroundings. Light Probes are for diffuse lighting, not for reflections.'
    },
    'art-13': {
      topic: 'Lighting',
      q: 'Which **two** things should you ensure so that a mesh receives baked lightmaps correctly? (Choose 2)',
      options: [
        'Be marked as **Contribute GI** (Static).',
        'Have lightmap UVs (for example, by enabling **Generate Lightmap UVs** on import).',
        'Have a kinematic `Rigidbody`.',
        'Use an Unlit shader.'
      ],
      explanation: 'Lightmap baking only processes objects marked as Contribute GI, and it needs non-overlapping UVs. The usual approach is a second UV set (UV1), which Unity can generate when importing the model; without it, the main UVs are used, which often overlap and cause artifacts. An Unlit shader, in fact, ignores lighting.'
    },
    'art-14': {
      topic: 'Particles',
      q: 'What happens with this code?',
      options: [
        'It works and changes the start speed of new particles.',
        'Compilation error: `main` is a struct and must be stored in a variable.',
        'It compiles, but the change is lost until you reassign `ps.main = main`.',
        'It compiles, but it only affects particles that were already emitted.'
      ],
      explanation: 'Modules (`MainModule`, `EmissionModule`, etc.) are structs that act as interfaces to the native system. You cannot modify a property of a struct returned by a property, but if you store it in a local variable, the changes are applied directly to the system and there is no need to reassign it (in fact, `ps.main` is read-only).'
    },
    'art-15': {
      topic: 'Particles',
      q: 'You want to emit 30 particles **at once** when a projectile hits, using a `ParticleSystem` already placed in the scene. What do you call?',
      options: ['`ps.Emit(30)`', '`ps.Play(30)`', '`ps.emission.rateOverTime = 30`', 'Instantiate 30 particle systems'],
      explanation: '`Emit(count)` spawns that number of particles instantly, even if the system is not playing. `Play` does not take a count, and changing `rateOverTime` emits continuously (and would also cause the same struct error).'
    },
    'art-16': {
      topic: 'Particles',
      q: 'When putting out a fire, you want it to **stop emitting**, but let the particles that already exist finish their lifetime naturally. What do you use?',
      options: [
        '`ps.Stop(true, ParticleSystemStopBehavior.StopEmitting)`',
        '`ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear)`',
        '`ps.Clear()`',
        '`Destroy(ps.gameObject)`'
      ],
      explanation: '`StopEmitting` stops emission and lets live particles finish. `StopEmittingAndClear` and `Clear` remove them instantly, and `Destroy` removes the whole object.'
    },
    'art-17': {
      topic: 'Textures',
      q: 'Your 2D UI textures are always displayed at a fixed size on screen. Which import setting reduces memory without losing quality?',
      options: [
        'Disable **Generate Mip Maps**.',
        'Enable **Read/Write Enabled**.',
        'Change the Wrap Mode to Repeat.',
        'Raise the Max Size to 8192.'
      ],
      explanation: 'Mipmaps add roughly 33% more memory and are only useful when the texture is seen at different distances (3D). In UI they are not used and can even look blurry. Read/Write, on the other hand, **increases** memory usage.'
    },
    'art-18': {
      topic: 'Textures',
      q: 'What is the effect of enabling **Read/Write Enabled** on a texture?',
      options: [
        'It lets the GPU write to the texture faster, which improves performance.',
        'It keeps a copy in CPU memory, which is required for `GetPixels` / `SetPixels`.',
        'It lets you edit the texture pixels from the Inspector in the Editor.',
        'It disables compression so that the texture can be read losslessly.'
      ],
      explanation: 'By default, once the texture is uploaded to the GPU, the CPU copy is released. Read/Write keeps it so that scripts can read and write pixels, which costs memory. Enable it only if you need it.'
    },
    'art-19': {
      topic: 'Materials',
      q: 'From a script, you set `_EmissionColor` on a Standard/Lit material to a bright color, but the object does not glow in the build. What is missing?',
      options: [
        'Enabling the keyword with `mat.EnableKeyword("_EMISSION")`.',
        'Calling `mat.Apply()`.',
        'Adding a Point Light to the object.',
        'Using `sharedMaterial` instead of `material`.'
      ],
      explanation: 'The Standard and URP Lit shaders use the `_EMISSION` keyword to compile the variant that includes emission. If the material does not have it enabled, that variant may even be left out of the build. `Material.Apply()` does not exist (only `Texture2D.Apply()` does).'
    },
    'art-20': {
      topic: 'Lighting',
      q: 'In URP, you want a Vignette effect to be applied **only** while the player is inside a specific area. What do you configure?',
      options: [
        'A **Volume** in **Local** mode with a collider that defines the area.',
        'A Global Volume with high priority, placed at the center of the area.',
        'A Post-process Layer component on the area\'s Directional Light.',
        'A Reflection Probe in the area with the Vignette effect enabled.'
      ],
      explanation: 'Local Volumes use a collider to define their area of influence, and the camera (with Post Processing enabled) blends their overrides based on distance. A Global Volume affects the whole scene. Post-process Layer belongs to the old Post Processing Stack v2 of the Built-in pipeline.'
    },
    'art-21': {
      topic: 'Materials',
      q: 'In Unity 6 URP you write your own `ScriptableRendererFeature`. Which `ScriptableRenderPass` method must you implement so that it works with **Render Graph** (the default mode)?',
      options: [
        '`RecordRenderGraph`',
        '`Execute`',
        '`OnRenderImage`',
        '`Configure`'
      ],
      explanation: 'In Unity 6, URP uses Render Graph by default: passes declare their resources and work in `RecordRenderGraph(RenderGraph, ContextContainer)`. `Execute` and `Configure` belong to the previous API and only work in compatibility mode. `OnRenderImage` is from the Built-in Render Pipeline.'
    }
  }
});
