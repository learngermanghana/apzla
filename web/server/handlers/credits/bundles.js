const { initError } = require('../../lib/firestoreAdmin')
const verifyUser = require('../../lib/verifyUser')
const { listBundles, normalizeChannel } = require('../../lib/messagingBundles')

async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use GET.',
    })
  }

  if (initError) {
    return response.status(500).json({
      status: 'error',
      message: initError.message || 'Unable to initialize Firebase.',
    })
  }

  const channel = normalizeChannel(request.query?.channel)
  if (!channel) {
    return response.status(400).json({
      status: 'error',
      message: 'channel must be either sms or whatsapp.',
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
    const bundles = await listBundles({ channel })
    return response.status(200).json({
      status: 'success',
      data: {
        bundles,
      },
    })
  } catch (error) {
    return response.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Unable to load bundles.',
    })
  }
}

module.exports = handler
