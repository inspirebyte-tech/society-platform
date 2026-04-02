interface SmsResult {
  success: boolean
  error?: string
}

export const sendOtp = async (
  phone: string,
  message: string
): Promise<SmsResult> => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n--------------------------`)
    console.log(`SMS for ${phone}: ${message}`)
    console.log(`--------------------------\n`)
    return { success: true }
  }

  // Production: wire in SMS provider here
  // Example: MSG91, Fast2SMS, Twilio
  // const response = await msg91.send(phone, otp)
  // return { success: true }

  return { success: false, error: 'sms_provider_not_configured' }
}