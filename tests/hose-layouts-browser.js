async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } })
  page = await context.newPage(); page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()) })
  try {
    await page.goto('http://127.0.0.1:5173/editor'); const canvas = page.locator('canvas'); await canvas.waitFor()
    await page.getByRole('button', { name: '+ Secuencia completa B1–B8', exact: true }).click()
    await page.getByRole('button', { name: '+ Agregar preparación de agua', exact: true }).click()
    await page.getByRole('button', { name: '+ Agregar tendidos por blanco', exact: true }).click()
    if (!await page.getByText('Tendidos segmentados 1–8', { exact: true }).isVisible()) throw Error('Layout status is missing')
    if (!await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).isDisabled()) throw Error('Unassigned layout tasks did not block simulation')
    const assigned = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const store = useStrategyStore(), strategy = store.actual
      const holders = { M1: 1, M2: 1, M3: 3, M4: 4, M5: 4, M6: 5, M7: 5, M8: 6, M9: 7, M10: 7, P1: 3, P2: 8, L1: 2, L2: 2 }
      for (const task of strategy.tareas) {
        if (task.id.startsWith('agua-preparar-')) task.bombero = holders[task.materialId]
        if (task.id.startsWith('tendido-') && task.bombero === null) task.bombero = task.materialId ? holders[task.materialId] : task.operacion === 'reacomodarLinea' && task.linea === 'A' ? 4 : 8
      }
      store.revision++; store.guardar()
      return { generated: strategy.tareas.filter(task => task.id.startsWith('tendido-')).length, version: JSON.parse(localStorage.getItem('fundadores-estrategias-v1')).version, errors: store.erroresAgua }
    })
    if (assigned.generated !== 54 || assigned.version !== 5 || assigned.errors.length) throw Error(`Assignment failed: ${JSON.stringify(assigned)}`)
    if (await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).isDisabled()) throw Error('Assigned layout remained disabled')

    await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    const launching = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const store = useStrategyStore(), engine = store.engine
      for (let i = 0; i < 12000; i++) { engine.tick(0.05); const active = engine.activas.get('tendido-1-lanzar-M1'); if (active && active.elapsed > active.traslado + active.tarea.duracion * 0.35) break }
      store.revision++; const active = engine.activas.get('tendido-1-lanzar-M1')
      return { active: !!active, progress: active ? (active.elapsed - active.traslado) / active.tarea.duracion : 0, state: engine.inventarioAgua.M1.estado }
    })
    if (!launching.active || launching.progress <= 0 || launching.progress >= 1 || launching.state !== 'portado') throw Error(`Progressive launch state failed: ${JSON.stringify(launching)}`)
    await page.waitForTimeout(100); const progressive = await canvas.screenshot()

    await page.getByRole('button', { name: 'Reiniciar', exact: true }).click(); await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    const reset = await page.evaluate(async () => { const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const engine = useStrategyStore().engine; return { state: engine.inventarioAgua.M1.estado, target: engine.lineasAgua.A.tendidoActual } })
    if (reset.state !== 'material' || reset.target !== null) throw Error(`Restart did not reset hoses: ${JSON.stringify(reset)}`)

    const rearranging = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const store = useStrategyStore(), engine = store.engine
      for (let i = 0; i < 30000; i++) { engine.tick(0.05); const active = engine.activas.get('tendido-2-reacomodar'); if (active && active.elapsed > active.traslado + 0.8) break }
      store.revision++; const active = engine.activas.get('tendido-2-reacomodar'); return { active: !!active, targetBeforeFinish: engine.lineasAgua.A.tendidoActual }
    })
    if (!rearranging.active || rearranging.targetBeforeFinish !== 1) throw Error(`Rearrangement state failed: ${JSON.stringify(rearranging)}`)
    await page.waitForTimeout(80); const repositionA = await canvas.screenshot()
    await page.evaluate(async () => { const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const store = useStrategyStore(); store.engine.tick(0.8); store.revision++ })
    await page.waitForTimeout(80); if (repositionA.equals(await canvas.screenshot())) throw Error('Rearrangement did not interpolate the line')
    await page.getByRole('button', { name: 'Reiniciar', exact: true }).click(); await page.getByRole('button', { name: 'Pausar', exact: true }).click()

    const final = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const store = useStrategyStore(), engine = store.engine
      for (let i = 0; i < 200000 && !engine.finalizada && !engine.bloqueada; i++) engine.tick(0.05)
      store.revision++
      return { done: engine.finalizada, blocked: engine.bloqueada, targets: [...engine.blancos], a: engine.lineasAgua.A.tramos, b: engine.lineasAgua.B.tramos, groups: engine.conjuntosManguera.map(group => ({ tramos: group.tramos, piton: group.piton, estado: group.estado })), tools: engine.herramientas.portador }
    })
    const p2 = final.groups.find(group => group.piton === 'P2'), p1 = final.groups.find(group => group.piton === 'P1')
    if (!final.done || final.blocked || final.targets.join(',') !== '1,2,3,4,5,6,7,8' || final.a.join(',') !== 'M1,M2' || final.b.length || final.tools !== null || p2?.tramos.join(',') !== 'M7,M8,M9' || p2?.estado !== 'abandonado' || p1?.tramos.join(',') !== 'M3,M4,M5,M6' || p1?.estado !== 'abandonado') throw Error(`Final layout failed: ${JSON.stringify(final)}`)
    await page.waitForTimeout(120); const complete = await canvas.screenshot()
    if (progressive.equals(complete)) throw Error('Canvas did not update between progressive and completed layouts')
    await page.evaluate(async () => { const { useSimulatorStore } = await import('/src/stores/simulator.store.ts'); useSimulatorStore().vistaCamara = 'cenital'; scrollTo(0, 0) })
    await page.waitForTimeout(100); await page.screenshot({ path: 'fundadores-3d/qa-tendidos-blanco-8.png' })

    await page.getByRole('button', { name: 'Volver a editar', exact: true }).click(); await page.setViewportSize({ width: 390, height: 844 })
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Layout editor overflows on mobile')
    if (errors.length) throw Error(errors.join('\n'))
    return { result: 'PASS', checks: 'insert, idempotent guard, v5, progressive launch, restart, targets 1-8, abandoned P1/P2 lines, mobile' }
  } finally { await context.close() }
}
