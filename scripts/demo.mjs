// Record the local app with checked fictional inputs, captions and no narration.
// Usage: node scripts/demo.mjs http://127.0.0.1:4173 OUTPUT_DIRECTORY
import { chromium, expect } from '@playwright/test'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [url, out] = process.argv.slice(2)
if (!url || !out || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw new Error('Use a local preview URL and an output directory')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', recordVideo: { dir: out, size: { width: 1280, height: 900 } } })
const page = await context.newPage()
const video = page.video()
const started = Date.now()
const scenes = []
const errors = []
page.on('pageerror', e => errors.push(e.message))
async function scene(text, action, seconds = 6) {
  const start = (Date.now() - started) / 1000
  await action()
  await page.screenshot({ path: join(out, 'scene-' + String(scenes.length + 1).padStart(2, '0') + '.png') })
  await page.waitForTimeout(seconds * 1000)
  scenes.push({ start, end: (Date.now() - started) / 1000, text })
}
const center = selector => page.locator(selector).first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
let today
try {
  await page.goto(url)
  await scene('Scraps records edible food waste. Every input in this walkthrough is fictional, not a household trial.', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
  await scene('The separate example totals 2.03 kg. Its emissions and water figures use global production averages.', async () => {
    await page.getByRole('button', { name: 'Show a made-up example week' }).click()
    await expect(page.locator('.totals')).toContainText('2.03 kg')
    await expect(page.locator('.lever h3')).toHaveText('Your biggest lever: beef')
    await center('.totals')
  })
  await scene('Beef leads by estimated emissions; milk leads by weight. The example does not overwrite the personal log.', async () => {
    await page.getByRole('button', { name: 'Weight', exact: true }).click()
    await expect(page.locator('.bars li').first()).toContainText('Milk')
    await center('.bars')
  })
  await scene('Two fictional entries: 1,000 g of bread in the previous week and 100 g of beef in the latest week.', async () => {
    await page.getByRole('button', { name: 'Back to my log' }).click()
    today = await page.getByLabel('Day', { exact: true }).inputValue()
    const prior = new Date(today + 'T12:00:00Z')
    prior.setUTCDate(prior.getUTCDate() - 7)
    await page.getByLabel('Day', { exact: true }).fill(prior.toISOString().slice(0, 10))
    await page.getByRole('spinbutton', { name: 'grams', exact: true }).fill('1000')
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Add to my log' }).click()
    await page.getByLabel('Day', { exact: true }).fill(today)
    await page.getByRole('combobox', { name: /^Food/ }).selectOption('beef')
    await page.getByRole('spinbutton', { name: 'grams', exact: true }).fill('100')
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Add to my log' }).click()
    await expect(page.locator('.entries tbody tr')).toHaveCount(2)
    await center('.entries')
  })
  await scene('An unchecked day means missing data, not zero waste. Thirteen completed days are not enough for comparison.', async () => {
    await page.getByText('Mark completed days, including zero-waste days', { exact: true }).click()
    const days = page.locator('.coverage input')
    for (let i = 0; i < 13; i++) await days.nth(i).check()
    await expect(page.locator('.comparison')).toContainText('Mark all 14 days complete')
    await center('.coverage')
  })
  await scene('After all 14 days are complete: 90% less weight, but 8.38 kg CO2e higher estimated production emissions.', async () => {
    await page.locator('.coverage input').nth(13).check()
    await expect(page.locator('.comparison')).toContainText('900 g less edible food recorded (90% lower)')
    await expect(page.locator('.comparison')).toContainText('8.38 kg CO2e higher')
    await expect(page.locator('.comparison')).toContainText('502.9 L lower')
    await center('.comparison')
  }, 10)
  await scene('Food-level changes explain the total: beef adds 9.95 kg CO2e, while bread falls by 1.57 kg CO2e. Values are rounded.', async () => {
    await page.getByText('See what changed by food', { exact: true }).click()
    await expect(page.locator('.food-change-list li').first()).toContainText('Beef9.95 kg CO2e higher')
    await expect(page.locator('.food-change-list li').last()).toContainText('Bread1.57 kg CO2e lower')
    await center('.food-changes')
  }, 8)
  await scene('Water tells a different story: bread falls by 648 L and beef rises by 145.1 L, for a net 502.9 L decrease.', async () => {
    await page.getByLabel('Compare foods by').selectOption('water')
    await expect(page.locator('.food-change-list li').first()).toContainText('Bread648 L lower')
    await expect(page.locator('.food-change-list li').last()).toContainText('Beef145.1 L higher')
    await center('.food-changes')
  }, 8)
  await scene('The two entries and completion marks survive a reload. These are changes in logs, not proven environmental savings.', async () => {
    await page.reload()
    await expect(page.locator('.entries tbody tr')).toHaveCount(2)
    await expect(page.locator('.comparison')).toContainText('8.38 kg CO2e higher')
    await center('.comparison')
  }, 8)
  await scene('Simulated damage: the recording script inserts an invalid saved row, then reloads. Scraps warns and reopens its day.', async () => {
    // Deliberate local test-fixture fault, not a normal user action or actual data loss.
    await page.evaluate(date => {
      const saved = JSON.parse(localStorage.getItem('scraps.v2'))
      saved.entries.push({ id: 'demo-damaged-row', food: 'bread', grams: null, reason: 'off', date })
      localStorage.setItem('scraps.v2', JSON.stringify(saved))
    }, today)
    await page.reload()
    await expect(page.getByRole('status')).toContainText('Completed days affected by the missing records were reopened')
    await expect(page.locator('.coverage-status')).toContainText('6 of 7 days marked complete')
    await expect(page.locator('.year')).toHaveCount(0)
    await center('.masthead')
  }, 9)
  await scene('The comparison stays unavailable until the log is checked and completed again. This video verifies app behaviour, not household impact.', async () => {
    await expect(page.locator('.comparison')).toContainText('Mark all 14 days complete')
    await expect(page.locator('.footprint-changes')).toHaveCount(0)
    const recovery = await page.evaluate(() => JSON.parse(localStorage.getItem('scraps.recovery')))
    expect(recovery.entries).toHaveLength(3)
    expect(recovery.entries[2].grams).toBeNull()
    await center('.comparison')
  }, 9)
  expect(errors).toEqual([])
} finally {
  await context.close()
  await browser.close()
}
renameSync(await video.path(), join(out, 'demo.webm'))
const stamp = seconds => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23)
writeFileSync(join(out, 'demo.vtt'), 'WEBVTT\n\n' + scenes.map((s, i) => (i + 1) + '\n' + stamp(s.start) + ' --> ' + stamp(s.end) + '\n' + s.text + '\n').join('\n'))
writeFileSync(join(out, 'timeline.json'), JSON.stringify({ recorded_at: new Date().toISOString(), local_url: url, wall_duration_s: (Date.now() - started) / 1000, fictional_inputs: true, simulated_fault: 'Invalid local saved row injected explicitly for recovery demonstration', errors, scenes }, null, 2) + '\n')
console.log(JSON.stringify({ scenes: scenes.length, wall_duration_s: (Date.now() - started) / 1000, out }))
