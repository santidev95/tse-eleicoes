import { test, expect } from '@playwright/test'
import { createMockSnapshot } from '../src/data/mock-election'
test('initial loading, error and manual retry use the normalized proxy', async ({ page }) => {
  let succeeds = false
  let release: (() => void) | undefined
  await page.route('**/api/tse/presidential', async (route) => {
    if (!succeeds) {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      await route.fulfill({ status: 503, body: '' })
    } else await route.fulfill({ json: { ...createMockSnapshot(), source: 'tse' } })
  })
  await page.goto('/')
  await expect(page.getByText('Carregando a apuração presidencial…')).toBeVisible()
  await expect.poll(() => !!release).toBe(true)
  release!()
  await expect(page.getByRole('alert')).toContainText('HTTP 503')
  await expect(page.getByText('Dados indisponíveis', { exact: true })).toBeVisible()
  succeeds = true
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.locator('[data-state]')).toHaveCount(27)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.source-badge')).toContainText('Fonte: TSE')
})
test('a failed update keeps the last snapshot and recovers on retry', async ({ page }) => {
  let succeeds = true
  await page.clock.install()
  await page.route('**/api/tse/presidential', (route) =>
    succeeds
      ? route.fulfill({ json: { ...createMockSnapshot(), source: 'tse' } })
      : route.fulfill({ status: 502, body: '' }),
  )
  await page.goto('/')
  await expect(page.locator('[data-state]')).toHaveCount(27)
  const previous = await page.locator('.national-summary').textContent()
  succeeds = false
  await page.clock.runFor(30_100)
  await expect(page.getByRole('alert')).toContainText('última atualização disponível')
  await expect(page.locator('[data-state]')).toHaveCount(27)
  await expect(page.locator('.national-summary')).toHaveText(previous!)
  await expect(page.locator('.live-badge')).toContainText('SEM ATUALIZAÇÃO')
  succeeds = true
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
