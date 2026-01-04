const { db } = require('./firestoreAdmin')

const normalizeChannel = (channel) => {
  if (!channel) return null
  const normalized = String(channel).trim().toLowerCase()
  if (normalized === 'sms') return 'sms'
  if (normalized === 'whatsapp') return 'whatsapp'
  return null
}

const getBundlesSnapshot = async () => {
  const bundlesSnap = await db.collection('settings').doc('messagingBundles').get()
  if (!bundlesSnap.exists) {
    const error = new Error('Messaging bundles are not configured.')
    error.statusCode = 500
    throw error
  }

  return bundlesSnap.data() || {}
}

const toBundleList = (value) => {
  if (Array.isArray(value)) {
    return value
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).map(([id, bundle]) => ({
      ...(bundle || {}),
      id: bundle?.id || id,
    }))
  }

  return []
}

const getBundle = async ({ channel, bundleId }) => {
  const normalizedChannel = normalizeChannel(channel)
  if (!normalizedChannel) {
    const error = new Error('Invalid channel provided.')
    error.statusCode = 400
    throw error
  }

  if (!bundleId) {
    const error = new Error('bundleId is required.')
    error.statusCode = 400
    throw error
  }

  const bundles = await getBundlesSnapshot()
  const bundleList = toBundleList(bundles[normalizedChannel])
  const bundle = bundleList.find((entry) => entry.id === bundleId)

  if (!bundle) {
    const error = new Error('Bundle not found.')
    error.statusCode = 404
    throw error
  }

  return { ...bundle, channel: normalizedChannel }
}

const listBundles = async ({ channel }) => {
  const normalizedChannel = normalizeChannel(channel)
  if (!normalizedChannel) {
    const error = new Error('Invalid channel provided.')
    error.statusCode = 400
    throw error
  }

  const bundles = await getBundlesSnapshot()
  const bundleList = toBundleList(bundles[normalizedChannel])

  return bundleList.map((bundle) => ({ ...bundle, channel: normalizedChannel }))
}

module.exports = { getBundle, listBundles, normalizeChannel }
