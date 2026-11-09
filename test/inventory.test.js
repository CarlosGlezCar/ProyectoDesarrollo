const request = require('supertest');
const app = require('../app');
const { Inventory, ProductVariant, sequelize } = require('../models/sql');
const { mockSession } = require('./helpers/session');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

describe('Rutas de inventario (con mocks)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({
      permissions: [
        'inventory:create:any',
        'inventory:read:any',
        'inventory:update:any',
        'inventory:delete:any'
      ]
    });

    jest.spyOn(sequelize, 'transaction').mockImplementation(async callback =>
      callback({ LOCK: { UPDATE: 'UPDATE' } })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/inventory', () => {
    test('responde 200 con la lista y el mensaje traducido', async () => {
      jest.spyOn(Inventory, 'findAll').mockResolvedValue([{ id: 1, stock: 10 }]);

      const response = await request(app)
        .get('/api/inventory')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.inventory.list);
      expect(response.body.data).toEqual([{ id: 1, stock: 10 }]);
    });

    test('responde en inglés con Accept-Language: en', async () => {
      jest.spyOn(Inventory, 'findAll').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/inventory')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.inventory.list);
    });

    test('responde 403 si el rol no tiene inventory:read:any', async () => {
      const findAll = jest.spyOn(Inventory, 'findAll');
      const sinPermiso = mockSession({ permissions: [] });

      const response = await request(app)
        .get('/api/inventory')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(findAll).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/inventory/:id', () => {
    test('responde 200 con el inventario y su variante', async () => {
      jest.spyOn(Inventory, 'findByPk').mockResolvedValue({
        id: 5,
        stock: 10,
        variant: { id: 2 }
      });

      const response = await request(app)
        .get('/api/inventory/5')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.inventory.found);
      expect(response.body.data.variant).toEqual({ id: 2 });
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Inventory, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/inventory/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.inventory.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .get('/api/inventory/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });
  });

  describe('POST /api/inventory', () => {
    test('responde 201 y crea el inventario', async () => {
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue({ id: 2 });
      jest.spyOn(Inventory, 'findOne').mockResolvedValue(null);
      const created = { reload: jest.fn().mockResolvedValue({ id: 9, stock: 10, reserved: 2 }) };
      const create = jest.spyOn(Inventory, 'create').mockResolvedValue(created);

      const response = await request(app)
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ variantId: 2, stock: 10, reserved: 2 });

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.inventory.created);
      expect(create.mock.calls[0][0]).toEqual({ variant_id: 2, stock: 10, reserved: 2 });
    });

    test('usa 0 como valor por defecto de stock y reserved', async () => {
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue({ id: 2 });
      jest.spyOn(Inventory, 'findOne').mockResolvedValue(null);
      const created = { reload: jest.fn().mockResolvedValue({ id: 9 }) };
      const create = jest.spyOn(Inventory, 'create').mockResolvedValue(created);

      const response = await request(app)
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ variantId: 2 });

      expect(response.statusCode).toBe(201);
      expect(create.mock.calls[0][0]).toEqual({ variant_id: 2, stock: 0, reserved: 0 });
    });

    test('responde 404 si la variante no existe', async () => {
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue(null);
      const create = jest.spyOn(Inventory, 'create');

      const response = await request(app)
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ variantId: 99999999, stock: 1 });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.inventory.variantNotFound);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 400 si la variante ya tiene inventario', async () => {
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue({ id: 2 });
      jest.spyOn(Inventory, 'findOne').mockResolvedValue({ id: 1 });
      const create = jest.spyOn(Inventory, 'create');

      const response = await request(app)
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ variantId: 2, stock: 5 });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.duplicate);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['con stock negativo', { variantId: 2, stock: -1 }, 'stockNegative'],
      ['con reserved negativo', { variantId: 2, stock: 5, reserved: -1 }, 'reservedNegative'],
      ['con reserved mayor que stock', { variantId: 2, stock: 5, reserved: 6 }, 'reservedExceedsStock']
    ])('responde 400 %s con su mensaje', async (_caso, body, clave) => {
      const create = jest.spyOn(Inventory, 'create');

      const response = await request(app)
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.inventory[clave]);
      expect(create).not.toHaveBeenCalled();
    });

    test.each([
      ['sin body', undefined],
      ['sin variantId', { stock: 5 }],
      ['con stock no numérico', { variantId: 2, stock: 'abc' }],
      ['con stock decimal', { variantId: 2, stock: 1.5 }],
      ['con variantId mal formado', { variantId: 'abc', stock: 1 }],
      ['con un campo no permitido', { variantId: 2, role: 'admin' }]
    ])('responde 400 %s y no llama a la base', async (_caso, body) => {
      const create = jest.spyOn(Inventory, 'create');

      const response = await request(app)
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/inventory/:id', () => {
    test('responde 200 y actualiza el stock', async () => {
      const reload = jest.fn().mockResolvedValue({ id: 3, stock: 20, reserved: 2 });
      const update = jest.fn().mockResolvedValue();
      jest.spyOn(Inventory, 'findByPk').mockResolvedValue({
        id: 3,
        stock: 10,
        reserved: 2,
        update,
        reload
      });

      const response = await request(app)
        .put('/api/inventory/3')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ stock: 20 });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.inventory.updated);
      expect(update.mock.calls[0][0]).toEqual({ stock: 20 });
    });

    test('responde 400 si el nuevo stock queda por debajo de lo reservado', async () => {
      const update = jest.fn();
      jest.spyOn(Inventory, 'findByPk').mockResolvedValue({
        id: 3,
        stock: 10,
        reserved: 8,
        update
      });

      const response = await request(app)
        .put('/api/inventory/3')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ stock: 5 });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.inventory.reservedExceedsStock);
      expect(update).not.toHaveBeenCalled();
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Inventory, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .put('/api/inventory/999')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ stock: 5 });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.inventory.notFound);
    });

    test('responde 400 si el body trae un campo no permitido (variantId)', async () => {
      const find = jest.spyOn(Inventory, 'findByPk');

      const response = await request(app)
        .put('/api/inventory/3')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ variantId: 5 });

      expect(response.statusCode).toBe(400);
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    test('responde 200 y elimina', async () => {
      const destroy = jest.fn().mockResolvedValue();
      jest.spyOn(Inventory, 'findByPk').mockResolvedValue({ id: 3, destroy });

      const response = await request(app)
        .delete('/api/inventory/3')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.inventory.deleted);
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(Inventory, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/inventory/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.inventory.notFound);
    });
  });

  describe('Permisos por rol (matriz del seed)', () => {
    test('SALES (leer y actualizar) puede actualizar', async () => {
      const sales = mockSession({
        permissions: ['inventory:read:any', 'inventory:update:any']
      });
      jest.spyOn(Inventory, 'findByPk').mockResolvedValue({
        id: 3,
        stock: 10,
        reserved: 0,
        update: jest.fn().mockResolvedValue(),
        reload: jest.fn().mockResolvedValue({ id: 3, stock: 15 })
      });

      const response = await request(app)
        .put('/api/inventory/3')
        .set('Accept-Language', 'es')
        .set(sales)
        .send({ stock: 15 });

      expect(response.statusCode).toBe(200);
    });

    test('SALES no puede crear ni eliminar (403)', async () => {
      const sales = mockSession({
        permissions: ['inventory:read:any', 'inventory:update:any']
      });
      const create = jest.spyOn(Inventory, 'create');
      const find = jest.spyOn(Inventory, 'findByPk');

      const crear = await request(app)
        .post('/api/inventory')
        .set('Accept-Language', 'es')
        .set(sales)
        .send({ variantId: 2, stock: 1 });
      const eliminar = await request(app)
        .delete('/api/inventory/3')
        .set('Accept-Language', 'es')
        .set(sales);

      expect(crear.statusCode).toBe(403);
      expect(crear.body.message).toBe(es.common.forbidden);
      expect(eliminar.statusCode).toBe(403);
      expect(create).not.toHaveBeenCalled();
      expect(find).not.toHaveBeenCalled();
    });

    test('USER (solo lectura) puede consultar pero no actualizar', async () => {
      const user = mockSession({ permissions: ['inventory:read:any'] });
      jest.spyOn(Inventory, 'findAll').mockResolvedValue([]);
      const find = jest.spyOn(Inventory, 'findByPk');

      const leer = await request(app)
        .get('/api/inventory')
        .set('Accept-Language', 'es')
        .set(user);
      const actualizar = await request(app)
        .put('/api/inventory/3')
        .set('Accept-Language', 'es')
        .set(user)
        .send({ stock: 15 });

      expect(leer.statusCode).toBe(200);
      expect(actualizar.statusCode).toBe(403);
      expect(find).not.toHaveBeenCalled();
    });
  });
});