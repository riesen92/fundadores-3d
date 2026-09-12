import { calcularRuta } from './routes.ts'
import { equipo, objetivo, ladosEntrega, esEntrega, dependenciasEfectivas, numeroBlanco } from './tasks.ts'
import { ELEMENTOS as E } from '../data/elementos.ts'
import { MATERIAL_AGUA, posicionMaterialAgua, materialesTarea } from './water.ts'
import { plantillaTendido, tramoTendido, lanzamientoOficial } from './hoseLayouts.ts'
import type { Estrategia, Pose } from './tasks.ts'
export function rutasPlanificadas(strategy: Estrategia): Record<number, Pose[]> {
  const paths: Record<number, Pose[]> = {}, completed = new Set<string>(), deps = dependenciasEfectivas(strategy.tareas)
  const tools = { ...E.herramientas.posicion }, stretcher = { ...E.camilla.posicion }
  const water = Object.fromEntries(MATERIAL_AGUA.map(id => [id, posicionMaterialAgua(id)])) as Record<typeof MATERIAL_AGUA[number], Pose>
  const waterTrace: Partial<Record<typeof MATERIAL_AGUA[number], Pose[]>> = {}
  for (let id = 1; id <= 8; id++) paths[id] = [{ x: E.inicio.posicion.x - 2.4 + (id - 1) % 4 * 1.6, y: 0, z: E.inicio.posicion.z - 1 + Math.floor((id - 1) / 4) * 1.6 }]
  for (let pass = 0; pass < strategy.tareas.length; pass++) {
    let changed = false
    for (const t of strategy.tareas) {
      if (completed.has(t.id) || deps[t.id]!.some(id => !completed.has(id))) continue
      completed.add(t.id); changed = true
      let end: Pose = { ...objetivo(t.objetivo).posicion }
      if (t.operacion === 'recogerHerramientas') end = { ...tools }
      if (['recogerCamilla', 'sostenerCamilla', 'asegurarVictima'].includes(t.operacion)) end = { ...stretcher }
      if (esEntrega(t)) end = ladosEntrega(t).origen
      if (['prepararManguera', 'prepararPiton', 'prepararLlave', 'recogerManguera', 'recogerMaterial'].includes(t.operacion) && t.materialId) end = { ...water[t.materialId] }
      const templateSegment = strategy.modoTendido === 'por-blanco' && t.materialId ? tramoTendido(numeroBlanco(t), t.materialId, strategy.perfilTendido) : undefined
      if (templateSegment && ['lanzarManguera', 'conectarManguera', 'desconectarManguera'].includes(t.operacion)) end = { ...templateSegment.trazado[0]! }
      if (t.operacion === 'desconectarManguera' && t.materialId && waterTrace[t.materialId]?.length) end = { ...waterTrace[t.materialId]![0]! }
      if (t.operacion === 'prepararLlaves') end = { ...posicionMaterialAgua('L1') }
      if (strategy.perfilTendido === 'oficial' && t.materialId) {
        if (t.operacion === 'lanzarManguera') end = { ...lanzamientoOficial(t.materialId).at(t.extremo === 1 ? -1 : 0)! }
        if (t.operacion === 'conectarManguera') end = { ...(waterTrace[t.materialId]?.at(t.extremo === 1 ? -1 : 0) ?? water[t.materialId]) }
        if (t.operacion === 'conectarPiton' && t.conectarA) { const [id, extremo] = t.conectarA.split(':'); end = { ...(waterTrace[id as typeof MATERIAL_AGUA[number]]?.at(extremo === '1' ? -1 : 0) ?? water[t.materialId]) } }
      }
      if (!['esperarBlanco', 'cerrarPiton'].includes(t.operacion)) for (const id of equipo(t)) {
        let target = t.receptores?.includes(id) ? ladosEntrega(t).destino : end
        if (t.operacion === 'reacomodarLinea') {
          const couplings = plantillaTendido(numeroBlanco(t), strategy.perfilTendido)?.tramos.map(tramo => tramo.trazado.at(-1)!) ?? [], slot = equipo(t).indexOf(id)
          const index = equipo(t).length === 1 ? couplings.length - 1 : Math.round(slot * Math.max(0, couplings.length - 1) / Math.max(1, equipo(t).length - 1))
          target = couplings[Math.max(0, index)] ?? target
        }
        const route = calcularRuta(paths[id]!.at(-1)!, target)
        if (route) paths[id]!.push(...route.slice(1).map(p => ({ ...p, y: 0 })))
      }
      if (t.operacion === 'entregarHerramientas') Object.assign(tools, objetivo(t.objetivo).posicion)
      if (['entregarCamilla', 'entregarVictima', 'transportarVictima'].includes(t.operacion)) Object.assign(stretcher, objetivo(t.objetivo).posicion)
      if (t.operacion === 'cargarVictima') Object.assign(stretcher, E.victima.posicion)
      if (t.operacion === 'dejarMaterial') for (const id of materialesTarea(t)) water[id] = { ...end }
      if (t.materialId && t.operacion === 'lanzarManguera') { waterTrace[t.materialId] = templateSegment?.trazado.map(point => ({ ...point })) ?? [end]; water[t.materialId] = { ...(templateSegment?.trazado.at(-1) ?? end) } }
      if (strategy.perfilTendido === 'oficial' && t.materialId && t.operacion === 'lanzarManguera') { waterTrace[t.materialId] = lanzamientoOficial(t.materialId); water[t.materialId] = { ...waterTrace[t.materialId]!.at(-1)! } }
      if (t.operacion === 'reacomodarLinea') for (const segment of plantillaTendido(numeroBlanco(t), strategy.perfilTendido)?.tramos ?? []) { waterTrace[segment.materialId] = segment.trazado.map(point => ({ ...point })); water[segment.materialId] = { ...segment.trazado.at(-1)! } }
      if (t.materialId && t.operacion === 'desconectarManguera') water[t.materialId] = { ...(waterTrace[t.materialId]?.[0] ?? end) }
    }
    if (!changed) break
  }
  return paths
}
