import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { states } from '../src/data/states'
import { normalizeSimulation } from '../server/tse-adapter'

const br = JSON.parse(readFileSync('tests/fixtures/tse/br.json', 'utf8'))
const mt = JSON.parse(readFileSync('tests/fixtures/tse/mt.json', 'utf8'))
const snapshot = normalizeSimulation(
  new Map([
    ['br', br],
    ...states.map((s) => [s.uf.toLowerCase(), { ...mt, cdabr: s.uf.toLowerCase() }]),
  ]),
  '2026-10-04T18:00:00.000Z',
)

test('official simulation labels, percentages, special names and compact candidate details', async ({
  page,
}) => {
  await page.route('**/api/tse/presidential', (route) => route.fulfill({ json: snapshot }))
  await page.goto('/')
  await expect(page.locator('[data-state]')).toHaveCount(27)
  await expect(page.locator('.source-badge')).toHaveText('Simulado TSE')
  await expect(page.locator('.live-badge')).toContainText('SIMULADO')
  await expect(page.locator('.updated-at')).toContainText('29/09')
  await expect(page.locator('.national-summary')).toContainText('8,71%')
  await expect(page.locator('.national-summary')).toContainText('8,29%')
  await expect(page.locator('.national-summary')).toContainText('totalizado')
  await expect(page.locator('.state-panel')).toHaveCount(0)
  await page.locator('[data-state="MT"]').click()
  await expect(page.locator('.state-panel')).toContainText('Anulado sub judice')
  await expect(page.locator('.state-panel')).toContainText('Candidato string 1234!@#$"TSE"')
  await expect(page.locator('.state-panel > .panel-candidates > li')).toHaveCount(3)
  await page.locator('.other-candidates summary').click()
  await expect(page.locator('.state-panel .panel-candidates > li')).toHaveCount(13)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
