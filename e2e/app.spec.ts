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
  await expect(page.locator('.lever')).toContainText('Wasting half as much for a year would avoid about 233 kg CO2e')
  await expect(page.locator('.bars li')).toHaveCount(10)
  await page.getByRole('button', { name: 'Weight' }).click()
  await expect(page.locator('.bars li').first()).toContainText('Milk400 g')
  await page.getByLabel('People in your household').fill('4')
  await expect(page.locator('.people p')).toContainText('26 kg per person a year, 33% of the household average of 79 kg')
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
