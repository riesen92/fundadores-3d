<script setup lang="ts">
import StrategyPanel from '../components/StrategyPanel.vue'
import TaskPanel from '../components/TaskPanel.vue'
import CourtInfo from '../components/CourtInfo.vue'
import Simulator3D from '../components/Simulator3D.vue'
import CameraControls from '../components/CameraControls.vue'
import { useFirefightersStore } from '../stores/firefighters.store'
import { useStrategyStore } from '../stores/strategy.store'
import { routePath } from '../routing'

const firefighters = useFirefightersStore()
const strategies = useStrategyStore()
const simulatorUrl = routePath('simulador', import.meta.env.BASE_URL)
</script>

<template>
  <header><div class="brand-icon">F</div><div><p class="eyebrow">COMPETENCIA BOMBERIL · 2026</p><h1>Los Fundadores<span> / Estrategias</span></h1></div><div class="editor-header-actions"><span class="phase"><i></i> TAREAS Y DEPENDENCIAS</span><a class="preview-link" :href="simulatorUrl" aria-label="Abrir simulador"><span aria-hidden="true">▶</span><span class="preview-text"> Abrir simulador</span></a></div></header>
  <main><section class="viewport" aria-label="Explorador de cancha"><div class="scene-heading"><span>EXPLORADOR DE CANCHA</span><span>50 × 50 m <b> / </b> 2.500 m²</span></div><Simulator3D/><div class="scene-footer"><CameraControls/><span>Arrastra para orbitar · Rueda para acercar · Botón derecho para desplazar</span></div><div class="scale-note">1 unidad = 1 metro real</div></section>
  <aside><StrategyPanel/><TaskPanel/><details class="court-info"><summary>Información de la cancha</summary><p class="eyebrow">RECONSTRUCCIÓN DEL RECORRIDO</p><h2>Conoce la cancha.</h2><p class="intro">Explora las zonas, los accesos y el material antes de diseñar tu estrategia.</p>
    <CourtInfo />
    <p class="next-phase">PLANIFICADOR <strong>Tareas operativas con dependencias</strong><span>{{ firefighters.bomberos.length }} participantes · {{ strategies.estrategias.length }} estrategias guardadas</span></p>
  </details></aside></main><footer><span>LOS FUNDADORES 2026</span><span>Rutas previstas · Los requisitos se comprueban al simular</span><span>X / ancho &nbsp; Y / altura &nbsp; Z / profundidad</span></footer>
</template>
