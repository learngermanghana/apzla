const { test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')

const {
  createMockRequest,
  createMockResponse,
  loadHandler,
  functionsTestFactory,
} = require('../test-utils/harness')

let originalFetch

beforeEach(() => {
  originalFetch = global.fetch
})

afterEach(async () => {
  global.fetch = originalFetch
  delete process.env.FIRESTORE_PROJECT_ID
  delete process.env.FIRESTORE_BEARER_TOKEN
  await functionsTestFactory.cleanup()
})

test('returns ok when firestore responds successfully', async () => {
  process.env.FIRESTORE_PROJECT_ID = 'demo'
  process.env.FIRESTORE_BEARER_TOKEN = 'token'

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      name: 'projects/demo/databases/(default)/documents/health/health',
      updateTime: 'now',
      createTime: 'before',
    }),
  })

  const handler = loadHandler('health.js')
  const res = createMockResponse()

  await handler(createMockRequest({ method: 'GET' }), res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'ok')
  assert.equal(res.body.firestore.status, 'ok')
})

test('returns error when firestore responds with failure', async () => {
  process.env.FIRESTORE_PROJECT_ID = 'demo'
  process.env.FIRESTORE_BEARER_TOKEN = 'token'

  global.fetch = async () => ({
    ok: false,
    status: 500,
    statusText: 'bad',
    text: async () => 'failure',
  })

  const handler = loadHandler('health.js')
  const res = createMockResponse()

  await handler(createMockRequest({ method: 'GET' }), res)

  assert.equal(res.statusCode, 500)
  assert.equal(res.body.status, 'error')
  assert.equal(res.body.firestore.status, 'error')
})
