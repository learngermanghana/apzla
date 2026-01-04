const normalizePhone = (value) => {
  if (!value) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const cleaned = trimmed.replace(/[^+\d]/g, '')
  if (!cleaned) return null
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`
  return `+${cleaned}`
}

module.exports = { normalizePhone }
