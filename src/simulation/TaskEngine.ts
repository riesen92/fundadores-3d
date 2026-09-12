import { calcularRuta, segmentoValido } from './routes.ts'

import { ACCESOS, ZONAS } from '../data/cancha.ts'

import { ELEMENTOS as E } from '../data/elementos.ts'

import { BLANCOS } from '../data/blancos.ts'

import { dependenciasEfectivas, equipo, emisores, esEntrega, ladosEntrega, numeroBlanco, objetivo, validarCargaAgua, validarTareas, OPERACIONES } from './tasks.ts'

import type { Estrategia, Tarea, Pose, EjecucionTarea } from './tasks.ts'

import { inventarioAguaInicial, lineasAguaInicial, MATERIAL_AGUA, posicionMaterialAgua, materialesTarea, MANGUERAS } from './water.ts'

import type { ConjuntoMangueras, LineaAguaId, MaterialAguaId, ConexionAgua } from './water.ts'

import { plantillaTendido, tramoTendido, validarTrazadoManguera, lanzamientoOficial, interpolarPorPasos, trazadoParcial, curvarManguera } from './hoseLayouts.ts'


export interface Recurso { posicion: Pose; portador: number | null }

export interface EjecucionActiva { tarea: Tarea; rutas: Record<number, Pose[]>; recorridos: Record<number, number>; traslado: number; elapsed: number; total: number; reunion: number; aproximaciones: Record<number, Pose[]>; entrega?: { origen: Pose; destino: Pose; tubo: boolean } }

const distancia = (a: Pose, b: Pose) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

const punto = (x: number, z: number, y = 0): Pose => ({ x, y, z })

export const zona = (p: Pose) => Math.abs(p.x) > 25 || Math.abs(p.z) > 25 ? null : p.x < 0 ? p.z < 0 ? 'I' : 'II' : p.z < 0 ? 'IV' : 'III'

const idsZona = (id: string) => ZONAS.find(z => z.id === id)!.blancos

export class TaskEngine {

  estrategia: Estrategia

  poses: Record<number, Pose> = {}
  direcciones: Record<number, { x: number; z: number }> = {}

  estados: Record<string, EjecucionTarea> = {}

  activas = new Map<string, EjecucionActiva>()

  errores: Record<string, string>

  dependencias: Record<string, string[]>

  roles: Record<number, string> = {}

  distancias: Record<number, number> = {}

  blancos = new Set<number>()

  pitones = new Set<number>()

  pitonesAbiertos = new Set<number>()

  linea = false; gemelero: number | null = null; apoyo: number | null = null; puertaAbierta = false

  inventarioAgua = inventarioAguaInicial()

  lineasAgua = lineasAguaInicial()

  conjuntosManguera: ConjuntoMangueras[] = []

  conexionesAgua: ConexionAgua[] = []

  presionPendiente = new Set<LineaAguaId>()

  herramientasIndividuales: Record<'TNT' | 'Halligan', Recurso> = { TNT: { posicion: { ...E.herramientas.posicion }, portador: null }, Halligan: { posicion: { ...E.herramientas.posicion }, portador: null } }

  ingresaron = new Set<number>()

  erroresAgua: string[] = []

  errorIngreso = ''

  herramientas: Recurso = { posicion: { ...E.herramientas.posicion }, portador: null }

  camilla: Recurso = { posicion: { ...E.camilla.posicion }, portador: null }

  equipoCamilla: number[] = []

  victima: Pose = { ...E.victima.posicion }

  cargada = false; asegurada = false; victimaMeta = false; banderin: number | null = null

  salidos = new Set<number>()

  tiempo = 0; penalizaciones = 0; finalizada = false; bloqueada = false; resultadoValido = false

  eventos: { tiempo: number; tarea: string; texto: string }[] = []

  constructor(estrategia: Estrategia) {

    this.estrategia = JSON.parse(JSON.stringify(estrategia)) as Estrategia
    if (this.estrategia.tareas.some(t => t.herramientas?.length)) for (const t of this.estrategia.tareas) if (['recogerHerramientas', 'entregarHerramientas', 'abrirPuerta', 'dejarHerramientas'].includes(t.operacion)) t.herramientas ??= ['TNT', 'Halligan']
    this.errores = validarTareas(this.estrategia.tareas, this.estrategia.modoAgua, this.estrategia.modoTendido, this.estrategia.perfilTendido)

    this.erroresAgua = validarCargaAgua(this.estrategia)

    this.dependencias = dependenciasEfectivas(this.estrategia.tareas)

    for (let i = 1; i <= 8; i++) { this.poses[i] = punto(E.inicio.posicion.x - 2.4 + (i - 1) % 4 * 1.6, E.inicio.posicion.z - 1 + Math.floor((i - 1) / 4) * 1.6); this.distancias[i] = 0; this.roles[i] = 'Esperando' }

    this.estrategia.tareas.forEach(t => { this.estados[t.id] = { estado: 'pendiente', motivo: '', espera: 0, progreso: 0 } })

    this.schedule()

  }

  destino(t: Tarea): Pose {

    if (t.operacion === 'prepararLlaves') return { ...posicionMaterialAgua('L1'), y: 0 }

    if (t.operacion === 'recogerMaterial') return { ...this.inventarioAgua[materialesTarea(t)[0]!]?.posicion, y: 0 }

    if (t.herramientas?.length && t.operacion === 'recogerHerramientas') return { ...this.herramientasIndividuales[t.herramientas[0]!]!.posicion, y: 0 }

    if (this.oficial && t.operacion === 'lanzarManguera' && t.materialId) return { ...lanzamientoOficial(t.materialId).at(t.extremo === 1 ? -1 : 0)!, y: 0 }

    if (this.oficial && t.operacion === 'conectarManguera' && t.materialId) return { ...this.posicionAcople(`${t.materialId}:${t.extremo ?? 0}`), y: 0 }

    if (this.oficial && t.operacion === 'conectarPiton' && t.conectarA) return { ...this.posicionAcople(t.conectarA), y: 0 }

    if (this.oficial && t.operacion === 'desconectarPiton' && t.materialId) return { ...this.inventarioAgua[t.materialId].posicion, y: 0 }

    if (['esperarBlanco', 'cerrarPiton', 'dejarPitonLinea'].includes(t.operacion)) return { ...this.poses[t.bombero!]! }

    if (t.operacion === 'recogerHerramientas') return { ...this.herramientas.posicion, y: 0 }

    if (['recogerCamilla', 'sostenerCamilla'].includes(t.operacion)) return { ...this.camilla.posicion, y: 0 }

    if (t.operacion === 'cargarVictima') return { ...this.victima, y: 0 }

    if (t.operacion === 'asegurarVictima') return { ...this.camilla.posicion, y: 0 }

    if (['prepararManguera', 'prepararPiton', 'prepararLlave'].includes(t.operacion) && t.materialId) return { ...posicionMaterialAgua(t.materialId), y: 0 }

    if (this.porBlanco && t.operacion === 'lanzarManguera' && t.materialId) return { ...(tramoTendido(numeroBlanco(t), t.materialId, this.estrategia.perfilTendido)?.trazado[0] ?? posicionMaterialAgua(t.materialId)), y: 0 }

    if (t.operacion === 'conectarManguera' && t.materialId) return { ...(this.inventarioAgua[t.materialId].trazado[0] ?? posicionMaterialAgua(t.materialId)), y: 0 }

    if (['desconectarManguera', 'separarLinea'].includes(t.operacion) && t.materialId) return { ...(this.inventarioAgua[t.materialId].trazado[0] ?? this.inventarioAgua[t.materialId].posicion), y: 0 }

    if (t.operacion === 'recogerManguera' && t.materialId) return { ...this.inventarioAgua[t.materialId].posicion, y: 0 }

    if (t.operacion === 'reacomodarLinea') return { ...(plantillaTendido(numeroBlanco(t), this.estrategia.perfilTendido)?.tramos.at(-1)?.trazado.at(-1) ?? objetivo(t.objetivo).posicion), y: 0 }

    if (['conectarPiton', 'desconectarPiton'].includes(t.operacion) && t.linea) return { ...this.extremoLinea(t.linea), y: 0 }

    if (esEntrega(t)) return ladosEntrega(t).origen

    return { ...objetivo(t.objetivo).posicion }

  }

