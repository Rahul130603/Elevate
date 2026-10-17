# Google login and confirmation email setup

The dummy Google chooser has been removed. Only a server-verified Google ID token can create or sign in a Google client. Emails go to the verified Google account email, with a persistent retry queue.

1. Open https://console.cloud.google.com/auth/clients and create/select a project. Complete Google Auth Platform Branding/Audience with the app name Elevate. Create a client with type Web application. Add both http://localhost and http://localhost:3000 as Authorized JavaScript origins. Copy the Client ID ending in .apps.googleusercontent.com into GOOGLE_CLIENT_ID in .env. The popup flow does not need a redirect URI or client secret. See https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid .

2. Choose the Gmail account that should send login notifications. Turn on 2-Step Verification in that Google account, then create an App Password at https://myaccount.google.com/apppasswords . Put the sender address in SMTP_USER, the app password in SMTP_PASS, and the sender address in MAIL_FROM in .env. Keep SMTP_HOST=smtp.gmail.com and SMTP_PORT=587. Use the app password, not your normal Google password. Never paste it into chat. If your account cannot use App Passwords, use another SMTP provider. See https://support.google.com/accounts/answer/185833 .

3. Restart the project server after saving .env. Open http://localhost:3000/?mode=book, click Sign In, and use the real Google button. Check the Google account photo and the sign-in notification in that account's Inbox/Spam. SMTP acceptance is tracked separately from actual inbox arrival; only a real inbox test confirms delivery.

Google Web Client ID is configured in the local ignored .env using the existing My First Project. Authorized origins include https://ducky-scrubbed-undoing.ngrok-free.dev, http://localhost, http://localhost:3000, and http://localhost:3001. Real Google sign-in was verified through the public demo with Rahul's verified account and profile photo on October 5, 2026. No client secret is used by the popup flow.

The app remains in Testing. Basic identity scopes (openid, email, profile) are exempt from the test-user allowlist restriction: https://developers.google.com/identity/protocols/oauth2/production-readiness/overview .

SMTP is configured using the sender's locally saved App Password. Gmail SMTP authentication succeeded on October 5, 2026. The real Google sign-in notification to Rahul was accepted by SMTP and recorded as sent at 5:01:36 PM IST. The recipient confirmed that the email arrived. Unit tests also verify signed-token validation, nonce reuse rejection, and email acceptance/retry behavior with a test mail transport. Credentials remain in the local ignored .env and are not included in this document.

Login emails now use the approved branded HTML design with an inline CID logo, verified account details, India date/time, a Client Portal button, and a plain-text alternative. The sender display name is Elevate. The portal button uses APP_PUBLIC_URL if configured, otherwise NGROK_DOMAIN, otherwise localhost:3000. Set APP_PUBLIC_URL to the public application URL when deploying. A separate email with a [Preview] subject was accepted by SMTP after this design was implemented; it uses the sender's real previous sign-in details and does not create a new login event.
