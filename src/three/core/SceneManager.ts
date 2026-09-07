import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Cancha } from '../cancha/Cancha'
import type { VistaCamara } from '../../stores/simulator.store'
export class SceneManager {
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500)
  private renderer = new THREE.WebGLRenderer({ antialias: true })
  private controls: OrbitControls
  private observer: ResizeObserver
  private vista: VistaCamara = '3d'
  readonly cancha = new Cancha()
  constructor(private host: HTMLElement) {
    this.scene.background = new THREE.Color('#c2c7b7'); this.scene.add(this.cancha)
    this.scene.add(new THREE.AmbientLight('#ffffff', 2))
    const sun = new THREE.DirectionalLight('#fff2d9', 3); sun.position.set(-20, 50, 30); this.scene.add(sun)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.host.appendChild(this.renderer.domElement); this.renderer.domElement.setAttribute('aria-label', 'Cancha 3D Los Fundadores, 50 por 50 metros')
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI / 2.05; this.controls.minDistance = 15; this.controls.maxDistance = 210
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize()
    this.renderer.setAnimationLoop(() => { this.controls.update(); this.renderer.render(this.scene, this.camera) })
  }
  setView(vista: VistaCamara) {
    this.vista = vista; this.controls.reset(); this.controls.target.set(0, 0, 3)
    const fit = 100 * Math.max(1, 1 / this.camera.aspect)
    this.camera.up.set(0, 1, 0); this.controls.enableRotate = vista === '3d'
    if (vista === 'cenital') { this.camera.position.set(0, fit, 3.001); this.camera.up.set(0, 0, -1) }
    else this.camera.position.set(fit * 0.54, fit * 0.78, fit * 0.73)
    this.camera.lookAt(this.controls.target); this.controls.update()
  }
  private resize() { const { clientWidth: w, clientHeight: h } = this.host; if (!w || !h) return; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); this.setView(this.vista) }
  dispose() {
    this.renderer.setAnimationLoop(null); this.observer.disconnect(); this.controls.dispose()
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>(); const textures = new Set<THREE.Texture>()
    this.scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Sprite) { if ('geometry' in o) geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); if ('map' in m && m.map instanceof THREE.Texture) textures.add(m.map) } } })
    geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); this.renderer.dispose(); this.renderer.domElement.remove()
  }
}