  private requisito(t: Tarea): string {

    if (t.bombero === null) return 'Asigna un bombero a esta tarea.'

    if (this.errores[t.id]) return this.errores[t.id]!

    const pending = this.dependencias[t.id]!.filter(id => this.estados[id]?.estado !== 'completada')

    if (pending.length) return 'Espera: ' + pending.map(id => this.estrategia.tareas.find(t => t.id === id)?.nombre ?? id).join(', ')

    const ids = equipo(t)

    if (ids.some(id => this.salidos.has(id))) return 'Un integrante del equipo ya cruzó la meta.'

    if ([...this.activas.values()].some(a => equipo(a.tarea).some(id => ids.includes(id)))) return 'Bombero o ayudante ocupado en otra tarea.'

    const senders = emisores(t)

    const ownTools = t.herramientas?.length ? t.herramientas.every(key => senders.includes(this.herramientasIndividuales[key].portador ?? 0)) : this.herramientas.portador !== null && senders.includes(this.herramientas.portador)

    const ownStretcher = this.camilla.portador !== null && (senders.includes(this.camilla.portador) || senders.some(id => this.equipoCamilla.includes(id)))

    const toolsOps = ['recogerHerramientas', 'entregarHerramientas', 'abrirPuerta', 'dejarHerramientas']

    if (toolsOps.includes(t.operacion) && [...this.activas.values()].some(a => toolsOps.includes(a.tarea.operacion) && (!t.herramientas || !a.tarea.herramientas || a.tarea.herramientas.some(key => t.herramientas!.includes(key))))) return 'Las herramientas están reservadas por otra tarea.'

    if (ids.includes(this.gemelero ?? 0) && !this.blancos.has(8) && !['operarGemelo', 'esperarBlanco', 'conectarLinea', 'abrirLinea', 'cortarLinea'].includes(t.operacion)) return 'El gemelero debe permanecer hasta que caiga el blanco 8.'

    if (['subirEscala', 'retirarBanderin'].includes(t.operacion) && !this.blancos.has(8)) return 'La escala se habilita al caer el blanco 8.'

    if (t.operacion === 'retirarBanderin' && this.poses[t.bombero]!.y < E.escala.alto - 0.1) return 'Primero subir a la cima de la escala.'

    if (t.operacion === 'retirarBanderin' && this.banderin !== null) return 'El banderín ya fue retirado.'

    if (t.operacion === 'bajarEscala' && this.poses[t.bombero]!.y < 1) return 'El bombero no está en la escala.'

    if (this.poses[t.bombero]!.y > 1 && !['retirarBanderin', 'bajarEscala'].includes(t.operacion)) return 'Debe bajar la escala antes de desplazarse.'

    if (t.operacion === 'recogerHerramientas' && (t.herramientas ? t.herramientas.some(key => this.herramientasIndividuales[key].portador !== null) : this.herramientas.portador !== null) && !ownTools) return 'Las herramientas las lleva otro bombero.'

    if (['entregarHerramientas', 'abrirPuerta', 'dejarHerramientas'].includes(t.operacion) && !ownTools) return 'Primero recibir o recoger las herramientas.'

    if (t.operacion === 'dejarHerramientas' && !this.puertaAbierta) return 'Primero completar la entrada forzada.'

    if (t.operacion === 'operarGemelo' && !this.detallado && !this.linea) return 'Primero conectar una línea al gemelo.'

    if (t.operacion === 'operarGemelo' && this.gemelero !== null && this.gemelero !== t.bombero) return 'El gemelo ya tiene un operador.'

    if (t.operacion === 'operarGemelo' && [...this.activas.values()].some(a => a.tarea.operacion === 'operarGemelo')) return 'Otro bombero está tomando el control del gemelo.'

    if (t.operacion === 'asignarPiton' && !this.pitones.has(t.bombero) && this.pitones.size + [...this.activas.values()].filter(a => a.tarea.operacion === 'asignarPiton' && !this.pitones.has(a.tarea.bombero!)).length >= 2) return 'Los dos pitones están asignados o reservados.'

    if (this.detallado) {

      const water = this.requisitoAgua(t)

      if (water) return water

    }

    if (t.operacion === 'cerrarPiton' && !this.pitones.has(t.bombero)) return 'Este bombero no tiene pitón.'

    if (t.operacion === 'entregarPiton' && (!this.pitones.has(t.bombero) || this.pitonesAbiertos.has(t.bombero))) return 'El emisor debe tener el pitón cerrado.'

    if (t.operacion === 'entregarPiton' && this.pitones.has(t.receptores![0]!)) return 'El receptor ya tiene otro pitón.'

    if (t.operacion === 'apoyarManguera' && !this.detallado && !this.linea) return 'Primero conectar la línea.'

    if (t.operacion === 'esperarBlanco' && !this.blancos.has(numeroBlanco(t))) return `Espera la caída del blanco ${numeroBlanco(t)}.`

    if (t.operacion === 'derribar') {

      if (!this.detallado && (!this.linea || this.gemelero === null)) return 'Falta línea conectada u operador del gemelo.'

      if (!this.detallado && !this.pitones.has(t.bombero)) return 'Asignar un pitón a este bombero.'

      if (this.blancos.has(numeroBlanco(t))) return 'Este blanco ya cayó.'

      if (numeroBlanco(t) !== this.blancos.size + 1) return `El siguiente blanco obligatorio es ${this.blancos.size + 1}.`

      if ([...this.activas.values()].some(a => a.tarea.operacion === 'derribar')) return 'Otro blanco se está derribando.'

    }

    if (t.operacion === 'recogerCamilla' && this.camilla.portador !== null && !ownStretcher) return 'La camilla está en poder de otro equipo.'

    if (['sostenerCamilla', 'entregarCamilla', 'cargarVictima', 'asegurarVictima', 'transportarVictima', 'entregarVictima'].includes(t.operacion) && !ownStretcher) return 'Primero obtener o recibir la camilla.'

    if (t.operacion === 'entregarCamilla' && this.cargada) return 'Usa Entregar víctima para una camilla ocupada.'

    if (t.operacion === 'cargarVictima' && this.cargada) return 'La víctima ya está cargada.'

    if (['asegurarVictima', 'transportarVictima', 'entregarVictima'].includes(t.operacion) && !this.cargada) return 'Primero colocar la víctima en la camilla.'

    if (['transportarVictima', 'entregarVictima'].includes(t.operacion) && !this.asegurada) return 'Primero asegurar la víctima.'

    if ((['cargarVictima', 'asegurarVictima', 'transportarVictima'].includes(t.operacion) || (t.operacion === 'recogerCamilla' && this.cargada) || (t.operacion === 'entregarVictima' && !t.receptores?.length)) && !t.ayudantes.length) return 'Asigna al menos un ayudante para esta maniobra.'

    if (t.operacion === 'entregarVictima' && t.receptores?.length && t.receptores.length < 2) return 'La víctima necesita al menos dos receptores.'

    if (ownStretcher && this.cargada && !['sostenerCamilla', 'recogerCamilla', 'asegurarVictima', 'transportarVictima', 'entregarVictima'].includes(t.operacion) && this.equipoCamilla.filter(id => !senders.includes(id)).length === 0) return 'Entrega la víctima o deja un equipo sosteniendo la camilla antes de separarte.'

    if (this.activas.size && ['sostenerCamilla', 'recogerCamilla', 'cargarVictima', 'asegurarVictima', 'transportarVictima', 'entregarVictima', 'entregarCamilla'].includes(t.operacion) && [...this.activas.values()].some(a => a.tarea.operacion.includes('Camilla') || a.tarea.operacion.includes('Victima'))) return 'Hay otra maniobra con la camilla en curso.'

    if (t.operacion === 'salir') {

      if (!this.victimaMeta) return 'La víctima debe cruzar la meta primero.'

      if (this.pitonesAbiertos.has(t.bombero)) return 'Cerrar el pitón antes de salir.'

      if (this.banderin === t.bombero && this.salidos.size !== 7) return 'El portador del banderín debe ser el último de los ocho.'

      if (this.salidos.size === 7 && this.banderin !== t.bombero) return 'El último debe llevar el banderín.'

    }

    return ''

  }

  private get detallado() { return this.estrategia.modoAgua === 'detallado' }

  private get porBlanco() { return this.estrategia.modoTendido === 'por-blanco' }

  private get segmentado() { return this.estrategia.modoConexiones === 'segmentado' }

  get oficial() { return this.estrategia.perfilTendido === 'oficial' }

  manos(id: number) { return MATERIAL_AGUA.filter(key => this.inventarioAgua[key].portador === id) }

  private manoLibre(id: number) { const used = new Set(this.manos(id).map(key => this.inventarioAgua[key].mano)); return !used.has(1) ? 1 : !used.has(2) ? 2 : null }

  private extremoLinea(id: LineaAguaId): Pose {

    const line = this.lineasAgua[id], last = line.tramos.at(-1)

    return last ? { ...this.inventarioAgua[last].trazado.at(-1)! } : { ...E.gemelo.posicion }

  }

