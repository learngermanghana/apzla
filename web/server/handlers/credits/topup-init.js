const { admin, db, initError } = require('../../lib/firestoreAdmin')
const verifyUser = require('../../lib/verifyUser')
const ensureChurchAccess = require('../../lib/ensureChurchAccess')
const { getBundle, normalizeChannel } = require('../../lib/messagingBundles')
const { initializeTransaction } = require('../../lib/paystack')

const toPaystackAmount = (priceGhs) => Math.round(Number(priceGhs) * 100)

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
  const bundleId = payload?.bundleId
  const channel = normalizeChannel(payload?.channel)

  if (!churchId) {
    return response.status(400).json({
      status: 'error',
      message: 'churchId is required.',
    })
  }

  if (!bundleId) {
    return response.status(400).json({
      status: 'error',
      message: 'bundleId is required.',
    })
  }

  if (!channel) {
    return response.status(400).json({
      status: 'error',
      message: 'channel must be either sms or whatsapp.',
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
    const { churchRef, userData } = await ensureChurchAccess({
      uid: authResult.uid,
      churchId,
    })

    if (!userData?.email) {
      return response.status(400).json({
        status: 'error',
        message: 'A billing email is required to initialize a top-up.',
      })
    }

    const bundle = await getBundle({ channel, bundleId })

    if (!Number.isFinite(Number(bundle.priceGhs)) || Number(bundle.priceGhs) <= 0) {
      return response.status(500).json({
        status: 'error',
        message: 'Bundle pricing is invalid.',
      })
    }

    const paystackAmount = toPaystackAmount(bundle.priceGhs)

    const metadata = {
      churchId,
      bundleId,
      channel,
      credits: bundle.credits,
    }

    const transactionData = await initializeTransaction({
      email: userData.email,
      amount: paystackAmount,
      metadata,
    })

    const reference = transactionData?.reference

    if (!reference) {
      return response.status(500).json({
        status: 'error',
        message: 'Paystack did not return a reference.',
      })
    }

    const topupRef = churchRef.collection('topups').doc(reference)

    await topupRef.set({
      reference,
      status: 'INIT',
      channel,
      units: Number(bundle.credits) || 0,
      amountGhs: Number(bundle.priceGhs),
      feesEstimateGhs: null,
      paystackEventId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: null,
    })

    return response.status(200).json({
      status: 'success',
      data: {
        authorizationUrl: transactionData.authorization_url,
        reference,
      },
      message: 'Top-up initialized.',
    })
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Unable to initialize top-up.',
    })
  }
}

module.exports = handler
