import { defineStore } from 'pinia'
import type { Vector3 } from 'three'
export type EstadoBombero = 'esperando' | 'corriendo' | 'transportando-material' | 'operando-piton' | 'entrada-forzada' | 'rescatando' | 'transportando-victima' | 'subiendo-escala' | 'con-banderin' | 'finalizado'
export interface Bombero { id: number; nombre: string; rol: string; velocidad: number; posicion: Vector3; ruta: Vector3[]; estado: EstadoBombero; distanciaRecorrida: number }
export const useFirefightersStore = defineStore('firefighters', { state: () => ({ bomberos: [] as Bombero[], bomberoSeleccionado: null as number | null }) })
