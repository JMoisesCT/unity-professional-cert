UCP.addDomain({
  id: 'art',
  order: 2,
  title: 'Pipeline de arte',
  titleEn: 'Working in the art pipeline',
  description: 'Iluminación, materiales, shaders y texturas; animación 2D y 3D; sistemas de partículas, todo desde el punto de vista del programador.',
  objectives: [
    'Entender la iluminación, los materiales, los shaders y las texturas, y cómo manipularlos desde scripts.',
    'Programar animación 2D y 3D (Animator, parámetros, transiciones, layers, root motion, eventos).',
    'Controlar sistemas de partículas desde código.'
  ],
  tips: [
    '`renderer.material` **crea una instancia** del material (solo afecta a ese objeto, cuesta memoria y rompe el batching). `renderer.sharedMaterial` modifica el asset compartido (afecta a todos, y en el Editor el cambio **se queda guardado**).',
    'Para variar propiedades por objeto sin crear instancias de material, usa `MaterialPropertyBlock` (en URP ten en cuenta que esto hace que el objeto no sea compatible con el SRP Batcher).',
    'Nombres de propiedad habituales: Built-in Standard usa `_Color` y `_MainTex`; URP Lit usa `_BaseColor` y `_BaseMap`. La emisión necesita la keyword `_EMISSION`.',
    'Guarda en caché los IDs: `Animator.StringToHash("Speed")` y `Shader.PropertyToID("_BaseColor")` en campos `static readonly int`.',
    'Si una transición del Animator "tarda" en reaccionar, revisa **Has Exit Time**. Si un trigger "se dispara solo" más tarde, recuerda que sigue activo hasta que una transición lo consume (`ResetTrigger`).',
    'Iluminación baked + objetos dinámicos = **Light Probes**. Reflejos correctos en metales = **Reflection Probes**.',
    'Los módulos de `ParticleSystem` (`main`, `emission`, `shape`...) son structs: guárdalos en una variable (`var main = ps.main;`) y modifica esa variable. No hace falta volver a asignarla.'
  ],
  questions: [
    {
      id: 'art-01',
      topic: 'Materiales',
      q: 'Hay 50 enemigos que comparten el mismo material. Este código se ejecuta en **uno** de ellos. ¿Qué ocurre?',
      code: 'GetComponent<Renderer>().material.color = Color.red;',
      options: [
        'Los 50 enemigos se ponen rojos.',
        'Solo ese enemigo se pone rojo; Unity crea una instancia (copia) del material para su renderer.',
        'Solo ese enemigo se pone rojo, sin ningún coste extra de memoria.',
        'Lanza una excepción porque el material es compartido.'
      ],
      answer: [1],
      explanation: 'Al acceder a `.material`, Unity duplica el material la primera vez y se lo asigna solo a ese renderer. Es cómodo, pero cada instancia ocupa memoria, rompe el batching y deberías destruirla (`Destroy`) cuando no la necesites. `.sharedMaterial` modificaría el asset y afectaría a los 50.'
    },
    {
      id: 'art-02',
      topic: 'Materiales',
      q: 'En URP, con el shader **Universal Render Pipeline/Lit**, ¿qué nombre de propiedad usarías con `SetColor` para cambiar el color base?',
      options: ['`_Color`', '`_BaseColor`', '`_MainColor`', '`_Albedo`'],
      answer: [1],
      explanation: 'URP Lit usa `_BaseColor` (y `_BaseMap` para la textura). `_Color` es el nombre del shader Standard del Built-in Render Pipeline. URP marca `_BaseColor` como `[MainColor]`, así que `material.color` también funciona, pero en el examen conviene conocer el nombre real.'
    },
    {
      id: 'art-03',
      topic: 'Materiales',
      q: 'Quieres que cada uno de 500 árboles con el mismo material tenga un tono distinto, **sin crear 500 instancias de material**. ¿Qué usarías?',
      options: [
        '`renderer.material.color` en cada árbol.',
        'Un `MaterialPropertyBlock` aplicado con `renderer.SetPropertyBlock`.',
        '`renderer.sharedMaterial.color` en cada árbol.',
        'Crear 500 materiales en el proyecto.'
      ],
      answer: [1],
      explanation: '`MaterialPropertyBlock` guarda valores de propiedades por renderer sin duplicar el material. `sharedMaterial` cambiaría el color de todos, y `.material` crearía 500 instancias. En URP, ten en cuenta que los objetos con property block dejan de ser compatibles con el SRP Batcher.'
    },
    {
      id: 'art-04',
      topic: 'Animación 3D',
      q: '¿Por qué este enfoque es preferible a llamar a `animator.SetFloat("Speed", ...)`?',
      code: 'static readonly int SpeedHash = Animator.StringToHash("Speed");\n\nvoid Update()\n{\n    animator.SetFloat(SpeedHash, velocity.magnitude);\n}',
      options: [
        'Porque `SetFloat` con string está obsoleto y no compila.',
        'Porque evita calcular el hash del string en cada llamada, lo que es más eficiente.',
        'Porque permite usar parámetros que no existen en el Animator Controller.',
        'Porque sincroniza el parámetro con la red automáticamente.'
      ],
      answer: [1],
      explanation: 'Internamente el Animator identifica los parámetros por un hash entero. Con la sobrecarga que recibe un string, el hash se calcula cada vez. Guardarlo en un `static readonly int` es la práctica recomendada (lo mismo pasa con `Shader.PropertyToID`).'
    },
    {
      id: 'art-05',
      topic: 'Animación 3D',
      q: 'Al llamar a `SetTrigger("Attack")`, la animación de ataque tarda en empezar porque espera a que termine el ciclo de Idle. ¿Qué deberías cambiar en la transición Idle → Attack?',
      options: [
        'Desactivar **Has Exit Time** en esa transición.',
        'Aumentar el **Exit Time** a 1 para que la transición empiece antes.',
        'Cambiar el parámetro de tipo trigger a bool para que se evalúe antes.',
        'Activar **Apply Root Motion** para que la animación empiece inmediatamente.'
      ],
      answer: [0],
      explanation: 'Con **Has Exit Time** activado, la transición solo puede ocurrir al llegar al tiempo normalizado indicado, aunque la condición ya se cumpla. Para acciones de respuesta inmediata (atacar, saltar), desactívalo y usa solo la condición del parámetro.'
    },
    {
      id: 'art-06',
      topic: 'Animación 3D',
      q: 'Llamas a `SetTrigger("Jump")` mientras el personaje está en un estado sin transición que use ese trigger. Segundos después, al volver a Idle, el personaje salta solo. ¿Por qué?',
      options: [
        'Es un fallo del Animator: los triggers se guardan en caché hasta reiniciar el controlador.',
        'Un trigger sigue activo hasta que una transición lo consume.',
        'Los triggers se reactivan automáticamente cada vez que se vuelve al estado por defecto.',
        'El parámetro `Jump` debería ser float para que vuelva a 0 automáticamente.'
      ],
      answer: [1],
      explanation: 'Un trigger es un bool que se pone a `false` automáticamente **cuando una transición lo consume**. Si ninguna transición lo consume, se queda activo y se usará en cuanto haya una transición que lo use. `ResetTrigger` lo limpia.'
    },
    {
      id: 'art-07',
      topic: 'Animación 3D',
      q: 'Quieres reproducir el sonido de un paso justo cuando el pie toca el suelo en la animación de caminar. ¿Cuál es el enfoque más adecuado?',
      options: [
        'Un **Animation Event** en el clip que llame a un método de un script en el mismo GameObject que el `Animator`.',
        'Una corrutina que reproduce el sonido cada 0,5 segundos.',
        'Comprobar `animator.GetCurrentAnimatorStateInfo(0).normalizedTime` en `FixedUpdate`.',
        'Un trigger collider en cada pie.'
      ],
      answer: [0],
      explanation: 'Los Animation Events llaman a un método (por nombre) en los componentes del GameObject que tiene el `Animator`, justo en el frame indicado del clip. Así el sonido queda sincronizado aunque cambie la velocidad de la animación.'
    },
    {
      id: 'art-08',
      topic: 'Animación 3D',
      q: 'Necesitas una transición suave entre Idle, Walk y Run según la velocidad del personaje. ¿Qué es lo más adecuado?',
      options: [
        'Tres estados con transiciones controladas por triggers.',
        'Un **Blend Tree 1D** controlado por un parámetro float `Speed`.',
        'Tres Animator Controllers distintos que se cambian por código.',
        'Una Avatar Mask por cada animación.'
      ],
      answer: [1],
      explanation: 'Un Blend Tree mezcla varios clips según uno o más parámetros. Para locomoción por velocidad, un Blend Tree 1D con `Speed` da una mezcla continua sin tener que gestionar transiciones. Para moverse en 8 direcciones se usan Blend Trees 2D.'
    },
    {
      id: 'art-09',
      topic: 'Animación 3D',
      q: 'El personaje debe poder disparar (brazos y torso) mientras corre (piernas). ¿Cómo lo resuelves en el Animator?',
      options: [
        'Creando un estado "CorrerYDisparar" con una animación combinada.',
        'Añadiendo una **layer** con una **Avatar Mask** del tronco superior, con weight 1 y blending Override.',
        'Usando dos componentes `Animator` en el mismo GameObject.',
        'Activando Root Motion solo en el torso.'
      ],
      answer: [1],
      explanation: 'Las layers del Animator permiten ejecutar varias máquinas de estado a la vez. La Avatar Mask limita qué huesos afecta cada layer, así que las piernas siguen la layer base (correr) y el torso la layer de disparo.'
    },
    {
      id: 'art-10',
      topic: 'Animación 3D',
      q: 'Con **Apply Root Motion** activado, quieres controlar tú cómo se aplica el movimiento de la animación (por ejemplo, pasarlo a un `CharacterController`). ¿Qué método implementas?',
      options: ['`OnAnimatorIK`', '`OnAnimatorMove`', '`LateUpdate`', '`OnStateExit`'],
      answer: [1],
      explanation: 'Si un script del GameObject implementa `OnAnimatorMove`, Unity deja de aplicar el root motion automáticamente y te deja hacerlo a ti, usando `animator.deltaPosition` y `animator.deltaRotation`. `OnAnimatorIK` sirve para cinemática inversa.'
    },
    {
      id: 'art-11',
      topic: 'Iluminación',
      q: 'La escena usa iluminación **baked**. El personaje (dinámico) se ve plano y no recibe la luz indirecta del entorno. ¿Qué añades?',
      options: [
        'Un Reflection Probe que siga al personaje en todo momento.',
        'Un **Light Probe Group** en las zonas por donde se mueve.',
        'Marcar al personaje como Contribute GI para que reciba lightmaps.',
        'Cambiar la Directional Light a modo Realtime solo para el personaje.'
      ],
      answer: [1],
      explanation: 'Los lightmaps solo se aplican a objetos estáticos. Los Light Probes guardan la iluminación (incluida la indirecta) en puntos del espacio, y los objetos dinámicos la interpolan. Marcar como Static a un objeto que se mueve no tiene sentido.'
    },
    {
      id: 'art-12',
      topic: 'Iluminación',
      q: 'Un objeto metálico dentro de una habitación refleja el skybox en lugar de las paredes. ¿Qué lo soluciona?',
      options: [
        'Un Light Probe Group.',
        'Un **Reflection Probe** que cubra la habitación.',
        'Bajar el Smoothness a 0.',
        'Cambiar la luz a modo Realtime.'
      ],
      answer: [1],
      explanation: 'Sin Reflection Probes, los materiales reflectantes usan el skybox como entorno. Un Reflection Probe captura un cubemap del entorno cercano. Los Light Probes son para la iluminación difusa, no para los reflejos.'
    },
    {
      id: 'art-13',
      topic: 'Iluminación',
      q: '¿Qué **dos** cosas debes asegurar para que una malla reciba lightmaps baked correctamente? (Elige 2)',
      options: [
        'Estar marcada como **Contribute GI** (Static).',
        'Tener UVs para lightmap (por ejemplo, activando **Generate Lightmap UVs** al importarla).',
        'Tener un `Rigidbody` cinemático.',
        'Usar un shader Unlit.'
      ],
      answer: [0, 1],
      explanation: 'El baking de lightmaps solo procesa objetos marcados como Contribute GI, y necesita UVs sin solapamientos. Lo habitual es usar un segundo set (UV1), que Unity puede generar al importar el modelo; si no existe, se usan las UVs principales, que a menudo se solapan y dan artefactos. Un shader Unlit, de hecho, ignora la iluminación.'
    },
    {
      id: 'art-14',
      topic: 'Partículas',
      q: '¿Qué pasa con este código?',
      code: 'ParticleSystem ps = GetComponent<ParticleSystem>();\nps.main.startSpeed = 10f;',
      options: [
        'Funciona y cambia la velocidad inicial de las nuevas partículas.',
        'Error de compilación: `main` es un struct y hay que guardarlo en una variable.',
        'Compila, pero el cambio se pierde hasta que reasignes `ps.main = main`.',
        'Compila, pero solo afecta a las partículas que ya se emitieron.'
      ],
      answer: [1],
      explanation: 'Los módulos (`MainModule`, `EmissionModule`, etc.) son structs que actúan como interfaces al sistema nativo. No puedes modificar una propiedad de un struct devuelto por una propiedad, pero si lo guardas en una variable local, los cambios se aplican directamente al sistema y no hace falta reasignarlo (de hecho, `ps.main` es de solo lectura).'
    },
    {
      id: 'art-15',
      topic: 'Partículas',
      q: 'Quieres emitir 30 partículas **de golpe** cuando un proyectil impacta, con un `ParticleSystem` ya colocado en la escena. ¿Qué llamas?',
      options: ['`ps.Emit(30)`', '`ps.Play(30)`', '`ps.emission.rateOverTime = 30`', 'Instanciar 30 sistemas de partículas'],
      answer: [0],
      explanation: '`Emit(count)` genera ese número de partículas al instante, aunque el sistema no esté reproduciéndose. `Play` no recibe una cantidad, y cambiar `rateOverTime` emite de forma continua (y además daría el mismo error de struct).'
    },
    {
      id: 'art-16',
      topic: 'Partículas',
      q: 'Al apagar un fuego quieres que **deje de emitir**, pero que las partículas que ya existen terminen su vida con naturalidad. ¿Qué usas?',
      options: [
        '`ps.Stop(true, ParticleSystemStopBehavior.StopEmitting)`',
        '`ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear)`',
        '`ps.Clear()`',
        '`Destroy(ps.gameObject)`'
      ],
      answer: [0],
      explanation: '`StopEmitting` detiene la emisión y deja que las partículas vivas terminen. `StopEmittingAndClear` y `Clear` las eliminan al instante, y `Destroy` elimina todo el objeto.'
    },
    {
      id: 'art-17',
      topic: 'Texturas',
      q: 'Las texturas de tu UI 2D siempre se muestran a tamaño fijo en pantalla. ¿Qué ajuste de importación reduce memoria sin perder calidad?',
      options: [
        'Desactivar **Generate Mip Maps**.',
        'Activar **Read/Write Enabled**.',
        'Cambiar el Wrap Mode a Repeat.',
        'Subir el Max Size a 8192.'
      ],
      answer: [0],
      explanation: 'Los mipmaps añaden aproximadamente un 33 % de memoria y solo sirven cuando la textura se ve a distintas distancias (3D). En la UI no se aprovechan e incluso pueden verse borrosos. Read/Write, en cambio, **aumenta** el uso de memoria.'
    },
    {
      id: 'art-18',
      topic: 'Texturas',
      q: '¿Qué efecto tiene activar **Read/Write Enabled** en una textura?',
      options: [
        'Permite que la GPU escriba en la textura más rápido, lo que mejora el rendimiento.',
        'Mantiene una copia en la memoria de la CPU, necesaria para `GetPixels` / `SetPixels`.',
        'Permite editar los píxeles de la textura desde el Inspector del Editor.',
        'Desactiva la compresión para que la textura se pueda leer sin pérdida.'
      ],
      answer: [1],
      explanation: 'Por defecto, al subir la textura a la GPU se libera la copia de la CPU. Read/Write la conserva para que los scripts puedan leer y escribir píxeles, lo que cuesta memoria. Actívalo solo si lo necesitas.'
    },
    {
      id: 'art-19',
      topic: 'Materiales',
      q: 'Por script cambias `_EmissionColor` de un material Standard/Lit a un color brillante, pero el objeto no brilla en la build. ¿Qué falta?',
      code: 'mat.SetColor("_EmissionColor", Color.cyan * 3f);',
      options: [
        'Activar la keyword con `mat.EnableKeyword("_EMISSION")`.',
        'Llamar a `mat.Apply()`.',
        'Añadir una Point Light al objeto.',
        'Usar `sharedMaterial` en lugar de `material`.'
      ],
      answer: [0],
      explanation: 'Los shaders Standard y URP Lit usan la keyword `_EMISSION` para compilar la variante que incluye la emisión. Si el material no la tiene activada, esa variante puede incluso quedar fuera de la build. `Material.Apply()` no existe (solo `Texture2D.Apply()`).'
    },
    {
      id: 'art-20',
      topic: 'Iluminación',
      q: 'En URP quieres que un efecto de Vignette se aplique **solo** cuando el jugador está dentro de una zona concreta. ¿Qué configuras?',
      options: [
        'Un **Volume** en modo **Local** con un collider que delimite la zona.',
        'Un Volume Global con prioridad alta, colocado en el centro de la zona.',
        'Un componente Post-process Layer en la Directional Light de la zona.',
        'Un Reflection Probe en la zona con el efecto Vignette activado.'
      ],
      answer: [0],
      explanation: 'Los Volumes locales usan un collider para definir su área de influencia, y la cámara (con Post Processing activado) mezcla sus overrides según la distancia. Un Volume global afecta a toda la escena. Post-process Layer pertenece al antiguo Post Processing Stack v2 del Built-in.'
    },
    {
      id: 'art-21',
      topic: 'Materiales',
      q: 'En URP de Unity 6 escribes un `ScriptableRendererFeature` propio. ¿Qué método de `ScriptableRenderPass` debes implementar para que funcione con el **Render Graph** (el modo por defecto)?',
      options: [
        '`RecordRenderGraph`',
        '`Execute`',
        '`OnRenderImage`',
        '`Configure`'
      ],
      answer: [0],
      explanation: 'En Unity 6, URP usa el Render Graph por defecto: los passes declaran sus recursos y su trabajo en `RecordRenderGraph(RenderGraph, ContextContainer)`. `Execute` y `Configure` pertenecen a la API anterior y solo funcionan con el modo de compatibilidad. `OnRenderImage` es del Built-in Render Pipeline.'
    }
  ]
});
