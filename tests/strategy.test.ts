import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TaskEngine } from '../src/simulation/TaskEngine.ts'
import { zonaIBase, secuenciaCompleta, configuracionInicial } from '../src/simulation/baseStrategy.ts'
import { equipo, nuevaTarea, validarCargaAgua, validarTareas, ladosEntrega } from '../src/simulation/tasks.ts'
import type { Estrategia, Tarea } from '../src/simulation/tasks.ts'
import { MATERIAL_AGUA } from '../src/simulation/water.ts'
import { leerArchivo } from '../src/simulation/strategyStorage.ts'
import { segmentoValido } from '../src/simulation/routes.ts'
import { TENDIDOS_POR_BLANCO, trazadoParcial, validarTrazadoManguera } from '../src/simulation/hoseLayouts.ts'
import { createPinia, setActivePinia } from 'pinia'
import { useStrategyStore } from '../src/stores/strategy.store.ts'
const plan = (tareas: Tarea[]): Estrategia => ({ id: 'test', nombre: 'Test', tareas, bomberos: configuracionInicial() })
const run = (engine: TaskEngine) => { for (let i = 0; i < 5000 && !engine.finalizada && !engine.bloqueada; i++) engine.tick(0.5); return engine }
function completo() {
  const s = zonaIBase()
  const assignments: Record<string, number> = { 'recibir-herramientas': 4, puerta: 4, 'obtener-camilla': 5, 'camilla-i': 5, 'piton-externo': 6, 'cerrar-externo': 6, 'recibir-victima': 4, 'victima-meta': 4, subir: 7, banderin: 7, bajar: 7 }
  s.tareas.forEach(t => { if (t.bombero === null) t.bombero = assignments[t.id] ?? (t.operacion === 'derribar' ? 6 : null); if (['recibir-victima', 'victima-meta'].includes(t.id)) t.ayudantes = [5] })
  return s
}
function aguaDetallada() {
  const s: Estrategia = { id: 'agua', nombre: 'Agua detallada', modoAgua: 'detallado', tareas: [], bomberos: configuracionInicial() }
  const holders = [1, 2, 3, 4, 5, 6, 7, 8, 3, 4, 1, 7, 5, 6]
  const add = (op: Parameters<typeof nuevaTarea>[0], firefighter: number | null, id: string, options: Partial<Tarea> = {}) => s.tareas.push({ ...nuevaTarea(op, firefighter, id), ...options })
  MATERIAL_AGUA.forEach((materialId, i) => add(materialId.startsWith('M') ? 'prepararManguera' : materialId.startsWith('P') ? 'prepararPiton' : 'prepararLlave', holders[i]!, `prep-${materialId}`, { materialId }))
  for (let b = 1; b <= 8; b++) add('mover', b, `ingreso-${b}`, { objetivo: 'ingreso' })
  add('mover', 1, 'b1-gemelo', { objetivo: 'gemelo' })
  add('lanzarManguera', 1, 'lanzar-m1', { materialId: 'M1', objetivo: 'blanco-1' })
  add('mover', 2, 'b2-gemelo-1', { objetivo: 'gemelo' })
  add('lanzarManguera', 2, 'lanzar-m2', { materialId: 'M2', objetivo: 'blanco-2' })
  add('mover', 2, 'b2-gemelo-2', { objetivo: 'gemelo' })
  add('operarGemelo', 2, 'gemelero')
  add('conectarManguera', 8, 'conectar-m1', { materialId: 'M1', linea: 'A', dependencias: ['lanzar-m1'] })
  add('conectarManguera', 8, 'conectar-m2', { materialId: 'M2', linea: 'B', dependencias: ['lanzar-m2'] })
  add('conectarPiton', 1, 'conectar-p1', { materialId: 'P1', linea: 'A', dependencias: ['conectar-m1'] })
  add('conectarPiton', 7, 'conectar-p2', { materialId: 'P2', linea: 'B', dependencias: ['conectar-m2'] })
  add('abrirLinea', 2, 'abrir-a', { linea: 'A', dependencias: ['gemelero', 'conectar-p1'] })
  add('derribar', 1, 'agua-blanco-1', { objetivo: 'blanco-1', linea: 'A', dependencias: ['abrir-a'] })
  add('cerrarPiton', 1, 'cerrar-p1', { linea: 'A' })
  add('cortarLinea', 2, 'cortar-a', { linea: 'A', dependencias: ['cerrar-p1'] })
  add('abrirLinea', 2, 'abrir-b', { linea: 'B', dependencias: ['cortar-a', 'conectar-p2'] })
  add('derribar', 7, 'agua-blanco-2', { objetivo: 'blanco-2', linea: 'B', dependencias: ['abrir-b'] })
  add('cerrarPiton', 7, 'cerrar-p2', { linea: 'B' })
  add('cortarLinea', 2, 'cortar-b', { linea: 'B', dependencias: ['cerrar-p2'] })
  return s
}
test('Dos bomberos avanzan en paralelo; dependencias y orden reservan participantes', () => {
  const a = { ...nuevaTarea('mover', 1, 'a'), objetivo: 'material', duracion: 2 }
  const b = { ...nuevaTarea('mover', 2, 'b'), objetivo: 'material', duracion: 2 }
  const c = { ...nuevaTarea('mover', 1, 'c'), objetivo: 'ingreso', dependencias: ['b'] }
  const e = new TaskEngine(plan([a, b, c])); assert.equal(e.activas.size, 2); assert.equal(e.estados.c!.estado, 'bloqueada'); run(e)
  assert.ok(e.finalizada); assert.ok(e.estados.c!.inicio! >= e.estados.b!.fin!); assert.ok(e.estados.c!.inicio! >= e.estados.a!.fin!)
})
test('Detecta ciclos, referencias eliminadas y respeta ayudantes ocupados', () => {
  const a = { ...nuevaTarea('mover', 1, 'a'), ayudantes: [2], dependencias: ['b'] }
  const b = nuevaTarea('mover', 2, 'b')
  assert.match(validarTareas([a, b]).a!, /circular/)
  assert.match(validarTareas([a]).a!, /eliminada/)
  a.dependencias = []; const e = new TaskEngine(plan([a, b])); assert.equal(e.activas.size, 1); assert.equal(e.estados.b!.estado, 'bloqueada')
})
test('Zona I base conserva tareas externas sin inventar asignaciones', () => {
  const s = zonaIBase(); assert.equal(Object.keys(validarTareas(s.tareas)).length, 0)
  assert.ok(s.tareas.some(t => t.bombero === null))
  const e = run(new TaskEngine(s)); assert.ok(e.bloqueada); assert.ok(e.blancos.has(1) && e.blancos.has(2)); assert.equal(e.blancos.has(8), false)
  assert.equal(e.gemelero, 2); assert.ok(e.poses[2]!.x < 0)
})
test('Plan asignado completa herramientas, agua, rescate, escala y ocho salidas', () => {
  const s = completo(); assert.deepEqual(validarTareas(s.tareas), {})
  const e = run(new TaskEngine(s))
  assert.ok(e.finalizada, JSON.stringify(Object.entries(e.estados).filter(([, s]) => s.estado !== 'completada')))
  assert.ok(e.resultadoValido); assert.equal(e.blancos.size, 8); assert.equal(e.banderin, 7); assert.equal(e.salidos.size, 8)
  assert.equal(e.eventos.at(-1)!.tarea, 'meta-7'); assert.ok(e.asegurada); assert.ok(e.victimaMeta); assert.equal(e.penalizaciones, 0)
  assert.ok(e.estados['salir-i-2']!.inicio! >= e.estados['salir-i-1']!.fin!)
  assert.ok(e.estados['salir-i-2']!.inicio! >= e.estados['salir-i-3']!.fin!)
  assert.ok(e.estados['entrega-victima']!.inicio! >= e.estados['blanco-8']!.fin!)
})
test('Puerta cerrada, blancos sin pitón y escala anticipada quedan bloqueados', () => {
  assert.equal(segmentoValido({ x: -3, z: 12.5 }, { x: 3, z: 12.5 }, false), false)
  const e = new TaskEngine(plan([nuevaTarea('subirEscala', 1, 'a'), nuevaTarea('derribar', 2, 'b')]))
  assert.ok(e.bloqueada); assert.match(e.estados.a!.motivo, /blanco 8/); assert.match(e.estados.b!.motivo, /línea/)
})
test('Archivo local conserva tareas, nombres y velocidades, y rechaza formatos ajenos', () => {
  const s = completo(); s.bomberos[1] = { nombre: 'Carlos', velocidad: 3.2 }
  const data = { version: 1 as const, seleccionada: s.id, estrategias: [s] }
  const migrated = leerArchivo(JSON.stringify(data)); assert.equal(migrated.version, 5); assert.equal(migrated.estrategias[0]!.modoAgua, 'resumido'); assert.equal(migrated.estrategias[0]!.modoTendido, 'libre'); assert.equal(migrated.estrategias[0]!.modoConexiones, 'simple')
  assert.throws(() => leerArchivo('{"version":5,"estrategias":[]}'))
  s.bomberos[1]!.velocidad = 0; assert.throws(() => leerArchivo(JSON.stringify(data)))
})
test('Reserva los dos pitones y evita recoger el mismo material simultáneamente', () => {
  const nozzles = new TaskEngine(plan([1, 2, 3].map(id => nuevaTarea('asignarPiton', id, `n${id}`))))
  assert.equal(nozzles.activas.size, 2); assert.match(nozzles.estados.n3!.motivo, /reservados/)
  run(nozzles); assert.equal(nozzles.pitones.size, 2)
  const tools = new TaskEngine(plan([1, 2].map(id => nuevaTarea('recogerHerramientas', id, `t${id}`))))
  assert.equal(tools.activas.size, 1); assert.match(tools.estados.t2!.motivo, /reservadas/)
})
test('Una entrega prematura de víctima espera al blanco 8 aunque falte dependencia explícita', () => {
  const s = completo()
  s.tareas.find(t => t.id === 'entrega-victima')!.dependencias = []
  s.tareas.find(t => t.id === 'blanco-8')!.duracion = 300
  const e = new TaskEngine(s); let blocked = false
  for (let i = 0; i < 3000 && !e.finalizada && !e.bloqueada; i++) {
    e.tick(0.2)
    if (/Víctima bloqueada/.test(e.estados['entrega-victima']!.motivo)) { blocked = true; assert.equal(e.blancos.has(8), false); assert.ok(e.victima.x < 0) }
  }
  assert.ok(blocked); assert.ok(e.finalizada); assert.ok(e.estados['entrega-victima']!.inicio! >= e.estados['blanco-8']!.fin!)
})

