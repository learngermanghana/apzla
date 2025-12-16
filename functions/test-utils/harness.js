const path = require('node:path')

const firestoreAdminPath = path.join(__dirname, '..', 'lib', 'firestoreAdmin.js')
const actualFirestoreAdmin = require(firestoreAdminPath)

function mockFirestoreAdmin(mockExports) {
  delete require.cache[firestoreAdminPath]
  require.cache[firestoreAdminPath] = {
    id: firestoreAdminPath,
    filename: firestoreAdminPath,
    loaded: true,
    exports: mockExports,
  }
}

function restoreFirestoreAdmin() {
  delete require.cache[firestoreAdminPath]
  require.cache[firestoreAdminPath] = {
    id: firestoreAdminPath,
    filename: firestoreAdminPath,
    loaded: true,
    exports: actualFirestoreAdmin,
  }
}

function createMockRequest({ method = 'POST', body = {}, headers = {}, query = {}, socket } = {}) {
  return {
    method,
    body,
    headers,
    query,
    socket: socket || { remoteAddress: '127.0.0.1' },
  }
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }

  return res
}

function loadHandler(relativePath) {
  const handlerPath = path.join(__dirname, '..', 'api', relativePath)
  delete require.cache[handlerPath]
  return require(handlerPath)
}

const functionsTestFactory = (() => {
  try {
    // Use the library if available; otherwise, provide a minimal stub so tests can proceed.
    // eslint-disable-next-line global-require
    const functionsTest = require('firebase-functions-test')
    return functionsTest()
  } catch (error) {
    return {
      cleanup: async () => {},
    }
  }
})()

module.exports = {
  mockFirestoreAdmin,
  restoreFirestoreAdmin,
  createMockRequest,
  createMockResponse,
  loadHandler,
  functionsTestFactory,
}
