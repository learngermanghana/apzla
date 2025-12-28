const { admin, db, initError } = require('../lib/firestoreAdmin')
const verifyUser = require('../lib/verifyUser')
const ensureChurchAccess = require('../lib/ensureChurchAccess')
const { normalizePhone } = require('../lib/phone')

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM

const MAX_RECIPIENTS = 50

const getCreditsPerMessage = (churchData) => {
  const configured = Number(churchData?.smsCreditPriceConfig?.creditsPerSms)
  if (Number.isFinite(configured) && configured > 0) {
    return configured
  }
  return 1
}

const checkDailyLimit = async ({ churchRef, dailyLimit, requestedCount }) => {
  if (!dailyLimit || !Number.isFinite(Number(dailyLimit))) {
    return null
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const snapshot = await churchRef
    .collection('messageBatches')
    .where('createdAt', '>=', startOfDay)
    .get()

  const sentToday = snapshot.docs.reduce((total, doc) => {
    return total + Number(doc.data()?.recipientsCount || 0)
  }, 0)

  if (sentToday + requestedCount > Number(dailyLimit)) {
    return {
      ok: false,
      message: `Daily limit of ${dailyLimit} messages exceeded.`,
    }
  }

  return { ok: true }
}

const createMessageBatchAndReserve = async ({
  churchRef,
  message,
  requestedCount,
  creditsRequired,
  createdByUid,
}) => {
  const batchRef = churchRef.collection('messageBatches').doc()
  const ledgerRef = churchRef.collection('creditLedger').doc()

  await db.runTransaction(async (transaction) => {
    const churchSnap = await transaction.get(churchRef)
    if (!churchSnap.exists) {
      throw new Error('Church not found.')
    }

    const currentCredits = Number(churchSnap.data()?.smsCredits ?? 0)
    if (currentCredits < creditsRequired) {
      const error = new Error('NOT_ENOUGH_CREDITS')
      error.statusCode = 402
      throw error
    }

    transaction.update(churchRef, {
      smsCredits: currentCredits - creditsRequired,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    transaction.set(batchRef, {
      channel: 'sms',
      message,
      recipientsCount: requestedCount,
      reservedUnits: creditsRequired,
      sentCount: 0,
      failedCount: 0,
      status: 'QUEUED',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: createdByUid,
    })

    transaction.set(ledgerRef, {
      type: 'RESERVE',
      channel: 'sms',
      units: -creditsRequired,
      money: null,
      paystackRef: null,
      batchId: batchRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: createdByUid,
    })
  })

  return batchRef
}

const sendTwilioMessage = async ({ to, body }) => {
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_SMS_FROM,
        Body: body,
      }).toString(),
    }
  )

  const data = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    data,
    errorMessage: data?.message || response.statusText,
  }
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

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_SMS_FROM) {
    return response.status(500).json({
      status: 'error',
      message: 'Twilio SMS credentials are not configured.',
    })
  }

  const payload = request.body?.data || request.body || {}
  const churchId = payload?.churchId
  const message = payload?.message
  const recipientsInput = Array.isArray(payload?.recipients) ? payload.recipients : []

  if (!churchId) {
    return response.status(400).json({
      status: 'error',
      message: 'churchId is required.',
    })
  }

  if (!message) {
    return response.status(400).json({
      status: 'error',
      message: 'message is required.',
    })
  }

  const recipients = [...new Set(recipientsInput.map(normalizePhone).filter(Boolean))]

  if (recipients.length === 0) {
    return response.status(400).json({
      status: 'error',
      message: 'At least one valid recipient is required.',
    })
  }

  if (recipients.length > MAX_RECIPIENTS) {
    return response.status(400).json({
      status: 'error',
      message: `Bulk send is limited to ${MAX_RECIPIENTS} recipients per request.`,
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
    const { churchRef, churchData } = await ensureChurchAccess({
      uid: authResult.uid,
      churchId,
    })

    if (churchData?.messaging?.enabled === false) {
      return response.status(403).json({
        status: 'error',
        message: 'Messaging is disabled for this church.',
      })
    }

    const dailyLimitCheck = await checkDailyLimit({
      churchRef,
      dailyLimit: churchData?.messaging?.dailyLimit,
      requestedCount: recipients.length,
    })

    if (dailyLimitCheck && dailyLimitCheck.ok === false) {
      return response.status(403).json({
        status: 'error',
        message: dailyLimitCheck.message,
      })
    }

    const creditsPerMessage = getCreditsPerMessage(churchData)
    const creditsRequired = recipients.length * creditsPerMessage

    const batchRef = await createMessageBatchAndReserve({
      churchRef,
      message,
      requestedCount: recipients.length,
      creditsRequired,
      createdByUid: authResult.uid,
    })

    await batchRef.update({
      status: 'SENDING',
      processingAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const result = await sendTwilioMessage({
            to: recipient,
            body: message,
          })
          return {
            recipient,
            status: result.ok ? 'sent' : 'failed',
            providerMessageId: result.ok ? result.data?.sid : null,
            error: result.ok ? null : result.errorMessage,
          }
        } catch (error) {
          return {
            recipient,
            status: 'failed',
            providerMessageId: null,
            error: error.message || 'Failed to send.',
          }
        }
      })
    )

    const sentCount = results.filter((entry) => entry.status === 'sent').length
    const failedCount = results.length - sentCount

    const batch = db.batch()
    results.forEach((entry) => {
      const recipientRef = batchRef.collection('recipients').doc()
      batch.set(recipientRef, {
        phone: entry.recipient,
        status: entry.status,
        providerMessageId: entry.providerMessageId,
        error: entry.error,
      })
    })

    await batch.commit()

    const sentUnits = sentCount * creditsPerMessage
    const failedUnits = failedCount * creditsPerMessage

    await db.runTransaction(async (transaction) => {
      const churchSnap = await transaction.get(churchRef)
      if (!churchSnap.exists) {
        return
      }

      const currentCredits = Number(churchSnap.data()?.smsCredits ?? 0)
      const ledgerCollection = churchRef.collection('creditLedger')

      if (failedUnits > 0) {
        transaction.update(churchRef, {
          smsCredits: currentCredits + failedUnits,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }

      transaction.update(batchRef, {
        sentCount,
        failedCount,
        status: 'DONE',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      if (sentUnits > 0) {
        transaction.set(ledgerCollection.doc(), {
          type: 'SPEND',
          channel: 'sms',
          units: -sentUnits,
          money: null,
          paystackRef: null,
          batchId: batchRef.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: authResult.uid,
        })
      }

      if (failedUnits > 0) {
        transaction.set(ledgerCollection.doc(), {
          type: 'REFUND',
          channel: 'sms',
          units: failedUnits,
          money: null,
          paystackRef: null,
          batchId: batchRef.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system',
        })
      }
    })

    return response.status(200).json({
      status: 'success',
      data: {
        batchId: batchRef.id,
        sent: sentCount,
        failed: failedCount,
        results,
      },
      message: 'Bulk SMS sent.',
    })
  } catch (error) {
    if (error.message === 'NOT_ENOUGH_CREDITS') {
      return response.status(402).json({
        status: 'error',
        message: 'Not enough credits.',
      })
    }

    return response.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Unable to send bulk SMS.',
    })
  }
}

module.exports = handler
