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
        'Los 50 enemigos se ponen rojos, porque comparten el material.',
        'Solo ese enemigo se pone rojo, porque Unity le crea una copia del material.',
        'Solo ese enemigo se pone rojo, sin coste extra de memoria.',
        'Lanza una excepción: un material compartido no se modifica en runtime.'
      ],
      answer: [1],
      explanation: 'Al acceder a `.material`, Unity duplica el material la primera vez y se lo asigna solo a ese renderer. Es cómodo, pero cada instancia ocupa memoria, rompe el batching y deberías destruirla (`Destroy`) cuando no la necesites. `.sharedMaterial` modificaría el asset y afectaría a los 50.'
    },
    {
      id: 'art-02',
      topic: 'Materiales',
      q: 'En URP, con el shader **Universal Render Pipeline/Lit**, ¿qué nombre de propiedad usarías con `SetColor` para cambiar el color base?',
      options: ['`_Color`', '`_BaseColor`', '`_MainColor`', '`_AlbedoColor`'],
      answer: [1],
      explanation: 'URP Lit usa `_BaseColor` (y `_BaseMap` para la textura). `_Color` es el nombre del shader Standard del Built-in Render Pipeline. URP marca `_BaseColor` como `[MainColor]`, así que `material.color` también funciona, pero en el examen conviene conocer el nombre real.'
    },
    {
      id: 'art-03',
      topic: 'Materiales',
      q: 'Quieres que cada uno de 500 árboles con el mismo material tenga un tono distinto, **sin crear 500 instancias de material**. ¿Qué usarías?',
      options: [
        '`renderer.material.color` en cada árbol, ya que Unity reutiliza el mismo material.',
        'Un `MaterialPropertyBlock` con `renderer.SetPropertyBlock`.',
        '`renderer.sharedMaterial.color` en cada árbol, justo antes de que se dibuje.',
        'Crear 500 materiales en el proyecto, uno por árbol, con su propio color.'
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
        'Porque `SetFloat` con string está obsoleto en Unity 6 y ya no compila.',
        'Porque evita calcular el hash del string en cada llamada.',
        'Porque permite usar parámetros que no existen en el Animator Controller.',
        'Porque sincroniza automáticamente el parámetro por la red.'
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
        'Activar **Apply Root Motion** en el `Animator` para que reaccione antes.'
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
        'Los triggers se reactivan cada vez que se vuelve al estado por defecto.',
        'El parámetro `Jump` debería ser float para que vuelva a 0 solo.'
      ],
      answer: [1],
      explanation: 'Un trigger es un bool que se pone a `false` automáticamente **cuando una transición lo consume**. Si ninguna transición lo consume, se queda activo y se usará en cuanto haya una transición que lo use. `ResetTrigger` lo limpia.'
    },
    {
      id: 'art-07',
      topic: 'Animación 3D',
      q: 'Quieres reproducir el sonido de un paso justo cuando el pie toca el suelo en la animación de caminar. ¿Cuál es el enfoque más adecuado?',
      options: [
        'Un **Animation Event** en el frame del clip en que el pie toca el suelo, que llame a un método de tu script.',
        'Una corrutina que reproduce el sonido cada 0,5 segundos mientras camina.',
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
        'Tres Animator Controllers que se cambian por código.',
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
        'Creando un estado "CorrerYDisparar" con una animación combinada de ambos clips.',
        'Añadiendo una **layer** con una **Avatar Mask** del tronco superior.',
        'Usando dos componentes `Animator` en el mismo GameObject, uno por mitad del cuerpo.',
        'Activando Root Motion solo en el torso.'
      ],
      answer: [1],
      explanation: 'Las layers del Animator permiten ejecutar varias máquinas de estado a la vez. La Avatar Mask limita qué huesos afecta cada layer, así que las piernas siguen la layer base (correr) y el torso la layer de disparo. Lo habitual es darle a esa layer weight 1 y blending **Override**.'
    },
    {
      id: 'art-10',
      topic: 'Animación 3D',
      q: 'Con **Apply Root Motion** activado, quieres controlar tú cómo se aplica el movimiento de la animación (por ejemplo, pasarlo a un `CharacterController`). ¿Qué método implementas?',
      options: ['`OnAnimatorIK`', '`OnAnimatorMove`', '`LateUpdate`', '`OnStateMachineExit`'],
      answer: [1],
      explanation: 'Si un script del GameObject implementa `OnAnimatorMove`, Unity deja de aplicar el root motion automáticamente y te deja hacerlo a ti, usando `animator.deltaPosition` y `animator.deltaRotation`. `OnAnimatorIK` sirve para cinemática inversa.'
    },
    {
      id: 'art-11',
      topic: 'Iluminación',
      q: 'La escena usa iluminación **baked**. El personaje (dinámico) se ve plano y no recibe la luz indirecta del entorno. ¿Qué añades?',
      options: [
        'Un Reflection Probe que siga al personaje.',
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
        'Un Light Probe Group que cubra toda la habitación.',
        'Un **Reflection Probe** en la habitación.',
        'Bajar el Smoothness a 0.',
        'Cambiar la Directional Light de la habitación a modo Realtime.'
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
        'Tener UVs de lightmap (por ejemplo, con **Generate Lightmap UVs** al importar).',
        'Tener un `Rigidbody` cinemático para que el baking la trate como estática.',
        'Usar un shader Unlit, que guarda la luz horneada en la textura base.'
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
        'Funciona y cambia la velocidad inicial de las partículas que se emitan a partir de ahora.',
        'Error de compilación: `main` es un struct y hay que guardarlo en una variable.',
        'Compila, pero el cambio se pierde hasta que reasignes el módulo con `ps.main = main`.',
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
        'Permite que la GPU escriba en la textura más rápido.',
        'Mantiene una copia en la memoria de la CPU, necesaria para `GetPixels` / `SetPixels`.',
        'Permite editar los píxeles de la textura desde el Inspector del Editor.',
        'Desactiva la compresión para leer la textura sin pérdidas.'
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
        'Llamar a `mat.Apply()` para subir los cambios del material a la GPU.',
        'Añadir una Point Light al objeto.',
        'Usar `sharedMaterial` en lugar de `material` para que el cambio se guarde.'
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
        'Un Reflection Probe con Vignette en la zona.'
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
        '`Execute(ScriptableRenderContext, ref RenderingData)`',
        '`OnRenderImage(RenderTexture src, RenderTexture dest)`',
        '`Configure`'
      ],
      answer: [0],
      explanation: 'En Unity 6, URP usa el Render Graph por defecto: los passes declaran sus recursos y su trabajo en `RecordRenderGraph(RenderGraph, ContextContainer)`. `Execute` y `Configure` pertenecen a la API anterior y solo funcionan con el modo de compatibilidad. `OnRenderImage` es del Built-in Render Pipeline.'
    },
    {
      id: 'art-22',
      topic: 'Texturas',
      q: 'Generas una textura por código y la asignas a un material URP Lit, pero en pantalla no se ve roja. ¿Qué falta?',
      code: 'Texture2D tex = new Texture2D(64, 64);\nColor[] pixels = new Color[64 * 64];\nfor (int i = 0; i < pixels.Length; i++)\n    pixels[i] = Color.red;\n\ntex.SetPixels(pixels);\nGetComponent<Renderer>().material.mainTexture = tex;',
      options: [
        'Llamar a `tex.Apply()` después de `SetPixels` para subir los píxeles nuevos a la GPU.',
        'Activar **Read/Write Enabled** en los ajustes de importación de la textura.',
        'Usar `SetPixels32`, porque `SetPixels` solo funciona en texturas comprimidas.',
        'Usar `sharedMaterial`, porque `material` descarta las texturas creadas en runtime.'
      ],
      answer: [0],
      explanation: '`SetPixels` solo modifica la copia de la textura que está en la memoria de la CPU. `Apply()` sube esos cambios a la GPU (y por defecto recalcula los mipmaps); sin esa llamada, la GPU sigue mostrando el contenido anterior. Una textura creada con `new Texture2D` no tiene ajustes de importación y ya se puede leer y escribir desde script. `SetPixels32` también necesita `Apply()`, y usar `material` o `sharedMaterial` no influye en esto (en URP Lit, `mainTexture` corresponde a `_BaseMap`).'
    },
    {
      id: 'art-23',
      topic: 'Texturas',
      q: 'Tu juego móvil usa texturas de entorno de 4096 px importadas con **Compression: None**, y la memoria de texturas es demasiado alta. ¿Qué **dos** cambios en el importador la reducen? (Elige 2)',
      options: [
        'Usar un formato comprimido como **ASTC** en el override de Android e iOS.',
        'Bajar el **Max Size** de las texturas que nunca se ven de cerca.',
        'Activar **Read/Write Enabled** para que Unity libere la copia de la GPU.',
        'Cambiar el **Filter Mode** a Trilinear para que los mipmaps pesen menos.',
        'Desactivar **sRGB (Color Texture)** en las texturas de albedo del entorno.'
      ],
      answer: [0, 1],
      explanation: 'Una textura RGBA sin comprimir de 4096×4096 ocupa unos 64 MB (un 33 % más con mipmaps). Un formato por bloques como ASTC la reduce varias veces, y bajar el Max Size a 2048 divide la memoria entre cuatro. Read/Write hace lo contrario: **conserva** una copia extra en la CPU. El Filter Mode solo cambia cómo se muestrea la textura, y desactivar sRGB no cambia su tamaño, pero hace que los colores de una textura de albedo se vean mal.'
    },
    {
      id: 'art-24',
      topic: 'Partículas',
      q: 'Este script está en el prefab de una explosión que instancias en cada impacto. ¿Qué ocurre cuando el efecto termina?',
      code: 'void Start()\n{\n    var ps = GetComponent<ParticleSystem>();\n    var main = ps.main;\n    main.loop = false;\n    main.stopAction = ParticleSystemStopAction.Destroy;\n    ps.Play();\n}',
      options: [
        'El GameObject se destruye cuando el sistema se detiene y mueren todas sus partículas.',
        'Solo se destruye el componente `ParticleSystem`, no el GameObject.',
        'Nada: `stopAction` solo se ejecuta si llamas a `ps.Stop()` explícitamente desde código.',
        'Error de compilación: hay que reasignar el módulo con `ps.main = main`.'
      ],
      answer: [0],
      explanation: 'Con `stopAction = Destroy`, Unity destruye el GameObject del sistema cuando este se considera detenido: ha terminado su duración (sin bucle) y ya no quedan partículas vivas. También se aplica si lo paras con `Stop()`, pero no hace falta llamarlo. Es la forma más simple de limpiar efectos de un solo uso sin corrutinas ni `Destroy(go, t)`. El módulo `main` es un struct que actúa como interfaz al sistema nativo, así que no hace falta reasignarlo (y `ps.main` es de solo lectura). Si usas pooling, elige `Disable` o `Callback` (`OnParticleSystemStopped`) en lugar de `Destroy`.'
    },
    {
      id: 'art-25',
      topic: 'Partículas',
      q: 'Un cohete deja una estela de humo con un `ParticleSystem` hijo. Al girar el cohete, toda la estela gira con él, como si estuviera pegada. El script de configuración tiene esta línea. ¿Por cuál la sustituyes?',
      code: 'var main = smokeTrail.main;\nmain.simulationSpace = ParticleSystemSimulationSpace.Local;',
      options: [
        '`main.simulationSpace = ParticleSystemSimulationSpace.World;`',
        '`main.scalingMode = ParticleSystemScalingMode.Hierarchy;`',
        '`main.emitterVelocityMode = ParticleSystemEmitterVelocityMode.Transform;`',
        '`main.cullingMode = ParticleSystemCullingMode.AlwaysSimulate;`'
      ],
      answer: [0],
      explanation: 'En espacio **Local**, las partículas se simulan relativas al transform del sistema, así que se mueven y giran con el cohete. En **World**, cada partícula se queda en la posición del mundo donde se emitió y la estela queda atrás, que es lo que esperas del humo. `scalingMode` controla cómo afecta la escala de la jerarquía, `emitterVelocityMode` decide cómo se calcula la velocidad del emisor (para módulos como Inherit Velocity) y `cullingMode` define qué pasa cuando el sistema sale de pantalla.'
    },
    {
      id: 'art-26',
      topic: 'Partículas',
      q: 'Un botón llama a este método para encender y apagar el humo de una chimenea. ¿Qué **dos** afirmaciones son correctas? (Elige 2)',
      code: 'public ParticleSystem smoke;\n\npublic void ToggleSmoke()\n{\n    if (smoke.isPlaying)\n        smoke.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);\n    else\n        smoke.Play();\n}',
      options: [
        'Al apagarlo, las partículas que ya existían desaparecen al instante.',
        '`Play()` también reproduce los sistemas de partículas hijos, por defecto.',
        'Al apagarlo, las partículas que ya existían terminan su vida con normalidad.',
        '`isPlaying` sigue devolviendo `true` hasta que llames explícitamente a `smoke.Clear()`.',
        'Hay que llamar a `smoke.Clear()` antes de `Play()` o el sistema no volverá a emitir.'
      ],
      answer: [0, 1],
      explanation: '`StopEmittingAndClear` detiene la emisión y elimina las partículas vivas en el momento (con `StopEmitting` terminarían su vida con normalidad). Tanto `Play` como `Stop` tienen `withChildren = true` por defecto, así que también afectan a los sistemas hijos. Después de este `Stop`, que además borra las partículas, `isPlaying` pasa a `false`, y `Play()` vuelve a emitir sin necesidad de llamar antes a `Clear()`.'
    },
    {
      id: 'art-27',
      topic: 'Iluminación',
      q: 'La lámpara del techo de una habitación está en modo **Baked** y la escena tiene los lightmaps generados. Durante el juego se ejecuta este método. ¿Qué ve el jugador?',
      code: 'public Light ceilingLamp;\n\npublic void PowerOutage()\n{\n    ceilingLamp.enabled = false;\n}',
      options: [
        'Nada cambia: su luz ya está guardada en los lightmaps y en los light probes.',
        'La habitación se oscurece y Unity vuelve a hornear los lightmaps en segundo plano.',
        'Lanza una excepción: una luz Baked no se puede desactivar en la build.',
        'La habitación se oscurece, porque desactivar una luz anula su parte de los lightmaps.'
      ],
      answer: [0],
      explanation: 'Una luz en modo **Baked** solo aporta iluminación a través de los datos horneados (lightmaps para los objetos estáticos y light probes para los dinámicos); en runtime no se calcula. Desactivar el componente no modifica esos datos, así que la habitación sigue igual de iluminada. Para poder apagarla, la luz debe ser **Realtime** (o **Mixed**, sabiendo que su parte horneada, como la luz indirecta, también se queda). Unity no vuelve a hornear en runtime, y desactivar el componente no da ningún error.'
    },
    {
      id: 'art-28',
      topic: 'Iluminación',
      q: 'En URP, con el renderer en **Forward**, una sala tiene 20 Point Lights en modo Realtime y algunos objetos grandes no reciben todas las luces cercanas. ¿Qué **dos** cambios lo solucionan? (Elige 2)',
      options: [
        'Cambiar el **Rendering Path** del Universal Renderer a **Forward+**.',
        'Pasar a **Baked** las luces que nunca cambian durante el juego.',
        'Subir el **Pixel Light Count** en Project Settings > Quality.',
        'Activar **Cast Shadows** en todas las Point Lights de la sala.',
        'Subir la **Intensity** y el **Range** de las luces.'
      ],
      answer: [0, 1],
      explanation: 'En el path **Forward**, URP limita cuántas luces adicionales afectan a cada objeto (el límite por objeto del URP Asset, como máximo 8); las que sobran se descartan, y en objetos grandes se nota. **Forward+** (y también Deferred) quita ese límite por objeto. Las luces **Baked** no se calculan en runtime, así que no cuentan para ese límite. **Pixel Light Count** es un ajuste del Built-in Render Pipeline que URP ignora, y activar sombras o subir el rango no reduce el número de luces que tocan cada objeto (el rango, de hecho, lo aumenta).'
    },
    {
      id: 'art-29',
      topic: 'Materiales',
      q: 'Quieres teñir cada enemigo de un color distinto sin crear instancias de material. El shader es **URP Lit**. ¿Qué línea va en `// ???` para que el color se aplique?',
      code: 'static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");\nMaterialPropertyBlock block;\n\nvoid Awake() => block = new MaterialPropertyBlock();\n\npublic void SetTint(Color c)\n{\n    block.SetColor(BaseColorId, c);\n    // ???\n}',
      options: [
        '`GetComponent<Renderer>().SetPropertyBlock(block);`',
        '`GetComponent<Renderer>().GetPropertyBlock(block);`',
        '`GetComponent<Renderer>().sharedMaterial.SetColor(BaseColorId, c);`',
        '`Shader.SetGlobalColor(BaseColorId, c);`'
      ],
      answer: [0],
      explanation: 'Un `MaterialPropertyBlock` no hace nada hasta que lo asignas al renderer con `SetPropertyBlock`, que aplica esos valores solo a ese objeto, sin duplicar el material. `GetPropertyBlock` hace lo contrario: copia en `block` los valores actuales del renderer y sobrescribe el color que acabas de poner. `sharedMaterial.SetColor` cambia el asset y tiñe a todos los enemigos, y `Shader.SetGlobalColor` define un valor global que el material ignora porque tiene su propio `_BaseColor`. Recuerda que en URP el property block hace que ese renderer no sea compatible con el SRP Batcher.'
    },
    {
      id: 'art-30',
      topic: 'Animación 3D',
      q: 'En un Blend Tree de locomoción, el personaje pasa de Walk a Run de golpe cuando cambia `targetSpeed`. Un compañero cambia la llamada por esta versión. ¿Qué hacen los dos últimos argumentos?',
      code: 'static readonly int SpeedId = Animator.StringToHash("Speed");\n\nvoid Update()\n{\n    animator.SetFloat(SpeedId, targetSpeed, 0.1f, Time.deltaTime);\n}',
      options: [
        'Amortiguan el cambio: `Speed` se acerca a `targetSpeed` en unos 0,1 s.',
        'Fijan la duración de la transición del Animator en 0,1 s, ignorando la que tiene configurada.',
        'Limitan el cambio de `Speed` a 0,1 unidades por segundo, escalado por `Time.deltaTime`.',
        'Retrasan 0,1 s la asignación del valor, como si se usara una corrutina con `WaitForSeconds`.'
      ],
      answer: [0],
      explanation: 'La sobrecarga `SetFloat(id, value, dampTime, deltaTime)` no asigna el valor de golpe: en cada llamada mueve el parámetro hacia el objetivo de forma amortiguada, y `dampTime` indica aproximadamente cuánto tarda en llegar. Por eso hay que llamarla **cada frame** y pasarle `Time.deltaTime`. Así el Blend Tree mezcla Walk y Run de forma gradual. No cambia la duración de las transiciones entre estados, ni es un límite fijo de velocidad, ni un retardo.'
    },
    {
      id: 'art-31',
      topic: 'Animación 3D',
      q: 'Quieres que el personaje pase al estado "Die" desde cualquier estado con una mezcla de **0,25 segundos**, sin crear transiciones en el Animator Controller. Con este código, la mezcla dura más o menos según el clip. ¿Por qué?',
      code: 'public void Kill()\n{\n    animator.CrossFade("Die", 0.25f);\n}',
      options: [
        'Porque en `CrossFade` la duración es normalizada; para segundos se usa `CrossFadeInFixedTime`.',
        'Porque `CrossFade` solo usa esa duración si existe una transición hacia "Die" en el controlador.',
        'Porque `CrossFade` mide la duración en frames del clip, así que depende de su sample rate.',
        'Porque `CrossFade` espera al **Exit Time** del estado actual antes de empezar la mezcla.'
      ],
      answer: [0],
      explanation: 'El segundo parámetro de `CrossFade` es `normalizedTransitionDuration`: una fracción de la duración del estado, no segundos, así que el tiempo real cambia con la longitud del clip. `CrossFadeInFixedTime("Die", 0.25f)` usa segundos. Ambos crean la transición al vuelo, sin que tenga que existir en el controlador, y empiezan de inmediato, sin esperar a ningún Exit Time.'
    }
  ]
});
