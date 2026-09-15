import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { get, run } from '../db.js';
import { config } from '../config.js';
import { newId, newOtp, newToken } from '../utils/ids.js';
import { hashPassword, verifyPassword } from '../utils/passwords.js';
import { signAccessToken } from '../utils/tokens.js';
import { sendMail } from '../utils/mailer.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Only guards the abuse-prone endpoints (credential checks, OTP/reset
// issuance). /me and /me updates are called on every page load/reload by
// AuthContext, so rate-limiting the whole router would lock out normal use.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  driver_id: u.driver_id,
  email_verified: !!u.email_verified,
});

const findByEmail = (email) => get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);

const safeReturnTo = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
};

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || 'Invalid input');
  const { email, password } = parsed.data;
  const emailLower = email.toLowerCase();

  const existing = await findByEmail(emailLower);
  if (existing && existing.email_verified) {
    throw new ApiError(409, 'An account with that email already exists');
  }

  const now = new Date().toISOString();
  const otp = newOtp();
  const otpExpires = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const password_hash = await hashPassword(password);

  if (existing) {
    await run('UPDATE users SET password_hash = ?, otp_code = ?, otp_expires_at = ?, updated_date = ? WHERE id = ?', [
      password_hash,
      otp,
      otpExpires,
      now,
      existing.id,
    ]);
  } else {
    await run(
      `INSERT INTO users (id, email, password_hash, role, email_verified, otp_code, otp_expires_at, created_date, updated_date)
       VALUES (?, ?, ?, 'user', 0, ?, ?, ?, ?)`,
      [newId(), emailLower, password_hash, otp, otpExpires, now, now],
    );
  }
  await sendMail({
    to: emailLower,
    subject: 'Verify your FleetPilot Enterprise account',
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
  });
  res.status(201).json({ message: 'Verification code sent' });
}));

router.post('/resend-otp', authLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase();
  const user = await findByEmail(email);
  if (user && !user.email_verified) {
    const otp = newOtp();
    const otpExpires = new Date(Date.now() + OTP_TTL_MS).toISOString();
    await run('UPDATE users SET otp_code = ?, otp_expires_at = ?, updated_date = ? WHERE id = ?', [
      otp,
      otpExpires,
      new Date().toISOString(),
      user.id,
    ]);
    sendMail({
      to: email,
      subject: 'Your new FleetPilot Enterprise verification code',
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    }).catch((err) => console.error('Failed to send OTP email:', err.message));
  }
  // Same response whether or not the account exists, so this can't be used to enumerate emails.
  res.json({ message: 'If an account exists, a new code was sent' });
}));

router.post('/verify-otp', authLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase();
  const otpCode = String(req.body?.otpCode || '');
  const user = await findByEmail(email);
  if (!user || !user.otp_code || user.otp_code !== otpCode) {
    throw new ApiError(400, 'Invalid verification code');
  }
  if (new Date(user.otp_expires_at).getTime() < Date.now()) {
    throw new ApiError(400, 'Verification code expired');
  }
  await run("UPDATE users SET email_verified = 1, otp_code = NULL, otp_expires_at = NULL, updated_date = ? WHERE id = ?", [
    new Date().toISOString(),
    user.id,
  ]);
  const updated = await get('SELECT * FROM users WHERE id = ?', [user.id]);
  res.json({ access_token: signAccessToken(updated), user: publicUser(updated) });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Invalid email or password');
  const user = await findByEmail(parsed.data.email);
  if (!user || !user.password_hash) throw new ApiError(401, 'Invalid email or password');
  const ok = await verifyPassword(parsed.data.password, user.password_hash);
  if (!ok) throw new ApiError(401, 'Invalid email or password');
  if (!user.email_verified) throw new ApiError(403, 'Please verify your email before logging in');
  res.json({ access_token: signAccessToken(user), user: publicUser(user) });
}));

router.post('/forgot-password', authLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase();
  const user = await findByEmail(email);
  if (user) {
    const token = newToken();
    const expires = new Date(Date.now() + RESET_TTL_MS).toISOString();
    await run('UPDATE users SET reset_token = ?, reset_token_expires_at = ?, updated_date = ? WHERE id = ?', [
      token,
      expires,
      new Date().toISOString(),
      user.id,
    ]);
    const link = `${config.clientUrl}/reset-password?token=${token}`;
    sendMail({
      to: email,
      subject: 'Reset your FleetPilot Enterprise password',
      text: `Reset your password: ${link}\nThis link expires in 1 hour.`,
    }).catch((err) => console.error('Failed to send reset email:', err.message));
  }
  res.json({ message: 'If an account exists, a reset link was sent' });
}));

router.post('/reset-password', authLimiter, asyncHandler(async (req, res) => {
  const resetToken = String(req.body?.resetToken || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!resetToken) throw new ApiError(400, 'Missing reset token');
  if (newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const user = await get('SELECT * FROM users WHERE reset_token = ?', [resetToken]);
  if (!user || !user.reset_token_expires_at || new Date(user.reset_token_expires_at).getTime() < Date.now()) {
    throw new ApiError(400, 'Reset link is invalid or has expired');
  }
  const password_hash = await hashPassword(newPassword);
  await run("UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires_at = ?, updated_date = ? WHERE id = ?", [
    password_hash,
    null,
    new Date().toISOString(),
    user.id,
  ]);
  res.json({ message: 'Password reset' });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const { driver_id } = req.body || {};
  await run('UPDATE users SET driver_id = ?, updated_date = ? WHERE id = ?', [
    driver_id ?? null,
    new Date().toISOString(),
    req.user.id,
  ]);
  res.json(publicUser(await get('SELECT * FROM users WHERE id = ?', [req.user.id])));
}));

// --- Google OAuth (authorization-code flow, no extra SDK dependency) ---

router.get('/google/start', (req, res) => {
  const returnTo = safeReturnTo(req.query.returnTo);
  if (!config.google.clientId || !config.google.redirectUri) {
    return res.redirect(`/login?error=google_not_configured&returnTo=${encodeURIComponent(returnTo)}`);
  }
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: returnTo,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
  const returnTo = safeReturnTo(req.query.state);
  const code = req.query.code;
  if (!code || !config.google.clientId || !config.google.clientSecret) {
    return res.redirect(`/login?error=google_failed`);
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw new Error('Token exchange failed');
    const tokenData = await tokenRes.json();

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) throw new Error('Failed to fetch Google profile');
    const profile = await profileRes.json();
    const email = String(profile.email || '').toLowerCase();
    if (!email) throw new Error('Google account has no email');

    let user = await get('SELECT * FROM users WHERE google_id = ? OR email = ?', [profile.sub, email]);
    const now = new Date().toISOString();
    if (!user) {
      const id = newId();
      await run(
        `INSERT INTO users (id, email, role, email_verified, google_id, created_date, updated_date)
         VALUES (?, ?, 'user', 1, ?, ?, ?)`,
        [id, email, profile.sub, now, now],
      );
      user = await get('SELECT * FROM users WHERE id = ?', [id]);
    } else if (!user.google_id || !user.email_verified) {
      await run('UPDATE users SET google_id = ?, email_verified = 1, updated_date = ? WHERE id = ?', [
        profile.sub,
        now,
        user.id,
      ]);
      user = await get('SELECT * FROM users WHERE id = ?', [user.id]);
    }

    const accessToken = signAccessToken(user);
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}access_token=${accessToken}`);
  } catch (err) {
    console.error('Google OAuth failed:', err.message);
    res.redirect('/login?error=google_failed');
  }
});

export default router;