  posicionAcople(key: string): Pose {
    if (key.startsWith('gemelo:')) return { ...E.gemelo.posicion, y: 0.14 }

    const [id, end] = key.split(':'), piece = this.inventarioAgua[id as MaterialAguaId]

    return { ...(piece?.trazado.at(end === '1' ? -1 : 0) ?? piece?.posicion ?? E.material.posicion) }

  }
  private trazadoEntrega(t: Tarea): Pose[] {
    const last = this.lineasAgua[t.linea!].tramos.at(-1)
    if (!last) return []
    const start = this.inventarioAgua[last].trazado[0]!, sides = ladosEntrega(t)
    const route = calcularRuta(start, sides.origen, this.puertaAbierta)
    if (!route) return []
    const trace = this.elevar(route).map(p => ({ ...p, y: Math.max(0.14, p.y) }))
    if (t.objetivo.startsWith('muro-')) trace.push({ x: 0, y: ACCESOS.muro.alto + 0.15, z: ACCESOS.muro.posicion.z })
    else if (sides.tubo && t.objetivo.startsWith('tubo-')) for (const z of [sides.origen.z < 0 ? -1.5 : 1.5, 0, sides.destino.z < 0 ? -1.5 : 1.5]) trace.push({ x: ACCESOS.tubo.posicion.x, z, y: 0.14 })
    trace.push({ ...sides.destino, y: 0.14 })
    return trace
  }
  private trazadoBase(id: MaterialAguaId): Pose[] {
    const piece = this.inventarioAgua[id]
    if (!this.oficial) return piece.trazado
    const lanzamiento = [...this.activas.values()].find(a => a.tarea.operacion === 'lanzarManguera' && a.tarea.materialId === id)
    if (lanzamiento) {
      const trace = lanzamientoOficial(id), progress = lanzamiento.tarea.duracion ? (lanzamiento.elapsed - lanzamiento.traslado) / lanzamiento.tarea.duracion : Number(lanzamiento.elapsed >= lanzamiento.traslado)
      return trazadoParcial(lanzamiento.tarea.extremo === 1 ? trace.reverse() : trace, progress)
    }
    const cambio = [...this.activas.values()].find(a => a.tarea.operacion === 'reacomodarLinea' && this.lineasAgua[a.tarea.linea!].tramos.includes(id))
    if (cambio) {
      const trace = tramoTendido(numeroBlanco(cambio.tarea), id, 'oficial')?.trazado
      const progress = cambio.tarea.duracion ? (cambio.elapsed - cambio.traslado) / cambio.tarea.duracion : Number(cambio.elapsed >= cambio.traslado)
      if (trace) return interpolarPorPasos(piece.trazado, trace, progress)
    }
    const relevo = [...this.activas.values()].find(a => a.tarea.operacion === 'entregarPiton' && a.tarea.conManguera && this.lineasAgua[a.tarea.linea!].tramos.at(-1) === id)
    if (relevo?.entrega) {
      const fin = this.trazadoEntrega(relevo.tarea), cerca = fin.slice(0, -2)
      const progress = relevo.traslado ? Math.min(1, relevo.elapsed / relevo.traslado) : 1
      if (relevo.elapsed < relevo.traslado) return interpolarPorPasos(piece.trazado, cerca, progress)
      const ratio = relevo.tarea.duracion ? Math.min(1, (relevo.elapsed - relevo.traslado) / relevo.tarea.duracion) : 1
      return [...cerca.slice(0, -1), ...trazadoParcial(fin.slice(-3), ratio)]
    }
    return piece.trazado
  }

  private trazadoLineaActual(linea: LineaAguaId): Pose[] {
    const result: Pose[] = []
    for (const id of this.lineasAgua[linea].tramos) {
      const tramo = this.trazadoBase(id)
      if (!tramo.length) continue
      const ultimo = result.at(-1), primero = tramo[0]!
      result.push(...(ultimo && distancia(ultimo, primero) < 0.001 ? tramo.slice(1) : tramo))
    }
    return result
  }
  agarre(id: number, mano: number | null = 0): Pose {
    const p = this.poses[id]!, agachado = Math.abs(p.x - ACCESOS.tubo.posicion.x) < ACCESOS.tubo.diametro / 2 && Math.abs(p.z) < ACCESOS.tubo.largo / 2
    return { x: p.x + (mano === 1 ? -.28 : .28), y: p.y + (agachado ? .4 : .85), z: p.z }
  }
  trazadoVisual(id: MaterialAguaId): Pose[] {
    let trace = this.trazadoBase(id)
    if (!this.oficial || trace.length < 2) return curvarManguera(trace, this.puertaAbierta)
    const connection = this.conexionesAgua.find(c => (c.a === `${id}:1` && c.b.startsWith('P')) || (c.b === `${id}:1` && c.a.startsWith('P')))
    const nozzleId = connection && (connection.a.startsWith('P') ? connection.a : connection.b) as MaterialAguaId | undefined
    const nozzle = nozzleId ? this.inventarioAgua[nozzleId] : null
    if (nozzle?.portador !== null && nozzle) {
      const end = trace.at(-1)!, hand = nozzle.posicion
      const route = calcularRuta(end, hand, this.puertaAbierta)
      if (route) {
        const tail = this.elevar(route).map(p => ({ ...p, y: Math.max(.14, p.y) }))
        trace = [...trace, ...tail.slice(1), { ...hand }]
        if (validarTrazadoManguera(trace, this.puertaAbierta)) trace = this.trazadoBase(id)
      }
    }
    return curvarManguera(trace, this.puertaAbierta)
  }
  private nodosTarea(t: Tarea): string[] {

    return t.conectarA && t.materialId ? [t.materialId.startsWith('M') ? `${t.materialId}:${t.extremo ?? 0}` : t.materialId, t.conectarA] : []

  }

  private conectado(key: string) { return this.conexionesAgua.find(c => c.a === key || c.b === key) }

  private recorrerRed(inicio: string) {

    const nodos = new Set<string>(), tramos: MaterialAguaId[] = [], pitones: MaterialAguaId[] = [], pendientes = [inicio]

    while (pendientes.length) {

      const key = pendientes.pop()!

      if (nodos.has(key)) continue

      nodos.add(key)

      const [id, end] = key.split(':'), piece = this.inventarioAgua[id as MaterialAguaId]

      if (piece?.tipo === 'manguera' && piece.trazado.length) { if (!tramos.includes(piece.id)) tramos.push(piece.id); pendientes.push(`${id}:${end === '0' ? 1 : 0}`) }

      if (piece?.tipo === 'piton' && !pitones.includes(piece.id)) pitones.push(piece.id)

      for (const c of this.conexionesAgua) if (c.a === key || c.b === key) pendientes.push(c.a === key ? c.b : c.a)

    }

    return { nodos, tramos, pitones }

  }

  private refrescarRed() {

    const visitadas = new Set<MaterialAguaId>()

    this.conjuntosManguera = []

    for (const piece of Object.values(this.inventarioAgua)) piece.linea = null

    for (const id of ['A', 'B'] as const) {

      const red = this.recorrerRed(`gemelo:${id}`), line = this.lineasAgua[id]

      line.tramos = red.tramos; line.piton = red.pitones[0] ?? null; line.conectada = red.tramos.length > 0

      for (const key of [...red.tramos, ...red.pitones]) { this.inventarioAgua[key].linea = id; visitadas.add(key) }

    }

    for (const id of MANGUERAS) {

      const piece = this.inventarioAgua[id]

      if (visitadas.has(id) || !piece.trazado.length) continue

      const red = this.recorrerRed(`${id}:0`)

      for (const key of red.tramos) visitadas.add(key)

      this.conjuntosManguera.push({ id: `conjunto-${id}`, linea: 'A', tramos: red.tramos, piton: red.pitones[0] ?? null, estado: piece.estado === 'abandonado' ? 'abandonado' : 'separado' })

    }

    for (const piece of Object.values(this.inventarioAgua)) if (piece.trazado.length && piece.estado !== 'abandonado') piece.estado = this.conectado(`${piece.id}:0`) || this.conectado(`${piece.id}:1`) ? 'conectado' : 'desplegado'

    this.linea = Object.values(this.lineasAgua).some(l => l.conectada)

  }

