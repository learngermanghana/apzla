const firestoreProjectId = process.env.FIRESTORE_PROJECT_ID
const firestoreToken = process.env.FIRESTORE_BEARER_TOKEN
const firestoreCollection = process.env.FIRESTORE_UPTIME_COLLECTION || 'uptime'
const firestoreDocument = process.env.FIRESTORE_UPTIME_DOCUMENT || 'latest'

const firestoreBase =
  firestoreProjectId &&
  `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents`

function mapFields(fields) {
  const mapped = {}

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (typeof value === 'string') {
      mapped[key] = { stringValue: value }
    } else if (value instanceof Date) {
      mapped[key] = { timestampValue: value.toISOString() }
    } else if (typeof value === 'number') {
      mapped[key] = { integerValue: value }
    }
  })

  return mapped
}

async function checkFirestore() {
  const endpoint = `${firestoreBase}/${firestoreCollection}/${firestoreDocument}`

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${firestoreToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Firestore responded with ${response.status}: ${errorText || response.statusText}`
      )
    }

    const document = await response.json()

    return {
      ok: true,
      details: {
        status: 'ok',
        name: document.name,
        updateTime: document.updateTime,
        createTime: document.createTime,
      },
    }
  } catch (error) {
    return {
      ok: false,
      details: {
        status: 'error',
        message: error.message,
      },
    }
  }
}

async function recordHeartbeat(payload) {
  if (!firestoreBase || !firestoreToken) {
    return {
      ok: false,
      message: 'FIRESTORE_PROJECT_ID and FIRESTORE_BEARER_TOKEN must be set to record uptime.',
    }
  }

  const endpoint = `${firestoreBase}/${firestoreCollection}/${firestoreDocument}`
  const body = {
    fields: mapFields({
      status: payload.status,
      firestoreStatus: payload.firestoreStatus,
      firestoreMessage: payload.firestoreMessage,
      checkedAt: payload.checkedAt,
    }),
  }

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${firestoreToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      ok: false,
      message: `Failed to record uptime: ${response.status} ${response.statusText} ${errorText}`,
    }
  }

  const document = await response.json()
  return { ok: true, record: document }
}

async function handler(request, response) {
  const checkedAt = new Date()

  if (!firestoreProjectId || !firestoreToken) {
    return response.status(200).json({
      status: 'skipped',
      message:
        'Set FIRESTORE_PROJECT_ID and FIRESTORE_BEARER_TOKEN to enable uptime logging.',
    })
  }

  const firestoreResult = await checkFirestore()
  const heartbeatStatus = firestoreResult.ok ? 'ok' : 'error'

  const recordResult = await recordHeartbeat({
    status: heartbeatStatus,
    firestoreStatus: firestoreResult.details.status,
    firestoreMessage: firestoreResult.details.message,
    checkedAt,
  })

  if (!recordResult.ok) {
    return response.status(500).json({
      status: 'error',
      message: recordResult.message,
      firestore: firestoreResult.details,
    })
  }

  return response.status(firestoreResult.ok ? 200 : 500).json({
    status: heartbeatStatus,
    firestore: firestoreResult.details,
    recorded: {
      name: recordResult.record.name,
      updateTime: recordResult.record.updateTime,
    },
    checkedAt: checkedAt.toISOString(),
  })
}

module.exports = handler
