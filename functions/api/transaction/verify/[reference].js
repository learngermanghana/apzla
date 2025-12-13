const { admin, db, initError } = require('../../lib/firestoreAdmin')

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

async function recordGiving({ reference, verificationData }) {
  const metadata = verificationData?.metadata || {}
  const churchId = metadata.churchId

  if (!churchId) {
    throw new Error('Verified transaction is missing churchId metadata.')
  }

  const existing = await db
    .collection('giving')
    .where('paystackReference', '==', reference)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { alreadyRecorded: true }
  }

  const paidAt = verificationData?.paid_at ? new Date(verificationData.paid_at) : new Date()
  const amount = toNumber(verificationData?.amount)
  const normalizedAmount = amount ? amount / 100 : null

  if (!normalizedAmount || normalizedAmount <= 0) {
    throw new Error('Verified transaction amount is invalid.')
  }

  const payload = {
    churchId,
    amount: normalizedAmount,
    type: metadata.type || 'Offering',
    serviceType: (metadata.serviceType || 'Online').trim(),
    date: paidAt.toISOString().slice(0, 10),
    memberId: null,
    memberName: `${metadata.giverName || ''}`.trim(),
    phone: `${metadata.phone || ''}`.trim(),
    notes: 'Online giving (Paystack)',
    source: metadata.source || 'ONLINE',
    paystackReference: reference,
    paystackStatus: verificationData?.status,
    paystackId: verificationData?.id || null,
    currency: verificationData?.currency || 'GHS',
    paidAt: verificationData?.paid_at || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }

  await db.collection('giving').add(payload)

  return { alreadyRecorded: false }
}

async function handler(request, response) {
  const { reference } = request.query || {}

  if (!reference) {
    return response.status(400).json({
      status: 'error',
      message: 'Transaction reference is required.'
    })
  }

  if (initError) {
    return response.status(500).json({
      status: 'error',
      message: initError.message || 'Unable to initialize Firebase.'
    })
  }

  if (!PAYSTACK_SECRET_KEY) {
    return response.status(500).json({
      status: 'error',
      message: 'PAYSTACK_SECRET_KEY environment variable is not configured.'
    })
  }

  const endpoint = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`

  try {
    const paystackResponse = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    })

    const body = await paystackResponse.json().catch(() => ({}))

    if (!paystackResponse.ok) {
      const message = body?.message || paystackResponse.statusText || 'Verification failed'
      return response.status(paystackResponse.status || 500).json({
        status: 'error',
        message
      })
    }

    const verificationData = body?.data

    if (!verificationData) {
      return response.status(500).json({
        status: 'error',
        message: 'Paystack verification did not return data.'
      })
    }

    if (verificationData.status !== 'success') {
      return response.status(400).json({
        status: 'error',
        message: 'Payment is not successful yet.',
        data: verificationData
      })
    }

    const recordResult = await recordGiving({ reference, verificationData })

    return response.status(200).json({
      status: 'success',
      data: { ...verificationData, alreadyRecorded: !!recordResult.alreadyRecorded },
      message:
        recordResult.alreadyRecorded
          ? 'Transaction was already verified and recorded.'
          : body?.message || 'Transaction verified and recorded successfully.'
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unexpected verification error.'
    })
  }
}

module.exports = handler
