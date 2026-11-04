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
      options: ['`Update`', '`FixedUpdate`', '`LateUpdate`', '`OnGUI`'],
      explanation: '`FixedUpdate` runs on the fixed physics simulation step, so the force is applied consistently regardless of the frame rate. The recommended pattern is to read input in `Update`, store it in a field, and apply the force in `FixedUpdate`.'
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
        'Set the `Rigidbody` **Collision Detection** to `Continuous Dynamic` (or `Continuous Speculative`).',
        'Move the bullet in `Update` by modifying `transform.position`.',
        'Increase the mass of the wall.',
        'Replace `OnCollisionEnter` with `OnCollisionStay`.'
      ],
      explanation: 'The problem is *tunneling*: with `Discrete` detection, the bullet is in front of the wall in one physics step and already past it in the next. Continuous detection prevents this. Moving via `transform` makes the problem worse, and neither the mass nor `OnCollisionStay` changes how collisions are detected.'
    },
    'core-04': {
      topic: 'Raycasts and layers',
      q: 'What does this code do?',
      options: [
        'It detects only objects on the Player layer.',
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
        '`GetKeyDown` is only `true` for one frame, and `FixedUpdate` might not run during that frame.',
        '`KeyCode.Space` is only detected if the GameObject has a collider with keyboard focus.',
        '`GetKeyDown` requires `Time.timeScale` to be exactly 1 to detect key presses.',
        '`GetKeyDown` is obsolete; you must use `GetKey`, which always detects the key press.'
      ],
      explanation: '`FixedUpdate` can run 0, 1 or several times per frame. If it does not run in the frame where `GetKeyDown` is true, the input is lost. Read the input in `Update` (for example, `jumpRequested = true`) and consume it in `FixedUpdate`.'
    },
    'core-07': {
      topic: 'Input',
      q: 'You are using a class generated by the Input System. If you **remove** the line in `OnEnable`, what happens?',
      options: [
        'A compilation error.',
        '`ReadValue` always returns `(0, 0)`, because actions are disabled by default.',
        'It works the same, because actions enable themselves.',
        'A `NullReferenceException` is thrown in `Update`.'
      ],
      explanation: 'Actions created from code start out disabled. A disabled action does not receive input, and `ReadValue` returns the default value. The correct approach is to enable the action map in `OnEnable` and disable it in `OnDisable`.'
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
        'Move the code to `LateUpdate`.'
      ],
      explanation: '`Time.deltaTime` is the time in seconds since the previous frame. Multiplying by it turns `speed` into units per second, regardless of the frame rate. Capping the frame rate does not fix the underlying problem.'
    },
    'core-10': {
      topic: 'Camera',
      q: 'You want to detect which 3D object is under the mouse cursor when the player clicks. Which combination is correct?',
      options: [
        '`Camera.main.ScreenPointToRay(Input.mousePosition)` and then `Physics.Raycast` with that ray.',
        '`Camera.main.WorldToScreenPoint(Input.mousePosition)` and then `Physics.Raycast`.',
        '`Camera.main.ScreenToWorldPoint(Input.mousePosition)` and compare it with `transform.position`.',
        '`Camera.main.ViewportToWorldPoint(Input.mousePosition)` and `OnMouseOver`.'
      ],
      explanation: '`ScreenPointToRay` creates a ray that starts at the camera and passes through that pixel; with `Physics.Raycast` you get the first collider it hits. `ScreenToWorldPoint` returns a single point at the z distance you pass in, not whatever is under the cursor.'
    },
    'core-11': {
      topic: 'Movement',
      q: 'Which of these statements about `CharacterController` is **correct**?',
      options: [
        '`SimpleMove` applies gravity automatically, takes the speed in units per second and ignores the Y axis.',
        '`Move` applies gravity automatically.',
        'A `CharacterController` responds to `AddForce` just like a `Rigidbody`.',
        '`CharacterController` requires a `Rigidbody` on the same object in order to work.'
      ],
      explanation: '`SimpleMove(speed)` applies gravity and uses `deltaTime` internally. `Move(motion)` takes a displacement (you must multiply by `deltaTime` and add gravity yourself). `CharacterController` is not driven by physics and does not need a `Rigidbody`.'
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
        'A compilation error, because `rotation` returns a copy (struct).',
        'It rotates the object 45 radians on the X axis, because quaternions use radians.',
        'It compiles, but has no effect, because it modifies a copy of the quaternion.'
      ],
      explanation: '`transform.rotation` returns a **copy** of the `Quaternion`, so modifying it causes an error (CS1612). In addition, `x` is not in degrees: it is a component of the quaternion. Use `transform.rotation = Quaternion.Euler(45f, 0f, 0f)` or `transform.eulerAngles`.'
    },
    'core-14': {
      topic: 'Rotation',
      q: 'What does `Quaternion.LookRotation(target.position - transform.position)` return?',
      options: [
        'The angle in degrees between the object and the target.',
        'A rotation whose forward axis (Z+) points toward the target.',
        'A normalized `Vector3` pointing toward the target.',
        'A rotation whose up axis (Y+) points toward the target.'
      ],
      explanation: '`LookRotation(forward, up)` builds a rotation whose Z+ axis faces the given direction. To rotate gradually, combine it with `Quaternion.Slerp` or `Quaternion.RotateTowards`.'
    },
    'core-15': {
      topic: 'Raycasts and layers',
      q: 'The player\'s bullets collide with the player as they leave the weapon. What is the cleanest solution, with no extra code on each bullet?',
      options: [
        'Use separate layers and disable their interaction in the **Layer Collision Matrix**.',
        'Give them different tags ("Bullet" and "Player") so that physics can tell them apart.',
        'Call `Physics.IgnoreCollision` in the `Start` method of each bullet.',
        'Make the player\'s collider a trigger while the player is shooting.'
      ],
      explanation: 'The Layer Collision Matrix (Project Settings > Physics) defines which layers can collide with each other and has no runtime cost. `IgnoreCollision` works, but it requires code for each pair of objects. Tags do not affect physics.'
    },
    'core-16': {
      topic: 'Camera',
      q: 'You have two Cinemachine virtual cameras (exploration and combat) and a `CinemachineBrain` on the main camera. How do you switch to the combat camera with a smooth transition?',
      options: [
        'Destroy the Main Camera and create a new one.',
        'Raise the **Priority** of the combat camera above the other one (or activate it).',
        'Assign `Camera.main = combatCamera`.',
        'Change the `depth` property of the virtual camera.'
      ],
      explanation: 'The `CinemachineBrain` activates the virtual camera with the highest priority among those that are active, and performs the transition using the configured blend (Default Blend or Custom Blends). `Camera.main` is read-only.'
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
        'Lower the **Drag** value.',
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
        '`OnCollision2D(Collision2D c)`'
      ],
      explanation: '2D physics (Box2D) is separate from 3D physics (PhysX) and uses methods with the `2D` suffix. If you write `OnCollisionEnter` in a 2D game, it will never be called, and Unity does not report any error.'
    }
  }
});
