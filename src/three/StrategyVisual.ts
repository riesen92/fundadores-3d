import * as THREE from 'three'
import { ELEMENTOS as E } from '../data/elementos'
import { BLANCOS } from '../data/blancos'
import { equipo, numeroBlanco } from '../simulation/tasks'
import type { Pose } from '../simulation/tasks'
import type { TaskEngine } from '../simulation/TaskEngine'
import type { Cancha } from './cancha/Cancha'
import { box } from './primitives'
import { MANGUERAS, MATERIAL_AGUA, posicionMaterialAgua } from '../simulation/water'
import { interpolarTrazado, trazadoParcial, tramoTendido } from '../simulation/hoseLayouts'
export class StrategyVisual extends THREE.Group {
  private hoses = new Map<number, THREE.Line>()
  private jets = new Map<number, THREE.Line>()
  private paths = new Map<number, THREE.Line>()
  private nozzles = new Map<number, THREE.Group>()
  private waterSegments = new Map<string, THREE.Mesh>()
  private waterCouplings = new Map<string, THREE.Mesh>()
  private mostrarRecorridos = false
  private bomberoSeleccionado: number | null = null
  private straps = new THREE.Group()
  private flag = new THREE.Group()
  constructor() {
    super(); this.add(this.straps, this.flag)
    for (const z of [-0.55, 0.55]) box(this.straps, [1.1, 0.08, 0.15], [0, 0.35, z], '#26434d')
    box(this.flag, [0.05, 1.3, 0.05], [0, 0.65, 0], '#e6e6d6'); box(this.flag, [0.8, 0.5, 0.04], [0.4, 1, 0], '#e8a443')
    for (let id = 1; id <= 8; id++) {
      const nozzle = new THREE.Group(); box(nozzle, [0.18, 0.18, 0.7], [0, 0, 0], '#d8c681'); box(nozzle, [0.25, 0.25, 0.2], [0, 0, -0.3], '#343f42'); nozzle.visible = false; this.nozzles.set(id, nozzle); this.add(nozzle)
      for (const [map, color] of [[this.hoses, '#e0b95e'], [this.jets, '#46c7ff'], [this.paths, '#b86038']] as const) { const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true })); map.set(id, line); this.add(line); line.visible = false }
    }
    for (const id of MANGUERAS) {
      const line = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: '#d92323', roughness: .85 })); line.visible = false; this.waterSegments.set(id, line); this.add(line)
      const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.42, 10), new THREE.MeshStandardMaterial({ color: '#171b1a', roughness: 0.65 })); coupling.visible = false; coupling.castShadow = true; this.waterCouplings.set(id, coupling); this.add(coupling)
      const start = coupling.clone(); start.visible = false; this.waterCouplings.set(`${id}:start`, start); this.add(start)
    }
    this.straps.visible = false; this.flag.position.set(E.escala.posicion.x, E.escala.alto, E.escala.posicion.z)
  }
  private line(line: THREE.Line, points: Pose[]) { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, p.y, p.z))) }
  setPathsVisible(visible: boolean) { this.mostrarRecorridos = visible; this.paths.forEach((line, id) => line.visible = visible && id === this.bomberoSeleccionado && line.userData.tieneRecorrido === true) }
  preview(paths: Record<number, Pose[]>, selected: number | null) {
    this.bomberoSeleccionado = selected
    for (const [id, line] of this.paths) { const points = paths[id] ?? []; line.userData.tieneRecorrido = points.length > 1; line.visible = this.mostrarRecorridos && id === selected && line.userData.tieneRecorrido; if (points.length > 1) this.line(line, points.map(p => ({ ...p, y: 0.12 }))); (line.material as THREE.LineBasicMaterial).opacity = 1 }
  }
  reset(cancha: Cancha) {
    cancha.objetos.herramientas!.visible = true
    cancha.herramientasIndividuales.forEach(o => o.visible = false)
    for (const key of ['TNT', 'Halligan']) { const label = cancha.etiquetasElementos.getObjectByName(`herramienta-${key}`); if (label) label.visible = false }
    const toolsLabel = cancha.etiquetasElementos.getObjectByName('elemento-herramientas'); if (toolsLabel) toolsLabel.visible = true
    for (const group of Object.values(cancha.objetos)) group.position.set(0, 0, 0)
    for (const [key, e] of Object.entries(E)) cancha.etiquetasElementos.getObjectByName(`elemento-${key}`)?.position.set(e.posicion.x, 2.8, e.posicion.z)
    cancha.blancos.forEach(b => b.levantar()); this.hoses.forEach(l => l.visible = false); this.jets.forEach(l => l.visible = false); this.paths.forEach(l => { l.visible = false; l.userData.tieneRecorrido = false }); this.straps.visible = false
    this.nozzles.forEach(n => n.visible = false)
    this.waterSegments.forEach(n => n.visible = false)
    this.waterCouplings.forEach(n => n.visible = false)
    for (const id of MATERIAL_AGUA) { const object = cancha.objetosAgua.get(id), p = posicionMaterialAgua(id); if (object) { object.visible = true; object.position.set(p.x, p.y, p.z) } }
    this.flag.position.set(E.escala.posicion.x, E.escala.alto, E.escala.posicion.z)
    const door = cancha.getObjectByName('puerta-movil'); if (door) door.rotation.y = 0
  }
  renderState(e: Omit<TaskEngine, never>, cancha: Cancha, selected: number | null) {
    this.bomberoSeleccionado = selected
    const move = (key: 'herramientas' | 'camilla' | 'victima', p: Pose) => { cancha.objetos[key]!.position.set(p.x - E[key].posicion.x, p.y, p.z - E[key].posicion.z); cancha.etiquetasElementos.getObjectByName(`elemento-${key}`)?.position.set(p.x, p.y + 2.8, p.z) }
    const individuales = e.estrategia.tareas.some(t => t.herramientas?.length)
    cancha.objetos.herramientas!.visible = !individuales
    const etiquetaHerramientas = cancha.etiquetasElementos.getObjectByName('elemento-herramientas'); if (etiquetaHerramientas) etiquetaHerramientas.visible = !individuales
    for (const [key, object] of cancha.herramientasIndividuales) { const p = e.herramientasIndividuales[key as 'TNT' | 'Halligan'].posicion; object.visible = individuales; object.position.set(p.x, p.y, p.z); const texto = cancha.etiquetasElementos.getObjectByName(`herramienta-${key}`); if (texto) { texto.visible = individuales; texto.position.set(p.x, p.y + 2.8, p.z) } }
    move('herramientas', e.herramientas.posicion); move('camilla', e.camilla.posicion); move('victima', e.victima)
    cancha.blancos.forEach((b, index) => e.blancos.has(index + 1) ? b.derribar() : b.levantar())
    const door = cancha.getObjectByName('puerta-movil'); if (door) door.rotation.y = e.puertaAbierta ? Math.PI / 2 : 0
    this.straps.visible = e.asegurada; this.straps.position.set(e.camilla.posicion.x, e.camilla.posicion.y, e.camilla.posicion.z)
    if (e.banderin !== null) { const p = e.poses[e.banderin]!; this.flag.position.set(p.x + 0.4, p.y + 1.2, p.z) }
    else this.flag.position.set(E.escala.posicion.x, E.escala.alto, E.escala.posicion.z)
    const detailed = e.estrategia.modoAgua === 'detallado'
    const launches = new Map([...e.activas.values()].filter(a => a.tarea.operacion === 'lanzarManguera' && a.tarea.materialId).map(a => [a.tarea.materialId!, a]))
    const rearrangements = [...e.activas.values()].filter(a => a.tarea.operacion === 'reacomodarLinea' && a.tarea.linea)
    for (const [id, nozzle] of this.nozzles) { nozzle.visible = !detailed && e.pitones.has(id); const p = e.poses[id]!; nozzle.position.set(p.x + 0.35, p.y + 0.9, p.z) }
    const shownCouplings: Pose[] = []
    for (const id of MATERIAL_AGUA) {
      const piece = e.inventarioAgua[id], object = cancha.objetosAgua.get(id)
      const launching = launches.get(id), maneuvering = launching && launching.elapsed >= launching.traslado
      if (object) { object.visible = !detailed || piece.tipo !== 'manguera' || (!['desplegado', 'conectado', 'abandonado'].includes(piece.estado) && !maneuvering); if (detailed) { object.position.set(piece.posicion.x, piece.posicion.y, piece.posicion.z); if (piece.tipo === 'piton' && piece.portador !== null) { const attack = [...e.activas.values()].find(a => a.tarea.operacion === 'derribar' && a.tarea.bombero === piece.portador); const direction = e.direcciones[piece.portador] ?? { x: 0, z: 1 }; const target = attack ? BLANCOS[numeroBlanco(attack.tarea) - 1]!.posicion : { x: piece.posicion.x + direction.x, z: piece.posicion.z + direction.z }; object.lookAt(target.x, piece.posicion.y, target.z) } } }
      if (piece.tipo === 'manguera') {
        const conjunto = e.conjuntosManguera.find(group => group.tramos.includes(id))
        let trace: Pose[] = piece.trazado, displayLine = piece.linea ?? conjunto?.linea ?? null
        if (launching && e.estrategia.modoTendido === 'por-blanco') {
          const planned = tramoTendido(numeroBlanco(launching.tarea), id, e.estrategia.perfilTendido)?.trazado ?? []
          const progress = launching.tarea.duracion ? Math.max(0, (launching.elapsed - launching.traslado) / launching.tarea.duracion) : Number(launching.elapsed >= launching.traslado)
          trace = trazadoParcial(planned, progress); displayLine = launching.tarea.linea ?? null
        }
        const rearranging = rearrangements.find(a => a.tarea.linea && e.lineasAgua[a.tarea.linea].tramos.includes(id))
        if (rearranging) {
          const planned = tramoTendido(numeroBlanco(rearranging.tarea), id, e.estrategia.perfilTendido)?.trazado
          const progress = rearranging.tarea.duracion ? Math.max(0, (rearranging.elapsed - rearranging.traslado) / rearranging.tarea.duracion) : Number(rearranging.elapsed >= rearranging.traslado)
          if (planned) trace = interpolarTrazado(piece.trazado, planned, progress)
        }
        if (e.oficial) trace = e.trazadoVisual(id)
        const segment = this.waterSegments.get(id)!, coupling = this.waterCouplings.get(id)!; segment.visible = detailed && trace.length > 1
        coupling.visible = segment.visible
        const startCoupling = this.waterCouplings.get(`${id}:start`)!; startCoupling.visible = segment.visible
        if (segment.visible) {
          const points = trace.filter((p, i) => !i || new THREE.Vector3(p.x, p.y, p.z).distanceTo(new THREE.Vector3(trace[i-1]!.x, trace[i-1]!.y, trace[i-1]!.z)) > .0001)
          if (points.length > 1) {
            const path = new THREE.CurvePath<THREE.Vector3>()
            for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1]!.x, points[i-1]!.y, points[i-1]!.z), new THREE.Vector3(points[i]!.x, points[i]!.y, points[i]!.z)))
            // Anillos exactamente en los puntos del trazado, incluidos los portales.
            path.getPointAt = (t: number) => {
              const scaled = t * (points.length - 1), i = Math.min(points.length - 2, Math.floor(scaled)), a = points[i]!, b = points[i + 1]!
              return new THREE.Vector3(a.x, a.y, a.z).lerp(new THREE.Vector3(b.x, b.y, b.z), scaled - i)
            }
            segment.geometry.dispose(); segment.geometry = new THREE.TubeGeometry(path, (points.length - 1) * 2, .12, 6, false)
          }
          const material = segment.material as THREE.MeshStandardMaterial
          material.color.set(displayLine && e.lineasAgua[displayLine].activa && piece.estado !== 'abandonado' ? '#ed2525' : '#a82424')
          for (const [mesh, end, adjacent] of [[startCoupling, trace[0]!, trace[1]!], [coupling, trace.at(-1)!, trace.at(-2)!]] as const) {
            mesh.visible = !shownCouplings.some(p => Math.hypot(p.x-end.x, p.y-end.y, p.z-end.z) < .08)
            if (mesh.visible) shownCouplings.push(end)
            mesh.position.set(end.x, end.y, end.z)
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(end.x-adjacent.x, end.y-adjacent.y, end.z-adjacent.z).normalize())
          }

        }
      }
    }
    for (const [id, line] of this.hoses) {
      line.visible = !detailed && e.linea && e.pitones.has(id)
      if (line.visible) this.line(line, [{ ...E.gemelo.posicion, y: 0.12 }, ...(e.apoyo !== null ? [{ ...e.poses[e.apoyo]!, y: 0.12 }] : []), { ...e.poses[id]!, y: 0.8 }])
      this.jets.get(id)!.visible = false; const path = this.paths.get(id)!; path.visible = false; path.userData.tieneRecorrido = false
    }
    for (const a of e.activas.values()) {
      for (const id of equipo(a.tarea)) { const line = this.paths.get(id)!; line.userData.tieneRecorrido = true; line.visible = this.mostrarRecorridos && id === selected; (line.material as THREE.LineBasicMaterial).opacity = 1; this.line(line, [...(a.elapsed < a.reunion ? a.aproximaciones[id] ?? [] : []), ...a.rutas[id]!].map(p => ({ ...p, y: p.y + 0.12 }))) }
      if (a.tarea.operacion === 'entregarPiton' && a.entrega && a.elapsed >= a.traslado) {
        const ratio = a.tarea.duracion ? Math.min(1, (a.elapsed - a.traslado) / a.tarea.duracion) : 1, { origen, destino, tubo } = a.entrega
        this.nozzles.get(a.tarea.bombero!)!.position.set(origen.x + (destino.x - origen.x) * ratio, 0.5 + Math.sin(Math.PI * ratio) * (tubo ? 0 : 1.5), origen.z + (destino.z - origen.z) * ratio)
      }
      if (a.tarea.operacion === 'derribar' && a.elapsed >= a.traslado) { const id = a.tarea.bombero!, jet = this.jets.get(id)!, target = BLANCOS[numeroBlanco(a.tarea) - 1]!; jet.visible = true; const nozzleId = a.tarea.linea ? e.lineasAgua[a.tarea.linea].piton : null; const nozzle = nozzleId ? cancha.objetosAgua.get(nozzleId) : null; const tip = nozzle ? nozzle.localToWorld(new THREE.Vector3(0, 0, .4)) : new THREE.Vector3(e.poses[id]!.x, 1.1, e.poses[id]!.z); this.line(jet, [{ x: tip.x, y: tip.y, z: tip.z }, { ...target.posicion, y: 1.8 }]) }
    }
  }
}
