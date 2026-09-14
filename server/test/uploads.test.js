import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';

process.env.DB_PATH = path.join(os.tmpdir(), `fleetpilot-test-uploads-${Date.now()}.db`);
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/app.js');
const { outbox } = await import('../src/utils/mailer.js');
const request = (await import('supertest')).default;

let token;

before(async () => {
  const email = 'uploader@example.com';
  await request(app).post('/api/auth/register').send({ email, password: 'super-secret-1' });
  const otp = [...outbox].reverse().find((m) => m.to === email).text.match(/code is (\d{6})/)[1];
  const verify = await request(app).post('/api/auth/verify-otp').send({ email, otpCode: otp });
  token = verify.body.access_token;
});

describe('file uploads', () => {
  it('rejects uploads without auth', async () => {
    const res = await request(app).post('/api/uploads').attach('file', Buffer.from('hi'), 'receipt.txt');
    assert.equal(res.status, 401);
  });

  it('uploads a file and serves it back statically', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fuel receipt contents'), 'receipt.txt');
    assert.equal(res.status, 201);
    assert.match(res.body.file_url, /^\/uploads\/.+\.txt$/);

    const fetched = await request(app).get(res.body.file_url);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.text, 'fuel receipt contents');
  });

  it('rejects requests with no file', async () => {
    const res = await request(app).post('/api/uploads').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 400);
  });
});
