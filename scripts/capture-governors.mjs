import { chromium, devices, expect } from '@playwright/test'
import fs from 'node:fs/promises'
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch()
await fs.mkdir('artifacts', { recursive: true })
try {
  for (const mode of ['desktop','mobile']) {
    const context=await browser.newContext(mode==='desktop' ? {viewport:{width:1280,height:1031}} : {...devices['Pixel 7'],viewport:{width:390,height:844}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)})
    await page.goto(`${base}/?cargo=governador`)
    await expect(page.locator('[data-state]')).toHaveCount(27)
    await expect(page.locator('.governor-summary')).toContainText('27 DISPUTAS')
    const r=await page.request.get(`${base}/api/tse/governors`)
    const data=await r.json()
    if(r.status()!==200 || data.office!=='governor' || data.upstream.files.length!==27 || !data.storage || data.storage.stale) throw Error('Governors snapshot invalid or stale')
    await page.evaluate(()=>document.fonts.ready)
    await page.waitForLoadState('networkidle')
    await page.screenshot({path:`artifacts/governors-${mode}.png`,fullPage:true})
    await page.locator('[data-state="SP"]').focus()
    await expect(page.locator('.tooltip-candidates > div')).toHaveCount(4)
    await page.screenshot({path:`artifacts/governors-${mode}-tooltip.png`,fullPage:true})
    await page.keyboard.press('Enter')
    await expect(page.locator('.state-panel > .panel-candidates > li')).toHaveCount(4)
    await page.screenshot({path:`artifacts/governors-${mode}-details.png`,fullPage:true})
    const images=await page.locator('.brazil-map image').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('href'),width:n.getAttribute('width'),height:n.getAttribute('height'),rendered:n.getBoundingClientRect().width})))
    if(images.length!==27 || images.some(n=>!n.src.includes('/governors/') || n.rendered<=0))throw Error('Governor SVG geometry invalid')
    await page.keyboard.press('Escape')
    await page.getByRole('button',{name:'Presidente',exact:true}).click()
    await expect(page.locator('.summary-candidate')).toHaveCount(4)
    await expect(page.locator('.governor-summary')).toHaveCount(0)
    await page.screenshot({path:`artifacts/president-four-${mode}.png`,fullPage:true})
    if(errors.length)throw Error(errors.join('\n'))
    if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Horizontal overflow')
    console.log(`${mode}: official governors and president, four candidates, 27 SVGs, no errors.`)
    await context.close()
  }
} finally { await browser.close() }
