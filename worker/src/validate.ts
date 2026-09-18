import type { Deal, Location, Place, Quest } from './types'

export function validateData(data: {
  quests: Quest[]
  places: Place[]
  locations: Location[]
  deals: Deal[]
}) {
  function ids(items: { id: string }[], name: string) {
    const values = new Set(items.map((item) => item.id))
    if (values.size !== items.length || items.some((item) => !item.id))
      throw new Error(`Invalid or duplicate ${name} IDs`)
    return values
  }
  const quests = ids(data.quests, 'quest')
  const places = ids(data.places, 'place')
  const locations = ids(data.locations, 'location')
  ids(data.deals, 'deal')
  for (const item of [...data.quests, ...data.places]) {
    if (!locations.has(item.location)) throw new Error(`Unknown location on ${item.id}`)
  }
  for (const item of [...data.quests, ...data.places, ...data.locations]) {
    if (
      !Number.isFinite(item.lat) ||
      !Number.isFinite(item.lng) ||
      Math.abs(item.lat) > 90 ||
      Math.abs(item.lng) > 180
    )
      throw new Error(`Invalid coordinates on ${item.id}`)
  }
  for (const item of [...data.quests, ...data.places, ...data.locations]) {
    if (!/^https:\/\/[^\s]+$/.test(item.image)) throw new Error(`Invalid image URL on ${item.id}`)
  }
  for (const quest of data.quests) {
    if (!quest.tasks.length) throw new Error(`Quest ${quest.id} has no tasks`)
    ids(quest.tasks, `task in ${quest.id}`)
    if (quest.nearbyPlaces.some((id) => !places.has(id)))
      throw new Error(`Unknown nearby place on ${quest.id}`)
  }
  for (const place of data.places) {
    if (place.relatedQuests.some((id) => !quests.has(id)))
      throw new Error(`Unknown quest on ${place.id}`)
  }
  for (const deal of data.deals) {
    if (!places.has(deal.placeId)) throw new Error(`Unknown place on ${deal.id}`)
  }
}
