import { LOCATIONS, PLACES } from './data'
import type { Deal, Place, Quest } from './types'

export function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id)
}

export function locationName(locationId: string): string {
  return byId(LOCATIONS, locationId)?.name ?? locationId
}

export function expandQuest(quest: Quest) {
  return {
    ...quest,
    locationName: locationName(quest.location),
    taskCount: quest.tasks.length,
  }
}

export function expandPlace(place: Place) {
  return {
    ...place,
    locationName: locationName(place.location),
  }
}

export function expandDeal(deal: Deal) {
  const place = byId(PLACES, deal.placeId)
  return {
    ...deal,
    placeName: place?.name ?? null,
    location: place?.location ?? null,
  }
}
