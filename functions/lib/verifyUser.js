const { admin } = require('./firestoreAdmin')

async function verifyUser(request) {
  const authHeader = request.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return { error: { code: 401, message: 'Authorization token missing.' } }
  }

  const token = authHeader.replace('Bearer ', '').trim()
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    return { uid: decoded.uid }
  } catch (error) {
    return { error: { code: 401, message: 'Invalid or expired authorization token.' } }
  }
}

module.exports = verifyUser
