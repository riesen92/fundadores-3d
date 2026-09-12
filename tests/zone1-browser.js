async page => {
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
await page.goto('http://127.0.0.1:5173');await page.setViewportSize({width:1440,height:1000});
const original=await page.getByLabel('Nombre de B1',{exact:true}).inputValue();
await page.getByLabel('Nombre de B1',{exact:true}).fill('Prueba nombre');await page.getByLabel('Nombre de B1',{exact:true}).press('Tab');await page.reload();
if(await page.getByLabel('Nombre de B1',{exact:true}).inputValue()!=='Prueba nombre')throw Error('Name persistence');
await page.getByLabel('Nombre de B1',{exact:true}).fill(original);await page.getByLabel('Nombre de B1',{exact:true}).press('Tab');
await page.getByRole('button',{name:'▶ Reproducir secuencia Zona I',exact:true}).click();
await page.getByRole('button',{name:'Pausar',exact:true}).click();
const t=await page.locator('.simulation-clock').innerText();await page.waitForTimeout(250);if(t!==await page.locator('.simulation-clock').innerText())throw Error('Pause failed');
await page.getByRole('button',{name:'Continuar',exact:true}).click();
const stage=async target=>page.evaluate(async target=>{const {useZoneOneStore}=await import('/src/stores/zoneOne.store.ts');const s=useZoneOneStore();s.reproduciendo=true;for(let n=0;n<5000&&s.paso<target;n++)s.tick(.1);s.reproduciendo=false;return {index:s.paso,waiting:s.esperando,poses:s.engine.poses}},target);
await stage(7);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'fundadores-3d/qa-zona1-agua.png'});
const wait=await stage(11);if(!wait.waiting)throw Error('Camilla barrier missing');const gemelo=wait.poses[2];
await page.getByRole('button',{name:'Entregar camilla desde Zona IV',exact:true}).click();
await stage(17);await page.evaluate(async()=>{const {useZoneOneStore}=await import('/src/stores/zoneOne.store.ts');const s=useZoneOneStore();s.reproduciendo=true;for(let n=0;n<27;n++)s.tick(.1);s.reproduciendo=false});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'fundadores-3d/qa-zona1-rescate.png'});
const wait8=await stage(19);if(!wait8.waiting||JSON.stringify(wait8.poses[2])!==JSON.stringify(gemelo))throw Error('Gemelero left early');
await page.getByRole('button',{name:'Confirmar blancos 3–8 caídos',exact:true}).click();
const result=await page.evaluate(async()=>{const {useZoneOneStore}=await import('/src/stores/zoneOne.store.ts');const s=useZoneOneStore();s.reproduciendo=true;for(let n=0;n<5000&&!s.finalizado;n++)s.tick(.1);return {done:s.finalizado,z:s.engine.poses[2].z,warning:s.aviso}});
if(!result.done||result.z!==28||!result.warning)throw Error('Final sequence failed');
await page.getByRole('button',{name:'Reiniciar',exact:true}).click();await page.getByRole('button',{name:'Pausar',exact:true}).click();
await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');await page.setViewportSize({width:1440,height:1000});
if(errors.length)throw Error(errors.join('\n'));return {result:'PASS',checks:'names persist, pause, tools/water/rescue stages, external barriers, B2 remains until blanco8, exit, restart, mobile, console'};
}
