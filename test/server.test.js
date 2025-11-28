const request = require('supertest');
const app = require('../server');

describe('GET /api/time', () => {
  test('responds with JSON containing time', async () => {
    const res = await request(app).get('/api/time');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('time');
    expect(new Date(res.body.time).toString()).not.toBe('Invalid Date');
  });
});
