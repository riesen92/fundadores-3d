async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } })
  page = await context.newPage(); page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
  try {
    await page.goto('http://127.0.0.1:5173'); const canvas = page.locator('canvas'); await canvas.waitFor()
    if (!await page.getByText('14/14 piezas asignadas', { exact: true }).isVisible()) throw Error('Fresh startup is not fully assigned')
    await page.evaluate(async () => {
      const { secuenciaCompleta } = await import('/src/simulation/baseStrategy.ts')
      const strategies = Array.from({ length: 5 }, (_, i) => ({ ...secuenciaCompleta(), id: `legacy-${i}` }))
      strategies[4].bomberos[1] = { nombre: 'Oficial prueba', velocidad: 3.5 }
      const raw = JSON.stringify({ version: 5, seleccionada: 'legacy-4', estrategias: strategies })
      localStorage.setItem('fundadores-estrategias-v1', raw)
      localStorage.removeItem('fundadores-oficial-unica-v1')
      localStorage.setItem('test-original', raw)
    })
    await page.reload(); await canvas.waitFor()
    const migrated = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const s = useStrategyStore()
      return s.estrategias.length === 1 && s.actual.perfilTendido === 'oficial' && s.actual.bomberos[1].velocidad === 3.5 && localStorage.getItem('fundadores-respaldo-antes-oficial') === localStorage.getItem('test-original')
    })
    if (!migrated) throw Error('Single official migration lost configuration or backup')
    if (await page.locator('.strategy-panel select').count()) throw Error('Old strategy selector remains')
    await page.getByRole('button', { name: 'B1', exact: true }).click()
    if (await page.getByLabel('Nombre de B1', { exact: true }).inputValue() !== 'Oficial prueba') throw Error('Names were not preserved')
    if (!await page.getByText('14/14 piezas asignadas', { exact: true }).isVisible()) throw Error('Grouped keys were not counted')
    if (await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).isDisabled()) throw Error('Official template is invalid')
    await page.getByRole('button', { name: 'B2', exact: true }).click()
    if (!await page.getByText('Manos planificadas: 2/2', { exact: true }).isVisible()) throw Error('B2 hand count is wrong')
    await page.getByRole('button', { name: 'Editar B2 · Conectar manguera · M1', exact: true }).click()
    if (await page.getByLabel('Acople de destino', { exact: true }).inputValue() !== 'gemelo:A') throw Error('Connection editor lost the manifold outlet')
    await page.getByLabel('Duración de maniobra (s)', { exact: true }).fill('4.5')
    await page.getByRole('button', { name: 'Guardar tarea', exact: true }).click()
    await page.reload(); await canvas.waitFor()
    const persisted = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const s = useStrategyStore()
      return { count: s.estrategias.length, version: JSON.parse(localStorage.getItem('fundadores-estrategias-v1')).version, duration: s.actual.tareas.find(t => t.id === 'oficial-gemelo-M1').duracion }
    })
    if (persisted.count !== 1 || persisted.version !== 5 || persisted.duration !== 4.5) throw Error(JSON.stringify(persisted))
    await page.getByText('Información de la cancha', { exact: true }).click()
    const routes = page.getByRole('checkbox', { name: 'Recorridos de bomberos', exact: true })
    if (await routes.isChecked()) throw Error('Routes should remain optional')
    await routes.check(); await routes.uncheck()
    await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    const time = await page.locator('.route-metrics').innerText()
    await page.waitForTimeout(100)
    if (await page.locator('.route-metrics').innerText() !== time) throw Error('Pause advanced time')
    const launch = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const s = useStrategyStore(), e = s.engine
      for (let i = 0; i < 10000 && !e.bloqueada; i++) {
        e.tick(.05); const a = e.activas.get('oficial-lanzar-M6')
        if (a && a.elapsed > a.traslado + 1 && a.elapsed < a.total) { s.revision++; return { visible: e.trazadoVisual('M6').length, held: e.inventarioAgua.M6.portador } }
      }
      throw Error('Launch was not animated')
    })
    if (launch.visible < 2 || launch.held !== 5) throw Error(JSON.stringify(launch))
    await page.waitForTimeout(80)
    const partial = await canvas.screenshot()
    await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const s = useStrategyStore(), e = s.engine
      for (let i = 0; i < 10000 && !e.bloqueada; i++) { e.tick(.05); const a = e.activas.get('oficial-blanco-1'); if (a && a.elapsed >= a.traslado) break }
      s.revision++
    })
    await page.waitForTimeout(100)
    await canvas.screenshot({ path: 'fundadores-3d/qa-mangueras-inicial.png' })
    await page.getByRole('button', { name: 'Reiniciar', exact: true }).click(); await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    const final = await page.evaluate(async () => {
      const { useStrategyStore } = await import('/src/stores/strategy.store.ts'); const s = useStrategyStore(), e = s.engine
      for (let i = 0; i < 15000 && !e.finalizada && !e.bloqueada; i++) e.tick(.25)
      s.revision++
      return { done: e.finalizada, valid: e.resultadoValido, last: [...e.salidos].at(-1), targets: [...e.blancos], groups: e.conjuntosManguera, state: e.inventarioAgua.P2.estado }
    })
    if (!final.done || !final.valid || final.last !== 5 || final.state !== 'abandonado') throw Error(JSON.stringify(final))
    await page.waitForTimeout(100)
    if (partial.equals(await canvas.screenshot())) throw Error('The scene did not update')
    await page.evaluate(async () => { const { useSimulatorStore } = await import('/src/stores/simulator.store.ts'); useSimulatorStore().vistaCamara = 'cenital' })
    await page.waitForTimeout(120); await canvas.screenshot({ path: 'fundadores-3d/qa-oficial-final.png' })
    await page.getByRole('button', { name: 'Volver a editar', exact: true }).click()
    await page.getByRole('button', { name: 'B6', exact: true }).click()
    await page.getByRole('button', { name: 'Editar B6 · Dejar Halligan y TNT · TNT', exact: true }).click()
    if (!await page.getByRole('checkbox', { name: 'TNT', exact: true }).isChecked()) throw Error('Individual tool selection lost')
    await page.setViewportSize({ width: 390, height: 844 })
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Mobile editor overflows')
    if (errors.length) throw Error(errors.join('\n'))
    return { result: 'PASS', checks: 'official template, names, two hands, endpoints editor, v5, pause/restart, animated throw, full competition, tools, mobile' }
  } finally { await context.close() }
}