  private requisitoMaterial(t: Tarea): string | null {

    const ids = materialesTarea(t), id = t.bombero!, piece = t.materialId ? this.inventarioAgua[t.materialId] : undefined

    const nuevos = ['prepararLlaves', 'dejarMaterial', 'recogerMaterial', 'despresurizar']

    const recursos = [...ids, ...this.nodosTarea(t)]

    if ([...this.activas.values()].some(a => {

      const otros = [...materialesTarea(a.tarea), ...this.nodosTarea(a.tarea)]

      // Las conexiones reservan acoples; las recogidas/entregas reservan la pieza completa.

      const conexiones = ['conectarManguera', 'conectarPiton'].includes(t.operacion) && ['conectarManguera', 'conectarPiton'].includes(a.tarea.operacion)

      return conexiones ? this.nodosTarea(t).some(n => this.nodosTarea(a.tarea).includes(n)) : recursos.some(n => otros.some(o => o.split(':')[0] === n.split(':')[0]))

    })) return 'Pieza o acople reservado por otra tarea.'

    if (t.operacion === 'prepararLlaves') {

      if (ids.some(key => this.inventarioAgua[key].estado !== 'material')) return 'Las dos llaves deben estar disponibles.'

      return this.manoLibre(id) === null ? 'Se necesita una mano libre para el par de llaves.' : ''

    }

    if (t.operacion === 'dejarMaterial') return !ids.length || ids.some(key => this.inventarioAgua[key].portador !== id || this.inventarioAgua[key].estado !== 'portado') ? 'Debes portar el material suelto que vas a dejar.' : ''

    if (t.operacion === 'recogerMaterial') {

      if (ids.length !== 1 || this.inventarioAgua[ids[0]!]!.estado !== 'depositado') return 'Selecciona una pieza depositada en el piso.'

      return this.manoLibre(id) === null ? 'El bombero tiene las dos manos ocupadas.' : ''

    }

    if (t.operacion === 'despresurizar') return !t.linea || this.lineasAgua[t.linea].activa ? 'Corta el suministro antes de despresurizar.' : ''

    if (!this.oficial) return nuevos.includes(t.operacion) ? '' : null
    if (t.operacion === 'entregarPiton' && t.conManguera) {
      const trace = this.trazadoEntrega(t)
      if (trace.length < 2) return 'No hay una manguera conectada con recorrido válido para entregar.'
      const error = validarTrazadoManguera(trace, this.puertaAbierta)
      if (error) return error
    }
    if (t.operacion === 'lanzarManguera') {

      if (!piece || piece.portador !== id || piece.estado !== 'portado') return `B${id} debe portar ${t.materialId}.`

      if (!zona(this.poses[id]!)) return 'Primero ingresar a la cancha.'

      const trace = lanzamientoOficial(piece.id)

      return trace.length < 2 ? 'Esta pieza queda de reserva; no tiene un lanzamiento definido en el perfil oficial.' : validarTrazadoManguera(trace, this.puertaAbierta) ?? ''

    }

    if (['conectarManguera', 'conectarPiton'].includes(t.operacion)) {

      if (!piece || !t.conectarA) return 'Selecciona la pieza y el acople de destino.'

      if (t.operacion === 'conectarPiton' && (piece.portador !== id || piece.estado !== 'portado')) return `B${id} debe portar ${piece.id}.`

      if (piece.tipo === 'manguera' && !piece.trazado.length) return `${piece.id} debe lanzarse primero.`

      const [a, b] = this.nodosTarea(t) as [string, string]

      if (this.conectado(a) || this.conectado(b)) return 'Uno de los acoples ya está ocupado.'

      if (this.recorrerRed(a).nodos.has(b)) return 'La conexión cerraría un circuito sobre sí mismo.'

      if (b.startsWith('M') && !this.inventarioAgua[b.split(':')[0] as MaterialAguaId]?.trazado.length) return 'El tramo receptor debe estar desplegado.'

      if (t.operacion === 'conectarManguera' && distancia(this.posicionAcople(a), this.posicionAcople(b)) > 1) return `Acoples discontinuos: ${a} y ${b} deben coincidir a menos de 1 m.`

      for (const line of Object.values(this.lineasAgua)) if (this.recorrerRed(`gemelo:${line.id}`).nodos.has(a) || this.recorrerRed(`gemelo:${line.id}`).nodos.has(b)) {

        if (line.activa || this.presionPendiente.has(line.id)) return `Corta y despresuriza la línea ${line.id} antes de conectar.`

      }

      const redA = this.recorrerRed(a), redB = this.recorrerRed(b)

      if (redA.pitones.length + redB.pitones.length > 1) return 'Retira el pitón anterior antes de unir los conjuntos.'

      if (['gemelo:A', 'gemelo:B'].every(n => redA.nodos.has(n) || redB.nodos.has(n))) return 'No conectar entre sí las dos salidas del gemelo.'

      return ''

    }

    if (['separarLinea', 'desconectarManguera', 'desconectarPiton'].includes(t.operacion)) {

      if (!piece || !t.linea) return 'Selecciona pieza y línea.'

      if (this.presionPendiente.has(t.linea)) return 'Primero despresurizar la línea.'

    }

    if (t.operacion === 'cerrarPiton' && piece && this.conectado(piece.id)) return piece.portador === id ? '' : 'El bombero debe portar el pitón.'
    if (t.operacion === 'dejarPitonLinea' && piece) {
      if (piece.portador !== id || !this.conectado(piece.id) || this.pitonesAbiertos.has(id)) return 'Debes portar el pitón conectado y cerrado.'
      const red = this.recorrerRed(piece.id)
      return Object.values(this.lineasAgua).some(l => l.activa && red.nodos.has(`gemelo:${l.id}`)) ? 'Corta el suministro antes de dejar la línea.' : ''
    }
    return null

  }

