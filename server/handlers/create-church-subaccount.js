const { db, initError } = require('../lib/firestoreAdmin')
const verifyUser = require('../lib/verifyUser')
const {
  buildSubaccountMetadata,
  createPaystackSubaccount,
} = require('../lib/paystackSubaccount')

const DEFAULT_PLATFORM_COMMISSION = 3

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

    const platformCommission = Number.isFinite(Number(church.platformCommissionPercent))
      ? Number(church.platformCommissionPercent)
      : DEFAULT_PLATFORM_COMMISSION

    const metadata = buildSubaccountMetadata({
      entityType: 'church',
      entityId: churchId,
      ownerUserId: authResult.uid,
      source: 'sedifex-online-giving',
      metadata: {
        payoutBankType,
        payoutNetwork,
        app: 'sedifex',
      },
    })

    const subaccount = await createPaystackSubaccount({
      businessName: church.name || payoutAccountName || `Sedifex Church ${churchId}`,
      accountNumber: payoutAccountNumber,
      bankCode,
      percentageCharge: platformCommission,
      description: `Sedifex payout account for ${church.name || churchId}`,
      primaryContactEmail: userData?.email,
      primaryContactName: payoutAccountName,
      primaryContactPhone: church.phone,
      metadata,
    })

    const nowIso = new Date().toISOString()

    await churchRef.update({
      paystackSubaccountCode: subaccount.subaccountCode,
      paystackSubaccountId: subaccount.subaccountId,
      paystackSubaccountCreatedAt: nowIso,
      paystackSubaccountLastSyncedAt: nowIso,
      payoutStatus: 'ACTIVE',
      payoutAccountName: subaccount.accountName || payoutAccountName,
      payoutAccountNumberLast4: subaccount.accountNumberLast4,
      payoutBankCode: bankCode,
      payoutBankType,
      payoutNetwork: payoutNetwork || null,
      payoutVerified: true,
      platformCommissionPercent: platformCommission,
      onlineGivingEnabled: true,
      updatedAt: nowIso,
    })

    return response.status(200).json({
      status: 'success',
      data: {
        subaccountCode: subaccount.subaccountCode,
        subaccountId: subaccount.subaccountId,
        accountName: subaccount.accountName,
        accountNumberLast4: subaccount.accountNumberLast4,
        settlementBank: subaccount.settlementBank,
        percentageCharge: subaccount.percentageCharge,
      },
      message: 'Paystack subaccount created and saved.',
    })
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Unable to create Paystack subaccount.',
      details: error.paystackResponse || undefined,
    })
  }
}

module.exports = handler
