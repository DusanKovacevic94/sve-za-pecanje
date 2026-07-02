import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def send_email(to_email: str, subject: str, body: str, html: str | None = None) -> bool:
    if not settings.resend_api_key:
        # Dev fallback: the body (with its verification/reset link) must be readable
        # in the plain log output, so it goes into the message, not `extra`.
        logger.info("email not sent (RESEND_API_KEY missing) to=%s subject=%r body=%r", to_email, subject, body)
        return False
    payload: dict = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }
    if html:
        payload["html"] = html
    try:
        response = httpx.post(
            RESEND_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            timeout=10.0,
        )
    except httpx.HTTPError:
        logger.exception("email send failed", extra={"to_email": to_email, "subject": subject})
        return False
    if response.status_code >= 400:
        logger.error(
            "email send rejected by Resend",
            extra={
                "to_email": to_email,
                "subject": subject,
                "status": response.status_code,
                "response": response.text[:500],
            },
        )
        return False
    return True


def render_action_email(title: str, intro: str, button_text: str, button_url: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="sr-Latn-RS">
  <body style="margin:0;padding:0;background-color:#f1fbf8;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="max-width:520px;background-color:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td style="font-size:20px;font-weight:bold;color:#147d6b;padding-bottom:16px;">Sve Za Pecanje</td>
            </tr>
            <tr>
              <td style="font-size:24px;font-weight:bold;color:#0f352f;padding-bottom:12px;">{title}</td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.6;color:#334155;padding-bottom:24px;">{intro}</td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="{button_url}"
                   style="display:inline-block;background-color:#147d6b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:6px;">{button_text}</a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.6;color:#64748b;">
                Ako dugme ne radi, otvorite ovaj link u pregledaču:<br>
                <a href="{button_url}" style="color:#147d6b;word-break:break-all;">{button_url}</a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#94a3b8;padding-top:24px;">
                Ako niste vi zatražili ovu poruku, slobodno je ignorišite.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