test('Secuencia completa: relevos en lados opuestos, roles sucesivos y B5 último', () => {
  const s = secuenciaCompleta(), e = new TaskEngine(s)
  assert.deepEqual(validarTareas(s.tareas), {}); assert.equal(s.tareas.filter(t => t.bombero === null).length, 0)
  assert.equal(e.activas.size, 8)
  const entregas = new Set<string>(), close = (a: number, b: number) => Math.abs(a - b) < 1.1
  for (let i = 0; i < 30000 && !e.finalizada && !e.bloqueada; i++) {
    const before = structuredClone(e.poses); e.tick(0.05)
    const busy = [...e.activas.values()].flatMap(a => equipo(a.tarea)); assert.equal(new Set(busy).size, busy.length)
    assert.ok(e.pitones.size <= 2)
    for (let b = 1; b <= 8; b++) {
      assert.ok(segmentoValido(before[b]!, e.poses[b]!, e.puertaAbierta), `B${b} atraviesa cierre`)
      assert.ok(Math.hypot(e.poses[b]!.x - before[b]!.x, e.poses[b]!.y - before[b]!.y, e.poses[b]!.z - before[b]!.z) <= s.bomberos[b]!.velocidad * 0.05 + 0.01, `B${b} salta de posición en ${e.tiempo}`)
    }
    if (e.gemelero === 2 && !e.blancos.has(8)) assert.ok(e.poses[2]!.x < 0)
    for (const a of e.activas.values()) if (a.entrega && a.elapsed >= a.traslado) {
      entregas.add(a.tarea.id); const { origen, destino, tubo } = ladosEntrega(a.tarea), axis = tubo ? 'z' : 'x'
      for (const b of [a.tarea.bombero!, ...a.tarea.ayudantes]) { assert.ok(close(e.poses[b]![axis], origen[axis]), `${a.tarea.id}: emisor B${b} cruza`); assert.ok(Math.hypot(e.poses[b]!.x - origen.x, e.poses[b]!.z - origen.z) < 1.1, `${a.tarea.id}: emisor B${b} no llega al paso`) }
      for (const b of a.tarea.receptores ?? []) { assert.ok(close(e.poses[b]![axis], destino[axis]), `${a.tarea.id}: receptor B${b} cruza`); assert.ok(Math.hypot(e.poses[b]!.x - destino.x, e.poses[b]!.z - destino.z) < 1.1, `${a.tarea.id}: receptor B${b} no llega al paso`) }
    }
  }
  assert.ok(e.finalizada, JSON.stringify(e.estados)); assert.ok(e.resultadoValido)
  assert.equal(entregas.size, 7); assert.equal(e.banderin, 5); assert.equal(e.eventos.at(-1)!.tarea, 'meta-5')
  assert.deepEqual(e.eventos.filter(e => e.tarea.startsWith('blanco-')).map(e => e.tarea), Array.from({ length: 8 }, (_, i) => `blanco-${i + 1}`))
  assert.ok(e.estados['victima-entrega-muro']!.inicio! >= e.estados['salir-i-1']!.fin!)
  assert.ok(e.estados['salir-i-2']!.inicio! >= e.estados['salir-i-3']!.fin!)
  assert.ok(e.estados['salir-i-2']!.inicio! >= e.estados['blanco-8']!.fin!)
  assert.ok(e.estados.subir!.inicio! >= e.estados['victima-tubo']!.fin!)
  assert.ok(e.estados.subir!.inicio! < e.estados['victima-entrega-tubo']!.fin!)
  assert.ok(e.estados['victima-meta']!.inicio! >= e.estados['cruce-1']!.fin!)
})

