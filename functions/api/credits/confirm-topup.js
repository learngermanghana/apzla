const { admin, db, initError } = require('../../lib/firestoreAdmin')
const verifyUser = require('../../lib/verifyUser')
const ensureChurchAccess = require('../../lib/ensureChurchAccess')
const { verifyTransaction } = require('../../lib/paystack')

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

  const payload = request.body?.data || request.body || {}
  const churchId = payload?.churchId
  const reference = payload?.reference

  if (!churchId) {
    return response.status(400).json({
      status: 'error',
      message: 'churchId is required.',
    })
  }

  if (!reference) {
    return response.status(400).json({
      status: 'error',
      message: 'reference is required.',
    })
  }

  const authResult = await verifyUser(request)
  if (authResult.error) {
    return response.status(authResult.error.code).json({
      status: 'error',
      message: authResult.error.message,
    })
  }

  try {
    const { churchRef } = await ensureChurchAccess({
      uid: authResult.uid,
      churchId,
    })

    const verification = await verifyTransaction(reference)

    if (verification?.status !== 'success') {
      return response.status(200).json({
        status: 'pending',
        data: {
          reference,
          paystackStatus: verification?.status || null,
        },
        message: 'Payment not confirmed yet.',
      })
    }

    const metadata = verification?.metadata || {}
    if (metadata?.churchId && metadata.churchId !== churchId) {
      return response.status(400).json({
        status: 'error',
        message: 'Payment metadata does not match this church.',
      })
    }

    const paystackEventId = verification?.id || null
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

      const channel = metadata?.channel || topup?.channel
      const creditsField = getChannelCreditsField(channel)

      if (!creditsField) {
        throw new Error('Unknown channel for credits.')
      }

      const credits = Number(topup.units) || Number(metadata?.credits) || 0
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
        createdBy: authResult.uid,
      })
    })

    return response.status(200).json({
      status: 'success',
      message: 'Credits confirmed.',
    })
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Unable to confirm credits.',
    })
  }
}

module.exports = handler
