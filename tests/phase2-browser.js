async page => {
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
await page.goto('http://127.0.0.1:5173');await page.setViewportSize({width:1440,height:1000});await page.locator('canvas').waitFor();
if(await page.getByRole('alert').count())throw Error('Scene error');
await page.getByRole('button',{name:'B3',exact:true}).click();await page.getByLabel('Rol de B3').fill('Rescate');await page.getByLabel('Velocidad (m/s)').fill('3');await page.getByLabel('Velocidad (m/s)').press('Tab');
await page.getByRole('button',{name:'+ Material',exact:true}).click();await page.getByRole('button',{name:'+ Zona IV',exact:true}).click();
if(await page.locator('.destination-list li').count()!==2)throw Error('Route missing');
const metrics=await page.locator('.route-metrics').innerText();if(metrics.startsWith('0.0'))throw Error('Distance zero');
await page.getByRole('button',{name:'B1',exact:true}).click();if(await page.locator('.destination-list li').count())throw Error('Routes not independent');
await page.getByRole('button',{name:'B3',exact:true}).click();if(await page.getByLabel('Rol de B3').inputValue()!=='Rescate')throw Error('Role lost');
await page.getByRole('button',{name:'Editar punto 2',exact:true}).click();await page.getByLabel('X',{exact:true}).fill('9');await page.getByRole('button',{name:'Guardar punto',exact:true}).click();if(!(await page.locator('.destination-list').innerText()).includes('9.0'))throw Error('Edit failed');
await page.getByRole('button',{name:'Subir punto 2',exact:true}).click();await page.getByRole('button',{name:'Eliminar punto 2',exact:true}).click();
await page.getByRole('button',{name:'▦ Cenital',exact:true}).click();await page.getByRole('button',{name:'Dibujar ruta en cancha',exact:true}).click();
const bounds=await page.locator('canvas').boundingBox();await page.mouse.click(bounds.x+bounds.width*0.6,bounds.y+bounds.height*0.4);
if(await page.locator('.destination-list li').count()!==2)throw Error('Canvas click missing');
await page.getByRole('button',{name:'Terminar edición en cancha',exact:true}).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'fundadores-3d/qa-fase2.png'});
await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
await page.setViewportSize({width:1440,height:1000});if(errors.length)throw Error(errors.join('\n'));return {result:'PASS',metrics,checks:'independent routes, role, speed, reorder, delete, canvas click, mobile, console'};
}

