import { calcularRuta } from './routes.ts'
import { ACCESOS as A } from '../data/cancha.ts'
export interface Pose { x:number; y:number; z:number }
export interface Paso { nombre:string; acciones:[string,string,string]; destinos?:Record<number,Pose>; duracion?:number; efecto?:string; espera?:'camilla'|'blanco8' }
export const p=(x:number,z:number,y=0):Pose=>({x,y,z})
const muro=A.muro.posicion.z
export const PASOS:Paso[]=[
{nombre:'Ingreso a Zona IV',acciones:['Corre al muro','Corre al muro','Corre al muro'],destinos:{1:p(2,muro),2:p(3,muro+1),3:p(4,muro-1)}},
{nombre:'Tres bomberos pasan el muro',acciones:['Pasa a Zona I','Pasa a Zona I','Pasa a Zona I'],destinos:{1:p(-2,muro),2:p(-3,muro),3:p(-4,muro)}},
{nombre:'Distribución de funciones',acciones:['Busca Holligan y TNT','Se instala en el gemelo','Se prepara para el blanco 1'],destinos:{1:p(-3.5,-3),2:p(-11,-23),3:p(-21,-1)}},
{nombre:'Recoger herramientas',acciones:['Recoge herramientas','Opera el gemelo','Espera apoyo de manguera'],duracion:3,efecto:'recoger'},
{nombre:'Herramientas al muro',acciones:['Lleva herramientas al muro','Opera el gemelo','Espera apoyo de manguera'],destinos:{1:p(-2,muro)},efecto:'herramientas'},
{nombre:'Entrega a Zona IV',acciones:['Pasa herramientas por encima del muro','Mantiene el suministro','Espera apoyo de manguera'],duracion:4,efecto:'entregaHerramientas'},
{nombre:'Apoyo al pitonero',acciones:['Ayuda a mover las mangueras','Opera el gemelo','Prepara el pitón'],destinos:{1:p(-20,-1)},efecto:'manguera'},
{nombre:'Derribo del blanco 1',acciones:['Sostiene la manguera','Da agua al pitonero','Apunta al disco 1'],duracion:4,efecto:'blanco1'},
{nombre:'Desplazamiento al blanco 2',acciones:['Mueve la manguera con B3','Mantiene el suministro','Se dirige al blanco 2'],destinos:{1:p(-5,-16),3:p(-4,-17.5)},efecto:'manguera'},
{nombre:'Derribo del blanco 2',acciones:['Apoya la línea','Mantiene el suministro','Apunta al disco 2'],duracion:4,efecto:'blanco2'},
{nombre:'Recepción de camilla',acciones:['Espera camilla en el muro','Permanece en el gemelo','Ayuda a recibir la camilla'],destinos:{1:p(-2,muro-0.7),3:p(-2,muro+0.7)}},
{nombre:'Esperando al equipo de Zona IV',acciones:['Espera entrega de camilla','Permanece en el gemelo','Espera entrega de camilla'],espera:'camilla'},
{nombre:'Pasar camilla a Zona I',acciones:['Recibe la camilla','Permanece en el gemelo','Recibe la camilla'],duracion:4,efecto:'recibirCamilla'},
{nombre:'Camilla hasta la víctima',acciones:['Transporta la camilla','Permanece en el gemelo','Transporta la camilla'],destinos:{1:p(-22,-21.3),3:p(-22,-19.7)},efecto:'camilla'},
{nombre:'Colocar víctima',acciones:['Coloca la víctima en la camilla','Permanece en el gemelo','Ayuda a colocar la víctima'],duracion:5,efecto:'cargar'},
{nombre:'Asegurar víctima',acciones:['Ajusta las sujeciones','Permanece en el gemelo','Comprueba las sujeciones'],duracion:5,efecto:'asegurar'},
{nombre:'Víctima hasta el muro',acciones:['Transporta víctima asegurada','Permanece en el gemelo','Transporta víctima asegurada'],destinos:{1:p(-2,muro-0.7),3:p(-2,muro+0.7)},efecto:'victima'},
{nombre:'Entregar víctima a Zona IV',acciones:['Eleva y entrega la camilla','Permanece en el gemelo','Eleva y entrega la camilla'],duracion:5,efecto:'entregarVictima'},
{nombre:'B1 y B3 salen de Zona I',acciones:['Pasa el muro a Zona IV','Espera la caída del blanco 8','Pasa el muro a Zona IV'],destinos:{1:p(3,muro-0.5),3:p(3,muro+0.5)}},
{nombre:'Gemelero espera el último blanco',acciones:['Con el equipo de Zona IV','Espera la caída del blanco 8','Con el equipo de Zona IV'],espera:'blanco8'},
{nombre:'Gemelero abandona el gemelo',acciones:['Con el equipo de Zona IV','Corre al muro y lo pasa','Con el equipo de Zona IV'],destinos:{2:p(2,muro)}},
{nombre:'Gemelero atraviesa el tubo',acciones:['Con el equipo de Zona IV','Cruza hacia Zona III por el tubo','Con el equipo de Zona IV'],destinos:{2:p(A.tubo.posicion.x,3)}},
{nombre:'Gemelero corre a la salida',acciones:['Con el equipo de Zona IV','Pasa por la puerta y sale por A','Con el equipo de Zona IV'],destinos:{2:p(A.salida.posicion.x,28)}},
]
const length=(a:Pose,b:Pose)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)
export class ZoneOne {
  index=0; tiempo=0; transcurrido=0; finalizado=false; camilla=false; blanco8=false; aviso=false
  poses:Record<number,Pose>; distancias:Record<number,number>={1:0,2:0,3:0}
  paths:Record<number,Pose[]>={}; durations:Record<number,number>={}; duration=0
  private velocidades:Record<number,number>
  constructor(inicios:Record<number,Pose>,velocidades:Record<number,number>){this.velocidades=velocidades;this.poses=structuredClone(inicios);this.prepare()}
  get paso(){return PASOS[this.index]!}
  get esperando(){return !!this.paso.espera&&!this[this.paso.espera]}
  get progreso(){return this.duration?Math.min(1,this.transcurrido/this.duration):0}
  private prepare(){
    this.paths={};this.durations={};this.duration=this.paso.duracion??0;this.transcurrido=0
    for(const [key,end] of Object.entries(this.paso.destinos??{})){
      const id=Number(key),start=this.poses[id]!,route=calcularRuta(start,end)
      if(!route)throw Error('No existe ruta para '+this.paso.nombre)
      const path:Pose[]=[{...start}]
      for(let i=1;i<route.length;i++){
        const a=route[i-1]!,b=route[i]!
        if(a.x*b.x<0){const t=-a.x/(b.x-a.x),z=a.z+t*(b.z-a.z);if(Math.abs(z-muro)<A.muro.ancho/2)path.push(p(0,z,A.muro.alto+0.3))}
        path.push(p(route[i]!.x,route[i]!.z))
      }
      this.paths[id]=path;this.durations[id]=path.slice(1).reduce((s,b,i)=>s+length(path[i]!,b),0)/this.velocidades[id]!
      this.duration=Math.max(this.duration,this.durations[id]!)
    }
  }
  tick(dt:number){
    if(this.finalizado)return
    this.tiempo+=dt
    if(this.esperando)return
    if(this.paso.espera){this.index++;this.prepare();return}
    const previous=this.transcurrido;this.transcurrido=Math.min(this.duration,this.transcurrido+dt)
    for(const [key,path] of Object.entries(this.paths)){
      const id=Number(key),total=this.durations[id]!*this.velocidades[id]!,dist=Math.min(total,this.transcurrido*this.velocidades[id]!)
      this.distancias[id]!+=Math.max(0,dist-Math.min(total,previous*this.velocidades[id]!))
      let remaining=dist
      for(let i=1;i<path.length;i++){const a=path[i-1]!,b=path[i]!,d=length(a,b);if(remaining<=d||i===path.length-1){const t=d?Math.min(1,remaining/d):1;this.poses[id]={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};break}remaining-=d}
    }
    if(this.paso.efecto==='entregarVictima'&&this.progreso>=0.5&&!this.blanco8)this.aviso=true
    if(this.transcurrido>=this.duration){if(this.index===PASOS.length-1){this.finalizado=true;return}this.index++;this.prepare()}
  }
}

