const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function clientPortalUrl() {
  const configured = process.env.APP_PUBLIC_URL?.trim() || (process.env.NGROK_DOMAIN?.trim() ? `https://${process.env.NGROK_DOMAIN.trim()}` : 'http://localhost:3000');
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Invalid portal URL');
    url.username = ''; url.password = ''; url.hash = ''; url.search = '?mode=book';
    return url.href;
  } catch { return 'http://localhost:3000/?mode=book'; }
}

export function loginEmailHtml(email) {
  const instant = new Date(email.signed_in_at);
  const date = instant.toLocaleDateString('en-IN', {timeZone:'Asia/Kolkata', day:'numeric', month:'long', year:'numeric'});
  const time = instant.toLocaleTimeString('en-IN', {timeZone:'Asia/Kolkata', hour:'numeric', minute:'2-digit', hour12:true}).toUpperCase();
  const details = [['Account',email.recipient],['Method','Google Sign-In'],['Date',date],['Time',`${time} IST`]].map(([label,value],index) => `<tr><td style="padding:10px 0;${index < 3 ? 'border-bottom:1px solid #e2e8f0;' : ''}"><div style="color:#64748b;font-size:14px;margin-bottom:5px">${label}</div><div style="font-weight:600;word-break:break-word;overflow-wrap:anywhere;color:#0f172a">${escapeHtml(value)}</div></td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You’re signed in to Elevate</title><style>@media only screen and (max-width:600px){.email-pad{padding:25px!important}}</style></head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">Your Google sign-in was successful. View your account details and open your Client Portal.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9"><tr><td align="center" style="padding:25px 15px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;table-layout:fixed;background:#ffffff;border:1px solid #e2e8f0;border-top:5px solid #f97316;border-radius:15px">
<tr><td class="email-pad" style="padding:30px 40px;border-bottom:1px solid #e2e8f0"><img src="cid:elevate-login-logo" alt="Elevate" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0"><div style="margin-top:10px;font-size:14px;color:#64748b">Client Portal · Account notification</div></td></tr>
<tr><td class="email-pad" style="padding:30px 40px">
<div style="color:#059669;font-size:14px;font-weight:700;margin-bottom:10px">✓ SIGN-IN SUCCESSFUL</div>
<h1 style="font-size:26px;line-height:1.2;margin:0 0 20px;font-weight:700;color:#0f172a">You’re signed in.</h1>
<p style="margin:0 0 10px;font-weight:600">Hello ${escapeHtml(email.name)},</p>
<p style="margin:0 0 25px;color:#64748b">You’ve successfully signed in to the Elevate Client Portal with your Google account.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;table-layout:fixed"><tr><td style="padding:15px 20px"><div style="font-size:14px;font-weight:700;margin-bottom:5px">Your sign-in details</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed">${details}</table></td></tr></table>
<p style="margin:25px 0 20px;color:#64748b">You can now schedule a meeting and track your appointments.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#f97316" style="border-radius:10px;text-align:center"><a href="${escapeHtml(clientPortalUrl())}" style="display:inline-block;padding:15px 25px;background:#f97316;color:#ffffff;font-weight:700;text-decoration:none;border-radius:10px">Open Client Portal &nbsp; →</a></td></tr></table>
<div style="border-top:1px solid #e2e8f0;margin-top:30px;padding-top:20px;font-size:14px;color:#64748b"><strong style="color:#0f172a">Wasn’t you?</strong><br>If you didn’t sign in, <a href="https://myaccount.google.com/security" style="color:#0f172a;text-decoration:underline">review your Google account security</a> and contact the Elevate administrator.</div>
</td></tr><tr><td class="email-pad" style="padding:20px 40px;background:#f1f5f9;border-radius:0 0 15px 15px;font-size:14px;color:#64748b"><strong style="color:#0f172a">The Elevate Team</strong><br>Calendar &amp; Appointment Management</td></tr></table>
<div style="padding-top:15px;text-align:center;color:#64748b;font-size:14px">This is an automated account notification.<br>No reply is needed.</div>
</td></tr></table></body></html>`;
}
