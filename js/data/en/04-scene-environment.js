UCP.addTranslation('en', {
  domain: {
    id: 'scene',
    title: 'Programming for scene and environment design',
    description: 'Audio, instantiating, destroying and managing GameObjects, and pathfinding with the Unity navigation system.',
    objectives: [
      'Determine the appropriate scripts for implementing audio assets.',
      'Identify methods for instantiating, destroying and managing GameObjects (pooling, Addressables).',
      'Determine the scripts for pathfinding with the Unity navigation system (NavMesh).'
    ],
    tips: [
      '`PlayOneShot` lets sounds overlap on the same `AudioSource`; `Play` restarts the assigned clip.',
      'If you destroy the object that holds the `AudioSource`, the sound is cut off. Use `AudioSource.PlayClipAtPoint` or a pool of audio sources.',
      '`Destroy` is not immediate: the object is destroyed at the end of the current frame. Also, Unity overloads `==`, so **do not use `?.` or `??`** with Unity objects.',
      'Know `UnityEngine.Pool.ObjectPool<T>`: `Get()`, `Release(obj)` and the `createFunc`, `actionOnGet`, `actionOnRelease` and `actionOnDestroy` callbacks.',
      'To check whether an agent has arrived: `!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance`.',
      'Obstacles that move or open and close: `NavMeshObstacle` with **Carve**. Jumps between areas: `NavMeshLink`. NavMesh at runtime: `NavMeshSurface.BuildNavMesh()`.',
      'To teleport an agent, use `agent.Warp(pos)`, not `transform.position`.',
      'Deactivating the GameObject **stops** its coroutines; disabling only the component (`enabled = false`) does **not** stop them.'
    ]
  },
  questions: {
    'scn-01': {
      topic: 'Audio',
      q: 'A weapon fires very quickly. With `audioSource.Play()`, each shot cuts off the sound of the previous one. What should you use?',
      options: [
        '`audioSource.PlayOneShot(shotClip)`',
        '`audioSource.PlayDelayed(0.1f)` on every shot',
        '`audioSource.loop = true` while firing',
        'One `AudioListener` per shot'
      ],
      explanation: '`PlayOneShot` plays the clip without interrupting what is already playing on that source, so the shots overlap. `Play` restarts the assigned `clip`. There should be only **one** active `AudioListener` in the scene (usually on the camera).'
    },
    'scn-02': {
      topic: 'Audio',
      q: 'The sound of a waterfall is heard at the same volume throughout the scene. You want it to depend on distance. What do you adjust on its `AudioSource`?',
      options: [
        'Set **Spatial Blend** to 1 (3D), so it fades with distance along its rolloff curve.',
        'Set **Priority** to 0, so it takes precedence.',
        'Set a high **Doppler Level**, so it changes with the player speed.',
        'Add an `AudioListener` to the waterfall so it measures the distance.'
      ],
      explanation: 'With Spatial Blend at 0, the sound is 2D (it sounds the same everywhere). At 1, it is fully 3D: it attenuates with distance from the `AudioListener` according to the rolloff, and it is panned according to direction.'
    },
    'scn-03': {
      topic: 'Audio',
      q: 'The explosion is never heard. Why, and how do you fix it?',
      options: [
        'The `AudioSource` dies with the object; use `PlayClipAtPoint`.',
        '`PlayOneShot` cannot be called from physics methods such as `OnCollisionEnter`.',
        'You must call `Destroy` before `PlayOneShot` to free the audio channel.',
        'The clip must have its Load Type set to Streaming to play instantly.'
      ],
      explanation: 'Destroying the GameObject destroys its `AudioSource`, and the sound is cut off. `PlayClipAtPoint` creates a temporary object with its own source, which is destroyed when the clip finishes. In large projects, a pool of AudioSources is more efficient.'
    },
    'scn-04': {
      topic: 'Object lifecycle',
      q: 'What does this code print when executed within the same frame?',
      options: [
        '`True`: `Destroy` frees the object immediately.',
        '`False`: it is destroyed at the end of the frame.',
        'It throws `MissingReferenceException` when accessing `enemy`.',
        '`True`, because the overloaded `==` detects it is marked for destruction.'
      ],
      explanation: '`Destroy` marks the object to be destroyed after the Update loop of the current frame (and before rendering). Until then, it still exists. `DestroyImmediate` is immediate, but it is only recommended in Editor code.'
    },
    'scn-05': {
      topic: 'Object lifecycle',
      q: 'Why is it **not** recommended to use `target?.TakeDamage()` or `target ?? fallback` when `target` derives from `UnityEngine.Object`?',
      options: [
        'They skip Unity\'s overloaded `==`, so they do not detect objects that were already destroyed.',
        'Those operators do not exist in the C# version Unity uses and do not compile.',
        'They are much slower than an `if (target != null)` when compiled with IL2CPP.',
        'They cause boxing of the object and generate garbage on every call.'
      ],
      explanation: 'Unity overloads `==` so that a destroyed object (whose native object no longer exists) compares as `null`. The `?.` and `??` operators check the C# reference directly and do not use that overload. Use `if (target != null)` or `if (target)`.'
    },
    'scn-06': {
      topic: 'Object pooling',
      q: 'You use this pool for bullets. When a bullet hits something, what should you call instead of `Destroy`?',
      options: ['`pool.Get()`', '`pool.Release(bullet)`', '`pool.Clear()`', 'Only `bullet.gameObject.SetActive(false)`'],
      explanation: '`Release` returns the object to the pool and runs `actionOnRelease` (here, it deactivates it). If the pool already holds `maxSize` objects, `actionOnDestroy` is called. With `collectionCheck: true`, releasing the same object twice throws an exception. Simply deactivating it does not return it to the pool.'
    },
    'scn-07': {
      topic: 'Object pooling',
      q: 'What are the **two** main advantages of object pooling for objects that are frequently created and destroyed? (Choose 2)',
      options: [
        'It reduces Garbage Collector spikes and memory allocations.',
        'It avoids the repeated cost of `Instantiate` and `Destroy`.',
        'It automatically reduces draw calls, because the instances share a material.',
        'It frees the memory of objects that are not in use.'
      ],
      explanation: 'Reusing objects avoids constant instantiation and destruction, which is expensive and generates garbage. In exchange, the pool **keeps** the objects in memory. It has no effect on draw calls.'
    },
    'scn-08': {
      topic: 'Instantiation',
      q: 'You want to instantiate a prefab as a child of a container, at a specific world position and rotation. Which overload do you use?',
      options: [
        '`Instantiate(prefab, position, rotation, parent)`',
        '`Instantiate(prefab, parent)` and nothing else.',
        '`Instantiate(prefab).transform.parent = position;`',
        '`new GameObject(prefab, parent)`'
      ],
      explanation: 'The overload with position, rotation and parent places the object at those world coordinates and makes it a child of `parent` in a single step, which is more efficient than changing the parent afterwards. `Instantiate(prefab, parent)` uses the prefab position relative to the parent.'
    },
    'scn-09': {
      topic: 'Navigation',
      q: 'What is the most reliable way to know whether a `NavMeshAgent` has reached its destination?',
      options: [
        '`agent.velocity.sqrMagnitude < 0.01f` for several frames in a row',
        '`Vector3.Distance(transform.position, agent.destination) == 0f`',
        '`!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance`',
        '`agent.remainingDistance <= agent.stoppingDistance` alone, checked every frame'
      ],
      explanation: 'The path is calculated asynchronously: while `pathPending` is true, `remainingDistance` is not reliable, so checking it on its own can give a false "arrived". Comparing exact float positions almost never works, and a near-zero velocity also happens when the agent is blocked or waiting for a path.'
    },
    'scn-10': {
      topic: 'Navigation',
      q: 'A door opens and closes during gameplay. When it is closed, agents must find another path. What do you use?',
      options: [
        'Rebake the NavMesh every time the door changes state.',
        'A `NavMeshObstacle` on the door with **Carve** enabled, so it cuts the NavMesh.',
        'Only a `BoxCollider` on the door.',
        'A `NavMeshLink` on the door.'
      ],
      explanation: 'With Carve, the obstacle "cuts" a hole in the NavMesh while it is active, and agents recalculate their path. Without Carve, agents only avoid it locally, without changing their path. Colliders do not affect the NavMesh at runtime.'
    },
    'scn-11': {
      topic: 'Navigation',
      q: 'Enemies must be able to jump between two platforms separated by a gap. Which component connects those two areas of the NavMesh?',
      options: ['`NavMeshObstacle`', '`NavMeshLink` (or an Off-Mesh Link)', '`NavMeshModifier` with Not Walkable area', 'A `Rigidbody` on the agent'],
      explanation: 'A NavMesh Link creates a traversable connection between two points that are not connected in the mesh, such as a gap, a jump or a ladder. You can detect when the agent crosses it with `agent.isOnOffMeshLink` to animate the jump.'
    },
    'scn-12': {
      topic: 'Navigation',
      q: 'The level is procedurally generated at runtime. How do you get a NavMesh for it?',
      options: [
        'It is not possible: the NavMesh can only be generated in the Editor before the build.',
        'With `NavMeshSurface.BuildNavMesh()` (AI Navigation package).',
        'By calling `NavMesh.CalculatePath` on each agent so that it generates the mesh.',
        'By enabling Carve on every `NavMeshObstacle` once the level is generated.'
      ],
      explanation: '`NavMeshSurface` lets you bake at runtime (and use `UpdateNavMesh` to update it asynchronously). `CalculatePath` calculates a path on a NavMesh that already exists, but does not create it.'
    },
    'scn-13': {
      topic: 'Navigation',
      q: 'You want an enemy to spawn at a random point and make sure it is on the NavMesh. Which API do you use?',
      options: [
        '`NavMesh.SamplePosition(randomPoint, out hit, maxDistance, NavMesh.AllAreas)`',
        '`Physics.Raycast(randomPoint + Vector3.up * 10f, Vector3.down, out RaycastHit hit)`',
        '`agent.SetDestination(randomPoint)`',
        '`NavMesh.Raycast(randomPoint, randomPoint, out NavMeshHit hit, NavMesh.AllAreas)`'
      ],
      explanation: '`SamplePosition` finds the nearest point on the NavMesh within a radius and returns `true` if it finds one (in `hit.position`). A physics raycast only detects colliders, not the NavMesh. `NavMesh.Raycast` traces a line on the NavMesh between two points to check for obstructions, but it does not look for the nearest point.'
    },
    'scn-14': {
      topic: 'Navigation',
      q: 'Agents must avoid a swamp if there is another path, but cross it if it is the only option. How do you set this up?',
      options: [
        'Mark the swamp as Not Walkable with a `NavMeshModifier`.',
        'Create a "Swamp" **area** with a higher **cost** and assign it to the swamp.',
        'Place a `NavMeshObstacle` with Carve on the swamp.',
        'Lower the agent `speed` while it is in the swamp, using a trigger collider.'
      ],
      explanation: 'Pathfinding (A*) minimizes the total path cost. An area with a higher cost makes the agent prefer other routes without forbidding it. Not Walkable and Carve would block it completely, and changing the `speed` does not change the chosen path. With `agent.SetAreaCost`, you can change the cost per agent.'
    },
    'scn-15': {
      topic: 'Navigation',
      q: 'When you teleport an enemy with a `NavMeshAgent` using `transform.position = spawnPoint`, it behaves strangely or moves back. What should you use?',
      options: ['`agent.Warp(spawnPoint)`', '`agent.Move(spawnPoint)`', '`agent.destination = spawnPoint`', '`rigidbody.MovePosition(spawnPoint)`'],
      explanation: 'The agent synchronizes its internal position with the NavMesh. `Warp` places it at the new position and updates its state. `Move` applies a relative offset, and `destination` would make it walk there.'
    },
    'scn-16': {
      topic: 'Object lifecycle',
      q: 'A spawner calls `StartCoroutine(SpawnWaves())` in `Start`. After deactivating the GameObject (`SetActive(false)`) and reactivating it, the waves do not continue. Why?',
      options: [
        'Its coroutines were stopped and `Start` does not run again: start them in `OnEnable`.',
        'Coroutines have a time limit, and Unity cancels them when they exceed it.',
        'The coroutine is still running, but `WaitForSeconds` stops counting.',
        'You must use `InvokeRepeating`, because coroutines cannot be paused.'
      ],
      explanation: 'Coroutines belong to the MonoBehaviour that started them and stop when its GameObject is deactivated or destroyed. `Start` only runs once, so nothing starts them again on reactivation. Note: setting `enabled = false` on the component does **not** stop coroutines.'
    },
    'scn-17': {
      topic: 'Asset management',
      q: 'You load prefabs with `Addressables.LoadAssetAsync<GameObject>(key)`. After several hours of play, memory keeps growing. What is missing?',
      options: [
        'Calling `Addressables.Release(handle)` once you stop using them.',
        'Calling `Resources.UnloadUnusedAssets()` every frame from a manager.',
        'Calling `GC.Collect()` after each load so the bundles are freed.',
        'Nothing: Addressables frees memory automatically when the scene changes.'
      ],
      explanation: 'Addressables uses reference counting: each load increments the counter, and the asset (and its bundle) is not unloaded until it has been released as many times as it was loaded. Forgetting `Release` is the most common cause of leaks with Addressables. If you instantiated with `Addressables.InstantiateAsync`, release with `Addressables.ReleaseInstance`.'
    },
    'scn-18': {
      topic: 'Asset management',
      q: 'Why is using the `Resources` folder discouraged for large numbers of assets?',
      options: [
        'All its contents go into the build and are indexed at startup.',
        '`Resources.Load` only works in the Editor and fails in player builds.',
        'Assets in `Resources` cannot be loaded asynchronously.',
        'Unity does not compress textures in `Resources`.'
      ],
      explanation: 'Unity includes all assets in `Resources` in the build and builds an index at startup. That index grows with every asset, and it is also difficult to manage memory precisely. `Resources.LoadAsync` does exist and works in builds. The recommended alternatives are direct references and Addressables.'
    },
    'scn-19': {
      topic: 'Audio',
      q: 'When diving underwater, all audio must gradually become filtered (low-pass), and return to normal when surfacing. What is the most appropriate approach?',
      options: [
        'Create two **snapshots** in the mixer and call `TransitionTo(0.5f)`.',
        'Change the volume of each `AudioSource` in `Update`.',
        'Replace all clips with filtered versions when entering the water.',
        'Add an `AudioLowPassFilter` to each `AudioSource` and animate its `cutoffFrequency` from a script.'
      ],
      explanation: 'Snapshots store the state of all mixer parameters (including group effects), and `TransitionTo` interpolates between them over the specified time, without touching each source individually. An `AudioLowPassFilter` per source would work, but you would have to manage every `AudioSource` (including ones created later) from code.'
    },
    'scn-20': {
      topic: 'Object lifecycle',
      q: 'In Unity 6, `FindObjectOfType<T>()` is obsolete. You need **any** instance of `GameManager` and do not care which one. Which alternative is the fastest?',
      options: [
        '`FindAnyObjectByType<GameManager>()`',
        '`FindFirstObjectByType<GameManager>()`',
        '`FindObjectsByType<GameManager>(FindObjectsSortMode.InstanceID)[0]`',
        '`GameObject.Find("GameManager")`'
      ],
      explanation: '`FindAnyObjectByType` returns any instance without guaranteeing order, so it is the fastest. `FindFirstObjectByType` guarantees the same instance `FindObjectOfType` used to return, but it is slower. Sorting every instance or searching by name is even worse. Ideally you still cache the reference instead of searching every frame.'
    },
    'scn-21': {
      topic: 'Instantiation',
      q: 'The `enemyPrefab` field is of type `Enemy` (a component on the prefab), not `GameObject`. What happens when `Spawn` runs?',
      options: [
        'The whole prefab GameObject is cloned (children included) and `e` is the clone\'s `Enemy` component.',
        'It does not compile: `Instantiate` always returns a `GameObject`, which has no `SetTarget`.',
        'An empty GameObject is created that only holds a copy of the `Enemy` component.',
        'It compiles, but `e` is an `Object` that needs `as Enemy`.'
      ],
      explanation: '`Instantiate<T>(T original)` is generic and returns the same type it receives. If the original is a component, Unity clones its entire GameObject (with children and other components) and returns the matching component on the copy. This saves you a `GetComponent<Enemy>()` after instantiating.'
    },
    'scn-22': {
      topic: 'Instantiation',
      q: 'The prefab root is at position (0, 1, 0). `slot` is at (10, 0, 0) in world space, with no rotation or scale. Where do `a` and `b` appear in world coordinates?',
      options: [
        '`a` at (0, 1, 0) and `b` at (10, 1, 0): `true` applies the position relative to the parent.',
        '`a` at (10, 1, 0) and `b` at (0, 1, 0), even though both are children of `slot`.',
        'Both at (10, 1, 0): the third parameter only decides whether the rotation is kept.',
        'Both at (0, 1, 0): the parent has no effect on the initial position of the clone.'
      ],
      explanation: 'The third parameter is `instantiateInWorldSpace`. With `Instantiate(prefab, parent)` (equivalent to `false`), the prefab position is treated as **local** to the parent: (10, 0, 0) + (0, 1, 0) = (10, 1, 0). With `true`, the prefab position is kept in **world** space: (0, 1, 0), although the object is still a child of `slot`. It affects position, rotation and scale, not only rotation.'
    },
    'scn-23': {
      topic: 'Instantiation',
      q: 'In Unity 6 you spawn a crowd with `InstantiateAsync`. `npcPrefab` is of type `Npc` (a component). Which **two** statements are correct? (Choose 2)',
      options: [
        '`yield return op` does not compile: `InstantiateAsync` can only be awaited with `await`.',
        '`op.Result` is an `Npc[]` array with the 50 clones.',
        'The clones are created inactive and you have to call `SetActive(true)` on each one.',
        'It only accepts prefabs loaded with Addressables; a direct reference fails.',
        'Part of the work runs off the main thread, and integration is spread across frames.'
      ],
      explanation: '`InstantiateAsync` returns an `AsyncInstantiateOperation<T>`, which derives from `AsyncOperation`, so you can `yield return` it in a coroutine. Its `Result` is an array of `T` with as many elements as `count`. Preparing the copies happens in the background, and integrating them into the scene (including the `Awake` calls) happens on the main thread with a time budget per frame. It works with any `Object`, not only with Addressables.'
    },
    'scn-24': {
      topic: 'Object pooling',
      q: 'After a few minutes, enemies taken from the pool die on the first hit. What is the cause?',
      options: [
        '`SetActive(false)` in `actionOnRelease` destroys the component and Unity recreates it with no values.',
        '`Start` does not run again on reuse: reset the health in `OnEnable`.',
        '`Get` copies the state of the last released object into the new one, health included.',
        '`collectionCheck: true` is missing; without it, `Get` returns objects still in use.'
      ],
      explanation: 'A reused object is not created again, so `Awake` and `Start` do not run again: the enemy comes back with the health it had when it was released (0 or less). Reset the state every time it leaves the pool, in `actionOnGet` or in `OnEnable` (which runs when it is reactivated). Deactivating does not destroy components, and `collectionCheck` only detects releasing the same object twice.'
    },
    'scn-25': {
      topic: 'Object pooling',
      q: 'You create an `ObjectPool<T>` with `collectionCheck: true`, `defaultCapacity: 10` and `maxSize: 10`. Which **two** statements are correct? (Choose 2)',
      options: [
        'In the Editor, releasing an object that is already in the pool throws an exception.',
        '`Get` throws an exception if 10 objects are already out of the pool.',
        '`defaultCapacity: 10` creates 10 instances up front, calling `createFunc` when the pool is built.',
        'If you release an object while 10 are already stored, `actionOnDestroy` is called on it.',
        '`collectionCheck` is also performed in builds, at no extra cost.'
      ],
      explanation: '`collectionCheck` detects releasing an object that is already in the pool, but only in the Editor (not in Player builds). `maxSize` limits how many **inactive** objects the pool keeps: beyond that, the released object is not stored and is passed to `actionOnDestroy`. `Get` never fails because of `maxSize`: if no objects are free, it calls `createFunc`. `defaultCapacity` only reserves space in the internal collection; it does not create instances (to prewarm the pool, call `Get` and `Release` while loading).'
    },
    'scn-26': {
      topic: 'Asset management',
      q: 'After calling `Clear`, the enemies disappear, but the prefab and its bundle stay in memory. What do you fix?',
      options: [
        'Call `enemyRef.LoadAssetAsync()` first so the reference count adds up.',
        'Change `Destroy(go)` to `DestroyImmediate(go, true)` so that the asset is unloaded as well.',
        'Replace `Destroy(go)` with `Addressables.ReleaseInstance(go)` in the `Clear` loop.',
        'Call `Resources.UnloadUnusedAssets()` after the loop so that Addressables lets go of the bundle.'
      ],
      explanation: 'Each Addressables `InstantiateAsync` adds a reference to the asset. `Destroy` removes the GameObject, but Addressables is not told and the count never goes down, so the prefab and its bundle stay loaded. `ReleaseInstance` destroys the instance **and** releases its reference. Loading the asset again would add another reference, `UnloadUnusedAssets` does not unload what Addressables still holds, and `DestroyImmediate(go, true)` is for destroying assets in the Editor, not for this.'
    },
    'scn-27': {
      topic: 'Object lifecycle',
      q: 'From another script\'s `Update`, you call `Destroy(crate.gameObject)` on an active crate and then write a log. In what order do the messages appear?',
      options: [
        '`OnDisable` → `OnDestroy` → `After Destroy`, because `Destroy` is synchronous.',
        '`After Destroy` → `OnDisable` → `OnDestroy`',
        '`After Destroy` → `OnDestroy`',
        '`OnDestroy` → `OnDisable` → `After Destroy`'
      ],
      explanation: '`Destroy` is not immediate: it marks the object and destroys it after the Update loop of the current frame, so `After Destroy` is printed first. When an active object is destroyed, Unity calls `OnDisable` and then `OnDestroy`. Only `DestroyImmediate` would call those methods before the next line, and it is meant for Editor code.'
    },
    'scn-28': {
      topic: 'Audio',
      q: 'This `AudioSource` plays the level music and also the coin pickup sounds. Which **two** statements are correct? (Choose 2)',
      options: [
        'The coin plays on top of the music, without interrupting or restarting it.',
        '`PlayOneShot` assigns `coinClip` to `source.clip` and cuts the music.',
        'Since `loop` is `true`, the coin also loops until you call `Stop()`.',
        'The coin is always heard in 3D, because `PlayOneShot` forces `spatialBlend = 1`.',
        '`0.5f` scales the coin volume relative to the source `volume`.'
      ],
      explanation: '`PlayOneShot` plays an extra clip on the same source without touching `clip` or cutting what is already playing, and its second parameter (`volumeScale`) is multiplied by `source.volume`. One-shots do not loop and use the source\'s own spatial settings (`spatialBlend`, rolloff, mixer). If you did `source.clip = coinClip; source.Play();` instead, the music would be cut off.'
    },
    'scn-29': {
      topic: 'Navigation',
      q: 'An enemy with a `NavMeshAgent` is stunned for a few seconds. When the stun ends it never moves again, even though `SetDestination` returns `true`. Why?',
      options: [
        '`SetDestination` does not work in coroutines; call it from `Update`.',
        '`WaitForSeconds` never finishes while the agent is stopped.',
        '`isStopped` stays `true`; `SetDestination` does not reset it. Set it to `false`.',
        'When stopped, the agent detaches from the NavMesh and needs `agent.Warp`.'
      ],
      explanation: '`isStopped = true` stops the agent moving along its path, and it stays that way until you set it to `false`. `SetDestination` calculates the new path but does not resume the agent. Coroutines can call any main-thread API, `WaitForSeconds` depends on `Time.timeScale` (not on the agent), and the agent stays on the NavMesh while it is stopped.'
    },
    'scn-30': {
      topic: 'Asset management',
      q: 'Your game will have 200 skins downloaded from a CDN. They must not be inside the build, and only the one the player picks should be loaded. Which approach do you use?',
      options: [
        'A `GameObject[]` with the 200 skins assigned in the Inspector.',
        'Put them in `Resources` and load them with `Resources.LoadAsync` to avoid blocking.',
        'An `AssetReferenceGameObject` field in remote Addressables groups, loading only the chosen one.',
        'Put them in `Resources` and call `Resources.UnloadAsset` on each prefab.'
      ],
      explanation: 'An `AssetReference` stores only the reference, not the asset: nothing is loaded until you call `LoadAssetAsync` or `InstantiateAsync`, and with remote groups the bundles are downloaded from the CDN. An array of direct references loads all 200 skins together with the scene. `Resources` always goes inside the build and, in addition, `Resources.UnloadAsset` cannot unload GameObjects or prefabs.'
    }
  }
});
