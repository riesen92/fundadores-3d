import test from 'node:test'
import assert from 'node:assert/strict'
import { secuenciaOficial } from '../src/simulation/officialStrategy.ts'
import { secuenciaCompleta } from '../src/simulation/baseStrategy.ts'
import { TaskEngine, zona } from '../src/simulation/TaskEngine.ts'
import { validarCargaAgua } from '../src/simulation/tasks.ts'
import type { Estrategia, Pose } from '../src/simulation/tasks.ts'
import { MATERIAL_AGUA, cargaInicialAgua } from '../src/simulation/water.ts'
import { plantillaTendido, validarTrazadoManguera } from '../src/simulation/hoseLayouts.ts'
import { leerArchivo } from '../src/simulation/strategyStorage.ts'

function ejecutar(s = secuenciaOficial(), observar?: (e: TaskEngine) => void) {
  const e = new TaskEngine(s)
  for (let n = 0; n < 15000 && !e.finalizada && !e.bloqueada; n++) { e.tick(0.25); observar?.(e) }
  return e
}
function completada(e: TaskEngine, id: string) { return e.estados[`oficial-${id}`]?.estado === 'completada' }
function fin(e: TaskEngine, id: string) { return e.estados[`oficial-${id}`]!.fin! }

test('Oficial: seis mangueras, una salida, relevos, catorce piezas y B5 último', () => {
  const s = secuenciaOficial(), vistos = new Set<string>()
  assert.deepEqual(validarCargaAgua(s), [])
  assert.deepEqual(cargaInicialAgua(s.tareas, 2), { piezas: ['M8', 'L1', 'L2'], manos: 2 })
  const e = ejecutar(s, e => {
    if (e.inventarioAgua.M1.estado === 'depositado') vistos.add('M1-depositada')
    if (e.inventarioAgua.L1.portador === 2 && e.inventarioAgua.M8.portador === 2) { assert.equal(e.inventarioAgua.L1.mano, e.inventarioAgua.L2.mano); assert.notEqual(e.inventarioAgua.L1.mano, e.inventarioAgua.M8.mano); vistos.add('llaves-juntas') }
    if (e.gemelero === 2 && !e.blancos.has(8)) assert.equal(zona(e.poses[2]!), 'I')
    assert.equal(e.lineasAgua.B.activa, false)
    if (e.ingresaron.size === 8) assert.equal(MATERIAL_AGUA.filter(id => e.inventarioAgua[id].ingresada).length, 14)
    for (const id of MATERIAL_AGUA.filter(id => id.startsWith('M'))) {
      assert.equal(validarTrazadoManguera(e.trazadoVisual(id), e.puertaAbierta), null, `Animación ${id} a ${e.tiempo}`)
    }
    if (completada(e, 'blanco-2') && !completada(e, 'piton-muro')) assert.equal(e.inventarioAgua.P1.portador, 3)
  })
  assert.equal(e.finalizada, true, JSON.stringify(e.estados))
  assert.equal(e.resultadoValido, true)
  assert.deepEqual([...e.blancos], [1, 2, 3, 4, 5, 6, 7, 8])
  assert.equal([...e.salidos].at(-1), 5)
  assert.ok(vistos.has('M1-depositada')); assert.ok(vistos.has('llaves-juntas'))
  assert.ok(fin(e, 'piton-P2') < fin(e, 'abrir-3'))
  assert.ok(fin(e, 'union-45') < fin(e, 'piton-muro'))
  assert.ok(fin(e, 'camilla-muro') < fin(e, 'blanco-6'))
  assert.ok(fin(e, 'cortar-8') <= fin(e, 'B2-al-muro'))
  assert.ok(fin(e, 'victima-entrega-muro') >= fin(e, 'blanco-8'))
  for (const b of [1, 2, 3, 4]) assert.ok(e.estados['oficial-victima-meta']!.inicio! >= fin(e, `cruce-tubo-${b}`))
  for (const id of ['M7', 'M8', 'M9', 'M10', 'L1', 'L2'] as const) { assert.equal(e.inventarioAgua[id].estado, 'depositado'); assert.equal(zona(e.inventarioAgua[id].posicion), 'IV'); assert.equal(e.inventarioAgua[id].portador, null) }
  for (const id of ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'P1', 'P2'] as const) assert.equal(e.inventarioAgua[id].estado, 'abandonado')
  assert.deepEqual(e.lineasAgua.A.tramos, ['M1', 'M2', 'M3', 'M4', 'M5'])
  assert.ok(e.conjuntosManguera.some(c => c.piton === 'P2' && c.tramos.join() === 'M6'))
  assert.equal(zona(e.inventarioAgua.P2.posicion), 'III')
  assert.equal(zona(e.inventarioAgua.P1.posicion), 'IV')
  for (const tool of Object.values(e.herramientasIndividuales)) { assert.equal(tool.portador, null); assert.equal(zona(tool.posicion), 'III') }
})

