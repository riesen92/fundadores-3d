import { defineStore } from 'pinia'
import type { Vector3 } from 'three'
export interface Estrategia { id: string; nombre: string; rutas: Record<number, Vector3[]>; roles: Record<number, string> }
export const useStrategyStore = defineStore('strategy', { state: () => ({ estrategiaActual: null as string | null, estrategias: [] as Estrategia[], rutas: {} as Record<number, Vector3[]>, roles: {} as Record<number, string> }) })
