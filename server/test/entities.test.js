import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';

process.env.DB_PATH = path.join(os.tmpdir(), `fleetpilot-test-entities-${Date.now()}.db`);
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/app.js');
const { outbox } = await import('../src/utils/mailer.js');
const request = (await import('supertest')).default;

let token;

const authed = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);

before(async () => {
  const email = 'fleet-manager@example.com';
  await request(app).post('/api/auth/register').send({ email, password: 'super-secret-1' });
  const otp = [...outbox].reverse().find((m) => m.to === email).text.match(/code is (\d{6})/)[1];
  const verify = await request(app).post('/api/auth/verify-otp').send({ email, otpCode: otp });
  token = verify.body.access_token;
});

describe('entity CRUD', () => {
  it('rejects requests with no auth token', async () => {
    const res = await request(app).get('/api/entities/Vehicle');
    assert.equal(res.status, 401);
  });

  it('rejects unknown entity names', async () => {
    const res = await authed('get', '/api/entities/NotAThing');
    assert.equal(res.status, 404);
  });

  it('validates required fields on create', async () => {
    const res = await authed('post', '/api/entities/Vehicle').send({ make: 'Toyota' });
    assert.equal(res.status, 400);
  });

  it('creates, reads, updates, lists, filters and deletes a Vehicle', async () => {
    const create = await authed('post', '/api/entities/Vehicle').send({
      plate_number: 'DHK-1234',
      make: 'Toyota',
      model: 'Hiace',
      odometer: 1000,
    });
    assert.equal(create.status, 201);
    assert.equal(create.body.status, 'active');
    assert.ok(create.body.id);
    const id = create.body.id;

    const get = await authed('get', `/api/entities/Vehicle/${id}`);
    assert.equal(get.status, 200);
    assert.equal(get.body.plate_number, 'DHK-1234');

    const update = await authed('patch', `/api/entities/Vehicle/${id}`).send({ odometer: 2500 });
    assert.equal(update.status, 200);
    assert.equal(update.body.odometer, 2500);

    const list = await authed('get', '/api/entities/Vehicle').query({ sort: '-created_date', limit: 10 });
    assert.equal(list.status, 200);
    assert.ok(list.body.some((v) => v.id === id));

    const filtered = await authed('post', '/api/entities/Vehicle/query').send({ plate_number: 'DHK-1234' });
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.length, 1);

    const del = await authed('delete', `/api/entities/Vehicle/${id}`);
    assert.equal(del.status, 204);

    const afterDelete = await authed('get', `/api/entities/Vehicle/${id}`);
    assert.equal(afterDelete.status, 404);
  });

  it('rejects sorting or filtering by an unknown column (SQL-injection guard)', async () => {
    const badSort = await authed('get', '/api/entities/Vehicle').query({ sort: '-id; DROP TABLE vehicles;--' });
    assert.equal(badSort.status, 400);

    const badFilter = await authed('post', '/api/entities/Vehicle/query').send({
      'id; DROP TABLE vehicles;--': 1,
    });
    assert.equal(badFilter.status, 400);
  });

  it('supports the trip lifecycle used by the driver portal', async () => {
    const vehicle = await authed('post', '/api/entities/Vehicle').send({
      plate_number: 'DHK-9999',
      make: 'Ford',
      model: 'Transit',
      odometer: 5000,
    });
    const driver = await authed('post', '/api/entities/Driver').send({
      full_name: 'Jane Doe',
      email: 'jane@example.com',
    });
    const trip = await authed('post', '/api/entities/Trip').send({
      vehicle_id: vehicle.body.id,
      driver_id: driver.body.id,
      start_odometer: 5000,
    });
    assert.equal(trip.body.status, 'assigned');

    const started = await authed('patch', `/api/entities/Trip/${trip.body.id}`).send({
      status: 'in_progress',
      start_time: new Date().toISOString(),
    });
    assert.equal(started.body.status, 'in_progress');

    const completed = await authed('patch', `/api/entities/Trip/${trip.body.id}`).send({
      status: 'completed',
      end_odometer: 5120,
      distance_km: 120,
    });
    assert.equal(completed.body.distance_km, 120);

    const tripsForDriver = await authed('post', '/api/entities/Trip/query').send({ driver_id: driver.body.id });
    assert.equal(tripsForDriver.body.length, 1);
  });
});
