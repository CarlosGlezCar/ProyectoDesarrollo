const request = require('supertest');
const { UniqueConstraintError } = require('sequelize');
const app = require('../app');
const { Permission } = require('../models/sql');
const { mockSession } = require('./helpers/session');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const validPermission = {
  key: 'reports:read:any',
  description: 'Consultar reportes'
};

describe('Rutas de permisos (con mocks)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({
      permissions: [
        'permissions:create:any',
        'permissions:read:any',
        'permissions:update:any',
        'permissions:delete:any'
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/permissions', () => {
    test('responde 200 con la lista y el mensaje traducido', async () => {
      jest.spyOn(Permission, 'findAll').mockResolvedValue([
        { id: 1, key: 'products:read:any' }
      ]);

      const response = await request(app)
        .get('/api/permissions')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.permissions.list);
      expect(response.body.data).toEqual([{ id: 1, key: 'products:read:any' }]);
    });

    test('responde en inglés con Accept-Language: en', async () => {
      jest.spyOn(Permission, 'findAll').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/permissions')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.permissions.list);
    });
  });

  describe('GET /api/permissions/:id', () => {
    test('responde 200 con el permiso', async () => {
      jest.spyOn(Permission, 'findByPk').mockResolvedValue({ id: 4, key: 'products:read:any' });

      const response = await request(app)
        .get('/api/permissions/4')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.permissions.found);
      expect(response.body.data.key).toBe('products:read:any');
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Permission, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/permissions/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.permissions.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .get('/api/permissions/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });
  });

  describe('POST /api/permissions', () => {
    test('responde 201 y crea el permiso con la convención recurso:acción:alcance', async () => {
      const create = jest.spyOn(Permission, 'create').mockResolvedValue({ id: 20, ...validPermission });

      const response = await request(app)
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validPermission);

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.permissions.created);
      expect(create.mock.calls[0][0]).toEqual(validPermission);
    });

    test('responde 400 si la clave ya existe', async () => {
      jest.spyOn(Permission, 'create').mockRejectedValue(
        new UniqueConstraintError({ message: 'key must be unique' })
      );

      const response = await request(app)
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validPermission);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.duplicate);
    });

    test('responde 400 con clave vacía y su mensaje', async () => {
      const create = jest.spyOn(Permission, 'create');

      const response = await request(app)
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validPermission, key: '   ' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.permissions.keyRequired);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['sin dos puntos', 'reportes'],
      ['con acción inválida', 'reports:write:any'],
      ['con alcance inválido', 'reports:read:all'],
      ['con mayúsculas en el recurso', 'Reports:read:any'],
      ['con una parte de más', 'reports:read:any:extra'],
      ['con una parte de menos', 'reports:read']
    ])('responde 400 con clave %s y el mensaje de formato', async (_caso, key) => {
      const create = jest.spyOn(Permission, 'create');

      const response = await request(app)
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validPermission, key });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.permissions.invalidKey);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['sin body', undefined],
      ['sin description', { key: 'reports:read:any' }],
      ['sin key', { description: 'Consultar reportes' }],
      ['con key que no es texto', { key: 5, description: 'Consultar reportes' }],
      ['con un campo no permitido', { ...validPermission, isAdmin: true }]
    ])('responde 400 %s y no llama a la base', async (_caso, body) => {
      const create = jest.spyOn(Permission, 'create');

      const response = await request(app)
        .post('/api/permissions')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('PUT y DELETE /api/permissions/:id', () => {
    test('PUT responde 200 y actualiza la descripción', async () => {
      const update = jest.fn().mockResolvedValue();
      jest.spyOn(Permission, 'findByPk').mockResolvedValue({ id: 4, update });

      const response = await request(app)
        .put('/api/permissions/4')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ description: 'Nueva descripción' });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.permissions.updated);
      expect(update.mock.calls[0][0]).toEqual({ description: 'Nueva descripción' });
    });

    test('PUT responde 400 con una clave de formato inválido y no consulta la base', async () => {
      const find = jest.spyOn(Permission, 'findByPk');

      const response = await request(app)
        .put('/api/permissions/4')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ key: 'clave-mala' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.permissions.invalidKey);
      expect(find).not.toHaveBeenCalled();
    });

    test('PUT responde 404 si no existe', async () => {
      jest.spyOn(Permission, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .put('/api/permissions/999')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ description: 'Texto' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.permissions.notFound);
    });

    test('DELETE responde 200 y elimina', async () => {
      const destroy = jest.fn().mockResolvedValue();
      jest.spyOn(Permission, 'findByPk').mockResolvedValue({ id: 4, destroy });

      const response = await request(app)
        .delete('/api/permissions/4')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.permissions.deleted);
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    test('DELETE responde 404 si no existe', async () => {
      jest.spyOn(Permission, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/permissions/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.permissions.notFound);
    });
  });

  describe('Permisos (solo ADMIN gestiona permisos)', () => {
    test.each([
      ['get', '/api/permissions'],
      ['post', '/api/permissions'],
      ['get', '/api/permissions/4'],
      ['put', '/api/permissions/4'],
      ['delete', '/api/permissions/4']
    ])('%s %s responde 403 a un rol sin permisos sobre permissions', async (metodo, ruta) => {
      const sinPermiso = mockSession({
        roleId: 2,
        permissions: ['products:read:any', 'orders:read:any']
      });
      const create = jest.spyOn(Permission, 'create');
      const findAll = jest.spyOn(Permission, 'findAll');

      const response = await request(app)
        [metodo](ruta)
        .set('Accept-Language', 'es')
        .set(sinPermiso)
        .send(metodo === 'post' ? validPermission : undefined);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(create).not.toHaveBeenCalled();
      expect(findAll).not.toHaveBeenCalled();
    });
  });
});