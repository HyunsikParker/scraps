// Record the current local app, with captions and no synthetic narration.
// Usage: node scripts/demo.mjs http://127.0.0.1:4173 OUTPUT_DIRECTORY
import { chromium, expect } from '@playwright/test'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [url, out] = process.argv.slice(2)
if (!url || !out || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw new Error('Use a local preview URL and an output directory')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light', recordVideo: { dir: out, size: { width: 1280, height: 800 } } })
const page = await context.newPage()
const video = page.video()
const started = Date.now()
const scenes = []
async function scene(text, action, seconds = 7) {
  const start = (Date.now() - started) / 1000
  await action()
  await page.waitForTimeout(seconds * 1000)
  scenes.push({ start, end: (Date.now() - started) / 1000, text })
}
const center = (selector) => page.locator(selector).first().evaluate(el => el.scrollIntoView({ block: 'center' }))
await page.goto(url)
await scene('Scraps logs edible food waste. All amounts in this walkthrough are made-up demonstration inputs.', async () => {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
await scene('The example week totals 2.03 kg. Emissions and water figures are estimates based on global averages.', async () => {
  await page.getByRole('button', { name: 'Show a made-up example week' }).click()
  await expect(page.locator('.totals')).toContainText('2.03 kg')
  await center('.totals')
})
await scene('Beef leads by estimated emissions. The annual figure is a conditional scenario, not verified savings.', async () => {
  await expect(page.locator('.lever')).toContainText('These are not verified savings')
  await center('.lever')
})
await scene('Switch to weight: milk ranks first. The example never overwrites your personal log.', async () => {
  await page.getByRole('button', { name: 'Weight', exact: true }).click()
  await expect(page.locator('.bars li').first()).toContainText('Milk')
  await center('.bars')
})
await scene('Demo inputs: 200 g of bread last week and 100 g this week. Unchecked days remain missing data.', async () => {
  await page.getByRole('button', { name: 'Back to my log' }).click()
  const today = await page.getByLabel('Day', { exact: true }).inputValue()
  const prior = new Date(`${today}T12:00:00Z`)
  prior.setUTCDate(prior.getUTCDate() - 7)
  await page.getByLabel('Day', { exact: true }).fill(prior.toISOString().slice(0, 10))
  await page.getByRole('spinbutton', { name: 'grams', exact: true }).fill('200')
  await page.getByRole('button', { name: 'Add to my log' }).click()
  await page.getByLabel('Day', { exact: true }).fill(today)
  await page.getByRole('spinbutton', { name: 'grams', exact: true }).fill('100')
  await page.getByRole('button', { name: 'Add to my log' }).click()
  await page.getByText('Mark completed days, including zero-waste days', { exact: true }).click()
  await center('.coverage')
})
await scene('After confirming all 14 days, the demo shows 50% less recorded weight. This is not evidence of real-world impact.', async () => {
  const days = page.locator('.coverage input')
  for (let i = 0; i < 14; i++) await days.nth(i).check()
  await expect(page.locator('.comparison')).toContainText('50% lower')
  await center('.comparison')
}, 9)
await context.close()
renameSync(await video.path(), join(out, 'demo.webm'))
await browser.close()
const stamp = (seconds) => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23)
writeFileSync(join(out, 'demo.vtt'), 'WEBVTT\n\n' + scenes.map((s, i) => `${i + 1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.text}\n`).join('\n'))
writeFileSync(join(out, 'timeline.json'), JSON.stringify({ recorded_at: new Date().toISOString(), local_url: url, wall_duration_s: (Date.now() - started) / 1000, scenes }, null, 2) + '\n')
console.log(JSON.stringify({ scenes: scenes.length, wall_duration_s: (Date.now() - started) / 1000, out }))
