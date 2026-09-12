async page => {
  // Contexto aislado: las verificaciones no alteran las estrategias del usuario.
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  try {
    await page.goto('http://127.0.0.1:5173/editor');
    await page.locator('canvas').waitFor();
    if (await page.getByRole('alert').count()) throw Error('Scene failed');
    await page.getByLabel('Nombre de estrategia', { exact: true }).fill('Prueba de tareas');
    await page.getByRole('button', { name: 'Crear', exact: true }).click();
    await page.getByRole('button', { name: 'B4', exact: true }).click();
    await page.getByLabel('Nombre de B4', { exact: true }).fill('Ana');
    await page.getByLabel('Nombre de B4', { exact: true }).press('Tab');
    await page.getByLabel('Velocidad de B4 (m/s)', { exact: true }).fill('3.2');
    await page.getByLabel('Velocidad de B4 (m/s)', { exact: true }).press('Tab');
    await page.getByRole('button', { name: '+ Añadir tarea', exact: true }).click();
    await page.getByLabel('Categoría', { exact: true }).selectOption('Agua');
    await page.getByLabel('Acción', { exact: true }).selectOption('asignarPiton');
    await page.getByLabel('Nombre de tarea', { exact: true }).fill('Preparar equipo');
    await page.getByRole('button', { name: 'Guardar tarea', exact: true }).click();
    await page.getByRole('button', { name: '+ Añadir tarea', exact: true }).click();
    await page.getByLabel('Nombre de tarea', { exact: true }).fill('Ir al ingreso');
    await page.getByRole('checkbox', { name: 'B4 · Preparar equipo', exact: true }).check();
    await page.getByRole('button', { name: 'Guardar tarea', exact: true }).click();
    await page.getByRole('button', { name: 'Editar Ir al ingreso', exact: true }).click();
    await page.getByLabel('Bombero responsable', { exact: true }).selectOption('5');
    await page.getByRole('button', { name: 'Guardar tarea', exact: true }).click();
    await page.getByRole('button', { name: 'B5', exact: true }).click();
    if (await page.locator('.task-list > li').count() !== 1) throw Error('Reassignment failed');
    await page.reload();
    await page.getByRole('button', { name: 'B4', exact: true }).click();
    if (await page.getByLabel('Nombre de B4', { exact: true }).inputValue() !== 'Ana') throw Error('Name persistence failed');
    if (await page.getByLabel('Velocidad de B4 (m/s)', { exact: true }).inputValue() !== '3.2') throw Error('Speed persistence failed');
    await page.getByRole('button', { name: 'Duplicar', exact: true }).click();
    await page.getByLabel('Nombre de estrategia', { exact: true }).fill('Copia independiente');
    await page.getByRole('button', { name: 'Renombrar', exact: true }).click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
    await page.getByLabel('Estrategia actual', { exact: true }).selectOption({ label: 'Prueba de tareas' });
    await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).click();
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    const before = await page.locator('.route-metrics').innerText();
    await page.waitForTimeout(100);
    if (before !== await page.locator('.route-metrics').innerText()) throw Error('Pause failed');
    await page.getByRole('button', { name: 'Volver a editar', exact: true }).click();
    await page.getByLabel('Estrategia actual', { exact: true }).selectOption('zona-i-base');
    const assignment = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts');
      const s = useStrategyStore();
      const roles = { 'recibir-herramientas': 4, puerta: 4, 'obtener-camilla': 5, 'camilla-i': 5, 'piton-externo': 6, 'cerrar-externo': 6, 'recibir-victima': 4, 'victima-meta': 4, subir: 7, banderin: 7, bajar: 7 };
      for (const task of [...s.actual.tareas]) {
        const t = JSON.parse(JSON.stringify(task));
        if (t.bombero === null) t.bombero = roles[t.id] ?? (t.operacion === 'derribar' ? 6 : null);
        if (['recibir-victima', 'victima-meta'].includes(t.id)) t.ayudantes = [5];
        s.tarea(t);
      }
      return s.actual.tareas.length;
    });
    await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).click();
    const complete = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts');
      const s = useStrategyStore();
      for (let i = 0; i < 1000 && s.reproduciendo; i++) s.tick(1);
      return { done: s.engine.finalizada, valid: s.engine.resultadoValido, tasks: Object.values(s.engine.estados).filter(e => e.estado === 'completada').length };
    });
    if (!complete.done || !complete.valid || complete.tasks !== assignment) throw Error('Full playback failed');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'fundadores-3d/qa-estrategias.png' });
    await page.getByRole('button', { name: 'Reiniciar', exact: true }).click();
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await page.getByText('Información de la cancha', { exact: true }).click();
    for (const name of ['Etiquetas generales', 'Nombres de bomberos']) { const control = page.getByRole('checkbox', { name, exact: true }); await control.uncheck(); await control.check(); }
    await page.setViewportSize({ width: 390, height: 844 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Mobile overflow');
    if (errors.length) throw Error(errors.join('\n'));
    return { result: 'PASS', checks: 'CRUD strategies, tasks, reassignment, dependencies, persistence, playback, pause/restart, labels, mobile', completedTasks: complete.tasks };
  } finally { await context.close(); }
}
