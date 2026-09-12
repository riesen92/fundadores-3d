import { posicion } from './cancha.ts'
export const BLANCOS = [
  { id: 1, zona: 'I', posicion: posicion(-21, -3.5), orientacion: 0 },
  { id: 2, zona: 'I', posicion: posicion(-4, -20.5), orientacion: 0 },
  { id: 3, zona: 'II', posicion: posicion(-4, 4), orientacion: -Math.PI / 2 },
  { id: 4, zona: 'II', posicion: posicion(-4, 20), orientacion: -Math.PI / 2 },
  { id: 5, zona: 'III', posicion: posicion(4, 20), orientacion: Math.PI / 2 },
  { id: 6, zona: 'III', posicion: posicion(3.5, 4), orientacion: Math.PI / 2 },
  { id: 7, zona: 'IV', posicion: posicion(3.5, -4), orientacion: Math.PI / 2 },
  { id: 8, zona: 'IV', posicion: posicion(21, -4), orientacion: Math.PI / 4 },
]
// Flecha local hacia -Z : 0 = C, -π/2 = D, π/2 = B, π/4 = B/C.
export const GEOMETRIA_BLANCO = { altura: 1.8, radioDisco: 0.5, radioPoste: 0.06, dimensionesConfirmadas: false, orientacionConfirmada: true }
