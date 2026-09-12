<script setup lang="ts">
import { computed } from 'vue'
import { useStrategyStore } from '../stores/strategy.store'
import { MATERIAL_AGUA, cargaInicialAgua, materialesTarea } from '../simulation/water'
const s = useStrategyStore(); s.inicializar()
const estado = computed(() => { void s.revision; return s.engine })
const counts = computed(() => { void s.revision; const tasks = s.actual?.tareas ?? []; return { total: tasks.length, validas: tasks.filter(t => t.bombero !== null && !s.validacion[t.id]).length, bloqueadas: estado.value ? Object.values(estado.value.estados).filter(t => t.estado === 'bloqueada').length : tasks.filter(t => t.bombero === null || s.validacion[t.id]).length, completadas: estado.value ? Object.values(estado.value.estados).filter(t => t.estado === 'completada').length : 0 } })
const agua = computed(() => {
  void s.revision
  const tasks = s.actual?.tareas ?? [], preparations = tasks.filter(t => ['prepararManguera', 'prepararPiton', 'prepararLlave', 'prepararLlaves'].includes(t.operacion))
  const estadoLinea = (linea: 'A' | 'B') => estado.value ? (estado.value.lineasAgua[linea].activa ? 'con agua' : estado.value.lineasAgua[linea].conectada ? 'conectada' : 'sin armar') : (tasks.some(t => t.operacion === 'conectarManguera' && t.linea === linea) && tasks.some(t => t.operacion === 'conectarPiton' && t.linea === linea) ? 'planificada' : 'incompleta')
  const manos = Array.from({ length: 8 }, (_, index) => { const id = index + 1, carga = cargaInicialAgua(tasks, id), piezas = estado.value ? estado.value.manos(id) : carga.piezas; const ocupadas = estado.value ? new Set(piezas.map(key => estado.value!.inventarioAgua[key].mano)).size : carga.manos; return { id, piezas, libres: Math.max(0, 2 - ocupadas) } })
  const presentes = new Set(preparations.flatMap(materialesTarea))
  const asignadas = new Set(preparations.filter(t => t.bombero !== null).flatMap(materialesTarea)).size
  return { total: preparations.length, faltantes: MATERIAL_AGUA.filter(id => !presentes.has(id)).length, asignadas, ingresadas: estado.value ? MATERIAL_AGUA.filter(id => estado.value!.inventarioAgua[id].ingresada).length : 0, estadoLinea, manos }
})
</script>
<template><section class="strategy-panel"><p class="eyebrow">PLANIFICACIÓN DEL EQUIPO</p><h2>Estrategias</h2>
<p class="notice"><strong>{{ s.actual?.nombre ?? 'Secuencia oficial B1–B8' }}</strong><br>Funciones y materiales asignados a los ocho bomberos.</p>
<p class="small">6 mangueras desplegadas · 4 de reserva · una salida del gemelo. Selecciona un bombero en Tareas para revisar o editar sus funciones.</p>
<p class="small" role="status">{{ s.guardado }}</p><p v-if="s.error" role="alert" class="notice">{{ s.error }}</p>
<div v-if="s.actual" class="task-counts"><span>{{ counts.total }} tareas</span><span>{{ counts.validas }} configuradas</span><span>{{ counts.bloqueadas }} bloqueadas</span><span>{{ counts.completadas }} completadas</span></div>
<div v-if="s.actual?.modoAgua === 'detallado'" class="water-summary"><strong>Inventario de agua</strong><span>{{ agua.asignadas }}/14 piezas asignadas</span><span>{{ estado ? `${agua.ingresadas}/14 ingresadas` : 'Ingreso pendiente' }}</span><span>Línea A: {{ agua.estadoLinea('A') }}{{ estado?.lineasAgua.A.tendidoActual ? ` · blanco ${estado.lineasAgua.A.tendidoActual}` : '' }}</span><span v-if="s.actual.perfilTendido !== 'oficial'">Línea B: {{ agua.estadoLinea('B') }}{{ estado?.lineasAgua.B.tendidoActual ? ` · blanco ${estado.lineasAgua.B.tendidoActual}` : '' }}</span><div class="water-hands"><span v-for="persona in agua.manos" :key="persona.id"><b>B{{ persona.id }} · {{ persona.libres }} libres</b><small>{{ persona.piezas.length ? persona.piezas.join(' · ') : 'Manos vacías' }}</small></span></div></div>
<ul v-if="s.erroresAgua.length" class="water-errors" role="alert"><li v-for="error in s.erroresAgua" :key="error">{{ error }}</li></ul>
<p class="small">Pulsa Simular estrategia para ver la recogida del material, los lanzamientos, las conexiones y el rescate. Los tiempos son provisionales y editables.</p>
<div class="strategy-actions"><button v-if="!s.activa" class="primary" :disabled="!s.puedeSimular" @click="s.iniciar()">▶ Simular estrategia</button><template v-else><button :disabled="estado?.bloqueada || estado?.finalizada" @click="s.reproduciendo = !s.reproduciendo">{{ s.reproduciendo ? 'Pausar' : 'Continuar' }}</button><button @click="s.iniciar()">Reiniciar</button><button @click="s.cerrar()">Volver a editar</button></template></div>
<template v-if="estado"><label>Velocidad de reproducción<select aria-label="Velocidad de reproducción" v-model.number="s.velocidad"><option v-for="v in [0.25,0.5,1,2,4]" :key="v" :value="v">{{ v }}×</option></select></label>
<div class="route-metrics"><strong>{{ estado.tiempo.toFixed(1) }} s<small>Tiempo bruto</small></strong><strong>+{{ estado.penalizaciones }} s<small>Penalizaciones</small></strong></div>
<p role="status" class="notice">{{ estado.bloqueada ? 'No hay tareas que puedan avanzar. Revisa los motivos de bloqueo y vuelve a editar.' : estado.finalizada ? estado.resultadoValido ? 'Competencia completada: víctima primero y banderín último.' : 'Tareas completadas. El plan todavía no cumple el cierre de la competencia completa.' : s.reproduciendo ? 'Trabajo en paralelo según dependencias.' : 'Simulación en pausa.' }}</p>
<ul class="actor-status"><li v-for="id in 8" :key="id"><strong>B{{ id }} · {{ s.actual?.bomberos[id]?.nombre }}</strong><span>{{ estado.roles[id] }} · {{ estado.distancias[id]?.toFixed(1) }} m</span></li></ul>
<details><summary>Eventos y tiempos de espera</summary><ol class="event-list"><li v-for="e in estado.eventos" :key="e.tarea">{{ e.tiempo.toFixed(1) }} s · {{ e.texto }}</li></ol><p class="small">Espera acumulada por tarea; se superpone entre bomberos y no se suma al tiempo bruto. Al impedir acciones inválidas, las penalizaciones permanecen en cero.</p></details>
</template></section></template>
