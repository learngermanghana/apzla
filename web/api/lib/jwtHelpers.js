const crypto = require('crypto')

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized.padEnd(normalized.length + padLength, '=')
  const buffer = Buffer.from(padded, 'base64')
  return buffer.toString('utf8')
}

function signJwt(payload, secret) {
  if (!secret) {
    throw new Error('JWT secret is required for signing.')
  }

  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const data = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${data}.${signature}`
}

function verifyJwt(token, secret) {
  if (!secret) {
    throw new Error('JWT secret is required for verification.')
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Token format is invalid.')
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const data = `${encodedHeader}.${encodedPayload}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length) {
    throw new Error('Token signature mismatch.')
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Token signature mismatch.')
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload))
  const now = Math.floor(Date.now() / 1000)

  if (payload.exp && now > payload.exp) {
    throw new Error('Token has expired.')
  }

  return payload
}

module.exports = { signJwt, verifyJwt }
