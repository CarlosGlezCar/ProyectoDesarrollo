const { api } = require('./helpers');

describe('GET /health', () => {
  test('debe responder 200', async () => {
    const response = await api().get('/health');

    expect(response.statusCode).toBe(200);
  });

  test('el body debe ser exactamente {"status":"UP"}', async () => {
    const response = await api().get('/health');

    expect(response.body).toEqual({ status: 'UP' });
  });

  test('no requiere token', async () => {
    const response = await api().get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'UP' });
  });
});
