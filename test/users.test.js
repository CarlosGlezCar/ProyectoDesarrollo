const request = require('supertest');
const app = require('../app');

describe('GET /api/users', () => {
  test('debe responder con código 200 y una lista de usuarios', async () => {
    const response = await request(app).get('/api/users');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Users list');
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('POST /api/users', () => {
  test('debe crear un usuario y responder con código 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'Usuario de prueba'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('message', 'user created');
    expect(response.body).toHaveProperty('data');
    expect(typeof response.body.data).toBe('object');
  });
});

describe('GET /api/users/:id', () => {
  test('debe consultar un usuario utilizando el parámetro id', async () => {
    const response = await request(app).get('/api/users/123');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'User by id');
    expect(response.body).toHaveProperty('data');
  });
});

describe('PUT /api/users/:id', () => {
  test('debe actualizar un usuario y responder con código 200', async () => {
    const response = await request(app)
      .put('/api/users/123')
      .send({
        name: 'Usuario actualizado'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'User update');
    expect(response.body).toHaveProperty('data');
  });
});

describe('DELETE /api/users/:id', () => {
  test('debe eliminar un usuario y responder con código 200', async () => {
    const response = await request(app).delete('/api/users/123');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'User delete');
    expect(response.body).toHaveProperty('data');
  });
});

describe('Rutas inexistentes', () => {
  test(
    'debe responder con código 404 cuando la ruta no existe',
    async () => {
      const response = await request(app)
        .get('/api/recurso-inexistente')
        .timeout({ response: 15000, deadline: 20000 });

      expect(response.statusCode).toBe(404);
      expect(response.text).toContain('Not Found');
    },
    15000
  );
});

describe('Solicitudes incorrectas', () => {
  test(
    'debe responder con código 404 cuando se usa un método no soportado',
    async () => {
      const response = await request(app)
        .patch('/api/users/123')
        .timeout({ response: 15000, deadline: 20000 });

      expect(response.statusCode).toBe(404);
    },
    15000
  );
});