test('Perfil oficial conserva continuidad 2/6/5 y no altera los croquis anteriores', () => {
  for (let n = 1; n <= 8; n++) {
    const layout = plantillaTendido(n, 'oficial')!
    assert.equal(layout.piezas.length, n <= 2 ? 2 : n <= 6 ? 6 : 5)
    assert.equal(layout.linea, 'A')
    for (let i = 1; i < layout.tramos.length; i++) assert.deepEqual(layout.tramos[i - 1]!.trazado.at(-1), layout.tramos[i]!.trazado[0])
    assert.equal(validarTrazadoManguera(layout.tramos.flatMap(t => t.trazado), true), null)
    if (n === 3 || n === 4) assert.notEqual(validarTrazadoManguera(layout.tramos.flatMap(t => t.trazado), false), null)
  }
  assert.equal(plantillaTendido(3)!.piezas.length, 8)
  assert.equal(plantillaTendido(8)!.piezas.length, 4)
})

test('Oficial espera receptores demorados y conserva recursos al terminar y reiniciar', () => {
  const s = secuenciaOficial(); s.bomberos[6]!.velocidad = 1.8; s.bomberos[4]!.velocidad = 2.2
  s.tareas.find(t => t.id === 'oficial-lanzar-M4')!.duracion = 45
  const e = ejecutar(s)
  assert.equal(e.finalizada, true, JSON.stringify(e.estados))
  const estadoFinal = JSON.stringify({ agua: e.inventarioAgua, herramientas: e.herramientasIndividuales })
  e.tick(30); assert.equal(JSON.stringify({ agua: e.inventarioAgua, herramientas: e.herramientasIndividuales }), estadoFinal)
  const reinicio = new TaskEngine(s)
  assert.ok(Object.values(reinicio.inventarioAgua).every(p => p.estado === 'material' && !p.ingresada))
  assert.equal(reinicio.conexionesAgua.length, 0)
})

test('Oficial bloquea acoples ocupados, discontinuos, falta de purga y lanzamiento ajeno', () => {
  for (const [id, cambios, motivo] of [
    ['oficial-union-34', { conectarA: 'M3:0' }, /discontinuos/],
    ['oficial-union-56', { conectarA: 'M5:0' }, /ocupado/],
    ['oficial-purga-2', { operacion: 'mover' }, /despresurizar/],
    ['oficial-lanzar-M3', { materialId: 'M7' }, /portar/],
  ] as const) {
    const s = secuenciaOficial(); Object.assign(s.tareas.find(t => t.id === id)!, cambios)
    const e = ejecutar(s)
    assert.equal(e.finalizada, false)
    assert.ok(Object.values(e.estados).some(t => motivo.test(t.motivo)), JSON.stringify(e.estados))
  }
  const s = secuenciaOficial(); s.tareas.find(t => t.operacion === 'prepararLlaves')!.bombero = 1
  assert.ok(validarCargaAgua(s).some(m => m.includes('dos manos')))
})

