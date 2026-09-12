<script setup lang="ts">
import { useZoneOneStore } from '../stores/zoneOne.store'
import { ref, watch } from 'vue'
import { useFirefightersStore, COLORES } from '../stores/firefighters.store'
import { ELEMENTOS } from '../data/elementos'
const sim=useZoneOneStore();const s=useFirefightersStore(),x=ref(10),z=ref(10),editIndex=ref<number|null>(null)
watch(()=>s.bomberoSeleccionado,()=>editIndex.value=null)
function guardar(){
  if(editIndex.value===null)s.agregar({x:x.value,z:z.value})
  else {const destinos=[...s.seleccionado.destinos];destinos[editIndex.value]={x:x.value,z:z.value};if(s.actualizarDestinos(destinos))editIndex.value=null}
}
</script>
<template><section class="route-editor"><p class="eyebrow">FASE 02 · PLANIFICACIÓN</p><h2>Bomberos y rutas</h2>
<div class="firefighter-grid"><button v-for="b in s.bomberos" :key="b.id" :aria-pressed="s.bomberoSeleccionado===b.id" :style="{borderColor:COLORES[b.id-1]}" @click="s.bomberoSeleccionado=b.id;s.mensaje=''">B{{b.id}}</button></div>
<label>Nombre de B{{s.seleccionado.id}}<input :value="s.seleccionado.nombre" maxlength="40" @change="s.renombrar(($event.target as HTMLInputElement).value)"></label><p class="small">Los nombres se guardan en este navegador.</p><fieldset :disabled="sim.activa"><label>Rol de {{s.seleccionado.nombre}}<input v-model="s.seleccionado.rol" placeholder="Sin asignar" maxlength="60" list="roles"></label><datalist id="roles"><option>Pitonero</option><option>Material</option><option>Rescate</option><option>Entrada forzada</option><option>Escala y banderín</option></datalist>
<label>Velocidad (m/s)<input :value="s.seleccionado.velocidad" type="number" min="0.1" max="10" step="0.1" @change="s.velocidad(Number(($event.target as HTMLInputElement).value));($event.target as HTMLInputElement).value=String(s.seleccionado.velocidad)"></label>
<button class="draw-route" :aria-pressed="s.editando" @click="s.editando=!s.editando">{{s.editando?'Terminar edición en cancha':'Dibujar ruta en cancha'}}</button>
<p class="small">{{s.editando?'Haz clic en el suelo para agregar destinos. Arrastrar mueve la cámara.':'Agrega destinos con coordenadas o dibuja sobre la cancha.'}} Los desvíos por accesos se calculan automáticamente.</p>
<form class="coordinates" @submit.prevent="guardar"><label>X<input v-model.number="x" type="number" min="-33" max="33" step="0.5" required></label><label>Z<input v-model.number="z" type="number" min="-32" max="34" step="0.5" required></label><button>{{editIndex===null?"Agregar punto":"Guardar punto"}}</button></form>
<div class="quick-points"><button @click="s.agregar(ELEMENTOS.material.posicion)">+ Material</button><button @click="s.agregar({x:10,z:-10})">+ Zona IV</button><button @click="s.agregar({x:-12.5,z:28})">+ Meta</button></div>
<p v-if="s.mensaje" role="alert">{{s.mensaje}}</p>
<ol class="destination-list"><li v-for="(p,i) in s.seleccionado.destinos" :key="i"><span>{{i+1}}. ({{p.x.toFixed(1)}}, {{p.z.toFixed(1)}})</span><button :aria-label="`Editar punto ${i+1}`" @click="x=p.x;z=p.z;editIndex=i">✎</button><button :disabled="i===0" :aria-label="`Subir punto ${i+1}`" @click="s.mover(i,-1);editIndex=null">↑</button><button :disabled="i===s.seleccionado.destinos.length-1" :aria-label="`Bajar punto ${i+1}`" @click="s.mover(i,1);editIndex=null">↓</button><button :aria-label="`Eliminar punto ${i+1}`" @click="s.eliminar(i);editIndex=null">×</button></li></ol>
<button :disabled="!s.seleccionado.destinos.length" @click="s.actualizarDestinos([]);editIndex=null">Borrar ruta de {{s.seleccionado.nombre}}</button>
<div class="route-metrics"><strong>{{s.distancia.toFixed(1)}} m<small>Distancia planificada</small></strong><strong>{{s.tiempo.toFixed(1)}} s<small>Tiempo de traslado</small></strong></div>
<p class="small">Estimación sin tiempos de trepar, gatear, abrir puerta ni trabajar. La puerta es planificable tras la entrada forzada. Estado: esperando; distancia recorrida: 0 m. El plan se pierde al recargar.</p>
</fieldset></section></template>


