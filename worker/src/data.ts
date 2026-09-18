import questsJson from '../../data/quests.json'
import placesJson from '../../data/places.json'
import dealsJson from '../../data/deals.json'
import locationsJson from '../../data/locations.json'
import type { Deal, Location, Place, Quest } from './types'

export const QUESTS = questsJson satisfies Quest[]
export const PLACES = placesJson satisfies Place[]
export const DEALS = dealsJson satisfies Deal[]
export const LOCATIONS = locationsJson satisfies Location[]

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
