import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.TEST_DB_PORT || '3307';
process.env.DB_USER = process.env.TEST_DB_USER || 'root';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test';
process.env.DB_NAME = `fleetpilot_test_master_${Date.now()}`;
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/app.js');
const { outbox } = await import('../src/utils/mailer.js');
const request = (await import('supertest')).default;

let token;

const authed = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);

before(async () => {
  const email = 'master-admin@example.com';
  await request(app).post('/api/auth/register').send({ email, password: 'super-secret-1' });
  const otp = [...outbox].reverse().find((m) => m.to === email).text.match(/code is (\d{6})/)[1];
  const verify = await request(app).post('/api/auth/verify-otp').send({ email, otpCode: otp });
  token = verify.body.access_token;
});

describe('master data', () => {
  it('seeds VehicleType and FuelType so existing vehicle values keep resolving', async () => {
    const types = await authed('get', '/api/entities/VehicleType');
    const fuels = await authed('get', '/api/entities/FuelType');
    assert.ok(types.body.some((t) => t.code === 'van'));
    assert.ok(types.body.some((t) => t.code === 'box_truck'));
    assert.ok(fuels.body.some((f) => f.code === 'diesel'));
  });

  it('supports full CRUD on Location, FuelStation and CostCenter', async () => {
    const location = await authed('post', '/api/entities/Location').send({
      name: 'Dhaka Hub',
      type: 'hub',
      city: 'Dhaka',
    });
    assert.equal(location.status, 201);
    assert.equal(location.body.type, 'hub');

    const updated = await authed('patch', `/api/entities/Location/${location.body.id}`).send({ city: 'Chattogram' });
    assert.equal(updated.body.city, 'Chattogram');

    const station = await authed('post', '/api/entities/FuelStation').send({ name: 'Padma Fuel', brand: 'Padma' });
    assert.equal(station.status, 201);

    const costCenter = await authed('post', '/api/entities/CostCenter').send({ name: 'Acme Corp', type: 'customer' });
    assert.equal(costCenter.status, 201);
    assert.equal(costCenter.body.type, 'customer');

    const del = await authed('delete', `/api/entities/Location/${location.body.id}`);
    assert.equal(del.status, 204);
    assert.equal((await authed('get', `/api/entities/Location/${location.body.id}`)).status, 404);
  });

  it('accepts a vehicle type/fuel type by code without a fixed enum', async () => {
    const vehicle = await authed('post', '/api/entities/Vehicle').send({
      plate_number: 'DHK-5555',
      make: 'Isuzu',
      model: 'NPR',
      type: 'box_truck',
      fuel_type: 'diesel',
    });
    assert.equal(vehicle.status, 201);
    assert.equal(vehicle.body.type, 'box_truck');
  });

  it('accepts an optional cost_center on a trip', async () => {
    const vehicle = await authed('post', '/api/entities/Vehicle').send({ plate_number: 'DHK-6666', make: 'Ford', model: 'Transit' });
    const driver = await authed('post', '/api/entities/Driver').send({ full_name: 'Cost Center Driver', email: 'ccd@example.com' });
    const trip = await authed('post', '/api/entities/Trip').send({
      vehicle_id: vehicle.body.id,
      driver_id: driver.body.id,
      cost_center: 'Acme Corp',
    });
    assert.equal(trip.status, 201);
    assert.equal(trip.body.cost_center, 'Acme Corp');
  });
});
