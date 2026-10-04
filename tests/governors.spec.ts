import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { GOVERNORS, normalizeTse } from '../server/tse-adapter'
import { states } from '../src/data/states'
import { createMockSnapshot } from '../src/data/mock-election'
const sp=JSON.parse(readFileSync('tests/fixtures/tse/governor-sp.json','utf8'))
const data=normalizeTse(new Map(states.map(s=>[s.uf.toLowerCase(),{...sp,cdabr:s.uf.toLowerCase()}])),new Date().toISOString(),GOVERNORS)

test('switches offices without mixing candidates; state details, keyboard and accessibility',async({page})=>{
  await page.route('**/api/tse/presidential',r=>r.fulfill({json:{...createMockSnapshot(),source:'tse'}}))
  await page.route('**/api/tse/governors',r=>r.fulfill({json:data}))
  await page.goto('/')
  await expect(page.locator('.national-summary')).toContainText('1º TURNO')
  await page.getByRole('button',{name:'Governadores',exact:true}).click()
  await expect(page.getByRole('button',{name:'Governadores',exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('.governor-summary')).toContainText('27 DISPUTAS ESTADUAIS')
  await expect(page.locator('.governor-summary')).toContainText('0 eleitos')
  await expect(page.locator('.summary-candidate')).toHaveCount(0)
  await expect(page.locator('[data-state]')).toHaveCount(27)
  await page.locator('[data-state="SP"]').focus()
  await expect(page.locator('.tooltip-candidates > div')).toHaveCount(4)
  await page.keyboard.press('Enter')
  await expect(page.locator('.state-panel')).toContainText('TARCÍSIO · REPUBLICANOS')
  await expect(page.locator('.panel-footnote')).toContainText('Governador')
  await expect(page.locator('.state-panel > .panel-candidates > li')).toHaveCount(4)
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.locator('.state-panel')).toHaveCount(0)
  await page.getByRole('button',{name:'Presidente',exact:true}).click()
  await expect(page.locator('.national-summary')).toContainText('Cand. A')
  await expect(page.locator('.governor-summary')).toHaveCount(0)
})

test('governor loading and failure do not display the presidential snapshot',async({page})=>{
  await page.route('**/api/tse/presidential',r=>r.fulfill({json:{...createMockSnapshot(),source:'tse'}}))
  let fail=true
  await page.route('**/api/tse/governors',async r=>{
    if(fail) await r.fulfill({status:503,json:{error:'unavailable'}})
    else await r.fulfill({json:data})
  })
  await page.goto('/')
  await expect(page.locator('[data-state]')).toHaveCount(27)
  await page.getByRole('button',{name:'Governadores',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('503')
  await expect(page.locator('[data-state]')).toHaveCount(0)
  fail=false
  await page.getByRole('button',{name:'Tentar novamente'}).click()
  await expect(page.locator('.governor-summary')).toBeVisible()
})
