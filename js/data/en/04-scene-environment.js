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
        '`audioSource.PlayDelayed(0.1f)`',
        '`audioSource.loop = true`',
        'One `AudioListener` per shot'
      ],
      explanation: '`PlayOneShot` plays the clip without interrupting what is already playing on that source, so the shots overlap. `Play` restarts the assigned `clip`. There should be only **one** active `AudioListener` in the scene (usually on the camera).'
    },
    'scn-02': {
      topic: 'Audio',
      q: 'The sound of a waterfall is heard at the same volume throughout the scene. You want it to depend on distance. What do you adjust on its `AudioSource`?',
      options: [
        'Set **Spatial Blend** to 1 (3D).',
        'Set **Priority** to 0, so it takes precedence over other sounds.',
        'Set a high **Doppler Level**, so it changes with the player speed.',
        'Add an `AudioListener` to the waterfall so it measures the distance.'
      ],
      explanation: 'With Spatial Blend at 0, the sound is 2D (it sounds the same everywhere). At 1, it is fully 3D: it attenuates with distance from the `AudioListener` according to the rolloff, and it is panned according to direction.'
    },
    'scn-03': {
      topic: 'Audio',
      q: 'The explosion is never heard. Why, and how do you fix it?',
      options: [
        'The `AudioSource` is destroyed with the object; use `AudioSource.PlayClipAtPoint`.',
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
        'They do not use Unity\'s overloaded `==`, so a destroyed object would pass the check.',
        'Those operators do not exist in the C# version that Unity uses.',
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
        'It automatically reduces the number of draw calls.',
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
        '`agent.velocity.sqrMagnitude < 0.01f`',
        '`Vector3.Distance(transform.position, agent.destination) == 0f`',
        '`!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance`',
        '`agent.isStopped && !agent.hasPath`'
      ],
      explanation: 'The path is calculated asynchronously: while `pathPending` is true, `remainingDistance` is not reliable. Comparing exact float positions almost never works, and `isStopped` indicates whether you stopped the agent yourself, not whether it arrived.'
    },
    'scn-10': {
      topic: 'Navigation',
      q: 'A door opens and closes during gameplay. When it is closed, agents must find another path. What do you use?',
      options: [
        'Rebake the NavMesh every time the door changes state.',
        'A `NavMeshObstacle` on the door with **Carve** enabled.',
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
        'By enabling Carve on the `NavMeshObstacle` components across the generated level.'
      ],
      explanation: '`NavMeshSurface` lets you bake at runtime (and use `UpdateNavMesh` to update it asynchronously). `CalculatePath` calculates a path on a NavMesh that already exists, but does not create it.'
    },
    'scn-13': {
      topic: 'Navigation',
      q: 'You want an enemy to spawn at a random point and make sure it is on the NavMesh. Which API do you use?',
      options: [
        '`NavMesh.SamplePosition(randomPoint, out NavMeshHit hit, maxDistance, NavMesh.AllAreas)`',
        '`Physics.Raycast(randomPoint, Vector3.down)`',
        '`agent.SetDestination(randomPoint)`',
        '`NavMesh.Raycast(randomPoint, randomPoint, out hit, 0)`'
      ],
      explanation: '`SamplePosition` finds the nearest point on the NavMesh within a radius and returns `true` if it finds one (in `hit.position`). A physics raycast only detects colliders, not the NavMesh.'
    },
    'scn-14': {
      topic: 'Navigation',
      q: 'Agents must avoid a swamp if there is another path, but cross it if it is the only option. How do you set this up?',
      options: [
        'Mark the swamp as Not Walkable.',
        'Create a "Swamp" navigation **area** with a higher **cost** and assign it to the swamp.',
        'Place a `NavMeshObstacle` with Carve on the swamp.',
        'Lower the agent `speed` when it steps on the swamp.'
      ],
      explanation: 'Pathfinding (A*) minimizes the total path cost. An area with a higher cost makes the agent prefer other routes without forbidding it. Not Walkable and Carve would block it completely. With `agent.SetAreaCost`, you can change the cost per agent.'
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
        'Deactivating the GameObject stops its coroutines, and they do not resume. Restart them in `OnEnable`.',
        'Coroutines only last for 60 seconds.',
        '`WaitForSeconds` does not work on reactivated objects.',
        'You must use `InvokeRepeating`, because coroutines cannot be paused.'
      ],
      explanation: 'Coroutines belong to the MonoBehaviour that started them and stop when its GameObject is deactivated or destroyed. `Start` only runs once, so nothing starts them again on reactivation. Note: setting `enabled = false` on the component does **not** stop coroutines.'
    },
    'scn-17': {
      topic: 'Asset management',
      q: 'You load prefabs with `Addressables.LoadAssetAsync<GameObject>(key)`. After several hours of play, memory keeps growing. What is missing?',
      options: [
        'Releasing with `Addressables.Release(handle)` when no longer needed (or `ReleaseInstance` if you used `InstantiateAsync`).',
        'Calling `Resources.UnloadUnusedAssets()` every frame.',
        'Calling `GC.Collect()` after each load.',
        'Nothing: Addressables frees memory automatically when the scene changes.'
      ],
      explanation: 'Addressables uses reference counting: each load increments the counter, and the asset (and its bundle) is not unloaded until it has been released as many times as it was loaded. Forgetting `Release` is the most common cause of leaks with Addressables.'
    },
    'scn-18': {
      topic: 'Asset management',
      q: 'Why is using the `Resources` folder discouraged for large numbers of assets?',
      options: [
        'All its contents are included in the build, increasing startup time and memory.',
        '`Resources.Load` only works in the Editor and fails in builds.',
        'Assets in `Resources` cannot be loaded asynchronously.',
        'Unity does not compress textures that are inside `Resources`.'
      ],
      explanation: 'Unity includes all assets in `Resources` in the build and builds an index at startup. It is also difficult to manage memory precisely. The recommended alternatives are direct references and Addressables.'
    },
    'scn-19': {
      topic: 'Audio',
      q: 'When diving underwater, all audio must gradually become filtered (low-pass), and return to normal when surfacing. What is the most appropriate approach?',
      options: [
        'Create two **snapshots** in the AudioMixer (Normal and Underwater) and call `underwaterSnapshot.TransitionTo(0.5f)`.',
        'Change the volume of each `AudioSource` in `Update`.',
        'Replace all clips with filtered versions.',
        'Add an `AudioLowPassFilter` to each `AudioSource` at runtime.'
      ],
      explanation: 'Snapshots store the state of all mixer parameters (including group effects), and `TransitionTo` interpolates between them over the specified time, without touching each source individually.'
    }
  }
});
