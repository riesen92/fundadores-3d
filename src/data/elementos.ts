import { posicion } from './cancha'
export const ELEMENTOS = {
  gemelo: { nombre: 'Gemelo 70 × 50', posicion: posicion(-12.5, -23), dimensiones: [1.4, 0.6, 0.6], color: '#dbb75d' },
  bomba: { nombre: 'Bomba · 8 bar', posicion: posicion(-12.5, -29), dimensiones: [2.5, 1.5, 1.8], color: '#bb5b46' },
  victima: { nombre: 'Víctima', posicion: posicion(-22, -10), dimensiones: [0.65, 0.3, 1.8], color: '#e3aa72' },
  camilla: { nombre: 'Camilla bote', posicion: posicion(-22, 11), dimensiones: [1, 0.25, 2.3], color: '#dc8150' },
  herramientas: { nombre: 'Holligan / TNT', posicion: posicion(-19, -19), dimensiones: [2, 0.2, 1.3], color: '#b9c6c0' },
  escala: { nombre: 'Escala · 6 m', posicion: posicion(20, -10), alto: 6, anchoVisual: 0.9 },
  material: { nombre: 'Zona material', posicion: posicion(10, 30), ancho: 10, largo: 6 },
  inicio: { nombre: 'Zona inicio', posicion: posicion(21, 30), ancho: 9, largo: 6 },
}
// Dimensiones de representación, excepto altura de escala y diámetros reglamentarios.
export const MATERIAL = { mangueras: 10, diametroMm: 50, pitones: 2, llavesStorz: 2, alimentacionMm: 72, presionBar: 8 }
