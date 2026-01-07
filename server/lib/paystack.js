const crypto = require('crypto')

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || 'https://www.apzla.com/'

const requirePaystackKey = () => {
  if (!PAYSTACK_SECRET_KEY) {
    const error = new Error('PAYSTACK_SECRET_KEY environment variable is not configured.')
    error.statusCode = 500
    throw error
  }
}

const initializeTransaction = async ({ email, amount, metadata }) => {
  requirePaystackKey()

  const payload = {
    email,
    amount,
    currency: 'GHS',
    metadata,
    callback_url: PAYSTACK_CALLBACK_URL,
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body?.status) {
    const error = new Error(body?.message || response.statusText || 'Initialization failed')
    error.statusCode = response.status || 500
    throw error
  }

  return body.data
}

const verifyTransaction = async (reference) => {
  requirePaystackKey()

  const endpoint = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body?.status) {
    const error = new Error(body?.message || response.statusText || 'Verification failed')
    error.statusCode = response.status || 500
    throw error
  }

  return body.data
}

const verifySignature = ({ signature, rawBody }) => {
  if (!signature || !rawBody) return false
  if (!PAYSTACK_SECRET_KEY) return false

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex')

  return hash === signature
}

const getRawBody = (request) => {
  if (typeof request.body === 'string') {
    return request.body
  }

  if (Buffer.isBuffer(request.body)) {
    return request.body.toString('utf8')
  }

  if (request.body && typeof request.body === 'object') {
    return JSON.stringify(request.body)
  }

  return ''
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
  verifySignature,
  getRawBody,
}
