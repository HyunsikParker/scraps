// Practical ways to waste less, matched to what was thrown away and why. General household advice, written for Scraps.

import type { Group, Reason } from './foods'

export const GROUP_TIPS: Record<Group, string> = {
  bread: 'Freeze part of a fresh loaf and take out only the slices you need. Plan to use the rest before it spoils.',
  grains: 'Measure dry rice or pasta before cooking. Cool leftover rice quickly, ideally within one hour, refrigerate it and use within 24 hours. Reheat only once, until steaming hot.',
  fruit: 'Check the fruit you already have before buying more. Plan to use ripe fruit first, while it is still safe to eat.',
  veg: 'Plan meals around the vegetables already in your fridge and buy smaller amounts of those you often discard. Follow their storage labels.',
  dairy: 'Check the fridge before shopping. Milk and grated cheese freeze well for cooking if you will not finish them in time.',
  eggs: 'Keep eggs in the fridge and use the oldest first. How long they stay safe past the printed date depends on local rules, so check your food agency\'s guidance.',
  meat: 'Plan meals before buying meat. Follow the storage label and cook or freeze it by its use-by date; defrost in the fridge.',
  fish: 'Buy the amount you plan to cook. Follow the storage label and cook or freeze fish by its use-by date; defrost in the fridge.',
  'plant-protein': 'Cook a smaller batch, or freeze cooked beans and lentils in portions for later meals.',
  treats: 'Keep opened chocolate and nuts in a sealed container; nuts last longer in the fridge.',
}

export const REASON_TIPS: Record<Reason, string> = {
  off: 'Plan meals for the week and shop with a list, so food is used before it goes off.',
  leftovers: 'Plan to eat leftovers soon. Cool and refrigerate within one to two hours and eat within 48 hours; rice needs quicker cooling and use within 24 hours. Follow the label if it is stricter.',
  'too-much': 'Serve smaller first portions. Cool and refrigerate leftovers within one to two hours; cool rice ideally within one hour and use within 24 hours.',
  date: 'A use-by date concerns safety: do not eat food after it or rely on smell to judge it. A best-before date concerns quality. Follow storage instructions and local guidance.',
  disliked: 'Buy a smaller amount the next time you try something new.',
  other: 'Check what was left before your next shop. Try buying less of that food, then compare two completed weeks.',
}