test('Recepción demorada y velocidades distintas no bloquean el trabajo previo del receptor', () => {
  const s = secuenciaCompleta(); s.bomberos[7]!.velocidad = 1.1; s.bomberos[1]!.velocidad = 2.2
  s.tareas.find(t => t.id === 'entrada-8')!.duracion = 45
  s.tareas.find(t => t.id === 'camilla-tubo')!.duracion = 12
  const e = run(new TaskEngine(s)); assert.ok(e.finalizada); assert.ok(e.resultadoValido)
  assert.ok(e.estados['herramientas-muro']!.inicio! >= e.estados['entrada-8']!.fin!)
  assert.ok(e.estados['camilla-tubo']!.inicio! >= e.estados['piton-iv']!.fin!)
  assert.ok(e.estados['victima-meta']!.inicio! >= e.estados['cruce-1']!.fin!)
})

test('Receptores participan en el orden, ciclos y validación del pitón', () => {
  const a = { ...nuevaTarea('entregarHerramientas', 1, 'a'), receptores: [8], dependencias: ['b'] }
  const b = nuevaTarea('mover', 8, 'b')
  assert.match(validarTareas([a, b]).a!, /circular/)
  a.dependencias = []; a.receptores = [1]; assert.match(validarTareas([a]).a!, /repetir/)
  const piton = nuevaTarea('entregarPiton', 3, 'p'); assert.match(validarTareas([piton]).p!, /un receptor/)
  piton.receptores = [4]; const e = new TaskEngine(plan([piton])); assert.match(e.estados.p!.motivo, /pitón cerrado/)
})

