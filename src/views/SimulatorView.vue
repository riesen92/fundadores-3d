<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Simulator3D from '../components/Simulator3D.vue'
import CameraControls from '../components/CameraControls.vue'
import CourtInfo from '../components/CourtInfo.vue'
import { useStrategyStore } from '../stores/strategy.store'

const strategies = useStrategyStore()
strategies.inicializar()

const palcoAbierto = ref(false)
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') palcoAbierto.value = false }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); strategies.cerrar() })

const followed = ref<number | null>(null)
const selectedValue = computed({
  get: () => followed.value ?? '',
  set: value => { followed.value = value === '' ? null : Number(value) },
})
const runtime = computed(() => {
  void strategies.revision
  const engine = strategies.engine
  return { tiempo: engine?.tiempo ?? 0, finalizada: !!engine?.finalizada, bloqueada: !!engine?.bloqueada, resultadoValido: !!engine?.resultadoValido }
})
const buttonLabel = computed(() => {
  if (!strategies.activa) return '▶ Simular'
  if (runtime.value.finalizada) return '↻ Repetir'
  if (runtime.value.bloqueada) return '↻ Reintentar'
  return strategies.reproduciendo ? 'Pausar' : 'Continuar'
})
const canRestart = computed(() => strategies.activa)
const status = computed(() => {
  if (!strategies.puedeSimular && !strategies.activa) return 'La estrategia todavía no está lista para simular.'
  if (runtime.value.bloqueada) return 'La simulación quedó bloqueada por una tarea pendiente.'
  if (runtime.value.finalizada) return runtime.value.resultadoValido ? 'Competencia completada.' : 'Simulación completada.'
  if (strategies.activa) return strategies.reproduciendo ? 'Simulación en curso.' : 'Simulación en pausa.'
  return 'Preparado para simular.'
})

function toggleSimulation() {
  if (!strategies.activa || runtime.value.finalizada || runtime.value.bloqueada) strategies.iniciar()
  else strategies.reproduciendo = !strategies.reproduciendo
}

</script>

<template>
  <div class="simulator-page">
    <header class="simulator-header"><div class="brand-icon">F</div><div><p class="eyebrow">COMPETENCIA BOMBERIL · 2026</p><h1>Los Fundadores<span> / Simulador</span></h1></div><button class="court-info-toggle" :aria-expanded="palcoAbierto" aria-controls="panel-cancha" @click="palcoAbierto = !palcoAbierto">ⓘ Información de la cancha</button></header>
    <main class="simulator-main">
      <section class="simulator-stage" aria-label="Simulador de la competencia">
        <Simulator3D :selected-firefighter="followed" follow-selected />
        <div v-if="palcoAbierto" class="court-drawer" id="panel-cancha" role="dialog" aria-label="Información de la cancha">
          <div class="court-drawer-head"><strong>Información de la cancha</strong><button class="court-drawer-close" @click="palcoAbierto = false">Cerrar ✕</button></div>
          <div class="court-drawer-body"><CourtInfo :sin-seguimiento="followed === null" /></div>
        </div>
        <div class="simulator-console">
          <button class="simulator-action" :disabled="!strategies.puedeSimular && !strategies.activa" @click="toggleSimulation">{{ buttonLabel }}</button>
          <button class="simulator-reset" :disabled="!canRestart" title="Restaurar y reproducir desde el inicio" @click="strategies.iniciar()">↻ Reiniciar</button>
          <label class="speed-control"><span>Velocidad</span>
            <select v-model.number="strategies.velocidad" aria-label="Velocidad de reproducción">
              <option v-for="v in [0.25, 0.5, 1, 2, 4]" :key="v" :value="v">{{ v }}×</option>
            </select>
          </label>
          <CameraControls />
          <label class="follow-control"><span>Seguir a</span>
            <select v-model="selectedValue" aria-label="Bombero a seguir">
              <option value="">Vista general</option>
              <option v-for="id in 8" :key="id" :value="id">B{{ id }} · {{ strategies.actual?.bomberos[id]?.nombre ?? `B${id}` }}</option>
            </select>
          </label>
          <output class="simulator-status"><strong>{{ runtime.tiempo.toFixed(1) }} s</strong><span>{{ status }}</span></output>
        </div>
      </section>
    </main>
  </div>
</template>
