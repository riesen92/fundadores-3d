import { ELEMENTOS as E } from '../data/elementos.ts'
import type { Pose } from './tasks.ts'

export const MANGUERAS = Array.from({ length: 10 }, (_, i) => `M${i + 1}` as const)
export const PITONES_AGUA = ['P1', 'P2'] as const
export const LLAVES_AGUA = ['L1', 'L2'] as const
export const MATERIAL_AGUA = [...MANGUERAS, ...PITONES_AGUA, ...LLAVES_AGUA]
export type MaterialAguaId = typeof MATERIAL_AGUA[number]
export type LineaAguaId = 'A' | 'B'
export type TipoMaterialAgua = 'manguera' | 'piton' | 'llave'
export type EstadoMaterialAgua = 'material' | 'portado' | 'depositado' | 'desplegado' | 'conectado' | 'abandonado'

export interface PiezaAgua {
  id: MaterialAguaId
  tipo: TipoMaterialAgua
  estado: EstadoMaterialAgua
  portador: number | null
  mano: 1 | 2 | null
  posicion: Pose
  ingresada: boolean
  linea: LineaAguaId | null
  trazado: Pose[]
}

export interface LineaAgua {
  id: LineaAguaId
  tramos: MaterialAguaId[]
  piton: MaterialAguaId | null
  conectada: boolean
  activa: boolean
  tendidoActual: number | null
}

// Un conjunto separado conserva su recorrido aunque ya no reciba agua del gemelo.
export interface ConjuntoMangueras {
  id: string
  linea: LineaAguaId
  tramos: MaterialAguaId[]
  piton: MaterialAguaId | null
  estado: 'separado' | 'abandonado'
}
export interface ConexionAgua { a: string; b: string }
export const materialesTarea = (t: { operacion: string; materialId?: MaterialAguaId; materiales?: MaterialAguaId[] }): MaterialAguaId[] => t.operacion === 'prepararLlaves' ? [...LLAVES_AGUA] : t.materiales ?? (t.materialId ? [t.materialId] : [])
export const cargaInicialAgua = (tareas: Array<{ operacion: string; bombero: number | null; materialId?: MaterialAguaId; materiales?: MaterialAguaId[] }>, bombero: number) => {
  const tareasCarga = tareas.filter(t => t.bombero === bombero && ['prepararManguera', 'prepararPiton', 'prepararLlave', 'prepararLlaves'].includes(t.operacion))
  return { piezas: tareasCarga.flatMap(materialesTarea), manos: tareasCarga.length }
}

export const tipoMaterialAgua = (id: MaterialAguaId): TipoMaterialAgua => id.startsWith('M') ? 'manguera' : id.startsWith('P') ? 'piton' : 'llave'

export function posicionMaterialAgua(id: MaterialAguaId): Pose {
  const index = MATERIAL_AGUA.indexOf(id)
  if (id.startsWith('M')) return { x: E.material.posicion.x - 3 + index % 5 * 1.1, y: 0.22, z: E.material.posicion.z - 1.5 + Math.floor(index / 5) }
  if (id.startsWith('P')) return { x: E.material.posicion.x + 3, y: 0.15, z: E.material.posicion.z - 1.5 + Number(id.slice(1)) - 1 }
  return { x: E.material.posicion.x + 1.5 + (Number(id.slice(1)) - 1) * 0.65, y: 0.1, z: E.material.posicion.z + 1 }
}

export function inventarioAguaInicial(): Record<MaterialAguaId, PiezaAgua> {
  return Object.fromEntries(MATERIAL_AGUA.map(id => [id, { id, tipo: tipoMaterialAgua(id), estado: 'material', portador: null, mano: null, posicion: posicionMaterialAgua(id), ingresada: false, linea: null, trazado: [] }])) as unknown as Record<MaterialAguaId, PiezaAgua>
}

export function lineasAguaInicial(): Record<LineaAguaId, LineaAgua> {
  return { A: { id: 'A', tramos: [], piton: null, conectada: false, activa: false, tendidoActual: null }, B: { id: 'B', tramos: [], piton: null, conectada: false, activa: false, tendidoActual: null } }
}