test('Persistencia de receptores mantiene formatos anteriores y rechaza datos malformados', () => {
  const old = zonaIBase(); old.tareas.forEach(t => delete t.receptores)
  const full = secuenciaCompleta(), file = { version: 1, seleccionada: full.id, estrategias: [old, full] }
  const migrated = leerArchivo(JSON.stringify(file)); assert.equal(migrated.version, 5); assert.ok(migrated.estrategias.every(s => s.modoAgua === 'resumido' && s.modoTendido === 'libre' && s.modoConexiones === 'simple'))
  const invalid = JSON.parse(JSON.stringify(file)); invalid.estrategias[1].tareas[0].receptores = 'B4'; assert.throws(() => leerArchivo(JSON.stringify(invalid)))
})

test('Carga detallada identifica 14 piezas y limita cada bombero a dos manos', () => {
  const s = aguaDetallada(); assert.deepEqual(validarCargaAgua(s), []); assert.deepEqual(validarTareas(s.tareas, 'detallado'), {})
  s.tareas.find(t => t.id === 'prep-M10')!.bombero = 1
  assert.match(validarCargaAgua(s).join(' '), /dos manos.*B1/)
  s.tareas.find(t => t.id === 'prep-M10')!.bombero = null
  assert.match(validarCargaAgua(s).join(' '), /Asigna un bombero/)
  s.tareas.find(t => t.id === 'prep-M10')!.materialId = 'M9'
  assert.match(validarCargaAgua(s).join(' '), /Falta asignar: M10.*Piezas repetidas: M9/)
})

