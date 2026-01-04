// api/router.js
// Single entrypoint for all /api/* routes (Hobby plan friendly)

const { URL } = require('url')

const creditsBundles = require('../server/handlers/credits/bundles')
const creditsTopupInit = require('../server/handlers/credits/topup-init')
const paystackWebhook = require('../server/handlers/credits/paystack-webhook')

const sendBulkSms = require('../server/handlers/messages/send-bulk-sms')

const seedBundles = require('../server/handlers/admin/seed-messaging-bundles')

const health = require('../server/handlers/health')
const uptimePing = require('../server/handlers/uptime-ping')
const checkinToken = require('../server/handlers/checkin-token')
const selfCheckinToken = require('../server/handlers/self-checkin-token')
const verifyCheckin = require('../server/handlers/verify-checkin')
const selfCheckinVerify = require('../server/handlers/self-checkin-verify')
const createChurchSubaccount = require('../server/handlers/create-church-subaccount')
const memberInvite = require('../server/handlers/member-invite')
const memberInviteSubmit = require('../server/handlers/member-invite-submit')

const transactionInitialize = require('../server/handlers/transaction/initialize')
const transactionVerify = require('../server/handlers/transaction/verify-reference')

const readRawBody = async (req) =>
  await new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

const ensureJsonBody = async (req) => {
  if (req.body !== undefined) return
  if (req.method === 'GET' || req.method === 'HEAD') return

  const raw = await readRawBody(req)
  if (!raw.length) {
    req.body = {}
    return
  }

  const text = raw.toString('utf8')
  try {
    req.body = JSON.parse(text)
  } catch (error) {
    req.body = text
  }
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  req.query = {
    ...(req.query || {}),
    ...Object.fromEntries(url.searchParams.entries()),
  }

  const rewriteParam = req.query?.path || req.query?.route
  const rewrittenPath = Array.isArray(rewriteParam) ? rewriteParam[0] : rewriteParam
  const path = (rewrittenPath || pathname.replace(/^\/api\/?/, '')).replace(/^\/+/, '')

  if (path === 'credits/paystack-webhook') {
    try {
      const raw = await readRawBody(req)
      req.rawBody = raw
      req.body = raw.toString('utf8')
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook body.',
      })
    }

    return paystackWebhook(req, res)
  }

  await ensureJsonBody(req)

  if (path === 'health') return health(req, res)
  if (path === 'uptime-ping') return uptimePing(req, res)

  if (path === 'checkin-token') return checkinToken(req, res)
  if (path === 'self-checkin-token') return selfCheckinToken(req, res)
  if (path === 'verify-checkin') return verifyCheckin(req, res)
  if (path === 'self-checkin-verify') return selfCheckinVerify(req, res)

  if (path === 'create-church-subaccount') return createChurchSubaccount(req, res)

  if (path === 'member-invite') return memberInvite(req, res)
  if (path === 'member-invite-submit') return memberInviteSubmit(req, res)

  if (path === 'credits/bundles') return creditsBundles(req, res)
  if (path === 'credits/topup-init') return creditsTopupInit(req, res)

  if (path === 'messages/send-bulk-sms') return sendBulkSms(req, res)

  if (path === 'admin/seed-messaging-bundles') return seedBundles(req, res)

  if (path === 'transaction/initialize') return transactionInitialize(req, res)
  if (path === 'transaction/verify') return transactionVerify(req, res)
  if (path.startsWith('transaction/verify/')) {
    const reference = path.replace('transaction/verify/', '')
    if (reference) {
      req.query = { ...req.query, reference }
    }
    return transactionVerify(req, res)
  }

  return res.status(404).json({
    status: 'error',
    message: `Unknown API route: /api/${path}`,
  })
}

module.exports.config = {
  api: {
    bodyParser: false,
  },
}
