import { CATEGORIES, LOCATIONS } from './data'
import { places, quests } from './catalog'

export const MAX_QUERY_LENGTH = 200

type Field = [text: string, weight: number]

export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function terms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean)
}

// Every term must match some field. Word-start and exact matches outrank substrings,
// and heavier fields (titles, names) outrank descriptions.
export function score(fields: Field[], words: string[]): number {
  let total = 0
  for (const word of words) {
    let best = 0
    for (const [text, weight] of fields) {
      const index = text.indexOf(word)
      if (index === -1) continue
      const atWordStart = index === 0 || !/[a-z0-9]/.test(text[index - 1])
      const exact = text === word
      best = Math.max(best, weight * (atWordStart ? 2 : 1) * (exact ? 2 : 1))
    }
    if (!best) return 0
    total += best
  }
  return total
}

function index<T>(items: readonly T[], fields: (item: T) => Array<[string | null, number]>) {
  return items.map((item) => ({
    item,
    fields: fields(item)
      .filter((field): field is [string, number] => Boolean(field[0]))
      .map(([text, weight]) => [normalize(text), weight] as Field),
  }))
}

const questIndex = index(quests, (quest) => [
  [quest.title, 8],
  [quest.category.join(' '), 5],
  [quest.locationName, 4],
  [quest.difficulty, 2],
  [quest.tasks.map((task) => task.label).join(' '), 2],
  [quest.description, 1],
])
const placeIndex = index(places, (place) => [
  [place.name, 8],
  [place.type, 5],
  [place.locationName, 4],
  [place.price, 1],
  [place.description, 1],
])
const locationIndex = index(LOCATIONS, (location) => [
  [location.name, 8],
  [location.tagline, 2],
  [location.description, 1],
])
const categoryIndex = index(CATEGORIES, (name) => [[name, 1]])

function rank<T>(entries: Array<{ item: T; fields: Field[] }>, words: string[]): T[] {
  return entries
    .map((entry, order) => ({ item: entry.item, order, score: score(entry.fields, words) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((entry) => entry.item)
}

export function search(query: string) {
  const words = terms(query)
  if (!words.length) return { query, quests: [], places: [], locations: [], categories: [] }
  return {
    query,
    quests: rank(questIndex, words),
    places: rank(placeIndex, words),
    locations: rank(locationIndex, words),
    categories: rank(categoryIndex, words),
  }
}
