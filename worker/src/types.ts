export interface QuestTask {
  id: string
  label: string
}

export interface Quest {
  id: string
  title: string
  location: string
  category: string[]
  description: string
  duration: string
  budget: string
  difficulty: string
  lat: number
  lng: number
  image: string
  mapUrl: string
  tasks: QuestTask[]
  nearbyPlaces: string[]
}

export interface Place {
  id: string
  name: string
  type: string
  description: string
  location: string
  price: string
  openingInfo: string | null
  website: string | null
  mapsUrl: string
  lat: number
  lng: number
  image: string
  relatedQuests: string[]
}

export interface Deal {
  id: string
  title: string
  placeId: string
  description: string
  priceRange: string
}

export interface Location {
  id: string
  name: string
  tagline: string
  description: string
  lat: number
  lng: number
  image: string
}

export interface Env {
  ALLOWED_ORIGINS?: string
}
