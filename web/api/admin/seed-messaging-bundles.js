const { db, initError } = require('../lib/firestoreAdmin')

const DEFAULT_BUNDLES = {
  sms: [
    { id: 'sms-100', name: 'SMS 100', credits: 100, priceGhs: 20 },
    { id: 'sms-250', name: 'SMS 250', credits: 250, priceGhs: 45 },
    { id: 'sms-500', name: 'SMS 500', credits: 500, priceGhs: 85 },
  ],
  whatsapp: [
    { id: 'whatsapp-100', name: 'WhatsApp 100', credits: 100, priceGhs: 30 },
    { id: 'whatsapp-250', name: 'WhatsApp 250', credits: 250, priceGhs: 70 },
    { id: 'whatsapp-500', name: 'WhatsApp 500', credits: 500, priceGhs: 130 },
  ],
}

const getProvidedSecret = (request) => {
  const headerSecret = request.headers['x-seed-secret']
  if (headerSecret) return headerSecret
  const authHeader = request.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim()
  }
  return null
}

const hasBundlesConfigured = (bundles) => {
  if (!bundles) return false
  const channels = ['sms', 'whatsapp']
  return channels.some(
    (channel) => Array.isArray(bundles[channel]) && bundles[channel].length > 0,
  )
}

async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use POST.',
    })
  }

  if (initError) {
    return response.status(500).json({
      status: 'error',
      message: initError.message || 'Unable to initialize Firebase.',
    })
  }

  const seedSecret = process.env.SEED_SECRET
  if (!seedSecret) {
    return response.status(500).json({
      status: 'error',
      message: 'SEED_SECRET is not configured.',
    })
  }

  const providedSecret = getProvidedSecret(request)
  if (!providedSecret || providedSecret !== seedSecret) {
    return response.status(401).json({
      status: 'error',
      message: 'Unauthorized.',
    })
  }

  const force = request.query?.force === '1'
  const bundlesRef = db.collection('settings').doc('messagingBundles')

  try {
    const bundlesSnap = await bundlesRef.get()
    const existingBundles = bundlesSnap.exists ? bundlesSnap.data() || {} : null
    const hasConfiguredBundles = hasBundlesConfigured(existingBundles)

    if (!bundlesSnap.exists || !hasConfiguredBundles || force) {
      await bundlesRef.set(DEFAULT_BUNDLES)
      return response.status(200).json({
        status: 'success',
        data: {
          created: true,
          bundles: DEFAULT_BUNDLES,
        },
      })
    }

    return response.status(200).json({
      status: 'success',
      data: {
        created: false,
        bundles: existingBundles,
      },
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unable to seed messaging bundles.',
    })
  }
}

module.exports = handler
