export async function sendSMS({
  to,
  body,
  accountSid,
  authToken,
  from,
}: {
  to: string
  body: string
  accountSid: string
  authToken: string
  from: string
}) {
  const twilioSid = accountSid || process.env.TWILIO_ACCOUNT_SID
  const twilioToken = authToken || process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = from || process.env.TWILIO_PHONE_NUMBER

  if (!twilioSid || !twilioToken || !twilioFrom) {
    throw new Error('Twilio credentials not configured')
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
  const params = new URLSearchParams({ To: to, From: twilioFrom, Body: body })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.message ?? 'SMS send failed')
  }
  return response.json()
}
