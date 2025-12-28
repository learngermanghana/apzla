const { db } = require('./firestoreAdmin')

async function ensureChurchAccess({ uid, churchId }) {
  if (!churchId) {
    const error = new Error('churchId is required.')
    error.statusCode = 400
    throw error
  }

  const userDoc = await db.collection('users').doc(uid).get()
  const userData = userDoc.exists ? userDoc.data() : null

  if (userData?.churchId && userData.churchId !== churchId) {
    const error = new Error('You are not allowed to manage this church.')
    error.statusCode = 403
    throw error
  }

  const churchRef = db.collection('churches').doc(churchId)
  const churchSnap = await churchRef.get()

  if (!churchSnap.exists) {
    const error = new Error('Church not found.')
    error.statusCode = 404
    throw error
  }

  const churchData = churchSnap.data()

  if (churchData?.ownerUserId && churchData.ownerUserId !== uid) {
    const error = new Error('You are not allowed to manage this church.')
    error.statusCode = 403
    throw error
  }

  return { churchRef, churchData, userData }
}

module.exports = ensureChurchAccess
