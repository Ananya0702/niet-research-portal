"""HTML/text templates for OTP emails."""

APP_NAME = "NIET Research Analytics Portal"


def _base_layout(body_html: str) -> str:
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f8;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e8ee;">
    <div style="background:#534AB7;padding:22px 28px;">
      <div style="color:#ffffff;font-size:18px;font-weight:700;">{APP_NAME}</div>
    </div>
    <div style="padding:28px;color:#333;font-size:14px;line-height:1.6;">
      {body_html}
    </div>
    <div style="padding:16px 28px;background:#f8f8fb;color:#999;font-size:11px;">
      This is an automated security message from {APP_NAME}. If you did not request this, please contact the administrator immediately.
    </div>
  </div></body></html>"""


def otp_email_html(otp: str, purpose: str, expiry_minutes: int = 5) -> str:
    body = f"""<p>Hello,</p>
    <p>Use the following one-time password to <strong>{purpose}</strong>. It is valid for
    <strong>{expiry_minutes} minutes</strong> and can only be used once.</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;font-size:26px;font-weight:700;letter-spacing:8px;color:#534AB7;border:2px dashed #534AB7;border-radius:10px;padding:10px 22px;">{otp}</span>
    </div>
    <p>If you did not request this OTP, ignore this email — your account remains secure.</p>"""
    return _base_layout(body)


def otp_email_text(otp: str, expiry_minutes: int = 5) -> str:
    return f"Your OTP is {otp}. Valid for {expiry_minutes} minutes."


def password_changed_html(meta: dict) -> str:
    body = f"""<p>Hello,</p>
    <p>Your password for {APP_NAME} was <strong>successfully changed</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
      <tr><td style="padding:6px 8px;color:#888;width:120px;">Date</td><td style="padding:6px 8px;"><strong>{meta.get('date', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">Time</td><td style="padding:6px 8px;"><strong>{meta.get('time', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">IP Address</td><td style="padding:6px 8px;"><strong>{meta.get('ip', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">Browser</td><td style="padding:6px 8px;"><strong>{meta.get('browser', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">Device</td><td style="padding:6px 8px;"><strong>{meta.get('device', '—')}</strong></td></tr>
    </table>
    <p style="color:#A32D2D;"><strong>If you did not perform this action, please contact the administrator immediately.</strong></p>"""
    return _base_layout(body)


def password_reset_html(meta: dict) -> str:
    body = f"""<p>Hello,</p>
    <p>Your password was reset successfully on <strong>{APP_NAME}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
      <tr><td style="padding:6px 8px;color:#888;width:120px;">Date</td><td style="padding:6px 8px;"><strong>{meta.get('date', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">Time</td><td style="padding:6px 8px;"><strong>{meta.get('time', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">IP Address</td><td style="padding:6px 8px;"><strong>{meta.get('ip', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">Browser</td><td style="padding:6px 8px;"><strong>{meta.get('browser', '—')}</strong></td></tr>
    </table>
    <p style="color:#A32D2D;"><strong>If you did not perform this action, please contact the administrator immediately.</strong></p>"""
    return _base_layout(body)


def force_reset_html(meta: dict) -> str:
    body = f"""<p>Hello,</p>
    <p>For your security, the administrator has required that you set a new password the next time you sign in.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
      <tr><td style="padding:6px 8px;color:#888;width:120px;">Date</td><td style="padding:6px 8px;"><strong>{meta.get('date', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">Requested By</td><td style="padding:6px 8px;"><strong>{meta.get('requested_by', 'Administrator')}</strong></td></tr>
    </table>
    <p>Please sign in and choose a new password to continue.</p>"""
    return _base_layout(body)


def account_unlocked_html(meta: dict) -> str:
    body = f"""<p>Hello,</p>
    <p>Your account on <strong>{APP_NAME}</strong> has been unlocked.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
      <tr><td style="padding:6px 8px;color:#888;width:120px;">Date</td><td style="padding:6px 8px;"><strong>{meta.get('date', '—')}</strong></td></tr>
      <tr><td style="padding:6px 8px;color:#888;">Unlocked By</td><td style="padding:6px 8px;"><strong>{meta.get('requested_by', 'Administrator')}</strong></td></tr>
    </table>
    <p>If you did not request this, please contact the administrator immediately.</p>"""
    return _base_layout(body)
