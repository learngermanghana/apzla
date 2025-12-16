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
const { signJwt } = require('../lib/jwtHelpers')

const mockAdmin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => 'server-timestamp',
      increment: () => 'increment',
    },
  },
}

function createMemberQuery(memberDoc) {
  return {
    where() {
      return this
    },
    limit() {
      return this
    },
    async get() {
      if (!memberDoc) {
        return { empty: true, docs: [] }
      }

      return { empty: false, docs: [memberDoc] }
    },
  }
}

function createDbMock({ nonceRecord, memberDoc, churchDoc, shouldFail } = {}) {
  const verifyUpdates = []

  return {
    collection: (name) => {
      if (shouldFail) {
        throw new Error('firestore unavailable')
      }

      if (name === 'checkinNonces') {
        return {
          doc: (id) => ({
            async get() {
              if (!nonceRecord) {
                return { exists: false }
              }

              return { exists: true, id, data: () => nonceRecord }
            },
            async set(payload) {
              verifyUpdates.push(payload)
            },
          }),
        }
      }

      if (name === 'members') {
        return createMemberQuery(memberDoc)
      }

      if (name === 'churches') {
        return {
          doc: () => ({
            async get() {
              if (!churchDoc) return { exists: false }
              return { exists: true, data: () => churchDoc }
            },
          }),
        }
      }

      throw new Error(`Unexpected collection ${name}`)
    },
    verifyUpdates,
  }
}

let dbMock

beforeEach(() => {
  process.env.CHECKIN_JWT_SECRET = 'secret'
})

afterEach(async () => {
  restoreFirestoreAdmin()
  delete process.env.CHECKIN_JWT_SECRET
  await functionsTestFactory.cleanup()
})

test('rejects missing payload fields', async () => {
  dbMock = createDbMock()
  mockFirestoreAdmin({ admin: mockAdmin, db: dbMock, initError: null })

  const handler = loadHandler('verify-checkin.js')
  const res = createMockResponse()

  await handler(createMockRequest({ body: {} }), res)

  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /token, phone|token, phone, serviceCode/)
})

test('returns 401 for invalid token', async () => {
  dbMock = createDbMock()
  mockFirestoreAdmin({ admin: mockAdmin, db: dbMock, initError: null })

  const handler = loadHandler('verify-checkin.js')
  const res = createMockResponse()

  await handler(
    createMockRequest({
      body: { token: 'bad.token.value', phone: '123', serviceCode: '999999' },
    }),
    res,
  )

  assert.equal(res.statusCode, 401)
  assert.equal(res.body.status, 'error')
})

test('returns 500 when firestore errors', async () => {
  const token = signJwt(
    {
      churchId: 'c1',
      serviceDate: '2025-01-01',
      serviceType: 'Service',
      nonce: 'nonce-1',
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.CHECKIN_JWT_SECRET,
  )

  dbMock = createDbMock({ shouldFail: true })
  mockFirestoreAdmin({ admin: mockAdmin, db: dbMock, initError: null })

  const handler = loadHandler('verify-checkin.js')
  const res = createMockResponse()

  await handler(
    createMockRequest({
      body: { token, phone: '123', serviceCode: '999999' },
    }),
    res,
  )

  assert.equal(res.statusCode, 500)
  assert.match(res.body.message, /firestore unavailable/)
})

test('verifies token and returns member data', async () => {
  const nonceRecord = {
    churchId: 'c1',
    serviceDate: '2025-01-01',
    serviceType: 'Service',
    serviceCode: '123456',
    expiresAt: { toMillis: () => Date.now() + 10000 },
  }

  const memberDoc = {
    id: 'member-1',
    data: () => ({ firstName: 'Test', lastName: 'User' }),
  }

  const churchDoc = { name: 'Test Church' }

  dbMock = createDbMock({ nonceRecord, memberDoc, churchDoc })
  mockFirestoreAdmin({ admin: mockAdmin, db: dbMock, initError: null })

  const token = signJwt(
    {
      churchId: 'c1',
      serviceDate: '2025-01-01',
      serviceType: 'Service',
      nonce: 'nonce-1',
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.CHECKIN_JWT_SECRET,
  )

  const handler = loadHandler('verify-checkin.js')
  const res = createMockResponse()

  await handler(
    createMockRequest({
      body: { token, phone: '123-456', serviceCode: '123456' },
    }),
    res,
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'success')
  assert.equal(res.body.data.memberId, 'member-1')
  assert.equal(dbMock.verifyUpdates.length, 1)
})
