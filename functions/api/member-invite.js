const { initError } = require('../lib/firestoreAdmin')
const { signJwt } = require('../lib/jwtHelpers')

const jwtSecret =
  process.env.MEMBER_INVITE_JWT_SECRET || process.env.CHECKIN_JWT_SECRET || ''
const inviteTtlMinutes = Number(process.env.MEMBER_INVITE_TTL_MINUTES) || 10080 // 7 days
const appBaseUrl = process.env.APP_BASE_URL || ''

function buildInviteLink(token, baseUrl) {
  const normalizedBase = (baseUrl || '').replace(/\/$/, '') || appBaseUrl.replace(/\/$/, '')
  if (!normalizedBase) return null
  return `${normalizedBase}/member-invite?token=${encodeURIComponent(token)}`
}

module.exports = async function handler(request, response) {
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

  if (!jwtSecret) {
    return response.status(500).json({
      status: 'error',
      message:
        'MEMBER_INVITE_JWT_SECRET (or CHECKIN_JWT_SECRET) environment variable is not configured.',
    })
  }

  const { churchId, baseUrl } = request.body || {}

  if (!churchId) {
    return response.status(400).json({
      status: 'error',
      message: 'churchId is required to issue an invite link.',
    })
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + inviteTtlMinutes * 60

  const payload = {
    churchId,
    type: 'member-invite',
    iat: issuedAt,
    exp: expiresAt,
  }

  try {
    const token = signJwt(payload, jwtSecret)
    const link = buildInviteLink(token, baseUrl)

    if (!link) {
      throw new Error('Unable to build invite link. Please provide a base URL.')
    }

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      link
    )}`

    return response.status(200).json({
      status: 'success',
      token,
      link,
      qrImageUrl,
      expiresAt,
      message: 'Invite link issued successfully.',
    })
  } catch (error) {
    return response.status(500).json({
      status: 'error',
      message: error.message || 'Unable to issue invite link.',
    })
  }
}
