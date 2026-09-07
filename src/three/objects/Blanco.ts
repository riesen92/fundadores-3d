import * as THREE from 'three'
import { GEOMETRIA_BLANCO as G } from '../../data/blancos'
import { box } from '../primitives'
export class Blanco extends THREE.Group {
  private caido = false
  private soporte = new THREE.Group()
  constructor(public readonly numero: number) {
    super(); this.add(this.soporte)
    box(this, [0.9, 0.12, 0.9], [0, 0.06, 0], '#46564c')
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(G.radioPoste, G.radioPoste, G.altura), new THREE.MeshStandardMaterial({ color: '#e1d5b6' })); poste.position.y = G.altura / 2; this.soporte.add(poste)
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(G.radioDisco, G.radioDisco, 0.12, 32), new THREE.MeshStandardMaterial({ color: '#efb953' })); disco.rotation.x = Math.PI / 2; disco.position.y = G.altura; this.soporte.add(disco)
  }
  derribar() { this.caido = true; this.soporte.rotation.x = -Math.PI / 2 }
  levantar() { this.caido = false; this.soporte.rotation.x = 0 }
  estaCaido() { return this.caido }
}
