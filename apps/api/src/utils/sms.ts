// ─────────────────────────────────────────────
// SMS Utility
// Development: logs OTP to console
// Production: sends real SMS via MSG91
// ─────────────────────────────────────────────

const MSG91_AUTH_KEY   = process.env.MSG91_AUTH_KEY
const MSG91_SENDER_ID  = process.env.MSG91_SENDER_ID  || 'VAASTIO'
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID

export const sendOtp = async (
  phone: string,
  otp: string
): Promise<void> => {
  if (process.env.NODE_ENV !== 'production') {
    // Development and test — never use real SMS credits
    console.log('--------------------------')
    console.log(`SMS for ${phone}: ${otp}`)
    console.log('--------------------------')
    return
  }

  // Production — send real SMS via MSG91
  try {
    const mobile = phone.replace('+', '')

    const payload = {
      template_id: MSG91_TEMPLATE_ID,
      short_url:   '0',
      realTimeResponse: '1',
      recipients: [
        {
          mobiles: mobile,
          OTP:     otp
        }
      ]
    }

    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'authkey':       MSG91_AUTH_KEY || ''
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok || data.type === 'error') {
      console.error('MSG91 error:', data)
    }

  } catch (error) {
    // Never throw — SMS failure must not crash main flow
    console.error('SMS send failed:', error)
  }
}