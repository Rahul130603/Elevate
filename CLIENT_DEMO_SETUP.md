# Client-only ngrok demo

Demo URL: https://ducky-scrubbed-undoing.ngrok-free.dev/?mode=book

Run the main project with `npm run server`. In another terminal run `npm run demo:client`. The official ngrok SDK forwards the public HTTPS URL to the dedicated gateway on 127.0.0.1:3001. Keep both processes and this laptop's internet connection running. To stop the demo, press Ctrl+C in its terminal.

The gateway forces the client portal and hides other portal choices. It denies admin, user, events, bookings workspace and admin-news routes. Client data requires a gateway session from a successful server-side client login; query identifiers are replaced with that session's identity, and mutations verify booking ownership. Client logout revokes this session. Gateway restarts require clients to sign in again.

NGROK_AUTHTOKEN and NGROK_DOMAIN are stored only in the ignored .env file. No token is printed. Use a reserved domain so the Google authorized origin does not change. The initial ngrok free-domain Visit Site screen is expected.

Google login still needs GOOGLE_CLIENT_ID in .env. In the existing Google Cloud project, register both http://localhost:3000 and https://ducky-scrubbed-undoing.ngrok-free.dev as authorized JavaScript origins. The app uses Google's own button and server token verification, with email/profile only. No client secret is needed for this popup flow. A configured mail sender is required for login-success email delivery. See GOOGLE_LOGIN_SETUP.md.

Checks: `npm run demo:test` covers route isolation, HttpOnly session cookies, identity scoping, booking ownership, cross-origin mutations and logout. Real public smoke checks verified client availability 200, workspace APIs 403 and unauthenticated client data 401. Real Google sign-in and inbox delivery still need account configuration and an end-to-end test.
# Client account registration

Clients can choose Sign up or Log in. Registration checks the shared database, including existing Google accounts, and returns HTTP 409 with `ACCOUNT_EXISTS` for an existing email or phone. Email matching ignores casing and surrounding whitespace; a database unique index prevents concurrent duplicate emails. A rejected registration does not change the original account or password. The interface displays “You already have an account. Please log in.” and switches to the login tab with the email filled in. Password and Google login continue to use the existing account from any device connected to the same server.

