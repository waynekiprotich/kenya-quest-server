import { CATEGORIES, DEALS, LOCATIONS, PLACES, QUESTS } from './data'

// The catalog is static per deployment, so every derived view is built once per isolate.
const locationName = new Map(LOCATIONS.map((location) => [location.id, location.name]))
const nameOf = (locationId: string) => locationName.get(locationId) ?? locationId

export const quests = QUESTS.map((quest) => ({
  ...quest,
  locationName: nameOf(quest.location),
  taskCount: quest.tasks.length,
}))
export const places = PLACES.map((place) => ({ ...place, locationName: nameOf(place.location) }))
export const deals = DEALS.map((deal) => {
  const place = PLACES.find((item) => item.id === deal.placeId)
  return { ...deal, placeName: place?.name ?? null, location: place?.location ?? null }
})
export const locations = LOCATIONS.map((location) => ({
  ...location,
  questCount: QUESTS.filter((quest) => quest.location === location.id).length,
  placeCount: PLACES.filter((place) => place.location === location.id).length,
}))
export const categories = CATEGORIES.map((name) => ({
  name,
  questCount: QUESTS.filter((quest) => quest.category.includes(name)).length,
}))
export const discover = { quests, locations, categories }

export type QuestSummary = (typeof quests)[number]
export type PlaceSummary = (typeof places)[number]

const questById = new Map(quests.map((quest) => [quest.id, quest]))
const placeById = new Map(places.map((place) => [place.id, place]))
const locationById = new Map(LOCATIONS.map((location) => [location.id, location]))

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export function filterQuests(location: string | null, category: string | null) {
  return quests.filter(
    (quest) =>
      (!location || quest.location === location) &&
      (!category || quest.category.some((name) => same(name, category))),
  )
}

export function filterPlaces(location: string | null, type: string | null) {
  return places.filter(
    (place) => (!location || place.location === location) && (!type || same(place.type, type)),
  )
}

export function filterDeals(location: string | null) {
  return location ? deals.filter((deal) => deal.location === location) : deals
}

export function questDetail(id: string) {
  const quest = questById.get(id)
  if (!quest) return undefined
  const stops = new Set(quest.nearbyPlaces)
  return {
    ...quest,
    // Places follow the quest's route order, not catalog order.
    nearby: quest.nearbyPlaces.map((placeId) => placeById.get(placeId)!),
    deals: deals.filter((deal) => stops.has(deal.placeId)),
  }
}

export function placeDetail(id: string) {
  const place = placeById.get(id)
  if (!place) return undefined
  return {
    ...place,
    quests: quests.filter((quest) => quest.nearbyPlaces.includes(id)),
    deals: deals.filter((deal) => deal.placeId === id),
  }
}

export function locationDetail(id: string) {
  const location = locationById.get(id)
  if (!location) return undefined
  const here = places.filter((place) => place.location === id)
  const ids = new Set(here.map((place) => place.id))
  return {
    ...location,
    quests: quests.filter((quest) => quest.location === id),
    places: here,
    deals: deals.filter((deal) => ids.has(deal.placeId)),
  }
}
