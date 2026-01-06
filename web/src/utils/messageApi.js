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
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.')
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

export const startTopup = async ({ churchId, channel, bundleId, token, callbackUrl }) => {
  const returnUrl =
    callbackUrl ||
    (typeof window !== 'undefined' ? window.location.href : null)
  const data = await postJson({
    endpoint: '/api/credits/topup-init',
    payload: {
      churchId,
      channel,
      bundleId,
      callbackUrl: returnUrl,
    },
    token,
  })

  const authorizationUrl = data?.data?.authorizationUrl
  const accessCode = data?.data?.accessCode || data?.data?.access_code
  const reference = data?.data?.reference
  if (!authorizationUrl && !accessCode) {
    throw new Error('Paystack did not return a payment link.')
  }

  return {
    authorizationUrl,
    accessCode,
    reference,
  }
}

export const fetchBundles = async ({ channel = 'sms', token }) => {
  const data = await getJson({
    endpoint: `/api/credits/bundles?channel=${encodeURIComponent(channel)}`,
    token,
  })

  return Array.isArray(data?.data?.bundles) ? data.data.bundles : []
}
