const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use POST.'
    })
  }

  const { email, amount, callback_url: callbackUrl, metadata } = request.body || {}

  if (!email || typeof email !== 'string') {
    return response.status(400).json({
      status: 'error',
      message: 'A valid email is required to initialize a transaction.'
    })
  }

  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return response.status(400).json({
      status: 'error',
      message: 'A valid transaction amount greater than zero is required.'
    })
  }

  if (!PAYSTACK_SECRET_KEY) {
    return response.status(500).json({
      status: 'error',
      message: 'PAYSTACK_SECRET_KEY environment variable is not configured.'
    })
  }

  const payload = {
    email: email.trim(),
    amount: Number(amount),
    currency: 'GHS'
  }

  if (callbackUrl) {
    payload.callback_url = callbackUrl
  }

  if (metadata) {
    payload.metadata = metadata
  }

  try {
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const body = await paystackResponse.json().catch(() => ({}))

    if (!paystackResponse.ok) {
      const message = body?.message || paystackResponse.statusText || 'Initialization failed'
      return response.status(paystackResponse.status || 500).json({
        status: 'error',
        message
      })
    }

    return response.status(200).json({
      status: 'success',
      data: body?.data || null,
      message: body?.message || 'Transaction initialized successfully.'
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unexpected initialization error.'
    })
  }
}

module.exports = handler
