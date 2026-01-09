const sendBulkMessage = async ({ endpoint, churchId, message, recipients, token }) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      churchId,
      message,
      recipients,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.message || 'Unable to send bulk message.')
  }

  return data
}

const postJson = async ({ endpoint, payload, token }) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.')
  }

  return data
}

const getJson = async ({ endpoint, token }) => {
  const headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers,
  })

  let data = null
  try {
    data = await response.json()
  } catch (_) {}

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed (${response.status})`
    throw new Error(message)
  }

  return data
}

export const sendBulkSms = ({ churchId, message, recipients, token }) =>
  sendBulkMessage({
    endpoint: '/api/messages/send-bulk-sms',
    churchId,
    message,
    recipients,
    token,
  })

export const startTopup = async ({ churchId, channel, bundleId, token }) => {
  const data = await postJson({
    endpoint: '/api/credits/topup-init',
    payload: { churchId, channel, bundleId },
    token,
  })

  const url = data?.data?.authorizationUrl
  if (!url) {
    throw new Error('Paystack did not return a payment link.')
  }

  return {
    authorizationUrl: url,
    reference: data?.data?.reference || null,
  }
}

export const confirmTopup = async ({ churchId, reference, token }) =>
  postJson({
    endpoint: '/api/credits/confirm-topup',
    payload: { churchId, reference },
    token,
  })

export const fetchBundles = async ({ channel = 'sms' } = {}) => {
  const data = await getJson({
    endpoint: `/api/credits/bundles?channel=${encodeURIComponent(channel)}`,
  })

  return Array.isArray(data?.data?.bundles) ? data.data.bundles : []
}
