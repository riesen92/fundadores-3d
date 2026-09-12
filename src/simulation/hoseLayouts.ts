import type { LineaAguaId, MaterialAguaId } from './water.ts'
import { ACCESOS } from '../data/cancha.ts'
import { BLANCOS } from '../data/blancos.ts'
import { segmentoValido } from './routes.ts'

export interface PuntoTendido { x: number; y: number; z: number }
export interface TramoTendido { materialId: MaterialAguaId; trazado: PuntoTendido[] }
export interface PlantillaTendido {
  blanco: number
  linea: LineaAguaId
  piezas: MaterialAguaId[]
  tramos: TramoTendido[]
}

const p = (x: number, z: number, y = 0.14): PuntoTendido => ({ x, y, z })
const muro = () => p(0, ACCESOS.muro.posicion.z, ACCESOS.muro.alto + 0.15)

// Los puntos siguen los croquis aportados, expresados sobre la cancha de 50 x 50 m.
// Se ordenan desde el gemelo hasta el pitón. Blanco 6 reutiliza el recorrido de 5.
const definiciones: Array<{ blanco: number; linea: LineaAguaId; piezas: MaterialAguaId[]; puntos: PuntoTendido[] }> = [
  { blanco: 1, linea: 'A', piezas: ['M1', 'M2'], puntos: [p(-12.5, -23), p(-13, -17), p(-17, -10), p(-21, -1)] },
  { blanco: 2, linea: 'A', piezas: ['M1', 'M2'], puntos: [p(-12.5, -23), p(-11.5, -18), p(-7, -15), p(-4, -18)] },
  { blanco: 3, linea: 'B', piezas: ['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10'], puntos: [p(-12.5, -23), p(-7, -18), muro(), p(7, -8), p(12.5, -3), p(12.5, 3), p(8, 9), p(3, 12.5), p(0, 12.5), p(-3, 12.5), p(-8, 10), p(-4, 4)] },
  { blanco: 4, linea: 'B', piezas: ['M3', 'M4', 'M5', 'M6', 'M7', 'M8'], puntos: [p(-12.5, -23), p(-7, -18), muro(), p(7, -8), p(12.5, -3), p(12.5, 3), p(8, 9), p(3, 12.5), p(0, 12.5), p(-3, 12.5), p(-3, 16), p(-3, 20)] },
  { blanco: 5, linea: 'B', piezas: ['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'], puntos: [p(-12.5, -23), p(-7, -18), muro(), p(7, -8), p(12.5, -3), p(12.5, 3), p(9, 9), p(8, 16), p(2, 20)] },
  { blanco: 6, linea: 'B', piezas: ['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'], puntos: [p(-12.5, -23), p(-7, -18), muro(), p(7, -8), p(12.5, -3), p(12.5, 3), p(9, 7), p(5, 6), p(1, 4)] },
  { blanco: 7, linea: 'B', piezas: ['M3', 'M4', 'M5'], puntos: [p(-12.5, -23), p(-10, -18), p(-4, -13), muro(), p(2.5, -8), p(1, -4)] },
  { blanco: 8, linea: 'B', piezas: ['M3', 'M4', 'M5', 'M6'], puntos: [p(-12.5, -23), p(-9, -18), p(-3, -14), muro(), p(7, -10), p(14, -7), p(20, -4), p(22, -2)] },
]

const distancia = (a: PuntoTendido, b: PuntoTendido) => Math.hypot(a.x - b.x, a.z - b.z)
const lerp = (a: PuntoTendido, b: PuntoTendido, t: number): PuntoTendido => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })

function puntoEnDistancia(puntos: PuntoTendido[], buscada: number): PuntoTendido {
  let restante = buscada
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!, b = puntos[i]!, longitud = distancia(a, b)
    if (restante <= longitud || i === puntos.length - 1) return lerp(a, b, longitud ? Math.min(1, restante / longitud) : 1)
    restante -= longitud
  }
  return { ...puntos.at(-1)! }
}

function dividir(puntosBase: PuntoTendido[], piezas: MaterialAguaId[]): TramoTendido[] {
  // Los portales son puntos fijos: suavizarlos movería la manguera a través de un cierre.
  const puntos = puntosBase.map(point => ({ ...point }))
  const total = puntos.slice(1).reduce((suma, punto, i) => suma + distancia(puntos[i]!, punto), 0)
  const limites = Array.from({ length: piezas.length + 1 }, (_, i) => total * i / piezas.length)
  return piezas.map((materialId, index) => {
    const inicio = limites[index]!, fin = limites[index + 1]!, trazado: PuntoTendido[] = [puntoEnDistancia(puntos, inicio)]
    let recorrida = 0
    for (let i = 1; i < puntos.length; i++) {
      const largo = distancia(puntos[i - 1]!, puntos[i]!), siguiente = recorrida + largo
      if (siguiente > inicio && siguiente < fin) trazado.push({ ...puntos[i]! })
      recorrida = siguiente
    }
    trazado.push(puntoEnDistancia(puntos, fin))
    return { materialId, trazado }
  })
}

