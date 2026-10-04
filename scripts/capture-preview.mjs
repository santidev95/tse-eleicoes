import { chromium, devices } from '@playwright/test'
import fs from 'node:fs/promises'
await fs.mkdir('artifacts', { recursive: true })
const browser = await chromium.launch()
for (const mode of ['desktop', 'mobile']) {
  const context = await browser.newContext(
    mode === 'desktop'
      ? { viewport: { width: 1280, height: 1004 } }
      : { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
  )
  const page = await context.newPage()
  const failures = []
  page.on('requestfailed', (request) => failures.push(request.url()))
  await page.goto('http://127.0.0.1:5173')
  await page.locator('[data-state="BA"]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `artifacts/${mode}.png`, fullPage: true })
  await page.locator('[data-state="BA"]').click()
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => {})),
    )
  })
  await page.screenshot({ path: `artifacts/${mode}-details.png`, fullPage: true })
  const dimensions = await page
    .locator('.brazil-map image')
    .evaluateAll((images) =>
      images.map((image) => ({
        href: image.getAttribute('href'),
        width: image.getAttribute('width'),
        height: image.getAttribute('height'),
        visible: image.getBoundingClientRect().width > 0,
      })),
    )
  if (dimensions.length !== 27 || dimensions.some((image) => !image.visible) || failures.length)
    throw new Error('Missing or failed map asset')
  console.log(`${mode}: 27 SVGs rendered; no failed requests; screenshots captured.`)
  await context.close()
}
await browser.close()
