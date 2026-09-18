import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../dist/index.js'
const request = (path, options, env = {}) =>
  worker.fetch(new Request(`https://example.com/api${path}`, options), env)

test('discovery is consistent with the individual catalog endpoints', async () => {
  const data = await (await request('/discover')).json()
  for (const name of ['quests', 'locations', 'categories'])
    assert.deepEqual(data[name], await (await request(`/${name}`)).json())
  assert.ok(data.quests.length)
})
test('all detail relationships resolve', async () => {
  for (const type of ['quests', 'places', 'locations']) {
    const items = await (await request(`/${type}`)).json()
    for (const item of items) {
      const response = await request(`/${type}/${item.id}`)
      assert.equal(response.status, 200)
      assert.equal((await response.json()).id, item.id)
    }
  }
})
test('filters combine and match categories without case sensitivity', async () => {
  const quests = await (await request('/quests?category=nAtUrE')).json()
  assert.ok(quests.length)
  assert.ok(quests.every((quest) => quest.category.includes('Nature')))
  assert.deepEqual(await (await request('/quests?location=missing&category=Nature')).json(), [])
  const places = await (await request('/places?type=cAfE')).json()
  assert.ok(places.length)
  assert.ok(places.every((place) => place.type === 'Cafe'))
})
test('search includes categories, handles whitespace, and bounds input', async () => {
  assert.deepEqual((await (await request('/search?q=Nature')).json()).categories, ['Nature'])
  assert.deepEqual((await (await request('/search?q=%20%20')).json()).quests, [])
  assert.equal((await request('/search?q=' + 'a'.repeat(201))).status, 400)
})
test('missing resources and methods have the proper status', async () => {
  for (const path of ['/quests/missing', '/places/missing', '/locations/missing', '/unknown'])
    assert.equal((await request(path)).status, 404)
  const post = await request('/quests', { method: 'POST' })
  assert.equal(post.status, 405)
  assert.equal(post.headers.get('allow'), 'GET, HEAD, OPTIONS')
  const head = await request('/quests', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  assert.equal((await request('/quests/')).status, 200)
})
test('CORS uses configured origins and rejects unexpected preflights', async () => {
  const origin = 'https://quest.example'
  const response = await request(
    '/quests',
    { headers: { Origin: origin } },
    { ALLOWED_ORIGINS: origin },
  )
  assert.equal(response.headers.get('access-control-allow-origin'), origin)
  assert.equal(response.headers.get('vary'), 'Origin')
  assert.equal(
    (
      await request(
        '/quests',
        { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' } },
        { ALLOWED_ORIGINS: origin },
      )
    ).status,
    204,
  )
  assert.equal(
    (
      await request('/quests', {
        method: 'OPTIONS',
        headers: { Origin: 'https://unexpected.example' },
      })
    ).status,
    403,
  )
  assert.equal(
    (await request('/quests', { headers: { Origin: 'https://unexpected.example' } })).headers.get(
      'access-control-allow-origin',
    ),
    null,
  )
})
test('successful data is cacheable and errors are not', async () => {
  assert.match((await request('/quests')).headers.get('cache-control'), /max-age=60/)
  assert.equal((await request('/quests/missing')).headers.get('cache-control'), 'no-store')
})
test('conditional requests return 304 for an unchanged catalog', async () => {
  const first = await request('/quests')
  const tag = first.headers.get('etag')
  assert.match(tag, /^W\/".+"$/)
  const again = await request('/quests', { headers: { 'If-None-Match': tag } })
  assert.equal(again.status, 304)
  assert.equal(await again.text(), '')
  assert.equal(again.headers.get('etag'), tag)
  const other = await request('/places', { headers: { 'If-None-Match': tag } })
  assert.equal(other.status, 200)
  assert.equal((await request('/health')).headers.get('cache-control'), 'no-store')
})
test('search matches every term and ranks names above descriptions', async () => {
  const multi = await (await request('/search?q=karen%20museum')).json()
  assert.equal(multi.places[0].id, 'karen-blixen-museum')
  assert.ok(multi.places.every((place) => /karen/i.test(JSON.stringify(place))))
  const forest = await (await request('/search?q=FOREST')).json()
  assert.equal(forest.places[0].id, 'karura-forest')
  assert.deepEqual((await (await request('/search?q=nature%20zzzz')).json()).quests, [])
})
test('quest detail lists places in route order and every item has a photo', async () => {
  for (const quest of await (await request('/quests')).json()) {
    const detail = await (await request(`/quests/${quest.id}`)).json()
    assert.deepEqual(
      detail.nearby.map((place) => place.id),
      quest.nearbyPlaces,
    )
    for (const item of [detail, ...detail.nearby]) assert.match(item.image, /^https:\/\//)
  }
  for (const location of await (await request('/locations')).json())
    assert.match(location.image, /^https:\/\//)
})
test('malformed path segments are rejected cleanly', async () => {
  assert.equal((await request('/quests/%E0%A4%A')).status, 400)
})
