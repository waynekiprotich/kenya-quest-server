// Mirrors the FastAPI CORSMiddleware config in server/main.py: GET only, any header,
// origin allow-list. Extend ALLOWED_ORIGINS (env) if more frontend origins are added.
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://ff7c3cd9-kenya-quest-client.waynekip123.workers.dev',
]

export function corsHeaders(request: Request, extraOrigins: string[] = []): HeadersInit {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = [...DEFAULT_ALLOWED_ORIGINS, ...extraOrigins]
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  }
  if (allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export function handlePreflight(request: Request, extraOrigins: string[] = []): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request, extraOrigins) })
}
