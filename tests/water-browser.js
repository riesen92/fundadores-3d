async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } })
  page = await context.newPage(); page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
  try {
    await page.goto('http://127.0.0.1:5173'); await page.locator('canvas').waitFor()
    await page.getByRole('button', { name: '+ Secuencia completa B1–B8', exact: true }).click()
    await page.getByRole('button', { name: '+ Agregar preparación de agua', exact: true }).click()
    if (!await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).isDisabled()) throw Error('Detailed plan started without assignments and lines')
    const alert = await page.locator('.water-errors').innerText()
    if (!alert.includes('Asigna un bombero') || !alert.includes('Línea A') || !alert.includes('Línea B')) throw Error('Incomplete detailed plan was not explained')
    if (!await page.locator('.water-summary').getByText('0/14 piezas asignadas', { exact: true }).isVisible()) throw Error('Water inventory summary missing')

    await page.getByRole('button', { name: 'Sin asignar (14)', exact: true }).click()
    await page.getByRole('button', { name: 'Editar Preparar M1', exact: true }).click()
    const pieces = await page.getByLabel('Pieza de agua', { exact: true }).locator('option').allTextContents()
    if (pieces.join(',') !== 'Selecciona una pieza,M1') throw Error(`Preparation selector did not filter pieces: ${pieces.join(',')}`)
    await page.getByLabel('Bombero responsable', { exact: true }).selectOption({ label: 'B1 · B1' })
    await page.getByRole('button', { name: 'Guardar tarea', exact: true }).click()
    await page.getByRole('button', { name: 'B1', exact: true }).click()
    if (!await page.getByText('Manos planificadas: 1/2', { exact: true }).isVisible()) throw Error('Planned hands did not update')

    await page.evaluate(async () => {
      const { nuevaTarea } = await import('/src/simulation/tasks.ts')
      const { configuracionInicial } = await import('/src/simulation/baseStrategy.ts')
      const { MATERIAL_AGUA } = await import('/src/simulation/water.ts')
      const add = (op, firefighter, id, extra = {}) => Object.assign(nuevaTarea(op, firefighter, id), extra)
      const holders = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8]
      const prep = MATERIAL_AGUA.map((materialId, index) => add(materialId[0] === 'M' ? 'prepararManguera' : materialId[0] === 'P' ? 'prepararPiton' : 'prepararLlave', holders[index], `prep-${materialId}`, { materialId, nombre: `Preparar ${materialId}` }))
      const enters = Array.from({ length: 8 }, (_, index) => add('mover', index + 1, `ingreso-${index + 1}`, { objetivo: 'ingreso', nombre: `B${index + 1} ingresa con su carga` }))
      const tasks = [
        ...prep, ...enters,
        add('mover', 1, 'b1-gemelo-a', { objetivo: 'gemelo' }),
        add('lanzarManguera', 1, 'lanzar-m1', { materialId: 'M1', objetivo: 'blanco-7' }),
        add('mover', 1, 'b1-gemelo-b', { objetivo: 'gemelo' }),
        add('lanzarManguera', 1, 'lanzar-m2', { materialId: 'M2', objetivo: 'blanco-6' }),
        add('conectarManguera', 8, 'conectar-m1', { materialId: 'M1', linea: 'A', dependencias: ['lanzar-m1'] }),
        add('conectarManguera', 8, 'conectar-m2', { materialId: 'M2', linea: 'B', dependencias: ['lanzar-m2'] }),
        add('conectarPiton', 6, 'conectar-p1', { materialId: 'P1', linea: 'A', dependencias: ['conectar-m1'] }),
        add('conectarPiton', 6, 'conectar-p2', { materialId: 'P2', linea: 'B', dependencias: ['conectar-m2'] }),
        add('operarGemelo', 2, 'gemelero'),
        add('abrirLinea', 2, 'abrir-a', { linea: 'A', dependencias: ['gemelero', 'conectar-p1'] }),
        add('cortarLinea', 2, 'cortar-a', { linea: 'A', duracion: 12, dependencias: ['abrir-a'] }),
        add('abrirLinea', 2, 'abrir-b', { linea: 'B', dependencias: ['cortar-a', 'conectar-p2'] }),
        add('cortarLinea', 2, 'cortar-b', { linea: 'B', dependencias: ['abrir-b'] }),
      ]
      const strategy = { id: 'qa-agua', nombre: 'QA agua detallada', modoAgua: 'detallado', bomberos: configuracionInicial(), tareas: tasks }
      localStorage.setItem('fundadores-estrategias-v1', JSON.stringify({ version: 2, seleccionada: strategy.id, estrategias: [strategy] }))
    })
    await page.reload(); await page.locator('canvas').waitFor()
    if (await page.getByLabel('Estrategia actual', { exact: true }).locator('option:checked').innerText() !== 'QA agua detallada') throw Error('Detailed strategy did not persist')
    if (await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).isDisabled()) throw Error(`Valid detailed plan remained disabled: ${await page.locator('.water-errors').allInnerTexts()}`)
    await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    const activeA = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const s = useStrategyStore()
      for (let i = 0; i < 6000; i++) { s.engine.tick(0.05); if (s.engine.activas.has('cortar-a')) break }
      s.revision++
      return { active: s.engine.lineasAgua.A.activa, task: s.engine.estados['cortar-a'].estado, entered: s.engine.ingresaron.size, pieces: Object.values(s.engine.inventarioAgua).filter(p => p.ingresada).length, m1: s.engine.inventarioAgua.M1.estado, hands1: s.engine.manos(1) }
    })
    if (!activeA.active || activeA.task !== 'en-curso' || activeA.entered !== 8 || activeA.pieces !== 14 || activeA.m1 !== 'conectado' || activeA.hands1.length) throw Error(`Line A state invalid: ${JSON.stringify(activeA)}`)
    await page.evaluate(async () => { const { useSimulatorStore } = await import('/src/stores/simulator.store.ts'); useSimulatorStore().vistaCamara = 'cenital'; scrollTo(0, 0) })
    await page.screenshot({ path: 'fundadores-3d/qa-agua-detallada.png' })
    const result = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const s = useStrategyStore()
      for (let i = 0; i < 6000 && !s.engine.finalizada && !s.engine.bloqueada; i++) s.engine.tick(0.05)
      s.revision++
      return { done: s.engine.finalizada, blocked: s.engine.bloqueada, a: s.engine.lineasAgua.A.activa, b: s.engine.lineasAgua.B.activa, events: s.engine.eventos.map(e => e.tarea), entered: Object.values(s.engine.inventarioAgua).filter(p => p.ingresada).length }
    })
    if (!result.done || result.blocked || result.a || result.b || result.entered !== 14 || result.events.indexOf('cortar-a') > result.events.indexOf('abrir-b')) throw Error(`A/B cycle failed: ${JSON.stringify(result)}`)
    await page.getByRole('button', { name: 'Volver a editar', exact: true }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Detailed editor overflows on mobile')
    if (errors.length) throw Error(errors.join('\n'))
    return { result: 'PASS', checks: 'upgrade guard, filtered material, 2 hands, 14 pieces entered, line A/B switching, persistence, mobile', events: result.events.length }
  } finally { await context.close() }
}
