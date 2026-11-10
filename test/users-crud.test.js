const request = require('supertest');
const { UniqueConstraintError } = require('sequelize');
const app = require('../app');
const { User, Role } = require('../models/sql');
const { mockSession } = require('./helpers/session');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const ADMIN_ID = 1;

const validUser = {
  name: 'Ana',
  lastName: 'Prueba',
  email: 'ana.prueba@strideco.test',
  roleId: 3,
  password: 'Prueba123!'
};

function dbUser(extra = {}) {
  return {
    id: 7,
    first_name: 'Ana',
    last_name: 'Prueba',
    email: 'ana.prueba@strideco.test',
    role_id: 3,
    active: true,
    password_hash: '$2b$04$hashSecretoDePrueba',
    salt_key: '$2b$04$saltSecretoDePrueba',
    ...extra
  };
}

function mockTarget(target) {
  User.findByPk.mockImplementation(async id =>
    Number(id) === ADMIN_ID
      ? { id: ADMIN_ID, role_id: 1, active: true }
      : target
  );
}

function expectNoSensitiveData(body) {
  expect(JSON.stringify(body)).not.toMatch(/password|salt/i);
}

describe('Rutas de usuarios (con mocks)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({
      userId: ADMIN_ID,
      permissions: [
        'users:create:any',
        'users:read:any',
        'users:update:any',
        'users:delete:any'
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/users', () => {
    test('responde 200 con la lista sin datos sensibles', async () => {
      jest.spyOn(User, 'findAll').mockResolvedValue([dbUser(), dbUser({ id: 8 })]);

      const response = await request(app)
        .get('/api/users')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.users.list);
      expect(response.body.data).toHaveLength(2);
      expectNoSensitiveData(response.body);
    });

    test('responde en inglés con Accept-Language: en', async () => {
      jest.spyOn(User, 'findAll').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/users')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.users.list);
    });
  });

  describe('GET /api/users/:id', () => {
    test('responde 200 con el usuario y sin datos sensibles', async () => {
      mockTarget(dbUser({ role: { id: 3, name: 'USER' } }));

      const response = await request(app)
        .get('/api/users/7')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.users.found);
      expect(response.body.data.email).toBe('ana.prueba@strideco.test');
      expect(response.body.data.role.name).toBe('USER');
      expectNoSensitiveData(response.body);
    });

    test('responde 404 si no existe', async () => {
      mockTarget(null);

      const response = await request(app)
        .get('/api/users/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.users.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .get('/api/users/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });
  });

  describe('POST /api/users', () => {
    test('responde 201, guarda solo el hash y no devuelve datos sensibles', async () => {
      const create = jest.spyOn(User, 'create').mockResolvedValue(dbUser());

      const response = await request(app)
        .post('/api/users')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validUser);

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.users.created);
      expectNoSensitiveData(response.body);

      const guardado = create.mock.calls[0][0];
      expect(guardado).toMatchObject({
        first_name: 'Ana',
        last_name: 'Prueba',
        email: 'ana.prueba@strideco.test',
        role_id: 3
      });
      expect(guardado).not.toHaveProperty('password');
      expect(guardado.password_hash).toMatch(/^\$2[aby]\$/);
      expect(guardado.password_hash).not.toContain('Prueba123!');
      expect(typeof guardado.salt_key).toBe('string');
    });

    test('responde 400 si el correo ya está registrado', async () => {
      jest.spyOn(User, 'create').mockRejectedValue(
        new UniqueConstraintError({ message: 'email must be unique' })
      );

      const response = await request(app)
        .post('/api/users')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validUser);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.duplicate);
    });

    test('responde 400 si el rol no existe', async () => {
      Role.findByPk.mockImplementation(async id =>
        id === 1 ? { id: 1, permissions: [{ key: 'users:create:any' }] } : null
      );
      const create = jest.spyOn(User, 'create');

      const response = await request(app)
        .post('/api/users')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validUser, roleId: 99999999 });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.users.invalidRole);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['con password vacío', { ...validUser, password: '' }, 'passwordRequired'],
      ['con password de más de 72 bytes', { ...validUser, password: 'a'.repeat(73) }, 'passwordTooLong'],
      ['con correo inválido', { ...validUser, email: 'correo-no-valido' }, 'invalidEmail']
    ])('responde 400 %s con su mensaje', async (_caso, body, clave) => {
      const create = jest.spyOn(User, 'create');

      const response = await request(app)
        .post('/api/users')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.users[clave]);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['sin body', undefined],
      ['sin name', { ...validUser, name: undefined }],
      ['sin el campo password', { ...validUser, password: undefined }],
      ['con roleId mal formado', { ...validUser, roleId: 'abc' }],
      ['con un campo no permitido', { ...validUser, isAdmin: true }]
    ])('responde 400 %s y no llama a la base', async (_caso, body) => {
      const create = jest.spyOn(User, 'create');

      const response = await request(app)
        .post('/api/users')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/users/:id', () => {
    test('responde 200, actualiza nombre y apellido y no devuelve datos sensibles', async () => {
      const update = jest.fn().mockResolvedValue();
      mockTarget(dbUser({ update }));

      const response = await request(app)
        .put('/api/users/7')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ name: 'Ana María', lastName: 'Gómez' });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.users.updated);
      expect(update.mock.calls[0][0]).toEqual({
        first_name: 'Ana María',
        last_name: 'Gómez'
      });
      expectNoSensitiveData(response.body);
    });

    test('guarda una contraseña nueva solo como hash', async () => {
      const update = jest.fn().mockResolvedValue();
      mockTarget(dbUser({ update }));

      const response = await request(app)
        .put('/api/users/7')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ password: 'NuevaClave456!' });

      expect(response.statusCode).toBe(200);
      const cambios = update.mock.calls[0][0];
      expect(cambios).not.toHaveProperty('password');
      expect(cambios.password_hash).toMatch(/^\$2[aby]\$/);
      expectNoSensitiveData(response.body);
    });

    test('desactiva al usuario con active false', async () => {
      const update = jest.fn().mockResolvedValue();
      mockTarget(dbUser({ update }));

      const response = await request(app)
        .put('/api/users/7')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ active: false });

      expect(response.statusCode).toBe(200);
      expect(update.mock.calls[0][0]).toEqual({ active: false });
    });

    test('responde 404 si no existe', async () => {
      mockTarget(null);

      const response = await request(app)
        .put('/api/users/999')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ name: 'Ana' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.users.notFound);
    });

    test('responde 400 con un correo inválido y no consulta al usuario', async () => {
      const response = await request(app)
        .put('/api/users/7')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ email: 'correo-no-valido' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.users.invalidEmail);
    });

    test('responde 400 si el rol nuevo no existe', async () => {
      const update = jest.fn();
      mockTarget(dbUser({ update }));
      Role.findByPk.mockImplementation(async id =>
        id === 1 ? { id: 1, permissions: [{ key: 'users:update:any' }] } : null
      );

      const response = await request(app)
        .put('/api/users/7')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ roleId: 99999999 });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.users.invalidRole);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('responde 200, elimina y no devuelve datos sensibles', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockTarget(dbUser({ destroy }));

      const response = await request(app)
        .delete('/api/users/7')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.users.deleted);
      expect(destroy).toHaveBeenCalledTimes(1);
      expectNoSensitiveData(response.body);
    });

    test('responde 404 si no existe', async () => {
      mockTarget(null);

      const response = await request(app)
        .delete('/api/users/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.users.notFound);
    });
  });

  describe('Permisos (solo ADMIN gestiona usuarios)', () => {
    test.each([
      ['get', '/api/users'],
      ['post', '/api/users'],
      ['get', '/api/users/7'],
      ['put', '/api/users/7'],
      ['delete', '/api/users/7']
    ])('%s %s responde 403 a un rol sin permisos sobre users', async (metodo, ruta) => {
      const sinPermiso = mockSession({
        roleId: 2,
        permissions: ['products:read:any', 'orders:read:any']
      });
      const create = jest.spyOn(User, 'create');
      const findAll = jest.spyOn(User, 'findAll');

      const response = await request(app)
        [metodo](ruta)
        .set('Accept-Language', 'es')
        .set(sinPermiso)
        .send(metodo === 'post' ? validUser : undefined);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(create).not.toHaveBeenCalled();
      expect(findAll).not.toHaveBeenCalled();
    });
  });
});