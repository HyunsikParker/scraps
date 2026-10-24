# Scraps

Log edible food waste, see its estimated production footprint, and compare two completed weeks. Scraps is a browser-local tool for households, shared flats and student kitchens.

[Live app](https://hyunsikparker.github.io/scraps/) · [Captioned walkthrough](https://hyunsikparker.github.io/scraps/demo.html)

## Use it

1. Record food in grams or approximate portions, with its date and the reason it was thrown away. The 29 choices use named dataset categories; for mixed meals, log the ingredients separately.
2. Inspect weight, estimated production emissions and freshwater withdrawals for the last seven days. Tips address the leading food by estimated emissions and the leading reason by weight.
3. Mark each day complete after recording all its edible food waste, including zero-waste days. Unchecked days remain missing data. Adding or removing a row reopens its day.
4. Complete 14 days to compare two adjacent seven-day windows. A zero baseline has no percentage change. Annual scenarios stay hidden until the latest seven days are complete.

The made-up example has its own temporary state. It uses two people by default, does not overwrite your log, and does not return when you reload.

## What the figures mean

Food weight comes from the amounts you enter. Production footprints use global averages from Poore & Nemecek (2018), *Science* 360(6392), as published by Our World in Data (CC BY 4.0): [greenhouse gas emissions](https://ourworldindata.org/grapher/ghg-per-kg-poore) and [freshwater withdrawals](https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore) per kilogram. Cooking, the journey home and disposal are excluded.

- Bread and pasta use the Wheat & Rye category; beef uses Beef (beef herd), fish uses Fish (farmed), and chocolate uses Dark Chocolate. These proxies do not identify an individual product's footprint.
- Cooked rice, pasta and pulses are divided by 2.8, 2.4 and 2.5 to estimate dry weight. These conversion factors are approximations.
- An annual scenario multiplies one completed week by 365/7. The half-waste scenario is conditional, not verified savings.
- Scraps tracks edible portions. [UNEP's 2024 household estimate](https://www.unep.org/resources/publication/food-waste-index-report-2024) includes inedible parts, so the app does not use it as a like-for-like performance benchmark.
- A change between logs is not proof of emissions avoided or of a habit's effect. No household trial or measured environmental benefit is claimed.

Food-safety reminders link to [Food Standards Agency guidance](https://www.gov.uk/government/publications/student-guide-to-food-safety-and-hygiene/student-guide-to-food-safety-and-hygiene). Follow local guidance and packaging instructions.

## Storage and privacy

No account, upload or analytics is required. The application blocks network connections with `connect-src 'none'`; the hosting service still receives ordinary page requests. Entries, household size and completed dates stay in local storage under `scraps.v2`.

Existing `scraps.v1` records are read without changing the original copy; legacy sample rows are excluded. Malformed v2 data is copied to `scraps.recovery` before replacement. Invalid rows are excluded with a warning. Storage failures are visible, and valid history is retained if a clock or timezone change makes it appear to be in the future. Such rows are excluded from the current window.

This is local browser storage, not a backup or sync service. Clearing site data removes it, and changes made while storage is unavailable may be lost.

## Validation

`npm run check` passes 23 unit tests and 8 Chrome browser tests on the production build. They cover calculation and date boundaries, malformed storage, example isolation, missing versus zero-waste days, two-week comparisons, zero baselines, reloads, removal and save failures. Browser tests include keyboard submission, no unexpected network requests or console errors in the monitored flows, phone-width overflow checks, and axe accessibility scans in the tested light and dark states with no reported violations.

The walkthrough is a recording of the current local production build, with fictional inputs, captions and no narration. `scripts/demo.mjs` asserts the displayed results while recording. It replaces the original October 22 narrated walkthrough.

## Run locally

```bash
npm ci
npm run dev       # http://127.0.0.1:5173
npm run check     # unit tests, build and browser tests; Google Chrome required
```

To record a walkthrough, start `npm run build && npm run preview`, then run:

```bash
node scripts/demo.mjs http://127.0.0.1:4173 /tmp/scraps-demo
```

The script creates a WebM recording, WebVTT captions and timing metadata. The published MP4 is encoded from that recording with FFmpeg.

## Credits

Built for Green Shift Hacks 2026, beginning October 22, 2026. Claude (Anthropic) assisted with the initial code, tests and documentation. Codex (OpenAI) assisted with the October 24 improvements, tests, recording script and documentation. The example and walkthrough inputs are fictional.

Data and context: Poore & Nemecek via Our World in Data (CC BY 4.0), UNEP, and the UK Food Standards Agency. Libraries: React, TypeScript and Vite; Vitest, Testing Library, Playwright and axe-core for tests.

MIT licensed.
