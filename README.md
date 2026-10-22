# Scraps

**See what your food waste costs the planet, then waste less.** Log what you throw away for a week; Scraps shows the
greenhouse gas emissions and water it took to produce that food, which foods and habits matter most, and what one change
would save in a year. Everything stays in your browser.

Live demo: https://hyunsikparker.github.io/scraps/ · Video walkthrough (1 min 14 s, captions):
https://hyunsikparker.github.io/scraps/demo.html

The video is recorded from the live page by `scripts/demo.mjs` (Playwright), which checks the numbers the narration
quotes against the page as it records. The narration is a synthetic voice (Qwen3-TTS, run locally).

## The problem

In 2022 the world wasted 1.05 billion tonnes of food. Households were responsible for 631 million tonnes of it, 60% of the
total, or 79 kg per person per year, and food loss and waste generate 8-10% of global greenhouse gas emissions
([UNEP Food Waste Index Report 2024](https://www.unep.org/resources/publication/food-waste-index-report-2024)).

At home, waste is spread over many small moments (a few slices of bread, a bag of salad, last night's leftovers), so it
is hard to see how much there is or which part matters. And not all food is equal: producing a kilogram of beef from a
beef herd emits about 99 kg CO2e, a kilogram of bread about 1.6 kg
([Poore & Nemecek 2018, via Our World in Data](https://ourworldindata.org/grapher/ghg-per-kg-poore)). Throwing away 90 g of
beef wastes about as much as throwing away 5.7 kg of bread.

## Who it helps

Households, shared flats and student kitchens that want to cut food waste and need to know where to start.

## What it does

1. **Log** each thing you throw away: pick the food from 29 common items, the amount (in portions such as "2 slices" or
   in grams) and why it was thrown away (went off, leftovers, cooked too much, past its date, didn't like it). Before you
   add it, Scraps shows what producing it took.
2. **See the last 7 days**: the weight thrown away, the emissions (kg CO2e) and the water it took to produce, scaled to a
   year, and per person against the UNEP household average of 79 kg.
3. **Find your biggest lever**: the food with the largest footprint this week, its share of the total, what wasting half
   as much for a year would avoid, a practical tip for that kind of food, and a tip for your most common reason.
4. **Compare** foods by emissions, water or weight in a simple bar chart, and keep or remove entries in the log.

A made-up example week for a two-person household is one click away.

## How the numbers work

- Each food is tied to a product in Poore & Nemecek (2018), "Reducing food's environmental impacts through producers and
  consumers", *Science* 360(6392), as published by Our World in Data (CC BY 4.0): global average greenhouse gas emissions
  (kg CO2e) and freshwater withdrawals (litres) per kilogram of product, from farm to shop. Throwing food away wastes what
  it took to produce it, so that is the footprint shown. Cooking, transport home and the landfill are not counted.
- Bread and pasta use the dataset's "Wheat & Rye" figure, the closest product it has.
- Cooked rice, pasta and pulses are weighed cooked and converted back to dry weight (rice divided by 2.8, pasta by 2.4,
  pulses by 2.5), because the dataset counts dry produce. These factors are approximations.
- "A year" means the last 7 days times 365/7.

## Honest limits

- The factors are global averages; the real footprint of your food depends on where and how it was produced.
- 29 foods cover the most common household waste, not everything. Mixed meals have to be logged by their main ingredient.
- Scraps measures and explains; the saving only happens if the habit changes.

## Privacy

There is no server, no account and no analytics. The page's Content Security Policy blocks network requests
(`connect-src 'none'`); the log is kept in this browser's local storage.

## How it was checked

- 6 unit tests (`npm test`): the per-kilogram factors, cooked-to-dry conversion, unknown foods and empty amounts, every
  food mapped to a product and a tip, the 7-day summary and ranking, and the yearly and per-person scaling.
- 3 browser tests (`npm run test:e2e`, Playwright on the production build): the example week (totals, biggest lever,
  chart, household size), an automated accessibility scan with axe (no violations), logging entries, the log kept across
  a reload, removing an entry, no console errors, no network requests, and no horizontal scrolling at phone width.

## Run it locally

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # unit tests
npm run test:e2e   # browser tests on the production build
```

## Credits and disclosure

- Built during Green Shift Hacks 2026 (started October 22, 2026). No pre-existing project code.
- **AI assistance:** built with Claude (Anthropic), an AI coding assistant, which wrote the code, the tests and this
  README.
- Data: Poore & Nemecek (2018) via Our World in Data (CC BY 4.0); household figures from the UNEP Food Waste Index
  Report 2024.
- Libraries: React, Vite and TypeScript; Vitest, Testing Library, Playwright and axe-core for tests.
- The example week is made up.

## License

MIT
