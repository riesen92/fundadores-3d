# Los Fundadores 2026 · Cancha 3D

Primer hito: reconstrucción espacial interactiva de la competencia bomberil, basada en el documento maestro adjunto. Vue 3, Vite, TypeScript, Three.js directo y Pinia. No incorpora aún cronómetro, navegación de bomberos, física ni validación de acciones.

## Ejecutar

Requiere Node.js 22.18+ (se verificó con 24.19) y npm.

```powershell
cd 'C:\Users\56996\Desktop\LOS FUNDADORES\fundadores-3d'
npm ci
npm run dev
```

Abrir la dirección local que indica Vite, normalmente http://127.0.0.1:5173.

```powershell
npm run build
npm test
```

Si el entorno corporativo presenta `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, usar los certificados del sistema con `$env:NODE_OPTIONS='--use-system-ca'` antes de npm. No desactivar la verificación TLS.

## Uso

Arrastrar para orbitar, rueda para zoom, botón derecho para desplazar. Los botones cambian entre vista diagonal y cenital; Encuadrar restaura la cámara. En cenital se bloquea la rotación para conservar C arriba, A abajo, B izquierda y D derecha. Las casillas ocultan etiquetas y cierres solo visualmente.

## Arquitectura y archivos

- `src/App.vue`: interfaz, información, catálogo de sanciones y estado de las próximas fases.
- `src/components/Simulator3D.vue`: montaje y desmontaje, enlace con Pinia y manejo de error de escena.
- `src/components/CameraControls.vue`: selección y restablecimiento de cámara.
- `src/three/core/SceneManager.ts`: cámara, renderer, OrbitControls, luces, resize y liberación de recursos. Se mantienen juntos por compartir el mismo ciclo de vida.
- `src/three/cancha/Cancha.ts`: suelo, zonas, cierres con aberturas, accesos y geometrías de material.
- `src/three/objects/Blanco.ts`: entidad independiente con `derribar()`, `levantar()` y `estaCaido()`. El número usa `numero`; `id` pertenece a Three.js.
- `src/three/primitives.ts`: cajas y etiquetas CanvasTexture/Sprite.
- `src/data/{cancha,elementos,blancos,reglas,eventos}.ts`: parámetros, certeza, catálogo de 15 sanciones y tipos de eventos.
- `src/stores/{simulator,firefighters,strategy}.store.ts`: estado de visualización y modelos para bomberos y estrategias. Los últimos dos comienzan vacíos, sin roles automáticos.
- `tests/config.test.ts`: contención de pasos en cierres, distribución y catálogo de sanciones.
- `tests/browser-check.js`: prueba visual e interactiva ejecutable con `playwright-cli -s=fundadores run-code --filename=fundadores-3d/tests/browser-check.js` desde la carpeta padre, con servidor y sesión abiertos.

No se crean managers ni componentes vacíos para fases futuras.

## Escala y coordenadas

1 unidad Three.js = 1 metro. X es ancho, Y altura y Z profundidad. Centro (0,0,0). Cancha X/Z entre −25 y +25. C: Z −25; A: Z +25; B: X −25; D: X +25. I: X−/Z−; II: X−/Z+; III: X+/Z+; IV: X+/Z−.

## Medidas confirmadas por el documento proporcionado

Cancha 50 × 50 m, ingreso/salida 4 m, muro 1,33 m alto × 2 m ancho, escala 6 m, ocho blancos (dos por zona). Diez mangueras de 50 mm, dos pitones y dos llaves Storz; alimentación de 72 mm, gemelo 70 × 50 mm y presión de referencia 8 bar con gemelo cerrado. No se verificó un reglamento externo.

## Aproximaciones y cómo modificarlas

No se adjuntó el croquis. Ninguna orientación o posición aproximada debe interpretarse como verificada. `PosicionCancha` conserva fuente, confirmación y observación. Editar `src/data/cancha.ts` para cierres y pasos; `elementos.ts` para posiciones y tamaños de material; `blancos.ts` para posiciones, orientación y representación de discos.

- Ingreso D en Z −19; salida A en X −12,5; muro en Z −12,5; tubo X 12,5; puerta Z 12,5.
- Cierres: altura visual 2,5 y espesor 0,18 m. Son conceptualmente infranqueables y no se permite inferir saltos de su apariencia.
- Muro: espesor visual 0,30 m no oficial.
- Tubo: diámetro 1,8 m, largo 3 m y espesor de borde 0,12 m provisionales; la carcasa es una superficie abierta con aros visuales.
- Puerta: 2,4 × 2,2 m, pasillo de 5 m, dimensiones provisionales. Candado simplificado.
- Zonas material e inicio: 10 × 6 y 9 × 6 m, fuera de A junto a III.
- Escala: altura confirmada; ancho visual 0,9 m y separación de peldaños 0,3 m provisionales.
- Blancos: postes de 1,8 m y discos de radio 0,5 m, tamaños y orientaciones provisionales.
- Bomba, gemelo, víctima, camilla, herramientas, material y detalles se representan con geometrías simples sin dimensiones oficiales. Su posición se centraliza; los detalles de modelado no son medidas de competencia.
- El tramo de alimentación atraviesa el cierre hacia el gemelo únicamente como representación del suministro; no es un paso peatonal.

## Alcance y próximos hitos

Se representan todas las entidades de la Fase 1. La navegación de cámara no valida recorridos. Ocultar cierres no habilita pasos. Las reglas están almacenadas como datos y todavía no se ejecutan. La Fase 2 deberá agregar ocho bomberos independientes, roles editables, rutas por pasos autorizados, velocidades y distancias. Después: tiempo/eventos, agua, rescate, escala/banderín, penalizaciones y comparación de estrategias.

## Validación

`npm run build`: compilación y TypeScript correctos. Vite avisa de un bundle mayor de 500 kB por Three.js; es advertencia de tamaño, no fallo. `npm test`: dos pruebas correctas. Verificación de navegador: escena, órbita, vistas, casillas y adaptación móvil; capturas `qa-3d.png`, `qa-cenital.png`, `qa-mobile.png`.

El proyecto se creó manualmente con la configuración equivalente a Vue/TypeScript de Vite porque la descarga inicial de create-vite falló por el certificado. Las dependencias se instalaron correctamente utilizando certificados del sistema.
