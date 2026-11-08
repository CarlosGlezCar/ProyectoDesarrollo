const request = require('supertest');
const { UniqueConstraintError } = require('sequelize');
const app = require('../app');
const { Product, ProductVariant, Inventory, sequelize } = require('../models/sql');
const { mockSession } = require('./helpers/session');
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const validVariant = {
  productId: 1,
  sku: 'SKU-PRUEBA-001',
  size: '42',
  color: 'Negro'
};

describe('Rutas de variantes (con mocks)', () => {
  let auth;

  beforeEach(() => {
    auth = mockSession({
      permissions: [
        'variants:create:any',
        'variants:read:any',
        'variants:update:any',
        'variants:delete:any'
      ]
    });

    jest.spyOn(sequelize, 'transaction').mockImplementation(async callback =>
      callback({ LOCK: { UPDATE: 'UPDATE' } })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/variants', () => {
    test('responde 200 con la lista y el mensaje traducido', async () => {
      jest.spyOn(ProductVariant, 'findAll').mockResolvedValue([{ id: 1, sku: 'A' }]);

      const response = await request(app)
        .get('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.variants.list);
      expect(response.body.data).toEqual([{ id: 1, sku: 'A' }]);
    });

    test('responde en inglés con Accept-Language: en', async () => {
      jest.spyOn(ProductVariant, 'findAll').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/variants')
        .set('Accept-Language', 'en')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(en.variants.list);
    });

    test('responde 403 si el rol no tiene variants:read:any', async () => {
      const findAll = jest.spyOn(ProductVariant, 'findAll');
      const sinPermiso = mockSession({ permissions: [] });

      const response = await request(app)
        .get('/api/variants')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(es.common.forbidden);
      expect(findAll).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/variants/:id', () => {
    test('responde 200 con la variante, su producto y su inventario', async () => {
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue({
        id: 5,
        sku: 'A',
        product: { id: 1 },
        inventory: { stock: 3 }
      });

      const response = await request(app)
        .get('/api/variants/5')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.variants.found);
      expect(response.body.data.product).toEqual({ id: 1 });
      expect(response.body.data.inventory).toEqual({ stock: 3 });
    });

    test('responde 404 si no existe', async () => {
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .get('/api/variants/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.variants.notFound);
      expect(response.body.data).toBeNull();
    });

    test('responde 400 con un id mal formado', async () => {
      const response = await request(app)
        .get('/api/variants/abc')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.invalidId);
    });
  });

  describe('POST /api/variants', () => {
    test('responde 201 y crea la variante', async () => {
      jest.spyOn(Product, 'findByPk').mockResolvedValue({ id: 1 });
      const created = { reload: jest.fn().mockResolvedValue({ id: 7, sku: 'SKU-PRUEBA-001' }) };
      const create = jest.spyOn(ProductVariant, 'create').mockResolvedValue(created);

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validVariant);

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(es.variants.created);
      expect(response.body.data.id).toBe(7);
      expect(create).toHaveBeenCalledTimes(1);
      expect(create.mock.calls[0][0]).toMatchObject({
        product_id: 1,
        sku: 'SKU-PRUEBA-001'
      });
    });

    test('responde 404 si el producto no existe', async () => {
      jest.spyOn(Product, 'findByPk').mockResolvedValue(null);
      const create = jest.spyOn(ProductVariant, 'create');

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ ...validVariant, productId: 99999999 });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.variants.productNotFound);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 400 si el SKU ya está registrado', async () => {
      jest.spyOn(Product, 'findByPk').mockResolvedValue({ id: 1 });
      jest.spyOn(ProductVariant, 'create').mockRejectedValue(
        new UniqueConstraintError({ message: 'sku must be unique' })
      );

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(validVariant);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.common.duplicate);
    });

    test.each([
      ['sin body', undefined],
      ['sin sku', { productId: 1 }],
      ['con sku vacío', { productId: 1, sku: '   ' }],
      ['sin productId', { sku: 'SKU-X' }],
      ['con productId mal formado', { productId: 'abc', sku: 'SKU-X' }],
      ['con un campo no permitido', { ...validVariant, role: 'admin' }]
    ])('responde 400 %s y no llama a la base', async (_caso, body) => {
      const create = jest.spyOn(ProductVariant, 'create');

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(auth)
        .send(body);

      expect(response.statusCode).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    test('responde 403 si el rol no tiene variants:create:any', async () => {
      const soloLectura = mockSession({ permissions: ['variants:read:any'] });
      const create = jest.spyOn(ProductVariant, 'create');

      const response = await request(app)
        .post('/api/variants')
        .set('Accept-Language', 'es')
        .set(soloLectura)
        .send(validVariant);

      expect(response.statusCode).toBe(403);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/variants/:id', () => {
    test('responde 200 y actualiza la variante', async () => {
      const reload = jest.fn().mockResolvedValue({ id: 3, size: '44', color: 'Blanco' });
      const update = jest.fn().mockResolvedValue();
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue({ id: 3, update, reload });

      const response = await request(app)
        .put('/api/variants/3')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ size: '44', color: 'Blanco' });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.variants.updated);
      expect(update.mock.calls[0][0]).toEqual({ size: '44', color: 'Blanco' });
    });

    test('responde 404 si la variante no existe', async () => {
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue(null);

      const response = await request(app)
        .put('/api/variants/999')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ size: '44' });

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.variants.notFound);
    });

    test('responde 400 si se intenta dejar el sku vacío', async () => {
      const find = jest.spyOn(ProductVariant, 'findByPk');

      const response = await request(app)
        .put('/api/variants/3')
        .set('Accept-Language', 'es')
        .set(auth)
        .send({ sku: '  ' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(es.variants.skuRequired);
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/variants/:id', () => {
    test('responde 200 y elimina la variante junto con su inventario', async () => {
      const destroy = jest.fn().mockResolvedValue();
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue({ id: 3, destroy });
      const destroyInventory = jest.spyOn(Inventory, 'destroy').mockResolvedValue(1);

      const response = await request(app)
        .delete('/api/variants/3')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(es.variants.deleted);
      expect(destroyInventory.mock.calls[0][0].where).toEqual({ variant_id: 3 });
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    test('responde 404 si no existe y no borra inventario', async () => {
      jest.spyOn(ProductVariant, 'findByPk').mockResolvedValue(null);
      const destroyInventory = jest.spyOn(Inventory, 'destroy');

      const response = await request(app)
        .delete('/api/variants/999')
        .set('Accept-Language', 'es')
        .set(auth);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe(es.variants.notFound);
      expect(destroyInventory).not.toHaveBeenCalled();
    });

    test('responde 403 sin permiso y no consulta la base', async () => {
      const sinPermiso = mockSession({ permissions: ['variants:read:any'] });
      const find = jest.spyOn(ProductVariant, 'findByPk');

      const response = await request(app)
        .delete('/api/variants/3')
        .set('Accept-Language', 'es')
        .set(sinPermiso);

      expect(response.statusCode).toBe(403);
      expect(find).not.toHaveBeenCalled();
    });
  });
});