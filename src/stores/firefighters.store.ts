import { defineStore } from 'pinia'
import { Vector3 } from 'three'
import { ELEMENTOS } from '../data/elementos.ts'
import { calcularRuta, distanciaRuta } from '../simulation/routes.ts'
import type { Punto } from '../simulation/routes.ts'
export type EstadoBombero = 'esperando' | 'corriendo' | 'transportando-material' | 'operando-piton' | 'entrada-forzada' | 'rescatando' | 'transportando-victima' | 'subiendo-escala' | 'con-banderin' | 'finalizado'
export interface Bombero { id:number; nombre:string; rol:string; velocidad:number; posicion:Vector3; ruta:Vector3[]; destinos:Punto[]; estado:EstadoBombero; distanciaRecorrida:number }
function nombresGuardados():Record<string,string>{try{const value:unknown=JSON.parse(localStorage.getItem('fundadores-nombres')??'{}');if(value&&typeof value==='object'&&!Array.isArray(value))return Object.fromEntries(Object.entries(value).filter(([k,v])=>/^[1-8]$/.test(k)&&typeof v==='string'&&v.length<=40));}catch{}return {}}
const nombres=nombresGuardados()
export const COLORES=['#f2b544','#6bc4ea','#e98a86','#c2a0e9','#a5d476','#eea364','#83d7c5','#e3b9ce']
export const useFirefightersStore=defineStore('firefighters',{
state:()=>({bomberos:Array.from({length:8},(_,i):Bombero=>({id:i+1,nombre:nombres[String(i+1)]??`B${i+1}`,rol:'',velocidad:4,posicion:new Vector3(ELEMENTOS.inicio.posicion.x-2.4+i%4*1.6,0,ELEMENTOS.inicio.posicion.z-1+Math.floor(i/4)*1.6),ruta:[],destinos:[],estado:'esperando',distanciaRecorrida:0})),bomberoSeleccionado:1,editando:false,mensaje:''}),
getters:{seleccionado:state=>state.bomberos.find(b=>b.id===state.bomberoSeleccionado)!,distancia():number{return distanciaRuta([this.seleccionado.posicion,...this.seleccionado.ruta])},tiempo():number{return this.distancia/this.seleccionado.velocidad}},
actions:{
renombrar(value:string){this.seleccionado.nombre=value.trim().slice(0,40)||`B${this.seleccionado.id}`;try{localStorage.setItem('fundadores-nombres',JSON.stringify(Object.fromEntries(this.bomberos.map(b=>[b.id,b.nombre]))))}catch{this.mensaje='Nombre cambiado; no se pudo guardar en este navegador.'}},
actualizarDestinos(destinos:Punto[]){const b=this.seleccionado;const ruta:Vector3[]=[];let current:Punto=b.posicion
for(const p of destinos){const segment=calcularRuta(current,p);if(!segment){this.mensaje='Punto no válido: elige una posición separada de los cierres y dentro del área de trabajo.';return false}ruta.push(...segment.slice(1).map(v=>new Vector3(v.x,0,v.z)));current=p}
b.destinos=destinos;b.ruta=ruta;this.mensaje='';return true},
agregar(p:Punto){this.actualizarDestinos([...this.seleccionado.destinos,{x:p.x,z:p.z}])},
eliminar(index:number){this.actualizarDestinos(this.seleccionado.destinos.filter((_,i)=>i!==index))},
mover(index:number,direction:number){const list=[...this.seleccionado.destinos],next=index+direction;if(next<0||next>=list.length)return;[list[index],list[next]]=[list[next]!,list[index]!];this.actualizarDestinos(list)},
velocidad(value:number){if(Number.isFinite(value)&&value>=0.1&&value<=10)this.seleccionado.velocidad=value}
}})
