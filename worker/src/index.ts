import { CATEGORIES, DEALS, LOCATIONS, PLACES, QUESTS } from './data'
import { byId, expandDeal, expandPlace, expandQuest, locationName } from './expand'
import { corsHeaders, handlePreflight } from './cors'
import type { Env } from './types'

function json(data: unknown, request: Request, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders(request),
      ...init.headers,
    },
  })
}

function notFound(request: Request, detail: string): Response {
  return json({ detail }, request, { status: 404 })
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handlePreflight(request)
    }

    if (request.method !== 'GET') {
      return json({ detail: 'Method not allowed' }, request, { status: 405 })
    }

    const url = new URL(request.url)
    const { pathname, searchParams } = url
    const segments = pathname.split('/').filter(Boolean) // e.g. ['api', 'quests', 'kicc-city-quest']

    // GET /api/health
    if (pathname === '/api/health') {
      return json({ status: 'ok' }, request)
    }

    // GET /api/categories
    if (pathname === '/api/categories') {
      const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<string, number>
      for (const quest of QUESTS) {
        for (const category of quest.category) {
          if (category in counts) counts[category] += 1
        }
      }
      return json(
        CATEGORIES.map((name) => ({ name, questCount: counts[name] })),
        request,
      )
    }

    // GET /api/quests, GET /api/quests/:id
    if (segments[0] === 'api' && segments[1] === 'quests') {
      if (segments.length === 2) {
        const location = searchParams.get('location')
        const category = searchParams.get('category')
        let results = QUESTS
        if (location) results = results.filter((q) => q.location === location)
        if (category) {
          const wanted = category.toLowerCase()
          results = results.filter((q) => q.category.some((c) => c.toLowerCase() === wanted))
        }
        return json(results.map(expandQuest), request)
      }
      if (segments.length === 3) {
        const quest = byId(QUESTS, segments[2])
        if (!quest) return notFound(request, 'Quest not found')
        const nearby = PLACES.filter((p) => quest.nearbyPlaces.includes(p.id)).map(expandPlace)
        const deals = DEALS.filter((d) => quest.nearbyPlaces.includes(d.placeId)).map(expandDeal)
        return json({ ...expandQuest(quest), nearby, deals }, request)
      }
    }

    // GET /api/places, GET /api/places/:id
    if (segments[0] === 'api' && segments[1] === 'places') {
      if (segments.length === 2) {
        const location = searchParams.get('location')
        const placeType = searchParams.get('type')
        let results = PLACES
        if (location) results = results.filter((p) => p.location === location)
        if (placeType) {
          const wanted = placeType.toLowerCase()
          results = results.filter((p) => p.type.toLowerCase() === wanted)
        }
        return json(results.map(expandPlace), request)
      }
      if (segments.length === 3) {
        const place = byId(PLACES, segments[2])
        if (!place) return notFound(request, 'Place not found')
        const quests = QUESTS.filter((q) => q.nearbyPlaces.includes(place.id)).map(expandQuest)
        const deals = DEALS.filter((d) => d.placeId === place.id).map(expandDeal)
        return json({ ...expandPlace(place), quests, deals }, request)
      }
    }

    // GET /api/locations, GET /api/locations/:id
    if (segments[0] === 'api' && segments[1] === 'locations') {
      if (segments.length === 2) {
        return json(
          LOCATIONS.map((location) => ({
            ...location,
            questCount: QUESTS.filter((q) => q.location === location.id).length,
            placeCount: PLACES.filter((p) => p.location === location.id).length,
          })),
          request,
        )
      }
      if (segments.length === 3) {
        const location = byId(LOCATIONS, segments[2])
        if (!location) return notFound(request, 'Location not found')
        const places = PLACES.filter((p) => p.location === location.id)
        const placeIds = new Set(places.map((p) => p.id))
        return json(
          {
            ...location,
            quests: QUESTS.filter((q) => q.location === location.id).map(expandQuest),
            places: places.map(expandPlace),
            deals: DEALS.filter((d) => placeIds.has(d.placeId)).map(expandDeal),
          },
          request,
        )
      }
    }

    // GET /api/deals
    if (pathname === '/api/deals') {
      const location = searchParams.get('location')
      let results = DEALS.map(expandDeal)
      if (location) results = results.filter((d) => d.location === location)
      return json(results, request)
    }

    // GET /api/search
    if (pathname === '/api/search') {
      const q = searchParams.get('q') ?? ''
      const term = q.trim().toLowerCase()
      if (!term) {
        return json({ query: q, quests: [], places: [], locations: [], categories: [] }, request)
      }

      const hit = (...fields: Array<string | null | undefined>) =>
        fields.some((f) => f && f.toLowerCase().includes(term))

      const quests = QUESTS.filter((quest) =>
        hit(
          quest.title,
          quest.description,
          quest.difficulty,
          locationName(quest.location),
          quest.category.join(' '),
          quest.tasks.map((t) => t.label).join(' '),
        ),
      ).map(expandQuest)

      const places = PLACES.filter((place) =>
        hit(place.name, place.description, place.type, place.price, locationName(place.location)),
      ).map(expandPlace)

      const locations = LOCATIONS.filter((location) =>
        hit(location.name, location.tagline, location.description),
      )

      const categories = CATEGORIES.filter((c) => c.toLowerCase().includes(term))

      return json({ query: q, quests, places, locations, categories }, request)
    }

    return notFound(request, 'Not found')
  },
}
