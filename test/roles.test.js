const request = require('supertest');
const { UniqueConstraintError } = require('sequelize');
const app = require('../app');
const { Role, Permission, sequelize } = require('../models/sql');
const { mockSession } = require('./helpers/session');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const SESSION_ROLE_ID = 1;

const validRole = {
  name: 'SUPERVISOR',
  description: 'Rol de prueba con mocks'
};

function mockTarget(target) {
  Role.findByPk.mockImplementation(async id =>
    Number(id) === SESSION_ROLE_ID
      ? {
          id: SESSION_ROLE_ID,
          permissions: [
            'roles:create:any',
            'roles:read:any',
            'roles:update:any',
            'roles:delete:any'
          ].map(key => ({ key }))
        }
      : target
  );
}

describe('Rutas de roles (con mocks)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({
      roleId: SESSION_ROLE_ID,
      permissions: [
        'roles:create:any',
        'roles:read:any',
        'roles:update:any',
        'roles:delete:any'
      ]
    });

    jest.spyOn(sequelize, 'transaction').mockImplementation(async callback =>
      callback({ LOCK: { UPDATE: 'UPDATE' } })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/roles', () => {
    test('responde 200 con la lista y los permisos de cada rol', async () => {
      jest.spyOn(Role, 'findAll').mockResolvedValue([
        { id: 2, name: 'SALES', permissions: [{ id: 1, key: 'orders:read:any' }] }
      ]);

      const response = await request(app)
        .get('/api/roles')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.roles.list);
      expect(response.body.data[0].permissions[0].key).toBe('orders:read:any');
    });

    test('responde en inglés con Accept-Language: en', async () => {
      jest.spyOn(Role, 'findAll').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/roles')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.roles.list);
    });
  });

  describe('GET /api/roles/:id', () => {
    test('responde 200 con el rol', async () => {
      mockTarget({ id: 5, name: 'SUPERVISOR', permissions: [] });

      const response = await request(app)
        .get('/api/roles/5')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.roles.found);
      expect(response.body.data.name).toBe('SUPERVISOR');
    });

    test('responde 404 si no existe', async () => {
      mockTarget(null);

      const response = await request(app)
        .get('/api/roles/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.roles.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .get('/api/roles/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });
  });

  describe('POST /api/roles', () => {
    test('responde 201, crea el rol y le asigna los permisos sin duplicados', async () => {
      jest.spyOn(Permission, 'findAll').mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const setPermissions = jest.fn().mockResolvedValue();
      const reload = jest.fn().mockResolvedValue({ id: 5, name: 'SUPERVISOR', permissions: [] });
      const create = jest.spyOn(Role, 'create').mockResolvedValue({ setPermissions, reload });

      const response = await request(app)
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validRole, permissionIds: [1, 2, 2] });

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.roles.created);
      expect(create.mock.calls[0][0]).toEqual(validRole);
      expect(setPermissions.mock.calls[0][0]).toEqual([1, 2]);
    });

    test('sin permissionIds no modifica los permisos', async () => {
      const setPermissions = jest.fn();
      const reload = jest.fn().mockResolvedValue({ id: 5, name: 'SUPERVISOR' });
      jest.spyOn(Role, 'create').mockResolvedValue({ setPermissions, reload });

      const response = await request(app)
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validRole);

      expect(response.statusCode).toBe(201);
      expect(setPermissions).not.toHaveBeenCalled();
    });

    test('responde 400 si algún permiso no existe y no crea el rol', async () => {
      jest.spyOn(Permission, 'findAll').mockResolvedValue([{ id: 1 }]);
      const create = jest.spyOn(Role, 'create');

      const response = await request(app)
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validRole, permissionIds: [1, 99999999] });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidData);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 400 si el nombre del rol ya existe', async () => {
      jest.spyOn(Role, 'create').mockRejectedValue(
        new UniqueConstraintError({ message: 'name must be unique' })
      );

      const response = await request(app)
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validRole);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.duplicate);
    });

    test('responde 400 con nombre vacío y su mensaje', async () => {
      const create = jest.spyOn(Role, 'create');

      const response = await request(app)
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validRole, name: '   ' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.roles.nameRequired);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['sin body', undefined],
      ['sin description', { name: 'SUPERVISOR' }],
      ['con permissionIds que no es arreglo', { ...validRole, permissionIds: 'abc' }],
      ['con un id de permiso inválido', { ...validRole, permissionIds: ['a'] }],
      ['con permissionIds y permissions a la vez', { ...validRole, permissionIds: [1], permissions: [1] }],
      ['con un campo no permitido', { ...validRole, isAdmin: true }]
    ])('responde 400 %s y no llama a la base', async (_caso, body) => {
      const create = jest.spyOn(Role, 'create');

      const response = await request(app)
        .post('/api/roles')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/roles/:id', () => {
    test('responde 200 y actualiza nombre y permisos', async () => {
      jest.spyOn(Permission, 'findAll').mockResolvedValue([{ id: 3 }]);
      const update = jest.fn().mockResolvedValue();
      const setPermissions = jest.fn().mockResolvedValue();
      const reload = jest.fn().mockResolvedValue({ id: 5, name: 'JEFE', permissions: [] });
      mockTarget({ id: 5, update, setPermissions, reload });

      const response = await request(app)
        .put('/api/roles/5')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ name: 'JEFE', permissionIds: [3] });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.roles.updated);
      expect(update.mock.calls[0][0]).toEqual({ name: 'JEFE' });
      expect(setPermissions.mock.calls[0][0]).toEqual([3]);
    });

    test('permissionIds vacío quita todos los permisos', async () => {
      const setPermissions = jest.fn().mockResolvedValue();
      const reload = jest.fn().mockResolvedValue({ id: 5, permissions: [] });
      mockTarget({ id: 5, update: jest.fn(), setPermissions, reload });

      const response = await request(app)
        .put('/api/roles/5')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ permissionIds: [] });

      expect(response.statusCode).toBe(200);
      expect(setPermissions.mock.calls[0][0]).toEqual([]);
    });

    test('responde 404 si el rol no existe', async () => {
      mockTarget(null);

      const response = await request(app)
        .put('/api/roles/999')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ name: 'JEFE' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.roles.notFound);
    });

    test('responde 400 si el nombre queda vacío', async () => {
      const response = await request(app)
        .put('/api/roles/5')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ name: '  ' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.roles.nameRequired);
    });
  });

  describe('DELETE /api/roles/:id', () => {
    test('responde 200 y elimina el rol', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockTarget({ id: 5, name: 'SUPERVISOR', destroy });

      const response = await request(app)
        .delete('/api/roles/5')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.roles.deleted);
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    test('responde 404 si no existe', async () => {
      mockTarget(null);

      const response = await request(app)
        .delete('/api/roles/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.roles.notFound);
    });
  });

  describe('Permisos (solo ADMIN gestiona roles)', () => {
    test.each([
      ['get', '/api/roles'],
      ['post', '/api/roles'],
      ['get', '/api/roles/5'],
      ['put', '/api/roles/5'],
      ['delete', '/api/roles/5']
    ])('%s %s responde 403 a un rol sin permisos sobre roles', async (metodo, ruta) => {
      const sinPermiso = mockSession({
        roleId: 2,
        permissions: ['products:read:any', 'orders:read:any']
      });
      const create = jest.spyOn(Role, 'create');
      const findAll = jest.spyOn(Role, 'findAll');

      const response = await request(app)
        [metodo](ruta)
        .set('Accept-Language', 'es')
        .set(sinPermiso)
        .send(metodo === 'post' ? validRole : undefined);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(create).not.toHaveBeenCalled();
      expect(findAll).not.toHaveBeenCalled();
    });
  });
});