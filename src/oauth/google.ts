import { OAuth2Client } from 'google-auth-library';

let client: OAuth2Client | null = null;

export function getGoogleClient(): OAuth2Client {
  const cid = process.env.GOOGLE_CLIENT_ID;
  const csec = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT_URI;

  if (!cid || !csec || !redirect) {
    throw new Error('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI');
  }
  if (!client) {
    client = new OAuth2Client(cid, csec, redirect);
  }
  return client;
}
