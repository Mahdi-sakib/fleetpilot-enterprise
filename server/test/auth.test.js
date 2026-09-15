import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.TEST_DB_PORT || '3307';
process.env.DB_USER = process.env.TEST_DB_USER || 'root';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test';
process.env.DB_NAME = `fleetpilot_test_auth_${Date.now()}`;
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/app.js');
const { outbox } = await import('../src/utils/mailer.js');
const request = (await import('supertest')).default;

const lastMailTo = (to) => [...outbox].reverse().find((m) => m.to === to);
const extractOtp = (text) => text.match(/code is (\d{6})/)[1];
const extractResetToken = (text) => text.match(/token=([a-f0-9]+)/)[1];

describe('auth flow', () => {
  it('registers, verifies via OTP, and returns a usable token', async () => {
    const email = 'driver@example.com';
    const password = 'correct-horse-battery';

    const registerRes = await request(app).post('/api/auth/register').send({ email, password });
    assert.equal(registerRes.status, 201);

    const otp = extractOtp(lastMailTo(email).text);
    const verifyRes = await request(app).post('/api/auth/verify-otp').send({ email, otpCode: otp });
    assert.equal(verifyRes.status, 200);
    assert.ok(verifyRes.body.access_token);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${verifyRes.body.access_token}`);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.email, email);
    assert.equal(meRes.body.email_verified, true);
  });

  it('rejects login before email verification, then allows it after', async () => {
    const email = 'pending@example.com';
    const password = 'correct-horse-battery';
    await request(app).post('/api/auth/register').send({ email, password });

    const earlyLogin = await request(app).post('/api/auth/login').send({ email, password });
    assert.equal(earlyLogin.status, 403);

    const otp = extractOtp(lastMailTo(email).text);
    await request(app).post('/api/auth/verify-otp').send({ email, otpCode: otp });

    const login = await request(app).post('/api/auth/login').send({ email, password });
    assert.equal(login.status, 200);
    assert.ok(login.body.access_token);
  });

  it('rejects an invalid password', async () => {
    const email = 'wrongpass@example.com';
    await request(app).post('/api/auth/register').send({ email, password: 'correct-horse-battery' });
    const otp = extractOtp(lastMailTo(email).text);
    await request(app).post('/api/auth/verify-otp').send({ email, otpCode: otp });

    const res = await request(app).post('/api/auth/login').send({ email, password: 'nope-nope-nope' });
    assert.equal(res.status, 401);
  });

  it('completes a forgot-password / reset-password round trip', async () => {
    const email = 'reset@example.com';
    await request(app).post('/api/auth/register').send({ email, password: 'original-password' });
    const otp = extractOtp(lastMailTo(email).text);
    await request(app).post('/api/auth/verify-otp').send({ email, otpCode: otp });

    await request(app).post('/api/auth/forgot-password').send({ email });
    const resetToken = extractResetToken(lastMailTo(email).text);

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken, newPassword: 'brand-new-password' });
    assert.equal(reset.status, 200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email, password: 'original-password' });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(app).post('/api/auth/login').send({ email, password: 'brand-new-password' });
    assert.equal(newLogin.status, 200);
  });

  it('never reveals whether an email exists on forgot-password or resend-otp', async () => {
    const res1 = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    const res2 = await request(app).post('/api/auth/resend-otp').send({ email: 'nobody@example.com' });
    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });
});
