import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { resendAdapter } from '@payloadcms/email-resend'

export async function cmsEmail(env: Record<string, string | undefined> = process.env) {
  const defaultFromName = 'Sve Za Pecanje CMS'
  if (env.CMS_ENV === 'production' && env.CMS_BUILD !== 'true') {
    if (!env.CMS_RESEND_API_KEY || !env.CMS_EMAIL_FROM || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.CMS_EMAIL_FROM)) {
      throw new Error('Production CMS email requires CMS_RESEND_API_KEY and a verified CMS_EMAIL_FROM address.')
    }
    return resendAdapter({ apiKey: env.CMS_RESEND_API_KEY, defaultFromAddress: env.CMS_EMAIL_FROM, defaultFromName })
  }
  const host = env.CMS_SMTP_HOST || '127.0.0.1'
  if (!['127.0.0.1', 'localhost', '::1', 'mailpit'].includes(host)) {
    throw new Error('Development/test CMS email must use local Mailpit.')
  }
  const port = Number(env.CMS_SMTP_PORT || 1025)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid CMS_SMTP_PORT.')
  return nodemailerAdapter({
    defaultFromAddress: 'cms@example.test', defaultFromName, skipVerify: true,
    transportOptions: { host, port, secure: false, ignoreTLS: true, connectionTimeout: 5000 },
  })
}