  private requisitoAgua(t: Tarea): string {

    const extension = this.requisitoMaterial(t)

    if (extension !== null) return extension

    const id = t.bombero!, piece = t.materialId ? this.inventarioAgua[t.materialId] : null

    if (['prepararManguera', 'prepararPiton', 'prepararLlave'].includes(t.operacion)) {

      if (!piece || piece.estado !== 'material') return `${t.materialId ?? 'La pieza'} ya fue preparada o no está disponible.`

      if (this.manoLibre(id) === null) return `B${id} ya tiene sus dos manos ocupadas.`

      if ([...this.activas.values()].some(a => a.tarea.materialId === t.materialId)) return `${t.materialId} está reservado por otra tarea.`

    }

    if (t.operacion === 'lanzarManguera') {

      if (!piece || piece.tipo !== 'manguera' || piece.portador !== id || piece.estado !== 'portado') return `B${id} debe portar ${t.materialId}.`

      if (!zona(this.poses[id]!)) return 'La manguera solo puede lanzarse después de ingresar a la cancha.'

      if (this.porBlanco) {

        const plantilla = plantillaTendido(numeroBlanco(t), this.estrategia.perfilTendido), tramo = t.materialId ? tramoTendido(numeroBlanco(t), t.materialId, this.estrategia.perfilTendido) : undefined

        if (!plantilla || !tramo || plantilla.linea !== t.linea) return 'La manguera no corresponde a la plantilla seleccionada.'

        const line = this.lineasAgua[plantilla.linea], posicion = plantilla.piezas.indexOf(piece.id)

        if (line.activa) return `Corta la Línea ${plantilla.linea} antes de añadir un tramo.`

        if (posicion !== line.tramos.length || !line.tramos.every((item, index) => item === plantilla.piezas[index])) return `${piece.id} no es el siguiente tramo de Línea ${plantilla.linea}.`

        if (distancia(tramo.trazado[0]!, this.extremoLinea(plantilla.linea)) > 1) return `El origen de ${piece.id} no coincide con el acople libre de Línea ${plantilla.linea}.`

        const traceError = validarTrazadoManguera(tramo.trazado, this.puertaAbierta)

        if (traceError) return traceError

      }

    }

    if (t.operacion === 'conectarManguera') {

      if (!piece || piece.tipo !== 'manguera' || piece.estado !== 'desplegado') return `${t.materialId} debe estar desplegada y sin conectar.`

      const line = this.lineasAgua[t.linea!]

      if (line.activa) return `Corta la Línea ${t.linea} antes de modificarla.`

      if (distancia(piece.trazado[0]!, this.extremoLinea(t.linea!)) > 1) return `El origen de ${piece.id} no coincide con el extremo libre de Línea ${t.linea}.`

    }

    if (t.operacion === 'desconectarManguera') {

      if (!piece || piece.tipo !== 'manguera' || piece.estado !== 'conectado' || piece.linea !== t.linea) return `${t.materialId} no está conectada a Línea ${t.linea}.`

      const line = this.lineasAgua[t.linea!]

      if (line.activa) return `Corta la Línea ${t.linea} antes de desconectar.`

      if (line.tramos.at(-1) !== piece.id) return `Solo se puede desconectar el último tramo de Línea ${t.linea}.`

    }

    if (t.operacion === 'separarLinea') {

      if (!this.segmentado) return 'Actualiza los tendidos para usar relevos segmentados.'

      if (!piece || piece.tipo !== 'manguera' || piece.estado !== 'conectado' || piece.linea !== t.linea) return `${t.materialId} no está conectada a Línea ${t.linea}.`

      const line = this.lineasAgua[t.linea!], index = line.tramos.indexOf(piece.id)

      if (line.activa) return `Corta la Línea ${t.linea} antes de separar.`

      if (index <= 0) return 'La separación necesita dejar al menos un tramo conectado al gemelo.'

      if (line.piton === null) return `Línea ${t.linea} no tiene pitón para separar el conjunto aguas abajo.`

    }

    if (t.operacion === 'recogerManguera') {

      if (!piece || piece.tipo !== 'manguera' || piece.estado !== 'desplegado' || piece.linea !== null) return `${t.materialId} debe estar desconectada y desplegada.`

      if (this.manoLibre(id) === null) return `B${id} ya tiene sus dos manos ocupadas.`

    }

    if (t.operacion === 'reacomodarLinea') {

      const plantilla = plantillaTendido(numeroBlanco(t), this.estrategia.perfilTendido), line = plantilla ? this.lineasAgua[plantilla.linea] : null

      if (!plantilla || !line || plantilla.linea !== t.linea) return 'No existe una plantilla válida para esta línea y blanco.'

      if (!line.tramos.length || !line.tramos.every((item, index) => item === plantilla.piezas[index])) return `Los tramos conectados no corresponden al inicio de la plantilla del blanco ${plantilla.blanco}.`

      if (line.tramos.length > plantilla.piezas.length) return `Sobran tramos para el blanco ${plantilla.blanco}.`

      const nozzle = line.piton ? this.inventarioAgua[line.piton] : null

      if (nozzle?.portador !== null && nozzle?.portador !== undefined && this.pitonesAbiertos.has(nozzle.portador)) return 'Cierra el pitón antes de reacomodar la línea.'

      if (line.tramos.length !== plantilla.piezas.length && line.activa) return `Corta la Línea ${line.id} antes de cambiar su cantidad de tramos.`

      if (validarTrazadoManguera(plantilla.tramos.flatMap(segment => segment.trazado), this.puertaAbierta)) return 'La plantilla cruza un cierre; revisa muro, tubo o puerta.'

    }

    if (t.operacion === 'conectarPiton') {

      if (!piece || piece.tipo !== 'piton' || piece.portador !== id || piece.estado !== 'portado') return `B${id} debe portar ${t.materialId}.`

      const line = this.lineasAgua[t.linea!]

      if (!line.conectada || !line.tramos.length) return `Línea ${t.linea} todavía no tiene mangueras conectadas al gemelo.`

      if (line.activa) return `Corta la Línea ${t.linea} antes de conectar el pitón.`

      if (line.piton) return `Línea ${t.linea} ya tiene un pitón conectado.`

    }

    if (t.operacion === 'desconectarPiton') {

      if (!piece || piece.tipo !== 'piton' || piece.portador !== id || piece.estado !== 'conectado') return `B${id} debe portar el pitón conectado.`

      const line = this.lineasAgua[t.linea!]

      if (line.activa) return `Corta la Línea ${t.linea} antes de desconectar el pitón.`

      if (line.piton !== piece.id) return `${piece.id} no está conectado a Línea ${t.linea}.`

      if (this.pitonesAbiertos.has(id)) return 'Cierra el pitón antes de desconectarlo.'

    }

    if (t.operacion === 'dejarPitonLinea') {

      if (!piece || piece.tipo !== 'piton' || piece.portador !== id) return `B${id} debe portar ${t.materialId}.`

      const line = this.lineasAgua[t.linea!], conjunto = this.conjuntosManguera.find(group => group.piton === piece.id)

      if ((line.piton !== piece.id && !conjunto) || line.activa || this.pitonesAbiertos.has(id)) return 'Cierra y corta la línea antes de dejar el pitón.'

    }

    if (['abrirLinea', 'cortarLinea'].includes(t.operacion)) {

      if (this.gemelero !== id) return `B${id} debe operar el gemelo para controlar el agua.`

      const line = this.lineasAgua[t.linea!]

      if (t.operacion === 'abrirLinea') {

        if (!line.conectada || !line.tramos.length || !line.piton) return `Línea ${t.linea} necesita continuidad y pitón conectado.`

        if (line.activa) return `Línea ${t.linea} ya está abierta.`

        if (Object.values(this.lineasAgua).some(l => l.activa)) return 'Corta la otra línea antes de abrir esta salida.'

      } else if (!line.activa) return `Línea ${t.linea} ya está cortada.`

    }

    if (t.operacion === 'apoyarManguera' && !this.lineasAgua[t.linea!].activa) return `Línea ${t.linea} debe tener agua.`

    if (t.operacion === 'derribar') {

      const line = this.lineasAgua[t.linea!], nozzle = line.piton ? this.inventarioAgua[line.piton] : null

      if (this.gemelero === null || !line.conectada || !line.activa || !nozzle) return `Línea ${t.linea} no tiene continuidad, agua y pitón.`

      if (nozzle.portador !== id) return `B${id} debe portar el pitón conectado a Línea ${t.linea}.`

      if (this.porBlanco && line.tendidoActual !== numeroBlanco(t)) return `Línea ${t.linea} no coincide con la plantilla del blanco ${numeroBlanco(t)}.`

    }

    if (t.operacion === 'cerrarPiton') {

      const line = this.lineasAgua[t.linea!], nozzle = line.piton ? this.inventarioAgua[line.piton] : null

      if (!nozzle || nozzle.portador !== id) return `B${id} no porta el pitón de Línea ${t.linea}.`

    }

    if (t.operacion === 'entregarPiton') {

      if (!piece || piece.portador !== id) return `B${id} debe portar ${t.materialId}.`

      if (this.lineasAgua[t.linea!].activa) return `Corta la Línea ${t.linea} antes del relevo.`

      const receiver = t.receptores?.[0]

      if (receiver && this.manoLibre(receiver) === null) return `B${receiver} necesita una mano libre para recibir ${piece.id}.`

    }

    return ''

  }

  private construir(t: Tarea): EjecucionActiva | string {

    const end = this.destino(t), rutas: Record<number, Pose[]> = {}, recorridos: Record<number, number> = {}

    const aproximaciones: Record<number, Pose[]> = {}

    const isCarry = ['transportarVictima', 'entregarVictima', 'entregarCamilla', 'cargarVictima'].includes(t.operacion)

    const senders = emisores(t), reunionPoint = { ...this.camilla.posicion, y: 0 }

    let traslado = 0, reunion = 0

    // Reunir al equipo antes de mover el recurso. Un relevo reúne cada lado por separado.

    if (isCarry) for (const id of senders) {

      const target = this.formacion(reunionPoint, senders.indexOf(id))

      const route = calcularRuta(this.poses[id]!, target, this.puertaAbierta)

      if (!route) return 'No hay recorrido para reunirse con la camilla.'

      aproximaciones[id] = this.elevar(route)

      reunion = Math.max(reunion, this.longitud(aproximaciones[id]!) / this.estrategia.bomberos[id]!.velocidad)

    }

    if (this.oficial && t.operacion === 'reacomodarLinea') {
      const trazadoActual = this.trazadoLineaActual(t.linea!)
      for (const [slot, id] of equipo(t).entries()) {
        const target = this.posicionEquipoPiton(trazadoActual, slot) ?? this.poses[id]!
        const route = calcularRuta(this.poses[id]!, target, this.puertaAbierta)
        if (!route) return 'No hay paso para alcanzar el acople de trabajo.'
        aproximaciones[id] = this.elevar(route)
        reunion = Math.max(reunion, this.longitud(aproximaciones[id]!) / this.estrategia.bomberos[id]!.velocidad)
      }
    }
    for (const id of equipo(t)) {

      const receiving = t.receptores?.includes(id) ?? false

      const slot = receiving ? t.receptores!.indexOf(id) : senders.indexOf(id)

      if (this.oficial && t.operacion === 'reacomodarLinea') {
        const start = aproximaciones[id]?.at(-1) ?? this.poses[id]!
        rutas[id] = [{ ...start }]
        recorridos[id] = 0
        continue
      }

      let target = receiving ? ladosEntrega(t).destino : end

      if (t.operacion === 'reacomodarLinea') {

        const couplings = plantillaTendido(numeroBlanco(t), this.estrategia.perfilTendido)?.tramos.filter(tramo => !this.oficial || zona(tramo.trazado.at(-1)!) === zona(end)).map(tramo => tramo.trazado.at(-1)!) ?? []

        const index = equipo(t).length === 1 ? couplings.length - 1 : Math.round(slot * Math.max(0, couplings.length - 1) / Math.max(1, equipo(t).length - 1))

        target = couplings[Math.max(0, this.oficial ? (slot === 0 ? couplings.length - 1 : Math.max(0, couplings.length - 1 - slot)) : index)] ?? target
      }

      if (this.oficial && t.operacion === 'derribar') {
        const trace = plantillaTendido(numeroBlanco(t), 'oficial')!.tramos.flatMap((tramo, index) => index ? tramo.trazado.slice(1) : tramo.trazado)
        target = this.posicionEquipoPiton(trace, slot) ?? target
      }
      const arranged = (isCarry || esEntrega(t) || t.operacion === 'sostenerCamilla') ? this.formacion(target, slot) : target

      const start = aproximaciones[id]?.at(-1) ?? this.poses[id]!, raw = calcularRuta(start, arranged, this.puertaAbierta)

      if (!raw) return 'No hay recorrido habilitado; comprueba la puerta y los accesos.'

      const path: Pose[] = [{ ...start }]

      if (['retirarBanderin', 'esperarBlanco', 'cerrarPiton'].includes(t.operacion)) { rutas[id] = path; recorridos[id] = 0; continue }

      for (let i = 1; i < raw.length; i++) {

        const a = raw[i - 1]!, b = raw[i]!

        if (a.z <= 25 && b.z > 25 && !['salir', 'transportarVictima'].includes(t.operacion)) return 'El recorrido cruzaría la meta: utiliza la tarea Cruzar meta.'

        if (a.x * b.x < 0) { const ratio = -a.x / (b.x - a.x), z = a.z + ratio * (b.z - a.z); if (Math.abs(z - ACCESOS.muro.posicion.z) < 1) path.push(punto(0, z, ACCESOS.muro.alto + 0.3)) }

        path.push(punto(b.x, b.z))

      }

      if (t.operacion === 'subirEscala') path.push({ ...end })

      rutas[id] = path

      recorridos[id] = path.slice(1).reduce((s, b, i) => s + distancia(path[i]!, b), 0)

      traslado = Math.max(traslado, recorridos[id]! / this.estrategia.bomberos[id]!.velocidad)

    }

    // Un solo recorrido central para que el equipo de transporte no se disperse.

    if (isCarry) {

      const center = rutas[t.bombero!]!

      for (const id of t.ayudantes) {

        rutas[id] = this.rutaFormacion(center, senders.indexOf(id))

        recorridos[id] = this.longitud(rutas[id]!)

        traslado = Math.max(traslado, recorridos[id]! / this.estrategia.bomberos[id]!.velocidad)

      }

    }

    const active: EjecucionActiva = { tarea: t, rutas, recorridos, aproximaciones, reunion, traslado: reunion + traslado, elapsed: 0, total: reunion + traslado + t.duracion }

    if (this.oficial && t.operacion === 'reacomodarLinea') { active.traslado = reunion; active.total = reunion + t.duracion }

    if (esEntrega(t)) active.entrega = { ...ladosEntrega(t), origen: { ...end, y: 0.5 }, destino: { ...objetivo(t.objetivo).posicion, y: 0.5 } }

    if (this.cargada && isCarry) {

      const path = [...rutas[t.bombero!]!, ...(active.entrega ? [active.entrega.destino] : [])]

      for (let i = 0; i < path.length; i++) {

        const a = path[Math.max(0, i - 1)]!, b = path[i]!, count = Math.max(1, Math.ceil(distancia(a, b) / 0.2))

        for (let j = 0; j <= count; j++) { const at = { x: a.x + (b.x - a.x) * j / count, y: 0, z: a.z + (b.z - a.z) * j / count }, z = zona(at); if (z && idsZona(z).some(n => !this.blancos.has(n))) return `Víctima bloqueada: quedan blancos en Zona ${z}.` }

      }

    }

    if (t.operacion === 'retirarBanderin' && [...this.activas.values()].some(a => a.tarea.operacion === 'retirarBanderin')) return 'Otro bombero está retirando el banderín.'

    return active

  }

