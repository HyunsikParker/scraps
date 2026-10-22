// Foods people commonly throw away, each tied to a product in Poore & Nemecek (2018), "Reducing food's environmental
// impacts through producers and consumers", Science 360(6392), as published by Our World in Data (CC BY 4.0):
// global average greenhouse gas emissions (kg CO2e) and freshwater withdrawals (litres) per kilogram of product, from
// farm to retail. Throwing food away wastes what it took to produce it; that is the footprint shown here.

export interface Product {
  ghg: number // kg CO2e per kg
  water: number // litres per kg
}

/** Values from the Our World in Data tables "Greenhouse gas emissions per kilogram" and "Freshwater withdrawals per
 * kilogram" (Poore & Nemecek 2018), read on 2026-10-22. */
export const PRODUCTS: Record<string, Product> = {
  'Apples': { ghg: 0.43, water: 180 },
  'Bananas': { ghg: 0.86, water: 114 },
  'Beef (beef herd)': { ghg: 99.48, water: 1451 },
  'Berries & Grapes': { ghg: 1.53, water: 420 },
  'Brassicas': { ghg: 0.51, water: 119 },
  'Cheese': { ghg: 23.88, water: 5605 },
  'Citrus Fruit': { ghg: 0.39, water: 83 },
  'Dark Chocolate': { ghg: 46.65, water: 541 },
  'Eggs': { ghg: 4.67, water: 578 },
  'Fish (farmed)': { ghg: 13.63, water: 3691 },
  'Lamb & Mutton': { ghg: 39.72, water: 1803 },
  'Milk': { ghg: 3.15, water: 628 },
  'Nuts': { ghg: 0.43, water: 4134 },
  'Onions & Leeks': { ghg: 0.5, water: 14 },
  'Other Fruit': { ghg: 1.05, water: 154 },
  'Other Pulses': { ghg: 1.79, water: 436 },
  'Other Vegetables': { ghg: 0.53, water: 102 },
  'Pig Meat': { ghg: 12.31, water: 1796 },
  'Potatoes': { ghg: 0.46, water: 59 },
  'Poultry Meat': { ghg: 9.87, water: 660 },
  'Prawns (farmed)': { ghg: 26.87, water: 3515 },
  'Rice': { ghg: 4.45, water: 2248 },
  'Root Vegetables': { ghg: 0.43, water: 28 },
  'Soy milk': { ghg: 0.98, water: 28 },
  'Tofu': { ghg: 3.16, water: 149 },
  'Tomatoes': { ghg: 2.09, water: 370 },
  'Wheat & Rye': { ghg: 1.57, water: 648 }, // used for bread and pasta: the table has no separate bread or pasta product
}

export type Group = 'bread' | 'grains' | 'fruit' | 'veg' | 'dairy' | 'eggs' | 'meat' | 'fish' | 'plant-protein' | 'treats'

export interface Food {
  id: string
  name: string
  group: Group
  product: keyof typeof PRODUCTS
  /** Cooked foods are weighed cooked; the dataset counts dry rice, pasta and pulses, so the weight is divided by this. */
  cookedFactor?: number
  portion: { label: string; grams: number }
}

