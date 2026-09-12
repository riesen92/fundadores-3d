import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { ZoneOne } from '../simulation/ZoneOne'
import { useFirefightersStore } from './firefighters.store'
export const useZoneOneStore=defineStore('zoneOne',{
state:()=>({activa:false,reproduciendo:false,velocidad:1,tiempo:0,paso:0,esperando:false,finalizado:false,aviso:false,camilla:false,blanco8:false,engine:null as ZoneOne|null,error:''}),
actions:{
 iniciar(){const b=useFirefightersStore();try{this.engine=markRaw(new ZoneOne(Object.fromEntries(b.bomberos.slice(0,3).map(v=>[v.id,{x:v.posicion.x,y:0,z:v.posicion.z}])),Object.fromEntries(b.bomberos.slice(0,3).map(v=>[v.id,v.velocidad]))));this.activa=true;this.reproduciendo=true;this.tiempo=0;this.paso=0;this.camilla=false;this.blanco8=false;this.aviso=false;this.finalizado=false;this.error='';b.editando=false;b.bomberos[0]!.rol='Herramientas · apoyo de mangueras · rescate';b.bomberos[1]!.rol='Gemelero';b.bomberos[2]!.rol='Pitonero · rescate'}catch(e){this.error=e instanceof Error?e.message:String(e)}},
 tick(dt:number){if(!this.engine||!this.reproduciendo)return;this.engine.tick(dt*this.velocidad);this.tiempo=this.engine.tiempo;this.paso=this.engine.index;this.esperando=this.engine.esperando;this.finalizado=this.engine.finalizado;this.aviso=this.engine.aviso;if(this.finalizado)this.reproduciendo=false},
 evento(tipo:'camilla'|'blanco8'){if(!this.engine)return;this.engine[tipo]=true;this[tipo]=true},
 cerrar(){this.activa=false;this.reproduciendo=false;this.engine=null},
}})
