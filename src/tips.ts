// Practical ways to waste less, matched to what was thrown away and why. General household advice, written for Scraps.

import type { Group, Reason } from './foods'

export const GROUP_TIPS: Record<Group, string> = {
  bread: 'Freeze part of the loaf as soon as you buy it and toast slices straight from the freezer. Stale bread makes croutons or breadcrumbs.',
  grains: 'Measure dry rice or pasta per person before cooking. Cooked rice keeps a day in the fridge if you cool it quickly; freeze extra portions.',
  fruit: 'Keep ripe fruit where you can see it and eat it first. Overripe fruit works in smoothies, porridge or baking; peeled bananas freeze well.',
  veg: 'Store vegetables in the fridge drawer, and cook the soft ones first: soups, stir-fries and sauces take vegetables that are past their best.',
  dairy: 'Check the fridge before shopping. Milk and grated cheese freeze well for cooking if you will not finish them in time.',
  eggs: 'Keep eggs in the fridge and use the oldest first. How long they stay safe past the printed date depends on local rules, so check your food agency\'s guidance.',
  meat: 'Freeze meat on the day you buy it if you will not cook it within a couple of days, and defrost it in the fridge.',
  fish: 'Freeze fish on the day you buy it if you will not cook it the next day, and defrost it in the fridge.',
  'plant-protein': 'Cook a smaller batch, or freeze cooked beans and lentils in portions for later meals.',
  treats: 'Keep opened chocolate and nuts in a sealed container; nuts last longer in the fridge.',
}

export const REASON_TIPS: Record<Reason, string> = {
  off: 'Plan meals for the week and shop with a list, so food is used before it goes off.',
  leftovers: 'Set one meal a week for leftovers, and put them at the front of the fridge.',
  'too-much': 'Serve smaller first portions and put the rest away for tomorrow straight after cooking.',
  date: 'Where labels say "use by" and "best before", "use by" is about safety and "best before" about quality: food past its best-before date is often still fine, so check it before throwing it away.',
  disliked: 'Buy a smaller amount the next time you try something new.',
  other: 'Write down what happened next to the item; patterns show up after a week or two.',
}
