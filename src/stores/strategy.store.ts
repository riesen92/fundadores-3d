import { secuenciaOficial } from '../simulation/officialStrategy.ts'
import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { zonaIBase, secuenciaCompleta, configuracionInicial } from '../simulation/baseStrategy.ts'
import { TaskEngine } from '../simulation/TaskEngine.ts'
import { leerArchivo, STORAGE_KEY } from '../simulation/strategyStorage.ts'
import { equipo, nuevaTarea, OPERACIONES_AGUA_DETALLADA, validarCargaAgua, validarTareas } from '../simulation/tasks.ts'
import { MATERIAL_AGUA } from '../simulation/water.ts'
import type { Estrategia, Tarea } from '../simulation/tasks.ts'
import { useFirefightersStore } from './firefighters.store.ts'
export type { Estrategia } from '../simulation/tasks.ts'
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
export const useStrategyStore = defineStore('strategy', {
  state: () => ({ estrategias: [] as Estrategia[], estrategiaActual: null as string | null, inicializado: false, error: '', guardado: '', impedirGuardado: false,
    engine: null as TaskEngine | null, activa: false, reproduciendo: false, velocidad: 1, revision: 0, bomberoSeleccionado: 1 as number | null,
  }),
  getters: {
    actual: state => state.estrategias.find(s => s.id === state.estrategiaActual) ?? null,
    validacion(): Record<string, string> { return this.actual ? validarTareas(this.actual.tareas, this.actual.modoAgua, this.actual.modoTendido, this.actual.perfilTendido) : {} },
    erroresAgua(): string[] { return this.actual ? validarCargaAgua(this.actual) : [] },
    puedeSimular(): boolean { return !!this.actual?.tareas.length && !Object.keys(this.validacion).length && !this.erroresAgua.length },
  },
  actions: {
    inicializar() {
      if (this.inicializado) return
      this.inicializado = true
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) { const saved = leerArchivo(raw); this.estrategias = saved.estrategias; this.estrategiaActual = saved.seleccionada }
        if (!localStorage.getItem('fundadores-oficial-unica-v1') || !this.estrategias.length) {
          const base = secuenciaOficial(), anterior = this.actual, firefighters = useFirefightersStore()
          if (anterior) base.bomberos = copy(anterior.bomberos)
          else firefighters.bomberos.forEach(b => base.bomberos[b.id] = { nombre: b.nombre, velocidad: b.velocidad })
          if (raw && !localStorage.getItem('fundadores-respaldo-antes-oficial')) localStorage.setItem('fundadores-respaldo-antes-oficial', raw)
          this.estrategias = [base]; this.estrategiaActual = base.id
          this.guardar()
          if (!this.error) localStorage.setItem('fundadores-oficial-unica-v1', '1')
        }
      } catch { this.error = 'No se pudieron leer las estrategias guardadas. Se conservan los datos originales; no se sobrescribirán.'; this.impedirGuardado = true }
      this.aplicarNombres()
    },
    aplicarNombres() { if (!this.actual) return; useFirefightersStore().bomberos.forEach(b => { const config = this.actual!.bomberos[b.id]!; b.nombre = config.nombre; b.velocidad = config.velocidad }) },
    guardar() {
      if (this.impedirGuardado) return
      try {
        this.estrategias.forEach(strategy => { strategy.modoAgua ??= 'resumido'; strategy.modoTendido ??= 'libre'; strategy.modoConexiones ??= 'simple' })
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 5, seleccionada: this.estrategiaActual, estrategias: this.estrategias })); this.guardado = 'Guardado en este navegador'; this.error = ''
      }
      catch { this.error = 'No se pudo guardar. El plan sigue en memoria; revisa el espacio o los permisos del navegador.'; this.guardado = '' }
    },
    elegir(id: string) { if (!this.estrategias.some(s => s.id === id)) return; this.cerrar(); this.estrategiaActual = id; this.aplicarNombres(); this.guardar() },
    crear(nombre: string, duplicar = false) {
      if (!nombre.trim() || this.activa) return
      const strategy: Estrategia = duplicar && this.actual ? copy(this.actual) : { id: '', nombre: '', tareas: [], bomberos: configuracionInicial() }
      strategy.id = crypto.randomUUID(); strategy.nombre = nombre.trim().slice(0, 80)
      this.estrategias.push(strategy); this.elegir(strategy.id)
    },
    renombrar(nombre: string) { if (this.actual && !this.activa && nombre.trim()) { this.actual.nombre = nombre.trim().slice(0, 80); this.guardar() } },
    eliminar() { if (!this.actual || this.activa) return; this.estrategias = this.estrategias.filter(s => s.id !== this.estrategiaActual); this.estrategiaActual = this.estrategias[0]?.id ?? null; this.aplicarNombres(); this.guardar() },
    restaurarBase() { if (this.activa) return; const base = zonaIBase(); base.id = crypto.randomUUID(); this.estrategias.push(base); this.elegir(base.id) },
    agregarSecuenciaOficial() {
      if (this.activa || this.impedirGuardado) return
      const base = secuenciaOficial(); base.id = crypto.randomUUID()
      if (this.actual) base.bomberos = copy(this.actual.bomberos)
      else useFirefightersStore().bomberos.forEach(b => base.bomberos[b.id] = { nombre: b.nombre, velocidad: b.velocidad })
      this.estrategias.push(base); this.elegir(base.id)
    },
    agregarSecuenciaCompleta() {
      if (this.activa || this.impedirGuardado) return
      const base = secuenciaCompleta(); base.id = crypto.randomUUID()
      if (this.actual) base.bomberos = copy(this.actual.bomberos)
      else useFirefightersStore().bomberos.forEach(b => base.bomberos[b.id] = { nombre: b.nombre, velocidad: b.velocidad })
      this.estrategias.push(base); this.elegir(base.id)
    },
    agregarAguaDetallada() {
      if (!this.actual || this.activa) return
      const preparar = (id: typeof MATERIAL_AGUA[number]) => {
        const op = id.startsWith('M') ? 'prepararManguera' : id.startsWith('P') ? 'prepararPiton' : 'prepararLlave'
        return { ...nuevaTarea(op, null, `agua-preparar-${id}`), materialId: id, nombre: `Preparar ${id}` }
      }
      const prepared = new Set(this.actual.tareas.filter(t => ['prepararManguera', 'prepararPiton', 'prepararLlave'].includes(t.operacion)).map(t => t.materialId))
      this.actual.tareas.unshift(...MATERIAL_AGUA.filter(id => !prepared.has(id)).map(preparar))
      this.actual.modoAgua = 'detallado'
      this.actual.modoTendido ??= 'libre'
      const byId = (id: string) => this.actual!.tareas.find(t => t.id === id)
      for (let n = 1; n <= 8; n++) { const t = byId(`blanco-${n}`); if (t) t.linea = n <= 2 || n >= 7 ? 'A' : 'B' }
      for (const id of ['apoyo-1', 'apoyo-2']) { const t = byId(id); if (t) t.linea = 'A' }
      const configure = (id: string, materialId: 'P1' | 'P2', linea: 'A' | 'B') => { const t = byId(id); if (t) { t.materialId = materialId; t.linea = linea } }
      const replace = (id: string, materialId: 'P1' | 'P2', linea: 'A' | 'B') => { const t = byId(id); if (!t) return; const op = OPERACIONES_AGUA_DETALLADA.includes(t.operacion) ? t.operacion : 'conectarPiton'; Object.assign(t, { operacion: op, categoria: 'Agua', objetivo: 'material', materialId, linea, nombre: `Conectar ${materialId} a Línea ${linea}` }) }
      replace('piton-i', 'P1', 'A'); replace('piton-iii', 'P2', 'B')
      configure('cerrar-i', 'P1', 'A'); configure('cerrar-iii', 'P2', 'B'); configure('cerrar-iv', 'P1', 'B'); configure('piton-iv', 'P1', 'A')
      const control = (id: string, op: 'abrirLinea' | 'cortarLinea', linea: 'A' | 'B', dependencias: string[]) => ({ ...nuevaTarea(op, 2, id), linea, dependencias, nombre: `${op === 'abrirLinea' ? 'Abrir' : 'Cortar'} Línea ${linea}` })
      const controls = [control('agua-abrir-a-1', 'abrirLinea', 'A', ['piton-i']), control('agua-cortar-a-1', 'cortarLinea', 'A', ['cerrar-i']), control('agua-abrir-b', 'abrirLinea', 'B', ['agua-cortar-a-1', 'piton-iii']), control('agua-cortar-b', 'cortarLinea', 'B', ['cerrar-iii']), control('agua-abrir-a-2', 'abrirLinea', 'A', ['agua-cortar-b', 'piton-iv']), control('agua-cortar-a-2', 'cortarLinea', 'A', ['cerrar-iv'])].filter(t => !byId(t.id))
      const anchor = this.actual.tareas.findIndex(t => t.id === 'agua'); this.actual.tareas.splice(anchor >= 0 ? anchor + 1 : 14, 0, ...controls)
      const addDep = (id: string, dep: string) => { const t = byId(id); if (t && !t.dependencias.includes(dep)) t.dependencias.push(dep) }
      addDep('blanco-1', 'agua-abrir-a-1'); addDep('blanco-3', 'agua-abrir-b'); addDep('blanco-7', 'agua-abrir-a-2'); addDep('piton-iv', 'agua-cortar-a-1')
      this.revision++; this.guardar()
    },
    agregarTendidosPorBlanco() {
      if (!this.actual || this.activa || this.impedirGuardado) return
      if (![1, 2, 3, 4, 5, 6, 7, 8].every(n => this.actual!.tareas.some(t => t.operacion === 'derribar' && t.objetivo === `blanco-${n}`))) {
        this.error = 'La estrategia necesita tareas para los blancos 1–8 antes de agregar los tendidos.'; return
      }
      if (this.actual.modoAgua !== 'detallado') this.agregarAguaDetallada()
      const strategy = this.actual
      if (!strategy || strategy.modoTendido === 'por-blanco') { this.guardado = 'Los tendidos por blanco ya están agregados.'; return }
      const generatedControls = ['agua-abrir-a-1', 'agua-cortar-a-1', 'agua-abrir-b', 'agua-cortar-b', 'agua-abrir-b-2', 'agua-cortar-b-2']
      const controls = new Map(strategy.tareas.filter(t => generatedControls.includes(t.id)).map(t => [t.id, t]))
      strategy.tareas = strategy.tareas.filter(t => !t.id.startsWith('tendido-') && !t.id.startsWith('agua-abrir-') && !t.id.startsWith('agua-cortar-'))
      strategy.tareas.forEach(t => { t.dependencias = t.dependencias.filter(id => !id.startsWith('agua-abrir-') && !id.startsWith('agua-cortar-')) })
      const byId = (id: string) => strategy.tareas.find(t => t.id === id)
      const dep = (id: string, dependency: string) => { const task = byId(id); if (task && !task.dependencias.includes(dependency)) task.dependencias.push(dependency) }
      for (const blanco of [7, 8]) { const tareaBlanco = byId(`blanco-${blanco}`); if (tareaBlanco) tareaBlanco.linea = 'B' }
      const task = (id: string, op: Parameters<typeof nuevaTarea>[0], bombero: number | null, objetivo: string, linea: 'A' | 'B' | undefined, dependencies: string[] = [], materialId?: typeof MATERIAL_AGUA[number], nombre?: string) => ({ ...nuevaTarea(op, bombero, id), objetivo, dependencias: dependencies, ...(linea ? { linea } : {}), ...(materialId ? { materialId } : {}), ...(nombre ? { nombre } : {}) })
      const launchChain = (blanco: number, linea: 'A' | 'B', pieces: Array<typeof MATERIAL_AGUA[number]>, dependency?: string) => {
        const result: Tarea[] = []; let previous = dependency
        for (const materialId of pieces) {
          const launchId = `tendido-${blanco}-lanzar-${materialId}`, connectId = `tendido-${blanco}-conectar-${materialId}`
          result.push(task(launchId, 'lanzarManguera', null, `blanco-${blanco}`, linea, previous ? [previous] : [], materialId, `Lanzar ${materialId} para blanco ${blanco}`))
          result.push(task(connectId, 'conectarManguera', null, `blanco-${blanco}`, linea, [launchId], materialId, `Conectar ${materialId} a Línea ${linea}`))
          previous = connectId
        }
        return { tareas: result, ultimo: previous! }
      }
      const close = (blanco: number, linea: 'A' | 'B', bombero: number) => task(`tendido-${blanco}-cerrar-piton`, 'cerrarPiton', bombero, 'material', linea, [`blanco-${blanco}`], linea === 'A' ? 'P1' : 'P2', `Cerrar pitón después del blanco ${blanco}`)
      const cut = (suffix: string, linea: 'A' | 'B', dependency: string) => task(`tendido-${suffix}-cortar-${linea.toLowerCase()}`, 'cortarLinea', 2, 'gemelo', linea, [dependency], undefined, `Cortar Línea ${linea}`)
      const disconnect = (blanco: number, linea: 'A' | 'B', materialId: typeof MATERIAL_AGUA[number], dependency: string) => task(`tendido-${blanco}-desconectar-${materialId}`, 'desconectarManguera', null, 'material', linea, [dependency], materialId, `Desconectar ${materialId} de Línea ${linea}`)
      const pickup = (blanco: number, materialId: typeof MATERIAL_AGUA[number], dependency: string) => task(`tendido-${blanco}-recoger-${materialId}`, 'recogerManguera', null, 'material', undefined, [dependency], materialId, `Recoger ${materialId} desplegada`)
      const reposition = (blanco: number, linea: 'A' | 'B', dependency: string, tramos: number) => ({ ...task(`tendido-${blanco}-reacomodar`, 'reacomodarLinea', null, `blanco-${blanco}`, linea, [dependency], undefined, `Reacomodar Línea ${linea} para blanco ${blanco}`), duracion: tramos * 2 })
      const open = (suffix: string, linea: 'A' | 'B', dependencies: string[]) => task(`tendido-${suffix}-abrir-${linea.toLowerCase()}`, 'abrirLinea', 2, 'gemelo', linea, dependencies, undefined, `Abrir Línea ${linea}`)
      const insertBefore = (anchor: string, additions: Tarea[]) => { const index = strategy.tareas.findIndex(t => t.id === anchor); strategy.tareas.splice(index < 0 ? strategy.tareas.length : index, 0, ...additions) }
      const initialA = launchChain(1, 'A', ['M1', 'M2'])
      insertBefore('piton-i', initialA.tareas); dep('piton-i', initialA.ultimo)
      const openA1 = controls.get('agua-abrir-a-1') ?? task('agua-abrir-a-1', 'abrirLinea', 2, 'gemelo', 'A', ['piton-i'])
      openA1.dependencias = [...new Set([...openA1.dependencias, 'piton-i'])]; insertBefore('apoyo-1', [openA1]); dep('apoyo-1', openA1.id)
      const close1 = close(1, 'A', byId('blanco-1')?.bombero ?? 3), move2 = reposition(2, 'A', close1.id, 2)
      insertBefore('apoyo-2', [close1, move2]); dep('apoyo-2', move2.id)
      const cutA1 = controls.get('agua-cortar-a-1') ?? task('agua-cortar-a-1', 'cortarLinea', 2, 'gemelo', 'A', ['cerrar-i'])
      cutA1.dependencias = [...new Set([...cutA1.dependencias, 'cerrar-i'])]; insertBefore('piton-iv', [cutA1]); dep('piton-iv', cutA1.id)
      const disconnectP1 = task('tendido-2-desconectar-p1', 'desconectarPiton', 3, 'material', 'A', ['agua-cortar-a-1'], 'P1', 'Desconectar P1 de Línea A')
      insertBefore('piton-iv', [disconnectP1]); dep('piton-iv', disconnectP1.id)
      const initialB = launchChain(3, 'B', ['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10'], 'puerta')
      insertBefore('piton-i', initialB.tareas); dep('piton-iii', initialB.ultimo)
      const openB3 = controls.get('agua-abrir-b') ?? task('agua-abrir-b', 'abrirLinea', 2, 'gemelo', 'B', [cutA1.id, 'piton-iii'])
      openB3.dependencias = [...new Set([...openB3.dependencias, cutA1.id, 'piton-iii'])]; insertBefore('blanco-3', [openB3]); dep('blanco-3', openB3.id)
      const close3 = close(3, 'B', byId('blanco-3')?.bombero ?? 8), cutB3 = cut('3', 'B', close3.id)
      const disconnect10 = disconnect(4, 'B', 'M10', cutB3.id), disconnect9a = disconnect(4, 'B', 'M9', disconnect10.id), move4 = reposition(4, 'B', disconnect9a.id, 6), openB4 = open('4', 'B', [move4.id])
      insertBefore('blanco-4', [close3, cutB3, disconnect10, disconnect9a, move4, openB4]); dep('blanco-4', openB4.id)
      const close4 = close(4, 'B', byId('blanco-4')?.bombero ?? 8), cutB4 = cut('4', 'B', close4.id), move5 = reposition(5, 'B', cutB4.id, 6)
      const pickup9a = pickup(5, 'M9', move5.id), launch9a = task('tendido-5-lanzar-M9', 'lanzarManguera', null, 'blanco-5', 'B', [pickup9a.id], 'M9', 'Lanzar M9 para blanco 5'), connect9a = task('tendido-5-conectar-M9', 'conectarManguera', null, 'blanco-5', 'B', [launch9a.id], 'M9', 'Conectar M9 a Línea B'), openB5 = open('5', 'B', [connect9a.id])
      insertBefore('blanco-5', [close4, cutB4, move5, pickup9a, launch9a, connect9a, openB5]); dep('blanco-5', openB5.id)
      const close5 = close(5, 'B', byId('blanco-5')?.bombero ?? 8), move6 = reposition(6, 'B', close5.id, 7)
      insertBefore('blanco-6', [close5, move6]); dep('blanco-6', move6.id)
      const cutB6 = controls.get('agua-cortar-b') ?? task('agua-cortar-b', 'cortarLinea', 2, 'gemelo', 'B', ['cerrar-iii'])
      cutB6.dependencias = [...new Set([...cutB6.dependencias, 'cerrar-iii'])]
      const split = task('tendido-6-separar-m7', 'separarLinea', 4, 'material', 'B', [cutB6.id], 'M7', 'Separar Línea B antes de M7')
      const leaveP2 = task('tendido-6-dejar-p2', 'dejarPitonLinea', 8, 'material', 'B', [split.id], 'P2', 'B8 deja P2 y M7–M9 en Zona III')
      const disconnect6 = disconnect(7, 'B', 'M6', split.id); disconnect6.bombero = 4; disconnect6.nombre = 'Desconectar M6 para el blanco 7'
      insertBefore('espera-tubo-8', [cutB6, split, leaveP2, disconnect6])
      const move7 = reposition(7, 'B', disconnect6.id, 3); move7.bombero = 4
      const connectP1 = task('tendido-7-conectar-p1', 'conectarPiton', 4, 'material', 'B', [move7.id, 'piton-iv'], 'P1', 'Conectar P1 a Línea B')
      const openB7 = controls.get('agua-abrir-b-2') ?? task('agua-abrir-b-2', 'abrirLinea', 2, 'gemelo', 'B', [connectP1.id])
      openB7.dependencias = [...new Set([...openB7.dependencias, connectP1.id])]
      insertBefore('blanco-7', [move7, connectP1, openB7]); dep('blanco-7', openB7.id)
      const close7 = close(7, 'B', byId('blanco-7')?.bombero ?? 4), cutB7 = cut('7', 'B', close7.id)
      const disconnectP1b = task('tendido-7-desconectar-p1', 'desconectarPiton', 4, 'material', 'B', [cutB7.id], 'P1', 'Desconectar P1 para agregar M6')
      const move8 = reposition(8, 'B', disconnectP1b.id, 3); move8.bombero = 4
      const pickup6 = pickup(8, 'M6', move8.id); pickup6.bombero = 4
      const launch6 = task('tendido-8-lanzar-M6', 'lanzarManguera', 4, 'blanco-8', 'B', [pickup6.id], 'M6', 'Lanzar M6 para blanco 8')
      const connect6 = task('tendido-8-conectar-M6', 'conectarManguera', 4, 'blanco-8', 'B', [launch6.id], 'M6', 'Conectar M6 a Línea B')
      const reconnectP1 = task('tendido-8-conectar-p1', 'conectarPiton', 4, 'material', 'B', [connect6.id], 'P1', 'Reconectar P1 a Línea B')
      const openB8 = open('8', 'B', [reconnectP1.id])
      insertBefore('blanco-8', [close7, cutB7, disconnectP1b, move8, pickup6, launch6, connect6, reconnectP1, openB8]); dep('blanco-8', openB8.id)
      const cutB8 = controls.get('agua-cortar-b-2') ?? task('agua-cortar-b-2', 'cortarLinea', 2, 'gemelo', 'B', ['cerrar-iv'])
      cutB8.dependencias = [...new Set([...cutB8.dependencias, 'cerrar-iv'])]
      const leaveP1 = task('tendido-8-dejar-p1', 'dejarPitonLinea', 4, 'material', 'B', [cutB8.id], 'P1', 'B4 deja P1 y M3–M6 en el piso')
      const leaveTools = task('tendido-puerta-dejar-herramientas', 'dejarHerramientas', 6, 'puerta', undefined, ['puerta'], undefined, 'Dejar Halligan y TNT junto a la puerta'); leaveTools.ayudantes = [7]
      insertBefore('cargar', [cutB8, leaveP1]); insertBefore('piton-i', [leaveTools])
      strategy.modoTendido = 'por-blanco'; strategy.modoConexiones = 'segmentado'; this.error = ''; this.revision++; this.guardar()
    },
    actualizarTendidosYAbandono() {
      if (!this.actual || this.activa || this.impedirGuardado) return
      this.actual.modoTendido = 'libre'
      this.agregarTendidosPorBlanco()
      this.guardado = this.error ? '' : 'Tendidos, relevos y abandono actualizados'
    },
    tarea(tarea: Tarea) {
      if (!this.actual || this.activa) return
      if (OPERACIONES_AGUA_DETALLADA.includes(tarea.operacion)) this.actual.modoAgua = 'detallado'
      const index = this.actual.tareas.findIndex(t => t.id === tarea.id)
      if (index < 0) this.actual.tareas.push(copy(tarea)); else this.actual.tareas[index] = copy(tarea)
      this.revision++; this.guardar()
    },
    eliminarTarea(id: string) { if (!this.actual || this.activa) return; this.actual.tareas = this.actual.tareas.filter(t => t.id !== id); this.revision++; this.guardar() },
    moverTarea(id: string, direction: number) {
      if (!this.actual || this.activa) return
      const visible = this.actual.tareas.filter(t => this.bomberoSeleccionado === null ? t.bombero === null : equipo(t).includes(this.bomberoSeleccionado))
      const target = visible[visible.findIndex(t => t.id === id) + direction]; if (!target) return
      const all = this.actual.tareas, a = all.findIndex(t => t.id === id), b = all.indexOf(target)
      ;[all[a], all[b]] = [all[b]!, all[a]!]; this.revision++; this.guardar()
    },
    configurarBombero(id: number, nombre: string, velocidad: number) {
      if (!this.actual || this.activa || !Number.isFinite(velocidad) || velocidad < 0.1 || velocidad > 10) return
      this.actual.bomberos[id] = { nombre: nombre.trim().slice(0, 40) || `B${id}`, velocidad }; this.aplicarNombres(); this.revision++; this.guardar()
      try { localStorage.setItem('fundadores-nombres', JSON.stringify(Object.fromEntries(Object.entries(this.actual.bomberos).map(([id, b]) => [id, b.nombre])))) } catch { /* El archivo de estrategias conserva los nombres. */ }
    },
    iniciar() {
      const actual = this.actual
      if (!this.puedeSimular || !actual) return
      this.engine = markRaw(new TaskEngine(copy(actual))); this.activa = true; this.reproduciendo = !this.engine.bloqueada; this.revision++
      useFirefightersStore().editando = false
    },
    tick(dt: number) { if (!this.engine || !this.reproduciendo) return; this.engine.tick(dt * this.velocidad); this.revision++; if (this.engine.finalizada || this.engine.bloqueada) this.reproduciendo = false },
    cerrar() { this.engine = null; this.activa = false; this.reproduciendo = false; this.revision++ },
  },
})
