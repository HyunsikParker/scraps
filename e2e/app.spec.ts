import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

function watch(page: Page) {
  const errors: string[] = []
  const requests: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (r) => {
    const url = r.url()
    if (!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('blob:') && !url.startsWith('data:')) requests.push(url)
  })
  return { errors, requests }
}

test('example week: totals, the biggest lever and the chart', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Show a made-up example week' }).click()
  await expect(page.locator('.totals')).toContainText('2.03 kg')
  await expect(page.locator('.totals')).toContainText('14 kg CO2e')
  await expect(page.locator('.lever h3')).toHaveText('Your biggest lever: beef')
  await expect(page.locator('.lever')).toContainText('corresponds to about 233 kg CO2e')
  await expect(page.locator('.bars li')).toHaveCount(10)
  await page.getByRole('button', { name: 'Weight' }).click()
  await expect(page.locator('.bars li').first()).toContainText('Milk400 g')
  await page.getByLabel('People in your household').fill('4')
  await expect(page.locator('.people p')).toContainText('0.51 kg of edible food recorded per person in this window.')
  const a11y = await new AxeBuilder({ page }).analyze()
  if (a11y.violations.length) console.log(JSON.stringify(a11y.violations.flatMap((v) => v.nodes.map((n) => ({ id: v.id, t: n.target })))).slice(0, 2000))
  expect(a11y.violations.map((v) => v.id)).toEqual([])
  expect(seen.errors).toEqual([])
  expect(seen.requests).toEqual([])
})

test('logging my own waste (one entry by the Enter key), and the log survives a reload', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/')
  await page.getByRole('combobox', { name: /^Food/ }).selectOption('cheese')
  await page.getByRole('button', { name: 'One slice more' }).click()
  await expect(page.locator('.count')).toHaveText('2 slices')
  await page.getByLabel('Leftovers not eaten').check()
  await expect(page.locator('.preview')).toContainText('1.19 kg CO2e')
  await page.getByRole('button', { name: 'Add to my log' }).click()
  await expect(page.getByRole('status')).toContainText('Added cheese, 50 g')
  await page.getByRole('combobox', { name: /^Food/ }).selectOption('rice')
  await page.getByPlaceholder('160').fill('280')
  await page.keyboard.press('Enter')
  await expect(page.locator('.lever h3')).toHaveText('Your biggest lever: cheese')
  await page.reload()
  await expect(page.locator('.entries tbody tr')).toHaveCount(2)
  await page.getByRole('button', { name: /^Remove Cheese/ }).click()
  await expect(page.locator('.entries tbody tr')).toHaveCount(1)
  expect(seen.errors).toEqual([])
  expect(seen.requests).toEqual([])
})

test('phone width: no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Show a made-up example week' }).click()
  await expect(page.locator('.lever')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})


test('completed days unlock comparison, and changing a log reopens its day', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/')
  const today = await page.getByLabel('Day', { exact: true }).inputValue()
  const priorDate = new Date(`${today}T12:00:00Z`)
  priorDate.setUTCDate(priorDate.getUTCDate() - 7)
  await page.getByLabel('Day', { exact: true }).fill(priorDate.toISOString().slice(0, 10))
  await page.getByRole('spinbutton', { name: 'grams', exact: true }).fill('200')
  await page.getByRole('button', { name: 'Add to my log' }).click()
  await page.getByLabel('Day', { exact: true }).fill(today)
  await page.getByRole('spinbutton', { name: 'grams', exact: true }).fill('100')
  await page.getByRole('button', { name: 'Add to my log' }).click()
  await expect(page.locator('.year')).toHaveCount(0)
  await page.getByText('Mark completed days, including zero-waste days', { exact: true }).click()
  const days = page.locator('.coverage input')
  for (let i = 0; i < 13; i++) await days.nth(i).check()
  await expect(page.locator('.year')).toBeVisible()
  await expect(page.locator('.comparison')).toContainText('Mark all 14 days complete')
  await days.nth(13).check()
  await expect(page.locator('.comparison')).toContainText('100 g less edible food recorded (50% lower)')
  await page.reload()
  await expect(page.locator('.comparison')).toContainText('50% lower')
  await page.getByRole('button', { name: `Remove Bread from ${today}`, exact: true }).click()
  await expect(page.locator('.coverage-status')).toContainText('6 of 7')
  await expect(page.locator('.comparison')).toContainText('Mark all 14 days complete')
  await page.getByText('Mark completed days, including zero-waste days', { exact: true }).click()
  await page.getByRole('checkbox', { name: today, exact: true }).check()
  await expect(page.locator('.empty')).toContainText('no edible food waste recorded')
  await expect(page.locator('.comparison')).toContainText('100% lower')
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => v.id)).toEqual([])
  expect(seen.errors).toEqual([])
  expect(seen.requests).toEqual([])
})

