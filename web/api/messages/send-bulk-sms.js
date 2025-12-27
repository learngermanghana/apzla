const { admin, db, initError } = require('../lib/firestoreAdmin')
const verifyUser = require('../lib/verifyUser')

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM

const MAX_RECIPIENTS = 50

const normalizeRecipient = (value) => {
  if (!value) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const cleaned = trimmed.replace(/[\s()-]/g, '')
  if (!cleaned) return null
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`
  return `+${cleaned}`
}

const ensureCredits = async ({ churchRef, creditsField, count }) => {
  try {
    await db.runTransaction(async (transaction) => {
      const churchSnap = await transaction.get(churchRef)
      const currentCredits = Number(churchSnap.data()?.[creditsField] ?? 0)
      if (currentCredits < count) {
        throw new Error('NOT_ENOUGH_CREDITS')
      }
      transaction.update(churchRef, {
        [creditsField]: currentCredits - count,
      })
    })
    return { ok: true }
  } catch (error) {
    if (error.message === 'NOT_ENOUGH_CREDITS') {
      return { ok: false, code: 402, message: 'Not enough credits.' }
    }
    throw error
  }
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

  const recipients = [
    ...new Set(recipientsInput.map(normalizeRecipient).filter(Boolean)),
  ]

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

    const creditsCheck = await ensureCredits({
      churchRef,
      creditsField: 'smsCredits',
      count: recipients.length,
    })

    if (!creditsCheck.ok) {
      return response.status(creditsCheck.code).json({
        status: 'error',
        message: creditsCheck.message,
      })
    }

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
            providerMessage: result.ok ? result.data?.sid : null,
            error: result.ok ? null : result.errorMessage,
          }
        } catch (error) {
          return {
            recipient,
            status: 'failed',
            providerMessage: null,
            error: error.message || 'Failed to send.',
          }
        }
      })
    )

    const batch = db.batch()
    const logsRef = churchRef.collection('messageLogs')
    results.forEach((entry) => {
      const logRef = logsRef.doc()
      batch.set(logRef, {
        channel: 'sms',
        provider: 'twilio',
        recipient: entry.recipient,
        message,
        status: entry.status,
        providerMessage: entry.providerMessage,
        error: entry.error,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    })
    await batch.commit()

    return response.status(200).json({
      status: 'success',
      data: {
        sent: results.filter((entry) => entry.status === 'sent').length,
        failed: results.filter((entry) => entry.status === 'failed').length,
        results,
      },
      message: 'Bulk SMS sent.',
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unable to send bulk SMS.',
    })
  }
}

module.exports = handler