  private longitud(path: Pose[]) { return path.slice(1).reduce((s, b, i) => s + distancia(path[i]!, b), 0) }

  private elevar(raw: { x: number; z: number }[]): Pose[] {

    const path: Pose[] = []

    raw.forEach((b, i) => { const a = raw[i - 1]; if (a && a.x * b.x < 0) { const z = a.z + (-a.x / (b.x - a.x)) * (b.z - a.z); if (Math.abs(z - ACCESOS.muro.posicion.z) < 1) path.push(punto(0, z, ACCESOS.muro.alto + 0.3)) }; path.push(punto(b.x, b.z)) })

    return path

  }

  private posicionEquipoPiton(trazado: Pose[], slot: number): Pose | null {
    if (!trazado.length) return null
    const extremo = trazado.at(-1)!, distanciaObjetivo = Math.max(0, slot) * 1.2
    const separar = (position: Pose) => {
      const dx = position.x - extremo.x, dz = position.z - extremo.z, distanciaDirecta = Math.hypot(dx, dz)
      const minima = slot * 0.75
      if (!minima || distanciaDirecta >= minima || distanciaDirecta < 0.001) return position
      return { x: extremo.x + dx / distanciaDirecta * minima, y: 0, z: extremo.z + dz / distanciaDirecta * minima }
    }
    let restante = distanciaObjetivo
    for (let index = trazado.length - 1; index > 0; index--) {
      const fin = trazado[index]!, inicio = trazado[index - 1]!
      const largo = Math.hypot(fin.x - inicio.x, fin.z - inicio.z)
      if (restante <= largo) {
        const proporcion = largo ? restante / largo : 0
        return separar({ x: fin.x + (inicio.x - fin.x) * proporcion, y: 0, z: fin.z + (inicio.z - fin.z) * proporcion })
      }
      restante -= largo
    }
    const inicio = trazado[0]!
    return separar({ x: inicio.x, y: 0, z: inicio.z })
  }

  private formacion(p: Pose, slot: number): Pose {

    if (!slot || p.y > 0.1 || Math.abs(p.x) < 1 || Math.abs(p.z) < 1 || Math.abs(p.z) > 24) return { ...p }

    const shifts = [[0, 0], [0, 0.65], [0, -0.65], [0.65, 0], [-0.65, 0], [0.65, 0.65], [-0.65, -0.65], [0.65, -0.65]][slot % 8]!
    const q = { ...p, x: p.x + shifts[0]!, z: p.z + shifts[1]! }

    return segmentoValido(p, q, this.puertaAbierta) ? q : { ...p }

  }

  private rutaFormacion(center: Pose[], slot: number): Pose[] {

    const path = center.map(p => this.formacion(p, slot))

    for (let i = 1; i < path.length; i++) if (!segmentoValido(path[i - 1]!, path[i]!, this.puertaAbierta)) { path[i - 1] = { ...center[i - 1]! }; path[i] = { ...center[i]! } }

    return path

  }

  private schedule() {

    if (this.erroresAgua.length || this.errorIngreso) {

      const reason = this.errorIngreso || this.erroresAgua[0]!

      Object.values(this.estados).forEach(s => { if (s.estado !== 'completada') { s.estado = 'bloqueada'; s.motivo = reason } })

      this.bloqueada = true; return

    }

    for (const t of this.estrategia.tareas) {

      const state = this.estados[t.id]!

      if (['completada', 'en-curso'].includes(state.estado)) continue

      const reason = this.requisito(t)

      const built = reason || this.construir(t)

      if (typeof built === 'string') { state.estado = 'bloqueada'; state.motivo = built; continue }

      state.estado = 'en-curso'; state.motivo = ''; state.inicio = this.tiempo; this.activas.set(t.id, built)

      if (['recogerCamilla', 'sostenerCamilla', 'cargarVictima', 'asegurarVictima', 'transportarVictima', 'entregarCamilla', 'entregarVictima'].includes(t.operacion) && this.camilla.portador !== null && !['recogerCamilla'].includes(t.operacion)) { this.camilla.portador = t.bombero; this.equipoCamilla = emisores(t) }

      else if (!['recogerCamilla'].includes(t.operacion)) {

        this.equipoCamilla = this.equipoCamilla.filter(id => !equipo(t).includes(id))

        if (this.cargada && this.camilla.portador !== null && !this.equipoCamilla.includes(this.camilla.portador) && this.equipoCamilla.length) this.camilla.portador = this.equipoCamilla[0]!

      }

      equipo(t).forEach(id => { this.roles[id] = t.receptores?.includes(id) ? 'Recibiendo · ' + OPERACIONES[t.operacion].nombre : t.operacion === 'derribar' ? `${id === t.bombero ? 'Pitonero' : 'Apoyo de mangueras'} · Blanco ${numeroBlanco(t)}` : OPERACIONES[t.operacion].nombre; if (id === this.apoyo && t.operacion !== 'apoyarManguera') this.apoyo = null })

    }

    this.finalizada = this.estrategia.tareas.length > 0 && Object.values(this.estados).every(s => s.estado === 'completada')

    this.bloqueada = !this.finalizada && this.activas.size === 0

    this.resultadoValido = this.victimaMeta && this.salidos.size === 8 && this.banderin !== null && (!this.detallado || MATERIAL_AGUA.every(id => this.inventarioAgua[id].ingresada))

  }

