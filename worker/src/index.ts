import { DEALS, LOCATIONS, PLACES, QUESTS } from './data'
import {
  categories,
  discover,
  filterDeals,
  filterPlaces,
  filterQuests,
  locationDetail,
  locations,
  placeDetail,
  questDetail,
} from './catalog'
import { corsHeaders, handlePreflight } from './cors'
import { HttpError, json } from './http'
import { MAX_QUERY_LENGTH, search } from './search'
import type { Env } from './types'
import { validateData } from './validate'

validateData({ quests: QUESTS, places: PLACES, locations: LOCATIONS, deals: DEALS })

type Handler = (params: string[], query: URLSearchParams) => unknown

// Handlers return data, or undefined when the requested resource does not exist.
const ROUTES: Array<[pattern: RegExp, handler: Handler, missing?: string]> = [
  [/^\/api\/discover$/, () => discover],
  [/^\/api\/categories$/, () => categories],
  [/^\/api\/quests$/, (_, q) => filterQuests(q.get('location'), q.get('category'))],
  [/^\/api\/quests\/([^/]+)$/, ([id]) => questDetail(id), 'Quest not found'],
  [/^\/api\/places$/, (_, q) => filterPlaces(q.get('location'), q.get('type'))],
  [/^\/api\/places\/([^/]+)$/, ([id]) => placeDetail(id), 'Place not found'],
  [/^\/api\/locations$/, () => locations],
  [/^\/api\/locations\/([^/]+)$/, ([id]) => locationDetail(id), 'Location not found'],
  [/^\/api\/deals$/, (_, q) => filterDeals(q.get('location'))],
  [
    /^\/api\/search$/,
    (_, q) => {
      const query = q.get('q') ?? ''
      if (query.length > MAX_QUERY_LENGTH)
        throw new HttpError(400, `Search query must be ${MAX_QUERY_LENGTH} characters or fewer`)
      return search(query)
    },
  ],
]

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    throw new HttpError(400, 'Malformed path')
  }
}

function route(request: Request): Response {
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'
  if (pathname === '/api/health')
    return json({ status: 'ok', quests: QUESTS.length, places: PLACES.length }, request, {
      cache: false,
    })
  for (const [pattern, handler, missing = 'Not found'] of ROUTES) {
    const match = pattern.exec(pathname)
    if (!match) continue
    const data = handler(match.slice(1).map(decode), url.searchParams)
    if (data === undefined) throw new HttpError(404, missing)
    return json(data, request)
  }
  throw new HttpError(404, 'Not found')
}

function respond(request: Request): Response {
  if (!['GET', 'HEAD'].includes(request.method))
    return json({ detail: 'Method not allowed' }, request, {
      status: 405,
      headers: { Allow: 'GET, HEAD, OPTIONS' },
    })
  try {
    return route(request)
  } catch (error) {
    if (error instanceof HttpError)
      return json({ detail: error.detail }, request, {
        status: error.status,
        headers: error.headers,
      })
    console.error('Unhandled API error', error)
    return json({ detail: 'Unable to load adventures' }, request, { status: 500 })
  }
}

export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    if (request.method === 'OPTIONS') return handlePreflight(request, env.ALLOWED_ORIGINS)
    const response = respond(request)
    const headers = new Headers(response.headers)
    for (const [name, value] of Object.entries(corsHeaders(request, env.ALLOWED_ORIGINS)))
      headers.set(name, value)
    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: response.status,
      headers,
    })
  },
}
