<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import Simulator3D from '../components/Simulator3D.vue'
import CameraControls from '../components/CameraControls.vue'
import { useStrategyStore } from '../stores/strategy.store'

const strategies = useStrategyStore()
strategies.inicializar()

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

onBeforeUnmount(() => strategies.cerrar())
</script>

<template>
  <div class="simulator-page">
    <header class="simulator-header"><div class="brand-icon">F</div><div><p class="eyebrow">COMPETENCIA BOMBERIL · 2026</p><h1>Los Fundadores<span> / Simulador</span></h1></div></header>
    <main class="simulator-main">
      <section class="simulator-stage" aria-label="Simulador de la competencia">
        <Simulator3D :selected-firefighter="followed" follow-selected hide-routes />
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