test('example does not replace the household log or persist on reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add to my log' }).click()
  await page.getByLabel('People in your household').fill('7')
  await page.getByRole('button', { name: 'Show a made-up example week' }).click()
  await expect(page.getByLabel('People in your household')).toHaveValue('2')
  await expect(page.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to my log' }).click()
  await expect(page.getByLabel('People in your household')).toHaveValue('7')
  await expect(page.locator('.entries tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Show a made-up example week' }).click()
  await page.reload()
  await expect(page.getByLabel('People in your household')).toHaveValue('7')
  await expect(page.locator('.entries tbody tr')).toHaveCount(1)
})

test('blocked storage warns without preventing logging', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') } })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('could not save your log')
  await page.getByRole('button', { name: 'Add to my log' }).click()
  await expect(page.locator('.entries tbody tr')).toHaveCount(1)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`completed-day controls on a phone in ${colorScheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    await page.getByRole('button', { name: 'Add to my log' }).click()
    await page.getByText('Mark completed days, including zero-waste days', { exact: true }).click()
    await expect(page.locator('.coverage input')).toHaveCount(14)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    expect((await new AxeBuilder({ page }).analyze()).violations.map(v => v.id)).toEqual([])
    await page.screenshot({ path: `test-results/scraps-phone-${colorScheme}.png`, fullPage: true })
    await page.setViewportSize({ width: 1365, height: 1000 })
    await page.screenshot({ path: `test-results/scraps-desktop-${colorScheme}.png`, fullPage: true })
  })
}

test('damaged history reopens completion and cannot look like an environmental improvement', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.addInitScript(() => {
    if (localStorage.getItem('scraps.v2')) return
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const offset = (n: number) => {
      const date = new Date(`${today}T12:00:00Z`)
      date.setUTCDate(date.getUTCDate() + n)
      return date.toISOString().slice(0, 10)
    }
    localStorage.setItem('scraps.v2', JSON.stringify({ people: 2, completedDays: Array.from({ length: 14 }, (_, i) => offset(-i)), entries: [
      { id: 'prior', food: 'bread', grams: 200, reason: 'off', date: offset(-7) },
      { id: 'current', food: 'bread', grams: 100, reason: 'off', date: today },
      { id: 'damaged', food: 'bread', grams: null, reason: 'off', date: today },
    ] }))
  })
  const seen = watch(page)
  await page.goto('/')
  const today = await page.getByLabel('Day', { exact: true }).inputValue()
  await expect(page.getByRole('status')).toContainText('Completed days affected by the missing records were reopened')
  await expect(page.locator('.coverage-status')).toContainText('6 of 7 days marked complete')
  await expect(page.locator('.totals')).toContainText('0.10 kg')
  await expect(page.locator('.year')).toHaveCount(0)
  await expect(page.locator('.comparison')).toContainText('Mark all 14 days complete')
  await expect(page.locator('.comparison')).not.toContainText('lower')
  const recovery = await page.evaluate(() => JSON.parse(localStorage.getItem('scraps.recovery')!))
  expect(recovery.entries).toHaveLength(3)
  expect(recovery.entries[2].grams).toBeNull()
  await page.getByText('Mark completed days, including zero-waste days', { exact: true }).click()
  await expect(page.getByRole('checkbox', { name: today, exact: true })).not.toBeChecked()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/recovery-phone.png', fullPage: true })
  await page.reload()
  await expect(page.locator('.comparison')).toContainText('Mark all 14 days complete')
  await page.getByRole('spinbutton', { name: 'grams', exact: true }).fill('900')
  await page.getByRole('button', { name: 'Add to my log' }).click()
  await page.getByText('Mark completed days, including zero-waste days', { exact: true }).click()
  await page.getByRole('checkbox', { name: today, exact: true }).check()
  await expect(page.locator('.comparison')).toContainText('800 g more edible food recorded (400% higher)')
  await expect(page.locator('.year')).toBeVisible()
  expect(seen.errors).toEqual([])
  expect(seen.requests).toEqual([])
})
