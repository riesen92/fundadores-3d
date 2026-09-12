<script setup lang="ts">
import StrategyPanel from './components/StrategyPanel.vue'
import TaskPanel from './components/TaskPanel.vue'
import Simulator3D from './components/Simulator3D.vue'
import CameraControls from './components/CameraControls.vue'
import { useSimulatorStore } from './stores/simulator.store'
import { useFirefightersStore } from './stores/firefighters.store'
import { useStrategyStore } from './stores/strategy.store'
import { REGLAS } from './data/reglas'
import { ZONAS } from './data/cancha'
const store = useSimulatorStore(); const firefighters = useFirefightersStore(); const strategies = useStrategyStore()
</script>
<template>
  <header><div class="brand-icon">F</div><div><p class="eyebrow">COMPETENCIA BOMBERIL · 2026</p><h1>Los Fundadores<span> / Estrategias</span></h1></div><span class="phase"><i></i> TAREAS Y DEPENDENCIAS</span></header>
  <main><section class="viewport" aria-label="Explorador de cancha"><div class="scene-heading"><span>EXPLORADOR DE CANCHA</span><span>50 × 50 m <b> / </b> 2.500 m²</span></div><Simulator3D/><div class="scene-footer"><CameraControls/><span>Arrastra para orbitar · Rueda para acercar · Botón derecho para desplazar</span></div><div class="scale-note">1 unidad = 1 metro real</div></section>
  <aside><StrategyPanel/><TaskPanel/><details class="court-info"><summary>Información de la cancha</summary><p class="eyebrow">RECONSTRUCCIÓN DEL RECORRIDO</p><h2>Conoce la cancha.</h2><p class="intro">Explora las zonas, los accesos y el material antes de diseñar tu estrategia.</p>
    <section class="panel-section"><h3>01 <span>Zonas y blancos</span></h3><div v-for="zona in ZONAS" :key="zona.id" class="zone-row"><i :style="{ background: zona.color }"></i><strong>Zona {{ zona.id }}</strong><span>Blancos {{ zona.blancos.join(' · ') }}</span></div><p class="small">Orden de caída: <strong>1 → 2 → 3 → 4 → 5 → 6 → 7 → 8</strong></p></section>
    <section class="panel-section"><h3>02 <span>Visualización</span></h3><label class="toggle"><span>Etiquetas generales</span><input v-model="store.etiquetas" type="checkbox"></label><label class="toggle"><span>Etiquetas de elementos <small>Gemelo, víctima, bomba y material</small></span><input v-model="store.etiquetasElementos" type="checkbox"></label><label class="toggle"><span>Nombres de bomberos</span><input v-model="store.etiquetasBomberos" type="checkbox"></label><label class="toggle"><span>Recorridos de bomberos <small>Rutas previstas y tarea actual</small></span><input v-model="store.rutasBomberos" type="checkbox" aria-label="Recorridos de bomberos"></label><label class="toggle"><span>Cierres perimetrales e interiores</span><input v-model="store.cierres" type="checkbox"></label><p class="small">Los cierres son infranqueables. Su altura visual de 2,5 m no representa un paso habilitado.</p></section>
    <section class="measurements"><span>MEDIDAS CONFIRMADAS</span><div><strong>50 × 50 m</strong><small>Cancha</small></div><div><strong>1,33 × 2 m</strong><small>Muro de acceso</small></div><div><strong>6 m</strong><small>Escala vertical</small></div><div><strong>4 m</strong><small>Ingreso / salida</small></div></section>
    <div class="notice"><strong>∗ Representación provisional</strong><p>Posiciones ajustadas al croquis aportado; coordenadas métricas aproximadas. Las flechas muestran la orientación de referencia. Tubo, puerta y geometrías sin medidas oficiales siguen siendo configurables.</p></div>
    <details><summary>Reglas de referencia · {{ REGLAS.length }}</summary><p class="small">El motor bloquea tareas sin requisitos, blancos fuera de orden y rescates por zonas pendientes. Las sanciones por accidentes físicos aún son de referencia.</p><ul><li v-for="regla in REGLAS" :key="regla.id">{{ regla.descripcion }} <strong>{{ regla.segundos ? `+${regla.segundos / 60} min` : 'Descalificación' }}</strong></li></ul></details>
    <p class="next-phase">PLANIFICADOR <strong>Tareas operativas con dependencias</strong><span>{{ firefighters.bomberos.length }} participantes · {{ strategies.estrategias.length }} estrategias guardadas</span></p>
  </details></aside></main><footer><span>LOS FUNDADORES 2026</span><span>Rutas previstas · Los requisitos se comprueban al simular</span><span>X / ancho &nbsp; Y / altura &nbsp; Z / profundidad</span></footer>
</template>