export const TENDIDOS_POR_BLANCO: Record<number, PlantillaTendido> = Object.fromEntries(definiciones.map(def => [def.blanco, { blanco: def.blanco, linea: def.linea, piezas: def.piezas, tramos: dividir(def.puntos, def.piezas) }]))

// El relevo tras el blanco 6 ocurre exactamente en la boca IV del tubo.
// M3–M6 siguen hacia el gemelo; M7–M9 quedan con P2 al otro lado.
TENDIDOS_POR_BLANCO[6]!.tramos = [
  ...dividir([p(-12.5, -23), p(-7, -18), muro(), p(7, -8), p(12.5, -3), p(12.5, -1.5)], ['M3', 'M4', 'M5', 'M6']),
  ...dividir([p(12.5, -1.5), p(12.5, 3), p(9, 7), p(5, 6), p(1, 4)], ['M7', 'M8', 'M9']),
]

const oficialesIniciales: Record<string, PuntoTendido[]> = {
  M1: [p(-12.5, -23), p(-10, -10)],
  M2: [p(-10, -10), p(-21, -1)],
  M3: [p(2, -12.5), p(7, -3)],
  M4: [p(7, -3), p(9, -18)],
  M5: [p(9, -18), p(12.5, -1.5)],
  M6: [p(12.5, -1.5), p(12.5, 0), p(12.5, 1.5), p(12.5, 3)],
}
export const lanzamientoOficial = (id: MaterialAguaId) => oficialesIniciales[id]?.map(p => ({ ...p })) ?? []
export const TENDIDOS_OFICIALES: Record<number, PlantillaTendido> = {}
for (let blanco = 1; blanco <= 8; blanco++) {
  const piezas = Array.from({ length: blanco <= 2 ? 2 : blanco <= 6 ? 6 : 5 }, (_, i) => `M${i + 1}` as MaterialAguaId)
  const tramos = piezas.map(materialId => ({ materialId, trazado: lanzamientoOficial(materialId) }))
  if (blanco === 2) tramos[1]!.trazado = [p(-10, -10), p(-7, -15), p(-4, -18)]
  if (blanco >= 3) tramos[1]!.trazado = [p(-10, -10), p(-2, -12.5), muro(), p(2, -12.5)]
  if (blanco >= 3 && blanco <= 6) {
    const tail = blanco <= 4 ? [p(8, 9), p(3, 12.5), p(0, 12.5), p(-3, 12.5), ...(blanco === 3 ? [p(-8, 10), p(-4, 4)] : [p(-3, 16), p(-3, 20)])] : blanco === 5 ? [p(9, 9), p(8, 16), p(2, 20)] : [p(9, 7), p(5, 6), p(1, 4)]
    tramos[5]!.trazado.push(...tail)
  }
  if (blanco >= 7) tramos[4]!.trazado = [p(9, -18), p(5, -10), ...(blanco === 7 ? [p(2.5, -8), p(1, -4)] : [p(14, -7), p(20, -4), p(22, -2)])]
  const target = BLANCOS[blanco - 1]!
  tramos.at(-1)!.trazado[tramos.at(-1)!.trazado.length - 1] = p(target.posicion.x + Math.sin(target.orientacion) * 2.5, target.posicion.z + Math.cos(target.orientacion) * 2.5)
  TENDIDOS_OFICIALES[blanco] = { blanco, linea: 'A', piezas, tramos }
}
export const plantillaTendido = (blanco: number, perfil: 'croquis' | 'oficial' = 'croquis') => (perfil === 'oficial' ? TENDIDOS_OFICIALES : TENDIDOS_POR_BLANCO)[blanco]
export const tramoTendido = (blanco: number, materialId: MaterialAguaId, perfil: 'croquis' | 'oficial' = 'croquis') => plantillaTendido(blanco, perfil)?.tramos.find(t => t.materialId === materialId)

