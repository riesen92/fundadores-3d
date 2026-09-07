<script setup lang="ts">
import { useSimulatorStore } from '../stores/simulator.store'
const store = useSimulatorStore()
</script>
<template><div class="camera-controls" aria-label="Vista de cámara"><button :aria-pressed="store.vistaCamara === '3d'" @click="store.vistaCamara = '3d'">◇ Vista 3D</button><button :aria-pressed="store.vistaCamara === 'cenital'" @click="store.vistaCamara = 'cenital'">▦ Cenital</button><button title="Restablecer encuadre" @click="store.reiniciarCamara()">↺ Encuadrar</button></div></template>
