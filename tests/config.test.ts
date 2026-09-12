import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CANCHA, ACCESOS, ZONAS } from '../src/data/cancha.ts'
import { REGLAS } from '../src/data/reglas.ts'
test('Las aberturas quedan contenidas en su tramo de cierre', () => {
  for (const [center, width, min, max] of [[ACCESOS.ingreso.posicion.z, ACCESOS.ingreso.ancho, -25, 25], [ACCESOS.salida.posicion.x, ACCESOS.salida.ancho, -25, 25], [ACCESOS.muro.posicion.z, ACCESOS.muro.ancho, -25, 0], [ACCESOS.tubo.posicion.x, ACCESOS.tubo.diametro + 2 * ACCESOS.tubo.espesor, 0, 25], [ACCESOS.puerta.posicion.z, ACCESOS.puerta.ancho, 0, 25]]) { assert.ok(center! - width! / 2 > min!); assert.ok(center! + width! / 2 < max!) }
  assert.equal(CANCHA.ancho * CANCHA.largo, 2500)
  assert.deepEqual(ZONAS.flatMap(z => z.blancos), [1,2,3,4,5,6,7,8])
})
test('Catálogo de sanciones mantiene categorías y segundos reglamentarios', () => {
  assert.equal(REGLAS.length, 15); assert.equal(new Set(REGLAS.map(r => r.id)).size, 15)
  assert.equal(REGLAS.filter(r => r.tipo === 'descalificacion').length, 6)
  assert.deepEqual(REGLAS.filter(r => r.tipo === 'tiempo').map(r => r.segundos), [120,120,120,180,180,60,60,60,60])
})
import { calcularRuta, segmentoValido, distanciaRuta } from '../src/simulation/routes.ts'
test('Rutas atraviesan solo pasos y respetan ingreso y salida',()=>{
  assert.equal(segmentoValido({x:-10,z:-10},{x:-10,z:10}),false)
  assert.equal(segmentoValido({x:-12.5,z:28},{x:-12.5,z:22}),false)
  assert.equal(segmentoValido({x:24,z:-19},{x:28,z:-19}),false)
  assert.equal(segmentoValido({x:-1,z:-12.5},{x:1,z:-12.5}),true)
  for(const [start,end] of [[{x:20,z:28},{x:-10,z:-10}],[{x:-10,z:-10},{x:-10,z:10}],[{x:10,z:10},{x:-12.5,z:28}]]){
    const route=calcularRuta(start!,end!)!;assert.ok(route);assert.deepEqual(route[0],start);assert.deepEqual(route.at(-1),end)
    for(let i=1;i<route.length;i++)assert.ok(segmentoValido(route[i-1]!,route[i]!))
    assert.ok(distanciaRuta(route)>0)
  }
  assert.equal(calcularRuta({x:10,z:10},{x:0,z:0}),null)
  assert.equal(calcularRuta({x:10,z:10},{x:NaN,z:0}),null)
})
import { ZoneOne, p } from '../src/simulation/ZoneOne.ts'
test('Secuencia Zona I conserva al gemelero hasta camilla, rescate y blanco 8',()=>{
 const e=new ZoneOne({1:p(17,28),2:p(19,28),3:p(21,28)},{1:4,2:4,3:4})
 let climbs=0
 for(let n=0;n<20000&&e.index<11;n++){e.tick(0.1);if(Object.values(e.poses).some(p=>p.y>1))climbs++}
 assert.equal(e.index,11);assert.ok(e.esperando);assert.ok(climbs>0)
 const gemelo={...e.poses[2]!};for(let n=0;n<100;n++)e.tick(0.1);assert.deepEqual(e.poses[2],gemelo)
 e.camilla=true
 for(let n=0;n<20000&&e.index<19;n++)e.tick(0.1)
 assert.equal(e.index,19);assert.ok(e.esperando);assert.deepEqual(e.poses[2],gemelo);assert.ok(e.poses[1]!.x>0&&e.poses[3]!.x>0);assert.ok(e.aviso)
 e.blanco8=true
 for(let n=0;n<20000&&!e.finalizado;n++)e.tick(0.1)
 assert.ok(e.finalizado);assert.equal(e.poses[2]!.z,28);assert.ok(e.distancias[2]!>0)
})