// Mantener el prefijo común fijo y recoger/extender la cola por sus propios pasos.
// Evita interpolar directamente a través de un cierre al cambiar de zona.
export function interpolarPorPasos(origen: PuntoTendido[], destino: PuntoTendido[], progreso: number): PuntoTendido[] {
  const t = Math.max(0, Math.min(1, progreso))
  if (t === 0) return origen
  if (t === 1) return destino
  let comunes = 0
  while (comunes < Math.min(origen.length, destino.length) && distancia(origen[comunes]!, destino[comunes]!) < 0.001 && origen[comunes]!.y === destino[comunes]!.y) comunes++
  if (!comunes) return t < 0.5 ? origen : destino
  const base = origen.slice(0, comunes), cola = t < 0.5 ? origen.slice(comunes - 1) : destino.slice(comunes - 1)
  return [...base.slice(0, -1), ...(trazadoParcial(cola, t < 0.5 ? 1 - t * 2 : t * 2 - 1).length ? trazadoParcial(cola, t < 0.5 ? 1 - t * 2 : t * 2 - 1) : [base.at(-1)!])]
}

export function trazadoParcial(trazado: PuntoTendido[], progreso: number): PuntoTendido[] {
  if (trazado.length < 2 || progreso <= 0) return []
  const total = trazado.slice(1).reduce((suma, punto, i) => suma + distancia(trazado[i]!, punto), 0), buscada = total * Math.min(1, progreso)
  const result = [{ ...trazado[0]! }]; let recorrida = 0
  for (let i = 1; i < trazado.length; i++) {
    const a = trazado[i - 1]!, b = trazado[i]!, largo = distancia(a, b)
    if (recorrida + largo >= buscada) {
      const extremo = lerp(a, b, largo ? (buscada - recorrida) / largo : 1)
      // Evitar segmentos de menos de 1 mm, ambiguos para la tolerancia de cierres.
      if (distancia(a, extremo) >= 0.001 || Math.abs(a.y - extremo.y) >= 0.001) result.push(extremo)
      break
    }
    result.push({ ...b }); recorrida += largo
  }
  return result
}

export function interpolarTrazado(origen: PuntoTendido[], destino: PuntoTendido[], progreso: number): PuntoTendido[] {
  if (!origen.length) return destino.map(punto => ({ ...punto }))
  const cantidad = Math.max(origen.length, destino.length, 2), muestrear = (puntos: PuntoTendido[], i: number) => {
    const total = puntos.slice(1).reduce((suma, punto, j) => suma + distancia(puntos[j]!, punto), 0)
    return puntoEnDistancia(puntos, total * i / (cantidad - 1))
  }
  return Array.from({ length: cantidad }, (_, i) => lerp(muestrear(origen, i), muestrear(destino, i), Math.min(1, Math.max(0, progreso))))
}

export function validarTrazadoManguera(trazado: PuntoTendido[], puertaAbierta: boolean): string | null {
  for (let i = 1; i < trazado.length; i++) {
    const a = trazado[i - 1]!, b = trazado[i]!
    if (!segmentoValido(a, b, puertaAbierta)) return 'La manguera atraviesa un cierre; usa muro, tubo o puerta habilitada.'
    const cruzaMuro = a.x * b.x <= 0 && Math.min(a.z, b.z) < 0
    if (cruzaMuro) {
      const ratio = a.x === b.x ? 0 : -a.x / (b.x - a.x)
      const z = a.z + (b.z - a.z) * ratio, y = a.y + (b.y - a.y) * ratio
      if (Math.abs(z - ACCESOS.muro.posicion.z) > ACCESOS.muro.ancho / 2 || y < ACCESOS.muro.alto + 0.15 - 0.01) return 'El cruce de Zona I a IV debe elevarse sobre el muro.'
    }
  }
  return null
}

// Holgura local: conserva extremos y portales; rechaza curvas que corten cierres.
export function curvarManguera(points: PuntoTendido[], puertaAbierta: boolean): PuntoTendido[] {
  if (points.length < 2) return points
  const result = [points[0]!]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!, length = distancia(a, b)
    const interior = a.x * b.x > 0 && a.z * b.z > 0 && Math.min(Math.abs(a.x), Math.abs(b.x), Math.abs(a.z), Math.abs(b.z)) > 1.5 && a.y < .3 && b.y < .3
    const bend = interior ? Math.min(.55, length * .035) : 0
    const curve = Array.from({ length: 13 }, (_, j) => {
      const t = j / 12, q = lerp(a, b, t), offset = Math.sin(Math.PI * t) ** 2 * bend
      return { x: q.x - (b.z - a.z) / (length || 1) * offset, y: q.y, z: q.z + (b.x - a.x) / (length || 1) * offset }
    })
    result.push(...(bend && !validarTrazadoManguera(curve, puertaAbierta) ? curve.slice(1) : [b]))
  }
  return result
}
