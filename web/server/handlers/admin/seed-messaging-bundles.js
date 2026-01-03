// web/api/admin/seed-messaging-bundles.js
const crypto = require('crypto')
const { db, initError } = require('../../lib/firestoreAdmin')

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

// Allow either:
//  - x-seed-secret header
//  - Authorization: Bearer <seed-secret>
const getProvidedSecret = (request) => {
  const headerSecret = request.headers?.['x-seed-secret']
  if (headerSecret) return String(headerSecret).trim()

  const authHeader = String(request.headers?.authorization || '')
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim()
  }

  return null
}

// Timing-safe secret compare
const secretsMatch = (a, b) => {
  if (!a || !b) return false
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

// Consider bundles "configured" only if BOTH channels are present and non-empty
const hasBundlesConfigured = (bundles) => {
  if (!bundles) return false
  const channels = ['sms', 'whatsapp']
  return channels.every(
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
  if (!providedSecret || !secretsMatch(providedSecret, seedSecret)) {
    return response.status(401).json({
      status: 'error',
      message: 'Unauthorized.',
    })
  }

  const force = String(request.query?.force || '') === '1'
  const bundlesRef = db.collection('settings').doc('messagingBundles')

  try {
    const snap = await bundlesRef.get()
    const existing = snap.exists ? snap.data() || {} : null
    const configured = hasBundlesConfigured(existing)

    // Seed if:
    // - doc missing
    // - doc exists but lacks valid bundles
    // - force=1
    if (!snap.exists || !configured || force) {
      const payload = {
        ...DEFAULT_BUNDLES,
        updatedAt: new Date().toISOString(),
        seededBy: 'admin-seed-endpoint',
      }

      // If force, overwrite; otherwise merge to avoid wiping unrelated fields
      if (force) {
        await bundlesRef.set(payload)
      } else {
        await bundlesRef.set(payload, { merge: true })
      }

      return response.status(200).json({
        status: 'success',
        data: {
          created: true,
          forced: force,
          bundles: DEFAULT_BUNDLES,
        },
      })
    }

    return response.status(200).json({
      status: 'success',
      data: {
        created: false,
        forced: false,
        bundles: existing,
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
