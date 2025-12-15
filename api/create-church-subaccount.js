const { randomUUID } = require('crypto')
const { admin, db, initError } = require('../lib/firestoreAdmin')

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY

const createRequestId = () => (typeof randomUUID === 'function' ? randomUUID() : `req-${Date.now()}`)

function logAndSendError(response, statusCode, message, requestId, metadata = {}) {
  console.error('[create-church-subaccount] error', { requestId, statusCode, message, ...metadata })
  return response.status(statusCode).json({
    status: 'error',
    message,
    requestId,
  })
}

async function verifyUser(request) {
  const authHeader = request.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return { error: { code: 401, message: 'Authorization token missing.' } }
  }

  const token = authHeader.replace('Bearer ', '').trim()
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    return { uid: decoded.uid }
  } catch (error) {
    return { error: { code: 401, message: 'Invalid or expired authorization token.' } }
  }
}

async function handler(request, response) {
  const requestId = createRequestId()

  if (request.method !== 'POST') {
    return logAndSendError(response, 405, 'Method not allowed. Use POST.', requestId)
  }

  if (initError) {
    return logAndSendError(
      response,
      500,
      initError.message || 'Unable to initialize Firebase.',
      requestId
    )
  }

  if (!PAYSTACK_SECRET) {
    return logAndSendError(
      response,
      500,
      'PAYSTACK_SECRET_KEY environment variable is not configured.',
      requestId
    )
  }

  const payload = request.body?.data || request.body || {}
  const churchId = payload?.churchId

  if (!churchId) {
    return logAndSendError(response, 400, 'churchId is required.', requestId)
  }

  const authResult = await verifyUser(request)
  if (authResult.error) {
    return logAndSendError(response, authResult.error.code, authResult.error.message, requestId)
  }

  try {
    const userDoc = await db.collection('users').doc(authResult.uid).get()
    const userData = userDoc.exists ? userDoc.data() : null

    if (userData?.churchId && userData.churchId !== churchId) {
      return logAndSendError(
        response,
        403,
        'You are not allowed to manage this church.',
        requestId
      )
    }

    const churchRef = db.collection('churches').doc(churchId)
    const churchSnap = await churchRef.get()

    if (!churchSnap.exists) {
      return logAndSendError(response, 404, 'Church not found.', requestId)
    }

    const church = churchSnap.data()

    if (church.ownerUserId && church.ownerUserId !== authResult.uid) {
      return logAndSendError(
        response,
        403,
        'You are not allowed to manage this church.',
        requestId
      )
    }

    const payoutBankType = (church.payoutBankType || '').trim()
    const payoutAccountName = (church.payoutAccountName || '').trim()
    const payoutAccountNumber = (church.payoutAccountNumber || '').trim()
    const payoutNetwork = (church.payoutNetwork || '').trim()
    const bankCode = (church.payoutBankCode || payoutNetwork || payoutBankType).trim()

    if (!payoutBankType || !payoutAccountName || !payoutAccountNumber) {
      return logAndSendError(
        response,
        400,
        'Missing payout details. Please provide bank type, account name, and account number/phone.',
        requestId
      )
    }

    if (!bankCode) {
      return logAndSendError(
        response,
        400,
        'Bank code or network is required to create a Paystack subaccount.',
        requestId
      )
    }

    const body = {
      business_name: church.name || `Apzla Church ${churchId}`,
      account_number: payoutAccountNumber,
      bank_code: bankCode,
      percentage_charge: 0,
    }

    const paystackResponse = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const result = await paystackResponse.json().catch(() => ({}))

    if (!paystackResponse.ok || !result.status) {
      const message = result?.message || paystackResponse.statusText || 'Paystack failed'
      return logAndSendError(response, paystackResponse.status || 500, message, requestId, {
        paystackStatus: paystackResponse.status,
        paystackBody: result,
      })
    }

    const subaccountCode = result?.data?.subaccount_code || null

    await churchRef.update({
      paystackSubaccountCode: subaccountCode,
      payoutStatus: 'ACTIVE',
      onlineGivingEnabled: true,
      payoutLastError: null,
      payoutLastErrorAt: null,
    })

    return response.status(200).json({
      status: 'success',
      data: { subaccountCode },
      message: 'Paystack subaccount created.',
    })
  } catch (error) {
    return logAndSendError(
      response,
      500,
      error.message || 'Unable to create Paystack subaccount.',
      requestId,
      { error }
    )
  }
}

module.exports = handler
