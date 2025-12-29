const admin = require('firebase-admin')

let initError = null

try {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase admin environment variables')
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      ...(storageBucket ? { storageBucket } : {}),
    })
  }
} catch (error) {
  initError = error
}

const db = !initError ? admin.firestore() : null

module.exports = { admin, db, initError }