export const FOODS: Food[] = [
  { id: 'bread', name: 'Bread', group: 'bread', product: 'Wheat & Rye', portion: { label: 'slice', grams: 35 } },
  { id: 'rice', name: 'Rice (cooked)', group: 'grains', product: 'Rice', cookedFactor: 2.8, portion: { label: 'cup', grams: 160 } },
  { id: 'pasta', name: 'Pasta (cooked)', group: 'grains', product: 'Wheat & Rye', cookedFactor: 2.4, portion: { label: 'cup', grams: 140 } },
  { id: 'potatoes', name: 'Potatoes', group: 'veg', product: 'Potatoes', portion: { label: 'potato', grams: 170 } },
  { id: 'bananas', name: 'Bananas', group: 'fruit', product: 'Bananas', portion: { label: 'banana', grams: 120 } },
  { id: 'apples', name: 'Apples', group: 'fruit', product: 'Apples', portion: { label: 'apple', grams: 180 } },
  { id: 'citrus', name: 'Oranges and other citrus', group: 'fruit', product: 'Citrus Fruit', portion: { label: 'orange', grams: 140 } },
  { id: 'berries', name: 'Berries and grapes', group: 'fruit', product: 'Berries & Grapes', portion: { label: 'handful', grams: 80 } },
  { id: 'fruit', name: 'Other fruit', group: 'fruit', product: 'Other Fruit', portion: { label: 'portion', grams: 100 } },
  { id: 'tomatoes', name: 'Tomatoes', group: 'veg', product: 'Tomatoes', portion: { label: 'tomato', grams: 120 } },
  { id: 'salad', name: 'Salad leaves', group: 'veg', product: 'Other Vegetables', portion: { label: 'bag', grams: 100 } },
  { id: 'brassicas', name: 'Broccoli, cabbage, kale', group: 'veg', product: 'Brassicas', portion: { label: 'portion', grams: 100 } },
  { id: 'onions', name: 'Onions and leeks', group: 'veg', product: 'Onions & Leeks', portion: { label: 'onion', grams: 150 } },
  { id: 'roots', name: 'Carrots and root vegetables', group: 'veg', product: 'Root Vegetables', portion: { label: 'carrot', grams: 70 } },
  { id: 'veg', name: 'Other vegetables', group: 'veg', product: 'Other Vegetables', portion: { label: 'portion', grams: 100 } },
  { id: 'milk', name: 'Milk', group: 'dairy', product: 'Milk', portion: { label: 'glass', grams: 250 } },
  { id: 'cheese', name: 'Cheese', group: 'dairy', product: 'Cheese', portion: { label: 'slice', grams: 25 } },
  { id: 'eggs', name: 'Eggs', group: 'eggs', product: 'Eggs', portion: { label: 'egg', grams: 60 } },
  { id: 'chicken', name: 'Chicken', group: 'meat', product: 'Poultry Meat', portion: { label: 'portion', grams: 150 } },
  { id: 'pork', name: 'Pork, ham, bacon', group: 'meat', product: 'Pig Meat', portion: { label: 'portion', grams: 100 } },
  { id: 'beef', name: 'Beef', group: 'meat', product: 'Beef (beef herd)', portion: { label: 'portion', grams: 150 } },
  { id: 'lamb', name: 'Lamb', group: 'meat', product: 'Lamb & Mutton', portion: { label: 'portion', grams: 150 } },
  { id: 'fish', name: 'Fish', group: 'fish', product: 'Fish (farmed)', portion: { label: 'fillet', grams: 140 } },
  { id: 'prawns', name: 'Prawns', group: 'fish', product: 'Prawns (farmed)', portion: { label: 'portion', grams: 100 } },
  { id: 'tofu', name: 'Tofu', group: 'plant-protein', product: 'Tofu', portion: { label: 'portion', grams: 100 } },
  { id: 'pulses', name: 'Beans and lentils (cooked)', group: 'plant-protein', product: 'Other Pulses', cookedFactor: 2.5, portion: { label: 'portion', grams: 150 } },
  { id: 'soymilk', name: 'Soy milk', group: 'dairy', product: 'Soy milk', portion: { label: 'glass', grams: 250 } },
  { id: 'chocolate', name: 'Chocolate', group: 'treats', product: 'Dark Chocolate', portion: { label: 'bar', grams: 100 } },
  { id: 'nuts', name: 'Nuts', group: 'treats', product: 'Nuts', portion: { label: 'handful', grams: 30 } },
]

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]))

export type Reason = 'off' | 'leftovers' | 'too-much' | 'date' | 'disliked' | 'other'

export const REASONS: { id: Reason; label: string }[] = [
  { id: 'off', label: 'Went off before we ate it' },
  { id: 'leftovers', label: 'Leftovers not eaten' },
  { id: 'too-much', label: 'Cooked or served too much' },
  { id: 'date', label: 'Past its date' },
  { id: 'disliked', label: "Didn't like it" },
  { id: 'other', label: 'Other' },
]
