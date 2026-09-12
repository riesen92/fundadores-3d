<script setup lang="ts">
import { useSimulatorStore } from '../stores/simulator.store'
import { REGLAS } from '../data/reglas'
import { ZONAS } from '../data/cancha'

defineProps<{ sinSeguimiento?: boolean }>()
const store = useSimulatorStore()
</script>

<template>
  <section class="panel-section"><h3>01 <span>Zonas y blancos</span></h3><div v-for="zona in ZONAS" :key="zona.id" class="zone-row"><i :style="{ background: zona.color }"></i><strong>Zona {{ zona.id }}</strong><span>Blancos {{ zona.blancos.join(' · ') }}</span></div><p class="small">Orden de caída: <strong>1 → 2 → 3 → 4 → 5 → 6 → 7 → 8</strong></p></section>
  <section class="panel-section"><h3>02 <span>Visualización</span></h3><label class="toggle"><span>Etiquetas generales</span><input v-model="store.etiquetas" type="checkbox"></label><label class="toggle"><span>Etiquetas de elementos <small>Gemelo, víctima, bomba y material</small></span><input v-model="store.etiquetasElementos" type="checkbox"></label><label class="toggle"><span>Nombres de bomberos</span><input v-model="store.etiquetasBomberos" type="checkbox"></label><label class="toggle"><span>Recorridos de bomberos <small>Rutas previstas y tarea actual</small></span><input v-model="store.rutasBomberos" type="checkbox" aria-label="Recorridos de bomberos"></label><p v-if="sinSeguimiento && store.rutasBomberos" class="small" role="status">Elige un bombero en Seguir a para ver su recorrido; en Vista general no hay recorridos.</p><label class="toggle"><span>Cierres perimetrales e interiores</span><input v-model="store.cierres" type="checkbox"></label><p class="small">Los cierres son infranqueables. Su altura visual de 2,5 m no representa un paso habilitado.</p></section>
  <section class="measurements"><span>MEDIDAS CONFIRMADAS</span><div><strong>50 × 50 m</strong><small>Cancha</small></div><div><strong>1,33 × 2 m</strong><small>Muro de acceso</small></div><div><strong>6 m</strong><small>Escala vertical</small></div><div><strong>4 m</strong><small>Ingreso / salida</small></div></section>
  <div class="notice"><strong>∗ Representación provisional</strong><p>Posiciones ajustadas al croquis aportado; coordenadas métricas aproximadas. Las flechas muestran la orientación de referencia. Tubo, puerta y geometrías sin medidas oficiales siguen siendo configurables.</p></div>
  <details><summary>Reglas de referencia · {{ REGLAS.length }}</summary><p class="small">El motor bloquea tareas sin requisitos, blancos fuera de orden y rescates por zonas pendientes. Las sanciones por accidentes físicos aún son de referencia.</p><ul><li v-for="regla in REGLAS" :key="regla.id">{{ regla.descripcion }} <strong>{{ regla.segundos ? `+${regla.segundos / 60} min` : 'Descalificación' }}</strong></li></ul></details>
</template>
