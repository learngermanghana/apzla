const DEFAULT_PAYSTACK_FEE_PERCENT = 1.95

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toSafeMinorAmount = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
}

const minorToGhs = (amountMinor) => Number((amountMinor / 100).toFixed(2))

const isDisabled = (value) =>
  typeof value === 'string' && /^(?:0|false|no|off)$/i.test(value.trim())

const shouldPassPaystackFeeToCustomer = (override) => {
  if (override === false) return false
  if (override === true) return true
  return !isDisabled(process.env.PAYSTACK_PASS_FEE_TO_CUSTOMER)
}

const getPaystackFeeConfig = () => {
  const feePercent = Math.max(
    0,
    parseNumber(process.env.PAYSTACK_FEE_PERCENT, DEFAULT_PAYSTACK_FEE_PERCENT)
  )

  const fixedFeeMinor = Math.max(
    0,
    Math.round(
      process.env.PAYSTACK_FIXED_FEE_MINOR !== undefined
        ? parseNumber(process.env.PAYSTACK_FIXED_FEE_MINOR, 0)
        : parseNumber(process.env.PAYSTACK_FIXED_FEE_GHS, 0) * 100
    )
  )

  return { feePercent, fixedFeeMinor }
}

const calculatePaystackCustomerCharge = (baseAmountMinor, options = {}) => {
  const baseAmount = toSafeMinorAmount(baseAmountMinor)
  const currency = options.currency || 'GHS'
  const { feePercent, fixedFeeMinor } = getPaystackFeeConfig()
  const clientPaysProcessingFee = shouldPassPaystackFeeToCustomer(options.coverPaystackFee)

  if (!clientPaysProcessingFee || baseAmount <= 0) {
    return {
      currency,
      clientPaysProcessingFee: false,
      feePercent,
      fixedFeeMinor,
      fixedFeeGhs: minorToGhs(fixedFeeMinor),
      baseAmountMinor: baseAmount,
      baseAmountGhs: minorToGhs(baseAmount),
      processingFeeMinor: 0,
      processingFeeGhs: 0,
      chargeAmountMinor: baseAmount,
      chargeAmountGhs: minorToGhs(baseAmount),
    }
  }

  const feeRate = feePercent / 100
  const multiplier = 1 - feeRate
  const chargeAmountMinor = multiplier > 0
    ? Math.ceil((baseAmount + fixedFeeMinor) / multiplier)
    : baseAmount + fixedFeeMinor
  const processingFeeMinor = Math.max(0, chargeAmountMinor - baseAmount)

  return {
    currency,
    clientPaysProcessingFee: true,
    feePercent,
    fixedFeeMinor,
    fixedFeeGhs: minorToGhs(fixedFeeMinor),
    baseAmountMinor: baseAmount,
    baseAmountGhs: minorToGhs(baseAmount),
    processingFeeMinor,
    processingFeeGhs: minorToGhs(processingFeeMinor),
    chargeAmountMinor,
    chargeAmountGhs: minorToGhs(chargeAmountMinor),
  }
}

const buildPaystackMetadata = (metadata, amountBreakdown) => ({
  ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}),
  paystackFee: amountBreakdown,
})

module.exports = {
  calculatePaystackCustomerCharge,
  buildPaystackMetadata,
}
