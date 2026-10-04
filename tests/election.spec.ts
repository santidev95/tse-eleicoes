import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('minimal map, hover, modes and selected-state panel', async ({ page, isMobile }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(
    page.getByRole('region', { name: 'Resumo nacional da apuração presidencial' }),
  ).toBeVisible()
  await expect(page.locator('[data-state]')).toHaveCount(27)
  await expect(page.locator('.state-panel')).toHaveCount(0)
  if (!isMobile) {
    await page.locator('[data-state="BA"]').hover()
    await expect(page.getByRole('tooltip')).toContainText('Bahia')
    await expect(page.locator('.state-panel')).toHaveCount(0)
  }
  const state = page.locator('[data-state="BA"]')
  if (isMobile) await state.tap()
  else await state.click()
  await expect(page.getByRole('heading', { name: 'Bahia', exact: true })).toBeVisible()
  await expect(page.locator('.state-panel')).toContainText('68,2%')
  await page.getByRole('button', { name: 'Fechar detalhes do estado' }).click()
  await expect(page.locator('.state-panel')).toHaveCount(0)
  await page.getByRole('radio', { name: 'Diferença', exact: true }).check()
  await expect(page.locator('.map-legend')).toContainText('35 p.p.')
  await page.getByRole('radio', { name: '% Apurado', exact: true }).check()
  await expect(page.locator('.map-legend')).toContainText('100%')
  await expect(page.getByRole('radio', { name: '% Apurado', exact: true })).toBeChecked()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(errors).toEqual([])
})
test('keyboard selection and state search support small UFs', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-state="DF"]')).toBeVisible()
  await page.locator('[data-state="DF"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Distrito Federal', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.state-panel')).toHaveCount(0)
  await expect(page.locator('[data-state="DF"]')).toBeFocused()
  await page.getByRole('button', { name: 'Buscar estado', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nome ou sigla do estado' }).fill('sao paulo')
  await page.getByRole('button', { name: 'São Paulo SP', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'São Paulo', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
test('accessible default view and details panel', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-state="BA"]')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.locator('[data-state="BA"]').click()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
