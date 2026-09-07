import * as THREE from 'three'
export function box(parent: THREE.Object3D, size: readonly number[], position: readonly number[], color: THREE.ColorRepresentation) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }))
  mesh.position.set(position[0]!, position[1]!, position[2]!); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
}
export function label(text: string, x: number, y: number, z: number, width = 5) {
  const canvas = document.createElement('canvas'); canvas.width = text.length <= 2 ? 96 : 512; canvas.height = 96
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#142620e8'; ctx.beginPath(); ctx.roundRect(0, 0, canvas.width, 96, 16); ctx.fill()
  ctx.fillStyle = '#f4f4e9'; ctx.font = text.length <= 2 ? '600 64px system-ui' : '600 42px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, canvas.width / 2, 48)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false })); sprite.position.set(x, y, z); sprite.scale.set(width, width * 96 / canvas.width, 1); sprite.renderOrder = 10; return sprite
}

