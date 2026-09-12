<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useStrategyStore } from '../stores/strategy.store'
import { CATEGORIAS, OPERACIONES, equipo, esEntrega, objetivosPermitidos, nuevaTarea, usaLineaAgua, usaMaterialAgua, OBJETIVOS, OPERACIONES_AGUA_DETALLADA } from '../simulation/tasks'
import type { Operacion, Tarea } from '../simulation/tasks'
import { cargaInicialAgua, materialesTarea, LLAVES_AGUA, MANGUERAS, MATERIAL_AGUA, PITONES_AGUA } from '../simulation/water'
import type { MaterialAguaId } from '../simulation/water'
import { plantillaTendido } from '../simulation/hoseLayouts'
const s = useStrategyStore()
const draft = ref<Tarea | null>(null), categoria = ref<string>(CATEGORIAS[0]), mensaje = ref(''), personName = ref(''), personSpeed = ref(4)
watch(() => [s.estrategiaActual, s.bomberoSeleccionado], () => {
  draft.value = null; mensaje.value = ''
  const person = s.actual?.bomberos[s.bomberoSeleccionado ?? 1]
  personName.value = person?.nombre ?? ''; personSpeed.value = person?.velocidad ?? 4
}, { immediate: true })
const visibles = computed(() => s.actual?.tareas.filter(t => s.bomberoSeleccionado === null ? t.bombero === null : equipo(t).includes(s.bomberoSeleccionado)) ?? [])
const operaciones = computed(() => (Object.keys(OPERACIONES) as Operacion[]).filter(key => OPERACIONES[key].categoria === categoria.value))
const objetivos = computed(() => {
  if (!draft.value) return []
  const op = draft.value.operacion
  const porBlanco = s.actual?.modoTendido === 'por-blanco' && (op === 'lanzarManguera' || (op === 'conectarManguera' && s.actual.perfilTendido !== 'oficial'))
  const ids = porBlanco ? Array.from({ length: 8 }, (_, i) => `blanco-${i + 1}`) : objetivosPermitidos(op)
  return OBJETIVOS.filter(o => ids.includes(o.id))
})
const materiales = computed(() => {
  const op = draft.value?.operacion
  if (!op) return []
  const tasks = s.actual?.tareas ?? [], current = draft.value?.materialId
  if (['prepararManguera', 'prepararPiton', 'prepararLlave'].includes(op)) {
    const pool = op === 'prepararManguera' ? MANGUERAS : op === 'prepararPiton' ? PITONES_AGUA : LLAVES_AGUA
    const occupied = new Set(tasks.filter(t => t.id !== draft.value?.id && ['prepararManguera', 'prepararPiton', 'prepararLlave', 'prepararLlaves'].includes(t.operacion)).flatMap(materialesTarea))
    return pool.filter(id => id === current || !occupied.has(id))
  }
  if (op === 'lanzarManguera') {
    const held = new Set(tasks.filter(t => t.bombero === draft.value?.bombero && ['prepararManguera', 'recogerManguera', 'recogerMaterial'].includes(t.operacion)).map(t => t.materialId))
    const template = s.actual?.modoTendido === 'por-blanco' ? plantillaTendido(Number(draft.value?.objetivo.replace('blanco-', '')), s.actual.perfilTendido) : null
    return MANGUERAS.filter(id => (id === current || held.has(id)) && (!template || template.piezas.includes(id)))
  }
  if (['conectarManguera', 'desconectarManguera', 'separarLinea', 'recogerManguera'].includes(op)) {
    const deployed = new Set(tasks.filter(t => t.operacion === 'lanzarManguera').map(t => t.materialId))
    return MANGUERAS.filter(id => id === current || deployed.has(id))
  }
  if (['conectarPiton', 'desconectarPiton', 'dejarPitonLinea', 'entregarPiton', 'cerrarPiton'].includes(op)) {
    const prepared = new Set(tasks.filter(t => t.operacion === 'prepararPiton').map(t => t.materialId))
    return PITONES_AGUA.filter(id => id === current || prepared.has(id))
  }
  if (op === 'recogerMaterial') {
    const deposited = new Set(tasks.filter(t => t.operacion === 'dejarMaterial').flatMap(materialesTarea))
    return MATERIAL_AGUA.filter(id => id === current || deposited.has(id))
  }
  return MATERIAL_AGUA
})
const carga = computed(() => cargaInicialAgua(s.actual?.tareas ?? [], s.bomberoSeleccionado ?? 0))
const acoples = ['gemelo:A', 'gemelo:B', ...MANGUERAS.flatMap(id => [`${id}:0`, `${id}:1`])]
const herramientas = ['TNT', 'Halligan'] as const
const state = (id: string) => { void s.revision; return s.engine?.estados[id] }
function editar(t: Tarea) { draft.value = { ...JSON.parse(JSON.stringify(t)) as Tarea, receptores: [...(t.receptores ?? [])], extremo: t.extremo ?? 0 }; categoria.value = t.categoria; mensaje.value = '' }
function operation(op: Operacion) {
  if (!draft.value) return
  const fresh = nuevaTarea(op, draft.value.bombero, draft.value.id)
  draft.value = { ...fresh, dependencias: draft.value.dependencias, ayudantes: draft.value.ayudantes, extremo: 0, ...(usaLineaAgua(op) || (s.actual?.modoTendido === 'por-blanco' && op === 'lanzarManguera') ? { linea: 'A' as const } : {}) }
}
function guardar() {
  if (!draft.value) return
  if (!draft.value.nombre.trim() || !Number.isFinite(draft.value.duracion) || draft.value.duracion < 0 || draft.value.duracion > 3600) { mensaje.value = 'Indica un nombre y una duración entre 0 y 3600 s.'; return }
  if (!draft.value.herramientas?.length) delete draft.value.herramientas
  draft.value.categoria = OPERACIONES[draft.value.operacion].categoria
  draft.value.ayudantes = draft.value.ayudantes.filter(id => id !== draft.value!.bombero)
  s.tarea(draft.value); draft.value = null; mensaje.value = ''
}
function persona() { if (s.bomberoSeleccionado !== null) s.configurarBombero(s.bomberoSeleccionado, personName.value, personSpeed.value) }
function cambiarMaterial(id: MaterialAguaId, checked: boolean) {
  if (!draft.value) return
  const current = materialesTarea(draft.value)
  draft.value.materiales = checked ? [...new Set([...current, id])] : current.filter(key => key !== id)
  delete draft.value.materialId
}
function cambiarHerramienta(id: 'TNT' | 'Halligan', checked: boolean) {
  if (!draft.value) return
  draft.value.herramientas = checked ? [...new Set([...(draft.value.herramientas ?? []), id])] : draft.value.herramientas?.filter(key => key !== id)
}
function nombreObjetivo(t: Tarea) {
  if (t.conectarA) return `${t.materialId} → ${t.conectarA}`
  if (t.operacion === 'conectarManguera') return `Origen desplegado de ${t.materialId ?? 'la manguera'}`
  if (['desconectarManguera', 'separarLinea'].includes(t.operacion)) return `Acople de ${t.materialId ?? 'la manguera'}`
  if (['recogerManguera', 'recogerMaterial'].includes(t.operacion)) return `Posición de ${t.materialId ?? 'la pieza'}`
  if (['conectarPiton', 'desconectarPiton', 'dejarPitonLinea'].includes(t.operacion)) return `Pitón ${t.materialId ?? '—'} · Línea ${t.linea ?? '—'}`
  return OBJETIVOS.find(o => o.id === t.objetivo)?.nombre
}
</script>
<template><section v-if="s.actual" class="task-panel"><p class="eyebrow">FUNCIONES POR PARTICIPANTE</p><h2>Tareas</h2>
<div class="firefighter-grid"><button v-for="id in 8" :key="id" :aria-pressed="s.bomberoSeleccionado === id" @click="s.bomberoSeleccionado = id">B{{ id }}</button></div><button :aria-pressed="s.bomberoSeleccionado === null" @click="s.bomberoSeleccionado = null">Sin asignar ({{ s.actual.tareas.filter(t => t.bombero === null).length }})</button>
<fieldset :disabled="s.activa"><template v-if="s.bomberoSeleccionado !== null"><label>Nombre de B{{ s.bomberoSeleccionado }}<input v-model="personName" maxlength="40" @change="persona"></label><label>Velocidad de B{{ s.bomberoSeleccionado }} (m/s)<input v-model.number="personSpeed" type="number" min="0.1" max="10" step="0.1" @change="persona"></label><p v-if="s.actual.modoAgua === 'detallado'" class="notice"><strong>Manos planificadas: {{ carga.manos }}/2</strong><br>{{ carga.piezas.length ? carga.piezas.join(' · ') : 'Sin material asignado' }}</p></template>
<button @click="draft = nuevaTarea('mover', s.bomberoSeleccionado); categoria = CATEGORIAS[0]">+ Añadir tarea</button></fieldset>
<p class="small">Las tareas se ejecutan de arriba abajo. Una entrega espera a emisores y receptores; cada equipo se sitúa en su lado del paso. El cruce de los bomberos se programa aparte.</p>
<ol class="task-list"><li v-for="(t, i) in visibles" :key="t.id"><div><strong>{{ i + 1 }}. {{ t.nombre }}</strong><small>{{ t.bombero === null ? 'Sin asignar' : `B${t.bombero}` }}{{ t.ayudantes.length ? ' + ' + t.ayudantes.map(id => `B${id}`).join(', ') : '' }} · {{ nombreObjetivo(t) }} · {{ t.duracion }} s de maniobra</small>
<small v-if="t.materialId || t.materiales?.length || t.linea">{{ materialesTarea(t).length ? `Material ${materialesTarea(t).join(', ')}` : '' }}{{ t.linea ? ` · Línea ${t.linea}` : '' }}</small>
<small v-if="t.herramientas?.length">{{ t.herramientas.join(' · ') }}</small>
<small v-if="t.receptores?.length">Reciben: {{ t.receptores.map(id => `B${id}`).join(', ') }} · Tu función: {{ t.receptores.includes(s.bomberoSeleccionado ?? 0) ? 'receptor' : t.bombero === s.bomberoSeleccionado ? 'responsable de entrega' : 'ayudante de entrega' }}</small><small v-else-if="t.ayudantes.includes(s.bomberoSeleccionado ?? 0)">Tu función: ayudante</small>
<span class="task-state" :data-state="state(t.id)?.estado">{{ state(t.id)?.estado ?? (s.validacion[t.id] || t.bombero === null ? 'bloqueada' : 'configurada') }}</span>
<p v-if="state(t.id)?.motivo || s.validacion[t.id]" class="task-reason">{{ state(t.id)?.motivo || s.validacion[t.id] }}</p><small v-if="state(t.id)">Espera: {{ state(t.id)!.espera.toFixed(1) }} s · {{ Math.round(state(t.id)!.progreso * 100) }}%</small></div>
<div class="strategy-actions"><button :disabled="s.activa" :aria-label="`Editar ${t.nombre}`" @click="editar(t)">Editar</button><button :disabled="s.activa || i === 0" :aria-label="`Subir ${t.nombre}`" @click="s.moverTarea(t.id, -1)">↑</button><button :disabled="s.activa || i === visibles.length - 1" :aria-label="`Bajar ${t.nombre}`" @click="s.moverTarea(t.id, 1)">↓</button><button :disabled="s.activa" :aria-label="`Eliminar ${t.nombre}`" @click="s.eliminarTarea(t.id); if(draft?.id === t.id) draft = null">×</button></div></li></ol>
<p v-if="!visibles.length" class="small">No hay tareas en esta selección.</p>
<form v-if="draft" class="task-form" @submit.prevent="guardar"><fieldset :disabled="s.activa"><h3>{{ s.actual.tareas.some(t => t.id === draft?.id) ? 'Editar tarea' : 'Nueva tarea' }}</h3>
<label>Categoría<select aria-label="Categoría" v-model="categoria" @change="operation(operaciones[0]!)"><option v-for="c in CATEGORIAS" :key="c">{{ c }}</option></select></label>
<label>Acción<select aria-label="Acción" :value="draft.operacion" @change="operation(($event.target as HTMLSelectElement).value as Operacion)"><option v-for="op in operaciones" :key="op" :value="op">{{ OPERACIONES[op].nombre }}</option></select></label>
<label>Nombre de tarea<input v-model="draft.nombre" maxlength="100" required></label>
<label>Bombero responsable<select aria-label="Bombero responsable" v-model="draft.bombero"><option :value="null">Sin asignar</option><option v-for="id in 8" :key="id" :value="id">B{{ id }} · {{ s.actual.bomberos[id]?.nombre }}</option></select></label>
<label v-if="!['conectarPiton', 'desconectarPiton', 'dejarPitonLinea', 'desconectarManguera', 'separarLinea', 'recogerManguera', 'recogerMaterial'].includes(draft.operacion) && (draft.operacion !== 'conectarManguera' || (s.actual.modoTendido === 'por-blanco' && s.actual.perfilTendido !== 'oficial'))">Objetivo<select aria-label="Objetivo" v-model="draft.objetivo"><option v-for="o in objetivos" :key="o.id" :value="o.id">{{ o.nombre }}</option></select></label><p v-else class="small">Destino automático: {{ nombreObjetivo(draft) }}.</p>
<label v-if="usaMaterialAgua(draft.operacion) || (s.actual.modoAgua === 'detallado' && ['entregarPiton', 'cerrarPiton'].includes(draft.operacion))">Pieza de agua<select aria-label="Pieza de agua" v-model="draft.materialId" required><option disabled value="">Selecciona una pieza</option><option v-for="id in materiales" :key="id" :value="id">{{ id }}</option></select></label>
<label v-if="(s.actual.modoAgua === 'detallado' || OPERACIONES_AGUA_DETALLADA.includes(draft.operacion)) && (usaLineaAgua(draft.operacion) || (s.actual.modoTendido === 'por-blanco' && draft.operacion === 'lanzarManguera'))">Línea<select aria-label="Línea de agua" v-model="draft.linea" required><option value="A">Línea A</option><option value="B">Línea B</option></select></label>
<template v-if="s.actual.perfilTendido === 'oficial'">
<label v-if="['lanzarManguera', 'conectarManguera'].includes(draft.operacion)">Extremo de la manguera<select aria-label="Extremo de manguera" v-model.number="draft.extremo"><option :value="0">0 · inicio del tramo</option><option :value="1">1 · final del tramo</option></select></label>
<label v-if="['conectarManguera', 'conectarPiton'].includes(draft.operacion)">Conectar con<select aria-label="Acople de destino" v-model="draft.conectarA" required><option disabled value="">Selecciona un acople</option><option v-for="acople in acoples" :key="acople" :value="acople">{{ acople }}</option></select></label>
<label v-if="draft.operacion === 'entregarPiton'" class="task-check"><input type="checkbox" v-model="draft.conManguera">Pasar también la manguera conectada</label>
</template>
<details v-if="['recogerHerramientas', 'entregarHerramientas', 'abrirPuerta', 'dejarHerramientas'].includes(draft.operacion)" open><summary>Herramientas</summary><p class="small">Sin selección conserva el conjunto de las estrategias anteriores.</p><label v-for="herramienta in herramientas" :key="herramienta" class="task-check"><input type="checkbox" :checked="draft.herramientas?.includes(herramienta)" @change="cambiarHerramienta(herramienta, ($event.target as HTMLInputElement).checked)">{{ herramienta }}</label></details>
<details v-if="draft.operacion === 'dejarMaterial'" open><summary>Piezas que deja en el piso</summary><label v-for="pieza in MATERIAL_AGUA" :key="pieza" class="task-check"><input type="checkbox" :checked="materialesTarea(draft).includes(pieza)" @change="cambiarMaterial(pieza, ($event.target as HTMLInputElement).checked)">{{ pieza }}</label></details>
<p v-if="draft.operacion === 'prepararLlaves'" class="small">L1 y L2 juntas ocupan una mano. La otra queda disponible.</p>
<label>Duración de maniobra (s)<input v-model.number="draft.duracion" type="number" min="0" max="3600" step="0.1" required></label><p class="small">El tiempo de recorrido se calcula aparte según la velocidad. Esperar blanco no mueve al bombero; la duración comienza al caer el blanco.</p>
<details><summary>Ayudantes ({{ draft.ayudantes.length }})</summary><label v-for="id in 8" :key="id" class="task-check"><input v-model="draft.ayudantes" type="checkbox" :value="id" :disabled="id === draft.bombero">B{{ id }} · {{ s.actual.bomberos[id]?.nombre }}</label></details>
<details v-if="esEntrega(draft)" open><summary>Receptores ({{ draft.receptores?.length ?? 0 }})</summary><p class="small">El objetivo indica el lado receptor. Selecciona un receptor para el pitón y al menos dos para la víctima.</p><label v-for="id in 8" :key="id" class="task-check"><input v-model="draft.receptores" type="checkbox" :value="id" :disabled="id === draft.bombero || draft.ayudantes.includes(id)">B{{ id }} · {{ s.actual.bomberos[id]?.nombre }}</label></details>
<details open><summary>Debe esperar estas tareas ({{ draft.dependencias.length }})</summary><div class="dependency-list"><label v-for="t in s.actual.tareas.filter(t => t.id !== draft?.id)" :key="t.id" class="task-check"><input v-model="draft.dependencias" type="checkbox" :value="t.id">{{ t.bombero ? `B${t.bombero}` : 'Sin asignar' }} · {{ t.nombre }}</label><label v-for="id in draft.dependencias.filter(id => !s.actual?.tareas.some(t => t.id === id))" :key="id" class="task-check"><input v-model="draft.dependencias" type="checkbox" :value="id">Dependencia eliminada (desmarcar para reparar)</label></div></details>
<p class="notice">Requisitos: {{ OPERACIONES[draft.operacion].requisitos }}</p><p v-if="mensaje" role="alert">{{ mensaje }}</p><div class="strategy-actions"><button type="submit" class="primary">Guardar tarea</button><button type="button" @click="draft = null">Cancelar</button></div></fieldset></form>
</section></template>