test('Formato 5 conserva acoples, grupos, herramientas y migra v1–v4 sin cambiar tareas', () => {
  const oficial = secuenciaOficial()
  const round = leerArchivo(JSON.stringify({ version: 5, seleccionada: oficial.id, estrategias: [oficial] }))
  assert.equal(round.version, 5); assert.deepEqual(round.estrategias[0], oficial)
  for (const version of [1, 2, 3, 4]) {
    const anterior = secuenciaCompleta(), saved = leerArchivo(JSON.stringify({ version, seleccionada: anterior.id, estrategias: [anterior] })).estrategias[0]!
    assert.deepEqual(saved.tareas, anterior.tareas); assert.deepEqual(saved.bomberos, anterior.bomberos)
    assert.equal(saved.perfilTendido, 'croquis')
  }
  const corrupto = secuenciaOficial(); corrupto.tareas[0]!.conectarA = 'M99:3'
  assert.throws(() => leerArchivo(JSON.stringify({ version: 5, seleccionada: corrupto.id, estrategias: [corrupto] })), /Acople/)
})

test('Pitones permanecen en la mano y el tendido acompaña cada reacomodo', () => {
  const e = ejecutar(secuenciaOficial(), e => {
    for (const id of ['P1', 'P2'] as const) {
      const p = e.inventarioAgua[id]
      const transfer = [...e.activas.values()].some(a => a.tarea.operacion === 'entregarPiton' && a.tarea.materialId === id && a.elapsed >= a.traslado)
      if (p.portador !== null) {
        if (!transfer) assert.deepEqual(p.posicion, e.agarre(p.portador, p.mano))
        const c = e.conexionesAgua.find(c => c.a === id || c.b === id)
        if (c) {
          const hose = (c.a === id ? c.b : c.a).split(':')[0] as 'M1'
          const end = e.trazadoVisual(hose).at(-1)!
          assert.ok(Math.hypot(end.x-p.posicion.x,end.y-p.posicion.y,end.z-p.posicion.z) < .01, `${id} separado a ${e.tiempo}`)
        }
      }
    }
  })
  assert.equal(e.resultadoValido, true)
})

test('Ayudantes acompañan al pitonero durante todos los reacomodos', () => {
  const estrategia = secuenciaOficial()
  estrategia.bomberos[1]!.velocidad = 1.7
  estrategia.bomberos[4]!.velocidad = 2.3
  estrategia.bomberos[7]!.velocidad = 3.1
  const e = new TaskEngine(estrategia), muestras = new Map<string, Set<string>>(), anteriores = new Map<string, Pose>()
  for (let paso = 0; paso < 15000 && !e.finalizada && !e.bloqueada; paso++) {
    e.tick(0.05)
    for (const activa of e.activas.values()) {
      if (activa.tarea.operacion !== 'reacomodarLinea' || activa.elapsed < activa.traslado) continue
      const pitonero = e.poses[activa.tarea.bombero!]!, ayudante = e.poses[activa.tarea.ayudantes[0]!]!
      const separacion = Math.hypot(pitonero.x - ayudante.x, pitonero.z - ayudante.z)
      assert.ok(separacion >= 0.74 && separacion <= 1.21, `${activa.tarea.id}: separación ${separacion}`)
      assert.ok(zona(ayudante) && zona(pitonero), `${activa.tarea.id}: un participante salió de la cancha`)
      if (zona(ayudante) !== zona(pitonero)) {
        assert.equal(e.puertaAbierta, true)
        assert.deepEqual(new Set([zona(ayudante), zona(pitonero)]), new Set(['II', 'III']))
      }
      const anterior = anteriores.get(activa.tarea.id)
      if (anterior) assert.ok(Math.hypot(ayudante.x - anterior.x, ayudante.z - anterior.z) < 1, `${activa.tarea.id}: salto del ayudante`)
      anteriores.set(activa.tarea.id, { ...ayudante })
      const progreso = activa.tarea.duracion ? (activa.elapsed - activa.traslado) / activa.tarea.duracion : 1
      const etapa = progreso < 0.1 ? 'inicio' : progreso > 0.9 ? 'fin' : progreso > 0.45 && progreso < 0.55 ? 'mitad' : ''
      if (etapa) (muestras.get(activa.tarea.id) ?? muestras.set(activa.tarea.id, new Set()).get(activa.tarea.id)!).add(etapa)
    }
  }
  assert.equal(e.resultadoValido, true)
  for (let blanco = 1; blanco <= 8; blanco++) assert.deepEqual([...muestras.get(`oficial-reacomodar-${blanco}`)!].sort(), ['fin', 'inicio', 'mitad'])
})
