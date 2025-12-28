const { admin, db, initError } = require('../lib/firestoreAdmin')
const { verifyTransaction, verifySignature, getRawBody } = require('../lib/paystack')

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
  const rawBody = getRawBody(request)

  if (!verifySignature({ signature, rawBody })) {
    return response.status(400).json({
      status: 'error',
      message: 'Invalid Paystack signature.',
    })
  }

  let payload = request.body
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
  const metadata = payload?.data?.metadata || {}
  const churchId = metadata?.churchId
  const channel = metadata?.channel

  if (!reference || !churchId || !channel) {
    return response.status(400).json({
      status: 'error',
      message: 'Missing Paystack reference metadata.',
    })
  }

  try {
    const verification = await verifyTransaction(reference)
    if (verification?.status !== 'success') {
      return response.status(200).json({
        status: 'success',
        message: 'Payment not successful. No credits applied.',
      })
    }

    const creditsField = getChannelCreditsField(channel)
    if (!creditsField) {
      return response.status(400).json({
        status: 'error',
        message: 'Unknown channel for credits.',
      })
    }

    const churchRef = db.collection('churches').doc(churchId)
    const ledgerRef = churchRef.collection('creditTransactions').doc(reference)

    await db.runTransaction(async (transaction) => {
      const [churchSnap, ledgerSnap] = await Promise.all([
        transaction.get(churchRef),
        transaction.get(ledgerRef),
      ])

      if (!churchSnap.exists) {
        throw new Error('Church not found.')
      }

      if (!ledgerSnap.exists) {
        throw new Error('Ledger transaction not found.')
      }

      const ledger = ledgerSnap.data()
      if (ledger.status === 'confirmed') {
        return
      }

      const credits = Number(ledger.credits) || 0
      const currentCredits = Number(churchSnap.data()?.[creditsField] ?? 0)

      transaction.update(churchRef, {
        [creditsField]: currentCredits + credits,
      })
      transaction.update(ledgerRef, {
        status: 'confirmed',
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
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
