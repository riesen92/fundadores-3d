async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } })
  page = await context.newPage(); page.setDefaultTimeout(12000)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
  try {
    await page.goto('http://127.0.0.1:5173/editor'); const canvas = page.locator('canvas'); await canvas.waitFor()
    await page.getByRole('button', { name: '+ Secuencia completa B1–B8', exact: true }).click()
    await page.getByText('Información de la cancha', { exact: true }).click()
    const toggle = page.getByRole('checkbox', { name: 'Recorridos de bomberos', exact: true })
    if (await toggle.isChecked()) throw Error('Routes should start hidden')

    await toggle.check(); await page.waitForTimeout(50)
    const b1Visible = await canvas.screenshot()
    await toggle.uncheck(); await page.waitForTimeout(50)
    const editHidden = await canvas.screenshot()
    if (b1Visible.equals(editHidden)) throw Error('Selected B1 route was not shown')
    await page.getByRole('button', { name: 'B2', exact: true }).click()
    await toggle.check(); await page.waitForTimeout(50)
    const b2Visible = await canvas.screenshot()
    if (b2Visible.equals(editHidden)) throw Error('Selected B2 route was not shown')
    if (b2Visible.equals(b1Visible)) throw Error('Changing the selected firefighter did not change the route')

    await page.getByRole('button', { name: '▶ Simular estrategia', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    const activeVisible = await canvas.screenshot()
    await toggle.uncheck(); await page.waitForTimeout(50)
    const activeHidden = await canvas.screenshot()
    if (activeVisible.equals(activeHidden)) throw Error('Active task routes did not hide while paused')
    await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.waitForTimeout(150)
    if (await toggle.isChecked()) throw Error('Routes were re-enabled during playback')
    await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    await toggle.check(); await page.waitForTimeout(50)
    if (activeHidden.equals(await canvas.screenshot())) throw Error('Active task routes did not return')

    await page.reload(); await canvas.waitFor()
    await page.getByText('Información de la cancha', { exact: true }).click()
    if (await page.getByRole('checkbox', { name: 'Recorridos de bomberos', exact: true }).isChecked()) throw Error('Routes did not reset to hidden after reload')
    await page.setViewportSize({ width: 390, height: 844 })
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Route toggle caused mobile overflow')
    if (errors.length) throw Error(errors.join('\n'))
    return { result: 'PASS', checks: 'hidden default, selected B1/B2 preview, paused simulation, playback, reload, mobile' }
  } finally { await context.close() }
}
