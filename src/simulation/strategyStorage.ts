import { OPERACIONES, objetivosPermitidos, validarTareas } from './tasks.ts'
import { MATERIAL_AGUA } from './water.ts'
import type { Estrategia } from './tasks.ts'
export interface ArchivoEstrategias { version: 5; seleccionada: string | null; estrategias: Estrategia[] }
export const STORAGE_KEY = 'fundadores-estrategias-v1'
// Se rechazan datos incompatibles sin sobrescribirlos: el usuario conserva el original.
export function leerArchivo(raw: string): ArchivoEstrategias {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw Error('Archivo de estrategias no válido.')
  const file = value as Omit<ArchivoEstrategias, 'version'> & { version: 1 | 2 | 3 | 4 | 5 }
  if (![1, 2, 3, 4, 5].includes(file.version) || !Array.isArray(file.estrategias) || ![null, ...file.estrategias.map(s => s.id)].includes(file.seleccionada)) throw Error('Formato de estrategias incompatible.')
  const ids = new Set<string>()
  for (const s of file.estrategias) {
    if (!s || typeof s.id !== 'string' || ids.has(s.id) || typeof s.nombre !== 'string' || !s.nombre.trim() || !Array.isArray(s.tareas) || !s.bomberos) throw Error('Estrategia incompleta.')
    if (s.modoAgua !== undefined && !['resumido', 'detallado'].includes(s.modoAgua)) throw Error('Modo de agua no válido.')
    if (s.modoTendido !== undefined && !['libre', 'por-blanco'].includes(s.modoTendido)) throw Error('Modo de tendido no válido.')
    if (s.modoConexiones !== undefined && !['simple', 'segmentado'].includes(s.modoConexiones)) throw Error('Modo de conexiones no válido.')
    if (s.perfilTendido !== undefined && !['croquis', 'oficial'].includes(s.perfilTendido)) throw Error('Perfil de tendido no válido.')
    s.perfilTendido ??= 'croquis'
    s.modoAgua ??= 'resumido'
    s.modoTendido ??= 'libre'
    s.modoConexiones ??= 'simple'
    ids.add(s.id)
    for (let i = 1; i <= 8; i++) { const b = s.bomberos[i]; if (!b || typeof b.nombre !== 'string' || b.nombre.length > 40 || !Number.isFinite(b.velocidad) || b.velocidad < 0.1 || b.velocidad > 10) throw Error('Configuración de bombero no válida.') }
    const taskIds = new Set<string>()
    for (const t of s.tareas) {
      if (!t || typeof t.id !== 'string' || taskIds.has(t.id) || typeof t.nombre !== 'string' || !OPERACIONES[t.operacion] || !Array.isArray(t.dependencias) || t.dependencias.some(d => typeof d !== 'string') || !Array.isArray(t.ayudantes) || (t.bombero !== null && (!Number.isInteger(t.bombero) || t.bombero < 1 || t.bombero > 8))) throw Error('Tarea guardada no válida.')
      const objetivoPlantilla = s.modoTendido === 'por-blanco' && ['lanzarManguera', 'conectarManguera'].includes(t.operacion) && /^blanco-[1-8]$/.test(t.objetivo)
      if ((!objetivosPermitidos(t.operacion).includes(t.objetivo) && !objetivoPlantilla) || !Number.isFinite(t.duracion) || t.duracion < 0 || t.duracion > 3600 || t.ayudantes.some(id => !Number.isInteger(id) || id < 1 || id > 8)) throw Error('Objetivo, duración o ayudante no válido.')
      if (t.receptores !== undefined && (!Array.isArray(t.receptores) || t.receptores.some(id => !Number.isInteger(id) || id < 1 || id > 8))) throw Error('Receptores guardados no válidos.')
      if (t.materialId !== undefined && !MATERIAL_AGUA.includes(t.materialId)) throw Error('Material de agua guardado no válido.')
      if (t.linea !== undefined && !['A', 'B'].includes(t.linea)) throw Error('Línea de agua guardada no válida.')
      if (t.materiales !== undefined && (!Array.isArray(t.materiales) || t.materiales.some(id => !MATERIAL_AGUA.includes(id)) || new Set(t.materiales).size !== t.materiales.length)) throw Error('Grupo de material no válido.')
      if (t.herramientas !== undefined && (!Array.isArray(t.herramientas) || t.herramientas.some(id => !['TNT', 'Halligan'].includes(id)) || new Set(t.herramientas).size !== t.herramientas.length)) throw Error('Herramientas no válidas.')
      if (t.extremo !== undefined && t.extremo !== 0 && t.extremo !== 1) throw Error('Extremo no válido.')
      if (t.conectarA !== undefined && (typeof t.conectarA !== 'string' || !/^(gemelo:[AB]|M([1-9]|10):[01])$/.test(t.conectarA))) throw Error('Acople no válido.')
      if (t.conManguera !== undefined && typeof t.conManguera !== 'boolean') throw Error('Relevo no válido.')
      taskIds.add(t.id)
    }
    // Las dependencias incompletas/cíclicas se conservan para poder repararlas en el editor.
    validarTareas(s.tareas, s.modoAgua, s.modoTendido, s.perfilTendido)
  }
  return { version: 5, seleccionada: file.seleccionada, estrategias: file.estrategias }
}
