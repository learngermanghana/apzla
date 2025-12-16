const { test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')

const {
  createMockRequest,
  createMockResponse,
  loadHandler,
  mockFirestoreAdmin,
  restoreFirestoreAdmin,
  functionsTestFactory,
} = require('../test-utils/harness')

const mockAdmin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => 'server-timestamp',
      increment: () => 'increment',
    },
    Timestamp: {
      fromMillis: (ms) => ({ toMillis: () => ms }),
    },
  },
}

function createDbMock({ shouldFail } = {}) {
  const setCalls = []
  const addCalls = []
  const doc = () => ({
    set: async (payload) => {
      if (shouldFail) {
        throw new Error('write failed')
      }
      setCalls.push(payload)
    },
  })

  return {
    collection: (name) => {
      if (name === 'checkinNonces') {
        return { doc }
      }

      if (name === 'notifications') {
        return {
          add: async (payload) => {
            addCalls.push(payload)
          },
        }
      }

      throw new Error(`Unexpected collection ${name}`)
    },
    setCalls,
    addCalls,
  }
}

let dbMock

beforeEach(() => {
  process.env.CHECKIN_JWT_SECRET = 'secret'
  process.env.APP_BASE_URL = 'https://app.example.com'
  process.env.FIRESTORE_CHECKIN_COLLECTION = 'checkinNonces'
  process.env.FIRESTORE_NOTIFICATION_COLLECTION = 'notifications'
  dbMock = createDbMock()
  mockFirestoreAdmin({ admin: mockAdmin, db: dbMock, initError: null })
})

afterEach(async () => {
  restoreFirestoreAdmin()
  delete process.env.CHECKIN_JWT_SECRET
  delete process.env.APP_BASE_URL
  delete process.env.FIRESTORE_CHECKIN_COLLECTION
  delete process.env.FIRESTORE_NOTIFICATION_COLLECTION
  await functionsTestFactory.cleanup()
})

test('rejects invalid payloads', async () => {
  const handler = loadHandler('checkin-token.js')
  const res = createMockResponse()

  await handler(
    createMockRequest({
      body: { serviceDate: '2025-01-01' },
    }),
    res,
  )

  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /churchId is required/)
})

test('returns error when secret is missing', async () => {
  delete process.env.CHECKIN_JWT_SECRET
  const handler = loadHandler('checkin-token.js')
  const res = createMockResponse()

  await handler(
    createMockRequest({
      body: { churchId: 'c1', serviceDate: '2025-01-01' },
    }),
    res,
  )

  assert.equal(res.statusCode, 500)
  assert.match(res.body.message, /CHECKIN_JWT_SECRET/)
})

test('returns 500 when firestore write fails', async () => {
  dbMock = createDbMock({ shouldFail: true })
  mockFirestoreAdmin({ admin: mockAdmin, db: dbMock, initError: null })
  const handler = loadHandler('checkin-token.js')
  const res = createMockResponse()

  await handler(
    createMockRequest({
      body: { churchId: 'c1', serviceDate: '2025-01-01' },
    }),
    res,
  )

  assert.equal(res.statusCode, 500)
  assert.match(res.body.message, /write failed/)
})

test('issues token and writes notification when valid', async () => {
  const handler = loadHandler('checkin-token.js')
  const res = createMockResponse()

  await handler(
    createMockRequest({
      body: {
        churchId: 'c1',
        serviceDate: '2025-01-01',
        serviceType: 'Service',
        email: 'user@example.com',
      },
    }),
    res,
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'success')
  assert.ok(res.body.token)
  assert.equal(dbMock.setCalls.length, 1)
  assert.equal(dbMock.addCalls.length, 1)
})
