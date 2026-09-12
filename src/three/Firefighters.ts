import { ACCESOS } from '../data/cancha'
import * as THREE from 'three'
import type { Bombero } from '../stores/firefighters.store'
import { COLORES } from '../stores/firefighters.store'
import { box,label } from './primitives'
export class Firefighters extends THREE.Group {
  private actors = new Map<number, THREE.Group>()
  private mostrarEtiquetas = true
  private mostrarRutas = false
  private bomberoSeleccionado = 0
  setLabelsVisible(visible:boolean){this.mostrarEtiquetas=visible;this.traverse(o=>{if(o.name==='etiqueta-bombero')o.visible=visible})}
  setRoutesVisible(visible:boolean){this.mostrarRutas=visible;this.traverse(o=>{if(o.name==='ruta-bombero')o.visible=visible&&o.userData.bomberoId===this.bomberoSeleccionado})}
  pose(id:number,p:{x:number;y:number;z:number}){const actor=this.actors.get(id);if(actor){actor.position.set(p.x,p.y,p.z);actor.scale.y=Math.abs(p.x-ACCESOS.tubo.posicion.x)<ACCESOS.tubo.diametro/2&&Math.abs(p.z)<ACCESOS.tubo.largo/2?0.45:1}}
  clearResources(){this.actors.clear();this.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Sprite){o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if('map' in m&&m.map instanceof THREE.Texture)m.map.dispose();m.dispose()}}});this.clear()}
  update(bomberos:Bombero[],selected:number){this.bomberoSeleccionado=selected;this.clearResources()
    for(const b of bomberos){const color=COLORES[b.id-1]!,group=new THREE.Group();group.position.copy(b.posicion);this.add(group);this.actors.set(b.id,group)
      box(group,[0.5,0.75,0.3],[0,1.05,0],color)
      for (const x of [-.28,.28]) { box(group,[.14,.45,.16],[x,1.05,0],color); box(group,[.15,.14,.18],[x,.85,0],'#d8b18b') }
      for(const x of [-0.16,0.16])box(group,[0.18,0.65,0.22],[x,0.35,0],'#293b34')
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.22,12,8),new THREE.MeshStandardMaterial({color}));head.position.y=1.65;group.add(head)
      const etiqueta=label(b.nombre===`B${b.id}`?b.nombre:`B${b.id} ${b.nombre}`,0,2.5,0,b.nombre.length>2?4.5:1.8);etiqueta.name='etiqueta-bombero';etiqueta.visible=this.mostrarEtiquetas;group.add(etiqueta)
      if(b.id===selected){const ring=new THREE.Mesh(new THREE.RingGeometry(0.65,0.85,24),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=0.1;group.add(ring)}
      if(b.ruta.length){const points=[b.posicion,...b.ruta].map(p=>new THREE.Vector3(p.x,0.18,p.z)),route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true}));route.name='ruta-bombero';route.userData.bomberoId=b.id;route.visible=this.mostrarRutas&&b.id===selected;this.add(route)}
      if(b.id===selected)b.destinos.forEach((p,i)=>this.add(label(String(i+1),p.x,0.8,p.z,1.2)))}
  }
}