  private terminarMaterial(a: EjecucionActiva): boolean {
    const t = a.tarea, id = t.bombero!, ids = materialesTarea(t), piece = t.materialId ? this.inventarioAgua[t.materialId] : undefined
    if (t.herramientas?.length && ['recogerHerramientas', 'entregarHerramientas', 'dejarHerramientas'].includes(t.operacion)) {
      for (const key of t.herramientas) {
        const tool = this.herramientasIndividuales[key]
        tool.portador = t.operacion === 'recogerHerramientas' ? id : t.operacion === 'entregarHerramientas' ? t.receptores?.[0] ?? null : null
        tool.posicion = { ...(t.operacion === 'entregarHerramientas' ? objetivo(t.objetivo).posicion : this.poses[id]!), y: 0.12 }
      }
      return true
    }
    if (t.operacion === 'prepararLlaves') {
      const mano = this.manoLibre(id)
      for (const key of ids) Object.assign(this.inventarioAgua[key], { estado: 'portado', portador: id, mano })
      return true
    }
    if (t.operacion === 'dejarMaterial') {
      ids.forEach((key, i) => { const item = this.inventarioAgua[key]; Object.assign(item, { estado: 'depositado', portador: null, mano: null, posicion: { ...this.poses[id]!, x: this.poses[id]!.x + (Number(key.slice(1)) % 4) * 0.5, z: this.poses[id]!.z + Math.floor(Number(key.slice(1)) / 4) * 0.4 + i * 0.15, y: 0.15 } }); if (item.tipo === 'piton') this.pitones.delete(id) })
      return true
    }
    if (t.operacion === 'recogerMaterial') {
      const item = this.inventarioAgua[ids[0]!]!
      Object.assign(item, { estado: 'portado', portador: id, mano: this.manoLibre(id) }); if (item.tipo === 'piton') this.pitones.add(id)
      return true
    }
    if (t.operacion === 'despresurizar') { this.presionPendiente.delete(t.linea!); return true }
    if (!this.oficial) return false
    if (t.operacion === 'lanzarManguera' && piece) {
      Object.assign(piece, { estado: 'desplegado', portador: null, mano: null, trazado: lanzamientoOficial(piece.id) }); piece.posicion = { ...piece.trazado.at(-1)! }; return true
    }
    if (['conectarManguera', 'conectarPiton'].includes(t.operacion) && piece) {
      const [a, b] = this.nodosTarea(t) as [string, string]; this.conexionesAgua.push({ a, b })
      piece.estado = 'conectado'; this.refrescarRed(); return true
    }
    if (['separarLinea', 'desconectarManguera', 'desconectarPiton'].includes(t.operacion) && piece) {
      const key = piece.tipo === 'piton' ? piece.id : `${piece.id}:${t.extremo ?? 0}`
      this.conexionesAgua = this.conexionesAgua.filter(c => c.a !== key && c.b !== key)
      if (piece.tipo === 'piton') piece.estado = 'portado'
      this.lineasAgua[t.linea!].tendidoActual = null; this.refrescarRed(); return true
    }
    if (t.operacion === 'dejarPitonLinea' && piece) {
      const red = this.recorrerRed(piece.id)
      for (const key of [...red.tramos, ...red.pitones]) Object.assign(this.inventarioAgua[key], { estado: 'abandonado', portador: null, mano: null })
      const connection = this.conectado(piece.id), hoseEnd = connection && (connection.a === piece.id ? connection.b : connection.a)
      const last = hoseEnd?.split(':')[0] as MaterialAguaId | undefined, end = last ? this.inventarioAgua[last].trazado.at(-1) : null
      piece.posicion = end ? { ...end } : { ...this.poses[id]!, y: .14 }; this.pitones.delete(id); this.refrescarRed(); return true
    }
    if (t.operacion === 'abrirLinea') this.presionPendiente.add(t.linea!)
    if (t.operacion === 'entregarPiton' && t.conManguera && piece) {
      const last = this.lineasAgua[t.linea!].tramos.at(-1)!
      const trace = this.trazadoEntrega(t)
      this.inventarioAgua[last].trazado = trace; this.inventarioAgua[last].posicion = { ...trace.at(-1)! }; this.lineasAgua[t.linea!].tendidoActual = null
    }
    return false
  }
  private terminar(a: EjecucionActiva) {
    const t = a.tarea, id = t.bombero!
    if (!this.terminarMaterial(a)) switch (t.operacion) {
      case 'recogerHerramientas': this.herramientas.portador = id; break

      case 'entregarHerramientas': this.herramientas = { portador: t.receptores?.[0] ?? null, posicion: { ...objetivo(t.objetivo).posicion } }; break

      case 'abrirPuerta': this.puertaAbierta = true; break

      case 'dejarHerramientas': this.herramientas = { portador: null, posicion: { ...this.poses[id]!, y: 0.12 } }; break

      case 'conectarLinea': this.linea = true; break

      case 'operarGemelo': this.gemelero = id; break

      case 'asignarPiton': this.pitones.add(id); break

      case 'prepararManguera': case 'prepararPiton': case 'prepararLlave': {

        const piece = this.inventarioAgua[t.materialId!]!; piece.estado = 'portado'; piece.portador = id; piece.mano = this.manoLibre(id); if (piece.tipo === 'piton') this.pitones.add(id); break

      }

      case 'lanzarManguera': {

        const piece = this.inventarioAgua[t.materialId!]!, plantilla = this.porBlanco ? tramoTendido(numeroBlanco(t), piece.id, this.estrategia.perfilTendido) : null

        piece.estado = 'desplegado'; piece.portador = null; piece.mano = null; piece.trazado = (plantilla?.trazado ?? a.rutas[id]!).map(p => ({ ...p })); piece.posicion = { ...piece.trazado.at(-1)! }; break

      }

      case 'conectarManguera': {

        const piece = this.inventarioAgua[t.materialId!]!, line = this.lineasAgua[t.linea!]!; piece.estado = 'conectado'; piece.linea = t.linea!; line.tramos.push(piece.id); line.conectada = true; this.linea = true

        const plantilla = this.porBlanco ? plantillaTendido(numeroBlanco(t), this.estrategia.perfilTendido) : null

        line.tendidoActual = plantilla && line.tramos.length === plantilla.piezas.length && line.tramos.every((item, index) => item === plantilla.piezas[index]) ? plantilla.blanco : null

        break

      }

      case 'desconectarManguera': {

        const piece = this.inventarioAgua[t.materialId!]!, line = this.lineasAgua[t.linea!]!; line.tramos.pop(); line.conectada = line.tramos.length > 0; line.tendidoActual = null

        piece.estado = 'desplegado'; piece.linea = null; piece.posicion = { ...piece.trazado[0]! }; break

      }

      case 'separarLinea': {

        const line = this.lineasAgua[t.linea!]!, index = line.tramos.indexOf(t.materialId!)

        const tramos = line.tramos.splice(index), piton = line.piton!

        line.piton = null; line.conectada = line.tramos.length > 0; line.tendidoActual = null

        this.conjuntosManguera.push({ id: `separado-${t.id}`, linea: line.id, tramos, piton, estado: 'separado' })

        for (const materialId of [...tramos, piton]) { const piece = this.inventarioAgua[materialId]; piece.linea = null }

        break

      }

      case 'recogerManguera': {

        const piece = this.inventarioAgua[t.materialId!]!; piece.estado = 'portado'; piece.portador = id; piece.mano = this.manoLibre(id); piece.trazado = []; break

      }

      case 'reacomodarLinea': {

        const plantilla = plantillaTendido(numeroBlanco(t), this.estrategia.perfilTendido)!, line = this.lineasAgua[plantilla.linea]

        line.tramos.forEach(materialId => { const tramo = tramoTendido(plantilla.blanco, materialId, this.estrategia.perfilTendido)!; const piece = this.inventarioAgua[materialId]; piece.trazado = tramo.trazado.map(p => ({ ...p })); piece.posicion = { ...piece.trazado.at(-1)! } })

        line.tendidoActual = line.tramos.length === plantilla.piezas.length ? plantilla.blanco : null; break

      }

      case 'conectarPiton': {

        const piece = this.inventarioAgua[t.materialId!]!, line = this.lineasAgua[t.linea!]!; piece.estado = 'conectado'; piece.linea = t.linea!; line.piton = piece.id; break

      }

      case 'desconectarPiton': {

        const piece = this.inventarioAgua[t.materialId!]!, line = this.lineasAgua[t.linea!]!

        line.piton = null; piece.estado = 'portado'; piece.linea = null; break

      }

      case 'dejarPitonLinea': {

        const piece = this.inventarioAgua[t.materialId!]!, line = this.lineasAgua[t.linea!]!

        const conjunto = this.conjuntosManguera.find(group => group.piton === piece.id)

        const target = conjunto ?? { id: `abandonado-${t.id}`, linea: line.id, tramos: [...line.tramos], piton: piece.id, estado: 'abandonado' as const }

        target.estado = 'abandonado'

        if (!conjunto) { this.conjuntosManguera.push(target); line.tramos = []; line.piton = null; line.conectada = false; line.tendidoActual = null }

        piece.posicion = { ...this.poses[id]!, y: 0.2 }

        for (const materialId of [...target.tramos, piece.id]) { const item = this.inventarioAgua[materialId]; item.estado = 'abandonado'; item.portador = null; item.mano = null; item.linea = null }

        break

      }

      case 'abrirLinea': this.lineasAgua[t.linea!]!.activa = true; break

      case 'cortarLinea': this.lineasAgua[t.linea!]!.activa = false; break

      case 'apoyarManguera': this.apoyo = id; break

      case 'derribar': this.blancos.add(numeroBlanco(t)); this.pitonesAbiertos.add(id); break

      case 'cerrarPiton': this.pitonesAbiertos.delete(id); break

      case 'entregarPiton': {

        const receiver = t.receptores![0]!; this.pitones.delete(id); this.pitones.add(receiver)

        if (this.detallado && t.materialId) { const piece = this.inventarioAgua[t.materialId]; piece.portador = receiver; piece.mano = this.manoLibre(receiver) }

        break

      }

      case 'recogerCamilla': this.camilla.portador = id; this.equipoCamilla = emisores(t); break

      case 'sostenerCamilla': this.camilla.portador = id; this.equipoCamilla = emisores(t); break

      case 'entregarCamilla': case 'entregarVictima': this.camilla = { portador: t.receptores?.[0] ?? null, posicion: { ...objetivo(t.objetivo).posicion, y: 0.5 } }; this.equipoCamilla = [...(t.receptores ?? [])]; break

      case 'cargarVictima': this.cargada = true; break

      case 'asegurarVictima': this.asegurada = true; break

      case 'retirarBanderin': this.banderin = id; break

      case 'salir': this.salidos.add(id); break

      case 'transportarVictima': if (t.objetivo === 'salida') { this.victimaMeta = true; this.camilla.portador = null; this.equipoCamilla = [] } break

    }

    if (this.gemelero === id && distancia(this.poses[id]!, objetivo('gemelo').posicion) > 3) this.gemelero = null

    this.estados[t.id]!.estado = 'completada'; this.estados[t.id]!.progreso = 1; this.estados[t.id]!.fin = this.tiempo

    this.activas.delete(t.id); this.eventos.push({ tiempo: this.tiempo, tarea: t.id, texto: t.nombre })

    equipo(t).forEach(id => this.roles[id] = this.salidos.has(id) ? 'Finalizado' : this.gemelero === id ? 'Operando gemelo' : this.equipoCamilla.includes(id) ? 'Sosteniendo camilla' : 'Esperando')

  }

