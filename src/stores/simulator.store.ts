import { defineStore } from 'pinia'
import type { EventoSimulacion } from '../data/eventos'
export type VistaCamara = '3d' | 'cenital'
export const useSimulatorStore = defineStore('simulator', {
  state: () => ({ estado: 'preparacion', tiempoActual: 0, velocidadSimulacion: 1, pausado: true, eventoActual: null as EventoSimulacion | null, vistaCamara: '3d' as VistaCamara, etiquetas: true, cierres: true, revisionCamara: 0 }),
  actions: { reiniciarCamara() { this.revisionCamara++ } },
})
