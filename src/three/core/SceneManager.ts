import { StrategyVisual } from '../StrategyVisual'
import type { TaskEngine } from '../../simulation/TaskEngine'
import type { Pose } from '../../simulation/tasks'
import { Firefighters } from '../Firefighters'
import type { Bombero } from '../../stores/firefighters.store'
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
  private firefighters = new Firefighters()
  private choreography = new StrategyVisual()
  private followedFirefighter: number | null = null
  private followTarget: THREE.Vector3 | null = null
  private knownPoses = new Map<number, Pose>()
  onFrame?: (dt:number)=>void
  private previousFrame=0
  showSimulation(engine:Omit<TaskEngine,never>, selected:number|null){for(const [id,p] of Object.entries(engine.poses)){const numericId=Number(id);this.knownPoses.set(numericId,p);this.firefighters.pose(numericId,p)}this.trackFollowed();this.choreography.renderState(engine,this.cancha,selected)}
  previewTasks(paths:Record<number,Pose[]>,selected:number|null){this.choreography.preview(paths,selected)}
  resetSimulation(){this.choreography.reset(this.cancha)}
  private pointerStart = { x: 0, y: 0 }
  onGroundClick?: (x:number,z:number)=>void
  private down = (e:PointerEvent) => { this.pointerStart = {x:e.clientX,y:e.clientY} }
  private up = (e:PointerEvent) => {
    if(e.button!==0 || Math.hypot(e.clientX-this.pointerStart.x,e.clientY-this.pointerStart.y)>5)return
    const rect=this.renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera)
    const hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3())
    if(hit)this.onGroundClick?.(Math.round(hit.x*2)/2,Math.round(hit.z*2)/2)
  }
  updateFirefighters(bomberos:Bombero[],selected:number){for(const bombero of bomberos)this.knownPoses.set(bombero.id,{x:bombero.posicion.x,y:bombero.posicion.y,z:bombero.posicion.z});this.firefighters.update(bomberos,selected);this.trackFollowed()}
  setFollowedFirefighter(id:number|null){
    if(this.followedFirefighter===id){this.trackFollowed();return}
    this.followedFirefighter=id;this.followTarget=null
    if(id===null)this.setView(this.vista);else this.trackFollowed()
  }
  private trackFollowed(){
    if(this.followedFirefighter===null)return
    const pose=this.knownPoses.get(this.followedFirefighter);if(!pose)return
    const target=new THREE.Vector3(pose.x,Math.max(0,pose.y)+1.1,pose.z)
    if(!this.followTarget){
      this.controls.target.copy(target);if(this.vista==='cenital')this.camera.up.set(0,0,-1);else this.camera.up.set(0,1,0)
      this.camera.position.copy(target).add(this.vista==='cenital'?new THREE.Vector3(0,30,.001):new THREE.Vector3(9,9,12))
      this.camera.lookAt(target);this.controls.update();this.followTarget=target;return
    }
    const delta=target.clone().sub(this.followTarget)
    this.controls.target.add(delta);this.camera.position.add(delta);this.followTarget.copy(target)
  }
  setFirefighterLabelsVisible(visible:boolean){this.firefighters.setLabelsVisible(visible)}
  setFirefighterRoutesVisible(visible:boolean){this.firefighters.setRoutesVisible(visible);this.choreography.setPathsVisible(visible)}
  constructor(private host: HTMLElement) {
    this.scene.background = new THREE.Color('#c2c7b7'); this.scene.add(this.cancha, this.firefighters, this.choreography)
    this.scene.add(new THREE.AmbientLight('#ffffff', 2))
    const sun = new THREE.DirectionalLight('#fff2d9', 3); sun.position.set(-20, 50, 30); this.scene.add(sun)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.addEventListener('pointerdown',this.down);this.renderer.domElement.addEventListener('pointerup',this.up);
    this.host.appendChild(this.renderer.domElement); this.renderer.domElement.setAttribute('aria-label', 'Cancha 3D Los Fundadores, 50 por 50 metros')
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI / 2.05; this.controls.minDistance = 15; this.controls.maxDistance = 210
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize()
    this.renderer.setAnimationLoop((now) => { const dt=this.previousFrame?Math.min((now-this.previousFrame)/1000,0.1):0;this.previousFrame=now;this.onFrame?.(dt);this.controls.update(); this.renderer.render(this.scene, this.camera) })
  }
  focusZoneOne(){this.controls.target.set(-9,0,-12);this.camera.up.set(0,1,0);this.camera.position.set(-28,34,15);this.camera.lookAt(this.controls.target);this.controls.enableRotate=true;this.controls.update()}
  setView(vista: VistaCamara) {
    this.vista = vista; this.controls.reset(); this.controls.target.set(0, 0, 3)
    const fit = 100 * Math.max(1, 1 / this.camera.aspect)
    this.camera.up.set(0, 1, 0); this.controls.enableRotate = vista === '3d'
    if (vista === 'cenital') { this.camera.position.set(0, fit, 3.001); this.camera.up.set(0, 0, -1) }
    else this.camera.position.set(fit * 0.54, fit * 0.78, fit * 0.73)
    this.camera.lookAt(this.controls.target); this.controls.update()
    if(this.followedFirefighter!==null){this.followTarget=null;this.trackFollowed()}
  }
  private resize() { const { clientWidth: w, clientHeight: h } = this.host; if (!w || !h) return; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); this.setView(this.vista) }
  dispose() {
    this.renderer.domElement.removeEventListener('pointerdown',this.down);this.renderer.domElement.removeEventListener('pointerup',this.up);
    this.renderer.setAnimationLoop(null); this.observer.disconnect(); this.controls.dispose()
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>(); const textures = new Set<THREE.Texture>()
    this.scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Sprite) { if ('geometry' in o) geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); if ('map' in m && m.map instanceof THREE.Texture) textures.add(m.map) } } })
    geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); this.renderer.dispose(); this.renderer.domElement.remove()
  }
}
