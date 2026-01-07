const { db } = require('./firestoreAdmin')

const DEFAULT_BUNDLES = {
  sms: [
    { id: 'sms-10000', name: '10,000 credits (833 SMS)', credits: 10000, priceGhs: 50 },
    { id: 'sms-50000', name: '50,000 credits (4,166 SMS)', credits: 50000, priceGhs: 250 },
    { id: 'sms-100000', name: '100,000 credits (8,333 SMS)', credits: 100000, priceGhs: 430 },
  ],
  whatsapp: [
    { id: 'whatsapp-100', name: 'WhatsApp 100', credits: 100, priceGhs: 30 },
    { id: 'whatsapp-250', name: 'WhatsApp 250', credits: 250, priceGhs: 70 },
    { id: 'whatsapp-500', name: 'WhatsApp 500', credits: 500, priceGhs: 130 },
  ],
}

const normalizeBundleList = (bundleList, defaultList) =>
  Array.isArray(bundleList) && bundleList.length > 0 ? bundleList : defaultList

const hasBundleList = (bundleList) => Array.isArray(bundleList) && bundleList.length > 0

const normalizeChannel = (channel) => {
  if (!channel) return null
  const normalized = String(channel).trim().toLowerCase()
  if (normalized === 'sms') return 'sms'
  if (normalized === 'whatsapp') return 'whatsapp'
  return null
}

const getBundlesSnapshot = async () => {
  const bundlesRef = db.collection('settings').doc('messagingBundles')
  const bundlesSnap = await bundlesRef.get()
  const bundles = bundlesSnap.exists ? bundlesSnap.data() || {} : {}

  const normalizedBundles = {
    sms: normalizeBundleList(bundles.sms, DEFAULT_BUNDLES.sms),
    whatsapp: normalizeBundleList(bundles.whatsapp, DEFAULT_BUNDLES.whatsapp),
  }

  const needsSeed =
    !bundlesSnap.exists || !hasBundleList(bundles.sms) || !hasBundleList(bundles.whatsapp)

  if (needsSeed) {
    await bundlesRef.set(
      {
        ...bundles,
        ...normalizedBundles,
        updatedAt: new Date().toISOString(),
        seededBy: 'auto-bundles-fallback',
      },
      { merge: true },
    )
  }

  return {
    ...bundles,
    ...normalizedBundles,
  }
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
  const bundleList = Array.isArray(bundles[normalizedChannel]) ? bundles[normalizedChannel] : []
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
  const bundleList = Array.isArray(bundles[normalizedChannel]) ? bundles[normalizedChannel] : []

  return bundleList.map((bundle) => ({ ...bundle, channel: normalizedChannel }))
}

module.exports = { getBundle, listBundles, normalizeChannel }
