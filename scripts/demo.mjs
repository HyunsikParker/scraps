// Records the narrated walkthrough: node scripts/demo.mjs https://hyunsikparker.github.io/scraps/ OUT_DIR
// then, from the Bounty tools: calibrate.py OUT_DIR/timeline.json --visual 3,4,5 and compose.py OUT_DIR/timeline.json OUT.mp4
// The narrated numbers are checked against the page as the recording runs; the run stops if one is wrong.
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [url, out] = process.argv.slice(2)
const TTS = '/Volumes/Crucial X9/workstation/Bounty/tts-narration/bin/bounty-tts'
mkdirSync(join(out, 'rec'), { recursive: true })

const expectText = async (page, sel, want) => {
  const got = (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ')
  if (!got.includes(want)) throw new Error(`narration check failed: ${sel} lacks "${want}"`)
}
const center = (page, sel) => page.locator(sel).first().evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))

const scenes = [
  {
    text: 'Scraps is a food-waste log for a household. You note what you throw away, and it shows the carbon and water it took to produce that food, so you can see which habit is worth changing.',
    run: async (page) => { await page.waitForTimeout(500) },
  },
  {
    text: 'Logging takes a few taps: the food, how much, and why. Before you add it, Scraps shows what producing it took.',
    run: async (page) => {
      await page.getByRole('combobox', { name: /^Food/ }).selectOption({ label: 'Chicken' })
      await page.waitForTimeout(1300)
      await page.getByRole('button', { name: 'One portion more' }).click()
      await page.waitForTimeout(1100)
      await page.getByText('Leftovers not eaten').click()
      await page.waitForTimeout(600)
      await center(page, '.preview')
    },
  },
  {
    text: 'Here is a made-up week for a household of two. Two point zero three kilograms of food thrown away took fourteen kilograms of CO2e and twelve hundred and fifty-nine litres of water to produce: about a hundred and six kilograms of food a year.',
    caption: 'Here is a made-up week for a household of two. 2.03 kg of food thrown away took 14 kg CO2e and 1,259 litres of water to produce: about 106 kg of food a year.',
    run: async (page) => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
      await page.waitForTimeout(900)
      await page.getByRole('button', { name: 'Show a made-up example week' }).click()
      await expectText(page, '.totals', 'Food thrown away 2.03 kg Emissions to produce it 14 kg CO2e Water to produce it 1,259 L')
      await expectText(page, '.year', 'about 106 kg of food')
      if ((await page.getByRole('spinbutton', { name: 'People in your household' }).inputValue()) !== '2') throw new Error('household is not 2 people')
    },
  },
  {
    text: 'The biggest lever is beef: only ninety grams, but sixty-three percent of the week\'s footprint. Wasting half as much for a year would avoid about two hundred and thirty-three kilograms of CO2e. The tips match the food, and the most common reason.',
    caption: 'The biggest lever is beef: only 90 g, but 63% of the week\'s footprint. Wasting half as much for a year would avoid about 233 kg CO2e. The tips match the food, and the most common reason.',
    run: async (page) => {
      await expectText(page, '.lever', 'Beef was 63% of this week’s footprint (9.0 kg CO2e from 90 g)')
      await expectText(page, '.lever', 'about 233 kg CO2e')
      await center(page, '.lever')
    },
  },
  {
    text: 'The chart ranks foods by footprint, where beef leads. Switch it to weight, and milk and potatoes come first instead.',
    run: async (page) => {
      await center(page, '.bars')
      await page.waitForTimeout(3500)
      await page.getByRole('button', { name: 'Weight' }).click()
      const order = (await page.locator('.bars li').allInnerTexts()).map((x) => x.split('\n')[0].trim())
      if (order[0] !== 'Milk' || order[1] !== 'Potatoes') throw new Error(`weight order is ${order.slice(0, 3)}`)
    },
  },
  {
    text: 'The figures are global averages from Poore and Nemecek, published by Our World in Data. Scraps runs in your browser, and the log stays on this device.',
    run: async (page) => {
      await page.getByRole('button', { name: 'CO2e' }).click()
      await page.waitForTimeout(1200)
      await center(page, '.entries')
    },
  },
]

// 1. Narration, one WAV per scene, reused while the scene text is unchanged.
scenes.forEach((s, k) => {
  s.wav = `s${k + 1}.wav`
  const receiptPath = join(out, `s${k + 1}.json`)
  const textPath = join(out, `s${k + 1}.txt`)
  const cached = existsSync(receiptPath) && existsSync(textPath) && readFileSync(textPath, 'utf8') === s.text
  if (!cached) {
    // The runtime logs model loading before the receipt; the receipt is the last top-level JSON object.
    const stdout = execFileSync(TTS, ['--text', s.text, '--output', join(out, s.wav)], { encoding: 'utf8' })
    writeFileSync(receiptPath, stdout.slice(stdout.startsWith('{') ? 0 : stdout.lastIndexOf('\n{') + 1))
    writeFileSync(textPath, s.text)
  }
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
  s.duration = receipt.duration_seconds
  if (!(s.duration > 0)) throw new Error(`scene ${k + 1}: no duration in the TTS receipt`)
  console.log(`scene ${k + 1}: ${s.duration}s`)
})

// 2. Record a clean run paced by the narration.
const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  bypassCSP: true,
  acceptDownloads: true,
  recordVideo: { dir: join(out, 'rec'), size: { width: 1280, height: 800 } },
})
await context.addInitScript(() => {
  // Repaint a 2-pixel element every frame so the screencast keeps emitting frames on static scenes.
  const tick = () => {
    let el = document.getElementById('__keep_paint')
    if (!el && document.body) {
      el = document.createElement('div')
      el.id = '__keep_paint'
      Object.assign(el.style, { position: 'fixed', right: '0', bottom: '0', width: '2px', height: '2px', pointerEvents: 'none', zIndex: '2147483647' })
      document.body.appendChild(el)
    }
    if (el) el.style.opacity = el.style.opacity === '0.01' ? '0.02' : '0.01'
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
const page = await context.newPage()
const v0 = Date.now()
await page.goto(url)
await page.evaluate(() => localStorage.clear())
await page.goto(url)
await page.getByRole('combobox', { name: /^Food/ }).waitFor()
await page.addStyleTag({ content: 'html { scroll-behavior: smooth; }' })
await page.waitForTimeout(400)
const t0 = Date.now()
const timeline = { video: 'rec.webm', trim_start_ms: t0 - v0, scenes: [] }
for (const s of scenes) {
  const start = Date.now() - t0
  timeline.scenes.push({ start_ms: start + 400, wav: s.wav, text: s.text, caption: s.caption, duration_s: s.duration })
  await page.waitForTimeout(400)
  await s.run(page)
  const left = start + 400 + s.duration * 1000 + 600 - (Date.now() - t0)
  if (left > 0) await page.waitForTimeout(left)
}
await page.waitForTimeout(900)
await context.close()
await browser.close()
const webm = readdirSync(join(out, 'rec')).find((f) => f.endsWith('.webm'))
renameSync(join(out, 'rec', webm), join(out, 'rec.webm'))
writeFileSync(join(out, 'timeline.json'), JSON.stringify(timeline, null, 1))
console.log('recorded', ((Date.now() - t0) / 1000).toFixed(1), 's after a', timeline.trim_start_ms, 'ms load', existsSync(join(out, 'rec.webm')) ? '' : '(no video!)')
