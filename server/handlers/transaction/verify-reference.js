const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

async function handler(request, response) {
  const { reference } = request.query || {}

  if (!reference) {
    return response.status(400).json({
      status: 'error',
      message: 'Transaction reference is required.'
    })
  }

  if (!PAYSTACK_SECRET_KEY) {
    return response.status(500).json({
      status: 'error',
      message: 'PAYSTACK_SECRET_KEY environment variable is not configured.'
    })
  }

  const endpoint = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`

  try {
    const paystackResponse = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    })

    const body = await paystackResponse.json().catch(() => ({}))

    if (!paystackResponse.ok) {
      const message = body?.message || paystackResponse.statusText || 'Verification failed'
      return response.status(paystackResponse.status || 500).json({
        status: 'error',
        message
      })
    }

    return response.status(200).json({
      status: 'success',
      data: body?.data || null,
      message: body?.message || 'Transaction verified successfully.'
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unexpected verification error.'
    })
  }
}

module.exports = handler
