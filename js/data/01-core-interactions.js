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
      options: ['`Update`', '`FixedUpdate`', '`LateUpdate`', '`OnGUI`'],
      answer: [1],
      explanation: '`FixedUpdate` se ejecuta en el paso fijo de la simulación física, así que la fuerza se aplica de forma consistente sin importar los FPS. El patrón recomendado es leer el input en `Update`, guardarlo en un campo, y aplicar la fuerza en `FixedUpdate`.'
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
        'Cambiar **Collision Detection** del `Rigidbody` a `Continuous Dynamic` (o `Continuous Speculative`).',
        'Mover la bala en `Update` modificando `transform.position`.',
        'Aumentar la masa de la pared.',
        'Cambiar `OnCollisionEnter` por `OnCollisionStay`.'
      ],
      answer: [0],
      explanation: 'El problema es el *tunneling*: con detección `Discrete`, en un paso de física la bala está antes de la pared y en el siguiente ya la ha pasado. La detección continua evita esto. Mover por `transform` empeora el problema, y la masa o `OnCollisionStay` no cambian la detección.'
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
        'Error de compilación.',
        '`ReadValue` devuelve siempre `(0, 0)`, porque las acciones están deshabilitadas por defecto.',
        'Funciona igual, porque las acciones se habilitan solas.',
        'Se lanza `NullReferenceException` en `Update`.'
      ],
      answer: [1],
      explanation: 'Las acciones creadas desde código empiezan deshabilitadas. Una acción deshabilitada no recibe input y `ReadValue` devuelve el valor por defecto. Lo correcto es habilitar el mapa en `OnEnable` y deshabilitarlo en `OnDisable`.'
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
      q: 'Quieres detectar qué objeto 3D está bajo el cursor del ratón al hacer clic. ¿Qué combinación es la correcta?',
      options: [
        '`Camera.main.ScreenPointToRay(Input.mousePosition)` y luego `Physics.Raycast` con ese rayo.',
        '`Camera.main.WorldToScreenPoint(Input.mousePosition)` y luego `Physics.Raycast`.',
        '`Camera.main.ScreenToWorldPoint(Input.mousePosition)` y comparar con `transform.position`.',
        '`Camera.main.ViewportToWorldPoint(Input.mousePosition)` y `OnMouseOver`.'
      ],
      answer: [0],
      explanation: '`ScreenPointToRay` crea un rayo que sale de la cámara y pasa por ese píxel; con `Physics.Raycast` obtienes el primer collider que toca. `ScreenToWorldPoint` devuelve un solo punto a la distancia z que le pases, no lo que hay bajo el cursor.'
    },
    {
      id: 'core-11',
      topic: 'Movimiento',
      q: '¿Cuál de estas afirmaciones sobre `CharacterController` es **correcta**?',
      options: [
        '`SimpleMove` aplica la gravedad automáticamente, recibe la velocidad en unidades por segundo e ignora el eje Y.',
        '`Move` aplica la gravedad automáticamente.',
        'Un `CharacterController` responde a `AddForce` como un `Rigidbody`.',
        '`CharacterController` necesita un `Rigidbody` en el mismo objeto para funcionar.'
      ],
      answer: [0],
      explanation: '`SimpleMove(speed)` aplica la gravedad y usa `deltaTime` internamente. `Move(motion)` recibe un desplazamiento (tienes que multiplicar por `deltaTime` y sumar la gravedad tú mismo). `CharacterController` no está controlado por la física y no necesita `Rigidbody`.'
    },
    {
      id: 'core-12',
      topic: 'Física',
      q: 'Para un salto instantáneo que **tenga en cuenta la masa** del `Rigidbody`, ¿qué `ForceMode` usarías?',
      options: ['`ForceMode.Force`', '`ForceMode.Acceleration`', '`ForceMode.Impulse`', '`ForceMode.VelocityChange`'],
      answer: [2],
      explanation: '`Impulse` aplica un cambio de momento instantáneo dividido por la masa. `VelocityChange` también es instantáneo pero ignora la masa. `Force` y `Acceleration` están pensados para aplicarse de forma continua en cada paso de física.'
    },
    {
      id: 'core-13',
      topic: 'Rotación',
      q: '¿Qué ocurre con esta línea?',
      code: 'transform.rotation.x = 45f;',
      options: [
        'Gira el objeto 45 grados en el eje X respecto a su rotación actual.',
        'Error de compilación, porque `rotation` devuelve una copia (struct).',
        'Gira el objeto 45 radianes en el eje X, porque los cuaterniones usan radianes.',
        'Compila, pero no tiene efecto, porque modifica una copia del cuaternión.'
      ],
      answer: [1],
      explanation: '`transform.rotation` devuelve una **copia** del `Quaternion`, así que modificarla da error (CS1612). Además, `x` no son grados: es un componente del cuaternión. Usa `transform.rotation = Quaternion.Euler(45f, 0f, 0f)` o `transform.eulerAngles`.'
    },
    {
      id: 'core-14',
      topic: 'Rotación',
      q: '¿Qué devuelve `Quaternion.LookRotation(target.position - transform.position)`?',
      options: [
        'El ángulo en grados entre el objeto y el objetivo.',
        'Una rotación cuyo eje forward (Z+) apunta hacia el objetivo.',
        'Un `Vector3` normalizado hacia el objetivo.',
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
        'Darles tags distintos ("Bullet" y "Player") para que la física los distinga.',
        'Llamar a `Physics.IgnoreCollision` en el `Start` de cada bala.',
        'Hacer que el collider del jugador sea trigger mientras dispara.'
      ],
      answer: [0],
      explanation: 'La Layer Collision Matrix (Project Settings > Physics) define qué capas pueden colisionar entre sí y no cuesta nada en tiempo de ejecución. `IgnoreCollision` funciona, pero es código por pareja de objetos. Los tags no afectan a la física.'
    },
    {
      id: 'core-16',
      topic: 'Cámara',
      q: 'Tienes dos cámaras virtuales de Cinemachine (exploración y combate) y una `CinemachineBrain` en la cámara principal. ¿Cómo pasas a la cámara de combate con una transición suave?',
      options: [
        'Destruyes la Main Camera y creas otra.',
        'Subes la **Priority** de la cámara de combate por encima de la otra (o la activas).',
        'Asignas `Camera.main = combatCamera`.',
        'Cambias la propiedad `depth` de la cámara virtual.'
      ],
      answer: [1],
      explanation: 'La `CinemachineBrain` activa la cámara virtual con mayor prioridad entre las que están activas, y hace la transición con el blend configurado (Default Blend o Custom Blends). `Camera.main` es de solo lectura.'
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
        'Bajar el valor de **Drag**.',
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
        '`OnCollision2D(Collision2D c)`'
      ],
      answer: [1],
      explanation: 'La física 2D (Box2D) está separada de la 3D (PhysX) y usa métodos con sufijo `2D`. Si escribes `OnCollisionEnter` en un juego 2D, nunca se llamará, y Unity no da ningún error.'
    }
  ]
});
