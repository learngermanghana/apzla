const firestoreProjectId = process.env.FIRESTORE_PROJECT_ID
const firestoreToken = process.env.FIRESTORE_BEARER_TOKEN
const firestoreCollection = process.env.FIRESTORE_HEALTH_COLLECTION || 'health'
const firestoreDocument = process.env.FIRESTORE_HEALTH_DOCUMENT || 'health'
const firestoreTimeoutMs = Number(process.env.FIRESTORE_HEALTH_TIMEOUT_MS || 5000)

async function checkFirestore() {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents/${firestoreCollection}/${firestoreDocument}`
  const abortController = new AbortController()
  const start = Date.now()
  const timeout = setTimeout(() => abortController.abort(), firestoreTimeoutMs)

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${firestoreToken}`
      },
      signal: abortController.signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Firestore responded with ${response.status}: ${errorText || response.statusText}`)
    }

    const document = await response.json()
    const latencyMs = Date.now() - start
    console.log(`[health] Firestore responded in ${latencyMs}ms`)

    return {
      ok: true,
      details: {
        status: 'ok',
        name: document.name,
        updateTime: document.updateTime,
        createTime: document.createTime
      }
    }
  } catch (error) {
    const latencyMs = Date.now() - start
    console.error(`[health] Firestore check failed after ${latencyMs}ms`, error)
    return {
      ok: false,
      details: {
        status: 'error',
        message: error.message
      }
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function handler(request, response) {
  const result = {
    status: 'ok'
  }

  const shouldCheckFirestore = Boolean(firestoreProjectId && firestoreToken)

  if (shouldCheckFirestore) {
    const firestoreResult = await checkFirestore()
    result.firestore = firestoreResult.details

    if (!firestoreResult.ok) {
      result.status = 'error'
      return response.status(500).json(result)
    }
  } else {
    result.firestore = {
      status: 'skipped',
      message: 'Set FIRESTORE_PROJECT_ID and FIRESTORE_BEARER_TOKEN to enable this check.'
    }
  }

  return response.status(200).json(result)
}

module.exports = handler
