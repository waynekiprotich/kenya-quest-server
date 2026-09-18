export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(detail)
  }
}

const CACHEABLE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'

// FNV-1a: fast and stable. The catalog is small, so hashing each body costs microseconds.
function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function matches(header: string | null, tag: string): boolean {
  if (!header) return false
  if (header.trim() === '*') return true
  return header.split(',').some((value) => value.trim().replace(/^W\//, '') === tag.slice(2))
}

interface JsonOptions {
  status?: number
  cache?: boolean
  headers?: Record<string, string>
}

export function json(data: unknown, request: Request, options: JsonOptions = {}): Response {
  const { status = 200, headers = {} } = options
  const cache = options.cache ?? status < 400
  const body = JSON.stringify(data)
  const base: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': cache ? CACHEABLE : 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...headers,
  }
  if (!cache) return new Response(body, { status, headers: base })
  const tag = `W/"${body.length.toString(36)}-${fnv1a(body)}"`
  base.etag = tag
  if (matches(request.headers.get('If-None-Match'), tag)) {
    const { 'content-type': _, ...rest } = base
    return new Response(null, { status: 304, headers: rest })
  }
  return new Response(body, { status, headers: base })
}
