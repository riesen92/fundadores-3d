import * as THREE from 'three'
import { GEOMETRIA_BLANCO as G } from '../../data/blancos'
import { box } from '../primitives'
export class Blanco extends THREE.Group {
  private caido = false
  private soporte = new THREE.Group()
  constructor(public readonly numero: number) {
    super(); this.add(this.soporte)
    // Flecha del croquis en el suelo; indica dirección, sin validar todavía el chorro.
    const flecha = new THREE.Shape()
    flecha.moveTo(-0.2, 0); flecha.lineTo(0.2, 0); flecha.lineTo(0.2, 1.2)
    flecha.lineTo(0.6, 1.2); flecha.lineTo(0, 2); flecha.lineTo(-0.6, 1.2)
    flecha.lineTo(-0.2, 1.2); flecha.closePath()
    const indicador = new THREE.Mesh(new THREE.ShapeGeometry(flecha), new THREE.MeshBasicMaterial({ color: '#e68d37', side: THREE.DoubleSide }))
    indicador.rotation.x = -Math.PI / 2; indicador.position.set(1.2, 0.08, 0.7); this.add(indicador)
    box(this, [0.9, 0.12, 0.9], [0, 0.06, 0], '#46564c')
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(G.radioPoste, G.radioPoste, G.altura), new THREE.MeshStandardMaterial({ color: '#e1d5b6' })); poste.position.y = G.altura / 2; this.soporte.add(poste)
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(G.radioDisco, G.radioDisco, 0.12, 32), new THREE.MeshStandardMaterial({ color: '#efb953' })); disco.rotation.x = Math.PI / 2; disco.position.y = G.altura; this.soporte.add(disco)
  }
  derribar() { this.caido = true; this.soporte.rotation.x = -Math.PI / 2 }
  levantar() { this.caido = false; this.soporte.rotation.x = 0 }
  estaCaido() { return this.caido }
}