test('La prevalidación detallada exige despliegue, conexión, pitón y apertura por línea usada', () => {
  const noHose = aguaDetallada(); noHose.tareas = noHose.tareas.filter(t => t.id !== 'conectar-m1')
  assert.match(validarCargaAgua(noHose).join(' '), /Línea A: agrega al menos una manguera/)
  const noLaunch = aguaDetallada(); noLaunch.tareas = noLaunch.tareas.filter(t => t.id !== 'lanzar-m2')
  assert.match(validarCargaAgua(noLaunch).join(' '), /Línea B: falta lanzar M2/)
  const noNozzle = aguaDetallada(); noNozzle.tareas = noNozzle.tareas.filter(t => t.id !== 'conectar-p1')
  assert.match(validarCargaAgua(noNozzle).join(' '), /Línea A: agrega la conexión de su pitón/)
  const noOpen = aguaDetallada(); noOpen.tareas = noOpen.tareas.filter(t => t.id !== 'abrir-b')
  assert.match(validarCargaAgua(noOpen).join(' '), /Línea B: agrega una apertura/)
})

test('Mangueras se lanzan, conectan y el gemelero alterna A y B', () => {
  const e = run(new TaskEngine(aguaDetallada()))
  assert.ok(e.finalizada, JSON.stringify(Object.entries(e.estados).filter(([, state]) => state.estado !== 'completada')))
  assert.equal(e.ingresaron.size, 8); assert.ok(MATERIAL_AGUA.every(id => e.inventarioAgua[id].ingresada))
  assert.equal(e.inventarioAgua.M1.estado, 'conectado'); assert.equal(e.inventarioAgua.M1.portador, null); assert.equal(e.inventarioAgua.M1.linea, 'A')
  assert.equal(e.inventarioAgua.M2.linea, 'B'); assert.deepEqual(e.lineasAgua.A.tramos, ['M1']); assert.deepEqual(e.lineasAgua.B.tramos, ['M2'])
  assert.equal(e.lineasAgua.A.piton, 'P1'); assert.equal(e.lineasAgua.B.piton, 'P2'); assert.ok(!e.lineasAgua.A.activa && !e.lineasAgua.B.activa)
  assert.deepEqual([...e.blancos], [1, 2]); assert.deepEqual(e.manos(1), ['P1']); assert.deepEqual(e.manos(2), [])
  assert.ok(e.estados['abrir-b']!.inicio! >= e.estados['cortar-a']!.fin!)
})

