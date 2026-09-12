<script setup lang="ts">
import { useSimulatorStore } from '../stores/simulator.store'
import { useZoneOneStore } from '../stores/zoneOne.store'
import { useFirefightersStore } from '../stores/firefighters.store'
import { PASOS } from '../simulation/ZoneOne'
const camera=useSimulatorStore();const s=useZoneOneStore(),b=useFirefightersStore()
</script>
<template><section class="zone-one"><p class="eyebrow">SECUENCIA CONFIGURADA · ZONA I</p><h2>Herramientas, agua y rescate</h2><p class="small">B1 apoya y rescata · B2 opera el gemelo · B3 es pitonero y rescatista. Los nombres se editan debajo.</p>
<button v-if="!s.activa" @click="s.iniciar()">▶ Reproducir secuencia Zona I</button>
<template v-else><button class="focus-zone" @click="camera.vistaCamara='3d';camera.enfoqueZonaI++">Acercar Zona I</button><div class="simulation-buttons"><button :disabled="s.finalizado" @click="s.reproduciendo=!s.reproduciendo">{{s.reproduciendo?'Pausar':'Continuar'}}</button><button @click="s.iniciar()">Reiniciar</button><button @click="s.cerrar()">Volver al editor</button></div>
<label>Velocidad de reproducción<select v-model.number="s.velocidad"><option v-for="v in [0.25,0.5,1,2,4]" :key="v" :value="v">{{v}}×</option></select></label>
<div class="simulation-clock">{{s.tiempo.toFixed(1)}} s <small>{{s.finalizado?'Secuencia completada':s.esperando?'Esperando evento externo':s.reproduciendo?'En reproducción':'En pausa'}}</small></div>
<strong class="stage-title">{{s.paso+1}} / {{PASOS.length}} · {{PASOS[s.paso]!.nombre}}</strong><progress :value="s.finalizado?PASOS.length:s.paso" :max="PASOS.length"></progress>
<ul class="actor-status"><li v-for="(action,i) in PASOS[s.paso]!.acciones" :key="i"><strong>B{{i+1}} · {{b.bomberos[i]!.nombre}}</strong><span>{{action}}</span></li></ul>
<div class="external-events"><strong>Eventos del equipo de otras zonas</strong><button :disabled="s.camilla||s.paso<11" @click="s.evento('camilla')">{{s.camilla?'✓ Camilla entregada':'Entregar camilla desde Zona IV'}}</button><button :disabled="s.blanco8||s.paso<10" @click="s.evento('blanco8')">{{s.blanco8?'✓ Blanco 8 caído':'Confirmar blancos 3–8 caídos'}}</button><p class="small">Actívalos cuando el equipo externo complete esas tareas. B2 espera hasta la caída del blanco 8 y sale último de Zona I. El traslado externo de la camilla no se simula.</p></div>
<p v-if="s.aviso" role="status" class="notice">+120 s de referencia: la víctima se entregó a Zona IV con blancos pendientes. El tiempo mostrado es bruto; aún no es el resultado de la competencia.</p>
<details><summary>Ver secuencia completa</summary><ol><li v-for="(paso,i) in PASOS" :key="i" :class="{current:i===s.paso}">{{paso.nombre}}</li></ol></details></template>
<p v-if="s.error" role="alert">{{s.error}}</p><p class="small">Coreografía ilustrativa: duraciones de maniobras provisionales, líneas conectadas asumidas y agua esquemática. La secuencia termina con la salida de B2; no representa el fin de toda la competencia.</p></section></template>

