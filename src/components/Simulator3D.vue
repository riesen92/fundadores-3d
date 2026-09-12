<script setup lang="ts">
import { useStrategyStore } from '../stores/strategy.store'
import { rutasPlanificadas } from '../simulation/routePreview'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useFirefightersStore } from '../stores/firefighters.store'
import { SceneManager } from '../three/core/SceneManager'
import { useSimulatorStore } from '../stores/simulator.store'
const props = withDefaults(defineProps<{ selectedFirefighter?: number | null, followSelected?: boolean }>(), { followSelected: false })
const sim = useStrategyStore(); sim.inicializar(); const firefighters = useFirefightersStore(); const store = useSimulatorStore(); const host = ref<HTMLElement>(); const error = ref(''); let manager: SceneManager | undefined
const selected = computed(() => props.selectedFirefighter === undefined ? sim.bomberoSeleccionado : props.selectedFirefighter)
function refresh(){if(!manager)return;const id=selected.value;manager.updateFirefighters(firefighters.bomberos.map(b=>({...b,ruta:[],destinos:[]})),id??0);manager.setFollowedFirefighter(props.followSelected?id:null);manager.setFirefighterLabelsVisible(store.etiquetasBomberos);manager.setFirefighterRoutesVisible(store.rutasBomberos);if(sim.engine)manager.showSimulation(sim.engine,id);else manager.previewTasks(sim.actual?rutasPlanificadas(sim.actual):{},id)}
onMounted(() => { try { manager = new SceneManager(host.value!); manager.setView(store.vistaCamara); manager.cancha.etiquetas.visible=store.etiquetas;manager.cancha.etiquetasElementos.visible=store.etiquetasElementos;manager.cancha.cierres.visible=store.cierres;refresh();manager.onFrame=dt=>{sim.tick(dt);if(sim.engine)manager?.showSimulation(sim.engine,selected.value)} } catch (cause) { error.value = `No se pudo iniciar la escena: ${cause instanceof Error ? cause.message : 'error desconocido'}. Comprueba la aceleración gráfica y recarga la página.` } })
watch(() => [store.vistaCamara, store.revisionCamara], () => manager?.setView(store.vistaCamara))
watch(() => store.etiquetas, value => { if (manager) manager.cancha.etiquetas.visible = value })
watch(() => store.etiquetasElementos, value => { if (manager) manager.cancha.etiquetasElementos.visible = value })
watch(() => store.etiquetasBomberos, value => manager?.setFirefighterLabelsVisible(value))
watch(() => store.rutasBomberos, value => manager?.setFirefighterRoutesVisible(value))
watch(() => store.cierres, value => { if (manager) manager.cancha.cierres.visible = value })
watch(() => [firefighters.bomberos,sim.bomberoSeleccionado,sim.actual,props.selectedFirefighter,props.followSelected],refresh,{deep:true})
watch(()=>sim.activa,active=>{if(!active){manager?.resetSimulation();refresh()}})
watch(()=>store.enfoqueZonaI,()=>manager?.focusZoneOne())
onBeforeUnmount(() => manager?.dispose())
</script>
<template><div ref="host" class="scene"><p v-if="error" role="alert" class="webgl-error">{{ error }}</p></div></template>
