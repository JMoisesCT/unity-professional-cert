UCP.addDomain({
  id: 'core',
  order: 1,
  title: 'Interacciones principales',
  titleEn: 'Programming core interactions',
  description: 'Comportamiento de GameObjects y física, entradas (input) y controles, y vistas y movimiento de cámara.',
  objectives: [
    'Implementar y configurar el comportamiento de GameObjects y la física (Rigidbody, colliders, triggers, raycasts).',
    'Implementar y configurar entradas y controles (Input Manager clásico y el Input System).',
    'Implementar y configurar vistas y movimiento de cámara (seguimiento, Cinemachine, conversiones pantalla-mundo).'
  ],
  tips: [
    'Regla de oro: **lee el input en `Update`** y **aplica la física en `FixedUpdate`**. Muchas preguntas giran en torno a esto.',
    '`OnTriggerEnter` / `OnCollisionEnter` requieren que **al menos uno** de los dos objetos tenga `Rigidbody` (o `Rigidbody2D`). Las versiones 2D llevan el sufijo `2D` y reciben `Collider2D` / `Collision2D`.',
    'Memoriza los `ForceMode`: `Force` y `Acceleration` son continuos (la segunda ignora la masa); `Impulse` y `VelocityChange` son instantáneos (la segunda ignora la masa).',
    'Las LayerMask son máscaras de bits: `1 << capa` incluye una capa y `~(1 << capa)` las incluye todas menos esa.',
    'Las cámaras que siguen objetos se actualizan en `LateUpdate`, después de que todo se haya movido.',
    '`transform.rotation` es un `Quaternion`: nunca modifiques `.x/.y/.z/.w` como si fueran grados. Usa `Quaternion.Euler`, `LookRotation`, `Slerp` o `RotateTowards`.',
    'En el Input System nuevo, las acciones vienen **deshabilitadas**: tienes que llamar a `Enable()` (habitualmente en `OnEnable`) y `Disable()` en `OnDisable`.'
  ],
  questions: [
    {
      id: 'core-01',
      topic: 'Física',
      q: 'Necesitas aplicar una fuerza continua a un `Rigidbody` mientras el jugador mantiene pulsada una tecla. ¿En qué método deberías llamar a `AddForce`?',
      options: ['`Update`', '`FixedUpdate`', '`LateUpdate`', '`OnRenderObject`'],
      answer: [1],
      explanation: '`FixedUpdate` se ejecuta en el paso fijo de la simulación física, así que la fuerza se aplica de forma consistente sin importar los FPS. El patrón recomendado es leer el input en `Update`, guardarlo en un campo, y aplicar la fuerza en `FixedUpdate`. `LateUpdate` y `OnRenderObject` van ligados al frame de renderizado, no al paso de física.'
    },
    {
      id: 'core-02',
      topic: 'Física',
      q: '¿Qué **dos** condiciones son necesarias para que Unity llame a `OnTriggerEnter` entre dos objetos con collider? (Elige 2)',
      options: [
        'Al menos uno de los dos objetos tiene un `Rigidbody`.',
        'Al menos uno de los colliders tiene activado **Is Trigger**.',
        'Ambos objetos tienen un `Rigidbody` no cinemático.',
        'Ambos objetos están en la misma Layer.',
        'El script debe estar en un objeto con `CharacterController`.'
      ],
      answer: [0, 1],
      explanation: 'Los eventos de trigger necesitan que al menos un collider sea trigger y que al menos uno de los objetos tenga un `Rigidbody` (puede ser cinemático). Las capas no tienen que coincidir; solo deben poder interactuar según la Layer Collision Matrix.'
    },
    {
      id: 'core-03',
      topic: 'Física',
      q: 'Una bala muy rápida con `Rigidbody` a veces atraviesa paredes delgadas sin que se dispare `OnCollisionEnter`. ¿Cuál es la mejor solución?',
      code: 'public class Bullet : MonoBehaviour\n{\n    void OnCollisionEnter(Collision other)\n    {\n        Destroy(gameObject);\n    }\n}',
      options: [
        'Cambiar **Collision Detection** del `Rigidbody` a `Continuous Dynamic`.',
        'Mover la bala en `Update` modificando `transform.position` directamente.',
        'Aumentar la masa de la pared.',
        'Cambiar `OnCollisionEnter` por `OnCollisionStay`, que se evalúa en cada paso.'
      ],
      answer: [0],
      explanation: 'El problema es el *tunneling*: con detección `Discrete`, en un paso de física la bala está antes de la pared y en el siguiente ya la ha pasado. La detección continua (`Continuous Dynamic`, o también `Continuous Speculative`) evita esto. Mover por `transform` empeora el problema, y la masa o `OnCollisionStay` no cambian la detección.'
    },
    {
      id: 'core-04',
      topic: 'Raycasts y capas',
      q: '¿Qué hace este código?',
      code: 'int mask = ~(1 << LayerMask.NameToLayer("Player"));\nif (Physics.Raycast(origin, dir, out RaycastHit hit, 100f, mask))\n{\n    Debug.Log(hit.collider.name);\n}',
      options: [
        'Detecta solo objetos en la capa Player.',
        'Detecta objetos en todas las capas excepto Player.',
        'No detecta nada, porque la máscara queda en 0.',
        'No compila: el operador `~` no se puede usar con enteros.'
      ],
      answer: [1],
      explanation: '`1 << n` crea una máscara con solo el bit de la capa `n`. El operador `~` invierte todos los bits, así que la máscara incluye todas las capas **menos** Player. Es útil para que el raycast del jugador no se golpee a sí mismo.'
    },
    {
      id: 'core-05',
      topic: 'Cámara',
      q: 'Una cámara sigue a un jugador que se mueve en `Update`. Se nota un ligero temblor (*jitter*). ¿En qué método deberías actualizar la posición de la cámara?',
      options: ['`Awake`', '`FixedUpdate`', '`LateUpdate`', '`OnPreRender`'],
      answer: [2],
      explanation: '`LateUpdate` se ejecuta después de todos los `Update`, así que la cámara se mueve cuando el objetivo ya está en su posición final de ese frame. Si el objetivo se mueve por física, activa también la interpolación del `Rigidbody`.'
    },
    {
      id: 'core-06',
      topic: 'Input',
      q: 'A veces el salto no responde al pulsar la barra espaciadora. ¿Cuál es la causa?',
      code: 'void FixedUpdate()\n{\n    if (Input.GetKeyDown(KeyCode.Space))\n        Jump();\n}',
      options: [
        '`GetKeyDown` solo es `true` en un frame, y `FixedUpdate` puede no ejecutarse en ese frame.',
        '`KeyCode.Space` solo se detecta si el GameObject tiene un collider con el foco del teclado.',
        '`GetKeyDown` necesita que `Time.timeScale` sea exactamente 1 para detectar pulsaciones.',
        '`GetKeyDown` está obsoleto; hay que usar `GetKey`, que detecta la pulsación siempre.'
      ],
      answer: [0],
      explanation: '`FixedUpdate` puede ejecutarse 0, 1 o varias veces por frame. Si no se ejecuta en el frame del `GetKeyDown`, el input se pierde. Lee el input en `Update` (por ejemplo, `jumpRequested = true`) y consúmelo en `FixedUpdate`.'
    },
    {
      id: 'core-07',
      topic: 'Input',
      q: 'Usas una clase generada por el Input System. Si **eliminas** la línea de `OnEnable`, ¿qué ocurre?',
      code: 'PlayerControls controls;\n\nvoid Awake()    { controls = new PlayerControls(); }\nvoid OnEnable() { controls.Gameplay.Enable(); }\n\nvoid Update()\n{\n    Vector2 move = controls.Gameplay.Move.ReadValue<Vector2>();\n    // ...\n}',
      options: [
        'Error de compilación: `ReadValue` no se puede llamar sobre una acción deshabilitada.',
        '`ReadValue` devuelve siempre `(0, 0)`, porque la acción está deshabilitada.',
        'Funciona igual, porque `new PlayerControls()` habilita todas las acciones.',
        'Se lanza `NullReferenceException` en `Update`.'
      ],
      answer: [1],
      explanation: 'Las acciones creadas desde código empiezan deshabilitadas (ni el constructor de la clase generada las habilita). Llamar a `ReadValue` sobre ellas compila y no lanza excepciones. Una acción deshabilitada no recibe input y `ReadValue` devuelve el valor por defecto. Lo correcto es habilitar el mapa en `OnEnable` y deshabilitarlo en `OnDisable`.'
    },
    {
      id: 'core-08',
      topic: 'Input',
      q: 'Con una `InputAction` de tipo **Button** y la interacción por defecto, ¿qué callback se dispara cuando el jugador **suelta** el botón?',
      options: ['`started`', '`performed`', '`canceled`', '`triggered`'],
      answer: [2],
      explanation: 'En un botón con la interacción por defecto, `started` y `performed` se disparan al pulsar y `canceled` al soltar. `triggered` no es un callback: es una propiedad booleana (`action.triggered`) que indica si la acción se ejecutó este frame.'
    },
    {
      id: 'core-09',
      topic: 'Movimiento',
      q: 'Con este código, el objeto se mueve más rápido en un PC a 144 FPS que en un móvil a 30 FPS. ¿Cómo lo corriges?',
      code: 'void Update()\n{\n    transform.Translate(Vector3.forward * speed);\n}',
      options: [
        'Multiplicar por `Time.deltaTime`.',
        'Multiplicar por `Time.fixedDeltaTime`.',
        'Fijar `Application.targetFrameRate = 30`.',
        'Mover el código a `LateUpdate`.'
      ],
      answer: [0],
      explanation: '`Time.deltaTime` es el tiempo en segundos desde el frame anterior. Multiplicar por él convierte `speed` en unidades por segundo, sin importar los FPS. Limitar los FPS no arregla el problema de fondo.'
    },
    {
      id: 'core-10',
      topic: 'Cámara',
      q: 'Quieres detectar qué objeto 3D está bajo el cursor al hacer clic. Tienes la cámara en `cam` y la posición del cursor en píxeles en `mousePos` (con el Input System, `Mouse.current.position.ReadValue()`). ¿Qué combinación es la correcta?',
      options: [
        '`cam.ScreenPointToRay(mousePos)` y luego `Physics.Raycast` con ese rayo.',
        '`cam.WorldToScreenPoint(mousePos)` y un `Physics.Raycast` desde la cámara hacia ese punto.',
        '`cam.ScreenToWorldPoint(mousePos)` y comparar el resultado con cada `transform.position`.',
        '`cam.ViewportToWorldPoint(mousePos)` y luego `OnMouseOver`.'
      ],
      answer: [0],
      explanation: '`ScreenPointToRay` crea un rayo que sale de la cámara y pasa por ese píxel; con `Physics.Raycast` obtienes el primer collider que toca. `ScreenToWorldPoint` devuelve un solo punto a la distancia z que le pases, no lo que hay bajo el cursor. `WorldToScreenPoint` hace la conversión contraria, y `ViewportToWorldPoint` espera coordenadas normalizadas (0–1), no píxeles.'
    },
    {
      id: 'core-11',
      topic: 'Movimiento',
      q: '¿Cuál de estas afirmaciones sobre `CharacterController` es **correcta**?',
      options: [
        '`SimpleMove` aplica la gravedad e ignora el componente Y de la velocidad.',
        '`Move` aplica la gravedad automáticamente.',
        'Un `CharacterController` responde a `AddForce` igual que un `Rigidbody` dinámico.',
        '`CharacterController` necesita un `Rigidbody` en el mismo objeto para colisionar.'
      ],
      answer: [0],
      explanation: '`SimpleMove(speed)` recibe una velocidad en unidades por segundo, aplica la gravedad, ignora el componente Y y usa `deltaTime` internamente. `Move(motion)` recibe un desplazamiento (tienes que multiplicar por `deltaTime` y sumar la gravedad tú mismo). `CharacterController` no está controlado por la física y no necesita `Rigidbody`: colisiona por sí mismo al moverse.'
    },
    {
      id: 'core-12',
      topic: 'Física',
      q: 'Para un salto instantáneo que **tenga en cuenta la masa** del `Rigidbody`, ¿qué `ForceMode` usarías?',
      options: ['`ForceMode.Force`', '`ForceMode.Acceleration`', '`ForceMode.Impulse`', '`ForceMode.VelocityChange`'],
      answer: [2],
      explanation: '`Impulse` aplica un impulso instantáneo: el cambio de velocidad resultante es el impulso dividido por la masa. `VelocityChange` también es instantáneo pero ignora la masa. `Force` y `Acceleration` están pensados para aplicarse de forma continua en cada paso de física.'
    },
    {
      id: 'core-13',
      topic: 'Rotación',
      q: '¿Qué ocurre con esta línea?',
      code: 'transform.rotation.x = 45f;',
      options: [
        'Gira el objeto 45 grados en el eje X respecto a su rotación actual.',
        'Error de compilación, porque `rotation` devuelve una copia (es un struct).',
        'Gira el objeto 45 radianes en el eje X, porque los cuaterniones usan radianes.',
        'Compila, pero no tiene efecto, porque modifica una copia.'
      ],
      answer: [1],
      explanation: '`transform.rotation` devuelve una **copia** del `Quaternion`, así que modificarla da error (CS1612). Además, `x` no son grados: es un componente del cuaternión. Usa `transform.rotation = Quaternion.Euler(45f, 0f, 0f)` o `transform.eulerAngles`.'
    },
    {
      id: 'core-14',
      topic: 'Rotación',
      q: '¿Qué devuelve `Quaternion.LookRotation(target.position - transform.position)`?',
      options: [
        'El ángulo en grados entre el forward del objeto y el objetivo.',
        'Una rotación cuyo eje forward (Z+) apunta hacia el objetivo.',
        'Un `Vector3` normalizado que apunta desde el objeto hacia el objetivo.',
        'Una rotación cuyo eje up (Y+) apunta hacia el objetivo.'
      ],
      answer: [1],
      explanation: '`LookRotation(forward, up)` construye una rotación cuyo eje Z+ mira en la dirección dada. Para girar poco a poco, combínala con `Quaternion.Slerp` o `Quaternion.RotateTowards`.'
    },
    {
      id: 'core-15',
      topic: 'Raycasts y capas',
      q: 'Las balas del jugador chocan con el propio jugador al salir del arma. ¿Cuál es la solución más limpia, sin código extra en cada bala?',
      options: [
        'Usar capas distintas y desactivar su interacción en la **Layer Collision Matrix**.',
        'Darles tags distintos ("Bullet" y "Player") para que la física ignore el contacto.',
        'Llamar a `Physics.IgnoreCollision` en el `Start` de cada bala.',
        'Marcar el collider del jugador como trigger mientras dura la animación de disparo.'
      ],
      answer: [0],
      explanation: 'La Layer Collision Matrix (Project Settings > Physics) define qué capas pueden colisionar entre sí y no cuesta nada en tiempo de ejecución. `IgnoreCollision` funciona, pero es código por pareja de objetos. Los tags no afectan a la física.'
    },
    {
      id: 'core-16',
      topic: 'Cámara',
      q: 'Tienes dos cámaras virtuales de Cinemachine (exploración y combate) y una `CinemachineBrain` en la cámara principal. ¿Cómo pasas a la cámara de combate con una transición suave?',
      options: [
        'Destruyes la Main Camera y creas otra con los ajustes de combate.',
        'Subes la **Priority** de la cámara de combate por encima de la otra.',
        'Asignas `Camera.main = combatCamera` desde un script.',
        'Cambias la propiedad `depth` de la cámara virtual de combate a un valor mayor.'
      ],
      answer: [1],
      explanation: 'La `CinemachineBrain` activa la cámara virtual con mayor prioridad entre las que están activas, y hace la transición con el blend configurado (Default Blend o Custom Blends). También sirve activar solo la cámara de combate. `Camera.main` es de solo lectura, y `depth` es una propiedad de `Camera` que no afecta a la elección de la `CinemachineBrain`.'
    },
    {
      id: 'core-17',
      topic: 'Física',
      q: 'Dentro de `OnCollisionEnter(Collision collision)`, ¿cómo obtienes el **punto de impacto**?',
      options: [
        '`collision.transform.position`',
        '`collision.point`',
        '`collision.GetContact(0).point`',
        '`collision.collider.bounds.center`'
      ],
      answer: [2],
      explanation: '`Collision` contiene los puntos de contacto. `GetContact(i)` (o el array `contacts`) devuelve un `ContactPoint` con `point` y `normal`. `collision.transform.position` es el pivote del otro objeto, no el punto de impacto, y `collision.point` no existe.'
    },
    {
      id: 'core-18',
      topic: 'Física',
      q: 'Un personaje que se mueve por física y al que sigue la cámara se ve entrecortado en monitores de alta frecuencia. ¿Qué ajuste del `Rigidbody` ayuda?',
      options: [
        'Activar **Is Kinematic**.',
        'Poner **Interpolate** en `Interpolate`.',
        'Bajar el valor de **Linear Damping** (antes Drag).',
        'Cambiar **Collision Detection** a `Discrete`.'
      ],
      answer: [1],
      explanation: 'La física avanza a un ritmo fijo (por defecto 50 Hz) y el renderizado a otro. La interpolación suaviza la posición visual entre pasos de física, así que se nota menos el desfase con la cámara.'
    },
    {
      id: 'core-19',
      topic: 'Física',
      q: 'En un juego 2D, ¿qué método se llama cuando dos objetos con `Collider2D` (no trigger) y `Rigidbody2D` chocan?',
      options: [
        '`OnCollisionEnter(Collision c)`',
        '`OnCollisionEnter2D(Collision2D c)`',
        '`OnTriggerEnter2D(Collider2D c)`',
        '`OnControllerColliderHit(ControllerColliderHit h)`'
      ],
      answer: [1],
      explanation: 'La física 2D (Box2D) está separada de la 3D (PhysX) y usa métodos con sufijo `2D`. Si escribes `OnCollisionEnter` en un juego 2D, nunca se llamará, y Unity no da ningún error. `OnControllerColliderHit` es exclusivo del `CharacterController` 3D.'
    },
    {
      id: 'core-20',
      topic: 'Física',
      q: 'En Unity 6, el código `rb.velocity = Vector3.zero;` muestra un aviso de API obsoleta. ¿Qué propiedad debes usar?',
      options: [
        '`rb.linearVelocity`',
        '`rb.moveVelocity`',
        '`rb.worldVelocity`',
        '`rb.currentVelocity`'
      ],
      answer: [0],
      explanation: 'En Unity 6, `Rigidbody.velocity` pasó a llamarse `linearVelocity` (para diferenciarla de `angularVelocity`). También cambiaron `drag` → `linearDamping` y `angularDrag` → `angularDamping`. En 2D, `Rigidbody2D.velocity` también pasó a `linearVelocity`.'
    },
    {
      id: 'core-21',
      topic: 'Cámara',
      q: 'En **Cinemachine 3** (el paquete recomendado en Unity 6), ¿cómo se llama el componente que sustituye a `CinemachineVirtualCamera`?',
      options: [
        '`CinemachineCamera`',
        '`CinemachineBrain`',
        '`CinemachineFreeLook`',
        '`VirtualCamera3D`'
      ],
      answer: [0],
      explanation: 'Cinemachine 3 simplificó la API: `CinemachineCamera` sustituye a `CinemachineVirtualCamera` (y a `CinemachineFreeLook`, que ahora se monta con componentes como Orbital Follow), y el namespace pasó a `Unity.Cinemachine`. `CinemachineBrain` sigue en la cámara real y decide qué cámara está activa según la **Priority**.'
    },
    {
      id: 'core-22',
      topic: 'Input',
      q: 'Tu arma tiene un disparo cargado. La acción `charge` es de tipo **Button** y tiene una interacción **Hold** con **Hold Time** de 0,5 s. El jugador pulsa el botón y lo suelta a los 0,2 segundos. ¿Qué se imprime?',
      code: '[SerializeField] InputAction charge; // Button + Hold (0.5 s)\n\nvoid OnEnable()\n{\n    charge.started   += _ => Debug.Log("A");\n    charge.performed += _ => Debug.Log("B");\n    charge.canceled  += _ => Debug.Log("C");\n    charge.Enable();\n}',
      options: [
        '`A` al pulsar y `C` al soltar.',
        '`A` y `B` al pulsar, y `C` al soltar.',
        '`A` al pulsar, y `B` y `C` al soltar.',
        'Solo `C` al soltar.'
      ],
      answer: [0],
      explanation: 'Con la interacción **Hold**, `started` se dispara al pulsar, `performed` solo cuando el botón se ha mantenido el tiempo configurado y `canceled` al soltar. Si se suelta antes de 0,5 s, `performed` nunca llega: se imprime `A` y luego `C`. Si se mantiene más de 0,5 s, se imprimiría `A`, `B` (al cumplirse el tiempo) y `C` al soltar. Es la forma típica de distinguir un toque corto de una carga.'
    },
    {
      id: 'core-23',
      topic: 'Input',
      q: 'En el menú de opciones, el jugador debe poder cambiar la tecla de la acción `Jump` (Input System), y el cambio debe conservarse al cerrar y abrir el juego. ¿Qué **dos** cosas deberías hacer? (Elige 2)',
      options: [
        'Deshabilitar la acción y llamar a `PerformInteractiveRebinding()` sobre ella, y luego a `Start()`.',
        'Guardar `SaveBindingOverridesAsJson()` y aplicarlo con `LoadBindingOverridesFromJson()` al arrancar.',
        'Modificar el asset `.inputactions` en tiempo de ejecución con `AssetDatabase` y guardarlo en disco.',
        'Regenerar la clase C# del asset con **Generate C# Class** cada vez que el jugador cambie la tecla.',
        'Crear una `InputAction` nueva en cada `Update` con la tecla elegida.'
      ],
      answer: [0, 1],
      explanation: '`PerformInteractiveRebinding()` espera a que el jugador pulse un control y lo aplica como *binding override*; la acción tiene que estar deshabilitada durante el proceso (si no, lanza una excepción) y conviene llamar a `Dispose()` en la operación al terminar. Los overrides no se guardan solos: `SaveBindingOverridesAsJson()` los serializa (por ejemplo, a `PlayerPrefs` o a un archivo) y `LoadBindingOverridesFromJson()` los restaura. `AssetDatabase` y **Generate C# Class** son herramientas del Editor que no existen en una build, y crear acciones en cada frame no persiste nada.'
    },
    {
      id: 'core-24',
      topic: 'Input',
      q: 'Tu juego usa `PlayerInput` con dos action maps: `Player` y `UI`. Al abrir el menú de pausa, el personaje debe dejar de recibir input y el gamepad debe navegar por el menú. ¿Qué línea falta?',
      code: '[SerializeField] PlayerInput playerInput;\n[SerializeField] GameObject pauseMenu;\n\npublic void OpenPauseMenu()\n{\n    pauseMenu.SetActive(true);\n    // missing line\n}',
      options: [
        '`playerInput.SwitchCurrentActionMap("UI");`',
        '`playerInput.actions.FindActionMap("UI").Enable();`',
        '`playerInput.defaultActionMap = "UI";`',
        '`InputSystem.DisableDevice(Gamepad.current);`'
      ],
      answer: [0],
      explanation: '`SwitchCurrentActionMap` deshabilita el mapa actual (`Player`) y habilita el nuevo (`UI`), justo lo que necesitas. Habilitar `UI` con `FindActionMap(...).Enable()` deja `Player` también habilitado, así que el personaje seguiría moviéndose. `defaultActionMap` solo indica qué mapa se activa cuando se habilita el `PlayerInput`; cambiarlo en mitad de la partida no cambia de mapa. Deshabilitar el gamepad bloquearía también la navegación del menú.'
    },
    {
      id: 'core-25',
      topic: 'Movimiento',
      q: 'Tu personaje usa un `CharacterController`. Se mueve muchísimo más rápido de lo esperado y su velocidad cambia según los FPS. ¿Cuál es el error?',
      code: 'CharacterController controller;\nVector3 velocity;\n\nvoid Update()\n{\n    Vector3 move = new Vector3(input.x, 0f, input.y) * speed;\n    velocity.y += gravity * Time.deltaTime;\n    controller.Move(move + velocity);\n}',
      options: [
        '`Move` espera un desplazamiento y aquí recibe una velocidad sin `Time.deltaTime`.',
        '`Move` ya aplica la gravedad, así que `velocity.y` se suma dos veces en cada frame.',
        'Debe ir en `FixedUpdate`, porque el `CharacterController` avanza con el paso de física.',
        '`gravity` debe ser positiva, porque `Move` invierte el eje Y.'
      ],
      answer: [0],
      explanation: '`CharacterController.Move` recibe un **desplazamiento** para este frame, no una velocidad. `move + velocity` está en unidades por segundo, así que hay que pasar `(move + velocity) * Time.deltaTime`; si no, el personaje recorre `speed` unidades **por frame**. `Move` no aplica gravedad (eso lo hace `SimpleMove`), y el `CharacterController` no forma parte de la simulación de `Rigidbody`, así que se mueve bien en `Update`.'
    },
    {
      id: 'core-26',
      topic: 'Movimiento',
      q: 'Una plataforma móvil tiene un `Rigidbody` **cinemático** con **Interpolate** activado y se mueve con este código. ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      code: 'void FixedUpdate()\n{\n    Vector3 next = rb.position + direction * speed * Time.deltaTime;\n    rb.MovePosition(next);\n}',
      options: [
        'Dentro de `FixedUpdate`, `Time.deltaTime` devuelve el valor de `Time.fixedDeltaTime`.',
        'Gracias a la interpolación, el movimiento se ve suave entre pasos de física.',
        'Asignar `transform.position = next` daría exactamente el mismo resultado físico.',
        '`MovePosition` solo funciona en un `Rigidbody` con **Is Kinematic** desactivado.',
        'Hay que multiplicar también por `Time.fixedDeltaTime`, o dependerá de los FPS.'
      ],
      answer: [0, 1],
      explanation: 'Cuando se lee dentro de `FixedUpdate`, `Time.deltaTime` devuelve `Time.fixedDeltaTime`, así que el código ya es independiente de los FPS (multiplicar otra vez lo haría demasiado lento). `MovePosition` mueve el cuerpo cinemático dentro de la simulación, empuja correctamente a los objetos dinámicos y, con **Interpolate**, suaviza la posición visual entre pasos. Asignar `transform.position` lo teletransporta, sin interpolación ni una interacción física correcta. `MovePosition` está pensado precisamente para cuerpos cinemáticos.'
    },
    {
      id: 'core-27',
      topic: 'Raycasts y capas',
      q: 'Tu láser debe dañar a **todos** los enemigos que atraviese. Lo implementas así. ¿Qué **dos** afirmaciones sobre este código son correctas? (Elige 2)',
      code: 'readonly RaycastHit[] hits = new RaycastHit[16];\n\nvoid FireLaser()\n{\n    int count = Physics.RaycastNonAlloc(muzzle.position, muzzle.forward, hits,\n        50f, enemyMask, QueryTriggerInteraction.Ignore);\n\n    for (int i = 0; i < count; i++)\n        Damage(hits[i].collider);\n}',
      options: [
        'No genera basura en cada disparo, porque reutiliza el array `hits`.',
        'Los colliders con **Is Trigger** activado no aparecen en los resultados.',
        'Los impactos llegan ordenados del más cercano al más lejano.',
        'Con más de 16 enemigos en la línea, lanza `IndexOutOfRangeException`.',
        'Solo daña al primer enemigo, porque el rayo se detiene en el primer collider.'
      ],
      answer: [0, 1],
      explanation: '`RaycastNonAlloc` funciona como `RaycastAll`, pero escribe en un array que tú reservas una vez, así que no genera basura; devuelve cuántos impactos ha escrito y por eso el bucle usa `count` y no `hits.Length`. `QueryTriggerInteraction.Ignore` excluye los triggers sin importar el ajuste global `Physics.queriesHitTriggers`. Los resultados **no** vienen ordenados por distancia (si los necesitas ordenados, ordénalos tú por `hit.distance`), y si hay más impactos que huecos en el array, los sobrantes se descartan sin error. A diferencia de `Physics.Raycast`, aquí se recogen todos los colliders del recorrido.'
    },
    {
      id: 'core-28',
      topic: 'Raycasts y capas',
      q: 'Tu proyectil es una bola de 0,5 m de radio y detecta impactos con un `Physics.Raycast` desde su centro. A veces roza una columna fina y no la detecta, aunque visualmente la toca. ¿Qué es lo más adecuado?',
      options: [
        'Usar `Physics.SphereCast` con el radio del proyectil y la misma dirección y distancia.',
        'Usar `Physics.OverlapSphere` en la posición final de cada frame, con el radio del proyectil.',
        'Usar `Physics.Linecast` entre la posición anterior y la actual.',
        'Aumentar la `maxDistance` del `Physics.Raycast` para que llegue antes a la columna.'
      ],
      answer: [0],
      explanation: '`SphereCast` barre una esfera a lo largo del recorrido, así que detecta lo que toca el volumen del proyectil y no solo su centro. `OverlapSphere` solo mira la posición final y se salta lo que hay entre dos frames. `Linecast` sigue siendo una línea sin grosor, y una distancia mayor no cambia el ancho del rayo. Ojo: `SphereCast` no detecta los colliders que ya se solapan con la esfera en el punto de origen.'
    },
    {
      id: 'core-29',
      topic: 'Rotación',
      q: 'Una torreta gira hacia el enemigo con este código, pero el giro es más rápido con más FPS y se frena al acercarse al objetivo. Debe girar a **90° por segundo constantes**. ¿Qué cambio deberías hacer?',
      code: 'void Update()\n{\n    Vector3 dir = enemy.position - turret.position;\n    Quaternion target = Quaternion.LookRotation(dir);\n    turret.rotation = Quaternion.Slerp(turret.rotation, target, 0.1f);\n}',
      options: [
        'Usar `Quaternion.RotateTowards` con `90f * Time.deltaTime` como paso máximo.',
        'Cambiar `0.1f` por `90f * Time.deltaTime`, porque el tercer parámetro de `Slerp` son grados.',
        'Cambiar `Slerp` por `Lerp`, que gira a ritmo constante.',
        'Mover el código a `FixedUpdate`, para que `0.1f` se aplique siempre a un ritmo fijo de 50 Hz.'
      ],
      answer: [0],
      explanation: '`RotateTowards(from, to, maxDegreesDelta)` avanza como mucho ese número de grados y no se pasa del objetivo; con `90f * Time.deltaTime` el giro es de 90°/s sin importar los FPS. Llamar a `Slerp` con una `t` fija recorre un porcentaje de lo que falta en cada frame, por eso se frena al final y depende de los FPS. El tercer parámetro de `Slerp` es una fracción de 0 a 1, no grados, y `Lerp` tiene el mismo problema. En `FixedUpdate` dejaría de depender de los FPS, pero seguiría frenándose al final.'
    },
    {
      id: 'core-30',
      topic: 'Rotación',
      q: 'Tu nave está inclinada (alabeo sobre su eje Z) y debe girar sobre el eje **Y del mundo**, no sobre su propio eje Y, conservando la inclinación. ¿Qué línea completa el código?',
      code: 'void Update()\n{\n    float a = turnSpeed * Time.deltaTime;\n    // missing line\n}',
      options: [
        '`transform.rotation = Quaternion.Euler(0f, a, 0f) * transform.rotation;`',
        '`transform.rotation = transform.rotation + Quaternion.Euler(0f, a, 0f);`',
        '`transform.localRotation = transform.localRotation * Quaternion.Euler(0f, a, 0f);`',
        '`transform.eulerAngles = new Vector3(0f, a, 0f);`'
      ],
      answer: [0],
      explanation: 'Al componer cuaterniones con `*`, el orden importa: `giro * rotación` aplica el giro en ejes del **mundo**, y `rotación * giro` lo aplica en los ejes **locales** del objeto (como `transform.Rotate` con el `Space.Self` por defecto). Por eso la opción con `localRotation * ...` gira sobre el eje Y inclinado de la nave. `Quaternion` no tiene operador `+`, así que esa línea no compila. Asignar `eulerAngles` fija una rotación absoluta: pierde la inclinación y no acumula el giro. Una alternativa equivalente a la correcta es `transform.Rotate(0f, a, 0f, Space.World)`.'
    },
    {
      id: 'core-31',
      topic: 'Input',
      q: 'Tu jugador tiene un componente `PlayerInput` con **Behavior** en **Send Messages** y un action map con una acción llamada `Jump`. ¿Qué método de un script en el mismo GameObject se llamará al saltar?',
      options: [
        '`void OnJump(InputValue value)`',
        '`void Jump(InputAction.CallbackContext context)`',
        '`void OnJumpPerformed(InputAction.CallbackContext ctx)`',
        '`void OnJump(KeyCode key)`'
      ],
      answer: [0],
      explanation: 'Con **Send Messages** (o **Broadcast Messages**), `PlayerInput` envía un mensaje llamado `On` + el nombre de la acción, que puede recibir un `InputValue` (o ningún parámetro); con `value.Get<T>()` lees el valor. Los métodos con `InputAction.CallbackContext` son los que se usan con **Invoke Unity Events** o al suscribirte por código a `performed`, y su nombre lo eliges tú al asignarlos. `KeyCode` pertenece al Input Manager clásico.'
    }
  ]
});
