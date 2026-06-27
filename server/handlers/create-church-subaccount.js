const { db, initError } = require('../lib/firestoreAdmin')
const verifyUser = require('../lib/verifyUser')

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY

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

  if (!PAYSTACK_SECRET) {
    return response.status(500).json({
      status: 'error',
      message: 'PAYSTACK_SECRET_KEY environment variable is not configured.',
    })
  }

  const payload = request.body?.data || request.body || {}
  const churchId = payload?.churchId

  if (!churchId) {
    return response.status(400).json({
      status: 'error',
      message: 'churchId is required.',
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
    const userDoc = await db.collection('users').doc(authResult.uid).get()
    const userData = userDoc.exists ? userDoc.data() : null

    if (userData?.churchId && userData.churchId !== churchId) {
      return response.status(403).json({
        status: 'error',
        message: 'You are not allowed to manage this church.',
      })
    }

    const churchRef = db.collection('churches').doc(churchId)
    const churchSnap = await churchRef.get()

    if (!churchSnap.exists) {
      return response.status(404).json({
        status: 'error',
        message: 'Church not found.',
      })
    }

    const church = churchSnap.data()

    if (church.ownerUserId && church.ownerUserId !== authResult.uid) {
      return response.status(403).json({
        status: 'error',
        message: 'You are not allowed to manage this church.',
      })
    }

    const payoutBankType = (church.payoutBankType || '').trim()
    const payoutAccountName = (church.payoutAccountName || '').trim()
    const payoutAccountNumber = (church.payoutAccountNumber || '').trim()
    const payoutNetwork = (church.payoutNetwork || '').trim()
    const bankCode = (church.payoutBankCode || payoutNetwork || payoutBankType).trim()

    if (!payoutBankType || !payoutAccountName || !payoutAccountNumber) {
      return response.status(400).json({
        status: 'error',
        message: 'Missing payout details. Please provide bank type, account name, and account number/phone.',
      })
    }

    if (!bankCode) {
      return response.status(400).json({
        status: 'error',
        message: 'Bank code or network is required to create a Paystack subaccount.',
      })
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
      return response.status(paystackResponse.status || 500).json({
        status: 'error',
        message,
      })
    }

    const subaccountCode = result?.data?.subaccount_code || null

    await churchRef.update({
      paystackSubaccountCode: subaccountCode,
      payoutStatus: 'ACTIVE',
      onlineGivingEnabled: true,
    })

    return response.status(200).json({
      status: 'success',
      data: { subaccountCode },
      message: 'Paystack subaccount created.',
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unable to create Paystack subaccount.',
    })
  }
}

module.exports = handler