  tick(dt: number) {

    if (!Number.isFinite(dt) || dt < 0 || this.finalizada || this.bloqueada) return

    // Pasos acotados: la velocidad de reproducción no omite condiciones ni eventos.

    let remaining = dt

    while (remaining > 0 && !this.finalizada && !this.bloqueada) {

      const step = Math.min(remaining, 0.05); remaining -= step; this.tiempo += step

      Object.values(this.estados).forEach(s => { if (['pendiente', 'bloqueada'].includes(s.estado)) s.espera += step })

      for (const a of [...this.activas.values()]) {

        a.elapsed = Math.min(a.total, a.elapsed + step)

        for (const [key, path] of Object.entries(a.rutas)) {

          const id = Number(key), approaching = a.elapsed < a.reunion

          const currentPath = approaching ? a.aproximaciones[id] ?? [this.poses[id]!] : path

          const length = approaching ? this.longitud(currentPath) : a.recorridos[id]!

          const elapsed = approaching ? a.elapsed : a.elapsed - a.reunion, duration = approaching ? a.reunion : a.traslado - a.reunion

          const target = Math.min(length, duration > 0 ? elapsed / duration * length : length)

          let left = target; const before = this.poses[id]!

          for (let i = 1; i < currentPath.length; i++) { const start = currentPath[i - 1]!, end = currentPath[i]!, length = distancia(start, end); if (left <= length || i === currentPath.length - 1) { const t = length ? Math.min(1, left / length) : 1; this.poses[id] = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t, z: start.z + (end.z - start.z) * t }; break } left -= length }

          if (this.oficial && a.tarea.operacion === 'reacomodarLinea' && a.elapsed >= a.traslado) {
            const slot = equipo(a.tarea).indexOf(id), trace = this.trazadoLineaActual(a.tarea.linea!)
            const position = this.posicionEquipoPiton(trace, slot)
            if (position) this.poses[id] = position
          }
          const dx = this.poses[id]!.x - before.x, dz = this.poses[id]!.z - before.z, moved = Math.hypot(dx, dz)
          if (moved > .0001) this.direcciones[id] = { x: dx / moved, z: dz / moved }
          this.distancias[id]! += distancia(before, this.poses[id]!)

          if (zona(this.poses[id]!)) this.ingresaron.add(id)

        }

        this.estados[a.tarea.id]!.progreso = a.total ? a.elapsed / a.total : 1

        if (a.tarea.operacion === 'derribar' && a.elapsed >= a.traslado) {

          const position = this.poses[a.tarea.bombero!]!, b = BLANCOS[numeroBlanco(a.tarea) - 1]!

          if (zona(position) !== b.zona || Math.abs(position.x) < 0.25 || Math.abs(position.z) < 0.25 || Math.abs(position.x) > 24.75 || Math.abs(position.z) > 24.75) { this.estados[a.tarea.id]!.estado = 'bloqueada'; this.estados[a.tarea.id]!.motivo = 'El pitonero debe tener ambos pies dentro de la zona.'; this.activas.delete(a.tarea.id); continue }

        }

        this.actualizarRecursos(a)

        if (a.elapsed >= a.total) this.terminar(a)

      }

      this.actualizarRecursos()

      if (this.detallado && this.ingresaron.size === 8 && !MATERIAL_AGUA.every(id => this.inventarioAgua[id].ingresada)) {

        const outside = MATERIAL_AGUA.filter(id => !this.inventarioAgua[id].ingresada)

        this.errorIngreso = `Ingresaron los ocho bomberos, pero falta material: ${outside.join(', ')}.`

        this.activas.clear()

      }

      this.schedule()

    }

  }

  private actualizarRecursos(active?: EjecucionActiva) {
    for (const [key, tool] of Object.entries(this.herramientasIndividuales)) if (tool.portador !== null) tool.posicion = { ...this.poses[tool.portador]!, x: this.poses[tool.portador]!.x + (key === 'TNT' ? -0.4 : 0.4), y: this.poses[tool.portador]!.y + 0.5 }
    if (this.herramientas.portador !== null) this.herramientas.posicion = { ...this.poses[this.herramientas.portador]!, y: this.poses[this.herramientas.portador]!.y + 0.5 }

    const carry = [...this.activas.values()].find(a => ['transportarVictima', 'entregarCamilla', 'entregarVictima', 'cargarVictima'].includes(a.tarea.operacion) && a.elapsed >= a.reunion)

    if (this.camilla.portador !== null && (carry || !this.cargada)) this.camilla.posicion = { ...this.poses[this.camilla.portador]!, y: this.poses[this.camilla.portador]!.y + 0.5 }

    if (this.detallado) for (const key of MATERIAL_AGUA) {

      const piece = this.inventarioAgua[key]

      if (piece.portador !== null) {

        const carrier = this.poses[piece.portador]!
        piece.posicion = this.agarre(piece.portador, piece.mano)
        if (piece.id === 'L2') piece.posicion.z += .15
        if (zona(carrier)) piece.ingresada = true

      }

    }

    const entregas = [...this.activas.values()]

    if (active && !entregas.includes(active)) entregas.push(active)

    for (const active of entregas) if (active.entrega && active.elapsed >= active.traslado) {

      const ratio = active.tarea.duracion ? Math.min(1, (active.elapsed - active.traslado) / active.tarea.duracion) : 1, { origen, destino } = active.entrega

      const resource = active.tarea.operacion === 'entregarHerramientas' ? this.herramientas : active.tarea.operacion === 'entregarPiton' ? null : this.camilla

      if (resource) resource.posicion = { x: origen.x + (destino.x - origen.x) * ratio, z: origen.z + (destino.z - origen.z) * ratio, y: 0.5 + Math.sin(Math.PI * ratio) * (active.entrega.tubo ? 0 : 1.5) }
      if (active.tarea.operacion === 'entregarHerramientas' && active.tarea.herramientas) for (const key of active.tarea.herramientas) this.herramientasIndividuales[key].posicion = { x: origen.x + (destino.x - origen.x) * ratio, z: origen.z + (destino.z - origen.z) * ratio, y: 0.5 + Math.sin(Math.PI * ratio) * (active.entrega.tubo ? 0 : 1.5) }
      if (active.tarea.operacion === 'entregarPiton' && active.tarea.materialId) {

        const piece = this.inventarioAgua[active.tarea.materialId], receiver = active.tarea.receptores![0]!
        const from = this.agarre(active.tarea.bombero!, piece.mano), to = this.agarre(receiver, this.manoLibre(receiver))
        const points = [from]
        if (active.tarea.objetivo.startsWith('muro-')) points.push({ x: 0, z: ACCESOS.muro.posicion.z, y: ACCESOS.muro.alto + .2 })
        else if (active.tarea.objetivo.startsWith('tubo-')) for (const z of [origen.z < 0 ? -1.5 : 1.5, 0, destino.z < 0 ? -1.5 : 1.5]) points.push({ x: ACCESOS.tubo.posicion.x, y: .4, z })
        points.push(to)
        // Interpolación de mano a mano a través del portal fijo.
        const scaled = ratio * (points.length - 1), index = Math.min(points.length - 2, Math.floor(scaled)), f = scaled - index
        const a = points[index]!, b = points[index + 1]!
        piece.posicion = { x: a.x + (b.x-a.x)*f, y: a.y + (b.y-a.y)*f, z: a.z + (b.z-a.z)*f }

      }

    }

    if (this.cargada) this.victima = { ...this.camilla.posicion, y: this.camilla.posicion.y + 0.15 }

  }

}

