import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
const verifier = new OAuth2Client();
export function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || process.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
}
export async function verifyGoogleCredential(credential, nonce, options = {}) {
  const audience = options.audience || googleClientId();
  if (!audience) { const error = new Error('Google Sign-In is not configured.'); error.status = 503; throw error; }
  if (typeof credential !== 'string' || !credential || credential.length > 16000 || !nonce) {
    const error = new Error('Please sign in using the real Google account button.'); error.status = 401; throw error;
  }
  try {
    const ticket = await (options.verifier || verifier).verifyIdToken({idToken: credential, audience});
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== nonce) throw new Error('Unverified account.');
    return {googleId: payload.sub, email: payload.email.toLowerCase(), name: payload.name || payload.email.split('@')[0], picture: payload.picture || ''};
  } catch (cause) {
    // Keep the token private while logging the verifier's actionable failure reason.
    console.warn('Google ID token verification rejected:', cause?.code || cause?.name || 'verification_error', cause?.message || 'unknown verifier error');
    const error = new Error('Google account verification failed. Please sign in again.'); error.status = 401; throw error;
  }
}

const challenges = new Map();
export function issueGoogleNonce() {
  for (const [key, expiry] of challenges) if (expiry <= Date.now()) challenges.delete(key);
  if (challenges.size >= 1000) challenges.delete(challenges.keys().next().value);
  const nonce = randomBytes(32).toString('hex');
  challenges.set(nonce, Date.now() + 5 * 60 * 1000);
  return nonce;
}
export function consumeGoogleNonce(nonce) {
  const expiry = challenges.get(nonce);
  challenges.delete(nonce);
  return expiry && expiry > Date.now() ? nonce : undefined;
}