test('Agua detallada bloquea conexiones discontinuas y dos salidas abiertas', () => {
  const s = aguaDetallada(); s.tareas.find(t => t.id === 'b2-gemelo-1')!.objetivo = 'ingreso'
  const e = run(new TaskEngine(s)); assert.ok(e.bloqueada); assert.match(e.estados['conectar-m2']!.motivo, /no coincide/)
  const engine = new TaskEngine(aguaDetallada())
  for (let i = 0; i < 5000 && engine.estados['abrir-a']!.estado !== 'completada'; i++) engine.tick(0.1)
  Object.assign(engine.lineasAgua.B, { conectada: true, tramos: ['M2'], piton: 'P2' })
  const openB = engine.estrategia.tareas.find(t => t.id === 'abrir-b')!
  assert.match((engine as any).requisitoAgua(openB), /otra línea/); assert.ok(engine.lineasAgua.A.activa)
})

test('El octavo ingreso bloquea si alguna pieza de agua quedó fuera', () => {
  const s = aguaDetallada(), late = s.tareas.splice(s.tareas.findIndex(t => t.id === 'prep-M1'), 1)[0]!
  late.duracion = 100; s.tareas.splice(s.tareas.findIndex(t => t.id === 'ingreso-8') + 1, 0, late)
  const e = run(new TaskEngine(s)); assert.ok(e.bloqueada); assert.match(e.errorIngreso, /falta material: M1/); assert.equal(e.inventarioAgua.M1.ingresada, false)
})

test('Formato 2 conserva modo, material y línea; formato 1 migra resumido', () => {
  const detailed = aguaDetallada(), v2 = { version: 2 as const, seleccionada: detailed.id, estrategias: [detailed] }
  const migrated = leerArchivo(JSON.stringify(v2)); assert.equal(migrated.version, 5); assert.equal(migrated.estrategias[0]!.modoTendido, 'libre'); assert.equal(migrated.estrategias[0]!.modoConexiones, 'simple'); assert.equal(migrated.estrategias[0]!.tareas.length, detailed.tareas.length)
  const bad = structuredClone(v2) as any; bad.estrategias[0].tareas[0].materialId = 'M11'; assert.throws(() => leerArchivo(JSON.stringify(bad)))
})

function estrategiaConTendidos() {
  setActivePinia(createPinia())
  const store = useStrategyStore(), strategy = secuenciaCompleta()
  store.estrategias = [strategy]; store.estrategiaActual = strategy.id
  store.agregarAguaDetallada(); store.agregarTendidosPorBlanco()
  const holders: Record<string, number> = { M1: 1, M2: 1, M3: 3, M4: 4, M5: 4, M6: 5, M7: 5, M8: 6, M9: 7, M10: 7, P1: 3, P2: 8, L1: 2, L2: 2 }
  for (const task of strategy.tareas) {
    if (task.id.startsWith('agua-preparar-')) task.bombero = holders[task.materialId!]!
    if (task.id.startsWith('tendido-') && task.bombero === null) task.bombero = task.materialId ? holders[task.materialId]! : task.operacion === 'reacomodarLinea' && task.linea === 'A' ? 4 : 8
  }
  return { store, strategy }
}

test('Plantillas por blanco respetan cantidades, piezas y continuidad de acoples', () => {
  const counts = [2, 2, 8, 6, 7, 7, 3, 4]
  for (let blanco = 1; blanco <= 8; blanco++) {
    const layout = TENDIDOS_POR_BLANCO[blanco]!
    assert.equal(layout.tramos.length, counts[blanco - 1]); assert.equal(new Set(layout.piezas).size, layout.piezas.length)
    assert.ok(layout.piezas.every(id => /^M(?:10|[1-9])$/.test(id)))
    for (let i = 1; i < layout.tramos.length; i++) assert.deepEqual(layout.tramos[i - 1]!.trazado.at(-1), layout.tramos[i]!.trazado[0])
  }
  assert.deepEqual(TENDIDOS_POR_BLANCO[8]!.piezas, ['M3', 'M4', 'M5', 'M6'])
  assert.deepEqual(TENDIDOS_POR_BLANCO[6]!.piezas, ['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'])
  assert.deepEqual(TENDIDOS_POR_BLANCO[6]!.tramos[3]!.trazado.at(-1), TENDIDOS_POR_BLANCO[6]!.tramos[4]!.trazado[0])
  assert.deepEqual(TENDIDOS_POR_BLANCO[6]!.tramos[3]!.trazado.at(-1), { x: 12.5, y: 0.14, z: -1.5 })
  for (let blanco = 1; blanco <= 8; blanco++) assert.equal(validarTrazadoManguera(TENDIDOS_POR_BLANCO[blanco]!.tramos.flatMap(t => t.trazado), true), null)
  const trace = TENDIDOS_POR_BLANCO[3]!.tramos[0]!.trazado
  assert.equal(trazadoParcial(trace, 0).length, 0); assert.ok(trazadoParcial(trace, 0.5).length >= 2); assert.deepEqual(trazadoParcial(trace, 1).at(-1), trace.at(-1))
})

