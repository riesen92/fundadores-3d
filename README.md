# Los Fundadores 2026 · Cancha 3D

Reconstrucción espacial y editor de estrategias por tareas para la competencia bomberil. Vue 3, Vite, TypeScript, Three.js directo y Pinia. Incluye simulación paralela con dependencias, recursos compartidos, animaciones esquemáticas, reglas preventivas y guardado local. Los tiempos de maniobras son provisionales; no se simulan física humana ni hidráulica realista.

> Para modificar o ampliar el proyecto, leer primero [`BASE.md`](BASE.md). Contiene la arquitectura vigente, las fuentes de verdad, reglas de compatibilidad y validaciones que deben conservarse.

## Ejecutar

Requiere Node.js 22.18+ (se verificó con 24.19) y npm.

```powershell
cd 'C:\Users\56996\Desktop\LOS FUNDADORES\fundadores-3d'
npm ci
npm run dev
```

Abrir la dirección local que indica Vite, normalmente http://127.0.0.1:5173.

La aplicación separa sus dos usos:

- `/simulador` es la vista principal de reproducción, sin controles de edición.
- `/editor` contiene la planificación completa.
- `/` cambia la dirección a `/simulador` al cargar.

```powershell
npm run build
npm test
```

Si el entorno corporativo presenta `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, usar los certificados del sistema con `$env:NODE_OPTIONS='--use-system-ca'` antes de npm. No desactivar la verificación TLS.

## Uso

Arrastrar para orbitar, rueda para zoom, botón derecho para desplazar. Los botones cambian entre vista diagonal y cenital; Encuadrar restaura la cámara. En cenital se bloquea la rotación para conservar C arriba, A abajo, B izquierda y D derecha. Las casillas ocultan etiquetas, recorridos de bomberos y cierres solo visualmente. **Recorridos de bomberos** comienza desactivado y, al activarlo, muestra únicamente el recorrido de B1–B8 seleccionado. Ocultar recorridos no afecta mangueras, líneas A/B ni chorros.

En `/simulador`, **Vista general** conserva el encuadre completo desde arriba en cenital. Elegir B1–B8 acerca la cámara y mantiene al bombero seleccionado centrado mientras se mueve, sin impedir orbitar o acercar; en cenital el seguimiento conserva la orientación cenital (C arriba, A abajo). El botón principal cambia entre Simular, Pausar, Continuar y Repetir. **Reiniciar** vuelve el tiempo, los bomberos, los materiales y los blancos al inicio y reproduce de nuevo, conservando la velocidad, la vista y el bombero elegido. El selector de **velocidad** (0,25×, 0,5×, 1×, 2×, 4×) arranca en 1× y puede cambiarse antes, durante o en pausa; no se restablece al Simular o Continuar. Esta vista usa la misma estrategia y los mismos nombres guardados en `/editor`.

GitHub Pages publica con base `/fundadores-3d/`. El flujo de Actions copia `dist/index.html` a `dist/404.html` para que recargar `/fundadores-3d/simulador` o `/fundadores-3d/editor` abra la vista correcta.

## Editor de estrategias por tareas (versión actual)

1. Al abrir se carga únicamente **Secuencia oficial B1–B8**, con las 14 piezas asignadas y todas las tareas configuradas. Pulsa **Simular estrategia** para ver preparación, despliegue, conexiones y rescate.
2. Seleccionar B1–B8 y configurar nombre y velocidad (0,1–10 m/s). Elegir **Sin asignar** para completar tareas sin responsable. La plantilla completa contiene 67 tareas y la plantilla Zona I conserva 17 tareas externas pendientes de asignar.
3. **Añadir tarea** abre categorías, acción, responsable, objetivo de cancha, duración, ayudantes, receptores y dependencias. Los receptores aparecen en las entregas y esperan en el lado elegido del muro o tubo. El orden de la lista es secuencial para cada participante; las maniobras compartidas reservan al equipo y sincronizan el recorrido al ritmo del más lento.
4. Editar, subir, bajar, eliminar o reasignar tareas. Eliminar una tarea conserva la referencia pendiente en sus dependientes, con un aviso para repararla; nunca se elimina silenciosamente un requisito. Las dependencias circulares, incluyendo el orden de cada participante, bloquean las tareas afectadas.
5. **Simular estrategia** inicia todo lo que pueda avanzar. Se muestran tareas en curso, bloqueos concretos, distancias, tiempo bruto, penalizaciones, espera por tarea y registro de finalizaciones. Pausa, velocidades 0,25–4×, reinicio y volver a editar están disponibles. La edición se bloquea durante una ejecución; volver a editar restaura posiciones y recursos.

Cada tarea suma tiempo de traslado calculado y duración de maniobra editable (0–3600 s). Esperar blanco permanece en la posición actual. La espera acumulada de distintas tareas puede superponerse, por lo que no se suma al tiempo bruto. Un bloqueo total detiene la reproducción para permitir corregir la estrategia. Una lista parcial puede completarse sin cumplir aún el cierre de la competencia: se informa expresamente.

**Zona I base** conserva herramientas/apoyo/rescate de B1, gemelo y salida tardía de B2 y pitón/rescate de B3. Agrega tareas editables sin responsable para recibir herramientas, abrir puerta, trasladar camilla, derribar 3–8, recibir y evacuar víctima y obtener banderín. Esos responsables y los ayudantes del rescate externo se eligen en el menú. Ya no hay botones que declaren manualmente camilla o blancos caídos. La entrega de víctima a IV espera al blanco 8, de acuerdo con el bloqueo reglamentario elegido.

**Secuencia completa B1–B8** incorpora 67 tareas configuradas: herramientas B1→B8→B6/B7, entrada forzada, blancos 1–8, relevo de pitón B3→B4, camilla B7→B4/B5→B1/B3, rescate en I, traslado por IV, relevo a B6/B7/B8 en el tubo y evacuación final. B2 permanece en el gemelo hasta el blanco 8; B5 se separa en el tubo, retira el banderín y sale después de los otros siete. La plantilla sigue siendo editable y usa tiempos provisionales.

### Secuencia oficial B1–B8

La aplicación abre directamente **Secuencia oficial B1–B8**, completamente asignada. Por petición del usuario, una actualización única sustituye la lista antigua, conserva los nombres y velocidades seleccionados y respalda el archivo anterior en `fundadores-respaldo-antes-oficial`. El marcador `fundadores-oficial-unica-v1` evita restablecer las ediciones posteriores al recargar. No se muestran selector ni botones para añadir plantillas antiguas. B3/B1 trabajan 1–2, B8/B7 trabajan 3–6 y B5/B4 trabajan 7–8. B6 busca la camilla, B2 se suma al rescate después del corte final y B5 recoge la bandera y sale último.

Utiliza una sola salida A y seis mangueras: M1–M2 al comienzo, M1–M6 para 3–6 y M1–M5 para 7–8. M6/P2 queda hacia el blanco 6; M1–M5/P1 queda en el tendido del blanco 8. M7–M10 y las llaves quedan en IV. La carga de B2 es M8 en una mano y L1/L2 juntas en la otra. Las herramientas TNT/Halligan se reciben individualmente y permanecen junto a la puerta tras su uso.

El editor permite dejar/recoger material, preparar el par de llaves, elegir los acoples 0/1 de cada manguera, conectar antes de recibir agua, despresurizar y relevar un pitón con su manguera o localmente. Todos los responsables, ayudantes, receptores, dependencias y tiempos siguen siendo editables. [Funciones, material, relevos y aclaraciones confirmadas](docs/estrategia-oficial.md).

Las secciones siguientes sobre distribución A/B documentan perfiles históricos conservados en el motor para compatibilidad; sus botones de creación y conversión ya no aparecen en el panel actual.

### Agua detallada, inventario y dos manos

**Agregar preparación de agua** conserva las tareas existentes, activa el modo detallado e inserta al comienzo M1–M10, P1–P2 y L1–L2 sin portador. Cada tarea de preparación recoge una pieza en Zona material y ocupa automáticamente la primera mano libre. El resumen muestra carga inicial, piezas transportadas, manos libres, material ingresado y estado de las líneas A/B. Una tercera pieza, un identificador repetido o cualquiera de las 14 piezas sin responsable impide iniciar.

En la categoría **Agua** se pueden añadir Preparar manguera/pitón/llave, Lanzar, Conectar, Desconectar, Separar línea, Recoger, Reacomodar, Desconectar pitón, Dejar pitón y línea, Abrir y Cortar. Lanzar registra el recorrido desde la posición del bombero hasta un objetivo predefinido y libera esa mano. La conexión se realiza después en el origen del tramo; debe coincidir a menos de 1 m con el gemelo o el extremo anterior.

Una estrategia detallada queda bloqueada hasta asignar las 14 preparaciones y definir para cada línea utilizada al menos un despliegue/conexión, un pitón y una apertura. Solo el gemelero puede abrir o cortar. Debe cortar A antes de abrir B, y cortar B antes de volver a A. Los blancos 1–2 y 7–8 usan A; 3–6 usan B. Un blanco exige continuidad hasta el gemelo, pitón conectado y portado por el pitonero, agua abierta, orden 1–8 y posición correcta. P1 sigue conectado durante B3→B4 y P2 permanece con B8. Las llaves deben entrar, aunque no son requisito de conexión.

Las diez mangueras se dibujan como tramos rojos independientes; las líneas cortadas o abandonadas usan rojo oscuro. Los rollos, pitones y llaves siguen una de las dos manos del portador. Esta representación es esquemática: no calcula longitud, presión, curvas, roce ni roturas, y no exige desplegar las diez mangueras ni usar ambas llaves.

### Tendido acumulativo por blanco

En una estrategia con agua detallada, **Agregar tendidos por blanco** incorpora las maniobras necesarias sin eliminar las tareas existentes. Los lanzamientos, conexiones, desconexiones, recogidas y reacomodos nuevos quedan sin responsable para que el equipo decida quién ejecuta cada uno. La operación es idempotente: pulsarla nuevamente no duplica tareas.

Las plantillas aproximadas se basan en los croquis guardados en [`docs/tendidos/`](docs/tendidos/README.md). Cada lanzamiento dibuja el tramo progresivamente y libera la mano al terminar; una unión oscura marca su acople. Reacomodar interpola la línea existente hacia el blanco siguiente y ubica al responsable y sus ayudantes junto a la maniobra. Una línea cortada continúa visible con menor intensidad.

Distribución: blancos 1–2 usan A con M1–M2; el blanco 3 usa B con M3–M10; el 4 conserva M3–M8; los blancos 5–6 usan M3–M9. Tras el blanco 6, B4 separa antes de M7: B8 deja P2 con M7–M9 en III. B4 conecta P1 a M3–M5 para el blanco 7, añade M6 para el blanco 8 y deja P1 con M3–M6 en el piso. M1–M2 quedan en I sin pitón. Halligan y TNT quedan junto a la puerta. Los tendidos cruzan solamente sobre el muro, dentro del tubo o por la puerta abierta.

Objetivos: ingreso, ambos lados del muro, herramientas, gemelo, blancos 1–8, camilla, víctima, material, ambos lados de tubo/puerta, escala, banderín y salida. Los lugares de recogida siguen la posición actual de los objetos. En una entrega, los emisores llegan a un lado, los receptores al opuesto y solo el recurso atraviesa el paso; el cruce posterior se define como otra tarea. Las rutas de edición son previsiones que asumen requisitos futuros satisfechos; el motor vuelve a calcularlas con el estado real de la puerta. No hay destinos libres en este menú.

El motor exige línea conectada, pitón asignado (máximo dos), gemelero, orden de blancos y posición del pitonero dentro de su zona. Reserva herramientas, camilla y participantes; impide usar una puerta cerrada, abandonar el gemelo antes del blanco 8, entrar con víctima a zonas con blancos pendientes y subir escala antes del blanco 8. La víctima debe cruzar primero; el portador del banderín cruza después de los otros siete. El pitón debe cerrarse antes de salir. Las acciones inválidas se bloquean, por lo que no generan sanciones consumadas y el contador de penalizaciones queda en cero. Las demás sanciones del catálogo siguen como referencia, no como física detectada.

El guardado automático usa la clave histórica `fundadores-estrategias-v1` y el formato interno versión 5, con selección, estrategias, tareas, configuración de B1–B8, modos de agua/tendido/conexiones, pieza y línea. Los archivos versión 1–4 se migran al perfil histórico, conservando sus modos de conexión sin alterar nombres, tareas, dependencias, receptores ni agua. Las ejecuciones se reinician al recargar; las definiciones permanecen. Un archivo inválido se conserva sin sobrescribir y se informa del problema. Un fallo de almacenamiento mantiene los cambios en memoria y muestra error. No hay servidor, sincronización, importación/exportación ni comparación analítica de resultados.

Tipos públicos: `Tarea` separa definición (operación/categoría, objetivo, responsable, ayudantes, receptores, segundos, dependencias y los campos opcionales `materialId`/`linea`) de `EjecucionTarea` (estado, motivo, inicio/fin, espera y progreso). `Estrategia` agrupa tareas, modo de agua y configuración de participantes. `TaskEngine` consume una copia de la estrategia y publica poses, recursos, inventario, líneas, blancos, banderín, estados y eventos. No depende de Vue ni de Three.js. `StrategyVisual` proyecta este estado a la cancha sin lógica de pasos fijos.

## Arquitectura y archivos

- `src/App.vue` y `src/routing.ts`: selección de `/simulador` o `/editor`, con normalización de la ruta principal según la base de Vite.
- `src/views/{SimulatorView,EditorView}.vue`: reproducción pública simplificada e interfaz completa de planificación.
- `src/components/Simulator3D.vue`: montaje y desmontaje, enlace con Pinia y manejo de error de escena.
- `src/components/CameraControls.vue`: selección y restablecimiento de cámara.
- `src/three/core/SceneManager.ts`: cámara, renderer, OrbitControls, luces, resize y liberación de recursos. Se mantienen juntos por compartir el mismo ciclo de vida.
- `src/three/cancha/Cancha.ts`: suelo, zonas, cierres con aberturas, accesos y geometrías de material.
- `src/three/objects/Blanco.ts`: entidad independiente con `derribar()`, `levantar()` y `estaCaido()`. El número usa `numero`; `id` pertenece a Three.js.
- `src/three/primitives.ts`: cajas y etiquetas CanvasTexture/Sprite.
- `src/data/{cancha,elementos,blancos,reglas,eventos}.ts`: parámetros, certeza, catálogo de 15 sanciones y tipos de eventos.
- `src/stores/{simulator,firefighters,strategy}.store.ts`: visualización, participantes, colección de estrategias y reproducción del motor general.
- `src/components/{StrategyPanel,TaskPanel}.vue`: gestión de estrategias y formulario de tareas.
- `src/simulation/{tasks,water,hoseLayouts,baseStrategy,TaskEngine,strategyStorage,routePreview}.ts`: catálogo, inventario de agua, tendidos por blanco, plantillas, motor, persistencia y rutas previstas.
- `src/three/StrategyVisual.ts`: mangueras, chorros, recursos móviles, sujeciones, banderín y rutas de tareas.
- `tests/config.test.ts`: contención de pasos en cierres, distribución y catálogo de sanciones.
- `tests/browser-check.js`: prueba visual e interactiva ejecutable con `playwright-cli -s=fundadores run-code --filename=fundadores-3d/tests/browser-check.js` desde la carpeta padre, con servidor y sesión abiertos.

No se crean managers ni componentes vacíos para fases futuras.

## Escala y coordenadas

1 unidad Three.js = 1 metro. X es ancho, Y altura y Z profundidad. Centro (0,0,0). Cancha X/Z entre −25 y +25. C: Z −25; A: Z +25; B: X −25; D: X +25. I: X−/Z−; II: X−/Z+; III: X+/Z+; IV: X+/Z−.

## Medidas confirmadas por el documento proporcionado

Cancha 50 × 50 m, ingreso/salida 4 m, muro 1,33 m alto × 2 m ancho, escala 6 m, ocho blancos (dos por zona). Diez mangueras de 50 mm, dos pitones y dos llaves Storz; alimentación de 72 mm, gemelo 70 × 50 mm y presión de referencia 8 bar con gemelo cerrado. No se verificó un reglamento externo.

## Aproximaciones y cómo modificarlas

Las posiciones y direcciones se ajustaron al croquis aportado por el usuario (docs/croquis-referencia.png). Las coordenadas se estiman sobre una cancha de 50 × 50 m; no son cotas oficiales. Las flechas naranjas reproducen la dirección del dibujo. `PosicionCancha` conserva fuente, confirmación y observación. Editar `src/data/cancha.ts` para cierres y pasos; `elementos.ts` para posiciones y tamaños de material; `blancos.ts` para posiciones, orientación y representación de discos.

- Ingreso D en Z −19; salida A en X −12,5; muro en Z −12,5; tubo X 12,5; puerta Z 12,5.
- Cierres: altura visual 2,5 y espesor 0,18 m. Son conceptualmente infranqueables y no se permite inferir saltos de su apariencia.
- Muro: espesor visual 0,30 m no oficial.
- Tubo: diámetro 1,8 m, largo 3 m y espesor de borde 0,12 m provisionales; la carcasa es una superficie abierta con aros visuales.
- Puerta: 2,4 × 2,2 m, pasillo de 5 m, dimensiones provisionales. Candado simplificado.
- Zonas material e inicio: 10 × 6 y 9 × 6 m, fuera de A junto a III.
- Escala: altura confirmada; ancho visual 0,9 m y separación de peldaños 0,3 m provisionales.
- Blancos: postes de 1,8 m y discos de radio 0,5 m, tamaños provisionales y orientaciones tomadas del croquis.
- Bomba, gemelo, víctima, camilla, herramientas, material y detalles se representan con geometrías simples sin dimensiones oficiales. Su posición se centraliza; los detalles de modelado no son medidas de competencia.
- El tramo de alimentación atraviesa el cierre hacia el gemelo únicamente como representación del suministro; no es un paso peatonal.

## Alcance y próximos hitos

Se representan las entidades de cancha y las tareas de los ocho participantes. El motor comprueba requisitos operativos y anima recursos sin física realista. Ocultar cierres no habilita pasos. Quedan fuera las colisiones entre personas/material, el cálculo físico de mangueras, sanciones por accidentes físicos y la comparación analítica de estrategias. Guardar, duplicar y reproducir alternativas ya está disponible.

## Validación

`npm run build`: compilación y TypeScript. Vite avisa de un bundle mayor de 500 kB por Three.js; es advertencia de tamaño, no fallo. `npm test`: 31 pruebas de geometría, motor, orden, dependencias, concurrencia, recursos, relevos, rescate, agua detallada, plantillas 1–8, abandono y migración de almacenamiento. `tests/official-browser.js` verifica inicio oficial, sustitución de duplicados con respaldo, nombres, velocidades, acoples, manos agrupadas, persistencia y final completo. Los siguientes scripts documentan la interfaz histórica y requieren adaptarse al panel único antes de ejecutarse: `tests/strategy-browser.js` verifica el editor original; `tests/relays-browser.js` recorre la secuencia de 67 tareas; `tests/water-browser.js` comprueba inventario y alternancia A/B; `tests/routes-visibility-browser.js` verifica los recorridos; `tests/hose-layouts-browser.js` cubre inserción, lanzamiento progresivo, reinicio, secuencia 1–8, abandono de P1/P2, herramientas y móvil. Usan contextos aislados y no modifican las estrategias del usuario. Capturas: `qa-estrategias.png`, `qa-relevo-tubo.png`, `qa-agua-detallada.png` y `qa-tendidos-blanco-8.png`.

El proyecto se creó manualmente con la configuración equivalente a Vue/TypeScript de Vite porque la descarga inicial de create-vite falló por el certificado. Las dependencias se instalaron correctamente utilizando certificados del sistema.

## Corrección según croquis

Blancos (X, Z), en metros aproximados: 1 (−21, −3,5); 2 (−4, −20,5); 3 (−4, 4); 4 (−4, 20); 5 (4, 20); 6 (3,5, 4); 7 (3,5, −4); 8 (21, −4). Direcciones: 1–2 hacia C, 3–4 hacia D, 5–7 hacia B y 8 hacia B/C. Víctima (−22, −20,5); herramientas (−3,5, −3); escala (12, −20). Material e inicio quedan contiguos fuera de A, bajo Zona III. Se conservan las medidas reglamentarias aunque el dibujo represente las aberturas con anchos esquemáticos.


## Histórico: Fase 2 · Editor de rutas (sustituido por tareas)

Seleccionar B1–B8, asignar rol libre y velocidad entre 0,1 y 10 m/s (4 m/s es un valor inicial editable, no oficial). Activar Dibujar ruta y hacer clic en el suelo; arrastrar conserva el control de cámara. También se pueden ingresar coordenadas X/Z o destinos rápidos. Cada destino se puede editar, reordenar o eliminar; solo se modifica el bombero seleccionado. Se dibujan las rutas de todos y se destaca la seleccionada.

`src/simulation/routes.ts` calcula el camino más corto dentro de un grafo de puntos de paso mediante Dijkstra. Rechaza intersecciones con cierres, reserva margen en aberturas y respeta entrada por D y salida por A. El tubo y el muro son transitables a efectos de planificación; la puerta presupone entrada forzada futura. No modela colisiones entre bomberos ni con material, ni garantiza una trayectoria óptima continua fuera del grafo. Los puntos de destino se conectan mediante desvíos automáticos.

`FirefighterPanel.vue` controla la edición; `Firefighters.ts` representa participantes y rutas; `SceneManager` proyecta clics al suelo y libera listeners/recursos. El store conserva posiciones iniciales, destinos, ruta, roles, velocidades, estado y distancia recorrida (0 hasta Fase 3). Distancia planificada y tiempo estimado se calculan por separado. El tiempo es distancia/velocidad: no incluye operaciones ni maniobras. Las rutas y roles están en memoria y se pierden al recargar; guardar y comparar estrategias queda para su fase correspondiente.

Verificación Fase 2: tres pruebas de datos y navegación mediante `npm test`; compilación TypeScript/Vite; `tests/phase2-browser.js` verifica roles, velocidades, independencia de rutas, reordenación, borrado, clics, móvil y consola. Captura: `qa-fase2.png`.

## Histórico: simulación guiada de Zona I (sustituida por Zona I base editable)

El botón «Reproducir secuencia Zona I» carga la coreografía solicitada para B1–B3, independiente de las rutas manuales: B1 obtiene y entrega herramientas por el muro, apoya la manguera y rescata con B3; B2 permanece en el gemelo; B3 derriba 1 y 2 y participa del rescate. Ambos reciben camilla, trasladan, cargan, aseguran y entregan la víctima por el muro a Zona IV. B1/B3 salen; B2 espera la caída del blanco 8, cruza muro, tubo, puerta y salida. Se asume la puerta abierta por el equipo externo.

Hay pausa, reinicio, velocidades 0,25–4×, cronómetro bruto, lista de pasos, acciones por bombero y enfoque de cámara en Zona I. Los movimientos conservan la escala espacial e incorporan elevación al cruzar el muro y postura reducida dentro del tubo. Las herramientas, camilla, víctima, sujeciones, línea de manguera y chorro son representaciones esquemáticas. Las maniobras duran 3–5 segundos provisionales, configurables en `PASOS` de `src/simulation/ZoneOne.ts`. No se trata de tiempos medidos ni hidráulica validada.

B4–B8 no tienen tareas inventadas. Un marcador de entrega/recepción representa al equipo externo de Zona IV. «Entregar camilla desde Zona IV» habilita el rescate cuando B1/B3 están preparados; el traslado externo se omite. «Confirmar blancos 3–8 caídos» declara que la secuencia externa se completó en orden, y libera al gemelero al finalizar la entrega de víctima. El reloj continúa durante las esperas externas, salvo pausa manual.

Si la víctima se transfiere a Zona IV antes de confirmar blancos caídos, se conserva un aviso de +120 s conforme al catálogo proporcionado; no se suma automáticamente al cronómetro bruto. Esto permite observar la cinemática solicitada y su conflicto con la regla de ingreso de víctima a zona con blancos pendientes. La secuencia termina al salir B2, no al terminar toda la competencia. Falta definir las tareas de los otros cinco participantes para automatizar esos eventos.

Los nombres de los ocho bomberos se editan en «Nombre de B…» y se guardan localmente con la clave `fundadores-nombres`; se mantienen al recargar. Se conserva el identificador B1–B8 para distinguirlo del nombre personal. Las rutas manuales siguen siendo temporales. Durante reproducción el editor de rutas queda deshabilitado; «Volver al editor» restaura las posiciones y objetos iniciales.

Archivos: `ZoneOne.ts` (motor y pasos), `zoneOne.store.ts` (control), `ZoneOnePanel.vue` (interfaz) y `ZoneOneVisual.ts` (representación). Cuatro pruebas con `npm test`, incluyendo bloqueos por camilla/blanco 8 y salida tardía de B2; `tests/zone1-browser.js` comprueba nombres persistentes, pausa, eventos, rescate, salida, reinicio y móvil.


### Mangueras y pitón: representación coordinada

Las mangueras y los rollos son rojos; las líneas cortadas o abandonadas permanecen visibles en rojo oscuro. Los dos extremos tienen acoples negros y las uniones coincidentes se dibujan una vez. La holgura visual conserva los extremos y los portales: no suavizar a través de cierres. No se calcula física ni longitud real.

`TaskEngine.agarre()` centraliza la posición de las manos, incluida la postura dentro del tubo. El pitón portado sigue esa posición, y `trazadoVisual()` enlaza la manguera conectada con él mediante pasos válidos. En el reacomodo, el pitonero conduce el extremo y cada ayudante avanza detrás sobre la curva, a intervalos de 1,2 m, sin regresar a acoples anteriores. La formación se conserva al comenzar el derribo del blanco. El relevo comienza y termina en las manos de los participantes; el chorro nace en la punta del pitón. Al abandonar el equipo, permanece en el extremo de su manguera.

Esta mejora mantiene el formato 5 y las tareas guardadas; no recrear la estrategia para actualizar su aspecto. La prueba del navegador guarda `qa-mangueras-inicial.png` para revisión visual.
