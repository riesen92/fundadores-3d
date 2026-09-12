import { ACCESOS } from '../data/cancha.ts'
import { ELEMENTOS } from '../data/elementos.ts'
import { BLANCOS } from '../data/blancos.ts'
import { LLAVES_AGUA, MANGUERAS, MATERIAL_AGUA, PITONES_AGUA, tipoMaterialAgua } from './water.ts'
import type { LineaAguaId, MaterialAguaId } from './water.ts'
import { plantillaTendido } from './hoseLayouts.ts'

export interface Pose { x: number; y: number; z: number }
export interface Objetivo { id: string; nombre: string; posicion: Pose }
const p = (x: number, z: number, y = 0): Pose => ({ x, y, z })
export const OBJETIVOS: Objetivo[] = [
  { id: 'ingreso', nombre: 'Ingreso · dentro de IV', posicion: p(24, ACCESOS.ingreso.posicion.z) },
  { id: 'muro-i', nombre: 'Muro · lado Zona I', posicion: p(-2, ACCESOS.muro.posicion.z) },
  { id: 'muro-iv', nombre: 'Muro · lado Zona IV', posicion: p(2, ACCESOS.muro.posicion.z) },
  { id: 'deposito-iv', nombre: 'Depósito de reserva · IV junto al tubo', posicion: p(15, -4) },
  { id: 'acople-c', nombre: 'Acople · lado C de IV', posicion: p(9, -18) },
  { id: 'acople-tubo', nombre: 'Acople · antes del tubo en IV', posicion: p(ACCESOS.tubo.posicion.x, -1.5) },
  ...(['herramientas', 'gemelo', 'camilla', 'victima', 'material'] as const).map(id => ({ id, nombre: ELEMENTOS[id].nombre, posicion: { ...ELEMENTOS[id].posicion } })),
  ...BLANCOS.map(b => ({ id: `blanco-${b.id}`, nombre: `Blanco ${b.id} · Zona ${b.zona}`, posicion: p(b.posicion.x + Math.sin(b.orientacion) * 2.5, b.posicion.z + Math.cos(b.orientacion) * 2.5) })),
  { id: 'tubo-iii', nombre: 'Tubo · lado Zona III', posicion: p(ACCESOS.tubo.posicion.x, 3) },
  { id: 'tubo-iv', nombre: 'Tubo · lado Zona IV', posicion: p(ACCESOS.tubo.posicion.x, -3) },
  { id: 'puerta', nombre: 'Puerta · lado Zona III', posicion: p(3.5, ACCESOS.puerta.posicion.z) },
  { id: 'puerta-ii', nombre: 'Puerta · lado Zona II', posicion: p(-3.5, ACCESOS.puerta.posicion.z) },
  { id: 'escala', nombre: 'Escala · base', posicion: { ...ELEMENTOS.escala.posicion } },
  { id: 'banderin', nombre: 'Banderín · cima de escala', posicion: { ...ELEMENTOS.escala.posicion, y: ELEMENTOS.escala.alto } },
  { id: 'salida', nombre: 'Salida / meta', posicion: p(ACCESOS.salida.posicion.x, 28) },
]
export const CATEGORIAS = ['Desplazamiento', 'Agua', 'Herramientas / entrada forzada', 'Rescate', 'Escala / banderín', 'Salida'] as const
export const OPERACIONES = {
  prepararLlaves: { nombre: 'Preparar par de llaves Storz', categoria: CATEGORIAS[1], segundos: 2, requisitos: 'L1 y L2 disponibles; juntas ocupan una mano.' },
  dejarMaterial: { nombre: 'Dejar material en el piso', categoria: CATEGORIAS[1], segundos: 1, requisitos: 'Portar las piezas sueltas elegidas.' },
  recogerMaterial: { nombre: 'Recoger material depositado', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Pieza depositada y una mano libre.' },
  despresurizar: { nombre: 'Despresurizar línea', categoria: CATEGORIAS[1], segundos: 1, requisitos: 'Suministro cortado; purga esquemática antes de modificar conexiones.' },
  mover: { nombre: 'Desplazarse', categoria: CATEGORIAS[0], segundos: 0, requisitos: 'Recorrido por pasos habilitados.' },
  recogerHerramientas: { nombre: 'Recoger herramientas', categoria: CATEGORIAS[2], segundos: 3, requisitos: 'Herramientas disponibles.' },
  entregarHerramientas: { nombre: 'Entregar herramientas por muro o tubo', categoria: CATEGORIAS[2], segundos: 4, requisitos: 'Llevar herramientas; equipos preparados a ambos lados del paso.' },
  abrirPuerta: { nombre: 'Realizar entrada forzada', categoria: CATEGORIAS[2], segundos: 8, requisitos: 'Tener las herramientas en la puerta.' },
  conectarLinea: { nombre: 'Conectar línea al gemelo', categoria: CATEGORIAS[1], segundos: 4, requisitos: 'Llegar al gemelo.' },
  operarGemelo: { nombre: 'Operar gemelo', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Línea conectada; permanecer allí hasta el blanco 8.' },
  asignarPiton: { nombre: 'Preparar pitón', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Tomar uno de los dos pitones en material.' },
  prepararManguera: { nombre: 'Preparar manguera', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Una manguera disponible y una mano libre en Zona material.' },
  prepararPiton: { nombre: 'Preparar pitón detallado', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Un pitón disponible y una mano libre en Zona material.' },
  prepararLlave: { nombre: 'Preparar llave Storz', categoria: CATEGORIAS[1], segundos: 2, requisitos: 'Una llave disponible y una mano libre en Zona material.' },
  lanzarManguera: { nombre: 'Lanzar manguera', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Portar la manguera; se despliega hasta el objetivo y libera una mano.' },
  conectarManguera: { nombre: 'Conectar manguera', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Manguera desplegada; su origen debe coincidir con el gemelo o extremo libre de la línea.' },
  desconectarManguera: { nombre: 'Desconectar manguera', categoria: CATEGORIAS[1], segundos: 2, requisitos: 'Ser el último tramo conectado y tener la línea cortada.' },
  separarLinea: { nombre: 'Separar línea en un acople', categoria: CATEGORIAS[1], segundos: 2, requisitos: 'Línea cortada; la manguera elegida será el primer tramo del conjunto separado.' },
  recogerManguera: { nombre: 'Recoger manguera desplegada', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Manguera desconectada y una mano libre.' },
  reacomodarLinea: { nombre: 'Reacomodar línea', categoria: CATEGORIAS[1], segundos: 2, requisitos: 'Pitón cerrado; cortar la línea solo cuando cambia la cantidad de tramos.' },
  conectarPiton: { nombre: 'Conectar pitón a línea', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Portar el pitón y llegar al extremo del último tramo conectado.' },
  desconectarPiton: { nombre: 'Desconectar pitón de línea', categoria: CATEGORIAS[1], segundos: 2, requisitos: 'Pitón cerrado y línea cortada.' },
  dejarPitonLinea: { nombre: 'Dejar pitón y línea', categoria: CATEGORIAS[1], segundos: 1, requisitos: 'Pitón cerrado y línea cortada; el conjunto queda en el piso.' },
  dejarHerramientas: { nombre: 'Dejar Halligan y TNT', categoria: CATEGORIAS[2], segundos: 1, requisitos: 'Tener las herramientas después de la entrada forzada.' },
  abrirLinea: { nombre: 'Abrir línea', categoria: CATEGORIAS[1], segundos: 1, requisitos: 'Gemelero presente, línea continua y la otra salida cerrada.' },
  cortarLinea: { nombre: 'Cortar línea', categoria: CATEGORIAS[1], segundos: 1, requisitos: 'Gemelero presente y línea abierta.' },
  apoyarManguera: { nombre: 'Apoyar manguera', categoria: CATEGORIAS[1], segundos: 4, requisitos: 'Línea conectada.' },
  derribar: { nombre: 'Derribar blanco', categoria: CATEGORIAS[1], segundos: 4, requisitos: 'Línea, pitón, gemelero, orden 1–8 y ambos pies en la zona.' },
  esperarBlanco: { nombre: 'Esperar caída de blanco', categoria: CATEGORIAS[1], segundos: 0, requisitos: 'Esperar en la posición actual hasta la caída del blanco elegido.' },
  cerrarPiton: { nombre: 'Cerrar pitón', categoria: CATEGORIAS[1], segundos: 1, requisitos: 'Pitón asignado; se permanece en la posición actual.' },
  entregarPiton: { nombre: 'Relevar pitón cerrado', categoria: CATEGORIAS[1], segundos: 3, requisitos: 'Pitón cerrado y un receptor al otro lado del paso.' },
  recogerCamilla: { nombre: 'Obtener camilla', categoria: CATEGORIAS[3], segundos: 3, requisitos: 'Camilla disponible y puerta habilitada si el recorrido la atraviesa.' },
  entregarCamilla: { nombre: 'Pasar camilla por muro o tubo', categoria: CATEGORIAS[3], segundos: 4, requisitos: 'Camilla vacía y equipos preparados a ambos lados.' },
  sostenerCamilla: { nombre: 'Detener y sostener camilla', categoria: CATEGORIAS[3], segundos: 0, requisitos: 'El equipo elegido queda con la camilla detenida; los demás pueden separarse.' },
  cargarVictima: { nombre: 'Colocar víctima en camilla', categoria: CATEGORIAS[3], segundos: 5, requisitos: 'Camilla en poder del equipo y un ayudante asignado.' },
  asegurarVictima: { nombre: 'Asegurar víctima', categoria: CATEGORIAS[3], segundos: 5, requisitos: 'Víctima cargada y un ayudante.' },
  transportarVictima: { nombre: 'Transportar víctima', categoria: CATEGORIAS[3], segundos: 0, requisitos: 'Víctima asegurada, ayudante y zonas del recorrido despejadas.' },
  entregarVictima: { nombre: 'Entregar víctima por muro o tubo', categoria: CATEGORIAS[3], segundos: 5, requisitos: 'Víctima asegurada, equipos presentes y zonas despejadas.' },
  subirEscala: { nombre: 'Subir escala', categoria: CATEGORIAS[4], segundos: 5, requisitos: 'Blanco 8 caído.' },
  retirarBanderin: { nombre: 'Retirar banderín', categoria: CATEGORIAS[4], segundos: 2, requisitos: 'Llegar a la cima después del blanco 8.' },
  bajarEscala: { nombre: 'Bajar escala', categoria: CATEGORIAS[4], segundos: 5, requisitos: 'Estar en la escala.' },
  salir: { nombre: 'Cruzar meta', categoria: CATEGORIAS[5], segundos: 0, requisitos: 'Víctima primero; portador del banderín último entre los ocho.' },
} as const
export type Operacion = keyof typeof OPERACIONES
export interface Tarea {
  id: string; nombre: string; operacion: Operacion; categoria: typeof CATEGORIAS[number]
  bombero: number | null; ayudantes: number[]; receptores?: number[]; objetivo: string; duracion: number; dependencias: string[]
  materialId?: MaterialAguaId; linea?: LineaAguaId
  materiales?: MaterialAguaId[]
  herramientas?: ('TNT' | 'Halligan')[]
  extremo?: 0 | 1
  conectarA?: string
  conManguera?: boolean
}
export interface ConfigBombero { nombre: string; velocidad: number }
export interface Estrategia { id: string; nombre: string; tareas: Tarea[]; bomberos: Record<number, ConfigBombero>; modoAgua?: 'resumido' | 'detallado'; modoTendido?: 'libre' | 'por-blanco'; modoConexiones?: 'simple' | 'segmentado'; perfilTendido?: 'croquis' | 'oficial' }
export type EstadoTarea = 'pendiente' | 'bloqueada' | 'en-curso' | 'completada'
export interface EjecucionTarea { estado: EstadoTarea; motivo: string; inicio?: number; fin?: number; espera: number; progreso: number }
export const emisores = (t: Tarea) => t.bombero === null ? [] : [t.bombero, ...t.ayudantes]
export const equipo = (t: Tarea) => [...emisores(t), ...(t.receptores ?? [])]
export const esEntrega = (t: Tarea) => t.operacion.startsWith('entregar')
export function ladosEntrega(t: Tarea): { origen: Pose; destino: Pose; tubo: boolean } {
  const destino = { ...objetivo(t.objetivo).posicion }, tubo = t.objetivo.startsWith('tubo-')
  if (!t.objetivo.startsWith('muro-') && !tubo) return { origen: { ...destino }, destino, tubo: true }
  return { destino, origen: tubo ? { ...destino, z: -destino.z } : { ...destino, x: -destino.x }, tubo }
}
export const objetivo = (id: string) => OBJETIVOS.find(o => o.id === id)!
export const numeroBlanco = (t: Tarea) => Number(t.objetivo.replace('blanco-', ''))
export function objetivosPermitidos(op: Operacion): string[] {
  switch (op) {
    case 'prepararLlaves': case 'recogerMaterial': return ['material']
    case 'dejarMaterial': return ['deposito-iv', 'muro-i', 'tubo-iii']
    case 'despresurizar': return ['muro-iv', 'acople-tubo']
    case 'mover': return OBJETIVOS.filter(o => !['banderin', 'salida'].includes(o.id)).map(o => o.id)
    case 'recogerHerramientas': return ['herramientas']
    case 'entregarPiton': return ['muro-i', 'muro-iv', 'tubo-iii', 'tubo-iv', 'acople-tubo']
    case 'entregarHerramientas': case 'entregarCamilla': case 'entregarVictima': return ['muro-i', 'muro-iv', 'tubo-iii', 'tubo-iv']
    case 'abrirPuerta': return ['puerta']
    case 'conectarLinea': case 'operarGemelo': case 'abrirLinea': case 'cortarLinea': return ['gemelo']
    case 'asignarPiton': return ['material', 'muro-i', 'tubo-iii']
    case 'prepararManguera': case 'prepararPiton': case 'prepararLlave': case 'conectarManguera': case 'conectarPiton': case 'desconectarManguera': case 'separarLinea': case 'desconectarPiton': case 'recogerManguera': return ['material']
    case 'lanzarManguera': return OBJETIVOS.filter(o => !['material', 'banderin', 'salida'].includes(o.id)).map(o => o.id)
    case 'reacomodarLinea': return BLANCOS.map(b => `blanco-${b.id}`)
    case 'apoyarManguera': case 'derribar': case 'esperarBlanco': return BLANCOS.map(b => `blanco-${b.id}`)
    case 'cerrarPiton': case 'dejarPitonLinea': return ['material']
    case 'dejarHerramientas': return ['puerta']
    case 'recogerCamilla': case 'sostenerCamilla': return ['camilla']
    case 'cargarVictima': case 'asegurarVictima': return ['victima']
    case 'transportarVictima': return OBJETIVOS.filter(o => !['banderin', 'escala'].includes(o.id)).map(o => o.id)
    case 'subirEscala': case 'retirarBanderin': return ['banderin']
    case 'bajarEscala': return ['escala']
    case 'salir': return ['salida']
  }
}
export function nuevaTarea(operacion: Operacion, bombero: number | null, id: string = crypto.randomUUID()): Tarea {
  const op = OPERACIONES[operacion]
  return { id, nombre: op.nombre, operacion, categoria: op.categoria, bombero, ayudantes: [], receptores: [], objetivo: objetivosPermitidos(operacion)[0]!, duracion: op.segundos, dependencias: [] }
}
export const OPERACIONES_AGUA_DETALLADA: Operacion[] = ['prepararLlaves', 'dejarMaterial', 'recogerMaterial', 'despresurizar', 'prepararManguera', 'prepararPiton', 'prepararLlave', 'lanzarManguera', 'conectarManguera', 'desconectarManguera', 'separarLinea', 'recogerManguera', 'reacomodarLinea', 'conectarPiton', 'desconectarPiton', 'dejarPitonLinea', 'abrirLinea', 'cortarLinea']
export const usaMaterialAgua = (op: Operacion) => ['recogerMaterial', 'prepararManguera', 'prepararPiton', 'prepararLlave', 'lanzarManguera', 'conectarManguera', 'desconectarManguera', 'separarLinea', 'recogerManguera', 'conectarPiton', 'desconectarPiton', 'dejarPitonLinea'].includes(op)
export const usaLineaAgua = (op: Operacion) => ['despresurizar', 'conectarManguera', 'desconectarManguera', 'separarLinea', 'reacomodarLinea', 'conectarPiton', 'desconectarPiton', 'dejarPitonLinea', 'abrirLinea', 'cortarLinea', 'apoyarManguera', 'derribar', 'cerrarPiton', 'entregarPiton'].includes(op)
// El orden dentro de cada bombero es secuencial; las dependencias coordinan equipos.
export function dependenciasEfectivas(tareas: Tarea[]): Record<string, string[]> {
  const ultimas = new Map<number, string>(), result: Record<string, string[]> = {}
  for (const t of tareas) {
    result[t.id] = [...new Set([...t.dependencias, ...equipo(t).flatMap(id => ultimas.has(id) ? [ultimas.get(id)!] : [])])]
    equipo(t).forEach(id => ultimas.set(id, t.id))
  }
  return result
}
export function validarTareas(tareas: Tarea[], modoAgua: 'resumido' | 'detallado' = 'resumido', modoTendido: 'libre' | 'por-blanco' = 'libre', perfil: 'croquis' | 'oficial' = 'croquis'): Record<string, string> {
  const errors: Record<string, string> = {}, deps = dependenciasEfectivas(tareas), ids = new Set(tareas.map(t => t.id))
  for (const t of tareas) {
    const objetivoPlantilla = modoTendido === 'por-blanco' && ['lanzarManguera', 'conectarManguera'].includes(t.operacion) && /^blanco-[1-8]$/.test(t.objetivo)
    if (!t.nombre.trim() || !OPERACIONES[t.operacion] || (!objetivosPermitidos(t.operacion).includes(t.objetivo) && !objetivoPlantilla)) errors[t.id] = 'Nombre, operación u objetivo no válido.'
    else if (!Number.isFinite(t.duracion) || t.duracion < 0 || t.duracion > 3600) errors[t.id] = 'Duración entre 0 y 3600 segundos.'
    else if (equipo(t).some(id => !Number.isInteger(id) || id < 1 || id > 8) || new Set(equipo(t)).size !== equipo(t).length) errors[t.id] = 'Equipo no válido: no repetir bomberos.'
    else if (t.receptores?.length && !esEntrega(t)) errors[t.id] = 'Solo las entregas admiten receptores.'
    else if (t.operacion === 'entregarPiton' && t.receptores?.length !== 1) errors[t.id] = 'El relevo de pitón necesita exactamente un receptor.'
    else if (usaMaterialAgua(t.operacion) && (!t.materialId || !MATERIAL_AGUA.includes(t.materialId))) errors[t.id] = 'Selecciona una pieza de material de agua.'
    else if (t.materialId && t.operacion === 'prepararManguera' && !MANGUERAS.includes(t.materialId as typeof MANGUERAS[number])) errors[t.id] = 'Preparar manguera requiere M1–M10.'
    else if (t.materialId && ['prepararPiton', 'conectarPiton'].includes(t.operacion) && !PITONES_AGUA.includes(t.materialId as typeof PITONES_AGUA[number])) errors[t.id] = 'Esta tarea requiere P1 o P2.'
    else if (t.materialId && t.operacion === 'prepararLlave' && !LLAVES_AGUA.includes(t.materialId as typeof LLAVES_AGUA[number])) errors[t.id] = 'Preparar llave requiere L1 o L2.'
    else if (t.materialId && ['lanzarManguera', 'conectarManguera', 'desconectarManguera', 'separarLinea', 'recogerManguera'].includes(t.operacion) && tipoMaterialAgua(t.materialId) !== 'manguera') errors[t.id] = 'Esta tarea requiere una manguera M1–M10.'
    else if (t.materialId && ['desconectarPiton', 'dejarPitonLinea'].includes(t.operacion) && !PITONES_AGUA.includes(t.materialId as typeof PITONES_AGUA[number])) errors[t.id] = 'Esta tarea requiere P1 o P2.'
    else if (modoAgua === 'detallado' && usaLineaAgua(t.operacion) && !t.linea) errors[t.id] = 'Selecciona Línea A o Línea B.'
    else if (modoTendido === 'por-blanco' && ['lanzarManguera', 'conectarManguera', 'reacomodarLinea'].includes(t.operacion) && !(perfil === 'oficial' && t.operacion === 'conectarManguera')) {
      const plantilla = plantillaTendido(numeroBlanco(t), perfil)
      if (!plantilla || plantilla.linea !== t.linea) errors[t.id] = 'Selecciona un blanco y la línea definidos por su plantilla.'
      else if (t.materialId && !plantilla.piezas.includes(t.materialId)) errors[t.id] = `${t.materialId} no forma parte del tendido del blanco ${plantilla.blanco}.`
    }
    if (t.extremo !== undefined && t.extremo !== 0 && t.extremo !== 1) errors[t.id] = 'Extremo de manguera no válido.'
    if (t.conectarA !== undefined && !/^(gemelo:[AB]|M([1-9]|10):[01])$/.test(t.conectarA)) errors[t.id] = 'Acople de destino no válido.'
    if (t.herramientas && (!t.herramientas.length || new Set(t.herramientas).size !== t.herramientas.length || t.herramientas.some(id => !['TNT', 'Halligan'].includes(id)))) errors[t.id] = 'Selecciona herramientas sin repetir.'
    if (t.materiales && (!t.materiales.length || new Set(t.materiales).size !== t.materiales.length || t.materiales.some(id => !MATERIAL_AGUA.includes(id)))) errors[t.id] = 'Selecciona piezas sin repetir.'
    if (deps[t.id]!.some(id => !ids.has(id))) errors[t.id] = 'Dependencia eliminada o inexistente: corrige la tarea.'
    const visiting = new Set<string>(), visited = new Set<string>()
    const cycle = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); if ((deps[id] ?? []).some(cycle)) return true; visiting.delete(id); visited.add(id); return false }
    if (cycle(t.id)) errors[t.id] = 'Dependencia circular, incluyendo el orden de tareas del bombero.'
  }
  return errors
}

export function validarCargaAgua(estrategia: Estrategia): string[] {
  if (estrategia.modoAgua !== 'detallado') return []
  const preparaciones = estrategia.tareas.filter(t => ['prepararManguera', 'prepararPiton', 'prepararLlave', 'prepararLlaves'].includes(t.operacion))
  const counts = new Map<MaterialAguaId, number>(), manos = new Map<number, number>()
  for (const t of preparaciones) if (t.materialId) { counts.set(t.materialId, (counts.get(t.materialId) ?? 0) + 1); if (t.bombero) manos.set(t.bombero, (manos.get(t.bombero) ?? 0) + 1) }
  for (const t of preparaciones.filter(t => t.operacion === 'prepararLlaves')) { for (const id of LLAVES_AGUA) counts.set(id, (counts.get(id) ?? 0) + 1); if (t.bombero) manos.set(t.bombero, (manos.get(t.bombero) ?? 0) + 1) }
  const faltantes = MATERIAL_AGUA.filter(id => !counts.has(id)), duplicadas = MATERIAL_AGUA.filter(id => (counts.get(id) ?? 0) > 1)
  const errors: string[] = []
  if (faltantes.length) errors.push(`Falta asignar: ${faltantes.join(', ')}.`)
  if (preparaciones.some(t => t.bombero === null)) errors.push('Asigna un bombero a cada preparación de material.')
  if (duplicadas.length) errors.push(`Piezas repetidas: ${duplicadas.join(', ')}.`)
  const exceso = [...manos].filter(([, count]) => count > 2).map(([id]) => `B${id}`)
  if (exceso.length) errors.push(`Más de dos manos ocupadas: ${exceso.join(', ')}.`)
  const lineasUsadas = new Set(estrategia.tareas.filter(t => t.operacion === 'derribar' && t.linea).map(t => t.linea!))
  const lanzadas = new Set(estrategia.tareas.filter(t => t.operacion === 'lanzarManguera').map(t => t.materialId).filter(Boolean))
  for (const linea of lineasUsadas) {
    const conexiones = estrategia.tareas.filter(t => t.operacion === 'conectarManguera' && t.linea === linea)
    if (!conexiones.length) errors.push(`Línea ${linea}: agrega al menos una manguera desplegada y conectada.`)
    else {
      const sinLanzar = conexiones.map(t => t.materialId).filter(id => id && !lanzadas.has(id))
      if (sinLanzar.length) errors.push(`Línea ${linea}: falta lanzar ${[...new Set(sinLanzar)].join(', ')} antes de conectarla.`)
    }
    if (!estrategia.tareas.some(t => t.operacion === 'conectarPiton' && t.linea === linea)) errors.push(`Línea ${linea}: agrega la conexión de su pitón.`)
    if (!estrategia.tareas.some(t => t.operacion === 'abrirLinea' && t.linea === linea)) errors.push(`Línea ${linea}: agrega una apertura ejecutada por el gemelero.`)
  }
  if (estrategia.modoTendido === 'por-blanco') {
    const tendido = estrategia.tareas.filter(t => t.id.startsWith('tendido-'))
    if (tendido.some(t => t.bombero === null)) errors.push('Asigna responsables a todas las tareas de tendido por blanco.')
    for (let blanco = 1; blanco <= 8; blanco++) {
      const plantilla = plantillaTendido(blanco, estrategia.perfilTendido)!
      if (!estrategia.tareas.some(t => t.operacion === 'reacomodarLinea' && t.objetivo === `blanco-${blanco}`) && ![1, 3].includes(blanco)) errors.push(`Blanco ${blanco}: falta la tarea de reacomodar la Línea ${plantilla.linea}.`)
    }
  }
  return errors
}
