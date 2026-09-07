<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { SceneManager } from '../three/core/SceneManager'
import { useSimulatorStore } from '../stores/simulator.store'
const store = useSimulatorStore(); const host = ref<HTMLElement>(); const error = ref(''); let manager: SceneManager | undefined
onMounted(() => { try { manager = new SceneManager(host.value!); manager.setView(store.vistaCamara) } catch (cause) { error.value = `No se pudo iniciar la escena: ${cause instanceof Error ? cause.message : 'error desconocido'}. Comprueba la aceleración gráfica y recarga la página.` } })
watch(() => [store.vistaCamara, store.revisionCamara], () => manager?.setView(store.vistaCamara))
watch(() => store.etiquetas, value => { if (manager) manager.cancha.etiquetas.visible = value })
watch(() => store.cierres, value => { if (manager) manager.cancha.cierres.visible = value })
onBeforeUnmount(() => manager?.dispose())
</script>
<template><div ref="host" class="scene"><p v-if="error" role="alert" class="webgl-error">{{ error }}</p></div></template>
