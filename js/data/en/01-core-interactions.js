UCP.addTranslation('en', {
  domain: {
    id: 'core',
    title: 'Programming core interactions',
    description: 'GameObject behavior and physics, input and controls, and camera views and movement.',
    objectives: [
      'Implement and configure GameObject behavior and physics (Rigidbody, colliders, triggers, raycasts).',
      'Implement and configure input and controls (the classic Input Manager and the Input System).',
      'Implement and configure camera views and movement (following, Cinemachine, screen-to-world conversions).'
    ],
    tips: [
      'Golden rule: **read input in `Update`** and **apply physics in `FixedUpdate`**. Many questions revolve around this.',
      '`OnTriggerEnter` / `OnCollisionEnter` require **at least one** of the two objects to have a `Rigidbody` (or `Rigidbody2D`). The 2D versions have the `2D` suffix and receive `Collider2D` / `Collision2D`.',
      'Memorize the `ForceMode` values: `Force` and `Acceleration` are continuous (the latter ignores mass); `Impulse` and `VelocityChange` are instantaneous (the latter ignores mass).',
      'LayerMasks are bitmasks: `1 << layer` includes a single layer and `~(1 << layer)` includes every layer except that one.',
      'Cameras that follow objects should be updated in `LateUpdate`, after everything else has moved.',
      '`transform.rotation` is a `Quaternion`: never modify `.x/.y/.z/.w` as if they were degrees. Use `Quaternion.Euler`, `LookRotation`, `Slerp` or `RotateTowards`.',
      'In the new Input System, actions start out **disabled**: you have to call `Enable()` (usually in `OnEnable`) and `Disable()` in `OnDisable`.'
    ]
  },
  questions: {
    'core-01': {
      topic: 'Physics',
      q: 'You need to apply a continuous force to a `Rigidbody` while the player holds down a key. In which method should you call `AddForce`?',
      options: ['`Update`', '`FixedUpdate`', '`LateUpdate`', '`OnRenderObject`'],
      explanation: '`FixedUpdate` runs on the fixed physics simulation step, so the force is applied consistently regardless of the frame rate. The recommended pattern is to read input in `Update`, store it in a field, and apply the force in `FixedUpdate`. `LateUpdate` and `OnRenderObject` are tied to the rendered frame, not to the physics step.'
    },
    'core-02': {
      topic: 'Physics',
      q: 'Which **two** conditions are required for Unity to call `OnTriggerEnter` between two objects with colliders? (Choose 2)',
      options: [
        'At least one of the two objects has a `Rigidbody`.',
        'At least one of the colliders has **Is Trigger** enabled.',
        'Both objects have a non-kinematic `Rigidbody`.',
        'Both objects are on the same Layer.',
        'The script must be on an object with a `CharacterController`.'
      ],
      explanation: 'Trigger events require at least one collider to be a trigger and at least one of the objects to have a `Rigidbody` (it can be kinematic). The layers do not have to match; they only need to be allowed to interact according to the Layer Collision Matrix.'
    },
    'core-03': {
      topic: 'Physics',
      q: 'A very fast bullet with a `Rigidbody` sometimes passes through thin walls without triggering `OnCollisionEnter`. What is the best solution?',
      options: [
        'Set the `Rigidbody` **Collision Detection** to `Continuous Dynamic`.',
        'Move it in `Update` by modifying `transform.position` directly.',
        'Increase the mass of the wall.',
        'Use `OnCollisionStay`, which is checked every physics step.'
      ],
      explanation: 'The problem is *tunneling*: with `Discrete` detection, the bullet is in front of the wall in one physics step and already past it in the next. Continuous detection (`Continuous Dynamic`, or also `Continuous Speculative`) prevents this. Moving via `transform` makes the problem worse, and neither the mass nor `OnCollisionStay` changes how collisions are detected.'
    },
    'core-04': {
      topic: 'Raycasts and layers',
      q: 'What does this code do?',
      options: [
        'It detects only the objects that are on the Player layer.',
        'It detects objects on every layer except Player.',
        'It detects nothing, because the mask ends up as 0.',
        'It does not compile: the `~` operator cannot be used on integers.'
      ],
      explanation: '`1 << n` creates a mask with only the bit for layer `n`. The `~` operator inverts every bit, so the mask includes every layer **except** Player. This is useful to prevent the player\'s raycast from hitting the player itself.'
    },
    'core-05': {
      topic: 'Camera',
      q: 'A camera follows a player that moves in `Update`. A slight *jitter* is visible. In which method should you update the camera position?',
      options: ['`Awake`', '`FixedUpdate`', '`LateUpdate`', '`OnPreRender`'],
      explanation: '`LateUpdate` runs after every `Update` call, so the camera moves once the target is already at its final position for that frame. If the target is moved by physics, also enable interpolation on its `Rigidbody`.'
    },
    'core-06': {
      topic: 'Input',
      q: 'Sometimes the jump does not respond when the space bar is pressed. What is the cause?',
      options: [
        '`GetKeyDown` is only `true` for one frame, and `FixedUpdate` may not run in that frame.',
        '`KeyCode.Space` is only detected if the GameObject has keyboard focus.',
        '`GetKeyDown` requires `Time.timeScale` to be exactly 1 to detect key presses.',
        '`GetKeyDown` is obsolete; you must use `GetKey`, which always detects the key press.'
      ],
      explanation: '`FixedUpdate` can run 0, 1 or several times per frame. If it does not run in the frame where `GetKeyDown` is true, the input is lost. Read the input in `Update` (for example, `jumpRequested = true`) and consume it in `FixedUpdate`.'
    },
    'core-07': {
      topic: 'Input',
      q: 'You are using a class generated by the Input System. If you **remove** the line in `OnEnable`, what happens?',
      options: [
        'A compilation error: a disabled action cannot be read.',
        '`ReadValue` always returns `(0, 0)`, because the action is disabled.',
        'It works the same: `new PlayerControls()` enables the actions.',
        'A `NullReferenceException` is thrown in `Update`.'
      ],
      explanation: 'Actions created from code start out disabled (not even the generated class constructor enables them). Calling `ReadValue` on them compiles and does not throw. A disabled action does not receive input, and `ReadValue` returns the default value. The correct approach is to enable the action map in `OnEnable` and disable it in `OnDisable`.'
    },
    'core-08': {
      topic: 'Input',
      q: 'For an `InputAction` of type **Button** with the default interaction, which callback is invoked when the player **releases** the button?',
      options: ['`started`', '`performed`', '`canceled`', '`triggered`'],
      explanation: 'For a button with the default interaction, `started` and `performed` are invoked on press and `canceled` on release. `triggered` is not a callback: it is a boolean property (`action.triggered`) that indicates whether the action was performed this frame.'
    },
    'core-09': {
      topic: 'Movement',
      q: 'With this code, the object moves faster on a PC running at 144 FPS than on a phone running at 30 FPS. How do you fix it?',
      options: [
        'Multiply by `Time.deltaTime`.',
        'Multiply by `Time.fixedDeltaTime`.',
        'Set `Application.targetFrameRate = 30`.',
        'Move the code to `LateUpdate`, after all the `Update` calls.'
      ],
      explanation: '`Time.deltaTime` is the time in seconds since the previous frame. Multiplying by it turns `speed` into units per second, regardless of the frame rate. Capping the frame rate does not fix the underlying problem.'
    },
    'core-10': {
      topic: 'Camera',
      q: 'You want to detect which 3D object is under the cursor when the player clicks. You have the camera in `cam` and the cursor position in pixels in `mousePos` (with the Input System, `Mouse.current.position.ReadValue()`). Which combination is correct?',
      options: [
        '`cam.ScreenPointToRay(mousePos)` and then `Physics.Raycast` with that ray.',
        '`cam.WorldToScreenPoint(mousePos)` and a `Physics.Raycast` from the camera toward that point.',
        '`cam.ScreenToWorldPoint(mousePos)` and compare the result with each `transform.position`.',
        '`cam.ViewportToWorldPoint(mousePos)` and then `OnMouseOver`.'
      ],
      explanation: '`ScreenPointToRay` creates a ray that starts at the camera and passes through that pixel; with `Physics.Raycast` you get the first collider it hits. `ScreenToWorldPoint` returns a single point at the z distance you pass in, not whatever is under the cursor. `WorldToScreenPoint` does the opposite conversion, and `ViewportToWorldPoint` expects normalized coordinates (0–1), not pixels.'
    },
    'core-11': {
      topic: 'Movement',
      q: 'Which of these statements about `CharacterController` is **correct**?',
      options: [
        '`SimpleMove` applies gravity and ignores the Y component of the speed.',
        '`Move` applies gravity automatically and uses `deltaTime` internally, like `SimpleMove`.',
        'A `CharacterController` responds to `AddForce` just like a dynamic `Rigidbody`.',
        '`CharacterController` requires a `Rigidbody` on the same object in order to collide.'
      ],
      explanation: '`SimpleMove(speed)` takes a speed in units per second, applies gravity, ignores the Y component and uses `deltaTime` internally. `Move(motion)` takes a displacement (you must multiply by `deltaTime` and add gravity yourself). `CharacterController` is not driven by physics and does not need a `Rigidbody`: it handles its own collisions as it moves.'
    },
    'core-12': {
      topic: 'Physics',
      q: 'For an instantaneous jump that **takes the mass** of the `Rigidbody` **into account**, which `ForceMode` would you use?',
      options: ['`ForceMode.Force`', '`ForceMode.Acceleration`', '`ForceMode.Impulse`', '`ForceMode.VelocityChange`'],
      explanation: '`Impulse` applies an instantaneous impulse: the resulting change in velocity is the impulse divided by the mass. `VelocityChange` is also instantaneous but ignores mass. `Force` and `Acceleration` are designed to be applied continuously on every physics step.'
    },
    'core-13': {
      topic: 'Rotation',
      q: 'What happens with this line?',
      options: [
        'It rotates the object 45 degrees on the X axis relative to its current rotation.',
        'A compilation error, because `rotation` returns a copy (it is a struct).',
        'It rotates the object 45 radians on the X axis, because quaternions use radians.',
        'It compiles, but has no effect, because it modifies a copy.'
      ],
      explanation: '`transform.rotation` returns a **copy** of the `Quaternion`, so modifying it causes an error (CS1612). In addition, `x` is not in degrees: it is a component of the quaternion. Use `transform.rotation = Quaternion.Euler(45f, 0f, 0f)` or `transform.eulerAngles`.'
    },
    'core-14': {
      topic: 'Rotation',
      q: 'What does `Quaternion.LookRotation(target.position - transform.position)` return?',
      options: [
        'The angle in degrees between the object\'s forward and the target.',
        'A rotation whose forward axis (Z+) points toward the target.',
        'A normalized `Vector3` pointing from the object toward the target.',
        'A rotation whose up axis (Y+) points toward the target.'
      ],
      explanation: '`LookRotation(forward, up)` builds a rotation whose Z+ axis faces the given direction. To rotate gradually, combine it with `Quaternion.Slerp` or `Quaternion.RotateTowards`.'
    },
    'core-15': {
      topic: 'Raycasts and layers',
      q: 'The player\'s bullets collide with the player as they leave the weapon. What is the cleanest solution, with no extra code on each bullet?',
      options: [
        'Use separate layers and disable their interaction in the **Layer Collision Matrix**.',
        'Give them different tags so that physics ignores the contact.',
        'Call `Physics.IgnoreCollision` in the `Start` method of each bullet.',
        'Mark the player\'s collider as a trigger while the shooting animation plays.'
      ],
      explanation: 'The Layer Collision Matrix (Project Settings > Physics) defines which layers can collide with each other and has no runtime cost. `IgnoreCollision` works, but it requires code for each pair of objects. Tags do not affect physics.'
    },
    'core-16': {
      topic: 'Camera',
      q: 'You have two Cinemachine virtual cameras (exploration and combat) and a `CinemachineBrain` on the main camera. How do you switch to the combat camera with a smooth transition?',
      options: [
        'Destroy the Main Camera and create a new one with combat settings.',
        'Raise the **Priority** of the combat camera above the other one.',
        'Assign `Camera.main = combatCamera` from a script when combat starts.',
        'Set the `depth` property of the combat virtual camera to a higher value.'
      ],
      explanation: 'The `CinemachineBrain` activates the virtual camera with the highest priority among those that are active, and performs the transition using the configured blend (Default Blend or Custom Blends). Activating only the combat camera also works. `Camera.main` is read-only, and `depth` is a `Camera` property that does not affect what the `CinemachineBrain` picks.'
    },
    'core-17': {
      topic: 'Physics',
      q: 'Inside `OnCollisionEnter(Collision collision)`, how do you get the **point of impact**?',
      options: [
        '`collision.transform.position`',
        '`collision.point`',
        '`collision.GetContact(0).point`',
        '`collision.collider.bounds.center`'
      ],
      explanation: '`Collision` contains the contact points. `GetContact(i)` (or the `contacts` array) returns a `ContactPoint` with `point` and `normal`. `collision.transform.position` is the pivot of the other object, not the point of impact, and `collision.point` does not exist.'
    },
    'core-18': {
      topic: 'Physics',
      q: 'A physics-driven character followed by the camera looks choppy on high-refresh-rate monitors. Which `Rigidbody` setting helps?',
      options: [
        'Enable **Is Kinematic**.',
        'Set **Interpolate** to `Interpolate`.',
        'Lower the **Linear Damping** value (formerly Drag).',
        'Set **Collision Detection** to `Discrete`.'
      ],
      explanation: 'Physics advances at a fixed rate (50 Hz by default) and rendering at a different one. Interpolation smooths the visual position between physics steps, so the mismatch with the camera is less noticeable.'
    },
    'core-19': {
      topic: 'Physics',
      q: 'In a 2D game, which method is called when two objects with a `Collider2D` (not a trigger) and a `Rigidbody2D` collide?',
      options: [
        '`OnCollisionEnter(Collision c)`',
        '`OnCollisionEnter2D(Collision2D c)`',
        '`OnTriggerEnter2D(Collider2D c)`',
        '`OnControllerColliderHit(ControllerColliderHit h)`'
      ],
      explanation: '2D physics (Box2D) is separate from 3D physics (PhysX) and uses methods with the `2D` suffix. If you write `OnCollisionEnter` in a 2D game, it will never be called, and Unity does not report any error. `OnControllerColliderHit` is exclusive to the 3D `CharacterController`.'
    },
    'core-20': {
      topic: 'Physics',
      q: 'In Unity 6, the code `rb.velocity = Vector3.zero;` shows an obsolete API warning. Which property should you use?',
      options: [
        '`rb.linearVelocity`',
        '`rb.moveVelocity`',
        '`rb.worldVelocity`',
        '`rb.currentVelocity`'
      ],
      explanation: 'In Unity 6, `Rigidbody.velocity` was renamed to `linearVelocity` (to distinguish it from `angularVelocity`). `drag` → `linearDamping` and `angularDrag` → `angularDamping` were renamed as well. In 2D, `Rigidbody2D.velocity` also became `linearVelocity`.'
    },
    'core-21': {
      topic: 'Camera',
      q: 'In **Cinemachine 3** (the recommended package in Unity 6), what is the name of the component that replaces `CinemachineVirtualCamera`?',
      options: [
        '`CinemachineCamera`',
        '`CinemachineBrain`',
        '`CinemachineFreeLook`',
        '`VirtualCamera3D`'
      ],
      explanation: 'Cinemachine 3 simplified the API: `CinemachineCamera` replaces `CinemachineVirtualCamera` (and `CinemachineFreeLook`, which is now built with components such as Orbital Follow), and the namespace became `Unity.Cinemachine`. `CinemachineBrain` still lives on the real camera and decides which camera is live based on **Priority**.'
    },
    'core-22': {
      topic: 'Input',
      q: 'Your weapon has a charged shot. The `charge` action is of type **Button** and has a **Hold** interaction with a **Hold Time** of 0.5 s. The player presses the button and releases it after 0.2 seconds. What is printed?',
      options: [
        '`A` on press and `C` on release.',
        '`A` and `B` on press, and `C` on release.',
        '`A` on press, and `B` and `C` on release.',
        'Only `C` on release, because the Hold Time was not reached.'
      ],
      explanation: 'With the **Hold** interaction, `started` fires on press, `performed` only once the button has been held for the configured time, and `canceled` on release. If it is released before 0.5 s, `performed` never happens: `A` and then `C` are printed. If it is held longer than 0.5 s, it would print `A`, `B` (when the time is reached) and `C` on release. This is the usual way to tell a short tap from a charge.'
    },
    'core-23': {
      topic: 'Input',
      q: 'In the options menu, the player must be able to change the key for the `Jump` action (Input System), and the change must persist after closing and reopening the game. Which **two** things should you do? (Choose 2)',
      options: [
        'Disable the action, call `PerformInteractiveRebinding()` on it, and then call `Start()`.',
        'Save `SaveBindingOverridesAsJson()` and apply it with `LoadBindingOverridesFromJson()` at startup.',
        'Modify the `.inputactions` asset at runtime with `AssetDatabase` and save it to disk.',
        'Regenerate the C# class with **Generate C# Class** whenever the player changes the key.',
        'Create a new `InputAction` every `Update` with the chosen key.'
      ],
      explanation: '`PerformInteractiveRebinding()` waits for the player to press a control and applies it as a *binding override*; the action must be disabled during the process (otherwise it throws an exception), and you should call `Dispose()` on the operation when it finishes. Overrides are not saved automatically: `SaveBindingOverridesAsJson()` serializes them (for example, to `PlayerPrefs` or a file) and `LoadBindingOverridesFromJson()` restores them. `AssetDatabase` and **Generate C# Class** are Editor tools that do not exist in a build, and creating actions every frame persists nothing.'
    },
    'core-24': {
      topic: 'Input',
      q: 'Your game uses `PlayerInput` with two action maps: `Player` and `UI`. When the pause menu opens, the character must stop receiving input and the gamepad must navigate the menu. Which line is missing?',
      options: [
        '`playerInput.SwitchCurrentActionMap("UI");`',
        '`playerInput.actions.FindActionMap("UI").Enable();`',
        '`playerInput.defaultActionMap = "UI";`',
        '`InputSystem.DisableDevice(Gamepad.current);`'
      ],
      explanation: '`SwitchCurrentActionMap` disables the current map (`Player`) and enables the new one (`UI`), which is exactly what you need. Enabling `UI` with `FindActionMap(...).Enable()` leaves `Player` enabled too, so the character would keep moving. `defaultActionMap` only sets which map is enabled when the `PlayerInput` is enabled; changing it mid-game does not switch maps. Disabling the gamepad would also block menu navigation.'
    },
    'core-25': {
      topic: 'Movement',
      q: 'Your character uses a `CharacterController`. It moves much faster than expected and its speed changes with the frame rate. What is the bug?',
      options: [
        '`Move` expects a per-frame displacement, but here it gets a velocity not multiplied by `Time.deltaTime`.',
        '`Move` already applies gravity, so `velocity.y` is added twice every frame.',
        'It must go in `FixedUpdate`, because the `CharacterController` advances with the physics step.',
        '`gravity` must be positive, because `Move` inverts the Y axis.'
      ],
      explanation: '`CharacterController.Move` takes a **displacement** for this frame, not a velocity. `move + velocity` is in units per second, so you must pass `(move + velocity) * Time.deltaTime`; otherwise the character travels `speed` units **per frame**. `Move` does not apply gravity (`SimpleMove` does), and the `CharacterController` is not part of the `Rigidbody` simulation, so moving it in `Update` is fine.'
    },
    'core-26': {
      topic: 'Movement',
      q: 'A moving platform has a **kinematic** `Rigidbody` with **Interpolate** enabled and moves with this code. Which **two** statements are correct? (Choose 2)',
      options: [
        'Inside `FixedUpdate`, `Time.deltaTime` returns the value of `Time.fixedDeltaTime`.',
        'Thanks to interpolation, the movement looks smooth between physics steps.',
        'Assigning `transform.position = next` would give exactly the same physical result.',
        '`MovePosition` only works on a `Rigidbody` with **Is Kinematic** disabled.',
        'You must also multiply by `Time.fixedDeltaTime`, or it will depend on the frame rate.'
      ],
      explanation: 'When read inside `FixedUpdate`, `Time.deltaTime` returns `Time.fixedDeltaTime`, so the code is already frame-rate independent (multiplying again would make it far too slow). `MovePosition` moves the kinematic body within the simulation, pushes dynamic objects correctly and, with **Interpolate**, smooths the visual position between steps. Assigning `transform.position` teleports it, with no interpolation and no proper physical interaction. `MovePosition` is designed precisely for kinematic bodies.'
    },
    'core-27': {
      topic: 'Raycasts and layers',
      q: 'Your laser must damage **every** enemy it passes through. You implement it like this. Which **two** statements about this code are correct? (Choose 2)',
      options: [
        'It generates no garbage per shot, because it reuses the `hits` array.',
        'Colliders with **Is Trigger** enabled do not appear in the results.',
        'The hits are always sorted by distance, from the closest to the farthest.',
        'With more than 16 enemies in line, it throws an `IndexOutOfRangeException`.',
        'It only damages the first enemy, because the ray stops at the first collider.'
      ],
      explanation: '`RaycastNonAlloc` works like `RaycastAll`, but writes into an array you allocate once, so it generates no garbage; it returns how many hits it wrote, which is why the loop uses `count` and not `hits.Length`. `QueryTriggerInteraction.Ignore` excludes triggers regardless of the global `Physics.queriesHitTriggers` setting. The results are **not** sorted by distance (if you need them sorted, sort them yourself by `hit.distance`), and if there are more hits than slots in the array, the extra ones are dropped without an error. Unlike `Physics.Raycast`, every collider along the path is collected here.'
    },
    'core-28': {
      topic: 'Raycasts and layers',
      q: 'Your projectile is a ball with a 0.5 m radius and detects hits with a `Physics.Raycast` from its center. Sometimes it grazes a thin column and does not detect it, even though it visually touches it. What is the most appropriate approach?',
      options: [
        'Use `Physics.SphereCast` with the projectile\'s radius and the same direction and distance.',
        'Use `Physics.OverlapSphere` at the final position of each frame.',
        'Use `Physics.Linecast` between the previous and the current position.',
        'Increase the `maxDistance` of the `Physics.Raycast` so that it reaches the column sooner.'
      ],
      explanation: '`SphereCast` sweeps a sphere along the path, so it detects whatever the projectile\'s volume touches, not just its center. `OverlapSphere` only checks the final position and skips whatever lies between two frames. `Linecast` is still a line with no thickness, and a longer distance does not change the width of the ray. Note: `SphereCast` does not detect colliders that already overlap the sphere at its starting point.'
    },
    'core-29': {
      topic: 'Rotation',
      q: 'A turret turns toward the enemy with this code, but it turns faster at higher frame rates and slows down as it approaches the target. It must turn at a **constant 90° per second**. What change should you make?',
      options: [
        'Use `Quaternion.RotateTowards` with `90f * Time.deltaTime` as the maximum step.',
        'Replace `0.1f` with `90f * Time.deltaTime`, because the third parameter of `Slerp` is in degrees.',
        'Replace `Slerp` with `Lerp`, which interpolates at a constant rate between the two rotations.',
        'Move the code to `FixedUpdate`, so that `0.1f` is always applied at a fixed rate of 50 Hz.'
      ],
      explanation: '`RotateTowards(from, to, maxDegreesDelta)` advances by at most that many degrees and never overshoots the target; with `90f * Time.deltaTime` it turns at 90°/s regardless of the frame rate. Calling `Slerp` with a fixed `t` covers a percentage of the remaining angle every frame, which is why it slows down at the end and depends on the frame rate. The third parameter of `Slerp` is a fraction from 0 to 1, not degrees, and `Lerp` has the same problem. In `FixedUpdate` it would no longer depend on the frame rate, but it would still slow down at the end.'
    },
    'core-30': {
      topic: 'Rotation',
      q: 'Your ship is banked (rolled around its Z axis) and must turn around the **world Y axis**, not its own Y axis, while keeping the bank. Which line completes the code?',
      options: [
        '`transform.rotation = Quaternion.Euler(0f, a, 0f) * transform.rotation;`',
        '`transform.rotation = transform.rotation + Quaternion.Euler(0f, a, 0f);`',
        '`transform.localRotation = transform.localRotation * Quaternion.Euler(0f, a, 0f);`',
        '`transform.eulerAngles = new Vector3(0f, a, 0f);`'
      ],
      explanation: 'When composing quaternions with `*`, order matters: `turn * rotation` applies the turn in **world** axes, and `rotation * turn` applies it in the object\'s **local** axes (like `transform.Rotate` with the default `Space.Self`). That is why the `localRotation * ...` option turns around the ship\'s tilted Y axis. `Quaternion` has no `+` operator, so that line does not compile. Assigning `eulerAngles` sets an absolute rotation: it loses the bank and does not accumulate the turn. An equivalent alternative to the correct answer is `transform.Rotate(0f, a, 0f, Space.World)`.'
    },
    'core-31': {
      topic: 'Input',
      q: 'Your player has a `PlayerInput` component with **Behavior** set to **Send Messages** and an action map with an action named `Jump`. Which method in a script on the same GameObject will be called when jumping?',
      options: [
        '`void OnJump(InputValue value)`',
        '`void Jump(InputAction.CallbackContext context)`',
        '`void OnJumpPerformed(InputAction.CallbackContext ctx)`',
        '`void OnJump(KeyCode key)`'
      ],
      explanation: 'With **Send Messages** (or **Broadcast Messages**), `PlayerInput` sends a message named `On` + the action name, which can take an `InputValue` (or no parameter); you read the value with `value.Get<T>()`. Methods with `InputAction.CallbackContext` are used with **Invoke Unity Events** or when you subscribe to `performed` from code, and you choose their name when you assign them. `KeyCode` belongs to the classic Input Manager.'
    }
  }
});
