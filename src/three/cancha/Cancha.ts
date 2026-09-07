import * as THREE from 'three'
import { CANCHA as C, ZONAS, ACCESOS as A } from '../../data/cancha'
import { ELEMENTOS as E, MATERIAL } from '../../data/elementos'
import { BLANCOS } from '../../data/blancos'
import { Blanco } from '../objects/Blanco'
import { box, label } from '../primitives'
export class Cancha extends THREE.Group {
  readonly etiquetas = new THREE.Group()
  readonly cierres = new THREE.Group()
  readonly blancos: Blanco[] = []
  constructor() {
    super(); this.add(this.etiquetas, this.cierres)
    box(this, [76, 0.15, 80], [0, -0.22, 2], '#c2c7b7')
    for (const z of ZONAS) {
      box(this, [C.mitad, 0.1, C.mitad], [z.x, -0.05, z.z], z.color)
      this.etiquetas.add(label(`ZONA ${z.id}`, z.x, 0.6, z.z + (z.z > 0 ? -5 : 5), 7))
    }
    const grid = new THREE.GridHelper(C.ancho, 50, '#a9c2ad', '#a9c2ad'); grid.position.y = 0.015
    const mat = grid.material as THREE.Material; mat.transparent = true; mat.opacity = 0.18; this.add(grid)
    const major = new THREE.GridHelper(C.ancho, 10, '#d1ddbc', '#d1ddbc'); major.position.y = 0.025; (major.material as THREE.Material).transparent = true; (major.material as THREE.Material).opacity = 0.3; this.add(major)
    // Segment boundaries leave only the explicitly configured passages open.
    this.wall('x', -25, -25, 25); this.wall('z', -25, -25, 25)
    this.split('x', 25, -25, 25, A.ingreso.posicion.z, A.ingreso.ancho)
    this.split('z', 25, -25, 25, A.salida.posicion.x, A.salida.ancho)
    this.split('x', 0, -25, 0, A.muro.posicion.z, A.muro.ancho)
    this.split('x', 0, 0, 25, A.puerta.posicion.z, A.puerta.ancho)
    this.wall('z', 0, -25, 0)
    this.split('z', 0, 0, 25, A.tubo.posicion.x, A.tubo.diametro + A.tubo.espesor * 2)
    box(this, [A.muro.espesorVisual, A.muro.alto, A.muro.ancho], [0, A.muro.alto / 2, A.muro.posicion.z], '#ccad79')
    this.etiquetas.add(label('MURO · 1,33 × 2 m', 0, 3.4, A.muro.posicion.z, 7))
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(A.tubo.diametro / 2, A.tubo.diametro / 2, A.tubo.largo, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#d1b375', side: THREE.DoubleSide })); tube.rotation.x = Math.PI / 2; tube.position.set(A.tubo.posicion.x, A.tubo.diametro / 2, 0); this.add(tube)
    for (const z of [-A.tubo.largo / 2, A.tubo.largo / 2]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(A.tubo.diametro / 2, A.tubo.espesor, 8, 40), new THREE.MeshStandardMaterial({ color: '#b59661' })); ring.position.set(A.tubo.posicion.x, A.tubo.diametro / 2, z); this.add(ring) }
    this.etiquetas.add(label('TUBO*', A.tubo.posicion.x, 2.8, 0))
    box(this, [0.15, A.puerta.alto, A.puerta.ancho], [0, A.puerta.alto / 2, A.puerta.posicion.z], '#926b4d')
    for (const sign of [-1, 1]) box(this, [A.puerta.largoPasillo, 1.2, 0.12], [0, 0.6, A.puerta.posicion.z + sign * A.puerta.ancho / 2], '#718078')
    box(this, [0.35, 0.35, 0.28], [0.2, 1.15, A.puerta.posicion.z], '#e4bb52')
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#d2d5cc' })); shackle.rotation.y = Math.PI / 2; shackle.position.set(0.2, 1.32, A.puerta.posicion.z); this.add(shackle)
    this.etiquetas.add(label('PUERTA / CANDADO*', 0, 3.5, A.puerta.posicion.z, 7))
    for (const b of BLANCOS) { const target = new Blanco(b.id); target.position.set(b.posicion.x, b.posicion.y, b.posicion.z); target.rotation.y = b.orientacion; this.add(target); this.blancos.push(target); this.etiquetas.add(label(`${b.id}`, b.posicion.x, 3.2, b.posicion.z, 1.9)) }
    for (const key of ['gemelo', 'bomba', 'victima', 'camilla', 'herramientas'] as const) { const e = E[key]; box(this, e.dimensiones, [e.posicion.x, e.dimensiones[1]! / 2, e.posicion.z], e.color); this.etiquetas.add(label(e.nombre, e.posicion.x, 2.8, e.posicion.z, 6)) }
    // Two distinct outlets on the base manifold.
    for (const dx of [-0.45, 0.45]) box(this, [0.2, 0.25, 0.6], [E.gemelo.posicion.x + dx, 0.4, E.gemelo.posicion.z + 0.5], '#444e49')
    box(this, [0.072, 0.072, E.gemelo.posicion.z - E.bomba.posicion.z], [E.gemelo.posicion.x, 0.15, (E.gemelo.posicion.z + E.bomba.posicion.z) / 2], '#d5cbaa')
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22), new THREE.MeshStandardMaterial({ color: '#e3aa72' })); head.position.set(E.victima.posicion.x, 0.23, E.victima.posicion.z - 1.05); this.add(head)
    for (const side of [-1, 1]) box(this, [0.1, 0.25, 2.3], [E.camilla.posicion.x + side * 0.5, 0.35, E.camilla.posicion.z], '#b6653e')
    for (const dx of [-0.45, 0.45]) { box(this, [0.07, 0.12, 1.1], [E.herramientas.posicion.x + dx, 0.22, E.herramientas.posicion.z], '#3c4943'); box(this, [0.4, 0.14, 0.16], [E.herramientas.posicion.x + dx, 0.23, E.herramientas.posicion.z - 0.5], '#d4dad2') }
    for (const side of [-1, 1]) box(this, [0.08, E.escala.alto, 0.1], [E.escala.posicion.x + side * E.escala.anchoVisual / 2, E.escala.alto / 2, E.escala.posicion.z], '#e6e6d6')
    for (let y = 0.3; y < E.escala.alto; y += 0.3) box(this, [E.escala.anchoVisual, 0.06, 0.1], [E.escala.posicion.x, y, E.escala.posicion.z], '#e6e6d6')
    this.etiquetas.add(label(E.escala.nombre, E.escala.posicion.x, 7, E.escala.posicion.z, 6))
    for (const key of ['material', 'inicio'] as const) { const e = E[key]; box(this, [e.ancho, 0.07, e.largo], [e.posicion.x, 0, e.posicion.z], key === 'inicio' ? '#98a886' : '#9c977d'); this.etiquetas.add(label(e.nombre.toUpperCase(), e.posicion.x, 0.8, e.posicion.z + 2.4, 7)) }
    for (let i = 0; i < MATERIAL.mangueras; i++) { const roll = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: '#e7d4a3' })); roll.rotation.x = Math.PI / 2; roll.position.set(E.material.posicion.x - 3 + i % 5 * 1.1, 0.22, E.material.posicion.z - 1.5 + Math.floor(i / 5)); this.add(roll) }
    for (let i = 0; i < 2; i++) { box(this, [0.15, 0.15, 0.8], [E.material.posicion.x + 3, 0.15, E.material.posicion.z - 1.5 + i], '#414b48'); box(this, [0.35, 0.09, 0.15], [E.material.posicion.x + 1.5, 0.1, E.material.posicion.z + 1], '#d7ded7') }
    for (const [text, x, z] of [['A', 0, 36], ['B', -30, 0], ['C', 0, -29], ['D', 30, 0]] as const) this.etiquetas.add(label(text, x, 0.7, z, 2.6))
    for (const [text, a] of [['INGRESO · 4 m*', A.ingreso], ['SALIDA · 4 m', A.salida]] as const) { box(this, [a === A.ingreso ? 2 : a.ancho, 0.06, a === A.ingreso ? a.ancho : 2], [a.posicion.x, 0.08, a.posicion.z], '#e3c16c'); this.etiquetas.add(label(text, a.posicion.x, 3, a.posicion.z, 7)) }
  }
  private wall(axis: 'x' | 'z', fixed: number, start: number, end: number) {
    const mesh = box(this.cierres, axis === 'x' ? [C.espesorCierreVisual, C.alturaCierreVisual, end - start] : [end - start, C.alturaCierreVisual, C.espesorCierreVisual], axis === 'x' ? [fixed, C.alturaCierreVisual / 2, (start + end) / 2] : [(start + end) / 2, C.alturaCierreVisual / 2, fixed], '#d7dfcf')
    mesh.material.transparent = true; mesh.material.opacity = 0.48; mesh.material.depthWrite = false
  }
  private split(axis: 'x' | 'z', fixed: number, start: number, end: number, center: number, width: number) { this.wall(axis, fixed, start, center - width / 2); this.wall(axis, fixed, center + width / 2, end) }
}