test('Agregar tendidos incluye relevo y abandono sin duplicarse', () => {
  const { store, strategy } = estrategiaConTendidos(), amount = strategy.tareas.length
  assert.equal(strategy.modoAgua, 'detallado'); assert.equal(strategy.modoTendido, 'por-blanco')
  assert.equal(strategy.modoConexiones, 'segmentado')
  assert.ok(strategy.tareas.some(t => t.id === 'tendido-6-separar-m7' && t.operacion === 'separarLinea'))
  assert.ok(strategy.tareas.some(t => t.id === 'tendido-6-dejar-p2' && t.operacion === 'dejarPitonLinea'))
  assert.ok(strategy.tareas.some(t => t.id === 'tendido-8-dejar-p1' && t.operacion === 'dejarPitonLinea'))
  assert.ok(strategy.tareas.some(t => t.id === 'tendido-puerta-dejar-herramientas' && t.operacion === 'dejarHerramientas'))
  store.agregarTendidosPorBlanco(); assert.equal(strategy.tareas.length, amount)
  assert.deepEqual(validarTareas(strategy.tareas, 'detallado', 'por-blanco'), {}); assert.deepEqual(validarCargaAgua(strategy), [])
})

test('Secuencia 1→8 deja las líneas y herramientas en el piso', () => {
  const { strategy } = estrategiaConTendidos(), engine = run(new TaskEngine(strategy))
  assert.ok(engine.finalizada, JSON.stringify(Object.entries(engine.estados).filter(([, state]) => state.estado !== 'completada')))
  assert.deepEqual([...engine.blancos], [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(engine.lineasAgua.A.tramos, ['M1', 'M2'])
  assert.deepEqual(engine.lineasAgua.B.tramos, [])
  const p2 = engine.conjuntosManguera.find(group => group.piton === 'P2'), p1 = engine.conjuntosManguera.find(group => group.piton === 'P1')
  assert.deepEqual(p2?.tramos, ['M7', 'M8', 'M9']); assert.equal(p2?.estado, 'abandonado')
  assert.deepEqual(p1?.tramos, ['M3', 'M4', 'M5', 'M6']); assert.equal(p1?.estado, 'abandonado')
  assert.equal(engine.inventarioAgua.P1.estado, 'abandonado'); assert.equal(engine.inventarioAgua.P2.estado, 'abandonado')
  assert.equal(engine.herramientas.portador, null); assert.ok(engine.puertaAbierta)
})

test('No permite desconectar un tramo intermedio ni lanzar fuera del siguiente acople', () => {
  const { strategy } = estrategiaConTendidos(), engine = new TaskEngine(strategy)
  for (let i = 0; i < 20000 && engine.estados['tendido-3-conectar-M10']!.estado !== 'completada'; i++) engine.tick(0.05)
  engine.lineasAgua.B.activa = false
  const middle = { ...nuevaTarea('desconectarManguera', 8, 'manual-middle'), materialId: 'M8' as const, linea: 'B' as const }
  assert.match((engine as any).requisitoAgua(middle), /último tramo/)
  engine.inventarioAgua.M3.portador = 1; engine.inventarioAgua.M3.estado = 'portado'; engine.inventarioAgua.M3.mano = 1
  const wrong = { ...nuevaTarea('lanzarManguera', 1, 'manual-wrong'), materialId: 'M3' as const, linea: 'B' as const, objetivo: 'blanco-3' }
  assert.match((engine as any).requisitoAgua(wrong), /siguiente tramo/)
})
