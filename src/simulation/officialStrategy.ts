import { configuracionInicial } from './baseStrategy.ts'
import { nuevaTarea } from './tasks.ts'
import type { Estrategia, Tarea, Operacion } from './tasks.ts'
import type { MaterialAguaId } from './water.ts'

// Plantilla editable: el orden por participante y las dependencias coordinan el motor común.
export function secuenciaOficial(): Estrategia {
  const tareas: Tarea[] = []
  const add = (id: string, op: Operacion, b: number, objetivo: string, extra: Partial<Tarea> = {}) => {
    const t = { ...nuevaTarea(op, b, `oficial-${id}`), objetivo, ...extra }
    if (!extra.nombre) t.nombre = `B${b} · ${t.nombre} · ${t.materialId ?? t.herramientas?.join('/') ?? objetivo}`
    t.dependencias = (extra.dependencias ?? []).map(id => `oficial-${id}`)
    tareas.push(t); return t
  }
  const agua = (id: string, op: Operacion, b: number, materialId?: MaterialAguaId, extra: Partial<Tarea> = {}) => add(id, op, b, 'material', { linea: 'A', ...(materialId ? { materialId } : {}), ...extra })
  const carga: Record<number, MaterialAguaId[]> = { 1: ['M1', 'M7'], 2: ['M8'], 3: ['M2', 'P1'], 4: ['M5'], 5: ['M6'], 6: ['M4', 'P2'], 7: ['M9', 'M10'], 8: ['M3'] }
  for (let b = 1; b <= 8; b++) for (const materialId of carga[b]!) agua(`preparar-${materialId}`, materialId.startsWith('P') ? 'prepararPiton' : 'prepararManguera', b, materialId, { nombre: `B${b} prepara ${materialId}` })
  add('llaves', 'prepararLlaves', 2, 'material')
  for (let b = 1; b <= 8; b++) add(`ingreso-${b}`, 'mover', b, 'ingreso')
  for (const [b, materiales] of [[1, ['M7']], [2, ['M8', 'L1', 'L2']], [6, ['M4']], [7, ['M9', 'M10']]] as [number, MaterialAguaId[]][]) add(`deposito-${b}`, 'dejarMaterial', b, 'deposito-iv', { materiales, nombre: `B${b} deja ${materiales.join(', ')} junto al tubo` })
  for (const b of [1, 2, 3]) add(`muro-i-${b}`, 'mover', b, 'muro-i')
  add('dejar-M1', 'dejarMaterial', 1, 'muro-i', { materialId: 'M1' })
  add('tubo-6', 'mover', 6, 'tubo-iii')
  add('dejar-P2', 'dejarMaterial', 6, 'tubo-iii', { materialId: 'P2' })
  add('tubo-7', 'mover', 7, 'tubo-iii', { dependencias: ['tubo-6'] })
  const lanzar = (id: MaterialAguaId, b: number, extremo: 0 | 1 = 0) => agua(`lanzar-${id}`, 'lanzarManguera', b, id, { objetivo: id === 'M1' || id === 'M2' ? 'blanco-1' : 'blanco-3', extremo, nombre: `B${b} lanza ${id}${extremo ? ' desde su extremo final' : ''}` })
  lanzar('M2', 3)
  agua('piton-P1', 'conectarPiton', 3, 'P1', { conectarA: 'M2:1' })
  lanzar('M5', 4)
  lanzar('M6', 5)
  agua('recoger-M4', 'recogerMaterial', 5, 'M4', { dependencias: ['deposito-6'] })
  lanzar('M4', 5)
  lanzar('M3', 8, 1)
  add('herramientas', 'recogerHerramientas', 1, 'herramientas', { herramientas: ['TNT', 'Halligan'] })
  add('herramientas-muro', 'entregarHerramientas', 1, 'muro-iv', { herramientas: ['TNT', 'Halligan'], receptores: [8] })
  add('TNT-tubo', 'entregarHerramientas', 8, 'tubo-iii', { herramientas: ['TNT'], receptores: [6] })
  add('TNT-puerta', 'mover', 6, 'puerta')
  add('Halligan-tubo', 'entregarHerramientas', 8, 'tubo-iii', { herramientas: ['Halligan'], receptores: [7] })
  add('Halligan-puerta', 'mover', 7, 'puerta')
  add('puerta', 'abrirPuerta', 6, 'puerta', { herramientas: ['TNT', 'Halligan'], ayudantes: [7] })
  add('dejar-TNT', 'dejarHerramientas', 6, 'puerta', { herramientas: ['TNT'] })
  add('dejar-Halligan', 'dejarHerramientas', 7, 'puerta', { herramientas: ['Halligan'] })
  add('tubo-8', 'mover', 8, 'tubo-iii')
  agua('recoger-P2', 'recogerMaterial', 8, 'P2', { dependencias: ['dejar-P2'] })
  agua('piton-P2', 'conectarPiton', 8, 'P2', { conectarA: 'M6:1', dependencias: ['lanzar-M6'] })
  agua('recoger-M1', 'recogerMaterial', 1, 'M1')
  lanzar('M1', 1, 1)
  agua('gemelo-M1', 'conectarManguera', 2, 'M1', { extremo: 0, conectarA: 'gemelo:A', dependencias: ['lanzar-M1'] })
  add('gemelero', 'operarGemelo', 2, 'gemelo')
  agua('union-12', 'conectarManguera', 1, 'M1', { extremo: 1, conectarA: 'M2:0', dependencias: ['lanzar-M2'] })
  agua('union-45', 'conectarManguera', 4, 'M5', { extremo: 0, conectarA: 'M4:1', dependencias: ['lanzar-M4'] })
  agua('union-34', 'conectarManguera', 5, 'M4', { extremo: 0, conectarA: 'M3:1', dependencias: ['lanzar-M3'] })
  agua('union-56', 'conectarManguera', 5, 'M6', { extremo: 0, conectarA: 'M5:1', dependencias: ['lanzar-M5'] })
  const reacomodar = (n: number, b: number, apoyo: number, dependencias: string[] = []) => agua(`reacomodar-${n}`, 'reacomodarLinea', b, undefined, { objetivo: `blanco-${n}`, ayudantes: [apoyo], dependencias, duracion: (n <= 2 ? 2 : n <= 6 ? 6 : 5) * 2 })
  const blanco = (n: number, b: number, apoyo: number, dependencias: string[] = []) => agua(`blanco-${n}`, 'derribar', b, undefined, { objetivo: `blanco-${n}`, ayudantes: [apoyo], dependencias })
  const cerrar = (n: number, b: number, piton: MaterialAguaId) => agua(`cerrar-${n}`, 'cerrarPiton', b, piton)
  const abrir = (n: number, dependencias: string[]) => agua(`abrir-${n}`, 'abrirLinea', 2, undefined, { objetivo: 'gemelo', dependencias })
  const cortar = (n: number) => agua(`cortar-${n}`, 'cortarLinea', 2, undefined, { objetivo: 'gemelo', dependencias: [`cerrar-${n}`] })
  reacomodar(1, 3, 1, ['gemelo-M1', 'union-12'])
  abrir(1, ['reacomodar-1'])
  blanco(1, 3, 1, ['abrir-1']); cerrar(1, 3, 'P1')
  reacomodar(2, 3, 1); blanco(2, 3, 1); cerrar(2, 3, 'P1'); cortar(2)
  add('espera-muro-5', 'mover', 5, 'muro-iv')
  agua('piton-muro', 'entregarPiton', 3, 'P1', { objetivo: 'muro-iv', conManguera: true, ayudantes: [1], receptores: [4], dependencias: ['cortar-2', 'espera-muro-5'], nombre: 'B1/B3 pasan M2 con P1 a B4 por el muro' })
  agua('purga-2', 'despresurizar', 4, undefined, { objetivo: 'muro-iv', ayudantes: [5] })
  agua('retirar-P1', 'desconectarPiton', 4, 'P1')
  agua('union-23', 'conectarManguera', 4, 'M2', { extremo: 1, conectarA: 'M3:0' })
  reacomodar(3, 8, 7, ['union-23', 'union-34', 'union-45', 'union-56', 'puerta'])
  abrir(3, ['reacomodar-3'])
  add('camilla', 'recogerCamilla', 6, 'camilla')
  add('camilla-tubo', 'entregarCamilla', 6, 'tubo-iv', { receptores: [4, 5] })
  add('camilla-muro', 'entregarCamilla', 4, 'muro-i', { ayudantes: [5], receptores: [1, 3] })
  add('cargar', 'cargarVictima', 1, 'victima', { ayudantes: [3] })
  add('asegurar', 'asegurarVictima', 1, 'victima', { ayudantes: [3] })
  add('victima-muro', 'transportarVictima', 1, 'muro-i', { ayudantes: [3] })
  for (let n = 3; n <= 6; n++) { if (n > 3) reacomodar(n, 8, 7); blanco(n, 8, 7, n === 3 ? ['abrir-3'] : []); cerrar(n, 8, 'P2') }
  cortar(6)
  agua('purga-6', 'despresurizar', 4, undefined, { objetivo: 'acople-tubo', ayudantes: [5], dependencias: ['cortar-6'] })
  agua('separar-M6', 'separarLinea', 4, 'M6')
  agua('abandono-P2', 'dejarPitonLinea', 8, 'P2', { dependencias: ['separar-M6'] })
  agua('P1-en-M5', 'conectarPiton', 4, 'P1', { conectarA: 'M5:1' })
  agua('P1-a-B5', 'entregarPiton', 4, 'P1', { objetivo: 'acople-tubo', receptores: [5] })
  reacomodar(7, 5, 4)
  abrir(7, ['reacomodar-7'])
  blanco(7, 5, 4, ['abrir-7']); cerrar(7, 5, 'P1')
  reacomodar(8, 5, 4); blanco(8, 5, 4); cerrar(8, 5, 'P1'); cortar(8)
  agua('abandono-P1', 'dejarPitonLinea', 5, 'P1', { dependencias: ['cortar-8'] })
  add('B2-al-muro', 'mover', 2, 'muro-i')
  add('victima-entrega-muro', 'entregarVictima', 1, 'muro-iv', { ayudantes: [2, 3], receptores: [4, 5], dependencias: ['abandono-P1', 'B2-al-muro'] })
  for (const b of [1, 2, 3]) add(`cruce-muro-${b}`, 'mover', b, 'muro-iv')
  add('victima-tubo', 'transportarVictima', 1, 'tubo-iv', { ayudantes: [2, 3, 4, 5] })
  add('sostener-tubo', 'sostenerCamilla', 1, 'camilla', { ayudantes: [2, 3, 4] })
  add('subir', 'subirEscala', 5, 'banderin', { dependencias: ['sostener-tubo'] })
  add('bandera', 'retirarBanderin', 5, 'banderin'); add('bajar', 'bajarEscala', 5, 'escala')
  add('relevo-tubo', 'entregarVictima', 1, 'tubo-iii', { ayudantes: [2, 3, 4], receptores: [6, 7, 8] })
  for (const b of [1, 2, 3, 4]) add(`cruce-tubo-${b}`, 'mover', b, 'tubo-iii')
  add('victima-meta', 'transportarVictima', 6, 'salida', { ayudantes: [1, 2, 3, 4, 7, 8], dependencias: [1, 2, 3, 4].map(b => `cruce-tubo-${b}`) })
  for (const b of [1, 2, 3, 4, 6, 7, 8]) add(`salida-${b}`, 'salir', b, 'salida', { dependencias: ['victima-meta'] })
  add('tubo-5-final', 'mover', 5, 'tubo-iii')
  add('salida-5', 'salir', 5, 'salida', { dependencias: [1, 2, 3, 4, 6, 7, 8].map(b => `salida-${b}`) })
  return { id: 'secuencia-oficial', nombre: 'Secuencia oficial B1–B8', tareas, bomberos: configuracionInicial(), modoAgua: 'detallado', modoTendido: 'por-blanco', modoConexiones: 'segmentado', perfilTendido: 'oficial' }
}
