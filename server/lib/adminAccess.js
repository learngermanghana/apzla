const crypto = require('crypto')
const { db } = require('./firestoreAdmin')
const verifyUser = require('./verifyUser')

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SEDIFEX_ADMIN', 'OWNER'])

const listFromEnv = (name) =>
  String(process.env[name] || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

const getProvidedAdminSecret = (request) => {
  const headerSecret = request.headers?.['x-admin-secret'] || request.headers?.['x-sedifex-admin-secret']
  if (headerSecret) return String(headerSecret).trim()

  const authHeader = String(request.headers?.authorization || '')
  if (authHeader.startsWith('AdminSecret ')) {
    return authHeader.replace('AdminSecret ', '').trim()
  }

  return null
}

const secretsMatch = (a, b) => {
  if (!a || !b) return false
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

const isAdminProfile = ({ uid, email, role, isAdmin } = {}) => {
  const adminEmails = listFromEnv('SEDIFEX_ADMIN_EMAILS')
  const adminUids = listFromEnv('SEDIFEX_ADMIN_UIDS')
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedUid = String(uid || '').trim().toLowerCase()
  const normalizedRole = String(role || '').trim().toUpperCase()

  return Boolean(
    isAdmin === true ||
      ADMIN_ROLES.has(normalizedRole) ||
      (normalizedEmail && adminEmails.includes(normalizedEmail)) ||
      (normalizedUid && adminUids.includes(normalizedUid))
  )
}

const verifyAdminAccess = async (request) => {
  const adminSecret = process.env.SEDIFEX_ADMIN_SECRET || process.env.ADMIN_SECRET
  const providedSecret = getProvidedAdminSecret(request)

  if (adminSecret && providedSecret && secretsMatch(providedSecret, adminSecret)) {
    return {
      ok: true,
      uid: 'admin-secret',
      email: 'admin-secret',
      role: 'ADMIN_SECRET',
      authMethod: 'admin-secret',
    }
  }

  const authResult = await verifyUser(request)
  if (authResult.error) {
    return {
      ok: false,
      code: authResult.error.code,
      message: authResult.error.message,
    }
  }

  const userDoc = await db.collection('users').doc(authResult.uid).get()
  const userData = userDoc.exists ? userDoc.data() || {} : {}
  const profile = {
    uid: authResult.uid,
    email: userData.email || userData.userEmail || '',
    role: userData.role || '',
    isAdmin: userData.isAdmin,
  }

  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      code: 403,
      message: 'Admin access required.',
    }
  }

  return {
    ok: true,
    ...profile,
    authMethod: 'firebase-admin-role',
  }
}

module.exports = {
  isAdminProfile,
  verifyAdminAccess,
}
