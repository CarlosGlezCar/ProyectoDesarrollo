
const request = require('supertest');
const app = require('../app');

describe('Autenticación de rutas de usuarios', () => {
  const rutas = [
    ['get', '/api/users'],
    ['post', '/api/users'],
    ['get', '/api/users/123'],
    ['put', '/api/users/123'],
    ['delete', '/api/users/123']
  ];

  test.each(rutas)(
    '%s %s debe responder 401 sin token',
    async (metodo, ruta) => {
      const response = await request(app)
        [metodo](ruta)
        .set('Accept-Language', 'es');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data', null);
    }
  );
});

describe('Rutas inexistentes', () => {
  test('debe responder 404 con mensaje en español', async () => {
    const response = await request(app)
      .get('/api/recurso-inexistente')
      .set('Accept-Language', 'es');

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      message: 'Recurso no encontrado',
      data: null
    });
  });

  test('debe responder 404 con método no soportado', async () => {
    const response = await request(app)
      .patch('/api/users/123');

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('data', null);
  });
});