import { ACCESOS as A } from '../data/cancha.ts'
export interface Punto { x: number; z: number }
type Wall = { axis: 'x' | 'z'; fixed: number; min: number; max: number; gap?: [number, number]; direction?: number }
const walls: Wall[] = [
{ axis:'x', fixed:-25,min:-25,max:25 },{ axis:'z',fixed:-25,min:-25,max:25 },
{ axis:'x',fixed:25,min:-25,max:25,gap:[A.ingreso.posicion.z,A.ingreso.ancho],direction:-1 },
{ axis:'z',fixed:25,min:-25,max:25,gap:[A.salida.posicion.x,A.salida.ancho],direction:1 },
{ axis:'x',fixed:0,min:-25,max:0,gap:[A.muro.posicion.z,A.muro.ancho] },
{ axis:'x',fixed:0,min:0,max:25,gap:[A.puerta.posicion.z,A.puerta.ancho] },
{ axis:'z',fixed:0,min:-25,max:0 },{ axis:'z',fixed:0,min:0,max:25,gap:[A.tubo.posicion.x,A.tubo.diametro] },
...[-1,1].map(sign=>({axis:'z' as const,fixed:A.puerta.posicion.z+sign*A.puerta.ancho/2,min:-A.puerta.largoPasillo/2,max:A.puerta.largoPasillo/2}))
]
export function segmentoValido(a:Punto,b:Punto, puertaAbierta=true) {
for(const w of walls){ const other=w.axis==='x'?'z':'x'; const delta=b[w.axis]-a[w.axis]
if(Math.abs(delta)<0.001){if(Math.abs(a[w.axis]-w.fixed)<0.001 && Math.max(a[other],b[other])>=w.min && Math.min(a[other],b[other])<=w.max)return false;continue}
const t=(w.fixed-a[w.axis])/delta;if(t< -0.001||t>1.001)continue
const at=a[other]+t*(b[other]-a[other]);if(at<w.min-0.001||at>w.max+0.001)continue
if((!puertaAbierta&&w.axis==='x'&&w.fixed===0&&w.min===0)||!w.gap||Math.abs(at-w.gap[0])>=w.gap[1]/2-0.25||(w.direction&&Math.sign(delta)!==w.direction))return false
}return true
}
const nodes:Punto[]=[...[-1,1].flatMap(s=>[{x:25+s,z:A.ingreso.posicion.z},{x:A.salida.posicion.x,z:25+s},{x:s,z:A.muro.posicion.z},{x:s*(A.puerta.largoPasillo/2+1),z:A.puerta.posicion.z},{x:A.tubo.posicion.x,z:s*(A.tubo.largo/2+1)}]),...[-27,27].flatMap(x=>[-27,27].map(z=>({x,z})))]
const distance=(a:Punto,b:Punto)=>Math.hypot(a.x-b.x,a.z-b.z)
export function calcularRuta(start:Punto,end:Punto, puertaAbierta=true):Punto[]|null{
if(![start.x,start.z,end.x,end.z].every(Number.isFinite)||Math.abs(end.x)>33||end.z< -32||end.z>34)return null
const points=[start,end,...nodes],costs=points.map(()=>Infinity),previous=points.map(()=>-1),visited=new Set<number>();costs[0]=0
while(visited.size<points.length){let current=-1;for(let i=0;i<points.length;i++)if(!visited.has(i)&&(current<0||costs[i]!<costs[current]!))current=i
if(current<0||!Number.isFinite(costs[current]!))return null
if(current===1){const result:Punto[]=[];for(let i=1;i!==-1;i=previous[i]!)result.unshift(points[i]!);return result}
visited.add(current)
for(let i=0;i<points.length;i++){if(visited.has(i)||!segmentoValido(points[current]!,points[i]!,puertaAbierta))continue;const cost=costs[current]!+distance(points[current]!,points[i]!);if(cost<costs[i]!){costs[i]=cost;previous[i]=current}}
}return null
}
export const distanciaRuta=(points:Punto[])=>points.slice(1).reduce((sum,p,i)=>sum+distance(points[i]!,p),0)

