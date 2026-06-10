const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')

const normalizeAccountNumber = (value) => normalizeString(value).replace(/\s+/g, '')

const accountNumberLast4 = (value) => {
  const normalized = normalizeAccountNumber(value)
  const digits = normalized.replace(/\D/g, '')
  return (digits || normalized).slice(-4)
}

const parsePercentage = (value, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(100, Math.max(0, parsed))
}

const requirePaystackSecret = () => {
  if (!PAYSTACK_SECRET) {
    const error = new Error('PAYSTACK_SECRET_KEY environment variable is not configured.')
    error.statusCode = 500
    throw error
  }
}

const getPaystackSubaccountCode = (data = {}) =>
  data.subaccount_code || data.subaccountCode || data.code || null

const getPaystackSubaccountId = (data = {}) => data.id || data.subaccount_id || null

const buildSubaccountMetadata = ({ entityType, entityId, ownerUserId, source, metadata } = {}) => ({
  ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}),
  ...(entityType ? { entityType } : {}),
  ...(entityId ? { entityId } : {}),
  ...(ownerUserId ? { ownerUserId } : {}),
  source: source || 'sedifex',
})

const createPaystackSubaccount = async ({
  businessName,
  accountNumber,
  bankCode,
  percentageCharge = 0,
  description,
  primaryContactEmail,
  primaryContactName,
  primaryContactPhone,
  metadata,
}) => {
  requirePaystackSecret()

  const normalizedBusinessName = normalizeString(businessName)
  const normalizedAccountNumber = normalizeAccountNumber(accountNumber)
  const normalizedBankCode = normalizeString(bankCode)
  const normalizedPercentageCharge = parsePercentage(percentageCharge, 0)

  if (!normalizedBusinessName) {
    const error = new Error('Business name is required to create a Paystack subaccount.')
    error.statusCode = 400
    throw error
  }

  if (!normalizedAccountNumber) {
    const error = new Error('Account number or mobile money number is required to create a Paystack subaccount.')
    error.statusCode = 400
    throw error
  }

  if (!normalizedBankCode) {
    const error = new Error('Paystack bank/mobile money code is required to create a Paystack subaccount.')
    error.statusCode = 400
    throw error
  }

  const body = {
    business_name: normalizedBusinessName,
    account_number: normalizedAccountNumber,
    settlement_bank: normalizedBankCode,
    bank_code: normalizedBankCode,
    percentage_charge: normalizedPercentageCharge,
    metadata,
  }

  const normalizedDescription = normalizeString(description)
  const normalizedContactEmail = normalizeString(primaryContactEmail)
  const normalizedContactName = normalizeString(primaryContactName)
  const normalizedContactPhone = normalizeString(primaryContactPhone)

  if (normalizedDescription) body.description = normalizedDescription
  if (normalizedContactEmail) body.primary_contact_email = normalizedContactEmail
  if (normalizedContactName) body.primary_contact_name = normalizedContactName
  if (normalizedContactPhone) body.primary_contact_phone = normalizedContactPhone

  const paystackResponse = await fetch('https://api.paystack.co/subaccount', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const result = await paystackResponse.json().catch(() => ({}))

  if (!paystackResponse.ok || !result.status) {
    const error = new Error(result?.message || paystackResponse.statusText || 'Paystack failed')
    error.statusCode = paystackResponse.status || 500
    error.paystackResponse = result
    throw error
  }

  const data = result?.data || {}

  return {
    data,
    subaccountCode: getPaystackSubaccountCode(data),
    subaccountId: getPaystackSubaccountId(data),
    accountNumberLast4: accountNumberLast4(data.account_number || normalizedAccountNumber),
    accountName: data.account_name || data.business_name || normalizedBusinessName,
    settlementBank: data.settlement_bank || data.bank_code || normalizedBankCode,
    percentageCharge: normalizedPercentageCharge,
  }
}

module.exports = {
  accountNumberLast4,
  buildSubaccountMetadata,
  createPaystackSubaccount,
  parsePercentage,
}
