import questsJson from './data/quests.json'
import placesJson from './data/places.json'
import dealsJson from './data/deals.json'
import locationsJson from './data/locations.json'
import type { Deal, Location, Place, Quest } from './types'

export const QUESTS = questsJson as Quest[]
export const PLACES = placesJson as Place[]
export const DEALS = dealsJson as Deal[]
export const LOCATIONS = locationsJson as Location[]

export const CATEGORIES = [
  'Food',
  'Adventure',
  'Culture',
  'Nature',
  'Nightlife',
  'Date',
  'Family',
  'Budget',
] as const
