import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { OFFICIAL, normalizeTse } from '../server/tse-adapter'
import { states } from '../src/data/states'
const br = JSON.parse(readFileSync('tests/fixtures/tse/official-br.json', 'utf8'))
const data = normalizeTse(
  new Map([
    ['br', br],
    ...states.map((s) => [s.uf.toLowerCase(), { ...br, tpabr: 'uf', cdabr: s.uf.toLowerCase() }]),
  ]),
  new Date().toISOString(),
  OFFICIAL,
)

test('official pending results remain neutral and distinct from simulated or withheld data', async ({
  page,
}) => {
  await page.route('**/api/tse/presidential', (route) => route.fulfill({ json: data }))
  await page.goto('/')
  await expect(page.locator('[data-state]')).toHaveCount(27)
  await expect(page.locator('.source-badge')).toHaveText('Fonte: TSE')
  await expect(page.locator('.national-summary')).toContainText('Aguardando início da apuração')
  await expect(page.locator('.summary-candidate')).toHaveCount(0)
  await page.locator('[data-state="MT"]').click()
  await expect(page.locator('.state-panel')).toContainText('Aguardando início da apuração')
  await expect(page.locator('.panel-candidates')).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
