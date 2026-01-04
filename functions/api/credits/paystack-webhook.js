const { admin, db, initError } = require('../../lib/firestoreAdmin')
const { normalizeChannel } = require('../../lib/messagingBundles')
const { verifyTransaction, verifySignature, getRawBody } = require('../../lib/paystack')

const readRawBody = (request) =>
  new Promise((resolve, reject) => {
    const existingBody = getRawBody(request)
    if (existingBody) {
      resolve(existingBody)
      return
    }

    let data = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      data += chunk
    })
    request.on('end', () => resolve(data))
    request.on('error', reject)
  })

const getChannelCreditsField = (channel) => {
  if (channel === 'sms') return 'smsCredits'
  if (channel === 'whatsapp') return 'whatsappCredits'
  return null
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

  const signature = request.headers['x-paystack-signature']
  const rawBody = await readRawBody(request)

  if (!verifySignature({ signature, rawBody })) {
    return response.status(400).json({
      status: 'error',
      message: 'Invalid Paystack signature.',
    })
  }

  let payload = request.body
  if (!payload) {
    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      return response.status(400).json({
        status: 'error',
        message: 'Invalid Paystack payload.',
      })
    }
  }

  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch (error) {
      return response.status(400).json({
        status: 'error',
        message: 'Invalid Paystack payload.',
      })
    }
  }

  const reference = payload?.data?.reference
  let metadata = payload?.data?.metadata || {}
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata)
    } catch (error) {
      metadata = {}
    }
  }

  const churchId = metadata?.churchId
  const paystackEventId = payload?.id || payload?.data?.id || null

  if (!reference || !churchId) {
    return response.status(400).json({
      status: 'error',
      message: 'Missing Paystack reference metadata.',
    })
  }

  try {
    const verification = await verifyTransaction(reference)
    if (verification?.status !== 'success') {
      const churchRef = db.collection('churches').doc(churchId)
      const topupRef = churchRef.collection('topups').doc(reference)

      await db.runTransaction(async (transaction) => {
        const topupSnap = await transaction.get(topupRef)
        if (!topupSnap.exists) {
          return
        }

        const topup = topupSnap.data()
        if (topup.status === 'PAID' || topup.status === 'FAILED') {
          return
        }

        transaction.update(topupRef, {
          status: 'FAILED',
          paystackEventId,
        })
      })

      return response.status(200).json({
        status: 'success',
        message: 'Payment not successful. No credits applied.',
      })
    }

    const verificationMetadata = verification?.metadata || {}
    const normalizedMetadataChannel = normalizeChannel(metadata?.channel)
    const normalizedVerificationChannel = normalizeChannel(verificationMetadata?.channel)

    const churchRef = db.collection('churches').doc(churchId)
    const topupRef = churchRef.collection('topups').doc(reference)
    const ledgerRef = churchRef.collection('creditLedger').doc()

    await db.runTransaction(async (transaction) => {
      const [churchSnap, topupSnap] = await Promise.all([
        transaction.get(churchRef),
        transaction.get(topupRef),
      ])

      if (!churchSnap.exists) {
        throw new Error('Church not found.')
      }

      if (!topupSnap.exists) {
        throw new Error('Top-up record not found.')
      }

      const topup = topupSnap.data()
      if (topup.status === 'PAID') {
        return
      }

      const resolvedChannel =
        normalizedMetadataChannel ||
        normalizedVerificationChannel ||
        normalizeChannel(topup?.channel)
      const creditsField = getChannelCreditsField(resolvedChannel)

      if (!creditsField) {
        throw new Error('Unknown channel for credits.')
      }

      const credits =
        Number(topup.units) || Number(metadata?.credits) || Number(verificationMetadata?.credits) || 0
      const currentCredits = Number(churchSnap.data()?.[creditsField] ?? 0)

      transaction.update(churchRef, {
        [creditsField]: currentCredits + credits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      transaction.update(topupRef, {
        status: 'PAID',
        paystackEventId,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      transaction.set(ledgerRef, {
        type: 'TOPUP',
        channel,
        units: credits,
        money: {
          amount: Number(topup.amountGhs) || null,
          currency: 'GHS',
        },
        paystackRef: reference,
        batchId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'system',
      })
    })

    return response.status(200).json({
      status: 'success',
      message: 'Credits confirmed.',
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unable to process webhook.',
    })
  }
}

module.exports = handler
module.exports.config = {
  api: {
    bodyParser: false,
  },
}
