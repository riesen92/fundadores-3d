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
