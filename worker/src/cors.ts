const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

export function corsHeaders(request: Request, configuredOrigins = ''): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...configuredOrigins
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ]
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

export function handlePreflight(request: Request, configuredOrigins = ''): Response {
  const headers = corsHeaders(request, configuredOrigins)
  if (!headers['Access-Control-Allow-Origin']) return new Response(null, { status: 403, headers })
  const method = request.headers.get('Access-Control-Request-Method')
  if (method && !['GET', 'HEAD'].includes(method))
    return new Response(null, { status: 405, headers })
  return new Response(null, {
    status: 204,
    headers: {
      ...headers,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
