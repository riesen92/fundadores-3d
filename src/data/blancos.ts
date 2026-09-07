import { posicion } from './cancha'
export const BLANCOS = [
  { id: 1, zona: 'I', posicion: posicion(-19, -21), orientacion: 0 },
  { id: 2, zona: 'I', posicion: posicion(-7, -21), orientacion: 0 },
  { id: 3, zona: 'II', posicion: posicion(-20, 6), orientacion: Math.PI / 2 },
  { id: 4, zona: 'II', posicion: posicion(-20, 19), orientacion: Math.PI / 2 },
  { id: 5, zona: 'III', posicion: posicion(7, 20), orientacion: Math.PI },
  { id: 6, zona: 'III', posicion: posicion(19, 20), orientacion: Math.PI },
  { id: 7, zona: 'IV', posicion: posicion(20, -20), orientacion: -Math.PI / 2 },
  { id: 8, zona: 'IV', posicion: posicion(20, -5), orientacion: -Math.PI / 2 },
]
export const GEOMETRIA_BLANCO = { altura: 1.8, radioDisco: 0.5, radioPoste: 0.06, dimensionesConfirmadas: false, orientacionConfirmada: false }
