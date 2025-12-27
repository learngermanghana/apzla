const sendBulkMessage = async ({ endpoint, churchId, message, recipients, token }) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      churchId,
      message,
      recipients,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.message || 'Unable to send bulk message.')
  }

  return data
}

export const sendBulkSms = ({ churchId, message, recipients, token }) =>
  sendBulkMessage({
    endpoint: '/api/messages/send-bulk-sms',
    churchId,
    message,
    recipients,
    token,
  })

export const sendBulkWhatsapp = ({ churchId, message, recipients, token }) =>
  sendBulkMessage({
    endpoint: '/api/messages/send-bulk-whatsapp',
    churchId,
    message,
    recipients,
    token,
  })
