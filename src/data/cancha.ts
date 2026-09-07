export interface PosicionCancha { x: number; y: number; z: number; fuente: 'reglamento' | 'croquis' | 'aproximacion'; confirmada: boolean; observacion?: string }
export const posicion = (x: number, z: number, y = 0): PosicionCancha => ({ x, y, z, fuente: 'aproximacion', confirmada: false, observacion: 'Ubicación provisional; croquis no disponible.' })
export const CANCHA = { ancho: 50, largo: 50, mitad: 25, alturaCierreVisual: 2.5, espesorCierreVisual: 0.18, cierresInfranqueables: true }
export const ZONAS = [
  { id: 'I', x: -12.5, z: -12.5, color: '#648879', blancos: [1, 2] },
  { id: 'II', x: -12.5, z: 12.5, color: '#789081', blancos: [3, 4] },
  { id: 'III', x: 12.5, z: 12.5, color: '#6d8f87', blancos: [5, 6] },
  { id: 'IV', x: 12.5, z: -12.5, color: '#87a08a', blancos: [7, 8] },
]
export const ACCESOS = {
  ingreso: { posicion: posicion(25, -19), ancho: 4 },
  salida: { posicion: posicion(-12.5, 25), ancho: 4 },
  muro: { posicion: posicion(0, -12.5), ancho: 2, alto: 1.33, espesorVisual: 0.3, espesorConfirmado: false },
  tubo: { posicion: posicion(12.5, 0), diametro: 1.8, largo: 3, espesor: 0.12, dimensionesConfirmadas: false },
  puerta: { posicion: posicion(0, 12.5), ancho: 2.4, alto: 2.2, largoPasillo: 5, dimensionesConfirmadas: false },
}
