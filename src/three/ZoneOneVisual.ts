import * as THREE from 'three'
import type { ZoneOne, Pose } from '../simulation/ZoneOne'
import { ELEMENTOS as E } from '../data/elementos'
import { BLANCOS } from '../data/blancos'
import { ACCESOS as A } from '../data/cancha'
import type { Cancha } from './cancha/Cancha'
import { box, label } from './primitives'
export class ZoneOneVisual extends THREE.Group {
  private water=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#46c7ff'}))
  private hose=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#e0b95e'}))
  private straps=new THREE.Group()
  constructor(){super();this.add(this.water,this.hose,this.straps)
    for(const z of [-0.55,0.55])box(this.straps,[1.1,0.08,0.15],[0,0.35,z],'#26434d')
    const relay=new THREE.Mesh(new THREE.RingGeometry(1.3,1.5,32),new THREE.MeshBasicMaterial({color:'#7b8986',side:THREE.DoubleSide}));relay.rotation.x=-Math.PI/2;relay.position.set(4,0.08,A.muro.posicion.z);this.add(relay)
    this.add(label('Equipo IV · entrega / recepción',4,2,A.muro.posicion.z,7))
  }
  private line(line:THREE.Line,points:THREE.Vector3[]){line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(points)}
  reset(cancha:Cancha){for(const group of Object.values(cancha.objetos))group.position.set(0,0,0);cancha.blancos.forEach(b=>b.levantar());this.visible=false}
  renderState(e:Omit<ZoneOne,never>,cancha:Cancha){
    this.visible=true;const i=e.index,t=e.progreso,muro=A.muro.posicion.z
    const a=e.poses[1]!,b=e.poses[3]!,mid={x:(a.x+b.x)/2,y:0.5,z:(a.z+b.z)/2}
    const move=(key:'herramientas'|'camilla'|'victima',p:Pose)=>cancha.objetos[key]!.position.set(p.x-E[key].posicion.x,p.y,p.z-E[key].posicion.z)
    for(const group of Object.values(cancha.objetos))group.position.set(0,0,0)
    if(i===3||i===4)move('herramientas',{...a,y:0.8})
    if(i===5)move('herramientas',{x:-2+4*t,y:0.8+Math.sin(t*Math.PI)*1.3,z:muro})
    if(i>5)move('herramientas',{x:2,y:0,z:muro})
    this.hose.visible=i>=6
    if(this.hose.visible)this.line(this.hose,[new THREE.Vector3(E.gemelo.posicion.x,0.12,E.gemelo.posicion.z),new THREE.Vector3(i>=10?-5:a.x,0.12,i>=10?-16:a.z),new THREE.Vector3(i>=10?-4:b.x,0.8,i>=10?-17.5:b.z)])
    this.water.visible=i===7||i===9
    if(this.water.visible){const target=BLANCOS[i===7?0:1]!.posicion;this.line(this.water,[new THREE.Vector3(b.x,1.1,b.z),new THREE.Vector3(target.x,1.8,target.z)])}
    cancha.blancos.forEach((target,index)=>{if((index===0&&i>7)||(index===1&&i>9)||(index>=2&&e.blanco8))target.derribar();else target.levantar()})
    if(i===12)move('camilla',{x:2-4*t,y:0.5+Math.sin(t*Math.PI)*1.5,z:muro})
    if(i>=13&&i<=16)move('camilla',mid)
    if(i===14)move('victima',{...E.victima.posicion,y:0.5*t})
    if(i===15||i===16)move('victima',{...mid,y:0.6})
    let carried:Pose=mid
    if(i===17){carried={x:-2+4*t,y:0.5+Math.sin(t*Math.PI)*1.5,z:muro};move('camilla',carried);move('victima',{...carried,y:carried.y+0.1})}
    if(i>17){carried={x:2,y:0.5,z:muro};move('camilla',carried);move('victima',{...carried,y:0.6})}
    this.straps.visible=i>=15;this.straps.position.set(carried.x,carried.y,carried.z)
    if(i>=12&&i<=16)this.straps.position.set(mid.x,mid.y,mid.z)
  }
}





