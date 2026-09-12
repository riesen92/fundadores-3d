async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage(); page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  try {
    await page.goto('http://127.0.0.1:5173/editor'); await page.locator('canvas').waitFor();
    await page.getByLabel('Nombre de B1', { exact: true }).fill('Carlos');
    await page.getByLabel('Nombre de B1', { exact: true }).press('Tab');
    const original = await page.evaluate(() => JSON.parse(localStorage.getItem('fundadores-estrategias-v1')).estrategias[0]);
    await page.getByRole('button', { name: '+ Secuencia completa B1–B8', exact: true }).click();
    const added = await page.evaluate(() => JSON.parse(localStorage.getItem('fundadores-estrategias-v1')));
    if (added.estrategias.length !== 2 || JSON.stringify(added.estrategias[0]) !== JSON.stringify(original)) throw Error('Original strategy changed');
    if (added.estrategias[1].bomberos[1].nombre !== 'Carlos') throw Error('Names not retained');
    const taskCount = added.estrategias[1].tareas.length;
    await page.getByRole('button', { name: 'B8', exact: true }).click();
    const received = page.locator('.task-list > li').filter({ hasText: 'B1 entrega herramientas a B8 por el muro' });
    if (!(await received.innerText()).includes('Tu función: receptor')) throw Error('Receiver task not shown');
    await received.getByRole('button', { name: 'Editar B1 entrega herramientas a B8 por el muro', exact: true }).click();
    const receivers = page.locator('.task-form details').filter({ has: page.locator('summary', { hasText: 'Receptores' }) });
    await receivers.getByRole('checkbox', { name: 'B8 · B8', exact: true }).uncheck();
    await receivers.getByRole('checkbox', { name: 'B4 · B4', exact: true }).check();
    await page.getByRole('button', { name: 'Guardar tarea', exact: true }).click();
    await page.getByRole('button', { name: 'B4', exact: true }).click();
    await page.getByRole('button', { name: 'Editar B1 entrega herramientas a B8 por el muro', exact: true }).click();
    await receivers.getByRole('checkbox', { name: 'B4 · B4', exact: true }).uncheck();
    await receivers.getByRole('checkbox', { name: 'B8 · B8', exact: true }).check();
    await page.getByRole('button', { name: 'Guardar tarea', exact: true }).click();
    await page.reload();
    if (await page.getByLabel('Estrategia actual', { exact: true }).locator('option:checked').innerText() !== 'Secuencia completa B1–B8') throw Error('Selection not restored');
    await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).click();
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    const snapshot = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts');
      const { useSimulatorStore } = await import('/src/stores/simulator.store.ts');
      const s = useStrategyStore(); useSimulatorStore().vistaCamara = 'cenital';
      for (let i = 0; i < 8000 && !s.engine.bloqueada; i++) {
        s.engine.tick(0.05);
        const a = s.engine.activas.get('victima-entrega-tubo');
        if (a && a.elapsed > a.traslado + 1) break;
      }
      s.revision++;
      return { transferring: s.engine.activas.has('victima-entrega-tubo'), poses: s.engine.poses, flagTask: s.engine.estados.subir.estado };
    });
    if (!snapshot.transferring) throw Error('Tube handoff not reached');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'fundadores-3d/qa-relevo-tubo.png' });
    const before = await page.locator('.route-metrics').innerText(); await page.waitForTimeout(120);
    if (before !== await page.locator('.route-metrics').innerText()) throw Error('Paused handoff moved');
    await page.getByRole('button', { name: 'Reiniciar', exact: true }).click();
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    const reset = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const e = useStrategyStore().engine;
      return !e.cargada && !e.asegurada && !e.banderin && e.equipoCamilla.length === 0 && e.blancos.size === 0 && e.pitones.size === 0;
    });
    if (!reset) throw Error('Restart retained relay state');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    const result = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const s = useStrategyStore();
      for (let i = 0; i < 1000 && s.reproduciendo; i++) s.tick(1);
      return { done: s.engine.finalizada, valid: s.engine.resultadoValido, last: s.engine.eventos.at(-1).tarea, count: Object.values(s.engine.estados).filter(t => t.estado === 'completada').length };
    });
    if (!result.done || !result.valid || result.last !== 'meta-5' || result.count !== taskCount) throw Error('Full relay sequence failed');
    await page.getByRole('button', { name: 'Volver a editar', exact: true }).click();
    await page.getByText('Información de la cancha', { exact: true }).click();
    for (const name of ['Etiquetas generales', 'Nombres de bomberos']) { await page.getByRole('checkbox', { name, exact: true }).uncheck(); await page.getByRole('checkbox', { name, exact: true }).check(); }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'B7', exact: true }).click();
    await page.getByRole('button', { name: 'Editar B7 entrega camilla vacía a B4 y B5', exact: true }).click();
    if (!await receivers.getByRole('checkbox', { name: 'B5 · B5', exact: true }).isChecked()) throw Error('Receiver selection not visible on mobile');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Mobile editor overflow');
    if (errors.length) throw Error(errors.join('\n'));
    return { result: 'PASS', tasks: result.count, last: result.last, checks: 'Preserved strategies/names, receiver editing, persistence, tube animation, pause/restart, full sequence, labels, mobile' };
  } finally { await context.close(); }
}
